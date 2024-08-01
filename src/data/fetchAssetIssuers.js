import fs from 'fs';
import { getObjects } from "@/nanoeffects/src/common.ts";

function writeToFile (data, chain, fileName) {
    console.log(`Writing to ./${chain}/${fileName}.json`);
    fs.writeFileSync(
      `./src/data/${chain}/${fileName}.json`,
      JSON.stringify(data, undefined, 4)
    );
  };

const main = async () => { 
    for (const chain of ["bitshares", "bitshares_testnet"]) {
      const allData = JSON.parse(fs.readFileSync(`./src/data/${chain}/allAssets.json`));
      const objectIds = [...new Set(allData.map(asset => asset.issuer))];
      
      let assetIssuers;
      try {
        assetIssuers = await getObjects(chain, objectIds);
      } catch (error) {
        console.log(error);
        return;
      }
    
      const parsedIssuerResponse = assetIssuers.map(issuer => {
        return {
          id: issuer.id,
          ltm: issuer.lifetime_referrer === issuer.id,
          name: issuer.name,
        }
      }); 

      writeToFile(parsedIssuerResponse, chain, "assetIssuers");
    }
    process.exit(0);
  };
  
  main();