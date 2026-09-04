import Apis from "@/bts/ws/ApiInstances";
import chain_store from "@/bts/chain/ChainStore";
import { acquireChainStore, nodeUrlFor } from "@/bts/chain/chainStoreReady";
import { getObjects } from "@/nanoeffects/src/common";
import { chains } from "@/config/chains";

/**
 * Live blocks subscription - replaces the Electron main-process polling
 * mechanism (background.js fetchBlocks loop) with a true push feed.
 *
 * Mechanics:
 *  1. acquireChainStore -> retained Apis connection + set_subscribe_callback.
 *  2. Head sync via ChainStore object 2.1.0 (head_block_number).
 *  3. Lookback burst: parallel singular get_block(head-1 .. head-lookback) so
 *     the UI has recent activity immediately (parity with the old IPC flow).
 *  4. db_api "set_block_applied_callback": the node pushes the full signed
 *     block (timestamp / witness / transactions[]) on every applied block.
 *
 * Block numbering: raw applied-block notices carry no reliable number field,
 * so we maintain a monotonic counter seeded by the head sync and reconciled
 * against the trusted 2.1.0 head every push. Any detected gap (head ran ahead
 * of our counter) triggers an automatic catch-up batch so the renderer never
 * shows missing numbers.
 */

const LOOKBACK_CHUNK = 10;

export interface RecentBlock {
  block: number;
  [key: string]: any;
}

/** Graphene block ids: first 4 bytes = block number, big-endian hex. */
export function blockNumberFromId(blockId: string): number | null {
  try {
    if (!blockId || blockId.length < 8) return null;
    const num = parseInt(blockId.slice(0, 8), 16);
    return Number.isFinite(num) && num > 0 ? num : null;
  } catch {
    return null;
  }
}

export interface RecentBlocksSubscription {
  unsubscribe: () => void;
  /**
   * Fetch blocks (fromBlock .. current head) via get_block and emit them
   * through onUpdate. Used by the hook to self-heal gaps/silence without a
   * full teardown.
   *
   * @returns "emitted" (new blocks delivered), "empty" (connection healthy,
   *          nothing to fetch), or "failed" (call errored - caller should
   *          consider a hard reconnect).
   */
  catchUp: (fromBlock?: number) => Promise<"emitted" | "empty" | "failed">;
}

function chunkedGetBlocks(
  api: any,
  from: number,
  to: number,
  chunkSize: number
): Promise<any[]> {
  const nums: number[] = [];
  for (let n = Math.max(1, from); n <= to; n++) nums.push(n);

  const results: any[] = [];
  const runChunk = async (chunk: number[]) => {
    return Promise.all(
      chunk.map((n) => api.db_api().exec("get_block", [n]).catch(() => null))
    );
  };

  return (async () => {
    for (let i = 0; i < nums.length; i += chunkSize) {
      const chunkResults = await runChunk(nums.slice(i, i + chunkSize));
      chunkResults.forEach((blk: any, idx: number) => {
        results.push(blk ? { ...blk, block: nums[i + idx] } : null);
      });
    }
    return results;
  })();
}

export function toEmitBatch(results: any[]): RecentBlock[] {
  return results.filter(Boolean) as RecentBlock[];
}

