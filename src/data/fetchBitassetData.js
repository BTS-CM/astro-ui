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
    const minAssets = JSON.parse(fs.readFileSync(`./src/data/${chain}/minAssets.json`));

    const filteredAssets = allData.filter((asset) => asset.bitasset_data_id);
    const objectIds = filteredAssets.map((asset) => asset.bitasset_data_id);

    let finalBitassetData;
    try {
      finalBitassetData = await getObjects(chain, objectIds);
    } catch (error) {
      console.log(error);
      return;
    }

    writeToFile(finalBitassetData, chain, "bitassetData");

    finalBitassetData.forEach((bitasset) => {
      if (bitasset.is_prediction_market && bitasset.is_prediction_market === true) {
        const matchingAsset = allData.find((asset) => asset.bitasset_data_id === bitasset.id);
        if (matchingAsset) {
          matchingAsset.prediction_market = true;
        }
        const matchingMinAsset = minAssets.find((asset) => `2.4.${asset.bdi}` === bitasset.id);
        if (matchingMinAsset) {
          matchingMinAsset.pm = true;
        }
      }
    });

    writeToFile(allData, chain, "allAssets");
    writeToFile(minAssets, chain, "minAssets");

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
