import { nanoquery } from "@nanostores/query";
import * as fflate from "fflate";

// Create fetcher store for pool details
const [createPoolDetailsStore] = nanoquery({
  fetcher: async (chain: string, id: string) => {
    const response = await fetch(`http://localhost:8080/api/getObjects/${chain}`, {
      method: "POST",
      body: JSON.stringify([id]),
    });

    if (!response || !response.ok) {
      console.log(`Failed to fetch pool details`);
      return;
    }

    let poolDetailsJSON;
    try {
      poolDetailsJSON = await response.json();
    } catch (e) {
      console.log({ e, response });
      return;
    }

    if (!poolDetailsJSON || !poolDetailsJSON.result) {
      console.log("Failed to fetch pool data");
      return;
    }

    if (poolDetailsJSON && poolDetailsJSON.result) {
      //console.log(`Fetched pool details`);
      const decompressed = fflate.decompressSync(fflate.strToU8(poolDetailsJSON.result, true));
      const pool = JSON.parse(fflate.strFromU8(decompressed));
      return pool && pool.length ? pool[0] : null;
    }
  },
});

// Create fetcher store for bitasset data
const [createPoolShareAssetDataStore] = nanoquery({
  fetcher: async (chain: string, id: string) => {
    const response = await fetch(`http://localhost:8080/api/getObjects/${chain}`, {
      method: "POST",
      body: JSON.stringify([id]),
    });

    if (!response || !response.ok) {
      console.log("Failed to fetch pool share asset dynamic data");
      return;
    }

    const responseContents = await response.json();

    if (responseContents && responseContents.result && responseContents.result.length) {
      const decompressed = fflate.decompressSync(fflate.strToU8(responseContents.result, true));
      const _parsed = JSON.parse(fflate.strFromU8(decompressed));
      const finalResult = _parsed[0];
      return finalResult;
    }
  },
});

export { createPoolDetailsStore, createPoolShareAssetDataStore };
