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

import { createTickerStore } from "@/nanoeffects/MarketTradeHistory.js";
import { createAssetCallOrdersStore } from "@/nanoeffects/AssetCallOrders.ts";

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

  const honestUSDPrice = useMemo(() => { // USD in BTS
    if (!smartcoinHonestUSD) {
      return 0.0;
    }

    const _debt = smartcoinHonestUSD.individual_settlement_debt
      ? humanReadableFloat(
          parseInt(smartcoinHonestUSD.individual_settlement_debt),
          5
        )
      : 0;

    const _usdPrice = parseFloat(
      (
        humanReadableFloat(
          parseInt(
            _debt && _debt > 0
              ? smartcoinHonestUSD.median_feed.settlement_price.quote.amount
              : smartcoinHonestUSD.current_feed.settlement_price.quote.amount
          ),
          5
        ) /
        humanReadableFloat(
          parseInt(
            _debt && _debt > 0
              ? smartcoinHonestUSD.median_feed.settlement_price.base.amount
              : smartcoinHonestUSD.current_feed.settlement_price.base.amount
          ),
          4
        )
      ).toFixed(4)
    );

    return _usdPrice;
  }, [smartcoinHonestUSD]);

  const btsPrice = useMemo(() => {
    if (!honestUSDPrice) {
      return;
    }

    return (1 / honestUSDPrice).toFixed(4);
  }, [honestUSDPrice]);

  const honestBTCPrice = useMemo(() => { // BTC in USD
    if (!smartcoinHonestBTC || !smartcoinHonestUSD) {
      return 0.0;
    }

    const _debt = smartcoinHonestBTC.individual_settlement_debt
      ? humanReadableFloat(
          parseInt(smartcoinHonestBTC.individual_settlement_debt),
          5
        ) 
      : 0;

    const _btcPrice = parseFloat(
      (
        humanReadableFloat(
          parseInt(
            _debt && _debt > 0
              ? smartcoinHonestBTC.median_feed.settlement_price.quote.amount
              : smartcoinHonestBTC.current_feed.settlement_price.quote.amount
          ),
          5
        ) /
        humanReadableFloat(
          parseInt(
            _debt && _debt > 0
              ? smartcoinHonestBTC.median_feed.settlement_price.base.amount
              : smartcoinHonestBTC.current_feed.settlement_price.base.amount
          ),
          8
        )
      ).toFixed(5)
    );

    return (_btcPrice / honestUSDPrice).toFixed(4);
  }, [smartcoinHonestBTC, smartcoinHonestUSD, honestUSDPrice]);

  const honestXAUPrice = useMemo(() => { // XAU in USD
    if (!smartcoinHonestXAU || !smartcoinHonestUSD) { 
      return 0.0;
    }

    const _debt = smartcoinHonestXAU.individual_settlement_debt
      ? humanReadableFloat(
          parseInt(smartcoinHonestXAU.individual_settlement_debt),
          8
        )
      : 0;

    const _xauPrice = parseFloat(
      (
        humanReadableFloat(
          parseInt(
            _debt && _debt > 0
              ? smartcoinHonestXAU.median_feed.settlement_price.quote.amount
              : smartcoinHonestXAU.current_feed.settlement_price.quote.amount
          ),
          5
        ) /
        humanReadableFloat(
          parseInt(
            _debt && _debt > 0
              ? smartcoinHonestXAU.median_feed.settlement_price.base.amount
              : smartcoinHonestXAU.current_feed.settlement_price.base.amount
          ),
          8
        )
      ).toFixed(4)
    );

    console.log({ _xauPrice, usdXAU: (_xauPrice/honestUSDPrice).toFixed(4) });

    return (_xauPrice/honestUSDPrice).toFixed(4);
  }, [smartcoinHonestXAU, smartcoinHonestUSD]);

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
        }
      }
      );
    }

    return () => {
      if (unsubscribeStore) unsubscribeStore();
    }
  }, [usr, currentNode]);

  // This is the amount of BTS the user has staked in the 4 targeted pools
  const stakedBTS = useMemo(() => { // 1.3.0
    if (lp43 && lp66 && lp305 && lp524 && ddHonestUSDBTSMM && ddHonestBTCBTSMM && ddHonestBTSMoney && ddHonestXAU2BTS) {
      const _supply5901 = parseInt(ddHonestUSDBTSMM.current_supply);
      const _supply5939 = parseInt(ddHonestBTCBTSMM.current_supply);
      const _supply6430 = parseInt(ddHonestBTSMoney.current_supply);
      const _supply6608 = parseInt(ddHonestXAU2BTS.current_supply);

      const _psaBalance5901 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.5901") : null;
      const _psaBalance5939 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.5939") : null;
      const _psaBalance6430 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6430") : null;
      const _psaBalance6608 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6608") : null;
    
      const ownership5901 = _supply5901 && _psaBalance5901 && _psaBalance5901.amount
        ? parseInt(_psaBalance5901.amount) / _supply5901
        : 0;

      const ownership5939 = _supply5939 && _psaBalance5939 && _psaBalance5939.amount
        ? parseInt(_psaBalance5939.amount) / _supply5939
        : 0;
      
      const ownership6430 = _supply6430 && _psaBalance6430 && _psaBalance6430.amount
        ? parseInt(_psaBalance6430.amount) / _supply6430
        : 0;
      
      const ownership6608 = _supply6608 && _psaBalance6608 && _psaBalance6608.amount
        ? parseInt(_psaBalance6608.amount) / _supply6608
        : 0;

      let _total = [lp43, lp66, lp305, lp523].reduce((acc, val) => {
        if (val.id === "1.19.43") {
          return acc + (
            parseInt(val.asset_a === "1.3.0" ? val.balance_a : val.balance_b) * ownership5901
          );
        } else if (val.id === "1.19.66") {
          return acc + (
            parseInt(val.asset_a === "1.3.0" ? val.balance_a : val.balance_b) * ownership5939
          );
        } else if (val.id === "1.19.305") {
          return acc + (
            parseInt(val.asset_a === "1.3.0" ? val.balance_a : val.balance_b) * ownership6430
          );
        } else if (val.id === "1.19.523") {
          return acc + (
            parseInt(val.asset_a === "1.3.0" ? val.balance_a : val.balance_b) * ownership6608
          );
        }
        return 0;
      }, 0);

      /*
        ddHonestUSDBTSMM,  // HONEST.USDBTSMM  1.3.5901 1.19.43
        ddHonestBTCBTSMM,  // HONEST.BTCBTSMM  1.3.5939 1.19.66
        ddHonestBTSMoney,  // HONEST.BTSMONEY  1.3.6430 1.19.305
        ddHonestXAU2BTS,   // HONEST.XAU2BTS   1.3.6608 1.19.523
      */

      console.log({_total})

      return humanReadableFloat(_total, 5);
    }
    return 0;
  }, [lp43, lp66, lp305, lp524, ddHonestUSDBTSMM, ddHonestBTCBTSMM, ddHonestBTSMoney, ddHonestXAU2BTS, usrBalances]);

  const stakedHonestUSD = useMemo(() => { // 1.3.5649
    if (lp43 && lp65 && lp320 && lp525 && ddHonestUSDBTSMM && ddHonestBTCUSDMM && ddHonestM2USD && ddHonestXAU2USD && usrBalances) {

      const _supply5901 = parseInt(ddHonestUSDBTSMM.current_supply);
      const _supply5938 = parseInt(ddHonestBTCUSDMM.current_supply);
      const _supply6359 = parseInt(ddHonestM2USD.current_supply);
      const _supply6610 = parseInt(ddHonestXAU2USD.current_supply);

      const _psaBalance5901 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.5901") : null;
      const _psaBalance5938 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.5938") : null;
      const _psaBalance6359 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6359") : null;
      const _psaBalance6610 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6610") : null;

      const ownership5901 = _supply5901 && _psaBalance5901 && _psaBalance5901.amount
        ? parseInt(_psaBalance5901.amount) / _supply5901
        : 0;

      const ownership5938 = _supply5938 && _psaBalance5938 && _psaBalance5938.amount
        ? parseInt(_psaBalance5938.amount) / _supply5938
        : 0;
      
      const ownership6359 = _supply6359 && _psaBalance6359 && _psaBalance6359.amount
        ? parseInt(_psaBalance6359.amount) / _supply6359
        : 0;
      
      const ownership6610 = _supply6610 && _psaBalance6610 && _psaBalance6610.amount
        ? parseInt(_psaBalance6610.amount) / _supply6610
        : 0;


      let _total = [lp43, lp65, lp320, lp525].reduce((acc, val) => {
        if (val.id === "1.19.43") {
          return acc + (
            parseInt(val.asset_a === "1.3.5649" ? val.balance_a : val.balance_b) * ownership5901
          );
        } else if (val.id === "1.19.65") {
          return acc + (
            parseInt(val.asset_a === "1.3.5649" ? val.balance_a : val.balance_b) * ownership5938
          );
        } else if (val.id === "1.19.320") {
          return acc + (
            parseInt(val.asset_a === "1.3.5649" ? val.balance_a : val.balance_b) * ownership6359
          );
        } else if (val.id === "1.19.525") {
          return acc + (
            parseInt(val.asset_a === "1.3.5649" ? val.balance_a : val.balance_b) * ownership6610
          );
        }
        return 0;
      }, 0);
      /*
        ddHonestUSDBTSMM,  // HONEST.USDBTSMM  1.3.5901
        ddHonestBTCUSDMM,  // HONEST.BTCUSDMM  1.3.5938
        ddHonestM2USD,     // HONEST.M2USD     1.3.6359
        ddHonestXAU2USD,   // HONEST.XAU2USD   1.3.6610
      */
      return humanReadableFloat(_total, 4);
    }
    return 0;
  }, [lp43, lp65, lp320, lp525, ddHonestUSDBTSMM, ddHonestBTCUSDMM, ddHonestM2USD, ddHonestXAU2USD, usrBalances]);

  const stakedHonestBTC = useMemo(() => { // 1.3.5650
    if (lp65 && lp66 && lp330 && lp524 && ddHonestBTCBTSMM && ddHonestBTCUSDMM && ddHonestBTC2Money && ddHonestXAU2BTC && usrBalances) {

      const _supply5939 = parseInt(ddHonestBTCBTSMM.current_supply);
      const _supply5938 = parseInt(ddHonestBTCUSDMM.current_supply);
      const _supply6342 = parseInt(ddHonestBTC2Money.current_supply);
      const _supply6609 = parseInt(ddHonestXAU2BTC.current_supply);

      const _psaBalance5939 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.5939") : null;
      const _psaBalance5938 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.5938") : null;
      const _psaBalance6342 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6342") : null;
      const _psaBalance6609 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6609") : null;

      const ownership5939 = _supply5939 && _psaBalance5939 && _psaBalance5939.amount
        ? parseInt(_psaBalance5939.amount) / _supply5939
        : 0;

      const ownership5938 = _supply5938 && _psaBalance5938 && _psaBalance5938.amount
        ? parseInt(_psaBalance5938.amount) / _supply5938
        : 0;

      const ownership6342 = _supply6342 && _psaBalance6342 && _psaBalance6342.amount
        ? parseInt(_psaBalance6342.amount) / _supply6342
        : 0;
      
      const ownership6609 = _supply6609 && _psaBalance6609 && _psaBalance6609.amount
        ? parseInt(_psaBalance6609.amount) / _supply6609
        : 0;


      let _total = [lp65, lp66, lp330, lp524].reduce((acc, val) => {
        if (val.id === "1.19.65") {
          return acc + (
            parseInt(val.asset_a === "1.3.5650" ? val.balance_a : val.balance_b) * ownership5939
          );
        } else if (val.id === "1.19.66") {
          return acc + (
            parseInt(val.asset_a === "1.3.5650" ? val.balance_a : val.balance_b) * ownership5938
          );
        } else if (val.id === "1.19.330") {
          return acc + (
            parseInt(val.asset_a === "1.3.5650" ? val.balance_a : val.balance_b) * ownership6342
          );
        } else if (val.id === "1.19.524") {
          return acc + (
            parseInt(val.asset_a === "1.3.5650" ? val.balance_a : val.balance_b) * ownership6609
          );
        }
        return 0;        
      }, 0);

      /*
        ddHonestBTCBTSMM,  // HONEST.BTCBTSMM  1.3.5939 1.19.65
        ddHonestBTCUSDMM,  // HONEST.BTCUSDMM  1.3.5938 1.19.66
        ddHonestBTC2Money, // HONEST.BTC2MONEY 1.3.6342 1.19.330
        ddHonestXAU2BTC,   // HONEST.XAU2BTC   1.3.6609 1.19.524      
      */
      return humanReadableFloat(_total, 8);
    }
    return 0;
  }, [lp65, lp66, lp330, lp524, ddHonestBTCBTSMM, ddHonestBTCUSDMM, ddHonestBTC2Money, ddHonestXAU2BTC]);

  const stakedHonestXAU = useMemo(() => { // 1.3.5651
    if (lp325 && lp523 && lp524 && lp525 && ddHonestXAU2BTC && ddHonestXAU2USD && ddHonestXAU2BTS && ddHonestM2XAU && usrBalances) {
      const _supply6609 = parseInt(ddHonestXAU2BTC.current_supply);
      const _supply6610 = parseInt(ddHonestXAU2USD.current_supply);
      const _supply6608 = parseInt(ddHonestXAU2BTS.current_supply);
      const _supply6364 = parseInt(ddHonestM2XAU.current_supply);

      const _psaBalance6609 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6609") : null;
      const _psaBalance6610 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6610") : null;
      const _psaBalance6608 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6608") : null;
      const _psaBalance6364 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6364") : null;

      const ownership6609 = _supply6609 && _psaBalance6609 && _psaBalance6609.amount
        ? parseInt(_psaBalance6609.amount) / _supply6609
        : 0;
      
      const ownership6610 = _supply6610 && _psaBalance6610 && _psaBalance6610.amount
        ? parseInt(_psaBalance6610.amount) / _supply6610
        : 0;
      
      const ownership6608 = _supply6608 && _psaBalance6608 && _psaBalance6608.amount
        ? parseInt(_psaBalance6608.amount) / _supply6608
        : 0;

      const ownership6364 = _supply6364 && _psaBalance6364 && _psaBalance6364.amount
        ? parseInt(_psaBalance6364.amount) / _supply6364
        : 0;

      let _total = [lp325, lp523, lp524, lp525].reduce((acc, val) => {
        if (val.id === "1.19.325") {
          return acc + (
            parseInt(val.asset_a === "1.3.5651" ? val.balance_a : val.balance_b) * ownership6364
          );
        } else if (val.id === "1.19.523") {
          return acc + (
            parseInt(val.asset_a === "1.3.5651" ? val.balance_a : val.balance_b) * ownership6608
          );
        } else if (val.id === "1.19.524") {
          return acc + (
            parseInt(val.asset_a === "1.3.5651" ? val.balance_a : val.balance_b) * ownership6609
          );
        } else if (val.id === "1.19.525") {
          return acc + (
            parseInt(val.asset_a === "1.3.5651" ? val.balance_a : val.balance_b) * ownership6610
          );
        }
        return 0;
      }, 0);
     
      /*
        ddHonestXAU2BTC,   // HONEST.XAU2BTC   1.3.6609 1.19.524      
        ddHonestXAU2USD,   // HONEST.XAU2USD   1.3.6610
        ddHonestXAU2BTS,   // HONEST.XAU2BTS   1.3.6608 1.19.523
        ddHonestM2XAU,     // HONEST.M2XAU     1.3.6364 1.19.525
      */
      return humanReadableFloat(_total, 8);
    }
    return 0;
  }, [lp325, lp523, lp524, lp525, ddHonestXAU2BTC, ddHonestXAU2USD, ddHonestXAU2BTS, ddHonestM2XAU, usrBalances]);

  const stakedHonestMoney = useMemo(() => { // 1.3.6301
    if (lp305 && lp320 && lp325 && lp330 && ddHonestBTSMoney && ddHonestM2USD && ddHonestM2XAU && ddHonestBTC2Money && usrBalances) {
      const _supply6430 = parseInt(ddHonestBTSMoney.current_supply);
      const _supply6359 = parseInt(ddHonestM2USD.current_supply);
      const _supply6364 = parseInt(ddHonestM2XAU.current_supply);
      const _supply6342 = parseInt(ddHonestBTC2Money.current_supply);

      const _psaBalance6430 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6430") : null;
      const _psaBalance6359 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6359") : null;
      const _psaBalance6364 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6364") : null;
      const _psaBalance6342 = usrBalances && usrBalances.length ? usrBalances.find((x) => x.asset_id === "1.3.6342") : null;

      const ownership6430 = _supply6430 && _psaBalance6430 && _psaBalance6430.amount
        ? parseInt(_psaBalance6430.amount) / _supply6430
        : 0;

      const ownership6359 = _supply6359 && _psaBalance6359 && _psaBalance6359.amount
        ? parseInt(_psaBalance6359.amount) / _supply6359
        : 0;
      
      const ownership6364 = _supply6364 && _psaBalance6364 && _psaBalance6364.amount
        ? parseInt(_psaBalance6364.amount) / _supply6364
        : 0;
      
      const ownership6342 = _supply6342 && _psaBalance6342 && _psaBalance6342.amount
        ? parseInt(_psaBalance6342.amount) / _supply6342
        : 0;

      const _total = [lp305, lp320, lp325, lp330].reduce((acc, val) => {
        if (val.id === "1.19.305") {
          return acc + (
            parseInt(val.asset_a === "1.3.6301" ? val.balance_a : val.balance_b) * ownership6430
          );
        } else if (val.id === "1.19.320") {
          return acc + (
            parseInt(val.asset_a === "1.3.6301" ? val.balance_a : val.balance_b) * ownership6359
          );
        } else if (val.id === "1.19.325") {
          return acc + (
            parseInt(val.asset_a === "1.3.6301" ? val.balance_a : val.balance_b) * ownership6364
          );
        } else if (val.id === "1.19.330") {
          return acc + (
            parseInt(val.asset_a === "1.3.6301" ? val.balance_a : val.balance_b) * ownership6342
          );
        }
        return 0;
      }, 0);

      /*
        ddHonestBTSMoney,  // HONEST.BTSMONEY  1.3.6430
        ddHonestM2USD,     // HONEST.M2USD     1.3.6359
        ddHonestM2XAU,     // HONEST.M2XAU     1.3.6364
        ddHonestBTC2Money, // HONEST.BTC2MONEY 1.3.6342
      */
      return humanReadableFloat(_total, 8);
    }
    return 0;
  }, [lp305, lp320, lp325, lp330, ddHonestBTSMoney, ddHonestM2USD, ddHonestM2XAU, ddHonestBTC2Money, usrBalances]);

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

    const poolOwnershipPercentage = _psaBalance && _psaBalance.amount
      ? _psaBalance.amount / _psaDD.current_supply
      : 0;

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
          {
            res.id === "1.19.43"
            ? <>
              ${btsPrice ?? 0}<br/>
              $1.00
            </>
            : null
          }
          {
            res.id === "1.19.65"
            ? <>
              $1.00<br/>
              ${honestBTCPrice ?? 0}
            </>
            : null
          }
          {
            res.id === "1.19.66"
            ? <>
              ${btsPrice ?? 0}<br/>
              ${honestBTCPrice ?? 0}
            </>
            : null
          }
          {
            res.id === "1.19.305"
            ? <>
              ${btsPrice ?? 0}<br/>
              ${
                honestMoneyPrice && honestMoneyPrice.latest && btsPrice
                  ? (honestMoneyPrice.latest * btsPrice).toFixed(4)
                  : 0
              }
            </>
            : null
          }
          {
            res.id === "1.19.320"
            ? <>
              $1.00<br/>
              ${
                honestMoneyPrice && honestMoneyPrice.latest && btsPrice
                  ? (honestMoneyPrice.latest * btsPrice).toFixed(4)
                  : 0
              }
            </>
            : null
          }
          {
            res.id === "1.19.325"
            ? <>
              ${honestXAUPrice}<br/>
              ${
                honestMoneyPrice && honestMoneyPrice.latest && btsPrice
                  ? (honestMoneyPrice.latest * btsPrice).toFixed(4)
                  : 0
              }
            </>
            : null
          }
          {
            res.id === "1.19.330"
            ? <>
              ${honestBTCPrice ?? 0}<br/>
              ${
                honestMoneyPrice && honestMoneyPrice.latest && btsPrice
                  ? (honestMoneyPrice.latest * btsPrice).toFixed(4)
                  : 0
              }
            </>
            : null
          }
          {
            res.id === "1.19.523"
            ? <>
              ${btsPrice ?? 0}<br/>
              ${honestXAUPrice}
            </>
            : null
          }
          {
            res.id === "1.19.524"
            ? <>
              ${honestBTCPrice ?? 0}<br/>
              ${honestXAUPrice}
            </>
            : null
          }
          {
            res.id === "1.19.525"
            ? <>
              ${honestUSDPrice ?? 0}<br/>
              ${honestXAUPrice}
            </>
            : null
          }
        </div>
        <div className="ml-1 border-l border-gray-300">
          {humanReadableFloat(_psaDD.current_supply, _currentPSA.precision)}
        </div>
        <div className="ml-1 border-l border-gray-300">
          {
            _psaBalance && _psaBalance.amount
              ? <>
                  {humanReadableFloat(_psaBalance.amount, _currentPSA.precision)}<br/>
                  {(poolOwnershipPercentage * 100).toFixed(2)}%
                </>
              : <>0<br/>0%</>
          }
        </div>
        <div className="ml-2 border-l border-gray-300 text-center">
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
        <div className="ml-2 text-center">
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
        <div className="ml-2 text-center">
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
        <div className="ml-2 text-center">
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
        <div className="ml-2 text-center">
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
    if (usrBalances && usrBalances.length) {
      _total += humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.6301").amount, 8);
    }
    return _total;
  }, [stakedHonestMoney, usrBalances]);

  const totalHonestUSD = useMemo(() => {
    let _total = 0;
    if (stakedHonestUSD) {
      _total += stakedHonestUSD;
    }
    if (usrBalances && usrBalances.length) {
      _total += humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.5649").amount, 4);
    }
    /*
    if (callOrdersHonestUSD) {
      _total += humanReadableFloat(callOrdersHonestUSD.debt, 4);
    }
    */
    return _total;
  }, [stakedHonestUSD, usrBalances, callOrdersHonestUSD]);

  const totalHonestBTC = useMemo(() => {
    let _total = 0;
    if (stakedHonestBTC) {
      _total += stakedHonestBTC;
    }
    if (usrBalances && usrBalances.length) {
      _total += humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.5650").amount, 8);
    }
    /*
    if (callOrdersHonestBTC) {
      _total += humanReadableFloat(callOrdersHonestBTC.debt, 8);
    }
    */
    return _total;
  }, [stakedHonestBTC, usrBalances, callOrdersHonestBTC]);

  const totalHonestXAU = useMemo(() => {
    let _total = 0;
    if (stakedHonestXAU) {
      _total += stakedHonestXAU;
    }
    if (usrBalances && usrBalances.length) {
      _total += humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.5651").amount, 8);
    }
    /*
    if (callOrdersHonestXAU) {
      _total += humanReadableFloat(callOrdersHonestXAU.debt, 8);
    }
    */
    return _total;
  }, [stakedHonestXAU, usrBalances, callOrdersHonestXAU]);  

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
      _total += humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.0").amount, 5);
    }
    if (btsTotalCollateral) {
      _total += btsTotalCollateral;
    }
    return _total;
  }, [stakedBTS, usrBalances, callOrdersHonestUSD, btsTotalCollateral]);

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
                <div>{t("PoolTracker:pool")}</div>
                <div>{t("PoolTracker:assetPair")}</div>
                <div>{t("PoolTracker:value")}</div>
                <div>{t("PoolTracker:poolTotal")}</div>
                <div>{t("PoolTracker:balance")}</div>
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
                <div className="col-span-1 text-right">
                  <br/>
                  <br/>
                  <br/>
                  <br/>
                  <br/>
                  <br/>
                  <br/>
                  <br/>
                  <br/>
                  <br/>
                  <br/>
                  <br/>
                  {t("PoolTracker:circulating")}<br/>
                  <br/>
                  <br/>
                  <b>{t("PoolTracker:total")}</b>
                </div>
                <div className="col-span-5 text-center border border-gray-300">
                  <div className="grid grid-cols-5">
                    <div>
                      <b>{t("PoolTracker:inPool")}</b><br/>
                      {stakedBTS}
                    </div>
                    <div>
                      <b>{t("PoolTracker:inPool")}</b><br/>
                      {stakedHonestMoney}
                    </div>
                    <div>
                      <b>{t("PoolTracker:inPool")}</b><br/>
                      {stakedHonestUSD}
                    </div>
                    <div>
                      <b>{t("PoolTracker:inPool")}</b><br/>
                      {stakedHonestBTC}
                    </div>
                    <div>
                      <b>{t("PoolTracker:inPool")}</b><br/>
                      {stakedHonestXAU}
                    </div>
                  </div>
                  <div className="grid grid-cols-5 mt-2">
                    <div>
                      <b>{t("PoolTracker:liquid")}</b><br/>
                      {
                        usrBalances && usrBalances.length
                          ? humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.0").amount, 5)
                          : 0
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:liquid")}</b><br/>
                      {
                        usrBalances && usrBalances.length
                          ? humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.6301").amount, 8)
                          : 0
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:liquid")}</b><br/>
                      {
                        usrBalances && usrBalances.length
                          ? humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.5649").amount, 4)
                          : 0
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:liquid")}</b><br/>
                      {
                        usrBalances && usrBalances.length
                          ? humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.5650").amount, 8)
                          : 0
                      }
                    </div>
                    <div>
                      <b>{t("PoolTracker:liquid")}</b><br/>
                      {
                        usrBalances && usrBalances.length
                          ? humanReadableFloat(usrBalances.find((x) => x.asset_id === "1.3.5651").amount, 8)
                          : 0
                      }
                    </div>
                  </div>
                  <div className="grid grid-cols-5 mt-3">
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
                  <div className="grid grid-cols-5">
                    <div>
                      <b>{t("PoolTracker:totalCollateral")}</b><br/>
                      <b>{btsTotalCollateral}</b> BTS
                    </div>
                    <div></div>
                    <div>
                      <b>{t("PoolTracker:totalCollateral")}</b><br/>
                      {
                        callOrdersHonestUSD
                          ? humanReadableFloat(callOrdersHonestUSD.collateral, 5)
                          : null
                      } BTS
                    </div>
                    <div>
                      <b>{t("PoolTracker:totalCollateral")}</b><br/>
                      {
                        callOrdersHonestBTC
                          ? humanReadableFloat(callOrdersHonestBTC.collateral, 5)
                          : null
                      } BTS
                    </div>
                    <div>
                      <b>{t("PoolTracker:totalCollateral")}</b><br/>
                      {
                        callOrdersHonestXAU
                          ? humanReadableFloat(callOrdersHonestXAU.collateral, 5)
                          : null
                      } BTS
                    </div>
                  </div>
                  <div className="grid grid-cols-5 mt-3">
                    <div>
                      <b>{t("PoolTracker:total")}</b><br/>
                      <b>{totalBTS}</b>
                      <br/>
                      {
                        dynamicDataBTS
                          ? humanReadableFloat(dynamicDataBTS.current_supply, 5)
                          : null
                      }<br/>
                      <b>
                        {
                          dynamicDataBTS
                            ? ((totalBTS / humanReadableFloat(dynamicDataBTS.current_supply, 5)) * 100).toFixed(3)
                            : null
                        }
                      </b>%
                    </div>
                    <div>
                      <b>{t("PoolTracker:total")}</b><br/>
                      <b>{totalHonestMoney}</b><br/>
                      {
                        dynamicDataHonestMoney
                          ? humanReadableFloat(dynamicDataHonestMoney.current_supply, 5)
                          : null
                      }<br/>
                      <b>
                        {
                          dynamicDataHonestMoney
                            ? ((totalHonestMoney / humanReadableFloat(dynamicDataHonestMoney.current_supply, 5)) * 100).toFixed(3)
                            : null
                        }
                      </b>%
                    </div>
                    <div>
                      <b>{t("PoolTracker:total")}</b><br/>
                      <b>{totalHonestUSD}</b><br/>
                      {
                        dynamicDataHonestUSD
                          ? humanReadableFloat(dynamicDataHonestUSD.current_supply, 4)
                          : null
                      }<br/>
                      <b>
                        {
                          dynamicDataHonestUSD
                            ? ((totalHonestUSD / humanReadableFloat(dynamicDataHonestUSD.current_supply, 4)) * 100).toFixed(3)
                            : null
                        }
                      </b>%
                    </div>
                    <div>
                      <b>{t("PoolTracker:total")}</b><br/>
                      <b>{totalHonestBTC}</b><br/>
                      {
                        dynamicDataHonestBTC
                          ? humanReadableFloat(dynamicDataHonestBTC.current_supply, 8)
                          : null
                      }<br/>
                      <b>
                        {
                          dynamicDataHonestBTC
                            ? ((totalHonestBTC / humanReadableFloat(dynamicDataHonestBTC.current_supply, 8)) * 100).toFixed(3)
                            : null
                        }
                      </b>%
                    </div>
                    <div>
                      <b>{t("PoolTracker:total")}</b><br/>
                      <b>{totalHonestXAU}</b><br/>
                      {
                        dynamicDataHonestXAU
                          ? humanReadableFloat(dynamicDataHonestXAU.current_supply, 8)
                          : null
                      }<br/>
                      <b>
                        {
                          dynamicDataHonestXAU
                            ? ((totalHonestXAU / humanReadableFloat(dynamicDataHonestXAU.current_supply, 8)) * 100).toFixed(3)
                            : null
                        }
                      </b>%
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
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
                  <div className="grid grid-cols-5">
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
