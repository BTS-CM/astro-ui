import { useEffect, useState, useRef } from "react";
import Apis from "@/bts/ws/ApiInstances";
import chain_store from "@/bts/chain/ChainStore";
import { getAccountBalances } from "@/nanoeffects/UserBalances";
import { getObjects } from "@/nanoeffects/src/common";
import { chains } from "@/config/chains";
import {
  acquireChainStore,
  nodeUrlFor,
} from "@/bts/chain/chainStoreReady";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

/**
 * Shared ChainStore object subscription for pages 2-9 rollout.
 *
 * Pattern (mirrors the DEX pilot hooks):
 *  - one retained Apis connection + chain_store.init(true) -> set_subscribe_callback
 *    (via shared acquireChainStore in src/bts/chain/chainStoreReady.ts)
 *  - requested ids are seeded into the ChainStore cache via batched get_objects
 *    (chunks of 50 mainnet / 10 testnet) so we do NOT issue one WS call per id;
 *    because they were fetched over db_api while subscribed, the node then pushes
 *    updates for them automatically.
 *  - chain_store.subscribe callbacks are coalesced by ChainStore (40ms) and
 *    re-batched here at 500ms before hitting React state.
 *  - block number (2.1.0) doubles as a liveness heartbeat; 10s without any push
 *    => Disconnected + auto reconnect (wifi/visibility/suspend aware) via the
 *    shared useSubscriptionGuard.
 */

const DISCONNECT_STALE_MS = 10000;
const BATCH_TIME = 500;

async function seedObjectsIntoCache(api: any, ids: string[], chain: string) {
  const CHUNK = chain === "bitshares" ? 50 : 10;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    try {
      const objs = await api.db_api().exec("get_objects", [chunk, false]);
      if (Array.isArray(objs)) {
        for (const o of objs) {
          if (o && o.id) {
            try {
              chain_store._updateObject(o);
            } catch {}
          }
        }
      }
    } catch (e) {
      console.log("useChainObjectsLive seed chunk error", e);
    }
  }
}

export interface UseChainObjectsLiveOptions {
  chain: string;
  ids: string[];
  enabled?: boolean;
  specificNode?: string | null;
}

function useReconnect() {
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const attemptReconnect = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      Apis.destroy().catch(() => {});
      try {
        chain_store.clearCache();
        (chain_store as any).subscribed = false;
      } catch {}
    } catch {}
    setReconnectNonce((n) => n + 1);
  };
  return { reconnectNonce, attemptReconnect };
}

