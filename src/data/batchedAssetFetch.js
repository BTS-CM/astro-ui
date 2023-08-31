//const fs = require('fs');
//const { Apis } = require('bitsharesjs-ws');

import fs from 'fs';
import { Apis } from 'bitsharesjs-ws';

const outputFile = './assetData.json';

function sliceIntoChunks(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      const chunk = arr.slice(i, i + size);
      chunks.push(chunk);
    }
    return chunks;
  }

/**
 * Get multiple objects such as accounts, assets, etc
 * @param {Array} object_ids
 */
async function getObjects(object_ids) {
  return new Promise(async (resolve, reject) => {
    try {
      await Apis.instance("wss://node.xbts.io/ws", true).init_promise;
    } catch (error) {
      console.log(error);
      reject(error);
      return;
    }

    let retrievedObjects = [];
    const chunksOfInputs = sliceIntoChunks(object_ids, 100);
    for (let i = 0; i < chunksOfInputs.length; i++) {
      const currentChunk = chunksOfInputs[i];
      // console.log(`Fetching chunk ${i + 1} of ${chunksOfInputs.length}`);

      let got_objects;
      try {
        got_objects = await Apis.instance().db_api().exec("get_objects", [currentChunk, false]);
      } catch (error) {
        console.log(error);
        reject(error);
        return;
      }

      if (got_objects && got_objects.length) {
        retrievedObjects = retrievedObjects.concat(got_objects.filter((x) => x !== null));
      }
    }

    if (retrievedObjects && retrievedObjects.length) {
      resolve(retrievedObjects);
    }
  });
}

const getAllAssetData = async () => {
  const allData = [];
  const objectIds = [];
  for (let i = 0; i <= 7000; i++) {
    objectIds.push(`1.3.${i}`);
  }
  console.log(`Fetching asset data for ${objectIds.length} assets`);
  let assetData;
  try {
    assetData = await getObjects(objectIds);
  } catch (error) {
    console.log(error);
    return;
  }
  allData.push(...assetData.map((asset) => ({
    id: asset.id,
    symbol: asset.symbol,
    precision: asset.precision,
    issuer: asset.issuer,
    market_fee_percent: asset.options.market_fee_percent,
    max_market_fee: asset.options.max_market_fee,
    max_supply: asset.options.max_supply
  })));
  return allData;
};

const writeToFile = (data) => {
  console.log(`Writing to ${outputFile}`);
  fs.writeFileSync(outputFile, JSON.stringify(data));
};

const main = async () => {
  const allData = await getAllAssetData();
  writeToFile(allData);
  process.exit(0);
};

main();