import { useEffect, useMemo } from "react";
import * as fflate from "fflate";
import { nanoquery } from "@nanostores/query";
import { useStore } from "@nanostores/react";

import {
  setGlobalParams,
  addMarketSearchesToCache,
  addPoolsToCache,
  addOffersToCache,
  addAssetsToCache,
  setBitassetData,
  //
  $assetCacheBTS,
  $assetCacheTEST,
  $poolCacheBTS,
  $poolCacheTEST,
  $offersCacheBTS,
  $offersCacheTEST,
  $marketSearchCacheBTS,
  $marketSearchCacheTEST,
  $globalParamsCacheBTS,
  $globalParamsCacheTEST,
  $bitAssetDataCacheBTS,
  $bitAssetDataCacheTEST,
} from "../stores/cache.ts";

import { $userStorage, addUser, setCurrentUser, $currentUser } from "../stores/users.ts";

// Create fetcher store
const [createFetcherStore] = nanoquery({
  fetcher: async (endpoints: string) => {
    const _endpoints = endpoints ? endpoints.split(",") : [];
    const fetches = [
      _endpoints.includes("marketSearch") && !$marketSearchCacheBTS.get().length
        ? fetch(`http://localhost:8080/cache/marketSearch/bitshares`, {
            method: "GET",
          })
        : null,
      _endpoints.includes("assets") && !$assetCacheBTS.get().length
        ? fetch(`http://localhost:8080/cache/minAssets/bitshares`, {
            method: "GET",
          })
        : null,
      _endpoints.includes("pools") && !$poolCacheBTS.get().length
        ? fetch(`http://localhost:8080/cache/minPools/bitshares`, {
            method: "GET",
          })
        : null,
      _endpoints.includes("globalParams") && !$globalParamsCacheBTS.get()
        ? fetch(`http://localhost:8080/cache/feeSchedule/bitshares`, {
            method: "GET",
          })
        : null,
      _endpoints.includes("offers") && !$offersCacheBTS.get().length
        ? fetch(`http://localhost:8080/cache/offers/bitshares`, {
            method: "GET",
          })
        : null,
      _endpoints.includes("bitAssetData") && !$bitAssetDataCacheBTS.get().length
        ? fetch(`http://localhost:8080/cache/bitassets/bitshares`, {
            method: "GET",
          })
        : null,
    ];

    const responses = await Promise.all(fetches);

    return responses;
  },
});

async function useInitCache(chain, endpoints) {
  const cacheStore = useMemo(() => {
    return createFetcherStore([endpoints.join(",")]);
  }, [chain]);
  const { data, loading, error } = useStore(cacheStore);

  useEffect(() => {
    async function init() {
      //console.log({ data, params: { loading, error }, msg: "FETCHED DATA" });

      const parsedResponses = await Promise.all(
        data.map(async (response, index) => {
          if (!response) {
            return;
          }

          if (!response.ok) {
            console.log("Failed to fetch data");
            return;
          }

          const responseContents = await response.json();

          if (!responseContents || !responseContents.result) {
            console.log("Failed to fetch data");
            return;
          }

          const _bts = fflate.decompressSync(
            fflate.strToU8(responseContents.result.bitshares, true)
          );
          const _test = fflate.decompressSync(
            fflate.strToU8(responseContents.result.bitshares_testnet, true)
          );

          const parsedJSON = {
            bitshares: JSON.parse(fflate.strFromU8(_bts)),
            bitshares_testnet: JSON.parse(fflate.strFromU8(_test)),
          };

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
            case 5:
              setBitassetData(parsedJSON);
              break;
            default:
              break;
          }
        })
      );
    }

    if (data && !loading && !error) {
      init();
    }
  }, [data, loading, error]);

  if (!$currentUser || !$currentUser.get().username) {
    //console.log("No current user");
    const storedUsers = $userStorage.get().users;
    const lastAccount = $userStorage.get().lastAccount;
    const relevantUser = storedUsers.find((user) => user.chain === chain);
    if (!storedUsers || !storedUsers.length || !relevantUser) {
      //console.log("Storing default null account");
      addUser("null-account", "1.2.3", "1.2.3", "bitshares");
      setCurrentUser("null-account", "1.2.3", "1.2.3", "bitshares");
    } else if (lastAccount && lastAccount.length) {
      //console.log("Setting last account");
      const user = lastAccount[0];
      setCurrentUser(user.username, user.id, user.referrer, user.chain);
    } else if (relevantUser) {
      //console.log("Setting first account");
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
