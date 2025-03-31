import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import MyTradeSummary from "../Summary/MyTradeSummary";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MyCompletedTrades(properties) {
  const {
    type,
    usrHistory,
    marketHistoryInProgress,
    reset,
    assetAData,
    assetBData,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === "buy"
            ? t("MyCompletedTrades:recentlyCompletedBuyOrdersTitle")
            : t("MyCompletedTrades:recentlyCompletedSellOrdersTitle")}
        </CardTitle>
        <CardDescription>
          {type === "buy"
            ? t("MyCompletedTrades:recentlyCompletedBuyOrdersDescription")
            : t("MyCompletedTrades:recentlyCompletedSellOrdersDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {marketHistoryInProgress ? <Skeleton count={5} /> : null}
        {(!usrHistory || !usrHistory.length) && !marketHistoryInProgress ? (
          type === "buy" ? (
            <>{t("MyCompletedTrades:noRecentlyCompletedPurchases")}</>
          ) : (
            <>{t("MyCompletedTrades:noRecentlyCompletedSales")}</>
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