export async function subscribeRecentBlocks(
  chain: string,
  onUpdate: (blocks: RecentBlock[]) => void,
  onError: (e: any) => void,
  lookback: number = 30,
  specificNode?: string | null
): Promise<RecentBlocksSubscription> {
  const testnet = (chains as any)[chain]?.testnet;

  // Testnet fallback: use nanoeffects getObjects polling instead of
  // ChainStore set_block_applied_callback (which fails on testnet with
  // "enable_subscribe_to_all: Subscribing to universal object creation
  // and removal is disallowed").
  if (testnet) {
    // Fetch recent blocks via getObjects polling (chunked 10 per call for testnet)
    let objs: any[] = [];
    try {
      objs = await getObjects(chain, [], specificNode);
    } catch (e) {
      console.log("BlocksLive testnet fallback getObjects error", e);
      onError(e);
    }

    if (objs && objs.length) {
      // Convert block objects to RecentBlock format
      const blocks: RecentBlock[] = objs
        .filter((o: any) => o && o.id && o.id.startsWith("2."))
        .map((o: any) => ({
          block: blockNumberFromId(o.id) || 0,
          ...o,
        }));
      onUpdate(blocks);
    }

    // Return a no-op unsubscribe since we're using polling, not subscriptions
    return {
      unsubscribe: () => {},
      catchUp: async () => "failed",
    };
  }

  let releaseToken: (() => void) | null = null;
  try {
    releaseToken = await acquireChainStore(chain, specificNode);
  } catch (e) {
    onError(e);
    throw e;
  }

  const node = nodeUrlFor(chain, specificNode);
  const api = await Apis.instance(
    node,
    false, // pure retain - acquireChainStore established the connection
    4000,
    { enableDatabase: true },
    () => {}
  );

  let unsubscribed = false;
  let lastSeenBlock = 0;
  let trustedHead = 0;
  let gapHealTimer: any = null;

  const readCachedHead = (): number => {
    try {
      const dyn: any = chain_store.getObject("2.1.0");
      if (dyn && dyn !== true) {
        const num =
          dyn.head_block_number ??
          dyn.block_number ??
          dyn.head_block_num ??
          0;
        if (num && num > trustedHead) trustedHead = num;
      }
    } catch {}
    return trustedHead;
  };

  // ---- head sync -------------------------------------------------------
  readCachedHead();
  if (!trustedHead) {
    try {
      const gp: any = await api
        .db_api()
        .exec("get_dynamic_global_properties", []);
      trustedHead = gp?.head_block_number ?? 0;
    } catch (e) {
      console.log("BlocksLive head sync error", e);
    }
  }
  lastSeenBlock = trustedHead;

  const emitBatch = (batch: RecentBlock[]): boolean => {
    if (unsubscribed || !batch.length) return false;
    for (const b of batch) {
      if (b.block > lastSeenBlock) lastSeenBlock = b.block;
    }
    onUpdate(batch.sort((a, b) => a.block - b.block));
    return true;
  };

  // ---- lookback burst --------------------------------------------------
  if (lastSeenBlock > 1) {
    for (
      let start = lastSeenBlock - lookback;
      start < lastSeenBlock;
      start += LOOKBACK_CHUNK
    ) {
      if (unsubscribed) break;
      const end = Math.min(start + LOOKBACK_CHUNK, lastSeenBlock);
      try {
        const results = await chunkedGetBlocks(api, start, end - 1, LOOKBACK_CHUNK);
        emitBatch(toEmitBatch(results));
      } catch (e) {
        console.log("BlocksLive lookback chunk error", e);
        // non-fatal - live feed may still work
      }
    }
  }

  if (unsubscribed) {
    try { await api.close(); } catch {}
    if (releaseToken) { try { releaseToken(); } catch {} }
    return {
      unsubscribe: () => {},
      catchUp: async () => "failed",
    };
  }

  // ---- catch-up (self-heal / gap fill) ---------------------------------
  const catchUp = async (
    fromBlock?: number
  ): Promise<"emitted" | "empty" | "failed"> => {
    if (unsubscribed) return "failed";
    try {
      // refresh trusted head via RPC (cache may be cold/lagging)
      try {
        const gp: any = await api
          .db_api()
          .exec("get_dynamic_global_properties", []);
        if (gp?.head_block_number > trustedHead) trustedHead = gp.head_block_number;
      } catch {}

      const from = Math.max(1, fromBlock ?? lastSeenBlock + 1);
      const to = Math.max(trustedHead, lastSeenBlock);
      if (to < from) return "empty";

      const results = await chunkedGetBlocks(api, from, to, LOOKBACK_CHUNK);
      const emitted = emitBatch(toEmitBatch(results));
      if (to > lastSeenBlock) lastSeenBlock = to;
      return emitted ? "emitted" : "empty";
    } catch (e) {
      console.log("BlocksLive catchUp error", e);
      return "failed";
    }
  };

  // ---- live feed -------------------------------------------------------

  // One-time diagnostic: record the actual shape of the applied-block notice
  // so we have evidence of what this node sends (payload completeness varies
  // between nodes/versions).
  let loggedNoticeShape = false;

  const fetchCanonicalBlock = async (
    num: number,
    attemptsLeft: number = 2
  ): Promise<any | null> => {
    try {
      const fetched = await api.db_api().exec("get_block", [num]);
      if (fetched && (fetched.witness || Array.isArray(fetched.transactions))) {
        return fetched;
      }
      // Block may not be queryable yet right after apply - brief retry.
      if (attemptsLeft > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return fetchCanonicalBlock(num, attemptsLeft - 1);
      }
      return fetched ?? null;
    } catch (e) {
      console.log("BlocksLive canonical fetch error", e);
      if (attemptsLeft > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return fetchCanonicalBlock(num, attemptsLeft - 1);
      }
      return null;
    }
  };

  const appliedCallback = async (signedBlock: any) => {
    if (unsubscribed || !signedBlock) return;

    if (!loggedNoticeShape) {
      loggedNoticeShape = true;
      console.log(
        "BlocksLive applied-block notice keys:",
        Object.keys(signedBlock),
        {
          hasWitness: typeof signedBlock.witness === "string",
          hasTransactions: Array.isArray(signedBlock.transactions),
        }
      );
    }

    const cachedHead = readCachedHead();

    const derived =
      typeof signedBlock.block === "number"
        ? signedBlock.block
        : blockNumberFromId(signedBlock.id);

    // Monotonic counter, reconciled with any trustworthy signal:
    // prefer derived ids, else increment past what we've already emitted.
    let num = Math.max(lastSeenBlock + 1, derived ?? 0);

    // Trusted-head reconciliation: 2.1.0 may already be ahead of our counter
    // (e.g. we missed pushes while the flush was in flight).
    if (cachedHead > num) num = cachedHead;

    lastSeenBlock = num;

    // Payload completeness check: some nodes push notices without the full
    // field set the UI consumes (witness / transactions). If incomplete,
    // fetch the canonical get_block result for exact parity with the
    // historical lookback rows.
    const payloadComplete =
      typeof signedBlock.witness === "string" &&
      Array.isArray(signedBlock.transactions);

    if (payloadComplete) {
      onUpdate([{ ...signedBlock, block: num }]);
    } else {
      const canonical = await fetchCanonicalBlock(num);
      if (unsubscribed) return;
      if (canonical) {
        onUpdate([{ ...canonical, block: num }]);
      } else {
        // Never emit an incomplete row - it would enter the renderer's dedup
        // set and never be corrected. Schedule a canonical catch-up instead.
        if (gapHealTimer) clearTimeout(gapHealTimer);
        gapHealTimer = setTimeout(() => {
          gapHealTimer = null;
          if (!unsubscribed) {
            catchUp(num).then((r) => {
              if (r === "failed") onError(new Error("canonical retry failed"));
            });
          }
        }, 500);
        return;
      }
    }

    // Gap heal: trusted head ran ahead of what we just emitted -> missed
    // pushes somewhere. Schedule a debounced catch-up for the middle range.
    if (cachedHead > num) {
      if (gapHealTimer) clearTimeout(gapHealTimer);
      gapHealTimer = setTimeout(() => {
        gapHealTimer = null;
        if (!unsubscribed) {
          catchUp(num + 1).then((r) => {
            if (r === "failed") onError(new Error("gap catch-up failed"));
          });
        }
      }, 250);
    }
  };

  try {
    await api.db_api().exec("set_block_applied_callback", [appliedCallback]);
  } catch (e) {
    console.log("set_block_applied_callback failed", e);
    try { await api.close(); } catch {}
    if (releaseToken) { try { releaseToken(); } catch {} }
    onError(e);
    throw e;
  }

  const unsubscribe = () => {
    unsubscribed = true;
    if (gapHealTimer) {
      clearTimeout(gapHealTimer);
      gapHealTimer = null;
    }
    try { api.close(); } catch {}
    if (releaseToken) { try { releaseToken(); } catch {} }
  };

  return { unsubscribe, catchUp };
}
