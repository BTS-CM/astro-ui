import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

function getTicker (
  chain: string,
  base: string,
  quote: string,
  specificNode?: string | null
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true, enableHistory: true }, (error: Error) =>
        console.log({ error })
      );
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    try {
      const _ticker = await currentAPI.db_api().exec("get_ticker", [base, quote]);
      resolve(_ticker);
    } catch (error) {
      console.log({ error });
      currentAPI.close();
      reject(error);
    } finally {
      try {
        currentAPI.close();
      } catch (error) {
        console.log({ error });
      }
    }
    
  });
}

function getMultipleTickers (
  chain: string,
  tradingPairs: string[],
  specificNode?: string | null
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true, enableHistory: true }, (error: Error) =>
        console.log({ error })
      );
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    let marketTickers = {};
    for (let i = 0; i < tradingPairs.length; i++) {
      const pair = tradingPairs[i];
      let _result;
      try {
        _result = await currentAPI.db_api().exec("get_ticker", [pair.split("_")[0], pair.split("_")[1]]);
      } catch (error) {
        console.log({ error });
        currentAPI.close();
        reject(error);
        return;
      }

      marketTickers[pair] = _result;
    }

    currentAPI.close();
    return resolve(marketTickers);
  });
}

function getMarketTradeHistory (
  chain: string,
  base: string,
  quote: string,
  accountID: string,
  specificNode?: string | null
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true, enableHistory: true }, (error: Error) =>
        console.log({ error })
      );
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    const now = new Date().toISOString().slice(0, 19);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19);

    try {
      const [balances, marketHistory, fullAccount, usrTrades, ticker] = await Promise.all([
        currentAPI.db_api().exec("get_account_balances", [accountID, [base, quote]]),
        currentAPI.db_api().exec("get_trade_history", [base, quote, now, oneMonthAgo, 50]),
        currentAPI.db_api().exec("get_full_accounts", [[accountID], false]),
        currentAPI
          .history_api()
          .exec("get_account_history_operations", [accountID, 4, "1.11.0", "1.11.0", 50]),
        currentAPI.db_api().exec("get_ticker", [base, quote]),
      ]);

      const accountLimitOrders = fullAccount[0][1].limit_orders;

      const result = {
        balances: balances ?? [], // qty held quote & base assets
        marketHistory:
          marketHistory && marketHistory.length
            ? marketHistory.map((x: any) => {
                return {
                  date: x.date,
                  price: x.price,
                  amount: x.amount,
                  value: x.value,
                  type: x.type,
                };
              })
            : [],
        accountLimitOrders:
          accountLimitOrders && accountLimitOrders.length
            ? accountLimitOrders
                .filter((x: any) => {
                  if (
                    [base, quote].includes(x.sell_price.base.asset_id) &&
                    [base, quote].includes(x.sell_price.quote.asset_id)
                  ) {
                    return true;
                  }
                })
                .map((x: any) => {
                  return {
                    id: x.id,
                    expiration: x.expiration,
                    for_sale: x.for_sale,
                    sell_price: x.sell_price,
                  };
                })
            : [],
        usrTrades:
          usrTrades && usrTrades.length
            ? usrTrades.filter((x: any) => {
                const payAsset = x.op[1].pays.asset_id;
                const receiveAsset = x.op[1].receives.asset_id;
                if (
                  [payAsset, receiveAsset].includes(base) &&
                  [payAsset, receiveAsset].includes(quote)
                ) {
                  return true;
                }
                return false;
              })
            : [],
        ticker: ticker ?? {},
      };
      resolve(result);
    } catch (error) {
      console.log({ error });
      currentAPI.close();
      reject(error);
    } finally {
      try {
        currentAPI.close();
      } catch (error) {
        console.log({ error });
      }
    }
    
  });
}

const [createTickerStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const quote = args[1] as string;
    const base = args[2] as string;

    let specificNode = args[3] ? args[3] as string : null;

    let response;
    try {
      response =  await getTicker(chain, base, quote, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch ticker`);
      return;
    }

    return response;
  },
});

const [createMultipleTickerStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const pairs = args[1] as string[];

    let specificNode = args[2] ? args[2] as string : null;

    let response;
    try {
      response =  await getMultipleTickers(chain, pairs, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch multiple tickers`);
      return;
    }

    return response;
  },
});

const [createMarketTradeHistoryStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const quote = args[1] as string;
    const base = args[2] as string;
    const id = args[3] as string;

    let specificNode = args[4] ? args[4] as string : null;

    let response;
    try {
      response =  await getMarketTradeHistory(chain, base, quote, id, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch market trade history`);
      return;
    }

    return response;
  },
});

export {
  createMarketTradeHistoryStore,
  getMarketTradeHistory,
  createTickerStore,
  createMultipleTickerStore,
  getTicker,
  getMultipleTickers,
};
