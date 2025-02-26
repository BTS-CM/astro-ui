import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { FixedSizeList as List } from "react-window";

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
import { $currentNode } from "@/stores/node.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createObjectStore } from "@/nanoeffects/Objects.js";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { 
  createEveryLiquidityPoolStore
} from "@/nanoeffects/LiquidityPools.js";

import { createTickerStore } from "@/nanoeffects/MarketTradeHistory.js";
import { createAssetCallOrdersStore } from "@/nanoeffects/AssetCallOrders.ts";

const convertToSatoshis = (value) => value.toString().includes('e-') ? `${(value * 1e8).toFixed(0)} sats` : value.toString();

const calculateSmartcoinPrice = (smartcoin, usdPrice, quotePrecision, basePrecision) => {
  if (!smartcoin) {
    return 0.0;
  }

  const _debt = smartcoin.individual_settlement_debt
    ? humanReadableFloat(parseInt(smartcoin.individual_settlement_debt), basePrecision)
    : 0;

  const _price = parseFloat(
    (
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
    ).toFixed(quotePrecision)
  );

  return usdPrice ? (_price / usdPrice).toFixed(4) : _price;
};

const calculateStaked = (pools, ownerships, assetId) => {
  if (!pools || !ownerships || !assetId) {
    return 0;
  }

  let _calculated = pools.reduce((acc, val) => {
    const ownership = ownerships[`ownership${val.share_asset.replace("1.3.", "")}`];
    return ownership
      ? acc + parseInt(val.asset_a === assetId ? val.balance_a : val.balance_b) * ownership
      : acc;
  }, 0);

  return _calculated;
};

