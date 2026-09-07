import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";
import { decodeTrollboxValue } from "@/bts/serializer/customOperations";

export const TROLLBOX_CHANNELS = [
  { id: "general", catalog: "trollbox-general" },
  { id: "trading", catalog: "trollbox-trading" },
  { id: "help", catalog: "trollbox-help" },
];

export const TROLLBOX_META_CATALOG = "trollbox-meta";
export const TROLLBOX_STORAGE_PAGE_LIMIT = 100;
const TROLLBOX_MAX_PAGES = 10;

export type TrollboxProbe = {
  supported: boolean;
  node: string;
  /** "missing" = plugin not on this node, "error" = unreachable/other failure */
  reason?: "missing" | "error";
};

export type TrollboxMessage = {
  id: string;
  account: string;
  author: string | null;
  displayAuthor: string;
  catalog: string;
  key: string;
  channel: string | null;
  timestamp: number;
  text: string;
};

/**
 * True when an RPC failure means "this node does not run the
 * custom_operations plugin" (as opposed to a timeout or other error).
 * Covers: our own ApiInstances guard, -32601 Method not found from
 * public nodes, core's "plugin is not enabled", restricted-API
 * "Access denied / is_allowed" asserts, and — derived from core source —
 * failures from the missing account_storage_index, which is only
 * registered when the plugin is enabled (plugin_initialize adds the
 * index; without it get_storage_info cannot run). The login-API name
 * itself is valid, so a bare "method not found" must NOT be relied on.
 */
export function isPluginMissingError(error: unknown): boolean {
  const msg = String(
    (error as any)?.message ?? (error as any)?.data?.message ?? error ?? ""
  );
  return (
    /custom_operations API not available/i.test(msg) ||
    /method not found/i.test(msg) ||
    /-32601/.test(msg) ||
    /custom_operations plugin is not enabled/i.test(msg) ||
    /access denied/i.test(msg) ||
    /is_allowed/i.test(msg) ||
    /account_storage/i.test(msg) ||
    /unknown (index|object)|index not found|no such index/i.test(msg)
  );
}

async function withApi<T>(node: string, fn: (api: any) => Promise<T>): Promise<T> {
  const currentAPI = await Apis.instance(node, true, 4000, {
    enableCrypto: false,
    enableOrders: false,
  });
  try {
    return await fn(currentAPI);
  } finally {
    try {
      currentAPI.close();
    } catch {
      // refcounted release is best-effort
    }
  }
}

function defaultNode(chain: string): string {
  return (chains as any)[chain].nodeList[0].url;
}

function nodeListFor(chain: string): string[] {
  const list = (chains as any)[chain]?.nodeList ?? [];
  return list.map((n: any) => (typeof n === "string" ? n : n.url)).filter(Boolean);
}

/**
 * Probe whether a node runs the custom_operations plugin by issuing a
 * minimal get_storage_info call. Never throws: unsupported/unreachable
 * nodes resolve to { supported: false }.
 */
export async function probeTrollboxSupport(
  chain: string,
  node?: string
): Promise<TrollboxProbe> {
  const target = node ?? defaultNode(chain);
  try {
    await withApi(target, async (api) => {
      await api
        .custom_operations_api()
        .exec("get_storage_info", [null, TROLLBOX_META_CATALOG, null, 1]);
    });
    return { supported: true, node: target };
  } catch (error) {
    // Always surface the underlying failure in the console so a
    // "Plugin unavailable" UI state can be traced back to its cause
    // (-32601, access denied, timeout, ...).
    console.warn(`Trollbox: custom_operations probe failed on ${target}:`, error);
    if (isPluginMissingError(error)) {
      return { supported: false, node: target, reason: "missing" };
    }
    return { supported: false, node: target, reason: "error" };
  }
}

/**
 * Walk the chain's node list and return the first node whose
 * custom_operations plugin responds. Returns null when none do.
 * Probes run sequentially on purpose: Apis is a shared singleton, so
 * parallel probes against different URLs would tear down each other's
 * sockets (see ApiInstances).
 */
export async function findSupportingNode(
  chain: string,
  nodes?: Array<string | { url: string }>
): Promise<string | null> {
  const list = nodes
    ? nodes.map((n) => (typeof n === "string" ? n : n.url)).filter(Boolean)
    : nodeListFor(chain);
  for (const url of list) {
    try {
      const probe = await probeTrollboxSupport(chain, url);
      if (probe.supported) {
        return url;
      }
    } catch {
      // keep walking the list
    }
  }
  return null;
}

/**
 * Fetch + decode every message stored under a channel catalog,
 * paginating get_storage_info (limit 100) by storage id. Throws on
 * transport errors so nanoquery surfaces an error state; callers can
 * use isPluginMissingError() to distinguish a plugin-less node.
 */
export async function fetchChannelMessages(
  chain: string,
  node: string,
  catalog: string,
  maxPages: number = TROLLBOX_MAX_PAGES
): Promise<TrollboxMessage[]> {
  const out: TrollboxMessage[] = [];
  const seen = new Set<string>();

  await withApi(node, async (api) => {
    let startId: string | null = null;
    let pages = 0;
    for (;;) {
      const params =
        startId !== null
          ? [null, catalog, null, TROLLBOX_STORAGE_PAGE_LIMIT, startId]
          : [null, catalog, null, TROLLBOX_STORAGE_PAGE_LIMIT];
      const res = await api.custom_operations_api().exec("get_storage_info", params);
      if (!Array.isArray(res) || res.length === 0) {
        break;
      }
      for (const o of res) {
        if (!o || seen.has(o.id)) {
          continue;
        }
        seen.add(o.id);
        const decoded = decodeTrollboxValue(o);
        if (decoded) {
          out.push({ ...decoded, displayAuthor: decoded.author ?? decoded.account });
        }
      }
      if (res.length < TROLLBOX_STORAGE_PAGE_LIMIT) {
        break;
      }
      startId = res[res.length - 1].id;
      pages += 1;
      if (pages >= maxPages) {
        break;
      }
    }

    // Best-effort: resolve 1.2.x ids to account names for display.
    const ids = [...new Set(out.map((m) => m.account).filter(Boolean))].slice(0, 100);
    if (ids.length > 0) {
      try {
        const accounts = await api.db_api().exec("get_accounts", [ids]);
        const names: Record<string, string> = {};
        for (const a of accounts ?? []) {
          if (a?.id && a?.name) {
            names[a.id] = a.name;
          }
        }
        for (const m of out) {
          m.displayAuthor = names[m.account] ?? m.author ?? m.account;
        }
      } catch {
        // keep embedded/ raw ids
      }
    }
  });

  out.sort((a, b) => a.timestamp - b.timestamp);
  return out;
}

const [createTrollboxProbeStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const node = args[1] ? (args[1] as string) : defaultNode(chain);
    return probeTrollboxSupport(chain, node);
  },
});

const [createTrollboxChannelStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const node = args[1] ? (args[1] as string) : defaultNode(chain);
    const catalog = args[2] as string;
    return fetchChannelMessages(chain, node, catalog);
  },
});

export { createTrollboxProbeStore, createTrollboxChannelStore };
