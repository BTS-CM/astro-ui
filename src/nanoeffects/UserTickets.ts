import { nanoquery } from "@nanostores/query";
import { getTickets } from "@/nanoeffects/Tickets.ts";

const [createUserTicketsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const accountID = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;
    const lastID = args[3] ? (args[3] as number) : 0;

    if (!chain || !accountID) return [];
    if (chain !== "bitshares" && chain !== "bitshares_testnet") return [];

    let allTickets: any[] = [];
    try {
      // Reuse generic ticket fetcher and filter by owner account id
      const tickets = (await getTickets(chain, lastID, specificNode)) as any[];
      if (tickets && tickets.length) {
        allTickets = tickets.filter((t) => t.account === accountID);
      }
    } catch (error) {
      console.log({ error });
      return [];
    }

    return allTickets ?? [];
  },
});

export { createUserTicketsStore };
