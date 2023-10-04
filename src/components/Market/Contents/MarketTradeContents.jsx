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
  const {
    type,
    publicMarketHistory,
    marketHistoryInProgress,
    reset,
    assetAData,
    assetBData,
  } = properties;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === "buy" ? `Completed buy orders` : `Completed sell orders`}
        </CardTitle>
        <CardDescription>
          {type === "buy"
            ? `Recently completed buy orders on the Bitshares DEX`
            : `Recently completed sell orders on the Bitshares DEX`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {(!publicMarketHistory || !publicMarketHistory.length) &&
        !marketHistoryInProgress ? (
          type === "buy" ? (
            <>No recently completed purchases found</>
          ) : (
            <>No recently completed sales found</>
          )
        ) : null}
        {(!publicMarketHistory || !publicMarketHistory.length) &&
        marketHistoryInProgress ? (
          <>
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
          </>
        ) : null}
        {publicMarketHistory && publicMarketHistory.length ? (
          <MarketSummary
            type={type}
            publicMarketHistory={publicMarketHistory}
            assetAData={assetAData}
            assetBData={assetBData}
          />
        ) : null}
      </CardContent>
      <CardFooter>
        <Button onClick={reset}>Refresh market trades</Button>
      </CardFooter>
    </Card>
  );
}
