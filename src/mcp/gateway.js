import Apis from "../bts/ws/ApiInstances";
import TransactionBuilder from "../bts/chain/TransactionBuilder";
import { chains } from "../config/chains";
import { generateDeepLink } from "../lib/deeplink.js";

/**
 * Single gateway through which the MCP server reaches node capabilities
 * (Bitshares websocket, deeplink generation, fee calculation).
 * Everything the MCP server does that touches node lives here.
 */

const DEFAULT_OPTS = { enableDatabase: true, enableOrders: true, enableCrypto: false };

function resolveNode(chain, nodeURL) {
  if (nodeURL && nodeURL.length) {
    if (!/^wss?:\/\//i.test(nodeURL)) {
      throw new Error(`Refusing node URL with non-websocket scheme: ${nodeURL}`);
    }
    return nodeURL;
  }
  const list = chains[chain] && chains[chain].nodeList;
  if (!list || !list.length) {
    throw new Error(`No nodes configured for chain "${chain}"`);
  }
  return list[0].url;
}

async function withApi(chain, nodeURL, fn) {
  const node = resolveNode(chain, nodeURL);
  const api = await Apis.instance(node, true, 4000, DEFAULT_OPTS, (e) =>
    console.log({ mcpGatewayError: e })
  );
  await api.init_promise;
  try {
    return await fn(api);
  } finally {
    try {
      api.close();
    } catch (e) {
      /* ignore */
    }
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getObjects(chain, objectIds, nodeURL) {
  return withApi(chain, nodeURL, async (api) => {
    const ids = Array.isArray(objectIds) ? objectIds : [objectIds];
    const chunks = chunk(ids, chain === "bitshares" ? 50 : 10);
    let result = [];
    for (const c of chunks) {
      const objs = await api.db_api().exec("get_objects", [c, false]);
      if (objs && objs.length) result = result.concat(objs.filter((x) => x != null));
    }
    return result;
  });
}

async function getAccountByName(chain, name, nodeURL) {
  return withApi(chain, nodeURL, async (api) => {
    return api.db_api().exec("get_account_by_name", [name]);
  });
}

async function getFullAccounts(chain, namesOrIds, nodeURL) {
  return withApi(chain, nodeURL, async (api) => {
    const list = Array.isArray(namesOrIds) ? namesOrIds : [namesOrIds];
    return api.db_api().exec("get_full_accounts", [list, false]);
  });
}

async function query(chain, apiName, method, params, nodeURL) {
  return withApi(chain, nodeURL, async (api) => {
    const sub = api[apiName] ? api[apiName]() : null;
    if (!sub || typeof sub.exec !== "function") {
      throw new Error(`Unknown api "${apiName}"`);
    }
    return sub.exec(method, params);
  });
}

async function calculateOperationFees(nodeURL, trxJSON) {
  return withApi("bitshares", nodeURL, async (api) => {
    const op = { ...trxJSON };
    delete op.fee;
    const fee = await api
      .db_api()
      .exec("get_required_fees", [[[op]], "1.3.0"]);
    return fee && fee.length ? fee[0].amount : null;
  });
}

async function makeDeepLink(usrChain, nodeURL, operationNames, trxJSON) {
  const node = resolveNode(usrChain, nodeURL);
  return generateDeepLink(usrChain, node, operationNames, trxJSON);
}

function getChainId(chain, nodeURL) {
  const c = resolveNode(chain, nodeURL);
  const key = Object.keys(chains).find((k) => chains[k].nodeList && chains[k].nodeList.some((n) => n.url === c));
  if (key && chains[key].chainId) return chains[key].chainId;
  // Fall back to known ids
  if (c.includes("testnet")) return "39f5e2ede1f8bc1a3a54a7914414e3779e33193f1f5693510e73cb7a87617447";
  return "4018d7844c78f6a6c41c6a552b898022310fc5dec06da467ee7905a8dad512c8";
}

async function getAssets(chain, ids, nodeURL) {
  const objs = await getObjects(chain, ids, nodeURL);
  return (objs || []).map((a) => ({
    id: a.id,
    symbol: a.symbol,
    precision: a.precision,
    issuer: a.issuer,
    market_fee_percent: a.options ? a.options.market_fee_percent : undefined,
  }));
}

/**
 * Assemble a fully-signed-ready transaction object (fees filled, head block
 * stamped, finalized) WITHOUT a Beet wrapper. Returns the transaction plus the
 * chain id and reference block data the caller needs to sign it with their own key.
 */
async function prepareTransaction(chain, nodeURL, operationNames, operations) {
  const node = resolveNode(chain, nodeURL);
  const inst = Apis.instance(
    node,
    true,
    4000,
    { enableDatabase: true, enableOrders: true, enableCrypto: false },
    (e) => console.log({ mcpGatewayError: e })
  );
  try {
    await inst.init_promise;
  } catch (e) {
    throw e;
  }
  try {
    const tr = new TransactionBuilder();
    for (let i = 0; i < operations.length; i++) {
      const op = { ...operations[i] };
      if (op.memo && typeof op.memo.message === "string") {
        op.memo.message = Buffer.from(op.memo.message, "utf-8");
      }
      tr.add_type_operation(operationNames[i], op);
    }
    await tr.set_required_fees();
    await tr.update_head_block();
    tr.set_expire_seconds(7200);
    tr.finalize();
    return {
      transaction: tr.toObject(),
      chain_id: inst.chain_id,
      ref_block_num: tr.ref_block_num,
      ref_block_prefix: tr.ref_block_prefix,
    };
  } catch (e) {
    throw e;
  } finally {
    try {
      inst.close();
    } catch (e) {
      /* ignore */
    }
  }
}

export {
  resolveNode,
  withApi,
  getObjects,
  getAccountByName,
  getFullAccounts,
  query,
  calculateOperationFees,
  makeDeepLink,
  getChainId,
  getAssets,
  prepareTransaction,
  chains,
};
