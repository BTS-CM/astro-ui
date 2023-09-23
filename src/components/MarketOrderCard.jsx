import React, { useState, useEffect } from "react";
import { FixedSizeList as List } from 'react-window';

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { ScrollArea } from "@/components/ui/scroll-area"

import { humanReadableFloat } from '../lib/common';

export default function MarketOrderCard(properties) {
    const {
        cardType,
        assetA,
        assetAData,
        assetB,
        assetBData,
        buyOrders,
        sellOrders,
    } = properties;

    const Row = ({ index, style }) => {
        const res = cardType === "buy" ? buyOrders[index] : sellOrders[index];
        const data = cardType === "buy" ? assetAData : assetBData;
      
        return (
            <TableRow style={style}>
                <TableCell>{res.price}</TableCell>
                <TableCell>{res.base}</TableCell>
                <TableCell>{res.quote}</TableCell>
                <TableCell>{res.base * res.quote}</TableCell>
            </TableRow>
        )
    };

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
                                        } ({cardType === "buy" ? assetB : assetA})
                                    </div>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Price</TableHead>
                                            <TableHead>{cardType === "buy" ? "Buying" : "Selling"} {cardType === "buy" ? assetA : assetA}</TableHead>
                                            <TableHead>{cardType === "buy" ? "Selling" : "Buying"} {cardType === "buy" ? assetB : assetB}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                </Table>
                                <Table>
                                    <TableBody>
                                        <ScrollArea className="h-72 w-full rounded-md border">
                                            {
                                                cardType === "buy"
                                                    ? buyOrders.map((res, index) => (
                                                        <TableRow>
                                                            <TableCell className="w-1">{parseFloat(1 / res.price).toFixed(assetAData.precision)}</TableCell>
                                                            <TableCell className="w-1">{res.base}</TableCell>
                                                            <TableCell className="w-1">{res.quote}</TableCell>
                                                        </TableRow>
                                                    ))
                                                    : sellOrders.map((res, index) => (
                                                        <TableRow>
                                                            <TableCell className="w-1">{parseFloat(1 / res.price).toFixed(assetBData.precision)}</TableCell>
                                                            <TableCell className="w-1">{res.quote}</TableCell>
                                                            <TableCell className="w-1">{res.base}</TableCell>
                                                        </TableRow>
                                                    ))
                                            }
                                        </ScrollArea>
                                    </TableBody>
                                </Table>
                        </CardContent>
                    </Card>
                )
                : null
            }
        </>
    );
}