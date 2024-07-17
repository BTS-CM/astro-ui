import { nanoquery } from "@nanostores/query";
import Apis from "../bts/ws/ApiInstances";
import { chains } from "../config/chains";

// Retrieve the quantity of registered blockchain accounts
async function getAccountCount(chain: string, specificNode?: string | null) {
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

    let accountCount;
    try {
      accountCount = await currentAPI.db_api().exec("get_account_count", []);
    } catch (error) {
      console.log({ error });
    }

    if (!accountCount) {
      console.log(`Failed to fetch the quantity of registered blockchain accounts`);
      reject();
      return;
    }

    resolve(accountCount);
  });
}

const [createAccountCountStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const specificNode = args[1] ? (args[1] as string) : null;

    let response;
    try {
      response = await getAccountCount(chain, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch the quantity of registered accounts`);
      return;
    }

    return response;
  },
});

export { createAccountCountStore, getAccountCount };
