import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

function getWorkerProposals (chain: string, specificNode?: string | null) {
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
    
        let object;
        try {
          object = await currentAPI
            .db_api()
            .exec("get_all_workers", [false]) // false = non-expired wp only
        } catch (error) {
          console.log({ error });
          currentAPI.close();
          reject(error);
        }
    
        currentAPI.close();
    
        if (!object) {
          reject(new Error("Unable to retrieve worker propsosals"));
          return;
        }
    
        resolve(object);
      });
}

const [createWorkerProposalStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;

      let specificNode = args[1] ? args[1] as string : null;
  
      let response;
      try {
        response = await getWorkerProposals(chain, specificNode);
      } catch (error) {
        console.log({ error });
        return;
      }
  
      if (!response) {
        console.log(`Failed to fetch worker proposals`);
        return;
      }
  
      return response;
    },
  });
  
  export { createWorkerProposalStore, getWorkerProposals };
  