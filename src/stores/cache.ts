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
const $assetCache = map<Asset[]>([]);

/**
 * Function to add an array of assets to the asset cache
 * @param assets The array of assets to add to the cache
 */
function addAssetsToCache(assets: Asset[]) {
  const existingAssets = $assetCache.get();
  const newAssets =
    assets & assets.length
      ? assets.filter((asset) => !existingAssets.some((a) => a.id === asset.id))
      : assets;
  if (newAssets.length > 0) {
    $assetCache.set([...existingAssets, ...newAssets]);
  }
}

/**
 * Declaring the pool cache map nanostore
 */
const $poolCache = map<Pool[]>([]);

/**
 * Function to add an array of pools to the pool cache
 * @param pools The array of pools to add to the cache
 */
function addPoolsToCache(pools: Pool[]) {
  const existingPools = $poolCache.get();
  const newPools =
    existingPools && existingPools.length
      ? pools.filter((pool) => !existingPools.some((p) => p.id === pool.id))
      : pools;
  if (newPools.length > 0) {
    $poolCache.set([...existingPools, ...newPools]);
  }
}

/**
 * Declaring the market search cache map nanostore
 */
const $marketSearchCache = map<MarketSearch[]>([]);

/**
 * Function to add an array of market searches to the market search cache
 * @param marketSearches The array of market searches to add to the cache
 */
function addMarketSearchesToCache(marketSearches: MarketSearch[]) {
  const existingMarketSearches = $marketSearchCache.get();
  const newMarketSearches = marketSearches.filter(
    (ms) => !existingMarketSearches.some((e) => e.id === ms.id)
  );
  if (newMarketSearches.length > 0) {
    $marketSearchCache.set([...existingMarketSearches, ...newMarketSearches]);
  }
}

/**
 * Declaring the global parameters cache nanostore
 */
const $globalParamsCache = map<GlobalParameters | null>(null);

/**
 * Function to set the global parameters in the global parameters cache
 * @param params The global parameters to set in the cache
 */
function setGlobalParams(params: GlobalParameters) {
  $globalParamsCache.set(params);
}

export {
  $assetCache,
  addAssetsToCache,
  $poolCache,
  addPoolsToCache,
  $marketSearchCache,
  addMarketSearchesToCache,
  $globalParamsCache,
  setGlobalParams,
};
