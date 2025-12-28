import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";
import { getObjects } from "./src/common";

// Retrieve all active credit offers from the blockchain
function getCreditOffers(chain: string, specificNode?: string | null) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(
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

    let latestObjectID;
    try {
      latestObjectID = await currentAPI
        .db_api()
        .exec("get_next_object_id", [1, 21, false]);
    } catch (error) {
      console.log({ error });
      currentAPI.close();
      reject(error);
      return;
    }

    const latestObjectIDNumber = parseInt(latestObjectID.split(".")[2], 10);

    const objectIds = Array.from(
      { length: latestObjectIDNumber },
      (_, i) => `1.21.${i}`
    );

    let allOffers: any[];
    try {
      allOffers = (await getObjects(
        chain,
        objectIds,
        node,
        currentAPI
      )) as any[];
    } catch (error) {
      console.log(error);
      currentAPI.close();
      reject(error);
      return;
    }

    if (!allOffers || !allOffers.length) {
      currentAPI.close();
      resolve([]);
      return;
    }

    let fetchedAccounts: any[];
    try {
      fetchedAccounts = (await getObjects(
        chain,
        [...new Set(allOffers.map((x) => x.owner_account))],
        node,
        currentAPI
      )) as any[];
    } catch (error) {
      console.log(error);
      currentAPI.close();
      reject(error);
      return;
    }

    const data = allOffers.map((offer) => {
      const account = fetchedAccounts.find(
        (account) => account.id === offer.owner_account
      );

      return {
        ...offer,
        owner_name: account ? account.name : "Unknown",
      };
    });

    currentAPI.close();
    resolve(data);
  });
}

const [createCreditOfferStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    let specificNode = args[1] ? (args[1] as string) : null;

    let response;
    try {
      response = await getCreditOffers(chain, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch max object id`);
      return;
    }

    return response;
  },
});

export { createCreditOfferStore, getCreditOffers };
