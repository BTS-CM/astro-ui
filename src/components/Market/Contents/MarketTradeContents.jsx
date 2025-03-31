import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
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
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === "buy"
            ? t("MarketTradeContents:recentlyCompletedBuyOrdersTitle")
            : t("MarketTradeContents:recentlyCompletedSellOrdersTitle")}
        </CardTitle>
        <CardDescription>
          {type === "buy"
            ? t("MarketTradeContents:recentlyCompletedBuyOrdersDescription")
            : t("MarketTradeContents:recentlyCompletedSellOrdersDescription")}
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
          t("MarketTradeContents:noMarketHistoryFound")
        )}
      </CardContent>
    </Card>
  );
}
