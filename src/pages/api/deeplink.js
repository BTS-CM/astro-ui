import * as Apis from '../../lib/old/ApiInstances';
import { v4 as uuidv4 } from 'uuid';

import TransactionBuilder from "../../lib/trx/TransactionBuilder";

/**
 * Returns deeplink contents
 * @param {Array} operations
 * @returns {Object}
 */
async function generateDeepLink(operations) {
    return new Promise(async (resolve, reject) => {
      Apis.instance(
        "wss://node.xbts.io/ws",
        true,
        10000,
        { enableCrypto: false, enableOrders: true },
        (error) => console.log(error),
      ).init_promise
      .then(async () => {
          // Code to execute after successful initialization

          const tr = new TransactionBuilder();
          for (let i = 0; i < operations.length; i++) {
              tr.add_type_operation("liquidity_pool_exchange", operations[i]);
          }
  
          try {
              await tr.update_head_block(Apis);
          } catch (error) {
              console.error(error);
              reject();
              return;
          }
  
          try {
              await tr.set_required_fees(null, null, Apis);
          } catch (error) {
              console.error(error);
              reject(error);
              return;
          }
  
          try {
              tr.set_expire_seconds(7200);
          } catch (error) {
              console.error(error);
              reject();
              return;
          }
  
          try {
              tr.finalize(Apis);
          } catch (error) {
              console.error(error);
              reject();
              return;
          }
  
          const request = {
              type: 'api',
              id: await uuidv4(),
              payload: {
              method: 'injectedCall',
              params: [
                  "signAndBroadcast",
                  JSON.stringify(tr.toObject()),
                  [],
              ],
              appName: "Astro_pool_tool",
              chain: "BTS",
              browser: 'vercel_server',
              origin: 'vercel_servers'
              }
          };
      
          let encodedPayload;
          try {
              encodedPayload = encodeURIComponent(
              JSON.stringify(request),
              );
          } catch (error) {
              console.log(error);
              reject(error);
              return;
          }
      
          resolve(encodedPayload);
      })
      .catch((error) => {
          console.log(error);
          reject(error);
          return;
      });

    });
}

/**
 * Edge server endpoint for deeplink generation
 * @param {Object} request 
 * @returns {Response}
 */
export async function POST({ request }) {
  const body = await request.json();

  if (!body) {
    return new Response(
      JSON.stringify({
        message: "Missing required fields",
      }),
      { status: 400 }
    );
  }

  let generatedDeepLink;
  try {
    generatedDeepLink = await generateDeepLink(body);
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        message: "Error generating deeplink",
      }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({
      message: "Success!",
      generatedDeepLink
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
};