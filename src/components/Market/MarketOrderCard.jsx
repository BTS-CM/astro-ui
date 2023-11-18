import React, { useState, useEffect } from "react";
import { FixedSizeList as List } from "react-window";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { humanReadableFloat } from "../../lib/common";

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
  } = properties;

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

    const price = parseFloat(order.price).toFixed(assetAData.precision);
    const base = parseFloat(order.base);
    const quote = parseFloat(order.quote);

    const totalBase = refOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.base))
      .reduce((acc, curr) => acc + curr, 0)
      .toFixed(assetAData.precision);

    const totalQuote = refOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.quote))
      .reduce((acc, curr) => acc + curr, 0)
      .toFixed(assetAData.precision);

    const href = `/dex/index.html?market=${assetA}_${assetB}&type=sell&price=${(1 / price).toFixed(
      assetAData.precision
    )}&amount=${totalBase}`;

    return (
      <div style={style}>
        <HoverCard key={`${cardType}OrderHoverCard${index}`}>
          <HoverCardTrigger asChild>
            <div className="col-span-4" key={`moc_${cardType}_${index}`}>
              <div className="grid grid-cols-4 text-sm">
                <div className="col-span-1 border-l-2 border-r-2 pl-3">{price}</div>
                <div className="col-span-1 border-r-2 pl-3">{base}</div>
                <div className="col-span-1 border-r-2 pl-3">{quote}</div>
                <div className="col-span-1 pl-3">{totalBase}</div>
                <div className="col-span-4">
                  <Separator />
                </div>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 text-sm pt-3">
            <>
              <span className="pt-5">
                {`Buy ${totalQuote} ${assetB} for ${totalBase} ${assetA}?`}
              </span>
              <br />
              <a href={href}>
                <Button className="mt-2 h-6">Proceed</Button>
              </a>
            </>
          </HoverCardContent>
        </HoverCard>
      </div>
    );
  };

  const LoadingRow = ({ index, style }) => {
    const refOrders = cardType === "buy" ? previousBuyOrders : previousSellOrders;
    const order = refOrders && refOrders.length ? refOrders[index] : null;

    const price = order ? parseFloat(order.price).toFixed(assetAData.precision) : null;
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
            <div className="col-span-4" key={`moc_loading_${cardType}_${index}`}>
              <div className="grid grid-cols-4 text-sm">
                {order ? (
                  <>
                    <div className="col-span-1 border-l-2 border-r-2 pl-3">{price}</div>
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
            Market data is refreshing, please wait...
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
    cardTitle = "Loading market orders";
    cardDescription = "Fetching requested market data, please wait...";
    cardListContents = LoadingRow;
    cardListCount = 10;
  } else {
    cardTitle = cardType === "buy" ? "Buy orders" : "Sell orders";
    cardDescription =
      cardType === "buy"
        ? `The following table displays network offers to purchase ${assetA} with ${assetB}`
        : `The following table displays network offers to sell ${assetA} for ${assetB}`;
    cardListContents = Row;
    if (cardType === "buy") {
      cardListCount = buyOrders ? buyOrders.length : previousBuyOrders.length;
    } else {
      cardListCount = sellOrders ? sellOrders.length : previousSellOrders.length;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4">
          <div className="col-span-1 pl-3">Price</div>
          <div className="col-span-1 pl-3 text-md">
            {cardType === "buy" && assetA && assetA.length < 12 ? assetA : null}
            {cardType === "buy" && assetA && assetA.length >= 12 && assetAData
              ? assetAData.id
              : null}
            {cardType === "sell" && assetB && assetB.length < 12 ? assetB : null}
            {cardType === "sell" && assetB && assetB.length >= 12 && assetBData
              ? assetBData.id
              : null}
          </div>
          <div className="col-span-1 pl-3">
            {cardType === "buy" && assetB && assetB.length < 12 ? assetB : null}
            {cardType === "buy" && assetB && assetB.length >= 12 && assetBData
              ? assetBData.id
              : null}
            {cardType === "sell" && assetA && assetA.length < 12 ? assetA : null}
            {cardType === "sell" && assetA && assetA.length >= 12 && assetAData
              ? assetAData.id
              : null}
          </div>
          <div className="col-span-1 pl-3">Total</div>
        </div>

        <List
          height={300} // Set the height of the list
          itemCount={cardListCount} // Set the number of items
          itemSize={20} // Set the height of each item
        >
          {cardListContents}
        </List>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => {
            _resetOrders();
            setOrderBookItr(orderBookItr + 1);
          }}
        >
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}
