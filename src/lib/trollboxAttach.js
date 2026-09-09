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
// Barter has no chain object: 99 is an app-level namespace explicitly
// outside protocol object-type range, documented here to avoid collision.
const TYPE_NUMBER = { asset: 3, pair: 3, pool: 19, offer: 21, barter: 99 };
const VALID_TYPE_NUMS = [3, 19, 21, 99];
const BARTER_TYPE = 99;
const BARTER_MAX_LEGS = 10;

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

const LEGACY_ID_RE = /^1\.(\d+)\.(\d+)$/;

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

/** Human amount string: positive decimal, at most 12 fraction digits
 *  (asset precision itself is checked against chain data at pick/send). */
function isAmountString(v) {
  return (
    typeof v === "string" &&
    /^\d+(\.\d{1,12})?$/.test(v) &&
    parseFloat(v) > 0
  );
}

/** Validate one barter leg (offer/want): 1..10 unique-asset entries. */
function validBarterLeg(leg) {
  if (!Array.isArray(leg) || leg.length === 0 || leg.length > BARTER_MAX_LEGS) {
    return null;
  }
  const out = [];
  const seen = new Set();
  for (const e of leg) {
    if (!isPlainObject(e) || !hasExactKeys(e, ["a", "n"])) {
      return null;
    }
    const a = toIdNumber(e.a, "1.3.");
    if (a === null || seen.has(a)) {
      return null;
    }
    seen.add(a);
    if (!isAmountString(e.n)) {
      return null;
    }
    out.push({ a, n: e.n });
  }
  return out;
}

/** Validate the optional barter escrow block. Absent → undefined. */
function validBarterEscrow(e) {
  if (e === undefined || e === null) {
    return undefined;
  }
  if (!isPlainObject(e) || !hasExactKeys(e, ["a", "f", "first"])) {
    return null;
  }
  const a = toIdNumber(e.a, "1.2.");
  if (a === null) {
    return null;
  }
  if (!isAmountString(e.f)) {
    return null;
  }
  if (e.first !== "me" && e.first !== "them") {
    return null;
  }
  return { a, f: e.f, first: e.first };
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
  if (tn === BARTER_TYPE) {
    const hasEscrow = Object.prototype.hasOwnProperty.call(raw, "escrow");
    if (
      !hasExactKeys(
        raw,
        hasEscrow ? ["t", "offer", "want", "escrow"] : ["t", "offer", "want"]
      )
    ) {
      return null;
    }
    const offer = validBarterLeg(raw.offer);
    const want = validBarterLeg(raw.want);
    if (!offer || !want) {
      return null;
    }
    const out = { t: BARTER_TYPE, offer, want };
    if (hasEscrow) {
      const escrow = validBarterEscrow(raw.escrow);
      if (!escrow) {
        return null;
      }
      out.escrow = escrow;
    }
    return out;
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
  if (attach.t === BARTER_TYPE) {
    return "barter";
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
  if (kind === "barter") {
    const ids = [];
    for (const leg of [attach.offer, attach.want]) {
      if (!Array.isArray(leg)) {
        return [];
      }
      for (const e of leg) {
        if (!e || typeof e.a !== "number") {
          return [];
        }
        ids.push(`1.3.${e.a}`);
      }
    }
    if (
      attach.escrow &&
      typeof attach.escrow.a === "number"
    ) {
      ids.push(`1.2.${attach.escrow.a}`);
    }
    return ids;
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
/**
 * Resolve a validated attachment into a display label + navigation actions,
 * using ONLY trusted lists. Returns null when anything fails to resolve —
 * callers must not render in that case.
 *
 * @arg {object} attach - output of validateAttachmentShape
 * @arg {object} lists - {assets, pools} build-time lists
 * @arg {object} context - {counterparty} message-author account id, used
 *   only by the barter proceed link
 */
export function resolveAttachmentMeta(
  attach,
  { assets = [], pools = [] } = {},
  context = {}
) {
  const kind = attachKind(attach);
  if (!kind) {
    return null;
  }
  if (kind === "barter") {
    const resolveLeg = (leg) => {
      if (!Array.isArray(leg)) {
        return null;
      }
      const out = [];
      for (const e of leg) {
        if (
          !e ||
          typeof e.a !== "number" ||
          typeof e.n !== "string"
        ) {
          return null;
        }
        const asset = findAsset(assets, `1.3.${e.a}`);
        if (!asset || typeof asset.symbol !== "string") {
          return null;
        }
        out.push({
          instance: e.a,
          id: `1.3.${e.a}`,
          symbol: asset.symbol,
          amount: e.n,
        });
      }
      return out;
    };
    const offer = resolveLeg(attach.offer);
    const want = resolveLeg(attach.want);
    if (!offer || !want) {
      return null;
    }
    let escrow = null;
    if (attach.escrow) {
      const e = attach.escrow;
      if (
        typeof e.a !== "number" ||
        typeof e.f !== "string" ||
        (e.first !== "me" && e.first !== "them")
      ) {
        return null;
      }
      escrow = { account: `1.2.${e.a}`, fee: e.f, first: e.first };
    }
    const actions = [];
    const counterparty = context.counterparty;
    if (typeof counterparty === "string" && /^1\.2\.\d+$/.test(counterparty)) {
      // Viewer takes the opposite side of the poster: the viewer's offer
      // is the poster's want and vice versa. "first" flips perspective —
      // creator-first "me" means the viewer goes second.
      const legParam = (entries) =>
        entries.map((e) => `1.3.${e.instance}:${e.amount}`).join(",");
      const params = new URLSearchParams();
      params.set("from", legParam(want));
      params.set("to", legParam(offer));
      params.set("counterparty", counterparty);
      if (escrow) {
        params.set("escrow", escrow.account);
        params.set("escrowFee", escrow.fee);
        params.set("first", escrow.first === "me" ? "counterparty" : "self");
      }
      actions.push({
        key: "proceed",
        href: `/barter.html?${params.toString()}`,
      });
    }
    return { type: "barter", details: { offer, want, escrow }, actions };
  }
  switch (kind) {
    case "asset": {
      const asset = findAsset(assets, fullObjectId(3, attach.id));
      if (!asset || typeof asset.symbol !== "string") return null;
      const sym = asset.symbol;
      const quote = sym === "BTS" ? "USD" : "BTS";
      const actions = [
        { key: "trade", href: `/dex.html?market=${marketOf(sym, quote)}` },
        { key: "borrow", href: `/borrow.html?tab=searchOffers&searchTab=borrow&searchText=${encodeURIComponent(sym)}` },
        { key: "lend", href: `/lend.html?asset=${encodeURIComponent(sym)}` },
      ];
      if (asset.bitasset_data_id) {
        actions.push({ key: "asset", href: `/smartcoin.html?id=${encodeURIComponent(fullObjectId(3, attach.id))}` });
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
          { key: "limit", href: `/dex.html?market=${market}` },
          { key: "instant", href: `/instant_trade.html?market=${market}` },
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
          { key: "swap", href: `/swap.html?pool=${id}` },
          { key: "stake", href: `/stake.html?pool=${id}` },
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
            href: `/offer.html?id=${encodeURIComponent(fullObjectId(21, attach.id))}`,
          },
        ],
      };
    }
    default:
      return null;
  }
}
