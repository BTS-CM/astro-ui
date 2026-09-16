import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

const MAX_LIMIT_ORDERS = 1000;
const BTS_LIMIT = 50;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAX_LIMIT_ORDERS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAX_LIMIT_ORDERS / TEST_LIMIT;

function getAccountLimitOrders(
  chain: string,
  accountID: string,
  specificNode?: string | null
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(
        node,
        true,
        4000,
        { enableDatabase: true },
        (error: Error) => console.log({ error })
      );
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    const API_LIMIT = chain === "bitshares" ? BTS_LIMIT : TEST_LIMIT;
    const API_ITERATIONS =
      chain === "bitshares" ? MAX_BTS_ITERATIONS : MAX_TEST_ITERATIONS;

    let limitOrders: any[];
    try {
      limitOrders = await currentAPI
        .db_api()
        .exec("get_limit_orders_by_account", [accountID, API_LIMIT])
        .then((results: Object[]) => {
          return Array.isArray(results) ? results : [];
        });
    } catch (error) {
      console.log({ error });
      currentAPI.close();
      reject(error);
      return;
    }

    // Empty is a valid state (user has no open orders), not an error.
    if (!limitOrders || !limitOrders.length) {
      currentAPI.close();
      resolve([]);
      return;
    }

    if (limitOrders && limitOrders.length === API_LIMIT) {
      for (let i = 1; i < API_ITERATIONS; i++) {
        let nextLimitOrders;
        try {
          // Compute a start id one higher than the last fetched id's numeric suffix.
          // The DB API treats the start id as inclusive, so passing the last id
          // would return it again and duplicate a row at every page boundary.
          let startId = limitOrders[limitOrders.length - 1].id;
          try {
            const parts = startId.split(".");
            const lastNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNum)) {
              parts[parts.length - 1] = String(lastNum + 1);
              startId = parts.join(".");
            }
          } catch (e) {
            // if anything goes wrong, fall back to the original id (existing behavior)
          }

          nextLimitOrders = await currentAPI
            .db_api()
            .exec("get_limit_orders_by_account", [
              accountID,
              API_LIMIT,
              startId,
            ])
            .then((results: Object[]) => {
              return Array.isArray(results) ? results : [];
            });
        } catch (error) {
          console.log({ error });
          currentAPI.close();
          reject(error);
          return;
        }

        if (nextLimitOrders && nextLimitOrders.length) {
          limitOrders = limitOrders.concat(nextLimitOrders);
          if (nextLimitOrders.length < API_LIMIT) {
            break;
          }
        } else {
          break;
        }
      }
    }

    // Defense in depth: drop any duplicate ids (e.g. from inclusive-cursor
    // overlap) so callers never receive the same order twice.
    limitOrders = [
      ...new Map(limitOrders.map((order: any) => [order.id, order])).values(),
    ];

    currentAPI.close();
    resolve(limitOrders);
  });
}

const [createAccountLimitOrderStore, , nanoqueryHelpers] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const account_id = args[1] as string;
    let specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await getAccountLimitOrders(chain, account_id, specificNode);
    } catch (error) {
      console.log({ error });
      return [];
    }

    if (!response) {
      return [];
    }

    return response;
  },
});

function revalidateAccountLimitOrders(chain: string, accountID: string) {
  try {
    nanoqueryHelpers.revalidateKeys((key: unknown) =>
      Array.isArray(key) && key.length >= 2 && (key as any)[0] === chain && (key as any)[1] === accountID
    );
  } catch (error) {
    console.log({ error });
  }
}

export { createAccountLimitOrderStore, getAccountLimitOrders, revalidateAccountLimitOrders };
