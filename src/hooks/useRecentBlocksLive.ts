import { useEffect, useRef, useState } from "react";
import {
  subscribeRecentBlocks,
  type RecentBlocksSubscription,
} from "@/nanoeffects/BlocksLive";
import { getObjects } from "@/nanoeffects/src/common";
import { chains } from "@/config/chains";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

/**
 * Live recent-blocks hook - renderer-side replacement for the Electron
 * requestBlocks/blockResponse/stopBlocks IPC flow.
 *
 *  - initial ~30 block lookback burst (recent activity on mount)
 *  - live push via set_block_applied_callback (~every 3s), gap-healed by the
 *    nanoeffect against the trusted 2.1.0 head
 *  - dedup inside the functional updater (fixes the old stale-closure bug)
 *  - buffer cap (blocks fall off the front; chart consumes the last 100)
 *  - standard guard: wifi/visibility/suspend recovery + 10s staleness
 *  - soft recovery: on staleness, first try a catch-up fetch through the
 *    existing subscription; only fall back to a hard teardown/reconnect if
 *    that errors
 */

const DISCONNECT_STALE_MS = 10000;
export const RECENT_BLOCKS_CAP = 100;

export function useRecentBlocksLive(options: {
  chain: string;
  enabled?: boolean;
  specificNode?: string | null;
  lookback?: number;
}) {
  const { chain, enabled = true, specificNode, lookback = 30 } = options;

  const [recentBlocks, setRecentBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  const lastFetchAtRef = useRef<number | null>(null);
  const isSubscribedRef = useRef(false);
  const lastSeenBlockRef = useRef<number | null>(null);
  const subRef = useRef<RecentBlocksSubscription | null>(null);

  useEffect(() => {
    lastFetchAtRef.current = lastFetchAt;
  }, [lastFetchAt]);
  useEffect(() => {
    isSubscribedRef.current = isSubscribed;
  }, [isSubscribed]);

  const attemptReconnect = () => setReconnectNonce((n) => n + 1);

  // Soft recovery on staleness: try a catch-up through the live subscription
  // before resorting to a hard teardown. Defined as a stable-ish closure -
  // the guard reads options via a ref each tick, so this stays current.
  async function softRecover() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      attemptReconnect();
      return;
    }
    const sub = subRef.current;
    if (sub && sub.catchUp) {
      try {
        const result = await sub.catchUp(
          lastSeenBlockRef.current ? lastSeenBlockRef.current + 1 : undefined
        );
        // "emitted" or "empty" => connection responsive, we're healed
        if (result !== "failed") return;
      } catch {}
    }
    attemptReconnect();
  }

  useSubscriptionGuard({
    lastFetchAtRef,
    isSubscribedRef,
    staleMs: DISCONNECT_STALE_MS,
    onStale: () => setIsSubscribed(false),
    onOffline: () => setIsSubscribed(false),
    onConnectionError: () => setIsSubscribed(false),
    onReconnectNeeded: () => {
      softRecover();
    },
  });

  useEffect(() => {
    if (!enabled || !chain) {
      setRecentBlocks([]);
      setLoading(false);
      setError(null);
      setIsSubscribed(false);
      setLastFetchAt(null);
      setBlockNumber(null);
      lastSeenBlockRef.current = null;
      const sub = subRef.current;
      subRef.current = null;
      if (sub) {
        try { sub.unsubscribe(); } catch {}
      }
      return;
    }

    if ((chains as any)[chain]?.testnet) {
      // Testnet: do not use ChainStore subscription (BlocksLive uses
      // set_block_applied_callback which is rejected). LiveBlocks on
      // testnet uses background.js polling via window.electron.requestBlocks
      // (REFERENCE_CODE path, re-introduced for testnet only). This hook
      // therefore does not poll on testnet — LiveBlocks.jsx branches to the
      // Electron IPC path instead. Return empty so no footer is shown.
      setRecentBlocks([]);
      setLoading(false);
      setError(null);
      setIsSubscribed(false);
      setLastFetchAt(null);
      setBlockNumber(null);
      lastSeenBlockRef.current = null;
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const ingest = (incoming: any[]) => {
      if (cancelled || !incoming || !incoming.length) return;
      let latest = 0;
      for (const b of incoming) {
        if (b.block > latest) latest = b.block;
      }
      setRecentBlocks((prev) => {
        const seen = new Set(prev.map((x) => x.block));
        const fresh = incoming.filter((b) => !seen.has(b.block));
        if (!fresh.length) return prev;
        const next = [...prev, ...fresh];
        next.sort((a, b) => a.block - b.block);
        return next.slice(-RECENT_BLOCKS_CAP);
      });
      setLastFetchAt(Date.now());
      setIsSubscribed(true);
      setLoading(false);
      setError(null);
      if (latest) {
        setBlockNumber((prev) => (latest > (prev ?? 0) ? latest : prev));
        lastSeenBlockRef.current =
          latest > (lastSeenBlockRef.current ?? 0)
            ? latest
            : lastSeenBlockRef.current;
      }
    };

    subscribeRecentBlocks(chain, ingest, onError, lookback, specificNode)
      .then((sub) => {
        if (cancelled) {
          sub.unsubscribe();
          return;
        }
        subRef.current = sub;
      })
      .catch((e) => {
        onError(e);
      });

    function onError(e: any) {
      if (cancelled) return;
      console.log("useRecentBlocksLive error", e);
      setError(e);
      setLoading(false);
      setIsSubscribed(false);
    }

    return () => {
      cancelled = true;
      const sub = subRef.current;
      subRef.current = null;
      if (sub) {
        try { sub.unsubscribe(); } catch {}
      }
    };
  }, [chain, enabled, specificNode, lookback, reconnectNonce]);

  return {
    recentBlocks,
    loading,
    error,
    isSubscribed,
    lastFetchAt,
    blockNumber,
  };
}
