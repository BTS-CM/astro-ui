import fs from "fs";

const chains = ["bitshares", "bitshares_testnet"];

const urls = {
  bitshares: "https://api.bitshares.ws/openexplorer/pools",
  bitshares_testnet: "https://api.testnet.bitshares.ws/openexplorer/pools",
};

for (const chain of chains) {
  const url = urls[chain];
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      fs.writeFile(
        `./src/data/${chain}/allPools.json`,
        JSON.stringify(data, undefined, 4),
        (err) => {
          if (err) throw err;
          console.log("Pools data saved to allPools.json");
        }
      );

      const filteredPoolData = data.map((pool) => {
        return {
          id: pool.id,
          asset_a_id: pool.asset_a,
          asset_a_symbol: pool.details.asset_a.symbol,
          asset_b_id: pool.asset_b,
          asset_b_symbol: pool.details.asset_b.symbol,
          share_asset_symbol: pool.details.share_asset.symbol,
          share_asset_id: pool.share_asset,
          balance_a: pool.balance_a,
          balance_b: pool.balance_b,
          taker_fee_percent: pool.taker_fee_percent,
        };
      });

      fs.writeFile(
        `./src/data/${chain}/pools.json`,
        JSON.stringify(filteredPoolData, undefined, 4),
        (err) => {
          if (err) throw err;
          console.log("Pools data saved to pools.json");
        }
      );

      const minPoolData = data.map((pool) => {
        return {
          id: pool.id.replace("1.19.", ""),
          a: pool.asset_a.replace("1.3.", ""),
          as: pool.details.asset_a.symbol,
          b: pool.asset_b.replace("1.3.", ""),
          bs: pool.details.asset_b.symbol,
          sa: pool.details.share_asset.symbol,
          said: pool.share_asset,
          ba: pool.balance_a,
          bb: pool.balance_b,
          tfp: pool.taker_fee_percent,
        };
      });

      fs.writeFile(`./src/data/${chain}/minPools.json`, JSON.stringify(minPoolData), (err) => {
        if (err) throw err;
        console.log("Pools data saved to pools.json");
      });
    })
    .catch((err) => console.log("Error: " + err.message));
}
