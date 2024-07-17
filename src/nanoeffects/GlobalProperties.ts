import { nanoquery } from "@nanostores/query";
import { getObjects } from "./src/common";

const [createGlobalPropertiesStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const specificNode = args[1] ? (args[1] as string) : null;

    let response;
    try {
      response = await getObjects(chain, ["2.0.0"], specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch global properties`);
      return;
    }

    return response;
  },
});

export { createGlobalPropertiesStore };
