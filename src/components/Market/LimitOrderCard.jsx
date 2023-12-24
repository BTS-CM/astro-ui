import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance } from "@/lib/i18n.js";

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

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { trimPrice, humanReadableFloat, blockchainFloat, debounce } from "@/lib/common.js";
import DeepLinkDialog from "../common/DeepLinkDialog";

/**
 * Creating a market card component for buy and sell limit orders
 */
export default function LimitOrderCard(properties) {
  const {
    usr,
    thisAssetA,
    thisAssetB,
    assetAData,
    assetBData,
    orderType,
    marketSearch,
    usrBalances,
    fee,
    invertedMarket,
  } = properties;
  const { t, i18n } = useTranslation("en", { i18n: i18nInstance });

  const { buyOrders, sellOrders } = properties;

  const [amount, setAmount] = useState(0.0);
  const [price, setPrice] = useState(0.0);
  const [total, setTotal] = useState(0);

  const marketFees = useMemo(() => {
    let calculatedMarketFee = 0.0;

    if (amount && price && total) {
      if (
        orderType === "buy" &&
        assetAData &&
        assetAData.market_fee_percent &&
        assetAData.market_fee_percent > 0
      ) {
        calculatedMarketFee = parseFloat(amount) * (assetAData.market_fee_percent / 100);
        return calculatedMarketFee.toFixed(assetAData.precision);
      }

      if (
        orderType === "sell" &&
        assetBData &&
        assetBData.market_fee_percent &&
        assetBData.market_fee_percent > 0
      ) {
        calculatedMarketFee = parseFloat(total) * (assetBData.market_fee_percent / 100);
        return calculatedMarketFee.toFixed(assetBData.precision);
      }
    }

    return calculatedMarketFee;
  }, [amount, price, total, orderType, assetAData, assetBData]);

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

  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const [showDialog, setShowDialog] = useState(false);

  function getReadableBalance(assetData, balances) {
    const id = assetData.id;
    const foundBalance = balances.find((x) => x.asset_id === id);
    return foundBalance
      ? humanReadableFloat(foundBalance.amount, assetData.precision).toLocaleString(undefined, {
          minimumFractionDigits: assetData.precision,
        })
      : 0;
  }

  const assetABalance = useMemo(() => {
    return assetAData && usrBalances ? getReadableBalance(assetAData, usrBalances) : 0;
  }, [assetAData, usrBalances]);

  const assetBBalance = useMemo(() => {
    return assetBData && usrBalances ? getReadableBalance(assetBData, usrBalances) : 0;
  }, [assetBData, usrBalances]);

  const [osoEnabled, setOSOEnabled] = useState(false);
  const [spreadPercent, setSpreadPercent] = useState(1);
  const [sizePercent, setSizePercent] = useState(100);
  const [expirationSeconds, setExpirationSeconds] = useState(1000000);
  const [repeat, setRepeat] = useState(false);

  useEffect(() => {
    async function parseURL() {
      //console.log("Parsing market parameters");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const _amount = params.amount;
      const _price = params.price;
      const _oso = params.oso;
      const _spreadPercent = params.spreadPercent;
      const _sizePercent = params.sizePercent;
      const _expirationSeconds = params.expirationSeconds;
      const _repeat = params.repeat;

      let finalAmount = amount;
      let finalPrice = price;
      let finalTotal = total;
      let finalOSO = osoEnabled;
      let finalSpreadPercent = spreadPercent;
      let finalSizePercent = sizePercent;
      let finalExpirationSeconds = expirationSeconds;
      let finalRepeat = repeat;

      const minAssetA = humanReadableFloat(1, assetAData.precision);
      const minAssetB = humanReadableFloat(1, assetBData.precision);

      if (_amount) {
        const _parsedAmount = parseFloat(_amount);
        if (_parsedAmount) {
          finalAmount = _parsedAmount >= minAssetA ? _parsedAmount : minAssetA;
        }
      }

      if (_price) {
        const _parsedPrice = parseFloat(_price);
        if (_parsedPrice) {
          finalPrice = _parsedPrice >= minAssetB ? _parsedPrice : minAssetB;
        }
      }

      if (finalAmount && finalPrice) {
        const _calculatedTotal = parseFloat(
          (finalAmount * finalPrice).toFixed(assetBData.precision)
        );

        finalTotal = _calculatedTotal >= minAssetB ? _calculatedTotal : minAssetB;
      }

      if (_oso) {
        const _parsedOSO = _oso === "true";
        if (_parsedOSO) {
          finalOSO = _parsedOSO;
        }
      }

      if (_spreadPercent) {
        const _parsedSpreadPercent = parseFloat(_spreadPercent);
        if (_parsedSpreadPercent && _parsedSpreadPercent >= 0 && _parsedSpreadPercent <= 100) {
          finalSpreadPercent = parseFloat(_parsedSpreadPercent.toFixed(3));
        } else if (_parsedSpreadPercent && _parsedSpreadPercent > 100) {
          finalSpreadPercent = 100;
        } else if (_parsedSpreadPercent && _parsedSpreadPercent < 0) {
          finalSpreadPercent = 0;
        }
      }

      if (_sizePercent) {
        const _parsedSizePercent = parseFloat(_sizePercent);
        if (_parsedSizePercent && _parsedSizePercent >= 0 && _parsedSizePercent <= 100) {
          finalSizePercent = parseFloat(_parsedSizePercent.toFixed(3));
        } else if (_parsedSizePercent && _parsedSizePercent > 100) {
          finalSizePercent = 100;
        } else if (_parsedSizePercent && _parsedSizePercent < 0) {
          finalSizePercent = 0;
        }
      }

      if (_expirationSeconds) {
        const _parsedExpirationSeconds = parseFloat(_expirationSeconds);
        if (_parsedExpirationSeconds) {
          finalExpirationSeconds = _parsedExpirationSeconds;
        }
      }

      if (_repeat) {
        const _parsedRepeat = _repeat === "true";
        if (_parsedRepeat) {
          finalRepeat = _parsedRepeat;
        }
      }

      // Return the final assets
      return {
        finalAmount,
        finalPrice,
        finalTotal,
        finalOSO,
        finalSpreadPercent,
        finalSizePercent,
        finalExpirationSeconds,
        finalRepeat,
      };
    }

    if (marketSearch && marketSearch.length && window.location.search) {
      parseURL().then(
        ({
          finalAmount,
          finalPrice,
          finalTotal,
          finalOSO,
          finalSpreadPercent,
          finalSizePercent,
          finalExpirationSeconds,
          finalRepeat,
        }) => {
          if (finalAmount !== amount) {
            setAmount(finalAmount);
          }
          if (finalPrice !== price) {
            setPrice(finalPrice);
          }
          if (finalTotal !== total) {
            setTotal(finalTotal);
          }
          if (finalOSO !== osoEnabled) {
            setOSOEnabled(finalOSO);
          }
          if (finalSpreadPercent !== spreadPercent) {
            setSpreadPercent(finalSpreadPercent);
          }
          if (finalSizePercent !== sizePercent) {
            setSizePercent(finalSizePercent);
          }
          if (finalExpirationSeconds !== expirationSeconds) {
            setExpirationSeconds(finalExpirationSeconds);
          }
          if (finalRepeat !== repeat) {
            setRepeat(finalRepeat);
          }

          let finalUrlParams =
            `?market=${thisAssetA}_${thisAssetB}` +
            `&type=${orderType}` +
            `&price=${finalPrice}` +
            `&amount=${finalAmount}`;

          if (finalOSO) {
            finalUrlParams +=
              `&oso=${finalOSO}` +
              `&spreadPercent=${finalSpreadPercent}` +
              `&sizePercent=${finalSizePercent}` +
              `&expirationSeconds=${finalExpirationSeconds}` +
              `&repeat=${finalRepeat}`;
          }

          window.history.replaceState({}, "", finalUrlParams);
        }
      );
    }
  }, []);

  const [inputChars, setInputChars] = useState(0);
  useEffect(() => {
    if (inputChars > 0) {
      let finalUrlParams =
        `?market=${thisAssetA}_${thisAssetB}` +
        `&type=${orderType}` +
        `&price=${price}` +
        `&amount=${amount}`;

      if (osoEnabled) {
        finalUrlParams +=
          `&oso=${osoEnabled}` +
          `&spreadPercent=${spreadPercent}` +
          `&sizePercent=${sizePercent}` +
          `&expirationSeconds=${expirationSeconds}` +
          `&repeat=${repeat}`;
      }

      window.history.replaceState({}, "", finalUrlParams);
    }
  }, [amount, price, total, osoEnabled, spreadPercent, sizePercent, expirationSeconds, repeat]);

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>
          {orderType === "buy"
            ? t("LimitOrderCard:buyingWith", { assetA: thisAssetA, assetB: thisAssetB })
            : t("LimitOrderCard:sellingFor", { assetA: thisAssetA, assetB: thisAssetB })}
        </CardTitle>
        <CardDescription>{t("LimitOrderCard:createLimitOrder")}</CardDescription>
      </CardHeader>
      <CardContent>
        {thisAssetA && thisAssetB && marketSearch && assetAData && assetBData ? (
          <Form {...form}>
            <form
              onSubmit={(event) => {
                setShowDialog(true);
                event.preventDefault();
              }}
            >
              <FormField
                control={form.control}
                name="priceAmount"
                render={({ field }) => (
                  <FormItem className="mt-4 text-xs">
                    <FormLabel>{t("LimitOrderCard:priceAmount.label")}</FormLabel>
                    <FormDescription>
                      {t("LimitOrderCard:priceAmount.description", {
                        assetA: thisAssetA,
                        assetB: thisAssetB,
                      })}
                    </FormDescription>
                    <FormControl>
                      <span className="grid grid-cols-12">
                        <span className="col-span-9">
                          <Input label={`Price`} placeholder={price} disabled readOnly />
                        </span>
                        <span className="col-span-3 ml-3 text-center">
                          <Popover>
                            <PopoverTrigger>
                              <span className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg">
                                <Label>{t("LimitOrderCard:editLabel")}</Label>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>{t("LimitOrderCard:priceAmount.provideNewLabel")}</Label>{" "}
                              <Input
                                placeholder={price}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = /^[0-9,]*\.?[0-9]*$/;
                                  if (input && input.length && regex.test(input)) {
                                    const parsedInput = parseFloat(input.replaceAll(",", ""));
                                    if (parsedInput) {
                                      setPrice(
                                        parsedInput.toFixed(
                                          orderType === "buy"
                                            ? assetBData.precision
                                            : assetAData.precision
                                        )
                                      );
                                      if (amount) {
                                        setTotal(
                                          (parsedInput * amount).toFixed(
                                            orderType === "buy"
                                              ? assetBData.precision
                                              : assetAData.precision
                                          )
                                        );
                                      }
                                      setInputChars(inputChars + 1);
                                    }
                                  }
                                }}
                              />
                              {(orderType === "buy" && !sellOrders) ||
                              (sellOrders && !sellOrders.length) ||
                              (orderType === "sell" && !buyOrders) ||
                              (buyOrders && !buyOrders.length) ? (
                                <Badge disabled>
                                  {orderType === "buy"
                                    ? t("LimitOrderCard:priceAmount.useLowestAsk")
                                    : t("LimitOrderCard:priceAmount.useHighestBid")}
                                </Badge>
                              ) : (
                                <span
                                  variant="link"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    let finalPrice;
                                    if (
                                      orderType === "buy" &&
                                      sellOrders &&
                                      sellOrders.length > 0
                                    ) {
                                      finalPrice = trimPrice(
                                        parseFloat(sellOrders[0].price),
                                        assetBData.precision
                                      );
                                    } else if (
                                      orderType === "sell" &&
                                      buyOrders &&
                                      buyOrders.length > 0
                                    ) {
                                      finalPrice = trimPrice(
                                        parseFloat(buyOrders[0].price),
                                        assetBData.precision
                                      );
                                    }

                                    if (finalPrice) {
                                      setPrice(
                                        parseFloat(finalPrice).toFixed(assetBData.precision)
                                      );

                                      if (amount) {
                                        setTotal(
                                          (parseFloat(finalPrice) * parseFloat(amount)).toFixed(
                                            assetBData.precision
                                          )
                                        );
                                      }
                                      setInputChars(inputChars + 1);
                                    }
                                  }}
                                >
                                  <Badge>
                                    {orderType === "buy"
                                      ? t("LimitOrderCard:priceAmount.useLowestAsk")
                                      : t("LimitOrderCard:priceAmount.useHighestBid")}
                                  </Badge>
                                </span>
                              )}
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
                name="sellAmount"
                render={({ field }) => (
                  <FormItem className="mt-4 text-xs">
                    <FormLabel>{t("LimitOrderCard:sellAmount.label")}</FormLabel>
                    <FormDescription>
                      {orderType === "buy"
                        ? t("LimitOrderCard:sellAmount.buyDescription", { asset: thisAssetA })
                        : t("LimitOrderCard:sellAmount.sellDescription", { asset: thisAssetA })}
                    </FormDescription>
                    <FormControl>
                      <span className="grid grid-cols-12">
                        <span className="col-span-9">
                          <Input label={`Amount`} placeholder={amount} disabled readOnly />
                        </span>
                        <span className="col-span-3 ml-3 text-center">
                          <Popover>
                            <PopoverTrigger>
                              <span className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg">
                                <Label>{t("LimitOrderCard:editLabel")}</Label>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>{t("LimitOrderCard:sellAmount.provideNewLabel")}</Label>{" "}
                              <Input
                                placeholder={amount}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = /^[0-9,]*\.?[0-9]*$/;
                                  if (input && input.length && regex.test(input)) {
                                    const parsedInput = parseFloat(input.replaceAll(",", ""));
                                    if (parsedInput) {
                                      setAmount(parsedInput.toFixed(assetAData.precision));
                                      if (price) {
                                        setTotal(
                                          (parsedInput * price).toFixed(assetBData.precision)
                                        );
                                      }
                                      setInputChars(inputChars + 1);
                                    }
                                  }
                                }}
                              />
                              {orderType === "sell" && assetABalance ? (
                                <Badge
                                  onClick={() => {
                                    let parsedAmount = parseFloat(
                                      assetABalance.replaceAll(",", "")
                                    );
                                    if (parsedAmount) {
                                      setAmount(parsedAmount.toFixed(assetAData.precision));
                                      if (price) {
                                        setTotal(
                                          (parsedAmount * price).toFixed(assetBData.precision)
                                        );
                                      }
                                      setInputChars(inputChars + 1);
                                    }
                                  }}
                                >
                                  {t("LimitOrderCard:useBalance")}
                                </Badge>
                              ) : null}
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
                name="sellTotal"
                render={({ field }) => (
                  <FormItem className="mt-4 text-xs">
                    <FormLabel>{t("LimitOrderCard:sellTotal.label")}</FormLabel>
                    <FormDescription>
                      {orderType === "buy"
                        ? t("LimitOrderCard:sellTotal.buyDescription", { asset: thisAssetB })
                        : t("LimitOrderCard:sellTotal.sellDescription", { asset: thisAssetB })}
                    </FormDescription>
                    <FormControl>
                      <span className="grid grid-cols-12">
                        <span className="col-span-9">
                          <Input label={`Total`} placeholder={total} disabled readOnly />
                        </span>
                        <span className="col-span-3 ml-3 text-center">
                          <Popover>
                            <PopoverTrigger>
                              <span className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg">
                                <Label>{t("LimitOrderCard:editLabel")}</Label>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>{t("LimitOrderCard:sellTotal.provideNewLabel")}</Label>
                              <Input
                                placeholder={total}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = /^[0-9,]*\.?[0-9]*$/;
                                  if (input && input.length && regex.test(input)) {
                                    const parsedFloat = parseFloat(input.replaceAll(",", ""));
                                    if (parsedFloat) {
                                      setTotal(parsedFloat.toFixed(assetBData.precision));
                                      if (price) {
                                        setAmount(
                                          (parsedFloat / price).toFixed(assetAData.precision)
                                        );
                                      }
                                      setInputChars(inputChars + 1);
                                    }
                                  }
                                }}
                              />
                              {orderType === "buy" && assetBBalance ? (
                                <Badge
                                  onClick={() => {
                                    let parsedAmount = parseFloat(
                                      assetBBalance.replaceAll(",", "")
                                    );
                                    if (parsedAmount) {
                                      setTotal(parsedAmount.toFixed(assetBData.precision));
                                      if (price) {
                                        setAmount(
                                          (parsedAmount / price).toFixed(assetAData.precision)
                                        );
                                      }
                                      setInputChars(inputChars + 1);
                                    }
                                  }}
                                >
                                  {t("LimitOrderCard:useBalance")}
                                </Badge>
                              ) : null}
                            </PopoverContent>
                          </Popover>
                        </span>
                      </span>
                    </FormControl>
                    {amount &&
                    price &&
                    assetBBalance &&
                    parseFloat(assetBBalance.replaceAll(",", "")) < parseFloat(total) ? (
                      <FormMessage>
                        {t("LimitOrderCard:sellTotal.requireMore", {
                          requiredAmount:
                            total -
                            parseFloat(assetBBalance.replaceAll(",", "")).toFixed(
                              assetBData.precision
                            ),
                          asset: thisAssetB,
                        })}
                      </FormMessage>
                    ) : null}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("LimitOrderCard:expiry.label")}</FormLabel>
                    <FormControl
                      onValueChange={(selectedExpiry) => {
                        setExpiryType(selectedExpiry);
                        const oneHour = 60 * 60 * 1000;
                        const oneDay = 24 * oneHour;
                        if (selectedExpiry !== "specific" && selectedExpiry !== "fkill") {
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
                        } else if (selectedExpiry === "fkill") {
                          const now = new Date();
                          setExpiry(new Date(now.getTime() + oneDay));
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
                          <SelectItem value="1hr">{t("LimitOrderCard:expiry.1hr")}</SelectItem>
                          <SelectItem value="12hr">{t("LimitOrderCard:expiry.12hr")}</SelectItem>
                          <SelectItem value="24hr">{t("LimitOrderCard:expiry.24hr")}</SelectItem>
                          <SelectItem value="7d">{t("LimitOrderCard:expiry.7d")}</SelectItem>
                          <SelectItem value="30d">{t("LimitOrderCard:expiry.30d")}</SelectItem>
                          <SelectItem value="specific">
                            {t("LimitOrderCard:expiry.specific")}
                          </SelectItem>
                          <SelectItem value="fkill">{t("LimitOrderCard:expiry.fkill")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      {expiryType === "specific" ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date ? (
                                format(date, "PPP")
                              ) : (
                                <span>{t("LimitOrderCard:expiry.pickDate")}</span>
                              )}
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
                      {expiryType === "fkill" ? t("LimitOrderCard:expiry.fkillDescription") : null}
                      {expiryType !== "specific" && expiryType !== "fkill"
                        ? t("LimitOrderCard:expiry.generalDescription", { expiryType })
                        : null}
                    </FormDescription>
                    <FormMessage />
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
                      <div className="flex items-center space-x-2">
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
                            ? t("LimitOrderCard:osoValue.enabled")
                            : t("LimitOrderCard:osoValue.enable")}
                        </label>
                      </div>
                    </FormControl>
                    {osoEnabled ? (
                      <FormDescription>{t("LimitOrderCard:osoValue.description")}</FormDescription>
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
                        <FormLabel className="text-sm">
                          {t("LimitOrderCard:osoEnabled.spreadPercentLabel")}
                        </FormLabel>
                        <FormDescription>
                          {t("LimitOrderCard:osoEnabled.spreadPercentDescription")}
                        </FormDescription>
                        <FormControl>
                          <span className="grid grid-cols-12">
                            <span className="col-span-9">
                              <Input
                                label={t("LimitOrderCard:osoEnabled.spreadPercentLabel")}
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
                                <PopoverTrigger>
                                  <span
                                    onClick={() => {
                                      event.preventDefault();
                                    }}
                                    className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg"
                                  >
                                    <Label>{t("LimitOrderCard:editLabel")}</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>
                                    {t("LimitOrderCard:osoEnabled.provideNewSpreadPercent")}
                                  </Label>
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
                        <FormLabel className="text-sm">
                          {t("LimitOrderCard:osoSize.sizePercentLabel")}
                        </FormLabel>
                        <FormDescription>
                          {t("LimitOrderCard:osoSize.sizePercentDescription")}
                        </FormDescription>
                        <FormControl>
                          <span className="grid grid-cols-12">
                            <span className="col-span-9">
                              <Input
                                label={t("LimitOrderCard:osoSize.sizePercentLabel")}
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
                                <PopoverTrigger>
                                  <span
                                    onClick={() => {
                                      event.preventDefault();
                                    }}
                                    className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg"
                                  >
                                    <Label>{t("LimitOrderCard:editLabel")}</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>{t("LimitOrderCard:osoSize.provideNewSizePercent")}</Label>
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
                          {t("LimitOrderCard:repeatValue.label")}
                        </FormLabel>
                        <FormDescription>
                          {t("LimitOrderCard:repeatValue.description")}
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
                                ? t("LimitOrderCard:repeatValue.enabled")
                                : t("LimitOrderCard:repeatValue.disabled")}
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
                disabled
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("LimitOrderCard:fee.label")}</FormLabel>
                    <FormDescription>{t("LimitOrderCard:fee.description")}</FormDescription>
                    <FormControl>
                      <Input
                        disabled
                        label={t("LimitOrderCard:fee.label")}
                        value={`${fee} BTS`}
                        placeholder={1}
                      />
                    </FormControl>
                    {expiryType === "fkill" || usr.id === usr.referrer ? (
                      <FormMessage>
                        {expiryType === "fkill"
                          ? t("LimitOrderCard:fee.unfilledRebate", { fee })
                          : null}
                        <br />
                        {usr.id === usr.referrer
                          ? t("LimitOrderCard:fee.ltmRebate", { rebate: 0.8 * fee })
                          : null}
                      </FormMessage>
                    ) : null}
                  </FormItem>
                )}
              />
              {orderType === "buy" &&
              assetAData &&
              assetAData.market_fee_percent &&
              assetAData.market_fee_percent > 0 ? (
                <FormField
                  control={form.control}
                  disabled
                  name="marketFees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("LimitOrderCard:marketFees.label")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled
                          value={`${marketFees} ${assetAData.symbol}`}
                          placeholder={`${marketFees} ${assetAData.symbol}`}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("LimitOrderCard:marketFees.description")}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              ) : null}
              {orderType === "sell" &&
              assetBData &&
              assetBData.market_fee_percent &&
              assetBData.market_fee_percent > 0 ? (
                <FormField
                  control={form.control}
                  disabled
                  name="marketFees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("LimitOrderCard:marketFees.label")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled
                          value={`${marketFees} ${assetBData.symbol}`}
                          placeholder={`${marketFees} ${assetBData.symbol}`}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        {t("LimitOrderCard:marketFees.description")}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              ) : null}
              {!amount || !price || !expiry ? (
                <Button className="mt-7 mb-1" variant="outline" disabled type="submit">
                  {t("LimitOrderCard:submit")}
                </Button>
              ) : (
                <Button className="mt-7 mb-1" variant="outline" type="submit">
                  {t("LimitOrderCard:submit")}
                </Button>
              )}
            </form>
          </Form>
        ) : (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="sellPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="grid grid-cols-2 mt-3">
                        <div className="mt-1">{t("LimitOrderCard:sellPrice.label")}</div>
                        <div className="text-gray-500 text-right">
                          <span variant="link">
                            <Badge>{t("LimitOrderCard:sellPrice.useLowestAsk")}</Badge>
                          </span>
                        </div>
                      </div>
                    </FormLabel>

                    <Input disabled className="mb-3" />
                    <FormDescription>{t("LimitOrderCard:sellPrice.description")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="grid grid-cols-2 mt-3">
                        <div className="mt-1">{t("LimitOrderCard:sellAmount2.label")}</div>
                        <div className="text-gray-500 text-right">
                          {orderType === "sell" && assetABalance ? (
                            <Badge>{t("LimitOrderCard:useBalance")}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </FormLabel>
                    <FormDescription>
                      {orderType === "buy"
                        ? t("LimitOrderCard:sellAmount2.buyDescription")
                        : t("LimitOrderCard:sellAmount2.sellDescription")}
                    </FormDescription>
                    <Input disabled className="mb-3" />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="grid grid-cols-2 mt-3">
                        <div className="mt-1">{t("LimitOrderCard:sellTotal2.label")}</div>
                        <div className="text-gray-500 text-right">
                          {orderType === "buy" && assetBBalance ? (
                            <Badge>{t("LimitOrderCard:useBalance")}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </FormLabel>
                    <FormDescription>
                      {orderType === "buy"
                        ? t("LimitOrderCard:sellTotal2.buyDescription")
                        : t("LimitOrderCard:sellTotal2.sellDescription")}
                    </FormDescription>
                    <Input disabled className="mb-3" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("LimitOrderCard:expiry2.label")}</FormLabel>
                    <FormDescription>{t("LimitOrderCard:expiry2.description")}</FormDescription>
                    <Select disabled>
                      <SelectTrigger className="mb-3">
                        <SelectValue placeholder="1hr" />
                      </SelectTrigger>
                    </Select>
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
                    <FormLabel>{t("LimitOrderCard:fee.label")}</FormLabel>
                    <Input disabled label={t("LimitOrderCard:fee.label")} />
                    <FormDescription>{t("LimitOrderCard:fee.description")}</FormDescription>
                    {expiryType === "fkill" || usr.id === usr.referrer ? (
                      <FormMessage>
                        {expiryType === "fkill"
                          ? t("LimitOrderCard:fee.unfilledRebate", { rebate: 1 * 0.4826 })
                          : null}
                        {usr.id === usr.referrer
                          ? t("LimitOrderCard:fee.ltmRebate", { rebate: 0.8 * 0.4826 })
                          : null}
                      </FormMessage>
                    ) : null}
                  </FormItem>
                )}
              />

              <Button disabled className="mt-7 mb-1" variant="outline" type="submit">
                {t("LimitOrderCard:submit")}
              </Button>
            </form>
          </Form>
        )}
        {showDialog ? (
          <DeepLinkDialog
            operationName="limit_order_create"
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            key={
              orderType === "buy"
                ? `Buying${amount}${thisAssetA}for${total}${thisAssetB}`
                : `Selling${amount}${thisAssetA}for${total}${thisAssetB}`
            }
            headerText={
              orderType === "buy"
                ? t("LimitOrderCard:headerText.buying", { amount, thisAssetA, total, thisAssetB })
                : t("LimitOrderCard:headerText.selling", { amount, thisAssetA, total, thisAssetB })
            }
            trxJSON={
              orderType === "buy"
                ? [
                    {
                      seller: usr.id,
                      amount_to_sell: {
                        amount: blockchainFloat(total, assetBData.precision).toFixed(0),
                        asset_id: marketSearch.find((asset) => asset.s === thisAssetB).id,
                      },
                      min_to_receive: {
                        amount: blockchainFloat(amount, assetAData.precision).toFixed(0),
                        asset_id: marketSearch.find((asset) => asset.s === thisAssetA).id,
                      },
                      expiration: expiry,
                      fill_or_kill: expiryType === "fkill" ? true : false,
                      extensions: osoEnabled
                        ? {
                            on_fill: [
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
                            ],
                          }
                        : {},
                    },
                  ]
                : [
                    {
                      seller: usr.id,
                      amount_to_sell: {
                        amount: blockchainFloat(amount, assetAData.precision).toFixed(0),
                        asset_id: marketSearch.find((asset) => asset.s === thisAssetA).id,
                      },
                      min_to_receive: {
                        amount: blockchainFloat(total, assetBData.precision).toFixed(0),
                        asset_id: marketSearch.find((asset) => asset.s === thisAssetB).id,
                      },
                      expiration: expiry,
                      fill_or_kill: expiryType === "fkill" ? true : false,
                      extensions: osoEnabled
                        ? {
                            on_fill: [
                              [
                                0,
                                {
                                  fee_asset_id: "1.3.0",
                                  spread_percent: spreadPercent,
                                  size_percent: sizePercent,
                                  expiration_seconds: 1000000000,
                                  repeat: repeat,
                                },
                              ],
                            ],
                          }
                        : {},
                    },
                  ]
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
