import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

async function getUserCustomAuthorities(
  chain: string,
  accountID: string,
  specificNode?: string | null,
  existingAPI?: any
) {
  return new Promise(async (resolve, reject) => {
    const node = specificNode
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

    let customAuthorities: any[];
    try {
      customAuthorities = await currentAPI
        .db_api()
        .exec("get_custom_authorities", [accountID]);
    } catch (error) {
      console.log({ error });
      if (!existingAPI) {
        currentAPI.close();
      }
      return reject(error);
    }

    if (!existingAPI) {
      currentAPI.close();
    }

    if (!customAuthorities || !customAuthorities.length) {
      return resolve([]);
    }

    console.log({ customAuthorities });

    const authorities = customAuthorities
      .filter((o: any) => o && o.id)
      .map((o: any) => ({
        id: o.id,
        account: o.account,
        enabled: !!o.enabled,
        valid_from: o.valid_from,
        valid_to: o.valid_to,
        operation_type:
          o.operation_type !== undefined ? Number(o.operation_type) : 0,
        auth: o.auth,
        restrictions: o.restrictions || [],
        restriction_counter: o.restriction_counter
          ? Number(o.restriction_counter)
          : 0,
      }));

    return resolve(authorities);
  });
}

const [createUserCustomAuthoritiesStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const accountID = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await getUserCustomAuthorities(chain, accountID, specificNode);
    } catch (error) {
      console.log({ error });
      return [];
    }

    if (!response) {
      console.log(`Failed to fetch user custom authorities`);
      return [];
    }

    return response;
  },
});

export { createUserCustomAuthoritiesStore, getUserCustomAuthorities };
