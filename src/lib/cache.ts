import { getCollection } from "astro:content";

/**
 * Returns all cached assets for one/many blockchain(s)
 */
async function getAllAssets() {
  const btsAllAssets = await getCollection("btsAllAssets");
  const testAllAssets = await getCollection("testAllAssets");
  return { bitshares: btsAllAssets, bitshares_testnet: testAllAssets };
}

/**
 * Returns all minimised cached assets for one/many blockchain(s)
 */
async function getMinAssets() {
  const btsMinAssets = await getCollection("btsMinAssets");
  const testMinAssets = await getCollection("testMinAssets");
  return { bitshares: btsMinAssets, bitshares_testnet: testMinAssets };
}

/**
 * Retrieves the requested market search data for one/many blockchain(s)
 */
async function getMarketSearch() {
  const btsMarketData = await getCollection("btsMarketData");
  const testMarketData = await getCollection("testMarketData");
  return { bitshares: btsMarketData, bitshares_testnet: testMarketData };
}

/**
 * Retrieves the pool summary data for one/many blockchain(s)
 */
async function getPools() {
  const btsPools = await getCollection("btsPools");
  const testPools = await getCollection("testPools");
  return { bitshares: btsPools, bitshares_testnet: testPools };
}

async function getMinPools() {
  const btsMinPools = await getCollection("btsMinPools");
  const testMinPools = await getCollection("testMinPools");
  return { bitshares: btsMinPools, bitshares_testnet: testMinPools };
}

/**
 * Retrieves the minimum bitassets for one/many blockchain(s)
 */
async function getMinBitassets() {
  const btsMinBitassets = await getCollection("btsMinBitassets");
  const testMinBitassets = await getCollection("testMinBitassets");
  return { bitshares: btsMinBitassets, bitshares_testnet: testMinBitassets };
}

/**
 * Retrieves the active offers for one/many blockchain(s)
 */
async function getActiveOffers() {
  const btsOffers = await getCollection("btsOffers");
  const testOffers = await getCollection("testOffers");
  return { bitshares: btsOffers, bitshares_testnet: testOffers };
}

/**
 * Retrieves the requested fee schedule for one/many blockchain(s)
 */
async function getFeeSchedule() {
  const btsFeeSchedule = await getCollection("btsFeeSchedule");
  const testFeeSchedule = await getCollection("testFeeSchedule");
  return { bitshares: btsFeeSchedule, bitshares_testnet: testFeeSchedule };
}

/**
 * Retrieves the requested asset from cached assets
 */
async function getAsset(chain: string, id: string) {
  let foundAsset;
  if (chain === "bitshares") {
    const btsAllAssets = await getCollection("btsAllAssets");
    foundAsset = btsAllAssets.find(
      (asset: any) => asset.id === id || asset.symbol === id
    );
  } else if (chain === "bitshares_testnet") {
    const testAllAssets = await getCollection("testAllAssets");
    foundAsset = testAllAssets.find(
      (asset: any) => asset.id === id || asset.symbol === id
    );
  }

  if (foundAsset) {
    return foundAsset;
  }
}

/**
 * Get the dynamic data of an asset
 */
async function getDynamicData(chain: string, id: string) {
  let foundDynamicData;
  if (chain === "bitshares") {
    const btsAllDynamicData = await getCollection("btsAllDynamicData");
    foundDynamicData = btsAllDynamicData.find(
      (dynamicData: any) => dynamicData.id === id
    );
  } else if (chain === "bitshares_testnet") {
    const testAllDynamicData = await getCollection("testAllDynamicData");
    foundDynamicData = testAllDynamicData.find(
      (dynamicData: any) => dynamicData.id === id
    );
  }

  if (!foundDynamicData) {
    throw new Error("Dynamic data not found");
  }

  return foundDynamicData;
}

/**
 * Retrieves the requested pool from cached assets
 */
async function getPool(chain: string, id: string) {
  let foundPool;
  if (chain === "bitshares") {
    const btsAllPools = await getCollection("btsAllPools");
    foundPool = btsAllPools.find((asset: any) => asset.id === id);
  } else if (chain === "bitshares_testnet") {
    const testAllPools = await getCollection("testAllPools");
    foundPool = testAllPools.find((asset: any) => asset.id === id);
  }

  if (!foundPool) {
    throw new Error("Pool not found");
  }

  return foundPool;
}

export {
  getFeeSchedule,
  getAsset,
  getPool,
  getDynamicData,
  getMarketSearch,
  getAllAssets,
  getMinAssets,
  getPools,
  getMinPools,
  getMinBitassets,
  getActiveOffers,
};
