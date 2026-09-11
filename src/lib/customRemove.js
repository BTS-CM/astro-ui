/**
 * Custom-operation removal helper (trollbox + forum).
 *
 * Pure module (no DOM, no network, no store imports).
 * Wraps packAccountStorageMap with remove=true: the plugin deletes the
 * (payer, catalog, key) object from its index so get_storage_info stops
 * returning it. History in blocks is untouched.
 */

import { packAccountStorageMap } from "../bts/serializer/customOperations.js";

function isAccountId(v) {
  return typeof v === "string" && /^1\.2\.\d+$/.test(v);
}

/**
 * Build a single-op custom removal transaction body.
 * Throws on malformed inputs. `opId` is ignored by the plugin (pass the
 * app's TROLLBOX_OP_ID / FORUM_OP_ID for explorer consistency).
 */
export function buildRemoveOp({ payer, catalog, key, opId }) {
  if (!isAccountId(payer)) {
    throw new Error("remove requires a valid payer account id");
  }
  if (typeof catalog !== "string" || catalog.length === 0) {
    throw new Error("remove requires a catalog");
  }
  if (typeof key !== "string" || key.length === 0) {
    throw new Error("remove requires a key");
  }
  if (typeof opId !== "number" || !Number.isInteger(opId)) {
    throw new Error("remove requires a numeric op id");
  }
  const data = packAccountStorageMap({
    remove: true,
    catalog,
    entries: [[key, ""]],
  });
  return [
    {
      fee: { amount: 0, asset_id: "1.3.0" },
      payer,
      required_auths: [payer],
      id: opId,
      data,
    },
  ];
}
