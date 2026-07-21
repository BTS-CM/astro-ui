/**
 * Pure operation builders. Each takes a params object and returns a Bitshares
 * operation object (without a valid fee; fees are filled later by the
 * deeplink/QR finalization step). `account` is the active user id used as the
 * default fee-paying / source account when not explicitly supplied.
 *
 * These mirror the operation structures emitted by the UI components today
 * (which pass them into DeepLinkDialog as trxJSON).
 */

const ZERO_FEE = () => ({ amount: 0, asset_id: "1.3.0" });

const amt = (amount, asset_id = "1.3.0") => ({ amount: Number(amount), asset_id });

function withDefaults(params, primaryAccountField) {
  const account = params.account;
  const out = { fee: ZERO_FEE() };
  if (primaryAccountField && account && !params[primaryAccountField]) {
    out[primaryAccountField] = account;
  }
  return out;
}

export const OPERATION_BUILDERS = {
  transfer: (p) => ({
    ...withDefaults(p, "from"),
    from: p.from || p.account,
    to: p.to,
    amount: amt(p.amount, p.asset_id),
    memo: p.memo || undefined,
  }),

  limit_order_create: (p) => ({
    ...withDefaults(p, "seller"),
    seller: p.seller || p.account,
    amount_to_sell: amt(p.amount_to_sell, p.amount_to_sell_asset),
    min_to_receive: amt(p.min_to_receive, p.min_to_receive_asset),
    expiration: p.expiration,
    fill_or_kill: !!p.fill_or_kill,
    extensions: [],
  }),

  limit_order_cancel: (p) => ({
    ...withDefaults(p, "fee_paying_account"),
    fee_paying_account: p.fee_paying_account || p.account,
    order: p.order,
  }),

  limit_order_update: (p) => ({
    ...withDefaults(p, "fee_paying_account"),
    fee_paying_account: p.fee_paying_account || p.account,
    order: p.order,
    amount_to_sell: amt(p.amount_to_sell, p.amount_to_sell_asset),
    min_to_receive: amt(p.min_to_receive, p.min_to_receive_asset),
    expiration: p.expiration,
    fill_or_kill: !!p.fill_or_kill,
  }),

  call_order_update: (p) => ({
    ...withDefaults(p, "funding_account"),
    funding_account: p.funding_account || p.account,
    delta_collateral: amt(p.delta_collateral, p.delta_collateral_asset),
    delta_debt: amt(p.delta_debt, p.delta_debt_asset),
    new_target_collateral_ratio: p.new_target_collateral_ratio ?? null,
  }),

  account_create: (p) => ({
    ...withDefaults(p, "registrar"),
    registrar: p.registrar || p.account,
    referrer: p.referrer || p.registrar || p.account,
    referrer_percent: p.referrer_percent ?? 0,
    name: p.name,
    owner: p.owner,
    active: p.active,
    options: p.options,
    extensions: [],
  }),

  account_update: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    owner: p.owner || undefined,
    active: p.active || undefined,
    new_options: p.new_options || undefined,
    extensions: [],
  }),

  account_upgrade: (p) => ({
    ...withDefaults(p, "account_to_upgrade"),
    account_to_upgrade: p.account_to_upgrade || p.account,
    upgrade_to_lifetime_member: !!p.upgrade_to_lifetime_member,
  }),

  account_whitelist: (p) => ({
    ...withDefaults(p, "authorizing_account"),
    authorizing_account: p.authorizing_account || p.account,
    listed_account: p.listed_account,
    new_listing: p.new_listing,
  }),

  asset_create: (p) => ({
    ...withDefaults(p, "issuer"),
    issuer: p.issuer || p.account,
    symbol: p.symbol,
    precision: p.precision ?? 5,
    common_options: p.common_options,
    bitasset_opts: p.bitasset_opts || undefined,
    is_prediction_market: !!p.is_prediction_market,
    extensions: [],
  }),

  asset_update: (p) => ({
    ...withDefaults(p, "issuer"),
    issuer: p.issuer || p.account,
    asset_to_update: p.asset_to_update,
    new_issuer: p.new_issuer || undefined,
    new_options: p.new_options,
    extensions: [],
  }),

  asset_issue: (p) => ({
    ...withDefaults(p, "issuer"),
    issuer: p.issuer || p.account,
    asset_to_issue: amt(p.amount, p.asset_id),
    issue_to_account: p.issue_to_account,
    memo: p.memo || undefined,
    extensions: [],
  }),

  asset_reserve: (p) => ({
    ...withDefaults(p, "payer"),
    payer: p.payer || p.account,
    amount_to_reserve: amt(p.amount, p.asset_id),
    extensions: [],
  }),

  asset_fund_fee_pool: (p) => ({
    ...withDefaults(p, "from_account"),
    from_account: p.from_account || p.account,
    asset_id: p.asset_id,
    amount: Number(p.amount),
    extensions: [],
  }),

  asset_claim_fees: (p) => ({
    ...withDefaults(p, "issuer"),
    issuer: p.issuer || p.account,
    amount_to_claim: amt(p.amount, p.asset_id),
    extensions: [],
  }),

  asset_settle: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    amount: amt(p.amount, p.asset_id),
    extensions: [],
  }),

  asset_global_settle: (p) => ({
    ...withDefaults(p, "issuer"),
    issuer: p.issuer || p.account,
    asset_to_settle: p.asset_to_settle,
    settle_price: p.settle_price,
    extensions: [],
  }),

  asset_publish_feed: (p) => ({
    ...withDefaults(p, "publisher"),
    publisher: p.publisher || p.account,
    asset_id: p.asset_id,
    feed: p.feed,
    extensions: [],
  }),

  asset_update_feed_producers: (p) => ({
    ...withDefaults(p, "issuer"),
    issuer: p.issuer || p.account,
    asset_to_update: p.asset_to_update,
    new_feed_producers: p.new_feed_producers || [],
    extensions: [],
  }),

  asset_update_issuer: (p) => ({
    ...withDefaults(p, "issuer"),
    issuer: p.issuer || p.account,
    asset_to_update: p.asset_to_update,
    new_issuer: p.new_issuer,
    extensions: [],
  }),

  override_transfer: (p) => ({
    ...withDefaults(p, "issuer"),
    issuer: p.issuer || p.account,
    from: p.from,
    to: p.to,
    amount: amt(p.amount, p.asset_id),
    memo: p.memo || undefined,
    extensions: [],
  }),

  htlc_create: (p) => ({
    ...withDefaults(p, "from"),
    from: p.from || p.account,
    to: p.to,
    amount: amt(p.amount, p.asset_id),
    preimages: p.preimages || [],
    claim_period_seconds: p.claim_period_seconds,
    extensions: [],
  }),

  htlc_redeem: (p) => ({
    ...withDefaults(p, "redeemer"),
    redeemer: p.redeemer || p.account,
    htlc_id: p.htlc_id,
    preimage: p.preimage,
    extensions: [],
  }),

  htlc_extend: (p) => ({
    ...withDefaults(p, "fee_paying_account"),
    fee_paying_account: p.fee_paying_account || p.account,
    htlc_id: p.htlc_id,
    new_claim_period_seconds: p.new_claim_period_seconds,
    extensions: [],
  }),

  vesting_balance_create: (p) => ({
    ...withDefaults(p, "creator"),
    creator: p.creator || p.account,
    owner: p.owner || p.account,
    amount: amt(p.amount, p.asset_id),
    policy: p.policy,
    extensions: [],
  }),

  vesting_balance_withdraw: (p) => ({
    ...withDefaults(p, "owner"),
    owner: p.owner || p.account,
    vesting_balance: p.vesting_balance,
    amount: amt(p.amount, p.asset_id),
    extensions: [],
  }),

  ticket_create: (p) => ({
    ...withDefaults(p, "target"),
    target: p.target || p.account,
    amount: amt(p.amount, p.asset_id),
    target_type: p.target_type ?? 0,
    extensions: [],
  }),

  ticket_update: (p) => ({
    ...withDefaults(p, "target"),
    target: p.target || p.account,
    ticket: p.ticket,
    amount: amt(p.amount, p.asset_id),
    extensions: [],
  }),

  liquidity_pool_create: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    asset_a: p.asset_a,
    asset_b: p.asset_b,
    trade_fee_percent: p.trade_fee_percent,
    extensions: [],
  }),

  liquidity_pool_delete: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    pool: p.pool,
    extensions: [],
  }),

  liquidity_pool_deposit: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    pool: p.pool,
    amount_a: amt(p.amount_a, p.asset_a),
    amount_b: amt(p.amount_b, p.asset_b),
    extensions: [],
  }),

  liquidity_pool_withdraw: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    pool: p.pool,
    share_amount: amt(p.share_amount, p.share_asset_id),
    extensions: [],
  }),

  liquidity_pool_exchange: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    pool: p.pool,
    amount_to_sell: amt(p.amount_to_sell, p.amount_to_sell_asset),
    min_to_receive: amt(p.min_to_receive, p.min_to_receive_asset),
    extensions: [],
  }),

  custom_authority_create: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    enabled: !!p.enabled,
    valid_from: p.valid_from || undefined,
    expiration_time: p.expiration_time || undefined,
    operation_type: p.operation_type,
    auth_context: p.auth_context || undefined,
    auth_ref: p.auth_ref || undefined,
    restrictions: p.restrictions || [],
    extensions: [],
  }),

  custom_authority_update: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    custom_authority: p.custom_authority,
    enabled: p.enabled === undefined ? undefined : !!p.enabled,
    valid_from: p.valid_from || undefined,
    expiration_time: p.expiration_time || undefined,
    operation_type: p.operation_type || undefined,
    auth_context: p.auth_context || undefined,
    auth_ref: p.auth_ref || undefined,
    restrictions: p.restrictions || undefined,
    extensions: [],
  }),

  custom_authority_delete: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    custom_authority: p.custom_authority,
    extensions: [],
  }),

  samet_fund_create: (p) => ({
    ...withDefaults(p, "owner"),
    owner: p.owner || p.account,
    asset_type: p.asset_type,
    balance: Number(p.balance),
    fee_rate: p.fee_rate,
    max_duration_seconds: p.max_duration_seconds,
    extensions: [],
  }),

  samet_fund_delete: (p) => ({
    ...withDefaults(p, "owner"),
    owner: p.owner || p.account,
    fund_id: p.fund_id,
    extensions: [],
  }),

  samet_fund_update: (p) => ({
    ...withDefaults(p, "owner"),
    owner: p.owner || p.account,
    fund_id: p.fund_id,
    delta_balance: Number(p.delta_balance),
    new_fee_rate: p.new_fee_rate,
    extensions: [],
  }),

  samet_fund_borrow: (p) => ({
    ...withDefaults(p, "borrower"),
    borrower: p.borrower || p.account,
    fund_id: p.fund_id,
    borrow_amount: amt(p.borrow_amount, p.asset_type),
    extensions: [],
  }),

  samet_fund_repay: (p) => ({
    ...withDefaults(p, "repayer"),
    repayer: p.repayer || p.account,
    fund_id: p.fund_id,
    repayment: amt(p.repayment, p.asset_type),
    extensions: [],
  }),

  credit_offer_create: (p) => ({
    ...withDefaults(p, "owner"),
    owner: p.owner || p.account,
    asset: p.asset,
    balance: amt(p.balance, p.asset),
    fee_rate: p.fee_rate,
    max_duration_seconds: p.max_duration_seconds,
    min_deal_amount: amt(p.min_deal_amount, p.asset),
    enabled: !!p.enabled,
    extensions: [],
  }),

  withdraw_permission_create: (p) => ({
    ...withDefaults(p, "withdraw_from_account"),
    withdraw_from_account: p.withdraw_from_account || p.account,
    authorized_account: p.authorized_account,
    withdrawal_limit: amt(p.withdrawal_limit, p.withdrawal_limit_asset),
    withdrawal_period_sec: p.withdrawal_period_sec,
    periods_until_expiration: p.periods_until_expiration,
    period_start_time: p.period_start_time,
    extensions: [],
  }),

  withdraw_permission_update: (p) => ({
    ...withDefaults(p, "withdraw_from_account"),
    withdraw_from_account: p.withdraw_from_account || p.account,
    authorized_account: p.authorized_account,
    withdrawal_limit: amt(p.withdrawal_limit, p.withdrawal_limit_asset),
    withdrawal_period_sec: p.withdrawal_period_sec,
    periods_until_expiration: p.periods_until_expiration,
    period_start_time: p.period_start_time,
    extensions: [],
  }),

  withdraw_permission_claim: (p) => ({
    ...withDefaults(p, "withdraw_from_account"),
    withdraw_permission: p.withdraw_permission,
    withdraw_from_account: p.withdraw_from_account || p.account,
    bound_account: p.bound_account,
    amount: amt(p.amount, p.asset_id),
    memo: p.memo || undefined,
    extensions: [],
  }),

  withdraw_permission_delete: (p) => ({
    ...withDefaults(p, "withdraw_from_account"),
    withdraw_permission: p.withdraw_permission,
    withdraw_from_account: p.withdraw_from_account || p.account,
    authorized_account: p.authorized_account,
    extensions: [],
  }),

  witness_create: (p) => ({
    ...withDefaults(p, "witness_account"),
    witness_account: p.witness_account || p.account,
    url: p.url,
    block_signing_key: p.block_signing_key,
    extensions: [],
  }),

  witness_update: (p) => ({
    ...withDefaults(p, "witness_account"),
    witness: p.witness,
    witness_account: p.witness_account || p.account,
    new_url: p.new_url,
    new_signing_key: p.new_signing_key || undefined,
    extensions: [],
  }),

  committee_member_create: (p) => ({
    ...withDefaults(p, "committee_member_account"),
    committee_member_account: p.committee_member_account || p.account,
    url: p.url,
    extensions: [],
  }),

  committee_member_update: (p) => ({
    ...withDefaults(p, "committee_member_account"),
    committee_member: p.committee_member,
    committee_member_account: p.committee_member_account || p.account,
    new_url: p.new_url,
    extensions: [],
  }),

  credit_offer_accept: (p) => ({
    ...withDefaults(p, "borrower"),
    borrower: p.borrower || p.account,
    offer_id: p.offer_id,
    borrow_amount: amt(p.borrow_amount, p.borrow_asset),
    collateral: amt(p.collateral, p.collateral_asset),
    max_fee_rate: p.max_fee_rate,
    min_duration_seconds: p.min_duration_seconds,
    extensions: [],
  }),

  credit_deal_repay: (p) => ({
    ...withDefaults(p, "account"),
    account: p.account,
    deal_id: p.deal_id,
    repay_amount: amt(p.repay_amount, p.repay_asset),
    credit_fee: amt(p.credit_fee, p.credit_fee_asset || p.repay_asset),
    extensions: [],
  }),

  asset_claim_pool: (p) => ({
    ...withDefaults(p, "issuer"),
    issuer: p.issuer || p.account,
    asset_id: p.asset_id,
    amount_to_claim: amt(p.amount, p.amount_asset_id || p.asset_id),
    extensions: [],
  }),

  worker_create: (p) => ({
    ...withDefaults(p, "owner"),
    owner: p.owner || p.account,
    work_begin_date: p.work_begin_date,
    work_end_date: p.work_end_date,
    daily_pay: Number(p.daily_pay),
    name: p.name,
    url: p.url,
    initializer: p.initializer,
    extensions: [],
  }),
};

