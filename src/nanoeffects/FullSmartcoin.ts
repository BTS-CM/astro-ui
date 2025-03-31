import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

function getFullSmartcoin(
  chain: string,
  assetID: string,
  collateralAssetID: string,
  bitassetID: string,
  collateralBitassetID: string,
  userID: string,
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

    try {
      const [
        userBalances,
        smartcoinData,
        marginPositions,
        assetCallOrders,
        assetSettleOrders,
        assetLimitOrders,
      ] = await Promise.all([
        currentAPI.db_api().exec("get_account_balances", [userID, []]),
        currentAPI
          .db_api()
          .exec("get_objects", [
            collateralBitassetID && collateralBitassetID.length
              ? [assetID, collateralAssetID, bitassetID, collateralBitassetID]
              : [assetID, collateralAssetID, bitassetID],
            false,
          ]),
        currentAPI.db_api().exec("get_margin_positions", [userID]),
        currentAPI.db_api().exec("get_call_orders", [assetID, 100]),
        currentAPI.db_api().exec("get_settle_orders", [assetID, 100]),
        currentAPI
          .db_api()
          .exec("get_order_book", [assetID, collateralAssetID, 10]),
      ]);

      currentAPI.close();

      if (smartcoinData && smartcoinData.length) {
        const assetData = smartcoinData.slice(0, 2);

        const collateralData =
          smartcoinData.length > 3
            ? smartcoinData.slice(2, 4)
            : [...smartcoinData.slice(2, 3), {}];

        return resolve([
          userBalances,
          ...assetData,
          ...collateralData,
          marginPositions && marginPositions.length
            ? marginPositions.filter(
                (x: any) => x.call_price.quote.asset_id === assetID
              )
            : [],
          assetCallOrders,
          assetSettleOrders,
          assetLimitOrders,
        ]);
      }

      return reject(new Error("Couldn't retrieve objects"));
    } catch (error) {
      console.log({ error });
      currentAPI.close();
      return reject(error);
    }
  });
}

const [createFullSmartcoinStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const assetID = args[1] as string;
    const collateralAssetID = args[2] as string;
    const bitassetID = args[3] as string;
    const collateralBitassetID = args[4] as string;
    const userID = args[5] as string;

    let specificNode = args[6] ? (args[6] as string) : null;

    let response;
    try {
      response = await getFullSmartcoin(
        chain,
        assetID,
        collateralAssetID,
        bitassetID,
        collateralBitassetID,
        userID,
        specificNode
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch full smartcoin data`);
      return;
    }

    return response;
  },
});

export { createFullSmartcoinStore, getFullSmartcoin };
