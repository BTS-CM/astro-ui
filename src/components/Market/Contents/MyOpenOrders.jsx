import React, { useMemo } from "react";
import MyOrderSummary from "../Summary/MyOrderSummary";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  const relevantOpenOrders = useMemo(() => {
    if (usrLimitOrders && usrLimitOrders.length) {
      return type === "buy"
        ? usrLimitOrders.filter((order) => order.sell_price.quote.asset_id === assetBData.id)
        : usrLimitOrders.filter((order) => order.sell_price.quote.asset_id === assetAData.id);
    }
    return !!usrLimitOrders ? [] : null;
  }, [usrLimitOrders, type, assetAData, assetBData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type === "buy" ? `My open buy orders` : `My open sell orders`}</CardTitle>
        <CardDescription>
          {type === "buy"
            ? `Your open buy limit orders for the market ${assetAData.symbol}/${assetBData.symbol}`
            : `Your open sell limit orders for the market ${assetAData.symbol}/${assetBData.symbol}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {relevantOpenOrders && !marketHistoryInProgress ? (
          <MyOrderSummary
            type={type}
            assetAData={assetAData}
            assetBData={assetBData}
            usrLimitOrders={relevantOpenOrders}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
