import btsFeeSchedule from "@/data/bitshares/fees.json";
import bts_offers from "@/data/bitshares/allOffers.json";
import btsPools from "@/data/bitshares/pools.json";
import bts_allPools from "@/data/bitshares/allPools.json";
import btsMinBitassets from "@/data/bitshares/minBitassetData.json";
import bts_allAssets from "@/data/bitshares/allAssets.json";
import bts_minAssets from "@/data/bitshares/minAssets.json";
import bts_allDynamicData from "@/data/bitshares/dynamicData.json";
import bts_assetIssuers from "@/data/bitshares/assetIssuers.json";

import btsMinPools from "@/data/bitshares/minPools.json";
import testMinPools from "@/data/bitshares_testnet/minPools.json";

import testFeeSchedule from "@/data/bitshares_testnet/fees.json";
import test_offers from "@/data/bitshares_testnet/allOffers.json";
import testPools from "@/data/bitshares_testnet/pools.json";
import test_allPools from "@/data/bitshares_testnet/allPools.json";
import testMinBitassets from "@/data/bitshares_testnet/minBitassetData.json";
import test_allAssets from "@/data/bitshares_testnet/allAssets.json";
import test_minAssets from "@/data/bitshares_testnet/minAssets.json";
import test_allDynamicData from "@/data/bitshares_testnet/dynamicData.json";
import test_assetIssuers from "@/data/bitshares_testnet/assetIssuers.json";

const compressMarketData = (assets: any, issuers: any) => {
  return assets.map((asset: any) => {
      const thisIssuer = issuers.find((issuer: any) => issuer.id === asset.issuer);
      const issuerString = `${thisIssuer?.name ?? "???"} (${asset.issuer}) ${
        thisIssuer?.ltm ? "(LTM)" : ""
      }`;
      return {
        id: asset.id,
        s: asset.symbol,
        u: issuerString,
        p: asset.precision,
      };
    });
};

const btsOffers = bts_offers
    .filter((x) => x.enabled === true) // only provide active offers
    .filter((x) => x.fee_rate < 500000); // max fee rate of 50%

const testOffers = test_offers.filter((x) => x.enabled === true);

const btsMarketData = compressMarketData(bts_allAssets, bts_assetIssuers);
const testMarketData = compressMarketData(test_allAssets, test_assetIssuers);

/**
 * Returns all cached assets for one/many blockchain(s)
 */
function getAllAssets() {
    return { bitshares: bts_allAssets, bitshares_testnet: test_allAssets }
}

/**
 * Returns all minimised cached assets for one/many blockchain(s)
 */
function getMinAssets() {
    return { bitshares: bts_minAssets, bitshares_testnet: test_minAssets };
}

/**
 * Retrieves the requested market search data for one/many blockchain(s)
 */
function getMarketSearch() {
    return { bitshares: btsMarketData, bitshares_testnet: testMarketData };
}

/**
 * Retrieves the pool summary data for one/many blockchain(s)
 */
function getPools() {
    return { bitshares: btsPools, bitshares_testnet: testPools }
}

function getMinPools() {
    return { bitshares: btsMinPools, bitshares_testnet: testMinPools };
}

/**
 * Retrieves the minimum bitassets for one/many blockchain(s)
 */
function getMinBitassets() {
    return { bitshares: btsMinBitassets, bitshares_testnet: testMinBitassets };
}

/**
 * Retrieves the active offers for one/many blockchain(s)
 */
function getActiveOffers() {
    return { bitshares: btsOffers, bitshares_testnet: testOffers };
}

/**
 * Retrieves the requested fee schedule for one/many blockchain(s)
 */
function getFeeSchedule() {
    return { bitshares: btsFeeSchedule, bitshares_testnet: testFeeSchedule };
}

/**
 * Retrieves the requested asset from cached assets
 * @param chain
 * @param id
 * @returns Response
 */
function getAsset(chain: string, id: string) {
  let foundAsset;
  if (chain === "bitshares") {
    foundAsset = bts_allAssets.find((asset: any) => asset.id === id || asset.symbol === id);
  } else if (chain === "bitshares_testnet") {
    foundAsset = test_allAssets.find((asset: any) => asset.id === id || asset.symbol === id);
  }

  if (foundAsset) {
    return foundAsset;
  }
}

/**
 * Get the dynamic data of an asset
 * @param chain
 * @param id 2.3.x
 * @returns Response
 */
function getDynamicData(chain: string, id: string) {
  let foundDynamicData;
  if (chain === "bitshares") {
    foundDynamicData = bts_allDynamicData.find((dynamicData: any) => dynamicData.id === id);
  } else if (chain === "bitshares_testnet") {
    foundDynamicData = test_allDynamicData.find((dynamicData: any) => dynamicData.id === id);
  }

  if (!foundDynamicData) {
    throw new Error("Dynamic data not found");
  }

  return foundDynamicData;
}

/**
 * Retrieves the requested pool from cached assets
 * @param chain
 * @param id
 * @returns Response
 */
function getPool(chain: string, id: string) {
  let foundPool;
  if (chain === "bitshares") {
    foundPool = bts_allPools.find((asset: any) => asset.id === id);
  } else if (chain === "bitshares_testnet") {
    foundPool = test_allPools.find((asset: any) => asset.id === id);
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
