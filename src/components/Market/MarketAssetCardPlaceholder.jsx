import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import CardRowPlaceholder from "../common/CardRowPlaceholder.jsx";

export default function MarketAssetCard(properties) {
  const { type } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle>1.3.x</CardTitle>
        <CardDescription className="text-lg">
          {type === "buy" ? (
            <>
              <span>{t("MarketAssetCard:quoteAsset")}</span> -
              <span className="text-sm"> {t("MarketAssetCard:buying")}</span>
            </>
          ) : null}
          {type === "sell" ? (
            <>
              <span>{t("MarketAssetCard:baseAsset")}</span> -
              <span className="text-sm"> {t("MarketAssetCard:selling")}</span>
            </>
          ) : null}
          {type === "pool" ? <span>{t("MarketAssetCard:poolStakeAsset")}</span> : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm pb-2">
        <div className="grid grid-cols-3 gap-3 mb-3 w-full">
          <Button variant="outline" className="h-6">
            {t("MarketAssetCard:supply")}
          </Button>

          <Button variant="outline" className="h-6" style={{ marginLeft: "3px" }}>
            {t("MarketAssetCard:links")}
          </Button>

          <Button variant="outline" className="h-6" style={{ marginLeft: "3px" }}>
            {t("MarketAssetCard:json")}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-1 w-full">
          <CardRowPlaceholder title={t("MarketAssetCard:yourBalance")} dialogtitle={"balance"} />

          <CardRowPlaceholder title={t("MarketAssetCard:assetType")} dialogtitle={"assetType"} />

          <CardRowPlaceholder title={t("MarketAssetCard:issuer")} dialogtitle={"issuer"} />

          <CardRowPlaceholder title={t("MarketAssetCard:precision")} dialogtitle={"precision"} />
        </div>
      </CardContent>
    </Card>
  );
}
