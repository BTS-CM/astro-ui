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
  setBitassetData,
} from "../stores/cache.ts";
import { $userStorage, addUser, setCurrentUser, $currentUser } from "../stores/users.ts";

// Create fetcher store
const [createFetcherStore] = nanoquery({
  fetcher: async (chain: string, endpoints: string) => {
    const _endpoints = endpoints ? endpoints.split(",") : [];
    const fetches = [
      _endpoints.includes("marketSearch")
        ? fetch(`http://localhost:8080/cache/marketSearch/${chain}`, {
            method: "GET",
          })
        : null,
      _endpoints.includes("assets")
        ? fetch(`http://localhost:8080/cache/minAssets/${chain}`, {
            method: "GET",
          })
        : null,
      _endpoints.includes("pools")
        ? fetch(`http://localhost:8080/cache/minPools/${chain}`, {
            method: "GET",
          })
        : null,
      _endpoints.includes("globalParams")
        ? fetch(`http://localhost:8080/cache/feeSchedule/${chain}`, {
            method: "GET",
          })
        : null,
      _endpoints.includes("offers")
        ? fetch(`http://localhost:8080/cache/offers/${chain}`, {
            method: "GET",
          })
        : null,
      _endpoints.includes("bitAssetData")
        ? fetch(`http://localhost:8080/cache/bitassets/${chain}`, {
            method: "GET",
          })
        : null,
    ];

    const responses = await Promise.all(fetches);

    const parsedResponses = await Promise.all(
      responses.map(async (response, index) => {
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

        const decompressed = fflate.decompressSync(fflate.strToU8(responseContents.result, true));
        const originalString = fflate.strFromU8(decompressed);
        const parsedJSON = JSON.parse(originalString);

        switch (index) {
          case 0:
            addMarketSearchesToCache(parsedJSON);
            break;
          case 1:
            addAssetsToCache(
              parsedJSON.map((_asset) => {
                return {
                  id: `1.3.${_asset.id}`,
                  symbol: _asset.s,
                  precision: _asset.p,
                  issuer: `1.2.${_asset.i}`,
                  market_fee_percent: _asset.mfp,
                  max_market_fee: _asset.mmf,
                  max_supply: _asset.ms,
                };
              })
            );
            break;
          case 2:
            addPoolsToCache(
              parsedJSON.map((_pool) => {
                return {
                  id: `1.19.${_pool.id}`,
                  asset_a_id: `1.3.${_pool.a}`,
                  asset_a_symbol: _pool.as,
                  asset_b_id: `1.3.${_pool.b}`,
                  asset_b_symbol: _pool.bs,
                  share_asset_symbol: _pool.sa,
                  balance_a: _pool.ba,
                  balance_b: _pool.bb,
                  taker_fee_percent: _pool.tfp,
                };
              })
            );
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

    return parsedResponses;
  },
});

function useInitCache(chain, endpoints) {
  const cacheStore = useMemo(() => {
    return createFetcherStore([chain, endpoints.join(",")]);
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
