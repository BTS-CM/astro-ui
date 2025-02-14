import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

import { humanReadableFloat } from "@/lib/common";
import { getObjects } from "./src/common";

/**
 * Retrieving a single asset
 */
const [createAssetFromSymbolStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const symbol = args[1] as string;

    const node = args[2] ? (args[2] as string) : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
        console.log({ error })
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    let assetID;
    try {
      assetID = await currentAPI
        .db_api()
        .exec("get_asset_id_from_string", [symbol]);
    } catch (error) {
      console.log({ error });
    }

    if (!assetID) {
      currentAPI.close();
      console.log(`Failed to fetch asset id for ${symbol}`);
      return;
    }

    let assetData;
    try {
      assetData = await getObjects(chain, [assetID], null, currentAPI);
    } catch (error) {
      console.log({ error });
      return;
    }

    const result = assetData && assetData.length ? assetData[0] : null;
    if (!result) {
      currentAPI.close();
      console.log(`Failed to fetch asset data for ${symbol}`);
      return;
    }

    let objectIDs = [result.id.replace("1.3.", "2.3.")];
    if (result.bitasset_data_id) {
      objectIDs.push(result.bitasset_data_id);
    }

    let extraData;
    try {
      extraData = await getObjects(chain, objectIDs, null, currentAPI);
    } catch (error) {
      console.log({ error });
      return;
    }

    currentAPI.close();

    return {assetData: assetData[0], extra: extraData, assetID};
  },
});

const [createPoolAssetStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const pools = JSON.parse(args[1] as string); // string -> any[]
    const assets = JSON.parse(args[2] as string); // string -> any[]
    const poolId = args[3] as string;

    const node = args[4] ? (args[4] as string) : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
        console.log({ error })
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    let foundPool = pools.find((x) => x.id === poolId);
    let poolAsset = assets.find((x) => x.id === foundPool.share_asset_id);
    let assetA = assets.find((x) => x.id === foundPool.asset_a_id);
    let assetB = assets.find((x) => x.id === foundPool.asset_b_id);

    let _objects = [
      assetA ? assetA.id : foundPool.asset_a_id,
      assetB ? assetB.id : foundPool.asset_b_id,
      assetA ? assetA.id.replace("1.3.", "2.3.") : foundPool.asset_a_id.replace("1.3.", "2.3."),
      assetB ? assetB.id.replace("1.3.", "2.3.") : foundPool.asset_b_id.replace("1.3.", "2.3."),
      poolAsset ? poolAsset.id.replace("1.3.", "2.3.") : foundPool.share_asset_id.replace("1.3.", "2.3."),
    ];

    if (assetA.bitasset_data_id) {
      _objects.push(assetA.bitasset_data_id);
    }

    if (assetB.bitasset_data_id) {
      _objects.push(assetB.bitasset_data_id);
    }

    let retrievedData;
    try {
      retrievedData = await getObjects(chain, _objects, null, currentAPI);
    } catch (error) {
      console.log({ error });
    }

    currentAPI.close();

    if (!retrievedData || !retrievedData.length) {
      console.log(`Failed to retrieve pool data`);
      return;
    }

    foundPool["asset_a_symbol"] = assetA.symbol;
    foundPool["asset_a_precision"] = assetA.precision;

    foundPool["asset_b_symbol"] = assetB.symbol;
    foundPool["asset_b_precision"] = assetB.precision;

    foundPool["share_asset_symbol"] = foundPool.share_asset_symbol;

    foundPool["readable_balance_a"] = `${humanReadableFloat(
      foundPool.balance_a, assetA.precision
    )} ${assetA.symbol}`;
    foundPool["readable_balance_b"] = `${humanReadableFloat(
      foundPool.balance_b, assetB.precision
    )} ${assetB.symbol}`;

    foundPool["share_asset_details"] = assets.find((x) => x.id === foundPool.share_asset_id);

    const poolResult = {
      foundPool,
      poolAsset,
      assetA: retrievedData[0],
      assetB: retrievedData[1],
      assetADetails: retrievedData[2],
      assetBDetails: retrievedData[3],
      foundPoolDetails: retrievedData[4],
    };
    if (assetA.bitasset_data_id) {
      poolResult["bitassetA"] = retrievedData[5];
    }
    if (assetB.bitasset_data_id) {
      const index = assetA.bitasset_data_id ? 6 : 5;
      poolResult["bitassetB"] = retrievedData[index];
    }
    return poolResult;
  },
});

export { createAssetFromSymbolStore, createPoolAssetStore };
