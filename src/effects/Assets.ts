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

// Create fetcher store for live full smartcoin data (asset + bitasset data)
const [createSmartcoinDataStore] = nanoquery({
  fetcher: async (
    chain: string,
    assetID: string,
    collateralAssetID: string,
    bitassetID: string,
    collateralBitassetID: string,
    userID: string
  ) => {
    let response;
    try {
      response = await fetch(`http://localhost:8080/api/fullSmartcoin/${chain}`, {
        method: "POST",
        body: JSON.stringify([
          assetID,
          collateralAssetID,
          bitassetID,
          collateralBitassetID,
          userID,
        ]),
      });
    } catch (error) {
      console.log("Failed to fetch smartcoin data");
      return;
    }

    if (!response.ok) {
      console.log("Failed to fetch bitasset data");
      return;
    }

    const responseContents = await response.json();
    if (responseContents && responseContents.result) {
      //console.log("Fetched bitasset data");
      const decompressed = fflate.decompressSync(fflate.strToU8(responseContents.result, true));
      const finalResult = fflate.strFromU8(decompressed);
      return JSON.parse(finalResult);
    }
  },
});

// Create fetcher store for bitasset data
const [createBitassetDataStore] = nanoquery({
  fetcher: async (chain: string, id: string) => {
    const response = await fetch(`http://localhost:8080/api/getObjects/${chain}`, {
      method: "POST",
      body: JSON.stringify([id]),
    });

    if (!response.ok) {
      console.log("Failed to fetch bitasset data");
      return;
    }

    const responseContents = await response.json();

    if (responseContents && responseContents.result && responseContents.result.length) {
      //console.log("Fetched bitasset data");
      const decompressed = fflate.decompressSync(fflate.strToU8(responseContents.result, true));
      const _parsed = JSON.parse(fflate.strFromU8(decompressed));
      const finalResult = _parsed[0];
      return finalResult;
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

export {
  createSmartcoinDataStore,
  createBitassetDataStore,
  createCachedAssetStore,
  createDynamicDataStore,
};
