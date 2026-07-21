import http from "node:http";
import fs from "node:fs";
import path from "node:path";

import btsAllAssets from "../data/bitshares/allAssets.json";
import testnetAllAssets from "../data/bitshares_testnet/allAssets.json";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { MCP_PAGES, getPage, allCataloguedOperations } from "./registry.js";
import { buildOperation, hasBuilder, BUILT_OPERATION_NAMES, describeOperation } from "./operations.js";
import * as gateway from "./gateway.js";
import { listNanoEffects, callNanoEffect, hasNanoEffect } from "./nanoeffects.js";

const CHAIN_KEY_BY_ID = {
  "4018d7844c78f6a6c41c6a552b898022310fc5dec06da467ee7905a8dad512c8": "bitshares",
  "39f5e2ede1f8bc1a3a54a7914414e3779e33193f1f5693510e73cb7a87617447": "bitshares_testnet",
};

function chainKey(chainOrId) {
  if (!chainOrId) return "bitshares";
  if (CHAIN_KEY_BY_ID[chainOrId]) return CHAIN_KEY_BY_ID[chainOrId];
  return chainOrId === "bitshares_testnet" ? "bitshares_testnet" : "bitshares";
}

const MCP_GUIDE = `# astro-ui MCP — Agent Orientation

## 1. The golden rule: amounts are RAW integers
Every amount the chain stores, and every amount a builder accepts, is a RAW integer
(satoshi-scale). To go human <-> raw you need the asset's \`precision\`:
- \`search_assets("BTS")\` -> find asset id + precision by ticker using astro-ui's CACHED index (instant, no node call). Always start here when you only know a symbol.
- \`get_asset(["1.3.0","1.3.1"])\` -> full LIVE metadata { id, symbol, precision, issuer, ... }
- \`to_raw_amount("1.3.0", 1.5)\` -> 150000   (1.5 * 10^5)
- \`from_raw_amount("1.3.0", 150000)\` -> 1.5
Prices in order books / tickers are also raw base/quote pairs, each with its OWN
precision. Human price = (base/10^base_prec) / (quote/10^quote_prec).

## 2. Discover what exists
- \`list_pages\`            -> every page + its operation names
- \`list_nanoeffects\`     -> every raw data reader (with arg names)
- \`list_tools\` (MCP)    -> all tools with descriptions
- \`get_page_docs(slug)\`  -> the page's documentation
- \`describe_operation(name)\` -> exact parameter fields for an operation, and
                           which fields are RAW amounts / asset ids / account ids

## 3. Read chain data
- \`get_page_data(slug)\`        -> live data a page surfaces (raw amounts)
- \`get_nanoeffect(name,args)\` -> any raw data reader directly
- \`search_assets(query)\`       -> discover asset ids + precision from astro-ui's cached index (instant)
- \`get_objects(ids)\`           -> assets 1.3.x, accounts 1.2.x, ...
- \`get_accounts(names)\`        -> full account records (balances, orders, ...)
- \`query(chain,api,method,params)\` -> ANY bitshares API call (escape hatch)
- \`get_active_node\` / \`set_active_node\` -> which node you read from

## 3b. Smartcoin borrowability (CDP / borrow-lend)
To open, top up or settle a CDP you MUST check the smartcoin is borrowable:
- \`get_bitasset("BITUSD")\` -> { status: alive|healthy|ill|dead, borrowable, reasons, backing_symbol, feed_price_human }
- \`get_smartcoins()\`        -> every smartcoin classified at once (counts + list)
Only act when \`borrowable === true\`. \`dead\` = globally settled (no borrowing);
\`ill\` = no valid/stale price feed (borrowing disabled in the UI too);
\`healthy\` = fresh feed; \`alive\` = feed present but freshness not verified.
Back the CDP with the returned \`backing_asset_id\` (e.g. bitUSD -> BTS) and build a
\`call_order_update\` operation with RAW collateral/debt amounts.

## 3c. Market data (DEX / order book / trade history)
- \`get_page_data("dex")\`                           -> top traded markets
- \`get_page_data("dex", null, chain, node, "BTS", "USD")\` -> full order book + trade history + ticker + spread for a pair (asset=base, asset2=quote)
- \`get_page_data("instant_trade", null, chain, node, "USD", "BTS")\` -> trade execution summary: order book depth, max tradeable amounts, unique sellers, spread, fees (asset=quote, asset2=base)
- \`get_nanoeffect("getMarketOrderBook", [...])\`     -> raw bids/asks
- \`get_nanoeffect("getMarketTradeHistory", [...])\`  -> recent fills
- \`get_nanoeffect("getTicker", [...])\`              -> 24h ticker

## 3d. Governance (witnesses / committee / workers)
- \`get_page_data("witnesses")\`  -> ranked list: { name, total_votes, active, last_block_time, total_missed, rank }
- \`get_page_data("committee")\`  -> ranked list: { name, total_votes, active, rank }
- \`get_page_data("governance")\` -> active worker proposals
- \`get_page_data("create_worker")\` -> worker proposals (for reference when creating)

## 3e. Credit deals & withdraw permissions
- \`get_page_data("deals")\`              -> { borrowerDeals, lenderDeals } for the active account
- \`compute_repayment(deal, repayAmount, debtPrecision)\` -> fee/collateral breakdown
- \`get_page_data("withdraw_permissions")\` -> { receiving, paying } for the active account

## 3f. Chain parameters & enrichment
- \`get_chain_parameters()\`    -> { maxBytes, transferFeeSat, pricePerKbyteSat }
- \`classify_call_order(...)\`  -> { collateralRatio, health: ok|warn|danger, feedPrice, mcr }
- \`compute_order_expiry(expiration)\` -> { text: "5d 3h 22m", status: healthy|soon|imminent|expired }

## 4. Build an operation
1. \`describe_operation("limit_order_create")\` to learn the fields.
2. \`build_operation("limit_order_create", { seller, amount_to_sell, amount_to_sell_asset, min_to_receive, min_to_receive_asset, expiration, fill_or_kill })\`
   -> returns { operationNames, trxJSON }. Amounts MUST be RAW integers
      (use to_raw_amount first). Fee is left zero; it is filled for you later.
The active account is the default payer/source unless you override \`account\`.

## 5. Broadcast — pick ONE path
A) Beet / BeetEOS wallet (no key needed by the agent):
   \`generate_deeplink(operationNames, trxJSON)\` -> { beet_uri, beeteos_uri, raw_payload }
   Open beet_uri in Beet (desktop) or beeteos_uri in BeetEOS; the USER signs there.
   (If you need a scannable QR of that link, render one yourself from beet_uri — the
   MCP server does not emit QR images.)
B) Self-sign & direct broadcast (agent signs with the user's key):
   \`prepare_transaction(operationNames, trxJSON)\` -> { transaction, chain_id, ref_block_num, ref_block_prefix }
   Sign \`transaction\` with bts (PrivateKey.sign(Buffer.from(chain_id + "\x00" + ...)))
   then \`query(chain,"network_broadcast","broadcast_transaction",[signedTx])\`.
   NOTE: \`export_operation_json\` is an OFFLINE artifact only — it is NOT broadcast-ready
   (no fee, no reference block). Always use prepare_transaction for direct broadcast.

## 6. Fees & the active node
- Fees are auto-filled by generate_deeplink / prepare_transaction.
- All reads/broadcasts default to the active node (\`get_active_node\`); override per-call with
  \`nodeURL\`, or switch globally with \`set_active_node\`.

## 7. Minimal DEX arbitrage loop (the money use-case)
\`set_current_user\` -> \`get_nanoeffect("getMarketOrderBook",["bitshares","1.3.0","1.3.1"])\`
-> humanize with from_raw_amount + get_asset precision -> compute an edge ->
\`to_raw_amount\` both sides -> \`build_operation("limit_order_create",...)\`
-> \`generate_deeplink(...)\` for the user to sign in Beet (or \`prepare_transaction\` to self-sign).
Monitor fills via \`get_accounts\` / \`get_nanoeffect("getAccountLimitOrders",...)\`.`;

