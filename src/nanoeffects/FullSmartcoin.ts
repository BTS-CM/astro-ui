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

    // Serial queries over the single shared API handle: one request at a
    // time avoids piling parallel calls onto the socket (public nodes drop
    // connections under parallel bursts) and keeps ordering deterministic.
    // Slightly higher wall-time than Promise.all, far gentler on the node.
    let userBalances;
    let smartcoinData;
    let marginPositions;
    let assetCallOrders;
    let assetSettleOrders;
    let assetLimitOrders;
    try {
      userBalances = await currentAPI
        .db_api()
        .exec("get_account_balances", [userID, []]);
      smartcoinData = await currentAPI.db_api().exec("get_objects", [
        collateralBitassetID && collateralBitassetID.length
          ? [assetID, collateralAssetID, bitassetID, collateralBitassetID]
          : [assetID, collateralAssetID, bitassetID],
        false,
      ]);
      marginPositions = await currentAPI
        .db_api()
        .exec("get_margin_positions", [userID]);
      assetCallOrders = await currentAPI
        .db_api()
        .exec("get_call_orders", [assetID, 100]);
      assetSettleOrders = await currentAPI
        .db_api()
        .exec("get_settle_orders", [assetID, 100]);
      assetLimitOrders = await currentAPI
        .db_api()
        .exec("get_order_book", [assetID, collateralAssetID, 10]);
    } catch (error) {
      console.log({ error });
      currentAPI.close();
      return reject(error);
    }

    try {
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

export { createFullSmartcoinStore };

// Lightweight manual refresh for the position/order lists only (used by the
// manual refresh buttons on the debt page). Opens its own connection and
// closes it — no subscriptions, no timers.
export async function fetchMarginCallSettleLists(
  chain: string,
  assetID: string,
  userID: string,
  specificNode?: string | null
) {
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

  // Serial over the single shared handle (see getFullSmartcoin above).
  try {
    const marginPositions = await currentAPI
      .db_api()
      .exec("get_margin_positions", [userID]);
    const assetCallOrders = await currentAPI
      .db_api()
      .exec("get_call_orders", [assetID, 100]);
    const assetSettleOrders = await currentAPI
      .db_api()
      .exec("get_settle_orders", [assetID, 100]);

    currentAPI.close();

    return { marginPositions, callOrders: assetCallOrders, settleOrders: assetSettleOrders };
  } catch (error) {
    console.log({ error });
    currentAPI.close();
    return;
  }
}
