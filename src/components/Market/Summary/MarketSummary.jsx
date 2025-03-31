import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { ScrollArea } from "@/components/ui/scroll-area";
import { getTimeSince, trimPrice } from "@/lib/common";

export default function MarketSummary(properties) {
  const { type, publicMarketHistory, assetAData, assetBData } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const filteredMarketHistory = useMemo(() => {
    return publicMarketHistory.filter((x) => x.type === type);
  }, [publicMarketHistory, type]);

  const marketHistoryElements = useMemo(() => {
    return filteredMarketHistory.map((res, index) => {
      const splitValue = res.price.split(".");
      const parsedValue =
        assetAData && assetBData && splitValue.length > 1
          ? trimPrice(
              res.price,
              type === "buy" ? assetAData.precision : assetBData.precision
            )
          : res.price;

      return (
        <div className="col-span-4" key={`ms_${index}_${type}`}>
          <div className="grid grid-cols-4 text-sm">
            <div className="col-span-1 border-r-2 border-b-2 pl-3 text-right">
              {parsedValue}
            </div>
            <div className="col-span-1 border-r-2 border-b-2 pl-3 text-right">
              {parseFloat(res.amount).toFixed(assetAData.precision)}
            </div>
            <div className="col-span-1 border-r-2 border-b-2 pl-3 text-right">
              {getTimeSince(res.date)}
            </div>
            <div className="col-span-1 border-r-2 border-b-2 pl-3 text-right pr-1">
              {res.value}
            </div>
          </div>
        </div>
      );
    });
  }, [filteredMarketHistory, assetAData, assetBData, type]);

  return marketHistoryElements.length ? (
    <>
      <div className="grid grid-cols-4 pl-3 text-md">
        <div className="col-span-1">
          <div className="grid grid-cols-1">
            <div className="col-span-1 text-right">Price</div>
            <div className="col-span-1 text-sm text-right">
              {assetAData ? assetAData.symbol : "?"}/
              {assetBData ? assetBData.symbol : "?"}
            </div>
          </div>
        </div>
        <div className="col-span-1">
          <div className="grid grid-cols-1">
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1 text-sm text-right">
              {assetAData ? assetAData.symbol : "?"}
            </div>
          </div>
        </div>
        <div className="col-span-1">
          <div className="grid grid-cols-1">
            <div className="col-span-1 text-right">Date</div>
            <div className="col-span-1 text-sm text-right">
              Time since trade
            </div>
          </div>
        </div>
        <div className="col-span-1">
          <div className="grid grid-cols-1">
            <div className="col-span-1 text-right">Total value</div>
            <div className="col-span-1 text-sm text-right">
              {assetBData ? assetBData.symbol : "?"}
            </div>
          </div>
        </div>
      </div>
      <ScrollArea className="h-72 w-full rounded-md border">
        <div className="grid grid-cols-4">{marketHistoryElements}</div>
      </ScrollArea>
    </>
  ) : (
    t("MarketTradeContents:noMarketHistoryFound")
  );
  return;
}
