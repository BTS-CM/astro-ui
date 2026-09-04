import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

/**
 * Live order book subscriptions - NEW file for DEX pilot.
 * Does NOT edit existing MarketOrderBook.ts / MarketTradeHistory.ts fetchers.
 *
 * Mirrors bitshares-ui MarketsActions.subscribeMarket batching:
 *  - subscribe_to_market callback batches via 500ms timeout
 *  - on flush, re-fetches order book + ticker + trade history + balances + user limit orders
 *  - keeps single retained Apis connection (no close() while subscribed)
 *
 * History-disabled nodes: `get_trade_history` and `get_account_history_operations`
 * require the history plugin on the node. Some nodes reject these calls whilst
 * permitting all other database API calls. We therefore attempt them per-call,
 * catch rejections/empties independently, and set `historyAvailable: false`
 * so the UI can fall back to its existing polling path without killing the
 * subscription.
 */

const SUB_BATCH_TIME = 500; // ms, matches bitshares-ui subBatchTime

export interface OrderBook {
  bids: any[];
  asks: any[];
}

export interface LiveMarketData {
  bids: any[];
  asks: any[];
  balances: any[];
  marketHistory: any[];
  accountLimitOrders: any[];
  usrTrades: any[];
  ticker: any;
  historyAvailable: boolean;
}

async function fetchOrderBook(
  chain: string,
  base: string,
  quote: string,
  limit: number = 50,
  specificNode?: string | null
): Promise<OrderBook> {
  const node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
  const api = await Apis.instance(
    node,
    true,
    4000,
    { enableDatabase: true },
    (error: Error) => console.log({ error })
  );
  try {
    const result = await api.db_api().exec("get_order_book", [base, quote, limit]);
    return result as OrderBook;
  } finally {
    try {
      await api.close();
    } catch {}
  }
}

/**
 * Fetch non-orderbook slices of market data. Each call is independent so a
 * history-disabled node only loses trade history, not the whole payload.
 */
async function fetchMarketSlices(
  api: any,
  baseId: string,
  quoteId: string,
  accountId: string | null
): Promise<{
  balances: any[];
  marketHistory: any[];
  accountLimitOrders: any[];
  usrTrades: any[];
  ticker: any;
  historyAvailable: boolean;
}> {
  const now = new Date().toISOString().slice(0, 19);
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19);

  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<{ ok: boolean; value: T }> => {
    try {
      const value = await fn();
      return { ok: true, value };
    } catch (e) {
      console.log("DexLiveOrderBook slice error", e);
      return { ok: false, value: fallback };
    }
  };

  const tickerRes = await safe(
    () => api.db_api().exec("get_ticker", [baseId, quoteId]),
    null
  );

  let balances: any[] = [];
  if (accountId) {
    const res = await safe(
      () => api.db_api().exec("get_account_balances", [accountId, [baseId, quoteId]]),
      []
    );
    balances = Array.isArray(res.value) ? res.value : [];
  }

  // history-plugin dependent calls - may fail on restricted nodes
  const tradeHistoryRes = await safe(
    () => api.db_api().exec("get_trade_history", [baseId, quoteId, now, oneMonthAgo, 50]),
    []
  );
  const usrTradesRes =
    accountId && tradeHistoryRes.ok
      ? await safe(() =>
          api.history_api().exec("get_account_history_operations", [
            accountId,
            4,
            "1.11.0",
            "1.11.0",
            50,
          ])
        , [])
      : { ok: false, value: [] as any[] };

  const fullAccountRes =
    accountId && tradeHistoryRes.ok
      ? await safe(() => api.db_api().exec("get_full_accounts", [[accountId], false]), [])
      : { ok: false, value: [] as any[] };

  const historyAvailable = tradeHistoryRes.ok && usrTradesRes.ok;

  let marketHistory: any[] = [];
  if (tradeHistoryRes.ok && Array.isArray(tradeHistoryRes.value)) {
    marketHistory = tradeHistoryRes.value.map((x: any) => ({
      date: x.date,
      price: x.price,
      amount: x.amount,
      value: x.value,
      type: x.type,
    }));
  }

  let usrTrades: any[] = [];
  if (usrTradesRes.ok && Array.isArray(usrTradesRes.value)) {
    usrTrades = usrTradesRes.value.filter((x: any) => {
      if (!x?.op?.[1]) return false;
      const payAsset = x.op[1].pays.asset_id;
      const receiveAsset = x.op[1].receives.asset_id;
      return (
        [payAsset, receiveAsset].includes(baseId) &&
        [payAsset, receiveAsset].includes(quoteId)
      );
    });
  }

  let accountLimitOrders: any[] = [];
  if (
    fullAccountRes.ok &&
    Array.isArray(fullAccountRes.value) &&
    fullAccountRes.value.length &&
    fullAccountRes.value[0][1]?.limit_orders
  ) {
    accountLimitOrders = fullAccountRes.value[0][1].limit_orders
      .filter((x: any) => {
        return (
          [baseId, quoteId].includes(x.sell_price.base.asset_id) &&
          [baseId, quoteId].includes(x.sell_price.quote.asset_id)
        );
      })
      .map((x: any) => ({
        id: x.id,
        expiration: x.expiration,
        for_sale: x.for_sale,
        sell_price: x.sell_price,
      }));
  }

  return {
    balances,
    marketHistory,
    accountLimitOrders,
    usrTrades,
    ticker: tickerRes.value ?? {},
    historyAvailable,
  };
}

