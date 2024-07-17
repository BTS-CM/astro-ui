import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

const MAXIMUM_CREDIT_OFFERS = 1000;
const BTS_LIMIT = 100;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAXIMUM_CREDIT_OFFERS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAXIMUM_CREDIT_OFFERS / TEST_LIMIT;

// Retrieve credit offers by their owner from the blockchain
function getCreditOffersByOwner(
  chain: string,
  account_name_or_id: string,
  specificNode?: string | null
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode ? specificNode : chains[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
        console.log({ error })
      );
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    let latestObjectID;
    try {
      latestObjectID = await currentAPI.db_api().exec("get_next_object_id", [1, 21, false]);
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    const latestObjectIDNumber = parseInt(latestObjectID.split('.')[2], 10);

    let limit = chain === "bitshares" ? BTS_LIMIT : TEST_LIMIT;
    let creditOffers: any[] = [];
    let start_id = null;

    let firstPageOffers;
    try {
      firstPageOffers = await currentAPI.db_api().exec("get_credit_offers_by_owner", [account_name_or_id, limit]);
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    if (firstPageOffers && firstPageOffers.length) {
      creditOffers.push(...firstPageOffers);

      let lastOfferIDNumber = parseInt(firstPageOffers[firstPageOffers.length - 1].id.split('.')[2], 10);
      let totalItems = latestObjectIDNumber - lastOfferIDNumber;

      if (totalItems > 0) {
        let totalFetches = Math.min(
          Math.ceil(totalItems / limit),
          chain === "bitshares"
            ? MAX_BTS_ITERATIONS
            : MAX_TEST_ITERATIONS
        );
  
        start_id = firstPageOffers[firstPageOffers.length - 1].id;
  
        for (let i = 1; i < totalFetches; i++) {
          let options = [account_name_or_id, limit, start_id];
          let pageOffers;
          try {
            pageOffers = await currentAPI.db_api().exec("get_credit_offers_by_owner", options);
          } catch (error) {
            console.log({ error });
            reject(error);
            return;
          }
          if (!pageOffers || pageOffers.length) {
            break;
          }
          creditOffers.push(...pageOffers);
          start_id = pageOffers[pageOffers.length - 1].id;
        }
      }
    }

    currentAPI.close();
    resolve(creditOffers);
  });
}

const [createCreditOfferByOwnerStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;
      const account_name_or_id = args[1] as string;
      let specificNode = args[2] ? args[2] as string : null;
  
      let response;
      try {
        response = await getCreditOffersByOwner(chain, account_name_or_id, specificNode);
      } catch (error) {
        console.log({ error });
        return;
      }
  
      if (!response) {
        console.log(`Failed to fetch account's credit offers...`);
        return;
      }
  
      return response;
    },
  });
  
  export { createCreditOfferByOwnerStore, getCreditOffersByOwner };
  