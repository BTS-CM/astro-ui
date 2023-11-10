import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";

import Market from "./Market";
import MarketPlaceholder from "./MarketPlaceholder";
import CurrentUser from "./common/CurrentUser.jsx";

import { humanReadableFloat, trimPrice } from "../lib/common";
import { useInitCache } from "../effects/Init.ts";

import { $currentUser } from "../stores/users.ts";
import {
  $assetCache,
  $marketSearchCache,
  $globalParamsCache,
  $poolCache,
} from "../stores/cache.ts";

import {
  createBitassetDataStore,
  createCachedAssetStore,
  createDynamicDataStore,
} from "../effects/Assets.ts";

export default function MarketOverlay(properties) {
  // Initializing
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const assets = useSyncExternalStore($assetCache.subscribe, $assetCache.get, () => true);

  const globalParams = useSyncExternalStore(
    $globalParamsCache.subscribe,
    $globalParamsCache.get,
    () => true
  );

  const marketSearch = useSyncExternalStore(
    $marketSearchCache.subscribe,
    $marketSearchCache.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", [
    "assets",
    "globalParams",
    "marketSearch",
    "pools",
  ]);

  const [limitOrderFee, setLimitOrderFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.parameters) {
      const foundFee = globalParams.find((x) => x[0] === 1);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setLimitOrderFee(finalFee);
    }
  }, [globalParams]);

  // End of init

  const searchSymbols = useMemo(() => marketSearch.map((asset) => asset.s), [marketSearch]);
  const searchIds = useMemo(() => marketSearch.map((asset) => asset.id), [marketSearch]);

  const handleAssetAChange = (newAssetA) => {
    setAssetA(newAssetA);
  };

  const handleAssetBChange = (newAssetA) => {
    setAssetB(newAssetA);
  };

  const [assetA, setAssetA] = useState(!window.location.search ? "BTS" : null);
  const [assetB, setAssetB] = useState(!window.location.search ? "USD" : null);
  useEffect(() => {
    async function parseUrlAssets() {
      console.log("Parsing market parameters");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const market = params.market;

      let finalAssetA = assetA;
      let finalAssetB = assetB;

      if (!market || !market.length) {
        console.log("No market parameters found.");
        finalAssetA = "BTS";
        finalAssetB = "USD";
      } else {
        let asset_a = market.split("_")[0].toUpperCase();
        let asset_b = market.split("_")[1].toUpperCase();

        if (asset_a && asset_b && asset_b.length && asset_a === asset_b) {
          // Avoid invalid duplicate asset market pairs
          asset_b = asset_a === "BTS" ? "USD" : "BTS";
          console.log("Invalid market parameters - replaced quote asset.");
        }

        if (
          !asset_a ||
          !asset_a.length ||
          (!searchSymbols.includes(asset_a) && !searchIds.includes(asset_a))
        ) {
          console.log("Asset A replaced with default.");
          finalAssetA = "BTS";
        }

        if (!finalAssetA) {
          const foundAssetA = marketSearch.find(
            (asset) => asset.id === asset_a || asset.s === asset_a
          );
          if (foundAssetA) {
            console.log("Setting asset A.");
            finalAssetA = foundAssetA.s;
          } else {
            console.log("Setting default asset A");
            finalAssetA = "BTS";
          }
        }

        if (
          !asset_b ||
          !asset_b.length ||
          (!searchSymbols.includes(asset_b) && !searchIds.includes(asset_b))
        ) {
          console.log("Asset B replaced with default.");
          finalAssetB = finalAssetA !== "USD" ? "USD" : "BTS";
        }

        if (!finalAssetB) {
          const foundAssetB = marketSearch.find(
            (asset) => asset.id === asset_b || asset.s === asset_b
          );
          if (foundAssetB) {
            console.log("Setting asset B.");
            finalAssetB = foundAssetB.s;
          } else {
            console.log("Setting default asset B");
            finalAssetB = asset_a !== "BTS" && asset_a !== "1.3.0" ? "BTS" : "USD";
          }
        }
      }

      // Return the final assets
      return { finalAssetA, finalAssetB };
    }

    if (marketSearch && marketSearch.length && window.location.search) {
      parseUrlAssets().then(({ finalAssetA, finalAssetB }) => {
        setAssetA(finalAssetA);
        setAssetB(finalAssetB);
      });
    }
  }, [marketSearch]);

  const [assetAData, setAssetAData] = useState(null);
  const [assetBData, setAssetBData] = useState(null);

  const [assetADetails, setAssetADetails] = useState(null);
  const [assetBDetails, setAssetBDetails] = useState(null);

  const [aBitassetData, setABitassetData] = useState(null);
  const [bBitassetData, setBBitassetData] = useState(null);

  function _resetA() {
    setAssetAData(null);
    setAssetADetails(null);
    setABitassetData(null);
  }

  function _resetB() {
    setAssetBData(null);
    setAssetBDetails(null);
    setBBitassetData(null);
  }

  useEffect(() => {
    let unsubscribeA;

    if (assetA && usr && usr.chain) {
      _resetA();

      if (assets && assets.length) {
        const foundAsset = assets.find((asset) => asset.s === assetA);
        if (foundAsset) {
          console.log("Retrieved asset A from local cache");
          setAssetAData(foundAsset);
          return;
        }
      }

      const cachedAssetStoreA = createCachedAssetStore([usr.chain, assetA]);
      unsubscribeA = cachedAssetStoreA.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          console.log("Retrieved asset A from API");
          setAssetAData(data);
        }
      });
    }

    return () => {
      if (unsubscribeA) unsubscribeA();
    };
  }, [assetA, usr]);

  useEffect(() => {
    let unsubscribeB;

    if (assetB && usr && usr.chain) {
      _resetB();

      if (assets && assets.length) {
        const foundAsset = assets.find((asset) => asset.s === assetB);
        if (foundAsset) {
          console.log("Retrieved asset A from local cache");
          setAssetBData(foundAsset);
          return;
        }
      }

      const cachedAssetStoreB = createCachedAssetStore([usr.chain, assetB]);
      unsubscribeB = cachedAssetStoreB.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          console.log("Retrieved asset B from API");
          setAssetBData(data);
        }
      });
    }

    return () => {
      if (unsubscribeB) unsubscribeB();
    };
  }, [assetB, usr]);

  useEffect(() => {
    let unsubscribeA;
    let unsubscribeBitassetA;

    if (assetAData && usr && usr.chain) {
      const dynamicDataStoreA = createDynamicDataStore([usr.chain, assetAData.id]);
      unsubscribeA = dynamicDataStoreA.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          setAssetADetails(data);
        }
      });

      if (assetAData.bitasset_data_id) {
        const bitassetDataStoreA = createBitassetDataStore([
          usr.chain,
          assetAData.bitasset_data_id,
        ]);
        unsubscribeBitassetA = bitassetDataStoreA.subscribe(({ data }) => {
          if (data && !data.error && !data.loading) {
            setABitassetData(data);
          }
        });
      }
    }

    return () => {
      if (unsubscribeA) unsubscribeA();
      if (unsubscribeBitassetA) unsubscribeBitassetA();
    };
  }, [assetAData, usr]);

  useEffect(() => {
    let unsubscribeB;
    let unsubscribeBitassetB;

    if (assetBData && usr && usr.chain) {
      const dynamicDataStoreB = createDynamicDataStore([usr.chain, assetBData.id]);
      unsubscribeB = dynamicDataStoreB.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          setAssetBDetails(data);
        }
      });

      if (assetBData.bitasset_data_id) {
        const bitassetDataStoreB = createBitassetDataStore([
          usr.chain,
          assetBData.bitasset_data_id,
        ]);
        unsubscribeBitassetB = bitassetDataStoreB.subscribe(({ data }) => {
          if (data && !data.error && !data.loading) {
            setBBitassetData(data);
          }
        });
      }
    }

    return () => {
      if (unsubscribeB) unsubscribeB();
      if (unsubscribeBitassetB) unsubscribeBitassetB();
    };
  }, [assetBData, usr]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        {usr &&
        usr.chain &&
        assetA &&
        assetB &&
        assetAData &&
        assetBData &&
        assetADetails &&
        assetBDetails ? (
          <>
            <Market
              usr={usr}
              assetA={assetA}
              assetB={assetB}
              assetAData={assetAData}
              assetADetails={assetADetails}
              assetABitassetData={aBitassetData}
              assetBData={assetBData}
              assetBDetails={assetBDetails}
              assetBBitassetData={bBitassetData}
              limitOrderFee={limitOrderFee}
              setAssetA={handleAssetAChange}
              setAssetB={handleAssetBChange}
              key={`Market_${assetA}_${assetB}`}
            />
          </>
        ) : (
          <MarketPlaceholder />
        )}
      </div>
      {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}{" "}
    </>
  );
}
