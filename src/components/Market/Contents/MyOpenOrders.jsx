import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import MyOrderSummary from "@/Summary/MyOrderSummary";

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
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

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
        <CardTitle>
          {type === "buy"
            ? t("MyOpenOrders:openBuyOrdersTitle")
            : t("MyOpenOrders:openSellOrdersTitle")}
        </CardTitle>
        <CardDescription>
          {type === "buy"
            ? t("MyOpenOrders:openBuyOrdersDescription", {
                assetA: assetAData.symbol,
                assetB: assetBData.symbol,
              })
            : t("MyOpenOrders:openSellOrdersDescription", {
                assetA: assetAData.symbol,
                assetB: assetBData.symbol,
              })}
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
