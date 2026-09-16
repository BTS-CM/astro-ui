import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

const MAXIMUM_CREDIT_OFFERS = 1000;
const BTS_LIMIT = 50;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAXIMUM_CREDIT_OFFERS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAXIMUM_CREDIT_OFFERS / TEST_LIMIT;

// Retrieve all credit deals associated with the one credit offer
function getCreditDealsByOfferId(
  chain: string,
  offerId: string,
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
    let allOffers: any[] = [];

    let firstPage;
    try {
      firstPage = await currentAPI
        .db_api()
        .exec("get_credit_deals_by_offer_id", [offerId, limit]);
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    if (firstPage && firstPage.length) {
      allOffers.push(...firstPage);

      if (firstPage.length === limit) {
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

        let start_id = bumpId(firstPage[firstPage.length - 1].id);

        for (let i = 1; i < maxIterations; i++) {
          let options = [offerId, limit, start_id];

          let pageOffers;
          try {
            pageOffers = await currentAPI
              .db_api()
              .exec("get_credit_deals_by_offer_id", options);
          } catch (error) {
            console.log({ error });
            reject(error);
            return;
          }
          if (!pageOffers || !pageOffers.length) {
            break;
          }
          allOffers.push(...pageOffers);
          if (pageOffers.length < limit) {
            break;
          }
          start_id = bumpId(pageOffers[pageOffers.length - 1].id);
        }
      }
    }

    // Defense in depth: drop any duplicate ids from inclusive-cursor overlap.
    allOffers = [
      ...new Map(allOffers.map((offer: any) => [offer.id, offer])).values(),
    ];

    currentAPI.close();
    resolve(allOffers);
  });
}

const [createCreditOfferDealsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const offerId = args[1] as string;
    let specificNode = args[2] ? (args[2] as string) : null;

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
