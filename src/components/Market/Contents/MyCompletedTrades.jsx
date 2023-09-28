import MyTradeSummary from "../Summary/MyTradeSummary";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button";

export default function MyCompletedTrades(properties) {
    const {
        type,
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
                        ?   <MyTradeSummary
                                type={type}
                                usrHistory={usrHistory}
                                assetAData={assetAData}
                                assetBData={assetBData}
                            />
                        :   null
                }
            </CardContent>
            <CardFooter>
                <Button
                    onClick={reset}
                >
                    Refresh my open orders
                </Button>
            </CardFooter>
        </Card>
    );
}