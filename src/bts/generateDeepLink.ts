import Apis from "./ws/ApiInstances.js";
import TransactionBuilder from "./chain/TransactionBuilder.js";

import { v4 as uuidv4 } from "uuid";

import { closeWSS } from "./common.js";

export async function generateDeepLink(chain: string, opType: string, operations: object[]) {
  return new Promise(async (resolve, reject) => {
    const _node =
      chain === "bitshares" ? "wss://node.xbts.io/ws" : "wss://eu.nodes.testnet.bitshares.ws";

    let currentAPI;
    try {
      currentAPI = await Apis.instance(
        _node,
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
      try {
        await closeWSS(currentAPI);
      } catch (error) {
        console.log({ error, location: "closing wss" });
      }
      return new Response(JSON.stringify({ error: "connection issues" }), {
        status: 500,
        statusText: "Error connecting to blockchain database",
      });
    }

    const tr = new TransactionBuilder();
    for (let i = 0; i < operations.length; i++) {
      tr.add_type_operation(opType, operations[i]);
    }

    try {
      await tr.update_head_block(currentAPI);
    } catch (error) {
      console.log({ error, location: "update head block failed" });
      try {
        await closeWSS(currentAPI);
      } catch (error) {
        console.log({ error, location: "closing wss" });
      }
      reject(error);
      return;
    }

    try {
      await tr.set_required_fees(null, null, currentAPI);
    } catch (error) {
      console.log({ error, location: "set required fees failed" });
      try {
        await closeWSS(currentAPI);
      } catch (error) {
        console.log({ error, location: "closing wss" });
      }
      reject(error);
      return;
    }

    try {
      tr.set_expire_seconds(7200);
    } catch (error) {
      console.log({ error, location: "set expire seconds failed" });
      try {
        await closeWSS(currentAPI);
      } catch (error) {
        console.log({ error, location: "closing wss" });
      }
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
      try {
        await closeWSS(currentAPI);
      } catch (error) {
        console.log({ error, location: "closing wss" });
      }
      reject(error);
      return;
    }

    let id;
    try {
      id = await uuidv4();
    } catch (error) {
      console.log({ error, location: "uuid generation failed" });
      try {
        await closeWSS(currentAPI);
      } catch (error) {
        console.log({ error, location: "closing wss" });
      }
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

    try {
      await closeWSS(currentAPI);
    } catch (error) {
      console.log({ error, location: "closing wss" });
    }

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
