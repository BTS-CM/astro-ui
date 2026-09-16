import { useEffect, useState, useRef, useCallback } from "react";
import { getCandleHistory, getMarketHistoryBuckets, type CandleDatum } from "@/nanoeffects/MarketCandleHistory";
import {
  dedupedCall,
  shouldSkipBackgroundWork,
} from "@/lib/liveShare";

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

  const [candles, setCandles] = useState<CandleDatum[] | null>(null);
  const [buckets, setBuckets] = useState<number[]>(FALLBACK_BUCKETS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [historyAvailable, setHistoryAvailable] = useState(true);

  const liveTickRef = useRef<number | null>(liveTick);
  useEffect(() => { liveTickRef.current = liveTick; }, [liveTick]);

  const fetchBuckets = useCallback(async () => {
    if (!chain) return;
    if (shouldSkipBackgroundWork()) return;
    try {
      // Concurrent chart mounts previously fetched buckets N times.
      const b = await dedupedCall(
        `candleBuckets|${chain}|${specificNode ?? ""}`,
        () => getMarketHistoryBuckets(chain, specificNode),
        30000
      );
      if (Array.isArray(b) && b.length) setBuckets(b);
    } catch (e) {
      console.log("useMarketCandles buckets error", e);
    }
  }, [chain, specificNode]);

  const fetchCandles = useCallback(async () => {
    if (!enabled || !chain || !baseId || !quoteId || basePrecision == null || quotePrecision == null) {
      setCandles(null);
      setLoading(false);
      return;
    }
    if (shouldSkipBackgroundWork()) return;
    setLoading(true);
    setError(null);
    try {
      // Market ticks previously refetched 1-3 full windows per chart
      // instance; concurrent identical charts now share one RPC.
      const { candles: data, buckets: fetchedBuckets } = await dedupedCall(
        `candles|${chain}|${baseId}|${quoteId}|${bucketSeconds}|${basePrecision}|${quotePrecision}|${specificNode ?? ""}`,
        () =>
          getCandleHistory(
            chain,
            baseId,
            quoteId,
            bucketSeconds,
            basePrecision,
            quotePrecision,
            specificNode
          ),
        5000
      );
      setCandles(data ?? []);
      if (Array.isArray(fetchedBuckets) && fetchedBuckets.length) setBuckets(fetchedBuckets);
      setLastFetchAt(Date.now());
      setHistoryAvailable(true);
      setError(null);
    } catch (e: any) {
      console.log("useMarketCandles fetch error", e);
      setError(e);
      // Distinguish history-disabled node: keep prior candles but flag unavailable
      if (String(e?.message ?? e).toLowerCase().includes("history") || String(e).includes("unknown")) {
        setHistoryAvailable(false);
      }
      setLastFetchAt(Date.now());
    } finally {
      setLoading(false);
    }
  }, [enabled, chain, baseId, quoteId, basePrecision, quotePrecision, bucketSeconds, specificNode]);

  // Initial buckets
  useEffect(() => {
    if (!enabled || !chain) return;
    fetchBuckets();
  }, [fetchBuckets, enabled, chain]);

  // Fetch on deps change
  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  // Polling interval: max(10s, bucketSec) capped at 60s for large buckets, min 15s for small
  useEffect(() => {
    if (!enabled || !chain || !baseId || !quoteId) return;
    const intervalMs = Math.max(10000, Math.min(60000, bucketSeconds * 1000));
    const id = setInterval(() => {
      if (shouldSkipBackgroundWork()) return;
      fetchCandles();
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, chain, baseId, quoteId, bucketSeconds, fetchCandles]);

  // Live subscription resync: when market pushes, refetch candles debounced 800ms
  // This mirrors bitshares-ui MarketsActions subscription batch (subscribe_to_market -> 500ms then re-fetch 3 windows)
  // Debounce coalesces rapid ticks; dedupedCall above coalesces across mounts.
  const debounceRef = useRef<any>(null);
  useEffect(() => {
    if (liveTick == null || liveTick === 0) return;
    if (shouldSkipBackgroundWork()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (shouldSkipBackgroundWork()) return;
      fetchCandles();
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [liveTick, fetchCandles]);

  // Reset on market switch
  useEffect(() => {
    if (!enabled || !baseId || !quoteId) {
      setCandles(null);
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
    refetch: fetchCandles,
  };
}
