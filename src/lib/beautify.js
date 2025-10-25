import { humanReadableFloat } from "@/lib/common";

function formatAsset(satoshis, symbol, precision = null, addSymbol = true) {
  if (precision == null) {
    precision = lookupPrecision[symbol];
  }
  if (!addSymbol) {
    symbol = "";
  } else {
    symbol = " " + symbol;
  }
  if (!precision) {
    return satoshis + "sat of" + symbol;
  } else {
    return humanReadableFloat(satoshis, precision).toFixed(precision) + symbol;
  }
}

const permission_flags = {
  charge_market_fee: 0x01 /**< an issuer-specified percentage of all market trades in this asset is paid to the issuer */,
  white_list: 0x02 /**< accounts must be whitelisted in order to hold this asset */,
  override_authority: 0x04 /**< issuer may transfer asset back to himself */,
  transfer_restricted: 0x08 /**< require the issuer to be one party to every transfer */,
  disable_force_settle: 0x10 /**< disable force settling */,
  global_settle: 0x20 /**< allow the bitasset issuer to force a global settling -- this may be set in permissions, but not flags */,
  disable_confidential: 0x40 /**< allow the asset to be used with confidential transactions */,
  witness_fed_asset: 0x80 /**< allow the asset to be fed by witnesses */,
  committee_fed_asset: 0x100 /**< allow the asset to be fed by the committee */,
  lock_max_supply: 0x200, ///< the max supply of the asset can not be updated
  disable_new_supply: 0x400, ///< unable to create new supply for the asset
  disable_mcr_update: 0x800, ///< the bitasset owner can not update MCR, permission only
  disable_icr_update: 0x1000, ///< the bitasset owner can not update ICR, permission only
  disable_mssr_update: 0x2000, ///< the bitasset owner can not update MSSR, permission only
  disable_bsrm_update: 0x4000, ///< the bitasset owner can not update BSRM, permission only
  disable_collateral_bidding: 0x8000, ///< Can not bid collateral after a global settlement
};

const uia_permission_mask = [
  "charge_market_fee",
  "white_list",
  "override_authority",
  "transfer_restricted",
  "disable_confidential",
];

/**
 *
 * @param {String} mask
 * @param {Boolean} isBitAsset
 * @returns Object
 */
function getFlagBooleans(mask, isBitAsset = false) {
  let booleans = {
    charge_market_fee: false,
    white_list: false,
    override_authority: false,
    transfer_restricted: false,
    disable_force_settle: false,
    global_settle: false,
    disable_confidential: false,
    witness_fed_asset: false,
    committee_fed_asset: false,
    lock_max_supply: false,
    disable_new_supply: false,
    disable_mcr_update: false,
    disable_icr_update: false,
    disable_mssr_update: false,
    disable_bsrm_update: false,
    disable_collateral_bidding: false,
  };

  if (mask === "all") {
    for (let flag in booleans) {
      if (!isBitAsset && uia_permission_mask.indexOf(flag) === -1) {
        delete booleans[flag];
      } else {
        booleans[flag] = true;
      }
    }
    return booleans;
  }

  for (let flag in booleans) {
    if (!isBitAsset && uia_permission_mask.indexOf(flag) === -1) {
      delete booleans[flag];
    } else {
      if (mask & permission_flags[flag]) {
        booleans[flag] = true;
      }
    }
  }

  return booleans;
}

/**
 *
 * @param {Array} accountResults
 * @param {Array} assetResults
 * @param {Object} operationObject
 * @param {Number} operationType
 * @returns
 */
