import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";

import { $blockList } from "@/stores/blocklist";

async function getBlockedaccounts(chain: string, node: string) {
  return new Promise(async (resolve, reject) => {
    let _existingBlockList = $blockList.get();

    if (
      _existingBlockList.users.length > 0 &&
      Date.now() - _existingBlockList.timestamp < 1000 * 60 * 60 * 24
    ) {
      resolve(_existingBlockList.users);
      return;
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

    let committeeAccount: any;
    try {
      committeeAccount = await currentAPI
        .db_api()
        .exec("get_accounts", [["committee-blacklist-manager"]]);
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    if (!committeeAccount || !committeeAccount.length) {
      reject(new Error("Unable to retrieve committee account"));
      return;
    }

    const blockedList = committeeAccount[0].blacklisted_accounts;

    // [1.2.x, ...] -> hex string
    let hashedBlockList = blockedList.map((account: string) =>
      toHex(sha256(utf8ToBytes(account)))
    );

    resolve(hashedBlockList);
  });
}

const [createBlockedAccountStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const node = args[1]
      ? (args[1] as string)
      : (chains as any)[chain].nodeList[0].url;

    let response;
    try {
      response = await getBlockedaccounts(chain, node);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch banned accounts`);
      return;
    }

    return response;
  },
});

export { createBlockedAccountStore, getBlockedaccounts };
