import { nanoquery } from "@nanostores/query";
import Apis from "../../bts/ws/ApiInstances";
import { chains } from "../../config/chains";

function getLimitOrders (
  chain: string,
  base: string,
  quote: string,
  limit?: number | null,
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
      console.log({ error });
      reject(error);
      return;
    }

    let limitOrders;
    try {
      limitOrders = await currentAPI.db_api().exec("get_limit_orders", [base, quote, limit]);
    } catch (error) {
      console.log({ error });
    }

    try {
      await currentAPI.close();
    } catch (error) {
      console.log({ error });
    }

    if (!limitOrders) {
      return reject(new Error("Couldn't retrieve limit orders"));
    }

    resolve(limitOrders);
  });
}

const [createLimitOrdersStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const quote = args[1] as string;
    const base = args[2] as string;
    const limit = args[3] as number;

    let specificNode = args[4] ? args[4] as string : null;

    let response;
    try {
      response =  await getLimitOrders(chain, base, quote, limit, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch market order book`);
      return;
    }

    return response;
  },
});

export { createLimitOrdersStore, getLimitOrders };
