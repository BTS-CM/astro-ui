/**
 * Trollbox attachment validation + resolution.
 *
 * Pure module (no DOM, no network, no store imports) so it can be unit
 * tested in Node. Trust model:
 * - Shape + ID structure are checked here with anchored regexes. Anything
 *   malformed decodes to null and never renders.
 * - Labels and navigation URLs are DERIVED from trusted sources
 *   (build-time asset/pool lists, live chain objects) — raw chain payload
 *   strings are never interpolated into hrefs. Symbols go through
 *   encodeURIComponent as a second barrier.
 */

export const ATTACH_TYPES = ["asset", "pair", "pool", "offer"];

// Protocol object type numbers (the middle of "1.<type>.<instance>").
// Stored on-chain instead of type name strings: 1-2 digits vs 5+ letters.
// Asset and pair share type 3 and are told apart by shape (id vs a/b).
const TYPE_NUMBER = { asset: 3, pair: 3, pool: 19, offer: 21 };
const VALID_TYPE_NUMS = [3, 19, 21];

// Object-ID spaces per attachment type. Only the integer instance number
// is stored on-chain; the space prefix is re-attached on read. Storing
// bare integers saves bytes and lets validation prove the payload holds
// nothing but numbers. (Kept for legacy string-ID normalization.)
const TYPE_SPACE = {
  asset: "1.3.",
  pair: "1.3.",
  pool: "1.19.",
  offer: "1.21.",
};

/** Coerce a type tag to its protocol type number. Legacy names map too. */
function toTypeNumber(t) {
  if (typeof t === "number") {
    return Number.isInteger(t) && VALID_TYPE_NUMS.includes(t) ? t : null;
  }
  if (
    typeof t === "string" &&
    Object.prototype.hasOwnProperty.call(TYPE_NUMBER, t)
  ) {
    return TYPE_NUMBER[t];
  }
  return null;
}

const LEGACY_ID_RE = /^1\.(3|19|21)\.(\d+)$/;

/**
 * Coerce an ID to its integer instance number. Accepts canonical integers
 * and legacy "1.x.y" strings (space must match the expected type).
 * Anything else → null.
 */
function toIdNumber(value, space) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string") {
    const m = LEGACY_ID_RE.exec(value);
    if (!m || `1.${m[1]}.` !== space || m[2].length > 15) {
      return null;
    }
    const n = Number(m[2]);
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

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

/**
 * Strictly validate a raw attachment (parsed from a chain message value).
 * Returns a canonical {t: <type number>, ...} object with INTEGER ids, or
 * null. Accepts legacy string tags ("asset"…) and legacy "1.x.y" string
 * IDs (normalized) for backward compatibility. Asset and pair share type
 * 3 and are told apart by shape (id vs a/b).
 * Rejects: non-objects, unknown types, missing/extra keys, non-numeric
 * values, space mismatches, identical pair legs. "__proto__" style keys
 * fail the exact-keys check.
 */
export function validateAttachmentShape(raw) {
  if (!isPlainObject(raw)) {
    return null;
  }
  const tn = toTypeNumber(raw.t);
  if (tn === null) {
    return null;
  }
  const space = `1.${tn}.`;
  if (tn === 3 && hasExactKeys(raw, ["t", "a", "b"])) {
    const a = toIdNumber(raw.a, space);
    const b = toIdNumber(raw.b, space);
    if (a === null || b === null || a === b) {
      return null;
    }
    return { t: 3, a, b };
  }
  if (!hasExactKeys(raw, ["t", "id"])) {
    return null;
  }
  const id = toIdNumber(raw.id, space);
  if (id === null) {
    return null;
  }
  return { t: tn, id };
}

/**
 * Display kind name for a (validated or dialog-built) attachment:
 * "asset" | "pair" | "pool" | "offer" | null. Used for icons, labels and
 * branching — never stored on-chain.
 */
export function attachKind(attach) {
  if (!isPlainObject(attach)) {
    return null;
  }
  if (
    attach.t === 3 &&
    typeof attach.a === "number" &&
    typeof attach.b === "number"
  ) {
    return "pair";
  }
  if (attach.t === 3 && typeof attach.id === "number") {
    return "asset";
  }
  if (attach.t === 19 && typeof attach.id === "number") {
    return "pool";
  }
  if (attach.t === 21 && typeof attach.id === "number") {
    return "offer";
  }
  return null;
}

