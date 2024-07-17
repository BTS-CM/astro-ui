import { nanoquery } from "@nanostores/query";
import { v4 as uuidv4 } from "uuid";

import Apis from "../../bts/ws/ApiInstances.js";
import TransactionBuilder from "../../bts/chain/TransactionBuilder.js";

import { chains } from "../../config/chains";

async function generateDeepLink(
  chain: string,
  opType: string,
  operations: object[],
  specificNode?: string | null
) {
  return new Promise(async (resolve, reject) => {
    let node = specificNode ? specificNode : chains[chain].nodeList[0].url;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(
        node,
        true,
        4000,
        { enableDatabase: true, enableCrypto: false, enableOrders: true },
        (error: Error) => console.log({ error })
      );
    } catch (error) {
      console.log({ error, location: "api instance failed" });
      return reject(error);
    }

    if (!currentAPI.db_api()) {
      console.log("no db_api");
      currentAPI.close();
      reject();
      return;
    }

    const tr = new TransactionBuilder();
    for (let i = 0; i < operations.length; i++) {
      tr.add_type_operation(opType, operations[i]);
    }

    try {
      await tr.update_head_block(currentAPI);
    } catch (error) {
      console.log({ error, location: "update head block failed" });
      currentAPI.close();
      reject(error);
      return;
    }

    try {
      await tr.set_required_fees(null, null, currentAPI);
    } catch (error) {
      console.log({ error, location: "set required fees failed" });
      currentAPI.close();
      reject(error);
      return;
    }

    try {
      tr.set_expire_seconds(7200);
    } catch (error) {
      console.log({ error, location: "set expire seconds failed" });
      currentAPI.close();
      reject(error);
      return;
    }

    /*
    try {
      tr.add_signer("inject_wif");
    } catch (error) {
      console.error(error);
      return reject(error);
    }
    */

    try {
      tr.finalize(currentAPI);
    } catch (error) {
      console.log({ error, location: "finalize failed" });
      currentAPI.close();
      reject(error);
      return;
    }

    let id;
    try {
      id = await uuidv4();
    } catch (error) {
      console.log({ error, location: "uuid generation failed" });
      currentAPI.close();
      reject(error);
      return;
    }

    const request = {
      type: "api",
      id: id,
      payload: {
        method: "injectedCall",
        params: ["signAndBroadcast", JSON.stringify(tr.toObject()), []],
        appName: "Bitshares RPG-JS web app",
        chain: chain === "bitshares" ? "BTS" : "BTS_TEST",
        browser: "web browser",
        origin: "localhost",
      },
    };

    currentAPI.close();

    let encodedPayload;
    try {
      encodedPayload = encodeURIComponent(JSON.stringify(request));
    } catch (error) {
      console.log({ error, location: "encode payload failed" });
      reject(error);
      return;
    }

    resolve(encodedPayload);
  });
}

const [createDeepLinkStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const opType = args[1] as string;
    const operations = args[2] as object[];
    const specificNode = args[3] ? args[3] as string : null;

    let response;
    try {
      response = await generateDeepLink(chain, opType, operations, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response) {
      console.log(`Failed to generate deep link`);
      return;
    }

    return response;
  },
});

export { createDeepLinkStore, generateDeepLink };