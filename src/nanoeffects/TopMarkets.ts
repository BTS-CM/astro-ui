import { nanoquery } from "@nanostores/query";

const [createTopMarketsStore] = nanoquery({
  fetcher: async (chain) => {
    const retrievedData = await fetch(
      chain === "bitshares"
        ? `https://api.bitshares.ws/openexplorer/top_markets?top_n=100`
        : `https://api.testnet.bitshares.ws/openexplorer/top_markets?top_n=50`
    );

    if (!retrievedData || !retrievedData.ok) {
      console.log("Failed to fetch top markets");
      return;
    }

    const topMarkets = await retrievedData.json();

    if (!topMarkets) {
      console.log("No top markets found");
      return;
    }

    return topMarkets;
  },
  refetchInterval: 60000,
});

export { createTopMarketsStore };
