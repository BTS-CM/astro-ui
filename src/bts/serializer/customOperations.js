import { Buffer } from "buffer";
import ByteBuffer from "./ByteBuffer.js";
import types from "./types.js";
import SerializerImpl from "./serializer.js";
import { validateAttachmentShape } from "../../lib/trollboxAttach.js";
import {
  isForumTopicCatalog,
  validateReplyShape,
  validateTopicShape,
} from "../../lib/forumPost.js";

// types.js / ByteBuffer.js use the bare Buffer global, which browsers do
// not provide. Same per-module polyfill as AirdropCalculate.jsx: install it
// here so packing works wherever this module is imported.
if (typeof globalThis !== "undefined" && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

var {
  bool,
  string,
  map,
  optional,
  static_variant,
} = types;

var Serializer = function (operation_name, serilization_types_object) {
  return new SerializerImpl(operation_name, serilization_types_object);
};

// Mirrors bitshares-core
// libraries/plugins/custom_operations/include/graphene/custom_operations/custom_operations.hpp
//   struct account_storage_map { bool remove; string catalog;
//     flat_map<string, optional<string>> key_values; };
// FC_REFLECT order is (remove)(catalog)(key_values) — field order below must match.
export const account_storage_map = new Serializer("account_storage_map", {
  remove: bool,
  catalog: string,
  key_values: map(string, optional(string)),
});

// Mirrors custom_operations_plugin.hpp:
//   typedef fc::static_variant<account_storage_map> custom_plugin_operation;
// Single variant member, so the packed type id is always 0.
export const custom_plugin_operation = static_variant([account_storage_map]);

// Fixed custom_operation.id used for all trollbox messages. The
// custom_operations plugin ignores this field; a constant keeps chain
// explorers filterable and leaves the channel in the catalog + JSON payload.
export const TROLLBOX_OP_ID = 9199;

// Same convention for forum topics and replies: one below the
// trollbox id so the two apps stay separately filterable on-chain.
export const FORUM_OP_ID = 9198;

// BitShares operation id for custom_operation (protocol/operations.hpp).
export const CUSTOM_OPERATION_ID = 35;

// Matches CUSTOM_OPERATIONS_MAX_KEY_SIZE in custom_objects.hpp.
export const MAX_KEY_SIZE = 200;

// BitShares chain default for maximum_transaction_size (see
// CommitteeParams defaults and protocol chain_parameters). The live value
// can differ by chain — callers should read parameters.maximum_transaction_size
// from global properties and derive the budget with maxMessageBytes().
export const DEFAULT_MAX_TRANSACTION_SIZE = 2048;

// Bytes reserved for everything around the message text: the outer
// custom_operation framing, the account_storage_map packing, the catalog,
// the message key, and the JSON wrapper around the text.
export const TX_SIZE_RESERVE = 256;

/** Byte length of a string as UTF-8. */
export function utf8Length(str) {
  return new TextEncoder().encode(str).length;
}

/**
 * Max message-text size in UTF-8 bytes such that the packed custom
 * operation stays within the chain's maximum transaction size.
 */
export function maxMessageBytes(maxTransactionSize = DEFAULT_MAX_TRANSACTION_SIZE) {
  const size = Number(maxTransactionSize);
  const budget = (Number.isFinite(size) ? size : DEFAULT_MAX_TRANSACTION_SIZE) - TX_SIZE_RESERVE;
  return Math.max(256, budget);
}

function assertCatalog(catalog) {
  if (typeof catalog !== "string" || catalog.length === 0) {
    throw new Error("trollbox catalog must be a non-empty string");
  }
  if (catalog.length > MAX_KEY_SIZE) {
    throw new Error(`trollbox catalog exceeds ${MAX_KEY_SIZE} chars`);
  }
}

function assertKey(key) {
  if (typeof key !== "string" || key.length === 0) {
    throw new Error("trollbox message key must be a non-empty string");
  }
  if (key.length > MAX_KEY_SIZE) {
    throw new Error(`trollbox message key exceeds ${MAX_KEY_SIZE} chars`);
  }
}

/**
 * Pack an account_storage_map payload into the hex string expected for
 * custom_operation.data (fc::raw::pack(custom_plugin_operation)).
 *
 * @arg {boolean} remove - false = create/update, true = delete the keys
 * @arg {string} catalog - storage catalog, e.g. "trollbox-general"
 * @arg {Array<[string,string]>} entries - [[key, value], ...]; values are
 *   JSON strings. Pass "" as value with remove=true (values are ignored
 *   by the plugin on delete but must still serialize).
 * @returns {string} hex
 */
export function packAccountStorageMap({ remove = false, catalog, entries }) {
  assertCatalog(catalog);
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("trollbox entries must be a non-empty array of [key, value] pairs");
  }
  for (const [key, value] of entries) {
    assertKey(key);
    if (typeof value !== "string") {
      throw new Error("trollbox entry values must be strings (JSON-encoded)");
    }
  }
  // fromObject first so JS strings become Buffers (byte lengths, utf8)
  // before appendByteBuffer measures them.
  const converted = account_storage_map.fromObject({
    remove: !!remove,
    catalog,
    key_values: entries,
  });
  const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
  custom_plugin_operation.appendByteBuffer(b, [0, converted]);
  return b.copy(0, b.offset).toHex();
}

