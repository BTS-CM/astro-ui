import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

function getAssetCallOrders(
    chain: string,
    ids: string[],
    specificNode?: string | null,
    existingAPI?: any
) {
    return new Promise(async (resolve, reject) => {
      let currentAPI;
      if (existingAPI) {
        currentAPI = existingAPI;
      } else {
        let node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
        try {
          currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
            console.log({ error })
          );
        } catch (error) {
          console.log({ error });
          reject(error);
          return;
        }
      }
  
      try {
        const assetCallOrders = await Promise.all(
          ids.map(async (id) => {
            const result = await currentAPI.db_api().exec("get_call_orders", [id, 300]);
            return { [id]: result };
          })
        );
  
        currentAPI.close();
  
        if (assetCallOrders) {
          return resolve(assetCallOrders);
        }
  
        return reject(new Error("Couldn't retrieve asset call orders"));
      } catch (error) {
        console.log({ error });
        currentAPI.close();
        return reject(error);
      }
    });
  }

const [createAssetCallOrdersStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;
      const ids = JSON.parse(args[1] as string);

      let specificNode = args[2] ? args[2] as string : null;

      let response;
      try {
        response =  await getAssetCallOrders(
          chain,
          ids,
          specificNode
        );
      } catch (error) {
        console.log({ error });
        return;
      }
  
      if (!response) {
        console.log(`Failed to fetch asset call orders`);
        return;
      }
  
      return response;
    }
});

export { getAssetCallOrders, createAssetCallOrdersStore };