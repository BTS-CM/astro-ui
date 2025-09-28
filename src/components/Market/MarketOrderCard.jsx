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
import { Skeleton } from "@/components/ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export default function MarketOrderCard(properties) {
  const {
    cardType,
    activeLimitCard,
    assetA,
    assetAData,
    assetB,
    assetBData,
    buyOrders,
    previousBuyOrders,
    sellOrders,
    previousSellOrders,
    marketOrdersLoading,
    orderBookItr,
    setOrderBookItr,
    _resetOrders,
    invertedMarket,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const quantityOrders = useMemo(() => {
    if (cardType === "buy") {
      return buyOrders ? buyOrders.length : 0;
    } else {
      return sellOrders ? sellOrders.length : 0;
    }
  }, [cardType, buyOrders, sellOrders]);

  const Row = ({ index, style }) => {
    let refOrders;
    if (cardType === "buy" && buyOrders) {
      refOrders = buyOrders;
    } else if (cardType === "buy" && previousBuyOrders) {
      refOrders = previousBuyOrders;
    } else if (cardType === "sell" && sellOrders) {
      refOrders = sellOrders;
    } else if (cardType === "sell" && previousSellOrders) {
      refOrders = previousSellOrders;
    }

    const order = refOrders[index];

    const price = parseFloat(order.price).toFixed(assetBData.precision);
    const base = parseFloat(order.base);
    const quote = parseFloat(order.quote);

    const totalBase = refOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.base))
      .reduce((acc, curr) => acc + curr, 0)
      .toFixed(assetBData.precision);

    const totalQuote = refOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.quote))
      .reduce((acc, curr) => acc + curr, 0)
      .toFixed(assetAData.precision);

    const href = useMemo(() => {
      return cardType === "buy"
        ? `/dex/index.html?market=${assetA}_${assetB}&type=sell&price=${price}&amount=${totalQuote}`
        : `/dex/index.html?market=${assetA}_${assetB}&type=buy&price=${price}&amount=${totalQuote}`;
    }, [assetA, assetB, price, totalBase, totalQuote]);

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
              {cardType === "buy"
                ? t("MarketOrderCard:sellingQuoteForBase", {
                    totalQuote: totalQuote,
                    assetA: assetA,
                    totalBase: totalBase,
                    assetB: assetB,
                  })
                : t("MarketOrderCard:sellingBaseForQuote", {
                    totalBase: totalBase,
                    assetB: assetB,
                    totalQuote: totalQuote,
                    assetA: assetA,
                  })}
            </span>
            <span>
              {t("MarketOrderCard:pricePerAsset", {
                price: price,
                assetB: assetB,
                assetA: assetA,
              })}
            </span>
            <a href={href}>
              <Button className="mt-2 h-6">
                {t("MarketOrderCard:proceedButton")}
              </Button>
            </a>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const LoadingRow = ({ index, style }) => {
    const refOrders =
      cardType === "buy" ? previousBuyOrders : previousSellOrders;
    const order = refOrders && refOrders.length ? refOrders[index] : null;

    const price = order
      ? parseFloat(order.price).toFixed(assetAData.precision)
      : null;
    const base = order ? parseFloat(order.base) : null;
    const quote = order ? parseFloat(order.quote) : null;

    const totalBase =
      refOrders && refOrders.length
        ? refOrders
            .slice(0, index + 1)
            .map((x) => parseFloat(x.base))
            .reduce((acc, curr) => acc + curr, 0)
            .toFixed(assetAData.precision)
        : null;

    return (
      <div style={style}>
        <HoverCard key={`loadingOrderHoverCard${index}`}>
          <HoverCardTrigger asChild>
            <div
              className="col-span-4"
              key={`moc_loading_${cardType}_${index}`}
            >
              <div className="grid grid-cols-4 text-sm">
                {order ? (
                  <>
                    <div className="col-span-1 border-l-2 border-r-2 pl-3">
                      {price}
                    </div>
                    <div className="col-span-1 border-r-2 pl-3">{base}</div>
                    <div className="col-span-1 border-r-2 pl-3">{quote}</div>
                    <div className="col-span-1 pl-3">{totalBase}</div>
                  </>
                ) : (
                  <div className="col-span-4">
                    <Skeleton className="h-4 w-full" />
                  </div>
                )}
                <div className="col-span-4">
                  <Separator />
                </div>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 text-sm pt-3">
            {t("MarketOrderCard:marketDataRefreshing")}
            <br />
            <Skeleton className="h-4 w-full" />
          </HoverCardContent>
        </HoverCard>
      </div>
    );
  };

  let cardTitle;
  let cardDescription;
  let cardList;
  let cardListContents;
  let cardListCount;

  if (
    marketOrdersLoading &&
    !buyOrders &&
    !sellOrders &&
    !previousBuyOrders &&
    !previousBuyOrders.length &&
    !previousSellOrders &&
    !previousSellOrders.length
  ) {
    cardTitle = t("MarketOrderCard:loadingMarketOrdersTitle");
    cardDescription = t("MarketOrderCard:loadingMarketOrdersDescription");
    cardListContents = LoadingRow;
    cardListCount = 10;
  } else {
    cardTitle =
      cardType === "buy"
        ? t("MarketOrderCard:openBuyLimitOrdersTitle")
        : t("MarketOrderCard:openSellLimitOrdersTitle");
    cardDescription =
      cardType === "buy"
        ? t("MarketOrderCard:buyLimitOrdersDescription", {
            assetA: assetA,
            assetB: assetB,
          })
        : t("MarketOrderCard:sellLimitOrdersDescription", {
            assetA: assetA,
            assetB: assetB,
          });

    cardListContents = Row;
    if (cardType === "buy") {
      cardListCount = buyOrders ? buyOrders.length : previousBuyOrders.length;
    } else {
      cardListCount = sellOrders
        ? sellOrders.length
        : previousSellOrders.length;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {quantityOrders ? (
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

            {cardListCount && cardListCount > 0 && cardListContents ? (
              <List
                height={300} // Set the height of the list
                rowComponent={cardListContents} // Set the component to render each item
                rowCount={cardListCount} // Set the number of items
                rowHeight={20} // Set the height of each item
              />
            ) : null}
          </>
        ) : (
          t("MarketOrderCard:noOpenOrders")
        )}
      </CardContent>
    </Card>
  );
}
