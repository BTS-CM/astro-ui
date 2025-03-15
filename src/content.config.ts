import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

import bts_assetIssuers from "@/data/bitshares/assetIssuers.json";
import test_assetIssuers from "@/data/bitshares_testnet/assetIssuers.json";


const feeSchema = z.any();

const btsFeeSchedule = defineCollection({
    loader: file("./src/data/bitshares/fees.json", {
        parser: (text) => {
            try {
                const data = JSON.parse(text);
                const preprocessedData = data.map((x: any) => {
                    return {
                        id: x[0],
                        data: x[1]
                    }
                });
                console.log("Successfully parsed and preprocessed fees:", preprocessedData.length);
                return preprocessedData;
            } catch (error) {
                console.error("Error parsing JSON from fees.json:", error);
                throw error;
            }
        }
    }),
    schema: feeSchema
});

const testFeeSchedule = defineCollection({
    loader: file("./src/data/bitshares_testnet/fees.json", {
        parser: (text) => {
            try {
                const data = JSON.parse(text);
                const preprocessedData = data.map((x: any) => {
                    return {
                        id: x[0],
                        data: x[1]
                    }
                });
                console.log("Successfully parsed and preprocessed fees:", preprocessedData.length);
                return preprocessedData;
            } catch (error) {
                console.error("Error parsing JSON from fees.json:", error);
                throw error;
            }
        }
    }),
    schema: feeSchema
});

const offerSchema = z.object({
    id: z.string(),
    owner_account: z.string(),
    asset_type: z.string(),
    total_balance: z.union([z.string(), z.number()]), // Adjusted to accept both string and number
    current_balance: z.union([z.string(), z.number()]), // Adjusted to accept both string and number
    fee_rate: z.number(),
    max_duration_seconds: z.number(),
    min_deal_amount: z.number(),
    enabled: z.boolean(),
    auto_disable_time: z.string(),
    acceptable_collateral: z.array(
        z.tuple([
            z.string(),
            z.object({
                base: z.object({
                    amount: z.number(),
                    asset_id: z.string()
                }),
                quote: z.object({
                    amount: z.number(),
                    asset_id: z.string()
                })
            })
        ])
    ),
    acceptable_borrowers: z.array(z.unknown()),
    owner_name: z.string()
});

const btsOffers = defineCollection({
    loader: file("./src/data/bitshares/allOffers.json", {
        parser: (text) => {
            const offers = JSON.parse(text);
            return offers
                .filter((x) => x.enabled === true)
                .filter((x) => x.fee_rate < 500000); // max fee rate of 50%
        }
    }),
    schema: offerSchema
});

const testOffers = defineCollection({
    loader: file("./src/data/bitshares_testnet/allOffers.json", {
        parser: (text) => {
            const offers = JSON.parse(text);
            return offers.filter((x) => x.enabled === true);
        }
    }),
    schema: offerSchema
});

const poolSchema = z.object({
    id: z.string(),
    asset_a_id: z.string(),
    asset_a_symbol: z.string(),
    asset_b_id: z.string(),
    asset_b_symbol: z.string(),
    share_asset_symbol: z.string(),
    share_asset_id: z.string(),
    balance_a: z.union([z.string(), z.number()]), // Adjusted to accept both string and number
    balance_b: z.union([z.string(), z.number()]), // Adjusted to accept both string and number
    taker_fee_percent: z.number(),
    withdrawal_fee_percent: z.number(),
});

const btsPools = defineCollection({
    loader: file("./src/data/bitshares/pools.json", {
        parser: (text) => {
            try {
                const pools = JSON.parse(text);
                console.log("Successfully parsed pools:", pools.length);
                return pools;
            } catch (error) {
                console.error("Error parsing JSON from pools.json:", error);
                throw error;       
            }
        }
    }),
    schema: poolSchema
});

const testPools = defineCollection({
    loader: file("./src/data/bitshares_testnet/pools.json", {
        parser: (text) => {
            try {
                const pools = JSON.parse(text);
                console.log("Successfully parsed test pools:", pools.length);
                return pools;
            } catch (error) {
                console.error("Error parsing JSON from pools.json:", error);
                throw error;       
            }
        }
    }),
    schema: poolSchema
});

