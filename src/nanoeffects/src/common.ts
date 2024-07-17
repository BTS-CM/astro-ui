import Apis from "../../../bts/ws/ApiInstances";
import { chains } from "../../../config/chains";

// Split the input object ids into acceptably sized chunks
function _sliceIntoChunks(arr: any[], size: number) {
    const chunks: any[] = [];
    for (let i = 0; i < arr.length; i += size) {
        const chunk = arr.slice(i, i + size);
        chunks.push(chunk);
    }
    return chunks;
}
  
// Iterate over the chunks of object ids we want to fetch
async function getObjects(
    chain: string,
    object_ids: string[],
    specificNode?: string | null,
    existingAPI?: any
) {
    return new Promise(async (resolve, reject) => {
        let node = specificNode ? specificNode : chains[chain].nodeList[0].url;

        let currentAPI;
        try {
            currentAPI = existingAPI
            ? existingAPI
            : await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
                console.log({ error })
              );
        } catch (error) {
            console.log({ error, node });
            return reject(error);
        }

        const chunksOfInputs = _sliceIntoChunks(object_ids, chain === "bitshares" ? 50 : 10);

        let retrievedObjects: Object[] = [];
        for (let i = 0; i < chunksOfInputs.length; i++) {
            const currentChunk = chunksOfInputs[i];
            let got_objects;
            try {
                got_objects = await currentAPI.db_api().exec("get_objects", [currentChunk, false]);
            } catch (error) {
                console.log({ error });
                continue;
            }

            if (got_objects && got_objects.length) {
                retrievedObjects = retrievedObjects.concat(got_objects.filter((x) => x !== null));
            }
        }

        if (!existingAPI) {
            currentAPI.close();
        }
        resolve(retrievedObjects);
    });
}

export {
    getObjects
};