import Apis from "@/bts/ws/ApiInstances";
import { decodeForumValue } from "@/bts/serializer/customOperations";
import {
  FORUM_CHANNELS,
  forumChannelCatalog,
  forumTopicCatalog,
  isThreadKey,
  verifyThreadCatalog,
} from "@/lib/forumPost.js";
import {
  cleanMessageText,
  isPluginMissingError,
  storageIdNum,
} from "@/nanoeffects/Trollbox";

export { FORUM_CHANNELS, forumChannelCatalog, verifyThreadCatalog };
export { isPluginMissingError };

export const FORUM_STORAGE_PAGE_LIMIT = 100;
/** Safety bound for unbounded scans (100 pages x 100 = 10k objects). */
export const FORUM_MAX_PAGES = 100;
// Display cap for inbound text (writes are budgeted to ~2KB;
// reads tolerate more but never render unbounded plugin data).
export const FORUM_TEXT_CAP = 4096;
export const FORUM_TITLE_CAP = 160;

export type ForumTopic = {
  id: string;
  account: string;
  displayAuthor: string;
  catalog: string;
  key: string;
  channel: string;
  title: string;
  text: string;
  attach: { t: number; [k: string]: unknown } | null;
  isLtm: boolean;
};

export type ForumReply = {
  id: string;
  account: string;
  displayAuthor: string;
  catalog: string;
  key: string;
  text: string;
  attach: { t: number; [k: string]: unknown } | null;
  isLtm: boolean;
};

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

/** Lifetime members have a future membership_expiration_date. */
function isLifetimeMember(account: any): boolean {
  const expiry = account?.membership_expiration_date;
  return !!expiry && new Date(`${expiry}Z`).getTime() > Date.now();
}

type RawEntry = {
  id: string;
  account: string;
  catalog: string;
  key: string;
  kind: string;
  title?: string;
  text?: string;
  attach?: { t: number; [k: string]: unknown } | null;
};

/**
 * Scan a forum catalog to exhaustion (101-per-request pages via start_id).
 * Pages come back oldest-first; a short page terminates the walk, so empty
 * pages are never fetched. Only stops early at FORUM_MAX_PAGES.
 */
async function scanForumCatalog(
  node: string,
  catalog: string,
  maxPages: number = FORUM_MAX_PAGES,
  fromId: string | null = null
): Promise<RawEntry[]> {
  const out: RawEntry[] = [];
  const seen = new Set<string>();
  await withApi(node, async (api) => {
    let startId: string | null = fromId;
    let pages = 0;
    for (;;) {
      const params =
        startId !== null
          ? [null, catalog, null, FORUM_STORAGE_PAGE_LIMIT, startId]
          : [null, catalog, null, FORUM_STORAGE_PAGE_LIMIT];
      const res = await api.custom_operations_api().exec("get_storage_info", params);
      if (!Array.isArray(res) || res.length === 0) {
        break;
      }
      for (const o of res) {
        if (!o || seen.has(o.id)) {
          continue;
        }
        seen.add(o.id);
        const decoded = decodeForumValue(o) as RawEntry | null;
        if (decoded) {
          out.push(decoded);
        }
      }
      if (res.length < FORUM_STORAGE_PAGE_LIMIT) {
        break;
      }
      startId = res[res.length - 1].id;
      pages += 1;
      if (pages >= maxPages) {
        break;
      }
    }
  });
  return out;
}

/**
 * Best-effort: resolve 1.2.x ids to account names for display.
 * No embedded username exists in forum payloads by design — unresolved
 * ids fall back to the raw account id (never hidden for this reason).
 */
export async function resolveForumNames<T extends { account: string; displayAuthor: string }>(
  node: string,
  items: T[]
): Promise<T[]> {
  const ids = [...new Set(items.map((m) => m.account).filter(Boolean))];
  if (ids.length === 0) {
    return items;
  }
  try {
    await withApi(node, async (api) => {
      const names: Record<string, string> = {};
      const ltm: Record<string, boolean> = {};
      // One get_accounts call per 100 ids (trollbox parity): some nodes
      // reject oversized batches, and each chunk fails independently.
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        let accounts: any[] = [];
        try {
          accounts =
            (await api.db_api().exec("get_accounts", [batch])) ?? [];
        } catch {
          continue;
        }
        for (const a of accounts) {
          if (a?.id) {
            if (a?.name) {
              names[a.id] = a.name;
            }
            ltm[a.id] = isLifetimeMember(a);
          }
        }
      }
      for (const m of items) {
        (m as any).displayAuthor = cleanMessageText(names[m.account] ?? m.account);
        (m as any).isLtm = ltm[m.account] ?? false;
      }
    });
  } catch {
    // keep raw ids
  }
  return items;
}

function decodeTopics(raw: RawEntry[], channelId: string): ForumTopic[] {
  const out: ForumTopic[] = [];
  for (const r of raw) {
    if (r.kind !== "topic" || !isThreadKey(r.key)) {
      continue;
    }
    out.push({
      id: r.id,
      account: r.account,
      displayAuthor: r.account,
      catalog: r.catalog,
      key: r.key,
      channel: channelId,
      title: cleanMessageText(r.title ?? "").slice(0, FORUM_TITLE_CAP),
      text: cleanMessageText(r.text ?? "").slice(0, FORUM_TEXT_CAP),
      attach: r.attach ?? null,
      isLtm: false,
    });
  }
  out.sort((a, b) => storageIdNum(b.id) - storageIdNum(a.id));
  return out;
}

/**
 * Fetch every topic in a channel catalog, newest first by
 * plugin-assigned storage ID (chain write order — client timestamps are
 * never stored or trusted).
 */
