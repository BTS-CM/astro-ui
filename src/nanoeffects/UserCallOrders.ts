import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

async function getUserCallOrders(
  chain: string,
  accountID: string,
  specificNode?: string | null,
  existingAPI?: any
) {
  return new Promise(async (resolve, reject) => {
    const node = specificNode
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

    let marginPositions: any[];
    try {
      marginPositions = await currentAPI
        .db_api()
        .exec("get_margin_positions", [accountID]);
    } catch (error) {
      console.log({ error });
      if (!existingAPI) {
        currentAPI.close();
      }
      return reject(error);
    }

    if (!existingAPI) {
      currentAPI.close();
    }

    if (!marginPositions || !marginPositions.length) {
      return resolve([]);
    }

    const positions = marginPositions
      .filter((o: any) => o && o.borrower && o.call_price)
      .map((o: any) => ({
        id: o.id,
        debt_asset: o.call_price.quote.asset_id,
        collateral_asset: o.call_price.base.asset_id,
        borrower: o.borrower,
        collateral: o.collateral,
        debt: o.debt,
        target_collateral_ratio: o.target_collateral_ratio
          ? Number(o.target_collateral_ratio)
          : 0,
      }));

    return resolve(positions);
  });
}

const [createUserCallOrdersStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const accountID = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await getUserCallOrders(chain, accountID, specificNode);
    } catch (error) {
      console.log({ error });
      return [];
    }

    if (!response) {
      console.log(`Failed to fetch user call orders`);
      return [];
    }

    return response;
  },
});

export { createUserCallOrdersStore, getUserCallOrders };
