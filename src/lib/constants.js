/**
 * Shared numeric / chain constants.
 * Centralizes magic numbers previously scattered across components.
 */

export const GRAPHENE_100_PCT = 10000;
export const GRAPHENE_1_PCT = GRAPHENE_100_PCT / 100;

export const SECS_PER_MINUTE = 60;
export const SECS_PER_HOUR = 3600;
export const SECS_PER_DAY = 86400;
export const MS_PER_SEC = 1000;

export const BTS_CHAIN = "bitshares";
export const TEST_CHAIN = "bitshares-testnet";

// 80% LTM fee rebate applied in several fee dialogs
export const LTM_REBATE_MULTIPLIER = 0.8;

export function chainSymbol(chain) {
  return chain === BTS_CHAIN ? "BTS" : "TEST";
}

export function feePct(feeRate) {
  return (feeRate / GRAPHENE_100_PCT).toFixed(2);
}
