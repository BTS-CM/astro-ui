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
        <CardTitle>
          {type === "buy"
            ? `Recently completed market buy orders`
            : `Recently completed market sell orders`}
        </CardTitle>
        <CardDescription>
          {type === "buy"
            ? `The table below lists recently completed buy orders on the Bitshares DEX`
            : `The table below lists recently completed sell orders on the Bitshares DEX`}
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
    </Card>
  );
}
