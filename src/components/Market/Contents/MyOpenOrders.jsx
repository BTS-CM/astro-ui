import MyOrderSummary from "../Summary/MyOrderSummary";

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

export default function MyOpenOrders(properties) {
  const {
    type,
    assetAData,
    assetBData,
    usrLimitOrders,
    usrHistory,
    marketHistoryInProgress,
    reset,
  } = properties;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === "buy" ? `My open buy orders` : `My open sell orders`}
        </CardTitle>
        <CardDescription>
          {type === "buy"
            ? `Your open buy limit orders for the market ${assetAData.symbol}/${assetBData.symbol}`
            : `Your open sell limit orders for the market ${assetAData.symbol}/${assetBData.symbol}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {(!usrLimitOrders || !usrLimitOrders.length) &&
        !marketHistoryInProgress ? (
          type === "buy" ? (
            <>No open buy orders found</>
          ) : (
            <>No open sell orders found</>
          )
        ) : null}
        {(!usrLimitOrders || !usrLimitOrders.length) &&
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
        {usrLimitOrders && usrLimitOrders.length && !marketHistoryInProgress ? (
          <MyOrderSummary
            type={type}
            assetAData={assetAData}
            assetBData={assetBData}
            usrLimitOrders={usrLimitOrders}
          />
        ) : null}
        {usrHistory &&
        !usrHistory.length &&
        !marketHistoryInProgress &&
        type === "buy"
          ? `You have no open buy orders in this market`
          : null}
        {usrHistory &&
        !usrHistory.length &&
        !marketHistoryInProgress &&
        type === "sell"
          ? `You have no open sell orders in this market`
          : null}
      </CardContent>
      <CardFooter>
        <Button onClick={reset}>Refresh open orders</Button>
      </CardFooter>
    </Card>
  );
}