const allPoolSchema = z.object({
    id: z.string(),
    asset_a: z.string(),
    asset_b: z.string(),
    balance_a: z.union([z.string(), z.number()]),
    balance_b: z.union([z.string(), z.number()]),
    share_asset: z.string(),
    taker_fee_percent: z.number(),
    withdrawal_fee_percent: z.number(),
    virtual_value: z.string(),
    statistics: z.object({
        id: z.string(),
        _24h_deposit_count: z.number(),
        _24h_deposit_amount_a: z.string(),
        _24h_deposit_amount_b: z.string(),
        _24h_deposit_share_amount: z.string(),
        _24h_withdrawal_count: z.number(),
        _24h_withdrawal_amount_a: z.string(),
        _24h_withdrawal_amount_b: z.string(),
        _24h_withdrawal_share_amount: z.string(),
        _24h_withdrawal_fee_a: z.string(),
        _24h_withdrawal_fee_b: z.string(),
        _24h_exchange_a2b_count: z.number(),
        _24h_exchange_a2b_amount_a: z.string(),
        _24h_exchange_a2b_amount_b: z.string(),
        _24h_exchange_b2a_count: z.number(),
        _24h_exchange_b2a_amount_a: z.string(),
        _24h_exchange_b2a_amount_b: z.string(),
        _24h_exchange_fee_a: z.string(),
        _24h_exchange_fee_b: z.string(),
        _24h_balance_delta_a: z.union([z.number(), z.string()]),
        _24h_balance_delta_b: z.union([z.number(), z.string()]),
        total_deposit_count: z.number(),
        total_deposit_amount_a: z.string(),
        total_deposit_amount_b: z.string(),
        total_deposit_share_amount: z.string(),
        total_withdrawal_count: z.number(),
        total_withdrawal_amount_a: z.string(),
        total_withdrawal_amount_b: z.string(),
        total_withdrawal_share_amount: z.string(),
        total_withdrawal_fee_a: z.string(),
        total_withdrawal_fee_b: z.string(),
        total_exchange_a2b_count: z.number(),
        total_exchange_a2b_amount_a: z.string(),
        total_exchange_a2b_amount_b: z.string(),
        total_exchange_b2a_count: z.number(),
        total_exchange_b2a_amount_a: z.string(),
        total_exchange_b2a_amount_b: z.string(),
        total_exchange_fee_a: z.string(),
        total_exchange_fee_b: z.string()
    }),
    details: z.object({
        asset_a: z.object({
            symbol: z.string(),
            float: z.number()
        }),
        asset_b: z.object({
            symbol: z.string(),
            float: z.number()
        }),
        share_asset: z.object({
            symbol: z.string(),
            float: z.number(),
            holders: z.number(),
            value: z.object({
                total_withdraw_value_in_core: z.union([z.null(), z.number()]),
                withdraw_value_a: z.union([z.null(), z.number()]),
                withdraw_value_b: z.union([z.null(), z.number()]),
                market_value_in_core: z.number()
            }),
            warnings: z.object({
                may_use_override_transfer: z.boolean(),
                may_whitelist: z.boolean()
            })
        }),
        price_sell_a_per_percent: z.object({
            "1": z.number(),
            "5": z.number(),
            "10": z.number(),
            unit: z.string()
        }),
        price_sell_b_per_percent: z.object({
            "1": z.number(),
            "5": z.number(),
            "10": z.number(),
            unit: z.string()
        }),
        value_in_core: z.number(),
        ticker: z.object({
            volume_a_24h: z.number(),
            volume_b_24h: z.number(),
            delta_a_24h: z.number(),
            delta_b_24h: z.number(),
            apy_24h_in_core: z.union([z.null(), z.number()]),
            apy_in_core: z.union([z.null(), z.number()]),
            total_volume_24h_in_core: z.number()
        }),
        activity: z.number(),
        score: z.number()
    })
});

const btsAllPools = defineCollection({
    loader: file("./src/data/bitshares/allPools.json"),
    schema: allPoolSchema
});

const testAllPools = defineCollection({
    loader: file("./src/data/bitshares_testnet/allPools.json"),
    schema: allPoolSchema
});

const minBitassetSchema = z.object({
    id: z.string(),
    assetID: z.string(),
    issuer: z.object({
        id: z.string(),
        ltm: z.boolean(),
        name: z.string()
    }),
    feeds: z.array(z.unknown()), // Assuming feeds is an array of unknown objects
    collateral: z.string(),
    mcr: z.number(),
    mssr: z.number(),
    icr: z.number()
});

const btsMinBitassets = defineCollection({
    loader: file("./src/data/bitshares/minBitassetData.json"),
    schema: minBitassetSchema
});

const testMinBitassets = defineCollection({
    loader: file("./src/data/bitshares_testnet/minBitassetData.json"),
    schema: minBitassetSchema
});

const assetSchema = z.object({
    id: z.string(),
    symbol: z.string(),
    precision: z.number(),
    issuer: z.string(),
    market_fee_percent: z.number(),
    max_market_fee: z.union([z.number(), z.string()]),
    max_supply: z.union([z.number(), z.string()]),
    bitasset_data_id: z.string().optional()
});

