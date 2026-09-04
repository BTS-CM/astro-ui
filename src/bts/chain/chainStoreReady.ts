import Apis from "@/bts/ws/ApiInstances";
import chain_store from "@/bts/chain/ChainStore";
import { chains } from "@/config/chains";
import { $connectionStatus } from "@/stores/connection";

/**
 * Shared ChainStore initializer + connection token lifecycle.
 *
 * Single source of truth for all subscription hooks (DEX pilot + pages
 * rollout). Guarantees:
 *
 *  1. One retained Apis connection per chain|node pair while at least one
 *     consumer holds a token. `acquireChainStore` returns a release function;
 *     when the last token is released the refcount hits zero and the socket
 *     idles closed after ApiInstances' grace period (IDLE_CLOSE_MS = 5s).
 *  2. Liveness-aware initialization: if the underlying connection dies
 *     (idle close, natural close, node drop -> status "closed"/"error"),
 *     cached init state is invalidated so the next acquire performs a full
 *     re-init INCLUDING re-registration of `set_subscribe_callback`.
 */

let sharedInitPromise: Promise<void> | null = null;
let sharedInitKey: string | null = null;

export function nodeUrlFor(
  chain: string,
  specificNode?: string | null
): string {
  return specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
}

// ---------------------------------------------------------------------------
// Invalidation: when the connection dies, drop cached init state so the next
// acquire re-initializes (re-registers set_subscribe_callback) immediately.
// We subscribe to the $connectionStatus atom rather than Apis' single-slot
// statusCb/closeCb (both are overwritten by every nanoeffect fetcher).
// ---------------------------------------------------------------------------

let invalidationSubscribed = false;

function subscribeInvalidation() {
  if (invalidationSubscribed) return;
  invalidationSubscribed = true;
  try {
    $connectionStatus.subscribe((status) => {
      if (status === "closed" || status === "error") {
        sharedInitPromise = null;
        try {
          chain_store.clearCache();
          (chain_store as any).subscribed = false;
        } catch {}
      }
    });
  } catch (e) {
    console.log("chainStoreReady invalidation subscribe error", e);
  }
}

function canReuse(key: string): boolean {
  return (
    sharedInitPromise !== null &&
    sharedInitKey === key &&
    chain_store.subscribed &&
    // post-destroy() the module singleton is nulled entirely
    !!Apis
  );
}

/**
 * Acquire a ChainStore-backed connection token.
 *
 * Resolves once the ChainStore is initialized (set_subscribe_callback active)
 * and this caller holds its own refcount on the underlying socket.
 *
 * @returns release() - idempotent; call in effect cleanup / unsubscribe to
 *          drop this consumer's refcount. When the last token is released the
 *          socket is idled closed by ApiInstances.
 */
export function isTestnetChain(chain: string): boolean {
  return !!(chains as any)[chain]?.testnet;
}

export async function acquireChainStore(
  chain: string,
  specificNode?: string | null
): Promise<() => void> {
  if (isTestnetChain(chain)) {
    throw new Error(
      `acquireChainStore disabled on testnet chain "${chain}": use nanoeffects polling instead (ChainStore set_subscribe_callback is disallowed)`
    );
  }
  subscribeInvalidation();

  const node = nodeUrlFor(chain, specificNode);
  const key = `${chain}|${node}`;

  if (!canReuse(key)) {
    const api = await Apis.instance(
      node,
      true,
      4000,
      { enableDatabase: true },
      () => {}
    );

    chain_store.setDispatchFrequency(40);

    // reset cache when switching chains/nodes or after invalidation
    try {
      chain_store.clearCache();
      (chain_store as any).subscribed = false;
    } catch {}

    sharedInitKey = key;
    sharedInitPromise = chain_store
      .init(true)
      .then(() => {})
      .catch((e) => {
        sharedInitPromise = null;
        throw e;
      });

    try {
      await sharedInitPromise;
    } catch (e) {
      // release the init retain - nothing was established for a consumer
      try { api.close(); } catch {}
      throw e;
    }

    // hand the init retain back: the caller will hold their own token via
    // the pure-retain acquire below. Net refs stay balanced (+1 init, -1
    // here, +1 acquire).
    try { api.close(); } catch {}
  } else {
    await sharedInitPromise!;
  }

  // Pure retain against the existing singleton - no reconnect.
  const handle = Apis.instance(node, false);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    try {
      handle.close();
    } catch {}
  };
}