/** Full object ID for a stored type number + integer instance number. */
export function fullObjectId(typeNum, instance) {
  if (
    typeof typeNum !== "number" ||
    !VALID_TYPE_NUMS.includes(typeNum) ||
    typeof instance !== "number"
  ) {
    return null;
  }
  return `1.${typeNum}.${instance}`;
}

/** Object IDs referenced by an attachment (for live existence checks). */
export function attachmentObjectIds(attach) {
  const kind = attachKind(attach);
  if (kind === "pair") {
    const a = fullObjectId(3, attach.a);
    const b = fullObjectId(3, attach.b);
    return a && b ? [a, b] : [];
  }
  if (!kind) {
    return [];
  }
  const id = fullObjectId(attach.t, attach.id);
  return id ? [id] : [];
}

function findAsset(assets, id) {
  return (assets || []).find((a) => a && a.id === id) || null;
}

function findPool(pools, id) {
  return (pools || []).find((p) => p && p.id === id) || null;
}

function marketOf(a, b) {
  return `${encodeURIComponent(a)}_${encodeURIComponent(b)}`;
}

/**
 * Resolve a validated attachment into a display label + navigation actions,
 * using ONLY trusted lists. Returns null when anything fails to resolve —
 * callers must not render in that case.
 *
 * @arg {object} attach - output of validateAttachmentShape
 * @arg {Array} assets - full asset objects ({id, symbol, bitasset_data_id?})
 * @arg {Array} pools - pool objects ({id, asset_a_id, asset_a_symbol, ...})
 */
export function resolveAttachmentMeta(attach, { assets = [], pools = [] } = {}) {
  const kind = attachKind(attach);
  if (!kind) {
    return null;
  }
  switch (kind) {
    case "asset": {
      const asset = findAsset(assets, fullObjectId(3, attach.id));
      if (!asset || typeof asset.symbol !== "string") return null;
      const sym = asset.symbol;
      const quote = sym === "BTS" ? "USD" : "BTS";
      const actions = [
        { key: "trade", label: "Trade", href: `/dex.html?market=${marketOf(sym, quote)}` },
        { key: "borrow", label: "Borrow", href: `/borrow.html?tab=searchOffers&searchTab=borrow&searchText=${encodeURIComponent(sym)}` },
        { key: "lend", label: "Lend", href: `/lend.html?asset=${encodeURIComponent(sym)}` },
      ];
      if (asset.bitasset_data_id) {
        actions.push({ key: "asset", label: "Asset page", href: `/smartcoin.html?id=${encodeURIComponent(fullObjectId(3, attach.id))}` });
      }
      return { type: "asset", label: sym, actions };
    }
    case "pair": {
      const a = findAsset(assets, fullObjectId(3, attach.a));
      const b = findAsset(assets, fullObjectId(3, attach.b));
      if (!a || !b || typeof a.symbol !== "string" || typeof b.symbol !== "string") {
        return null;
      }
      const market = marketOf(a.symbol, b.symbol);
      return {
        type: "pair",
        label: `${a.symbol}/${b.symbol}`,
        actions: [
          { key: "limit", label: "Limit order", href: `/dex.html?market=${market}` },
          { key: "instant", label: "Instant trade", href: `/instant_trade.html?market=${market}` },
        ],
      };
    }
    case "pool": {
      const pool = findPool(pools, fullObjectId(19, attach.id));
      if (
        !pool ||
        typeof pool.asset_a_symbol !== "string" ||
        typeof pool.asset_b_symbol !== "string"
      ) {
        return null;
      }
      const id = encodeURIComponent(fullObjectId(19, attach.id));
      return {
        type: "pool",
        label: `${pool.asset_a_symbol}/${pool.asset_b_symbol}`,
        actions: [
          { key: "swap", label: "Swap", href: `/swap.html?pool=${id}` },
          { key: "stake", label: "Stake", href: `/stake.html?pool=${id}` },
        ],
      };
    }
    case "offer": {
      // Offers have no build-time list; the label is the instance number
      // (credit-page "#N" convention) and details are live-verified when
      // the dialog opens.
      return {
        type: "offer",
        label: `#${attach.id}`,
        actions: [
          {
            key: "view",
            label: "View / borrow",
            href: `/offer.html?id=${encodeURIComponent(fullObjectId(21, attach.id))}`,
          },
        ],
      };
    }
    default:
      return null;
  }
}
