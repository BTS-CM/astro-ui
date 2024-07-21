import { nanoquery } from "@nanostores/query";
import * as fflate from "fflate";

// Create fetcher store for dynamic data
const [createDynamicDataStore] = nanoquery({
  fetcher: async (chain: string, id: string) => {
    const replacedID = id.replace("1.3.", "2.3.");
    const response = await fetch(`http://localhost:8080/cache/dynamic/${chain}/${replacedID}`, {
      method: "GET",
    });

    if (!response.ok) {
      console.log(`Failed to fetch ${replacedID} dynamic data`);
      return;
    }

    const dynamicDataJSON = await response.json();

    if (dynamicDataJSON && dynamicDataJSON.result) {
      //console.log(`Fetched ${replacedID} dynamic data`);
      const decompressed = fflate.decompressSync(fflate.strToU8(dynamicDataJSON.result, true));
      const finalResult = fflate.strFromU8(decompressed);
      return JSON.parse(finalResult);
    }
  },
});

/**
 * Retrieving a single cached asset
 */
const [createCachedAssetStore] = nanoquery({
  fetcher: async (chain: string, assetID: string) => {
    const response = await fetch(`http://localhost:8080/cache/asset/${chain}/${assetID}`, {
      method: "GET",
    });

    if (!response.ok) {
      console.log(`Failed to fetch asset: ${assetID}`);
      return;
    }

    const assetJSON = await response.json();

    if (assetJSON && assetJSON.result) {
      //console.log("Fetched asset data");
      const decompressed = fflate.decompressSync(fflate.strToU8(assetJSON.result, true));
      const finalResult = JSON.parse(fflate.strFromU8(decompressed));
      return finalResult;
    }
  },
});

export { createCachedAssetStore, createDynamicDataStore };
