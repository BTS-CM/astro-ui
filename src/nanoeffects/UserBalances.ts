import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

//Fetch account balances
async function getAccountBalances(
  chain: string,
  accountID: string,
  specificNode?: string | null,
  existingAPI?: any,
  specificAssets?: string[] | null
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = existingAPI
        ? existingAPI
        : await Apis.instance(
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

    let balances;
    try {
      balances = await currentAPI
        .db_api()
        .exec("get_account_balances", [
          accountID,
          specificAssets ? specificAssets : [],
        ])
        .then((results: Object[]) => {
          if (results && results.length) {
            return results;
          }
        });
    } catch (error) {
      console.log({ error });
      if (!existingAPI) {
        currentAPI.close();
      }
      reject(error);
    }

    if (!existingAPI) {
      currentAPI.close();
    }

    if (!balances) {
      return resolve([]);
    }

    return resolve(balances);
  });
}

// Create fetcher store for user balances
const [createUserBalancesStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const accountID = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await getAccountBalances(chain, accountID, specificNode);
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

const [createUsersCoreBalanceStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const accountIDs = JSON.parse(args[1] as string);
    const specificNode = args[2] ? (args[2] as string) : null;

    let node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

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
      return;
    }

    let userBalances: any = [];
    for (let i = 0; i < accountIDs.length; i++) {
      const accountID = accountIDs[i];
      let response;
      try {
        response = await getAccountBalances(
          chain,
          accountID,
          specificNode,
          currentAPI,
          ["1.3.0"]
        );
      } catch (error) {
        console.log({ error });
        return;
      }

      if (!response) {
        console.log(`Failed to fetch user balances`);
        continue;
      }

      userBalances.push({ id: accountID, balance: response });
    }

    return userBalances;
  },
});

export {
  createUserBalancesStore,
  getAccountBalances,
  createUsersCoreBalanceStore,
};
