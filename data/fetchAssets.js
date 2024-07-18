import fs from "fs";
import { getObjects } from "../src/nanoeffects/src/common.ts";
import { getMaxObjectIDs } from "../src/nanoeffects/MaxObjectID.ts";

const chains = ["bitshares", "bitshares_testnet"];

const getAllAssetData = async (chain) => {
  const allData = [];

  let maxObjectID;
  try {
    maxObjectID = await getMaxObjectIDs(chain, 1, 3);
  } catch (error) {
    console.log({ error });
    return;
  }

  let objectIds = Array.from({ length: maxObjectID }, (_, i) => `1.3.${i}`);

  let existingAssetFile;
  try {
    existingAssetFile = JSON.parse(fs.readFileSync(`./src/data/${chain}/allAssets.json`));
  } catch (error) {
    console.log(`Error reading file: ${error.message}`);
  }

  if (existingAssetFile) {
    // avoid trying to fetch the same assets again
    const existingAssets = existingAssetFile.map((asset) => asset.id);
    objectIds = objectIds.filter((id) => !existingAssets.includes(id));
    objectIds = objectIds.filter((id) => {
      // Filtering out dead assets
      const idValue = id.split(".")[2];
      return parseInt(idValue) > 200;
    });
    console.log(`Found ${existingAssetFile.length} existing assets`);

    allData.push(...existingAssetFile);
  }

  if (!objectIds.length) {
    console.log(`No new assets to fetch for ${chain}`);
    return allData;
  }

  console.log(`Fetching ${chain} asset data for ${objectIds.length} remaining assets`);

  let assetData;
  try {
    assetData = await getObjects(chain, objectIds);
  } catch (error) {
    console.log(error);
    console.log(`Check you're not fetching ${chain} assets which don't exist.`);
    return;
  }

  allData.push(
    ...assetData.map((asset) => {
      const mappedResponse = {
        id: asset.id,
        symbol: asset.symbol,
        precision: asset.precision,
        issuer: asset.issuer,
        market_fee_percent: asset.options.market_fee_percent,
        max_market_fee: asset.options.max_market_fee,
        max_supply: asset.options.max_supply,
      };

      if (asset.bitasset_data_id) {
        mappedResponse.bitasset_data_id = asset.bitasset_data_id;
      }

      return mappedResponse;
    })
  );

  return allData;
};

function writeToFile(data, chain, fileName, prettyPrint = true) {
  console.log(`Writing to ./src/data/${chain}/${fileName}.json`);
  fs.writeFileSync(
    `./src/data/${chain}/${fileName}.json`,
    prettyPrint ? JSON.stringify(data, undefined, 4) : JSON.stringify(data)
  );
}

const main = async () => {
  for (const chain of chains) {
    const allData = await getAllAssetData(chain);
    if (allData) {
      writeToFile(allData, chain, "allAssets");
      const minimumAssetInfo = allData.map((asset) => {
        return {
          id: asset.id.replace("1.3.", ""),
          s: asset.symbol,
          p: asset.precision,
          i: asset.issuer.replace("1.2.", ""),
          mfp: asset.market_fee_percent,
          mmf: asset.max_market_fee,
          ms: asset.max_supply,
        };
      });
      writeToFile(minimumAssetInfo, chain, "minAssets", false);
    }
  }

  process.exit(0);
};

main();
