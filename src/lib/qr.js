import { Apis } from "bitsharesjs-ws";
import { TransactionBuilder } from "bitsharesjs";

/**
 * Generate a transaction object suitable for QR encoding.
 * @param {"bitshares"|"bitshares_testnet"} chain
 * @param {string} nodeURL - WebSocket endpoint to use; may be undefined/empty
 * @param {string[]} opTypes - Operation type strings (e.g., ["transfer"]) aligned with operations
 * @param {object[]} operations - Operation payload objects
 * @returns {Promise<object>} Transaction object
 */
async function generateQRContents(chain, nodeURL, opTypes, operations) {
  return new Promise(async (resolve, reject) => {
    // If nodeURL is falsy, we'll pick a sensible default by chain
    const defaultNodes = {
      bitshares: [
        "wss://node.xbts.io/ws",
        "wss://api.bitshares.dev/ws",
        "wss://btsws.roelandp.nl/ws",
      ],
      bitshares_testnet: [
        "wss://testnet.dex.trading/",
        "wss://testnet.xbts.io/ws",
        "wss://api-testnet.61bts.com/ws",
      ],
    };

    const _node =
      nodeURL && nodeURL.length ? nodeURL : defaultNodes[chain]?.[0];

    try {
      await Apis.instance(
        _node,
        true,
        4000,
        { enableCrypto: false, enableOrders: true },
        (error) => console.log({ error }),
      ).init_promise;
    } catch (error) {
      console.log({ error, location: "api instance failed (QR)" });
      return reject(error);
    }

    const tr = new TransactionBuilder();

    // Add all operations (encode memo message if string)
    for (let i = 0; i < operations.length; i++) {
      const op = { ...operations[i] };
      if (op.memo && typeof op.memo.message === "string") {
        try {
          op.memo.message = Buffer.from(op.memo.message, "utf-8");
        } catch (error) {
          console.log({ error, location: "encode memo failed (QR)" });
          return reject(error);
        }
      }
      tr.add_type_operation(opTypes[i], op);
    }

    try {
      await tr.set_required_fees();
    } catch (error) {
      console.error(error);
      reject(error);
      return;
    }

    try {
      await tr.update_head_block();
    } catch (error) {
      console.error(error);
      reject(error);
      return;
    }

    try {
      await tr.set_expire_seconds(4000);
    } catch (error) {
      console.error(error);
      reject(error);
      return;
    }

    resolve(tr.toObject());
  });
}

export { generateQRContents };
