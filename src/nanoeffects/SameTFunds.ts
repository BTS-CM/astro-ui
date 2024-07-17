import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

const MAXIMUM_CREDIT_OFFERS = 1000;
const BTS_LIMIT = 100;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAXIMUM_CREDIT_OFFERS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAXIMUM_CREDIT_OFFERS / TEST_LIMIT;

// Retrieve all same t funds from the blockchain
function getSameTFunds (chain: string, specificNode?: string | null) {
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
      latestObjectID = await currentAPI.db_api().exec("get_next_object_id", [1, 20, false]);
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    const latestObjectIDNumber = parseInt(latestObjectID.split('.')[2], 10);

    let limit = chain === "bitshares" ? BTS_LIMIT : TEST_LIMIT;
    let allSameTFunds: any[] = [];
    let start_id = null;

    let firstPageOffers;
    try {
      firstPageOffers = await currentAPI.db_api().exec("list_samet_funds", [limit]);
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    if (firstPageOffers && firstPageOffers.length) {
      allSameTFunds.push(...firstPageOffers);

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
          let options = [limit, start_id];
          let pageOffers;
          try {
            pageOffers = await currentAPI.db_api().exec("list_samet_funds", options);
          } catch (error) {
            console.log({ error });
            reject(error);
            return;
          }
          if (!pageOffers || pageOffers.length) {
            break;
          }
          allSameTFunds.push(...pageOffers);
          start_id = pageOffers[pageOffers.length - 1].id;
        }
      }
    }

    currentAPI.close();
    resolve(allSameTFunds);
  });
}

const [createEverySameTFundStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;
      let specificNode = args[1] ? args[1] as string : null;
  
      let response;
      try {
        response = await getSameTFunds(chain, specificNode);
      } catch (error) {
        console.log({ error });
        return;
      }
  
      if (!response) {
        console.log(`Failed to fetch sametfunds...`);
        return;
      }
  
      return response;
    },
  });
  
  export { createEverySameTFundStore, getSameTFunds };
  