import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

export interface CandleDatum {
  time: number; // ms epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bucketSec: number;
  keyOpen: string;
}

const FALLBACK_BUCKETS = [60, 300, 900, 1800, 3600, 14400, 86400];
const BUCKET_COUNT = 200; // per window, matches bitshares-ui MarketsActions.js:162

function nodeUrl(chain: string, specificNode?: string | null) {
  return specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
}

function isoSlice(date: Date): string {
  // bitshares-ui uses .slice(0,-5) to strip .000Z keeping YYYY-MM-DDTHH:mm:ss
  return date.toISOString().slice(0, 19);
}

// Parse bitshares bucket object into OHLCV
// bucket shape: { key:{open, close}, high_base, high_quote, low_base, low_quote, open_base, open_quote, close_base, close_quote, base_volume, quote_volume } OR similar
// We normalise price = quote per base? bitshares-ui uses utils.get_asset_price with inversion; here we return raw ratio and let consumer invert.
function parseBucket(bucket: any, basePrecision: number, quotePrecision: number, inverted: boolean): CandleDatum | null {
  if (!bucket || !bucket.key) return null;
  try {
    const openTime = new Date(bucket.key.open + "Z").getTime(); // bitshares returns without Z sometimes; ensure UTC
    // Prices are derived from base/quote amounts. Use _get helpers similar to bitshares-ui MarketClasses.Price.toReal()
    // high/low/open/close are stored as base/quote ratios; we need human floats.
    // bucket fields vary by core version; handle both naming conventions.
    const toPrice = (base: number | string, quote: number | string): number => {
      const b = Number(base);
      const q = Number(quote);
      if (!q || !Number.isFinite(b / q)) return 0;
      const price = b / q;
      return price;
    };

    // Attempt to extract human price fields
    // Preferred: bucket.high_base / high_quote etc are satoshis counts; convert via precision
    const scale = (amount: number, precision: number) => amount / 10 ** precision;

    let high: number, low: number, open: number, close: number, volume: number;

    if (bucket.high_base !== undefined && bucket.high_quote !== undefined) {
      const hb = scale(Number(bucket.high_base), basePrecision);
      const hq = scale(Number(bucket.high_quote), quotePrecision);
      high = hq ? hb / hq : 0;
      const lb = scale(Number(bucket.low_base), basePrecision);
      const lq = scale(Number(bucket.low_quote), quotePrecision);
      low = lq ? lb / lq : 0;
      const ob = scale(Number(bucket.open_base), basePrecision);
      const oq = scale(Number(bucket.open_quote), quotePrecision);
      open = oq ? ob / oq : 0;
      const cb = scale(Number(bucket.close_base), basePrecision);
      const cq = scale(Number(bucket.close_quote), quotePrecision);
      close = cq ? cb / cq : 0;
      // volume in base asset human units
      volume = scale(Number(bucket.base_volume ?? 0), basePrecision);
    } else if (bucket.high !== undefined) {
      // already human prices
      high = Number(bucket.high);
      low = Number(bucket.low);
      open = Number(bucket.open);
      close = Number(bucket.close);
      volume = Number(bucket.base_volume ?? bucket.volume ?? 0);
      if (basePrecision !== undefined) volume = volume / 10 ** basePrecision;
    } else {
      // fallback: try key.open/close are prices strings
      high = Number(bucket.high_base ?? bucket.high ?? 0);
      low = Number(bucket.low_base ?? bucket.low ?? 0);
      open = Number(bucket.open_base ?? bucket.open ?? 0);
      close = Number(bucket.close_base ?? bucket.close ?? 0);
      volume = Number(bucket.base_volume ?? 0) / 10 ** basePrecision;
    }

    if (inverted) {
      const inv = (p: number) => (p ? 1 / p : 0);
      const iOpen = inv(open);
      const iHigh = inv(high);
      const iLow = inv(low);
      const iClose = inv(close);
      open = iOpen;
      close = iClose;
      // After inversion high/low swap: original low becomes new high
      high = iLow;
      low = iHigh;
      if (high < low) {
        const tmp = high;
        high = low;
        low = tmp;
      }
    }

    // Guard NaN/Infinity as bitshares-ui does
    if (!Number.isFinite(high) || high === Infinity) high = open || close || 0;
    if (!Number.isFinite(low) || low === 0) low = open || close || 0;
    if (!Number.isFinite(open)) open = close || low || 0;
    if (!Number.isFinite(close)) close = open || low || 0;
    // ensure high >= max(open,close), low <= min(open,close)
    high = Math.max(high, open, close);
    low = Math.min(low, open, close);

    return {
      time: openTime,
      open,
      high,
      low,
      close,
      volume: Number.isFinite(volume) ? volume : 0,
      bucketSec: 0,
      keyOpen: bucket.key.open,
    };
  } catch (e) {
    console.log("parseBucket error", e, bucket);
    return null;
  }
}