export async function fetchForumTopics(
  chain: string,
  node: string,
  catalog: string,
  channelId: string,
  maxPages: number = FORUM_MAX_PAGES
): Promise<ForumTopic[]> {
  void chain;
  const out = decodeTopics(await scanForumCatalog(node, catalog, maxPages), channelId);
  await resolveForumNames(node, out);
  return out;
}

/**
 * Fetch only topics with storage IDs >= sinceId (inclusive; the overlap
 * object is harmless — callers dedupe by id). Used for high-water-mark
 * polling: after one full scan, each poll is typically a single short
 * page holding just the new topics. Edits to older topics (same storage
 * ID, modified in place) do NOT appear in the tail — use a full
 * fetchForumTopics rescan to pick those up.
 */
export async function fetchForumTopicsTail(
  chain: string,
  node: string,
  catalog: string,
  channelId: string,
  sinceId: string,
  maxPages: number = FORUM_MAX_PAGES
): Promise<ForumTopic[]> {
  void chain;
  const out = decodeTopics(
    await scanForumCatalog(node, catalog, maxPages, sinceId),
    channelId
  );
  await resolveForumNames(node, out);
  return out;
}

/**
 * Find topics by key. Scans are oldest-first, so an early exit helps old
 * topics; recent topics still walk most of the catalog. Keys are unique
 * per (account, catalog) but NOT across accounts — a copied key yields
 * several candidates. When preferCatalog is given (from a ?cc= link),
 * the candidate verifying against it wins; otherwise the oldest match
 * wins (an attacker cannot pre-date the original's random key).
 */
export async function findForumTopic(
  node: string,
  catalog: string,
  channelId: string,
  threadKey: string,
  maxPages: number = FORUM_MAX_PAGES,
  preferCatalog: string | null = null
): Promise<ForumTopic | null> {
  const seen = new Set<string>();
  const matches: RawEntry[] = [];
  await withApi(node, async (api) => {
    let startId: string | null = null;
    let pages = 0;
    for (;;) {
      const params =
        startId !== null
          ? [null, catalog, null, FORUM_STORAGE_PAGE_LIMIT, startId]
          : [null, catalog, null, FORUM_STORAGE_PAGE_LIMIT];
      const res = await api.custom_operations_api().exec("get_storage_info", params);
      if (!Array.isArray(res) || res.length === 0) {
        break;
      }
      for (const o of res) {
        if (!o || seen.has(o.id)) {
          continue;
        }
        seen.add(o.id);
        if (o.key === threadKey) {
          const decoded = decodeForumValue(o) as RawEntry | null;
          if (decoded && decoded.kind === "topic") {
            matches.push(decoded);
            if (!preferCatalog) {
              return;
            }
          }
        }
      }
      if ((!preferCatalog && matches.length > 0) || res.length < FORUM_STORAGE_PAGE_LIMIT) {
        break;
      }
      startId = res[res.length - 1].id;
      pages += 1;
      if (pages >= maxPages) {
        break;
      }
    }
  });
  let found: RawEntry | null = null;
  if (preferCatalog) {
    found =
      matches.find(
        (m) => forumTopicCatalog(m.account, m.key) === preferCatalog
      ) ?? null;
  } else {
    found = matches.length > 0 ? matches[0] : null;
  }
  if (!found || !(found as RawEntry).id || !isThreadKey((found as RawEntry).key)) {
    return null;
  }
  const f = found as RawEntry;
  const topic: ForumTopic = {
    id: f.id,
    account: f.account,
    displayAuthor: f.account,
    catalog: f.catalog,
    key: f.key,
    channel: channelId,
    title: cleanMessageText(f.title ?? "").slice(0, FORUM_TITLE_CAP),
    text: cleanMessageText(f.text ?? "").slice(0, FORUM_TEXT_CAP),
    attach: f.attach ?? null,
    isLtm: false,
  };
  await resolveForumNames(node, [topic]);
  return topic;
}

/**
 * Count replies in a thread catalog without resolving display names
 * (badges only need the number). sinceId == null counts everything.
 * IDs compare numerically — only strictly newer objects count.
 */
export async function countThreadReplies(
  node: string,
  catalog: string,
  sinceId: string | null = null,
  maxPages: number = FORUM_MAX_PAGES
): Promise<number> {
  const raw = await scanForumCatalog(node, catalog, maxPages, sinceId);
  const floor = sinceId ? storageIdNum(sinceId) : -1;
  let count = 0;
  for (const r of raw) {
    if (r.kind === "reply" && storageIdNum(r.id) > floor) {
      count += 1;
    }
  }
  return count;
}

/**
 * Fetch every reply in a thread catalog, oldest first (reading order).
 * Containment IS the membership proof: only shape-valid objects from
 * this catalog are returned. The thread binding hash is verified once by
 * the caller (verifyThreadCatalog) — never per reply.
 */
export async function fetchThreadReplies(
  chain: string,
  node: string,
  catalog: string,
  maxPages: number = FORUM_MAX_PAGES
): Promise<ForumReply[]> {
  void chain;
  const raw = await scanForumCatalog(node, catalog, maxPages);
  const out: ForumReply[] = [];
  for (const r of raw) {
    if (r.kind !== "reply") {
      continue;
    }
    out.push({
      id: r.id,
      account: r.account,
      displayAuthor: r.account,
      catalog: r.catalog,
      key: r.key,
      text: cleanMessageText(r.text ?? "").slice(0, FORUM_TEXT_CAP),
      attach: r.attach ?? null,
      isLtm: false,
    });
  }
  await resolveForumNames(node, out);
  out.sort((a, b) => storageIdNum(a.id) - storageIdNum(b.id));
  return out;
}
