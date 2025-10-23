import { Apis } from "bitsharesjs-ws";
import { TransactionBuilder } from "bitsharesjs";
import beautify from "./beautify.js";

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

/**
 * Splits an array into smaller arrays of a specified size.
 * @param {Array} input - The array to split.
 * @param {number} size - The size of each chunk.
 * @returns {Array} An array of smaller arrays, each of size 'size'.
 */
const chunk = (input, size) => {
  return input.reduce((arr, item, idx) => {
    return idx % size === 0
      ? [...arr, [item]]
      : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
  }, []);
};

const operationTypes = [
  {
    id: 0,
    from: "",
    method: "transfer",
  },
  {
    id: 1,
    from: "seller",
    method: "limit_order_create",
  },
  {
    id: 2,
    from: "fee_paying_account",
    method: "limit_order_cancel",
  },
  {
    id: 3,
    from: "funding_account",
    method: "call_order_update",
  },
  {
    id: 5,
    from: "registrar",
    method: "account_create",
  },
  {
    id: 6,
    from: "account",
    method: "account_update",
  },
  {
    id: 7,
    from: "authorizing_account",
    method: "account_whitelist",
  },
  {
    id: 8,
    from: "account_to_upgrade",
    method: "account_upgrade",
  },
  {
    id: 9,
    from: "account_id",
    method: "account_transfer",
  },
  {
    id: 10,
    from: "issuer",
    method: "asset_create",
  },
  {
    id: 11,
    from: "issuer",
    method: "asset_update",
  },
  {
    id: 12,
    from: "issuer",
    method: "asset_update_bitasset",
  },
  {
    id: 13,
    from: "issuer",
    method: "asset_update_feed_producers",
  },
  {
    id: 14,
    from: "issuer",
    method: "asset_issue",
  },
  {
    id: 15,
    from: "payer",
    method: "asset_reserve",
  },
  {
    id: 16,
    from: "from_account",
    method: "asset_fund_fee_pool",
  },
  {
    id: 17,
    from: "account",
    method: "asset_settle",
  },
  {
    id: 18,
    from: "issuer",
    method: "asset_global_settle",
  },
  {
    id: 19,
    from: "publisher",
    method: "asset_publish_feed",
  },
  {
    id: 20,
    from: "witness_account",
    method: "witness_create",
  },
  {
    id: 21,
    from: "witness_account",
    method: "witness_update",
  },
  {
    id: 22,
    from: "fee_paying_account",
    method: "proposal_create",
  },
  {
    id: 23,
    from: "fee_paying_account",
    method: "proposal_update",
  },
  {
    id: 24,
    from: "fee_paying_account",
    method: "proposal_delete",
  },
  {
    id: 25,
    from: "withdraw_from_account",
    method: "withdraw_permission_create",
  },
  {
    id: 26,
    from: "withdraw_from_account",
    method: "withdraw_permission_update",
  },
  {
    id: 27,
    from: "withdraw_from_account",
    method: "withdraw_permission_claim",
  },
  {
    id: 28,
    from: "withdraw_from_account",
    method: "withdraw_permission_delete",
  },
  {
    id: 29,
    from: "committee_member_account",
    method: "committee_member_create",
  },
  {
    id: 30,
    from: "",
    method: "committee_member_update",
  },
  {
    id: 31,
    from: "committee_member_account",
    method: "committee_member_update_global_parameters",
  },
  {
    id: 32,
    from: "",
    method: "vesting_balance_create",
  },
  {
    id: 33,
    from: "owner",
    method: "vesting_balance_withdraw",
  },
  {
    id: 34,
    from: "owner",
    method: "worker_create",
  },
  {
    id: 35,
    from: "payer",
    method: "custom",
  },
  {
    id: 36,
    from: "fee_paying_account",
    method: "assert",
  },
  {
    id: 37,
    from: "deposit_to_account",
    method: "balance_claim",
  },
  {
    id: 38,
    from: "from",
    method: "override_transfer",
  },
  {
    id: 39,
    from: "from",
    method: "transfer_to_blind",
  },
  {
    id: 40,
    from: "",
    method: "blind_transfer",
  },
  {
    id: 41,
    from: "",
    method: "transfer_from_blind",
  },
  {
    id: 43,
    from: "issuer",
    method: "asset_claim_fees",
  },
  {
    id: 45,
    from: "bidder",
    method: "bid_collateral",
  },
  {
    id: 47,
    from: "issuer",
    method: "asset_claim_pool",
  },
  {
    id: 48,
    from: "issuer",
    method: "asset_update_issuer",
  },
  {
    id: 49,
    from: "from",
    method: "htlc_create",
  },
  {
    id: 50,
    from: "redeemer",
    method: "htlc_redeem",
  },
  {
    id: 52,
    from: "update_issuer",
    method: "htlc_extend",
  },
  {
    id: 54,
    from: "account",
    method: "custom_authority_create",
  },
  {
    id: 55,
    from: "account",
    method: "custom_authority_update",
  },
  {
    id: 56,
    from: "account",
    method: "custom_authority_delete",
  },
  {
    id: 57,
    from: "account",
    method: "ticket_create",
  },
  {
    id: 58,
    from: "account",
    method: "ticket_update",
  },
  {
    id: 59,
    from: "account",
    method: "liquidity_pool_create",
  },
  {
    id: 60,
    from: "account",
    method: "liquidity_pool_delete",
  },
  {
    id: 61,
    from: "account",
    method: "liquidity_pool_deposit",
  },
  {
    id: 62,
    from: "account",
    method: "liquidity_pool_withdraw",
  },
  {
    id: 63,
    from: "account",
    method: "liquidity_pool_exchange",
  },
  {
    id: 64,
    from: "owner_account",
    method: "samet_fund_create",
  },
  {
    id: 65,
    from: "owner_account",
    method: "samet_fund_delete",
  },
  {
    id: 66,
    from: "owner_account",
    method: "samet_fund_update",
  },
  {
    id: 67,
    from: "borrower",
    method: "samet_fund_borrow",
  },
  {
    id: 68,
    from: "account",
    method: "samt_fund_repay",
  },
  {
    id: 69,
    from: "owner_account",
    method: "credit_offer_create",
  },
  {
    id: 70,
    from: "owner_account",
    method: "credit_offer_delete",
  },
  {
    id: 71,
    from: "owner_account",
    method: "credit_offer_update",
  },
  {
    id: 72,
    from: "borrower",
    method: "credit_offer_accept",
  },
  {
    id: 73,
    from: "account",
    method: "credit_deal_repay",
  },
  {
    id: 75,
    from: "account",
    method: "liquidity_pool_update_operation",
  },
  {
    id: 76,
    from: "account",
    method: "credit_deal_update_operation",
  },
  {
    id: 77,
    from: "seller",
    method: "limit_order_update_operation",
  },
];

