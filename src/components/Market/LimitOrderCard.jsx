import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
const Calendar = lazy(() => import("@/components/ui/calendar").then(m => ({ default: m.Calendar })));
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import {
  PenLine,
  Tag,
  Coins,
  Receipt,
  Timer,
  Layers,
  Repeat,
  Wallet,
  TrendingUp,
  TrendingDown,
  Zap,
  ChevronDown,
  Check,
  Info,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

import {
  trimPrice,
  humanReadableFloat,
  blockchainFloat,
  debounce,
  assetAmountRegex,
} from "@/lib/common.js";
import DeepLinkDialog from "../common/DeepLinkDialog";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

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
        calculatedMarketFee =
          parseFloat(amount) * (assetAData.market_fee_percent / 10000);
        return calculatedMarketFee.toFixed(assetAData.precision);
      }

      if (
        orderType === "sell" &&
        assetBData &&
        assetBData.market_fee_percent &&
        assetBData.market_fee_percent > 0
      ) {
        calculatedMarketFee =
          parseFloat(total) * (assetBData.market_fee_percent / 10000);
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

  const [date, setDate] = useState(
    new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
  );

  useEffect(() => {
    if (expiryType === "specific" && date) {
      setExpiry(date);
    }
  }, [expiryType, date]);

  const form = useForm({
    defaultValues: {
      priceAmount: 0.0,
      sellAmount: 0.0,
      sellTotal: 0,
      expiry: "1hr",
      osoValue: false,
      osoSpread: 1,
      osoSize: 100,
      repeatValue: false,
      fee: fee,
      marketFees: 0,
    },
  });

  const [showDialog, setShowDialog] = useState(false);

  function getReadableBalance(assetData, balances) {
    const id = assetData.id;
    const foundBalance = balances.find((x) => x.asset_id === id);
    return foundBalance
      ? humanReadableFloat(
          foundBalance.amount,
          assetData.precision
        ).toLocaleString(undefined, {
          minimumFractionDigits: assetData.precision,
        })
      : 0;
  }

  const assetABalance = useMemo(() => {
    return assetAData && usrBalances
      ? getReadableBalance(assetAData, usrBalances)
      : 0;
  }, [assetAData, usrBalances]);

  const assetBBalance = useMemo(() => {
    return assetBData && usrBalances
      ? getReadableBalance(assetBData, usrBalances)
      : 0;
  }, [assetBData, usrBalances]);

  const [osoEnabled, setOSOEnabled] = useState(false);
  const [spreadPercent, setSpreadPercent] = useState(1);
  const [sizePercent, setSizePercent] = useState(100);
  const [expirationSeconds, setExpirationSeconds] = useState(1000000);
  const [repeat, setRepeat] = useState(false);

  function handleMaxAmount() {
    if (orderType !== "sell") return;
    const bal = parseFloat(String(assetABalance).replaceAll(",", ""));
    if (!bal) return;
    const formatted = bal.toFixed(assetAData.precision);
    setAmount(formatted);
    form.setValue("sellAmount", bal);
    if (price) {
      const newTotal = (bal * parseFloat(price)).toFixed(assetBData.precision);
      setTotal(newTotal);
      form.setValue("sellTotal", newTotal);
    }
    setInputChars(inputChars + 1);
  }

  function handleMaxTotal() {
    if (orderType !== "buy") return;
    const bal = parseFloat(String(assetBBalance).replaceAll(",", ""));
    if (!bal) return;
    const formatted = bal.toFixed(assetBData.precision);
    setTotal(formatted);
    form.setValue("sellTotal", bal);
    if (price) {
      const newAmount = (bal / parseFloat(price)).toFixed(assetAData.precision);
      setAmount(newAmount);
      form.setValue("sellAmount", newAmount);
    }
    setInputChars(inputChars + 1);
  }

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

        finalTotal =
          _calculatedTotal >= minAssetB ? _calculatedTotal : minAssetB;
      }

      if (_oso) {
        const _parsedOSO = _oso === "true";
        if (_parsedOSO) {
          finalOSO = _parsedOSO;
        }
      }

      if (_spreadPercent) {
        const _parsedSpreadPercent = parseFloat(_spreadPercent);
        if (
          _parsedSpreadPercent &&
          _parsedSpreadPercent >= 0 &&
          _parsedSpreadPercent <= 100
        ) {
          finalSpreadPercent = parseFloat(_parsedSpreadPercent.toFixed(3));
        } else if (_parsedSpreadPercent && _parsedSpreadPercent > 100) {
          finalSpreadPercent = 100;
        } else if (_parsedSpreadPercent && _parsedSpreadPercent < 0) {
          finalSpreadPercent = 0;
        }
      }

      if (_sizePercent) {
        const _parsedSizePercent = parseFloat(_sizePercent);
        if (
          _parsedSizePercent &&
          _parsedSizePercent >= 0 &&
          _parsedSizePercent <= 100
        ) {
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
            form.setValue("sellAmount", finalAmount);
          }
          if (finalPrice !== price) {
            setPrice(finalPrice);
            form.setValue("priceAmount", finalPrice);
          }
          if (finalTotal !== total) {
            setTotal(finalTotal);
            form.setValue("sellTotal", finalTotal);
          }
          if (finalOSO !== osoEnabled) {
            setOSOEnabled(finalOSO);
            form.setValue("osoValue", finalOSO);
          }
          if (finalSpreadPercent !== spreadPercent) {
            setSpreadPercent(finalSpreadPercent);
            form.setValue("osoSpread", finalSpreadPercent);
          }
          if (finalSizePercent !== sizePercent) {
            setSizePercent(finalSizePercent);
            form.setValue("osoSize", finalSizePercent);
          }
          if (finalExpirationSeconds !== expirationSeconds) {
            setExpirationSeconds(finalExpirationSeconds);
          }
          if (finalRepeat !== repeat) {
            setRepeat(finalRepeat);
            form.setValue("repeatValue", finalRepeat);
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
  }, [
    amount,
    price,
    total,
    osoEnabled,
    spreadPercent,
    sizePercent,
    expirationSeconds,
    repeat,
  ]);

  const debouncedSetSpreadPercent = useCallback(
    debounce((input, mcr) => {
      const regex = /^[0-9]*\.?[0-9]*$/;
      if (regex.test(input)) {
        if (input >= 0 && input <= 100) {
          setSpreadPercent(input);
          setInputChars(inputChars + 1);
          form.setValue("osoSpread", input);
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
          form.setValue("osoSize", input);
        }
      }
    }, 25),
    []
  );

  const isBuy = orderType === "buy";
  // Intentionally on status roles, NOT page accents (theming carve-out):
  // buy/sell greens/reds are market convention and stay fixed across themes.
  // statusAccents success/danger are constant across presets, so these read
  // identically everywhere while still following custom status colours.
  const accent = isBuy
    ? {
        text: "text-[hsl(var(--accent-success-fg))]",
        textBright: "text-[hsl(var(--accent-success-fg))]",
        bg: "bg-[hsl(var(--accent-success)/0.06)]",
        border: "border-[hsl(var(--accent-success)/0.3)]",
        glow: "from-[hsl(var(--accent-success)/0.15)] via-[hsl(var(--accent-success)/0.03)] to-transparent",
        chip: "bg-[hsl(var(--accent-success)/0.1)] border-[hsl(var(--accent-success)/0.3)] text-[hsl(var(--accent-success-fg))]",
        solid: "bg-[hsl(var(--accent-success))]",
        textOn: "text-[hsl(var(--accent-success-gradFg))]",
        gradient: "from-[hsl(var(--accent-success)/0.95)] via-[hsl(var(--accent-1)/0.95)] to-[hsl(var(--accent-1)/0.95)]",
        ring: "ring-[hsl(var(--accent-success)/0.3)]",
        focusBorder: "focus-within:border-[hsl(var(--accent-success)/0.6)]",
        focusShadow: "focus-within:shadow-[0_0_0_3px_hsl(var(--accent-success)/0.18)]",
      }
    : {
        text: "text-[hsl(var(--accent-danger-fg))]",
        textBright: "text-[hsl(var(--accent-danger-fg))]",
        bg: "bg-[hsl(var(--accent-danger)/0.06)]",
        border: "border-[hsl(var(--accent-danger)/0.3)]",
        glow: "from-[hsl(var(--accent-danger)/0.15)] via-[hsl(var(--accent-danger)/0.03)] to-transparent",
        chip: "bg-[hsl(var(--accent-danger)/0.1)] border-[hsl(var(--accent-danger)/0.3)] text-[hsl(var(--accent-danger-fg))]",
        solid: "bg-[hsl(var(--accent-danger))]",
        textOn: "text-[hsl(var(--accent-danger-gradFg))]",
        gradient: "from-[hsl(var(--accent-danger)/0.95)] via-[hsl(var(--accent-warning)/0.95)] to-[hsl(var(--accent-warning)/0.95)]",
        ring: "ring-[hsl(var(--accent-danger)/0.3)]",
        focusBorder: "focus-within:border-[hsl(var(--accent-danger)/0.6)]",
        focusShadow: "focus-within:shadow-[0_0_0_3px_hsl(var(--accent-danger)/0.18)]",
      };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card/60 backdrop-blur-xl",
        accent.border
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b",
          accent.glow
        )}
      />
      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border",
              accent.chip
            )}
          >
            {isBuy ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1">
            <h3 className={cn("text-base font-semibold", accent.text)}>
              {isBuy
                ? t("LimitOrderCard:buyingWith", {
                    assetA: thisAssetA,
                    assetB: thisAssetB,
                  })
                : t("LimitOrderCard:sellingFor", {
                    assetA: thisAssetA,
                    assetB: thisAssetB,
                  })}
            </h3>
            <p className="text-[11px] text-muted-foreground/70">
              {t("LimitOrderCard:createLimitOrder")}
            </p>
          </div>
        </div>
        {thisAssetA &&
        thisAssetB &&
        marketSearch &&
        assetAData &&
        assetBData ? (
          <form onSubmit={form.handleSubmit(() => setShowDialog(true))}>
            <FieldGroup className="gap-4">
              <Controller
                name="priceAmount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field invalid={fieldState.invalid} className="mt-1 text-xs">
                    <FieldLabel>
                      {t("LimitOrderCard:priceAmount.label")}
                    </FieldLabel>
                    <FieldDescription>
                      {t("LimitOrderCard:priceAmount.description", {
                        assetA: thisAssetA,
                        assetB: thisAssetB,
                      })}
                    </FieldDescription>
                    <span className="grid grid-cols-12">
                      <span className="col-span-9">
                        <Input
                          {...field}
                          label={`Price`}
                          value={field.value ?? price}
                          disabled
                          readOnly
                          className="bg-accent/40 border-border text-foreground/85 placeholder:text-muted-foreground font-mono tabular-nums disabled:opacity-100 h-11"
                        />
                      </span>
                      <span className="col-span-3 ml-3 text-center">
                        <Popover>
                          <PopoverTrigger>
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 dark:hover:border-white/20 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:text-accent-foreground transition-all cursor-pointer">
                              <Label>{t("LimitOrderCard:editLabel")}</Label>
                            </span>
                          </PopoverTrigger>
                          <PopoverContent
                            className="!bg-card border border-border text-foreground"

                          >
                            <Label>
                              {t("LimitOrderCard:priceAmount.provideNewLabel")}
                            </Label>{" "}
                            <Input
                              placeholder={price}
                              className="mb-2 mt-1"
                              onChange={(event) => {
                                const input = event.target.value;
                                const parsedInput = parseFloat(
                                  input.replaceAll(",", "")
                                );
                                const regex = assetAmountRegex(
                                  orderType === "buy" ? assetBData : assetAData
                                );
                                if (
                                  input &&
                                  input.length &&
                                  parsedInput &&
                                  regex.test(parsedInput)
                                ) {
                                  setPrice(
                                    parsedInput.toFixed(
                                      orderType === "buy"
                                        ? assetBData.precision
                                        : assetAData.precision
                                    )
                                  );
                                  field.onChange(parsedInput); // <- keep the Controller/form in sync
                                  if (amount) {
                                    const _total = (
                                      parsedInput * amount
                                    ).toFixed(
                                      orderType === "buy"
                                        ? assetBData.precision
                                        : assetAData.precision
                                    );
                                    setTotal(_total);
                                    form.setValue("sellTotal", _total);
                                  }
                                  setInputChars(inputChars + 1);
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
                                  : t(
                                      "LimitOrderCard:priceAmount.useHighestBid"
                                    )}
                              </Badge>
                            ) : (
                              <span
                                variant="link"
                                onClick={(e) => {
                                  e.preventDefault();
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
                                    const finalPriceNum = parseFloat(finalPrice);
                                    const finalPriceFixed = finalPriceNum.toFixed(
                                      assetBData.precision
                                    );
                                    setPrice(finalPriceFixed);
                                    field.onChange(finalPriceNum); // <- keep the Controller/form in sync

                                    if (amount) {
                                      const _total = (
                                        finalPriceNum * parseFloat(amount)
                                      ).toFixed(assetBData.precision);
                                      setTotal(_total);
                                      form.setValue("sellTotal", _total);
                                    }
                                    setInputChars(inputChars + 1);
                                  }
                                }}
                              >
                                <Badge>
                                  {orderType === "buy"
                                    ? t(
                                        "LimitOrderCard:priceAmount.useLowestAsk"
                                      )
                                    : t(
                                        "LimitOrderCard:priceAmount.useHighestBid"
                                      )}
                                </Badge>
                              </span>
                            )}
                          </PopoverContent>
                        </Popover>
                      </span>
                    </span>
                  </Field>
                )}
              />

              <Controller
                name="sellAmount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field invalid={fieldState.invalid} className="mt-1 text-xs">
                    <FieldLabel>
                      {t("LimitOrderCard:sellAmount.label")}
                    </FieldLabel>
                    <FieldDescription>
                      {orderType === "buy"
                        ? t("LimitOrderCard:sellAmount.buyDescription", {
                            asset: thisAssetA,
                          })
                        : t("LimitOrderCard:sellAmount.sellDescription", {
                            asset: thisAssetA,
                          })}
                    </FieldDescription>
                    {orderType === "sell" && assetABalance ? (
                      <div className="mt-2 flex items-center justify-between rounded-md border border-border/60 bg-accent/20 px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Wallet className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {t("LimitOrderCard:useBalance")}:{" "}
                            <span className="font-mono tabular-nums text-foreground/80">
                              {assetABalance} {thisAssetA}
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleMaxAmount}
                          className="rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-colors active:scale-95"
                        >
                          MAX
                        </button>
                      </div>
                    ) : null}
                    <span className="grid grid-cols-12 mt-2">
                      <span className="col-span-9">
                        <Input
                          {...field}
                          label={`Amount`}
                          value={field.value ?? amount}
                          disabled
                          readOnly
                          className="bg-accent/40 border-border text-foreground/85 placeholder:text-muted-foreground font-mono tabular-nums disabled:opacity-100 h-11"
                        />
                      </span>
                      <span className="col-span-3 ml-3 text-center">
                        <Popover>
                          <PopoverTrigger>
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 dark:hover:border-white/20 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:text-accent-foreground transition-all cursor-pointer">
                              <Label>{t("LimitOrderCard:editLabel")}</Label>
                            </span>
                          </PopoverTrigger>
                          <PopoverContent
                            className="!bg-card border border-border text-foreground"

                          >
                            <Label>
                              {t("LimitOrderCard:sellAmount.provideNewLabel")}
                            </Label>{" "}
                            <Input
                              placeholder={amount}
                              className="mb-2 mt-1"
                              onChange={(event) => {
                                const input = event.target.value;
                                const parsedInput = parseFloat(
                                  input.replaceAll(",", "")
                                );
                                const regex = assetAmountRegex(assetAData);
                                if (
                                  input &&
                                  input.length &&
                                  parsedInput &&
                                  regex.test(parsedInput)
                                ) {
                                  setAmount(
                                    parsedInput.toFixed(assetAData.precision)
                                  );
                                  field.onChange(parsedInput); // <- keep the Controller/form in sync
                                  if (price) {
                                    const _total = (
                                      parsedInput * price
                                    ).toFixed(assetBData.precision);
                                    setTotal(_total);
                                    form.setValue("sellTotal", _total);
                                  }
                                  setInputChars(inputChars + 1);
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
                                    setAmount(
                                      parsedAmount.toFixed(assetAData.precision)
                                    );
                                    field.onChange(parsedAmount); // <- keep the Controller/form in sync
                                    if (price) {
                                      const _total = (
                                        parsedAmount * price
                                      ).toFixed(assetBData.precision);
                                      setTotal(_total);
                                      form.setValue("sellTotal", _total);
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

                    {orderType === "sell" &&
                    amount &&
                    price &&
                    assetABalance &&
                    parseFloat(assetABalance.replaceAll(",", "")) <
                      parseFloat(amount) ? (
                      <FieldError>
                        {t("LimitOrderCard:sellTotal.requireMore", {
                          requiredAmount:
                            amount -
                            parseFloat(
                              assetABalance.replaceAll(",", "")
                            ).toFixed(assetAData.precision),
                          asset: thisAssetA,
                        })}
                      </FieldError>
                    ) : null}
                  </Field>
                )}
              />

              <Controller
                name="sellTotal"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field invalid={fieldState.invalid} className="mt-1 text-xs">
                    <FieldLabel>
                      {t("LimitOrderCard:sellTotal.label")}
                    </FieldLabel>
                    <FieldDescription>
                      {orderType === "buy"
                        ? t("LimitOrderCard:sellTotal.buyDescription", {
                            asset: thisAssetB,
                          })
                        : t("LimitOrderCard:sellTotal.sellDescription", {
                            asset: thisAssetB,
                          })}
                    </FieldDescription>
                    {orderType === "buy" && assetBBalance ? (
                      <div className="mt-2 flex items-center justify-between rounded-md border border-border/60 bg-accent/20 px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Wallet className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {t("LimitOrderCard:useBalance")}:{" "}
                            <span className="font-mono tabular-nums text-foreground/80">
                              {assetBBalance} {thisAssetB}
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleMaxTotal}
                          className="rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-colors active:scale-95"
                        >
                          MAX
                        </button>
                      </div>
                    ) : null}
                    <span className="grid grid-cols-12 mt-2">
                      <span className="col-span-9">
                        <Input
                          {...field}
                          label={`Total`}
                          value={field.value ?? total}
                          disabled
                          readOnly
                          className="bg-accent/40 border-border text-foreground/85 placeholder:text-muted-foreground font-mono tabular-nums disabled:opacity-100 h-11"
                        />
                      </span>
                      <span className="col-span-3 ml-3 text-center">
                        <Popover>
                          <PopoverTrigger>
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 dark:hover:border-white/20 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:text-accent-foreground transition-all cursor-pointer">
                              <Label>{t("LimitOrderCard:editLabel")}</Label>
                            </span>
                          </PopoverTrigger>
                          <PopoverContent
                            className="!bg-card border border-border text-foreground"

                          >
                            <Label>
                              {t("LimitOrderCard:sellTotal.provideNewLabel")}
                            </Label>
                            <Input
                              placeholder={total}
                              className="mb-2 mt-1"
                              onChange={(event) => {
                                const input = event.target.value;
                                const parsedFloat = parseFloat(
                                  input.replaceAll(",", "")
                                );
                                const regex = assetAmountRegex(assetBData);
                                if (
                                  input &&
                                  input.length &&
                                  parsedFloat &&
                                  regex.test(parsedFloat)
                                ) {
                                  setTotal(
                                    parsedFloat.toFixed(assetBData.precision)
                                  );
                                  field.onChange(parsedFloat); // <- keep the Controller/form in sync
                                  if (price) {
                                    const _total = (
                                      parsedFloat / price
                                    ).toFixed(assetAData.precision);
                                    setAmount(_total);
                                    form.setValue("sellAmount", _total);
                                  }
                                  setInputChars(inputChars + 1);
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
                                    setTotal(
                                      parsedAmount.toFixed(assetBData.precision)
                                    );
                                    if (price) {
                                      setAmount(
                                        (parsedAmount / price).toFixed(
                                          assetAData.precision
                                        )
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
                    {orderType === "buy" &&
                    amount &&
                    price &&
                    assetBBalance &&
                    parseFloat(assetBBalance.replaceAll(",", "")) <
                      parseFloat(total) ? (
                      <FieldError>
                        {t("LimitOrderCard:sellTotal.requireMore", {
                          requiredAmount:
                            total -
                            parseFloat(
                              assetBBalance.replaceAll(",", "")
                            ).toFixed(assetBData.precision),
                          asset: thisAssetB,
                        })}
                      </FieldError>
                    ) : null}
                  </Field>
                )}
              />

              <Controller
                name="expiry"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field invalid={fieldState.invalid}>
                    <FieldLabel>{t("LimitOrderCard:expiry.label")}</FieldLabel>
                    <Select
                      onValueChange={(selectedExpiry) => {
                        setExpiryType(selectedExpiry);
                        const oneHour = 60 * 60 * 1000;
                        const oneDay = 24 * oneHour;
                        if (
                          selectedExpiry !== "specific" &&
                          selectedExpiry !== "fkill"
                        ) {
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
                        field.onChange(selectedExpiry);
                      }}
                      value={field.value}
                    >
                      <SelectTrigger className="mb-1">
                        <SelectValue placeholder="1hr" />
                      </SelectTrigger>
                      <SelectContent className="!bg-card border border-border text-foreground">
                        <SelectItem value="1hr" className="text-foreground/85 focus:bg-accent/50 focus:text-foreground data-[highlighted]:bg-accent/50">
                          {t("LimitOrderCard:expiry.1hr")}
                        </SelectItem>
                        <SelectItem value="12hr" className="text-foreground/85 focus:bg-accent/50 focus:text-foreground data-[highlighted]:bg-accent/50">
                          {t("LimitOrderCard:expiry.12hr")}
                        </SelectItem>
                        <SelectItem value="24hr" className="text-foreground/85 focus:bg-accent/50 focus:text-foreground data-[highlighted]:bg-accent/50">
                          {t("LimitOrderCard:expiry.24hr")}
                        </SelectItem>
                        <SelectItem value="7d" className="text-foreground/85 focus:bg-accent/50 focus:text-foreground data-[highlighted]:bg-accent/50">
                          {t("LimitOrderCard:expiry.7d")}
                        </SelectItem>
                        <SelectItem value="30d" className="text-foreground/85 focus:bg-accent/50 focus:text-foreground data-[highlighted]:bg-accent/50">
                          {t("LimitOrderCard:expiry.30d")}
                        </SelectItem>
                        <SelectItem value="specific" className="text-foreground/85 focus:bg-accent/50 focus:text-foreground data-[highlighted]:bg-accent/50">
                          {t("LimitOrderCard:expiry.specific")}
                        </SelectItem>
                        <SelectItem value="fkill" className="text-foreground/85 focus:bg-accent/50 focus:text-foreground data-[highlighted]:bg-accent/50">
                          {t("LimitOrderCard:expiry.fkill")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {expiryType === "specific" ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] justify-start text-left font-normal border-border bg-accent/40 text-foreground/85 hover:bg-accent/60 hover:text-accent-foreground hover:border-accent/50 dark:hover:border-white/20",
                                !date && "text-muted-foreground/70"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date ? (
                                format(date, "PPP")
                              ) : (
                                <span>
                                  {t("LimitOrderCard:expiry.pickDate")}
                                </span>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[350px] bg-card border border-border rounded-2xl p-0">
                            <Suspense fallback={<div className="h-[300px] w-[280px] bg-muted animate-pulse rounded" />}>
                              <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(e) => {
                                  const parsedDate = new Date(e);
                                  const now = new Date();
                                  if (parsedDate < now) {
                                    setDate(
                                      new Date(
                                        Date.now() + 1 * 24 * 60 * 60 * 1000
                                      )
                                    );
                                    return;
                                  }
                                  setDate(e);
                                }}
                                initialFocus
                              />
                            </Suspense>
                          </DialogContent>
                        </Dialog>
                      ) : null}
                      {expiryType === "fkill"
                        ? t("LimitOrderCard:expiry.fkillDescription")
                        : null}
                      {expiryType !== "specific" && expiryType !== "fkill"
                        ? t("LimitOrderCard:expiry.generalDescription", {
                            expiryType,
                          })
                        : null}
                    </FieldDescription>
                  </Field>
                )}
              />

              <Separator className="mb-1 mt-1 bg-accent/50" />

              <Controller
                name="osoValue"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field invalid={fieldState.invalid}>
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer",
                        osoEnabled
                          ? "border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.06)]"
                          : "border-border/60 bg-accent/20 hover:bg-accent/40"
                      )}
                      onClick={() => {
                        const next = !osoEnabled;
                        setOSOEnabled(next);
                        setInputChars(inputChars + 1);
                        field.onChange(next);
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                            osoEnabled
                              ? "border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                              : "border-border bg-accent/40 text-muted-foreground/70"
                          )}
                        >
                          <Zap className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none text-foreground/90">
                            {osoEnabled
                              ? t("LimitOrderCard:osoValue.enabled")
                              : t("LimitOrderCard:osoValue.enable")}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                            {t("LimitOrderCard:osoValue.description")}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 shrink-0 rounded-sm border flex items-center justify-center transition-colors",
                          osoEnabled
                            ? "border-[hsl(var(--accent-1))] bg-[hsl(var(--accent-1))] text-foreground"
                            : "border-accent/50 dark:border-white/20 bg-transparent"
                        )}
                      >
                        {osoEnabled && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  </Field>
                )}
              />

              {osoEnabled ? (
                <div className="mt-2 space-y-2 rounded-lg border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.03)] p-3 sm:p-4">
                  <Controller
                    name="osoSpread"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field
                        invalid={fieldState.invalid}
                        className="mt-2 text-xs"
                      >
                        <FieldLabel className="text-sm">
                          {t("LimitOrderCard:osoEnabled.spreadPercentLabel")}
                        </FieldLabel>
                        <FieldDescription>
                          {t(
                            "LimitOrderCard:osoEnabled.spreadPercentDescription"
                          )}
                        </FieldDescription>
                        <span className="grid grid-cols-12">
                          <span className="col-span-9">
                            <Input
                              {...field}
                              label={t(
                                "LimitOrderCard:osoEnabled.spreadPercentLabel"
                              )}
                              value={field.value ?? spreadPercent}
                              disabled
                              readOnly
                            />
                            <Slider
                              className={cn("mt-1 bg-gradient-to-r", accent.gradient)}
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 dark:hover:border-white/20 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:text-accent-foreground transition-all cursor-pointer"
                                >
                                  <Label>{t("LimitOrderCard:editLabel")}</Label>
                                </span>
                              </PopoverTrigger>
                              <PopoverContent
                            className="!bg-card border border-border text-foreground"

                          >
                                <Label>
                                  {t(
                                    "LimitOrderCard:osoEnabled.provideNewSpreadPercent"
                                  )}
                                </Label>
                                <Input
                                  placeholder={spreadPercent}
                                  className="mb-2 mt-1"
                                  onChange={(event) => {
                                    const input = event.target.value;
                                    const regex = /^[0-9]*\.?[0-9]*$/;
                                    if (
                                      input &&
                                      input.length &&
                                      regex.test(input)
                                    ) {
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
                      </Field>
                    )}
                  />
                  <Controller
                    name="osoSize"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field
                        invalid={fieldState.invalid}
                        className="mt-1 text-xs"
                      >
                        <FieldLabel className="text-sm">
                          {t("LimitOrderCard:osoSize.sizePercentLabel")}
                        </FieldLabel>
                        <FieldDescription>
                          {t("LimitOrderCard:osoSize.sizePercentDescription")}
                        </FieldDescription>
                        <span className="grid grid-cols-12">
                          <span className="col-span-9">
                            <Input
                              {...field}
                              label={t(
                                "LimitOrderCard:osoSize.sizePercentLabel"
                              )}
                              value={field.value ?? sizePercent}
                              disabled
                              readOnly
                            />
                            <Slider
                              className={cn("mt-1 bg-gradient-to-r", accent.gradient)}
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 dark:hover:border-white/20 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:text-accent-foreground transition-all cursor-pointer"
                                >
                                  <Label>{t("LimitOrderCard:editLabel")}</Label>
                                </span>
                              </PopoverTrigger>
                              <PopoverContent
                            className="!bg-card border border-border text-foreground"

                          >
                                <Label>
                                  {t(
                                    "LimitOrderCard:osoSize.provideNewSizePercent"
                                  )}
                                </Label>
                                <Input
                                  placeholder={sizePercent}
                                  className="mb-2 mt-1"
                                  onChange={(event) => {
                                    const input = event.target.value;
                                    const regex = /^[0-9]*\.?[0-9]*$/;
                                    if (
                                      input &&
                                      input.length &&
                                      regex.test(input)
                                    ) {
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
                      </Field>
                    )}
                  />

                  <Controller
                    name="repeatValue"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field
                        invalid={fieldState.invalid}
                        className="mt-1 text-xs"
                      >
                        <FieldLabel className="text-sm">
                          {t("LimitOrderCard:repeatValue.label")}
                        </FieldLabel>
                        <FieldDescription>
                          {t("LimitOrderCard:repeatValue.description")}
                        </FieldDescription>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="terms2"
                            checked={repeat}
                            onCheckedChange={(checked) => {
                              setRepeat(checked);
                              setInputChars(inputChars + 1);
                              field.onChange(checked);
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
                      </Field>
                    )}
                  />
                </div>
              ) : null}

              {/*
              <Separator className="mt-1" />

              <Controller
                name="fee"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field invalid={fieldState.invalid} disabled>
                    <FieldLabel>{t("LimitOrderCard:fee.label")}</FieldLabel>
                    <FieldDescription>
                      {t("LimitOrderCard:fee.description")}
                    </FieldDescription>
                    <Input
                      {...field}
                      disabled
                      label={t("LimitOrderCard:fee.label")}
                      value={`${fee} ${
                        usr.chain === "bitshares" ? "BTS" : "TEST"
                      }`}
                      placeholder={1}
                    />
                    {expiryType === "fkill" || usr.id === usr.referrer ? (
                      <FieldError>
                        {expiryType === "fkill"
                          ? t("LimitOrderCard:fee.unfilledRebate", { fee })
                          : null}
                        <br />
                        {usr.id === usr.referrer
                          ? t("LimitOrderCard:fee.ltmRebate", {
                              rebate: 0.8 * fee,
                            })
                          : null}
                      </FieldError>
                    ) : null}
                  </Field>
                )}
              />
              
              */}

              {orderType === "buy" &&
              assetAData &&
              assetAData.market_fee_percent &&
              assetAData.market_fee_percent > 0 ? (
                <Controller
                  name="marketFees"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field invalid={fieldState.invalid} disabled>
                      <FieldLabel>
                        {t("LimitOrderCard:marketFees.label")}
                      </FieldLabel>
                      <Input
                        {...field}
                        disabled
                        value={`${marketFees} ${assetAData.symbol}`}
                        placeholder={`${marketFees} ${assetAData.symbol}`}
                      />
                      <FieldDescription>
                        {t("LimitOrderCard:marketFees.description")}
                      </FieldDescription>
                    </Field>
                  )}
                />
              ) : null}
              {orderType === "sell" &&
              assetBData &&
              assetBData.market_fee_percent &&
              assetBData.market_fee_percent > 0 ? (
                <Controller
                  name="marketFees"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field invalid={fieldState.invalid} disabled>
                      <FieldLabel>
                        {t("LimitOrderCard:marketFees.label")}
                      </FieldLabel>
                      <Input
                        {...field}
                        disabled
                        value={`${marketFees} ${assetBData.symbol}`}
                        placeholder={`${marketFees} ${assetBData.symbol}`}
                      />

                      <FieldDescription>
                        {t("LimitOrderCard:marketFees.description")}
                      </FieldDescription>
                    </Field>
                  )}
                />
              ) : null}
              {amount && price && total && parseFloat(amount) > 0 ? (
                <div
                  className={cn(
                    "mt-2 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
                    isBuy
                      ? "border-[hsl(var(--accent-success)/0.2)] bg-[hsl(var(--accent-success)/0.04)]"
                      : "border-[hsl(var(--accent-danger)/0.2)] bg-[hsl(var(--accent-danger)/0.04)]"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground/70 truncate">
                      {isBuy
                        ? t("LimitOrderCard:headerText.buying", {
                            amount: parseFloat(amount).toFixed(
                              assetAData.precision
                            ),
                            thisAssetA,
                            total: parseFloat(total).toFixed(
                              assetBData.precision
                            ),
                            thisAssetB,
                          })
                        : t("LimitOrderCard:headerText.selling", {
                            amount: parseFloat(amount).toFixed(
                              assetAData.precision
                            ),
                            thisAssetA,
                            total: parseFloat(total).toFixed(
                              assetBData.precision
                            ),
                            thisAssetB,
                          })}
                    </span>
                  </div>
                </div>
              ) : null}
              {!amount || !price || !expiry ? (
                <div className="mt-2 mb-1 grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-center gap-1.5 h-12 rounded-xl border border-[hsl(var(--accent-warning)/0.2)] bg-[hsl(var(--accent-warning)/0.06)]">
                    <Zap className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))]" strokeWidth={2.5} />
                    <span className="font-mono text-xs dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))]">
                      {fee ? `${fee.toFixed(5)} ${usr.chain === "bitshares" ? "BTS" : "TEST"}` : `0.00000 ${usr.chain === "bitshares" ? "BTS" : "TEST"}`}
                    </span>
                  </div>
                  <Button
                    className="h-12 text-muted-foreground font-semibold bg-muted disabled:opacity-70 dark:bg-white/[0.06] cursor-not-allowed"
                    disabled
                    type="submit"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {t("LimitOrderCard:submit")}
                  </Button>
                </div>
              ) : (
                <div className="mt-2 mb-1 grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-center gap-1.5 h-12 rounded-xl border border-[hsl(var(--accent-warning)/0.2)] bg-[hsl(var(--accent-warning)/0.06)]">
                    <Zap className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))]" strokeWidth={2.5} />
                    <span className="font-mono text-xs dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))]">
                      {fee ? `${fee.toFixed(5)} ${usr.chain === "bitshares" ? "BTS" : "TEST"}` : `0.00000 ${usr.chain === "bitshares" ? "BTS" : "TEST"}`}
                    </span>
                  </div>
                  <Button
                    className={cn(
                      "h-12 gap-2 font-semibold",
                      accent.solid,
                      accent.textOn,
                      "bg-gradient-to-r shadow-lg shadow-black/30",
                      accent.gradient,
                      "hover:brightness-110 active:scale-[0.99] transition-all"
                    )}
                    type="submit"
                  >
                    <Zap className="h-4 w-4" />
                    {t("LimitOrderCard:submit")}
                  </Button>
                </div>
              )}
            </FieldGroup>
          </form>
        ) : (
          <form>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>
                  <div className="grid grid-cols-2 mt-1">
                    <div className="mt-1">
                      {t("LimitOrderCard:sellPrice.label")}
                    </div>
                    <div className="text-muted-foreground text-right">
                      <span variant="link">
                        <Badge>
                          {t("LimitOrderCard:sellPrice.useLowestAsk")}
                        </Badge>
                      </span>
                    </div>
                  </div>
                </FieldLabel>

                <Input disabled className="mb-1 bg-accent/40 border-border disabled:opacity-100 placeholder:text-muted-foreground" />
                <FieldDescription>
                  {t("LimitOrderCard:sellPrice.description")}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>
                  <div className="grid grid-cols-2 mt-1">
                    <div className="mt-1">
                      {t("LimitOrderCard:sellAmount2.label")}
                    </div>
                    <div className="text-muted-foreground text-right">
                      {orderType === "sell" && assetABalance ? (
                        <Badge>{t("LimitOrderCard:useBalance")}</Badge>
                      ) : null}
                    </div>
                  </div>
                </FieldLabel>
                <FieldDescription>
                  {orderType === "buy"
                    ? t("LimitOrderCard:sellAmount2.buyDescription")
                    : t("LimitOrderCard:sellAmount2.sellDescription")}
                </FieldDescription>
                <Input disabled className="mb-1 bg-accent/40 border-border disabled:opacity-100 placeholder:text-muted-foreground" />
              </Field>

              <Field>
                <FieldLabel>
                  <div className="grid grid-cols-2 mt-1">
                    <div className="mt-1">
                      {t("LimitOrderCard:sellTotal2.label")}
                    </div>
                    <div className="text-muted-foreground text-right">
                      {orderType === "buy" && assetBBalance ? (
                        <Badge>{t("LimitOrderCard:useBalance")}</Badge>
                      ) : null}
                    </div>
                  </div>
                </FieldLabel>
                <FieldDescription>
                  {orderType === "buy"
                    ? t("LimitOrderCard:sellTotal2.buyDescription")
                    : t("LimitOrderCard:sellTotal2.sellDescription")}
                </FieldDescription>
                <Input disabled className="mb-1 bg-accent/40 border-border disabled:opacity-100 placeholder:text-muted-foreground" />
              </Field>

              <Field>
                <FieldLabel>{t("LimitOrderCard:expiry2.label")}</FieldLabel>
                <FieldDescription>
                  {t("LimitOrderCard:expiry2.description")}
                </FieldDescription>
                <Select disabled>
                  <SelectTrigger className="mb-1">
                    <SelectValue placeholder="1hr" />
                  </SelectTrigger>
                </Select>
              </Field>

              <Field disabled>
                <FieldLabel>{t("LimitOrderCard:fee.label")}</FieldLabel>
                <Input
                  disabled
                  label={t("LimitOrderCard:fee.label")}
                  className="bg-accent/40 border-border disabled:opacity-100 placeholder:text-muted-foreground"
                />
                <FieldDescription>
                  {t("LimitOrderCard:fee.description")}
                </FieldDescription>
                {expiryType === "fkill" || usr.id === usr.referrer ? (
                  <FieldError>
                    {expiryType === "fkill"
                      ? t("LimitOrderCard:fee.unfilledRebate", {
                          rebate: 1 * 0.4826,
                        })
                      : null}
                    {usr.id === usr.referrer
                      ? t("LimitOrderCard:fee.ltmRebate", {
                          rebate: 0.8 * 0.4826,
                        })
                      : null}
                  </FieldError>
                ) : null}
              </Field>

              <Button
                disabled
                  className="mt-6 mb-1 w-full h-12 dark:text-white text-muted-foreground font-semibold bg-muted dark:bg-white/[0.06] cursor-not-allowed opacity-60"
                type="submit"
              >
                <Zap className="h-4 w-4 mr-2" />
                {t("LimitOrderCard:submit")}
              </Button>
            </FieldGroup>
          </form>
        )}
        {showDialog ? (
          <DeepLinkDialog
            operationNames={["limit_order_create"]}
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
                ? t("LimitOrderCard:headerText.buying", {
                    amount,
                    thisAssetA,
                    total,
                    thisAssetB,
                  })
                : t("LimitOrderCard:headerText.selling", {
                    amount,
                    thisAssetA,
                    total,
                    thisAssetB,
                  })
            }
            trxJSON={
              orderType === "buy"
                ? [
                    {
                      seller: usr.id,
                      amount_to_sell: {
                        amount: blockchainFloat(
                          total,
                          assetBData.precision
                        ).toFixed(0),
                        asset_id: marketSearch.find(
                          (asset) => asset.s === thisAssetB
                        ).id,
                      },
                      min_to_receive: {
                        amount: blockchainFloat(
                          amount,
                          assetAData.precision
                        ).toFixed(0),
                        asset_id: marketSearch.find(
                          (asset) => asset.s === thisAssetA
                        ).id,
                      },
                      expiration: date,
                      fill_or_kill: expiryType === "fkill" ? true : false,
                      extensions: osoEnabled
                        ? {
                            on_fill: [
                              [
                                0,
                                {
                                  fee_asset_id: "1.3.0",
                                  spread_percent: spreadPercent
                                    ? spreadPercent * 100
                                    : 0,
                                  size_percent: sizePercent
                                    ? sizePercent * 100
                                    : 0,
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
                        amount: blockchainFloat(
                          amount,
                          assetAData.precision
                        ).toFixed(0),
                        asset_id: marketSearch.find(
                          (asset) => asset.s === thisAssetA
                        ).id,
                      },
                      min_to_receive: {
                        amount: blockchainFloat(
                          total,
                          assetBData.precision
                        ).toFixed(0),
                        asset_id: marketSearch.find(
                          (asset) => asset.s === thisAssetB
                        ).id,
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
      </div>
    </div>
  );
}
