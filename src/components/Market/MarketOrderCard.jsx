import React, { useState, useEffect, useMemo } from "react";
import { List } from "react-window";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function MarketOrderCard(properties) {
  const { cardType, assetA, assetAData, assetB, assetBData, marketOrders } =
    properties;

  console.log({
    cardType,
    assetA,
    assetAData,
    assetB,
    assetBData,
    marketOrders,
  });

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const Row = ({ index, style }) => {
    const order = marketOrders[index];

    const price = parseFloat(order.price).toFixed(assetBData.precision);
    const base = parseFloat(order.base);
    const quote = parseFloat(order.quote);

    const totalBase = marketOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.base))
      .reduce((acc, curr) => acc + curr, 0)
      .toFixed(assetBData.precision);

    const totalQuote = marketOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.quote))
      .reduce((acc, curr) => acc + curr, 0)
      .toFixed(assetAData.precision);

    return (
      <div style={style}>
        <Dialog key={`${cardType}Dialog${index}`}>
          <DialogTrigger asChild>
            <div className="col-span-4" key={`moc_${cardType}_${index}`}>
              <div className="grid grid-cols-4 text-sm">
                <div className="col-span-1 border-l-2 border-r-2 pl-3 font-mono text-right tabular-nums">
                  {price}
                </div>
                <div className="col-span-1 border-r-2 pl-3 font-mono text-right tabular-nums">
                  {cardType === "buy"
                    ? base.toFixed(assetBData.precision)
                    : quote.toFixed(assetAData.precision)}
                </div>
                <div className="col-span-1 border-r-2 pl-3 font-mono text-right tabular-nums">
                  {cardType === "buy"
                    ? quote.toFixed(assetAData.precision)
                    : base.toFixed(assetBData.precision)}
                </div>
                <div className="col-span-1 pl-3 font-mono text-right tabular-nums">
                  {totalBase}
                </div>
                <div className="col-span-4">
                  <Separator />
                </div>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("MarketOrderCard:proceedLimitOrderDataTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("MarketOrderCard:proceedLimitOrderDataDescription", {
                  cardType: cardType === "buy" ? "sell" : "buy",
                })}
              </DialogDescription>
            </DialogHeader>
            <span className="pt-3">
              {t("MarketOrderCard:sellingQuoteForBase", {
                totalQuote: totalQuote,
                assetA: cardType === "buy" ? assetA : assetB,
                totalBase: totalBase,
                assetB: cardType === "buy" ? assetB : assetA,
              })}
            </span>
            <span>
              {t("MarketOrderCard:pricePerAsset", {
                price: price,
                assetB: assetB,
                assetA: assetA,
              })}
            </span>
            <a
              href={
                cardType === "buy"
                  ? `/dex/index.html?market=${assetA}_${assetB}&type=sell&price=${price}&amount=${totalQuote}`
                  : `/dex/index.html?market=${assetA}_${assetB}&type=buy&price=${price}&amount=${totalQuote}`
              }
            >
              <Button className="mt-2 h-6">
                {t("MarketOrderCard:proceedButton")}
              </Button>
            </a>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {cardType === "buy"
            ? t("MarketOrderCard:openBuyLimitOrdersTitle")
            : t("MarketOrderCard:openSellLimitOrdersTitle")}
        </CardTitle>
        <CardDescription>
          {t(
            cardType === "buy"
              ? "MarketOrderCard:buyLimitOrdersDescription"
              : "MarketOrderCard:sellLimitOrdersDescription",
            {
              assetA: assetA,
              assetB: assetB,
            }
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {marketOrders && marketOrders.length ? (
          <>
            <div className="grid grid-cols-4">
              <div className="col-span-1 pl-3 text-right pr-2">Price</div>
              <div className="col-span-1 pl-3 text-md text-right pr-2">
                {cardType === "sell" && assetA && assetA.length < 12
                  ? assetA
                  : null}
                {cardType === "sell" &&
                assetA &&
                assetA.length >= 12 &&
                assetAData
                  ? assetAData.id
                  : null}
                {cardType === "buy" && assetB && assetB.length < 12
                  ? assetB
                  : null}
                {cardType === "buy" &&
                assetB &&
                assetB.length >= 12 &&
                assetBData
                  ? assetBData.id
                  : null}
              </div>
              <div className="col-span-1 pl-3 text-right pr-2">
                {cardType === "sell" && assetB && assetB.length < 12
                  ? assetB
                  : null}
                {cardType === "sell" &&
                assetB &&
                assetB.length >= 12 &&
                assetBData
                  ? assetBData.id
                  : null}
                {cardType === "buy" && assetA && assetA.length < 12
                  ? assetA
                  : null}
                {cardType === "buy" &&
                assetA &&
                assetA.length >= 12 &&
                assetAData
                  ? assetAData.id
                  : null}
              </div>
              <div className="col-span-1 pl-3 text-right pr-2">
                {assetB && assetB.length < 7 ? `Total (${assetB})` : null}
                {assetB && assetB.length >= 7 && assetBData
                  ? `Total (${assetBData.id})`
                  : null}
              </div>
            </div>

            <List
              height={300}
              rowComponent={Row}
              rowCount={marketOrders.length}
              rowHeight={20}
              rowProps={{}}
            />
          </>
        ) : (
          t("MarketOrderCard:noOpenOrders")
        )}
      </CardContent>
    </Card>
  );
}
