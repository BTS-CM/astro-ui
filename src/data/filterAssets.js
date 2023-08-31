import fs from 'fs';

// Step 1
const pools = JSON.parse(fs.readFileSync('pools.json'));
const assets = [...new Set(pools.flatMap(pool => [pool.asset_a, pool.asset_b]))];

// Step 2
const assetData = JSON.parse(fs.readFileSync('assetData.json'));
const matchingData = assetData
  .filter(data => assets.includes(data.id));

// Step 3
fs.writeFileSync('matchingData.json', JSON.stringify(matchingData));