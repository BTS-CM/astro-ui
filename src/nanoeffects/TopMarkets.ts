import { nanoquery } from "@nanostores/query";

const [createTopMarketsStore] = nanoquery({
  fetcher: async (chain) => {
    if (!(window as any).electron) {
      console.log("No electron window found");
      return;
    }

    let topMarkets;
    try {
      topMarkets = await (window as any).electron.fetchTopMarkets({ chain });
    } catch (error) {
      console.log({ error });
    }

    return topMarkets ?? null;
  },
});

export { createTopMarketsStore };
