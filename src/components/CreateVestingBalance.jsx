import React, { useSyncExternalStore, useMemo, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker, TimePicker } from "@/components/ui/datetime-picker";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import AccountSearch from "@/components/AccountSearch.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import { humanReadableFloat, blockchainFloat } from "@/lib/common.js";

export default function CreateVestingBalance(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  const currentNode = useStore($currentNode);

  const [showDialog, setShowDialog] = useState(false);

  const { _assetsBTS, _assetsTEST, _marketSearchBTS, _marketSearchTEST } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);
  
  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
        return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);

  const [policy, setPolicy] = useState("ccd"); // Coin Days Destroyed || Linear Vesting with Cliff

  const [targetUser, setTargetUser] = useState();
  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [asset, setAsset] = useState();

  const assetData = useMemo(() => {
    if (assets && assets.length && asset) {
      const found = assets.find((_asset) => _asset.symbol === asset);
      return found;
    }
  }, [assets, asset]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id, currentNode ? currentNode.url : null]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = data.filter((balance) => assets.find((x) => x.id === balance.asset_id));
          setUsrBalances(filteredData);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr]);

  const chosenAssetBalance = useMemo(() => {
    if (usrBalances && assetData) {
      const found = usrBalances.find((_balance) => _balance.asset_id === assetData.id);
      if (!found) {
        return 0;
      }
      const assetBalance = humanReadableFloat(found.amount, assetData.precision);
      return assetBalance;
    }
  }, [usrBalances, assetData]);

  // ccd & lvc
  const [beginDateTime, setBeginDateTime] = useState();

  // ccd policy
  const [vestingSeconds, setVestingSeconds] = useState(0);

  // lvc policy
  const [vestingCliffSeconds, setVestingCliffSeconds] = useState(0);
  const [vestingDurationSeconds, setVestingDurationSeconds] = useState(0);

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{t("CreateVestingBalance:card.title")}</CardTitle>
            <CardDescription>{t("CreateVestingBalance:card.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 mt-1 mb-2">
              <span className="col-span-2">
                <HoverInfo
                  header={t("CreateVestingBalance:policy")}
                  content={t("CreateVestingBalance:policyDescription")}
                  type="header"
                />
              </span>
              <Button
                onClick={() => setPolicy("ccd")}
                variant={policy === "ccd" ? "" : "outline"}
                size="md"
              >
                {t("CreateVestingBalance:ccd")}
              </Button>
              <Button
                onClick={() => setPolicy("lvc")}
                variant={policy === "lvc" ? "" : "outline"}
                size="md"
              >
                {t("CreateVestingBalance:lvc")}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="col-span-2">
                <HoverInfo
                  header={t("CreateVestingBalance:target")}
                  content={t("CreateVestingBalance:targetDescription")}
                  type="header"
                />
              </span>
              <Input disabled placeholder={targetUser ? `${targetUser.name} (${targetUser.id})` : "??? (1.2.x)"} />
              <div className="grid grid-cols-2 gap-2">
                <Dialog
                  open={targetUserDialogOpen}
                  onOpenChange={(open) => {
                    setTargetUserDialogOpen(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="hover:shadow-lg">
                      {t("CreateVestingBalance:selectAccount")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[375px] bg-white">
                    <DialogHeader>
                      <DialogTitle>
                        {!usr || !usr.chain
                          ? t("Transfer:bitsharesAccountSearch")
                          : null}
                        {usr && usr.chain === "bitshares"
                          ? t("Transfer:bitsharesAccountSearchBTS")
                          : null}
                        {usr && usr.chain !== "bitshares"
                          ? t("Transfer:bitsharesAccountSearchTEST")
                          : null}
                      </DialogTitle>
                      <DialogDescription>
                        {t("Transfer:searchingForAccount")}
                      </DialogDescription>
                    </DialogHeader>
                    <AccountSearch
                      chain={usr && usr.chain ? usr.chain : "bitshares"}
                      excludedUsers={[]}
                      setChosenAccount={(_account) => {
                        if (_account) {
                          //console.log({ _account, usr });
                          setTargetUser(_account);
                        }
                        setTargetUserDialogOpen(false);
                      }}
                    />
                  </DialogContent>
                </Dialog>
                <Button
                  onClick={() => {
                    setTargetUser({ id: usr.id, name: usr.username });
                  }}
                  variant="outline"
                  className="hover:shadow-lg"
                >
                  {t("CreateVestingBalance:myAccount")}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <span className="col-span-2">
                <HoverInfo
                  header={t("CreateVestingBalance:asset")}
                  content={t("CreateVestingBalance:assetDescription")}
                  type="header"
                />
              </span>
              <Input
                type="text"
                placeholder={assetData ? `${assetData.symbol} (${assetData.id})` : ""}
                disabled
              />
              <AssetDropDown
                assetSymbol={asset ?? ""}
                assetData={null}
                storeCallback={setAsset}
                otherAsset={null}
                marketSearch={marketSearch}
                type={"backing"}
                chain={usr && usr.chain ? usr.chain : "bitshares"}
                balances={usrBalances}
              />
            </div>
            <div className="grid grid-cols-2 mt-1">
              <HoverInfo
                header={t("CreateVestingBalance:amount")}
                content={t("CreateVestingBalance:amountDescription")}
                type="header"
              />
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="mt-2 ml-1 hover:shadow-md"
                    onClick={() => {
                      setAmount(chosenAssetBalance);
                    }}
                    variant="outline"
                  >
                    {t("Predictions:issueDialog.balance")}
                  </Button>
                  {
                    asset && amount > chosenAssetBalance
                      ? <Badge variant="destructive" className="h-9 mt-2">
                          <ExclamationTriangleIcon className="mr-2"/> {t("Predictions:insufficient_funds")}
                        </Badge>
                      : null
                  }
                </div>
              </div>
            </div>
            {
              policy === "ccd"
                ? <div className="grid grid-cols-1 mt-1">
                    <HoverInfo
                      header={t("CreateVestingBalance:startClaim")}
                      content={t("CreateVestingBalance:startClaimDescription")}
                      type="header"
                    />
                    <div className="grid grid-cols-2 gap-3 mt-2 mb-1">
                      <DateTimePicker
                        granularity="day"
                        value={beginDateTime}
                        onChange={(newDate) => {
                            const now = new Date();
                            if (newDate >= now) {
                              setBeginDateTime(newDate)
                            } else {
                                now.setDate(now.getDate() + 7); // default a week ahead
                                setBeginDateTime(now);
                            }
                        }}
                      />
                      <TimePicker date={beginDateTime} onChange={setBeginDateTime} />
                    </div>
                    <HoverInfo
                      header={t("CreateVestingBalance:vestingSeconds")}
                      content={t("CreateVestingBalance:vestingSecondsDescription")}
                      type="header"
                    />
                    <Input
                      type="number"
                      value={vestingSeconds}
                      onChange={(e) => setVestingSeconds(e.target.value)}
                      className="w-1/2 mt-2"
                    />
                  </div>
                : null
            }
            {
              policy === "lvc"
                ? <div className="grid grid-cols-1 mt-1">
                    <HoverInfo
                      header={t("CreateVestingBalance:beginTime")}
                      content={t("CreateVestingBalance:beginTimeDescription")}
                      type="header"
                    />
                    <div className="grid grid-cols-2 gap-3 mt-2 mb-1">
                      <DateTimePicker
                        granularity="day"
                        value={beginDateTime}
                        onChange={(newDate) => {
                            const now = new Date();
                            if (newDate >= now) {
                              setBeginDateTime(newDate)
                            } else {
                                now.setDate(now.getDate() + 7); // default a week ahead
                                setBeginDateTime(now);
                            }
                        }}
                      />
                      <TimePicker date={beginDateTime} onChange={setBeginDateTime} />
                    </div>
                    <HoverInfo
                      header={t("CreateVestingBalance:vestingCliffSeconds")}
                      content={t("CreateVestingBalance:vestingCliffSecondsDescription")}
                      type="header"
                    />
                    <Input
                      type="number"
                      value={vestingCliffSeconds}
                      onChange={(e) => setVestingCliffSeconds(e.target.value)}
                      className="w-1/2 mt-2 mb-1"
                    />
                    <HoverInfo
                      header={t("CreateVestingBalance:vestingDurationSeconds")}
                      content={t("CreateVestingBalance:vestingDurationSecondsDescription")}
                      type="header"
                    />
                    <Input
                      type="number"
                      value={vestingDurationSeconds}
                      onChange={(e) => setVestingDurationSeconds(e.target.value)}
                      className="w-1/2 mt-2"
                    />
                  </div>
                : null
            }
            <Button
                className="h-8 mt-4"
                onClick={() => {
                    setShowDialog(true)
                }}
            >
                {t("CreatePrediction:buttons.submit")}
            </Button>
          </CardContent>
        </Card>
        {
          showDialog
            ? <DeepLinkDialog
                operationNames={["vesting_balance_create"]}
                username={usr.username}
                usrChain={usr.chain}
                userID={usr.id}
                dismissCallback={setShowDialog}
                key={`deeplink-dialog`}
                headerText={t("CreateVestingBalance:dialogHeader")}
                trxJSON={[
                  {
                    creator: usr.id,
                    owner: targetUser.id,
                    amount: {
                      amount: blockchainFloat(amount, assetData.precision),
                      asset_id: assetData.id
                    },
                    policy: policy === "ccd"
                      ? [1, {
                        start_claim: Math.floor(beginDateTime.getTime()) / 1000,
                        vesting_seconds: parseInt(vestingSeconds)
                      }]
                      : [0, {
                        begin_timestamp: Math.floor(beginDateTime.getTime()) / 1000,
                        vesting_cliff_seconds: parseInt(vestingCliffSeconds),
                        vesting_duration_seconds: parseInt(vestingDurationSeconds)
                      }]
                  }
                ]}
              />
            : null
        }
      </div>
    </div>
  );
}
