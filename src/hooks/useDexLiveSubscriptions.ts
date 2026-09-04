import { useEffect, useState, useRef } from "react";
import { subscribeMarketOrderBook } from "@/nanoeffects/DexLiveOrderBook";
import { subscribeAccountLimitOrders } from "@/nanoeffects/DexAccountOrdersLive";
import {
  acquireChainStore,
  nodeUrlFor,
} from "@/bts/chain/chainStoreReady";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import chain_store from "@/bts/chain/ChainStore";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

export interface UseDexLiveOptions {
  chain: string;
  baseId: string | null;
  quoteId: string | null;
  accountId?: string | null;
  specificNode?: string | null;
  limit?: number;
  enabled?: boolean;
}

/** Shared Apis+ChainStore hard reset used by all DEX hooks on reconnect. */
function resetConnections() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Apis.destroy().catch(() => {});
    try {
      chain_store.clearCache();
      (chain_store as any).subscribed = false;
    } catch {}
  } catch {}
}

function useDexReconnect() {
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const attemptReconnect = () => {
    resetConnections();
    setReconnectNonce((n) => n + 1);
  };
  return { reconnectNonce, attemptReconnect };
}

const DISCONNECT_STALE_MS = 10000; // 10s without any block/orderbook update => Disconnected (matches footer ⚠️)

