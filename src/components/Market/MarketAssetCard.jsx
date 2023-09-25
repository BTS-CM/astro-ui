import React, { useState, useEffect } from "react";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
  
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { humanReadableFloat } from '../../lib/common';

export default function MarketAssetCard(properties) {
    const {
        asset,
        assetData,
        assetDetails,
        marketSearch,
        chain,
        usrBalances,
        type,
    } = properties;

    const [assetBalance, setAssetBalance] = useState(0);
    useEffect(() => {
        if (assetData && usrBalances) {
            const id = assetData.id;
            const foundBalance = usrBalances.find(x => x.asset_id === id);
            if (foundBalance) {
                const balance = humanReadableFloat(foundBalance.amount, assetData.precision)
                                .toLocaleString(
                                    undefined,
                                    {minimumFractionDigits: assetData.precision}
                                );
                setAssetBalance(balance);
            }
        }
    }, [assetData, usrBalances]);
    
    // {type === "buy" ? "🟢" : "🔴"}

    return (
        <HoverCard>
            <HoverCardTrigger asChild style={{ position: 'relative' }}>
                <Card>
                    <CardHeader>
                        <CardTitle>
                            <div className="mb-2">
                                <div className="grid grid-cols-2 gap-5 w-full">
                                    <div className="col-span-1">
                                        {asset} {assetData ? `(${assetData.id})` : ''}
                                    </div>
                                    <div className="col-span-1 text-right">
                                        {type === "buy" ? "Base" : "Quote"} asset
                                    </div>
                                </div>
                            </div>
                        </CardTitle>
                        <CardDescription>
                            {
                            !assetDetails
                                ? "Please wait..."
                                : null
                            }
                            {
                            assetDetails && assetData && marketSearch
                                ? (
                                    <>
                                        <div className="grid grid-cols-1 gap-1 w-full">
                                            <div className="col-span-1">
                                                Your balance:
                                                <Badge variant="outline" className="ml-2">
                                                    {assetBalance} {asset}
                                                </Badge>
                                            </div>
                                            <div className="col-span-1">
                                                Issuer:
                                                <Badge variant="outline" className="ml-2">
                                                    {marketSearch.find(x => x.id === assetData.id).u}
                                                </Badge>
                                            </div>
                                            <div className="col-span-1">
                                                Market fee:
                                                <Badge variant="outline" className="ml-2">
                                                    {assetData.market_fee_percent/100} %
                                                </Badge>
                                            </div>
                                            <div className="col-span-1">
                                                Precision:
                                                <Badge variant="outline" className="ml-2">
                                                    {assetData.precision}
                                                </Badge>
                                            </div>
                                        </div>
                                    </>
                                )
                                : null
                            }
                        </CardDescription>
                    </CardHeader>
                </Card>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm" style={{ position: 'absolute', top: '100%', marginLeft: '-160px' }}>
                <b>
                    {asset} supply info
                </b><br/>
                {
                    assetDetails && assetData
                        ? humanReadableFloat(assetDetails.current_supply, assetData.precision)
                            .toLocaleString(
                                undefined,
                                {minimumFractionDigits: assetData.precision}
                            )
                        : '???'
                } {asset} in total circulation<br/>
                
                {
                    assetDetails && assetData
                        ? humanReadableFloat(assetData.max_supply, assetData.precision)
                            .toLocaleString(
                                undefined,
                                {minimumFractionDigits: assetData.precision}
                            )
                        : '???'
                } maximum supply<br/>
                {
                    assetDetails && assetData
                        ? humanReadableFloat(assetDetails.confidential_supply, assetData.precision)
                        : '???'
                } {asset} in confidential supply<br/>

                <div className="grid grid-cols-2 gap-5 w-full mt-3">
                    <a
                        target="_blank"
                        href={
                            chain === "bitshares"
                            ? `https://blocksights.info/#/assets/${asset}`
                            : `https://blocksights.info/#/assets/${asset}?network=testnet`
                        }
                    >
                    <Button variant="outline" className="w-full">
                        🔗 Explore
                    </Button>
                    </a>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">📄 View JSON</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] bg-white">
                            <DialogHeader>
                                <DialogTitle>{asset} JSON summary data</DialogTitle>
                                <DialogDescription>
                                    The data used for generating {asset} limit orders.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1">
                                <div className="col-span-1">
                                <ScrollArea className="h-72 rounded-md border">
                                    <pre>
                                    {
                                        JSON.stringify(
                                            {assetData, assetDetails},
                                            null,
                                            2
                                        )
                                    }
                                    </pre>
                                </ScrollArea>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

            </HoverCardContent>
        </HoverCard>
    )
}