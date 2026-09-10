/**
 * Forum validation + catalog helpers.
 *
 * Pure module (no DOM, no network, no store imports) so it can be unit
 * tested in Node. Mirrors the trust model of trollboxAttach.js:
 * - Shape is checked here with anchored regexes + exact-keys checks.
 *   Anything malformed decodes to null and never renders.
 * - Authorship is NEVER taken from payload fields: there are no `u`/`v`/`t`
 *   fields at all. The author is always `storageObject.account`
 *   (chain-stamped payer). Display names resolve live via get_accounts.
 * - The catalog IS the type: objects in `forum-<channel>` are topics,
 *   objects in `forum-topic-<hash16>` are replies. Cross-shaped payloads
 *   are hidden.
 *
 * Thread identity: topic key `th` (buildMessageKey format) + creator
 * account id bind the thread's reply catalog:
 *   cc = `forum-topic-${threadHash(creatorAccountId, th)}`
 * where threadHash = first 16 hex chars of SHA256("<accountId>|<th>").
 * Only the (account, th) pair that created the topic reproduces the hash,
 * so forged thread pointers fail verification and are hidden.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";

/** Static sub-forum channels. No language partitions: the topic's own
 *  title/body implies its language. */
export const FORUM_CHANNELS = [
  { id: "general" },
  { id: "announcements" },
  { id: "trading" },
  { id: "governance" },
  { id: "dev" },
];

export function isForumChannel(id) {
  return (
    typeof id === "string" && FORUM_CHANNELS.some((c) => c.id === id)
  );
}

/** Index catalog for a channel: the only messages in it are topics
 *  (ad + OP unified in a single object). */
export function forumChannelCatalog(channelId) {
  if (!isForumChannel(channelId)) {
    return null;
  }
  return `forum-${channelId}`;
}

/** Canonical hash preimage. Separator `|` cannot appear in either side:
 *  account ids match /^1\.2\.\d+$/ and thread keys match /^\d+-[0-9a-f]{6}$/. */
export function threadHashInput(accountId, threadKey) {
  return `${accountId}|${threadKey}`;
}

/** First 16 lowercase hex chars of SHA256(accountId|threadKey) — 64-bit,
 *  collision-negligible, keeps catalogs short. Frozen at v1: changing the
 *  algo or truncation orphans existing threads. */
export function threadHash(accountId, threadKey) {
  if (!isAccountId(accountId) || !isThreadKey(threadKey)) {
    return null;
  }
  return toHex(sha256(utf8ToBytes(threadHashInput(accountId, threadKey)))).slice(
    0,
    16
  );
}

/** Reply catalog for a thread, or null when the inputs are malformed. */
export function forumTopicCatalog(accountId, threadKey) {
  const h = threadHash(accountId, threadKey);
  return h ? `forum-topic-${h}` : null;
}

/** True when `catalog` is a well-formed thread-reply catalog name. */
export function isForumTopicCatalog(catalog) {
  return typeof catalog === "string" && /^forum-topic-[0-9a-f]{16}$/.test(catalog);
}

/**
 * Verify a thread pointer: does `catalog` equal the catalog derived from
 * the topic's chain-stamped author account + key? Mismatch → hide.
 */
export function verifyThreadCatalog(topicAccount, topicKey, catalog) {
  if (!isAccountId(topicAccount) || !isThreadKey(topicKey)) {
    return false;
  }
  return forumTopicCatalog(topicAccount, topicKey) === catalog;
}

export function isAccountId(v) {
  return typeof v === "string" && /^1\.2\.\d+$/.test(v);
}

/** buildMessageKey format: "<ms>-<rand6hex>". */
export function isThreadKey(v) {
  return typeof v === "string" && /^\d+-[0-9a-f]{6}$/.test(v);
}

export const FORUM_TITLE_MIN = 3;
export const FORUM_TITLE_MAX = 120;
export const FORUM_TEXT_MAX_CHARS = 1500;
/** Max rendered `> ` quote lines before collapsing the rest. */
export const FORUM_QUOTE_LINE_MAX = 8;

function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function hasExactKeys(obj, keys) {
  const actual = Object.keys(obj).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((k, i) => k === expected[i])
  );
}

function isTitleString(v) {
  if (typeof v !== "string") {
    return false;
  }
  const t = v.trim();
  return t.length >= FORUM_TITLE_MIN && t.length <= FORUM_TITLE_MAX;
}

function isTextString(v) {
  if (typeof v !== "string") {
    return false;
  }
  const t = v.trim();
  return t.length > 0 && t.length <= FORUM_TEXT_MAX_CHARS;
}

/**
 * Validate a raw topic value (from a `forum-<channel>` catalog).
 * Shape is exactly {title, text} — no t/v/u/ln fields. Returns the
 * canonical {title, text} (trimmed) or null.
 */
export function validateTopicShape(raw) {
  if (!isPlainObject(raw) || !hasExactKeys(raw, ["title", "text"])) {
    return null;
  }
  if (!isTitleString(raw.title) || !isTextString(raw.text)) {
    return null;
  }
  return { title: raw.title.trim(), text: raw.text.trim() };
}

/**
 * Validate a raw reply value (from a `forum-topic-<hash>` catalog).
 * Shape is exactly {text}; threading is a `> ` quote convention inside
 * the text, not a protocol field. Returns {text} (trimmed) or null.
 */
export function validateReplyShape(raw) {
  if (!isPlainObject(raw) || !hasExactKeys(raw, ["text"])) {
    return null;
  }
  if (!isTextString(raw.text)) {
    return null;
  }
  return { text: raw.text.trim() };
}

/**
 * Split reply text into {quotes, body}: leading `> ` / `>` lines are the
 * quote block (social convention only — never trusted as authorship).
 * Returns at most FORUM_QUOTE_LINE_MAX quote lines plus overflow count.
 */
export function splitQuote(text) {
  const lines = String(text ?? "").split("\n");
  const quotes = [];
  let i = 0;
  // Only a leading quote block counts; `>` lines after body text stay body.
  let inQuote = true;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (inQuote && /^\s*> ?/.test(line)) {
      quotes.push(line.replace(/^\s*> ?/, ""));
    } else {
      inQuote = false;
      break;
    }
  }
  const body = lines.slice(i).join("\n").trim();
  const overflow =
    quotes.length > FORUM_QUOTE_LINE_MAX
      ? quotes.length - FORUM_QUOTE_LINE_MAX
      : 0;
  return {
    quotes: quotes.slice(0, FORUM_QUOTE_LINE_MAX),
    quoteOverflow: overflow,
    body,
  };
}