export function useChainObjectsLive(options: UseChainObjectsLiveOptions) {
  const { chain, ids, enabled = true, specificNode } = options;
  const idsKey = JSON.stringify(ids ?? []);

  const [objects, setObjects] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("unknown");
  const { reconnectNonce, attemptReconnect } = useReconnect();

  const unsubRef = useRef<(() => void) | null>(null);
  const failureCountRef = useRef(0);
  const lastFetchAtRef = useRef<number | null>(null);
  const isSubscribedRef = useRef(false);
  const blockNumberRef = useRef<number | null>(null);

  const isTestnet = (chains as any)[chain]?.testnet;

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
    onStale: () => {
      setIsSubscribed(false);
      failureCountRef.current += 1;
    },
    onOnline: () => setConnectionStatus("open"),
    onOffline: () => {
      setConnectionStatus("closed");
      setIsSubscribed(false);
    },
    onConnectionError: () => {
      failureCountRef.current += 1;
      if (failureCountRef.current >= 3) {
        setIsSubscribed(false);
      }
    },
    onReconnectNeeded: attemptReconnect,
  });

  useEffect(() => {
    let parsedIds: string[] = [];
    try {
      parsedIds = JSON.parse(idsKey) ?? [];
    } catch {}
    const valid = Array.isArray(parsedIds) && parsedIds.length > 0;

    if (!enabled || !chain || !valid) {
      setObjects(null);
      setLoading(false);
      setError(null);
      setIsSubscribed(false);
      setLastFetchAt(null);
      setBlockNumber(null);
      blockNumberRef.current = null;
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {}
        unsubRef.current = null;
      }
      return;
    }

    if (isTestnet) {
      // Testnet: never use ChainStore subscriptions (node rejects
      // set_subscribe_callback with enable_subscribe_to_all). Use
      // pre-subscription nanoeffects polling (REFERENCE_CODE pattern:
      // getObjects in chunks, no ChainStore subscribe, no 2.1.0 heartbeat).
      // Footer is mainnet-only, so no blockNumber staleness here.
      let cancelledPoll = false;
      let pollId: any = null;
      setLoading(true);
      setError(null);
      failureCountRef.current = 0;
      blockNumberRef.current = null;

      const fetchTestnet = async () => {
        if (cancelledPoll) return;
        try {
          const objs = await getObjects(chain, parsedIds, specificNode);
          if (cancelledPoll) return;
          const objectsMap: Record<string, any> = {};
          if (Array.isArray(objs)) {
            for (const o of objs) {
              if (o && o.id) {
                try {
                  // Keep cache in sync for consumers that read ChainStore directly,
                  // but don't subscribe.
                  chain_store._updateObject(o);
                } catch {}
                objectsMap[o.id] = o;
              }
            }
          }
          // Ensure every requested id has an entry (null if missing)
          for (const id of parsedIds) {
            if (!(id in objectsMap)) {
              const found = (objs as any[]).find((x) => x && x.id === id);
              if (found) objectsMap[id] = found;
            }
          }
          setObjects(objectsMap);
          setError(null);
          setLoading(false);
        } catch (e) {
          console.log("useChainObjectsLive testnet fallback error", e);
          if (!cancelledPoll) {
            setError(e);
            setLoading(false);
          }
        }
      };

      fetchTestnet();
      pollId = setInterval(fetchTestnet, 3500);

      return () => {
        cancelledPoll = true;
        if (pollId) clearInterval(pollId);
      };
    }

    let cancelled = false;
    let batchTimer: any = null;
    let ready = false;
    setLoading(true);
    setError(null);
    failureCountRef.current = 0;
    blockNumberRef.current = null;

    const pushUpdate = () => {
      if (cancelled || !ready) return;
      const map: Record<string, any> = {};
      let found = false;
      for (const id of parsedIds) {
        try {
          const obj: any = chain_store.getObject(id);
          if (obj && obj !== true) {
            map[id] = obj;
            found = true;
          }
        } catch {}
      }
      if (found) {
        setObjects(map);
        setIsSubscribed(true);
        setLastFetchAt(Date.now());
        setLoading(false);
        setError(null);
        failureCountRef.current = 0;
        setConnectionStatus("open");
      }
    };

    const blockCallback = () => {
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
          }
        }
      } catch {}
    };

    const batchedCallback = () => {
      if (cancelled || batchTimer) return;
      batchTimer = setTimeout(() => {
        batchTimer = null;
        pushUpdate();
        blockCallback();
      }, BATCH_TIME);
    };

    (async () => {
      // Acquire a connection token for this effect's lifetime; released in
      // cleanup so refcounts stay balanced and the socket can idle close.
      let releaseToken: (() => void) | null = null;
      try {
        releaseToken = await acquireChainStore(chain, specificNode);
        if (cancelled) {
          releaseToken();
          return;
        }

        const node = nodeUrlFor(chain, specificNode);
        const api = await Apis.instance(
          node,
          true,
          4000,
          { enableDatabase: true },
          () => {}
        );
        if (cancelled) return;

        // seed cache in batches so pushes flow for these objects
        await seedObjectsIntoCache(api, parsedIds, chain);
        try { await api.close(); } catch {}
        if (cancelled) return;

        ready = true;
        chain_store.subscribe(batchedCallback);
        unsubRef.current = () => {
          try {
            chain_store.unsubscribe(batchedCallback);
          } catch {}
          if (releaseToken) {
            try { releaseToken(); } catch {}
            releaseToken = null;
          }
        };
        pushUpdate();
        blockCallback();
      } catch (e) {
        if (releaseToken) {
          try { releaseToken(); } catch {}
          releaseToken = null;
        }
        console.log("useChainObjectsLive error", e);
        if (!cancelled) {
          setError(e);
          setLoading(false);
          failureCountRef.current += 1;
        }
      }
    })();

    return () => {
      cancelled = true;
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {}
        unsubRef.current = null;
      }
    };
  }, [chain, idsKey, specificNode, enabled, reconnectNonce]);

  return {
    objects,
    loading,
    error,
    isSubscribed,
    lastFetchAt,
    blockNumber,
    connectionStatus,
  };
}

/**
 * Live user balances via ChainStore full-account subscription.
 * Output items carry both shapes used across the codebase:
 *   { id, asset_type, asset_id, amount, balance }
 */
