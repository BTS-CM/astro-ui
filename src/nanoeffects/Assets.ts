import { nanoquery } from "@nanostores/query";

import { getDynamicData, getAsset } from "@/lib/cache";

// Create fetcher store for dynamic data
const [createDynamicDataStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const assetID = args[1] as string;
    
    const replacedID = assetID.replace("1.3.", "2.3.");

    let response;
    try {
      response = await getDynamicData(chain, replacedID);
    } catch (error) {
      console.log(`Failed to fetch dynamic data: ${replacedID}`);
      return;
    }

    return response;
  },
});

/**
 * Retrieving a single cached asset
 */
const [createCachedAssetStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const assetID = args[1] as string;
    
    let response;
    try {
      response = await getAsset(chain, assetID);
    } catch (error) {
      console.log(`Failed to fetch asset: ${assetID}`);
      return;
    }

    return response;
  },
});

export { createCachedAssetStore, createDynamicDataStore };
