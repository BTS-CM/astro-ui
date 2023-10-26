import React, {
  useState,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { $currentUser } from "../stores/users.ts";
import { $offersCache, $assetCache } from "../stores/cache.ts";
import { humanReadableFloat } from "@/lib/common.js";
import { createUserBalancesStore } from "../effects/Pools.ts";
import { useInitCache } from "../effects/Init.ts";

import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

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

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const assets = useSyncExternalStore(
    $assetCache.subscribe,
    $assetCache.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares");

  const offers = useSyncExternalStore(
    $offersCache.subscribe,
    $offersCache.get,
    () => true
  );

  const [foundAsset, setFoundAsset] = useState(null);
  const [relevantOffer, setRelevantOffer] = useState(null);
  useEffect(() => {
    async function parseUrlAssets() {
      console.log("Parsing url parameters");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const id = params.id;

      if (!id) {
        console.log("No market parameters found.");
        return offers[0];
      } else {
        const foundOffer = offers.find((offer) => offer.id === id);

        if (foundOffer) {
          console.log({ msg: "Setting found offer.", foundOffer });
          return foundOffer;
        } else {
          console.log("Setting default first offer");
          return offers[0];
        }
      }
    }

    if (offers && offers.length) {
      parseUrlAssets().then((foundOffer) => {
        console.log({ foundOffer });
        const foundAsset = assets.find(
          (asset) => asset.id === foundOffer.asset_type
        );
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

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            setBalanceAssetIDs(data.map((x) => x.asset_id));
            setUsrBalances(data);
          }
        }
      );
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
      return humanReadableFloat(
        relevantOffer.current_balance,
        foundAsset.precision
      );
    } else {
      return 0;
    }
  }, [relevantOffer, foundAsset]);

  const minAmount = useMemo(() => {
    if (relevantOffer && foundAsset) {
      return humanReadableFloat(
        relevantOffer.min_deal_amount,
        foundAsset.precision
      );
    } else {
      return 1;
    }
  }, [relevantOffer, foundAsset]);

  const [inputValue, setInputValue] = useState(0);
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
      const fixedValue = parseFloat(debouncedInputValue).toFixed(
        foundAsset.precision
      );
      setFinalBorrowAmount(fixedValue);
      setInputValue(fixedValue); // Set value to minimum accepted amount
    } else {
      setFinalBorrowAmount(debouncedInputValue);
    }
  }, [debouncedInputValue, availableAmount]);

  const collateralInfo = useMemo(() => {
    if (chosenCollateral && balanceAssetIDs) {
      const collateralAsset = assets.find(
        (asset) => asset.id === chosenCollateral
      );
      const collateralBalance = usrBalances.find(
        (balance) => balance.asset_id === chosenCollateral
      );
      return {
        amount: collateralBalance
          ? humanReadableFloat(
              collateralBalance.amount,
              collateralAsset.precision
            )
          : 0,
        holding: balanceAssetIDs.includes(chosenCollateral),
        symbol: collateralAsset.symbol,
        id: collateralAsset.id,
      };
    }
  }, [chosenCollateral, balanceAssetIDs]);

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
        return `${hours.toFixed(
          hours < 1 ? 2 : 0
        )} hours (due by ${formattedDate})`;
      }
    }
  }, [relevantOffer]);

  const offerExpiration = useMemo(() => {
    if (relevantOffer) {
      const hours = hoursTillExpiration(relevantOffer.auto_disable_time);
      let date = new Date(relevantOffer.auto_disable_time);
      let formattedDate = `${date.getDate()}/${
        date.getMonth() + 1
      }/${date.getFullYear()}`;

      if (hours > 24) {
        return `${Math.floor(hours / 24)} days (on ${formattedDate})`;
      } else {
        return `${hours.toFixed(
          hours < 1 ? 2 : 0
        )} hours (on ${formattedDate})`;
      }
    }
  }, [relevantOffer]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>
                {relevantOffer ? (
                  <>
                    🏦 Viewing offer #{relevantOffer.id} created by{" "}
                    {relevantOffer.owner_name ?? "?"} (
                    {relevantOffer.owner_account})
                  </>
                ) : (
                  "loading terms of offer..."
                )}
              </CardTitle>
              <CardDescription>
                This is an user created credit offer on the Bitshares DEX.
                <br />
                Thoroughly read the terms of the offer before proceeding to
                Beet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {relevantOffer ? (
                <>
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
                            name="account"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Borrowing account</FormLabel>
                                <FormControl>
                                  <Input
                                    disabled
                                    placeholder="Bitshares account (1.2.x)"
                                    className="mb-3 mt-3"
                                    value={`${usr.username} (${usr.id})`}
                                    readOnly
                                  />
                                </FormControl>
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
                                  Amount of {foundAsset.symbol} (
                                  {relevantOffer.asset_type}) available to
                                  borrow from this lender
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    disabled
                                    value={`${humanReadableFloat(
                                      relevantOffer.current_balance,
                                      foundAsset.precision
                                    )} ${foundAsset.symbol}`}
                                    className="mb-3"
                                    readOnly
                                  />
                                </FormControl>
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
                                      {`Amount of ${foundAsset.symbol} you want to borrow`}
                                    </div>
                                    <div className="col-span-1 text-right">
                                      {`Min amount: ${minAmount} ${foundAsset.symbol}  (${relevantOffer.asset_type})`}
                                    </div>
                                  </div>
                                </FormLabel>

                                {!availableAmount ? (
                                  <FormControl>
                                    <Input
                                      disabled
                                      value={0}
                                      className="mb-3"
                                      readOnly
                                    />
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
                                    <Input
                                      value={inputValue}
                                      className="mb-3"
                                    />
                                  </FormControl>
                                )}

                                <FormMessage />
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
                                      Backing collateral for credit deal
                                    </div>
                                  </div>
                                </FormLabel>
                                <FormControl
                                  onValueChange={(collateral) => {
                                    setChosenCollateral(collateral);
                                  }}
                                >
                                  <Select>
                                    <SelectTrigger className="mb-3">
                                      <SelectValue
                                        placeholder={
                                          chosenCollateral
                                            ? `chosen collateral`
                                            : "Select your backing collateral.."
                                        }
                                      />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                      {acceptedCollateral &&
                                      acceptedCollateral.length ? (
                                        <List
                                          height={100}
                                          itemCount={acceptedCollateral.length}
                                          itemSize={35}
                                          className="w-full"
                                          initialScrollOffset={
                                            chosenCollateral
                                              ? acceptedCollateral
                                                  .map((x) => x.id)
                                                  .indexOf(
                                                    chosenCollateral.id
                                                  ) * 35
                                              : 0
                                          }
                                        >
                                          {Row}
                                        </List>
                                      ) : null}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                {balanceAssetIDs &&
                                chosenCollateral &&
                                !balanceAssetIDs.includes(chosenCollateral) ? (
                                  <FormMessage>
                                    Account doesn't hold this backing collateral
                                    asset.
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
                                        {`Required collateral`}
                                      </div>
                                      <div className="col-span-1 text-right">
                                        {`Your balance: ${collateralInfo.amount} ${collateralInfo.symbol}`}
                                      </div>
                                    </div>
                                  </FormLabel>

                                  <FormDescription>
                                    In order to borrow {finalBorrowAmount ?? ""}{" "}
                                    {foundAsset ? foundAsset.symbol : ""} you'll
                                    need to provide the following collateral to
                                    secure the deal.
                                  </FormDescription>
                                  <FormControl>
                                    <Input
                                      disabled
                                      value={`1 ${collateralInfo.symbol}`}
                                      className="mb-3"
                                      readOnly
                                    />
                                  </FormControl>

                                  {!collateralInfo.holding ? (
                                    <FormMessage>
                                      Your account does not hold this asset. Try
                                      another form of backing collateral if
                                      possible.
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
                                      {`Repay period`}
                                    </div>
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  The maximum duration of the credit deal; repay
                                  the loan within this period to avoid loss of
                                  collateral.
                                </FormDescription>
                                <FormControl>
                                  <Input
                                    disabled
                                    value={offerRepayPeriod}
                                    className="mb-3"
                                    readOnly
                                  />
                                </FormControl>
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
                                      {`Credit offer expiry`}
                                    </div>
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  When this offer will no longer exist.
                                </FormDescription>
                                <FormControl>
                                  <Input
                                    disabled
                                    value={offerExpiration}
                                    className="mb-3"
                                    readOnly
                                  />
                                </FormControl>
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
                                      Estimated fee
                                    </div>
                                    <div className="col-span-1 text-right">
                                      {relevantOffer.fee_rate / 10000}% of
                                      borrowed amount
                                    </div>
                                  </div>
                                </FormLabel>
                                <FormControl>
                                  <Input disabled value={0} className="mb-3" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </form>
                      </Form>
                    </div>
                  </div>
                </>
              ) : (
                <>Loading...</>
              )}
            </CardContent>
            <CardFooter>
              <Button>Submit</Button>
            </CardFooter>
          </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? (
            <CurrentUser usr={usr} />
          ) : null}
        </div>
      </div>
    </>
  );
}
