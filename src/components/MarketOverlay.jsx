import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { useStore } from "@nanostores/react";

import Market from "./Market";
import MarketPlaceholder from "./MarketPlaceholder";

import { humanReadableFloat } from "@/lib/common";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { createAssetFromSymbolStore } from "@/nanoeffects/Assets.ts";

export default function MarketOverlay(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  const {
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _poolsBTS,
    _poolsTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && currentNode && assets && assets.length) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setBalances(filteredData);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assets, currentNode, balanceCounter]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [limitOrderFee, setLimitOrderFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.parameters) {
      const foundFee = globalParams.find((x) => x.id === 1);
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setLimitOrderFee(finalFee);
    }
  }, [globalParams]);

  // End of init

  const searchSymbols = useMemo(
    () => marketSearch.map((asset) => asset.s),
    [marketSearch]
  );
  const searchIds = useMemo(
    () => marketSearch.map((asset) => asset.id),
    [marketSearch]
  );

  const handleAssetAChange = (newAssetA) => {
    setAssetA(newAssetA);
  };
  const handleAssetBChange = (newAssetA) => {
    setAssetB(newAssetA);
  };

  const [assetA, setAssetA] = useState(!window.location.search ? "BTS" : null);
  const [assetB, setAssetB] = useState(!window.location.search ? "CNY" : null);
  useEffect(() => {
    async function parseUrlAssets() {
      //console.log("Parsing market parameters");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const market = params.market;

      let finalAssetA = assetA;
      let finalAssetB = assetB;

      if (!market || !market.length) {
        console.log("No market parameters found.");
        finalAssetA = "1.3.0";
        finalAssetB = "CNY";
      } else {
        let asset_a = market.split("_")[0].toUpperCase();
        let asset_b = market.split("_")[1].toUpperCase();

        if (asset_a && asset_b && asset_b.length && asset_a === asset_b) {
          // Avoid invalid duplicate asset market pairs
          asset_b = asset_a === "BTS" ? "CNY" : "1.3.0";
          console.log("Invalid market parameters - replaced quote asset.");
        }

        if (
          !asset_a ||
          !asset_a.length ||
          (!searchSymbols.includes(asset_a) && !searchIds.includes(asset_a))
        ) {
          console.log("Asset A replaced with default.");
          finalAssetA = "1.3.0";
        }

        if (!finalAssetA) {
          const foundAssetA = marketSearch.find(
            (asset) => asset.id === asset_a || asset.s === asset_a
          );
          if (foundAssetA) {
            //console.log("Setting asset A.");
            finalAssetA = foundAssetA.s;
          } else {
            console.log("Setting default asset A");
            finalAssetA = "1.3.0";
          }
        }

        if (
          !asset_b ||
          !asset_b.length ||
          (!searchSymbols.includes(asset_b) && !searchIds.includes(asset_b))
        ) {
          console.log("Asset B replaced with default.");
          finalAssetB = finalAssetA !== "CNY" ? "CNY" : "1.3.0";
        }

        if (!finalAssetB) {
          const foundAssetB = marketSearch.find(
            (asset) => asset.id === asset_b || asset.s === asset_b
          );
          if (foundAssetB) {
            finalAssetB = foundAssetB.s;
          } else {
            console.log("Setting default asset B");
            finalAssetB =
              asset_a !== "BTS" && asset_a !== "1.3.0" ? "1.3.0" : "CNY";
          }
        }
      }

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
    if (usr && usr.chain && assets && assets.length && assetA) {
      _resetA();

      /*
      // TODO: re factor 
      const foundAsset = assets.find((asset) => asset.symbol === assetA);
      if (foundAsset) {
        console.log("Retrieved asset A from local cache");
        setAssetAData(foundAsset);
        return;
      }
      */

      const assetSymbolStore = createAssetFromSymbolStore([usr.chain, assetA]);
      assetSymbolStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          console.log("Retrieved asset A from API");
          const extra = data.extra;
          if (extra && extra.length) {
            setAssetADetails(extra[0]);
            if (extra.length > 1) {
              setABitassetData(extra[1]);
            }
          }
          setAssetAData(data.assetData);
        }
      });
    }
  }, [assets, assetA, usr]);

  useEffect(() => {
    if (usr && usr.chain && assets && assets.length && assetB) {
      _resetB();

      /*
      // TODO: refactor
      const foundAsset = assets.find((asset) => asset.symbol === assetB);
      if (foundAsset) {
        console.log("Retrieved asset B from local cache");
        setAssetBData(foundAsset);
        return;
      }
      */

      const assetSymbolStore = createAssetFromSymbolStore([usr.chain, assetB]);
      assetSymbolStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          console.log("Retrieved asset B from API");
          const extra = data.extra;
          if (extra && extra.length) {
            setAssetBDetails(extra[0]);
            if (extra.length > 1) {
              setBBitassetData(extra[1]);
            }
          }
          setAssetBData(data.assetData);
        }
      });
    }
  }, [assets, assetB, usr]);

  if (!usr || !usr.chain || !assetA || !assetB) {
    return (
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3 text-center">
          <p>{t("MarketPlaceholder:loadingAssetDescription")}</p>
        </div>
      </div>
    );
  }

  if (
    assetA &&
    assetB &&
    (!assetAData || !assetADetails || !assetBData || !assetBDetails)
  ) {
    return (
      <MarketPlaceholder
        usr={usr}
        assetA={assetA}
        assetB={assetB}
        assets={assets}
        marketSearch={marketSearch}
      />
    );
  }

  return (
    <div className="container mx-auto mt-5 mb-5">
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
        _assetsBTS={_assetsBTS}
        _assetsTEST={_assetsTEST}
        _marketSearchBTS={_marketSearchBTS}
        _marketSearchTEST={_marketSearchTEST}
        _poolsBTS={_poolsBTS}
        _poolsTEST={_poolsTEST}
        balances={balances}
      />
    </div>
  );
}
