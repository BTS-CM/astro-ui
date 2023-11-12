import { addAssetsToCache } from "../stores/cache.ts";
import { nanoquery } from "@nanostores/query";

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
  refetchInterval: 30000,
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
      return marketOrdersJSON.result;
    }

    throw new Error("No market orders data");
  },
  refetchInterval: 30000,
});

const [createMarketsStore] = nanoquery({
  fetcher: async (chain) => {
    const response = await fetch(`http://localhost:8080/api/getFeaturedMarkets/${chain}`, {
      method: "GET",
    });

    if (!response.ok) {
      console.log("Failed to fetch featured market data");
      return;
    }

    const responseContents = await response.json();

    if (responseContents && responseContents.result && responseContents.result.length) {
      return responseContents.result;
    }
  },
  refetchInterval: 60000,
});

export {
  createMarketHistoryStore,
  createMarketOrdersStore,
  //
  createMarketsStore,
};
