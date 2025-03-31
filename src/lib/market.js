import { BigNumber } from "bignumber.js";
import { blockchainFloat } from "@/lib/common.js";

function limitByPrecision(value, p = 8) {
  let valueString = value.toString();
  let splitString = valueString.split(".");
  if (
    splitString.length === 1 ||
    (splitString.length === 2 && splitString[1].length <= p)
  ) {
    return parseFloat(valueString);
  } else {
    return parseFloat(splitString[0] + "." + splitString[1].substr(0, p));
  }
}

function toSats(amount, precision) {
  // Return the full integer amount in 'satoshis'
  // Round to prevent floating point math errors
  return Math.round(blockchainFloat(amount, precision));
}

/**
 * In order to make large numbers work properly, we assume numbers
 * larger than 100k do not need more than 5 decimals. Without this we
 * quickly encounter JavaScript floating point errors for large numbers.
 */
function evaluateTradingPair(real, base, basePrecision, quote, quotePrecision) {
  if (real && typeof real === "number") {
    let baseSats = toSats(base, basePrecision);
    let quoteSats = toSats(quote, quotePrecision);

    let numRatio = baseSats / quoteSats;
    let denRatio = quoteSats / baseSats;

    if (baseSats >= quoteSats) {
      denRatio = 1;
    } else {
      numRatio = 1;
    }

    /*
    if (real > 100000) {
      real = limitByPrecision(real, basePrecision);
    }

    if (real < 0.01) {
      real = limitByPrecision(real, basePrecision);
    }
    */

    real = limitByPrecision(real, basePrecision);

    let frac = new BigNumber(real.toString()).toFraction();

    return {
      base: frac[0] * numRatio,
      quote: frac[1] * denRatio,
    };
  } else if (real === 0) {
    return {
      base: 0,
      quote: 0,
    };
  }
}

export { limitByPrecision, toSats, evaluateTradingPair };
