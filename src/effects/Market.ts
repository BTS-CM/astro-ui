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

// Create fetcher store for market history
const [createMarketHistoryStore] = nanoquery({
  fetcher: async (...keys) => {
    const response = await fetch(
      `http://localhost:8080/api/getMarketHistory/${keys[0]}/${keys[1]}/${keys[2]}/${keys[3]}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      console.log("Failed to fetch market history");
      throw new Error("Failed to fetch market history");
    }

    const marketHistoryJSON = await response.json();

    if (marketHistoryJSON && marketHistoryJSON.result) {
      console.log("Fetched market history");
      return marketHistoryJSON.result;
    }

    throw new Error("No market history data");
  },
});

// Create fetcher store for market orders
const [createMarketOrdersStore] = nanoquery({
  fetcher: async (...keys) => {
    const response = await fetch(
      `http://localhost:8080/api/orderBook/${keys[0]}/${keys[1]}/${keys[2]}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      console.log("Failed to fetch market orders");
      throw new Error("Failed to fetch market orders");
    }

    const marketOrdersJSON = await response.json();

    if (marketOrdersJSON && marketOrdersJSON.result) {
      console.log(`Fetched market data for ${keys[1]}_${keys[2]}`);
      window.history.replaceState({}, "", `?market=${keys[1]}_${keys[2]}`); // updating the url parameters
      return marketOrdersJSON.result;
    }

    throw new Error("No market orders data");
  },
});

const [createMarketsStore] = nanoquery({
  fetcher: async (chain) => {
    const response = await fetch(
      `http://localhost:8080/api/getFeaturedMarkets/${chain}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.log("Failed to fetch featured market data");
      return;
    }

    const responseContents = await response.json();

    if (
      responseContents &&
      responseContents.result &&
      responseContents.result.length
    ) {
      return responseContents.result;
    }
  },
});

export {
  createBitassetDataStore,
  createCachedAssetStore,
  createDynamicDataStore,
  //
  createMarketHistoryStore,
  createMarketOrdersStore,
  //
  createMarketsStore,
};
