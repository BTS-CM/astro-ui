import { nanoquery } from "@nanostores/query";
import * as fflate from "fflate";

// Create fetcher store for order data
const [createOfferStore] = nanoquery({
  fetcher: async (chain: string, id: string) => {
    const response = await fetch(`http://localhost:8080/api/getObjects/${chain}`, {
      method: "POST",
      body: JSON.stringify([id]),
    });

    if (!response.ok) {
      console.log("Failed to fetch object data");
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

export { createOfferStore };