export default async function beautify(
  accountResults, // fetched accounts
  assetResults, // fetched assets
  operationObject,
  operationType
) {
  if (operationType == 0) {
    // transfer
    let from = accountResults.find(
      (resAcc) => resAcc.id === operationObject.from
    );
    let to = accountResults.find((resAcc) => resAcc.id === operationObject.to);

    let amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      amount = operationObject.amount_;
    } else {
      amount = operationObject.amount;
    }

    let asset = assetResults.find((assRes) => assRes.id === amount.asset_id);

    if (from && to && asset) {
      return [
        {
          key: "from",
          params: { from: from.name, opFrom: operationObject.from },
        },
        {
          key: "to",
          params: { to: to.name, opTo: operationObject.to },
        },
        {
          key: "amount",
          params: {
            amount: formatAsset(amount.amount, asset.symbol, asset.precision),
          },
        },
      ];
    }
  } else if (operationType == 1) {
    // limit_order_create
    let seller = accountResults.find(
      (resAcc) => resAcc.id === operationObject.seller
    ).name;
    let buy = assetResults.find(
      (assRes) => assRes.id === operationObject.min_to_receive.asset_id
    );
    let sell = assetResults.find(
      (assRes) => assRes.id === operationObject.amount_to_sell.asset_id
    );

    if (seller && buy && sell) {
      let fillOrKill = operationObject.amount_to_sell.fill_or_kill;

      let price =
        humanReadableFloat(
          operationObject.amount_to_sell.amount,
          sell.precision
        ) /
        humanReadableFloat(
          operationObject.min_to_receive.amount,
          buy.precision
        );

      return [
        { key: fillOrKill ? "tradeFK" : "trade" },
        {
          key: "seller",
          params: { seller: seller, opSeller: operationObject.seller },
        },
        {
          key: "selling",
          params: {
            amount: formatAsset(
              operationObject.amount_to_sell.amount,
              sell.symbol,
              sell.precision
            ),
          },
        },
        {
          key: "buying",
          params: {
            amount: formatAsset(
              operationObject.min_to_receive.amount,
              buy.symbol,
              buy.precision
            ),
          },
        },
        {
          key: "price",
          params: {
            price:
              sell.precision > 0
                ? price.toPrecision(sell.precision)
                : parseInt(price),
            sellSymbol: sell.symbol,
            buySymbol: buy.symbol,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 2) {
    // limit_order_cancel
    let feePayingAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.fee_paying_account
    ).name;

    if (feePayingAccount) {
      return [
        { key: "id", params: { id: operationObject.order } },
        {
          key: "account",
          params: {
            account:
              feePayingAccount ??
              "" + " (" + operationObject.fee_paying_account + ")",
          },
        },
      ];
    }
  } else if (operationType == 3) {
    // call_order_update
    let fundingAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.funding_account
    ).name;
    let deltaCollateral = assetResults.find(
      (assRes) => assRes.id === operationObject.delta_collateral.asset_id
    );
    let deltaDebt = assetResults.find(
      (assRes) => assRes.id === operationObject.delta_debt.asset_id
    );

    if (fundingAccount && deltaCollateral && deltaDebt) {
      return [
        {
          key: "funding_account",
          params: {
            funding_account:
              fundingAccount ??
              "" + " (" + operationObject.funding_account + ")",
          },
        },
        {
          key: "delta_collateral",
          params: {
            delta_collateral: formatAsset(
              operationObject.delta_collateral.amount,
              deltaCollateral.symbol,
              deltaCollateral.precision
            ),
            id: operationObject.delta_collateral.asset_id,
          },
        },
        {
          key: "delta_debt",
          params: {
            delta_debt: formatAsset(
              operationObject.delta_debt.amount,
              deltaDebt.symbol,
              deltaDebt.precision
            ),
            id: operationObject.delta_debt.asset_id,
          },
        },
      ];
    }
  } else if (operationType == 4) {
    // Virtual
    // fill_order_operation
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account_id
    )?.name;

    let paysAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.pays.asset_id
    );
    let receivesAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.receives.asset_id
    );

    let baseAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.fill_price.base.asset_id
    );
    let quoteAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.fill_price.quote.asset_id
    );

    if (account && paysAsset && receivesAsset && baseAsset && quoteAsset) {
      const price =
        humanReadableFloat(
          operationObject.fill_price.base.amount,
          baseAsset.precision
        ) /
        humanReadableFloat(
          operationObject.fill_price.quote.amount,
          quoteAsset.precision
        );

      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account_id },
        },
        { key: "order_id", params: { order_id: operationObject.order_id } },
        {
          key: "pays",
          params: {
            pays: formatAsset(
              operationObject.pays.amount,
              paysAsset.symbol,
              paysAsset.precision
            ),
            paysOP: operationObject.pays.asset_id,
          },
        },
        {
          key: "receives",
          params: {
            receives: formatAsset(
              operationObject.receives.amount,
              receivesAsset.symbol,
              receivesAsset.precision
            ),
            receivesOP: operationObject.receives.asset_id,
          },
        },
        {
          key: "price",
          params: {
            price: price,
            base_symbol: baseAsset.symbol,
            quote_symbol: quoteAsset.symbol,
          },
        },
        { key: "is_maker", params: { is_maker: operationObject.is_maker } },
      ];
    }
  } else if (operationType == 5) {
    // account_create
    let registrar = accountResults.find(
      (resAcc) => resAcc.id === operationObject.registrar
    ).name;
    let referrer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.referrer
    ).name;

    if (registrar && referrer) {
      return [
        {
          key: "registrar",
          params: {
            registrar: registrar ?? "",
            opRegistrar: operationObject.registrar,
          },
        },
        {
          key: "referrer",
          params: {
            referrer: referrer ?? "",
            opReferrer: operationObject.referrer,
          },
        },
        {
          key: "referrer_percent",
          params: { referrer_percent: operationObject.referrer_percent },
        },
        { key: "name", params: { name: operationObject.name } },
        { key: "ownerHeader", params: {} },
        {
          key: "weight_threshold",
          params: {
            weight_threshold: operationObject.owner.weight_threshold,
          },
        },
        {
          key: "account_auths",
          params: {
            account_auths: JSON.stringify(operationObject.owner.account_auths),
          },
        },
        {
          key: "key_auths",
          params: {
            key_auths: JSON.stringify(operationObject.owner.key_auths),
          },
        },
        {
          key: "address_auths",
          params: {
            address_auths: JSON.stringify(operationObject.owner.address_auths),
          },
        },
        { key: "activeHeader", params: {} },
        {
          key: "weight_threshold",
          params: {
            weight_threshold: operationObject.active.weight_threshold,
          },
        },
        {
          key: "account_auths",
          params: {
            account_auths: JSON.stringify(operationObject.active.account_auths),
          },
        },
        {
          key: "key_auths",
          params: {
            key_auths: JSON.stringify(operationObject.active.key_auths),
          },
        },
        {
          key: "address_auths",
          params: {
            address_auths: JSON.stringify(operationObject.active.address_auths),
          },
        },
        { key: "optionsHeader", params: {} },
        {
          key: "memo_key",
          params: { memo_key: operationObject.options.memo_key },
        },
        {
          key: "voting_account",
          params: {
            voting_account: operationObject.options.voting_account,
          },
        },
        {
          key: "num_witness",
          params: { num_witness: operationObject.options.num_witness },
        },
        {
          key: "num_committee",
          params: { num_committee: operationObject.options.num_committee },
        },
        {
          key: "votes",
          params: { votes: JSON.stringify(operationObject.options.votes) },
        },
        {
          key: "extensions",
          params: {
            extensions: JSON.stringify(operationObject.options.extensions),
          },
        },
      ];
    }
  } else if (operationType == 6) {
    // account_update
    let targetAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;

    if (targetAccount) {
      return [
        { key: "warning", params: {} },
        {
          key: "account",
          params: {
            account: targetAccount ?? "",
            opAccount: operationObject.account,
          },
        },
        {
          key: "owner",
          params: { owner: JSON.stringify(operationObject.owner) },
        },
        {
          key: "active",
          params: { active: JSON.stringify(operationObject.active) },
        },
        {
          key: "new_options",
          params: {
            new_options: JSON.stringify(operationObject.new_options),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: JSON.stringify(operationObject.extensions),
          },
        },
      ];
    }
  } else if (operationType == 7) {
    // account_whitelist
    let authorizingAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.authorizing_account
    ).name;
    let accountToList = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account_to_list
    ).name;

    if (authorizingAccount && accountToList) {
      return [
        {
          key: "authorizing_account",
          params: {
            authorizingAccount: authorizingAccount ?? "",
            authorizingAccountOP: operationObject.authorizing_account,
          },
        },
        {
          key: "account_to_list",
          params: {
            accountToList: accountToList ?? "",
            accountToListOP: operationObject.account_to_list,
          },
        },
        {
          key: "new_listing",
          params: { new_listing: operationObject.new_listing },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 8) {
    // account_upgrade
    let accountToUpgrade = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account_to_upgrade
    ).name;

    if (accountToUpgrade) {
      return [
        {
          key: "account_to_upgrade",
          params: {
            accountToUpgrade: accountToUpgrade ?? "",
            accountToUpgradeOP: operationObject.account_to_upgrade,
          },
        },
        {
          key: "upgrade_to_lifetime_member",
          params: {
            upgradeToLifetimeMember: operationObject.upgrade_to_lifetime_member,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 9) {
    // account_transfer
    let originalOwner = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account_id
    ).name;
    let newOwner = accountResults.find(
      (resAcc) => resAcc.id === operationObject.new_owner
    ).name;

    if (originalOwner && newOwner) {
      return [
        { key: "warning", params: {} },
        {
          key: "account_id",
          params: {
            originalOwner: originalOwner ?? "",
            account_id: operationObject.account_id,
          },
        },
        {
          key: "new_owner",
          params: {
            newOwner: newOwner ?? "",
            newOwnerOP: operationObject.new_owner,
          },
        },
      ];
    }
  } else if (operationType == 10 || operationType == 11) {
    // asset_create & asset_update
    let asset =
      operationType === 11
        ? assetResults.find(
            (assRes) => assRes.id === operationObject.asset_to_update
          ) // fetch asset to update
        : null;

    let symbol = asset ? asset.symbol : operationObject.symbol;
    let precision = asset ? asset.precision : operationObject.precision;
    let is_prediction_market = asset
      ? asset.is_prediction_market
      : operationObject.is_prediction_market;
    let options =
      operationType === 10
        ? operationObject.common_options
        : operationObject.new_options;
    let max_supply = options.max_supply;
    let market_fee_percent = options.market_fee_percent;
    let max_market_fee = options.max_market_fee;
    let isBitasset = operationObject.bitasset_opts ? true : false;
    let issuer_permissions = getFlagBooleans(
      options.issuer_permissions,
      isBitasset
    );
    let flags = getFlagBooleans(options.flags, isBitasset);
    let cer_base_amount = options.core_exchange_rate.base.amount;
    let cer_base_asset_id = options.core_exchange_rate.base.asset_id;
    let cer_quote_amount = options.core_exchange_rate.quote.amount;
    let cer_quote_asset_id = options.core_exchange_rate.quote.asset_id;
    let whitelist_authorities = options.whitelist_authorities;
    let blacklist_authorities = options.blacklist_authorities;
    let whitelist_markets = options.whitelist_markets;
    let blacklist_markets = options.blacklist_markets;
    let description = JSON.parse(options.description);
    let nft_object = description ? description.nft_object : null;

    let tempRows = [
      { key: "symbol", params: { symbol: symbol } },
      { key: "main", params: { main: description.main } },
      { key: "market", params: { market: description.market } },
      {
        key: "short_name",
        params: { short_name: description.short_name },
      },
      { key: "precision", params: { precision: precision } },
      { key: "max_supply", params: { max_supply: max_supply } },
      {
        key: "market_fee_percent",
        params: { market_fee_percent: market_fee_percent },
      },
      {
        key: "max_market_fee",
        params: { max_market_fee: max_market_fee },
      },
      { key: "cer", params: {} },
      {
        key: "cer_base_amount",
        params: { cer_base_amount: cer_base_amount },
      },
      { key: "cer_base_id", params: { cer_base_id: cer_base_asset_id } },
      {
        key: "cer_quote_amount",
        params: { cer_quote_amount: cer_quote_amount },
      },
      {
        key: "cer_quote_id",
        params: { cer_quote_id: cer_quote_asset_id },
      },
      {
        key: "whitelist_authorities",
        params: { whitelist_authorities: whitelist_authorities },
      },
      {
        key: "blacklist_authorities",
        params: { blacklist_authorities: blacklist_authorities },
      },
      {
        key: "whitelist_markets",
        params: { whitelist_markets: whitelist_markets },
      },
      {
        key: "blacklist_markets",
        params: { blacklist_markets: blacklist_markets },
      },
      {
        key: "is_prediction_market",
        params: { is_prediction_market: is_prediction_market },
      },
      { key: "permissions", params: {} },
      {
        key: "perm_charge_market_fee",
        params: {
          charge_market_fee: issuer_permissions["charge_market_fee"],
        },
      },
      {
        key: "perm_white_list",
        params: { white_list: issuer_permissions["white_list"] },
      },
      {
        key: "perm_override_authority",
        params: {
          override_authority: issuer_permissions["override_authority"],
        },
      },
      {
        key: "perm_transfer_restricted",
        params: {
          transfer_restricted: issuer_permissions["transfer_restricted"],
        },
      },
      {
        key: "perm_disable_confidential",
        params: {
          disable_confidential: issuer_permissions["disable_confidential"],
        },
      },
      { key: "flags", params: {} },
      {
        key: "flag_charge_market_fee",
        params: { charge_market_fee: flags["charge_market_fee"] },
      },
      {
        key: "flag_white_list",
        params: { white_list: flags["white_list"] },
      },
      {
        key: "flag_override_authority",
        params: { override_authority: flags["override_authority"] },
      },
      {
        key: "flag_transfer_restricted",
        params: { transfer_restricted: flags["transfer_restricted"] },
      },
      {
        key: "flag_disable_confidential",
        params: { disable_confidential: flags["disable_confidential"] },
      },
      { key: "bitasset", params: {} },
    ];

    if (isBitasset) {
      tempRows = tempRows.concat([
        { key: "bitasset_opts", params: {} },
        {
          key: "feed_lifetime_sec",
          params: {
            feed_lifetime_sec: operationObject.bitasset_opts.feed_lifetime_sec,
          },
        },
        {
          key: "force_settlement_delay_sec",
          params: {
            force_settlement_delay_sec:
              operationObject.bitasset_opts.force_settlement_delay_sec,
          },
        },
        {
          key: "force_settlement_offset_percent",
          params: {
            force_settlement_offset_percent:
              operationObject.bitasset_opts.force_settlement_offset_percent,
          },
        },
        {
          key: "maximum_force_settlement_volume",
          params: {
            maximum_force_settlement_volume:
              operationObject.bitasset_opts.maximum_force_settlement_volume,
          },
        },
        {
          key: "minimum_feeds",
          params: {
            minimum_feeds: operationObject.bitasset_opts.minimum_feeds,
          },
        },
        {
          key: "short_backing_asset",
          params: {
            short_backing_asset:
              operationObject.bitasset_opts.short_backing_asset,
          },
        },
      ]);
    }

    if (nft_object) {
      tempRows = tempRows.concat([
        { key: "nft", params: {} },
        {
          key: "acknowledgements",
          params: { acknowledgements: nft_object.acknowledgements },
        },
        {
          key: "artist",
          params: { artist: nft_object.artist },
        },
        {
          key: "attestation",
          params: { attestation: nft_object.attestation },
        },
        {
          key: "holder_license",
          params: { holder_license: nft_object.holder_license },
        },
        {
          key: "license",
          params: { license: nft_object.license },
        },
        {
          key: "narrative",
          params: { narrative: nft_object.narrative },
        },
        {
          key: "title",
          params: { title: nft_object.title },
        },
        {
          key: "tags",
          params: { tags: nft_object.tags },
        },
        {
          key: "type",
          params: { type: nft_object.type },
        },
      ]);
    }

    return tempRows;
  } else if (operationType == 12) {
    // asset_update_bitasset
    let shortBackingAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.new_options.short_backing_asset
    );

    if (shortBackingAsset) {
      return [
        { key: "issuer", params: { issuer: operationObject.issuer } },
        {
          key: "asset_to_update",
          params: { asset_to_update: operationObject.asset_to_update },
        },
        { key: "new_options", params: {} },
        {
          key: "feed_lifetime_sec",
          params: {
            feed_lifetime_sec: operationObject.new_options.feed_lifetime_sec,
          },
        },
        {
          key: "minimum_feeds",
          params: {
            minimum_feeds: operationObject.new_options.minimum_feeds,
          },
        },
        {
          key: "force_settlement_delay_sec",
          params: {
            force_settlement_delay_sec:
              operationObject.new_options.force_settlement_delay_sec,
          },
        },
        {
          key: "force_settlement_offset_percent",
          params: {
            force_settlement_offset_percent:
              operationObject.new_options.force_settlement_offset_percent,
          },
        },
        {
          key: "maximum_force_settlement_volume",
          params: {
            maximum_force_settlement_volume:
              operationObject.new_options.maximum_force_settlement_volume,
          },
        },
        {
          key: "short_backing_asset",
          params: { short_backing_asset: shortBackingAsset.symbol },
        },
        operationObject.new_options.extensions
          ? {
              key: "extensions",
              params: {
                extensions: operationObject.new_options.extensions,
              },
            }
          : { key: "noExtensions", params: {} },
      ];
    }
  } else if (operationType == 13) {
    // asset_update_feed_producers
    let issuer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.issuer
    ).name;
    let assetToUpdate = assetResults.find(
      (assRes) => assRes.id === operationObject.new_options.short_backing_asset
    );

    if (issuer && assetToUpdate) {
      return [
        {
          key: "issuer",
          params: { issuer: issuer, issuerOP: operationObject.issuer },
        },
        {
          key: "asset_to_update",
          params: {
            symbol: assetToUpdate.symbol,
            asset_to_update: operationObject.asset_to_update,
          },
        },
        {
          key: "new_feed_producers",
          params: {
            new_feed_producers: JSON.stringify(
              operationObject.new_feed_producers
            ),
          },
        },
      ];
    }
  } else if (operationType == 14) {
    // asset_issue
    //let issuer = accountResults.find((resAcc) => resAcc.id === operationObject.issuer).name;
    let targetAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.issue_to_account
    ).name;

    let assetToIssue = assetResults.find(
      (assRes) => assRes.id === operationObject.asset_to_issue.asset_id
    );

    if (targetAccount && assetToIssue) {
      return [
        {
          key: "prompt",
          params: {
            amount: operationObject.asset_to_issue.amount,
            symbol: assetToIssue.symbol,
            assetID: assetToIssue.id,
            to: targetAccount,
            toID: operationObject.issue_to_account,
          },
        },
      ];
    }
  } else if (operationType == 15) {
    // asset_reserve
    let payer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.payer
    ).name;
    let assetToReserve = assetResults.find(
      (assRes) => assRes.id === operationObject.amount_to_reserve.asset_id
    );

    if (payer && assetToReserve) {
      return [
        {
          key: "payer",
          params: { payer: payer, payerOP: operationObject.payer },
        },
        {
          key: "amount_to_reserve",
          params: {
            amount_to_reserve: formatAsset(
              operationObject.amount_to_reserve.amount,
              assetToReserve.symbol,
              assetToReserve.precision
            ),
            asset_id: operationObject.amount_to_reserve.asset_id,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 16) {
    // asset_fund_fee_pool
    let fromAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.from_account
    ).name;
    let assetToFund = assetResults.find(
      (assRes) => assRes.id === operationObject.asset_id
    );

    if (fromAccount && assetToFund) {
      return [
        {
          key: "from_account",
          params: {
            from_account: fromAccount,
            from_accountOP: operationObject.from_account,
          },
        },
        {
          key: "asset",
          params: {
            from_account: assetToFund.symbol,
            from_accountOP: operationObject.asset_id,
          },
        },
        {
          key: "amount",
          params: {
            amount: formatAsset(
              operationObject.amount,
              assetToFund.symbol,
              assetToFund.precision
            ),
          },
        },
      ];
    }
  } else if (operationType == 17) {
    // asset_settle
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;

    let amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      amount = operationObject.amount_;
    } else {
      amount = operationObject.amount;
    }

    let assetToSettle = assetResults.find(
      (assRes) => assRes.id === amount.asset_id
    );

    if (account && assetToSettle) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        {
          key: "amount",
          params: {
            amount: formatAsset(
              amount.amount,
              assetToSettle.symbol,
              assetToSettle.precision
            ),
            assetID: amount.asset_id,
          },
        },
      ];
    }
  } else if (operationType == 18) {
    // asset_global_settle
    let issuer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;
    let assetToSettle = assetResults.find(
      (assRes) => assRes.id === operationObject.asset_to_settle
    );
    let baseAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.settle_price.base.asset_id
    );
    let quoteAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.settle_price.quote.asset_id
    );

    if (issuer && assetToSettle && baseAsset && quoteAsset) {
      let price =
        humanReadableFloat(
          operationObject.settle_price.base.amount,
          baseAsset.precision
        ) /
        humanReadableFloat(
          operationObject.settle_price.quote.amount,
          quoteAsset.precision
        );

      return [
        {
          key: "issuer",
          params: { issuer: issuer, issuerOP: operationObject.account },
        },
        {
          key: "asset_to_settle",
          params: {
            asset_to_settle: assetToSettle.symbol,
            asset_to_settleOP: operationObject.asset_to_settle,
          },
        },
        { key: "settle_price", params: { settle_price: price } },
      ];
    }
  } else if (operationType == 19) {
    // asset_publish_feed
    let publisher = accountResults.find(
      (resAcc) => resAcc.id === operationObject.publisher
    ).name;
    let baseAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.settle_price.base.asset_id
    ); // backing e.g. BTS
    let quoteAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.settle_price.quote.asset_id
    ); // same as asset_id

    if (publisher && baseAsset && quoteAsset) {
      let coreExchangeRate =
        humanReadableFloat(
          operationObject.feed.core_exchange_rate.base.amount,
          baseAsset.precision
        ) /
        humanReadableFloat(
          operationObject.feed.core_exchange_rate.quote.amount,
          quoteAsset.precision
        );

      let settlementPrice =
        humanReadableFloat(
          operationObject.feed.settlement_price.base.amount,
          baseAsset.precision
        ) /
        humanReadableFloat(
          operationObject.feed.settlement_price.quote.amount,
          quoteAsset.precision
        );

      return [
        {
          key: "publisher",
          params: {
            publisher: publisher,
            publisherOP: operationObject.publisher,
          },
        },
        {
          key: "asset_id",
          params: {
            symbol: quoteAsset.symbol,
            asset_idOP: operationObject.asset_id,
          },
        },
        { key: "feed", params: {} },
        {
          key: "core_exchange_rate",
          params: { core_exchange_rate: coreExchangeRate },
        },
        {
          key: "settlement_price",
          params: { settlement_price: settlementPrice },
        },
        {
          key: "maintenance_collateral_ratio",
          params: {
            maintenance_collateral_ratio:
              operationObject.feed.maintenance_collateral_ratio,
          },
        },
        {
          key: "maximum_short_squeeze_ratio",
          params: {
            maximum_short_squeeze_ratio:
              operationObject.feed.maximum_short_squeeze_ratio,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 20) {
    // witness_create
    let witnessAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.witness_account
    ).name;

    if (witnessAccount) {
      return [
        {
          key: "witness_account",
          params: {
            witness_account: witnessAccount,
            witness_accountOP: operationObject.witness_account,
          },
        },
        { key: "url", params: { url: operationObject.url } },
        {
          key: "block_signing_key",
          params: { block_signing_key: operationObject.block_signing_key },
        },
      ];
    }
  } else if (operationType == 21) {
    // witness_update
    let witnessAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.witness_account
    ).name;

    if (witnessAccount) {
      return [
        {
          key: "witness",
          params: {
            witness: operationObject.witness,
          },
        },
        {
          key: "witness_account",
          params: {
            witness_account: witnessAccount,
            witness_accountOP: operationObject.witness_account,
          },
        },
        { key: "new_url", params: { new_url: operationObject.new_url } },
        {
          key: "new_signing_key",
          params: { new_signing_key: operationObject.new_signing_key },
        },
      ];
    }
  } else if (operationType == 22) {
    // proposal_create
    let feePayingAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.fee_paying_account
    ).name;

    if (feePayingAccount) {
      return [
        {
          key: "expiration_time",
          params: { expiration_time: operationObject.expiration_time },
        },
        {
          key: "proposed_ops",
          params: {
            proposed_ops: JSON.stringify(operationObject.proposed_ops),
          },
        },
        {
          key: "review_period_seconds",
          params: {
            review_period_seconds: operationObject.review_period_seconds,
          },
        },
        {
          key: "fee_paying_account",
          params: {
            fee_paying_account: feePayingAccount,
            fee_paying_accountOP: operationObject.fee_paying_account,
          },
        },
      ];
    }
  } else if (operationType == 23) {
    // proposal_update
    let feePayingAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.fee_paying_account
    ).name;

    if (feePayingAccount) {
      return [
        { key: "proposal", params: { proposal: operationObject.proposal } },
        {
          key: "active_approvals_to_add",
          params: {
            active_approvals_to_add: JSON.stringify(
              operationObject.active_approvals_to_add
            ),
          },
        },
        {
          key: "active_approvals_to_remove",
          params: {
            active_approvals_to_remove: JSON.stringify(
              operationObject.active_approvals_to_remove
            ),
          },
        },
        {
          key: "owner_approvals_to_add",
          params: {
            owner_approvals_to_add: JSON.stringify(
              operationObject.owner_approvals_to_add
            ),
          },
        },
        {
          key: "owner_approvals_to_remove",
          params: {
            owner_approvals_to_remove: JSON.stringify(
              operationObject.owner_approvals_to_remove
            ),
          },
        },
        {
          key: "key_approvals_to_add",
          params: {
            key_approvals_to_add: JSON.stringify(
              operationObject.key_approvals_to_add
            ),
          },
        },
        {
          key: "key_approvals_to_remove",
          params: {
            key_approvals_to_remove: JSON.stringify(
              operationObject.key_approvals_to_remove
            ),
          },
        },
        {
          key: "fee_paying_account",
          params: {
            fee_paying_account: feePayingAccount,
            fee_paying_accountOP: operationObject.fee_paying_account,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 24) {
    // proposal_delete
    let feePayingAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.fee_paying_account
    ).name;

    if (feePayingAccount) {
      return [
        {
          key: "using_owner_authority",
          params: {
            using_owner_authority: operationObject.using_owner_authority,
          },
        },
        { key: "proposal", params: { proposal: operationObject.proposal } },
        {
          key: "fee_paying_account",
          params: {
            fee_paying_account: feePayingAccount,
            fee_paying_accountOP: operationObject.fee_paying_account,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 25) {
    // withdraw_permission_create
    let to = accountResults.find(
      (resAcc) => resAcc.id === operationObject.authorized_account
    ).name;
    let from = accountResults.find(
      (resAcc) => resAcc.id === operationObject.withdraw_from_account
    ).name;
    let asset = assetResults.find(
      (assRes) => assRes.id === operationObject.withdrawal_limit.asset_id
    );

    if (to && from && asset) {
      return [
        {
          key: "recipient",
          params: {
            recipient: to,
            recipientOP: operationObject.authorized_account,
          },
        },
        {
          key: "withdraw_from",
          params: {
            withdraw_from: from,
            withdraw_fromOP: operationObject.withdraw_from_account,
          },
        },
        {
          key: "taking",
          params: {
            amount: formatAsset(
              operationObject.withdrawal_limit.amount,
              asset.symbol,
              asset.precision
            ),
            period_sec: operationObject.withdrawal_period_sec,
            period_qty: operationObject.periods_until_expiration,
          },
        },
      ];
    }
  } else if (operationType == 26) {
    // withdraw_permission_update
    let withdrawFromAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.withdraw_from_account
    ).name;
    let authorizedAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.authorized_account
    ).name;
    let withdrawalLimit = assetResults.find(
      (assRes) => assRes.id === operationObject.withdrawal_limit.asset_id
    );

    if (withdrawFromAccount && authorizedAccount && withdrawalLimit) {
      return [
        {
          key: "withdraw_from_account",
          params: {
            withdraw_from_account: withdrawFromAccount,
            withdraw_from_accountOP: operationObject.withdraw_from_account,
          },
        },
        {
          key: "authorized_account",
          params: {
            authorized_account: authorizedAccount,
            authorized_accountOP: operationObject.authorized_account,
          },
        },
        {
          key: "permission_to_update",
          params: {
            permission_to_update: operationObject.permission_to_update,
          },
        },
        withdrawalLimit
          ? {
              key: "withdrawal_limited",
              params: {
                withdrawal_limit: formatAsset(
                  operationObject.withdrawal_limit.amount,
                  withdrawalLimit.symbol,
                  withdrawalLimit.precision
                ),
              },
            }
          : {
              key: "withdrawal_unlimited",
              params: {
                withdrawal_limit: operationObject.withdrawal_limit.amount,
                withdrawal_limitOP: operationObject.withdrawal_limit.asset_id,
              },
            },
        {
          key: "withdrawal_period_sec",
          params: {
            withdrawal_period_sec: operationObject.withdrawal_period_sec,
          },
        },
        {
          key: "period_start_time",
          params: { period_start_time: operationObject.period_start_time },
        },
        {
          key: "periods_until_expiration",
          params: {
            periods_until_expiration: operationObject.periods_until_expiration,
          },
        },
      ];
    }
  } else if (operationType == 27) {
    // withdraw_permission_claim
    let from = accountResults.find(
      (resAcc) => resAcc.id === operationObject.withdraw_from_account
    ).name;
    let to = accountResults.find(
      (resAcc) => resAcc.id === operationObject.withdraw_to_account
    ).name;
    let withdrawnAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.amount_to_withdraw.asset_id
    );

    if (from && to && withdrawnAsset) {
      return [
        {
          key: "withdraw_permission",
          params: {
            withdraw_permission: operationObject.withdraw_permission,
          },
        },
        {
          key: "withdraw_from_account",
          params: {
            withdraw_from_account: from ?? "",
            withdraw_from_accountOP: operationObject.withdraw_from_account,
          },
        },
        {
          key: "withdraw_to_account",
          params: {
            withdraw_to_account: to ?? "",
            withdraw_to_accountOP: operationObject.withdraw_to_account,
          },
        },
        {
          key: "amount_to_withdraw",
          params: {
            amount_to_withdraw: withdrawnAsset
              ? formatAsset(
                  operationObject.amount_to_withdraw.amount,
                  withdrawnAsset.symbol,
                  withdrawnAsset.precision
                )
              : operationObject.amount_to_withdraw.amount,
            amount_to_withdrawOP: operationObject.amount_to_withdraw.asset_id,
          },
        },
        { key: "memo", params: { memo: operationObject.memo } },
      ];
    }
  } else if (operationType == 28) {
    // withdraw_permission_delete
    let withdrawFromAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.withdraw_from_account
    ).name;
    let authorizedAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.authorized_account
    ).name;

    if (withdrawFromAccount && authorizedAccount) {
      return [
        {
          key: "withdraw_from_account",
          params: {
            withdraw_from_account: withdrawFromAccount,
            withdraw_from_accountOP: operationObject.withdraw_from_account,
          },
        },
        {
          key: "authorized_account",
          params: {
            authorized_account: authorizedAccount,
            authorized_accountOP: operationObject.authorized_account,
          },
        },
        {
          key: "withdrawal_permission",
          params: {
            withdrawal_permission: operationObject.withdrawal_permission,
          },
        },
      ];
    }
  } else if (operationType == 29) {
    // committee_member_create
    let committeeMemberAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.committee_member_account
    ).name;

    if (committeeMemberAccount) {
      return [
        {
          key: "committee_member_account",
          params: {
            committee_member_account: committeeMemberAccount,
            committee_member_accountOP:
              operationObject.committee_member_account,
          },
        },
        { key: "url", params: { url: operationObject.url } },
      ];
    }
  } else if (operationType == 30) {
    // committee_member_update
    // none in kibana?
    let committeeMemberAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.committee_member_account
    ).name;

    if (committeeMemberAccount) {
      return [
        {
          key: "committee_member",
          params: { committee_member: operationObject.committee_member },
        },
        {
          key: "committee_member_account",
          params: {
            committee_member_account: committeeMemberAccount,
            committee_member_accountOP:
              operationObject.committee_member_account,
          },
        },
        { key: "new_url", params: { new_url: operationObject.new_url } },
      ];
    }
  } else if (operationType == 31) {
    // committee_member_update_global_parameters

    return [
      { key: "new_parameters", params: {} },
      {
        key: "current_fees",
        params: {
          current_fees: JSON.stringify(
            operationObject.new_parameters.current_fees
          ),
        },
      },
      {
        key: "block_interval",
        params: { block_interval: operationObject.block_interval },
      },
      {
        key: "maintenance_interval",
        params: {
          maintenance_interval: operationObject.maintenance_interval,
        },
      },
      {
        key: "maintenance_skip_slots",
        params: {
          maintenance_skip_slots: operationObject.maintenance_skip_slots,
        },
      },
      {
        key: "committee_proposal_review_period",
        params: {
          committee_proposal_review_period:
            operationObject.committee_proposal_review_period,
        },
      },
      {
        key: "maximum_transaction_size",
        params: {
          maximum_transaction_size: operationObject.maximum_transaction_size,
        },
      },
      {
        key: "maximum_block_size",
        params: { maximum_block_size: operationObject.maximum_block_size },
      },
      {
        key: "maximum_time_until_expiration",
        params: {
          maximum_time_until_expiration:
            operationObject.maximum_time_until_expiration,
        },
      },
      {
        key: "maximum_proposal_lifetime",
        params: {
          maximum_proposal_lifetime: operationObject.maximum_proposal_lifetime,
        },
      },
      {
        key: "maximum_asset_whitelist_authorities",
        params: {
          maximum_asset_whitelist_authorities:
            operationObject.maximum_asset_whitelist_authorities,
        },
      },
      {
        key: "maximum_asset_feed_publishers",
        params: {
          maximum_asset_feed_publishers:
            operationObject.maximum_asset_feed_publishers,
        },
      },
      {
        key: "maximum_witness_count",
        params: {
          maximum_witness_count: operationObject.maximum_witness_count,
        },
      },
      {
        key: "maximum_committee_count",
        params: {
          maximum_committee_count: operationObject.maximum_committee_count,
        },
      },
      {
        key: "maximum_authority_membership",
        params: {
          maximum_authority_membership:
            operationObject.maximum_authority_membership,
        },
      },
      {
        key: "reserve_percent_of_fee",
        params: {
          reserve_percent_of_fee: operationObject.reserve_percent_of_fee,
        },
      },
      {
        key: "network_percent_of_fee",
        params: {
          network_percent_of_fee: operationObject.network_percent_of_fee,
        },
      },
      {
        key: "lifetime_referrer_percent_of_fee",
        params: {
          lifetime_referrer_percent_of_fee:
            operationObject.lifetime_referrer_percent_of_fee,
        },
      },
      {
        key: "cashback_vesting_period_seconds",
        params: {
          cashback_vesting_period_seconds:
            operationObject.cashback_vesting_period_seconds,
        },
      },
      {
        key: "cashback_vesting_threshold",
        params: {
          cashback_vesting_threshold:
            operationObject.cashback_vesting_threshold,
        },
      },
      {
        key: "count_non_member_votes",
        params: {
          count_non_member_votes: operationObject.count_non_member_votes,
        },
      },
      {
        key: "allow_non_member_whitelists",
        params: {
          allow_non_member_whitelists:
            operationObject.allow_non_member_whitelists,
        },
      },
      {
        key: "witness_pay_per_block",
        params: {
          witness_pay_per_block: operationObject.witness_pay_per_block,
        },
      },
      {
        key: "worker_budget_per_day",
        params: {
          worker_budget_per_day: operationObject.worker_budget_per_day,
        },
      },
      {
        key: "max_predicate_opcode",
        params: {
          max_predicate_opcode: operationObject.max_predicate_opcode,
        },
      },
      {
        key: "fee_liquidation_threshold",
        params: {
          fee_liquidation_threshold: operationObject.fee_liquidation_threshold,
        },
      },
      {
        key: "accounts_per_fee_scale",
        params: {
          accounts_per_fee_scale: operationObject.accounts_per_fee_scale,
        },
      },
      {
        key: "account_fee_scale_bitshifts",
        params: {
          account_fee_scale_bitshifts:
            operationObject.account_fee_scale_bitshifts,
        },
      },
      {
        key: "max_authority_depth",
        params: { max_authority_depth: operationObject.max_authority_depth },
      },
      {
        key: "extensions",
        params: { extensions: JSON.stringify(operationObject.extensions) },
      },
    ];
  } else if (operationType == 32) {
    // vesting_balance_create
    let creator = accountResults.find(
      (resAcc) => resAcc.id === operationObject.creator
    ).name;
    let owner = accountResults.find(
      (resAcc) => resAcc.id === operationObject.owner
    ).name;

    let _amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      _amount = operationObject.amount_;
    } else {
      _amount = operationObject.amount;
    }

    let amount = assetResults.find((assRes) => assRes.id === _amount.asset_id);

    if (creator && owner && amount) {
      let tempRows = [
        {
          key: "creator",
          params: { creator: creator, creatorOP: operationObject.creator },
        },
        {
          key: "owner",
          params: { owner: owner, ownerOP: operationObject.owner },
        },
        {
          key: "amount",
          params: {
            amount: formatAsset(
              _amount.amount,
              amount.symbol,
              amount.precision
            ),
            amount_id: _amount.asset_id,
          },
        },
        { key: "policy", params: {} },
      ];

      let policy = operationObject.policy;
      if (policy[0] == 0) {
        tempRows.push({
          key: "begin_timestamp",
          params: { begin_timestamp: policy[1].begin_timestamp },
        });
        tempRows.push({
          key: "vesting_cliff_seconds",
          params: {
            vesting_cliff_seconds: policy[1].vesting_cliff_seconds,
          },
        });
        tempRows.push({
          key: "vesting_duration_seconds",
          params: {
            vesting_duration_seconds: policy[1].vesting_duration_seconds,
          },
        });
      } else {
        tempRows.push({
          key: "start_claim",
          params: { start_claim: policy[1].start_claim },
        });
        tempRows.push({
          key: "vesting_seconds",
          params: { vesting_seconds: policy[1].vesting_seconds },
        });
      }

      return tempRows;
    }
  } else if (operationType == 33) {
    // vesting_balance_withdraw
    let owner = accountResults.find(
      (resAcc) => resAcc.id === operationObject.owner
    ).name;

    let _amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      _amount = operationObject.amount_;
    } else {
      _amount = operationObject.amount;
    }

    let asset = assetResults.find((assRes) => assRes.id === _amount.asset_id);

    if (owner && asset) {
      return [
        {
          key: "owner",
          params: { owner: owner, ownerOP: operationObject.owner },
        },
        {
          key: "claim",
          params: {
            claim: formatAsset(_amount.amount, asset.symbol, asset.precision),
            asset_id: _amount.asset_id,
          },
        },
      ];
    }
  } else if (operationType == 34) {
    // worker_create
    let owner = accountResults.find(
      (resAcc) => resAcc.id === operationObject.owner
    ).name;

    if (owner) {
      return [
        {
          key: "owner",
          params: { owner: owner, ownerOP: operationObject.owner },
        },
        {
          key: "work_begin_date",
          params: { work_begin_date: operationObject.work_begin_date },
        },
        {
          key: "work_end_date",
          params: { work_end_date: operationObject.work_end_date },
        },
        {
          key: "daily_pay",
          params: { daily_pay: operationObject.daily_pay },
        },
        { key: "name", params: { name: operationObject.name } },
        { key: "url", params: { url: operationObject.url } },
        {
          key: "initializer",
          params: {
            initializer: JSON.stringify(operationObject.initializer),
          },
        },
      ];
    }
  } else if (operationType == 35) {
    // custom
    let payer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.payer
    ).name;

    if (payer) {
      return [
        {
          key: "payer",
          params: { payer: payer, payerOP: operationObject.payer },
        },
        {
          key: "required_auths",
          params: {
            required_auths: JSON.stringify(operationObject.required_auths),
          },
        },
        { key: "id", params: { id: operationObject.id } },
        {
          key: "data",
          params: { data: JSON.stringify(operationObject.data) },
        },
      ];
    }
  } else if (operationType == 36) {
    // assert
    let feePayingAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.fee_paying_account
    ).name;

    if (feePayingAccount) {
      return [
        {
          key: "fee_paying_account",
          params: {
            fee_paying_account: feePayingAccount,
            fee_paying_accountOP: operationObject.fee_paying_account,
          },
        },
        {
          key: "predicates",
          params: {
            predicates: JSON.stringify(operationObject.predicates),
          },
        },
        {
          key: "required_auths",
          params: {
            required_auths: JSON.stringify(operationObject.required_auths),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 37) {
    // balance_claim
    let depositToAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.deposit_to_account
    ).name;

    let _amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      _amount = operationObject.amount_;
    } else {
      _amount = operationObject.amount;
    }

    let claimedAsset = assetResults.find(
      (assRes) => assRes.id === _amount.asset_id
    );

    if (depositToAccount && claimedAsset) {
      return [
        {
          key: "deposit_to_account",
          params: {
            deposit_to_account: depositToAccount,
            deposit_to_accountOP: operationObject.deposit_to_account,
          },
        },
        {
          key: "balance_to_claim",
          params: { balance_to_claim: operationObject.balance_to_claim },
        },
        {
          key: "balance_owner_key",
          params: { balance_owner_key: operationObject.balance_owner_key },
        },
        {
          key: "total_claimed",
          params: {
            total_claimed: formatAsset(
              _amount.amount,
              claimedAsset.symbol,
              claimedAsset.precision
            ),
            asset_id: _amount.asset_id,
          },
        },
      ];
    }
  } else if (operationType == 38) {
    // override_transfer
    let issuer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.issuer
    ).name;
    let from = accountResults.find(
      (resAcc) => resAcc.id === operationObject.from
    ).name;
    let to = accountResults.find(
      (resAcc) => resAcc.id === operationObject.to
    ).name;

    let _amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      _amount = operationObject.amount_;
    } else {
      _amount = operationObject.amount;
    }

    let overridenAsset = assetResults.find(
      (assRes) => assRes.id === _amount.asset_id
    );

    if (issuer && from && to && overridenAsset) {
      return [
        {
          key: "issuer",
          params: { issuer: issuer, issuerOP: operationObject.issuer },
        },
        {
          key: "from",
          params: { from: from, fromOP: operationObject.from },
        },
        { key: "to", params: { to: to, toOP: operationObject.to } },
        {
          key: "amount",
          params: {
            amount: formatAsset(
              _amount.amount,
              overridenAsset.symbol,
              overridenAsset.precision
            ),
            asset_id: _amount.asset_id,
          },
        },
        { key: "memo", params: { memo: operationObject.memo } },
      ];
    }
  } else if (operationType == 39) {
    // transfer_to_blind
    let from = accountResults.find(
      (resAcc) => resAcc.id === operationObject.from
    ).name;

    let _amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      _amount = operationObject.amount_;
    } else {
      _amount = operationObject.amount;
    }

    let assetToTransfer = assetResults.find(
      (assRes) => assRes.id === _amount.asset_id
    );

    if (from && assetToTransfer) {
      return [
        {
          key: "amount",
          params: {
            amount: formatAsset(
              _amount.amount,
              assetToTransfer.symbol,
              assetToTransfer.precision
            ),
          },
        },
        {
          key: "from",
          params: { from: from, fromOP: operationObject.from },
        },
        {
          key: "blinding_factor",
          params: { blinding_factor: operationObject.blinding_factor },
        },
        {
          key: "outputs",
          params: { outputs: JSON.stringify(operationObject.outputs) },
        },
      ];
    }
  } else if (operationType == 40) {
    // blind_transfer

    return [
      {
        key: "inputs",
        params: { inputs: JSON.stringify(operationObject.inputs) },
      },
      {
        key: "outputs",
        params: { outputs: JSON.stringify(operationObject.outputs) },
      },
    ];
  } else if (operationType == 41) {
    // transfer_from_blind
    let to = accountResults.find(
      (resAcc) => resAcc.id === operationObject.to
    ).name;

    let _amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      _amount = operationObject.amount_;
    } else {
      _amount = operationObject.amount;
    }

    let assetToTransfer = assetResults.find(
      (assRes) => assRes.id === _amount.asset_id
    );

    if (to && assetToTransfer) {
      return [
        {
          key: "amount",
          params: {
            amount: formatAsset(
              _amount.amount,
              assetToTransfer.symbol,
              assetToTransfer.precision
            ),
          },
        },
        { key: "to", params: { to: to, toOP: operationObject.to } },
        {
          key: "blinding_factor",
          params: { blinding_factor: operationObject.blinding_factor },
        },
        {
          key: "inputs",
          params: { inputs: JSON.stringify(operationObject.inputs) },
        },
      ];
    }
  } else if (operationType == 42) {
    // Virtual
    // asset_settle_cancel_operation
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    )?.name;

    let _amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      _amount = operationObject.amount_;
    } else {
      _amount = operationObject.amount;
    }

    let asset = _amount
      ? assetResults.find((assRes) => assRes.id === _amount.asset_id)
      : null;

    if (account && asset) {
      return [
        {
          key: "settlement",
          params: { settlement: operationObject.settlement },
        },
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        {
          key: "amount",
          params: {
            amount: formatAsset(_amount.amount, asset.symbol, asset.precision),
            asset_id: _amount.asset_id,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 43) {
    // asset_claim_fees
    let issuer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.issuer
    ).name;

    let assetToClaim = assetResults.find(
      (assRes) => assRes.id === operationObject.amount_to_claim.asset_id
    );

    if (issuer && assetToClaim) {
      return [
        {
          key: "issuer",
          params: { issuer: issuer, issuerOP: operationObject.issuer },
        },
        {
          key: "amount_to_claim",
          params: {
            amount_to_claim: formatAsset(
              operationObject.amount_to_claim.amount,
              assetToClaim.symbol,
              assetToClaim.precision
            ),
            asset_id: operationObject.amount_to_claim.asset_id,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: JSON.stringify(operationObject.extensions),
          },
        },
      ];
    }
  } else if (operationType == 44) {
    // Virtual
    // fba_distribute_operation
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account_id
    )?.name;

    // amount is share_type (core asset); use fee.asset_id as the asset reference
    let coreAssetId = operationObject?.fee?.asset_id || "1.3.0";
    let coreAsset = assetResults.find((assRes) => assRes.id === coreAssetId);

    if (account && coreAsset) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account_id },
        },
        { key: "fba_id", params: { fba_id: operationObject.fba_id } },
        {
          key: "amount",
          params: {
            amount: formatAsset(
              operationObject.amount,
              coreAsset.symbol,
              coreAsset.precision
            ),
            asset_id: coreAssetId,
          },
        },
      ];
    }
  } else if (operationType == 45) {
    // bid_collateral
    let bidder = accountResults.find(
      (resAcc) => resAcc.id === operationObject.bidder
    ).name;
    let collateral = assetResults.find(
      (assRes) => assRes.id === operationObject.additional_collateral.asset_id
    );
    let debtCovered = assetResults.find(
      (assRes) => assRes.id === operationObject.debtCovered.asset_id
    );

    if (bidder && collateral && debtCovered) {
      return [
        {
          key: "bidder",
          params: { bidder: bidder, bidderOP: operationObject.bidder },
        },
        {
          key: "additional_collateral",
          params: {
            additional_collateral: formatAsset(
              operationObject.additional_collateral.amount,
              collateral.symbol,
              collateral.precision
            ),
          },
        },
        {
          key: "debt_covered",
          params: {
            debt_covered: formatAsset(
              operationObject.debt_covered.amount,
              debtCovered.symbol,
              debtCovered.precision
            ),
          },
        },
      ];
    }
  } else if (operationType == 46) {
    // Virtual
    // execute_bid_operation
    let bidder = accountResults.find(
      (resAcc) => resAcc.id === operationObject.bidder
    )?.name;

    let debtAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.debt.asset_id
    );
    let collateralAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.collateral.asset_id
    );

    if (bidder && debtAsset && collateralAsset) {
      return [
        {
          key: "bidder",
          params: { bidder: bidder, bidderOP: operationObject.bidder },
        },
        {
          key: "debt",
          params: {
            debt: formatAsset(
              operationObject.debt.amount,
              debtAsset.symbol,
              debtAsset.precision
            ),
          },
        },
        {
          key: "collateral",
          params: {
            collateral: formatAsset(
              operationObject.collateral.amount,
              collateralAsset.symbol,
              collateralAsset.precision
            ),
          },
        },
      ];
    }
  } else if (operationType == 47) {
    // asset_claim_pool
    let issuer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.issuer
    ).name;
    let relevantAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.asset_id
    );

    if (issuer && relevantAsset) {
      return [
        {
          key: "issuer",
          params: { issuer: issuer, issuerOP: operationObject.issuer },
        },
        { key: "asset_id", params: { asset_id: operationObject.asset_id } },
        {
          key: "amount_to_claim",
          params: {
            amount_to_claim: formatAsset(
              operationObject.amount_to_claim.amount,
              relevantAsset.symbol,
              relevantAsset.precision
            ),
          },
        },
      ];
    }
  } else if (operationType == 48) {
    // asset_update_issuer
    let issuer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.issuer
    ).name;
    let new_issuer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.new_issuer
    ).name;
    let assetToUpdate = assetResults.find(
      (assRes) => assRes.id === operationObject.asset_to_update
    );

    if (issuer && new_issuer && assetToUpdate) {
      return [
        {
          key: "issuer",
          params: { issuer: issuer, issuerOP: operationObject.issuer },
        },
        {
          key: "asset_to_update",
          params: { asset_to_update: assetToUpdate.symbol },
        },
        {
          key: "new_issuer",
          params: {
            new_issuer: new_issuer,
            new_issuerOP: operationObject.new_issuer,
          },
        },
      ];
    }
  } else if (operationType == 49) {
    // htlc_create
    let from = accountResults.find(
      (resAcc) => resAcc.id === operationObject.from
    ).name;
    let to = accountResults.find(
      (resAcc) => resAcc.id === operationObject.to
    ).name;

    let _amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      _amount = operationObject.amount_;
    } else {
      _amount = operationObject.amount;
    }

    let htlcAsset = assetResults.find(
      (assRes) => assRes.id === _amount.asset_id
    );

    if (from && to && htlcAsset) {
      return [
        {
          key: "from",
          params: { from: from, fromOP: operationObject.from },
        },
        { key: "to", params: { to: to, toOP: operationObject.to } },
        {
          key: "amount",
          params: {
            amount: formatAsset(
              _amount.amount,
              htlcAsset.symbol,
              htlcAsset.precision
            ),
          },
        },
        {
          key: "preimage_hash",
          params: { preimage_hash: operationObject.preimage_hash },
        },
        {
          key: "preimage_size",
          params: { preimage_size: operationObject.preimage_size },
        },
        {
          key: "claim_period_seconds",
          params: {
            claim_period_seconds: operationObject.claim_period_seconds,
          },
        },
      ];
    }
  } else if (operationType == 50) {
    // htlc_redeem
    let redeemer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.redeemer
    ).name;

    if (redeemer) {
      return [
        { key: "htlc_id", params: { htlc_id: operationObject.htlc_id } },
        {
          key: "redeemer",
          params: {
            redeemer: redeemer,
            redeemerOP: operationObject.redeemer,
          },
        },
        { key: "preimage", params: { preimage: operationObject.preimage } },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 51) {
    // Virtual
    // htlc_redeemed_operation
    let from = accountResults.find(
      (resAcc) => resAcc.id === operationObject.from
    )?.name;
    let to = accountResults.find(
      (resAcc) => resAcc.id === operationObject.to
    )?.name;
    let redeemer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.redeemer
    )?.name;

    let _amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      _amount = operationObject.amount_;
    } else {
      _amount = operationObject.amount;
    }

    let asset = _amount
      ? assetResults.find((assRes) => assRes.id === _amount.asset_id)
      : null;

    const preimageHash = Array.isArray(operationObject.htlc_preimage_hash)
      ? operationObject.htlc_preimage_hash[1]
      : operationObject.htlc_preimage_hash
      ? JSON.stringify(operationObject.htlc_preimage_hash)
      : null;

    if (from && to && redeemer && asset) {
      return [
        { key: "htlc_id", params: { htlc_id: operationObject.htlc_id } },
        {
          key: "from",
          params: { from: from, fromOP: operationObject.from },
        },
        { key: "to", params: { to: to, toOP: operationObject.to } },
        {
          key: "redeemer",
          params: { redeemer: redeemer, redeemerOP: operationObject.redeemer },
        },
        {
          key: "amount",
          params: {
            amount: formatAsset(_amount.amount, asset.symbol, asset.precision),
            asset_id: _amount.asset_id,
          },
        },
        preimageHash
          ? {
              key: "htlc_preimage_hash",
              params: { htlc_preimage_hash: preimageHash },
            }
          : { key: "htlc_preimage_hash", params: { htlc_preimage_hash: "" } },
        {
          key: "htlc_preimage_size",
          params: { htlc_preimage_size: operationObject.htlc_preimage_size },
        },
        { key: "preimage", params: { preimage: operationObject.preimage } },
      ];
    }
  } else if (operationType == 52) {
    // htlc_extend
    let update_issuer = accountResults.find(
      (resAcc) => resAcc.id === operationObject.update_issuer
    ).name;

    if (update_issuer) {
      return [
        { key: "htlc_id", params: { htlc_id: operationObject.htlc_id } },
        {
          key: "update_issuer",
          params: {
            update_issuer: update_issuer,
            update_issuerOP: operationObject.update_issuer,
          },
        },
        {
          key: "seconds_to_add",
          params: { seconds_to_add: operationObject.seconds_to_add },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 53) {
    // Virtual
    // htlc_refund_operation
    let to = accountResults.find(
      (resAcc) => resAcc.id === operationObject.to
    )?.name;

    let originalRecipient = accountResults.find(
      (resAcc) => resAcc.id === operationObject.original_htlc_recipient
    )?.name;

    // Prefer explicit htlc_amount, but be robust to amount_/amount fallbacks
    let _amount =
      operationObject.htlc_amount_ ||
      operationObject.htlc_amount ||
      operationObject.amount_ ||
      operationObject.amount;

    let asset = _amount
      ? assetResults.find((assRes) => assRes.id === _amount.asset_id)
      : null;

    const preimageHash = Array.isArray(operationObject.htlc_preimage_hash)
      ? operationObject.htlc_preimage_hash[1]
      : operationObject.htlc_preimage_hash
      ? JSON.stringify(operationObject.htlc_preimage_hash)
      : null;

    if (to && originalRecipient && asset) {
      return [
        { key: "htlc_id", params: { htlc_id: operationObject.htlc_id } },
        { key: "to", params: { to: to, toOP: operationObject.to } },
        {
          key: "original_htlc_recipient",
          params: {
            original_htlc_recipient: originalRecipient,
            original_htlc_recipientOP: operationObject.original_htlc_recipient,
          },
        },
        {
          key: "amount",
          params: {
            amount: formatAsset(_amount.amount, asset.symbol, asset.precision),
            asset_id: _amount.asset_id,
          },
        },
        preimageHash
          ? {
              key: "htlc_preimage_hash",
              params: { htlc_preimage_hash: preimageHash },
            }
          : { key: "htlc_preimage_hash", params: { htlc_preimage_hash: "" } },
        {
          key: "htlc_preimage_size",
          params: { htlc_preimage_size: operationObject.htlc_preimage_size },
        },
      ];
    }
  } else if (operationType == 54) {
    // custom_authority_create
    // none in kibana...
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;

    if (account) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        { key: "enabled", params: { enabled: operationObject.enabled } },
        {
          key: "valid_from",
          params: { valid_from: operationObject.valid_from },
        },
        { key: "valid_to", params: { valid_to: operationObject.valid_to } },
        {
          key: "operation_type",
          params: { operation_type: operationObject.operation_type },
        },
        {
          key: "auth",
          params: { auth: JSON.stringify(operationObject.auth) },
        },
        {
          key: "restrictions",
          params: {
            restrictions: JSON.stringify(operationObject.restrictions),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 55) {
    // custom_authority_update
    // not in kibana...
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;

    if (account) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        {
          key: "authority_to_update",
          params: {
            authority_to_update: operationObject.authority_to_update,
          },
        },
        {
          key: "new_enabled",
          params: { new_enabled: operationObject.new_enabled },
        },
        {
          key: "new_valid_from",
          params: { new_valid_from: operationObject.new_valid_from },
        },
        {
          key: "new_valid_to",
          params: { new_valid_to: operationObject.new_valid_to },
        },
        {
          key: "new_auth",
          params: { new_auth: JSON.stringify(operationObject.new_auth) },
        },
        {
          key: "restrictions_to_remove",
          params: {
            restrictions_to_remove: JSON.stringify(
              operationObject.restrictions_to_remove
            ),
          },
        },
        {
          key: "restrictions_to_add",
          params: {
            restrictions_to_add: JSON.stringify(
              operationObject.restrictions_to_add
            ),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 56) {
    // custom_authority_delete
    // not in kibana...
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;

    if (account) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        {
          key: "authority_to_delete",
          params: {
            authority_to_delete: operationObject.authority_to_delete,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 57) {
    // ticket_create
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;

    let _amount;
    if (operationObject.amount_) {
      // temporary fix for some ops having amount_ instead of amount
      _amount = operationObject.amount_;
    } else {
      _amount = operationObject.amount;
    }

    let ticketAsset = assetResults.find(
      (assRes) => assRes.id === _amount.asset_id
    );

    if (account && ticketAsset) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        {
          key: "target_type",
          params: { target_type: operationObject.target_type },
        },
        {
          key: "amount",
          params: {
            amount: formatAsset(
              _amount.amount,
              ticketAsset.symbol,
              ticketAsset.precision
            ),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 58) {
    // ticket_update
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;
    let ticketAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.amount_for_new_target.asset_id
    );

    if (account && ticketAsset) {
      return [
        { key: "ticket", params: { ticket: operationObject.ticket } },
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        {
          key: "target_type",
          params: { target_type: operationObject.target_type },
        },
        {
          key: "amount_for_new_target",
          params: {
            amount_for_new_target: formatAsset(
              operationObject.amount_for_new_target.amount,
              ticketAsset.symbol,
              ticketAsset.precision
            ),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 59) {
    // liquidity_pool_create
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;
    let assetA = assetResults.find(
      (assRes) => assRes.id === operationObject.asset_a
    );
    let assetB = assetResults.find(
      (assRes) => assRes.id === operationObject.asset_b
    );
    let shareAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.share_asset
    );

    if (account && assetA && assetB && shareAsset) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        {
          key: "asset_a",
          params: {
            asset_a: assetA.symbol,
            asset_aOP: operationObject.asset_a,
          },
        },
        {
          key: "asset_b",
          params: {
            asset_b: assetB.symbol,
            asset_bOP: operationObject.asset_b,
          },
        },
        {
          key: "share_asset",
          params: {
            share_asset: shareAsset.symbol,
            share_assetOP: operationObject.share_asset,
          },
        },
        {
          key: "taker_fee_percent",
          params: { taker_fee_percent: operationObject.taker_fee_percent },
        },
        {
          key: "withdrawal_fee_percent",
          params: {
            withdrawal_fee_percent: operationObject.withdrawal_fee_percent,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 60) {
    // liquidity_pool_delete
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;

    if (account) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        { key: "pool_id", params: { pool_id: operationObject.pool } },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 61) {
    // liquidity_pool_deposit
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;
    let amountA = assetResults.find(
      (assRes) => assRes.id === operationObject.amount_a.asset_id
    );
    let amountB = assetResults.find(
      (assRes) => assRes.id === operationObject.amount_b.asset_id
    );

    if (account && amountA && amountB) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        { key: "pool", params: { pool: operationObject.pool } },
        {
          key: "amount_a",
          params: {
            amount_a: formatAsset(
              operationObject.amount_a.amount,
              amountA.symbol,
              amountA.precision
            ),
            amount_aOP: operationObject.amount_a.asset_id,
          },
        },
        {
          key: "amount_b",
          params: {
            amount_b: formatAsset(
              operationObject.amount_b.amount,
              amountB.symbol,
              amountB.precision
            ),
            amount_bOP: operationObject.amount_b.asset_id,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 62) {
    // liquidity_pool_withdraw
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;
    let shareAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.share_amount.asset_id
    );

    if (account && shareAsset) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        { key: "pool", params: { pool: operationObject.pool } },
        {
          key: "share_amount",
          params: {
            share_amount: formatAsset(
              operationObject.share_amount.amount,
              shareAsset.symbol,
              shareAsset.precision
            ),
            share_amountOP: operationObject.share_amount.asset_id,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 63) {
    // liquidity_pool_exchange
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;
    let soldAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.amount_to_sell.asset_id
    );
    let receivedAsset = assetResults.find(
      (assRes) => assRes.id === operationObject.min_to_receive.asset_id
    );

    if (account && soldAsset && receivedAsset) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        { key: "pool", params: { pool: operationObject.pool } },
        {
          key: "amount_to_sell",
          params: {
            amount_to_sell: formatAsset(
              operationObject.amount_to_sell.amount,
              soldAsset.symbol,
              soldAsset.precision
            ),
          },
        },
        {
          key: "min_to_receive",
          params: {
            min_to_receive: formatAsset(
              operationObject.min_to_receive.amount,
              receivedAsset.symbol,
              receivedAsset.precision
            ),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 64) {
    // samet_fund_create
    let ownerAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.owner_account
    ).name;

    if (ownerAccount) {
      return [
        {
          key: "owner_account",
          params: {
            owner_account: ownerAccount,
            owner_accountOP: operationObject.owner_account,
          },
        },
        {
          key: "asset_type",
          params: { asset_type: operationObject.asset_type },
        },
        { key: "balance", params: { balance: operationObject.balance } },
        { key: "fee_rate", params: { fee_rate: operationObject.fee_rate } },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 65) {
    // samet_fund_delete
    let ownerAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.owner_account
    ).name;

    if (ownerAccount) {
      return [
        {
          key: "owner_account",
          params: {
            owner_account: ownerAccount,
            owner_accountOP: operationObject.owner_account,
          },
        },
        { key: "fund_id", params: { fund_id: operationObject.fund_id } },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 66) {
    // samet_fund_update
    let ownerAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.owner_account
    ).name;

    let deltaAmount = operationObject.delta_amount
      ? assetResults.find(
          (assRes) => assRes.id === operationObject.delta_amount.asset_id
        )
      : null;
    if (ownerAccount) {
      return [
        {
          key: "owner_account",
          params: {
            owner_account: ownerAccount,
            owner_accountOP: operationObject.owner_account,
          },
        },
        { key: "fund_id", params: { fund_id: operationObject.fund_id } },
        {
          key: "delta_amount",
          params: {
            delta_amount: deltaAmount
              ? formatAsset(
                  operationObject.delta_amount.amount,
                  deltaAmount.symbol,
                  deltaAmount.precision
                )
              : "{}",
          },
        },
        {
          key: "new_fee_rate",
          params: { new_fee_rate: operationObject.new_fee_rate },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 67) {
    // samet_fund_borrow
    // none in kibana..
    let borrower = accountResults.find(
      (resAcc) => resAcc.id === operationObject.borrower
    ).name;
    let borrowAmount = assetResults.find(
      (assRes) => assRes.id === operationObject.borrow_amount.asset_id
    );

    if (borrower && borrowAmount) {
      return [
        {
          key: "borrower",
          params: {
            borrower: borrower,
            borrowerOP: operationObject.borrower,
          },
        },
        { key: "fund_id", params: { fund_id: operationObject.fund_id } },
        {
          key: "borrow_amount",
          params: {
            borrow_amount: formatAsset(
              operationObject.borrow_amount.amount,
              borrowAmount.symbol,
              borrowAmount.precision
            ),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 68) {
    // samet_fund_repay
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;
    let repayAmount = assetResults.find(
      (assRes) => assRes.id === operationObject.repay_amount.asset_id
    );
    let fundFee = assetResults.find(
      (assRes) => assRes.id === operationObject.fund_fee.asset_id
    );

    if (account && repayAmount && fundFee) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        { key: "fund_id", params: { fund_id: operationObject.fund_id } },
        {
          key: "repay_amount",
          params: {
            repay_amount: formatAsset(
              operationObject.repay_amount.amount,
              repayAmount.symbol,
              repayAmount.precision
            ),
          },
        },
        {
          key: "fund_fee",
          params: {
            fund_fee: formatAsset(
              operationObject.fund_fee.amount,
              fundFee.symbol,
              fundFee.precision
            ),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 69) {
    // credit_offer_create
    let ownerAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.owner_account
    ).name;

    if (ownerAccount) {
      return [
        {
          key: "owner_account",
          params: {
            owner_account: ownerAccount,
            owner_accountOP: operationObject.owner_account,
          },
        },
        {
          key: "asset_type",
          params: { asset_type: operationObject.asset_type },
        },
        { key: "balance", params: { balance: operationObject.balance } },
        { key: "fee_rate", params: { fee_rate: operationObject.fee_rate } },
        {
          key: "max_duration_seconds",
          params: {
            max_duration_seconds: operationObject.max_duration_seconds,
          },
        },
        {
          key: "min_deal_amount",
          params: { min_deal_amount: operationObject.min_deal_amount },
        },
        { key: "enabled", params: { enabled: operationObject.enabled } },
        {
          key: "auto_disable_time",
          params: { auto_disable_time: operationObject.auto_disable_time },
        },
        {
          key: "acceptable_collateral",
          params: {
            acceptable_collateral: JSON.stringify(
              operationObject.acceptable_collateral
            ),
          },
        },
        {
          key: "acceptable_borrowers",
          params: {
            acceptable_borrowers: JSON.stringify(
              operationObject.acceptable_borrowers
            ),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 70) {
    // credit_offer_delete
    let ownerAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.owner_account
    ).name;

    if (ownerAccount) {
      return [
        {
          key: "owner_account",
          params: {
            owner_account: ownerAccount,
            owner_accountOP: operationObject.owner_account,
          },
        },
        { key: "offer_id", params: { offer_id: operationObject.offer_id } },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 71) {
    // credit_offer_update
    let ownerAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.owner_account
    ).name;

    let deltaAmount = operationObject.delta_amount
      ? assetResults.find(
          (assRes) => assRes.id === operationObject.delta_amount.asset_id
        )
      : null;

    if (ownerAccount && deltaAmount) {
      return [
        {
          key: "owner_account",
          params: {
            owner_account: ownerAccount,
            owner_accountOP: operationObject.owner_account,
          },
        },
        { key: "offer_id", params: { offer_id: operationObject.offer_id } },
        {
          key: "delta_amount",
          params: {
            delta_amount: formatAsset(
              operationObject.delta_amount.amount,
              deltaAmount.symbol,
              deltaAmount.precision
            ),
          },
        },
        { key: "fee_rate", params: { fee_rate: operationObject.fee_rate } },
        {
          key: "max_duration_seconds",
          params: {
            max_duration_seconds: operationObject.max_duration_seconds,
          },
        },
        {
          key: "min_deal_amount",
          params: { min_deal_amount: operationObject.min_deal_amount },
        },
        { key: "enabled", params: { enabled: operationObject.enabled } },
        {
          key: "auto_disable_time",
          params: { auto_disable_time: operationObject.auto_disable_time },
        },
        {
          key: "acceptable_collateral",
          params: {
            acceptable_collateral: JSON.stringify(
              operationObject.acceptable_collateral
            ),
          },
        },
        {
          key: "acceptable_borrowers",
          params: {
            acceptable_borrowers: JSON.stringify(
              operationObject.acceptable_borrowers
            ),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 72) {
    // credit_offer_accept
    let borrower = accountResults.find(
      (resAcc) => resAcc.id === operationObject.borrower
    ).name;
    let borrowAmount = assetResults.find(
      (assRes) => assRes.id === operationObject.borrow_amount.asset_id
    );
    let collateral = assetResults.find(
      (assRes) => assRes.id === operationObject.collateral.asset_id
    );

    if (borrower && borrowAmount && collateral) {
      return [
        {
          key: "borrower",
          params: {
            borrower: borrower,
            borrowerOP: operationObject.borrower,
          },
        },
        { key: "offer_id", params: { offer_id: operationObject.offer_id } },
        {
          key: "borrow_amount",
          params: {
            borrow_amount: formatAsset(
              operationObject.borrow_amount.amount,
              borrowAmount.symbol,
              borrowAmount.precision
            ),
          },
        },
        {
          key: "collateral",
          params: {
            collateral: formatAsset(
              operationObject.collateral.amount,
              collateral.symbol,
              collateral.precision
            ),
          },
        },
        {
          key: "max_fee_rate",
          params: { max_fee_rate: operationObject.max_fee_rate },
        },
        {
          key: "min_duration_seconds",
          params: {
            min_duration_seconds: operationObject.min_duration_seconds,
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 73) {
    // credit_deal_repay
    let account = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;
    let repayAmount = assetResults.find(
      (assRes) => assRes.id === operationObject.repay_amount.asset_id
    );
    let creditFee = assetResults.find(
      (assRes) => assRes.id === operationObject.credit_fee.asset_id
    );

    if (account && repayAmount && creditFee) {
      return [
        {
          key: "account",
          params: { account: account, accountOP: operationObject.account },
        },
        { key: "deal_id", params: { deal_id: operationObject.deal_id } },
        {
          key: "repay_amount",
          params: {
            repay_amount: formatAsset(
              operationObject.repay_amount.amount,
              repayAmount.symbol,
              repayAmount.precision
            ),
          },
        },
        {
          key: "credit_fee",
          params: {
            credit_fee: formatAsset(
              operationObject.credit_fee.amount,
              creditFee.symbol,
              creditFee.precision
            ),
          },
        },
        {
          key: "extensions",
          params: {
            extensions: operationObject.extensions
              ? JSON.stringify(operationObject.extensions)
              : "[]",
          },
        },
      ];
    }
  } else if (operationType == 74) {
    // Virtual
    // credit_deal_expired_operation
    let offerOwner = accountResults.find(
      (resAcc) => resAcc.id === operationObject.offer_owner
    )?.name;
    let borrower = accountResults.find(
      (resAcc) => resAcc.id === operationObject.borrower
    )?.name;

    let unpaidAsset = operationObject.unpaid_amount
      ? assetResults.find(
          (assRes) => assRes.id === operationObject.unpaid_amount.asset_id
        )
      : null;
    let collateralAsset = operationObject.collateral
      ? assetResults.find(
          (assRes) => assRes.id === operationObject.collateral.asset_id
        )
      : null;

    if (offerOwner && borrower && unpaidAsset && collateralAsset) {
      return [
        { key: "deal_id", params: { deal_id: operationObject.deal_id } },
        { key: "offer_id", params: { offer_id: operationObject.offer_id } },
        {
          key: "offer_owner",
          params: {
            offer_owner: offerOwner,
            offer_ownerOP: operationObject.offer_owner,
          },
        },
        {
          key: "borrower",
          params: { borrower: borrower, borrowerOP: operationObject.borrower },
        },
        {
          key: "unpaid_amount",
          params: {
            unpaid_amount: formatAsset(
              operationObject.unpaid_amount.amount,
              unpaidAsset.symbol,
              unpaidAsset.precision
            ),
            unpaid_amountOP: operationObject.unpaid_amount.asset_id,
          },
        },
        {
          key: "collateral",
          params: {
            collateral: formatAsset(
              operationObject.collateral.amount,
              collateralAsset.symbol,
              collateralAsset.precision
            ),
            collateralOP: operationObject.collateral.asset_id,
          },
        },
        { key: "fee_rate", params: { fee_rate: operationObject.fee_rate } },
      ];
    }
  } else if (operationType == 75) {
    // liquidity_pool_update_operation
    let _ownerAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;

    return [
      {
        key: "account",
        params: {
          owner_account: _ownerAccount,
          owner_accountOP: operationObject.account,
        },
      },
      { key: "pool", params: { pool_id: operationObject.pool } },
      {
        key: "taker_fee_percent",
        params: { taker_fee_percent: operationObject.taker_fee_percent },
      },
      {
        key: "withdrawal_fee_percent",
        params: {
          withdrawal_fee_percent: operationObject.withdrawal_fee_percent,
        },
      },
      {
        key: "extensions",
        params: { extensions: JSON.stringify(operationObject.extensions) },
      },
    ];
  } else if (operationType == 76) {
    // credit_deal_update_operation
    let _borrowerAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.account
    ).name;

    return [
      {
        key: "account",
        params: {
          account: _borrowerAccount,
          accountOP: operationObject.account,
        },
      },
      { key: "deal_id", params: { deal_id: operationObject.deal_id } },
      {
        key: "auto_repay",
        params: { auto_repay: operationObject.auto_repay },
      },
    ];
  } else if (operationType == 77) {
    // limit_order_update_operation
    let _sellerAccount = accountResults.find(
      (resAcc) => resAcc.id === operationObject.seller
    ).name;

    let _assetToSell = assetResults.find(
      (assRes) => assRes.id === operationObject.delta_amount_to_sell.asset_id
    );

    const rowContents = [
      {
        key: "seller",
        params: {
          seller: _sellerAccount,
          sellerOP: operationObject.seller,
        },
      },
      { key: "order", params: { order: operationObject.order } },
    ];

    if (operationObject.new_price) {
      rowContents.push({
        key: "new_price",
        params: { new_price: operationObject.new_price },
      });
    }

    if (operationObject.delta_amount_to_sell) {
      rowContents.push({
        key: "delta_amount_to_sell",
        params: {
          delta_amount_to_sell: formatAsset(
            operationObject.delta_amount_to_sell.amount,
            _assetToSell.symbol,
            _assetToSell.precision
          ),
        },
      });
    }

    if (operationObject.new_expiration) {
      rowContents.push({
        key: "new_expiration",
        params: { new_expiration: operationObject.new_expiration },
      });
    }

    if (operationObject.on_fill) {
      rowContents.push({
        key: "on_fill",
        params: { on_fill: JSON.stringify(operationObject.on_fill) },
      });
    }

    if (operationObject.extensions) {
      rowContents.push({
        key: "extensions",
        params: {
          extensions: JSON.stringify(operationObject.extensions),
        },
      });
    }

    return rowContents;
  }

  return null; // No matching operation
}
