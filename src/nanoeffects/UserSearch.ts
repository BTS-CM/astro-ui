import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";
import { $nodes } from "@/stores/node";

async function accountSearch(
  chain: string,
  search_string: string,
  specificNode?: string | null
) {
  return new Promise(async (resolve, reject) => {
    // access latest $nodes

    let node;
    if (specificNode) {
      node = specificNode;
    } else {
      const nodes = $nodes.get();
      const relevantNodes = nodes[chain];

      node = relevantNodes[0].url;
    }

    let currentAPI;
    try {
      currentAPI = await Apis.instance(
        node,
        true,
        4000,
        { enableDatabase: true },
        (error: Error) => console.log({ error })
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
        .exec("get_accounts", [[search_string]]);
    } catch (error) {
      console.log({ error });
      currentAPI.close();
      reject(error);
    }

    if (!object || !object.length) {
      return reject(new Error("Couldn't retrieve account"));
    }

    currentAPI.close();
    resolve(object[0]);
  });
}

const [createUserSearchStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const searchText = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await accountSearch(chain, searchText, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch user balances`);
      return;
    }

    return response;
  },
});

export { createUserSearchStore, accountSearch };