/**
 * Unpack hex from a custom_operation.data field back into parts.
 * Returns null when the payload is not a custom_plugin_operation.
 */
export function unpackCustomPluginData(hex) {
  if (typeof hex !== "string" || hex.length === 0) {
    return null;
  }
  let which, obj;
  try {
    const b = ByteBuffer.fromHex(hex, ByteBuffer.LITTLE_ENDIAN);
    [which, obj] = custom_plugin_operation.fromByteBuffer(b);
    if (b.offset !== b.limit) {
      return null; // trailing garbage: not a clean packed payload
    }
  } catch (e) {
    return null;
  }
  if (which !== 0 || !obj) {
    return null;
  }
  const toUtf8 = (v) => (Buffer.isBuffer(v) ? v.toString("utf8") : v);
  return {
    remove: !!obj.remove,
    catalog: toUtf8(obj.catalog),
    entries: (obj.key_values || []).map(([k, v]) => ({
      key: toUtf8(k),
      value: v === undefined || v === null ? v : toUtf8(v),
    })),
  };
}

/** Build a unique per-(account, catalog) message key. */
export function buildMessageKey(nowMs = Date.now(), rand = Math.floor(Math.random() * 0xffffff)) {
  return `${nowMs}-${rand.toString(16).padStart(6, "0")}`;
}

/**
 * Encode a chat message into custom_operation.data hex.
 * The stored value is a JSON string so the plugin parses it into an object.
 * Size is enforced in UTF-8 bytes against the chain transaction budget.
 * NOTE: no timestamp is stored — client clocks can't be trusted, so ordering
 * uses the plugin-assigned storage ID ("7.0.x", write order) instead.
 */
export function buildTrollboxData({ channel, catalog, key, username, text, lang = "en", attach = null, maxBytes = maxMessageBytes() }) {
  if (!text || !text.trim()) {
    throw new Error("message text is empty");
  }
  let valueObj = {
    v: 1,
    ch: channel,
    u: username,
    ln: typeof lang === "string" && /^[a-z]{2}$/.test(lang) ? lang : "en",
    text,
  };
  if (attach !== null && attach !== undefined) {
    const valid = validateAttachmentShape(attach);
    if (!valid) {
      throw new Error("invalid attachment");
    }
    valueObj = { ...valueObj, v: 2, attach: valid };
  }
  const value = JSON.stringify(valueObj);
  const bytes = utf8Length(value);
  if (bytes > maxBytes) {
    throw new Error(`message is ${bytes - maxBytes} bytes over the size limit (${maxBytes} bytes)`);
  }
  assertKey(key);
  return packAccountStorageMap({ remove: false, catalog, entries: [[key, value]] });
}

/**
 * Decode an account_storage_object value (as returned by
 * custom_operations.get_storage_info) into a normalized message.
 * The plugin parses our JSON-string values into objects, but tolerate
 * string values too. Returns null for non-trollbox payloads.
 */
export function decodeTrollboxValue(storageObject) {
  if (!storageObject) {
    return null;
  }
  let raw = storageObject.value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  if (!raw || typeof raw !== "object" || typeof raw.text !== "string") {
    return null;
  }
  const attach =
    raw.attach === undefined || raw.attach === null
      ? null
      : validateAttachmentShape(raw.attach);
  return {
    id: storageObject.id,
    account: storageObject.account,
    catalog: storageObject.catalog,
    key: storageObject.key,
    author: typeof raw.u === "string" ? raw.u : null,
    channel: typeof raw.ch === "string" ? raw.ch : null,
    text: raw.text,
    attach,
  };
}

