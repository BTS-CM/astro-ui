import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

function getVestingBalances(
  chain: string,
  accountID: string,
  specificNode?: string | null
) {
  return new Promise(async (resolve, reject) => {
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
      reject(error);
      return;
    }

    let vestingBalanceObjects;
    try {
      vestingBalanceObjects = await currentAPI
        .db_api()
        .exec("get_vesting_balances", [accountID]);
    } catch (error) {
      console.log({ error });
    }

    currentAPI.close();

    if (!vestingBalanceObjects) {
      console.log(`Failed to fetch vesting balances`);
      reject();
      return;
    }

    resolve(vestingBalanceObjects);
  });
}

const [createVestingBalanceStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const account_id = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await getVestingBalances(chain, account_id, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch vesting balances`);
      return;
    }

    return response;
  },
});

export { createVestingBalanceStore, getVestingBalances };
