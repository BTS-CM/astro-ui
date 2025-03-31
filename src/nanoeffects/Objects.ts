import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";
import { getObjects } from "./src/common";

const [createUsernameStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const object_ids = args[1] as string[];

    const specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await getObjects(chain, object_ids, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch username`);
      return;
    }

    const _finalResults = (response as any[]).map((x) => {
      if (x) {
        return {
          name: x.name,
          id: x.id,
        };
      }
    });

    return _finalResults;
  },
});

const [createObjectStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const object_ids = JSON.parse(args[1] as string);

    const specificNode = args[2] ? (args[2] as string) : null;

    let response;
    try {
      response = await getObjects(chain, object_ids, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch objects`);
      return;
    }

    return response;
  },
});

/**
 * Get every object given x.x.x id structure
 */
const [createEveryObjectStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const space_id = args[1] as number;
    const type_id = args[2] as number;
    const last_known_id = args[3] ? (args[3] as number) : 0; // for fetching non-cached latest objects

    let specificNode = args[4] ? (args[4] as string) : null;

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
      return;
    }

    let nextObjectId;
    try {
      nextObjectId = await currentAPI
        .db_api()
        .exec("get_next_object_id", [space_id, type_id, false]);
    } catch (error) {
      console.log({ error });
      return;
    }

    const maxObjectID = parseInt(nextObjectId.split(".")[2]) - 1;

    if (last_known_id === maxObjectID) {
      return []; // nothing to fetch...
    }

    // if last_known_id < maxObjectID, fetch the latest objects
    let objectIds =
      last_known_id > 0 && last_known_id < maxObjectID
        ? Array.from(
            { length: maxObjectID - last_known_id },
            (_, i) => `${space_id}.${type_id}.${last_known_id + i + 1}`
          )
        : Array.from(
            { length: maxObjectID },
            (_, i) => `${space_id}.${type_id}.${i}`
          );

    let response;
    try {
      response = await getObjects(chain, objectIds, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to fetch every object`);
      return;
    }

    return response;
  },
});

export { createObjectStore, createEveryObjectStore, createUsernameStore };
