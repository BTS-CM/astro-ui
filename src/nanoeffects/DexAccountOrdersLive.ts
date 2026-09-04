import { nanoquery } from "@nanostores/query";
import chain_store from "@/bts/chain/ChainStore";
import { acquireChainStore } from "@/bts/chain/chainStoreReady";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

/**
 * Live account limit order subscription via ChainStore.
 *
 * Uses the shared ChainStore initializer (src/bts/chain/chainStoreReady.ts):
 * set_subscribe_callback -> onUpdate -> notifySubscribers (40ms coalesce),
 * then a market-level batch at 500ms for UI update (bitshares-ui parity).
 *
 * ChainStore tracks account.orders Set (fetchFullAccount) and pushes
 * limit_order create/cancel/fill updates for subbed accounts.
 */

const BATCH_TIME = 500;

/**
 * Subscribe to live updates for account limit orders.
 * Callback receives array of limit_order objects for the account.
 *
 * @returns unsubscribe - removes this consumer's ChainStore listener and
 *          releases its connection token.
 */
export async function subscribeAccountLimitOrders(
  chain: string,
  accountId: string,
  onUpdate: (orders: any[]) => void,
  onError: (e: any) => void,
  specificNode?: string | null
): Promise<() => void> {
  let batchTimer: any = null;
  let unsubscribed = false;

  const pushUpdate = () => {
    if (unsubscribed) return;
    const account = chain_store.getAccount(accountId, true);
    if (!account || (account as any) === true || account.orders === undefined) {
      // still fetching
      return;
    }
    // account.orders is Set of limit_order ids
    const orders: any[] = [];
    const orderIds = account.orders instanceof Set ? Array.from(account.orders) : [];
    for (const id of orderIds) {
      const obj = chain_store.getObject(id);
      if (obj && obj !== true) orders.push(obj);
    }
    onUpdate(orders);
  };

  const fetchAccount = () => {
    const acc = chain_store.getAccount(accountId, true);
    // getAccount triggers fetchFullAccount if needed, returns undefined initially
    if (acc && acc.orders) {
      // already available
      pushUpdate();
    }
  };

  const batchedPush = () => {
    if (batchTimer) return;
    batchTimer = setTimeout(() => {
      batchTimer = null;
      pushUpdate();
    }, BATCH_TIME);
  };

  let releaseToken: (() => void) | null = null;
  try {
    // Testnet: never use ChainStore (REFERENCE_CODE nanoeffects polling).
    // Poll get_limit_orders_by_account every 3.5s (mirrors
    // REFERENCE_CODE/src/nanoeffects/AccountLimitOrders.ts).
    const testnet = (chains as any)[chain]?.testnet;
    if (testnet) {
      let cancelledPoll = false;
      let pollId: any = null;

      const pollOrders = async () => {
        if (cancelledPoll) return;
        const node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
        let api: any = null;
        try {
          api = await Apis.instance(node, true, 4000, { enableDatabase: true }, () => {});
          const apiLimit = chain === "bitshares" ? 50 : 10;
          const orders = await api.db_api().exec("get_limit_orders_by_account", [accountId, apiLimit]);
          if (!cancelledPoll) {
            onUpdate(Array.isArray(orders) ? orders : []);
          }
        } catch (e) {
          console.log("DexAccountOrdersLive testnet poll error", e);
        } finally {
          if (api) { try { api.close(); } catch {} }
        }
      };

      pollOrders();
      pollId = setInterval(pollOrders, 3500);

      return () => {
        cancelledPoll = true;
        if (pollId) clearInterval(pollId);
      };
    }

    releaseToken = await acquireChainStore(chain, specificNode);
  } catch (e) {
    onError(e);
    throw e;
  }

  const chainCallback = () => {
    batchedPush();
  };

  chain_store.subscribe(chainCallback);

  // trigger initial fetch
  fetchAccount();
  // If account not yet loaded, ChainStore notify will trigger batchedPush

  // Also fetch once after short delay to ensure orders populated
  setTimeout(() => { if (!unsubscribed) pushUpdate(); }, 600);

  const unsubscribe = () => {
    unsubscribed = true;
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    try {
      chain_store.unsubscribe(chainCallback);
    } catch (e) {
      console.log("unsubscribe chain_store error", e);
    }
    if (releaseToken) {
      try { releaseToken(); } catch {}
      releaseToken = null;
    }
  };

  return unsubscribe;
}
