import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex as toHex } from "@noble/hashes/utils";
import { FixedSizeList as List } from "react-window";
import { useStore } from "@nanostores/react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Avatar as Av, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { blockchainFloat, humanReadableFloat } from "@/lib/common.js";

import { $currentUser } from "@/stores/users.ts";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

import { Avatar } from "./Avatar.tsx";

function hoursTillExpiration(expirationTime) {
  // Parse the expiration time
  var expirationDate = new Date(expirationTime);

  // Get the current date and time
  var currentDate = new Date();

  // Calculate the difference in milliseconds
  var difference = expirationDate - currentDate;

  // Convert the difference to hours and round it to the nearest integer
  var hours = Math.round(difference / 1000 / 60 / 60);

  return hours;
}

export default function CreditOffer(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  const blocklist = useSyncExternalStore($blockList.subscribe, $blockList.get, () => true);
  const currentNode = useStore($currentNode);

  const {
    _assetsBTS,
    _assetsTEST,
    _globalParamsBTS,
    _globalParamsTEST,
    _offersBTS,
    _offersTEST,
    _marketSearchBTS,
    _marketSearchTEST
  } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assetIssuers = useMemo(() => {
    if (
      _chain &&
      ((_marketSearchBTS && _marketSearchBTS.length) ||
        (_marketSearchTEST && _marketSearchTEST.length))
    ) {
      const targetCache = _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
      let mappedCache = targetCache.map((x) => {
        const split = x.u.split("(");
        const name = split[0].replace(" ", "");
        const id = split[1].replace(")", "").replace(" ", "");
        return { name, id };
      });

      let uniqueEntries = new Set();
      let filteredCache = mappedCache.filter((entry) => {
        const key = `${entry.name}-${entry.id}`;
        if (!uniqueEntries.has(key)) {
          uniqueEntries.add(key);
          return true;
        }
        return false;
      });

      return filteredCache;
    }
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const offers = useMemo(() => {
    if (_chain && (_offersBTS || _offersTEST)) {
      return _chain === "bitshares" ? _offersBTS : _offersTEST;
    }
    return [];
  }, [_offersBTS, _offersTEST, _chain]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 72);
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [error, setError] = useState(false);
  const [foundAsset, setFoundAsset] = useState(null);
  const [relevantOffer, setRelevantOffer] = useState(null);
  useEffect(() => {
    async function parseUrlAssets() {
      //console.log("Parsing url parameters");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const id = params.id;

      if (!id) {
        console.log("Credit offer parameter not found");
        return null;
      }

      return id;
    }

    if (offers && offers.length) {
      parseUrlAssets().then((id) => {
        if (!id) {
          setError(true);
          return;
        }

        const offerStore = createObjectStore([
          _chain,
          JSON.stringify([id]),
          currentNode ? currentNode.url : null,
        ]);
        offerStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const foundOffer = data[0];
            if (foundOffer) {
              if (_chain === "bitshares") {
                const hashedID = toHex(sha256(foundOffer.owner_account));
                if (blocklist.users.includes(hashedID)) {
                  // Credit offer is owned by a banned user
                  setError(true);
                  setRelevantOffer();
                  setFoundAsset();
                  return;
                }
              }

              setRelevantOffer(foundOffer);
              const foundAsset = assets.find((asset) => asset.id === foundOffer.asset_type);
              setError(false);
              setFoundAsset(foundAsset);
            }
          }
          if (error) {
            setError(true);
          }
        });
      });
    }
  }, [_chain, offers]);

  const [usrBalances, setUsrBalances] = useState();
  const [balanceAssetIDs, setBalanceAssetIDs] = useState([]);
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
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
          setBalanceAssetIDs(filteredData.map((x) => x.asset_id));
          setUsrBalances(filteredData);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr]);

  const [chosenCollateral, setChosenCollateral] = useState(null);
  const acceptedCollateral = useMemo(() => {
    if (relevantOffer && relevantOffer.acceptable_collateral) {
      return relevantOffer.acceptable_collateral
        .map((asset) => asset[0])
        .map((x) => {
          const currentAsset = assets.find((y) => y.id === x);
          return currentAsset;
        });
    }
    return [];
  }, [relevantOffer, assets]);

  const Row = ({ index, style }) => {
    const collateralAsset = acceptedCollateral[index];
    return (
      <SelectItem value={collateralAsset.id} style={style}>
        {`${collateralAsset.symbol} (${collateralAsset.id})`}
      </SelectItem>
    );
  };

  const availableAmount = useMemo(() => {
    if (relevantOffer && foundAsset) {
      return humanReadableFloat(relevantOffer.current_balance, foundAsset.precision);
    } else {
      return 0;
    }
  }, [relevantOffer, foundAsset]);

  const minAmount = useMemo(() => {
    if (relevantOffer && foundAsset) {
      return humanReadableFloat(relevantOffer.min_deal_amount, foundAsset.precision);
    } else {
      return 1;
    }
  }, [relevantOffer, foundAsset]);

  const [inputValue, setInputValue] = useState(minAmount ?? 1);
  const [finalBorrowAmount, setFinalBorrowAmount] = useState();

  const collateralInfo = useMemo(() => {
    if (chosenCollateral && balanceAssetIDs && assets && usrBalances) {
      const collateralAsset = assets.find((asset) => asset.id === chosenCollateral);
      const collateralBalance = usrBalances.find(
        (balance) => balance.asset_id === chosenCollateral
      );

      return {
        amount: collateralBalance
          ? humanReadableFloat(collateralBalance.amount, collateralAsset.precision)
          : 0,
        holding: balanceAssetIDs.includes(chosenCollateral),
        symbol: collateralAsset.symbol,
        precision: collateralAsset.precision,
        id: collateralAsset.id,
        isBitasset: collateralAsset.bitasset_data_id ? true : false,
      };
    }
  }, [chosenCollateral, balanceAssetIDs, assets, usrBalances]);

  const offerRepayPeriod = useMemo(() => {
    if (relevantOffer) {
      let hours = relevantOffer.max_duration_seconds / 3600;
      let futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + hours);

      let formattedDate = `${futureDate.getDate()}/${
        futureDate.getMonth() + 1
      }/${futureDate.getFullYear()}`;

      if (hours > 24) {
        return `${Math.floor(hours / 24)} days (due by ${formattedDate})`;
      } else {
        return `${hours.toFixed(hours < 1 ? 2 : 0)} hours (due by ${formattedDate})`;
      }
    }
  }, [relevantOffer]);

  const offerExpiration = useMemo(() => {
    if (relevantOffer) {
      const hours = hoursTillExpiration(relevantOffer.auto_disable_time);
      let date = new Date(relevantOffer.auto_disable_time);
      let formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

      if (hours > 24) {
        return `${Math.floor(hours / 24)} days (on ${formattedDate})`;
      } else {
        return `${hours.toFixed(hours < 1 ? 2 : 0)} hours (on ${formattedDate})`;
      }
    }
  }, [relevantOffer]);

  const requiredCollateralAmount = useMemo(() => {
    if (finalBorrowAmount && collateralInfo && relevantOffer) {
      let calculatedAmount = 0;
      const data = relevantOffer.acceptable_collateral.find((x) => {
        return x[0] === collateralInfo.id;
      });
      const base = data[1].base;
      const quote = data[1].quote;
      if (quote.asset_id === collateralInfo.id) {
        const ratio =
          humanReadableFloat(quote.amount, collateralInfo.precision) /
          humanReadableFloat(base.amount, assets.find((x) => x.id === base.asset_id).precision);
        calculatedAmount += finalBorrowAmount * ratio;
      }
      return calculatedAmount.toFixed(collateralInfo.precision);
    }
  }, [finalBorrowAmount, collateralInfo, relevantOffer]);

  const requiredCollateralPrice = useMemo(() => {
    if (finalBorrowAmount && collateralInfo && relevantOffer) {
      const data = relevantOffer.acceptable_collateral.find((x) => {
        return x[0] === collateralInfo.id;
      });
      const base = data[1].base;
      const quote = data[1].quote;
      if (quote.asset_id === collateralInfo.id) {
        const ratio =
          humanReadableFloat(quote.amount, collateralInfo.precision) /
          humanReadableFloat(base.amount, assets.find((x) => x.id === base.asset_id).precision);
        return ratio;
      }
    }
  }, [finalBorrowAmount, collateralInfo, relevantOffer]);

  const [showDialog, setShowDialog] = useState(false);
  const [repayPeriod, setRepayPeriod] = useState();
  const repayType = useMemo(() => {
    if (repayPeriod) {
      if (repayPeriod === "no_auto_repayment") {
        return 0;
      }

      if (repayPeriod === "only_full_repayment") {
        return 1;
      }

      if (repayPeriod === "allow_partial_repayment") {
        return 2;
      }
    }
  }, [repayPeriod]);

  const handleInputChange = (event) => {
    const input = event.target.value;
    const regex = /^[0-9]*\.?[0-9]*$/;
    if (regex.test(input)) {
      let adjustedValue = input;

      if (availableAmount && input > availableAmount) {
        adjustedValue = availableAmount;
      } else if (input < minAmount) {
        adjustedValue = minAmount;
      } else if (
        input.toString().split(".").length > 1 &&
        input.toString().split(".")[1].length > foundAsset.precision
      ) {
        adjustedValue = parseFloat(input).toFixed(foundAsset.precision);
      }

      setInputValue(adjustedValue);
      setFinalBorrowAmount(adjustedValue);
    }
  };

  const [creditOfferOwner, setCreditOfferOwner] = useState();
  useEffect(() => {
    if (assetIssuers && assetIssuers.length && relevantOffer) {
      let foundOwner = assetIssuers.find((x) => x.id === relevantOffer.owner_account);
      if (foundOwner) {
        setOwner(foundOwner);
      } else {
        const userStore = createObjectStore([
          _chain,
          JSON.stringify([relevantOffer.owner_account]),
          currentNode ? currentNode.url : null,
        ]);
        userStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const foundUser = data[0];
            const newOwner = { id: foundUser.id, name: foundUser.name };
            setCreditOfferOwner(newOwner);
          }
        });
      }
    }
  }, [assetIssuers, relevantOffer]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          {error ? (
            <Card>
              <CardHeader className="pb-1 mb-3 mt-3">
                <CardTitle>{t("CreditOffer:errorCard.title")}</CardTitle>
                <CardDescription className="pt-2">
                  {t("CreditOffer:errorCard.description1")}
                  <br />
                  {t("CreditOffer:errorCard.description2")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href="/offers/index.html">
                  <Button variant="" className="h-6">
                    {t("CreditOffer:errorCard.buttonLabel")}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ) : null}
          {!error ? (
            <Card>
              <CardHeader className="pb-1">
                <CardTitle>
                  {creditOfferOwner
                    ? t("CreditOffer:offerCardHeader.viewingOffer", {
                        id: relevantOffer.id,
                        owner_name: creditOfferOwner.name,
                        owner_account: creditOfferOwner.id,
                      })
                    : t("CreditOffer:offerCardHeader.loadingOfferTerms")}
                </CardTitle>
                <CardDescription>
                  {t("CreditOffer:offerCardHeader.offerDescription1")}
                  <br />
                  {t("CreditOffer:offerCardHeader.offerDescription2")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 mt-3">
                  <div className="col-span-1">
                    <Form {...form}>
                      <form
                        onSubmit={() => {
                          setShowDialog(true);
                          event.preventDefault();
                        }}
                      >
                        <FormField
                          control={form.control}
                          name="borrowerAccount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("CreditOffer:cardContent.borrowingAccount")}</FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-8 mt-4">
                                  <div className="col-span-1 ml-5">
                                    {usr && usr.username ? (
                                      <Avatar
                                        size={40}
                                        name={usr.username}
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
                                        <AvatarFallback>?</AvatarFallback>
                                      </Av>
                                    )}
                                  </div>
                                  <div className="col-span-7">
                                    <Input
                                      disabled
                                      placeholder="Bitshares account (1.2.x)"
                                      className="mb-1 mt-1"
                                      value={usr ? `${usr.username} (${usr.id})` : ""}
                                      readOnly
                                    />
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                {t("CreditOffer:cardContent.broadcastDescription")}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lenderAccount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                <div className="grid grid-cols-2 mt-4">
                                  <div className="col-span-1">
                                    {t("CreditOffer:cardContent.lendingAccount")}
                                  </div>
                                  <div className="col-span-1 text-right">
                                    {creditOfferOwner ? (
                                      <ExternalLink
                                        classnamecontents="text-blue-500"
                                        type="text"
                                        text={t("CreditOffer:cardContent.viewAccount", {
                                          owner_name: creditOfferOwner.name,
                                        })}
                                        hyperlink={`https://blocksights.info/#/accounts/${
                                          creditOfferOwner.name
                                        }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-8 mt-4">
                                  <div className="col-span-1 ml-5">
                                    {creditOfferOwner && creditOfferOwner.name ? (
                                      <Avatar
                                        size={40}
                                        name={creditOfferOwner.name}
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
                                        <AvatarFallback>?</AvatarFallback>
                                      </Av>
                                    )}
                                  </div>
                                  <div className="col-span-7">
                                    <Input
                                      disabled
                                      placeholder="Bitshares account (1.2.x)"
                                      className="mb-1 mt-1"
                                      value={
                                        creditOfferOwner && creditOfferOwner.name
                                          ? `${creditOfferOwner.name} (${creditOfferOwner.id})`
                                          : ""
                                      }
                                      readOnly
                                    />
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                {t("CreditOffer:cardContent.borrowingDescription", {
                                  symbol: foundAsset?.symbol,
                                })}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="amountAvailable"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {foundAsset && relevantOffer
                                  ? t("CreditOffer:cardContent.availableAmount", {
                                      symbol: foundAsset.symbol,
                                      asset_type: relevantOffer.asset_type,
                                    })
                                  : t("CreditOffer:cardContent.loading")}
                              </FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-8 mt-4">
                                  <div className="col-span-1 ml-5">
                                    {foundAsset ? (
                                      <Av>
                                        <AvatarFallback>
                                          <div className="text-sm">
                                            {foundAsset.bitasset_data_id ? "MPA" : "UIA"}
                                          </div>
                                        </AvatarFallback>
                                      </Av>
                                    ) : (
                                      <Av>
                                        <AvatarFallback>?</AvatarFallback>
                                      </Av>
                                    )}
                                  </div>
                                  <div className="col-span-7">
                                    <Input
                                      disabled
                                      placeholder="Bitshares account (1.2.x)"
                                      className="mb-1 mt-1"
                                      value={
                                        relevantOffer && foundAsset
                                          ? `${humanReadableFloat(
                                              relevantOffer.current_balance,
                                              foundAsset.precision
                                            )} ${foundAsset.symbol}`
                                          : t("CreditOffer:cardContent.loading")
                                      }
                                      readOnly
                                    />
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                {t("CreditOffer:cardContent.offerDescription", {
                                  owner_name: relevantOffer?.owner_name,
                                  symbol: foundAsset?.symbol,
                                })}
                              </FormDescription>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="backingCollateral"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                <div className="grid grid-cols-2 mt-3">
                                  <div className="mt-1">
                                    {t("CreditOffer:cardContent.backingCollateral")}
                                  </div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-8">
                                  <div className="col-span-1 ml-5 mt-1">
                                    {foundAsset ? (
                                      <Av>
                                        <AvatarFallback>
                                          <div className="text-sm">
                                            {!collateralInfo ? "?" : null}
                                            {collateralInfo && collateralInfo.isBitasset
                                              ? "MPA"
                                              : null}
                                            {collateralInfo && !collateralInfo.isBitasset
                                              ? "UIA"
                                              : null}
                                          </div>
                                        </AvatarFallback>
                                      </Av>
                                    ) : (
                                      <Av>
                                        <AvatarFallback>?</AvatarFallback>
                                      </Av>
                                    )}
                                  </div>
                                  <div className="col-span-7 mt-2">
                                    <Select
                                      onValueChange={(collateral) => {
                                        setChosenCollateral(collateral);
                                      }}
                                    >
                                      <SelectTrigger className="mb-1">
                                        <SelectValue
                                          placeholder={
                                            collateralInfo
                                              ? `${collateralInfo.symbol} (${collateralInfo.id})`
                                              : t("CreditOffer:cardContent.selectCollateral")
                                          }
                                        />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white">
                                        {acceptedCollateral && acceptedCollateral.length ? (
                                          <List
                                            height={100}
                                            itemCount={acceptedCollateral.length}
                                            itemSize={35}
                                            className="w-full"
                                            initialScrollOffset={
                                              chosenCollateral
                                                ? acceptedCollateral
                                                    .map((x) => x.id)
                                                    .indexOf(chosenCollateral.id) * 35
                                                : 0
                                            }
                                          >
                                            {Row}
                                          </List>
                                        ) : null}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                {!collateralInfo
                                  ? t("CreditOffer:cardContent.borrowDescription", {
                                      symbol: foundAsset?.symbol,
                                      owner_name: relevantOffer?.owner_name,
                                    })
                                  : t("CreditOffer:cardContent.borrowDescription2", {
                                      price: requiredCollateralPrice, // TODO: REPLACE PRICE
                                      base: foundAsset?.symbol,
                                      quote: collateralInfo.symbol,
                                    })}
                              </FormDescription>
                              {balanceAssetIDs &&
                              chosenCollateral &&
                              !balanceAssetIDs.includes(chosenCollateral) ? (
                                <FormMessage>
                                  {t("CreditOffer:cardContent.noCollateralMessage")}
                                </FormMessage>
                              ) : null}
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="borrowAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                <div className="grid grid-cols-2 gap-1 mt-5">
                                  <div className="col-span-1">
                                    {t("CreditOffer:cardContent.borrowAmount", {
                                      symbol: foundAsset ? foundAsset.symbol : "?",
                                    })}
                                  </div>
                                  <div className="col-span-1 text-right">
                                    {t("CreditOffer:cardContent.availableAmountRange", {
                                      minAmount: minAmount ?? "?",
                                      availableAmount: availableAmount ?? "?",
                                      symbol: foundAsset?.symbol,
                                    })}
                                  </div>
                                </div>
                              </FormLabel>
                              {!availableAmount ? (
                                <FormControl>
                                  <Input disabled value={0} className="mb-3" readOnly />
                                </FormControl>
                              ) : (
                                <FormControl onChange={handleInputChange}>
                                  <Input value={inputValue} className="mb-3" />
                                </FormControl>
                              )}

                              <FormDescription>
                                {t("CreditOffer:cardContent.inputBorrowAmount", {
                                  symbol: foundAsset?.symbol,
                                  owner_name: relevantOffer?.owner_name,
                                })}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="repayMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                <div className="grid grid-cols-2 mt-3">
                                  <div className="mt-1">
                                    {t("CreditOffer:cardContent.repayMethod")}
                                  </div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={(period) => {
                                    setRepayPeriod(period);
                                  }}
                                >
                                  <SelectTrigger className="mb-1">
                                    <SelectValue
                                      placeholder={t("CreditOffer:cardContent.selectRepayMethod")}
                                    />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white">
                                    <SelectItem value={"no_auto_repayment"}>
                                      {t("CreditOffer:cardContent.noAutoRepayment")}
                                    </SelectItem>
                                    <SelectItem value={"only_full_repayment"}>
                                      {t("CreditOffer:cardContent.onlyFullRepayment")}
                                    </SelectItem>
                                    <SelectItem value={"allow_partial_repayment"}>
                                      {t("CreditOffer:cardContent.allowPartialRepayment")}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormDescription>
                                {t("CreditOffer:cardContent.selectRepaymentMethod")}
                              </FormDescription>
                              {repayPeriod ? (
                                <FormMessage>
                                  {repayPeriod === "no_auto_repayment"
                                    ? t("CreditOffer:cardContent.noAutoRepaymentMessage")
                                    : null}
                                  {repayPeriod === "only_full_repayment"
                                    ? t("CreditOffer:cardContent.onlyFullRepaymentMessage")
                                    : null}
                                  {repayPeriod === "allow_partial_repayment"
                                    ? t("CreditOffer:cardContent.allowPartialRepaymentMessage")
                                    : null}
                                </FormMessage>
                              ) : null}
                            </FormItem>
                          )}
                        />

                        {chosenCollateral ? (
                          <FormField
                            control={form.control}
                            name="requiredCollateralAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <div className="grid grid-cols-2 gap-1 mt-5">
                                    <div className="col-span-1">
                                      {t("CreditOffer:cardContent.requiredCollateral")}
                                    </div>
                                    <div className="col-span-1 text-right">
                                      {collateralInfo
                                        ? t("CreditOffer:cardContent.currentBalance", {
                                            amount: collateralInfo.amount,
                                            symbol: collateralInfo.symbol,
                                          })
                                        : t("CreditOffer:cardContent.loadingBalance")}
                                    </div>
                                  </div>
                                </FormLabel>

                                <FormControl>
                                  <Input
                                    disabled
                                    value={`${requiredCollateralAmount ?? "0"} ${
                                      collateralInfo ? collateralInfo.symbol : ""
                                    }`}
                                    className="mb-3"
                                    readOnly
                                  />
                                </FormControl>
                                <FormDescription>
                                  {finalBorrowAmount && foundAsset
                                    ? t("CreditOffer:cardContent.collateralNeeded", {
                                        borrowAmount: finalBorrowAmount ?? "",
                                        symbol: foundAsset ? foundAsset.symbol : "",
                                      })
                                    : t("CreditOffer:cardContent.enterValidBorrowAmount")}
                                </FormDescription>

                                {collateralInfo &&
                                collateralInfo.holding &&
                                collateralInfo.amount < requiredCollateralAmount ? (
                                  <FormMessage>
                                    {t("CreditOffer:cardContent.insufficientBalance", {
                                      symbol: collateralInfo.symbol,
                                      requiredMore: (
                                        requiredCollateralAmount - collateralInfo.amount
                                      ).toFixed(collateralInfo.precision),
                                    })}
                                  </FormMessage>
                                ) : null}

                                {collateralInfo && !collateralInfo.holding ? (
                                  <FormMessage>
                                    {t("CreditOffer:cardContent.noAssetHeld")}
                                  </FormMessage>
                                ) : null}
                              </FormItem>
                            )}
                          />
                        ) : null}

                        <FormField
                          control={form.control}
                          name="repayPeriod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                <div className="grid grid-cols-2 gap-1 mt-5">
                                  <div className="col-span-1">
                                    {t("CreditOffer:cardContent.repayPeriod")}
                                  </div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled
                                  value={offerRepayPeriod ?? t("CreditOffer:cardContent.loading")}
                                  className="mb-3"
                                  readOnly
                                />
                              </FormControl>
                              <FormDescription>
                                {t("CreditOffer:cardContent.repayPeriodDescription")}
                              </FormDescription>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="offerValidity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                <div className="grid grid-cols-2 gap-1 mt-5">
                                  <div className="col-span-1">
                                    {t("CreditOffer:cardContent.offerExpiry")}
                                  </div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled
                                  value={offerExpiration ?? t("CreditOffer:cardContent.loading")}
                                  className="mb-3"
                                  readOnly
                                />
                              </FormControl>
                              <FormDescription>
                                {t("CreditOffer:cardContent.offerExpiryDescription")}
                              </FormDescription>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="estimatedFee"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                <div className="grid grid-cols-2 gap-1 mt-5">
                                  <div className="col-span-1">
                                    {t("CreditOffer:cardContent.estimatedFee")}
                                  </div>
                                  <div className="col-span-1 text-right">
                                    {relevantOffer
                                      ? t("CreditOffer:cardContent.borrowFeeRate", {
                                          feeRate: relevantOffer.fee_rate / 10000,
                                        })
                                      : t("CreditOffer:cardContent.loadingFee")}
                                  </div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled
                                  value={
                                    finalBorrowAmount
                                      ? t("CreditOffer:cardContent.feeAmount", {
                                          feeAmount: finalBorrowAmount * 0.01,
                                          symbol: foundAsset ? foundAsset.symbol : "?",
                                        })
                                      : t("CreditOffer:cardContent.zeroFee", {
                                          symbol: foundAsset ? foundAsset.symbol : "?",
                                        })
                                  }
                                  className="mb-3"
                                  readOnly
                                />
                              </FormControl>
                              <FormDescription>
                                {t("CreditOffer:cardContent.feeDescription", {
                                  symbol: foundAsset ? foundAsset.symbol : "?",
                                  owner_name: creditOfferOwner ? creditOfferOwner.name : "?",
                                })}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          disabled
                          name="fee"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("CreditOffer:cardContent.networkFee")}</FormLabel>
                              <Input disabled value={`${fee ?? "?"} BTS`} label={`fees`} readOnly />
                              <FormDescription>
                                {t("CreditOffer:cardContent.networkFeeDescription")}
                              </FormDescription>
                              {usr && usr.id === usr.referrer ? (
                                <FormMessage>
                                  {t("CreditOffer:cardContent.ltmRebate", { rebate: 0.8 * fee })}
                                </FormMessage>
                              ) : null}
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                {(collateralInfo && !collateralInfo.holding) ||
                (collateralInfo &&
                  collateralInfo.holding &&
                  collateralInfo.amount < requiredCollateralAmount) ? (
                  <Button disabled>{t("CreditOffer:cardContent.submit")}</Button>
                ) : (
                  <Button onClick={() => setShowDialog(true)}>
                    {t("CreditOffer:cardContent.submit")}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ) : null}
        </div>
        {showDialog ? (
          <DeepLinkDialog
            operationNames={["credit_offer_accept"]}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            key={`Borrowing${finalBorrowAmount}${foundAsset.symbol}from${creditOfferOwner.name}(${creditOfferOwner.id})`}
            headerText={t("CreditOffer:dialogContent.borrowing", {
              finalBorrowAmount: finalBorrowAmount,
              symbol: foundAsset.symbol,
              owner_name: creditOfferOwner.name,
              owner_account: creditOfferOwner.id,
            })}
            trxJSON={[
              {
                borrower: usr.id,
                offer_id: relevantOffer.id,
                borrow_amount: {
                  amount: blockchainFloat(finalBorrowAmount, foundAsset.precision),
                  asset_id: foundAsset.id,
                },
                collateral: {
                  amount: blockchainFloat(requiredCollateralAmount, collateralInfo.precision),
                  asset_id: collateralInfo.id,
                },
                max_fee_rate: relevantOffer.fee_rate,
                min_duration_seconds: relevantOffer.max_duration_seconds,
                extensions: {
                  auto_repay: repayType ?? 0,
                },
              },
            ]}
          />
        ) : null}
        <div className="grid grid-cols-1 mt-5">
          <Card>
            <CardHeader>
              <CardTitle>{t("CreditOffer:risks.risksTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {t("CreditOffer:risks.risksDescription")}
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                <li>{t("CreditOffer:risks.riskCollateral")}</li>
                <li>{t("CreditOffer:risks.riskLiquidity")}</li>
                <li>{t("CreditOffer:risks.riskPlatform")}</li>
                <li>{t("CreditOffer:risks.riskUser")}</li>
                <li>{t("CreditOffer:risks.riskNetwork")}</li>
              </ul>
            </CardContent>
            <CardFooter className="text-sm">{t("CreditOffer:risks.risksFooter")}</CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
