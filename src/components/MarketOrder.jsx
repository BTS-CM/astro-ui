import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { CalendarIcon, LockOpen2Icon, LockClosedIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";

import {
  $assetCacheBTS,
  $assetCacheTEST,
  $globalParamsCacheBTS,
  $globalParamsCacheTEST,
  $poolCacheBTS,
  $poolCacheTEST,
} from "../stores/cache.ts";

import {
  humanReadableFloat,
  trimPrice,
  blockchainFloat,
  debounce,
  isInvertedMarket,
} from "../lib/common";

import { createUserBalancesStore } from "../effects/User.ts";
import { createLimitOrderStore } from "../effects/Market.ts";

import { Avatar } from "./Avatar.tsx";

import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";
import PoolDialogs from "./Market/PoolDialogs.jsx";

export default function MarketOrder(properties) {
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const [quoteAsset, setQuoteAsset] = useState();
  const [baseAsset, setBaseAsset] = useState();
  const [existingQuoteAmount, setExistingQuoteAmount] = useState(0);
  const [existingBaseAmount, setExistingBaseAmount] = useState(0);
  const [existingPrice, setExistingPrice] = useState(0);
  const [existingExpiry, setExistingExpiry] = useState();

  const [priceLock, setPriceLock] = useState("locked");
  const [amountLock, setAmountLock] = useState("locked");
  const [totalLock, setTotalLock] = useState("locked");
  const [expirationLock, setExpirationLock] = useState("locked");

  const [cancelDialog, setCancelDialog] = useState(false); // limit_order_cancel prompt
  const [showDialog, setShowDialog] = useState(false); // limit_order_update prompt

  const [amount, setAmount] = useState(0.0);
  const [price, setPrice] = useState(0.0);
  const [total, setTotal] = useState(0);

  const [marketInverted, setMarketInverted] = useState(false);

  const [expiryType, setExpiryType] = useState("1hr");
  const [expiry, setExpiry] = useState(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });
  const [date, setDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Solely for the calendar component to display a date string

  useEffect(() => {
    if (expiryType === "specific" && date) {
      setExpiry(date);
    }
  }, [expiryType, date]);

  const [inputChars, setInputChars] = useState(0);

  const [osoEnabled, setOSOEnabled] = useState(false);
  const [spreadPercent, setSpreadPercent] = useState(1);
  const [sizePercent, setSizePercent] = useState(100);
  const [expirationSeconds, setExpirationSeconds] = useState(1000000);
  const [repeat, setRepeat] = useState(false);

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

  const _poolsBTS = useSyncExternalStore($poolCacheBTS.subscribe, $poolCacheBTS.get, () => true);
  const _poolsTEST = useSyncExternalStore($poolCacheTEST.subscribe, $poolCacheTEST.get, () => true);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", ["assets", "globalParams", "pools"]);

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

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 77);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [limitOrderID, setLimitOrderID] = useState();
  useEffect(() => {
    async function parseUrlAssets() {
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const id = params.id;

      if (!id || !id.includes("1.7.")) {
        return;
      }

      return { id };
    }

    if (usr && usr.chain && window.location.search) {
      parseUrlAssets().then(({ id }) => {
        setLimitOrderID(id);
      });
    }
  }, [usr]);

  const [currentLimitOrder, setCurrentLimitOrder] = useState();
  useEffect(() => {
    let unsubscribeLimitOrder;

    if (limitOrderID && usr && usr.chain) {
      const limitOrderStore = createLimitOrderStore([usr.chain, limitOrderID]);
      unsubscribeLimitOrder = limitOrderStore.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          setCurrentLimitOrder(data);

          const foundQuoteAsset = assets.find((x) => x.id === data.sell_price.quote.asset_id);
          const foundBaseAsset = assets.find((x) => x.id === data.sell_price.base.asset_id);
          setQuoteAsset(foundQuoteAsset);
          setBaseAsset(foundBaseAsset);

          const _quoteAmount = humanReadableFloat(
            data.sell_price.quote.amount,
            foundQuoteAsset.precision
          );
          const _baseAmount = humanReadableFloat(
            data.sell_price.base.amount,
            foundBaseAsset.precision
          );
          const isInverted = isInvertedMarket(foundBaseAsset.id, foundQuoteAsset.id);
          setMarketInverted(isInverted);

          setExistingQuoteAmount(_quoteAmount);
          setExistingBaseAmount(_baseAmount);
          setExistingPrice(!isInverted ? _baseAmount * _quoteAmount : _baseAmount / _quoteAmount);
          setExistingExpiry(data.expiration);

          //////
          setAmount(_baseAmount);
          setTotal(_quoteAmount);

          setPrice(!isInverted ? _baseAmount * _quoteAmount : _baseAmount / _quoteAmount);

          const onFillContents = data.on_fill.length ? data.on_fill[0][1] : null;
          if (onFillContents) {
            setOSOEnabled(true);
            setSpreadPercent(onFillContents.spread_percent / 100);
            setSizePercent(onFillContents.size_percent / 100);
            setExpirationSeconds(onFillContents.expiration_seconds);
            setRepeat(onFillContents.repeat);
          }
        }
      });
    }

    return () => {
      if (unsubscribeLimitOrder) unsubscribeLimitOrder();
    };
  }, [limitOrderID, usr]);

  const [balances, setBalances] = useState();
  const [quoteBalance, setQuoteBalance] = useState(0);
  const [baseBalance, setBaseBalance] = useState(0);
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && currentLimitOrder && baseAsset && quoteAsset) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBalances(data);
          const foundBase = data.find((x) => x.asset_id === baseAsset.id);
          const foundQuote = data.find((x) => x.asset_id === quoteAsset.id);
          setBaseBalance(foundBase ? humanReadableFloat(foundBase.amount, baseAsset.precision) : 0);
          setQuoteBalance(
            foundQuote ? humanReadableFloat(foundQuote.amount, quoteAsset.precision) : 0
          );
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, currentLimitOrder, baseAsset, quoteAsset]);

  const debouncedSetSpreadPercent = useCallback(
    debounce((input, mcr) => {
      const regex = /^[0-9]*\.?[0-9]*$/;
      if (regex.test(input)) {
        if (input >= 0 && input <= 100) {
          setSpreadPercent(input);
          setInputChars(inputChars + 1);
        }
      }
    }, 25),
    []
  );

  const debouncedSetSizePercent = useCallback(
    debounce((input, mcr) => {
      const regex = /^[0-9]*\.?[0-9]*$/;
      if (regex.test(input)) {
        if (input >= 0 && input <= 100) {
          setSizePercent(input);
          setInputChars(inputChars + 1);
        }
      }
    }, 25),
    []
  );

  const operationContents = useMemo(() => {
    if (usr && usr.id && limitOrderID && baseAsset && quoteAsset) {
      const baseOperation = {
        fee: {
          amount: 0,
          asset_id: "1.3.0",
        },
        seller: usr.id,
        order: limitOrderID,
        new_price:
          priceLock === "editable"
            ? {
                base: {
                  amount: blockchainFloat(amount, baseAsset.precision),
                  asset_id: baseAsset.id,
                },
                quote: {
                  amount: blockchainFloat(total, quoteAsset.precision),
                  asset_id: quoteAsset.id,
                },
              }
            : undefined,
        new_expiration: expirationLock === "editable" ? date : undefined,
        on_fill: osoEnabled
          ? [
              [
                0,
                {
                  fee_asset_id: "1.3.0",
                  spread_percent: spreadPercent ? spreadPercent * 100 : 0,
                  size_percent: sizePercent ? sizePercent * 100 : 0,
                  expiration_seconds: 1000000000,
                  repeat: repeat,
                },
              ],
            ]
          : undefined,
        extensions: [],
      };

      if (amountLock === "editable") {
        const deltaAmount = parseFloat(amount - existingBaseAmount);
        if ((deltaAmount && deltaAmount < 0) || (deltaAmount && deltaAmount > 0)) {
          baseOperation.delta_amount_to_sell = {
            amount: blockchainFloat(deltaAmount, baseAsset.precision),
            asset_id: baseAsset.id,
          };
        }
      } else {
        baseOperation.delta_amount_to_sell = undefined;
      }

      return baseOperation;
    }
  }, [
    usr,
    limitOrderID,
    existingBaseAmount,
    total,
    baseAsset,
    expiry,
    osoEnabled,
    spreadPercent,
    sizePercent,
    repeat,
  ]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-0 mb-0">
              <CardTitle className="mb-2">
                <span className="grid grid-cols-2">
                  <span className="col-span-1 text-left">Updating limit order {limitOrderID}</span>
                  <span className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="h-6">View existing limit order data</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] bg-white">
                        <DialogHeader>
                          <DialogTitle>Existing limit order data</DialogTitle>
                          <DialogDescription>
                            This form will update the following JSON data
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1">
                          <div className="col-span-1">
                            <ScrollArea className="h-72 rounded-md border text-sm">
                              <pre>{JSON.stringify(currentLimitOrder, null, 2)}</pre>
                            </ScrollArea>
                          </div>
                          <div className="col-span-1 text-left mt-5">
                            <ExternalLink
                              variant="outline"
                              classnamecontents=""
                              type="button"
                              text={`View object on blocksights.info`}
                              hyperlink={`https://blocksights.info/#/objects/${limitOrderID}`}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </span>
                </span>
              </CardTitle>
              <CardDescription>
                The Bitshares DEX now supports directly editing open limit orders via this form
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form>
                  <FormField
                    control={form.control}
                    name="account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit order owner</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-8 gap-2">
                            <div className="col-span-1 ml-5">
                              {currentLimitOrder && usr ? (
                                <Avatar
                                  size={40}
                                  key={`Avatar_${
                                    usr.id === currentLimitOrder.seller ? "loggedIn" : "loggedOut"
                                  }`}
                                  name={
                                    usr.id === currentLimitOrder.seller
                                      ? usr.username
                                      : currentLimitOrder.seller.replace(".", "_")
                                  }
                                  extra="Sender"
                                  expression={{
                                    eye: usr.id === currentLimitOrder.seller ? "normal" : "sleepy",
                                    mouth: usr.id === currentLimitOrder.seller ? "open" : "unhappy",
                                  }}
                                  colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                                />
                              ) : null}
                            </div>
                            <div className="col-span-4">
                              {usr && currentLimitOrder ? (
                                <Input
                                  disabled
                                  placeholder="Bitshares account (1.2.x)"
                                  className="mb-1 mt-1"
                                  value={
                                    usr && usr.id === currentLimitOrder.seller
                                      ? `${usr.username} (${usr.id})`
                                      : currentLimitOrder.seller
                                  }
                                />
                              ) : null}
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          This is the account which owns the market order that is being updated.
                        </FormDescription>
                        {currentLimitOrder && usr && usr.id !== currentLimitOrder.seller ? (
                          <FormMessage>
                            ⚠️ You are not logged in as the Bitshares account which owns this limit
                            order.
                          </FormMessage>
                        ) : null}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priceAmount"
                    render={({ field }) => (
                      <FormItem className="mt-4 text-xs">
                        <span className="grid grid-cols-12">
                          <span className="col-span-1">
                            <HoverCard key="amountLockCard">
                              <HoverCardTrigger>
                                <Toggle
                                  variant="outline"
                                  onClick={() => {
                                    if (priceLock === "editable") {
                                      setPriceLock("locked");
                                      setPrice(existingPrice);
                                      if (amountLock === "locked") {
                                        setTotalLock("locked");
                                        setTotal(existingQuoteAmount);
                                      }
                                    } else {
                                      setPriceLock("editable");
                                      setTotalLock("editable");
                                    }
                                  }}
                                >
                                  {priceLock === "editable" ? (
                                    <LockOpen2Icon className="h-4 w-4" />
                                  ) : (
                                    <LockClosedIcon className="h-4 w-4" />
                                  )}
                                </Toggle>
                              </HoverCardTrigger>
                              <HoverCardContent
                                className="w-40 text-sm text-center pt-1 pb-1"
                                derp="Optionally change the limit order price"
                              >
                                {priceLock === "editable" ? "Editing the price" : "Price is locked"}
                              </HoverCardContent>
                            </HoverCard>
                          </span>
                          <span className="col-span-10">
                            <FormLabel>
                              {priceLock === "editable"
                                ? "Updating the price"
                                : "Want to change the price ?"}
                            </FormLabel>
                            <FormDescription>
                              {priceLock === "editable"
                                ? `The existing price: ${existingPrice} ${
                                    quoteAsset ? quoteAsset.symbol : "?"
                                  }/${baseAsset ? baseAsset.symbol : "?"}`
                                : "Click the unlock button to begin setting a new price"}
                            </FormDescription>
                          </span>
                        </span>
                      </FormItem>
                    )}
                  />

                  {priceLock === "editable" && quoteAsset && baseAsset ? (
                    <FormControl>
                      <span className="grid grid-cols-12 mt-3">
                        <span className="col-span-1"></span>
                        <span className="col-span-7">
                          <Input
                            label={`Price`}
                            placeholder={`${price} ${quoteAsset.symbol}/${baseAsset.symbol}`}
                            disabled
                            readOnly
                          />
                        </span>
                        <span className="col-span-4 ml-3 text-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                className="w-full"
                                onClick={() => event.preventDefault()}
                                variant="outline"
                              >
                                Set new price
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>Provide a new price</Label>
                              <Input
                                placeholder={price}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = /^[0-9,]*\.?[0-9]*$/;
                                  if (input && input.length && regex.test(input)) {
                                    const parsedInput = parseFloat(input.replaceAll(",", ""));
                                    if (parsedInput) {
                                      setPrice(parsedInput);
                                      if (amount && totalLock === "editable") {
                                        setTotal(
                                          parseFloat(
                                            (
                                              amount *
                                              (marketInverted ? 1 / parsedInput : parsedInput)
                                            ).toFixed(quoteAsset.precision)
                                          )
                                        );
                                      }
                                      setInputChars(inputChars + 1);
                                    }
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </span>
                      </span>
                    </FormControl>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="sellAmount"
                    render={({ field }) => (
                      <FormItem className="mt-4 text-xs">
                        <span className="grid grid-cols-12">
                          <span className="col-span-1">
                            <HoverCard key="amountLockCard">
                              <HoverCardTrigger>
                                <Toggle
                                  variant="outline"
                                  onClick={() => {
                                    if (amountLock === "editable") {
                                      setAmountLock("locked");
                                      if (priceLock === "locked") {
                                        setTotalLock("locked");
                                      }
                                    } else {
                                      setAmountLock("editable");
                                      setTotalLock("editable");
                                    }
                                  }}
                                >
                                  {amountLock === "editable" ? (
                                    <LockOpen2Icon className="h-4 w-4" />
                                  ) : (
                                    <LockClosedIcon className="h-4 w-4" />
                                  )}
                                </Toggle>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                                {amountLock === "editable"
                                  ? "Editing the amount being sold"
                                  : "Currently locked. Using existing amount being sold"}
                              </HoverCardContent>
                            </HoverCard>
                          </span>
                          <span className="col-span-11">
                            <FormLabel>
                              {amountLock === "editable"
                                ? `Updating the amount of ${
                                    baseAsset ? baseAsset.symbol : "?"
                                  } being sold`
                                : `Want to update the amount of ${
                                    baseAsset ? baseAsset.symbol : "?"
                                  } being sold ?`}
                            </FormLabel>
                            <FormDescription>
                              {amountLock === "editable"
                                ? `The existing amount being sold: ${existingBaseAmount} ${
                                    baseAsset ? baseAsset.symbol : "?"
                                  }`
                                : `Click the unlock button to begin changing the amount you plan on selling`}
                            </FormDescription>
                          </span>
                        </span>
                        {amountLock === "editable" ? (
                          <FormControl>
                            <span className="grid grid-cols-12">
                              <span className="col-span-1"></span>
                              <span className="col-span-7">
                                <Input
                                  label={`Amount`}
                                  placeholder={`${amount} ${baseAsset ? baseAsset.symbol : "?"}`}
                                  disabled
                                  readOnly
                                />
                              </span>
                              <span className="col-span-4 ml-3 text-center">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      className="w-full"
                                      onClick={() => event.preventDefault()}
                                      variant="outline"
                                    >
                                      Set new sell amount
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent>
                                    <Label>Provide a new amount</Label>
                                    <Input
                                      placeholder={amount}
                                      className="mb-2"
                                      onChange={(event) => {
                                        const input = event.target.value;
                                        const regex = /^[0-9,]*\.?[0-9]*$/;
                                        if (input && input.length && regex.test(input)) {
                                          const parsedInput = parseFloat(input.replaceAll(",", ""));
                                          if (parsedInput) {
                                            setAmount(parsedInput.toFixed(baseAsset.precision));
                                            if (price) {
                                              setTotal(
                                                parseFloat(
                                                  (
                                                    parsedInput *
                                                    (marketInverted ? 1 / price : price)
                                                  ).toFixed(quoteAsset.precision)
                                                )
                                              );
                                            }
                                            setInputChars(inputChars + 1);
                                          }
                                        }
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </span>
                            </span>
                          </FormControl>
                        ) : null}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sellTotal"
                    render={({ field }) => (
                      <FormItem className="mt-4 text-xs">
                        <span className="grid grid-cols-12">
                          <span className="col-span-1">
                            <HoverCard key="sellTotalCard">
                              <HoverCardTrigger>
                                <Toggle
                                  variant="outline"
                                  onClick={() => {
                                    if (totalLock === "editable") {
                                      setTotalLock("locked");
                                      setTotal(existingQuoteAmount);
                                      setAmountLock("locked");
                                      setAmount(existingBaseAmount);
                                      setPriceLock("locked");
                                      setPrice(existingPrice);
                                    } else {
                                      setTotalLock("editable");
                                      setAmountLock("editable");
                                    }
                                  }}
                                >
                                  {totalLock === "editable" ? (
                                    <LockOpen2Icon className="h-4 w-4" />
                                  ) : (
                                    <LockClosedIcon className="h-4 w-4" />
                                  )}
                                </Toggle>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                                {totalLock === "editable"
                                  ? "Editing the total amount being sold"
                                  : "Currently locked. Using existing total amount."}
                              </HoverCardContent>
                            </HoverCard>
                          </span>
                          <span className="col-span-11">
                            <FormLabel>
                              {amountLock === "editable" || totalLock === "editable"
                                ? "Updating the total amount being bought"
                                : `Want to update the total amount of ${
                                    quoteAsset ? quoteAsset.symbol : "?"
                                  } being bought ?`}
                            </FormLabel>
                            <FormDescription>
                              {totalLock === "editable"
                                ? `The existing total amount being bought: ${existingQuoteAmount} ${
                                    quoteAsset ? quoteAsset.symbol : "?"
                                  }`
                                : `Click the unlock button to begin changing the total amount of ${
                                    quoteAsset ? quoteAsset.symbol : "?"
                                  } you plan on buying`}
                            </FormDescription>
                          </span>
                        </span>
                        {totalLock === "editable" && baseAsset && quoteAsset ? (
                          <FormControl>
                            <span className="grid grid-cols-12">
                              <span className="col-span-1"></span>
                              <span className="col-span-7">
                                <Input
                                  label={`Total`}
                                  placeholder={`${total} ${quoteAsset ? quoteAsset.symbol : "?"}`}
                                  disabled
                                  readOnly
                                />
                              </span>
                              <span className="col-span-4 ml-3 text-center">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      className="w-full"
                                      onClick={() => event.preventDefault()}
                                      variant="outline"
                                    >
                                      Set new total amount
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent>
                                    <Label>Provide a new total</Label>
                                    <Input
                                      placeholder={total}
                                      className="mb-2 mt-1"
                                      onChange={(event) => {
                                        const input = event.target.value;
                                        const regex = /^[0-9,]*\.?[0-9]*$/;
                                        if (input && input.length && regex.test(input)) {
                                          const parsedFloat = parseFloat(input.replaceAll(",", ""));
                                          if (parsedFloat) {
                                            setTotal(parsedFloat.toFixed(quoteAsset.precision));
                                            if (price) {
                                              setAmount(
                                                (parsedFloat / price).toFixed(baseAsset.precision)
                                              );
                                            }
                                            setInputChars(inputChars + 1);
                                          }
                                        }
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </span>
                            </span>
                          </FormControl>
                        ) : null}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiry"
                    render={({ field }) => (
                      <FormItem>
                        <span className="grid grid-cols-12 mt-4 text-sm">
                          <span className="col-span-1">
                            <HoverCard key="sellTotalCard">
                              <HoverCardTrigger>
                                <Toggle
                                  variant="outline"
                                  onClick={() => {
                                    if (expirationLock === "editable") {
                                      setExpirationLock("locked");
                                      setDate(new Date(existingExpiry));
                                    } else {
                                      setExpirationLock("editable");
                                    }
                                  }}
                                >
                                  {expirationLock === "editable" ? (
                                    <LockOpen2Icon className="h-4 w-4" />
                                  ) : (
                                    <LockClosedIcon className="h-4 w-4" />
                                  )}
                                </Toggle>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                                {expirationLock === "editable"
                                  ? "Editing the limit order expiration"
                                  : "Currently locked. Using existing expiration date"}
                              </HoverCardContent>
                            </HoverCard>
                          </span>
                          <span className="col-span-11">
                            <FormLabel>
                              {expirationLock === "editable"
                                ? "Updating the limit order expiration"
                                : "Want to update the limit order expiration ?"}
                            </FormLabel>
                            <FormDescription>
                              {expirationLock === "editable"
                                ? `The existing expiration date: ${currentLimitOrder.expiration.replace(
                                    "T",
                                    " "
                                  )}`
                                : "Click the unlock button to begin changing the limit order expiration"}
                            </FormDescription>
                          </span>
                        </span>
                        {expirationLock === "editable" ? (
                          <>
                            <span className="grid grid-cols-12">
                              <span className="col-span-1"></span>
                              <span className="col-span-7">
                                <FormControl
                                  onValueChange={(selectedExpiry) => {
                                    setExpiryType(selectedExpiry);
                                    const oneHour = 60 * 60 * 1000;
                                    const oneDay = 24 * oneHour;
                                    if (selectedExpiry !== "specific") {
                                      const now = new Date();
                                      let expiryDate;
                                      if (selectedExpiry === "1hr") {
                                        expiryDate = new Date(now.getTime() + oneHour);
                                      } else if (selectedExpiry === "12hr") {
                                        const duration = oneHour * 12;
                                        expiryDate = new Date(now.getTime() + duration);
                                      } else if (selectedExpiry === "24hr") {
                                        const duration = oneDay;
                                        expiryDate = new Date(now.getTime() + duration);
                                      } else if (selectedExpiry === "7d") {
                                        const duration = oneDay * 7;
                                        expiryDate = new Date(now.getTime() + duration);
                                      } else if (selectedExpiry === "30d") {
                                        const duration = oneDay * 30;
                                        expiryDate = new Date(now.getTime() + duration);
                                      }

                                      if (expiryDate) {
                                        setDate(expiryDate);
                                      }
                                      setExpiry(selectedExpiry);
                                    } else if (selectedExpiry === "specific") {
                                      // Setting a default date expiry
                                      setExpiry();
                                    }
                                    setInputChars(inputChars + 1);
                                  }}
                                >
                                  <Select>
                                    <SelectTrigger className="mb-3">
                                      <SelectValue placeholder="1hr" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                      <SelectItem value="1hr">1 hour</SelectItem>
                                      <SelectItem value="12hr">12 hours</SelectItem>
                                      <SelectItem value="24hr">24 hours</SelectItem>
                                      <SelectItem value="7d">7 days</SelectItem>
                                      <SelectItem value="30d">30 days</SelectItem>
                                      <SelectItem value="specific">Specific date</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                              </span>
                              <span className="col-span-4 text-center ml-3">
                                {expiryType === "specific" ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full justify-start text-left font-normal",
                                          !date && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(e) => {
                                          const parsedDate = new Date(e);
                                          const now = new Date();
                                          if (parsedDate < now) {
                                            //console.log("Not a valid date");
                                            setDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000));
                                            return;
                                          }
                                          //console.log("Setting expiry date");
                                          setDate(e);
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                ) : null}
                              </span>
                              <span className="col-span-1"></span>
                              <span className="col-span-11">
                                <FormDescription>
                                  {expiryType !== "specific"
                                    ? `This limit order will expire ${expiryType} after broadcast`
                                    : null}
                                </FormDescription>
                              </span>
                            </span>
                          </>
                        ) : null}
                      </FormItem>
                    )}
                  />

                  <Separator className="mb-2 mt-2" />

                  <FormField
                    control={form.control}
                    name="osoValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center space-x-2 mt-4">
                            <Checkbox
                              id="terms1"
                              checked={osoEnabled}
                              onClick={() => {
                                setOSOEnabled(!osoEnabled);
                                setInputChars(inputChars + 1);
                              }}
                            />
                            <label
                              htmlFor="terms1"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {osoEnabled
                                ? "Order Sends Order Enabled"
                                : "Enable Order Sends Order"}
                            </label>
                          </div>
                        </FormControl>
                        {osoEnabled ? (
                          <FormDescription>Automatic OSO function will be active</FormDescription>
                        ) : null}
                      </FormItem>
                    )}
                  />

                  {osoEnabled ? (
                    <>
                      <FormField
                        control={form.control}
                        name="osoSpread"
                        render={({ field }) => (
                          <FormItem className="mt-2 text-xs">
                            <FormLabel className="text-sm">Spread percent</FormLabel>
                            <FormDescription>
                              How far the price of the take profit order differs from the original
                              order
                            </FormDescription>
                            <FormControl>
                              <span className="grid grid-cols-12">
                                <span className="col-span-9">
                                  <Input
                                    label={`Spread percent`}
                                    placeholder={spreadPercent}
                                    disabled
                                    readOnly
                                  />
                                  <Slider
                                    className="mt-3"
                                    defaultValue={[spreadPercent]}
                                    max={100}
                                    min={1}
                                    step={0.01}
                                    onValueChange={(value) => {
                                      debouncedSetSpreadPercent(value[0]);
                                    }}
                                  />
                                </span>

                                <span className="col-span-3 ml-3 text-center">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <span
                                        onClick={() => {
                                          event.preventDefault();
                                        }}
                                        className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg"
                                      >
                                        <Label>Edit spread</Label>
                                      </span>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                      <Label>Provide a new spread percent</Label>
                                      <Input
                                        placeholder={spreadPercent}
                                        className="mb-2 mt-1"
                                        onChange={(event) => {
                                          const input = event.target.value;
                                          const regex = /^[0-9]*\.?[0-9]*$/;
                                          if (input && input.length && regex.test(input)) {
                                            if (input >= 1 && input <= 100) {
                                              setSpreadPercent(input);
                                              setInputChars(inputChars + 1);
                                            }
                                          }
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </span>
                              </span>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="osoSize"
                        render={({ field }) => (
                          <FormItem className="mt-4 text-xs">
                            <FormLabel className="text-sm">Size percent</FormLabel>
                            <FormDescription>
                              Percentage to sell in the take profit order
                            </FormDescription>
                            <FormControl>
                              <span className="grid grid-cols-12">
                                <span className="col-span-9">
                                  <Input
                                    label={`Size percent`}
                                    placeholder={sizePercent}
                                    disabled
                                    readOnly
                                  />
                                  <Slider
                                    className="mt-3"
                                    defaultValue={[sizePercent]}
                                    max={100}
                                    min={0}
                                    step={0.01}
                                    onValueChange={(value) => {
                                      debouncedSetSizePercent(value[0]);
                                    }}
                                  />
                                </span>

                                <span className="col-span-3 ml-3 text-center">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <span
                                        onClick={() => {
                                          event.preventDefault();
                                        }}
                                        className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg"
                                      >
                                        <Label>Edit size</Label>
                                      </span>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                      <Label>Provide a new size percent</Label>
                                      <Input
                                        placeholder={sizePercent}
                                        className="mb-2 mt-1"
                                        onChange={(event) => {
                                          const input = event.target.value;
                                          const regex = /^[0-9]*\.?[0-9]*$/;
                                          if (input && input.length && regex.test(input)) {
                                            if (input >= 0 && input <= 100) {
                                              setSizePercent(input);
                                              setInputChars(inputChars + 1);
                                            }
                                          }
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </span>
                              </span>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="repeatValue"
                        render={({ field }) => (
                          <FormItem className="mt-4 text-xs">
                            <FormLabel className="text-sm">
                              Set OSO to automatically repeat?
                            </FormLabel>
                            <FormDescription>
                              Automates repeated OSO based limit orders
                            </FormDescription>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="terms2"
                                  checked={repeat}
                                  onClick={() => {
                                    setRepeat(!repeat);
                                    setInputChars(inputChars + 1);
                                  }}
                                />
                                <label
                                  htmlFor="terms2"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {repeat
                                    ? `OSO configured to repeat`
                                    : `OSO configured not to repeat`}
                                </label>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : null}

                  <Separator className="mt-3" />

                  <FormField
                    control={form.control}
                    name="networkFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Network fee</FormLabel>
                        <FormControl>
                          <Input disabled placeholder={`${fee} BTS`} className="mb-3 mt-3" />
                        </FormControl>
                        {usr.id === usr.referrer ? (
                          <FormMessage>Rebate: {trimPrice(fee * 0.8, 5)} BTS (vesting)</FormMessage>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    className="mt-5 mb-3"
                    variant="outline"
                    onClick={(event) => {
                      setShowDialog(true);
                      event.preventDefault();
                    }}
                  >
                    Submit limit order changes
                  </Button>
                </form>
              </Form>
              {showDialog ? (
                <DeepLinkDialog
                  operationName="limit_order_update"
                  username={usr.username}
                  usrChain={usr.chain}
                  userID={usr.id}
                  dismissCallback={setShowDialog}
                  key={`limit_order_update_${limitOrderID}`}
                  headerText={`Updating the limit order ${limitOrderID}`}
                  trxJSON={[operationContents]}
                />
              ) : null}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 mt-3 gap-5">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>
                  {quoteAsset ? quoteAsset.symbol : "?"} ({quoteAsset ? quoteAsset.id : "1.3.x"})
                  balance
                </CardTitle>
                <CardDescription>Limit order quote asset</CardDescription>
              </CardHeader>
              <CardContent>
                {quoteBalance} {quoteAsset ? quoteAsset.symbol : "?"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>
                  {baseAsset ? baseAsset.symbol : "?"} ({baseAsset ? baseAsset.id : "1.3.x"})
                  balance
                </CardTitle>
                <CardDescription>Limit order base asset</CardDescription>
              </CardHeader>
              <CardContent>
                {baseBalance} {baseAsset ? baseAsset.symbol : "?"}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-5 mt-1">
            <div className="col-span-1">
              <Card
                className="mb-3"
                onClick={() => {
                  setCancelDialog(true);
                }}
              >
                <CardHeader>
                  <CardTitle>Want to cancel this limit order?</CardTitle>
                  <CardDescription>
                    Click here to cancel the limit order {limitOrderID}
                  </CardDescription>
                </CardHeader>
              </Card>

              {cancelDialog ? (
                <DeepLinkDialog
                  operationName="limit_order_cancel"
                  username={usr.username}
                  usrChain={usr.chain}
                  userID={usr.id}
                  dismissCallback={setCancelDialog}
                  key={`CancellingLimitOrder_${limitOrderID}`}
                  headerText={`Cancelling the limit order ${limitOrderID}`}
                  trxJSON={[
                    {
                      fee_paying_account: usr.id,
                      order: limitOrderID, // order id to change
                      extensions: [],
                    },
                  ]}
                />
              ) : null}

              <a
                href={`/dex/index.html?market=${quoteAsset ? quoteAsset.symbol : "?"}_${
                  baseAsset ? baseAsset.symbol : "?"
                }`}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Trade on the DEX instead?</CardTitle>
                    <CardDescription>
                      Market: {quoteAsset ? quoteAsset.symbol : "?"}/
                      {baseAsset ? baseAsset.symbol : "?"}
                      <br />
                      Need to create a new limit order?
                      <br />
                      Or perhaps you seek additional market data?
                    </CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </div>
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>Need to borrow relevant assets?</CardTitle>
                <CardDescription>
                  Users may offer to lend you {quoteAsset ? quoteAsset.symbol : "?"} or{" "}
                  {baseAsset ? baseAsset.symbol : "?"}.<br />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label>Search by borrowable assets</Label>
                <br />
                <a
                  href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${
                    quoteAsset ? quoteAsset.symbol : ""
                  }`}
                >
                  <Badge>{quoteAsset ? quoteAsset.symbol : "?"}</Badge>
                </a>
                <a
                  href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${
                    baseAsset ? baseAsset.symbol : ""
                  }`}
                >
                  <Badge className="ml-2 mt-1 mb-1">{baseAsset ? baseAsset.symbol : ""}</Badge>
                </a>
                <br />
                <Label>Search by accepted collateral</Label>
                <br />
                <a
                  href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${
                    quoteAsset ? quoteAsset.symbol : "?"
                  }`}
                >
                  <Badge>{quoteAsset ? quoteAsset.symbol : "?"}</Badge>
                </a>
                <a
                  href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${
                    baseAsset ? baseAsset.symbol : ""
                  }`}
                >
                  <Badge className="ml-2 mt-1">{baseAsset ? baseAsset.symbol : ""}</Badge>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>

        {quoteAsset && baseAsset ? (
          <PoolDialogs
            assetA={quoteAsset.symbol}
            assetAData={quoteAsset}
            assetB={baseAsset.symbol}
            assetBData={baseAsset}
            chain={usr.chain}
          />
        ) : null}

        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}
        </div>
      </div>
    </>
  );
}