export function useDexOrderBookLive(options: UseDexLiveOptions) {
  const {
    chain,
    baseId,
    quoteId,
    accountId = null,
    specificNode,
    limit = 50,
    enabled = true,
  } = options;
  const [bids, setBids] = useState<any[] | null>(null);
  const [asks, setAsks] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("unknown");
  // market slice setters - declared before effects so onUpdate can reference them
  const [balances, setBalancesSafe] = useState<any[] | null>(null);
  const [marketHistory, setMarketHistorySafe] = useState<any[] | null>(null);
  const [usrLimitOrders, setUsrLimitOrdersSafe] = useState<any[] | null>(null);
  const [usrTrades, setUsrTradesSafe] = useState<any[] | null>(null);
  const [ticker, setTickerSafe] = useState<any | null>(null);
  const [historyAvailable, setHistoryAvailableSafe] = useState(true);
  const { reconnectNonce, attemptReconnect } = useDexReconnect();
  const unsubRef = useRef<(() => Promise<void>) | null>(null);
  const blockUnsubRef = useRef<(() => void) | null>(null);
  const failureCountRef = useRef(0);
  const lastBookRef = useRef<any>(null);
  const blockNumberRef = useRef<number | null>(null);
  const lastFetchAtRef = useRef<number | null>(null);
  const isSubscribedRef = useRef(false);

  // keep refs in sync for stale checks
  useEffect(() => {
    lastFetchAtRef.current = lastFetchAt;
  }, [lastFetchAt]);
  useEffect(() => {
    isSubscribedRef.current = isSubscribed;
  }, [isSubscribed]);

  const handleFailure = (e: any) => {
    failureCountRef.current += 1;
    console.log(`useDexOrderBookLive error attempt ${failureCountRef.current}`, e);
    if (failureCountRef.current >= 3) {
      setError(e ?? new Error("connection error"));
      setIsSubscribed(false);
    }
    setLoading(false);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsSubscribed(false);
    }
  };

  useSubscriptionGuard({
    lastFetchAtRef,
    isSubscribedRef,
    staleMs: DISCONNECT_STALE_MS,
    onStale: () => {
      setIsSubscribed(false);
      handleFailure(new Error("stale: no block/orderbook for 10s"));
    },
    onOnline: () => {
      setConnectionStatus("open");
      attemptReconnect();
    },
    onOffline: () => {
      setConnectionStatus("closed");
      handleFailure(new Error("offline: wifi/network lost"));
    },
    onConnectionError: (status) => {
      handleFailure(new Error(`connection ${status}`));
    },
    onReconnectNeeded: () => {
      attemptReconnect();
      failureCountRef.current = 0;
    },
  });

  useEffect(() => {
    if (!enabled || !chain || !baseId || !quoteId) {
      setBids(null);
      setAsks(null);
      setLoading(false);
      setError(null);
      setIsSubscribed(false);
      setLastFetchAt(null);
      setBlockNumber(null);
      blockNumberRef.current = null;
      lastFetchAtRef.current = null;
      failureCountRef.current = 0;
      // cleanup block sub if existed
      if (blockUnsubRef.current) {
        try { blockUnsubRef.current(); } catch {}
        blockUnsubRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let batchTimer: any = null;
    setLoading(true);
    setError(null);
    failureCountRef.current = 0;
    blockNumberRef.current = null;

    const onUpdate = (data: any) => {
      if (cancelled) return;
      const now = Date.now();
      lastBookRef.current = data;
      setBids(data.bids ?? []);
      setAsks(data.asks ?? []);
      // live market slices - each independent; history slices empty when node lacks plugin
      setBalancesSafe(data.balances ?? null);
      setMarketHistorySafe(data.marketHistory ?? null);
      setUsrLimitOrdersSafe(data.accountLimitOrders ?? null);
      setUsrTradesSafe(data.usrTrades ?? null);
      setTickerSafe(data.ticker ?? null);
      if (typeof data.historyAvailable === "boolean") {
        setHistoryAvailableSafe(data.historyAvailable);
      }
      setLastFetchAt(now);
      setLoading(false);
      setIsSubscribed(true);
      setError(null);
      failureCountRef.current = 0;
      // also reset connection status to open on successful fetch
      setConnectionStatus("open");
    };

    const onError = (e: any) => {
      if (cancelled) return;
      handleFailure(e);
    };

    subscribeMarketOrderBook(
      chain,
      baseId,
      quoteId,
      onUpdate,
      onError,
      limit,
      specificNode,
      accountId
    )
      .then((unsub) => {
        if (cancelled) {
          unsub();
          return;
        }
        unsubRef.current = unsub;
      })
      .catch((e) => {
        onError(e);
      });

    const isTestnet = (chains as any)[chain]?.testnet;

    // Block heartbeat is ChainStore mainnet-only (footer). On testnet we
    // don't render the footer and must not touch ChainStore (REFERENCE_CODE
    // nanoeffects polling is used instead).
    let releaseToken: (() => void) | null = null;
    let blockCallback: (() => void) | null = null;
    if (!isTestnet) {
      blockCallback = () => {
        if (cancelled) return;
        try {
          const obj: any = chain_store.getObject("2.1.0");
          if (obj && obj !== true) {
            const num = obj.head_block_number ?? obj.block_number ?? obj.head_block_num ?? obj.blockNumber;
            if (num && num !== blockNumberRef.current) {
              blockNumberRef.current = num;
              setBlockNumber(num);
              const now = Date.now();
              setLastFetchAt(now);
            }
          }
        } catch {}
      };

      acquireChainStore(chain, specificNode)
        .then((release) => {
          if (cancelled) {
            release();
            return;
          }
          releaseToken = release;
          if (blockCallback) blockCallback();
        })
        .catch((e) => {
          console.log("block subscription error", e);
          handleFailure(e);
        });
      try {
        chain_store.subscribe(blockCallback);
        blockUnsubRef.current = () => {
          try { if (blockCallback) chain_store.unsubscribe(blockCallback); } catch {}
        };
      } catch (e) {
        console.log("block subscription error", e);
      }
    }

    return () => {
      cancelled = true;
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
      if (blockUnsubRef.current) {
        try { blockUnsubRef.current(); } catch {}
        blockUnsubRef.current = null;
      }
      if (releaseToken) {
        try { releaseToken(); } catch {}
        releaseToken = null;
      }
      if (unsubRef.current) {
        const fn = unsubRef.current;
        unsubRef.current = null;
        fn().catch((e) => console.log("unsubscribe error", e));
      }
    };
  }, [chain, baseId, quoteId, specificNode, limit, enabled, reconnectNonce]);

  useEffect(() => {
    if (!enabled || !chain || !baseId || !quoteId) {
      setBalancesSafe(null);
      setMarketHistorySafe(null);
      setUsrLimitOrdersSafe(null);
      setUsrTradesSafe(null);
      setTickerSafe(null);
      setHistoryAvailableSafe(true);
    }
  }, [enabled, chain, baseId, quoteId]);

  return {
    bids,
    asks,
    loading,
    error,
    isSubscribed,
    lastFetchAt,
    blockNumber,
    connectionStatus,
    balances,
    marketHistory,
    usrLimitOrders,
    usrTrades,
    ticker,
    historyAvailable,
  };
}

export function useDexAccountOrdersLive(options: UseDexLiveOptions) {
  const { chain, accountId, specificNode, enabled = true } = options;
  const [orders, setOrders] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const { reconnectNonce, attemptReconnect } = useDexReconnect();
  const unsubRef = useRef<(() => void) | null>(null);
  const blockNumberRef = useRef<number | null>(null);
  const lastFetchAtRef = useRef<number | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    lastFetchAtRef.current = lastFetchAt;
  }, [lastFetchAt]);
  useEffect(() => {
    isSubscribedRef.current = isSubscribed;
  }, [isSubscribed]);

  useSubscriptionGuard({
    lastFetchAtRef,
    isSubscribedRef,
    staleMs: DISCONNECT_STALE_MS,
    onStale: () => setIsSubscribed(false),
    onOffline: () => setIsSubscribed(false),
    onReconnectNeeded: attemptReconnect,
  });

  useEffect(() => {
    if (!enabled || !chain || !accountId) {
      setOrders(null);
      setLoading(false);
      setError(null);
      setIsSubscribed(false);
      setLastFetchAt(null);
      setBlockNumber(null);
      blockNumberRef.current = null;
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const onUpdate = (liveOrders: any[]) => {
      if (cancelled) return;
      setOrders(liveOrders);
      setLastFetchAt(Date.now());
      setIsSubscribed(true);
      setLoading(false);
    };
    const onError = (e: any) => {
      if (cancelled) return;
      setError(e);
      setLoading(false);
    };

    const isTestnetOrders = (chains as any)[chain]?.testnet;

    // Block heartbeat is mainnet-only (footer hidden on testnet). Do not
    // touch ChainStore on testnet — subscribeAccountLimitOrders already
    // falls back to nanoeffects polling (REFERENCE_CODE) there.
    let blockCallback: (() => void) | null = null;
    if (!isTestnetOrders) {
      blockCallback = () => {
        if (cancelled) return;
        try {
          const obj: any = chain_store.getObject("2.1.0");
          if (obj && obj !== true) {
            const num =
              obj.head_block_number ??
              obj.block_number ??
              obj.head_block_num ??
              obj.blockNumber;
            if (num && num !== blockNumberRef.current) {
              blockNumberRef.current = num;
              setBlockNumber(num);
              setLastFetchAt(Date.now());
              if (!isSubscribed) setIsSubscribed(true);
            }
          }
        } catch {}
      };
    }

    subscribeAccountLimitOrders(chain, accountId, onUpdate, onError, specificNode)
      .then((unsub) => {
        if (cancelled) {
          unsub();
          return;
        }
        unsubRef.current = () => {
          unsub();
          if (blockCallback) {
            try {
              chain_store.unsubscribe(blockCallback);
            } catch {}
          }
        };
      })
      .catch((e) => onError(e));

    if (blockCallback) {
      try {
        chain_store.subscribe(blockCallback);
      } catch {}
    }

    return () => {
      cancelled = true;
      if (unsubRef.current) {
        const fn = unsubRef.current;
        unsubRef.current = null;
        try { fn(); } catch (e) { console.log(e); }
      }
    };
  }, [chain, accountId, specificNode, enabled, reconnectNonce]);

  return { orders, loading, error, isSubscribed, lastFetchAt, blockNumber };
}
