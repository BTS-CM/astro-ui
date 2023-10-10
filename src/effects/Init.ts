import { useEffect } from "react";
import * as fflate from "fflate";

import {
  $globalParamsCache,
  setGlobalParams,
  $marketSearchCache,
  addMarketSearchesToCache,
  $poolCache,
  addPoolsToCache,
  $assetCache,
  addAssetsToCache,
} from "../stores/cache.ts";

import {
  $userStorage,
  addUser,
  setCurrentUser,
  $currentUser,
} from "../stores/users.ts";

function useInitCache(chain: string) {
  useEffect(() => {
    /**
     * Retrieves search data
     */
    async function fetchMarketSearches() {
      const cachedMarketAssets = await fetch(
        `http://localhost:8080/cache/marketSearch/${chain}`,
        { method: "GET" }
      ).catch((err) => console.log({ err, loc: "cachedMarketAssets" }));

      if (!cachedMarketAssets.ok) {
        console.log("Failed to fetch market search data");
        return;
      }

      const responseContents = await cachedMarketAssets.json();

      if (!responseContents || !responseContents.result) {
        console.log("Failed to fetch market search data");
        return;
      }

      const decompressed = fflate.decompressSync(
        fflate.strToU8(responseContents.result, true)
      );
      const originalString = fflate.strFromU8(decompressed);
      const parsedJSON = JSON.parse(originalString);
      addMarketSearchesToCache(parsedJSON);
    }

    async function getAllAssets() {
      const response = await fetch(
        `http://localhost:8080/cache/allassets/${chain}`,
        { method: "GET" }
      );

      if (!response.ok) {
        console.log("Failed to fetch all assets");
        return;
      }

      const responseContents = await response.json();

      if (!responseContents || !responseContents.result) {
        console.log("Failed to fetch all assets");
        return;
      }

      const decompressed = fflate.decompressSync(
        fflate.strToU8(responseContents.result, true)
      );
      const originalString = fflate.strFromU8(decompressed);
      const parsedJSON = JSON.parse(originalString);
      if (parsedJSON) {
        addAssetsToCache(parsedJSON);
      }
    }

    /**
     * Retrieves the pools from the api
     */
    async function retrievePools() {
      const poolResponse = await fetch(
        `http://localhost:8080/cache/pools/${chain}`,
        {
          method: "GET",
        }
      ).catch((err) => console.log({ err, loc: "retrievePools" }));

      const responseContents = await poolResponse.json();

      if (!responseContents || !responseContents.result) {
        console.log("Failed to fetch pool cache.");
        return;
      }

      const decompressed = fflate.decompressSync(
        fflate.strToU8(responseContents.result, true)
      );
      const originalString = fflate.strFromU8(decompressed);
      const parsedJSON = JSON.parse(originalString);
      if (parsedJSON) {
        addPoolsToCache(parsedJSON);
      }
    }

    async function lookupFees() {
      const response = await fetch(
        `http://localhost:8080/api/getObjects/${chain}`,
        { method: "POST", body: JSON.stringify(["2.0.0"]) }
      );

      if (!response.ok) {
        console.log("Failed to fetch fee data");
        return;
      }

      const responseContents = await response.json();

      if (
        responseContents &&
        responseContents.result &&
        responseContents.result.length
      ) {
        const finalResult = responseContents.result[0];
        setGlobalParams(finalResult);
      }
    }

    if (chain) {
      const globalParams = $globalParamsCache.get();
      if (!globalParams) {
        console.log("Looking up blockchain fees");
        lookupFees();
      }

      const marketSearch = $marketSearchCache.get();
      if (!marketSearch || !marketSearch.length) {
        console.log("Looking up market search data");
        fetchMarketSearches();
      }

      const pools = $poolCache.get();
      if (!pools || !pools.length) {
        console.log("Looking up pools");
        retrievePools();
      }

      const assets = $assetCache.get();
      if (!assets || !assets.length) {
        console.log("Looking up assets");
        getAllAssets();
      }

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
  }, [chain]);
}

export { useInitCache };
