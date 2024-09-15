import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

const MAXIMUM_ISSUED_ASSETS = 1000; // Arbitrary number..
const BTS_LIMIT = 50;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAXIMUM_ISSUED_ASSETS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAXIMUM_ISSUED_ASSETS / TEST_LIMIT;

async function fetchingIssuedAssets(
    chain: string,
    accountID: string,
    specificNode?: string | null,
    existingAPI?: any
) {
    return new Promise(async (resolve, reject) => {
        const node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
        const maximumQuerySize = chain === "bitshares" ? BTS_LIMIT : TEST_LIMIT;
        const maximumIterations = chain === "bitshares" ? MAX_BTS_ITERATIONS : MAX_TEST_ITERATIONS;

        let currentAPI;
        try {
            currentAPI = existingAPI
                ? existingAPI
                : await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
                console.log({ error })
                );
        } catch (error) {
            console.log({ error });
            return;
        }
    
        let issuedAssets: any[] = [];
        try {
            issuedAssets = await currentAPI.db_api().exec("get_assets_by_issuer", [accountID, "1.3.0", maximumQuerySize]);
        } catch (error) {
            console.log({ error });
            currentAPI.close();
            return;
        }

        if (!issuedAssets) {
            console.log(`Failed to fetch issued assets`);
            currentAPI.close();
            return [];
        }

        if (issuedAssets.length === maximumQuerySize) {
            for (let i = 1; i < maximumQuerySize; i++) {
              let nextPage;
              try {
                nextPage = await currentAPI.db_api().exec(
                  "get_credit_deals_by_offer_owner",
                  [accountID, issuedAssets[issuedAssets.length - 1].id, maximumQuerySize]
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
                issuedAssets = [...issuedAssets, ...nextPage];
              } else {
                break;
              }
            }
        }

        if (!existingAPI) {
            currentAPI.close();
        }
          
        return resolve(issuedAssets);
    });
}

const [createIssuedAssetsStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
        const chain = args[0] as string;
        const userID = args[1] as string;
        const specificNode = args[2] ? (args[2] as string) : null;

        let response;
        try {
            response = await fetchingIssuedAssets(chain, userID, specificNode);
        } catch (error) {
            console.log({ error });
            return [];
        }
    
        return response;
    },
  });
  
  export { createIssuedAssetsStore };
  