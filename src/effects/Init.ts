import { useMemo } from "react";
import * as fflate from "fflate";
import { nanoquery } from "@nanostores/query";
import { useStore } from "@nanostores/react";

import {
  $globalParamsCache,
  setGlobalParams,
  $marketSearchCache,
  addMarketSearchesToCache,
  $poolCache,
  addPoolsToCache,
  addOffersToCache,
  $assetCache,
  addAssetsToCache,
} from "../stores/cache.ts";
import {
  $userStorage,
  addUser,
  setCurrentUser,
  $currentUser,
} from "../stores/users.ts";

// Create fetcher store
const [createFetcherStore] = nanoquery({
  fetcher: async (chain) => {
    const fetches = [
      fetch(`http://localhost:8080/cache/marketSearch/${chain}`, {
        method: "GET",
      }),
      fetch(`http://localhost:8080/cache/allassets/${chain}`, {
        method: "GET",
      }),
      fetch(`http://localhost:8080/cache/pools/${chain}`, {
        method: "GET",
      }),
      fetch(`http://localhost:8080/cache/feeSchedule/${chain}`, {
        method: "GET",
      }),
      fetch(`http://localhost:8080/cache/offers/${chain}`, {
        method: "GET",
      }),
    ];

    const responses = await Promise.all(fetches);

    const parsedResponses = await Promise.all(
      responses.map(async (response, index) => {
        if (!response.ok) {
          console.log("Failed to fetch data");
          return;
        }

        const responseContents = await response.json();

        if (!responseContents || !responseContents.result) {
          console.log("Failed to fetch data");
          return;
        }

        const decompressed = fflate.decompressSync(
          fflate.strToU8(responseContents.result, true)
        );
        const originalString = fflate.strFromU8(decompressed);
        const parsedJSON = JSON.parse(originalString);

        switch (index) {
          case 0:
            addMarketSearchesToCache(parsedJSON);
            break;
          case 1:
            addAssetsToCache(parsedJSON);
            break;
          case 2:
            addPoolsToCache(parsedJSON);
            break;
          case 3:
            setGlobalParams(parsedJSON);
            break;
          case 4:
            addOffersToCache(parsedJSON);
            break;
          default:
            break;
        }
      })
    );

    return parsedResponses;
  },
});

function useInitCache(chain) {
  const cacheStore = useMemo(() => {
    return createFetcherStore([chain]);
  }, [chain]);

  const { data, loading, error } = useStore(cacheStore);

  // Handle user storage
  if (!$currentUser || !$currentUser.get().username) {
    console.log("No current user");
    const storedUsers = $userStorage.get().users;
    const lastAccount = $userStorage.get().lastAccount;
    const relevantUser = storedUsers.find((user) => user.chain === chain);
    if (!storedUsers || !storedUsers.length || !relevantUser) {
      console.log("Storing default null account");
      addUser("null-account", "1.2.3", "1.2.3", "bitshares");
      setCurrentUser("null-account", "1.2.3", "1.2.3", "bitshares");
    } else if (lastAccount && lastAccount.length) {
      console.log("Setting last account");
      const user = lastAccount[0];
      setCurrentUser(user.username, user.id, user.referrer, user.chain);
    } else if (relevantUser) {
      console.log("Setting first account");
      setCurrentUser(
        relevantUser.username,
        relevantUser.id,
        relevantUser.referrer,
        relevantUser.chain
      );
    }
  }
}

export { useInitCache };
