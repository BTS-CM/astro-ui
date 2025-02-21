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

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator"

import { humanReadableFloat } from "@/lib/common";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createObjectStore } from "@/nanoeffects/Objects.js";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { 
  createLPTradingVolumeStore,
  createEveryLiquidityPoolStore
} from "@/nanoeffects/LiquidityPools.js";

import ExternalLink from "./common/ExternalLink.jsx";

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
  /*
    {
      "id": "1.19.305",
      "asset_a": "1.3.0",
      "asset_b": "1.3.6301",
      "balance_a": "58864933032",
      "balance_b": "83365238124924",
      "share_asset": "1.3.6430",
      "taker_fee_percent": 30,
      "withdrawal_fee_percent": 0,
      "virtual_value": "4907289159420384510089568"
    }
  */
  const [lp43, setLp43] = useState(); // 1.19.43
  const [lp65, setLp65] = useState(); // 1.19.65
  const [lp66, setLp66] = useState(); // 1.19.66
  const [lp305, setLp305] = useState(); // 1.19.305
  const [lp320, setLp320] = useState(); // 1.19.320
  const [lp325, setLp325] = useState(); // 1.19.325
  const [lp330, setLp330] = useState(); // 1.19.330
  const [lp523, setLp523] = useState(); // 1.19.523
  const [lp524, setLp524] = useState(); // 1.19.524
  const [lp525, setLp525] = useState(); // 1.19.525

  // dynamic data (main assets)
  /*
    {
      "id": "2.3.0",
      "current_supply": "299563811798063",
      "confidential_supply": "36398460892",
      "accumulated_fees": 0,
      "accumulated_collateral_fees": 0,
      "fee_pool": "9481869679"
    }
  */
  const [dynamicDataBTS, setDynamicDataBTS] = useState(); // 2.3.0
  const [dynamicDataHonestMoney, setDynamicDataHonestMoney] = useState(); // 2.3.6301
  const [dynamicDataHonestUSD, setDynamicDataHonestUSD] = useState(); // 2.3.5649
  const [dynamicDataHonestBTC, setDynamicDataHonestBTC] = useState(); // 2.3.5650
  const [dynamicDataHonestXAU, setDynamicDataHonestXAU] = useState(); // 2.3.5651

  // dynamic data (pool share assets)
  const [ddHonestBTSMoney, setDdHonestBTSMoney] = useState(); // 2.3.6430
  const [ddHonestM2USD, setDdHonestM2USD] = useState(); // 2.3.6359
  const [ddHonestUSDBTSMM, setDdHonestUSDBTSMM] = useState(); // 2.3.5901
  const [ddHonestBTCBTSMM, setDdHonestBTCBTSMM] = useState(); // 2.3.5939
  const [ddHonestBTCUSDMM, setDdHonestBTCUSDMM] = useState(); // 2.3.5938
  const [ddHonestBTC2Money, setDdHonestBTC2Money] = useState(); // 2.3.6342
  const [ddHonestM2XAU, setDdHonestM2XAU] = useState(); // 2.3.6364
  const [ddHonestXAU2USD, setDdHonestXAU2USD] = useState(); // 2.3.6610
  const [ddHonestXAU2BTS, setDdHonestXAU2BTS] = useState(); // 2.3.6608
  const [ddHonestXAU2BTC, setDdHonestXAU2BTC] = useState(); // 2.3.6609

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
          setLp43(data[0]);
          setLp65(data[1]);
          setLp66(data[2]);
          setLp305(data[3]);
          setLp320(data[4]);
          setLp325(data[5]);
          setLp330(data[6]);
          setLp523(data[7]);
          setLp524(data[8]);
          setLp525(data[9]);
          // dynamic data (main assets)
          setDynamicDataBTS(data[10]);
          setDynamicDataHonestMoney(data[11]);
          setDynamicDataHonestUSD(data[12]);
          setDynamicDataHonestBTC(data[13]);
          setDynamicDataHonestXAU(data[14]);
          // dynamic data (pool share assets)
          setDdHonestBTSMoney(data[15]);
          setDdHonestM2USD(data[16]);
          setDdHonestUSDBTSMM(data[17]);
          setDdHonestBTCBTSMM(data[18]);
          setDdHonestBTCUSDMM(data[19]);
          setDdHonestBTC2Money(data[20]);
          setDdHonestM2XAU(data[21]);
          setDdHonestXAU2USD(data[22]);
          setDdHonestXAU2BTS(data[23]);
          setDdHonestXAU2BTC(data[24]);
          // smartcoin data
          setSmartcoinHonestUSD(data[25]);
          setSmartcoinHonestBTC(data[26]);
          setSmartcoinHonestXAU(data[27]);
        }
      });
    }
  }, [assets]);

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

  /*
    // Bitshares core v7.10 and higher code!
    const [poolVolumes, setPoolVolumes] = useState();
    useEffect(() => {
      let unsubscribeStore;
  
      if (usr && usr.id && currentNode) {
        const lpVolumeStore = createLPTradingVolumeStore([
          usr.chain,
          JSON.stringify([
            "43_BTS_HONEST.USD",
            "65_HONEST.USD_HONEST.BTC",
            "66_BTS_HONEST.BTC",
            "305_BTS_HONEST.MONEY",
            "320_HONEST.USD_HONEST.MONEY",
            "325_HONEST.XAU_HONEST.MONEY",
            "330_HONEST.BTC_HONEST.MONEY",
            "523_BTS_HONEST.XAU",
            "524_HONEST.BTC_HONEST.XAU",
            "525_HONEST.USD_HONEST.XAU"
          ]),
          currentNode.url
        ]);
  
        unsubscribeStore = lpVolumeStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            console.log({data, msg: "helloworld"})
            setPoolVolumes(data);
          }
        });
      }
  
      return () => {
        if (unsubscribeStore) unsubscribeStore();
      };
    }, [usr]);
  */

  // < v7.10 liquidity pool trading volume implementation
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
          console.log({filteredData});
        }
      }
      );
    }

    return () => {
      if (unsubscribeStore) unsubscribeStore();
    }
  }, [usr, currentNode]);

  const stakedBTS = useMemo(() => { // 1.3.0
    if (lp43 && lp66 && lp305 && lp524) {
      let _total = [lp43, lp66, lp305, lp524].reduce((acc, val) => {
        return acc + parseInt(val.asset_a === "1.3.0" ? val.balance_a : val.balance_b);
      }, 0);
      return humanReadableFloat(_total, 5);
    }
    return 0;
  }, [lp43, lp66, lp305, lp524]);

  const stakedHonestMoney = useMemo(() => { // 1.3.6301
    if (lp305 && lp320 && lp325 && lp330) {
      let _total = [lp305, lp320, lp325, lp330].reduce((acc, val) => {
        return acc + parseInt(val.asset_a === "1.3.6301" ? val.balance_a : val.balance_b);
      }, 0);
      return humanReadableFloat(_total, 8);
    }
    return 0;
  }, [lp305, lp320, lp325, lp330]);

  const stakedHonestUSD = useMemo(() => { // 1.3.5649
    if (lp43 && lp65 && lp320 && lp525) {
      let _total = [lp43, lp65, lp320, lp525].reduce((acc, val) => {
        return acc + parseInt(val.asset_a === "1.3.5649" ? val.balance_a : val.balance_b);
      }, 0);
      return humanReadableFloat(_total, 4);
    }
    return 0;
  }, [lp43, lp65, lp320, lp525]);

  const stakedHonestBTC = useMemo(() => { // 1.3.5650
    if (lp65 && lp66 && lp325 && lp330 && lp524) {
      let _total = [lp65, lp66, lp325, lp330, lp524].reduce((acc, val) => {
        return acc + parseInt(val.asset_a === "1.3.5650" ? val.balance_a : val.balance_b);
      }, 0);
      return humanReadableFloat(_total, 8);
    }
    return 0;
  }, [lp65, lp66, lp330, lp524]);

  const stakedHonestXAU = useMemo(() => { // 1.3.5651
    if (lp325 && lp523 && lp524 && lp525) {
      let _total = [lp325, lp523, lp524, lp525].reduce((acc, val) => {
        return acc + parseInt(val.asset_a === "1.3.5651" ? val.balance_a : val.balance_b);
      }, 0);
      return humanReadableFloat(_total, 8);
    }
    return 0;
  }, [lp325, lp523, lp524, lp525]);

  const featuredPoolRow = ({ index, style }) => {
    let res = [
      lp43,
      lp65,
      lp66,
      lp305,
      lp320,
      lp325,
      lp330,
      lp523,
      lp524,
      lp525,
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
      ddHonestBTSMoney,
      ddHonestM2USD,
      ddHonestUSDBTSMM,
      ddHonestBTCBTSMM,
      ddHonestBTCUSDMM,
      ddHonestBTC2Money,
      ddHonestM2XAU,
      ddHonestXAU2USD,
      ddHonestXAU2BTS,
      ddHonestXAU2BTC,
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

    const swappableAssetDD = [
      dynamicDataBTS,
      dynamicDataHonestMoney,
      dynamicDataHonestUSD,
      dynamicDataHonestBTC,
      dynamicDataHonestXAU,
    ];

    const _assetADD = swappableAssetDD.find((x) => x.id === _poolAssetA.asset_id);
    const _assetBDD = swappableAssetDD.find((x) => x.id === _poolAssetB.asset_id);

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

    return (
      <div style={{ ...style }} key={`poolRow-${res.id}`} className="grid grid-cols-12 text-xs border border-gray-300">
        <div>
          {res.id}<br/>
          {_currentPSA.id}
        </div>
        <div>
          {_poolAssetA.symbol}<br/>
          {_poolAssetB.symbol}
        </div>
        <div className="ml-1">
          $0.00<br/>
          $0.00
        </div>
        <div className="ml-1 border-l border-gray-300">
          {humanReadableFloat(_psaDD.current_supply, _currentPSA.precision)}
        </div>
        <div className="ml-1 border-l border-gray-300">
          {
            _psaBalance && _psaBalance.amount
              ? <>
                  {humanReadableFloat(_psaBalance.amount, _currentPSA.precision)}<br/>
                  {(_psaBalance.amount / _psaDD.current_supply * 100).toFixed(2)}%
                </>
              : <>0<br/>0%</>
          }
        </div>
        <div className="ml-2 border-l border-gray-300 text-center">
          {
            _poolAssetA.id === "1.3.0"
              ? _amountA
              : null
          }
          {
            _poolAssetB.id === "1.3.0"
              ? _amountB
              : null
          }
        </div>
        <div className="ml-2 text-center">
          {
            _poolAssetA.id === "1.3.6301"
              ? _amountA
              : null
          }
          {
            _poolAssetB.id === "1.3.6301"
              ? _amountB
              : null
          }
        </div>
        <div className="ml-2 text-center">
          {
            _poolAssetA.id === "1.3.5649"
              ? _amountA
              : null
          }
          {
            _poolAssetB.id === "1.3.5649"
              ? _amountB
              : null
          }
        </div>
        <div className="ml-2 text-center">
          {
            _poolAssetA.id === "1.3.5650"
              ? _amountA
              : null
          }
          {
            _poolAssetB.id === "1.3.5650"
              ? _amountB
              : null
          }
        </div>
        <div className="ml-2 text-center">
          {
            _poolAssetA.id === "1.3.5651"
              ? _amountA
              : null
          }
          {
            _poolAssetB.id === "1.3.5651"
              ? _amountB
              : null
          }
        </div>
        <div className="ml-3 border-l border-gray-300">
          A: {_24hVolumeA}<br/>
          B: {_24hVolumeB}<br/>
          <Separator />
          Fees:<br/>
          A: {_24hFeeA}<br/>
          B: {_24hFeeB}
        </div>
        <div className="ml-3">
          💱 {res.taker_fee_percent / 100} %<br/>
          💸 {res.withdrawal_fee_percent / 100} %<br/>
          <Separator />
          A: {
            _psaBalance && _psaBalance.amount
              ? ((((_24hFeeA / _amountA) * 100) * (_psaBalance.amount / _psaDD.current_supply)) * 30).toFixed(3)
              : "0.00"
          } % (30d)<br/>
          B: {
            _psaBalance && _psaBalance.amount
              ? ((((_24hFeeB / _amountB) * 100) * (_psaBalance.amount / _psaDD.current_supply)) * 30).toFixed(3)
              : "0.00"
          } % (30d)<br/>
          A: {
            _psaBalance && _psaBalance.amount
              ? ((((_24hFeeA / _amountA) * 100) * (_psaBalance.amount / _psaDD.current_supply)) * 365).toFixed(3)
              : "0.00"
          } % (1yr)<br/>
          B: {
            _psaBalance && _psaBalance.amount
              ? ((((_24hFeeB / _amountB) * 100) * (_psaBalance.amount / _psaDD.current_supply)) * 365).toFixed(3)
              : "0.00"
          } % (1yr)
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card className="p-2">
            <CardHeader>
              <CardTitle>{t("PoolForm:title")}</CardTitle>
              <CardDescription>{t("PoolForm:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {!assets ? <p>{t("PoolForm:loadingAssetData")}</p> : null}
              <div className="grid grid-cols-12 text-xs">
                <div>Pool</div>
                <div>Asset Pair</div>
                <div>Value (USD)</div>
                <div>Pool Total</div>
                <div>Balance</div>
                <div className="text-center">BTS</div>
                <div className="text-center">Honest.MONEY</div>
                <div className="text-center">Honest.USD</div>
                <div className="text-center">Honest.BTC</div>
                <div className="text-center">Honest.XAU</div>
                <div>24Hr Volume</div>
                <div>Fees</div>
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
                <div className="col-span-5"></div>
                <div className="col-span-5 text-center border border-gray-300">
                  <div className="grid grid-cols-5">
                    <div>
                      In Pool<br/>
                      {stakedBTS}
                    </div>
                    <div>
                      In Pool<br/>
                      {stakedHonestMoney}
                    </div>
                    <div>
                      In Pool<br/>
                      {stakedHonestUSD}
                    </div>
                    <div>
                      In Pool<br/>
                      {stakedHonestBTC}
                    </div>
                    <div>
                      In Pool<br/>
                      {stakedHonestXAU}
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div>
                      Liquid<br/>
                      {
                        usrBalances && usrBalances.length
                          ? humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.0").amount, 5)
                          : 0
                      }
                    </div>
                    <div>
                      Liquid<br/>
                      {
                        usrBalances && usrBalances.length
                          ? humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.6301").amount, 8)
                          : 0
                      }
                    </div>
                    <div>
                      Liquid<br/>
                      {
                        usrBalances && usrBalances.length
                          ? humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.5649").amount, 4)
                          : 0
                      }
                    </div>
                    <div>
                      Liquid<br/>
                      {
                        usrBalances && usrBalances.length
                          ? humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.5650").amount, 8)
                          : 0
                      }
                    </div>
                    <div>
                      Liquid<br/>
                      {
                        usrBalances && usrBalances.length
                          ? humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.5651").amount, 8)
                          : 0
                      }
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div className="col-span-2"></div>
                    <div>
                      Debt<br/>
                      0
                    </div>
                    <div>
                      Debt<br/>
                      0
                    </div>
                    <div>
                      Debt<br/>
                      0
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div>
                      Total Collateral<br/>
                      12345
                    </div>
                    <div></div>
                    <div>
                      Collateral<br/>
                      2
                    </div>
                    <div>
                      Collateral<br/>
                      3
                    </div>
                    <div>
                      Collateral<br/>
                      4
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div>
                      Total<br/>
                      1<br/>
                      1234<br/>
                      1%
                    </div>
                    <div>
                      Total<br/>
                      1<br/>
                      1234<br/>
                      1%
                    </div>
                    <div>
                      Total<br/>
                      1<br/>
                      1234<br/>
                      1%
                    </div>
                    <div>
                      Total<br/>
                      1<br/>
                      1234<br/>
                      1%
                    </div>
                    <div>
                      Total<br/>
                      1<br/>
                      1234<br/>
                      1%
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div>
                      $1
                    </div>
                    <div>
                      $1
                    </div>
                    <div>
                      $1
                    </div>
                    <div>
                      $1
                    </div>
                    <div>
                      $1
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div className="col-span-5">
                      $1
                    </div>
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
