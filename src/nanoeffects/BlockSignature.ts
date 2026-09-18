import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

/**
 * Fetch the `witness_signature` string for a given block from the chain.
 *
 * Connects to a BitShares WebSocket node, retrieves the full block via the
 * `get_block` database API, and extracts the `witness_signature` field.
 * This signature is the seed input for the airdrop lottery algorithms
 * (see `filterSignature` in `airdropAlgos.js`).
 *
 * @param {string}         chain         Chain identifier (`"bitshares"` or
 *   `"bitshares_testnet"`).
 * @param {number|string}  blockNumber   Block height to fetch.
 * @param {string|null}    [specificNode=null]  Optional WebSocket node URL.
 *   Falls back to the first node in the chain's configured node list.
 * @returns {Promise<string>}  The witness signature hex string.
 * @throws {Error} If the block has no `witness_signature` field or the
 *   fetch fails.
 */
async function getBlockSignature(
  chain: string,
  blockNumber: number | string,
  specificNode?: string | null,
) {
  const node = specificNode
    ? specificNode
    : (chains as any)[chain].nodeList[0].url;

  let currentAPI: any;
  try {
    // NOTE: Apis.instance() is synchronous (returns the shared singleton,
    // not a Promise), so `.then()` on its result throws
    // "I.instance(...).then is not a function". `await` works on both
    // plain values and Promises, matching every other nanoeffect.
    currentAPI = await Apis.instance(
      node,
      true,
      4000,
      { enableDatabase: true },
      (error: Error) => console.log({ error }),
    );
  } catch (error) {
    console.log({ error });
    throw error;
  }

  try {
    const block = await currentAPI
      .db_api()
      .exec("get_block", [parseInt(blockNumber as string, 10)]);
    if (!block || !block.witness_signature) {
      throw new Error("Block signature not found");
    }
    return block.witness_signature;
  } catch (error) {
    console.log({ error });
    throw error;
  } finally {
    try {
      currentAPI.close();
    } catch {
      // ignore release errors
    }
  }
}

/**
 * Nanoquery store that fetches a block's witness signature.
 *
 * Wraps {@link getBlockSignature} for use with `@nanostores/query`.
 * The store keys are `[chain, blockNumber, specificNode?]`.
 *
 * @example
 * ```ts
 * const store = createBlockSignatureStore("bitshares", 12345, null);
 * // store.value contains the witness_signature string
 * ```
 */
const [createBlockSignatureStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const blockNumber = args[1] as number;
    let specificNode = args[2] ? (args[2] as string) : null;

    try {
      return await getBlockSignature(chain, blockNumber, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }
  },
});

export { createBlockSignatureStore, getBlockSignature };
