import fs from 'fs';
import { getObjects } from "../src/nanoeffects/src/common.ts";

function writeToFile (data, chain, fileName) {
    console.log(`Writing to ./src/data/${chain}/${fileName}.json`);
    fs.writeFileSync(
      `./src/data/${chain}/${fileName}.json`,
      JSON.stringify(data, undefined, 4)
    );
  };

const main = async () => { 
    for (const chain of ["bitshares", "bitshares_testnet"]) {
      const allData = JSON.parse(fs.readFileSync(`./src/data/${chain}/allAssets.json`));
      const objectIds = allData.map(asset => asset.id.replace(/^1\.3\./, '2.3.'));

      let assetData;
      try {
        assetData = await getObjects(chain, objectIds);
      } catch (error) {
        console.log(error);
        return;
      }

      writeToFile(assetData, chain, "dynamicData");
    }
    process.exit(0);
  };
  
  main();