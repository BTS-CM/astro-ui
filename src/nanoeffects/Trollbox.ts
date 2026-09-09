import { nanoquery } from "@nanostores/query";
import { persistentAtom } from "@nanostores/persistent";
import DOMPurify from "dompurify";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";
import {
  DEFAULT_MAX_TRANSACTION_SIZE,
  decodeTrollboxValue,
  maxMessageBytes,
} from "@/bts/serializer/customOperations";
import { attachmentObjectIds } from "@/lib/trollboxAttach.js";

export const TROLLBOX_CHANNELS = [
  { id: "general" },
  { id: "announcements" },
  { id: "trading" },
  { id: "pools" },
  { id: "barter" },
  { id: "credit" },
  { id: "assets" },
  { id: "governance" },
  { id: "proposals" },
  { id: "dev" },
];

// Content-language partitions. English keeps the legacy unprefixed
// catalogs above (all existing history); other languages append their
// code: trollbox-<channel>-<lang>. The op id is ignored by the plugin,
// so the catalog suffix is the partition mechanism.
export const TROLLBOX_LANGS = [
  "en",
  "da",
  "de",
  "es",
  "et",
  "fr",
  "it",
  "ja",
  "ko",
  "pt",
  "th",
];

export const NATIVE_LANG_NAMES: Record<string, string> = {
  en: "English",
  da: "Dansk",
  de: "Deutsch",
  es: "Español",
  et: "Eesti",
  fr: "Français",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  pt: "Português",
  th: "ไทย",
};

export function normalizeTrollboxLang(value: unknown): string {
  return typeof value === "string" && TROLLBOX_LANGS.includes(value)
    ? value
    : "en";
}

export function trollboxCatalog(channelId: string, lang: string): string {
  const normalized = normalizeTrollboxLang(lang);
  return normalized === "en"
    ? `trollbox-${channelId}`
    : `trollbox-${channelId}-${normalized}`;
}

/**
 * Which attachment kinds each channel accepts (attachment `kind` names:
 * "asset" | "pair" | "pool" | "offer" | "barter"). Channels absent here
 * accept nothing. History still renders attachments posted anywhere —
 * this only gates composing new ones.
 */
export const CHANNEL_ATTACH_TYPES: Record<string, string[]> = {
  general: [],
  announcements: ["asset", "pool", "offer"],
  trading: ["pair", "asset"],
  pools: ["pool", "asset"],
  barter: ["barter"],
  credit: ["offer"],
  assets: ["pair", "asset", "offer", "pool"],
  governance: [],
  proposals: [],
  dev: [],
};

export function channelAllowsAttach(channelId: string, kind: string | null): boolean {
  if (!kind) {
    return false;
  }
  return (CHANNEL_ATTACH_TYPES[channelId] ?? []).includes(kind);
}

export const TROLLBOX_META_CATALOG = "trollbox-meta";

export function isSupportedTrollboxLang(lang: unknown): lang is string {
  return typeof lang === "string" && (TROLLBOX_LANGS as string[]).includes(lang);
}

/**
 * Last content language the user picked, persisted across page visits.
 * Precedence everywhere: ?lang= URL param → persisted selection →
 * app UI locale → "en". The URL param always wins so a shared/deep link
 * is never overridden by stored or locale state.
 */
export const $trollboxLang = persistentAtom<string>("trollboxLang", "");

export function resolveContentLang(
  urlLang: unknown,
  fallbackLocale?: unknown
): string {
  if (isSupportedTrollboxLang(urlLang)) {
    return urlLang;
  }
  try {
    const stored = $trollboxLang.get();
    if (isSupportedTrollboxLang(stored)) {
      return stored;
    }
  } catch {
    // storage unavailable: fall through to locale default
  }
  return isSupportedTrollboxLang(fallbackLocale) ? fallbackLocale : "en";
}
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
  text: string;
  isLtm: boolean;
  attach: { t: string; [k: string]: string | number } | null;
};

/**
 * Live existence proof for an attachment's referenced object(s).
 * Used at send time so dead picks (deleted pool, expired offer) block
 * the broadcast instead of posting a dead badge.
 */
export async function verifyAttachmentOnChain(
  chain: string,
  node: string,
  attach: unknown
): Promise<boolean> {
  const ids = attachmentObjectIds(attach as any);
  if (ids.length === 0) {
    return false;
  }
  try {
    const res = await withApi(node, async (api) =>
      api.db_api().exec("get_objects", [ids])
    );
    return (
      Array.isArray(res) &&
      res.length === ids.length &&
      res.every((o) => !!o)
    );
  } catch (error) {
    console.warn(`Trollbox: attachment verification failed:`, error);
    return false;
  }
}

/** Numeric suffix of a "7.0.x" storage ID. Unparseable IDs sort last. */
export function storageIdNum(id: string): number {
  const tail = (id ?? "").split(".").pop() ?? "";
  if (tail === "") {
    return -1;
  }
  const n = Number(tail);
  return Number.isFinite(n) ? n : -1;
}

/** Lifetime members have a future membership_expiration_date. */
function isLifetimeMember(account: any): boolean {
  const expiry = account?.membership_expiration_date;
  return !!expiry && new Date(`${expiry}Z`).getTime() > Date.now();
}

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

/**
 * Strip all markup so messages render as inert plain text: no links,
 * no HTML, no XSS vectors. Mirrors the DOMPurify pattern used by
 * PortfolioRecentActivity. Belt-and-braces on top of React's escaping
 * (we never use dangerouslySetInnerHTML or linkify).
 */
export function cleanMessageText(input: unknown): string {
  if (input === null || input === undefined) {
    return "";
  }
  try {
    const sanitized = DOMPurify.sanitize(String(input), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
    const textarea = document.createElement("textarea");
    textarea.innerHTML = sanitized;
    return textarea.value;
  } catch {
    return String(input);
  }
}

/**
 * Live message-text budget in UTF-8 bytes, derived from the chain's
 * maximum_transaction_size (global properties 2.0.0). Falls back to the
 * protocol default when the value cannot be read.
 */
export async function fetchMaxMessageBytes(
  chain: string,
  node: string
): Promise<number> {
  try {
    const result = await withApi(node, async (api) =>
      api.db_api().exec("get_global_properties", [])
    );
    const maxTx = Number(result?.parameters?.maximum_transaction_size);
    if (Number.isFinite(maxTx) && maxTx > 0) {
      return maxMessageBytes(maxTx);
    }
  } catch (error) {
    console.warn(`Trollbox: could not read maximum_transaction_size:`, error);
  }
  return maxMessageBytes(DEFAULT_MAX_TRANSACTION_SIZE);
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
          const author = cleanMessageText(decoded.author);
          out.push({
            ...decoded,
            author,
            text: cleanMessageText(decoded.text),
            displayAuthor: author || decoded.account,
            isLtm: false,
          });
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
        const ltm: Record<string, boolean> = {};
        for (const a of accounts ?? []) {
          if (a?.id) {
            if (a?.name) {
              names[a.id] = a.name;
            }
            ltm[a.id] = isLifetimeMember(a);
          }
        }
        for (const m of out) {
          m.displayAuthor = cleanMessageText(
            names[m.account] ?? m.author ?? m.account
          );
          m.isLtm = ltm[m.account] ?? false;
        }
      } catch {
        // keep embedded/ raw ids
      }
    }
  });

  // Newest first by plugin-assigned storage ID (chain write order).
  // Deliberately NOT by any client-stamped time: that field is
  // user-controlled and trivially spoofed, so it is not stored at all.
  out.sort((a, b) => storageIdNum(b.id) - storageIdNum(a.id));
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
