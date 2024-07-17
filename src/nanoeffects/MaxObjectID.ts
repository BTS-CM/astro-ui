import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

// Get the latest ID for an object in the blockchain
async function getMaxObjectIDs(
  chain: string,
  space_id: number,
  type_id: number,
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
      console.log({ error, node });
      console.log("Trying another node");
      return resolve(
        getMaxObjectIDs(
          chain,
          space_id,
          type_id,
          chains[chain].nodeList.map((x: any) => x.url).filter((x: string) => x !== node)[0]
        )
      );
    }

    let nextObjectId;
    try {
      nextObjectId = await currentAPI
        .db_api()
        .exec("get_next_object_id", [space_id, type_id, false]);
    } catch (error) {
      console.log({ error, space_id, type_id });
      currentAPI.close();

      console.log("Trying another node");
      return resolve(
        getMaxObjectIDs(
          chain,
          space_id,
          type_id,
          chains[chain].nodeList.map((x: any) => x.url).filter((x: string) => x !== node)[0]
        )
      );
    }

    currentAPI.close();

    // The next object ID is the maximum object ID plus one, so subtract one to get the maximum object ID
    resolve(parseInt(nextObjectId.split(".")[2]) - 1);
  });
}

const [createMaxObjectIDStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const space_id = args[1] as number;
    const type_id = args[2] as number;
    const specificNode = args[3] ? (args[3] as string) : null;

    let response;
    try {
      response = await getMaxObjectIDs(chain, space_id, type_id, specificNode);
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

export { createMaxObjectIDStore, getMaxObjectIDs };
