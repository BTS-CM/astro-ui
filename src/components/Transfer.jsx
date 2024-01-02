import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { useForm } from "react-hook-form";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Avatar as Av, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";

import {
  $assetCacheBTS,
  $assetCacheTEST,
  $poolCacheBTS,
  $poolCacheTEST,
  $marketSearchCacheBTS,
  $marketSearchCacheTEST,
  $globalParamsCacheBTS,
  $globalParamsCacheTEST,
} from "../stores/cache.ts";

import { humanReadableFloat, trimPrice, blockchainFloat } from "../lib/common";

import { createUserBalancesStore } from "../effects/User.ts";

import { Avatar } from "./Avatar.tsx";
import AccountSearch from "./AccountSearch.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

import AssetDropDown from "./Market/AssetDropDownCard.jsx";

export default function Transfer(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const [showDialog, setShowDialog] = useState(false);

  const [senderUser, setSenderUser] = useState();
  const [targetUser, setTargetUser] = useState();
  const [selectedAsset, setSelectedAsset] = useState();
  const [transferAmount, setTransferAmount] = useState(0);
  const [memoContents, setMemoContents] = useState();

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const _assetsBTS = useSyncExternalStore($assetCacheBTS.subscribe, $assetCacheBTS.get, () => true);
  const _assetsTEST = useSyncExternalStore(
    $assetCacheTEST.subscribe,
    $assetCacheTEST.get,
    () => true
  );

  const _globalParamsBTS = useSyncExternalStore(
    $globalParamsCacheBTS.subscribe,
    $globalParamsCacheBTS.get,
    () => true
  );

  const _globalParamsTEST = useSyncExternalStore(
    $globalParamsCacheTEST.subscribe,
    $globalParamsCacheTEST.get,
    () => true
  );

  const _marketSearchBTS = useSyncExternalStore(
    $marketSearchCacheBTS.subscribe,
    $marketSearchCacheBTS.get,
    () => true
  );

  const _marketSearchTEST = useSyncExternalStore(
    $marketSearchCacheTEST.subscribe,
    $marketSearchCacheTEST.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", ["assets", "globalParams", "marketSearch"]);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

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

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 0);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBalances(data);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, balanceCounter]);

  const [foundAsset, setFoundAsset] = useState();
  const found = useMemo(() => {
    if (selectedAsset) {
      return assets.filter((asset) => asset.symbol === selectedAsset);
    }
    return [];
  }, [selectedAsset, assets]);

  useEffect(() => {
    if (found && found.length) {
      setFoundAsset(found[0]);
    }
  }, [found]);

  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);

  useEffect(() => {
    if (senderUser) {
      // close dialog on sender account selection
      setSenderUser(false);
    }
  }, [senderUser]);

  useEffect(() => {
    if (targetUser) {
      // close dialog on target account selection
      setTargetUserDialogOpen(false);
    }
  }, [targetUser]);

  /*
    {selectedAsset && targetUser ? (
      <FormField
        control={form.control}
        name="memoField"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Optional memo</FormLabel>
            <FormControl
              onChange={(event) => {
                const input = event.target.value;
                setMemoContents(input);
              }}
            >
              <Input
                label={`Memo field`}
                value={memoContents}
                placeholder={memoContents}
                className="mb-1"
              />
            </FormControl>
            <FormDescription>
              An encrypted message for {targetUser.name}'s eyes
              only.
              <br /> Often used by exchanges and 3rd party
              services.
            </FormDescription>
            
          </FormItem>
        )}
      />
    ) : null}
  */

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("Transfer:transferAssets")}</CardTitle>
              <CardDescription>
                <p>{t("Transfer:sendFundsDescription")}</p>
                <p className="mt-1">{t("Transfer:transferLimitations")}</p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={() => {
                    setShowDialog(true);
                    event.preventDefault();
                  }}
                >
                  <FormField
                    control={form.control}
                    name="account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Transfer:sendingAccount")}</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-8 gap-2">
                            <div className="col-span-1 ml-5">
                              <Avatar
                                size={40}
                                name={usr && usr.username ? usr.username : "x"}
                                extra="Sender"
                                expression={{
                                  eye: "normal",
                                  mouth: "open",
                                }}
                                colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                              />
                            </div>
                            <div className="col-span-7">
                              <Input
                                disabled
                                className="mb-1 mt-1"
                                value={`${usr && usr.username ? usr.username : "?"} (${
                                  usr && usr.id ? usr.id : "?"
                                })`}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>{t("Transfer:sendingAccountDescription")}</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetAccount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Transfer:targetAccount")}</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-8 mt-4">
                            <div className="col-span-1 ml-5">
                              {targetUser && targetUser.name ? (
                                <Avatar
                                  size={40}
                                  name={targetUser.name}
                                  extra="Target"
                                  expression={{
                                    eye: "normal",
                                    mouth: "open",
                                  }}
                                  colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                                />
                              ) : (
                                <Av>
                                  <AvatarFallback>?</AvatarFallback>
                                </Av>
                              )}
                            </div>
                            <div className="col-span-5">
                              <Input
                                disabled
                                placeholder={
                                  targetUser && targetUser.name
                                    ? `${targetUser.name} (${targetUser.id})`
                                    : "Bitshares account (1.2.x)"
                                }
                                className="mb-1 mt-1"
                              />
                            </div>
                            <div className="col-span-2">
                              <Dialog
                                open={targetUserDialogOpen}
                                onOpenChange={(open) => {
                                  setTargetUserDialogOpen(open);
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button variant="outline" className="ml-3 mt-1">
                                    {targetUser
                                      ? t("Transfer:changeTarget")
                                      : t("Transfer:provideTarget")}
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
                                    excludedUsers={
                                      usr && usr.username && usr.username.length ? [usr] : []
                                    }
                                    setChosenAccount={setTargetUser}
                                  />
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          {!targetUser || !targetUser.name
                            ? t("Transfer:targetAccountDescription")
                            : t("Transfer:targetAccountDescriptionWithName", {
                                name: targetUser.name,
                              })}
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetAsset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Transfer:assetToTransfer")}</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-8 mt-4">
                            <div className="col-span-1 ml-5">
                              {!selectedAsset || !foundAsset ? (
                                <Av>
                                  <AvatarFallback>?</AvatarFallback>
                                </Av>
                              ) : null}
                              {foundAsset ? (
                                <Av>
                                  <AvatarFallback>
                                    <div className="text-sm">
                                      {foundAsset.bitasset_data_id ? "MPA" : "UIA"}
                                    </div>
                                  </AvatarFallback>
                                </Av>
                              ) : null}
                            </div>
                            <div className="col-span-5">
                              {!selectedAsset || !foundAsset ? (
                                <Input
                                  disabled
                                  placeholder="Bitshares asst (1.3.x)"
                                  className="mb-1 mt-1"
                                />
                              ) : null}
                              {foundAsset ? (
                                <Input
                                  disabled
                                  placeholder={`${foundAsset.symbol} (${foundAsset.id})`}
                                  className="mb-1 mt-1"
                                />
                              ) : null}
                            </div>
                            <div className="col-span-2 mt-1 ml-3">
                              <AssetDropDown
                                assetSymbol={selectedAsset ?? ""}
                                assetData={null}
                                storeCallback={setSelectedAsset}
                                otherAsset={null}
                                marketSearch={marketSearch}
                                type={null}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          {t("Transfer:assetToTransferDescription")}
                        </FormDescription>
                        <FormMessage>
                          {foundAsset &&
                          balances &&
                          !balances.map((x) => x.asset_id).includes(foundAsset.id)
                            ? t("Transfer:noAssetInAccount", { username: usr.username })
                            : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {selectedAsset && targetUser ? (
                    <FormField
                      control={form.control}
                      name="transferAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("Transfer:amountAvailableToTransfer", {
                              asset: selectedAsset ?? "???",
                            })}
                          </FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              label={t("Transfer:amountAvailableToTransferLabel")}
                              value={
                                foundAsset &&
                                balances &&
                                balances.find((x) => x.asset_id === foundAsset.id)
                                  ? `${humanReadableFloat(
                                      balances.find((x) => x.asset_id === foundAsset.id).amount,
                                      foundAsset.precision
                                    )} ${foundAsset.symbol}`
                                  : "0"
                              }
                              className="mb-1"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("Transfer:maximumAmountDescription", { asset: selectedAsset })}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {selectedAsset && targetUser ? (
                    <FormField
                      control={form.control}
                      name="transferAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("Transfer:amountToTransfer", { asset: selectedAsset ?? "???" })}
                          </FormLabel>
                          <FormControl
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                              if (regex.test(input)) {
                                setTransferAmount(input);
                              }
                            }}
                          >
                            <Input
                              label={t("Transfer:amountToTransferLabel")}
                              value={transferAmount}
                              placeholder={transferAmount}
                              className="mb-1"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("Transfer:amountToTransferDescription")}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {selectedAsset && targetUser ? (
                    <FormField
                      control={form.control}
                      name="networkFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Transfer:networkFee")}</FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              placeholder={`${t("Transfer:networkFeePlaceholder", { fee: fee })}`}
                              className="mb-3 mt-3"
                            />
                          </FormControl>
                          {usr.id === usr.referrer ? (
                            <FormMessage>
                              {t("Transfer:rebate", { rebate: trimPrice(fee * 0.8, 5) })}
                            </FormMessage>
                          ) : null}
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {!transferAmount ? (
                    <Button className="mt-5 mb-3" variant="outline" disabled type="submit">
                      {t("Transfer:submit")}
                    </Button>
                  ) : (
                    <Button className="mt-5 mb-3" variant="outline" type="submit">
                      {t("Transfer:submit")}
                    </Button>
                  )}
                </form>
              </Form>
              {showDialog ? (
                <DeepLinkDialog
                  operationName="transfer"
                  username={usr.username}
                  usrChain={usr.chain}
                  userID={usr.id}
                  dismissCallback={setShowDialog}
                  key={`Sending${transferAmount}${selectedAsset}to${targetUser.name}from${usr.username}`}
                  headerText={t("Transfer:sendingHeader", {
                    amount: transferAmount,
                    symbol: foundAsset.symbol,
                    id: foundAsset.id,
                    target: targetUser.name,
                    user: usr.username,
                  })}
                  trxJSON={[
                    {
                      fee: {
                        amount: 0,
                        asset_id: "1.3.0",
                      },
                      from: usr.id,
                      to: targetUser.id,
                      amount: {
                        amount: blockchainFloat(transferAmount, foundAsset.precision).toFixed(0),
                        asset_id: foundAsset.id,
                      },
                      extensions: [],
                    },
                  ]}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 mt-5 gap-5">
          {targetUser && targetUser.name ? (
            <div className="col-span-1">
              <Card>
                <CardHeader className="pb-0 mb-0">
                  <CardTitle>{t("Transfer:doubleCheckTitle")}</CardTitle>
                  <CardDescription>{t("Transfer:doubleCheckDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Transfer:doubleCheckFormInputs")}</li>
                    <li>{t("Transfer:validateBeetPrompt")}</li>
                    <li>
                      <ExternalLink
                        type="text"
                        classnamecontents=""
                        hyperlink={`https://blocksights.info/#/accounts/${targetUser.name}`}
                        text={t("Transfer:blocksightsLink", { name: targetUser.name })}
                      />
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : null}
          {targetUser && targetUser.name ? (
            <div className="col-span-1">
              <Card>
                <CardHeader className="pb-0 mb-0">
                  <CardTitle>{t("Transfer:scamAlertTitle")}</CardTitle>
                  <CardDescription>{t("Transfer:scamAlertDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Transfer:scamAlertPoint1")}</li>
                    <li>{t("Transfer:scamAlertPoint2")}</li>
                    <li>{t("Transfer:scamAlertPoint3")}</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
