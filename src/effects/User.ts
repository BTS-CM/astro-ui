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

export { createUserBalancesStore };