/**
 * Given an array of account IDs, retrieve their account names
 * @param {Array} accountIDs
 * @param {Object}
 */
function _getMultipleAccountNames(accountIDs) {
  return new Promise((resolve, reject) => {
    this.ensureConnection()
      .then(() => {
        if (!accountIDs) {
          resolve([]);
          return;
        }

        Apis.instance()
          .db_api()
          .exec("get_objects", [accountIDs, false])
          .then((results) => {
            if (results && results.length) {
              const filteredResults = results.filter(
                (result) => result !== null
              );
              resolve(filteredResults);
              return;
            }
          })
          .catch((error) => {
            console.error("Error fetching account details:", error);
            reject(error);
          });
      })
      .catch(reject);
  });
}

/*
 * Retrieve multiple asset objects from an array of asset IDs
 * @param {Array} assetIDs
 * @returns {Object}
 */
function _resolveMultipleAssets(assetIDs) {
  let timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      console.log("timed out");
      resolve(null);
    }, 3000);
  });

  let timeLimitedPromise = new Promise(async (resolve, reject) => {
    this.ensureConnection()
      .then(() => {
        Apis.instance()
          .db_api()
          .exec("lookup_asset_symbols", [assetIDs])
          .then((asset_objects) => {
            if (asset_objects && asset_objects.length) {
              resolve(asset_objects);
            }
          })
          .catch((error) => {
            console.log(error);
            reject(error);
          });
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });

  const fastestPromise = Promise.race([
    timeLimitedPromise,
    timeoutPromise,
  ]).catch((error) => {
    return null;
  });

  return fastestPromise;
}

/*
 * Parse incoming and return a readied transaction builder instance
 * @param {Class||Object} incoming
 * @returns {Class} TransactionBuilder
 */
async function _parseTransactionBuilder(incoming) {
  if (incoming instanceof TransactionBuilder) {
    return incoming;
  } else if (
    typeof incoming == "object" &&
    incoming.length > 1 &&
    (incoming[0] == "signAndBroadcast" ||
      incoming[0] == "sign" ||
      incoming[0] == "broadcast")
  ) {
    if (incoming.length <= 3) {
      const _incoming = JSON.parse(incoming[1]);
      const tr = new TransactionBuilder(_incoming);

      return tr;
    }
  } else if (typeof incoming == "object" && incoming.operations) {
    let tr = new TransactionBuilder(incoming);
    return tr;
  } else if (incoming.type) {
    let tr = new TransactionBuilder();
    tr.add_type_operation(incoming.type, incoming.data);
    return tr;
  }
  throw "Reconstruction of TransactionBuilder failed";
}

/*
 * Returns a visualization for the input data.
 * @param {String||Class||Object} thing
 * @returns {String}
 */
async function visualize(thing) {
  let tr;
  try {
    tr = await _parseTransactionBuilder(thing);
  } catch (error) {
    console.log(error);
    return;
  }

  // iterate over to get the operations
  // summarize the details we need to query from the blockchain
  // try to reduce duplicate calls
  let accountsToFetch = [];
  let assetsToFetch = [];
  for (let i = 0; i < tr.operations.length; i++) {
    let operation = tr.operations[i];
    const op = operation[1];
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
    ];

    for (let k = 0; k < idKeys.length; k++) {
      const id = get(op, idKeys[k]);
      if (id && typeof id === "string" && !accountsToFetch.includes(id)) {
        accountsToFetch.push(id);
      }
    }

    for (let z = 0; z < assetKeys.length; z++) {
      const id = get(op, assetKeys[z]);
      if (id && !assetsToFetch.includes(id)) {
        assetsToFetch.push(id);
      }
    }
  }

  let accountResults = [];
  let accountBatches = chunk(accountsToFetch, 100);
  for (let i = 0; i < accountBatches.length; i++) {
    let fetchedAccountNames;
    try {
      fetchedAccountNames = await _getMultipleAccountNames(accountBatches[i]);
    } catch (error) {
      console.log(error);
    }

    if (fetchedAccountNames && fetchedAccountNames.length) {
      let finalNames = fetchedAccountNames.map((user) => {
        return { id: user.id, accountName: user.name };
      });

      accountResults.push(...finalNames);
    }
  }

  let assetResults = [];
  let assetBatches = chunk(assetsToFetch, this._isTestnet() ? 9 : 49);
  for (let i = 0; i < assetBatches.length; i++) {
    let fetchedAssets;
    try {
      fetchedAssets = await _resolveMultipleAssets(assetBatches[i]);
    } catch (error) {
      console.log(error);
    }

    if (fetchedAssets && fetchedAssets.length) {
      assetResults.push(...fetchedAssets);
    }
  }

  let beautifiedOpPromises = [];
  for (let i = 0; i < tr.operations.length; i++) {
    let operationArray = tr.operations[i]; // extract operation i from transaction
    const opType = operationArray[0]; // type id
    const opContents = operationArray[1]; // operation object

    let relevantOperationType = operationTypes.find((op) => op.id === opType);
    beautifiedOpPromises.push(
      beautify(
        accountResults, // fetched accounts
        assetResults, // fetched assets
        opContents,
        operationArray,
        opType,
        relevantOperationType
      )
    );
  }

  return Promise.all(beautifiedOpPromises)
    .then((operations) => {
      if (
        operations.some(
          (op) => !Object.prototype.hasOwnProperty.call(op, "rows")
        )
      ) {
        throw new Error("There's an issue with the format of an operation!");
      }
      return operations;
    })
    .catch((error) => {
      console.log(error);
    });
}
