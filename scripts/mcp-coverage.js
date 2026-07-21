// Coverage check for the astro-ui MCP server.
// Asserts that every operation surface discovered in the UI (DeepLinkDialog
// call sites) is either implemented as a builder or explicitly listed as a
// known gap, and that every registry operation entry (not flagged built:false)
// has a builder.
//
// Run: bun run scripts/mcp-coverage.js

import { MCP_PAGES, allCataloguedOperations } from "../src/mcp/registry.js";
import { BUILT_OPERATION_NAMES } from "../src/mcp/operations.js";

const built = new Set(BUILT_OPERATION_NAMES);

// Operations observed as DeepLinkDialog surfaces across the app.
const discovered = [
  "account_whitelist", "transfer", "liquidity_pool_delete", "asset_fund_fee_pool",
  "asset_claim_pool", "asset_claim_fees", "asset_update_feed_producers", "asset_issue",
  "asset_reserve", "asset_global_settle", "asset_update_issuer", "override_transfer",
  "proposal_create", "account_create", "liquidity_pool_create", "ticket_create",
  "ticket_update", "asset_update", "asset_create", "vesting_balance_create",
  "credit_deal_repay", "credit_offer_accept", "htlc_extend", "htlc_redeem",
  "htlc_create", "account_upgrade", "limit_order_create", "limit_order_update",
  "limit_order_cancel", "samet_fund_update", "samet_fund_delete", "samet_fund_create",
  "call_order_update", "proposal_delete", "proposal_update", "liquidity_pool_deposit",
  "liquidity_pool_withdraw", "liquidity_pool_exchange",
  "worker_create", "witness_create", "witness_update", "committee_member_create",
  "committee_member_update", "withdraw_permission_update", "withdraw_permission_delete",
  "withdraw_permission_claim", "custom_authority_update", "custom_authority_delete",
];

// Intentionally unimplemented (use wrap_as_proposal / not applicable).
const KNOWN_GAPS = new Set([
  "transfer_to_blind",
  "proposal_create", "proposal_update", "proposal_delete",
]);

let failures = 0;

for (const op of discovered) {
  const ok = built.has(op) || KNOWN_GAPS.has(op);
  if (!ok) {
    console.log(`  UNCOVERED: discovered operation "${op}" has no builder and is not a known gap`);
    failures++;
  }
}

for (const page of MCP_PAGES) {
  if (!page.operations) continue;
  for (const o of page.operations) {
    if (o.built === false) continue;
    if (!built.has(o.name)) {
      console.log(`  REGISTRY GAP: page "${page.slug}" lists op "${o.name}" without a builder`);
      failures++;
    }
  }
}

const catalogued = new Set(allCataloguedOperations());
console.log(`Pages exposed (non-irrelevant): ${MCP_PAGES.length}`);
console.log(`Distinct catalogued operations: ${catalogued.size}`);
console.log(`Implemented builders: ${built.size}`);
console.log(`Discovered surfaces: ${discovered.length}, known gaps: ${KNOWN_GAPS.size}`);

if (failures) {
  console.log(`\nFAILED: ${failures} coverage gap(s).`);
  process.exit(1);
}
console.log("\nPASS: every discovered operation surface is covered or explicitly gapped, and every registry op has a builder.");
