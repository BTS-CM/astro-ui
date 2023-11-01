import React, { useState, useEffect } from "react";

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
    sellOrders,
    marketOrdersLoading,
    orderBookItr,
    setOrderBookItr,
    _resetOrders,
  } = properties;

  return (
    <>
      {marketOrdersLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading market orders</CardTitle>
            <CardDescription>
              Fetching requested market data, please wait...
            </CardDescription>
            <CardContent>
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-full mt-1" />
            </CardContent>
            <CardFooter>
              <Button
                className="mt-5"
                onClick={() => setOrderBookItr(orderBookItr + 1)}
              >
                Retry request
              </Button>
            </CardFooter>
          </CardHeader>
        </Card>
      ) : null}
      {((cardType === "buy" && !buyOrders) ||
        (cardType === "sell" && !sellOrders)) &&
      !marketOrdersLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading market orders</CardTitle>
            <CardDescription>
              Failed to fetch market data, please try again.
              <br />
              <Button
                className="mt-5"
                onClick={() => setOrderBookItr(orderBookItr + 1)}
              >
                Refresh
              </Button>
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {((cardType === "buy" && buyOrders) ||
        (cardType === "sell" && sellOrders)) &&
      !marketOrdersLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {cardType === "buy" ? "Buy orders" : "Sell orders"}
            </CardTitle>
            <CardDescription>
              {cardType === "buy"
                ? `The following table displays network offers to purchase ${assetA} with ${assetB}`
                : `The following table displays network offers to sell ${assetA} for ${assetB}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(cardType === "buy" && !buyOrders.length) ||
            (cardType === "sell" && !sellOrders.length) ? (
              <>No {cardType === "buy" ? "buy" : "sell"} limit orders found</>
            ) : (
              <>
                <div className="grid grid-cols-4">
                  <div className="col-span-1 pl-3">Price</div>
                  <div className="col-span-1 pl-3 text-md">
                    {cardType === "buy" && assetA && assetA.length < 12
                      ? assetA
                      : null}
                    {cardType === "buy" &&
                    assetA &&
                    assetA.length >= 12 &&
                    assetAData
                      ? assetAData.id
                      : null}
                    {cardType === "sell" && assetB && assetB.length < 12
                      ? assetB
                      : null}
                    {cardType === "sell" &&
                    assetB &&
                    assetB.length >= 12 &&
                    assetBData
                      ? assetBData.id
                      : null}
                  </div>
                  <div className="col-span-1 pl-3">
                    {cardType === "buy" && assetB && assetB.length < 12
                      ? assetB
                      : null}
                    {cardType === "buy" &&
                    assetB &&
                    assetB.length >= 12 &&
                    assetBData
                      ? assetBData.id
                      : null}
                    {cardType === "sell" && assetA && assetA.length < 12
                      ? assetA
                      : null}
                    {cardType === "sell" &&
                    assetA &&
                    assetA.length >= 12 &&
                    assetAData
                      ? assetAData.id
                      : null}
                  </div>
                  <div className="col-span-1 pl-3">Total</div>
                </div>

                <ScrollArea className="h-72 w-full rounded-md border">
                  <div className="grid grid-cols-4">
                    {cardType === "buy"
                      ? buyOrders.map((res, index) => (
                          <div
                            className="col-span-4"
                            key={`moc_${cardType}_${index}`}
                          >
                            <div className="grid grid-cols-4 text-sm">
                              <div className="col-span-1 border-r-2 pl-3">
                                {parseFloat(res.price).toFixed(
                                  assetAData.precision
                                )}
                              </div>
                              <div className="col-span-1 border-r-2 pl-3">
                                {res.base}
                              </div>
                              <div className="col-span-1 border-r-2 pl-3">
                                {res.quote}
                              </div>
                              <div className="col-span-1 pl-3">
                                {buyOrders
                                  .slice(0, index + 1)
                                  .map((x) => parseFloat(x.base))
                                  .reduce((acc, curr) => acc + curr, 0)
                                  .toFixed(assetAData.precision)}
                              </div>
                              <div className="col-span-4">
                                <Separator />
                              </div>
                            </div>
                          </div>
                        ))
                      : sellOrders.map((res, index) => (
                          <div
                            className="col-span-4"
                            key={`moc_${cardType}_${index}`}
                          >
                            <div className="grid grid-cols-4 text-sm">
                              <div className="col-span-1 border-r-2 pl-3">
                                {parseFloat(res.price).toFixed(
                                  assetBData.precision
                                )}
                              </div>
                              <div className="col-span-1 border-r-2 pl-3">
                                {res.base}
                              </div>
                              <div className="col-span-1 border-r-2 pl-3">
                                {res.quote}
                              </div>
                              <div className="col-span-1 pl-3">
                                {sellOrders
                                  .slice(0, index + 1)
                                  .map((x) => parseFloat(x.base))
                                  .reduce((acc, curr) => acc + curr, 0)
                                  .toFixed(assetAData.precision)}
                              </div>
                              <div className="col-span-4">
                                <Separator />
                              </div>
                            </div>
                          </div>
                        ))}
                  </div>
                </ScrollArea>
              </>
            )}
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
      ) : null}
    </>
  );
}
