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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTimeSince, trimPrice } from "../../lib/common";

export default function MarketSummaryTabs(properties) {
    const {
        assetAData,
        assetBData,
        usr,
        marketItr,
        setMarketItr,
        usrLimitOrders,
        usrHistory,
        publicMarketHistory,
        _resetMarketData,
    } = properties;

    if (publicMarketHistory) {
        console.log({
            usrLimitOrders,
            usrHistory,
            publicMarketHistory
        })
    }

    const [marketHistoryInProgress, setMarketHistoryInProgress] = useState(false);
    useEffect(() => {
        if (publicMarketHistory) {
            setMarketHistoryInProgress(false);
        }
    }, [publicMarketHistory]);

    function ResetButton({}) {
        return (
            <Button
                onClick={() => {
                    _resetMarketData();
                    setMarketHistoryInProgress(true);
                    setMarketItr(marketItr + 1);
                }}>
                Refresh
            </Button>
        )
    }

    function MarketSummary({ type }) {
        const filteredMarketHistory = publicMarketHistory.filter(x => x.type === type);
        return (
          <>
            <div className="grid grid-cols-4 pl-3 text-md">
                <div className="col-span-1">
                    <div className="grid grid-cols-1">
                        <div className="col-span-1">
                            Price
                        </div>
                        <div className="col-span-1 text-sm">
                            {assetAData.symbol}/{assetBData.symbol}
                        </div>
                    </div>
                </div>
                <div className="col-span-1">
                    <div className="grid grid-cols-1">
                        <div className="col-span-1">
                            Amount
                        </div>
                        <div className="col-span-1 text-sm">
                            {assetAData.symbol}
                        </div>
                    </div>
                </div>
                <div className="col-span-1">
                    <div className="grid grid-cols-1">
                        <div className="col-span-1">
                            Date
                        </div>
                        <div className="col-span-1 text-sm">
                            Time since trade
                        </div>
                    </div>
                </div>
                <div className="col-span-1">
                    <div className="grid grid-cols-1">
                        <div className="col-span-1">
                            Total value
                        </div>
                        <div className="col-span-1 text-sm">
                            {assetBData.symbol}
                        </div>
                    </div>
                </div>
            </div>
            <ScrollArea className="h-72 w-full rounded-md border">
              <div className="grid grid-cols-4">
                {filteredMarketHistory.map((res, index) => {
                  const splitValue = res.price.split(".");
                  const parsedValue = splitValue.length > 1
                    ? trimPrice(
                        res.price,
                        type === "buy" ? assetAData.precision : assetBData.precision
                      )
                    : res.price;
                  return (
                    <div className="col-span-4" key={`ms_${index}_${type}`}>
                        <div className="grid grid-cols-4 text-sm">
                            <div className="col-span-1 border-r-2 border-b-2 pl-3">{parsedValue}</div>
                            <div className="col-span-1 border-r-2 border-b-2 pl-3">{res.amount}</div>
                            <div className="col-span-1 border-r-2 border-b-2 pl-3">{getTimeSince(res.date)}</div>
                            <div className="col-span-1 border-r-2 border-b-2 pl-3">{res.value}</div>
                        </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        );
    }

    function MyTradeSummary({ type }) {
        const filteredMarketHistory = usrHistory.filter(x => x.type === type);
        return (
          <>
            <div className="grid grid-cols-4">
              <div className="col-span-1 pl-3">Price</div>
              <div className="col-span-1 pl-3 text-md">Amount</div>
              <div className="col-span-1 pl-3">Date</div>
              <div className="col-span-1 pl-3">Total value</div>
            </div>
            <ScrollArea className="h-72 w-full rounded-md border">
              <div className="grid grid-cols-4">
                {filteredMarketHistory.map((res, index) => {
                  const splitValue = res.value.split(".");
                  const parsedValue = splitValue.length > 1
                    ? trimPrice(
                        res.price,
                        type === "buy" ? assetAData.precision : assetBData.precision
                      )
                    : res.price;
                  return (
                    <div className="col-span-4" key={`mts_${index}_${type}`}>
                        <div className="grid grid-cols-4 text-sm">
                            <div className="col-span-1 border-r-2 pl-3">{parsedValue}</div>
                            <div className="col-span-1 border-r-2 pl-3">{res.for_sale}</div>
                            <div className="col-span-1 border-r-2 pl-3">{getTimeSince(res.date)}</div>
                            <div className="col-span-1 border-r-2 pl-3">{res.value}</div>
                        </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        );
    }

    function MyOrderSummary({ type }) {
        const refAsset = type === "buy" ? assetAData : assetBData;
        const filteredUsrLimitOrders = usrLimitOrders.filter(x => limitOrder.sell_price.base.asset_id === refAsset.id);
        return (
          <>
            <div className="grid grid-cols-3">
              <div className="col-span-1 pl-3">Price</div>
              <div className="col-span-1 pl-3 text-md">Amount</div>
              <div className="col-span-1 pl-3">Date</div>
            </div>
            <ScrollArea className="h-72 w-full rounded-md border">
              <div className="grid grid-cols-3">
                {
                    filteredUsrLimitOrders.length
                    ? filteredUsrLimitOrders.map((res, index) => {
                            const splitValue = res.value.split(".");
                            const parsedValue = splitValue.length > 1
                                ? trimPrice(
                                    res.sell_price.base.amount/res.sell_price.quote.amount,
                                    type === "buy" ? assetAData.precision : assetBData.precision
                                )
                                : res.price;

                            return (
                                <div className="col-span-3" key={`mos_${index}_${type}`}>
                                    <div className="grid grid-cols-4 text-sm">
                                        <div className="col-span-1 border-r-2 pl-3">{parsedValue}</div>
                                        <div className="col-span-1 border-r-2 pl-3">{res.for_sale}</div>
                                        <div className="col-span-1 border-r-2 pl-3">{getTimeSince(res.date)}</div>
                                        <div className="col-span-1 border-r-2 pl-3">{res.value}</div>
                                    </div>
                                </div>
                            );
                        })
                    : <p>
                        {
                            type === "buy"
                                ? `You have no open buy orders in this market`
                                : `You have no sell orders in this market`
                        }
                    </p>
                }
              </div>
            </ScrollArea>
          </>
        );
    }

    function MarketTradeContents({ type }) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        {
                            type === "buy"
                                ? `Completed buy orders`
                                : `Completed sell orders`
                        }
                    </CardTitle>
                    <CardDescription>
                        {
                            type === "buy"
                                ? `Recently completed buy orders by entire network`
                                : `Recently completed sell orders by entire network`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {
                        (!publicMarketHistory || !publicMarketHistory.length) && !marketHistoryInProgress
                            ? type === "buy" ? <>No recently completed purchases found</> : <>No recently completed sales found</>
                            : null
                    }
                    {
                        (!publicMarketHistory || !publicMarketHistory.length) && marketHistoryInProgress
                            ? <>🌐 Fetching market history, please wait...</>
                            : null
                    }
                    {
                        publicMarketHistory && publicMarketHistory.length
                            ?   <MarketSummary type={type} />
                            :   null
                    }
                </CardContent>
                <CardFooter>
                    <ResetButton />
                </CardFooter>
            </Card>
        );
    }

    function MyTradeContents({ type }) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        {
                            type === "buy"
                                ? `Completed buy orders`
                                : `Completed sell orders`
                        }
                    </CardTitle>
                    <CardDescription>
                        {
                            type === "buy"
                                ? `Your recently completed buy orders`
                                : `Your recently completed sell orders`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {
                        (!usrHistory || !usrHistory.length) && !marketHistoryInProgress
                            ? type === "buy" ? <>No recently completed purchases found</> : <>No recently completed sales found</>
                            : null
                    }
                    {
                        (!usrHistory || !usrHistory.length) && marketHistoryInProgress
                            ? <>🌐 Fetching market history, please wait...</>
                            : null
                    }
                    {
                        usrHistory && usrHistory.length
                            ?   <MyTradeSummary type={type} />
                            :   null
                    }
                </CardContent>
                <CardFooter>
                    <ResetButton />
                </CardFooter>
            </Card>
        );
    }

    function MyLimitOrders ({type}) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>My open orders</CardTitle>
                    <CardDescription>
                        Your open limit orders for this market
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {
                        (!usrLimitOrders || !usrLimitOrders.length) && !marketHistoryInProgress
                            ? type === "buy" ? <>No open buy orders found</> : <>No open sell orders found</>
                            : null
                    }
                    {
                        (!usrLimitOrders || !usrLimitOrders.length) && marketHistoryInProgress
                            ? <>🌐 Fetching market history, please wait...</>
                            : null
                    }
                    {
                        usrHistory && usrHistory.length
                            ?   <MyOrderSummary type={type} />
                            :   type === "buy"
                                    ? `You have no open buy orders in this market`
                                    : `You have no sell orders in this market`
                    }
                </CardContent>
                <CardFooter>
                    <ResetButton />
                </CardFooter>
            </Card>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 mt-5">
                <Tabs defaultValue="marketTrades" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="marketTrades">Market trades</TabsTrigger>
                        <TabsTrigger value="usrHistory">Your trades</TabsTrigger>
                        <TabsTrigger value="usrLimitOrders">Your open orders</TabsTrigger>
                    </TabsList>
                    <TabsContent value="marketTrades">
                        <Tabs defaultValue="buy" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="buy">Buy orders</TabsTrigger>
                                <TabsTrigger value="sell">Sell orders</TabsTrigger>
                            </TabsList>
                            <TabsContent value="buy">
                                <MarketTradeContents type="buy" />
                            </TabsContent>
                            <TabsContent value="sell">
                                <MarketTradeContents type="sell" />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                    <TabsContent value="usrHistory">
                        <Tabs defaultValue="buy" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="buy">Your purchases</TabsTrigger>
                                <TabsTrigger value="sell">Your sales</TabsTrigger>
                            </TabsList>
                            <TabsContent value="buy">
                                <MyTradeContents type="buy" />
                            </TabsContent>
                            <TabsContent value="sell">
                                <MyTradeContents type="sell" />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                    <TabsContent value="usrLimitOrders">
                        <Tabs defaultValue="buy" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="buy">Buy orders</TabsTrigger>
                                <TabsTrigger value="sell">Sell orders</TabsTrigger>
                            </TabsList>
                            <TabsContent value="buy">
                                <MyLimitOrders type="buy" />
                            </TabsContent>
                            <TabsContent value="sell">
                                <MyLimitOrders type="sell" />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}