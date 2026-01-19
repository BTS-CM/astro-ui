import { Apis } from "bitsharesjs-ws";
import { TransactionBuilder } from "bitsharesjs";
import { v4 as uuidv4 } from "uuid";

const chains = {
  bitshares: {
    nodeList: [
      {
        url: "wss://node.xbts.io/ws",
      },
      {
        url: "wss://kibana.bitshares.dev/ws",
      },
      {
        url: "wss://btsws.roelandp.nl/ws",
      },
    ],
  },
  bitshares_testnet: {
    nodeList: [
      {
        url: "wss://testnet.dex.trading/",
      },
      {
        url: "wss://testnet.xbts.io/ws",
      },
      {
        url: "wss://api-testnet.61bts.com/ws",
      },
    ],
  },
};

async function generateDeepLink(chain, nodeURL, opTypes, operations) {
  return new Promise(async (resolve, reject) => {
    const _node =
      nodeURL && nodeURL.length ? nodeURL : chains[chain].nodeList[0].url;

    try {
      await Apis.instance(
        _node,
        true,
        4000,
        { enableCrypto: false, enableOrders: true },
        (error) => console.log({ error }),
      ).init_promise;
    } catch (error) {
      console.log({ error, location: "api instance failed" });
      return reject(error);
    }

    let includesMemos = false;
    const tr = new TransactionBuilder();
    for (let i = 0; i < operations.length; i++) {
      // Convert the memo message to bytes
      if (operations[i].memo && operations[i].memo.message) {
        let encodedMessage;
        try {
          encodedMessage = Buffer.from(operations[i].memo.message, "utf-8");
        } catch (error) {
          console.log({ error, location: "encode memo failed" });
          return reject(error);
        }
        includesMemos = true;
        operations[i].memo.message = encodedMessage;
      }
      tr.add_type_operation(opTypes[i], operations[i]);
    }

    try {
      await tr.update_head_block();
    } catch (error) {
      console.log({ error, location: "update head block failed" });
      reject(error);
      return;
    }

    try {
      await tr.set_required_fees();
    } catch (error) {
      console.log({ error, location: "set required fees failed" });
      reject(error);
      return;
    }

    try {
      tr.set_expire_seconds(7200);
    } catch (error) {
      console.log({ error, location: "set expire seconds failed" });
      reject(error);
      return;
    }

    try {
      tr.finalize();
    } catch (error) {
      console.log({ error, location: "finalize failed" });
      reject(error);
      return;
    }

    let id;
    try {
      id = await uuidv4();
    } catch (error) {
      console.log({ error, location: "uuid generation failed" });
      reject(error);
      return;
    }

    const request = {
      type: "api",
      id: id,
      payload: {
        method: "injectedCall",
        params: ["signAndBroadcast", JSON.stringify(tr.toObject()), []],
        appName: "Bitshares Astro UI",
        chain: chain === "bitshares" ? "BTS" : "BTS_TEST",
        browser: "web browser",
        origin: "localhost",
        memo: includesMemos,
      },
    };

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

export { generateDeepLink };
