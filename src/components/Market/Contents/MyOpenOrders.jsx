
import MyOrderSummary from "../Summary/MyOrderSummary";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button";
export default function MyOpenOrders(properties) {
    const {
        type,
        assetAData,
        assetBData,
        usrLimitOrders,
        usrHistory,
        marketHistoryInProgress,
        reset
    } = properties;

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {
                        type === "buy"
                            ? `My open buy orders`
                            : `My open sell orders`
                    }
                </CardTitle>
                <CardDescription>
                    {
                        type === "buy"
                            ? `Your open buy limit orders for the market ${assetAData.symbol}/${assetBData.symbol}`
                            : `Your open sell limit orders for the market ${assetAData.symbol}/${assetBData.symbol}`
                    }
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
                        ?   <MyOrderSummary
                                type={type}
                                assetAData={assetAData}
                                assetBData={assetBData}
                                usrLimitOrders={usrLimitOrders}
                            />
                        :   type === "buy"
                                ? `You have no open buy orders in this market`
                                : `You have no sell orders in this market`
                }
            </CardContent>
            <CardFooter>
                <Button
                    onClick={reset}
                >
                    Refresh open orders 
                </Button>
            </CardFooter>
        </Card>
    );
}