import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
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
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  trimPrice,
  humanReadableFloat,
  blockchainFloat,
  debounce,
} from "@/lib/common.js";
import DeepLinkDialog from "../common/DeepLinkDialog";

/**
 * Creating a market card component for buy and sell limit orders
 */
export default function HorizontalTradeCard(properties) {
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
          parseFloat(amount) * (assetAData.market_fee_percent / 100);
        return calculatedMarketFee.toFixed(assetAData.precision);
      }

      if (
        orderType === "sell" &&
        assetBData &&
        assetBData.market_fee_percent &&
        assetBData.market_fee_percent > 0
      ) {
        calculatedMarketFee =
          parseFloat(total) * (assetBData.market_fee_percent / 100);
        return calculatedMarketFee.toFixed(assetBData.precision);
      }
    }

    return calculatedMarketFee;
  }, [amount, price, total, orderType, assetAData, assetBData]);

  const [expiryType, setExpiryType] = useState("fkill");
  const [expiry, setExpiry] = useState(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });

  const [date, setDate] = useState(
    new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
  );

  const form = useForm({
    defaultValues: {
      priceAmount: 0.0,
      sellAmount: 0.0,
      sellTotal: 0,
      expiry: "fkill",
      fee: 0,
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

  const [inputChars, setInputChars] = useState(0);
  useEffect(() => {
    if (inputChars > 0) {
      let finalUrlParams =
        `?market=${thisAssetA}_${thisAssetB}` + `&amount=${amount}`;

      window.history.replaceState({}, "", finalUrlParams);
    }
  }, [amount, thisAssetA, thisAssetB]);

  const trxJSON = useMemo(() => {
    // TODO: process limit orders which match multiple open market orders
    return [
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
        expiration: date,
        fill_or_kill: true,
        extensions: {},
      },
    ];
  }, [
    usr,
    total,
    assetBData,
    thisAssetB,
    amount,
    assetAData,
    thisAssetA,
    date,
    marketSearch,
  ]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>
          {t("LimitOrderCard:buyingWith", {
            assetA: thisAssetA,
            assetB: thisAssetB,
          })}
        </CardTitle>
        <CardDescription>
          {t("LimitOrderCard:createLimitOrder")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {thisAssetA &&
        thisAssetB &&
        marketSearch &&
        assetAData &&
        assetBData ? (
          <form onSubmit={form.handleSubmit(() => setShowDialog(true))}>
            <FieldGroup>
              <Controller
                name="sellAmount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field invalid={fieldState.invalid} className="mt-4 text-xs">
                    <FieldLabel>
                      {t("LimitOrderCard:sellAmount.label")}
                    </FieldLabel>
                    <FieldDescription>
                      {t("LimitOrderCard:sellAmount.buyDescription", {
                        asset: thisAssetA,
                      })}
                    </FieldDescription>
                    <span className="grid grid-cols-12">
                      <span className="col-span-9">
                        <Input
                          {...field}
                          label={`Amount`}
                          placeholder={amount}
                          disabled
                          readOnly
                        />
                      </span>
                      <span className="col-span-3 ml-3 text-center">
                        <Popover>
                          <PopoverTrigger>
                            <span className="inline-block border border-gray-300 rounded pl-4 pb-1 pr-4 text-lg">
                              <Label>{t("LimitOrderCard:editLabel")}</Label>
                            </span>
                          </PopoverTrigger>
                          <PopoverContent>
                            <Label>
                              {t("LimitOrderCard:sellAmount.provideNewLabel")}
                            </Label>{" "}
                            <Input
                              placeholder={amount}
                              className="mb-2 mt-1"
                              onChange={(event) => {
                                const input = event.target.value;
                                const regex = /^[0-9,]*\.?[0-9]*$/;
                                if (
                                  input &&
                                  input.length &&
                                  regex.test(input)
                                ) {
                                  const parsedInput = parseFloat(
                                    input.replaceAll(",", "")
                                  );
                                  if (parsedInput) {
                                    setAmount(
                                      parsedInput.toFixed(assetAData.precision)
                                    );
                                    if (price) {
                                      setTotal(
                                        (parsedInput * price).toFixed(
                                          assetBData.precision
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
                  </Field>
                )}
              />

              <Separator className="mt-3" />

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
                      value={`${fee} BTS`}
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
              {!amount || !price || !expiry ? (
                <Button
                  className="mt-7 mb-1"
                  variant="outline"
                  disabled
                  type="submit"
                >
                  {t("LimitOrderCard:submit")}
                </Button>
              ) : (
                <Button className="mt-7 mb-1" variant="outline" type="submit">
                  {t("LimitOrderCard:submit")}
                </Button>
              )}
            </FieldGroup>
          </form>
        ) : null}
      </CardContent>
      {showDialog ? (
        <DeepLinkDialog
          operationNames={["limit_order_create"]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`Buying${amount}${thisAssetA}for${total}${thisAssetB}`}
          headerText={t("LimitOrderCard:headerText.buying", {
            amount,
            thisAssetA,
            total,
            thisAssetB,
          })}
          trxJSON={trxJSON}
        />
      ) : null}
    </Card>
  );
}
