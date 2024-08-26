import React, { useState, useEffect, useMemo } from "react";
import { useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { FixedSizeList as List } from "react-window";
import { useStore } from '@nanostores/react';
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
import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/Avatar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { humanReadableFloat, getFlagBooleans, blockchainFloat } from "@/lib/common.js";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createCollateralBidStore } from "@/nanoeffects/CollateralBids.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  $marketSearchCacheBTS,
  $marketSearchCacheTEST,
  $globalParamsCacheBTS,
  $globalParamsCacheTEST,
  $bitAssetDataCacheBTS,
  $bitAssetDataCacheTEST,
} from "@/stores/cache.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

export default function Settlement(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNode = useStore($currentNode);

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const bitAssetDataBTS = useSyncExternalStore(
    $bitAssetDataCacheBTS.subscribe,
    $bitAssetDataCacheBTS.get,
    () => true
  );

  const bitAssetDataTEST = useSyncExternalStore(
    $bitAssetDataCacheTEST.subscribe,
    $bitAssetDataCacheTEST.get,
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

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", ["bitAssetData", "globalParams", "marketSearch"]);

  const bitAssetData = useMemo(() => {
    if (_chain && (bitAssetDataBTS || bitAssetDataTEST)) {
      return _chain === "bitshares" ? bitAssetDataBTS : bitAssetDataTEST;
    }
    return [];
  }, [bitAssetDataBTS, bitAssetDataTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const [finalAsset, setFinalAsset] = useState();
  const [finalBitasset, setFinalBitasset] = useState();
  const [finalCollateralAsset, setFinalCollateralAsset] = useState();

  /*
  // For future checking balance against bid amount & force settle amount
  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id, currentNode ? currentNode.url : null]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setUsrBalances(data);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr]);
  */

  const [bidFee, setBidFee] = useState(0);
  const [settleFee, setSettleFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee1 = globalParams.find((x) => x[0] === 45);
      const foundFee2 = globalParams.find((x) => x[0] === 17);
      const finalFee1 = humanReadableFloat(foundFee1[1].fee, 5);
      const finalFee2 = humanReadableFloat(foundFee2[1].fee, 5);
      setBidFee(finalFee1);
      setSettleFee(finalFee2);
    }
  }, [globalParams]);

  const parsedUrlParams = useMemo(() => {
    if (marketSearch && marketSearch.length && window.location.search) {
      //console.log("Parsing url params");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const foundParamter = params && params.id ? params.id : null;

      if (
        !foundParamter ||
        !foundParamter.length ||
        (foundParamter && !foundParamter.includes("1.3."))
      ) {
        console.log("Invalid parameter");
        return;
      }

      const assetIDs = marketSearch && marketSearch.length ? marketSearch.map((x) => x.id) : [];
      if (!assetIDs.includes(foundParamter)) {
        console.log("Invalid parameter");
        return;
      }

      return foundParamter;
    }
  }, [marketSearch]);

  const parsedAsset = useMemo(() => {
    if (parsedUrlParams && parsedUrlParams.length && marketSearch) {
      const foundAsset = marketSearch.find((x) => x.id === parsedUrlParams);
      return foundAsset;
    }
    return null;
  }, [parsedUrlParams, marketSearch]);

  const parsedBitasset = useMemo(() => {
    if (parsedAsset && bitAssetData) {
      const foundBitasset = bitAssetData.find((x) => x.assetID === parsedAsset.id);
      return foundBitasset;
    }
    return null;
  }, [parsedAsset, bitAssetData]);

  const parsedCollateralAsset = useMemo(() => {
    if (parsedBitasset && bitAssetData) {
      const foundAsset = marketSearch.find((x) => x.id === parsedBitasset.collateral);
      return foundAsset;
    }
  }, [parsedBitasset, bitAssetData]);

  const currentFeedSettlementPrice = useMemo(() => {
    if (finalBitasset && finalBitasset.current_feed && parsedCollateralAsset && parsedAsset) {
      return parseFloat(
        (
          humanReadableFloat(
            parseInt(finalBitasset.current_feed.settlement_price.quote.amount),
            parsedCollateralAsset.p
          ) /
          humanReadableFloat(
            parseInt(finalBitasset.current_feed.settlement_price.base.amount),
            parsedAsset.p
          )
        ).toFixed(parsedCollateralAsset.p)
      );
    }
  }, [finalBitasset, parsedAsset, parsedCollateralAsset]);

  const settlementFund = useMemo(() => {
    if (finalAsset && parsedAsset && parsedCollateralAsset) {
      const finalSettlementFund = humanReadableFloat(
        parseInt(finalBitasset.settlement_fund),
        parsedCollateralAsset.p
      );

      const finalSettlementPrice = parseFloat(
        (
          1 /
          (humanReadableFloat(
            finalBitasset.settlement_price.quote.amount,
            parsedCollateralAsset.p
          ) /
            humanReadableFloat(finalBitasset.settlement_price.base.amount, parsedAsset.p))
        ).toFixed(parsedAsset.p)
      );

      return { finalSettlementFund, finalSettlementPrice };
    }
  }, [finalBitasset, parsedAsset, parsedCollateralAsset]);

  const individualSettlementFund = useMemo(() => {
    if (finalBitasset && parsedAsset && parsedCollateralAsset) {
      const _debt = humanReadableFloat(
        parseInt(finalBitasset.individual_settlement_debt),
        parsedAsset.p
      );
      const _fund = humanReadableFloat(
        parseInt(finalBitasset.individual_settlement_fund),
        parsedCollateralAsset.p
      );
      return {
        _debt,
        _fund,
      };
    }
  }, [finalBitasset, parsedAsset, parsedCollateralAsset]);

  const [collateralBids, setCollateralBids] = useState();

  
  useEffect(() => {
    if (parsedBitasset && parsedBitasset && usr && usr.chain) {
      const smartcoinDataStore = createObjectStore([
        usr.chain,
        JSON.stringify([
          parsedAsset.id,
          parsedBitasset.collateral,
          parsedBitasset.id
        ]),
      ]);
      smartcoinDataStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setFinalAsset(data[0]);
          setFinalCollateralAsset(data[1]);
          setFinalBitasset(data[2]);
        }
      });
    }
  }, [parsedAsset, parsedBitasset, usr]);

  useEffect(() => {
    let unsub;

    if (parsedAsset && usr && usr.chain) {
      const collateralBidsStore = createCollateralBidStore([usr.chain, parsedAsset.id]);

      unsub = collateralBidsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setCollateralBids(data);
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [parsedAsset, usr]);

  const collateralBiddingDisabled = useMemo(() => {
    if (finalAsset) {
      const obj = getFlagBooleans(finalAsset.options.flags);
      return Object.keys(obj).includes("disable_collateral_bidding");
    }
  }, [finalAsset]);

  // Force settlement
  const [forceSettleAmount, setForceSettleAmount] = useState(0);
  const [totalReceiving, setTotalReceiving] = useState(0);

  // Global settlement
  const [additionalCollateral, setAdditionalCollateral] = useState(0);
  const [debtCovered, setDebtCovered] = useState(0);

  const [showDialog, setShowDialog] = useState(false);

  const BidRow = ({ index, style }) => {
    const _bid = collateralBids[index];
    const _collateral = humanReadableFloat(_bid.bid.base.amount, parsedCollateralAsset.p);
    const _debt = humanReadableFloat(_bid.bid.quote.amount, parsedAsset.p);
    const _price = parseFloat((_collateral / _debt).toFixed(parsedCollateralAsset.p));
    const _ratio = parseFloat(((1 / currentFeedSettlementPrice / _price) * 100).toFixed(2));
    return (
      <div className="grid grid-cols-4 text-sm" style={style}>
        <div className="col-span-1">{_bid.bidder}</div>
        <div className="col-span-1">{_collateral}</div>
        <div className="col-span-1">{_debt}</div>
        <div className="col-span-1">{_price}</div>
        <div className="col-span-1">{_ratio}</div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("Settlement:smartcoinSettlementFormTitle")}</CardTitle>
              <CardDescription>
                {settlementFund && settlementFund.finalSettlementFund
                  ? t("Settlement:bidOnGlobalSettlementFundsDescription")
                  : t("Settlement:forceSettleAssetsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={(event) => {
                    setShowDialog(true);
                    event.stopPropagation();
                    event.preventDefault();
                  }}
                >
                  <FormField
                    control={form.control}
                    name="account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {settlementFund && settlementFund.finalSettlementFund
                            ? t("Settlement:biddingAccount")
                            : t("Settlement:assetSettlingAccount")}
                        </FormLabel>
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
                                  colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
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
                                className="mb-3"
                                value={`${usr.username} (${usr.id})`}
                                readOnly
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selectedAsset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Settlement:selectedAsset")}</FormLabel>
                        <FormControl>
                          <span className="grid grid-cols-8">
                            <span className="col-span-6">
                              <Input
                                disabled
                                placeholder="Bitshares smartcoin (1.3.x)"
                                className="mb-1"
                                value={`${parsedAsset ? parsedAsset.s : ""} (${
                                  parsedAsset ? parsedAsset.id : ""
                                })`}
                                readOnly
                              />
                            </span>
                          </span>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentFeedPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Settlement:currentFeedPrice")}</FormLabel>{" "}
                        <FormControl>
                          <span className="grid grid-cols-8">
                            <span className="col-span-6">
                              {parsedAsset && parsedCollateralAsset ? (
                                <Input
                                  disabled
                                  className="mb-1"
                                  value={`${
                                    currentFeedSettlementPrice
                                      ? (1 / currentFeedSettlementPrice).toFixed(parsedAsset.p)
                                      : 0
                                  } ${parsedAsset ? parsedAsset.s : ""}/${
                                    parsedCollateralAsset ? parsedCollateralAsset.s : ""
                                  }`}
                                  readOnly
                                />
                              ) : (
                                <Input disabled className="mb-1" value="" readOnly />
                              )}
                            </span>
                          </span>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {settlementFund && settlementFund.finalSettlementFund ? (
                    <>
                      <FormField
                        control={form.control}
                        name="settlementPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Settlement:finalSettlementPrice")}</FormLabel>{" "}
                            <FormControl>
                              <span className="grid grid-cols-8">
                                <span className="col-span-6">
                                  <Input
                                    disabled
                                    className="mb-1"
                                    value={`${settlementFund.finalSettlementPrice} ${parsedAsset.s}/${parsedCollateralAsset.s}`}
                                    readOnly
                                  />
                                </span>
                              </span>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fundsAvailable"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Settlement:settlementFundsAvailable")}</FormLabel>{" "}
                            <FormControl>
                              <span className="grid grid-cols-8">
                                <span className="col-span-6">
                                  <Input
                                    disabled
                                    className="mb-1"
                                    value={`${settlementFund.finalSettlementFund} ${parsedCollateralAsset.s}`}
                                    readOnly
                                  />
                                </span>
                              </span>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fundingRatio1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Settlement:fundingRatio")}</FormLabel>
                            <FormControl>
                              <span className="grid grid-cols-8">
                                <span className="col-span-2 mb-1">
                                  <Input
                                    disabled
                                    value={`${(
                                      (1 /
                                        currentFeedSettlementPrice /
                                        settlementFund.finalSettlementPrice) *
                                      100
                                    ).toFixed(2)} %`}
                                    readOnly
                                  />
                                </span>
                                <span className="col-span-2 text-red-500">
                                  <Input
                                    disabled
                                    value={`-${(
                                      100 -
                                      (1 /
                                        currentFeedSettlementPrice /
                                        settlementFund.finalSettlementPrice) *
                                        100
                                    ).toFixed(2)}%`}
                                    readOnly
                                  />
                                </span>
                              </span>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="additionalCollateral"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Settlement:additionalCollateral")}</FormLabel>
                            <FormDescription>
                              {t("Settlement:additionalCollateralDescription", {
                                asset: parsedAsset.s,
                              })}
                            </FormDescription>
                            <FormControl>
                              <span className="grid grid-cols-12">
                                <span className="col-span-8">
                                  <Input
                                    placeholder={
                                      additionalCollateral
                                        ? `${additionalCollateral} ${parsedCollateralAsset.s}`
                                        : `0 ${parsedCollateralAsset.s}`
                                    }
                                    readOnly
                                    disabled
                                    className="mb-3"
                                  />
                                </span>
                                <span className="col-span-4 ml-3">
                                  <Popover>
                                    <PopoverTrigger>
                                      <span className="inline-block border border-grey rounded pl-4 pb-1 pr-4">
                                        <Label>{t("Settlement:changeAmount")}</Label>
                                      </span>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                      <Label>{t("Settlement:provideNewAmount")}</Label>
                                      <Input
                                        placeholder={additionalCollateral}
                                        className="mb-2 mt-1"
                                        onChange={(event) => {
                                          const input = event.target.value;
                                          const regex = /^[0-9]*\.?[0-9]*$/;
                                          if (input && input.length && regex.test(input)) {
                                            setAdditionalCollateral(
                                              parseFloat(input).toFixed(parsedCollateralAsset.p)
                                            );
                                          }
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </span>
                              </span>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="debtCovered"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Settlement:totalDebtCoveredByBid")}</FormLabel>
                            <FormDescription>
                              {t("Settlement:totalDebtCoveredByBidDescription")}
                            </FormDescription>
                            <FormControl>
                              <span className="grid grid-cols-12">
                                <span className="col-span-8">
                                  <Input
                                    placeholder={
                                      debtCovered
                                        ? `${debtCovered} ${parsedAsset.s}`
                                        : `0 ${parsedAsset.s}`
                                    }
                                    readOnly
                                    disabled
                                    className="mb-3"
                                  />
                                </span>
                                <span className="col-span-4 ml-3">
                                  <Popover>
                                    <PopoverTrigger>
                                      <span className="inline-block border border-grey rounded pl-4 pb-1 pr-4">
                                        <Label>{t("Settlement:changeTotal")}</Label>
                                      </span>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                      <Label>{t("Settlement:provideNewTotal")}</Label>
                                      <Input
                                        placeholder={debtCovered}
                                        className="mb-2 mt-1"
                                        onChange={(event) => {
                                          const input = event.target.value;
                                          const regex = /^[0-9]*\.?[0-9]*$/;
                                          if (input && input.length && regex.test(input)) {
                                            setDebtCovered(
                                              parseFloat(input).toFixed(parsedAsset.p)
                                            );
                                          }
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </span>
                              </span>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  ) : null}

                  {individualSettlementFund &&
                  (individualSettlementFund._debt || individualSettlementFund._fund) ? (
                    <>
                      <FormField
                        control={form.control}
                        name="isd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Settlement:individualSettlementDebt")}</FormLabel>{" "}
                            <FormControl>
                              <span className="grid grid-cols-8">
                                <span className="col-span-6">
                                  <Input
                                    disabled
                                    className="mb-1"
                                    value={`${individualSettlementFund._debt} ${parsedAsset.s}`}
                                    readOnly
                                  />
                                </span>
                              </span>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Settlement:individualSettlementFund")}</FormLabel>{" "}
                            <FormControl>
                              <span className="grid grid-cols-8">
                                <span className="col-span-6">
                                  <Input
                                    disabled
                                    className="mb-1"
                                    value={`${individualSettlementFund._fund} ${parsedCollateralAsset.s}`}
                                    readOnly
                                  />
                                </span>
                              </span>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fundingRatio2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Settlement:fundingRatio")}</FormLabel>
                            <FormControl>
                              <span className="grid grid-cols-8">
                                <span className="col-span-2 mb-1">
                                  <Input
                                    disabled
                                    value={`${(
                                      ((individualSettlementFund._debt *
                                        currentFeedSettlementPrice) /
                                        individualSettlementFund._fund) *
                                      100
                                    ).toFixed(2)} %`}
                                    readOnly
                                  />
                                </span>
                                <span className="col-span-2 text-red-500">
                                  <Input
                                    disabled
                                    value={`-${(
                                      100 -
                                      ((individualSettlementFund._debt *
                                        currentFeedSettlementPrice) /
                                        individualSettlementFund._fund) *
                                        100
                                    ).toFixed(2)}%`}
                                    readOnly
                                  />
                                </span>
                              </span>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ForceSettleAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Settlement:forceSettleAmount")}</FormLabel>
                            <FormDescription>
                              {t("Settlement:forceSettleAmountDescription")}
                            </FormDescription>

                            <FormControl>
                              <span className="grid grid-cols-12">
                                <span className="col-span-8">
                                  <Input
                                    placeholder={
                                      forceSettleAmount
                                        ? `${forceSettleAmount} ${parsedAsset.s}`
                                        : `0 ${parsedAsset.s}`
                                    }
                                    readOnly
                                    disabled
                                    className="mb-3"
                                  />
                                </span>
                                <span className="col-span-4 ml-3">
                                  <Popover>
                                    <PopoverTrigger>
                                      <span className="inline-block border border-grey rounded pl-4 pb-1 pr-4">
                                        <Label>{t("Settlement:changeAmount")}</Label>
                                      </span>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                      <Label>{t("Settlement:provideNewForceSettleAmount")}</Label>
                                      <Input
                                        placeholder={forceSettleAmount}
                                        className="mb-2 mt-1"
                                        onChange={(event) => {
                                          const input = event.target.value;
                                          const regex = /^[0-9]*\.?[0-9]*$/;
                                          if (input && input.length && regex.test(input)) {
                                            setForceSettleAmount(
                                              parseFloat(input).toFixed(parsedAsset.p)
                                            );
                                            const _total = parseFloat(
                                              (
                                                (individualSettlementFund._debt /
                                                  individualSettlementFund._fund) *
                                                input
                                              ).toFixed(parsedCollateralAsset.p)
                                            );
                                            setTotalReceiving(_total);
                                          }
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </span>
                              </span>
                            </FormControl>
                            {forceSettleAmount &&
                            individualSettlementFund._debt &&
                            forceSettleAmount > individualSettlementFund._debt ? (
                              <FormMessage>
                                {t("Settlement:forceSettleAmountExceedsDebt")}
                              </FormMessage>
                            ) : null}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="totalReceiving"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Settlement:totalAmountReceive")}</FormLabel>
                            <FormDescription>
                              {t("Settlement:totalAmountReceiveDescription", {
                                asset: parsedAsset.s,
                              })}
                            </FormDescription>
                            <FormControl>
                              <span className="grid grid-cols-12">
                                <span className="col-span-8">
                                  <Input
                                    placeholder={
                                      totalReceiving
                                        ? `${totalReceiving} ${parsedCollateralAsset.s}`
                                        : `0 ${parsedCollateralAsset.s}`
                                    }
                                    readOnly
                                    disabled
                                    className="mb-1"
                                  />
                                </span>
                                <span className="col-span-4 ml-3">
                                  <Popover>
                                    <PopoverTrigger>
                                      <span className="inline-block border border-grey rounded pl-4 pb-1 pr-4">
                                        <Label>{t("Settlement:changeTotal")}</Label>
                                      </span>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                      <Label>{t("Settlement:provideNewTotalAmount")}</Label>
                                      <Input
                                        placeholder={totalReceiving}
                                        className="mb-2 mt-1"
                                        onChange={(event) => {
                                          const input = event.target.value;
                                          const regex = /^[0-9]*\.?[0-9]*$/;
                                          if (input && input.length && regex.test(input)) {
                                            setTotalReceiving(
                                              parseFloat(input).toFixed(parsedCollateralAsset.p)
                                            );
                                            setForceSettleAmount(
                                              (input / currentFeedSettlementPrice).toFixed(
                                                parsedAsset.p
                                              )
                                            );
                                          }
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </span>
                              </span>
                            </FormControl>

                            <FormMessage>
                              {t("Settlement:payingPremium", {
                                premium: (
                                  100 -
                                  ((individualSettlementFund._debt * currentFeedSettlementPrice) /
                                    individualSettlementFund._fund) *
                                    100
                                ).toFixed(2),
                              })}
                            </FormMessage>
                          </FormItem>
                        )}
                      />
                    </>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Settlement:networkFee")}</FormLabel>
                        <FormDescription>
                          {t("Settlement:operation", {
                            operation:
                              settlementFund && settlementFund.finalSettlementFund ? 45 : 17,
                          })}
                        </FormDescription>
                        <FormControl>
                          <span className="grid grid-cols-8">
                            <span className="col-span-6">
                              <Input
                                disabled
                                className="mb-1"
                                value={`${
                                  settlementFund && settlementFund.finalSettlementFund
                                    ? bidFee
                                    : settleFee
                                } ${usr.chain === "Bitshares" ? "BTS" : "TEST"}`}
                                readOnly
                              />
                            </span>
                          </span>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {finalBitasset && finalBitasset.options.extensions.force_settle_fee_percent ? (
                    <FormMessage>
                      {t("Settlement:additionalForceSettlementFee", {
                        fee: finalBitasset.options.extensions.force_settle_fee_percent / 100,
                      })}
                    </FormMessage>
                  ) : null}

                  <Button className="mt-5 mb-3" type="submit">
                    {t("Settlement:submit")}
                  </Button>

                  {collateralBiddingDisabled ? (
                    <FormMessage>{t("Settlement:collateralBiddingDisabled")}</FormMessage>
                  ) : null}
                </form>
              </Form>

              {(!settlementFund || (settlementFund && !settlementFund.finalSettlementFund)) &&
              (!individualSettlementFund ||
                (individualSettlementFund &&
                  (!individualSettlementFund._debt || !individualSettlementFund._fund)))
                ? "No settlement funds available"
                : null}
            </CardContent>
          </Card>

          {collateralBids && collateralBids.length ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("Settlement:existingCollateralBids")}</CardTitle>
                <CardDescription>
                  {t("Settlement:existingCollateralBidsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5">
                  <div className="col-span-1">{t("Settlement:bidder")}</div>
                  <div className="col-span-1">{t("Settlement:collateral")}</div>
                  <div className="col-span-1">{t("Settlement:debt")}</div>
                  <div className="col-span-1">{t("Settlement:bidPrice")}</div>
                  <div className="col-span-1">{t("Settlement:ratio")}</div>
                </div>
                <List
                  height={500}
                  itemCount={collateralBids.length}
                  itemSize={225}
                  className="w-full"
                >
                  {BidRow}
                </List>
              </CardContent>
            </Card>
          ) : null}

          {showDialog ? (
            <DeepLinkDialog
              operationName={
                settlementFund && settlementFund.finalSettlementFund
                  ? "bid_collateral" // op: 45
                  : "asset_settle" // op: 17
              }
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setShowDialog}
              key={
                settlementFund && settlementFund.finalSettlementFund
                  ? `bidCollateral${parsedCollateralAsset.s}Debt${parsedAsset.s}`
                  : `Settling${forceSettleAmount}${parsedAsset.s}for${totalReceiving}${parsedCollateralAsset.s}`
              }
              headerText={
                settlementFund && settlementFund.finalSettlementFund
                  ? t("Settlement:biddingOnDebt", {
                      asset: parsedAsset.s,
                      collateral: parsedCollateralAsset.s,
                    })
                  : t("Settlement:settlingFor", {
                      forceSettleAmount: forceSettleAmount,
                      asset: parsedAsset.s,
                      totalReceiving: totalReceiving,
                      collateral: parsedCollateralAsset.s,
                    })
              }
              trxJSON={[
                settlementFund && settlementFund.finalSettlementFund
                  ? {
                      bidder: usr.id,
                      additional_collateral: {
                        amount: blockchainFloat(additionalCollateral, parsedCollateralAsset.p),
                        asset_id: parsedCollateralAsset.id,
                      },
                      debt_covered: {
                        amount: blockchainFloat(debtCovered, parsedAsset.p),
                        asset_id: parsedAsset.id,
                      },
                      extensions: [],
                    }
                  : {
                      account: usr.id,
                      amount: {
                        amount: blockchainFloat(forceSettleAmount, parsedAsset.p),
                        asset_id: parsedAsset.id,
                      },
                      extensions: [],
                    },
              ]}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
