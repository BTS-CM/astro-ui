/**
 * Returns the value of a nested property within an object, given a string path.
 * @param {Object} obj - The object to search for the property.
 * @param {string} path - The string path of the property to retrieve.
 * @param {*} defaultValue - The default value to return if the property is not found.
 * @returns {*} The value of the property, or the default value if the property is not found.
 */
const get = (obj, path, defaultValue = undefined) => {
  const result = path
    .split(".")
    .reduce(
      (res, key) => (res !== null && res !== undefined ? res[key] : res),
      obj
    );
  return result !== undefined && result !== obj ? result : defaultValue;
};

/*
 * Returns a visualization for the input data.
 * @param {Object} operation
 * @returns {String}
 */
async function extractObjects(operationObject) {
  let accountsToFetch = [];
  let assetsToFetch = [];

  const idKeys = [
    "account_id_type",
    "from",
    "from_account",
    "to",
    "witness_account",
    "fee_paying_account",
    "funding_account",
    "seller",
    "registrar",
    "referrer",
    "account",
    "authorizing_account",
    "account_to_list",
    "account_to_upgrade",
    "account_id",
    "issuer",
    "issue_to_account",
    "payer",
    "publisher",
    "fee_paying_account",
    "authorized_account",
    "withdraw_from_account",
    "withdraw_to_account",
    "committee_member_account",
    "creator",
    "owner",
    "owner_account",
    "new_owner",
    "deposit_to_account",
    "bidder",
    "new_issuer",
    "redeemer",
    "update_issuer",
    "borrower",
    "original_htlc_recipient", // htlc_refund (53)
    "offer_owner", // credit_deal_expired (74)
  ];

  const assetKeys = [
    "amount.asset_id",
    "min_to_receive.asset_id",
    "amount_to_sell.asset_id",
    "delta_collateral.asset_id",
    "delta_debt.asset_id",
    "asset_to_update",
    "new_options.short_backing_asset",
    "asset_to_issue.asset_id",
    "asset_to_reserve.asset_id",
    "asset_id",
    "asset_to_settle",
    "settle_price.base.asset_id",
    "settle_price.quote.asset_id",
    "withdrawal_limit.asset_id",
    "asset_to_withdraw.asset_id",
    "amount_to_claim.asset_id",
    "additional_collateral.asset_id",
    "debtCovered.asset_id",
    "amount_for_new_target.asset_id",
    "asset_a",
    "asset_b",
    "share_asset",
    "amount_a.asset_id",
    "amount_b.asset_id",
    "share_amount.asset_id",
    "delta_amount.asset_id",
    "borrow_amount.asset_id",
    "repay_amount.asset_id",
    "fund_fee.asset_id",
    "collateral.asset_id",
    "credit_fee.asset_id",
    "delta_amount_to_sell.asset_id",
    "fee.asset_id",
    "pays.asset_id", // fill_order
    "receives.asset_id", // fill_order
    "fill_price.base.asset_id", // fill_order
    "fill_price.quote.asset_id", // fill_order
    "debt.asset_id", // execute_bid (46)
    "htlc_amount.asset_id", // htlc_refund (53)
    "unpaid_amount.asset_id", // credit_deal_expired (74)
  ];

  for (let k = 0; k < idKeys.length; k++) {
    const id = get(operationObject, idKeys[k]);
    if (id && typeof id === "string" && !accountsToFetch.includes(id)) {
      accountsToFetch.push(id);
    }
  }

  for (let z = 0; z < assetKeys.length; z++) {
    const id = get(operationObject, assetKeys[z]);
    if (id && !assetsToFetch.includes(id)) {
      assetsToFetch.push(id);
    }
  }

  return { accountsToFetch, assetsToFetch };
}

export { extractObjects };
