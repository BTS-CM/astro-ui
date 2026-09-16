import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { map } from "nanostores";
import {
  createMarketCandleStore,
  createMarketHistoryBucketsStore,
  type CandleDatum,
} from "@/nanoeffects/MarketCandleHistory";

export interface UseMarketCandlesOptions {
  chain: string;
  baseId: string | null;
  quoteId: string | null;
  basePrecision?: number | null;
  quotePrecision?: number | null;
  bucketSeconds?: number;
  enabled?: boolean;
  specificNode?: string | null;
  /** Optional external subscription tick (e.g. useDexOrderBookLive.lastFetchAt) to trigger resync */
  liveTick?: number | null;
}

const FALLBACK_BUCKETS = [60, 300, 900, 1800, 3600, 14400, 86400];

// Inactive placeholder so the hook can unconditionally subscribe even when
// params are missing (mirrors the previous null/empty return contract).
const inactiveState = map({ loading: false as boolean });

export function useMarketCandles(options: UseMarketCandlesOptions) {
  const {
    chain,
    baseId,
    quoteId,
    basePrecision,
    quotePrecision,
    bucketSeconds = 3600,
    enabled = true,
    specificNode,
    liveTick = null,
  } = options;

  const paramsValid =
    enabled &&
    !!chain &&
    !!baseId &&
    !!quoteId &&
    basePrecision != null &&
    quotePrecision != null;

  const nodeKey = specificNode ?? "";
  // nanoquery key parts accept only string|number|true — a null part is
  // mistaken for a store and crashes getKeyStore (batched([null]) ->
  // null.listen on mount). nodeKey stays "" when unset, matching the
  // pre-migration behavior where the node object yielded "".
  // nanoquery caches by key string globally per creator, so concurrent chart
  // mounts with identical params share one fetch; `dedupeTime` absorbs the
  // liveTick pile-up and `revalidateInterval` replaces the manual poll
  // timer (nanoquery skips hidden tabs natively via focus gating).
  const candleStore = useMemo(() => {
    if (!paramsValid) return null;
    return createMarketCandleStore(
      [chain, baseId as string, quoteId as string, bucketSeconds, basePrecision as number, quotePrecision as number, nodeKey],
      {
        dedupeTime: 5000,
        revalidateInterval: Math.max(
          10000,
          Math.min(60000, (bucketSeconds || 3600) * 1000)
        ),
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, baseId, quoteId, bucketSeconds, basePrecision, quotePrecision, nodeKey, paramsValid]);

  const bucketsStore = useMemo(() => {
    if (!enabled || !chain) return null;
    return createMarketHistoryBucketsStore([chain, nodeKey], {
      dedupeTime: 30000,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, nodeKey, enabled]);

  const candleState = useStore(candleStore ?? inactiveState);
  const bucketState = useStore(bucketsStore ?? inactiveState);

  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [historyAvailable, setHistoryAvailable] = useState(true);

  const candles: CandleDatum[] | null = paramsValid
    ? ((candleState as any).data?.candles ?? null)
    : null;
  const fetchedBuckets: number[] | undefined = (candleState as any).data?.buckets;
  const buckets: number[] =
    (fetchedBuckets && fetchedBuckets.length
      ? fetchedBuckets
      : (bucketState as any).data) ?? FALLBACK_BUCKETS;
  const loading = paramsValid ? !!((candleState as any).loading) : false;
  const error = paramsValid ? (candleState as any).error ?? null : null;

  // Track freshness + history availability from store transitions.
  useEffect(() => {
    if ((candleState as any).data) {
      setLastFetchAt(Date.now());
      setHistoryAvailable(true);
    }
  }, [(candleState as any).data]);
  useEffect(() => {
    const e = (candleState as any).error;
    if (e) {
      // Distinguish history-disabled node: keep prior candles but flag unavailable
      if (
        String(e?.message ?? e).toLowerCase().includes("history") ||
        String(e).includes("unknown")
      ) {
        setHistoryAvailable(false);
      }
      setLastFetchAt(Date.now());
    }
  }, [(candleState as any).error]);

  // Live subscription resync: when market pushes, revalidate debounced 800ms.
  // This mirrors bitshares-ui MarketsActions subscription batch
  // (subscribe_to_market -> 500ms then re-fetch windows). nanoquery's
  // dedupeTime coalesces the herd across mounts.
  const debounceRef = useRef<any>(null);
  useEffect(() => {
    if (liveTick == null || liveTick === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        candleStore?.revalidate();
      } catch {}
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [liveTick, candleStore]);

  // Reset availability flag on market switch
  useEffect(() => {
    if (!enabled || !baseId || !quoteId) {
      setHistoryAvailable(true);
    }
  }, [enabled, baseId, quoteId]);

  return {
    candles,
    buckets,
    loading,
    error,
    lastFetchAt,
    historyAvailable,
    refetch: () => {
      try {
        candleStore?.revalidate();
      } catch {}
    },
  };
}
