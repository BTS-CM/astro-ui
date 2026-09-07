import ByteBuffer from "./ByteBuffer.js";
import types from "./types.js";
import SerializerImpl from "./serializer.js";

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

// BitShares operation id for custom_operation (protocol/operations.hpp).
export const CUSTOM_OPERATION_ID = 35;

// Matches CUSTOM_OPERATIONS_MAX_KEY_SIZE in custom_objects.hpp.
export const MAX_KEY_SIZE = 200;

// Client-side cap for chat text so fees stay near the ~1 BTS base fee.
export const MAX_MESSAGE_CHARS = 280;

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
 */
export function buildTrollboxData({ channel, catalog, key, username, text, timestamp }) {
  if (!text || !text.trim()) {
    throw new Error("message text is empty");
  }
  if (text.length > MAX_MESSAGE_CHARS) {
    throw new Error(`message exceeds ${MAX_MESSAGE_CHARS} characters`);
  }
  assertKey(key);
  const value = JSON.stringify({
    v: 1,
    ch: channel,
    u: username,
    t: timestamp,
    text,
  });
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
  const timestamp = Number(raw.t);
  return {
    id: storageObject.id,
    account: storageObject.account,
    catalog: storageObject.catalog,
    key: storageObject.key,
    author: typeof raw.u === "string" ? raw.u : null,
    channel: typeof raw.ch === "string" ? raw.ch : null,
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    text: raw.text,
  };
}
