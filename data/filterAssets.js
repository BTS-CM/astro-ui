import fs from 'fs';

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
      const pools = JSON.parse(fs.readFileSync(`./src/data/${chain}/pools.json`));

      const objectIds = [...new Set(pools.flatMap((pool) => {
        return [pool.asset_a_id, pool.asset_b_id]
      }))];

      writeToFile(
        allData.filter(asset => objectIds.includes(asset.id)), // only keep assets that are in the pools
        chain,
        "poolAssets"
      );
    }
    process.exit(0);
  };
  
  main();