import React, { useState, useEffect } from "react";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator";

import { humanReadableFloat } from '../../lib/common';

export default function MarketOrderCard(properties) {
    const {
        cardType,
        assetA,
        assetAData,
        assetB,
        assetBData,
        buyOrders,
        sellOrders,
        orderBookItr,
        setOrderBookItr,
        _resetOrders,
    } = properties;

    return (
        <>
            {
              (cardType === "buy" && !buyOrders) || (cardType === "sell" && !sellOrders)
                ? <Card>
                    <CardHeader>
                        <CardTitle>Loading market orders</CardTitle>
                        <CardDescription>Please wait...</CardDescription>
                    </CardHeader>
                  </Card>
                : null
            }
            {
                cardType === "buy" && buyOrders || cardType === "sell" && sellOrders
                ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <div className="grid grid-cols-2">
                                    <div>
                                        {cardType === "buy" ? "Buy" : "Sell"} orders
                                    </div>
                                    <div className="text-right">
                                        Market depth: {
                                            cardType === "buy"
                                                ? buyOrders.map(x => parseFloat(x.quote)).reduce((acc, curr) => (acc + curr), 0).toFixed(assetBData.precision)
                                                : sellOrders.map(x => parseFloat(x.quote)).reduce((acc, curr) => (acc + curr), 0).toFixed(assetAData.precision)
                                        } ({cardType === "buy" ? assetBData.symbol : assetAData.symbol})
                                    </div>
                                </div>
                            </CardTitle>
                            <CardDescription>
                                {
                                    cardType === "buy"
                                        ? `The following table displays network offers to purchase ${assetA} with ${assetB}`
                                        : `The following table displays network offers to sell ${assetA} for ${assetB}`
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {
                                cardType === "buy" && !buyOrders.length || cardType === "sell" && !sellOrders.length
                                    ? <>No {cardType === "buy" ? "buy" : "sell"} limit orders found</>
                                    : <>
                                        <div className="grid grid-cols-4">
                                            <div className="col-span-1 pl-3">
                                                Price
                                            </div>
                                            <div className="col-span-1 pl-3 text-md">
                                                {cardType === "buy" ? "Buying" : "Selling"}
                                            </div>
                                            <div className="col-span-1 pl-3">
                                                {cardType === "buy" ? "Selling" : "Buying"}
                                            </div>
                                            <div className="col-span-1 pl-3">
                                                Total
                                            </div>
                                        </div>

                                        <ScrollArea className="h-72 w-full rounded-md border">
                                            <div className="grid grid-cols-4">
                                                {
                                                    cardType === "buy"
                                                        ? buyOrders.map((res, index) => (
                                                            <div className="col-span-4" key={`moc_${cardType}_${index}`}>
                                                                <div className="grid grid-cols-4 text-sm">
                                                                    <div className="col-span-1 border-r-2 pl-3">
                                                                        {parseFloat(1 / res.price).toFixed(assetAData.precision)}
                                                                    </div>
                                                                    <div className="col-span-1 border-r-2 pl-3">
                                                                        {res.base}
                                                                    </div>
                                                                    <div className="col-span-1 border-r-2 pl-3">
                                                                        {res.quote}
                                                                    </div>
                                                                    <div className="col-span-1 pl-3">
                                                                        {
                                                                            buyOrders
                                                                                .slice(0, index + 1)
                                                                                .map(x => parseFloat(x.base))
                                                                                .reduce((acc, curr) => (acc + curr), 0)
                                                                                .toFixed(assetAData.precision)
                                                                        }
                                                                    </div>
                                                                    <div className="col-span-4">
                                                                        <Separator />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                        : sellOrders.map((res, index) => (
                                                            <div className="col-span-4" key={`moc_${cardType}_${index}`}>
                                                                <div className="grid grid-cols-4 text-sm">
                                                                    <div className="col-span-1 border-r-2 pl-3">
                                                                        {parseFloat(1 / res.price).toFixed(assetBData.precision)}
                                                                    </div>
                                                                    <div className="col-span-1 border-r-2 pl-3">
                                                                        {res.base}
                                                                    </div>
                                                                    <div className="col-span-1 border-r-2 pl-3">
                                                                        {res.quote}
                                                                    </div>
                                                                    <div className="col-span-1 pl-3">
                                                                        {
                                                                            sellOrders
                                                                                .slice(0, index + 1)
                                                                                .map(x => parseFloat(x.base))
                                                                                .reduce((acc, curr) => (acc + curr), 0)
                                                                                .toFixed(assetAData.precision)
                                                                        }
                                                                    </div>
                                                                    <div className="col-span-4">
                                                                        <Separator />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                }
                                            </div>
                                        </ScrollArea>
                                    </>
                            }
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
                )
                : null
            }
        </>
    );
}