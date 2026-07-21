/**
 * Single source of truth describing every astro-ui page exposed to the MCP
 * server: its docs, its data, and its operations.
 *
 * category:
 *   "operation" - page can build/submit transactions
 *   "info"      - page only surfaces chain data
 *   "irrelevant"- excluded from MCP exposure (theming/visual config)
 */

const DOCS = "src/content/docs/docs";

export const PAGES = [
  // ---------------- Transfer / exchanging ----------------
  {
    slug: "transfer",
    title: "Transfer",
    section: "transfer",
    href: "/transfer.html",
    category: "operation",
    docs: `${DOCS}/transfer/transfer.mdx`,
    operations: [
      { name: "transfer", label: "Transfer funds" },
      { name: "transfer", label: "Batch transfer (call per recipient)" },
    ],
  },
  {
    slug: "timed_transfer",
    title: "Timed Transfer",
    section: "transfer",
    href: "/timed_transfer.html",
    category: "operation",
    docs: `${DOCS}/transfer/timed_transfer.mdx`,
    operations: [{ name: "transfer", label: "Time-locked transfer" }],
  },
  {
    slug: "htlc",
    title: "HTLC",
    section: "transfer",
    href: "/htlc.html",
    category: "operation",
    docs: `${DOCS}/transfer/htlc.mdx`,
    operations: [
      { name: "htlc_create", label: "Create HTLC" },
      { name: "htlc_redeem", label: "Redeem HTLC" },
      { name: "htlc_extend", label: "Extend HTLC claim period" },
    ],
  },
  {
    slug: "withdraw_permissions",
    title: "Withdraw Permissions",
    section: "transfer",
    href: "/withdraw_permissions.html",
    category: "operation",
    docs: `${DOCS}/transfer/withdraw_permissions.mdx`,
    operations: [
      { name: "withdraw_permission_create", label: "Create withdraw permission" },
      { name: "withdraw_permission_update", label: "Update withdraw permission" },
      { name: "withdraw_permission_claim", label: "Claim withdraw permission" },
      { name: "withdraw_permission_delete", label: "Delete withdraw permission" },
    ],
    accountScoped: true,
  },
  {
    slug: "create_vesting",
    title: "Create Vesting",
    section: "transfer",
    href: "/create_vesting.html",
    category: "operation",
    docs: `${DOCS}/transfer/create_vesting.mdx`,
    operations: [{ name: "vesting_balance_create", label: "Create vesting balance" }],
  },
  {
    slug: "blind_transfers",
    title: "Blind Transfers",
    section: "transfer",
    href: "/blind_transfers.html",
    category: "info",
    docs: `${DOCS}/transfer/blind_transfers.mdx`,
    operations: [{ name: "transfer_to_blind", label: "Blind transfer (stealth)", built: false }],
  },
  {
    slug: "airdrop_calculate",
    title: "Airdrop Calculator",
    section: "transfer",
    href: "/airdrop_calculate.html",
    category: "operation",
    docs: `${DOCS}/transfer/airdrop_calculate.mdx`,
    operations: [{ name: "transfer", label: "Airdrop (batch of transfers)" }],
  },

  // ---------------- Asset creation ----------------
  {
    slug: "create_uia",
    title: "Create UIA",
    section: "assets",
    href: "/create_uia.html",
    category: "operation",
    docs: `${DOCS}/asset-creation/create_uia.mdx`,
    operations: [
      { name: "asset_create", label: "Create user-issued asset" },
      { name: "asset_update", label: "Update user-issued asset" },
    ],
  },
  {
    slug: "create_smartcoin",
    title: "Create Smartcoin",
    section: "assets",
    href: "/create_smartcoin.html",
    category: "operation",
    docs: `${DOCS}/asset-creation/create_smartcoin.mdx`,
    operations: [
      { name: "asset_create", label: "Create market-pegged asset" },
      { name: "asset_update", label: "Update market-pegged asset" },
      { name: "asset_update_feed_producers", label: "Set feed producers" },
      { name: "asset_publish_feed", label: "Publish price feed" },
    ],
  },
  {
    slug: "create_pool",
    title: "Create Liquidity Pool",
    section: "assets",
    href: "/create_pool.html",
    category: "operation",
    docs: `${DOCS}/asset-creation/create_liquidity_pool.mdx`,
    operations: [
      { name: "liquidity_pool_create", label: "Create pool" },
      { name: "liquidity_pool_delete", label: "Delete pool" },
    ],
  },

  // ---------------- Debt / funds ----------------
  {
    slug: "borrow",
    title: "Borrow",
    section: "debt",
    href: "/borrow.html",
    category: "operation",
    docs: `${DOCS}/debt/borrow.mdx`,
    operations: [{ name: "call_order_update", label: "Update debt position" }],
  },
  {
    slug: "lend",
    title: "Lend",
    section: "debt",
    href: "/lend.html",
    category: "operation",
    docs: `${DOCS}/debt/lend.mdx`,
    operations: [
      { name: "samet_fund_create", label: "Create credit fund" },
      { name: "samet_fund_update", label: "Update credit fund" },
      { name: "samet_fund_delete", label: "Delete credit fund" },
      { name: "samet_fund_borrow", label: "Borrow from credit fund" },
      { name: "samet_fund_repay", label: "Repay credit fund" },
      { name: "credit_offer_create", label: "Create credit offer" },
      { name: "credit_offer_accept", label: "Accept credit offer" },
    ],
    accountScoped: true,
  },
  {
    slug: "smartcoins",
    title: "Smartcoins",
    section: "debt",
    href: "/smartcoins.html",
    category: "operation",
    docs: `${DOCS}/debt/smartcoins.mdx`,
    operations: [
      { name: "asset_publish_feed", label: "Publish feed" },
      { name: "asset_update_feed_producers", label: "Update feed producers" },
      { name: "asset_global_settle", label: "Global settle" },
      { name: "asset_settle", label: "Settle" },
      { name: "asset_claim_pool", label: "Claim pool" },
    ],
  },
  {
    slug: "tfunds",
    title: "TradeFunds",
    section: "debt",
    href: "/tfunds.html",
    category: "info",
    docs: `${DOCS}/debt/tfunds.mdx`,
    nanoeffect: { name: "getSameTFunds", args: (c) => [c.chain] },
  },
  {
    slug: "tfund_user",
    title: "TradeFund (user)",
    section: "debt",
    href: "/tfund_user.html",
    category: "operation",
    docs: `${DOCS}/debt/tfunds.mdx`,
    operations: [
      { name: "samet_fund_borrow", label: "Borrow" },
      { name: "samet_fund_repay", label: "Repay" },
    ],
  },
  {
    slug: "settlement",
    title: "Settlement",
    section: "debt",
    href: "/settlement.html",
    category: "operation",
    docs: `${DOCS}/debt/smartcoins.mdx`,
    operations: [
      { name: "asset_settle", label: "Settle" },
      { name: "asset_global_settle", label: "Global settle" },
      { name: "asset_claim_fees", label: "Claim fees" },
    ],
  },

  // ---------------- Accounts ----------------
  {
    slug: "balances",
    title: "Balances",
    section: "accounts",
    href: "/balances.html",
    category: "info",
    docs: `${DOCS}/account/balances.mdx`,
    accountScoped: true,
    nanoeffect: { name: "getAccountBalances", args: (c) => [c.chain, c.account] },
  },
  {
    slug: "open-orders",
    title: "Open Orders",
    section: "accounts",
    href: "/open-orders.html",
    category: "operation",
    docs: `${DOCS}/account/open-orders.mdx`,
    accountScoped: true,
    nanoeffect: { name: "getAccountLimitOrders", args: (c) => [c.chain, c.account] },
    operations: [
      { name: "limit_order_cancel", label: "Cancel limit order" },
      { name: "limit_order_update", label: "Update limit order" },
    ],
  },
  {
    slug: "call-orders",
    title: "Call Orders",
    section: "accounts",
    href: "/call-orders.html",
    category: "info",
    docs: `${DOCS}/account/call-orders.mdx`,
    accountScoped: true,
    nanoeffect: { name: "getUserCallOrders", args: (c) => [c.chain, c.account] },
  },
  {
    slug: "custom_authorities",
    title: "Custom Authorities",
    section: "accounts",
    href: "/custom_authorities.html",
    category: "operation",
    docs: `${DOCS}/account/custom_authorities.mdx`,
    operations: [
      { name: "custom_authority_create", label: "Create custom authority" },
      { name: "custom_authority_update", label: "Update custom authority" },
      { name: "custom_authority_delete", label: "Delete custom authority" },
    ],
    accountScoped: true,
    nanoeffect: { name: "getUserCustomAuthorities", args: (c) => [c.chain, c.account] },
  },
  {
    slug: "favourites",
    title: "Favourites",
    section: "accounts",
    href: "/favourites.html",
    category: "irrelevant",
    docs: `${DOCS}/account/favourites.mdx`,
  },
  {
    slug: "issued_assets",
    title: "Issued Assets",
    section: "accounts",
    href: "/issued_assets.html",
    category: "operation",
    docs: `${DOCS}/account/issued_assets.mdx`,
    operations: [
      { name: "asset_issue", label: "Issue asset" },
      { name: "asset_reserve", label: "Reserve asset" },
      { name: "asset_fund_fee_pool", label: "Fund fee pool" },
      { name: "asset_claim_fees", label: "Claim fees" },
      { name: "asset_update_issuer", label: "Update issuer" },
      { name: "override_transfer", label: "Override transfer" },
    ],
    accountScoped: true,
    nanoeffect: { name: "fetchingIssuedAssets", args: (c) => [c.chain, c.account] },
  },
  {
    slug: "offers",
    title: "Offers",
    section: "accounts",
    href: "/offers.html",
    category: "info",
    docs: `${DOCS}/account/offers.mdx`,
    accountScoped: true,
    nanoeffect: { name: "getCreditOffersByOwner", args: (c) => [c.chain, c.account] },
  },
  {
    slug: "deals",
    title: "Deals",
    section: "accounts",
    href: "/deals.html",
    category: "operation",
    docs: `${DOCS}/account/deals.mdx`,
    accountScoped: true,
    operations: [{ name: "credit_deal_repay", label: "Repay credit deal" }],
  },
  {
    slug: "vesting",
    title: "Vesting",
    section: "accounts",
    href: "/vesting.html",
    category: "operation",
    docs: `${DOCS}/account/vesting.mdx`,
    operations: [
      { name: "vesting_balance_withdraw", label: "Withdraw vesting balance" },
    ],
    accountScoped: true,
    nanoeffect: { name: "getVestingBalances", args: (c) => [c.chain, c.account] },
  },
  {
    slug: "proposals",
    title: "Proposals",
    section: "accounts",
    href: "/proposals.html",
    category: "info",
    docs: `${DOCS}/account/proposals.mdx`,
    operations: [
      { name: "proposal_create", label: "Create proposal", built: false },
      { name: "proposal_update", label: "Update proposal", built: false },
      { name: "proposal_delete", label: "Delete proposal", built: false },
    ],
    accountScoped: true,
    nanoeffect: { name: "getAccountProposals", args: (c) => [c.chain, c.account] },
  },
  {
    slug: "recent-activity",
    title: "Recent Activity",
    section: "accounts",
    href: "/recent-activity.html",
    category: "info",
    docs: `${DOCS}/account/recent-activity.mdx`,
    accountScoped: true,
    nanoeffect: { name: "getAccountActivity", args: (c) => [c.account, 20, 30] },
  },

  // ---------------- Blockchain ----------------
  {
    slug: "blocks",
    title: "Blocks",
    section: "chain",
    href: "/blocks.html",
    category: "irrelevant",
  },
  {
    slug: "custom_pool_overview",
    title: "Custom Pool Overview",
    section: "chain",
    href: "/custom_pool_overview.html",
    category: "info",
    docs: `${DOCS}/blockchain/custom_pool_overview.mdx`,
    nanoeffect: { name: "fetchLiquidityPools", args: (c) => [c.chain] },
  },
  {
    slug: "pools",
    title: "Pools",
    section: "chain",
    href: "/pools.html",
    category: "info",
    docs: `${DOCS}/blockchain/pools.mdx`,
    nanoeffect: { name: "fetchLiquidityPools", args: (c) => [c.chain] },
  },
  {
    slug: "top-markets",
    title: "Top Markets",
    section: "chain",
    href: "/top-markets.html",
    category: "info",
    docs: `${DOCS}/blockchain/top-markets.mdx`,
    nanoeffect: { name: "getTopActiveMarkets", args: (c) => [20, 30] },
  },
  {
    slug: "top-pools",
    title: "Top Pools",
    section: "chain",
    href: "/top-pools.html",
    category: "info",
    docs: `${DOCS}/blockchain/top-pools.mdx`,
    nanoeffect: { name: "getTopPoolSwaps", args: (c) => [20, 30] },
  },

  // ---------------- Governance ----------------
  {
    slug: "vote",
    title: "Vote",
    section: "gov",
    href: "/vote.html",
    category: "operation",
    docs: `${DOCS}/governance/vote.mdx`,
    operations: [{ name: "account_update", label: "Set voting preferences" }],
  },
  {
    slug: "witnesses",
    title: "Witnesses",
    section: "gov",
    href: "/witnesses.html",
    category: "operation",
    docs: `${DOCS}/governance/witnesses.mdx`,
    operations: [
      { name: "account_update", label: "Vote for witnesses" },
      { name: "witness_create", label: "Create witness" },
      { name: "witness_update", label: "Update witness" },
    ],
  },
  {
    slug: "committee",
    title: "Committee",
    section: "gov",
    href: "/committee.html",
    category: "operation",
    docs: `${DOCS}/governance/committee.mdx`,
    operations: [
      { name: "account_update", label: "Vote for committee" },
      { name: "committee_member_create", label: "Create committee member" },
      { name: "committee_member_update", label: "Update committee member" },
    ],
  },
  {
    slug: "governance",
    title: "Governance",
    section: "gov",
    href: "/governance.html",
    category: "info",
    docs: `${DOCS}/governance/index.mdx`,
    nanoeffect: { name: "getWorkerProposals", args: (c) => [c.chain] },
  },
  {
    slug: "create_worker",
    title: "Create Worker",
    section: "gov",
    href: "/create_worker.html",
    category: "operation",
    docs: `${DOCS}/governance/create_worker.mdx`,
    operations: [{ name: "worker_create", label: "Create worker (proposal)" }],
    nanoeffect: { name: "getWorkerProposals", args: (c) => [c.chain] },
  },
  {
    slug: "create_ticket",
    title: "Create Ticket",
    section: "gov",
    href: "/create_ticket.html",
    category: "operation",
    docs: `${DOCS}/governance/create_ticket.mdx`,
    operations: [
      { name: "ticket_create", label: "Create ticket" },
      { name: "ticket_update", label: "Update ticket" },
    ],
  },
  {
    slug: "ticket_leaderboard",
    title: "Ticket Leaderboard",
    section: "gov",
    href: "/ticket_leaderboard.html",
    category: "info",
    docs: `${DOCS}/governance/create_ticket.mdx`,
    nanoeffect: { name: "getTickets", args: (c) => [c.chain, 0] },
  },

  // ---------------- Exchanging ----------------
  {
    slug: "dex",
    title: "DEX",
    section: "exchanging",
    href: "/dex.html",
    category: "info",
    docs: `${DOCS}/exchanging/dex.mdx`,
  },
  {
    slug: "instant_trade",
    title: "Instant Trade",
    section: "exchanging",
    href: "/instant_trade.html",
    category: "operation",
    docs: `${DOCS}/exchanging/instant_trade.mdx`,
    operations: [{ name: "limit_order_create", label: "Place order" }],
  },
  {
    slug: "swap",
    title: "Swap",
    section: "exchanging",
    href: "/swap.html",
    category: "operation",
    docs: `${DOCS}/exchanging/swap.mdx`,
    operations: [{ name: "liquidity_pool_exchange", label: "Swap via pool" }],
  },
  {
    slug: "stake",
    title: "Stake",
    section: "exchanging",
    href: "/stake.html",
    category: "operation",
    docs: `${DOCS}/exchanging/dex.mdx`,
    operations: [
      { name: "liquidity_pool_deposit", label: "Stake in pool" },
      { name: "liquidity_pool_withdraw", label: "Unstake from pool" },
    ],
  },
  {
    slug: "barter",
    title: "Barter",
    section: "exchanging",
    href: "/barter.html",
    category: "operation",
    docs: `${DOCS}/exchanging/barter.mdx`,
    operations: [{ name: "transfer", label: "Barter transfer" }],
  },

  // ---------------- Invoicing ----------------
  {
    slug: "invoice_inventory",
    title: "Invoice Inventory",
    section: "invoicing",
    href: "/invoice_inventory.html",
    category: "irrelevant",
    docs: `${DOCS}/invoicing/invoice_inventory.mdx`,
  },
  {
    slug: "create_invoice",
    title: "Create Invoice",
    section: "invoicing",
    href: "/create_invoice.html",
    category: "irrelevant",
    docs: `${DOCS}/invoicing/create_invoice.mdx`,
  },
  {
    slug: "pay_invoice",
    title: "Pay Invoice",
    section: "invoicing",
    href: "/pay_invoice.html",
    category: "irrelevant",
    docs: `${DOCS}/invoicing/pay_invoice.mdx`,
    operations: [{ name: "transfer", label: "Pay invoice" }],
  },
  {
    slug: "stored_invoices",
    title: "Stored Invoices",
    section: "invoicing",
    href: "/stored_invoices.html",
    category: "irrelevant",
    docs: `${DOCS}/invoicing/stored_invoices.mdx`,
  },

  // ---------------- Settings ----------------
  {
    slug: "account_lists",
    title: "Account Lists",
    section: "settings",
    href: "/account_lists.html",
    category: "operation",
    docs: `${DOCS}/account/index.mdx`,
    operations: [{ name: "account_whitelist", label: "Whitelist/blacklist account" }],
  },
  {
    slug: "blocked-users",
    title: "Blocked Users",
    section: "settings",
    href: "/blocked-users.html",
    category: "irrelevant",
  },
  {
    slug: "ltm",
    title: "Lifetime Membership",
    section: "settings",
    href: "/ltm.html",
    category: "operation",
    docs: `${DOCS}/settings/ltm.mdx`,
    operations: [{ name: "account_upgrade", label: "Upgrade to LTM" }],
  },
  {
    slug: "nodes",
    title: "Nodes",
    section: "settings",
    href: "/nodes.html",
    category: "info",
    docs: `${DOCS}/settings/nodes.mdx`,
  },
  {
    slug: "create_account",
    title: "Create Account",
    section: "settings",
    href: "/create_account.html",
    category: "operation",
    docs: `${DOCS}/settings/create_account.mdx`,
    operations: [{ name: "account_create", label: "Create account" }],
  },

  // ---------------- Irrelevant (excluded) ----------------
  { slug: "theme", title: "Theme", section: "settings", href: "/theme.html", category: "irrelevant" },
  { slug: "page_themes", title: "Page Themes", section: "settings", href: "/page_themes.html", category: "irrelevant" },
  { slug: "visuals", title: "Configure Visuals", section: "settings", href: "/visuals.html", category: "irrelevant" },
  { slug: "configure_visuals", title: "Visuals", section: "settings", href: "/visuals.html", category: "irrelevant" },
];

export const MCP_PAGES = PAGES.filter((p) => p.category !== "irrelevant");

export function getPage(slug) {
  return PAGES.find((p) => p.slug === slug);
}

export function listOperationPages() {
  return MCP_PAGES.filter((p) => p.category === "operation");
}

export function allCataloguedOperations() {
  const set = new Set();
  for (const p of MCP_PAGES) {
    if (p.operations) for (const o of p.operations) set.add(o.name);
  }
  return [...set];
}
