import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

// Get the latest ID for an object in the blockchain
async function getCurrentBlock(chain: string, specificNode?: string | null) {
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
        getCurrentBlock(
          chain,
          chains[chain].nodeList.map((x: any) => x.url).filter((x: string) => x !== node)[0]
        )
      );
    }

    let dynamicGlobalProperties;
    try {
      dynamicGlobalProperties = await currentAPI
        .db_api()
        .exec("get_dynamic_global_properties", []);
    } catch (error) {
      console.log({ error });
    }

    if (!dynamicGlobalProperties) {
      console.log(`Failed to fetch current block`);
      reject();
      return;
    }

    console.log({dynamicGlobalProperties});
    
    let currentBlock;
    try {
      currentBlock = await currentAPI.db_api().exec("get_block", [dynamicGlobalProperties.head_block_number]);
    } catch (error) {
      console.log({ error });
    }

    console.log({currentBlock});

    currentAPI.close();

    if (!currentBlock) {
      console.log(`Failed to fetch current block`);
      reject();
      return;
    }

    resolve(currentBlock);
  });
}

const [createCurrentBlockStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const specificNode = args[1] ? (args[1] as string) : null;

    let response;
    try {
      response = await getCurrentBlock(chain, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch the current block`);
      return;
    }

    return response;
  },
});

export { createCurrentBlockStore, getCurrentBlock };
