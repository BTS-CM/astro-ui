import { nanoquery } from "@nanostores/query";
import * as fflate from "fflate";

const [createUserHistoryStore] = nanoquery({
  fetcher: async (chain: string, accountID: string) => {
    const response = await fetch(
      `http://localhost:8080/api/getAccountHistory/${chain}/${accountID}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.log(`Failed to fetch user history`);
      return;
    }

    const userHistoryJSON = await response.json();

    if (userHistoryJSON && userHistoryJSON.result) {
      //console.log(`Fetched user history`);
      const decompressed = fflate.decompressSync(fflate.strToU8(userHistoryJSON.result, true));
      const usrHistory = JSON.parse(fflate.strFromU8(decompressed));
      return usrHistory;
    }
  },
  refetchInterval: 60000,
});

export { createUserHistoryStore };
