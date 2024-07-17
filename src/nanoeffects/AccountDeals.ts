import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

import { fetchBorrowerDeals } from "./BorrowerDeals";
import { fetchLenderDeals } from "./LenderDeals";

/**
 * Fetches all credit deals for a specific account
 */
const [createAccountDealsStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;
      const account_id = args[1] as string;
      let specificNode = args[2] ? args[2] as string : null;
  
      let node = specificNode ? specificNode : chains[chain].nodeList[0].url;

      let currentAPI;
      try {
        currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
          console.log({ error })
        );
      } catch (error) {
        console.log({ error });
        return;
      }

      let borrowerDeals: any = [];
      try {
        borrowerDeals =  await fetchBorrowerDeals(chain, account_id, specificNode, currentAPI);
      } catch (error) {
        console.log({ error });
        return;
      }

      let lenderDeals: any = [];
      try {
        lenderDeals =  await fetchLenderDeals(chain, account_id, specificNode, currentAPI);
      } catch (error) {
        console.log({ error });
        return;
      }

      currentAPI.close();
  
      return {
        borrowerDeals: borrowerDeals ?? [],
        lenderDeals: lenderDeals ?? [],
      };
    },
  });
  
  export { createAccountDealsStore };
  