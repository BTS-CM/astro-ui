import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import { humanReadableFloat } from "@/lib/common";

import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";
import { $poolTrackers, updateTrackers } from "@/stores/poolTracker";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createObjectStore } from "@/nanoeffects/Objects.js";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createEveryLiquidityPoolStore } from "@/nanoeffects/LiquidityPools.js";

import { createMultipleTickerStore } from "@/nanoeffects/MarketTradeHistory.js";
import { createAssetCallOrdersStore } from "@/nanoeffects/AssetCallOrders.ts";

const convertToSatoshis = (value) =>
  value.toString().includes("e-")
    ? `${(value * 1e8).toFixed(0)} sats`
    : value.toString();

const calculateSmartcoinPrice = (
  smartcoin,
  usdPrice,
  quotePrecision,
  basePrecision
) => {
  if (!smartcoin) {
    return 0.0;
  }

  const _debt = smartcoin.individual_settlement_debt
    ? humanReadableFloat(
        parseInt(smartcoin.individual_settlement_debt),
        basePrecision
      )
    : 0;

  const _price = parseFloat(
    humanReadableFloat(
      parseInt(
        _debt && _debt > 0
          ? smartcoin.median_feed.settlement_price.quote.amount
          : smartcoin.current_feed.settlement_price.quote.amount
      ),
      quotePrecision
    ) /
      humanReadableFloat(
        parseInt(
          _debt && _debt > 0
            ? smartcoin.median_feed.settlement_price.base.amount
            : smartcoin.current_feed.settlement_price.base.amount
        ),
        basePrecision
      )
  );

  return usdPrice ? _price / usdPrice : _price;
};

const calculateStaked = (allUniqueAssets, pools, ownerships, assetId) => {
  if (!pools || !ownerships || !assetId) {
    return 0;
  }

  let _calculated = pools.reduce((acc, val) => {
    const _asset = allUniqueAssets.find((x) => x.id === val.share_asset);
    const ownership = ownerships[_asset.symbol];
    return ownership
      ? acc +
          parseInt(val.asset_a === assetId ? val.balance_a : val.balance_b) *
            ownership
      : acc;
  }, 0);

  return _calculated;
};