const btsAllAssets = defineCollection({
    loader: file("./src/data/bitshares/allAssets.json", {
        parser: (text) => {
            try {
                const assets = JSON.parse(text);
                console.log("Successfully parsed assets:", assets.length);
                return assets;
            } catch (error) {
                console.error("Error parsing JSON from allAssets.json:", error);
                throw error;
            }
        }
    }),
    schema: assetSchema
});

const testAllAssets = defineCollection({
    loader: file("./src/data/bitshares_testnet/allAssets.json", {
        parser: (text) => {
            try {
                const assets = JSON.parse(text);
                console.log("Successfully parsed assets:", assets.length);
                return assets;
            } catch (error) {
                console.error("Error parsing JSON from allAssets.json:", error);
                throw error;
            }
        }
    }),
    schema: assetSchema
});

const marketDataSchema = z.object({
    id: z.string(),
    s: z.string(),
    u: z.string(),
    p: z.number()
});

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

const btsMarketData = defineCollection({
    loader: file("./src/data/bitshares/allAssets.json", {
        parser: (text) => {
            try {
                const assets = JSON.parse(text);
                console.log("Successfully parsed assets for btsMarketData:", assets.length);
                return compressMarketData(assets, bts_assetIssuers);
            } catch (error) {
                console.error("Error parsing JSON from allAssets.json for btsMarketData:", error);
                throw error;
            }
        }
    }),
    schema: marketDataSchema
});

const testMarketData = defineCollection({
    loader: file("./src/data/bitshares_testnet/allAssets.json", {
        parser: (text) => {
            try {
                const assets = JSON.parse(text);
                console.log("Successfully parsed assets for testMarketData:", assets.length);
                return compressMarketData(assets, test_assetIssuers);
            } catch (error) {
                console.error("Error parsing JSON from allAssets.json for testMarketData:", error);
                throw error;
            }
        }
    }),
    schema: marketDataSchema
});

const minAssetSchema = z.object({
    id: z.string(),
    s: z.string(),
    p: z.number(),
    i: z.string(),
    mfp: z.number(),
    mmf: z.union([z.number(), z.string()]),
    ms: z.union([z.number(), z.string()]),
    bdi: z.string().optional()
});

const btsMinAssets = defineCollection({
    loader: file("./src/data/bitshares/minAssets.json"),
    schema: minAssetSchema
});

const testMinAssets = defineCollection({
    loader: file("./src/data/bitshares_testnet/minAssets.json"),
    schema: minAssetSchema
});

const dynamicDataSchema = z.object({
    id: z.string(),
    current_supply: z.union([z.number(), z.string()]),
    confidential_supply: z.union([z.number(), z.string()]),
    accumulated_fees: z.union([z.number(), z.string()]),
    accumulated_collateral_fees: z.union([z.number(), z.string()]),
    fee_pool: z.union([z.number(), z.string()])
});

const btsAllDynamicData = defineCollection({
    loader: file("./src/data/bitshares/dynamicData.json"),
    schema: dynamicDataSchema
});

const testAllDynamicData = defineCollection({
    loader: file("./src/data/bitshares_testnet/dynamicData.json"),
    schema: dynamicDataSchema
});

const assetIssuerSchema = z.object({
    id: z.string(),
    ltm: z.boolean(),
    name: z.string()
});

const btsAssetIssuers = defineCollection({
    loader: file("./src/data/bitshares/assetIssuers.json"),
    schema: assetIssuerSchema
});

const testAssetIssuers = defineCollection({
    loader: file("./src/data/bitshares_testnet/assetIssuers.json"),
    schema: assetIssuerSchema
});

const minPoolSchema = z.object({
    id: z.string(),
    a: z.string(),
    as: z.string(),
    b: z.string(),
    bs: z.string(),
    sa: z.string(),
    said: z.string(),
    ba: z.union([z.string(), z.number()]), // todo: clean up ETL scripts
    bb: z.union([z.string(), z.number()]), // todo: clean up ETL scripts
    tfp: z.number()
});

const btsMinPools = defineCollection({
    loader: file("./src/data/bitshares/minPools.json"),
    schema: minPoolSchema
});

const testMinPools = defineCollection({
    loader: file("./src/data/bitshares_testnet/minPools.json"),
    schema: minPoolSchema
});

export const collections = {
    btsFeeSchedule,
    testFeeSchedule,
    btsOffers,
    testOffers,
    btsPools,
    testPools,
    btsAllPools,
    testAllPools,
    btsMinBitassets,
    testMinBitassets,
    btsAllAssets,
    testAllAssets,
    btsMarketData,
    testMarketData,
    btsMinAssets,
    testMinAssets,
    btsAllDynamicData,
    testAllDynamicData,
    btsAssetIssuers,
    testAssetIssuers,
    btsMinPools,
    testMinPools
};