export async function getMarketHistoryBuckets(
  chain: string,
  specificNode?: string | null
): Promise<number[]> {
  const node = nodeUrl(chain, specificNode);
  let api;
  try {
    api = await Apis.instance(node, true, 4000, { enableDatabase: true, enableHistory: true }, () => {});
  } catch (e) {
    console.log("getMarketHistoryBuckets connect error", e);
    return FALLBACK_BUCKETS;
  }
  try {
    const result = await api.history_api().exec("get_market_history_buckets", []);
    if (Array.isArray(result) && result.length) return result;
    return FALLBACK_BUCKETS;
  } catch (e) {
    console.log("get_market_history_buckets error", e);
    return FALLBACK_BUCKETS;
  } finally {
    try { await api.close(); } catch {}
  }
}

export async function getMarketHistory(
  chain: string,
  base: string,
  quote: string,
  bucketSeconds: number,
  startISO: string,
  endISO: string,
  specificNode?: string | null
): Promise<any[]> {
  const node = nodeUrl(chain, specificNode);
  let api;
  try {
    api = await Apis.instance(node, true, 4000, { enableDatabase: true, enableHistory: true }, () => {});
  } catch (e) {
    console.log("getMarketHistory connect error", e);
    throw e;
  }
  try {
    const result = await api.history_api().exec("get_market_history", [base, quote, bucketSeconds, startISO, endISO]);
    return Array.isArray(result) ? result : [];
  } finally {
    try { await api.close(); } catch {}
  }
}

// Orchestrated fetch of 600 buckets (3 windows ×200) mirroring bitshares-ui MarketsActions.js:447,468,477
export async function getCandleHistory(
  chain: string,
  baseId: string,
  quoteId: string,
  bucketSeconds: number,
  basePrecision: number,
  quotePrecision: number,
  specificNode?: string | null
): Promise<{ candles: CandleDatum[]; buckets: number[] }> {
  // Fetch buckets in parallel with history
  const bucketsPromise = getMarketHistoryBuckets(chain, specificNode).catch(() => FALLBACK_BUCKETS);

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 1);
  const startDate = new Date(now.getTime() - bucketSeconds * BUCKET_COUNT * 1000);
  const startDate2 = new Date(now.getTime() - bucketSeconds * BUCKET_COUNT * 2000);
  const startDate3 = new Date(now.getTime() - bucketSeconds * BUCKET_COUNT * 3000);

  const s1 = isoSlice(startDate);
  const s2 = isoSlice(startDate2);
  const s3 = isoSlice(startDate3);
  const e = isoSlice(endDate);
  // For sparse large buckets (e.g. 86400 -> 600 days) cap windows to 200 total to reduce RPC
  // Following plan note: cap for ≤60s already 200; we keep 3 windows for >60s as bitshares-ui.
  // If bucketSeconds <=60, limit to single window to save load (optional)
  const useThreeWindows = bucketSeconds > 60;

  let rawBuckets: any[] = [];
  try {
    if (useThreeWindows) {
      const [d1, d2, d3] = await Promise.all([
        getMarketHistory(chain, baseId, quoteId, bucketSeconds, s1, e, specificNode),
        getMarketHistory(chain, baseId, quoteId, bucketSeconds, s2, s1, specificNode),
        getMarketHistory(chain, baseId, quoteId, bucketSeconds, s3, s2, specificNode),
      ]);
      rawBuckets = [...(d3 ?? []), ...(d2 ?? []), ...(d1 ?? [])];
    } else {
      rawBuckets = await getMarketHistory(chain, baseId, quoteId, bucketSeconds, s1, e, specificNode);
    }
  } catch (e) {
    console.log("getCandleHistory fetch error", e);
    rawBuckets = [];
  }

  const buckets = await bucketsPromise;
  // Deduplicate by key.open and sort least recent first (already), then parse
  const seen = new Set<string>();
  const deduped = rawBuckets.filter((b) => {
    const k = b?.key?.open;
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const inverted = (() => {
    try {
      const bNum = parseInt(baseId.split(".")[2], 10);
      const qNum = parseInt(quoteId.split(".")[2], 10);
      return bNum > qNum;
    } catch { return false; }
  })();

  const candles: CandleDatum[] = deduped
    .map((b) => {
      const c = parseBucket(b, basePrecision, quotePrecision, inverted);
      if (c) c.bucketSec = bucketSeconds;
      return c;
    })
    .filter(Boolean) as CandleDatum[];

  // Sort by time ascending
  candles.sort((a, b) => a.time - b.time);

  return { candles, buckets };
}

const [createMarketHistoryBucketsStore, , marketBucketsHelpers] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const specificNode = (args[1] as string | null) ?? null;
    try {
      return await getMarketHistoryBuckets(chain, specificNode);
    } catch (e) {
      console.log(e);
      return FALLBACK_BUCKETS;
    }
  },
});

const [createMarketCandleStore, , marketCandleHelpers] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const baseId = args[1] as string;
    const quoteId = args[2] as string;
    const bucketSeconds = args[3] as number;
    const basePrecision = args[4] as number;
    const quotePrecision = args[5] as number;
    const specificNode = (args[6] as string | null) ?? null;
    try {
      const { candles, buckets } = await getCandleHistory(chain, baseId, quoteId, bucketSeconds, basePrecision, quotePrecision, specificNode);
      if (!candles) return { candles: [], buckets };
      return { candles, buckets };
    } catch (e) {
      console.log(e);
      return { candles: [], buckets: FALLBACK_BUCKETS };
    }
  },
});

export { createMarketHistoryBucketsStore, createMarketCandleStore, marketBucketsHelpers, marketCandleHelpers };