export default function PoolTracker(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const { _assetsBTS, _assetsTEST } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (!_chain || (!_assetsBTS && !_assetsTEST)) {
      return [];
    }

    if (_chain !== "bitshares") {
      return _assetsTEST;
    }

    return _assetsBTS;
  }, [_assetsBTS, _assetsTEST, _chain]);

  if (_chain !== "bitshares") {
    return (
      <div className="flex justify-center">
        <Card className="w-1/4">
          <CardHeader>
            <CardTitle>⚠️ Error 404</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // main assets
  const assetBTS = useMemo(() => {
    return assets.find((x) => x.id === "1.3.0");
  }, [assets]); // 1.3.0

  const assetHonestMoney = useMemo(() => {
    return assets.find((x) => x.id === "1.3.6301");
  }, [assets]); // 1.3.6301

  const assetHonestUSD = useMemo(() => {
    return assets.find((x) => x.id === "1.3.5649");
  }, [assets]); // 1.3.5649

  const assetHonestBTC = useMemo(() => {
    return assets.find((x) => x.id === "1.3.5650");
  }, [assets]); // 1.3.5650

  const assetHonestXAU = useMemo(() => {
    return assets.find((x) => x.id === "1.3.5651");
  }, [assets]); // 1.3.5651

  // pool share assets
  const assetHonestBTSMoney = useMemo(() => {
    return assets.find((x) => x.id === "1.3.6430");
  }, [assets]); // 1.3.6430

  const assetHonestM2USD = useMemo(() => {
    return assets.find((x) => x.id === "1.3.6359");
  }, [assets]); // 1.3.6359

  const assetHonestUSDBTSMM = useMemo(() => {
    return assets.find((x) => x.id === "1.3.5901");
  }, [assets]); // 1.3.5901

  const assetHonestBTCBTSMM = useMemo(() => {
    return assets.find((x) => x.id === "1.3.5939");
  }, [assets]); // 1.3.5939

  const assetHonestBTCUSDMM = useMemo(() => {
    return assets.find((x) => x.id === "1.3.5938");
  }, [assets]); // 1.3.5938

  const assetHonestBTC2Money = useMemo(() => {
    return assets.find((x) => x.id === "1.3.6342");
  }, [assets]); // 1.3.6342

  const assetHonestM2XAU = useMemo(() => {
    return assets.find((x) => x.id === "1.3.6364");
  }, [assets]); // 1.3.6364

  const assetHonestXAU2USD = useMemo(() => {
    return assets.find((x) => x.id === "1.3.6610");
  }, [assets]); // 1.3.6610

  const assetHonestXAU2BTS = useMemo(() => {
    return assets.find((x) => x.id === "1.3.6608");
  }, [assets]); // 1.3.6608

  const assetHonestXAU2BTC = useMemo(() => {
    return assets.find((x) => x.id === "1.3.6609");
  }, [assets]); // 1.3.6609

  // liquidity pool data
  const [liquidityPools, setLiquidityPools] = useState();

  // dynamic data 
  const [dynamicData, setDynamicData] = useState();

  // smartcoin data
  const [smartcoinHonestUSD, setSmartcoinHonestUSD] = useState(); // 2.4.294
  const [smartcoinHonestBTC, setSmartcoinHonestBTC] = useState(); // 2.4.295
  const [smartcoinHonestXAU, setSmartcoinHonestXAU] = useState(); // 2.4.296

  useEffect(() => {
    if (assets && assets.length) {
      const objStore = createObjectStore([
        _chain,
        JSON.stringify([
          // pool data
          "1.19.43",
          "1.19.65",
          "1.19.66",
          "1.19.305",
          "1.19.320",
          "1.19.325",
          "1.19.330",
          "1.19.523",
          "1.19.524",
          "1.19.525",
          // dynamic data (main assets)
          "2.3.0",
          "2.3.6301",
          "2.3.5649",
          "2.3.5650",
          "2.3.5651",
          // dynamic data (pool share assets)
          "2.3.6430",
          "2.3.6359",
          "2.3.5901",
          "2.3.5939",
          "2.3.5938",
          "2.3.6342",
          "2.3.6364",
          "2.3.6610",
          "2.3.6608",
          "2.3.6609",
          // smartcoin data
          "2.4.294",
          "2.4.295",
          "2.4.296"
        ]),
        currentNode ? currentNode.url : null,
      ]);
      objStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          // pool data
          setLiquidityPools({
            lp43: data[0],
            lp65: data[1],
            lp66: data[2],
            lp305: data[3],
            lp320: data[4],
            lp325: data[5],
            lp330: data[6],
            lp523: data[7],
            lp524: data[8],
            lp525: data[9]
          });
          setDynamicData({
            // dynamic data (main assets)
            BTS: data[10],
            HonestMoney: data[11],
            HonestUSD: data[12],
            HonestBTC: data[13],
            HonestXAU: data[14],
            // dynamic data (pool share assets)
            HonestBTSMoney: data[15],
            HonestM2USD: data[16],
            HonestUSDBTSMM: data[17],
            HonestBTCBTSMM: data[18],
            HonestBTCUSDMM: data[19],
            HonestBTC2Money: data[20],
            HonestM2XAU: data[21],
            HonestXAU2USD: data[22],
            HonestXAU2BTS: data[23],
            HonestXAU2BTC: data[24]
          });
          // smartcoin data
          setSmartcoinHonestUSD(data[25]);
          setSmartcoinHonestBTC(data[26]);
          setSmartcoinHonestXAU(data[27]);
        }
      });
    }
  }, [assets]);

  const honestUSDPrice = useMemo(() => calculateSmartcoinPrice( // honest settlement price in bts
    smartcoinHonestUSD, // smartcoin
    null,               // usd price
    5,                  // quote precision
    4,                  // base precision
  ), [smartcoinHonestUSD]);

  const btsPrice = useMemo(() => {
    if (!honestUSDPrice) {
      return;
    }

    return (1 / honestUSDPrice).toFixed(4);
  }, [honestUSDPrice]);

  const honestBTCSettlementPrice = useMemo(() => {
    if (!smartcoinHonestBTC) {
      return 0.0;
    }
    return calculateSmartcoinPrice(
      smartcoinHonestBTC, // smartcoin
      null,
      5,                  // quote precision
      8,                  // base precision
    );
  }, [smartcoinHonestBTC]);

  const honestBTCPrice = useMemo(() => calculateSmartcoinPrice( // btc price in usd
    smartcoinHonestBTC, // smartcoin
    honestUSDPrice,     // usd price
    5,                  // quote precision
    8,                  // base precision
  ), [smartcoinHonestBTC, honestUSDPrice]);

  const honestXAUSettlementPrice = useMemo(() => {
    if (!smartcoinHonestXAU) {
      return 0.0;
    }
    return calculateSmartcoinPrice(
      smartcoinHonestXAU, // smartcoin
      null,
      5,                  // quote precision
      8,                  // base precision
    );
  }, [smartcoinHonestXAU]);

  const honestXAUPrice = useMemo(() => calculateSmartcoinPrice( // xau price in usd
    smartcoinHonestXAU, // smartcoin
    honestUSDPrice,     // usd price
    5,                  // quote precision
    8,                  // base precision
  ), [smartcoinHonestXAU, honestUSDPrice]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && assets && assets.length && currentNode) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode.url
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = data.filter((balance) =>
            assets.find((x) => x.id === balance.asset_id)
          );
          setUsrBalances(filteredData);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assets]);

  const balances = useMemo(() => {
    if (!usrBalances || !usrBalances.length) {
      return null;
    }
    const _ids = [
      "1.3.0",
      "1.3.5649",
      "1.3.5650",
      "1.3.5651",
      "1.3.5901",
      "1.3.5938",
      "1.3.5939",
      "1.3.6301",
      "1.3.6342",
      "1.3.6359",
      "1.3.6364",
      "1.3.6430",
      "1.3.6608",
      "1.3.6609",
      "1.3.6610",
    ];

    let _result = {};
    _ids.forEach((id) => {
      const balance = usrBalances.find((x) => x.asset_id === id);
      if (balance) {
        const key = `balance${id.replace("1.3.", "")}`;
        _result[key] = balance;
      }
    });

    return _result;
  }, [usrBalances]);

  const [honestMoneyPrice, setHonestMoneyPrice] = useState();
  useEffect(() => {
    let unsubscribeStore;
    if (usr && usr.id && currentNode) {
      const tickerStore = createTickerStore([
        usr.chain,
        "HONEST.MONEY",
        "BTS",
        currentNode.url
      ]);

      unsubscribeStore = tickerStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setHonestMoneyPrice(data);
        }
      });
    }

    return () => {
      if (unsubscribeStore) unsubscribeStore();
    };
  }, [usr, currentNode]);

  const [lpTradingVolumes, setLPTradingVolumes] = useState();
  useEffect(() => {
    let unsubscribeStore;

    if (usr && usr.id && currentNode) {
      const lpVolumeStore = createEveryLiquidityPoolStore([
        usr.chain,
        currentNode.url
      ]);

      unsubscribeStore = lpVolumeStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = data.filter((x) => [
            "1.19.43",
            "1.19.65",
            "1.19.66",
            "1.19.305",
            "1.19.320",
            "1.19.325",
            "1.19.330",
            "1.19.523",
            "1.19.524",
            "1.19.525"
          ].includes(x.id));
          setLPTradingVolumes(filteredData);
        }
      }
      );
    }

    return () => {
      if (unsubscribeStore) unsubscribeStore();
    }
  }, [usr, currentNode]);

  const ownerships = useMemo(() => {
    if (!dynamicData) {
      return null;
    }
    
    const calculateOwnership = (supply, balance) => {
      return supply && balance && balance.amount ? parseInt(balance.amount) / supply : 0;
    };
  
    return {
      ownership0: calculateOwnership(
        parseInt(dynamicData.BTS.current_supply),
        balances?.balance0 ?? null
      ),
      ownership5649: calculateOwnership(
        parseInt(dynamicData.HonestUSD.current_supply),
        balances?.balance5649 ?? null
      ),
      ownership5650: calculateOwnership(
        parseInt(dynamicData.HonestBTC.current_supply),
        balances?.balance5650 ?? null
      ),
      ownership5651: calculateOwnership(
        parseInt(dynamicData.HonestXAU.current_supply),
        balances?.balance5651 ?? null
      ),
      ownership5901: calculateOwnership(
        parseInt(dynamicData.HonestUSDBTSMM.current_supply),
        balances?.balance5901 ?? null
      ),
      ownership5938: calculateOwnership(
        parseInt(dynamicData.HonestBTCUSDMM.current_supply),
        balances?.balance5938 ?? null
      ),
      ownership5939: calculateOwnership(
        parseInt(dynamicData.HonestBTCBTSMM.current_supply),
        balances?.balance5939 ?? null
      ),
      ownership6301: calculateOwnership(
        parseInt(dynamicData.HonestMoney.current_supply),
        balances?.balance6301 ?? null
      ),
      ownership6430: calculateOwnership(
        parseInt(dynamicData.HonestBTSMoney.current_supply),
        balances?.balance6430 ?? null
      ),
      ownership6342: calculateOwnership(
        parseInt(dynamicData.HonestBTC2Money.current_supply),
        balances?.balance6342 ?? null
      ),
      ownership6359: calculateOwnership(
        parseInt(dynamicData.HonestM2USD.current_supply),
        balances?.balance6359 ?? null
      ),
      ownership6364: calculateOwnership(
        parseInt(dynamicData.HonestM2XAU.current_supply),
        balances?.balance6364 ?? null
      ),
      ownership6608: calculateOwnership(
        parseInt(dynamicData.HonestXAU2BTS.current_supply),
        balances?.balance6608 ?? null
      ),
      ownership6609: calculateOwnership(
        parseInt(dynamicData.HonestXAU2BTC.current_supply),
        balances?.balance6609 ?? null
      ),
      ownership6610: calculateOwnership(
        parseInt(dynamicData.HonestXAU2USD.current_supply),
        balances?.balance6610 ?? null
      ),
    };
  }, [dynamicData, balances]);

  const stakedBTS = useMemo(() => {
    if (!liquidityPools) {
      return 0;
    };

    return humanReadableFloat(
      calculateStaked(
        [liquidityPools.lp43, liquidityPools.lp66, liquidityPools.lp305, liquidityPools.lp523],
        ownerships,
        "1.3.0"
      ),
      5
    );
  }, [liquidityPools, ownerships]);
  
  const stakedHonestUSD = useMemo(() => {
    if (!liquidityPools) {
      return 0;
    };

    return humanReadableFloat(
      calculateStaked(
        [liquidityPools.lp43, liquidityPools.lp65, liquidityPools.lp320, liquidityPools.lp525],
        ownerships,
        "1.3.5649"
      ),
      4
    );
  }, [liquidityPools, ownerships]);
  
  const stakedHonestBTC = useMemo(() => {
    if (!liquidityPools) {
      return 0;
    };

    return humanReadableFloat(
      calculateStaked(
        [liquidityPools.lp65, liquidityPools.lp66, liquidityPools.lp330, liquidityPools.lp524],
        ownerships,
        "1.3.5650"
      ),
      8
    );
  }, [liquidityPools, ownerships]);
  
  const stakedHonestXAU = useMemo(() => {
    if (!liquidityPools) {
      return 0;
    };

    return humanReadableFloat(
      calculateStaked(
        [liquidityPools.lp325, liquidityPools.lp523, liquidityPools.lp524, liquidityPools.lp525],
        ownerships,
        "1.3.5651"
      ),
      8
    );
  }, [liquidityPools, ownerships]);
  
  const stakedHonestMoney = useMemo(() => {
    if (!liquidityPools) {
      return 0;
    };

    return humanReadableFloat(
      calculateStaked(
        [liquidityPools.lp305, liquidityPools.lp320, liquidityPools.lp325, liquidityPools.lp330],
        ownerships,
        "1.3.6301"
      ),
      8
    );
  }, [liquidityPools, ownerships]);

  const featuredPoolRow = ({ index, style }) => {
    if (!liquidityPools || !dynamicData) {
      return null;
    }

    let res = [
      liquidityPools.lp43,
      liquidityPools.lp65,
      liquidityPools.lp66,
      liquidityPools.lp305,
      liquidityPools.lp320,
      liquidityPools.lp325,
      liquidityPools.lp330,
      liquidityPools.lp523,
      liquidityPools.lp524,
      liquidityPools.lp525,
    ][index];

    if (!res) {
      return null;
    }

    const _psAssets = [
      assetHonestBTSMoney,
      assetHonestM2USD,
      assetHonestUSDBTSMM,
      assetHonestBTCBTSMM,
      assetHonestBTCUSDMM,
      assetHonestBTC2Money,
      assetHonestM2XAU,
      assetHonestXAU2USD,
      assetHonestXAU2BTS,
      assetHonestXAU2BTC
    ];

    const _currentPSA = _psAssets.find((x) => x.id === res.share_asset); // pool share asset

    const _psAssetDD = [
      dynamicData.HonestBTSMoney,
      dynamicData.HonestM2USD,
      dynamicData.HonestUSDBTSMM,
      dynamicData.HonestBTCBTSMM,
      dynamicData.HonestBTCUSDMM,
      dynamicData.HonestBTC2Money,
      dynamicData.HonestM2XAU,
      dynamicData.HonestXAU2USD,
      dynamicData.HonestXAU2BTS,
      dynamicData.HonestXAU2BTC
    ];
    
    const _psaDD = _psAssetDD.find((x) => x.id === res.share_asset.replace("1.3.", "2.3."));

    const _psaBalance = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === res.share_asset) : null;

    const poolAssets = [
      assetBTS,
      assetHonestMoney,
      assetHonestUSD,
      assetHonestBTC,
      assetHonestXAU
    ];

    const _poolAssetA = poolAssets.find((x) => x.id === res.asset_a); // swappable asset a
    const _poolAssetB = poolAssets.find((x) => x.id === res.asset_b); // swappable asset b

    /*
    const swappableAssetDD = [
      dynamicData.BTS,
      dynamicData.HonestMoney,
      dynamicData.HonestUSD,
      dynamicData.HonestBTC,
      dynamicData.HonestXAU,
    ];

    const _assetADD = swappableAssetDD.find((x) => x.id === _poolAssetA.asset_id);
    const _assetBDD = swappableAssetDD.find((x) => x.id === _poolAssetB.asset_id);
    */

    const _amountA = humanReadableFloat(res.balance_a, _poolAssetA.precision);
    const _amountB = humanReadableFloat(res.balance_b, _poolAssetB.precision);

    const foundTradingVolume = lpTradingVolumes && lpTradingVolumes.length
      ? lpTradingVolumes.find((x) => x.id === res.id)
      : null;

    const _24hVolumeA = foundTradingVolume
      ? humanReadableFloat(
          parseInt(foundTradingVolume.statistics._24h_exchange_a2b_amount_a) + parseInt(foundTradingVolume.statistics._24h_exchange_b2a_amount_a),
          _poolAssetA.precision
        )
      : "0.00";

    const _24hVolumeB = foundTradingVolume
      ? humanReadableFloat(
          parseInt(foundTradingVolume.statistics._24h_exchange_a2b_amount_b) + parseInt(foundTradingVolume.statistics._24h_exchange_b2a_amount_b),
          _poolAssetB.precision
        )
      : "0.00";

    const _24hFeeA = foundTradingVolume
      ? humanReadableFloat(
          parseInt(foundTradingVolume.statistics._24h_exchange_fee_a) + parseInt(foundTradingVolume.statistics._24h_withdrawal_fee_a),
          _poolAssetA.precision
        )
      : "0.00";
    
    const _24hFeeB = foundTradingVolume
      ? humanReadableFloat(
          parseInt(foundTradingVolume.statistics._24h_exchange_fee_b) + parseInt(foundTradingVolume.statistics._24h_withdrawal_fee_b),
          _poolAssetB.precision
        )
      : "0.00";

    const poolOwnershipPercentage = _psaBalance && _psaBalance.amount
      ? _psaBalance.amount / _psaDD.current_supply
      : 0;

    return (
      <div style={{ ...style }} key={`poolRow-${res.id}`} className="grid grid-cols-12 text-xs border border-gray-300">
        <div className="grid grid-cols-1">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="hover:text-purple-500 text-md ml-1 mr-1 mt-1 mb-1">🏦 {res.id}</Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>🏦 {t("PoolTracker:pool")} {res.id}</DialogTitle>
                <DialogDescription></DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <a href={`/swap/index.html?pool=${res.id}`}>
                    <Button variant="outline" className="w-full">
                      {t("PoolTracker:simpleSwap")}
                    </Button>
                  </a>
                  <a href={`/pool/index.html?pool=${res.id}`}>
                    <Button variant="outline" className="w-full">
                      {t("PoolTracker:normalSwap")}
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
              <Button variant="outline" className="hover:text-purple-500 text-md ml-1 mr-1">🪙 {_currentPSA.id}</Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>🪙 {t("PoolTracker:psa")} {_currentPSA.id}</DialogTitle>
                <DialogDescription></DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <a href={`/dex/index.html?market=${res.share_asset}_BTS`}>
                    <Button variant="outline" className="w-full">
                      {t("PoolTracker:buy")}
                    </Button>
                  </a>
                  <a href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${_currentPSA.symbol ?? ""}`}>
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
              <Button variant="outline" className="hover:text-purple-500 text-md m-1">{_poolAssetA.symbol}</Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>A: {_poolAssetA.symbol} {_poolAssetA.id}</DialogTitle>
                <DialogDescription></DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <a href={`/dex/index.html?market=${_poolAssetA.symbol}_${_poolAssetA.symbol === "BTS" ? "HONEST.USD" : "BTS"}`}>
                    <Button variant="outline" className="w-full">
                      {t("PoolTracker:buyAsset", { asset: _poolAssetA.symbol })}
                    </Button>
                  </a>
                  <a href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${_poolAssetA.symbol}`}>
                    <Button variant="outline" className="w-full">
                      {t("PoolTracker:borrowAsset", { asset: _poolAssetA.symbol })}
                    </Button>
                  </a>
                  {
                    ["HONEST.USD", "HONEST.BTC", "HONEST.XAU"].includes(_poolAssetA.symbol)
                    ? <a href={`/smartcoin/index.html?id=${_poolAssetA.id}`}>
                        <Button variant="outline" className="w-full">
                          {t("PoolTracker:createDebt")}
                        </Button>
                      </a>
                    : null
                  }
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="hover:text-purple-500 text-md m-1">{_poolAssetB.symbol}</Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>B: {_poolAssetB.symbol} {_poolAssetB.id}</DialogTitle>
                <DialogDescription></DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <a href={`/dex/index.html?market=${_poolAssetB.symbol}_${_poolAssetB.symbol === "BTS" ? "HONEST.USD" : "BTS"}`}>
                    <Button variant="outline" className="w-full">
                      {t("PoolTracker:buyAsset", { asset: _poolAssetB.symbol })}
                    </Button>
                  </a>
                  <a href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${_poolAssetB.symbol}`}>
                    <Button variant="outline" className="w-full">
                      {t("PoolTracker:borrowAsset", { asset: _poolAssetB.symbol })}
                    </Button>
                  </a>
                  {
                    ["HONEST.USD", "HONEST.BTC", "HONEST.XAU"].includes(_poolAssetB.symbol)
                    ? <a href={`/smartcoin/index.html?id=${_poolAssetB.id}`}>
                        <Button variant="outline" className="w-full">
                          {t("PoolTracker:createDebt")}
                        </Button>
                      </a>
                    : null
                  }
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="ml-1 text-center">
          {
            res.id === "1.19.43"
            ? <span className="grid grid-cols-1">
                <span className="m-4">
                  ${btsPrice ?? 0}
                </span>
                <span className="m-4">
                  $1.00
                </span>
              </span>
            : null
          }
          {
            res.id === "1.19.65"
            ? <span className="grid grid-cols-1">
                <span className="m-4">
                  $1.00
                </span>
                <span className="m-4">
                  ${honestBTCPrice ?? 0}
                </span>
              </span>
            : null
          }
          {
            res.id === "1.19.66"
            ? <span className="grid grid-cols-1">
                <span className="m-4">
                  ${btsPrice ?? 0}
                </span>
                <span className="m-4">
                  ${honestBTCPrice ?? 0}
                </span>
              </span>
            : null
          }
          {
            res.id === "1.19.305"
            ? <span className="grid grid-cols-1">
                <span className="m-4">
                  ${btsPrice ?? 0}
                </span>
                <span className="m-4">
                  ${
                    honestMoneyPrice && honestMoneyPrice.latest && btsPrice
                      ? (honestMoneyPrice.latest * btsPrice).toFixed(4)
                      : 0
                  }
                </span>
              </span>
            : null
          }
          {
            res.id === "1.19.320"
            ? <span className="grid grid-cols-1">
                <span className="m-4">
                  $1.00
                </span>
                <span className="m-4">
                  ${
                    honestMoneyPrice && honestMoneyPrice.latest && btsPrice
                      ? (honestMoneyPrice.latest * btsPrice).toFixed(4)
                      : 0
                  }
                </span>
              </span>
            : null
          }
          {
            res.id === "1.19.325"
            ? <span className="grid grid-cols-1">
                <span className="m-4">
                  ${honestXAUPrice}
                </span>
                <span className="m-4">
                  ${
                    honestMoneyPrice && honestMoneyPrice.latest && btsPrice
                      ? (honestMoneyPrice.latest * btsPrice).toFixed(4)
                      : 0
                  }
                </span>
              </span>
            : null
          }
          {
            res.id === "1.19.330"
            ? <span className="grid grid-cols-1">
                <span className="m-4">
                  ${honestBTCPrice ?? 0}
                </span>
                <span className="m-4">
                  ${
                    honestMoneyPrice && honestMoneyPrice.latest && btsPrice
                      ? (honestMoneyPrice.latest * btsPrice).toFixed(4)
                      : 0
                  }
                </span>
              </span>
            : null
          }
          {
            res.id === "1.19.523"
            ? <span className="grid grid-cols-1">
                <span className="m-4">
                  ${btsPrice ?? 0}
                </span>
                <span>
                  ${honestXAUPrice}
                </span>
              </span>
            : null
          }
          {
            res.id === "1.19.524"
            ? <span className="grid grid-cols-1">
                <span className="m-4">
                  ${honestBTCPrice ?? 0}
                </span>
                <span className="m-4">
                  ${honestXAUPrice}
                </span>
              </span>
            : null
          }
          {
            res.id === "1.19.525"
            ? <span className="grid grid-cols-1">
                <span className="m-4">
                  ${honestUSDPrice ?? 0}
                </span>
                <span className="m-4">
                  ${honestXAUPrice}
                </span>
            </span>
            : null
          }
        </div>
        <div className="ml-1 border-l border-gray-300 flex items-center justify-center">
          {humanReadableFloat(_psaDD.current_supply, _currentPSA.precision)}
        </div>
        <div className="ml-1 border-l border-gray-300 flex items-center justify-center">
          {
            _psaBalance && _psaBalance.amount
              ? <>
                  {humanReadableFloat(_psaBalance.amount, _currentPSA.precision)}<br/>
                  {(poolOwnershipPercentage * 100).toFixed(2)}%
                </>
              : <>0<br/>0%</>
          }
        </div>
        <div className="ml-2 border-l border-gray-300 flex items-center justify-center">
          {
            _poolAssetA.id === "1.3.0"
              ? <>
                🌐 {_amountA}<br/>
                📊 {(_amountA * poolOwnershipPercentage).toFixed(5)}
              </>
              : null
          }
          {
            _poolAssetB.id === "1.3.0"
              ? <>
                🌐 {_amountB}<br/>
                📊 {(_amountB * poolOwnershipPercentage).toFixed(5)}
              </>
              : null
          }
        </div>
        <div className="ml-2 text-center flex items-center justify-center">
          {
            _poolAssetA.id === "1.3.6301"
              ? <>
              🌐 {_amountA.toFixed(5)}<br/>
              📊 {(_amountA * poolOwnershipPercentage).toFixed(5)}
            </>
              : null
          }
          {
            _poolAssetB.id === "1.3.6301"
              ? <>
                🌐 {_amountB.toFixed(5)}<br/>
                📊 {(_amountB * poolOwnershipPercentage).toFixed(5)}
              </>
              : null
          }
        </div>
        <div className="ml-2 text-center flex items-center justify-center">
          {
            _poolAssetA.id === "1.3.5649"
              ? <>
                🌐 {_amountA}<br/>
                📊 {(_amountA * poolOwnershipPercentage).toFixed(4)}
              </>
              : null
          }
          {
            _poolAssetB.id === "1.3.5649"
              ? <>
                🌐 {_amountB}<br/>
                📊 {(_amountB * poolOwnershipPercentage).toFixed(4)}
              </>
              : null
          }
        </div>
        <div className="ml-2 text-center flex items-center justify-center">
          {
            _poolAssetA.id === "1.3.5650"
              ? <>
                🌐 {_amountA}<br/>
                📊 {(_amountA * poolOwnershipPercentage).toFixed(8)}
              </>
              : null
          }
          {
            _poolAssetB.id === "1.3.5650"
              ? <>
                🌐 {_amountB}<br/>
                📊 {(_amountB * poolOwnershipPercentage).toFixed(8)}
              </>
              : null
          }
        </div>
        <div className="ml-2 text-center flex items-center justify-center">
          {
            _poolAssetA.id === "1.3.5651"
              ? <>
                🌐 {_amountA}<br/>
                📊 {(_amountA * poolOwnershipPercentage).toFixed(8)}
              </>
              : null
          }
          {
            _poolAssetB.id === "1.3.5651"
              ? <>
                🌐 {_amountB}<br/>
                📊 {(_amountB * poolOwnershipPercentage).toFixed(8)}
              </>
              : null
          }
        </div>
        <div className="ml-3 border-l border-gray-300 mt-3 ml-1">
          A: {_24hVolumeA}<br/>
          B: {_24hVolumeB}<br/>
          <Separator />
          {t("PoolTracker:fees")}:<br/>
          A: {convertToSatoshis(_24hFeeA)}<br/>
          B: {convertToSatoshis(_24hFeeB)}
        </div>
        <div className="ml-3">
          💱 {res.taker_fee_percent / 100} %<br/>
          💸 {res.withdrawal_fee_percent / 100} %<br/>
          <Separator />
          A: {
            _psaBalance && _psaBalance.amount
              ? (((_24hFeeA / _amountA) * 100) * 30).toFixed(3)
              : "0.00"
          } % ~30d<br/>
          B: {
            _psaBalance && _psaBalance.amount
              ? (((_24hFeeB / _amountB) * 100) * 30).toFixed(3)
              : "0.00"
          } % ~30d<br/>
          A: {
            _psaBalance && _psaBalance.amount
              ? (((_24hFeeA / _amountA) * 100) * 365).toFixed(3)
              : "0.00"
          } % ~1yr<br/>
          B: {
            _psaBalance && _psaBalance.amount
              ? (((_24hFeeB / _amountB) * 100) * 365).toFixed(3)
              : "0.00"
          } % ~1yr
        </div>
      </div>
    );
  };

  const [callOrdersHonestUSD, setCallOrdersHonestUSD] = useState();
  const [callOrdersHonestBTC, setCallOrdersHonestBTC] = useState();
  const [callOrdersHonestXAU, setCallOrdersHonestXAU] = useState();
  useEffect(() => {
    async function fetching() {
      const _assetStore = createAssetCallOrdersStore([
        _chain,
        JSON.stringify([
          "1.3.5649", // HONEST.USD
          "1.3.5650", // HONEST.BTC
          "1.3.5651"  // HONEST.XAU
        ]),
        currentNode.url,
      ]);

      _assetStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const _usd = data[0]["1.3.5649"];
          const _btc = data[1]["1.3.5650"];
          const _xau = data[2]["1.3.5651"];
          const foundUSD = _usd.find((x) => x.borrower === usr.id);
          const foundBTC = _btc.find((x) => x.borrower === usr.id);
          const foundXAU = _xau.find((x) => x.borrower === usr.id);
          setCallOrdersHonestUSD(foundUSD);
          setCallOrdersHonestBTC(foundBTC);
          setCallOrdersHonestXAU(foundXAU);
        }
      });
    }

    if (currentNode && usr && usr.id) {
      fetching();
    }
  }, [currentNode, usr]);

  const totalHonestMoney = useMemo(() => {
    let _total = 0;
    if (stakedHonestMoney) {
      _total += stakedHonestMoney;
    }
    if (balances && balances.balance6301) {
      _total += humanReadableFloat(balances.balance6301.amount, 8);
    }

    return _total;
  }, [stakedHonestMoney, balances]);

  const totalHonestUSD = useMemo(() => {
    let _total = 0;
    if (stakedHonestUSD) {
      _total += stakedHonestUSD;
    }
    if (balances && balances.balance5649) {
      _total += humanReadableFloat(balances.balance5649.amount, 4);
    }

    return _total;
  }, [stakedHonestUSD, balances]);

  const totalHonestBTC = useMemo(() => {
    let _total = 0;
    if (stakedHonestBTC) {
      _total += stakedHonestBTC;
    }
    if (balances && balances.balance5650) {
      _total += humanReadableFloat(balances.balance5650.amount, 8);
    }

    return _total;
  }, [stakedHonestBTC, balances]);

  const totalHonestXAU = useMemo(() => {
    let _total = 0;
    if (stakedHonestXAU) {
      _total += stakedHonestXAU;
    }
    if (balances && balances.balance5651) {
      _total += humanReadableFloat(balances.balance5651.amount, 8);
    }

    return _total;
  }, [stakedHonestXAU, balances]);  

  const btsTotalCollateral = useMemo(() => {
    return humanReadableFloat(
      callOrdersHonestUSD
        ? callOrdersHonestUSD.collateral
        : 0,
      5
    ) +
    humanReadableFloat(
      callOrdersHonestBTC
        ? callOrdersHonestBTC.collateral
        : 0,
      5
    ) +
    humanReadableFloat(
      callOrdersHonestXAU
        ? callOrdersHonestXAU.collateral
        : 0,
      5
    )
  }, [callOrdersHonestUSD, callOrdersHonestBTC, callOrdersHonestXAU]);

  const totalBTS = useMemo(() => {
    let _total = 0;
    if (stakedBTS) {
      _total += stakedBTS;
    }
    if (usrBalances && usrBalances.length) {
      _total += humanReadableFloat(balances.balance0.amount, 5);
    }
    if (btsTotalCollateral) {
      _total += btsTotalCollateral;
    }
    return _total.toFixed(5);
  }, [stakedBTS, usrBalances, btsTotalCollateral]);

  const finalUSD = useMemo(() => {
    let _total = 0;

    if (totalBTS && btsPrice) {
      _total += totalBTS * btsPrice;
    }
    if (totalHonestMoney && honestMoneyPrice && honestMoneyPrice.latest && btsPrice) {
      _total += totalHonestMoney * honestMoneyPrice.latest * btsPrice;
    }
    if (totalHonestUSD) {
      _total += totalHonestUSD;
    }
    if (totalHonestBTC && honestBTCPrice) {
      _total += totalHonestBTC * honestBTCPrice;
    }
    if (totalHonestXAU && honestXAUPrice) {
      _total += totalHonestXAU * honestXAUPrice;
    }

    return _total.toFixed(4);
  }, [
    totalBTS,
    btsPrice,
    totalHonestMoney,
    honestMoneyPrice,
    totalHonestUSD,
    totalHonestBTC,
    honestBTCPrice,
    totalHonestXAU,
    honestXAUPrice
  ]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card className="p-2">
            <CardHeader>
              <CardTitle>{t("PoolTracker:title")}</CardTitle>
              <CardDescription>{t("PoolTracker:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 text-xs">
                <div className="text-center">{t("PoolTracker:pool")}</div>
                <div className="text-center">{t("PoolTracker:assetPair")}</div>
                <div className="text-center">{t("PoolTracker:value")}</div>
                <div className="text-center">{t("PoolTracker:poolTotal")}</div>
                <div className="text-center">{t("PoolTracker:balance")}</div>
                <div className="text-center">BTS</div>
                <div className="text-center">Honest.MONEY</div>
                <div className="text-center">Honest.USD</div>
                <div className="text-center">Honest.BTC</div>
                <div className="text-center">Honest.XAU</div>
                <div>{t("PoolTracker:24hVolume")}</div>
                <div>{t("PoolTracker:fees")}</div>
              </div>
              {
                smartcoinHonestUSD && smartcoinHonestBTC && smartcoinHonestXAU
                  ? <List
                      height={500}
                      itemCount={10}
                      itemSize={110}
                      className="w-full"
                    >
                      {featuredPoolRow}
                    </List>
                  : null
              }
              <div className="grid grid-cols-12 text-xs">
                <div className="col-span-4"></div>
                <div className="col-span-6 text-center border border-gray-300">
                  <div className="grid grid-cols-6">
                    <div></div>
                    <div>
                      <b>{t("PoolTracker:inPool")}</b><br/>
                      {stakedBTS}<br/>
                      ${(stakedBTS * btsPrice).toFixed(4)}
                    </div>
                    <div>
                      <b>{t("PoolTracker:inPool")}</b><br/>
                      {stakedHonestMoney}<br/>
                      ${
                        honestMoneyPrice && honestMoneyPrice.latest
                          ? (stakedHonestMoney * honestMoneyPrice.latest * btsPrice).toFixed(4)
                          : 0
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:inPool")}</b>
                      <br/>
                      <br/>
                      ${stakedHonestUSD}
                    </div>
                    <div>
                      <b>{t("PoolTracker:inPool")}</b><br/>
                      {stakedHonestBTC}<br/>
                      ${
                        honestBTCPrice
                          ? (stakedHonestBTC * honestBTCPrice).toFixed(4)
                          : 0
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:inPool")}</b><br/>
                      {stakedHonestXAU}<br/>
                      ${
                        honestXAUPrice
                          ? (stakedHonestXAU * honestXAUPrice).toFixed(4)
                          : 0
                      }
                    </div>
                  </div>
                  <div className="grid grid-cols-6 mt-2">
                    <div></div>
                    <div>
                      <b>{t("PoolTracker:liquid")}</b><br/>
                      {
                        balances && balances.balance0
                          ? humanReadableFloat(balances.balance0.amount, 5)
                          : 0
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:liquid")}</b><br/>
                      {
                        balances && balances.balance6301
                          ? humanReadableFloat(balances.balance6301.amount, 8)
                          : 0
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:liquid")}</b><br/>
                      {
                        balances && balances.balance5649
                          ? humanReadableFloat(balances.balance5649.amount, 4)
                          : 0
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:liquid")}</b><br/>
                      {
                        balances && balances.balance5650
                          ? humanReadableFloat(balances.balance5650.amount, 8)
                          : 0
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:liquid")}</b><br/>
                      {
                        balances && balances.balance5651
                          ? humanReadableFloat(balances.balance5651.amount, 8)
                          : 0
                      }
                    </div>
                  </div>
                  <div className="grid grid-cols-6 mt-3">
                    <div></div>
                    <div className="col-span-2"></div>
                    <div>
                      <b>{t("PoolTracker:debt")}</b><br/>
                      {
                        callOrdersHonestUSD
                          ? humanReadableFloat(callOrdersHonestUSD.debt, 4)
                          : null
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:debt")}</b><br/>
                      {
                        callOrdersHonestBTC
                          ? humanReadableFloat(callOrdersHonestBTC.debt, 8)
                          : null
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:debt")}</b><br/>
                      {
                        callOrdersHonestXAU
                          ? humanReadableFloat(callOrdersHonestXAU.debt, 8)
                          : null
                      }
                    </div>
                  </div>
                  <div className="grid grid-cols-6 mt-2">
                    <div></div>
                    <div>
                      <b>{t("PoolTracker:totalCollateral")}</b><br/>
                      <b>{btsTotalCollateral}</b><br/>BTS (1.3.0)
                    </div>
                    <div></div>
                    <div>
                      <b>{t("PoolTracker:totalCollateral")}</b><br/>
                      {
                        callOrdersHonestUSD
                          ? humanReadableFloat(callOrdersHonestUSD.collateral, 5)
                          : null
                      }<br/>
                      {
                        callOrdersHonestUSD && honestUSDPrice && callOrdersHonestUSD.collateral && callOrdersHonestUSD.debt
                          ? (humanReadableFloat(callOrdersHonestUSD.collateral, 5) / (humanReadableFloat(callOrdersHonestUSD.debt, 4) * honestUSDPrice)).toFixed(3)
                          : null
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:totalCollateral")}</b><br/>
                      {
                        callOrdersHonestBTC
                          ? humanReadableFloat(callOrdersHonestBTC.collateral, 5)
                          : null
                      }<br/>
                      {
                        callOrdersHonestBTC && honestBTCPrice && callOrdersHonestBTC.collateral && callOrdersHonestBTC.debt
                          ? (humanReadableFloat(callOrdersHonestBTC.collateral, 5) / (humanReadableFloat(callOrdersHonestBTC.debt, 8) * honestBTCSettlementPrice)).toFixed(3)
                          : null
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:totalCollateral")}</b><br/>
                      {
                        callOrdersHonestXAU
                          ? humanReadableFloat(callOrdersHonestXAU.collateral, 5)
                          : null
                      }<br/>
                      {
                        callOrdersHonestXAU && honestXAUPrice
                          ? (humanReadableFloat(callOrdersHonestXAU.collateral, 5) / (humanReadableFloat(callOrdersHonestXAU.debt, 8) * honestXAUSettlementPrice)).toFixed(3)
                          : null
                      }
                    </div>
                  </div>
                  <div className="grid grid-cols-6 mt-3">
                    <div className="mt-4">
                      {t("PoolTracker:total")}<br/>
                      {t("PoolTracker:circulating")}<br/>
                      {t("PoolTracker:supplyPercent")}
                    </div>
                    <div>
                      <b>{t("PoolTracker:total")}</b><br/>
                      <b>{totalBTS}</b>
                      <br/>
                      {
                        dynamicData
                          ? humanReadableFloat(dynamicData.BTS.current_supply, 5)
                          : null
                      }<br/>
                      <b>
                        {
                          dynamicData
                            ? ((totalBTS / humanReadableFloat(dynamicData.BTS.current_supply, 5)) * 100).toFixed(3)
                            : null
                        }
                      </b>%
                    </div>
                    <div>
                      <b>{t("PoolTracker:total")}</b><br/>
                      <b>{totalHonestMoney}</b><br/>
                      {
                        dynamicData
                          ? humanReadableFloat(dynamicData.HonestMoney.current_supply, 8)
                          : null
                      }<br/>
                      <b>
                        {
                          dynamicData
                            ? ((totalHonestMoney / humanReadableFloat(dynamicData.HonestMoney.current_supply, 8)) * 100).toFixed(3)
                            : null
                        }
                      </b>%
                    </div>
                    <div>
                      <b>{t("PoolTracker:total")}</b><br/>
                      <b>{totalHonestUSD}</b><br/>
                      {
                        dynamicData
                          ? humanReadableFloat(dynamicData.HonestUSD.current_supply, 4)
                          : null
                      }<br/>
                      <b>
                        {
                          dynamicData
                            ? ((totalHonestUSD / humanReadableFloat(dynamicData.HonestUSD.current_supply, 4)) * 100).toFixed(3)
                            : null
                        }
                      </b>%
                    </div>
                    <div>
                      <b>{t("PoolTracker:total")}</b><br/>
                      <b>{totalHonestBTC}</b><br/>
                      {
                        dynamicData
                          ? humanReadableFloat(dynamicData.HonestBTC.current_supply, 8)
                          : null
                      }<br/>
                      <b>
                        {
                          dynamicData
                            ? ((totalHonestBTC / humanReadableFloat(dynamicData.HonestBTC.current_supply, 8)) * 100).toFixed(3)
                            : null
                        }
                      </b>%
                    </div>
                    <div>
                      <b>{t("PoolTracker:total")}</b><br/>
                      <b>{totalHonestXAU}</b><br/>
                      {
                        dynamicData
                          ? humanReadableFloat(dynamicData.HonestXAU.current_supply, 8)
                          : null
                      }<br/>
                      <b>
                        {
                          dynamicData
                            ? ((totalHonestXAU / humanReadableFloat(dynamicData.HonestXAU.current_supply, 8)) * 100).toFixed(3)
                            : null
                        }
                      </b>%
                    </div>
                  </div>
                  <div className="grid grid-cols-6">
                    <div>
                      <span className="text-right"><b>USD</b></span><br/>
                    </div>
                    <div>
                      <b>
                        ${(totalBTS * btsPrice).toFixed(4)}
                      </b>
                    </div>
                    <div>
                      <b>
                        ${
                          honestMoneyPrice && honestMoneyPrice.latest && btsPrice
                            ? (totalHonestMoney * honestMoneyPrice.latest * btsPrice).toFixed(4)
                            : 0
                        }
                      </b>
                    </div>
                    <div>
                      <b>
                        ${(totalHonestUSD).toFixed(4)}
                      </b>
                    </div>
                    <div>
                      <b>
                        ${(totalHonestBTC * honestBTCPrice).toFixed(4)}
                      </b>
                    </div>
                    <div>
                      <b>
                        ${(totalHonestXAU * honestXAUPrice).toFixed(4)}
                      </b>
                    </div>
                  </div>
                  <div className="grid grid-cols-6">
                    <div>
                      <span className="text-right"><b>{t("PoolTracker:total")}</b></span>
                    </div>
                    <div className="col-span-1">
                      ${finalUSD}
                    </div>
                    <div className="col-span-4"></div>
                  </div>
                </div>
                <div className="col-span-2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </>
  );
}
