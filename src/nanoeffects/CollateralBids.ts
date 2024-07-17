import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

function getCollateralBids(
  chain: string,
  assetID: string,
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

        try {
          const [collateralBids] = await Promise.all([
            currentAPI.db_api().exec("get_collateral_bids", [assetID, 100, 0]), // get first 100 active collateral bids
          ]);
    
          currentAPI.close();
    
          if (collateralBids) {
            return resolve(collateralBids);
          }
    
          return reject(new Error("Couldn't retrieve collateral bids"));
        } catch (error) {
          console.log({ error });
          currentAPI.close();
          return reject(error);
        }
        
      });
}

const [createCollateralBidStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;
      const assetID = args[1] as string;

      let specificNode = args[2] ? args[2] as string : null;
  
      let response;
      try {
        response =  await getCollateralBids(
          chain,
          assetID,
          specificNode
        );
      } catch (error) {
        console.log({ error });
        return;
      }
  
      if (!response) {
        console.log(`Failed to fetch collateral bids`);
        return;
      }
  
      return response;
    },
  });
  
  export { createCollateralBidStore, getCollateralBids };
  