import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

const MAXIMUM_CREDIT_OFFERS = 1000;
const BTS_LIMIT = 100;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAXIMUM_CREDIT_OFFERS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAXIMUM_CREDIT_OFFERS / TEST_LIMIT;

// Retrieve all credit deals associated with the one credit offer
function getCreditDealsByOfferId (chain: string, offerId: string, specificNode?: string | null) {
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
      latestObjectID = await currentAPI
        .db_api()
        .exec("get_next_object_id", [1, 22, false]);
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    const latestObjectIDNumber = parseInt(latestObjectID.split('.')[2], 10);

    let limit = chain === "bitshares" ? BTS_LIMIT : TEST_LIMIT;
    let allOffers: any[] = [];
    let start_id = null;

    let firstPage;
    try {
      firstPage = await currentAPI.db_api().exec("get_credit_deals_by_offer_id", [offerId, limit]);
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    if (firstPage && firstPage.length) {
      let lastIDNumber = parseInt(firstPage[firstPage.length - 1].id.split('.')[2], 10);

      let totalItems = latestObjectIDNumber - lastIDNumber;

      let totalFetches = Math.min(
        Math.ceil(totalItems / limit),
        chain === "bitshares"
          ? MAX_BTS_ITERATIONS
          : MAX_TEST_ITERATIONS
      );

      allOffers.push(...firstPage);

      start_id = firstPage[firstPage.length - 1].id;

      // Use a for loop for the remaining fetches
      for (let i = 1; i < totalFetches; i++) {
        let options = [offerId, limit, start_id];

        let pageOffers;
        try {
          pageOffers = await currentAPI.db_api().exec("get_credit_deals_by_offer_id", options);
        } catch (error) {
          console.log({ error });
          reject(error);
          return;
        }
        if (!pageOffers || pageOffers.length) {
          break;
        }
        allOffers.push(...pageOffers);
        start_id = pageOffers[pageOffers.length - 1].id;
      }
    }

    currentAPI.close();
    resolve(allOffers);
  });
}

const [createCreditOfferDealsStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;
      const offerId = args[1] as string;
      let specificNode = args[2] ? args[2] as string : null;
  
      let response;
      try {
        response = await getCreditDealsByOfferId(chain, offerId, specificNode);
      } catch (error) {
        console.log({ error });
        return;
      }
  
      if (!response) {
        console.log(`Failed to fetch max object id`);
        return;
      }
  
      return response;
    },
  });
  
  export { createCreditOfferDealsStore, getCreditDealsByOfferId };
  