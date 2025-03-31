import { nanoquery } from "@nanostores/query";

/**
 * Fetch account history from external elasticsearch server
 * @param chain
 * @param accountID
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
    if (!(window as any).electron) {
      console.log("No electron window found");
      reject(new Error("No electron window found"));
      return;
    }

    let historyJSON;
    try {
      historyJSON = await (window as any).electron.fetchAccountHistory({
        chain,
        accountID,
        from,
        size,
        from_date,
        to_date,
        sort_by,
        type,
        agg_field,
      });
    } catch (error) {
      console.log({ error });
    }

    if (!historyJSON) {
      reject(new Error("Account history not found"));
      return;
    }

    resolve(historyJSON);
  });
}

const [createAccountHistoryStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const accountID = args[1] as string;

    let response: any;
    try {
      response = await getAccountHistory(chain, accountID);
    } catch (error) {
      console.log({ error });
    }

    return response ?? null;
  },
});

export { createAccountHistoryStore, getAccountHistory };
