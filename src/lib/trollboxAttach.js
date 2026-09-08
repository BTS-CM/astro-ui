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

const ASSET_ID_RE = /^1\.3\.\d+$/;
const POOL_ID_RE = /^1\.19\.\d+$/;
const OFFER_ID_RE = /^1\.21\.\d+$/;

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
 * Returns a canonical {t, ...} object or null. Rejects: non-objects,
 * unknown types, missing/extra keys, non-string values, bad ID formats,
 * identical pair legs. "__proto__" style keys fail the exact-keys check.
 */
export function validateAttachmentShape(raw) {
  if (!isPlainObject(raw) || typeof raw.t !== "string") {
    return null;
  }
  switch (raw.t) {
    case "asset":
      if (!hasExactKeys(raw, ["t", "id"])) return null;
      if (typeof raw.id !== "string" || !ASSET_ID_RE.test(raw.id)) return null;
      return { t: "asset", id: raw.id };
    case "pair":
      if (!hasExactKeys(raw, ["t", "a", "b"])) return null;
      if (
        typeof raw.a !== "string" ||
        typeof raw.b !== "string" ||
        !ASSET_ID_RE.test(raw.a) ||
        !ASSET_ID_RE.test(raw.b) ||
        raw.a === raw.b
      ) {
        return null;
      }
      return { t: "pair", a: raw.a, b: raw.b };
    case "pool":
      if (!hasExactKeys(raw, ["t", "id"])) return null;
      if (typeof raw.id !== "string" || !POOL_ID_RE.test(raw.id)) return null;
      return { t: "pool", id: raw.id };
    case "offer":
      if (!hasExactKeys(raw, ["t", "id"])) return null;
      if (typeof raw.id !== "string" || !OFFER_ID_RE.test(raw.id)) return null;
      return { t: "offer", id: raw.id };
    default:
      return null;
  }
}

/** Object IDs referenced by an attachment (for live existence checks). */
export function attachmentObjectIds(attach) {
  if (!attach) return [];
  switch (attach.t) {
    case "asset":
    case "pool":
    case "offer":
      return [attach.id];
    case "pair":
      return [attach.a, attach.b];
    default:
      return [];
  }
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
  if (!attach) return null;
  switch (attach.t) {
    case "asset": {
      const asset = findAsset(assets, attach.id);
      if (!asset || typeof asset.symbol !== "string") return null;
      const sym = asset.symbol;
      const quote = sym === "BTS" ? "USD" : "BTS";
      const actions = [
        { key: "trade", label: "Trade", href: `/dex.html?market=${marketOf(sym, quote)}` },
        { key: "borrow", label: "Borrow", href: `/borrow.html?tab=searchOffers&searchTab=borrow&searchText=${encodeURIComponent(sym)}` },
        { key: "lend", label: "Lend", href: `/lend.html?asset=${encodeURIComponent(sym)}` },
      ];
      if (asset.bitasset_data_id) {
        actions.push({ key: "asset", label: "Asset page", href: `/smartcoin.html?id=${encodeURIComponent(attach.id)}` });
      }
      return { type: "asset", label: sym, actions };
    }
    case "pair": {
      const a = findAsset(assets, attach.a);
      const b = findAsset(assets, attach.b);
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
      const pool = findPool(pools, attach.id);
      if (
        !pool ||
        typeof pool.asset_a_symbol !== "string" ||
        typeof pool.asset_b_symbol !== "string"
      ) {
        return null;
      }
      const id = encodeURIComponent(attach.id);
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
      // Offers have no build-time list; the label is the validated ID
      // itself and details are live-verified when the dialog opens.
      return {
        type: "offer",
        label: attach.id,
        actions: [
          {
            key: "view",
            label: "View / borrow",
            href: `/offer.html?id=${encodeURIComponent(attach.id)}`,
          },
        ],
      };
    }
    default:
      return null;
  }
}
