import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

import { fetchReceiverWithdrawPermissions } from "./WithdrawPermissionReciever";
import { fetchPayerWithdrawPermissions } from "./WithdrawPermissionPayer";

/**
 * Fetches all withdrawal permissions for a given account
 */
const [createWithdrawPermissionsStore] = nanoquery({
    fetcher: async (...args: unknown[]) => {
      const chain = args[0] as string;
      const account_id = args[1] as string;
      let specificNode = args[2] ? args[2] as string : null;
  
      let node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;

      let currentAPI;
      try {
        currentAPI = await Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
          console.log({ error })
        );
      } catch (error) {
        console.log({ error });
        return;
      }

      let receiverWithdrawalPermissions;
      try {
        receiverWithdrawalPermissions =  await fetchReceiverWithdrawPermissions(chain, account_id, specificNode, currentAPI);
      } catch (error) {
        console.log({ error, msg: "Error fetching receiver permissions" });
      }

      let payerWithdrawalPermissions;
      try {
        payerWithdrawalPermissions =  await fetchPayerWithdrawPermissions(chain, account_id, specificNode, currentAPI);
      } catch (error) {
        console.log({ error, msg: "Error fetching payer permissions" });
      }

      currentAPI.close();
    
      return {
        recieving: receiverWithdrawalPermissions ?? [],
        paying: payerWithdrawalPermissions ?? [],
      };
    },
  });
  
  export { createWithdrawPermissionsStore };
  