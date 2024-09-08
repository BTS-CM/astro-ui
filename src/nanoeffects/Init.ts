import { useEffect } from "react";

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
} from "@/stores/cache.ts";

import {
  getFeeSchedule,
  getMarketSearch,
  getMinAssets,
  getMinPools,
  getMinBitassets,
  getActiveOffers,
} from "@/lib/cache.ts";

import { $userStorage, addUser, setCurrentUser, $currentUser } from "@/stores/users.ts";

async function useInitCache(chain: string, endpoints: any[]) {
  useEffect(() => {
    async function init() {
      if (
        endpoints.includes("marketSearch") &&
        (
          chain === "bitshares" && !$marketSearchCacheBTS.get().length ||
          chain === "bitshares_testnet" && !$marketSearchCacheTEST.get().length
        )
      ) {
        const marketSearches = await getMarketSearch();
        addMarketSearchesToCache(marketSearches);
      }
  
      if (
        endpoints.includes("assets") &&
        (
          chain === "bitshares" && !$assetCacheBTS.get().length ||
          chain === "bitshares_testnet" && !$assetCacheTEST.get().length
        )
      ) {
        const minAssets = await getMinAssets();
        addAssetsToCache(minAssets);
      }
  
      if (
        endpoints.includes("pools") &&
        (
          chain === "bitshares" && !$poolCacheBTS.get().length ||
          chain === "bitshares_testnet" && !$poolCacheTEST.get().length
        )
      ) {
        const minPools = await getMinPools();
        addPoolsToCache(minPools);
      }
  
      if (
        endpoints.includes("globalParams") &&
        (chain === "bitshares" || chain === "bitshares_testnet")
      ) {
        let globalParams;
        try {
          globalParams = await getFeeSchedule();
        } catch (error) {
          console.log({ error });
        }

        if (globalParams) {
          setGlobalParams(globalParams);
        }
      }
  
      if (
        endpoints.includes("offers") &&
        (
          chain === "bitshares" && !$offersCacheBTS.get().length ||
          chain === "bitshares_test" && !$offersCacheTEST.get().length
        )
      ) {
        const offers = await getActiveOffers();
        addOffersToCache(offers);
      }
  
      if (
        endpoints.includes("bitAssetData") &&
        (
          chain === "bitshares" && !$bitAssetDataCacheBTS.get().length ||
          chain === "bitshares_testnet" && !$bitAssetDataCacheTEST.get().length
        )
      ) {
        const bitAssets = await getMinBitassets();
        setBitassetData(bitAssets);
      }
    }

    if (chain && endpoints && endpoints.length) {
      init();
    }
  }, [chain, endpoints]);

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
