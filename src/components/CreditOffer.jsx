import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { FixedSizeList as List } from "react-window";
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
import { Skeleton } from "@/components/ui/skeleton";

import { blockchainFloat, humanReadableFloat } from "@/lib/common.js";

import { $currentUser } from "../stores/users.ts";
import {
  $assetCacheBTS,
  $assetCacheTEST,
  $offersCacheBTS,
  $offersCacheTEST,
  $globalParamsCacheBTS,
  $globalParamsCacheTEST,
} from "../stores/cache.ts";

import { createUserBalancesStore } from "../effects/User.ts";
import { useInitCache } from "../effects/Init.ts";

import CurrentUser from "./common/CurrentUser.jsx";
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

export default function CreditBorrow(properties) {
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

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

  const _offersBTS = useSyncExternalStore(
    $offersCacheBTS.subscribe,
    $offersCacheBTS.get,
    () => true
  );

  const _offersTEST = useSyncExternalStore(
    $offersCacheTEST.subscribe,
    $offersCacheTEST.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", ["assets", "globalParams", "offers"]);

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
      const foundFee = globalParams.find((x) => x[0] === 72);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
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
      } else {
        const foundOffer = offers.find((offer) => offer.id === id);

        if (!foundOffer) {
          return null;
        }

        //console.log("Found offer");
        return foundOffer;
      }
    }

    if (offers && offers.length) {
      parseUrlAssets().then((foundOffer) => {
        if (!foundOffer) {
          setError(true);
          return;
        }
        const foundAsset = assets.find((asset) => asset.id === foundOffer.asset_type);
        setError(false);
        setFoundAsset(foundAsset);
        setRelevantOffer(foundOffer);
      });
    }
  }, [offers]);

  const [usrBalances, setUsrBalances] = useState();
  const [balanceAssetIDs, setBalanceAssetIDs] = useState([]);
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBalanceAssetIDs(data.map((x) => x.asset_id));
          setUsrBalances(data);
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
  const [debouncedInputValue, setDebouncedInputValue] = useState(0);
  const [finalBorrowAmount, setFinalBorrowAmount] = useState();

  // Update debouncedInputValue after user stops typing for 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInputValue(inputValue);
    }, 1000);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Calculate finalBorrowAmount when debouncedInputValue or availableAmount changes
  useEffect(() => {
    if (!availableAmount) {
      setFinalBorrowAmount(0);
      return;
    }
    if (!debouncedInputValue) {
      return;
    }
    if (debouncedInputValue > availableAmount) {
      setFinalBorrowAmount(availableAmount);
      setInputValue(availableAmount); // Set value to maximum available amount
    } else if (debouncedInputValue < minAmount) {
      setFinalBorrowAmount(minAmount);
      setInputValue(minAmount); // Set value to minimum accepted amount
    } else if (
      debouncedInputValue.toString().split(".").length > 1 &&
      debouncedInputValue.toString().split(".")[1].length > foundAsset.precision
    ) {
      const fixedValue = parseFloat(debouncedInputValue).toFixed(foundAsset.precision);
      setFinalBorrowAmount(fixedValue);
      setInputValue(fixedValue); // Set value to minimum accepted amount
    } else {
      setFinalBorrowAmount(debouncedInputValue);
    }
  }, [debouncedInputValue, availableAmount]);

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

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          {error ? (
            <Card>
              <CardHeader className="pb-1 mb-3 mt-3">
                <CardTitle>Sorry, couldn't find your requested credit offer</CardTitle>
                <CardDescription className="pt-2">
                  The credit offer is either not active, or doesn't exist.
                  <br />
                  Check your URL parameters and try again.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href="/offers/index.html">
                  <Button variant="" className="h-6">
                    Return to credit offer overview
                  </Button>
                </a>
              </CardContent>
            </Card>
          ) : null}
          {!error ? (
            <Card>
              <CardHeader className="pb-1">
                <CardTitle>
                  {relevantOffer ? (
                    <>
                      🏦 Viewing offer #{relevantOffer.id} created by{" "}
                      {relevantOffer.owner_name ?? "?"} ({relevantOffer.owner_account})
                    </>
                  ) : (
                    "loading terms of offer..."
                  )}
                </CardTitle>
                <CardDescription>
                  This is an user created credit offer on the Bitshares DEX.
                  <br />
                  Thoroughly read the terms of the offer before proceeding to Beet.
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
                              <FormLabel>Borrowing account</FormLabel>
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
                                The account which will broadcast the credit offer accept operation.
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
                                  <div className="col-span-1">Lending account</div>
                                  <div className="col-span-1 text-right">
                                    {relevantOffer ? (
                                      <ExternalLink
                                        classnamecontents="text-blue-500"
                                        type="text"
                                        text={`View ${relevantOffer.owner_name}'s account`}
                                        hyperlink={`https://blocksights.info/#/accounts/${relevantOffer.owner_name}`}
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-8 mt-4">
                                  <div className="col-span-1 ml-5">
                                    {relevantOffer && relevantOffer.owner_name ? (
                                      <Avatar
                                        size={40}
                                        name={relevantOffer.owner_name}
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
                                        relevantOffer
                                          ? `${relevantOffer.owner_name} (${relevantOffer.owner_account})`
                                          : ""
                                      }
                                      readOnly
                                    />
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                {`This is the user from whom you'll be borrowing ${foundAsset?.symbol} from.`}
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
                                  ? `Amount of ${foundAsset.symbol} (
                                      ${relevantOffer.asset_type}) available to
                                      borrow from this lender`
                                  : "loading..."}
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
                                          : `loading...`
                                      }
                                      readOnly
                                    />
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                {`${relevantOffer?.owner_name} is generously offering to lend you this much ${foundAsset?.symbol}, assuming you agree to their terms.`}
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
                                  <div className="mt-1">Backing collateral for credit deal</div>
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
                                              : "Select your backing collateral.."
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
                                {`To borrow ${collateralInfo?.symbol} from ${relevantOffer?.owner_name}, choose between the above accepted backing collateral assets.`}
                              </FormDescription>
                              {balanceAssetIDs &&
                              chosenCollateral &&
                              !balanceAssetIDs.includes(chosenCollateral) ? (
                                <FormMessage>
                                  Account doesn't hold this backing collateral asset.
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
                                    {`Amount of ${
                                      foundAsset ? foundAsset.symbol : "?"
                                    } you plan on borrowing`}
                                  </div>
                                  <div className="col-span-1 text-right">
                                    {`Available: ${minAmount ?? "?"} to ${availableAmount ?? "?"} ${
                                      foundAsset?.symbol
                                    }`}
                                  </div>
                                </div>
                              </FormLabel>
                              {!availableAmount ? (
                                <FormControl>
                                  <Input disabled value={0} className="mb-3" readOnly />
                                </FormControl>
                              ) : (
                                <FormControl
                                  onChange={(event) => {
                                    const input = event.target.value;
                                    const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                                    if (regex.test(input)) {
                                      setInputValue(input);
                                    }
                                  }}
                                >
                                  <Input value={inputValue} className="mb-3" />
                                </FormControl>
                              )}

                              <FormDescription>
                                {`Input the amount of ${foundAsset?.symbol} you'd like to borrow from ${relevantOffer?.owner_name}.`}
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
                                  <div className="mt-1">Credit offer repay method</div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={(period) => {
                                    setRepayPeriod(period);
                                  }}
                                >
                                  <SelectTrigger className="mb-1">
                                    <SelectValue placeholder={"Select your repay method.."} />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white">
                                    <SelectItem value={"no_auto_repayment"}>
                                      No auto repayment
                                    </SelectItem>
                                    <SelectItem value={"only_full_repayment"}>
                                      Only full repayment
                                    </SelectItem>
                                    <SelectItem value={"allow_partial_repayment"}>
                                      Allow partial repayment
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormDescription>
                                Select between the different repayment methods.
                              </FormDescription>
                              {repayPeriod ? (
                                <FormMessage>
                                  {repayPeriod === "no_auto_repayment"
                                    ? "You will not automatically repay this loan."
                                    : null}
                                  {repayPeriod === "only_full_repayment"
                                    ? "You will automatically repay this loan in full when your account balance is sufficient."
                                    : null}
                                  {repayPeriod === "allow_partial_repayment"
                                    ? "You will automatically repay this loan as much as possible using your available account balance."
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
                                    <div className="col-span-1">{`Required collateral`}</div>
                                    <div className="col-span-1 text-right">
                                      {collateralInfo
                                        ? `Your current balance: ${collateralInfo.amount} ${collateralInfo.symbol}`
                                        : "Loading balance..."}
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
                                    ? `In order to borrow ${finalBorrowAmount ?? ""} ${
                                        foundAsset ? foundAsset.symbol : ""
                                      } you'll
                                need to provide the following amount of collateral to
                                secure the deal.`
                                    : "Enter a valid borrow amount to calculate required collateral."}
                                </FormDescription>

                                {collateralInfo &&
                                collateralInfo.holding &&
                                collateralInfo.amount < requiredCollateralAmount ? (
                                  <FormMessage>
                                    {`Your account has an insufficient ${
                                      collateralInfo.symbol
                                    } balance. You'll need at least ${(
                                      requiredCollateralAmount - collateralInfo.amount
                                    ).toFixed(collateralInfo.precision)} more ${
                                      collateralInfo.symbol
                                    }.`}
                                  </FormMessage>
                                ) : null}

                                {collateralInfo && !collateralInfo.holding ? (
                                  <FormMessage>
                                    Your account does not hold this asset. Try another form of
                                    backing collateral if possible.
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
                                  <div className="col-span-1">{`Repay period`}</div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled
                                  value={offerRepayPeriod ?? "loading..."}
                                  className="mb-3"
                                  readOnly
                                />
                              </FormControl>
                              <FormDescription>
                                The maximum duration of the credit deal; repay the loan within this
                                period to avoid loss of collateral.
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
                                  <div className="col-span-1">{`Credit offer expiry`}</div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled
                                  value={offerExpiration ?? "Loading..."}
                                  className="mb-3"
                                  readOnly
                                />
                              </FormControl>
                              <FormDescription>
                                When this offer will no longer exist.
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
                                  <div className="col-span-1">Estimated borrow fee</div>
                                  <div className="col-span-1 text-right">
                                    {relevantOffer
                                      ? `${relevantOffer.fee_rate / 10000}% of borrowed
                                    amount`
                                      : "Loading borrow fee.."}
                                  </div>
                                </div>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled
                                  value={
                                    finalBorrowAmount
                                      ? `${finalBorrowAmount * 0.01} ${
                                          foundAsset ? foundAsset.symbol : "?"
                                        }`
                                      : `0 ${foundAsset ? foundAsset.symbol : "?"}`
                                  }
                                  className="mb-3"
                                  readOnly
                                />
                              </FormControl>
                              <FormDescription>
                                {`This is how much ${foundAsset ? foundAsset.symbol : "?"} that ${
                                  relevantOffer ? relevantOffer.owner_name : "?"
                                } will earn once this deal has completed.`}
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
                              <FormLabel>Network fee</FormLabel>
                              <Input disabled value={`${fee ?? "?"} BTS`} label={`fees`} readOnly />
                              <FormDescription>
                                The cost to broadcast your credit deal operation onto the network.
                              </FormDescription>
                              {usr && usr.id === usr.referrer ? (
                                <FormMessage>LTM rebate: {0.8 * fee} BTS (vesting)</FormMessage>
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
                  <Button disabled>Submit</Button>
                ) : (
                  <Button onClick={() => setShowDialog(true)}>Submit</Button>
                )}
              </CardFooter>
            </Card>
          ) : null}
        </div>
        {showDialog ? (
          <DeepLinkDialog
            operationName="credit_offer_accept"
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            key={`Borrowing${finalBorrowAmount}${foundAsset.symbol}from${relevantOffer.owner_name}(${relevantOffer.owner_account})`}
            headerText={`Borrowing ${finalBorrowAmount} ${foundAsset.symbol} from ${relevantOffer.owner_name} (${relevantOffer.owner_account})`}
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
              <CardTitle>Risks of Peer-to-Peer Loans</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              Peer-to-peer lending involves certain risks, including:
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                <li>
                  Collateral Risk: As a borrower, you may fail to repay the loan on time, forfeiting
                  the loan collateral in full.
                </li>
                <li>
                  Liquidity Risk: If you sell the assets you borrow, it may not be possible to
                  re-acquire the assets in time to repay the loan, or you may do so at a loss.
                </li>
                <li>
                  Platform Risk: If an asset's owner company goes out of business and ceases an
                  exchange backed asset's operation, you could lose funds.
                </li>
                <li>
                  User Risk: As credit offers are fully user generated, you could be interacting
                  with untrustworthy assets or users who put funds at risk.
                </li>
                <li>
                  Network Risk: Whilst blockchain downtime is very rare, it's a risk to consider
                  when creating credit deals which span a period of time. Auto loan repay methods
                  are available to offset such risk.
                </li>
              </ul>
            </CardContent>
            <CardFooter className="text-sm">
              Please consider these risks and thoroughly evaluate the terms of offers before
              proceeding with a credit deal.
            </CardFooter>
          </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}
        </div>
      </div>
    </>
  );
}
