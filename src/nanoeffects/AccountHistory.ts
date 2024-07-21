import { nanoquery } from "@nanostores/query";

/**
 * Fetch account history from external elasticsearch server
 * @param chain
 * @param accountID
 * @param app
 * @param from (optional) from which index to fetch
 * @param size (optional) how many items to fetch
 * @param from_date (optional) from which date to fetch
 * @param to_date (optional) to which date to fetch
 * @param sort_by (optional) sort by which field
 * @param type (optional) type of data to fetch
 * @param agg_field (optional) aggregate field
 *
 * @returns Resposne containing account history
 */
async function getAccountHistory(
  chain: String,
  accountID: String,
  from?: Number,
  size?: Number,
  from_date?: String,
  to_date?: String,
  sort_by?: String,
  type?: String,
  agg_field?: String
) {
  return new Promise(async (resolve, reject) => {
    const url =
      `https://${
        chain === "bitshares" ? "api" : "api.testnet"
      }.bitshares.ws/openexplorer/es/account_history` +
      `?account_id=${accountID}` +
      `&from_=${from ?? 0}` +
      `&size=${size ?? 100}` +
      `&from_date=${from_date ?? "2015-10-10"}` +
      `&to_date=${to_date ?? "now"}` +
      `&sort_by=${sort_by ?? "-operation_id_num"}` +
      `&type=${type ?? "data"}` +
      `&agg_field=${agg_field ?? "operation_type"}`;

    let history;
    try {
      history = await fetch(url, { method: "GET" });
    } catch (error) {
      console.log({ error });
      reject(error);
    }

    if (!history || !history.ok) {
      console.log({
        error: new Error(
          history ? `${history.status} ${history.statusText}` : "Couldn't fetch account history"
        ),
        msg: "Couldn't fetch account history.",
      });
      return;
    }

    const historyJSON = await history.json();

    if (!historyJSON) {
      reject(new Error("Account history not found"));
      return;
    }

    resolve(historyJSON);
  });
}

const [createAccountHistoryStore] = nanoquery({
  fetcher: async (chain: string, accountID: string) => {
    const response: any = await getAccountHistory(chain, accountID);

    if (!response || !response.ok) {
      console.log(`Failed to fetch user history`);
      return;
    }

    const userHistoryJSON = await response.json();

    return userHistoryJSON;
  },
  refetchInterval: 60000,
});

export { createAccountHistoryStore };
