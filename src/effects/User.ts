import { nanoquery } from "@nanostores/query";

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
      console.log(`Fetched user balances`);
      return userBalancesJSON.result;
    }
  },
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
      console.log(`Fetched user credit deals`);
      return userCreditDealsJSON.result;
    }
  },
});

// Create fetcher store for user balances + open orders
const [createUserPortfolioStore] = nanoquery({
  fetcher: async (chain: string, accountID: string) => {
    const response = await fetch(
      `http://localhost:8080/api/getPortfolio/${chain}/${accountID}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.log(`Failed to fetch user portfolio`);
      return;
    }

    const userPortfolioJSON = await response.json();

    if (userPortfolioJSON && userPortfolioJSON.result) {
      //console.log(`Fetched user portfolio`);
      //console.log({ userPortfolioJSON });
      return userPortfolioJSON.result;
    }
  },
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
      return userHistoryJSON.result;
    }
  },
});

export {
  createUserBalancesStore,
  createUserCreditDealsStore,
  createUserPortfolioStore,
  createUserHistoryStore,
};
