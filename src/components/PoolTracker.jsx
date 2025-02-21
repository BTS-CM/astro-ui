import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex as toHex } from "@noble/hashes/utils";
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

import { blockchainFloat, humanReadableFloat } from "@/lib/common";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import ExternalLink from "./common/ExternalLink.jsx";

export default function PoolTracker(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const {
    _assetsBTS,
    _assetsTEST,
    _poolsBTS,
    _poolsTEST
  } = properties;

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
  }, [blocklist, _assetsBTS, _assetsTEST, _chain]);

  const pools = useMemo(() => {
    if (!_chain || (!_poolsBTS && !_poolsTEST)) {
      return [];
    }

    if (_chain !== "bitshares") {
      return _poolsTEST;
    }

    const relevantPools = _poolsBTS.filter((pool) => {
      const poolShareAsset = assets.find((asset) => asset.id === pool.share_asset_id);
      if (!poolShareAsset) return false;
      return !blocklist.users.includes(toHex(sha256(poolShareAsset.issuer)));
    });

    return relevantPools;
  }, [assets, blocklist, _poolsBTS, _poolsTEST, _chain]);

  // main assets
  const assetBTS = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.0");
  }, [assets]); // 1.3.0

  const assetHonestMoney = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.6301");
  }, [assets]); // 1.3.6301

  const assetHonestUSD = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.5649");
  }, [assets]); // 1.3.5649

  const assetHonestBTC = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.5650");
  }, [assets]); // 1.3.5650

  const assetHonestXAU = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.5651");
  }, [assets]); // 1.3.5651

  // pool share assets
  const assetHonestBTSMoney = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.6430");
  }, [assets]); // 1.3.6430

  const assetHonestM2USD = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.6359");
  }, [assets]); // 1.3.6359

  const assetHonestUSDBTSMM = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.5901");
  }, [assets]); // 1.3.5901

  const assetHonestBTCBTSMM = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.5939");
  }, [assets]); // 1.3.5939

  const assetHonestBTCUSDMM = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.5938");
  }, [assets]); // 1.3.5938

  const assetHonestBTC2Money = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.6342");
  }, [assets]); // 1.3.6342

  const assetHonestM2XAU = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.6364");
  }, [assets]); // 1.3.6364

  const assetHonestXAU2USD = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.6610");
  }, [assets]); // 1.3.6610

  const assetHonestXAU2BTS = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.6608");
  }, [assets]); // 1.3.6608

  const assetHonestXAU2BTC = useMemo(() => {
    return assets.find((x) => x.asset_id === "1.3.6609");
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
          setDynamicDataBTS(data[10]);
          setDynamicDataHonestMoney(data[11]);
          setDynamicDataHonestUSD(data[12]);
          setDynamicDataHonestBTC(data[13]);
          setDynamicDataHonestXAU(data[14]);
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

    if (usr && usr.id && assetA && assetB) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
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
  }, [usr, assetA, assetB]);

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
              {!pools ? <p>{t("PoolForm:loadingPoolData")}</p> : null}
              {!assets ? <p>{t("PoolForm:loadingAssetData")}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>

    </>
  );
}
