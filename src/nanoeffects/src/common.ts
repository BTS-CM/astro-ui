import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

/**
 * Shared low-level helpers for fetching objects from the BitShares chain.
 *
 * Used by the majority of nanoeffects that need to read on-chain objects
 * via the `get_objects` database API.
 *
 * @module common
 */

/**
 * Split an array into chunks of the given size.
 *
 * Used internally to batch `get_objects` calls so that no single request
 * exceeds the node's per-call object limit.
 *
 * @param {any[]}   arr   Input array to split.
 * @param {number}  size  Maximum chunk size (> 0).
 * @returns {any[][]}  Array of chunks.
 * @private
 */
function _sliceIntoChunks(arr: any[], size: number) {
  const chunks: any[] = [];
  for (let i = 0; i < arr.length; i += size) {
    const chunk = arr.slice(i, i + size);
    chunks.push(chunk);
  }
  return chunks;
}

/**
 * Fetch an array of on-chain objects by their ids.
 *
 * Connects to a BitShares WebSocket node and retrieves objects via the
 * `get_objects` database API.  Objects are fetched in batches of 50
 * (mainnet) or 10 (testnet) to avoid exceeding per-call limits.
 *
 * Null objects (deleted or non-existent) are silently filtered out.
 *
 * @param {string}       chain         Chain identifier (`"bitshares"` or
 *   `"bitshares_testnet"`).
 * @param {string[]}     object_ids    Array of object ids to fetch
 *   (e.g. `["2.0.0", "1.3.0"]`).
 * @param {string|null}  [specificNode]  Optional WebSocket node URL.
 *   Falls back to the first node in the chain's configured node list.
 * @param {any}          [existingAPI]  Optional pre-opened API connection.
 *   When provided the connection is reused and **not** closed afterwards.
 *   When omitted a fresh connection is opened and closed after the fetch.
 * @returns {Promise<Object[]>}  Array of retrieved (non-null) objects.
 * @rejects {Error} If the WebSocket connection fails.
 */
async function getObjects(
  chain: string,
  object_ids: string[],
  specificNode?: string | null,
  existingAPI?: any
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = existingAPI
        ? existingAPI
        : await Apis.instance(
            node,
            true,
            4000,
            { enableDatabase: true },
            (error: Error) => {
              if (error) {
                console.log({ error });
              }
            }
          );
    } catch (error) {
      console.log({ error, node });
      return reject(error);
    }

    if (!object_ids || !object_ids.length) {
      if (!existingAPI) {
        try {
          currentAPI.close();
        } catch {
          // ignore close errors for empty fetches
        }
      }
      resolve([]);
      return;
    }

    const chunksOfInputs = _sliceIntoChunks(
      object_ids,
      chain === "bitshares" ? 50 : 10
    );

    let retrievedObjects: Object[] = [];
    let chunkErrors: unknown[] = [];
    for (let i = 0; i < chunksOfInputs.length; i++) {
      const currentChunk = chunksOfInputs[i];
      let got_objects;
      try {
        got_objects = await currentAPI
          .db_api()
          .exec("get_objects", [currentChunk, false]);
      } catch (error) {
        console.log({ error });
        chunkErrors.push(error);
        continue;
      }

      if (got_objects && got_objects.length) {
        retrievedObjects = retrievedObjects.concat(
          got_objects.filter((x: any) => x !== null)
        );
      }
    }

    if (!existingAPI) {
      try {
        currentAPI.close();
      } catch {
        // ignore close errors
      }
    }

    // Every chunk failed: surface an error so callers can show a warning
    // instead of treating it as a successful empty result.
    // A `[null]` response (unknown/deleted object) still resolves to `[]`.
    if (!retrievedObjects.length && chunkErrors.length === chunksOfInputs.length && chunksOfInputs.length > 0) {
      reject(chunkErrors[chunkErrors.length - 1]);
      return;
    }

    resolve(retrievedObjects);
  });
}

export { getObjects };