/**
 * Encode a forum topic (ad + OP unified) into custom_operation.data hex.
 * Topics live in `forum-<channel>` catalogs under key `th`. Shape is
 * {title, text} plus an optional `attach` (validated trollbox attachment,
 * at most one). The catalog IS the type, and authorship is the
 * chain-stamped payer, so no t/v/u/ln fields are stored.
 */
export function buildForumTopicData({ catalog, key, title, text, attach = null, maxBytes = maxMessageBytes() }) {
  if (typeof catalog !== "string" || !/^forum-(general|announcements|trading|governance|dev)$/.test(catalog)) {
    throw new Error("unknown forum channel catalog");
  }
  const valid = validateTopicShape({ title, text }, validateAttachmentShape);
  if (!valid) {
    throw new Error("invalid forum topic (title 3-120 chars, text 1-1500 chars)");
  }
  if (attach !== null && attach !== undefined) {
    const shape = validateAttachmentShape(attach);
    if (!shape) {
      throw new Error("invalid forum topic attachment");
    }
    valid.attach = shape;
  }
  const value = JSON.stringify(valid);
  const bytes = utf8Length(value);
  if (bytes > maxBytes) {
    throw new Error(`topic is ${bytes - maxBytes} bytes over the size limit (${maxBytes} bytes)`);
  }
  assertKey(key);
  return packAccountStorageMap({ remove: false, catalog, entries: [[key, value]] });
}

/**
 * Encode a forum reply into custom_operation.data hex. Replies live in
 * `forum-topic-<hash16>` catalogs; threading is a `> ` quote convention
 * inside text, not a protocol field. Shape is {text} plus an optional
 * `attach` (at most one).
 */
export function buildForumReplyData({ catalog, key, text, attach = null, maxBytes = maxMessageBytes() }) {
  if (!isForumTopicCatalog(catalog)) {
    throw new Error("unknown forum thread catalog");
  }
  const valid = validateReplyShape({ text }, validateAttachmentShape);
  if (!valid) {
    throw new Error("invalid forum reply (text 1-1500 chars)");
  }
  if (attach !== null && attach !== undefined) {
    const shape = validateAttachmentShape(attach);
    if (!shape) {
      throw new Error("invalid forum reply attachment");
    }
    valid.attach = shape;
  }
  const value = JSON.stringify(valid);
  const bytes = utf8Length(value);
  if (bytes > maxBytes) {
    throw new Error(`reply is ${bytes - maxBytes} bytes over the size limit (${maxBytes} bytes)`);
  }
  assertKey(key);
  return packAccountStorageMap({ remove: false, catalog, entries: [[key, value]] });
}

/**
 * Decode an account_storage_object value from a forum catalog into a
 * normalized topic ({kind: "topic", title, text, attach}) or reply
 * ({kind: "reply", text, attach}). The catalog determines the expected
 * shape — cross-shaped or bad-attachment payloads return null.
 * Authorship comes only from storageObject.account (chain-stamped); no
 * author fields are read.
 */
export function decodeForumValue(storageObject) {
  if (!storageObject) {
    return null;
  }
  const { catalog, key } = storageObject;
  let raw = storageObject.value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") {
    return null;
  }
  if (typeof catalog === "string" && /^forum-(general|announcements|trading|governance|dev)$/.test(catalog)) {
    const valid = validateTopicShape(raw, validateAttachmentShape);
    if (!valid) {
      return null;
    }
    return {
      id: storageObject.id,
      account: storageObject.account,
      catalog,
      key,
      kind: "topic",
      title: valid.title,
      text: valid.text,
      attach: valid.attach ?? null,
    };
  }
  if (isForumTopicCatalog(catalog)) {
    const valid = validateReplyShape(raw, validateAttachmentShape);
    if (!valid) {
      return null;
    }
    return {
      id: storageObject.id,
      account: storageObject.account,
      catalog,
      key,
      kind: "reply",
      text: valid.text,
      attach: valid.attach ?? null,
    };
  }
  return null;
}
