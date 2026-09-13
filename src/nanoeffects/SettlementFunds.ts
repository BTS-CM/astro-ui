import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";
import { getObjects } from "./src/common";

/**
 * Parse the raw settlement fund value from a 2.4.x bitasset object.
 */
function parseFundAmount(bitasset: any): number {
  if (!bitasset) {
    return 0;
  }
  const parsed = parseInt(bitasset.settlement_fund ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Normalize a cached asset entry to { id, symbol, precision, issuer? }.
 *
 * Accepts full 1.3 objects ({ id, symbol, precision, issuer }), minified
 * cache entries ({ id, s, p, i } with "1.3."/"1.2." prefixes stripped), and
 * Astro content-collection wrapped entries ({ data: {...} }).
 */
function normalizeCachedAsset(entry: any): {
  id: string;
  symbol: string;
  precision: number;
  issuer?: string;
} | null {
  if (!entry) {
    return null;
  }
  const raw = entry.data ?? entry;
  let id = raw.id ?? raw.assetID;
  const symbol = raw.symbol ?? raw.s;
  const precision = raw.precision ?? raw.p;
  let issuer = raw.issuer ?? raw.i;
  if (!id || symbol == null || precision == null) {
    return null;
  }
  if (typeof id === "string" && !id.includes(".")) {
    id = `1.3.${id}`; // minified cache strips the "1.3." prefix
  }
  if (typeof issuer === "string" && issuer && !issuer.includes(".")) {
    issuer = `1.2.${issuer}`; // minified cache strips the "1.2." prefix
  }
  const normalized: {
    id: string;
    symbol: string;
    precision: number;
    issuer?: string;
  } = { id, symbol, precision: Number(precision) };
  if (issuer) {
    normalized.issuer = issuer;
  }
  return normalized;
}

const [createSettlementFundsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    // Optional JSON-encoded cached assets for symbol/precision resolution.
    // Pass "[]" (or omit) to resolve everything live.
    const cachedAssetsJSON =
      typeof args[1] === "string" ? (args[1] as string) : "[]";
    const specificNode =
      typeof args[2] === "string" ? (args[2] as string) : null;

    const node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

    let currentAPI: any;
    try {
      currentAPI = await Apis.instance(
        node,
        true,
        4000,
        { enableDatabase: true },
        (error: Error) => console.log({ error })
      );
    } catch (error) {
      console.log({ error });
      return { _smartcoins: [], _assets: [], _issuers: [] };
    }

    try {
      // 1. Discover how many 2.4.x bitasset objects exist.
      let nextObjectId: string;
      try {
        nextObjectId = await currentAPI
          .db_api()
          .exec("get_next_object_id", [2, 4, false]);
      } catch (error) {
        console.log({ error });
        return { _smartcoins: [], _assets: [], _issuers: [] };
      }

      const maxObjectID = parseInt(nextObjectId.split(".")[2], 10) - 1;
      if (!Number.isFinite(maxObjectID) || maxObjectID < 0) {
        return { _smartcoins: [], _assets: [], _issuers: [] };
      }

      // 2. Fetch every bitasset object on the one shared connection.
      // Inclusive of maxObjectID (get_next_object_id returns the next free id).
      const smartcoinIDs: string[] = Array.from(
        { length: maxObjectID + 1 },
        (_, i) => `2.4.${i}`
      );

      let allSmartcoinData: any[];
      try {
        allSmartcoinData = (await getObjects(
          chain,
          smartcoinIDs,
          specificNode,
          currentAPI
        )) as any[];
      } catch (error) {
        console.log({ error });
        return { _smartcoins: [], _assets: [], _issuers: [] };
      }

      // 3. Filter to funded bitassets first, before any 1.3.x fetching.
      const funded = (allSmartcoinData ?? []).filter(
        (x) => x && x.asset_id && parseFundAmount(x) > 0
      );

      if (!funded.length) {
        return { _smartcoins: [], _assets: [], _issuers: [] };
      }

      // 4. Only the funded subset needs 1.3.x asset objects
      // (display symbol + collateral precision).
      const neededIDs: string[] = [
        ...new Set([
          ...funded.map((x) => x.asset_id),
          ...funded
            .map((x) => x.options?.short_backing_asset)
            .filter((id) => !!id),
        ]),
      ];

      // 5. Resolve via the injected cache; fetch only the misses live.
      let cachedEntries: any[] = [];
      try {
        const parsed = JSON.parse(cachedAssetsJSON);
        if (Array.isArray(parsed)) {
          cachedEntries = parsed;
        }
      } catch {
        cachedEntries = [];
      }

      const cacheById = new Map<string, any>();
      for (const entry of cachedEntries) {
        const normalized = normalizeCachedAsset(entry);
        if (normalized) {
          cacheById.set(normalized.id, { ...entry, ...normalized });
        }
      }

      const cachedAssets = neededIDs
        .map((id) => cacheById.get(id))
        .filter((x) => !!x);
      // Cached minified entries lack options.flags (needed for the
      // disable_collateral_bidding check) — refetch those live too.
      const missingIDs = neededIDs.filter((id) => {
        const hit = cacheById.get(id);
        if (!hit) {
          return true;
        }
        return typeof hit.options?.flags !== "number";
      });

      let fetchedAssets: any[] = [];
      if (missingIDs.length) {
        try {
          fetchedAssets = (await getObjects(
            chain,
            missingIDs,
            specificNode,
            currentAPI
          )) as any[];
        } catch (error) {
          console.log({ error });
          fetchedAssets = [];
        }
      }

      // Live full objects take precedence over minified cache hits.
      const mergedById = new Map<string, any>();
      for (const a of cachedAssets) {
        mergedById.set(a.id, a);
      }
      for (const a of fetchedAssets ?? []) {
        if (a?.id) {
          mergedById.set(a.id, a);
        }
      }
      const allAssets = [...mergedById.values()];

      // 6. Resolve issuer account names for the funded subset's assets.
      // Unique 1.2.x ids from the resolved 1.3.x objects (full live objects
      // carry `issuer`; minified cache entries carry it as `issuer`/`i`).
      const issuerIDs: string[] = [
        ...new Set(
          allAssets
            .map((a) => a?.issuer)
            .filter((id) => typeof id === "string" && !!id)
        ),
      ];

      let issuers: { id: string; name: string }[] = [];
      if (issuerIDs.length) {
        try {
          const issuerObjects = (await getObjects(
            chain,
            issuerIDs,
            specificNode,
            currentAPI
          )) as any[];
          issuers = (issuerObjects ?? [])
            .filter((x) => x && x.id)
            .map((x) => ({ id: x.id, name: x.name ?? x.id }));
        } catch (error) {
          console.log({ error });
          issuers = [];
        }
      }

      return {
        _smartcoins: funded,
        _assets: allAssets,
        _issuers: issuers,
      };
    } finally {
      try {
        currentAPI.close();
      } catch {
        // connection already closed; ignore
      }
    }
  },
});

export { createSettlementFundsStore };
