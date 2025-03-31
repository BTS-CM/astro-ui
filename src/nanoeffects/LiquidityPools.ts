import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

const MAXIMUM_DEALS = 1000;
const BTS_LIMIT = 50;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAXIMUM_DEALS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAXIMUM_DEALS / TEST_LIMIT;
function fetchLiquidityPools(
  chain: string,
  specificNode?: string | null,
  existingAPI?: any
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = existingAPI
        ? existingAPI
        : await Apis.instance(
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

    const iterations =
      chain === "bitshares" ? MAX_BTS_ITERATIONS : MAX_TEST_ITERATIONS;
    const limit = chain === "bitshares" ? BTS_LIMIT : TEST_LIMIT;

    let pools: any[] = [];
    try {
      pools = await currentAPI
        .db_api()
        .exec("list_liquidity_pools", [limit, "1.19.0", true]);
    } catch (error) {
      console.log({ error });
      if (!existingAPI) {
        currentAPI.close();
      }
      reject(error);
      return;
    }

    if (!pools || !pools.length) {
      reject(new Error("No pools found"));
      return;
    }

    if (pools.length === limit) {
      for (let i = 1; i < iterations; i++) {
        let nextPage;
        try {
          nextPage = await currentAPI
            .db_api()
            .exec("list_liquidity_pools", [
              limit,
              pools[pools.length - 1].id,
              true,
            ]);
        } catch (error) {
          console.log({ error });
          if (!existingAPI) {
            currentAPI.close();
          }
          reject(error);
          return;
        }

        if (nextPage && nextPage.length) {
          pools = [...pools, ...nextPage];
          if (nextPage.length < limit) {
            break;
          }
        } else {
          break;
        }
      }
    }

    if (!existingAPI) {
      currentAPI.close();
    }

    return resolve(pools);
  });
}

function fetchLPTradingVolume(
  chain: string,
  pools: string[],
  specificNode?: string | null,
  existingAPI?: any
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = existingAPI
        ? existingAPI
        : await Apis.instance(
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

    let results;
    try {
      results = await Promise.all(
        pools.map(async (pool) => {
          const _poolID = pool.split("_")[0];
          const _base = pool.split("_")[1];
          const _quote = pool.split("_")[2];

          let _output = {};

          let _res;
          try {
            _res = await currentAPI
              .db_api()
              .exec("get_ticker", [_base, _quote]);
          } catch (error) {
            console.log({ error });
          }

          _output[_poolID] = _res ? _res : 0;

          return _output;
        })
      );
    } catch (error) {
      console.log({ error });
      if (!existingAPI) {
        currentAPI.close();
      }
      reject(error);
      return;
    } finally {
      if (!existingAPI) {
        try {
          currentAPI.close();
        } catch (error) {
          console.log({ error });
        }
      }
    }

    let finalResult = results.reduce((acc, curr) => {
      return { ...acc, ...curr };
    }, {});

    return resolve(finalResult);
  });
}

/**
 * Fetches every liquidity pool
 */
const [createEveryLiquidityPoolStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    let specificNode = args[1] ? (args[1] as string) : null;

    let response;
    try {
      response = await fetchLiquidityPools(chain, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch liquidity pools`);
      return;
    }

    return response;
  },
});

const [createLPTradingVolumeStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    let pools = JSON.parse(args[1] as string);
    let specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await fetchLPTradingVolume(chain, pools, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch LP trading volume`);
      return;
    }

    return response;
  },
});

export {
  createEveryLiquidityPoolStore,
  fetchLiquidityPools,
  createLPTradingVolumeStore,
  fetchLPTradingVolume,
};
