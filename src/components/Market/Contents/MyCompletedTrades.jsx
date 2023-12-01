import MyTradeSummary from "../Summary/MyTradeSummary";

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

export default function MyCompletedTrades(properties) {
  const { type, usrHistory, marketHistoryInProgress, reset, assetAData, assetBData } = properties;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === "buy"
            ? `Your recently completed buy orders`
            : `Your recently completed sell orders`}
        </CardTitle>
        <CardDescription>
          {type === "buy"
            ? `The table below lists your recently completed buy orders`
            : `The table below lists your recently completed sell orders`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {(!usrHistory || !usrHistory.length) && !marketHistoryInProgress ? (
          type === "buy" ? (
            <>No recently completed purchases found</>
          ) : (
            <>No recently completed sales found</>
          )
        ) : null}
        {usrHistory && usrHistory.length ? (
          <MyTradeSummary
            type={type}
            usrHistory={usrHistory}
            assetAData={assetAData}
            assetBData={assetBData}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
