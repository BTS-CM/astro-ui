import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

const MAXIMUM_DEALS = 1000;
const BTS_LIMIT = 100;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAXIMUM_DEALS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAXIMUM_DEALS / TEST_LIMIT;

function get_htlc(
  chain: string,
  account_name_or_id: string,
  type: "sender" | "receiver",
  specificNode?: string | null,
  existingAPI?: any
) {
    return new Promise(async (resolve, reject) => {
        let node = specificNode ? specificNode : chains[chain].nodeList[0].url;

        let currentAPI;
        try {
          currentAPI = existingAPI
            ? existingAPI
            : await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
                console.log({ error })
              );
        } catch (error) {
          console.log({ error });
          reject(error);
          return;
        }

        const iterations = chain === "bitshares" ? MAX_BTS_ITERATIONS : MAX_TEST_ITERATIONS;
        const limit = chain === "bitshares" ? BTS_LIMIT : TEST_LIMIT;

        let objects: any[] = [];
        try {
          objects = await currentAPI.db_api().exec(
            type === "sender" ? "get_htlc_by_from" : "get_htlc_by_to",
            [account_name_or_id, "1.16.0", limit]
          );
        } catch (error) {
          console.log({ error });
          if (!existingAPI) {
            currentAPI.close();
          }
          reject(error);
          return;
        }

        if (!objects || !objects.length) {
          reject(new Error("No HTLC items found"));
          return;
        }

        if (objects.length === limit) {
          for (let i = 1; i < iterations; i++) {
            let nextPage;
            try {
              nextPage = await currentAPI.db_api().exec(
                type === "sender" ? "get_htlc_by_from" : "get_htlc_by_to",
                [account_name_or_id, objects[objects.length - 1].id, limit]
              );
            } catch (error) {
              console.log({ error });
              if (!existingAPI) {
                currentAPI.close();
              }
              reject(error);
              return;
            }

            if (nextPage && nextPage.length) {
              objects = [...objects, ...nextPage];
            } else {
              break;
            }
          }
        }

        if (!existingAPI) {
          currentAPI.close();
        }

        return resolve(objects);
      });
}

/**
 * Fetches the HTLC objects being sent by this account
 */
const [createHTLCSenderStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const account_id = args[1] as string;
    let specificNode = args[2] ? args[2] as string : null;

    let response;
    try {
      response =  await get_htlc(
        chain,
        account_id,
        "sender",
        specificNode
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch sender's HTLC objects`);
      return;
    }

    return response;
  },
});

/**
 * Fetches the HTLC objects being received by this account
 */
const [createHTLCReceiverStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const account_id = args[1] as string;
    let specificNode = args[2] ? args[2] as string : null;

    let response;
    try {
      response =  await get_htlc(
        chain,
        account_id,
        "receiver",
        specificNode
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch receiver's HTLC objects`);
      return;
    }

    return response;
  },
});

/**
 * Fetches all HTLC objects for a given account
 */
const [createHTLCStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const account_id = args[1] as string;
    let specificNode = args[2] ? args[2] as string : null;

    let node = specificNode ? specificNode : chains[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
        console.log({ error })
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    let senderResponse;
    try {
      senderResponse =  await get_htlc(
        chain,
        account_id,
        "sender",
        specificNode,
        currentAPI
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    let receiverResponse;
    try {
      receiverResponse =  await get_htlc(
        chain,
        account_id,
        "receiver",
        specificNode,
        currentAPI
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    return {
      sender: senderResponse,
      receiver: receiverResponse,
    };
  },
});

export {
  createHTLCSenderStore,
  createHTLCReceiverStore,
  createHTLCStore,
  get_htlc
};