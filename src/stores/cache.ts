import { map } from "nanostores";

type Asset = {
  id: string;
  symbol: string;
  precision: number;
  issuer: string;
  market_fee_percent: number;
  max_market_fee: string;
  max_supply: string;
  prediction_market: boolean;
};

type BitassetData = {
  id: string;
  assetID: string;
  issuer: {
    id: string;
    ltm: boolean;
    name: string;
  };
  feeds: string[];
  collateral: string;
  mcr: number;
  mssr: number;
  icr: number;
};

type Pool = {
  id: string;
  asset_a_id: string;
  asset_a_symbol: string;
  asset_b_id: string;
  asset_b_symbol: string;
  share_asset_symbol: string;
  share_asset_id: string;
  balance_a: string;
  balance_b: number;
  taker_fee_percent: number;
};

type MarketSearch = {
  id: string; // asset id
  s: string; // symbol
  u: string; // identifier
};

/**
 * Declaring the asset cache map nanostore
 */
const $assetCacheBTS = map<Asset[]>([]);
const $assetCacheTEST = map<Asset[]>([]);

function mappedAssets(data: any) {
  return data.map((_asset: any) => {
    return {
      id: `1.3.${_asset.id}`,
      symbol: _asset.s,
      precision: _asset.p,
      issuer: `1.2.${_asset.i}`,
      market_fee_percent: _asset.mfp,
      max_market_fee: _asset.mmf,
      max_supply: _asset.ms,
      prediction_market: _asset.pm || false,
    };
  });
}

/**
 * Function to add an array of assets to the asset cache
 * @param assets The array of assets to add to the cache
 */
function addAssetsToCache(assets: any) {
  const existingBTS = $assetCacheBTS.get();
  if (!existingBTS || !existingBTS.length) {
    $assetCacheBTS.set(mappedAssets(assets.bitshares));
  }

  const existingTEST = $assetCacheTEST.get();
  if (!existingTEST || !existingTEST.length) {
    $assetCacheTEST.set(mappedAssets(assets.bitshares_testnet));
  }
}

// Pool Cache
const $poolCacheBTS = map<Pool[]>([]);
const $poolCacheTEST = map<Pool[]>([]);

function mappedPool(data: any) {
  return data.map((_pool: any) => {
    return {
      id: `1.19.${_pool.id}`,
      asset_a_id: `1.3.${_pool.a}`,
      asset_a_symbol: _pool.as,
      asset_b_id: `1.3.${_pool.b}`,
      asset_b_symbol: _pool.bs,
      share_asset_symbol: _pool.sa,
      share_asset_id: _pool.said,
      balance_a: _pool.ba,
      balance_b: _pool.bb,
      taker_fee_percent: _pool.tfp,
    };
  });
}

function addPoolsToCache(pools: any) {
  const existingBTS = $poolCacheBTS.get();
  if (!existingBTS || !existingBTS.length) {
    // Empty cache to set
    const btsPools = mappedPool(pools.bitshares);
    $poolCacheBTS.set(btsPools);
  }

  const existingTEST = $poolCacheTEST.get();
  if (!existingTEST || !existingTEST.length) {
    const testPools = mappedPool(pools.bitshares_testnet);
    $poolCacheTEST.set(testPools);
  }
}

// Offers Cache
const $offersCacheBTS = map<Pool[]>([]);
const $offersCacheTEST = map<Pool[]>([]);

function addOffersToCache(offers: any) {
  const existingBTS = $offersCacheBTS.get();
  if (!existingBTS || !existingBTS.length) {
    // Empty cache to set
    const btsOffers = offers.bitshares;
    $offersCacheBTS.set(btsOffers);
  }

  const existingTEST = $offersCacheTEST.get();
  if (!existingTEST || !existingTEST.length) {
    const testOffers = offers.bitshares_testnet;
    $offersCacheTEST.set(testOffers);
  }
}

// Market Search Cache
const $marketSearchCacheBTS = map<MarketSearch[]>([]);
const $marketSearchCacheTEST = map<MarketSearch[]>([]);

function addMarketSearchesToCache(marketSearches: any) {
  const existingBTS = $marketSearchCacheBTS.get();
  if (!existingBTS || !existingBTS.length) {
    // Empty cache to set
    $marketSearchCacheBTS.set(marketSearches.bitshares);
  }

  const existingTEST = $marketSearchCacheTEST.get();
  if (!existingTEST || !existingTEST.length) {
    $marketSearchCacheTEST.set(marketSearches.bitshares_testnet);
  }
}

interface FeeData {
  fee: number;
}

type Fees = [number, FeeData][];

// Global Parameters Cache
const $globalParamsCacheBTS = map<Fees>(undefined);
const $globalParamsCacheTEST = map<Fees>(undefined);

function setGlobalParams(params: any) {
  $globalParamsCacheBTS.set(params.bitshares);
  $globalParamsCacheTEST.set(params.bitshares_testnet);
}

// BitAssetData Cache
const $bitAssetDataCacheBTS = map<BitassetData[]>([]);
const $bitAssetDataCacheTEST = map<BitassetData[]>([]);

function setBitassetData(params: any) {
  $bitAssetDataCacheBTS.set(params.bitshares);
  $bitAssetDataCacheTEST.set(params.bitshares_testnet);
}

export {
  $assetCacheBTS,
  $assetCacheTEST,
  addAssetsToCache,
  $poolCacheBTS,
  $poolCacheTEST,
  addPoolsToCache,
  $offersCacheBTS,
  $offersCacheTEST,
  addOffersToCache,
  $marketSearchCacheBTS,
  $marketSearchCacheTEST,
  addMarketSearchesToCache,
  $globalParamsCacheBTS,
  $globalParamsCacheTEST,
  setGlobalParams,
  $bitAssetDataCacheBTS,
  $bitAssetDataCacheTEST,
  setBitassetData,
};
