import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

async function getTickets(
  chain: string,
  lastID: number = 0,
  specificNode?: string | null
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

    let currentAPI: any;
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

    const ids: string[] = [];
    const updatedTickets: any[] = [];

    // Determine the maximum existing ticket id using get_next_object_id for space 1, type 18
    let nextIdStr: string | null = null;
    try {
      nextIdStr = await currentAPI
        .db_api()
        .exec("get_next_object_id", [1, 18, false]);
    } catch (error) {
      console.log({ error });
      // Fallback: at least fetch a few pages starting from lastID
      nextIdStr = null;
    }

    // Compute page count based on nextId if available; else fall back to 3 pages
    let pageCount = 3;
    if (nextIdStr && typeof nextIdStr === "string") {
      const parts = nextIdStr.split(".");
      const maxN = parseInt(parts[2] || "0", 10);
      if (!isNaN(maxN) && maxN > 0) {
        // get_next_object_id returns the next id to be assigned, so highest existing = maxN - 1
        // Compute how many pages of 100 we need from lastID to highest existing
        const highestExisting = Math.max(0, maxN - 1);
        const totalToCover = Math.max(0, highestExisting - lastID + 1);
        pageCount = Math.ceil(totalToCover / 100);
      }
    }

    for (let i = 0; i < pageCount; i++) {
      let response: any[] | undefined;
      try {
        response = await currentAPI
          .db_api()
          .exec("list_tickets", [100, `1.18.${lastID + i * 100}`]);
      } catch (error) {
        console.log({ error });
        break;
      }

      if (!response || !response.length) {
        break;
      }

      for (let k = 0; k < response.length; k++) {
        const ticket = response[k];
        if (!ids.includes(ticket.id)) {
          ids.push(ticket.id);
          updatedTickets.push(ticket);
        }
      }

      if (response.length < 100) {
        break;
      }
    }

    currentAPI.close();
    resolve(updatedTickets);
  });
}

const [createTicketsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const specificNode = args[1] ? (args[1] as string) : null;
    const lastID = args[2] ? (args[2] as number) : 0;

    if (chain !== "bitshares" && chain !== "bitshares_testnet") {
      // Only supported chains
      return [];
    }

    let tickets;
    try {
      tickets = await getTickets(chain, lastID, specificNode);
    } catch (error) {
      console.log({ error });
      return [];
    }

    return tickets ?? [];
  },
});

export { createTicketsStore, getTickets };
