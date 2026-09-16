import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

const MAXIMUM_CREDIT_OFFERS = 1000;
const BTS_LIMIT = 50;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAXIMUM_CREDIT_OFFERS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAXIMUM_CREDIT_OFFERS / TEST_LIMIT;

// Retrieve sametfunds by their asset from the blockchain
function getSameTFundsByAsset(
  chain: string,
  asset_symbol_or_id: string,
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

    let limit = chain === "bitshares" ? BTS_LIMIT : TEST_LIMIT;
    const maxIterations =
      chain === "bitshares" ? MAX_BTS_ITERATIONS : MAX_TEST_ITERATIONS;
    let allSameTFunds: any[] = [];

    let firstPageOffers;
    try {
      firstPageOffers = await currentAPI
        .db_api()
        .exec("get_samet_funds_by_asset", [asset_symbol_or_id, limit]);
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    if (firstPageOffers && firstPageOffers.length) {
      allSameTFunds.push(...firstPageOffers);

      if (firstPageOffers.length === limit) {
        // The DB API treats the start id as inclusive, so start one higher
        // than the last fetched id to avoid duplicating the boundary row.
        const bumpId = (id: string) => {
          try {
            const parts = id.split(".");
            const lastNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNum)) {
              parts[parts.length - 1] = String(lastNum + 1);
              return parts.join(".");
            }
          } catch (e) {
            // fall through to the original id
          }
          return id;
        };

        let start_id = bumpId(
          firstPageOffers[firstPageOffers.length - 1].id
        );

        for (let i = 1; i < maxIterations; i++) {
          let options = [asset_symbol_or_id, limit, start_id];
          let pageOffers;
          try {
            pageOffers = await currentAPI
              .db_api()
              .exec("get_samet_funds_by_asset", options);
          } catch (error) {
            console.log({ error });
            reject(error);
            return;
          }
          if (!pageOffers || !pageOffers.length) {
            break;
          }
          allSameTFunds.push(...pageOffers);
          if (pageOffers.length < limit) {
            break;
          }
          start_id = bumpId(pageOffers[pageOffers.length - 1].id);
        }
      }
    }

    // Defense in depth: drop any duplicate ids from inclusive-cursor overlap.
    allSameTFunds = [
      ...new Map(allSameTFunds.map((fund: any) => [fund.id, fund])).values(),
    ];

    currentAPI.close();
    resolve(allSameTFunds);
  });
}

const [createSameTFundByAssetStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const asset_symbol_or_id = args[1] as string;
    let specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await getSameTFundsByAsset(
        chain,
        asset_symbol_or_id,
        specificNode
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch sametfunds by asset...`);
      return;
    }

    return response;
  },
});

export { createSameTFundByAssetStore, getSameTFundsByAsset };
