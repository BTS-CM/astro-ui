import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

const MAXIMUM_DEALS = 1000;
const BTS_LIMIT = 100;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAXIMUM_DEALS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAXIMUM_DEALS / TEST_LIMIT;

function fetchBorrowerDeals (
  chain: string,
  account_name_or_id: string,
  specificNode?: string | null,
  existingAPI?: any
) {
    return new Promise(async (resolve, reject) => {
        let node = specificNode ? specificNode : chains[chain].nodeList[0].url;

        let currentAPI;
        try {
          currentAPI = existingAPI
            ? existingAPI
            : await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
                console.log({ error })
              );
        } catch (error) {
          console.log({ error });
          reject(error);
          return;
        }

        const iterations = chain === "bitshares" ? MAX_BTS_ITERATIONS : MAX_TEST_ITERATIONS;
        const limit = chain === "bitshares" ? BTS_LIMIT : TEST_LIMIT;

        let borrowerDeals: any[] = [];
        try {
          borrowerDeals = await currentAPI.db_api().exec(
            "get_credit_deals_by_borrower",
            [account_name_or_id, limit]
          );
        } catch (error) {
          console.log({ error });
          if (!existingAPI) {
            currentAPI.close();
          }
          reject(error);
          return;
        }

        if (!borrowerDeals || !borrowerDeals.length) {
          reject(new Error("No credit deals found"));
          return;
        }

        if (borrowerDeals.length === limit) {
          for (let i = 1; i < iterations; i++) {
            let nextPage;
            try {
              nextPage = await currentAPI.db_api().exec(
                "get_credit_deals_by_borrower",
                [account_name_or_id, limit, borrowerDeals[borrowerDeals.length - 1].id]
              );
            } catch (error) {
              console.log({ error });
              if (!existingAPI) {
                currentAPI.close();
              }
              reject(error);
              return;
            }

            if (nextPage && nextPage.length) {
              borrowerDeals = [...borrowerDeals, ...nextPage];
            } else {
              break;
            }
          }
        }

        if (!existingAPI) {
          currentAPI.close();
        }

        return resolve(borrowerDeals);
      });
}

/**
 * Fetches the borrower's credit deals (borrowings)
 */
const [createBorrowerDealsStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;
      const account_id = args[1] as string;
      let specificNode = args[2] ? args[2] as string : null;
  
      let response;
      try {
        response =  await fetchBorrowerDeals(chain, account_id, specificNode);
      } catch (error) {
        console.log({ error });
        return;
      }
  
      if (!response) {
        console.log(`Failed to fetch borrower account's credit deals`);
        return;
      }
  
      return response;
    },
  });
  
  export { createBorrowerDealsStore, fetchBorrowerDeals };
  