export function hasBuilder(operationName) {
  return typeof OPERATION_BUILDERS[operationName] === "function";
}

const ACCOUNT_FIELDS = new Set([
  "from", "to", "seller", "borrower", "repayer", "issuer", "registrar", "referrer",
  "account", "account_to_upgrade", "authorizing_account", "listed_account",
  "withdraw_from_account", "authorized_account", "bound_account", "witness_account",
  "witness", "committee_member_account", "committee_member", "target", "owner",
  "creator", "payer", "funding_account", "fee_paying_account",
]);

const AMOUNT_RE = /amount|balance|collateral|debt|repayment|borrow|fee|daily_pay|withdrawal_limit|share_amount|delta_collateral|delta_debt/i;

/**
 * Introspect a builder to report the parameter fields it reads, classifying
 * which are raw-amount fields (need ×10^precision) and which are account/asset ids.
 * This lets an MCP client learn exactly what to pass to build_operation.
 */
export function describeOperation(name) {
  const fn = OPERATION_BUILDERS[name];
  if (!fn) throw new Error(`No operation builder implemented for "${name}"`);
  const accessed = new Set();
  const rec = (k) => {
    if (typeof k === "string") accessed.add(k);
    return undefined;
  };
  const proxy = new Proxy(function () {}, {
    get: (_t, k) => rec(k),
    apply: () => undefined,
    set: () => true,
    has: (_t, k) => (rec(k), true),
  });
  try {
    fn(proxy);
  } catch (e) {
    /* ignore — we only care about property reads */
  }
  const fields = [...accessed];
  const amountFields = fields.filter(
    (f) => fields.includes(f + "_asset") || AMOUNT_RE.test(f)
  );
  return {
    name,
    feeNote:
      "The builder leaves `fee` as zero. It is filled automatically by generate_deeplink / prepare_transaction.",
    fields: fields.map((f) => ({
      name: f,
      kind: f === "asset_id" || f === "asset" || f.endsWith("_asset")
        ? "asset_id"
        : ACCOUNT_FIELDS.has(f)
        ? "account_id"
        : amountFields.includes(f)
        ? "amount (RAW integer — multiply human value by 10^asset_precision)"
        : "other",
    })),
    amountFields,
  };
}

export function buildOperation(operationName, params) {
  const fn = OPERATION_BUILDERS[operationName];
  if (!fn) {
    throw new Error(`No operation builder implemented for "${operationName}"`);
  }
  return fn(params);
}

export const BUILT_OPERATION_NAMES = Object.keys(OPERATION_BUILDERS);
