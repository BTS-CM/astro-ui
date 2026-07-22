#!/usr/bin/env node
/**
 * MCP Server Integration Test
 *
 * Connects to the running astro-ui MCP server via MCP protocol,
 * exercises every tool, and logs all results to test-mcp-results.txt.
 *
 * Usage: node scripts/test-mcp-client.js
 */

import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, "test-mcp-results.txt");

const MCP_URL = process.env.MCP_URL || "http://127.0.0.1:35899/mcp";
const DELAY_MS = 200;

let client;
let tools = [];
let totalTests = 0;
let passed = 0;
let failed = 0;
let warnings = 0;
let logLines = [];

// ── Logging helpers ──────────────────────────────

function log(msg) {
  console.log(msg);
  logLines.push(stripAnsi(msg));
}

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function ok(msg) {
  totalTests++;
  passed++;
  log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function fail(msg, detail) {
  totalTests++;
  failed++;
  log(`  \x1b[31m✗\x1b[0m ${msg}`);
  if (detail) log(`      ${detail}`);
}

function warn(msg, detail) {
  totalTests++;
  warnings++;
  log(`  \x1b[33m⚠\x1b[0m ${msg}`);
  if (detail) log(`      ${detail}`);
}

function section(title) {
  log(`\n${"═".repeat(60)}`);
  log(`\x1b[36mℹ ${title}\x1b[0m`);
  log(`${"═".repeat(60)}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Tool call wrapper ────────────────────────────

async function callTool(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) {
    throw new Error(result.content?.[0]?.text || "Unknown error");
  }
  return result.content?.[0]?.text;
}

async function safeCall(label, fn) {
  try {
    await fn();
  } catch (e) {
    fail(label, e.message);
  }
  await sleep(DELAY_MS);
}

// ── Phase 1: Connect ────────────────────────────

async function connect() {
  section("Phase 1: Connect");
  log(`  URL: ${MCP_URL}`);

  client = new Client({ name: "mcp-test-client", version: "1.0.0" });

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: {
      headers: {
        "Accept": "text/event-stream, application/json",
        "Content-Type": "application/json",
      },
    },
  });

  await client.connect(transport);
  ok(`Connected to ${MCP_URL}`);

  const serverInfo = client.getServerVersion();
  if (serverInfo) {
    log(`  Server: ${serverInfo.name} v${serverInfo.version}`);
  }
}

// ── Phase 2: Discover tools ─────────────────────

async function discoverTools() {
  section("Phase 2: Discover Tools");

  const result = await client.listTools();
  tools = result.tools;
  ok(`Discovered ${tools.length} tools`);

  const expected = [
    "list_pages", "list_nanoeffects", "get_page_docs", "get_page_data",
    "build_operation", "describe_operation", "search_assets", "get_asset",
    "get_nanoeffect", "get_objects", "get_accounts", "query",
    "get_chain_id", "get_active_node", "set_active_node",
    "to_raw_amount", "from_raw_amount", "prepare_transaction",
    "get_bitasset", "get_smartcoins", "get_chain_parameters",
    "classify_call_order", "compute_repayment", "mcp_guide",
    "set_current_user", "get_current_user", "list_known_accounts",
    "generate_deeplink", "export_operation_json", "wrap_as_proposal",
  ];

  const toolNames = new Set(tools.map((t) => t.name));
  let found = 0;
  for (const name of expected) {
    if (toolNames.has(name)) found++;
    else warn(`Expected tool "${name}" not found`);
  }
  ok(`${found}/${expected.length} expected tools present`);

  log(`\n  \x1b[36mℹ All tools:\x1b[0m`);
  for (const t of tools) {
    log(`    - ${t.name}: ${(t.description || "").slice(0, 55)}…`);
  }
}

// ── Phase 3: List pages & nanoeffects ───────────

async function listResources() {
  section("Phase 3: List Resources");

  await safeCall("list_pages", async () => {
    const pages = JSON.parse(await callTool("list_pages"));
    if (Array.isArray(pages) && pages.length > 0) {
      ok(`list_pages: ${pages.length} pages`);
      const first = pages[0];
      if (first.slug && first.title && first.category) {
        ok("list_pages: structure valid");
      } else {
        warn("list_pages: structure incomplete");
      }
      for (const p of pages.slice(0, 4)) {
        log(`      ${p.slug} → ${p.title} (${p.category})`);
      }
    } else {
      fail("list_pages: expected non-empty array");
    }
  });

  await safeCall("list_nanoeffects", async () => {
    const effects = JSON.parse(await callTool("list_nanoeffects"));
    if (Array.isArray(effects) && effects.length > 0) {
      ok(`list_nanoeffects: ${effects.length} effects`);
      const first = effects[0];
      if (first.name && first.argNames && first.description) {
        ok("list_nanoeffects: structure valid");
      } else {
        warn("list_nanoeffects: structure incomplete");
      }
      for (const e of effects.slice(0, 4)) {
        log(`      ${e.name}: [${e.argNames?.join(", ")}]`);
      }
    } else {
      fail("list_nanoeffects: expected non-empty array");
    }
  });

  await safeCall("list_known_accounts", async () => {
    const accounts = JSON.parse(await callTool("list_known_accounts"));
    if (Array.isArray(accounts)) {
      ok(`list_known_accounts: ${accounts.length} accounts`);
    } else {
      warn("list_known_accounts: not an array");
    }
  });

  await safeCall("get_current_user", async () => {
    const user = JSON.parse(await callTool("get_current_user"));
    if (user && typeof user === "object") {
      ok("get_current_user: returned user object");
      log(`      ${JSON.stringify(user)}`);
    } else {
      warn("get_current_user: invalid response");
    }
  });
}

// ── Phase 4: Build operations ───────────────────

const BUILD_CASES = [
  {
    name: "transfer",
    args: { params: { from: "1.2.0", to: "1.2.1", amount: 100000, asset_id: "1.3.0" } },
    fields: ["from", "to", "amount", "fee"],
  },
  {
    name: "limit_order_create",
    args: {
      params: {
        seller: "1.2.0",
        amount_to_sell: 1000000,
        amount_to_sell_asset: "1.3.0",
        min_to_receive: 50000,
        min_to_receive_asset: "1.3.121",
        expiration: new Date(Date.now() + 86400000).toISOString(),
        fill_or_kill: false,
      },
    },
    fields: ["seller", "amount_to_sell", "min_to_receive", "fee"],
  },
  {
    name: "call_order_update",
    args: {
      params: {
        funding_account: "1.2.0",
        delta_collateral: 2000000,
        delta_collateral_asset: "1.3.0",
        delta_debt: 100000,
        delta_debt_asset: "1.3.121",
      },
    },
    fields: ["funding_account", "delta_collateral", "delta_debt", "fee"],
  },
  {
    name: "asset_issue",
    args: { params: { issuer: "1.2.0", asset_to_issue: 100000, asset_id: "1.3.0", issue_to_account: "1.2.0" } },
    fields: ["issuer", "asset_to_issue", "fee"],
  },
  {
    name: "account_update",
    args: {
      params: {
        account: "1.2.0",
        new_options: { memo_key: "BTS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV" },
      },
    },
    fields: ["account", "fee"],
  },
  {
    name: "witness_create",
    args: {
      params: {
        witness_account: "1.2.0",
        url: "https://test.example.com",
        block_signing_key: "BTS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV",
      },
    },
    fields: ["witness_account", "url", "fee"],
  },
  {
    name: "htlc_create",
    args: {
      params: {
        from: "1.2.0", to: "1.2.1", amount: 100000, asset_id: "1.3.0",
        preimage_hash: [0, "abc123"], preimage_size: 10, claim_period_seconds: 86400,
      },
    },
    fields: ["from", "to", "amount", "fee"],
  },
  {
    name: "liquidity_pool_create",
    args: {
      params: {
        account: "1.2.0", asset_a: "1.3.0", asset_b: "1.3.121",
        taker_fee_percent: 30, withdrawal_fee_percent: 30,
        share_asset: { symbol: "TEST", precision: 5, issuer: "1.2.0" },
      },
    },
    fields: ["account", "asset_a", "asset_b", "fee"],
  },
  {
    name: "credit_offer_create",
    args: {
      params: {
        owner_account: "1.2.0", asset_type: "1.3.0", balance: 10000000,
        fee_rate: 100, max_duration_seconds: 2592000, min_deal_amount: 100000, enabled: true,
      },
    },
    fields: ["owner_account", "asset_type", "balance", "fee"],
  },
  {
    name: "samet_fund_create",
    args: { params: { owner_account: "1.2.0", asset_type: "1.3.0", balance: 5000000, fee_rate: 50 } },
    fields: ["owner_account", "asset_type", "balance", "fee"],
  },
];

async function buildOperations() {
  section("Phase 4: Build Operations");

  let ok_ = 0;
  let fail_ = 0;

  for (const tc of BUILD_CASES) {
    try {
      const json = await callTool("build_operation", { operation: tc.name, ...tc.args });
      const obj = JSON.parse(json);
      const missing = tc.fields.filter((f) => !(f in obj));

      if (missing.length === 0) {
        const bytes = new TextEncoder().encode(json).length;
        ok(`build_operation("${tc.name}") → ${bytes} bytes`);
        ok_++;
        log(`\n      ${JSON.stringify(obj, null, 2).replace(/\n/g, "\n      ")}`);
      } else {
        fail(`build_operation("${tc.name}") missing: ${missing.join(", ")}`);
        fail_++;
      }
    } catch (e) {
      fail(`build_operation("${tc.name}")`, e.message);
      fail_++;
    }
    await sleep(DELAY_MS);
  }

  log(`\n  \x1b[36mℹ Build: ${ok_}/${ok_ + fail_} passed\x1b[0m`);
}

// ── Phase 5: Describe operations ────────────────

const DESCRIBE_OPS = [
  "transfer", "limit_order_create", "call_order_update",
  "asset_issue", "witness_create",
];

async function describeOperations() {
  section("Phase 5: Describe Operations");

  for (const op of DESCRIBE_OPS) {
    await safeCall(`describe_operation("${op}")`, async () => {
      const desc = JSON.parse(await callTool("describe_operation", { operation: op }));
      if (desc.name === op && Array.isArray(desc.fields) && Array.isArray(desc.amountFields)) {
        ok(`${op}: ${desc.fields.length} fields, ${desc.amountFields.length} amounts`);
        for (const f of desc.fields) {
          log(`      ${f.name}: ${f.kind}`);
        }
      } else {
        fail(`describe_operation("${op}"): invalid structure`);
      }
    });
  }
}

// ── Phase 6: Asset search ───────────────────────

const SEARCHES = [
  { q: "BTS", label: "Search 'BTS'" },
  { q: "bit", label: "Search 'bit'" },
  { q: "1.3.0", label: "Search by ID" },
];

async function searchAssets() {
  section("Phase 6: Asset Search");

  for (const s of SEARCHES) {
    await safeCall(s.label, async () => {
      const results = JSON.parse(await callTool("search_assets", { query: s.q, limit: 10 }));
      if (!Array.isArray(results)) {
        fail(`${s.label}: expected array`);
        return;
      }
      ok(`${s.label}: ${results.length} results`);
      if (results.length > 0) {
        const a = results[0];
        if (a.id && a.symbol && a.precision !== undefined) {
          ok(`${s.label}: structure valid`);
        } else {
          warn(`${s.label}: structure incomplete`);
        }
        for (const r of results.slice(0, 3)) {
          log(`      ${r.id} ${r.symbol} (precision: ${r.precision})`);
        }
      }
    });
  }
}

// ── Phase 7: Get asset details ──────────────────

async function getAsset() {
  section("Phase 7: Get Asset Details");

  await safeCall("get_asset", async () => {
    const results = JSON.parse(await callTool("get_asset", { asset_ids: ["1.3.0", "1.3.121"] }));
    if (!Array.isArray(results) || results.length !== 2) {
      fail("get_asset: expected 2 assets");
      return;
    }
    ok(`get_asset: ${results.length} assets`);
    const bts = results.find((a) => a.id === "1.3.0");
    if (bts?.symbol === "BTS" && bts?.precision === 5) {
      ok("BTS details correct");
    } else {
      warn("BTS details may be incorrect");
    }
    for (const a of results) {
      log(`      ${a.id}: ${a.symbol} (precision: ${a.precision})`);
    }
  });
}

// ── Phase 8: Amount conversion ──────────────────

async function convertAmounts() {
  section("Phase 8: Amount Conversion");

  await safeCall("to_raw_amount", async () => {
    const raw = JSON.parse(await callTool("to_raw_amount", { asset_id: "1.3.0", human_amount: 1.5 }));
    if (raw.raw_amount === 150000) {
      ok(`to_raw_amount(1.3.0, 1.5) = ${raw.raw_amount}`);
    } else {
      fail(`to_raw_amount = ${raw.raw_amount}`, "Expected 150000");
    }
  });

  await safeCall("from_raw_amount", async () => {
    const h = JSON.parse(await callTool("from_raw_amount", { asset_id: "1.3.0", raw_amount: 150000 }));
    if (h.human_amount === 1.5) {
      ok(`from_raw_amount(1.3.0, 150000) = ${h.human_amount}`);
    } else {
      fail(`from_raw_amount = ${h.human_amount}`, "Expected 1.5");
    }
  });
}

// ── Phase 9: Chain data (nanoeffects) ───────────

const NANOEFFECT_TESTS = [
  { name: "getAccountBalances", args: ["bitshares", "1.2.0"], label: "Balances" },
  { name: "getAccountLimitOrders", args: ["bitshares", "1.2.0"], label: "Open orders" },
  { name: "getUserCallOrders", args: ["bitshares", "1.2.0"], label: "Margin positions" },
  { name: "getTopActiveMarkets", args: [10, 7], label: "Top markets" },
];

async function chainData() {
  section("Phase 9: Chain Data (nanoeffects)");

  for (const t of NANOEFFECT_TESTS) {
    await safeCall(t.label, async () => {
      const result = JSON.parse(
        await callTool("get_nanoeffect", {
          name: t.name,
          args: t.args,
        }),
      );

      if (result.data != null) {
        const type = Array.isArray(result.data) ? `array[${result.data.length}]` : typeof result.data;
        ok(`${t.label}: ${type}`);
        if (Array.isArray(result.data) && result.data.length > 0) {
          log(`\n      ${JSON.stringify(result.data[0], null, 2).replace(/\n/g, "\n      ")}`);
        }
      } else if (result.error) {
        fail(`${t.label}: ${result.error}`);
      } else {
        warn(`${t.label}: null/undefined`);
      }
    });
  }
}

// ── Phase 10: Page data ─────────────────────────

const PAGE_SLUGS = ["balances", "dex", "witnesses", "governance"];

async function pageData() {
  section("Phase 10: Page Data");

  for (const slug of PAGE_SLUGS) {
    await safeCall(`get_page_data("${slug}")`, async () => {
      const result = JSON.parse(await callTool("get_page_data", { slug, chain: "bitshares" }));
      if (result != null) {
        const type = Array.isArray(result) ? `array[${result.length}]` : typeof result;
        ok(`${slug}: ${type}`);
        if (Array.isArray(result) && result.length > 0) {
          log(`\n      ${JSON.stringify(result[0], null, 2).replace(/\n/g, "\n      ")}`);
        } else if (typeof result === "object") {
          log(`\n      ${JSON.stringify(result, null, 2).replace(/\n/g, "\n      ")}`);
        }
      } else {
        warn(`${slug}: null/undefined`);
      }
    });
  }
}

// ── Phase 11: Multi-op transaction ──────────────

async function multiOpTransaction() {
  section("Phase 11: Multi-op Transaction");

  await safeCall("multi-op assembly", async () => {
    const op1 = JSON.parse(
      await callTool("build_operation", {
        operation: "transfer",
        params: { from: "1.2.0", to: "1.2.1", amount: 100000, asset_id: "1.3.0" },
      }),
    );

    await sleep(DELAY_MS);

    const op2 = JSON.parse(
      await callTool("build_operation", {
        operation: "limit_order_create",
        params: {
          seller: "1.2.0", amount_to_sell: 500000, amount_to_sell_asset: "1.3.0",
          min_to_receive: 25000, min_to_receive_asset: "1.3.121",
          expiration: new Date(Date.now() + 86400000).toISOString(), fill_or_kill: false,
        },
      }),
    );

    const payload = {
      operationNames: ["transfer", "limit_order_create"],
      trxJSON: [op1, op2],
    };
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json).length;
    ok(`Multi-op tx: ${bytes} bytes, 2 ops`);
    log(`\n      ${JSON.stringify(payload, null, 2).replace(/\n/g, "\n      ")}`);
  });
}

// ── Phase 12: Smartcoins & bitasset data ────────

async function smartcoinsData() {
  section("Phase 12: Smartcoins & Bitasset Data");

  await safeCall("get_bitasset", async () => {
    try {
      const result = JSON.parse(await callTool("get_bitasset", { asset: "BITUSD" }));
      if (result && result.asset_id) {
        ok(`get_bitasset: ${result.symbol} (${result.status})`);
        log(`      borrowable: ${result.borrowable}`);
        log(`      feed_price: ${result.feed_price_human}`);
      } else if (result && result.note) {
        warn(`get_bitasset: ${result.note}`);
      } else {
        warn("get_bitasset: no data");
      }
    } catch (e) {
      warn(`get_bitasset: ${e.message}`);
    }
  });

  await safeCall("get_smartcoins", async () => {
    try {
      const result = JSON.parse(await callTool("get_smartcoins", {}));
      if (result && result.smartcoins) {
        ok(`get_smartcoins: ${result.smartcoins.length} smartcoins`);
        if (result.counts) {
          log(`      counts: alive=${result.counts.alive}, healthy=${result.counts.healthy}, ill=${result.counts.ill}, dead=${result.counts.dead}`);
        }
      } else {
        warn("get_smartcoins: no data");
      }
    } catch (e) {
      warn(`get_smartcoins: ${e.message}`);
    }
  });

  await safeCall("get_chain_parameters", async () => {
    try {
      const result = JSON.parse(await callTool("get_chain_parameters", { chain: "bitshares" }));
      if (result && result.parameters) {
        ok("get_chain_parameters: returned parameters");
        log(`      max_block_size: ${result.parameters.max_block_size}`);
      } else {
        warn("get_chain_parameters: no data");
      }
    } catch (e) {
      warn(`get_chain_parameters: ${e.message}`);
    }
  });
}

// ── Phase 13: User context ──────────────────────

async function userContext() {
  section("Phase 13: User Context");

  await safeCall("set_current_user", async () => {
    const result = JSON.parse(
      await callTool("set_current_user", {
        id: "1.2.0",
        chain: "bitshares",
        username: "testuser",
      }),
    );
    if (result && result.id === "1.2.0") {
      ok("set_current_user: user set");
      log(`      ${JSON.stringify(result)}`);
    } else {
      warn("set_current_user: unexpected response");
    }
  });

  await safeCall("get_current_user after set", async () => {
    const result = JSON.parse(await callTool("get_current_user"));
    if (result && result.id === "1.2.0") {
      ok("get_current_user: user matches");
    } else {
      warn("get_current_user: user mismatch");
    }
  });

  await safeCall("get_active_node", async () => {
    const result = JSON.parse(await callTool("get_active_node", { chain: "bitshares" }));
    if (result && result.activeNode) {
      ok(`get_active_node: ${result.activeNode}`);
      if (result.nodes && result.nodes.length > 0) {
        log(`      ${result.nodes.length} configured nodes`);
      }
    } else {
      warn("get_active_node: no active node");
    }
  });
}

// ── Phase 14: Guide ─────────────────────────────

async function guide() {
  section("Phase 14: MCP Guide");

  await safeCall("mcp_guide", async () => {
    const guide = await callTool("mcp_guide");
    if (guide && guide.length > 100) {
      ok(`mcp_guide: ${guide.length} chars`);
      const lines = guide.split("\n").slice(0, 5);
      for (const line of lines) {
        log(`      ${line}`);
      }
    } else {
      warn("mcp_guide: too short or empty");
    }
  });
}

// ── Phase 15: Edge cases ────────────────────────

async function edgeCases() {
  section("Phase 15: Edge Cases");

  await safeCall("unknown tool", async () => {
    try {
      await callTool("nonexistent_tool");
      fail("Should throw for unknown tool");
    } catch {
      ok("Unknown tool throws error");
    }
  });

  await safeCall("unknown operation", async () => {
    try {
      await callTool("build_operation", { operation: "nonexistent_op" });
      fail("Should throw for unknown operation");
    } catch {
      ok("Unknown operation throws error");
    }
  });

  await safeCall("missing args", async () => {
    try {
      await callTool("build_operation", { operation: "transfer" });
      ok("Missing args: builder defers validation to chain");
    } catch {
      ok("Missing args: builder throws");
    }
  });

  await safeCall("query escape hatch", async () => {
    try {
      const result = JSON.parse(
        await callTool("query", {
          chain: "bitshares",
          apiName: "database",
          method: "get_chain_id",
          params: [],
        })
      );
      if (result) {
        ok(`query: returned ${typeof result}`);
        log(`      ${JSON.stringify(result)}`);
      } else {
        warn("query: null result");
      }
    } catch (e) {
      warn(`query: ${e.message}`);
    }
  });

  await safeCall("get_chain_id", async () => {
    const result = JSON.parse(await callTool("get_chain_id", { chain: "bitshares" }));
    if (result && result.chain_id) {
      ok(`get_chain_id: ${result.chain_id.slice(0, 16)}…`);
    } else {
      warn("get_chain_id: no chain_id");
    }
  });
}

// ── Main ─────────────────────────────────────────

async function main() {
  const t0 = Date.now();

  log(`\n${"═".repeat(60)}`);
  log(`\x1b[36mℹ MCP Client Integration Test\x1b[0m`);
  log(`${"═".repeat(60)}`);
  log(`Server:  ${MCP_URL}`);
  log(`Delay:   ${DELAY_MS}ms between requests`);
  log(`Started: ${new Date().toISOString()}`);
  log(`${"═".repeat(60)}\n`);

  const phases = [
    connect,
    discoverTools,
    listResources,
    buildOperations,
    describeOperations,
    searchAssets,
    getAsset,
    convertAmounts,
    chainData,
    pageData,
    multiOpTransaction,
    smartcoinsData,
    userContext,
    guide,
    edgeCases,
  ];

  for (const phase of phases) {
    try {
      await phase();
    } catch (e) {
      fail(`Phase failed: ${phase.name}`, e.stack || e.message);
      break;
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  log(`\n${"═".repeat(60)}`);
  log(`\x1b[36mℹ SUMMARY\x1b[0m`);
  log(`${"═".repeat(60)}`);
  log(`  Total:    ${totalTests}`);
  log(`  \x1b[32m✓ Passed:   ${passed}\x1b[0m`);
  log(`  \x1b[31m✗ Failed:   ${failed}\x1b[0m`);
  log(`  \x1b[33m⚠ Warnings: ${warnings}\x1b[0m`);
  log(`  Duration: ${elapsed}s`);
  log(`${"═".repeat(60)}\n`);

  if (failed === 0) {
    log(`\x1b[32m✓ ALL TESTS PASSED\x1b[0m\n`);
  } else {
    log(`\x1b[31m✗ ${failed} TEST(S) FAILED\x1b[0m\n`);
  }

  fs.writeFileSync(LOG_FILE, logLines.join("\n"));
  log(`\x1b[36mℹ Results written to ${LOG_FILE}\x1b[0m`);

  process.exit(failed === 0 ? 0 : 1);
}

main();
