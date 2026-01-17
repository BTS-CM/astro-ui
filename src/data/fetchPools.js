import fs from "fs";
import { fetchLiquidityPools } from "../nanoeffects/LiquidityPools.ts";
import { getObjects } from "../nanoeffects/src/common.ts";

const chains = ["bitshares", "bitshares_testnet"];

const run = async () => {
  for (const chain of chains) {
    let data;
    try {
      data = await fetchLiquidityPools(chain);
    } catch (err) {
      console.log("Error: " + err.message);
      continue;
    }

    fs.writeFile(
      `./src/data/${chain}/allPools.json`,
      JSON.stringify(data, undefined, 4),
      (err) => {
        if (err) throw err;
        console.log(`${chain} Pools data saved to allPools.json`);
      },
    );

    const assetIds = new Set();
    data.forEach((pool) => {
      assetIds.add(pool.asset_a);
      assetIds.add(pool.asset_b);
      assetIds.add(pool.share_asset);
    });

    let assetData;
    try {
      assetData = await getObjects(chain, Array.from(assetIds));
    } catch (err) {
      console.log(`Error fetching assets for ${chain}: ` + err.message);
      continue;
    }

    const symbolMap = {};
    assetData.forEach((asset) => {
      symbolMap[asset.id] = asset.symbol;
    });

    const filteredPoolData = data.map((pool) => {
      return {
        id: pool.id,
        asset_a_id: pool.asset_a,
        asset_a_symbol: symbolMap[pool.asset_a],
        asset_b_id: pool.asset_b,
        asset_b_symbol: symbolMap[pool.asset_b],
        share_asset_symbol: symbolMap[pool.share_asset],
        share_asset_id: pool.share_asset,
        balance_a: pool.balance_a,
        balance_b: pool.balance_b,
        taker_fee_percent: pool.taker_fee_percent,
        withdrawal_fee_percent: pool.withdrawal_fee_percent,
      };
    });

    fs.writeFile(
      `./src/data/${chain}/pools.json`,
      JSON.stringify(filteredPoolData, undefined, 4),
      (err) => {
        if (err) throw err;
        console.log(`${chain} Pools data saved to pools.json`);
      },
    );

    const minPoolData = data.map((pool) => {
      return {
        id: pool.id.replace("1.19.", ""),
        a: pool.asset_a.replace("1.3.", ""),
        as: symbolMap[pool.asset_a],
        b: pool.asset_b.replace("1.3.", ""),
        bs: symbolMap[pool.asset_b],
        sa: symbolMap[pool.share_asset],
        said: pool.share_asset,
        ba: pool.balance_a,
        bb: pool.balance_b,
        tfp: pool.taker_fee_percent,
      };
    });

    fs.writeFile(
      `./src/data/${chain}/minPools.json`,
      JSON.stringify(minPoolData),
      (err) => {
        if (err) throw err;
        console.log(`${chain} Pools data saved to minPools.json`);
      },
    );
  }
};

run();