export function useAccountBalancesLive(options: {
  chain: string;
  accountId: string | null;
  enabled?: boolean;
  specificNode?: string | null;
}) {
  const { chain, accountId, enabled = true, specificNode } = options;

  const [balances, setBalances] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const { reconnectNonce, attemptReconnect } = useReconnect();

  const unsubRef = useRef<(() => void) | null>(null);
  const lastFetchAtRef = useRef<number | null>(null);
  const isSubscribedRef = useRef(false);
  const blockNumberRef = useRef<number | null>(null);

  const isTestnet = (chains as any)[chain]?.testnet;

  useSubscriptionGuard({
    lastFetchAtRef,
    isSubscribedRef,
    staleMs: DISCONNECT_STALE_MS,
    onStale: () => setIsSubscribed(false),
    onOffline: () => setIsSubscribed(false),
    onReconnectNeeded: attemptReconnect,
  });

  useEffect(() => {
    // Testnet: never use ChainStore (REFERENCE_CODE getAccountBalances polling,
    // no ChainStore subscribe, no footer heartbeat).
    if (isTestnet) {
      if (!enabled || !chain || !accountId) {
        setBalances(null);
        setLoading(false);
        setError(null);
        setIsSubscribed(false);
        setLastFetchAt(null);
        setBlockNumber(null);
        blockNumberRef.current = null;
        if (unsubRef.current) {
          try {
            unsubRef.current();
          } catch {}
          unsubRef.current = null;
        }
        return;
      }

      let cancelledPoll = false;
      let pollId: any = null;
      setLoading(true);
      setError(null);
      blockNumberRef.current = null;

      const fetchTestnet = async () => {
        if (cancelledPoll) return;
        try {
          const response = await getAccountBalances(chain, accountId, specificNode);
          if (cancelledPoll) return;
          if (response) {
            setBalances(response as any[]);
            setError(null);
            setLoading(false);
          }
        } catch (e) {
          console.log("useAccountBalancesLive testnet error", e);
          if (!cancelledPoll) {
            setError(e);
            setLoading(false);
          }
        }
      };

      fetchTestnet();
      pollId = setInterval(fetchTestnet, 3500);

      return () => {
        cancelledPoll = true;
        if (pollId) clearInterval(pollId);
        if (unsubRef.current) {
          try {
            unsubRef.current();
          } catch {}
          unsubRef.current = null;
        }
      };
    }

    if (!enabled || !chain || !accountId) {
      setBalances(null);
      setLoading(false);
      setError(null);
      setIsSubscribed(false);
      setLastFetchAt(null);
      setBlockNumber(null);
      blockNumberRef.current = null;
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {}
        unsubRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let batchTimer: any = null;
    setLoading(true);
    setError(null);
    blockNumberRef.current = null;

    const pushUpdate = () => {
      if (cancelled) return;
      try {
        const acc: any = chain_store.getAccount(accountId, true);
        if (!acc || acc === true || !acc.balances) return;
        const out: any[] = [];
        for (const assetType of Object.keys(acc.balances)) {
          const balId = acc.balances[assetType];
          const b: any = chain_store.getObject(balId);
          if (b && b !== true) {
            out.push({
              id: balId,
              asset_type: assetType,
              asset_id: assetType,
              amount: b.balance,
              balance: b.balance,
            });
          }
        }
        setBalances(out);
        setIsSubscribed(true);
        setLastFetchAt(Date.now());
        setLoading(false);
        setError(null);
      } catch {}
    };

    const blockCallback = () => {
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
          }
        }
      } catch {}
    };

    const batchedCallback = () => {
      if (cancelled || batchTimer) return;
      batchTimer = setTimeout(() => {
        batchTimer = null;
        pushUpdate();
        blockCallback();
      }, BATCH_TIME);
    };

    (async () => {
      // Acquire a connection token for this effect's lifetime; released via
      // unsubRef in cleanup so refcounts stay balanced.
      let releaseToken: (() => void) | null = null;
      try {
        releaseToken = await acquireChainStore(chain, specificNode);
        if (cancelled) {
          releaseToken();
          return;
        }
        // getAccount triggers fetchFullAccount which subscribes balances
        chain_store.getAccount(accountId, true);
        chain_store.subscribe(batchedCallback);
        unsubRef.current = () => {
          try {
            chain_store.unsubscribe(batchedCallback);
          } catch {}
          if (releaseToken) {
            try { releaseToken(); } catch {}
            releaseToken = null;
          }
        };
        setTimeout(() => {
          if (!cancelled) {
            pushUpdate();
            blockCallback();
          }
        }, 600);
      } catch (e) {
        if (releaseToken) {
          try { releaseToken(); } catch {}
          releaseToken = null;
        }
        console.log("useAccountBalancesLive error", e);
        if (!cancelled) {
          setError(e);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {}
        unsubRef.current = null;
      }
    };
  }, [chain, accountId, specificNode, enabled, reconnectNonce]);

  return {
    balances,
    loading,
    error,
    isSubscribed,
    lastFetchAt,
    blockNumber,
  };
}