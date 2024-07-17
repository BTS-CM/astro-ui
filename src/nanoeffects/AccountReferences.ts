import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

function getAccountReferences (chain: string, accountID: string, specificNode?: string | null) {
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
    
        let accountReferences;
        try {
          accountReferences = await currentAPI.db_api().exec("get_account_references", [accountID])
        } catch (error) {
          console.log({ error });
          currentAPI.close();
          reject(error);
        }
    
        currentAPI.close();
    
        if (!accountReferences) {
          reject(new Error("Account references not found..."));
          return;
        }
    
        resolve(accountReferences);
      });
}

const [createAccountReferenceStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;
      const account_id = args[1] as string;
      let specificNode = args[2] ? args[2] as string : null;
  
      let response;
      try {
        response = await getAccountReferences(chain, account_id, specificNode);
      } catch (error) {
        console.log({ error });
        return;
      }
  
      if (!response) {
        console.log(`Failed to fetch account references...`);
        return;
      }
  
      return response;
    },
  });
  
  export { createAccountReferenceStore, getAccountReferences };
  