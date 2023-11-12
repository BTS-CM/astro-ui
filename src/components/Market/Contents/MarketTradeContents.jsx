import MarketSummary from "../Summary/MarketSummary";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketTradeContents(properties) {
  const { type, publicMarketHistory, marketHistoryInProgress, reset, assetAData, assetBData } =
    properties;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type === "buy" ? `Completed buy orders` : `Completed sell orders`}</CardTitle>
        <CardDescription>
          {type === "buy"
            ? `Recently completed buy orders on the Bitshares DEX`
            : `Recently completed sell orders on the Bitshares DEX`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {marketHistoryInProgress ? <Skeleton count={5} /> : null}
        {publicMarketHistory && publicMarketHistory.length ? (
          <MarketSummary
            type={type}
            publicMarketHistory={publicMarketHistory}
            assetAData={assetAData}
            assetBData={assetBData}
          />
        ) : (
          "No market history found"
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={reset}>Refresh market trades</Button>
      </CardFooter>
    </Card>
  );
}