function findDocs(slug) {
  const page = getPage(slug);
  if (!page || !page.docs) return null;
  const candidates = [
    path.resolve(process.cwd(), page.docs),
    path.resolve(__dirname, "..", "..", "src", "content", "docs", "docs", path.basename(page.docs)),
    path.resolve(__dirname, "..", "..", "..", "src", "content", "docs", "docs", path.basename(page.docs)),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function generatedDocs(page) {
  const ops = page.operations
    ? page.operations.map((o) => `- ${o.label} (\`${o.name}\`)`).join("\n")
    : "";
  return [
    `# ${page.title}`,
    "",
    `Section: ${page.section}`,
    `Category: ${page.category}`,
    page.accountScoped ? "Requires an active account context." : "",
    "",
    ops ? "## Operations\n" + ops : "This page is informational; it surfaces chain data. Use `get_page_data` or `get_objects` / `get_accounts` to read it.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function readDocs(slug) {
  const file = findDocs(slug);
  if (file) return fs.readFileSync(file, "utf-8");
  const page = getPage(slug);
  return generatedDocs(page || { title: slug, section: "?", category: "info" });
}

function activeAccount(account, currentUser) {
  if (account) return account;
  if (currentUser && currentUser.id) return currentUser.id;
  return null;
}

async function bitassetReport(chain, assetId, nodeURL) {
  const objs = await gateway.getObjects(chain, [assetId], nodeURL);
  const asset = objs && objs[0];
  if (!asset) throw new Error(`Asset ${assetId} not found`);
  const bitassetId = asset.bitasset_data_id;
  if (!bitassetId) {
    return {
      asset_id: assetId,
      symbol: asset.symbol,
      is_bitasset: false,
      note: "Not a market-pegged asset / smartcoin (no bitasset_data_id).",
    };
  }
  const ba = await gateway.getObjects(chain, [bitassetId], nodeURL);
  const bitasset = ba && ba[0];
  const sp = bitasset && bitasset.current_feed && bitasset.current_feed.settlement_price;
  let backingId = null;
  if (sp) backingId = sp.base.asset_id === assetId ? sp.quote.asset_id : sp.base.asset_id;
  let backing = null;
  if (backingId) {
    const bo = await gateway.getObjects(chain, [backingId], nodeURL);
    backing = bo && bo[0];
  }
  const feedValid = !!(sp && parseInt(sp.base.amount, 10) !== 0 && parseInt(sp.quote.amount, 10) !== 0);
  const settled = !!(bitasset && bitasset.settlement_fund && parseInt(bitasset.settlement_fund, 10) > 0);
  let feedPriceHuman = null;
  if (feedValid && backing) {
    const baseHuman = parseInt(sp.base.amount, 10) / 10 ** (sp.base.asset_id === assetId ? asset.precision : backing.precision);
    const quoteHuman = parseInt(sp.quote.amount, 10) / 10 ** (sp.quote.asset_id === assetId ? asset.precision : backing.precision);
    feedPriceHuman = quoteHuman / baseHuman;
  }
  const feedPub = bitasset && bitasset.current_feed && bitasset.current_feed_publication_time;
  let feedFresh = null;
  if (feedPub && bitasset.options && bitasset.options.feed_lifetime_sec) {
    feedFresh = Date.now() / 1000 - feedPub <= bitasset.options.feed_lifetime_sec;
  }
  let status, borrowable, reasons = [];
  if (settled) {
    status = "dead";
    borrowable = false;
    reasons.push("globally settled (settlement_fund > 0)");
  } else if (!feedValid) {
    status = "ill";
    borrowable = false;
    reasons.push("no valid price feed (settlement_price missing or zero)");
  } else {
    borrowable = true;
    status = feedFresh === false ? "ill" : feedFresh === true ? "healthy" : "alive";
    if (feedFresh === false) reasons.push("price feed older than feed_lifetime_sec");
  }
  return {
    asset_id: assetId,
    symbol: asset.symbol,
    precision: asset.precision,
    is_bitasset: true,
    backing_asset_id: backingId,
    backing_symbol: backing && backing.symbol,
    backing_precision: backing && backing.precision,
    bitasset_data_id: bitassetId,
    current_feed: bitasset.current_feed,
    options: bitasset.options,
    settlement_fund: bitasset.settlement_fund,
    individual_settlement_fund: bitasset.individual_settlement_fund,
    feed_price_human: feedPriceHuman,
    feed_publication_time: feedPub,
    status,
    borrowable,
    reasons,
  };
}

// Classify a bitasset's borrowability from already-fetched objects.
// `asset` is the smartcoin asset object, `bitasset` its bitasset_data object,
// `backing` the short-backing asset object (may be null if not fetched).
function classifyBitasset(asset, bitasset, backing) {
  const sp = bitasset && bitasset.current_feed && bitasset.current_feed.settlement_price;
  let backingId = null;
  if (sp) backingId = sp.base.asset_id === asset.id ? sp.quote.asset_id : sp.base.asset_id;
  const feedValid = !!(sp && parseInt(sp.base.amount, 10) !== 0 && parseInt(sp.quote.amount, 10) !== 0);
  const settled = !!(bitasset && bitasset.settlement_fund && parseInt(bitasset.settlement_fund, 10) > 0);
  let feedPriceHuman = null;
  if (feedValid && backing) {
    const baseHuman = parseInt(sp.base.amount, 10) / 10 ** (sp.base.asset_id === asset.id ? asset.precision : backing.precision);
    const quoteHuman = parseInt(sp.quote.amount, 10) / 10 ** (sp.quote.asset_id === asset.id ? asset.precision : backing.precision);
    feedPriceHuman = quoteHuman / baseHuman;
  }
  const feedPub = bitasset && bitasset.current_feed && bitasset.current_feed_publication_time;
  let feedFresh = null;
  if (feedPub && bitasset.options && bitasset.options.feed_lifetime_sec) {
    feedFresh = Date.now() / 1000 - feedPub <= bitasset.options.feed_lifetime_sec;
  }
  let status, borrowable, reasons = [];
  if (settled) {
    status = "dead";
    borrowable = false;
    reasons.push("globally settled (settlement_fund > 0)");
  } else if (!feedValid) {
    status = "ill";
    borrowable = false;
    reasons.push("no valid price feed (settlement_price missing or zero)");
  } else {
    borrowable = true;
    status = feedFresh === false ? "ill" : feedFresh === true ? "healthy" : "alive";
    if (feedFresh === false) reasons.push("price feed older than feed_lifetime_sec");
  }
  return {
    asset_id: asset.id,
    symbol: asset.symbol,
    precision: asset.precision,
    is_bitasset: true,
    backing_asset_id: backingId,
    backing_symbol: backing && backing.symbol,
    backing_precision: backing && backing.precision,
    bitasset_data_id: asset.bitasset_data_id,
    feed_price_human: feedPriceHuman,
    feed_publication_time: feedPub,
    status,
    borrowable,
    reasons,
  };
}

// Enumerate every smartcoin (object space 2.4) on a chain and classify each
// in batched reads so a single call tells the agent which are alive/dead/healthy/ill.
async function listSmartcoinsReport(chain, nodeURL) {
  const c = chainKey(chain);
  const node = nodeURL || getActiveNode(c);
  const max = await gateway.query(c, "database", "get_next_object_id", [2, 4, false], node).catch(() => "2.4.0");
  const count = parseInt(String(max).split(".")[2], 10);
  if (!count || count < 0) return [];
  const ids = Array.from({ length: count }, (_, i) => `2.4.${i}`);
  const bitassets = await gateway.getObjects(c, ids, node);
  const valid = (bitassets || []).filter((x) => x && x.asset_id);
  const assetIds = valid.map((b) => b.asset_id);
  const backingIds = [...new Set(valid.map((b) => b.options && b.options.short_backing_asset).filter(Boolean))];
  const [assets, backings] = await Promise.all([
    gateway.getObjects(c, assetIds, node),
    backingIds.length ? gateway.getObjects(c, backingIds, node) : Promise.resolve([]),
  ]);
  const assetById = {};
  (assets || []).forEach((a) => { if (a) assetById[a.id] = a; });
  const backingById = {};
  (backings || []).forEach((a) => { if (a) backingById[a.id] = a; });
  return valid
    .filter((b) => assetById[b.asset_id])
    .map((b) => classifyBitasset(assetById[b.asset_id], b, backingById[b.options && b.options.short_backing_asset]));
}

// astro-ui ships a pre-built asset index (id/symbol/precision/issuer) that the
// UI uses for instant search. Mirror that here so agents get rapid, disk+node-free
// lookup of asset ids/precisions, then do live node lookups only for dynamic data.
const ASSET_CACHE = {
  bitshares: btsAllAssets,
  bitshares_testnet: testnetAllAssets,
};

function searchAssets(chain, query, limit = 50) {
  const c = chainKey(chain);
  const list = ASSET_CACHE[c] || [];
  const q = String(query == null ? "" : query).trim().toLowerCase();
  if (!q) return list.slice(0, limit).map(stripAsset);
  const scored = [];
  for (const a of list) {
    const symbol = (a.symbol || "").toLowerCase();
    const id = (a.id || "").toLowerCase();
    let score = -1;
    if (id === q) score = 0;
    else if (symbol === q) score = 1;
    else if (symbol.startsWith(q)) score = 2;
    else if (symbol.includes(q)) score = 3;
    else if (id.includes(q)) score = 4;
    if (score >= 0) scored.push({ score, asset: a });
  }
  scored.sort((x, y) => x.score - y.score);
  return scored.slice(0, limit).map((s) => stripAsset(s.asset));
}

function stripAsset(a) {
  return { id: a.id, symbol: a.symbol, precision: a.precision, issuer: a.issuer };
}

// --- Enrichment helpers: replicate UI client-side computations for agents ---

function classifyCallOrder(callOrder, bitasset, collateralPrecision, debtPrecision) {
  if (!callOrder || !bitasset) return null;
  const sp = bitasset.current_feed && bitasset.current_feed.settlement_price;
  if (!sp) return { error: "no settlement price" };
  const baseAmt = parseInt(sp.base.amount, 10);
  const quoteAmt = parseInt(sp.quote.amount, 10);
  if (!baseAmt || !quoteAmt) return { error: "invalid settlement price" };
  const isBaseDebt = sp.base.asset_id === callOrder.debt_type;
  const feedPrice = isBaseDebt
    ? (quoteAmt / 10 ** collateralPrecision) / (baseAmt / 10 ** debtPrecision)
    : (baseAmt / 10 ** debtPrecision) / (quoteAmt / 10 ** collateralPrecision);
  const collateral = parseInt(callOrder.collateral, 10) / 10 ** collateralPrecision;
  const debt = parseInt(callOrder.debt, 10) / 10 ** debtPrecision;
  if (!debt) return { collateralRatio: Infinity, health: "ok", feedPrice, collateral, debt };
  const ratio = collateral / (feedPrice * debt);
  const mcrRaw = bitasset.current_feed.maintenance_collateral_ratio ?? 1750;
  const mcr = mcrRaw / 1000;
  let health = "ok";
  if (ratio < mcr) health = "danger";
  else if (ratio < mcr * 1.2) health = "warn";
  return {
    collateralRatio: Math.round(ratio * 10000) / 10000,
    health,
    mcr,
    feedPrice: Math.round(feedPrice * 1000000) / 1000000,
    collateral,
    debt,
  };
}

function rankWitnesses(witnesses, accounts, globalProps, dynamicGlobalProps) {
  if (!witnesses || !accounts) return [];
  const activeIds = (globalProps && globalProps.active_witnesses) || [];
  const blockInterval = globalProps && globalProps.parameters && globalProps.parameters.block_interval || 1;
  const currentAslot = (dynamicGlobalProps && dynamicGlobalProps.current_aslot) || 0;
  const accountMap = {};
  (accounts || []).forEach((a) => { if (a) accountMap[a.id] = a; });
  return witnesses
    .filter((w) => w && w.id)
    .map((w) => {
      const acct = accountMap[w.witness_account] || {};
      const lastAslot = w.last_aslot || 0;
      const slotsAgo = currentAslot - lastAslot;
      const lastBlockTime = slotsAgo > 0 ? new Date(Date.now() - slotsAgo * blockInterval * 1000).toISOString() : null;
      return {
        id: w.id,
        account_id: w.witness_account,
        name: acct.name || w.witness_account,
        total_votes: parseInt(w.total_votes || "0", 10),
        active: activeIds.includes(w.id),
        last_block_num: w.last_confirmed_block_num || 0,
        last_block_time: lastBlockTime,
        total_missed: w.total_missed || 0,
        signing_key: w.signing_key || "",
      };
    })
    .sort((a, b) => b.total_votes - a.total_votes)
    .map((w, i) => ({ ...w, rank: i + 1 }));
}

function rankCommittee(committeeMembers, accounts, globalProps) {
  if (!committeeMembers || !accounts) return [];
  const activeIds = (globalProps && globalProps.active_committee_members) || [];
  const accountMap = {};
  (accounts || []).forEach((a) => { if (a) accountMap[a.id] = a; });
  return committeeMembers
    .filter((cm) => cm && cm.id)
    .map((cm) => {
      const acct = accountMap[cm.committee_member_account] || {};
      return {
        id: cm.id,
        account_id: cm.committee_member_account,
        name: acct.name || cm.committee_member_account,
        total_votes: parseInt(cm.total_votes || "0", 10),
        active: activeIds.includes(cm.id),
      };
    })
    .sort((a, b) => b.total_votes - a.total_votes)
    .map((cm, i) => ({ ...cm, rank: i + 1 }));
}

function computeCreditDealRepayment(deal, repayAmount, debtPrecision) {
  if (!deal) return null;
  const borrowed = parseInt(deal.debt_amount, 10) / 10 ** debtPrecision;
  const collateral = parseInt(deal.collateral_amount, 10);
  if (isNaN(borrowed) || isNaN(collateral)) {
    return { error: "deal missing debt_amount or collateral_amount" };
  }
  const feeRate = deal.fee_rate || 0;
  const minRepay = 1 / 10 ** debtPrecision;
  const capped = Math.min(Math.max(repayAmount, minRepay), borrowed);
  const loanFee = capped * feeRate / 10000;
  const finalRepayment = capped + loanFee;
  const collateralRedeem = borrowed > 0 ? (capped / borrowed) * collateral : 0;
  const collateralRedeemPercent = collateral > 0 ? (collateralRedeem / collateral) * 100 : 0;
  const latestRepayTime = deal.latest_repay_time ? new Date(deal.latest_repay_time) : null;
  const now = new Date();
  const hoursRemaining = latestRepayTime ? Math.round((latestRepayTime - now) / (1000 * 60 * 60)) : null;
  return {
    borrowed,
    feeRatePercent: feeRate / 10000,
    repayAmount: capped,
    loanFee: Math.round(loanFee * 10 ** debtPrecision) / 10 ** debtPrecision,
    finalRepayment: Math.round(finalRepayment * 10 ** debtPrecision) / 10 ** debtPrecision,
    collateralRedeem: Math.round(collateralRedeem),
    collateralRedeemPercent: Math.round(collateralRedeemPercent * 100) / 100,
    hoursRemaining,
  };
}

function computeOrderExpiry(expiration) {
  if (!expiration) return null;
  const exp = new Date(expiration);
  const now = new Date();
  const diff = exp - now;
  if (diff <= 0) return { text: "0d 0h 0m", status: "expired" };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  let status = "healthy";
  if (days < 1) status = "imminent";
  else if (days <= 7) status = "soon";
  return { text: `${days}d ${hours}h ${minutes}m`, status, days, hours, minutes };
}

// Resolve an asset id from either a 1.3.x id or a ticker symbol.
async function resolveAssetId(chain, assetOrSymbol, nodeURL) {
  if (assetOrSymbol == null || assetOrSymbol === "") {
    throw new Error("Asset id or symbol is required");
  }
  const c = chainKey(chain);
  if (/^1\.3\.\d+$/.test(assetOrSymbol)) return assetOrSymbol;
  // 1) rapid cached lookup (no node round-trip)
  const cached = searchAssets(c, assetOrSymbol, 1);
  if (cached.length && cached[0].symbol.toLowerCase() === String(assetOrSymbol).toLowerCase()) {
    return cached[0].id;
  }
  // 2) fall back to the node for very new assets not yet in the index
  const node = nodeURL || getActiveNode(c);
  const bySym = await gateway.query(c, "database", "get_assets_by_symbol", [[assetOrSymbol]], node);
  if (bySym && bySym.length && bySym[0] && bySym[0].id) return bySym[0].id;
  throw new Error(`Could not resolve asset "${assetOrSymbol}" to an id`);
}

async function getPageData(slug, account, chain, nodeURL, asset, asset2) {
  const page = getPage(slug);
  if (!page) throw new Error(`Unknown page "${slug}"`);
  if (page.category === "irrelevant") throw new Error(`Page "${slug}" is not exposed to MCP`);
  const c = chainKey(chain);
  nodeURL = nodeURL || getActiveNode(c);
  if (page.slug === "nodes") {
    return {
      page: { slug: page.slug, title: page.title },
      activeNode: getActiveNode(c),
      nodes: listNodes(c),
    };
  }
  if (page.slug === "smartcoins") {
    const chainForReport = c;
    const nodeForReport = nodeURL;
    if (asset) {
      const id = await resolveAssetId(chainForReport, asset, nodeForReport);
      const report = await bitassetReport(chainForReport, id, nodeForReport);
      return {
        page: { slug: page.slug, title: page.title, section: page.section },
        asset: asset,
        report,
      };
    }
    const list = await listSmartcoinsReport(chainForReport, nodeForReport);
    const summary = { alive: 0, healthy: 0, ill: 0, dead: 0 };
    list.forEach((s) => { if (summary[s.status] !== undefined) summary[s.status]++; });
    return {
      page: { slug: page.slug, title: page.title, section: page.section },
      note: "Pass an `asset` argument (id or symbol) to get a single smartcoin's full borrowability report. Use get_bitasset for the same, or get_smartcoins for this list as a tool.",
      counts: summary,
      smartcoins: list,
    };
  }
  if (page.slug === "dex") {
    const nodeForDex = nodeURL;
    if (asset) {
      const baseSymbol = asset;
      const quoteSymbol = asset2 || null;
      if (!quoteSymbol) {
        return { note: "DEX page requires both `asset` (base) and `asset2` (quote) to get full DEX data for a market pair." };
      }
      const [baseId, quoteId] = await Promise.all([
        resolveAssetId(c, baseSymbol, nodeForDex),
        resolveAssetId(c, quoteSymbol, nodeForDex),
      ]);
      const [orderBook, tradeHistory, ticker] = await Promise.all([
        callNanoEffect("getMarketOrderBook", [c, baseId, quoteId, null, nodeForDex]).catch(() => null),
        callNanoEffect("getMarketTradeHistory", [c, baseId, quoteId, null, nodeForDex]).catch(() => null),
        callNanoEffect("getTicker", [c, baseId, quoteId, nodeForDex]).catch(() => null),
      ]);
      const spread = ticker && ticker.lowest_ask && ticker.highest_bid
        ? { abs: (parseFloat(ticker.lowest_ask) - parseFloat(ticker.highest_bid)).toFixed(6), pct: (((parseFloat(ticker.lowest_ask) - parseFloat(ticker.highest_bid)) / parseFloat(ticker.lowest_ask)) * 100).toFixed(4) + "%" }
        : null;
      return {
        page: { slug: page.slug, title: page.title, section: page.section },
        market: { base: baseSymbol, quote: quoteSymbol, baseId, quoteId },
        ticker,
        spread,
        orderBook,
        tradeHistory,
      };
    }
      const topMarkets = await callNanoEffect("getTopActiveMarkets", [20, 30]).catch(() => []);
    return {
      page: { slug: page.slug, title: page.title, section: page.section },
      note: "Pass `asset` (base) and `asset2` (quote) to get full DEX data for a market pair. Here are the top traded markets.",
      topMarkets,
    };
  }
  if (page.slug === "instant_trade") {
    const nodeForIT = nodeURL;
    if (asset) {
      const quoteSymbol = asset;
      const baseSymbol = asset2 || null;
      if (!baseSymbol) {
        return { note: "Instant Trade requires both `asset` (quote) and `asset2` (base) to get instant trade data for a market pair." };
      }
      const [baseId, quoteId] = await Promise.all([
        resolveAssetId(c, baseSymbol, nodeForIT),
        resolveAssetId(c, quoteSymbol, nodeForIT),
      ]);
      const [orderBook, tradeHistory, ticker] = await Promise.all([
        callNanoEffect("getMarketOrderBook", [c, baseId, quoteId, null, nodeForIT]).catch(() => null),
        callNanoEffect("getMarketTradeHistory", [c, baseId, quoteId, null, nodeForIT]).catch(() => null),
        callNanoEffect("getTicker", [c, baseId, quoteId, nodeForIT]).catch(() => null),
      ]);
      const spread = ticker && ticker.lowest_ask && ticker.highest_bid
        ? { abs: (parseFloat(ticker.lowest_ask) - parseFloat(ticker.highest_bid)).toFixed(6), pct: (((parseFloat(ticker.lowest_ask) - parseFloat(ticker.highest_bid)) / parseFloat(ticker.lowest_ask)) * 100).toFixed(4) + "%" }
        : null;
      const bids = orderBook && orderBook.bids ? orderBook.bids : [];
      const asks = orderBook && orderBook.asks ? orderBook.asks : [];
      const totalBidsBase = bids.reduce((s, o) => s + parseFloat(o.base || 0), 0);
      const totalBidsQuote = bids.reduce((s, o) => s + parseFloat(o.quote || 0), 0);
      const totalAsksBase = asks.reduce((s, o) => s + parseFloat(o.base || 0), 0);
      const uniqueSellers = new Set(bids.map((o) => o.owner_name).filter(Boolean)).size;
      let limitOrderFee = null;
      try {
        const globalParams = await gateway.query(c, "database", "get_chain_parameters", [], nodeForIT).catch(() => null);
        if (globalParams && globalParams.parameters && globalParams.parameters.current_fees) {
          const fees = globalParams.parameters.current_fees.parameters;
          const transferFee = fees && fees[0] && fees[0][1] && fees[0][1].fee;
          if (transferFee !== undefined) {
            limitOrderFee = { raw: transferFee, human: transferFee / 100000 };
          }
        }
      } catch (e) { /* ignore */ }
      return {
        page: { slug: page.slug, title: page.title, section: page.section },
        market: { base: baseSymbol, quote: quoteSymbol, baseId, quoteId },
        ticker,
        spread,
        orderBook: { bidDepth: bids.length, askDepth: asks.length, totalBidsBase, totalBidsQuote, totalAsksBase },
        tradeHistory,
        instantTradeSummary: {
          maxPurchaseableBase: totalBidsBase.toFixed(5),
          maxSellableQuote: totalBidsQuote.toFixed(5),
          uniqueSellers,
          bidCount: bids.length,
          askCount: asks.length,
        },
        limitOrderFee,
      };
    }
    const topMarkets = await callNanoEffect("getTopActiveMarkets", [20, 30]).catch(() => []);
    return {
      page: { slug: page.slug, title: page.title, section: page.section },
      note: "Pass `asset` (quote) and `asset2` (base) to get instant trade data for a market pair. Here are the top traded markets.",
      topMarkets,
    };
  }
  if (page.slug === "witnesses") {
    const nodeForW = nodeURL;
    const [globalPropsArr, dynamicGlobalPropsArr, maxId] = await Promise.all([
      gateway.query(c, "database", "get_objects", [["2.0.0"]], nodeForW).catch(() => []),
      gateway.query(c, "database", "get_dynamic_global_properties", [], nodeForW).catch(() => ({})),
      gateway.query(c, "database", "get_next_object_id", [1, 6, false], nodeForW).catch(() => "1.6.0"),
    ]);
    const gp = Array.isArray(globalPropsArr) ? globalPropsArr[0] : globalPropsArr;
    const witnessCount = parseInt(String(maxId).split(".")[2], 10);
    const witnessIds = witnessCount > 0 ? Array.from({ length: witnessCount }, (_, i) => `1.6.${i}`) : [];
    const witnessObjs = witnessIds.length ? await gateway.getObjects(c, witnessIds, nodeForW) : [];
    const validWitnesses = (witnessObjs || []).filter((w) => w && w.id);
    const accountIds = [...new Set(validWitnesses.map((w) => w.witness_account).filter(Boolean))];
    const accounts = accountIds.length ? await gateway.getObjects(c, accountIds, nodeForW) : [];
    const ranked = rankWitnesses(validWitnesses, accounts, gp, dynamicGlobalPropsArr);
    return {
      page: { slug: page.slug, title: page.title, section: page.section },
      activeWitnessCount: gp && gp.active_witnesses ? gp.active_witnesses.length : 0,
      witnesses: ranked,
    };
  }
  if (page.slug === "committee") {
    const nodeForC = nodeURL;
    const [globalPropsArr, maxId] = await Promise.all([
      gateway.query(c, "database", "get_objects", [["2.0.0"]], nodeForC).catch(() => []),
      gateway.query(c, "database", "get_next_object_id", [1, 5, false], nodeForC).catch(() => "1.5.0"),
    ]);
    const gp = Array.isArray(globalPropsArr) ? globalPropsArr[0] : globalPropsArr;
    const memberCount = parseInt(String(maxId).split(".")[2], 10);
    const memberIds = memberCount > 0 ? Array.from({ length: memberCount }, (_, i) => `1.5.${i}`) : [];
    const memberObjs = memberIds.length ? await gateway.getObjects(c, memberIds, nodeForC) : [];
    const validMembers = (memberObjs || []).filter((cm) => cm && cm.id);
    const accountIds = [...new Set(validMembers.map((cm) => cm.committee_member_account).filter(Boolean))];
    const accounts = accountIds.length ? await gateway.getObjects(c, accountIds, nodeForC) : [];
    const ranked = rankCommittee(validMembers, accounts, gp);
    return {
      page: { slug: page.slug, title: page.title, section: page.section },
      activeCommitteeCount: gp && gp.active_committee_members ? gp.active_committee_members.length : 0,
      committeeMembers: ranked,
    };
  }
  if (page.slug === "deals") {
    const acc = activeAccount(account, currentUser);
    if (!acc) return { note: "Account-scoped page requires set_current_user or an `account` argument." };
    const [borrowerDeals, lenderDeals] = await Promise.all([
      callNanoEffect("fetchBorrowerDeals", [c, acc, nodeURL]).catch(() => []),
      callNanoEffect("fetchLenderDeals", [c, acc, nodeURL]).catch(() => []),
    ]);
    return {
      page: { slug: page.slug, title: page.title, section: page.section },
      borrowerDeals,
      lenderDeals,
    };
  }
  if (page.slug === "withdraw_permissions") {
    const acc = activeAccount(account, currentUser);
    if (!acc) return { note: "Account-scoped page requires set_current_user or an `account` argument." };
    const [receiving, paying] = await Promise.all([
      callNanoEffect("fetchReceiverWithdrawPermissions", [c, acc, nodeURL]).catch(() => []),
      callNanoEffect("fetchPayerWithdrawPermissions", [c, acc, nodeURL]).catch(() => []),
    ]);
    return {
      page: { slug: page.slug, title: page.title, section: page.section },
      receiving,
      paying,
    };
  }
  const ctx = { chain: c, account: activeAccount(account, currentUser), nodeURL };

  if (page.nanoeffect && hasNanoEffect(page.nanoeffect.name)) {
    if (page.accountScoped && !ctx.account) {
      return { note: "Account-scoped page requires set_current_user or an `account` argument." };
    }
    try {
      const neArgs = page.nanoeffect.args(ctx);
      const data = await callNanoEffect(page.nanoeffect.name, neArgs);
      return {
        page: { slug: page.slug, title: page.title, section: page.section },
        nanoeffect: page.nanoeffect.name,
        args: neArgs,
        data,
      };
    } catch (e) {
      return {
        page: { slug: page.slug, title: page.title, section: page.section },
        nanoeffect: page.nanoeffect.name,
        error: String(e && e.message ? e.message : e),
      };
    }
  }

  if (page.accountScoped) {
    const acc = activeAccount(account, currentUser);
    if (!acc) return { note: "Account-scoped page requires set_current_user or an `account` argument." };
    const full = await gateway.getFullAccounts(c, [acc], nodeURL);
    if (!full || !full.length) return { note: `No account data for ${acc}` };
    const fa = full[0] && full[0][1] ? full[0][1] : full[0];
    return {
      account: fa.account,
      balances: fa.balances,
      limit_orders: fa.limit_orders,
      call_orders: fa.call_orders,
      vesting_balances: fa.vesting_balances,
      statistics: fa.statistics,
      proposals: fa.proposals,
    };
  }
  return {
    note: `Static informational page. Read the chain objects it surfaces via get_objects / get_accounts, or use get_nanoeffect for a dedicated reader.`,
    page: { slug: page.slug, title: page.title, section: page.section },
    dataHint: DATA_HINTS[page.slug] || null,
  };
}

// For every informational page, the exact chain objects / APIs it reads, so the
// bot can fetch the same data the page displays.
const DATA_HINTS = {
  blocks: {
    description: "Latest blockchain blocks and global dynamic properties.",
    apis: [{ api: "database", method: "get_dynamic_global_properties", params: [] }, { api: "database", method: "get_block", params: ["<block_num>"] }],
    objectPrefixes: [],
  },
  witnesses: {
    description: "Active witnesses and their details.",
    apis: [{ api: "database", method: "get_witnesses", params: ["<ids>"] }],
    objectPrefixes: ["1.6."],
  },
  committee: {
    description: "Active committee members.",
    apis: [{ api: "database", method: "get_committee_members", params: ["<ids>"] }],
    objectPrefixes: ["1.5."],
  },
  governance: {
    description: "Global governance / worker & proposal overview.",
    apis: [{ api: "database", method: "get_workers", params: ["<ids>"] }, { api: "database", method: "get_proposed_transactions", params: ["<account_id>"] }],
    objectPrefixes: ["1.14.", "1.10."],
  },
  proposals: {
    description: "Proposals (active account's or by id).",
    apis: [{ api: "database", method: "get_proposed_transactions", params: ["<account_id>"] }],
    objectPrefixes: ["1.10."],
  },
  create_worker: {
    description: "Worker proposals on the network.",
    apis: [{ api: "database", method: "get_workers", params: ["<ids>"] }],
    objectPrefixes: ["1.14."],
  },
  ticket_leaderboard: {
    description: "LTM ticket leaderboard.",
    apis: [{ api: "database", method: "get_tickets", params: ["<ids>"] }],
    objectPrefixes: ["1.15."],
  },
  pools: {
    description: "Liquidity pools and their state.",
    apis: [{ api: "database", method: "get_liquidity_pools", params: ["<ids>"] }],
    objectPrefixes: ["1.4."],
  },
  "top-pools": {
    description: "Most active liquidity pools (swap counts).",
    apis: [{ api: "database", method: "get_liquidity_pools", params: ["<ids>"] }],
    objectPrefixes: ["1.4."],
  },
  "custom_pool_overview": {
    description: "Custom liquidity pool tracking.",
    apis: [{ api: "database", method: "get_liquidity_pools", params: ["<ids>"] }],
    objectPrefixes: ["1.4."],
  },
  "top-markets": {
    description: "Top markets by volume (external explorer data + chain objects).",
    apis: [{ api: "database", method: "get_assets", params: ["<ids>"] }],
    objectPrefixes: ["1.3."],
  },
  smartcoins: {
    description: "Smartcoins (market-pegged assets) and their borrowability for CDPs.",
    apis: [
      { api: "database", method: "get_next_object_id", params: [2, 4, false] },
      { api: "database", method: "get_objects", params: ["2.4.x (bitasset data)"] },
      { api: "database", method: "get_assets_by_symbol", params: ["<symbol>"] },
    ],
    objectPrefixes: ["1.3.", "2.4."],
    readers: ["get_bitasset(asset)", "get_smartcoins()"],
  },
};

const currentUser = { username: "", id: "", chain: "", referrer: "" };
let knownAccounts = [];

// Per-chain active node override. When set, all chain calls default to it
// instead of the first node in the chain's configured nodeList.
const activeNode = {};

function getActiveNode(chain) {
  const c = chainKey(chain);
  if (activeNode[c]) return activeNode[c];
  const list = gateway.chains[c] && gateway.chains[c].nodeList;
  return list && list.length ? list[0].url : "";
}

function listNodes(chain) {
  const c = chainKey(chain);
  const list = (gateway.chains[c] && gateway.chains[c].nodeList) || [];
  return list.map((n) => ({ url: n.url, location: n.location || "" }));
}

function setActiveNode(chain, url) {
  const c = chainKey(chain);
  if (!gateway.chains[c]) throw new Error(`Unknown chain "${chain}"`);
  const trimmed = (url || "").trim();
  if (trimmed) {
    const known = listNodes(c).some((n) => n.url === trimmed);
    if (!known && !/^wss?:\/\//i.test(trimmed)) {
      throw new Error(
        `Node "${trimmed}" is not a valid websocket URL and is not in the configured node list for ${c}: ${listNodes(c)
          .map((n) => n.url)
          .join(", ")}`
      );
    }
  }
  activeNode[c] = trimmed;
  if (hooks.activeNode) hooks.activeNode({ chain: c, url: getActiveNode(c) });
  return { chain: c, activeNode: getActiveNode(c), nodes: listNodes(c) };
}

let httpServer = null;
let mcpServer = null;
let transport = null;
let hooks = { log: () => {}, status: () => {}, activeNode: () => {} };

function setHooks(h) {
  hooks = h ? { ...hooks, ...h } : hooks;
}

function setCurrentUser(u) {
  Object.assign(currentUser, {
    username: u.username || "",
    id: u.id || "",
    chain: u.chain || "",
    referrer: u.referrer || "",
  });
  hooks.status({ currentUser, running: !!httpServer });
}

function setStoredUsers(users) {
  knownAccounts = Array.isArray(users) ? users : (users && users.users) || [];
}

function buildToolList() {
  return [
    {
      name: "list_pages",
      description:
        "List every astro-ui page exposed to the MCP server, with category (operation/info) and available operations. Use this to discover what the bot can do.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_page_docs",
      description: "Return the documentation for a given page slug.",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string", description: "Page slug, e.g. transfer" } },
        required: ["slug"],
      },
    },
    {
      name: "get_page_data",
      description:
        "Return the live chain data a page surfaces for the active account. For account-scoped pages this resolves the active user's full account; otherwise it returns the page's data reader result. IMPORTANT: all numeric amounts are RAW integers (×10^asset_precision). Use get_asset (or from_raw_amount) to convert to human-readable floats; see the mcp_guide resource for the convention. For DEX/instant_trade pages, pass `asset` (base) and `asset2` (quote) to get pair-specific order book, trade history, and ticker data.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          account: { type: "string", description: "Optional account id override" },
          chain: { type: "string", description: "bitshares | bitshares_testnet" },
          nodeURL: { type: "string" },
          asset: { type: "string", description: "Asset symbol or id (used as base for DEX, quote for instant_trade)" },
          asset2: { type: "string", description: "Second asset symbol or id (used as quote for DEX, base for instant_trade)" },
        },
        required: ["slug"],
      },
    },
    {
      name: "build_operation",
      description:
        "Build a Bitshares operation object (trxJSON + operationNames) from parameters. IMPORTANT: every amount field is a RAW INTEGER (satoshi-scale) — multiply human amounts by 10^asset_precision first (see to_raw_amount / get_asset). The fee is left zero; it is filled automatically by generate_deeplink / prepare_transaction. Uses the active account as fee payer when not supplied. To learn the exact parameter fields for an operation, call describe_operation first.",
      inputSchema: {
        type: "object",
        properties: {
          operation: { type: "string", description: "Operation name, e.g. transfer, limit_order_create" },
          params: { type: "object", description: "Operation-specific parameters (amounts are RAW integers)" },
          account: { type: "string", description: "Optional fee-paying / source account id override" },
        },
        required: ["operation", "params"],
      },
    },
    {
      name: "generate_deeplink",
      description:
        "Generate a Beet/BeetEOS deep link for one or more operations, ready to sign in a wallet.",
      inputSchema: {
        type: "object",
        properties: {
          operationNames: { type: "array", items: { type: "string" } },
          trxJSON: { type: "array", description: "Array of operation objects" },
          chain: { type: "string" },
          nodeURL: { type: "string" },
        },
        required: ["operationNames", "trxJSON"],
      },
    },
    {
      name: "export_operation_json",
      description:
        "Return the operation JSON in the response (NOTHING is written to disk) for OFFLINE/air-gapped reference ONLY. This is the raw operation with NO fee and NO reference block — it is NOT directly broadcastable. For broadcast use generate_deeplink (Beet) or prepare_transaction (self-sign).",
      inputSchema: {
        type: "object",
        properties: {
          operationNames: { type: "array", items: { type: "string" } },
          trxJSON: { type: "array" },
          fileName: { type: "string" },
        },
        required: ["operationNames", "trxJSON"],
      },
    },
    {
      name: "wrap_as_proposal",
      description:
        "Wrap one or more operations into a proposal_create operation (for multi-sig / deferred execution).",
      inputSchema: {
        type: "object",
        properties: {
          operationNames: { type: "array", items: { type: "string" } },
          trxJSON: { type: "array" },
          feePayingAccount: { type: "string" },
          expiration: { type: "string", description: "ISO date" },
          reviewPeriodSeconds: { type: "number" },
        },
        required: ["operationNames", "trxJSON", "feePayingAccount"],
      },
    },
    {
      name: "get_objects",
      description:
        "Read raw chain objects by id (assets 1.3.x, accounts 1.2.x, etc.). Asset objects include `precision` — use it (or get_asset) to convert raw amounts to human floats. For a convenience view of assets use get_asset.",
      inputSchema: {
        type: "object",
        properties: {
          ids: { type: "array", items: { type: "string" } },
          chain: { type: "string" },
          nodeURL: { type: "string" },
        },
        required: ["ids"],
      },
    },
    {
      name: "get_accounts",
      description:
        "Read full account records (balances, orders, vesting, etc.) by name or id. Balances are RAW integers; convert with from_raw_amount / get_asset precision.",
      inputSchema: {
        type: "object",
        properties: {
          accounts: { type: "array", items: { type: "string" } },
          chain: { type: "string" },
          nodeURL: { type: "string" },
        },
        required: ["accounts"],
      },
    },
    {
      name: "set_current_user",
      description:
        "Set the active user context for the bot. All account-scoped data and operations will use this account until changed.",
      inputSchema: {
        type: "object",
        properties: {
          username: { type: "string" },
          id: { type: "string" },
          chain: { type: "string" },
          referrer: { type: "string" },
        },
        required: ["id", "chain"],
      },
    },
    {
      name: "get_current_user",
      description: "Return the currently active user context.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "list_known_accounts",
      description: "List accounts stored in the astro-ui application (from $userStorage).",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "list_nanoeffects",
      description:
        "List every raw data reader (nanoeffect) available from the astro-ui data layer, with its argument names. Use get_nanoeffect to invoke one directly when a page mapping is not enough.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_active_node",
      description:
        "Return the currently active Bitshares node URL (the default node used for all chain reads/operations) plus the full configured node list for a chain.",
      inputSchema: {
        type: "object",
        properties: { chain: { type: "string", description: "bitshares | bitshares_testnet" } },
        required: [],
      },
    },
    {
      name: "set_active_node",
      description:
        "Change the active node the MCP server connects to by default for chain reads and operation building. Pass an empty url to revert to the chain's default node. The connected app's active node is updated too.",
      inputSchema: {
        type: "object",
        properties: {
          chain: { type: "string", description: "bitshares | bitshares_testnet" },
          url: { type: "string", description: "Node websocket URL, e.g. wss://..., or a configured node URL" },
        },
        required: ["chain", "url"],
      },
    },
    {
      name: "get_nanoeffect",
      description:
        "Invoke a raw data reader from the astro-ui data layer by name, passing positional arguments. Returns the live chain data the app uses. Amounts are RAW integers; humanize with from_raw_amount / get_asset.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nanoeffect name, e.g. getAccountBalances" },
          args: { type: "array", description: "Positional arguments for the reader (chain, account, nodeURL, ...)" },
          chain: { type: "string", description: "bitshares | bitshares_testnet" },
          nodeURL: { type: "string" },
        },
        required: ["name", "args"],
      },
    },
    {
      name: "search_assets",
      description:
        "Rapidly search astro-ui's cached asset index (NO node round-trip) by symbol or id substring. Returns up to `limit` matches as { id, symbol, precision, issuer }. Use this FIRST to discover asset ids and precisions when you only know a ticker (e.g. 'BTS', 'bitUSD', 'CNY') before building operations. For full LIVE metadata (issuer details, fees, current supply) follow up with get_asset; for live bitasset/feed state use get_bitasset. Assets created after the index was built fall back to get_objects / get_assets_by_symbol.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Symbol or id substring, e.g. 'BTS', 'bit', '1.3.'" },
          chain: { type: "string" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
        required: ["query"],
      },
    },
    {
      name: "get_asset",
      description:
        "Return an asset's metadata (id, symbol, precision, issuer). Use `precision` with to_raw_amount / from_raw_amount to convert between human amounts and the RAW integers the chain and operation builders expect.",
      inputSchema: {
        type: "object",
        properties: {
          asset_ids: { type: "array", items: { type: "string" }, description: 'Asset ids, e.g. ["1.3.0","1.3.1"]' },
          chain: { type: "string" },
          nodeURL: { type: "string" },
        },
        required: ["asset_ids"],
      },
    },
    {
      name: "to_raw_amount",
      description:
        "Convert a HUMAN-readable amount into the RAW integer the chain expects, using the asset's precision (e.g. to_raw_amount(\"1.3.0\", 1.5) -> 150000). Always use this before passing amounts to build_operation.",
      inputSchema: {
        type: "object",
        properties: {
          asset_id: { type: "string" },
          human_amount: { type: "number" },
          chain: { type: "string" },
          nodeURL: { type: "string" },
        },
        required: ["asset_id", "human_amount"],
      },
    },
    {
      name: "from_raw_amount",
      description:
        "Convert a RAW blockchain integer into a human-readable float using the asset's precision (e.g. from_raw_amount(\"1.3.0\", 150000) -> 1.5). Use this to humanize balances, order amounts and prices.",
      inputSchema: {
        type: "object",
        properties: {
          asset_id: { type: "string" },
          raw_amount: { type: "number" },
          chain: { type: "string" },
          nodeURL: { type: "string" },
        },
        required: ["asset_id", "raw_amount"],
      },
    },
    {
      name: "get_bitasset",
      description:
        "Return a smartcoin (market-pegged asset) borrowability report: live STATUS (alive / healthy / ill / dead), whether it is BORROWABLE to open or top up a CDP, the reason(s) it is not, the collateral (backing) asset, and the current feed price in human units. Pass an asset id (1.3.x) or a ticker symbol (e.g. BITUSD). This is the authoritative way for an agent to decide if it may borrow/lend/issue CDPs against a smartcoin. `dead` = globally settled; `ill` = no valid price feed or stale feed; `healthy` = fresh feed; `alive` = feed present (freshness unknown).",
      inputSchema: {
        type: "object",
        properties: {
          asset: { type: "string", description: "Asset id (1.3.x) or symbol (e.g. BITUSD)" },
          chain: { type: "string" },
          nodeURL: { type: "string" },
        },
        required: ["asset"],
      },
    },
    {
      name: "get_smartcoins",
      description:
        "Enumerate EVERY smartcoin on a chain and classify each in one batch: { asset_id, symbol, backing_symbol, status (alive/healthy/ill/dead), borrowable, reasons, feed_price_human }. Use this to discover which smartcoins are tradeable/borrowable right now. For a single asset's full report use get_bitasset.",
      inputSchema: {
        type: "object",
        properties: {
          chain: { type: "string" },
          nodeURL: { type: "string" },
        },
        required: [],
      },
    },
    {
      name: "describe_operation",
      description:
        "Return the parameter fields an operation builder expects (plus its operation number and which fields are RAW amounts needing precision). Call this before build_operation so you know exactly what to pass.",
      inputSchema: {
        type: "object",
        properties: {
          operation: { type: "string", description: "Operation name, e.g. limit_order_create" },
        },
        required: ["operation"],
      },
    },
    {
      name: "query",
      description:
        "Call ANY bitshares API method directly (database / history / network_broadcast / etc). Escape hatch for anything not covered by a dedicated tool — e.g. query(\"bitshares\",\"database\",\"get_chain_id\",[]) or get_dynamic_global_properties. Args: (chain, apiName, method, params[]).",
      inputSchema: {
        type: "object",
        properties: {
          chain: { type: "string" },
          apiName: { type: "string", description: "e.g. database, history, network_broadcast" },
          method: { type: "string" },
          params: { type: "array", description: "Positional params for the method" },
          nodeURL: { type: "string" },
        },
        required: ["chain", "apiName", "method", "params"],
      },
    },
    {
      name: "get_chain_id",
      description: "Return the chain id for a network (needed when signing a transaction yourself for direct broadcast).",
      inputSchema: {
        type: "object",
        properties: { chain: { type: "string" } },
        required: ["chain"],
      },
    },
    {
      name: "prepare_transaction",
      description:
        "Assemble a finalized, fee-filled transaction object ready for the agent (or its own code) to SIGN with the user's private key and broadcast directly — no Beet/BeetEOS wallet required. Returns { transaction, chain_id, ref_block_num, ref_block_prefix }. Sign with bts using chain_id, then broadcast via network_broadcast_api.broadcast_transaction. All amounts must be RAW integers (see to_raw_amount).",
      inputSchema: {
        type: "object",
        properties: {
          operationNames: { type: "array", items: { type: "string" } },
          trxJSON: { type: "array", description: "Operation objects (raw amounts)" },
          chain: { type: "string" },
          nodeURL: { type: "string" },
        },
        required: ["operationNames", "trxJSON"],
      },
    },
    {
      name: "classify_call_order",
      description:
        "Classify a call order's health: returns collateral ratio, health status (ok/warn/danger), the feed price used, and the MCR threshold. Use this to decide whether a CDP is safe, at risk, or liquidatable. Requires the call order data (from getUserCallOrders) and the bitasset data (from get_bitasset or getFullSmartcoin).",
      inputSchema: {
        type: "object",
        properties: {
          callOrder: { type: "object", description: "Raw call order object (must have collateral, debt, debt_type fields)" },
          bitasset: { type: "object", description: "Raw bitasset data object (must have current_feed with settlement_price and maintenance_collateral_ratio)" },
          collateralPrecision: { type: "number", description: "Precision of the collateral asset" },
          debtPrecision: { type: "number", description: "Precision of the debt asset" },
        },
        required: ["callOrder", "bitasset", "collateralPrecision", "debtPrecision"],
      },
    },
    {
      name: "compute_repayment",
      description:
        "Compute the full repayment breakdown for a credit deal: loan fee, final repayment amount, collateral redemption amount, and remaining time. Requires the deal object (from fetchBorrowerDeals/fetchLenderDeals) and the human-readable repay amount.",
      inputSchema: {
        type: "object",
        properties: {
          deal: { type: "object", description: "Raw credit deal object (must have debt_amount, collateral_amount, fee_rate, latest_repay_time)" },
          repayAmount: { type: "number", description: "Human-readable amount to repay" },
          debtPrecision: { type: "number", description: "Precision of the debt asset" },
        },
        required: ["deal", "repayAmount", "debtPrecision"],
      },
    },
    {
      name: "get_chain_parameters",
      description:
        "Return the chain's global parameters: max transaction size, transfer fee, price per kbyte. Use this to estimate fees before building operations.",
      inputSchema: {
        type: "object",
        properties: {
          chain: { type: "string" },
          nodeURL: { type: "string" },
        },
        required: [],
      },
    },
    {
      name: "mcp_guide",
      description:
        "Return the agent orientation guide: the raw-amount/precision convention, how to look up precision, the build->generate_deeplink (Beet) flow, the build->prepare_transaction (self-sign broadcast) flow, fee handling and node switching. Start here.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
  ];
}

