import { map } from "nanostores";

type Asset = {
  id: string;
  symbol: string;
  precision: number;
  issuer: string;
  market_fee_percent: number;
  max_market_fee: string;
  max_supply: string;
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
  balance_a: string;
  balance_b: number;
  taker_fee_percent: number;
};

type MarketSearch = {
  id: string; // asset id
  s: string; // symbol
  u: string; // identifier
};

type GlobalParameters = {
  id: string;
  parameters: {
    current_fees: {
      parameters: [
        number,
        {
          fee: number;
          price_per_kbyte?: number;
          price_per_output?: number;
          fee_per_day?: number;
          fee_per_kb?: number;
        }
      ][];
      scale: number;
    };
    block_interval: number;
    maintenance_interval: number;
    maintenance_skip_slots: number;
    committee_proposal_review_period: number;
    maximum_transaction_size: number;
    maximum_block_size: number;
    maximum_time_until_expiration: number;
    maximum_proposal_lifetime: number;
    maximum_asset_whitelist_authorities: number;
    maximum_asset_feed_publishers: number;
    maximum_witness_count: number;
    maximum_committee_count: number;
    maximum_authority_membership: number;
    reserve_percent_of_fee: number;
    network_percent_of_fee: number;
    lifetime_referrer_percent_of_fee: number;
    cashback_vesting_period_seconds: number;
    cashback_vesting_threshold: number;
    count_non_member_votes: boolean;
    allow_non_member_whitelists: boolean;
    witness_pay_per_block: number;
    worker_budget_per_day: number;
    max_predicate_opcode: number;
    fee_liquidation_threshold: number;
    accounts_per_fee_scale: number;
    account_fee_scale_bitshifts: number;
    max_authority_depth: number;
    extensions: {
      updatable_htlc_options?: {
        max_timeout_secs: number;
        max_preimage_size: number;
      };
      maker_fee_discount_percent?: number;
    };
  };
  next_available_vote_id: number;
  active_committee_members: string[];
  active_witnesses: string[];
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

// Global Parameters Cache
const $globalParamsCacheBTS = map<GlobalParameters>(undefined);
const $globalParamsCacheTEST = map<GlobalParameters>(undefined);

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
