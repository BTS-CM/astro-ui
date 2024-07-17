import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

function getAccountProposals (
  chain: string,
  accountID: string,
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
    
        let proposedtransactions;
        try {
          proposedtransactions = await currentAPI
            .db_api()
            .exec("get_proposed_transactions", [accountID]);
        } catch (error) {
          console.log({ error });
          currentAPI.close();
          reject(error);
        }
    
        currentAPI.close();
    
        if (!proposedtransactions) {
          reject(new Error("No proposed transactions found"));
          return;
        }
    
        resolve(proposedtransactions);
      });
}

const [createAccountProposalStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;
      const account_id = args[1] as string;
      
      let specificNode = args[2] ? args[2] as string : null;
  
      let response;
      try {
        response =  await getAccountProposals(chain, account_id, specificNode);
      } catch (error) {
        console.log({ error });
        return;
      }
  
      if (!response) {
        console.log(`Failed to fetch account proposals`);
        return;
      }
  
      return response;
    },
  });
  
  export { createAccountProposalStore, getAccountProposals };
  