async function callTool(name, args) {
  switch (name) {
    case "list_pages":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              MCP_PAGES.map((p) => ({
                slug: p.slug,
                title: p.title,
                section: p.section,
                category: p.category,
                accountScoped: !!p.accountScoped,
                operations: p.operations ? p.operations.map((o) => o.name) : [],
              })),
              null,
              2
            ),
          },
        ],
      };

    case "get_page_docs": {
      const text = await readDocs(args.slug);
      return { content: [{ type: "text", text }] };
    }

    case "get_page_data": {
      const data = await getPageData(args.slug, args.account, args.chain, args.nodeURL, args.asset, args.asset2);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "build_operation": {
      const op = args.operation;
      if (!hasBuilder(op)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Operation "${op}" is catalogued but not yet implemented as a builder. Available builders: ${BUILT_OPERATION_NAMES.join(", ")}`,
            },
          ],
        };
      }
      const acc = activeAccount(args.account, currentUser);
      const trxJSON = buildOperation(op, { ...args.params, account: acc });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ operationNames: [op], trxJSON: [trxJSON] }, null, 2),
          },
        ],
      };
    }

    case "generate_deeplink": {
      const c = chainKey(args.chain || currentUser.chain);
      const node = args.nodeURL || getActiveNode(c);
      const payload = await gateway.makeDeepLink(c, node, args.operationNames, args.trxJSON);
      if (!payload) return { content: [{ type: "text", text: "Failed to generate deep link" }] };
      const chainTag = c === "bitshares" ? "BTS" : "BTS_TEST";
      const beet = `rawbeet://api?chain=${chainTag}&request=${payload}`;
      const beetEos = `rawbeeteos://api?chain=${chainTag}&request=${payload}`;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                beet_uri: beet,
                beeteos_uri: beetEos,
                raw_payload: payload,
                note: "Open the beet_uri in Beet (desktop) or beeteos_uri in BeetEOS. The user signs there; no key is needed by the agent.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "export_operation_json": {
      const payload = { operationNames: args.operationNames, trxJSON: args.trxJSON };
      return {
        content: [
          { type: "text", text: JSON.stringify(payload, null, 2) },
          {
            type: "text",
            text: "NOTE: returned in the response only — nothing was written to disk. For broadcast use generate_deeplink (Beet) or prepare_transaction (self-sign).",
          },
        ],
      };
    }

    case "wrap_as_proposal": {
      if (args.operationNames.length !== args.trxJSON.length) {
        return { isError: true, content: [{ type: "text", text: `operationNames (${args.operationNames.length}) and trxJSON (${args.trxJSON.length}) must have the same length` }] };
      }
      const proposal = {
        fee: { amount: 0, asset_id: "1.3.0" },
        fee_paying_account: args.feePayingAccount,
        expiration_time: args.expiration,
        proposed_ops: args.trxJSON.map((op, i) => ({
          op: [operationNumber(args.operationNames[i]), op],
        })),
        review_period_seconds: args.reviewPeriodSeconds ?? 0,
        extensions: [],
      };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { operationNames: ["proposal_create"], trxJSON: [proposal] },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_objects": {
      const c = chainKey(args.chain || currentUser.chain);
      const node = args.nodeURL || getActiveNode(c);
      const objs = await gateway.getObjects(c, args.ids, node);
      return { content: [{ type: "text", text: JSON.stringify(objs, null, 2) }] };
    }

    case "get_accounts": {
      const c = chainKey(args.chain || currentUser.chain);
      const node = args.nodeURL || getActiveNode(c);
      const raw = await gateway.getFullAccounts(c, args.accounts, node);
      const accs = (raw || []).map((t) => (Array.isArray(t) ? t[1] : t)).filter(Boolean);
      return { content: [{ type: "text", text: JSON.stringify(accs, null, 2) }] };
    }

    case "set_current_user":
      setCurrentUser(args);
      return { content: [{ type: "text", text: JSON.stringify(currentUser, null, 2) }] };

    case "get_current_user":
      return { content: [{ type: "text", text: JSON.stringify(currentUser, null, 2) }] };

    case "list_known_accounts":
      return { content: [{ type: "text", text: JSON.stringify(knownAccounts, null, 2) }] };

    case "list_nanoeffects": {
      return { content: [{ type: "text", text: JSON.stringify(listNanoEffects(), null, 2) }] };
    }

    case "get_active_node": {
      const c = chainKey(args.chain || currentUser.chain || "bitshares");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ chain: c, activeNode: getActiveNode(c), nodes: listNodes(c) }, null, 2),
          },
        ],
      };
    }

    case "set_active_node": {
      try {
        const result = setActiveNode(args.chain, args.url);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e && e.message ? e.message : e) }] };
      }
    }

    case "get_nanoeffect": {
      const name = args.name;
      if (!hasNanoEffect(name)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Unknown nanoeffect "${name}". Use list_nanoeffects to see available readers.`,
            },
          ],
        };
      }
      const raw = Array.isArray(args.args) ? args.args : [];
      const c = chainKey(args.chain || currentUser.chain);
      const node = args.nodeURL || getActiveNode(c);
      const neArgs = raw.map((a) => (a === "$chain" ? c : a === "$node" ? node : a));
      const data = await callNanoEffect(name, neArgs);
      return {
        content: [
          { type: "text", text: JSON.stringify({ name, args: neArgs, data }, null, 2) },
        ],
      };
    }

    case "search_assets": {
      const c = chainKey(args.chain || currentUser.chain);
      const list = searchAssets(c, args.query, args.limit || 50);
      return {
        content: [{ type: "text", text: JSON.stringify({ count: list.length, assets: list }, null, 2) }],
      };
    }

    case "get_asset": {
      const c = chainKey(args.chain || currentUser.chain);
      const node = args.nodeURL || getActiveNode(c);
      const assets = await gateway.getAssets(c, args.asset_ids, node);
      return { content: [{ type: "text", text: JSON.stringify(assets, null, 2) }] };
    }

    case "to_raw_amount": {
      const c = chainKey(args.chain || currentUser.chain);
      const node = args.nodeURL || getActiveNode(c);
      const cached = searchAssets(c, args.asset_id, 1);
      let a;
      if (cached.length && cached[0].id === args.asset_id) {
        a = cached[0];
      } else {
        const assets = await gateway.getAssets(c, [args.asset_id], node);
        a = assets && assets[0];
      }
      if (!a) return { isError: true, content: [{ type: "text", text: `Asset ${args.asset_id} not found` }] };
      if (args.human_amount == null || isNaN(Number(args.human_amount))) {
        return { isError: true, content: [{ type: "text", text: `Invalid human_amount: ${args.human_amount}` }] };
      }
      const raw = Math.round(Number(args.human_amount) * 10 ** a.precision);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { asset_id: args.asset_id, symbol: a.symbol, precision: a.precision, human_amount: args.human_amount, raw_amount: raw },
              null,
              2
            ),
          },
        ],
      };
    }

    case "from_raw_amount": {
      const c = chainKey(args.chain || currentUser.chain);
      const node = args.nodeURL || getActiveNode(c);
      const cached = searchAssets(c, args.asset_id, 1);
      let a;
      if (cached.length && cached[0].id === args.asset_id) {
        a = cached[0];
      } else {
        const assets = await gateway.getAssets(c, [args.asset_id], node);
        a = assets && assets[0];
      }
      if (!a) return { isError: true, content: [{ type: "text", text: `Asset ${args.asset_id} not found` }] };
      if (args.raw_amount == null || isNaN(Number(args.raw_amount))) {
        return { isError: true, content: [{ type: "text", text: `Invalid raw_amount: ${args.raw_amount}` }] };
      }
      const human = parseFloat((Number(args.raw_amount) / 10 ** a.precision).toFixed(a.precision));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { asset_id: args.asset_id, symbol: a.symbol, precision: a.precision, raw_amount: args.raw_amount, human_amount: human },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_bitasset": {
      try {
        const c = chainKey(args.chain || currentUser.chain);
        const node = args.nodeURL || getActiveNode(c);
        const id = await resolveAssetId(c, args.asset, node);
        const report = await bitassetReport(c, id, node);
        return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e && e.message ? e.message : e) }] };
      }
    }

    case "get_smartcoins": {
      try {
        const c = chainKey(args.chain || currentUser.chain);
        const node = args.nodeURL || getActiveNode(c);
        const list = await listSmartcoinsReport(c, node);
        const summary = { alive: 0, healthy: 0, ill: 0, dead: 0 };
        list.forEach((s) => { if (summary[s.status] !== undefined) summary[s.status]++; });
        return {
          content: [{ type: "text", text: JSON.stringify({ counts: summary, smartcoins: list }, null, 2) }],
        };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e && e.message ? e.message : e) }] };
      }
    }

    case "describe_operation": {
      try {
        const info = describeOperation(args.operation);
        try { info.opNumber = operationNumber(args.operation); } catch (e) {}
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e && e.message ? e.message : e) }] };
      }
    }

    case "query": {
      const c = chainKey(args.chain || currentUser.chain);
      const node = args.nodeURL || getActiveNode(c);
      const result = await gateway.query(c, args.apiName, args.method, args.params || [], node);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    case "get_chain_id": {
      const c = chainKey(args.chain || "bitshares");
      return {
        content: [{ type: "text", text: JSON.stringify({ chain: c, chain_id: gateway.getChainId(c) }, null, 2) }],
      };
    }

    case "prepare_transaction": {
      try {
        const c = chainKey(args.chain || currentUser.chain);
        const node = args.nodeURL || getActiveNode(c);
        const tx = await gateway.prepareTransaction(c, node, args.operationNames, args.trxJSON);
        return { content: [{ type: "text", text: JSON.stringify(tx, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e && e.message ? e.message : e) }] };
      }
    }

    case "classify_call_order": {
      try {
        const result = classifyCallOrder(args.callOrder, args.bitasset, args.collateralPrecision, args.debtPrecision);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e && e.message ? e.message : e) }] };
      }
    }

    case "compute_repayment": {
      try {
        const result = computeCreditDealRepayment(args.deal, args.repayAmount, args.debtPrecision);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e && e.message ? e.message : e) }] };
      }
    }

    case "get_chain_parameters": {
      try {
        const c = chainKey(args.chain || currentUser.chain);
        const node = args.nodeURL || getActiveNode(c);
        const params = await gateway.query(c, "database", "get_chain_parameters", [], node).catch(() => null);
        return { content: [{ type: "text", text: JSON.stringify(params, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: String(e && e.message ? e.message : e) }] };
      }
    }

    case "mcp_guide": {
      return { content: [{ type: "text", text: MCP_GUIDE }] };
    }

    default:
      return { isError: true, content: [{ type: "text", text: `Unknown tool "${name}"` }] };
  }
}

const OP_NUMBERS = {
  transfer: 0,
  limit_order_create: 1,
  limit_order_cancel: 2,
  call_order_update: 3,
  account_create: 5,
  account_update: 6,
  account_whitelist: 7,
  account_upgrade: 8,
  asset_create: 10,
  asset_update: 11,
  asset_update_bitasset: 12,
  asset_update_feed_producers: 13,
  asset_issue: 14,
  asset_reserve: 15,
  asset_fund_fee_pool: 16,
  asset_settle: 17,
  asset_global_settle: 18,
  asset_publish_feed: 19,
  witness_create: 20,
  witness_update: 21,
  proposal_create: 22,
  proposal_update: 23,
  proposal_delete: 24,
  withdraw_permission_create: 25,
  withdraw_permission_update: 26,
  withdraw_permission_claim: 27,
  withdraw_permission_delete: 28,
  committee_member_create: 29,
  committee_member_update: 30,
  vesting_balance_create: 32,
  vesting_balance_withdraw: 33,
  worker_create: 34,
  limit_order_update: 77,
  override_transfer: 38,
  asset_claim_fees: 43,
  asset_update_issuer: 48,
  htlc_create: 49,
  htlc_redeem: 50,
  htlc_extend: 52,
  custom_authority_create: 54,
  custom_authority_update: 55,
  custom_authority_delete: 56,
  ticket_create: 57,
  ticket_update: 58,
  liquidity_pool_create: 59,
  liquidity_pool_delete: 60,
  liquidity_pool_deposit: 61,
  liquidity_pool_withdraw: 62,
  liquidity_pool_exchange: 63,
  samet_fund_create: 64,
  samet_fund_delete: 65,
  samet_fund_update: 66,
  samet_fund_borrow: 67,
  samet_fund_repay: 68,
  credit_offer_create: 69,
  credit_offer_delete: 70,
  credit_offer_update: 71,
  credit_offer_accept: 72,
  credit_deal_repay: 73,
  asset_claim_pool: 47,
  bid_collateral: 45,
};

function operationNumber(name) {
  const n = OP_NUMBERS[name];
  if (n === undefined) throw new Error(`Unknown operation number for "${name}"`);
  return n;
}

function buildServer() {
  const server = new Server(
    { name: "astro-ui-mcp", version: "0.5.51" },
    { capabilities: { resources: {}, tools: {} } }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "astro-ui://pages",
        name: "astro-ui Pages Index",
        mimeType: "application/json",
        description: "Index of all pages exposed by the astro-ui MCP server.",
      },
      {
        uri: "astro-ui://nanoeffects",
        name: "astro-ui Data Readers",
        mimeType: "application/json",
        description: "Index of all raw data readers (nanoeffects) from the astro-ui data layer.",
      },
      {
        uri: "astro-ui://guide",
        name: "astro-ui MCP Agent Guide",
        mimeType: "text/markdown",
        description: "Orientation guide: raw-amount/precision convention, build->broadcast flows, fee handling, node switching.",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const uri = String(req.params.uri);
    if (uri === "astro-ui://pages") {
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(MCP_PAGES, null, 2),
          },
        ],
      };
    }
    if (uri === "astro-ui://nanoeffects") {
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(listNanoEffects(), null, 2),
          },
        ],
      };
    }
    if (uri === "astro-ui://guide") {
      return {
        contents: [{ uri, mimeType: "text/markdown", text: MCP_GUIDE }],
      };
    }
    const docsMatch = uri.match(/^astro-ui:\/\/page\/(.+)\/docs$/);
    const dataMatch = uri.match(/^astro-ui:\/\/page\/(.+)\/data$/);
    const neMatch = uri.match(/^astro-ui:\/\/nanoeffect\/(.+)$/);
    if (docsMatch) {
      const text = await readDocs(docsMatch[1]);
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (dataMatch) {
      const slug = dataMatch[1];
      const queryIdx = slug.indexOf("?");
      let pageSlug = slug;
      let assetArg = null;
      let asset2Arg = null;
      if (queryIdx >= 0) {
        pageSlug = slug.substring(0, queryIdx);
        const qs = new URLSearchParams(slug.substring(queryIdx));
        assetArg = qs.get("asset") || null;
        asset2Arg = qs.get("asset2") || null;
      }
      const data = await getPageData(pageSlug, null, currentUser.chain, "", assetArg, asset2Arg);
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
    if (neMatch) {
      const name = decodeURIComponent(neMatch[1]);
      if (!hasNanoEffect(name)) throw new Error(`Unknown nanoeffect ${name}`);
      const c = chainKey(currentUser.chain);
      const node = getActiveNode(c);
      const data = await callNanoEffect(name, [c, node]);
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ name, args: [c, node], data }, null, 2) }] };
    }
    throw new Error(`Unknown resource ${uri}`);
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [
      {
        uriTemplate: "astro-ui://page/{slug}/docs",
        name: "Page documentation",
        mimeType: "text/markdown",
        description: "Documentation for a given page slug.",
      },
      {
        uriTemplate: "astro-ui://page/{slug}/data",
        name: "Page data",
        mimeType: "application/json",
        description: "Live chain data surfaced by a given page.",
      },
      {
        uriTemplate: "astro-ui://nanoeffect/{name}",
        name: "Data reader",
        mimeType: "application/json",
        description: "Live data from a given nanoeffect reader.",
      },
    ],
  }));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: buildToolList() }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    try {
      return await callTool(name, args || {});
    } catch (e) {
      return { isError: true, content: [{ type: "text", text: String(e && e.message ? e.message : e) }] };
    }
  });

  return server;
}

async function start(port) {
  if (httpServer) return { url: `http://127.0.0.1:${port}/mcp`, alreadyRunning: true };

  mcpServer = buildServer();
  transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await mcpServer.connect(transport);

  const allowedHosts = new Set([
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    `[::1]:${port}`,
    "127.0.0.1",
    "localhost",
    "[::1]",
  ]);
  httpServer = http.createServer((req, res) => {
    const hostFull = req.headers.host || "";
    const hostNoPort = hostFull.split(":")[0];
    // DNS-rebinding / cross-origin mitigation: only answer requests whose Host
    // is the loopback interface. A browser navigating a rebinding domain would
    // send a foreign Host and be rejected before any tool runs.
    if (!allowedHosts.has(hostFull) && !allowedHosts.has(hostNoPort)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("forbidden");
      return;
    }
    if (req.url && req.url.startsWith("/mcp")) {
      transport.handleRequest(req, res).catch((err) => {
        hooks.log("transport error:", err);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal error");
        }
      });
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("astro-ui MCP server. Connect your MCP client to /mcp");
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, "127.0.0.1", () => {
      httpServer.removeListener("error", reject);
      resolve();
    });
  }).catch((err) => {
    try { if (transport && transport.close) transport.close(); } catch (_) {}
    try { if (mcpServer && mcpServer.close) mcpServer.close(); } catch (_) {}
    transport = null;
    mcpServer = null;
    httpServer = null;
    throw err;
  });

  hooks.log(`astro-ui MCP server listening on http://127.0.0.1:${port}/mcp`);
  hooks.status({ running: true, port, url: `http://127.0.0.1:${port}/mcp`, currentUser });
  return { url: `http://127.0.0.1:${port}/mcp` };
}

async function stop() {
  try {
    if (transport && transport.close) await transport.close();
  } catch (e) { hooks.log("transport close error:", e); }
  try {
    if (mcpServer && mcpServer.close) await mcpServer.close();
  } catch (e) { hooks.log("mcpServer close error:", e); }
  if (httpServer) {
    try {
      await new Promise((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
    } catch (_) {}
  }
  httpServer = null;
  transport = null;
  mcpServer = null;
  hooks.status({ running: false });
}

export { start, stop, setHooks, setCurrentUser, setStoredUsers, setActiveNode, currentUser };
