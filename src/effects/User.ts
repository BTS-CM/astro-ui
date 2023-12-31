import { nanoquery } from "@nanostores/query";
import * as fflate from "fflate";

// Create fetcher store for user balances
const [createUserBalancesStore] = nanoquery({
  fetcher: async (chain: string, accountID: string) => {
    const response = await fetch(
      `http://localhost:8080/api/getAccountBalances/${chain}/${accountID}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.log(`Failed to fetch user balances`);
      return;
    }

    const userBalancesJSON = await response.json();

    if (userBalancesJSON && userBalancesJSON.result) {
      //console.log(`Fetched user balances`);
      const decompressed = fflate.decompressSync(fflate.strToU8(userBalancesJSON.result, true));
      const usrBalances = JSON.parse(fflate.strFromU8(decompressed));
      return usrBalances;
    }
  },
  refetchInterval: 60000,
});

// Create fetcher store for user credit deals
const [createUserCreditDealsStore] = nanoquery({
  fetcher: async (chain: string, accountID: string) => {
    const response = await fetch(
      `http://localhost:8080/api/fetchCreditDeals/${chain}/${accountID}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.log(`Failed to fetch user credit deals`);
      return;
    }

    const userCreditDealsJSON = await response.json();

    if (userCreditDealsJSON && userCreditDealsJSON.result) {
      //console.log(`Fetched user credit deals`);
      const decompressed = fflate.decompressSync(fflate.strToU8(userCreditDealsJSON.result, true));
      const usrCreditDeals = JSON.parse(fflate.strFromU8(decompressed));
      return usrCreditDeals;
    }
  },
  refetchInterval: 60000,
});

// Create fetcher store for user balances + open orders
const [createUserPortfolioStore] = nanoquery({
  fetcher: async (chain: string, accountID: string) => {
    const response = await fetch(`http://localhost:8080/api/getPortfolio/${chain}/${accountID}`, {
      method: "GET",
    });

    if (!response.ok) {
      console.log(`Failed to fetch user portfolio`);
      return;
    }

    const userPortfolioJSON = await response.json();

    if (userPortfolioJSON && userPortfolioJSON.result) {
      //console.log(`Fetched user portfolio`);
      const decompressed = fflate.decompressSync(fflate.strToU8(userPortfolioJSON.result, true));
      const usrPortfolio = JSON.parse(fflate.strFromU8(decompressed));
      return usrPortfolio;
    }
  },
  refetchInterval: 60000,
});

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

export {
  createUserBalancesStore,
  createUserCreditDealsStore,
  createUserPortfolioStore,
  createUserHistoryStore,
};