/**
 * Subscribe to market order book live updates.
 * Uses `subscribe_to_market` (ChainWebSocket.ts:169) which registers callback in subs map.
 * Batches rapid notices at 500ms (bitshares-ui parity) then refetches order book +
 * ticker + trade history + balances + user limit orders (each slice independent).
 *
 * @param onUpdate receives full LiveMarketData including historyAvailable flag
 * @returns unsubscribe function
 */
export async function subscribeMarketOrderBook(
  chain: string,
  baseId: string,
  quoteId: string,
  onUpdate: (data: LiveMarketData) => void,
  onError: (e: any) => void,
  limit: number = 50,
  specificNode?: string | null,
  accountId?: string | null
): Promise<() => Promise<void>> {
  // Testnet: never use subscribe_to_market (ChainStore-adjacent). Use
  // REFERENCE_CODE nanoeffects polling (createMarketOrderStore pattern).
  const isTestnet = (chains as any)[chain]?.testnet;
  if (isTestnet) {
    let unsubscribedPoll = false;
    let pollId: any = null;

    const pollOnce = async () => {
      if (unsubscribedPoll) return;
      const nodePoll = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
      let pollApi: any = null;
      try {
        pollApi = await Apis.instance(nodePoll, true, 4000, { enableDatabase: true, enableHistory: true }, () => {});
        const book: any = await pollApi.db_api().exec("get_order_book", [baseId, quoteId, limit]);
        if (!book || unsubscribedPoll) return;
        const slices = await fetchMarketSlices(pollApi, baseId, quoteId, accountId ?? null);
        if (!unsubscribedPoll) {
          onUpdate({ bids: book.bids ?? [], asks: book.asks ?? [], ...slices });
        }
      } catch (e) {
        console.log("DexLiveOrderBook testnet poll error", e);
      } finally {
        if (pollApi) { try { pollApi.close(); } catch {} }
      }
    };

    await pollOnce();
    pollId = setInterval(pollOnce, 3500);

    return async () => {
      unsubscribedPoll = true;
      if (pollId) clearInterval(pollId);
    };
  }

  const node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
  const api = await Apis.instance(
    node,
    true,
    4000,
    { enableDatabase: true, enableHistory: true },
    (error: Error) => console.log({ error })
  );
  // retain already bumped by instance(); keep it for subscription lifetime
  // Do NOT call close() here.

  let pending = false;
  let batchTimer: any = null;
  let unsubscribed = false;
  let flushing = false;

  const doFlush = async () => {
    pending = false;
    batchTimer = null;
    try {
      const book = await api.db_api().exec("get_order_book", [baseId, quoteId, limit]);
      if (!book || unsubscribed) return;
      const slices = await fetchMarketSlices(api, baseId, quoteId, accountId ?? null);
      if (!unsubscribed) {
        onUpdate({
          bids: book.bids ?? [],
          asks: book.asks ?? [],
          ...slices,
        });
      }
    } catch (e) {
      console.log("DexLiveOrderBook flush error", e);
      onError(e);
    }
  };

  const flush = async () => {
    if (unsubscribed || flushing) {
      pending = false;
      batchTimer = null;
      return;
    }
    flushing = true;
    await doFlush();
    // If a notice arrived during the flush, run another pass
    if (pending && !unsubscribed) {
      flushing = true;
      await doFlush();
    }
    flushing = false;
  };

  const marketCallback = (_subResult: any) => {
    // bitshares-ui checks marketId !== currentMarket to ignore stale; we only have one market per subscription
    if (unsubscribed) return;
    if (batchTimer) return; // already scheduled, will include this notice in batch
    pending = true;
    batchTimer = setTimeout(flush, SUB_BATCH_TIME);
  };

  // initial fetch first, then subscribe
  try {
    const initialBook = await api.db_api().exec("get_order_book", [baseId, quoteId, limit]);
    if (initialBook && !unsubscribed) {
      try {
        const slices = await fetchMarketSlices(api, baseId, quoteId, accountId ?? null);
        onUpdate({
          bids: initialBook.bids ?? [],
          asks: initialBook.asks ?? [],
          ...slices,
        });
      } catch (e) {
        console.log("DexLiveOrderBook initial slices error", e);
        onUpdate({ bids: initialBook.bids ?? [], asks: initialBook.asks ?? [], balances: [], marketHistory: [], accountLimitOrders: [], usrTrades: [], ticker: {}, historyAvailable: false });
      }
    }
  } catch (e) {
    console.log("DexLiveOrderBook initial fetch error", e);
    onError(e);
    // still try to subscribe
  }

  try {
    await api.db_api().exec("subscribe_to_market", [marketCallback, baseId, quoteId]);
  } catch (e) {
    console.log("subscribe_to_market failed", e);
    onError(e);
    // release the retain since subscription failed
    try { await api.close(); } catch {}
    throw e;
  }

  const unsubscribe = async () => {
    unsubscribed = true;
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    try {
      await api.db_api().exec("unsubscribe_from_market", [marketCallback, baseId, quoteId]);
    } catch (e) {
      console.log("unsubscribe_from_market error", e);
    } finally {
      try { await api.close(); } catch {}
    }
  };

  return unsubscribe;
}

export { fetchOrderBook };
