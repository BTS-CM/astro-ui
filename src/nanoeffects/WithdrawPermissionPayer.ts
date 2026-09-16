import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

const MAXIMUM_DEALS = 1000;
const BTS_LIMIT = 50;
const TEST_LIMIT = 10;

const MAX_BTS_ITERATIONS = MAXIMUM_DEALS / BTS_LIMIT;
const MAX_TEST_ITERATIONS = MAXIMUM_DEALS / TEST_LIMIT;

function fetchPayerWithdrawPermissions(
  chain: string,
  account_name_or_id: string,
  specificNode?: string | null,
  existingAPI?: any
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = existingAPI
        ? existingAPI
        : await Apis.instance(
            node,
            true,
            4000,
            { enableDatabase: true },
            (error: Error) => console.log({ error })
          );
    } catch (error) {
      console.log({ error });
      reject(error);
      return;
    }

    const iterations =
      chain === "bitshares" ? MAX_BTS_ITERATIONS : MAX_TEST_ITERATIONS;
    const limit = chain === "bitshares" ? BTS_LIMIT : TEST_LIMIT;

    let withdrawPermissions: any[] = [];
    try {
      withdrawPermissions = await currentAPI
        .db_api()
        .exec("get_withdraw_permissions_by_giver", [
          account_name_or_id,
          "1.12.0",
          limit,
        ]);
    } catch (error) {
      console.log({ error });
      if (!existingAPI) {
        currentAPI.close();
      }
      reject(error);
      return;
    }

    if (!withdrawPermissions || !withdrawPermissions.length) {
      resolve([]);
      return;
    }

    if (withdrawPermissions.length === limit) {
      for (let i = 1; i < iterations; i++) {
        let nextPage;
        try {
          // The DB API treats the start id as inclusive, so start one higher
          // than the last fetched id to avoid duplicating the boundary row.
          let startId =
            withdrawPermissions[withdrawPermissions.length - 1].id;
          try {
            const parts = startId.split(".");
            const lastNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNum)) {
              parts[parts.length - 1] = String(lastNum + 1);
              startId = parts.join(".");
            }
          } catch (e) {
            // fall back to the original id (existing behavior)
          }

          nextPage = await currentAPI
            .db_api()
            .exec("get_withdraw_permissions_by_giver", [
              account_name_or_id,
              startId,
              limit,
            ]);
        } catch (error) {
          console.log({ error });
          if (!existingAPI) {
            currentAPI.close();
          }
          reject(error);
          return;
        }

        if (nextPage && nextPage.length) {
          withdrawPermissions = [...withdrawPermissions, ...nextPage];
          if (nextPage.length < limit) {
            break;
          }
        } else {
          break;
        }
      }
    }

    // Defense in depth: drop any duplicate ids from inclusive-cursor overlap.
    withdrawPermissions = [
      ...new Map(withdrawPermissions.map((w: any) => [w.id, w])).values(),
    ];

    if (!existingAPI) {
      currentAPI.close();
    }

    return resolve(withdrawPermissions);
  });
}

/**
 * Fetches the payer's withdrawal permissions for a given account
 */
const [createPayerWithdrawPermissionsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const account_id = args[1] as string;
    let specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await fetchPayerWithdrawPermissions(
        chain,
        account_id,
        specificNode
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch payer's withdrawal permissions`);
      return;
    }

    return response;
  },
});

export { createPayerWithdrawPermissionsStore, fetchPayerWithdrawPermissions };
