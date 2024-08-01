import fs from "fs";
import { getObjects } from "@/nanoeffects/src/common.ts";

function writeToFile(data, chain, fileName, prettyPrint = true) {
  console.log(`Writing to ./${chain}/${fileName}.json`);
  fs.writeFileSync(
    `./src/data/${chain}/${fileName}.json`,
    prettyPrint ? JSON.stringify(data, undefined, 4) : JSON.stringify(data)
  );
}

const main = async () => {
  for (const chain of ["bitshares", "bitshares_testnet"]) {
    const allData = JSON.parse(fs.readFileSync(`./src/data/${chain}/allAssets.json`));

    // Filter the assets
    const filteredAssets = allData.filter(
      (asset) => asset.bitasset_data_id && !asset.is_prediction_market // &&
      //asset.market_fee_percent < 20
    );

    // Get the objectIds from the filtered assets
    const objectIds = filteredAssets.map((asset) => asset.bitasset_data_id);

    let assetData;
    try {
      assetData = await getObjects(chain, objectIds);
    } catch (error) {
      console.log(error);
      return;
    }

    let finalBitassetData = assetData.filter((asset) => asset.feeds.length > 0);
    writeToFile(finalBitassetData, chain, "bitassetData");

    const assetIssuers = JSON.parse(fs.readFileSync(`./src/data/${chain}/assetIssuers.json`));

    const minimumBitassetInfo = finalBitassetData.map((info) => {
      const foundAsset = filteredAssets.find((x) => x.id === info.asset_id);
      return {
        id: info.id,
        assetID: info.asset_id,
        issuer: assetIssuers.find((issuer) => issuer.id === foundAsset.issuer),
        feeds: info.feeds.map((feed) => feed[0]),
        collateral: info.options.short_backing_asset,
        mcr: info.median_feed.maintenance_collateral_ratio,
        mssr: info.median_feed.maximum_short_squeeze_ratio,
        icr: info.median_feed.initial_collateral_ratio,
      };
    });
    writeToFile(minimumBitassetInfo, chain, "minBitassetData", false);
  }
  process.exit(0);
};

main();
