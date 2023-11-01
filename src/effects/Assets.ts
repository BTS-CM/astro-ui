import { addAssetsToCache } from "../stores/cache.ts";
import { nanoquery } from "@nanostores/query";

// Create fetcher store for dynamic data
const [createDynamicDataStore] = nanoquery({
  fetcher: async (chain: string, id: string) => {
    const replacedID = id.replace("1.3.", "2.3.");
    const response = await fetch(
      `http://localhost:8080/cache/dynamic/${chain}/${replacedID}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.log(`Failed to fetch ${replacedID} dynamic data`);
      return;
    }

    const dynamicDataJSON = await response.json();

    if (dynamicDataJSON && dynamicDataJSON.result) {
      console.log(`Fetched ${replacedID} dynamic data`);
      return dynamicDataJSON.result;
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
    userID: string
  ) => {
    const response = await fetch(
      `http://localhost:8080/api/fullSmartcoin/${chain}`,
      {
        method: "POST",
        body: JSON.stringify([assetID, collateralAssetID, bitassetID, userID]),
      }
    );

    if (!response.ok) {
      console.log("Failed to fetch bitasset data");
      return;
    }

    const responseContents = await response.json();

    if (responseContents && responseContents.result) {
      return responseContents.result;
    }
  },
});

// Create fetcher store for bitasset data
const [createBitassetDataStore] = nanoquery({
  fetcher: async (chain: string, id: string) => {
    const response = await fetch(
      `http://localhost:8080/api/getObjects/${chain}`,
      { method: "POST", body: JSON.stringify([id]) }
    );

    if (!response.ok) {
      console.log("Failed to fetch bitasset data");
      return;
    }

    const responseContents = await response.json();

    if (
      responseContents &&
      responseContents.result &&
      responseContents.result.length
    ) {
      const finalResult = responseContents.result[0];
      return finalResult;
    }
  },
});

const [createCachedAssetStore] = nanoquery({
  fetcher: async (chain: string, assetID: string) => {
    const response = await fetch(
      `http://localhost:8080/cache/asset/${chain}/${assetID}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.log(`Failed to fetch asset: ${assetID}`);
      return;
    }

    const assetJSON = await response.json();

    if (assetJSON && assetJSON.result) {
      console.log("Fetched asset data");
      addAssetsToCache([assetJSON.result]);
      return assetJSON.result;
    }
  },
});

export {
  createSmartcoinDataStore,
  createBitassetDataStore,
  createCachedAssetStore,
  createDynamicDataStore,
};