export default function CustomPoolTracker(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);
  const trackers = useStore($poolTrackers);

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const {
    _assetsBTS,
    _assetsTEST,
    _poolsBTS,
    _poolsTEST,
    //_marketSearchBTS,
    //_marketSearchTEST
  } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const [lpTradingVolumes, setLPTradingVolumes] = useState();
  useEffect(() => {
    let unsubscribeStore;

    if (usr && usr.id && currentNode) {
      const lpVolumeStore = createEveryLiquidityPoolStore([
        usr.chain,
        currentNode.url,
      ]);

      unsubscribeStore = lpVolumeStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setLPTradingVolumes(data);
        } else if (error) {
          console.log({ error, location: "lpVolumeStore" });
        }
      });
    }

    return () => {
      if (unsubscribeStore) unsubscribeStore();
    };
  }, [usr, currentNode]);

  const assets = useMemo(() => {
    if (!_chain || (!_assetsBTS && !_assetsTEST)) {
      return [];
    }

    if (_chain !== "bitshares") {
      return _assetsTEST;
    }

    return _assetsBTS;
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && assets && assets.length && currentNode) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode.url,
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setUsrBalances(filteredData);
          } else if (error) {
            console.log({ error, location: "userBalancesStore" });
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assets]);

  /*
  const marketSearch = useMemo(() => {
      if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
          return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
      }
      return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);
  */

  const pools = useMemo(() => {
    if (!_chain || (!_poolsBTS && !_poolsTEST)) {
      return [];
    }

    if (_chain !== "bitshares") {
      return _poolsTEST;
    }

    const relevantPools = _poolsBTS.filter((pool) => {
      const poolShareAsset = assets.find(
        (asset) => asset.id === pool.share_asset_id
      );
      if (!poolShareAsset) return false;
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(poolShareAsset.issuer)))
      );
    });

    return relevantPools;
  }, [assets, _poolsBTS, _poolsTEST, _chain]);

  const [poolId, setPoolId] = useState();
  useEffect(() => {
    async function parseUrlAssets() {
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const id = params.id;

      if (!id) {
        console.log("Credit offer parameter not found");
        return;
      }

      setPoolId(id);
    }

    if (_chain) {
      parseUrlAssets();
    }
  }, [_chain]);

  const storedTracker = useMemo(() => {
    if (_chain && poolId && trackers && trackers[_chain]) {
      const chainTrackers = trackers[_chain];
      const foundTracker = chainTrackers.find((x) => x.id === poolId);
      return foundTracker;
    }
  }, [_chain, poolId, trackers]);

  const [chosenPools, setChosenPools] = useState([]);
  const filteredLPTradingVolumes = useMemo(() => {
    if (!lpTradingVolumes || !chosenPools) {
      return null;
    }
    const _ids = chosenPools.map((x) => x.id);
    return lpTradingVolumes.filter((x) => _ids.includes(x.id));
  }, [lpTradingVolumes, chosenPools]);

  const [swappableAssets, setSwappableAssets] = useState();
  const [poolShareAssets, setPoolShareAssets] = useState();
  const [name, setName] = useState();
  useEffect(() => {
    if (storedTracker && pools && assets) {
      const poolsInScope = pools.filter((pool) =>
        storedTracker.pools.includes(pool.id)
      );

      const _swappableAssetSymbol = [];
      const _swappableAssets = [];
      const _poolShareAssets = [];

      poolsInScope.forEach((pool) => {
        const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
        const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
        const poolShareAsset = assets.find(
          (asset) => asset.id === pool.share_asset_id
        );
        if (poolShareAsset) {
          _poolShareAssets.push(poolShareAsset);
        }
        if (assetA && !_swappableAssetSymbol.includes(assetA.symbol)) {
          _swappableAssetSymbol.push(assetA.symbol);
          _swappableAssets.push(assetA);
        }
        if (assetB && !_swappableAssetSymbol.includes(assetB.symbol)) {
          _swappableAssetSymbol.push(assetB.symbol);
          _swappableAssets.push(assetB);
        }
      });

      setChosenPools(poolsInScope);
      setSwappableAssets(_swappableAssets);
      setPoolShareAssets(_poolShareAssets);
      setName(storedTracker.name);
    }
  }, [storedTracker, pools, assets]);

  // liquidity pool data
  const [liquidityPools, setLiquidityPools] = useState();

  // dynamic data
  const [dynamicData, setDynamicData] = useState();

  // smartcoin data
  const [smartcoinData, setSmartcoinData] = useState();
  const [backingAssets, setBackingAssets] = useState();

  const [requestResponse, setRequestResponse] = useState();
  useEffect(() => {
    let unsubscribeStore;
    if (
      assets &&
      currentNode &&
      swappableAssets &&
      poolShareAssets &&
      chosenPools &&
      chosenPools.length &&
      swappableAssets
    ) {
      const _chosenPoolIDs = chosenPools.map((x) => x.id);
      const _swappableAssetDDID = swappableAssets.map((x) =>
        x.id.replace("1.3.", "2.3.")
      );
      const _poolShareAssetDDID = poolShareAssets.map((x) =>
        x.id.replace("1.3.", "2.3.")
      );
      const _smartcoinIDs = swappableAssets.filter((x) => x.bitasset_data_id);

      const objectParams = [
        // liquidity pool data
        ..._chosenPoolIDs,
        // dynamic data (main assets)
        ..._swappableAssetDDID,
        // dynamic data (pool share assets)
        ..._poolShareAssetDDID,
        // smartcoin data
        ...[
          ...new Set([
            ..._smartcoinIDs.map((x) => x.bitasset_data_id), // user-configured
            "2.4.294", // always include honest.usd for USD price references
          ]),
        ],
      ];

      try {
        const objStore = createObjectStore([
          _chain,
          JSON.stringify(objectParams),
          currentNode ? currentNode.url : null,
        ]);

        unsubscribeStore = objStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setRequestResponse(data);
          } else if (error) {
            console.log({ error, location: "objStore" });
          }
        });
      } catch (e) {
        console.log({ e });
      }
    }

    return () => {
      if (unsubscribeStore) unsubscribeStore();
    };
  }, [assets, chosenPools, swappableAssets, poolShareAssets, currentNode]);

  useEffect(() => {
    if (chosenPools && requestResponse) {
      // liquidity pool data
      const lpLength = chosenPools.length;
      const liquidityPoolSlice = requestResponse.slice(0, lpLength);
      //console.log({liquidityPoolSlice})
      setLiquidityPools(liquidityPoolSlice);

      // dynamic asset data
      const maddLength = swappableAssets.length;
      const psaLength = poolShareAssets.length;
      let _dd = {};

      const _mainAssetDataSlice = requestResponse.slice(
        lpLength,
        lpLength + maddLength
      );
      const _poolShareAssetDataSlice = requestResponse.slice(
        lpLength + maddLength,
        lpLength + maddLength + psaLength
      );

      //console.log({ _mainAssetDataSlice, _poolShareAssetDataSlice })

      _mainAssetDataSlice.forEach((x) => {
        // main assets
        const _key = x.id.replace("2.3.", "1.3.");
        const _asset = assets.find((y) => y.id === _key);
        _dd[_asset.symbol] = x;
      });

      _poolShareAssetDataSlice.forEach((x) => {
        // pool share assets
        const _key = x.id.replace("2.3.", "1.3.");
        const _asset = assets.find((y) => y.id === _key);
        _dd[_asset.symbol] = x;
      });

      setDynamicData(_dd);

      // smartcoin data
      const _smartcoinIDs = swappableAssets.filter((x) => x.bitasset_data_id);
      const scLength = [...new Set([..._smartcoinIDs, "2.4.294"])].length; // always include honest.usd for price reference points
      const _sc = {};
      const _smartcoinData = requestResponse.slice(
        lpLength + maddLength + psaLength,
        lpLength + maddLength + psaLength + scLength
      );
      _smartcoinData.forEach((_smartcoin) => {
        const _asset = assets.find((y) => y.id === _smartcoin.asset_id);
        _sc[_asset.symbol] = _smartcoin;
      });
      setSmartcoinData(_sc);

      const _backingAssetIDs = [
        ...new Set(_smartcoinData.map((x) => x.options.short_backing_asset)),
      ];
      setBackingAssets(assets.filter((x) => _backingAssetIDs.includes(x.id)));
    }
  }, [chosenPools, requestResponse]);

  const [backingAssetDD, setBackingAssetDD] = useState();
  useEffect(() => {
    let unsubscribeStore;
    if (_chain && currentNode && backingAssets && backingAssets.length) {
      const objStore = createObjectStore([
        _chain,
        JSON.stringify([
          ...backingAssets.map((x) => x.id.replace("1.3.", "2.3.")),
        ]),
        currentNode ? currentNode.url : null,
      ]);

      unsubscribeStore = objStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const _backingAssets = {};
          data.forEach((x) => {
            const _refID = x.id.replace("2.3.", "1.3.");
            const _symbol = backingAssets.find((x) => x.id === _refID).symbol;
            _backingAssets[_symbol] = x;
          });
          //console.log({ _backingAssets });
          setBackingAssetDD(_backingAssets);
        } else if (error) {
          console.log({ error, location: "objStore2" });
        }
      });
    }

    return () => {
      if (unsubscribeStore) unsubscribeStore();
    };
  }, [_chain, backingAssets, currentNode]);

  // dynamic data for:
  //    swappable assets, pool share assets, backing assets
  const combinedAssetDynamicData = useMemo(() => {
    if (!dynamicData || !backingAssetDD) {
      return null;
    }

    let _combined = {};
    Object.keys(dynamicData).forEach((key) => {
      _combined[key] = dynamicData[key];
    });
    Object.keys(backingAssetDD).forEach((key) => {
      _combined[key] = backingAssetDD[key];
    });

    return _combined;
  }, [dynamicData, backingAssetDD]);

  const uniqueAssets = (assets) => {
    const seen = new Set();
    return assets.filter((asset) => {
      const duplicate = seen.has(asset.id);
      seen.add(asset.id);
      return !duplicate;
    });
  };

  const allUniqueAssets = useMemo(() => {
    if (!assets || !swappableAssets || !poolShareAssets) {
      return null;
    }

    let _inputs = [];
    if (swappableAssets) {
      _inputs = _inputs.concat(swappableAssets);
    }
    if (poolShareAssets) {
      _inputs = _inputs.concat(poolShareAssets);
    }
    if (backingAssets) {
      _inputs = _inputs.concat(backingAssets);
    }

    return uniqueAssets(_inputs);
  }, [assets, swappableAssets, poolShareAssets, backingAssets]);

  const balances = useMemo(() => {
    if (!allUniqueAssets || !allUniqueAssets.length) {
      return null;
    }

    if (!usrBalances || !usrBalances.length) {
      return [];
    }

    let _targetIDs = allUniqueAssets.map((x) => x.id);
    let _ids = [...new Set(_targetIDs)];

    let _result = {};
    _ids.forEach((id) => {
      const balance = usrBalances.find((x) => x.asset_id === id);
      const _asset = allUniqueAssets.find((x) => x.id === id);
      if (balance) {
        _result[_asset.symbol] = balance;
      }
    });

    return _result;
  }, [usrBalances, allUniqueAssets]);

  const ownerships = useMemo(() => {
    if (!balances || !allUniqueAssets || !combinedAssetDynamicData) {
      return null;
    }

    const calculateOwnership = (supply, balance) => {
      return supply && balance ? parseInt(balance) / parseInt(supply) : 0;
    };

    let ownerships = {};
    // iterate over keys
    Object.keys(combinedAssetDynamicData).forEach((key) => {
      const _asset = allUniqueAssets.find((x) => x.symbol === key);
      const _balance = balances[_asset.symbol] ?? null;
      ownerships[_asset.symbol] = calculateOwnership(
        combinedAssetDynamicData[key].current_supply,
        _balance ? _balance.amount : 0
      );
    });

    return ownerships;
  }, [balances, allUniqueAssets, combinedAssetDynamicData]);

  // Summarizing the amount of each swappable asset staked in many pools
  const stakedAssets = useMemo(() => {
    if (
      !liquidityPools ||
      !swappableAssets ||
      !ownerships ||
      !allUniqueAssets
    ) {
      return null;
    }

    let _stakedAssets = {};
    swappableAssets.forEach((asset) => {
      const filteredPools = liquidityPools.filter(
        (x) => x.asset_a === asset.id || x.asset_b === asset.id
      );
      const _stakedAmount = calculateStaked(
        allUniqueAssets,
        filteredPools,
        ownerships,
        asset.id
      );
      const _finalAmount = humanReadableFloat(_stakedAmount, asset.precision);
      _stakedAssets[asset.symbol] = _finalAmount;
    });

    return _stakedAssets;
  }, [liquidityPools, swappableAssets, ownerships, allUniqueAssets]);

  const psaDD = useMemo(() => {
    if (!combinedAssetDynamicData || !poolShareAssets) {
      return null;
    }
    const _result = poolShareAssets
      .map((x) => x.symbol)
      .map((x) => combinedAssetDynamicData[x]);
    return _result;
  }, [combinedAssetDynamicData, poolShareAssets]);

  const [smartcoinCallOrders, setSmartcoinCallOrders] = useState();
  useEffect(() => {
    let unsubscribeStore;
    if (currentNode && usr && usr.id && assets && swappableAssets) {
      const _inputs = swappableAssets
        .filter((x) => x.bitasset_data_id)
        .map((x) => x.id);
      const _assetStore = createAssetCallOrdersStore([
        _chain,
        JSON.stringify(_inputs),
        currentNode.url,
      ]);

      unsubscribeStore = _assetStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const userCallOrders = {};
          data.forEach((x) => {
            const _callOrders = Object.values(x)[0];
            const _foundCallOrders = _callOrders.find(
              (y) => y.borrower === usr.id
            );

            const _key = Object.keys(x)[0]; // Extract the key from the current element
            const _refAsset = assets.find((x) => x.id === _key);
            userCallOrders[_refAsset.symbol] = _foundCallOrders;
          });
          setSmartcoinCallOrders(userCallOrders);
        } else if (error) {
          console.log({ error, location: "smartcoinCallOrders" });
        }
      });
    }

    return () => {
      if (unsubscribeStore) unsubscribeStore();
    };
  }, [currentNode, usr, assets, swappableAssets]);

  const [allAssetsMarketTickers, setAllAssetsMarketTickers] = useState();
  useEffect(() => {
    let unsubscribeStore;
    if (
      usr &&
      currentNode &&
      assets &&
      assets.length &&
      swappableAssets &&
      poolShareAssets
    ) {
      let allTradingPairs = [];

      swappableAssets.forEach((x) => {
        const _coreAsset = usr.chain === "bitshares" ? "BTS" : "TEST";
        const _coreTradeAsset =
          usr.chain === "bitshares" ? "HONEST.USD" : "NFTEA"; // TODO: Replace with other assets?
        allTradingPairs.push(
          `${x.symbol}_${
            x.symbol !== _coreAsset ? _coreAsset : _coreTradeAsset
          }`
        );
      });

      poolShareAssets.forEach((x) => {
        allTradingPairs.push(
          `${x.symbol}_${usr.chain === "bitshares" ? "BTS" : "TEST"}`
        );
      });

      if (backingAssets) {
        backingAssets.forEach((x) => {
          const _coreAsset = usr.chain === "bitshares" ? "BTS" : "TEST";
          const _coreTradeAsset =
            usr.chain === "bitshares" ? "HONEST.USD" : "NFTEA"; // TODO: Replace with other assets?
          allTradingPairs.push(
            `${x.symbol}_${
              x.symbol !== _coreAsset ? _coreAsset : _coreTradeAsset
            }`
          );
        });
      }

      const assetTickerStore = createMultipleTickerStore([
        usr.chain,
        JSON.stringify([...new Set(allTradingPairs)]),
        currentNode.url,
      ]);

      unsubscribeStore = assetTickerStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            // { "BTS_HONEST.USD": { tickerdata } }
            //console.log({data})
            setAllAssetsMarketTickers(data);
          } else if (error) {
            console.log({ error, location: "assetTickerStore" });
          }
        }
      );
    }

    return () => {
      if (unsubscribeStore) unsubscribeStore();
    };
  }, [
    usr,
    currentNode,
    assets,
    swappableAssets,
    poolShareAssets,
    backingAssets,
  ]);

  const [allAssetPrices, setAllAssetPrices] = useState({});
  const [allSettlementPrices, setAllSettlementPrices] = useState({});
  useEffect(() => {
    if (!allAssetsMarketTickers || !smartcoinData || !backingAssets) {
      return;
    }

    const honestUSDPrice = calculateSmartcoinPrice(
      smartcoinData["HONEST.USD"],
      null,
      5,
      4
    );

    const _prices = {};
    const _settlementPrices = {};

    Object.keys(allAssetsMarketTickers).forEach((key) => {
      const _ticker = allAssetsMarketTickers[key];
      const _asset = assets.find((x) => x.symbol === key.split("_")[0]);

      if (!_asset) {
        console.warn(`Asset not found for key: ${key}`);
        return;
      }

      if (_asset.bitasset_data_id) {
        const _bitassetData = smartcoinData[_asset.symbol];
        const _backingAssetID = _bitassetData.options.short_backing_asset;
        const _backingAsset = backingAssets.find(
          (x) => x.id === _backingAssetID
        );

        if (!_backingAsset) {
          console.warn(`Backing asset not found for asset: ${_asset.symbol}`);
          return;
        }

        _settlementPrices[_asset.symbol] = calculateSmartcoinPrice(
          _bitassetData,
          null,
          _backingAsset.precision,
          _asset.precision
        );

        _prices[_asset.symbol] = {
          price: parseFloat(
            calculateSmartcoinPrice(
              _bitassetData,
              honestUSDPrice,
              _backingAsset.precision,
              _asset.precision
            )
          ),
          inUSD: _asset.symbol !== "HONEST.USD" ? true : false,
          precision: _asset.precision,
        };
      } else {
        if (_asset.symbol === "BTS") {
          _prices[_asset.symbol] = {
            price:
              _ticker.latest && parseFloat(honestUSDPrice) > 0
                ? parseFloat(1 / parseFloat(honestUSDPrice))
                : 0,
            inUSD: true,
            precision: _asset.precision,
          };
        } else {
          _prices[_asset.symbol] = {
            price:
              _ticker.latest && parseFloat(_ticker.latest) > 0
                ? parseFloat(1 / parseFloat(_ticker.latest)) *
                  parseFloat(1 / parseFloat(honestUSDPrice))
                : 0,
            inUSD: false,
            precision: _asset.precision,
          };
        }
      }
    });

    setAllAssetPrices(_prices);
    setAllSettlementPrices(_settlementPrices);
  }, [allAssetsMarketTickers, smartcoinData, backingAssets, assets]);

  let [totalBalances, setTotalBalances] = useState();
  useEffect(() => {
    if (!swappableAssets || !poolShareAssets || !assets) {
      return;
    }

    let _assetIDs = [];
    _assetIDs = _assetIDs.concat(swappableAssets.map((x) => x.id));
    _assetIDs = _assetIDs.concat(poolShareAssets.map((x) => x.id));

    if (backingAssets && backingAssets.length) {
      _assetIDs = _assetIDs.concat(backingAssets.map((x) => x.id));
    }

    let allAssetIDs = [...new Set(_assetIDs)];

    let _totalBalances = {};
    allAssetIDs.forEach((id) => {
      const _asset = assets.find((x) => x.id === id);

      // Check liquid balances
      if (balances && balances[_asset.symbol]) {
        const _liquidAmount = humanReadableFloat(
          balances[_asset.symbol].amount,
          _asset.precision
        );
        _totalBalances[_asset.symbol] = _liquidAmount;
      }

      // Check balance staked in liquidity pools
      if (stakedAssets && stakedAssets[_asset.symbol]) {
        const _stakedAmount = parseFloat(stakedAssets[_asset.symbol]);
        _totalBalances[_asset.symbol] = _totalBalances[_asset.symbol]
          ? _totalBalances[_asset.symbol] + _stakedAmount
          : _stakedAmount;
      }

      // Check balance held in collateral positions
      if (smartcoinCallOrders && smartcoinCallOrders[_asset.symbol]) {
        const _currentSmartcoin = smartcoinData[_asset.symbol];
        const _backingAsset = assets.find(
          (x) => x.id === _currentSmartcoin.options.short_backing_asset
        );
        const smartcoinCollateral = parseFloat(
          humanReadableFloat(
            smartcoinCallOrders[_asset.symbol]
              ? smartcoinCallOrders[_asset.symbol].collateral
              : 0,
            _backingAsset.precision
          )
        );
        _totalBalances[_backingAsset.symbol] = _totalBalances[
          _backingAsset.symbol
        ]
          ? _totalBalances[_backingAsset.symbol] + smartcoinCollateral
          : smartcoinCollateral;
      }
    });
    setTotalBalances(_totalBalances);
  }, [
    swappableAssets,
    poolShareAssets,
    backingAssets,
    assets,
    balances,
    stakedAssets,
    smartcoinCallOrders,
  ]);

  const finalBalanceUSDValue = useMemo(() => {
    let _total = 0;

    if (totalBalances && allAssetPrices) {
      const honestUSDPrice = allAssetPrices["HONEST.USD"]
        ? parseFloat(allAssetPrices["HONEST.USD"].price)
        : 0.001; // should never occur

      const btsPrice = allAssetPrices["BTS"]
        ? parseFloat(allAssetPrices["BTS"].price)
        : parseFloat((1 / honestUSDPrice).toFixed(4));

      Object.keys(totalBalances).forEach((key) => {
        const assetPrice = allAssetPrices[key];
        const balance = totalBalances[key];

        if (assetPrice && balance) {
          const price = parseFloat(assetPrice.price);
          const balanceValue = parseFloat(balance);

          if (!isNaN(price) && !isNaN(balanceValue)) {
            if (assetPrice.inUSD && balanceValue && price) {
              _total += balanceValue * price; // in USD
            }

            if (!assetPrice.inUSD && balanceValue && price) {
              _total += (balanceValue * price) / honestUSDPrice; // BTS -> USD
            }
          }
        }
      });
    }

    const _finalAmount = _total.toFixed(4);

    return _finalAmount;
  }, [totalBalances, allAssetPrices, allSettlementPrices]);

  const featuredPoolRow = ({ index, style }) => {
    let res = liquidityPools[index];

    if (!res) {
      return null;
    }

    const _currentPSA = poolShareAssets.find((x) => x.id === res.share_asset);
    const _psaDD = psaDD.find(
      (x) => x.id === res.share_asset.replace("1.3.", "2.3.")
    );

    const _psaBalance =
      usrBalances && usrBalances.length
        ? usrBalances.find((x) => x.asset_id === res.share_asset)
        : null;

    const _poolAssetA = swappableAssets.find((x) => x.id === res.asset_a);
    const _poolAssetB = swappableAssets.find((x) => x.id === res.asset_b);

    const _assetAPrice = allAssetPrices[_poolAssetA.symbol]?.price || 0;
    const _assetBPrice = allAssetPrices[_poolAssetB.symbol]?.price || 0;
    const _psaPrice = allAssetPrices[_currentPSA.symbol]?.price || 0;

    const _amountA = humanReadableFloat(res.balance_a, _poolAssetA.precision);
    const _amountB = humanReadableFloat(res.balance_b, _poolAssetB.precision);

    const foundTradingVolume =
      lpTradingVolumes && lpTradingVolumes.length
        ? lpTradingVolumes.find((x) => x.id === res.id)
        : null;

    const _24hVolumeA = foundTradingVolume
      ? humanReadableFloat(
          parseInt(foundTradingVolume.statistics._24h_exchange_a2b_amount_a) +
            parseInt(foundTradingVolume.statistics._24h_exchange_b2a_amount_a),
          _poolAssetA.precision
        )
      : "0.00";

    const _24hVolumeB = foundTradingVolume
      ? humanReadableFloat(
          parseInt(foundTradingVolume.statistics._24h_exchange_a2b_amount_b) +
            parseInt(foundTradingVolume.statistics._24h_exchange_b2a_amount_b),
          _poolAssetB.precision
        )
      : "0.00";

    const _24hFeeA = foundTradingVolume
      ? humanReadableFloat(
          parseInt(foundTradingVolume.statistics._24h_exchange_fee_a) +
            parseInt(foundTradingVolume.statistics._24h_withdrawal_fee_a),
          _poolAssetA.precision
        )
      : "0.00";

    const _24hFeeB = foundTradingVolume
      ? humanReadableFloat(
          parseInt(foundTradingVolume.statistics._24h_exchange_fee_b) +
            parseInt(foundTradingVolume.statistics._24h_withdrawal_fee_b),
          _poolAssetB.precision
        )
      : "0.00";

    const poolOwnershipPercentage =
      _psaBalance && _psaBalance.amount
        ? _psaBalance.amount / _psaDD.current_supply
        : 0;

    const smartcoinSymbols = swappableAssets
      .filter((x) => x.bitasset_data_id)
      .map((x) => x.symbol);

    const _poolTotalUSD =
      parseFloat(_amountA) * parseFloat(_assetAPrice) +
      parseFloat(_amountB) * parseFloat(_assetBPrice);

    return (
      <div
        style={{ ...style }}
        key={`poolRow-${res.id}`}
        className="grid grid-cols-12 text-xs border border-gray-300"
      >
        <div className="grid grid-cols-1">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="hover:text-purple-500 text-md ml-1 mr-1 mt-1 mb-1"
              >
                🏦 {res.id}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  🏦 {t("PoolTracker:pool")} {res.id}
                </DialogTitle>
                <DialogDescription></DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <a href={`/swap/index.html?pool=${res.id}`}>
                  <Button variant="outline" className="w-full">
                    {t("PoolTracker:simpleSwap")}
                  </Button>
                </a>
                <a href={`/stake/index.html?pool=${res.id}`}>
                  <Button variant="outline" className="w-full">
                    {t("PoolTracker:stakeAssets")}
                  </Button>
                </a>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="hover:text-purple-500 text-md ml-1 mr-1"
              >
                🪙 {_currentPSA.id}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  🪙 {t("PoolTracker:psa")} {_currentPSA.id}
                </DialogTitle>
                <DialogDescription></DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <a href={`/dex/index.html?market=${res.share_asset}_BTS`}>
                  <Button variant="outline" className="w-full">
                    {t("PoolTracker:buy")}
                  </Button>
                </a>
                <a
                  href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${
                    _currentPSA.symbol ?? ""
                  }`}
                >
                  <Button variant="outline" className="w-full">
                    {t("PoolTracker:borrow")}
                  </Button>
                </a>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="hover:text-purple-500 text-md m-1"
              >
                {_poolAssetA.symbol}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  A: {_poolAssetA.symbol} {_poolAssetA.id}
                </DialogTitle>
                <DialogDescription></DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <a
                  href={`/dex/index.html?market=${_poolAssetA.symbol}_${
                    _poolAssetA.symbol === "BTS" ? "HONEST.USD" : "BTS"
                  }`}
                >
                  <Button variant="outline" className="w-full">
                    {t("PoolTracker:buyAsset", { asset: _poolAssetA.symbol })}
                  </Button>
                </a>
                <a
                  href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${_poolAssetA.symbol}`}
                >
                  <Button variant="outline" className="w-full">
                    {t("PoolTracker:borrowAsset", {
                      asset: _poolAssetA.symbol,
                    })}
                  </Button>
                </a>
                {smartcoinSymbols.includes(_poolAssetA.symbol) ? (
                  <a href={`/smartcoin/index.html?id=${_poolAssetA.id}`}>
                    <Button variant="outline" className="w-full">
                      {t("PoolTracker:createDebt")}
                    </Button>
                  </a>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="hover:text-purple-500 text-md m-1"
              >
                {_poolAssetB.symbol}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  B: {_poolAssetB.symbol} {_poolAssetB.id}
                </DialogTitle>
                <DialogDescription></DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <a
                  href={`/dex/index.html?market=${_poolAssetB.symbol}_${
                    _poolAssetB.symbol === "BTS" ? "HONEST.USD" : "BTS"
                  }`}
                >
                  <Button variant="outline" className="w-full">
                    {t("PoolTracker:buyAsset", { asset: _poolAssetB.symbol })}
                  </Button>
                </a>
                <a
                  href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${_poolAssetB.symbol}`}
                >
                  <Button variant="outline" className="w-full">
                    {t("PoolTracker:borrowAsset", {
                      asset: _poolAssetB.symbol,
                    })}
                  </Button>
                </a>
                {smartcoinSymbols.includes(_poolAssetB.symbol) ? (
                  <a href={`/smartcoin/index.html?id=${_poolAssetB.id}`}>
                    <Button variant="outline" className="w-full">
                      {t("PoolTracker:createDebt")}
                    </Button>
                  </a>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="ml-1 text-center">
          <span className="grid grid-cols-1">
            <span className="m-4">${_assetAPrice.toFixed(5)}</span>
            <span className="m-4">${_assetBPrice.toFixed(5)}</span>
          </span>
        </div>
        <div className="ml-1 border-l border-gray-300 flex items-center justify-center">
          <div className="grid grid-cols-1">
            <div>
              🌐{" "}
              {humanReadableFloat(_psaDD.current_supply, _currentPSA.precision)}
            </div>
            <div>
              🪙 $
              {(
                humanReadableFloat(
                  _psaDD.current_supply,
                  _currentPSA.precision
                ) * _psaPrice
              ).toFixed(5)}
            </div>
            <div>🔢 ${_poolTotalUSD ? _poolTotalUSD.toFixed(5) : 0}</div>
          </div>
        </div>
        <div className="ml-1 border-l border-gray-300 flex items-center justify-center">
          {_psaBalance && _psaBalance.amount ? (
            <>
              🌐 {humanReadableFloat(_psaBalance.amount, _currentPSA.precision)}
              <br />
              📊 {(poolOwnershipPercentage * 100).toFixed(2)}%
            </>
          ) : (
            <>
              0<br />
              0%
            </>
          )}
        </div>
        {swappableAssets.map((asset, i) => {
          let classNameContents =
            "flex justify-center items-center border-gray-300";
          if (i === 0) {
            classNameContents += " border-l";
          } else if (i === swappableAssets.length - 1) {
            classNameContents += " border-r";
          }
          return (
            <div
              key={`swappableAsset${asset.id.replaceAll(".", "_")}`}
              className={classNameContents}
            >
              {asset.id === _poolAssetA.id ? (
                <div className="grid grid-cols-1 gap-1">
                  <div>🅰️ {convertToSatoshis(_amountA)}</div>
                  <div className="text-center">
                    {`$${(_amountA * _assetAPrice).toFixed(5)}`}
                  </div>
                  <div>
                    📊{" "}
                    {convertToSatoshis(
                      (_amountA * poolOwnershipPercentage).toFixed(
                        _poolAssetA.precision
                      )
                    )}
                  </div>
                  <div className="text-center">
                    {`$${(
                      _amountA *
                      poolOwnershipPercentage *
                      _assetAPrice
                    ).toFixed(5)}`}
                  </div>
                </div>
              ) : null}
              {asset.id === _poolAssetB.id ? (
                <div className="grid grid-cols-1 gap-1">
                  <div>🅱️ {convertToSatoshis(_amountB)}</div>
                  <div className="text-center">
                    {`$${(_amountB * _assetBPrice).toFixed(5)}`}
                  </div>
                  <div>
                    📊{" "}
                    {convertToSatoshis(
                      (_amountB * poolOwnershipPercentage).toFixed(
                        _poolAssetB.precision
                      )
                    )}
                  </div>
                  <div className="text-center">
                    {`$${(
                      _amountB *
                      poolOwnershipPercentage *
                      _assetBPrice
                    ).toFixed(5)}`}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {swappableAssets && swappableAssets.length < 5
          ? Array.from({ length: 5 - swappableAssets.length }).map(
              (_, index) => (
                <div key={`blankRowCol${index}`} className="text-center"></div>
              )
            )
          : null}
        <div className="ml-3 mt-3 ml-1">
          A: {_24hVolumeA}
          <br />
          B: {_24hVolumeB}
          <br />
          <Separator />
          {t("PoolTracker:fees")}:<br />
          A: {convertToSatoshis(_24hFeeA)}
          <br />
          B: {convertToSatoshis(_24hFeeB)}
        </div>
        <div className="ml-3">
          💱 {res.taker_fee_percent / 100} %<br />
          💸 {res.withdrawal_fee_percent / 100} %<br />
          <Separator />
          A:{" "}
          {_psaBalance && _psaBalance.amount
            ? ((_24hFeeA / _amountA) * 100 * 30).toFixed(3)
            : "0.00"}{" "}
          % ~30d
          <br />
          B:{" "}
          {_psaBalance && _psaBalance.amount
            ? ((_24hFeeB / _amountB) * 100 * 30).toFixed(3)
            : "0.00"}{" "}
          % ~30d
          <br />
          A:{" "}
          {_psaBalance && _psaBalance.amount
            ? ((_24hFeeA / _amountA) * 100 * 365).toFixed(3)
            : "0.00"}{" "}
          % ~1yr
          <br />
          B:{" "}
          {_psaBalance && _psaBalance.amount
            ? ((_24hFeeB / _amountB) * 100 * 365).toFixed(3)
            : "0.00"}{" "}
          % ~1yr
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <Card className="p-2">
          <CardHeader>
            <CardTitle>
              {t("PoolTracker:customTitle", {
                name: storedTracker ? storedTracker.name : "",
              })}
            </CardTitle>
            <CardDescription>
              {t("PoolTracker:customDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {liquidityPools &&
            liquidityPools.length &&
            swappableAssets &&
            swappableAssets.length &&
            allAssetPrices &&
            psaDD &&
            lpTradingVolumes ? (
              <>
                <div className={`grid grid-cols-12 text-xs`}>
                  <div className="text-center">{t("PoolTracker:pool")}</div>
                  <div className="text-center">
                    {t("PoolTracker:assetPair")}
                  </div>
                  <div className="text-center">{t("PoolTracker:value")}</div>
                  <div className="text-center">
                    {t("PoolTracker:poolTotal")}
                  </div>
                  <div className="text-center">{t("PoolTracker:balance")}</div>
                  {swappableAssets && swappableAssets.length
                    ? swappableAssets.map((x) => (
                        <div
                          key={`swappable${x.id.replaceAll(".", "_")}`}
                          className="text-center"
                        >
                          {x.symbol}
                        </div>
                      ))
                    : null}
                  {swappableAssets && swappableAssets.length < 5
                    ? Array.from({ length: 5 - swappableAssets.length }).map(
                        (_, index) => (
                          <div
                            key={`blank${index}`}
                            className="text-center"
                          ></div>
                        )
                      )
                    : null}
                  <div>{t("PoolTracker:24hVolume")}</div>
                  <div>{t("PoolTracker:fees")}</div>
                </div>
                <div className="w-full max-h-[500px] overflow-auto">
                  <List
                    rowComponent={featuredPoolRow}
                    rowCount={liquidityPools.length}
                    rowHeight={110}
                    rowProps={{}}
                  />
                </div>
                <div className="grid grid-cols-12 text-xs">
                  <div className="col-span-4"></div>
                  <div className="col-span-6 text-center border border-gray-300">
                    <div className={`grid grid-cols-6`}>
                      <div></div>
                      {swappableAssets.map((asset) => (
                        <div key={`staked${asset.symbol}`}>
                          <b>{t("PoolTracker:inPool")}</b>
                          <br />
                          📊 {stakedAssets[asset.symbol]}
                          <br />$
                          {(
                            stakedAssets[asset.symbol] *
                            (allAssetPrices[asset.symbol]?.price || 0)
                          ).toFixed(4)}
                        </div>
                      ))}
                      {swappableAssets && swappableAssets.length < 5
                        ? Array.from({
                            length: 5 - swappableAssets.length,
                          }).map((_, index) => (
                            <div
                              key={`blankStaked${index}`}
                              className="text-center"
                            ></div>
                          ))
                        : null}
                    </div>
                    <div className={`grid grid-cols-6 mt-2`}>
                      <div></div>
                      {swappableAssets.map((asset) => (
                        <div key={`liquid${asset.symbol}`}>
                          <b>{t("PoolTracker:liquid")}</b>
                          <br />
                          {balances && balances[asset.symbol]
                            ? humanReadableFloat(
                                balances[asset.symbol].amount,
                                asset.precision
                              )
                            : 0}
                          <br />$
                          {balances && balances[asset.symbol]
                            ? (
                                humanReadableFloat(
                                  balances[asset.symbol].amount,
                                  asset.precision
                                ) * (allAssetPrices[asset.symbol]?.price || 0)
                              ).toFixed(4)
                            : 0}
                        </div>
                      ))}
                      {swappableAssets && swappableAssets.length < 5
                        ? Array.from({
                            length: 5 - swappableAssets.length,
                          }).map((_, index) => (
                            <div
                              key={`blankLiqidity${index}`}
                              className="text-center"
                            ></div>
                          ))
                        : null}
                    </div>
                    <div className={`grid grid-cols-6 mt-3`}>
                      <div></div>
                      {swappableAssets.map((asset) => (
                        <div key={`debt${asset.symbol}`}>
                          {asset.bitasset_data_id &&
                          smartcoinCallOrders &&
                          smartcoinCallOrders[asset.symbol] ? (
                            <>
                              <b>{t("PoolTracker:debt")}</b>
                              <br />
                            </>
                          ) : null}
                          {smartcoinCallOrders &&
                          smartcoinCallOrders[asset.symbol]
                            ? humanReadableFloat(
                                smartcoinCallOrders[asset.symbol].debt,
                                asset.precision
                              )
                            : null}
                        </div>
                      ))}
                      {swappableAssets && swappableAssets.length < 5
                        ? Array.from({
                            length: 5 - swappableAssets.length,
                          }).map((_, index) => (
                            <div
                              key={`blankDebt${index}`}
                              className="text-center"
                            ></div>
                          ))
                        : null}
                    </div>
                    <div className={`grid grid-cols-6 mt-3`}>
                      <div></div>
                      {swappableAssets.map((asset) => {
                        const _display =
                          asset.bitasset_data_id &&
                          smartcoinData &&
                          smartcoinCallOrders &&
                          smartcoinCallOrders[asset.symbol];

                        const _collateralAsset = _display
                          ? allUniqueAssets.find(
                              (x) =>
                                x.id ===
                                smartcoinData[asset.symbol].options
                                  .short_backing_asset
                            )
                          : null;

                        const _collateralAmount =
                          _display && _collateralAsset
                            ? humanReadableFloat(
                                smartcoinCallOrders[asset.symbol].collateral,
                                _collateralAsset.precision
                              )
                            : 0;

                        const _debtAmount = _display
                          ? humanReadableFloat(
                              smartcoinCallOrders[asset.symbol].debt,
                              asset.precision
                            )
                          : 0;

                        const _debtSettlementPrice = _display
                          ? allSettlementPrices[asset.symbol]
                          : 0;

                        return (
                          <div key={`tc${asset.symbol}`}>
                            {_display ? (
                              <b>{t("PoolTracker:totalCollateral")}</b>
                            ) : null}
                            <br />
                            {_display ? _collateralAmount : null}
                            <br />
                            {_display && allAssetPrices[asset.symbol]
                              ? (
                                  _collateralAmount /
                                  (_debtAmount * _debtSettlementPrice)
                                ).toFixed(3)
                              : null}
                          </div>
                        );
                      })}
                      {swappableAssets && swappableAssets.length < 5
                        ? Array.from({
                            length: 5 - swappableAssets.length,
                          }).map((_, index) => (
                            <div
                              key={`blankCollaterals${index}`}
                              className="text-center"
                            ></div>
                          ))
                        : null}
                    </div>
                    <div className={`grid grid-cols-6 mt-3`}>
                      <div className="mt-2">
                        {t("PoolTracker:total")}
                        <br />
                        {t("PoolTracker:circulating")}
                        <br />
                        {t("PoolTracker:supplyPercent")}
                      </div>
                      {swappableAssets.map((asset) => {
                        const _currentSupply =
                          dynamicData && dynamicData[asset.symbol]
                            ? humanReadableFloat(
                                dynamicData[asset.symbol].current_supply,
                                asset.precision
                              )
                            : 0;
                        const _total = totalBalances[asset.symbol] || 0;
                        return (
                          <div key={`totals${asset.symbol}`}>
                            <b>{t("PoolTracker:total")}</b>
                            <br />
                            <b>{_total}</b>
                            <br />
                            {_currentSupply}
                            <br />
                            <b>
                              {_currentSupply && _total
                                ? ((_total / _currentSupply) * 100).toFixed(3)
                                : 0}
                            </b>
                            %
                          </div>
                        );
                      })}
                      {swappableAssets && swappableAssets.length < 5
                        ? Array.from({
                            length: 5 - swappableAssets.length,
                          }).map((_, index) => (
                            <div
                              key={`blankTotals${index}`}
                              className="text-center"
                            ></div>
                          ))
                        : null}
                    </div>
                    <div className={`grid grid-cols-6 mt-3`}>
                      <div>
                        <span className="text-right">
                          <b>USD</b>
                        </span>
                        <br />
                      </div>
                      {swappableAssets.map((asset) => (
                        <div key={`usd${asset.symbol}`}>
                          <b>
                            $
                            {allAssetPrices[asset.symbol] &&
                            allAssetPrices[asset.symbol].price
                              ? (
                                  parseFloat(totalBalances[asset.symbol]) *
                                  parseFloat(allAssetPrices[asset.symbol].price)
                                ).toFixed(4)
                              : 0}
                          </b>
                        </div>
                      ))}
                      {swappableAssets && swappableAssets.length < 5
                        ? Array.from({
                            length: 5 - swappableAssets.length,
                          }).map((_, index) => (
                            <div
                              key={`blankPrices${index}`}
                              className="text-center"
                            ></div>
                          ))
                        : null}
                    </div>
                    <div className="grid grid-cols-6">
                      <div>
                        <span className="text-right">
                          <b>{t("PoolTracker:total")}</b>
                        </span>
                      </div>
                      <div className="col-span-1">
                        $
                        {swappableAssets
                          .reduce(
                            (acc, asset) =>
                              acc +
                              (allAssetPrices[asset.symbol] &&
                              allAssetPrices[asset.symbol].price
                                ? parseFloat(totalBalances[asset.symbol]) *
                                  parseFloat(allAssetPrices[asset.symbol].price)
                                : 0),
                            0
                          )
                          .toFixed(4)}
                      </div>
                      <div className="col-span-4"></div>
                    </div>
                  </div>
                  <div className="col-span-2"></div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
