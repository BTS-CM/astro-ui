import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

// Returns an id if the asset exists
async function checkAssetExists(chain: string, symbol_or_id: string, specificNode?: string | null) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode ? specificNode : chains[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
        console.log({ error })
      );
    } catch (error) {
      console.log({ error, node });
      reject(error);
      return;
    }

    let assetID;
    try {
      assetID = await currentAPI
        .db_api()
        .exec("get_asset_id_from_string", [symbol_or_id]);
    } catch (error) {
      console.log({ error });
    }

    currentAPI.close();

    resolve(assetID ?? null);
  });
}

const [createAssetExistsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const symbol_or_id = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await checkAssetExists(chain, symbol_or_id, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    return response;
  },
});

export { createAssetExistsStore, checkAssetExists };
