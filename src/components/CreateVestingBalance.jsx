import React, {
  useSyncExternalStore,
  useMemo,
  useEffect,
  useState,
} from "react";
import { useStore } from "@nanostores/react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "./Avatar.tsx";
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
import { accountSearch } from "@/nanoeffects/UserSearch.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import AccountSearch from "@/components/AccountSearch.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import { humanReadableFloat, blockchainFloat } from "@/lib/common.js";

import { PiggyBank, User, Coins, Calendar, Clock, Shield, Timer, ArrowRight, Info, Zap } from "lucide-react";

export default function CreateVestingBalance(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const [showDialog, setShowDialog] = useState(false);

  const { _assetsBTS, _assetsTEST, _marketSearchBTS, _marketSearchTEST } =
    properties;

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
    async function fetchUsrBalances() {
      if (usr && usr.id) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setUsrBalances(filteredData);
          }
        });
      }
    }

    fetchUsrBalances();
  }, [usr]);

  const chosenAssetBalance = useMemo(() => {
    if (usrBalances && assetData) {
      const found = usrBalances.find(
        (_balance) => _balance.asset_id === assetData.id
      );
      if (!found) {
        return 0;
      }
      const assetBalance = humanReadableFloat(
        found.amount,
        assetData.precision
      );
      return assetBalance;
    }
  }, [usrBalances, assetData]);
  
  const [beginDateTime, setBeginDateTime] = useState();

  const isSubmitDisabled = useMemo(() => {
    // require target account, asset selection, positive amount, and a begin date
    if (!targetUser) return true;
    if (!asset || !assetData) return true;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return true;
    if (!beginDateTime) return true;
    return false;
  }, [targetUser, asset, assetData, amount, beginDateTime]);

  // ccd & lvc

  // ccd policy
  const [vestingSeconds, setVestingSeconds] = useState(0);

  // lvc policy
  const [vestingCliffSeconds, setVestingCliffSeconds] = useState(0);
  const [vestingDurationSeconds, setVestingDurationSeconds] = useState(0);

  // Prefill target account from URL query (?to=<name>)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!usr || !usr.chain) return;
    const params = new URLSearchParams(window.location.search);
    const toName = params.get("to");
    if (toName && /^[a-zA-Z0-9.-]+$/.test(toName)) {
      accountSearch(usr.chain, toName, currentNode ? currentNode.url : null)
        .then((acct) => {
          if (acct && acct.id && acct.name) {
            setTargetUser({ id: acct.id, name: acct.name });
          }
        })
        .catch(() => {});
    }
  }, [usr, currentNode]);

  return (
    <div className="container mx-auto mt-5 mb-5 w-full md:w-1/2">
      <div className="grid grid-cols-1 gap-3">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))]" />
          <div className="absolute top-8 left-8 w-32 h-32 bg-[hsl(var(--accent-1)/0.1)] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-8 right-8 w-40 h-40 bg-[hsl(var(--accent-1)/0.1)] rounded-full blur-3xl pointer-events-none" />
          
          <CardHeader className="pb-1 relative z-10">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] shadow-lg shadow-[color:hsl(var(--accent-1)/0.3)]">
                <Clock className="w-5 h-5 text-[hsl(var(--accent-1-gradFg))]" />
              </div>
              {t("CreateVestingBalance:card.title")}
            </CardTitle>
            <CardDescription>
              {t("CreateVestingBalance:card.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
              <div className="grid grid-cols-1 gap-3">
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
                    className={policy === "ccd" 
                      ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] shadow-lg shadow-[color:hsl(var(--accent-1)/0.3)]" 
                      : "border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] transition-colors"}
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    {t("CreateVestingBalance:ccd")}
                  </Button>
                  <Button
                    onClick={() => setPolicy("lvc")}
                    variant={policy === "lvc" ? "" : "outline"}
                    size="md"
                    className={policy === "lvc" 
                      ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-lg shadow-[color:hsl(var(--accent-1)/0.3)]" 
                      : "border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] transition-colors"}
                  >
                    <Timer className="w-4 h-4 mr-2" />
                    {t("CreateVestingBalance:lvc")}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <span className="col-span-1">
                  <HoverInfo
                    header={
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[hsl(var(--accent-1-fg))]" />
                        {t("CreateVestingBalance:target")}
                      </span>
                    }
                    content={t("CreateVestingBalance:targetDescription")}
                    type="header"
                  />
                </span>
                <span className="col-span-1">
                  <div className="grid grid-cols-2 gap-2">
                    <Dialog
                      open={targetUserDialogOpen}
                      onOpenChange={(open) => {
                        setTargetUserDialogOpen(open);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" className="hover:shadow-lg border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] transition-colors">
                          {t("CreateVestingBalance:selectAccount")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[375px] bg-card">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] rounded-t-lg" />
                        <div className="absolute top-8 left-8 w-32 h-32 bg-[hsl(var(--accent-1)/0.1)] rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-8 right-8 w-40 h-40 bg-[hsl(var(--accent-1)/0.1)] rounded-full blur-3xl pointer-events-none" />
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] shadow-lg shadow-[color:hsl(var(--accent-1)/0.3)]">
                              <User className="w-4 h-4 text-[hsl(var(--accent-1-gradFg))]" />
                            </div>
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
                      className="hover:shadow-lg border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] transition-colors"
                    >
                      {t("CreateVestingBalance:myAccount")}
                    </Button>
                  </div>
                </span>
                <span className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                      {targetUser && targetUser.name ? (
                        <Avatar
                          size={40}
                          name={targetUser.name}
                          extra="Target"
                          expression={{
                            eye: "normal",
                            mouth: "open",
                          }}
                          colors={[
                            "#92A1C6",
                            "#146A7C",
                            "#F0AB3D",
                            "#C271B4",
                            "#C20D90",
                          ]}
                        />
                      ) : (
                        <Av>
                          <AvatarFallback className="bg-card/80 text-muted-foreground text-xs">
                            ?
                          </AvatarFallback>
                        </Av>
                      )}
                    </div>
                    <Input
                      disabled
                      placeholder={
                        targetUser
                          ? `${targetUser.name} (${targetUser.id})`
                          : "??? (1.2.x)"
                      }
                      className="flex-grow bg-[hsl(var(--accent-1)/0.05)] border-[hsl(var(--accent-1)/0.2)]"
                    />
                  </div>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-1">
                <span className="col-span-1">
                  <HoverInfo
                    header={
                      <span className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[hsl(var(--accent-1-fg))]" />
                        {t("CreateVestingBalance:asset")}
                      </span>
                    }
                    content={t("CreateVestingBalance:assetDescription")}
                    type="header"
                  />
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <span className="col-span-1">
                    <Input
                      type="text"
                      placeholder={
                        assetData ? `${assetData.symbol} (${assetData.id})` : ""
                      }
                      disabled
                      className="bg-[hsl(var(--accent-1)/0.05)] border-[hsl(var(--accent-1)/0.2)]"
                    />
                  </span>
                  <span className="col-span-1">
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
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 mt-1">
                <div className="flex items-start justify-between w-full">
                  <div className="text-left w-full">
                    <HoverInfo
                      header={
                        <span className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-[hsl(var(--accent-2-fg))]" />
                          {t("CreateVestingBalance:amount")}
                        </span>
                      }
                      content={t("CreateVestingBalance:amountDescription")}
                      type="header"
                    />
                    {asset && chosenAssetBalance !== undefined && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("CreateVestingBalance:currentBalance", {
                          balance: chosenAssetBalance,
                          symbol: assetData?.symbol || "",
                        })}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <Button
                      className="mt-2 ml-1 hover:shadow-md border-[hsl(var(--accent-2)/0.3)] hover:bg-[hsl(var(--accent-2)/0.1)] hover:text-[hsl(var(--accent-2-fg))] transition-colors"
                      onClick={() => {
                        setAmount(chosenAssetBalance);
                      }}
                      variant="outline"
                      disabled={!asset}
                    >
                      {t("CreateVestingBalance:useBalance")}
                    </Button>
                  </div>
                </div>
                <span className="col-span-2">
                  <Input
                    type="number"
                    value={amount}
                    disabled={!asset}
                    min="0"
                    step={assetData ? `0.${"0".repeat(assetData.precision - 1)}1` : "0.01"}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val < 0) return;
                      if (assetData && e.target.value.includes(".")) {
                        const decimals = e.target.value.split(".")[1];
                        if (decimals && decimals.length > assetData.precision) {
                          return;
                        }
                      }
                      setAmount(e.target.value);
                    }}
                    className="mt-2 bg-[hsl(var(--accent-2)/0.05)] border-[hsl(var(--accent-2)/0.2)]"
                  />
                </span>
              </div>
              {policy === "ccd" ? (
                <div className="grid grid-cols-1 mt-1 p-4 bg-gradient-to-r from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-1)/0.1)] border border-[hsl(var(--accent-1)/0.2)] rounded-lg">
                  <HoverInfo
                    header={
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[hsl(var(--accent-1-fg))]" />
                        {t("CreateVestingBalance:startClaim")}
                      </span>
                    }
                    content={t("CreateVestingBalance:startClaimDescription")}
                    type="header"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 mb-1">
                    <DateTimePicker
                      granularity="day"
                      value={beginDateTime}
                      onChange={(newDate) => {
                        const now = new Date();
                        if (newDate >= now) {
                          setBeginDateTime(newDate);
                        } else {
                          now.setDate(now.getDate() + 7); // default a week ahead
                          setBeginDateTime(now);
                        }
                      }}
                    />
                    <TimePicker
                      date={beginDateTime}
                      onChange={setBeginDateTime}
                    />
                  </div>
                  <HoverInfo
                    header={
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[hsl(var(--accent-1-fg))]" />
                        {t("CreateVestingBalance:vestingSeconds")}
                      </span>
                    }
                    content={t(
                      "CreateVestingBalance:vestingSecondsDescription"
                    )}
                    type="header"
                  />
                  <Input
                    type="number"
                    value={vestingSeconds}
                    onChange={(e) => setVestingSeconds(e.target.value)}
                    min="0"
                    className="w-1/2 mt-2 bg-[hsl(var(--accent-1)/0.05)] border-[hsl(var(--accent-1)/0.2)]"
                  />
                </div>
              ) : null}
              {policy === "lvc" ? (
                <div className="grid grid-cols-1 mt-1 p-4 bg-gradient-to-r from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-2)/0.1)] border border-[hsl(var(--accent-1)/0.2)] rounded-lg">
                  <HoverInfo
                    header={
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[hsl(var(--accent-1-fg))]" />
                        {t("CreateVestingBalance:beginTime")}
                      </span>
                    }
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
                          setBeginDateTime(newDate);
                        } else {
                          now.setDate(now.getDate() + 7); // default a week ahead
                          setBeginDateTime(now);
                        }
                      }}
                    />
                    <TimePicker
                      date={beginDateTime}
                      onChange={setBeginDateTime}
                    />
                  </div>
                  <HoverInfo
                    header={
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[hsl(var(--accent-2-fg))]" />
                        {t("CreateVestingBalance:vestingCliffSeconds")}
                      </span>
                    }
                    content={t(
                      "CreateVestingBalance:vestingCliffSecondsDescription"
                    )}
                    type="header"
                  />
                  <Input
                    type="number"
                    value={vestingCliffSeconds}
                    onChange={(e) => setVestingCliffSeconds(e.target.value)}
                    min="0"
                    className="w-1/2 mt-2 mb-1 bg-[hsl(var(--accent-1)/0.05)] border-[hsl(var(--accent-1)/0.2)]"
                  />
                  <HoverInfo
                    header={
                      <span className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-[hsl(var(--accent-1-fg))]" />
                        {t("CreateVestingBalance:vestingDurationSeconds")}
                      </span>
                    }
                    content={t(
                      "CreateVestingBalance:vestingDurationSecondsDescription"
                    )}
                    type="header"
                  />
                  <Input
                    type="number"
                    value={vestingDurationSeconds}
                    onChange={(e) => setVestingDurationSeconds(e.target.value)}
                    min="0"
                    className="w-1/2 mt-2 bg-[hsl(var(--accent-1)/0.05)] border-[hsl(var(--accent-1)/0.2)]"
                  />
                </div>
              ) : null}
              <Button
                className="h-10 mt-4 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-lg shadow-[color:hsl(var(--accent-1)/0.3)] transition-all duration-300 hover:shadow-xl hover:shadow-[color:hsl(var(--accent-1)/0.4)] hover:-translate-y-0.5"
                onClick={() => {
                  if (isSubmitDisabled) return;
                  setShowDialog(true);
                }}
                disabled={isSubmitDisabled}
              >
                {t("CreateUIA:buttons.submit")}
              </Button>
            </div>
          </CardContent>
        </Card>
        {showDialog ? (
          <DeepLinkDialog
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
                  asset_id: assetData.id,
                },
                policy:
                  policy === "ccd"
                    ? [
                        1,
                        {
                          start_claim:
                            Math.floor(beginDateTime.getTime()) / 1000,
                          vesting_seconds: parseInt(vestingSeconds),
                        },
                      ]
                    : [
                        0,
                        {
                          begin_timestamp:
                            Math.floor(beginDateTime.getTime()) / 1000,
                          vesting_cliff_seconds: parseInt(vestingCliffSeconds),
                          vesting_duration_seconds: parseInt(
                            vestingDurationSeconds
                          ),
                        },
                      ],
              },
            ]}
          />
        ) : null}
      </div>
    </div>
  );
}
