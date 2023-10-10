import { useEffect } from "react";
import { $currentUser } from "../stores/users.ts";
import {
  $assetCache,
  $marketSearchCache,
  $globalParamsCache,
  $poolCache,
} from "../stores/cache.ts";

function usrCache(setUsr) {
  useEffect(() => {
    // Subscribes to the user nanostore state
    const unsubscribe = $currentUser.subscribe((value) => {
      setUsr(value);
    });
    return unsubscribe;
  }, [$currentUser]);
}

function assetCache(setAssetCache) {
  useEffect(() => {
    const unsubscribe = $assetCache.subscribe((value) => {
      setAssetCache(value);
    });
    return unsubscribe;
  }, [$assetCache]);
}

function marketSearchCache(setMarketSearchCache) {
  useEffect(() => {
    const unsubscribe = $marketSearchCache.subscribe((value) => {
      setMarketSearchCache(value);
    });
    return unsubscribe;
  }, [$marketSearchCache]);
}

function globalParamsCache(setGlobalParamsCache) {
  useEffect(() => {
    const unsubscribe = $globalParamsCache.subscribe((value) => {
      setGlobalParamsCache(value);
    });
    return unsubscribe;
  }, [$globalParamsCache]);
}

function poolsCache(setPoolsCache) {
  useEffect(() => {
    const unsubscribe = $poolCache.subscribe((value) => {
      setPoolsCache(value);
    });
    return unsubscribe;
  }, [$poolCache]);
}

export {
  usrCache,
  assetCache,
  marketSearchCache,
  globalParamsCache,
  poolsCache,
};
