import { nanoquery } from "@nanostores/query";
import * as fflate from "fflate";

import { addAssetsToCache } from "../stores/cache.ts";

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
      const decompressed = fflate.decompressSync(fflate.strToU8(marketHistoryJSON.result, true));
      const history = JSON.parse(fflate.strFromU8(decompressed));
      return history;
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
      const decompressed = fflate.decompressSync(fflate.strToU8(marketOrdersJSON.result, true));
      const orders = JSON.parse(fflate.strFromU8(decompressed));
      return orders;
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

    if (responseContents && responseContents.result) {
      const decompressed = fflate.decompressSync(fflate.strToU8(responseContents.result, true));
      const markets = JSON.parse(fflate.strFromU8(decompressed));
      return markets;
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
