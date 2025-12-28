import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";
import { getObjects } from "./src/common";

// Retrieve credit offers by their owner from the blockchain
function getCreditOffersByOwner(
  chain: string,
  account_name_or_id: string,
  specificNode?: string | null
) {
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

    const limit = 100;
    let creditOffers: any[] = [];
    let last_id = null;

    while (true) {
      let pageOffers;
      try {
        pageOffers = await currentAPI
          .db_api()
          .exec("get_credit_offers_by_owner", [
            account_name_or_id,
            limit,
            last_id,
          ]);
      } catch (error) {
        console.log({ error });
        currentAPI.close();
        reject(error);
        return;
      }

      if (!pageOffers || !pageOffers.length) {
        break;
      }

      // If we have a last_id, the first element of pageOffers is the same as the last element of the previous page
      const newOffers = last_id ? pageOffers.slice(1) : pageOffers;
      if (newOffers.length === 0) {
        break;
      }

      creditOffers.push(...newOffers);
      last_id = pageOffers[pageOffers.length - 1].id;

      if (pageOffers.length < limit) {
        break;
      }
    }

    if (!creditOffers.length) {
      currentAPI.close();
      resolve([]);
      return;
    }

    // Fetch owner name if not already known or to ensure consistency
    let fetchedAccount: any;
    try {
      const accountData = (await getObjects(
        chain,
        [creditOffers[0].owner_account],
        node,
        currentAPI
      )) as any[];
      fetchedAccount =
        accountData && accountData.length ? accountData[0] : null;
    } catch (error) {
      console.log(error);
    }

    const data = creditOffers.map((offer) => ({
      ...offer,
      owner_name: fetchedAccount ? fetchedAccount.name : "Unknown",
    }));

    currentAPI.close();
    resolve(data);
  });
}

const [createCreditOfferByOwnerStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const account_name_or_id = args[1] as string;
    let specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await getCreditOffersByOwner(
        chain,
        account_name_or_id,
        specificNode
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch account's credit offers...`);
      return;
    }

    return response;
  },
});

export { createCreditOfferByOwnerStore, getCreditOffersByOwner };
