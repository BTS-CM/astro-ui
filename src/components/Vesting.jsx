import React, { useSyncExternalStore, useMemo, useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from '@nanostores/react';

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useInitCache } from "@/nanoeffects/Init.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  $assetCacheBTS,
  $assetCacheTEST,
} from "@/stores/cache.ts";

import {
  createVestingBalanceStore
} from "@/nanoeffects/VestingBalances.ts";

import { humanReadableFloat } from "@/lib/common.js";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

function hoursTillExpiration(expirationTime) {
  var expirationDate = new Date(expirationTime);
  var currentDate = new Date();
  var difference = expirationDate - currentDate;
  var hours = Math.round(difference / 1000 / 60 / 60);
  return hours;
}

export default function Vesting(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  const currentNode = useStore($currentNode);

  const [showDialog, setShowDialog] = useState(false);
  const [chosenVestingBalance, setChosenVestingBalance] = useState(null);

  const [vestingType, setVestingType] = useState("cashback");

  const _assetsBTS = useSyncExternalStore($assetCacheBTS.subscribe, $assetCacheBTS.get, () => true);
  const _assetsTEST = useSyncExternalStore(
    $assetCacheTEST.subscribe,
    $assetCacheTEST.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", ["assets"]);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const vestingStore = useMemo(() => {
    if (!usr || !usr.chain || !usr.id || !currentNode) {
      return;
    }
    return createVestingBalanceStore([usr.chain, usr.id, currentNode ? currentNode.url : null]);
  }, [usr, currentNode]);

  const {
    data: vestingData,
    loading: vestingLoading,
    error: vestingError,
  } = useStore(vestingStore);

  const chosenVestingData = useMemo(() => {
    if (!vestingData || !vestingData.length) {
      return [];
    }
    return vestingData.filter((x) => x.balance_type === vestingType);
  }, [vestingData, vestingType]);

  const VestingRow = ({ index, style }) => {
    let res = chosenVestingData[index];
    const foundAsset = assets.find((x) => x.id === res.balance.asset_id);

    if (!res || !foundAsset) {
      return null;
    }

    const readableBalance = ` ${humanReadableFloat(res.balance.amount, foundAsset.precision)} ${ foundAsset.symbol }`;

    const policy = res.balance_type === "cashback"
      ? res.policy[1]
      : null;

    return <div style={{ ...style }} key={`acard-${res.id}`}>
            <Card className={`ml-2 mr-2 h-[${vestingType === "cashback" ? "165px" : "75px"}]`}>
              <CardHeader className="pb-0">
                <CardTitle>
                  <div className="grid grid-cols-2">
                    <div>
                      {readableBalance}
                    </div>
                    <div className="text-right">
                      ({res.id})
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm pb-3 mt-1">
                {
                  policy
                  ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                      <b>{t("Vesting:vesting_seconds")}</b> {policy.vesting_seconds}<br/>
                        <b>{t("Vesting:start_claim")}</b>: {new Date(policy.start_claim).toLocaleString()}<br/>
                      </div>
                      <div className="col-span-2">
                        <b>{t("Vesting:coin_seconds_earned")}</b>: {policy.coin_seconds_earned}<br/>
                        <b>{t("Vesting:coin_seconds_earned_last_update")}</b>: {new Date(policy.coin_seconds_earned_last_update).toLocaleString()}<br/>
                      </div>
                    </div>
                  )
                  : null
                }
              </CardContent>
              <CardFooter>
                  <Button
                    onClick={() => {
                      setChosenVestingBalance({res, readableBalance});
                      setShowDialog(true);
                    }}
                    className={res.balance_type === "cashback" ? "" : "mt-1"}
                  >
                    {t(`Vesting:${res.balance_type === "cashback" ? "claim_a" : "claim_b"}`)}
                  </Button>
              </CardFooter>
            </Card>
          </div>;
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{t("Vesting:card.title")}</CardTitle>
            <CardDescription>{t("Vesting:card.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                onClick={() => setVestingType("cashback")}
                variant={vestingType === "cashback" ? "" : "outline"}
                size="md"
              >
                {t("Vesting:cashback")}
              </Button>
              <Button
                onClick={() => setVestingType("market_fee_sharing")}
                variant={vestingType === "market_fee_sharing" ? "" : "outline"}
                size="md"
              >
                {t("Vesting:market_fees")}
              </Button>
            </div>

            <>
              {
                chosenVestingData && chosenVestingData.length
                ? (
                  <List
                    height={500}
                    itemCount={chosenVestingData.length}
                    itemSize={
                      vestingType === "cashback"
                      ? 175
                      : 135
                    }
                    className={`w-full mt-3`}
                  >
                    {VestingRow}
                  </List>
                )
                : null
              }
              {
                chosenVestingData && !chosenVestingData.length
                  ? t("Vesting:card.empty")
                  : null
              }
            </>

          </CardContent>
        </Card>
        {
          showDialog
          ? <DeepLinkDialog
              operationName="vesting_balance_withdraw"
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setShowDialog}
              key={`deeplink-dialog-${chosenVestingBalance.res.id}`}
              headerText={t("Vesting:dialogContent.header", {
                readable: chosenVestingBalance.readableBalance,
              })}
              trxJSON={[
                {
                  vesting_balance: chosenVestingBalance.res.id,
                  owner: usr.id,
                  amount: {
                    amount: chosenVestingBalance.res.balance.amount,
                    asset_id: chosenVestingBalance.res.balance.asset_id,
                  }
                }
              ]}
            />
          : null
        }
      </div>
    </div>
  );
}
