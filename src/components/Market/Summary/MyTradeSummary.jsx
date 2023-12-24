import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { ScrollArea } from "@/components/ui/scroll-area";
import { getTimeSince, trimPrice, humanReadableFloat, isInvertedMarket } from "../../../lib/common";

export default function MyTradeSummary(properties) {
  const { type, usrHistory, assetAData, assetBData } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const filteredMarketHistory = useMemo(() => {
    if (!usrHistory) {
      return [];
    }

    const filteredUsrHistory = usrHistory.filter((x) => {
      if (type === "buy") {
        return (
          x.op[1].pays.asset_id === assetBData.id && x.op[1].receives.asset_id === assetAData.id
        );
      } else {
        return (
          x.op[1].pays.asset_id === assetAData.id && x.op[1].receives.asset_id === assetBData.id
        );
      }
    }); /*
      .map((x) => {
        
        const isFillPriceInverted = isInvertedMarket(
          x.op[1].fill_price.quote.asset_id,
          x.op[1].fill_price.base.asset_id
        );
        const isPayReceivesInverted = isInvertedMarket(
          x.op[1].pays.asset_id,
          x.op[1].receives.asset_id
        );
        

        return x;
      });*/

    return filteredUsrHistory.map((res) => {
      const parsedBaseAmount = humanReadableFloat(
        res.op[1].fill_price.base.amount,
        [assetAData, assetBData].find((x) => x.id === res.op[1].fill_price.base.asset_id)?.precision
      );

      const parsedQuoteAmount = humanReadableFloat(
        res.op[1].fill_price.quote.amount,
        [assetAData, assetBData].find((x) => x.id === res.op[1].receives.asset_id)?.precision
      );

      const calculated = (parsedQuoteAmount / parsedBaseAmount).toFixed(assetBData.precision);

      return {
        price: calculated,
        baseAmount: parsedBaseAmount,
        quoteAmount: parsedQuoteAmount,
        date: res.block_time,
        operation: res.op[1],
      };
    });
  }, [usrHistory, assetAData, assetBData, type]);

  return (
    <>
      <div className="grid grid-cols-4">
        <div className="col-span-1 pl-3">{t("MyTradeSummary:priceColumnTitle")}</div>
        <div className="col-span-1 pl-3 text-md">
          {type === "buy" ? assetAData.symbol : assetBData.symbol}
        </div>
        <div className="col-span-1 pl-3 text-md">
          {type === "buy" ? assetBData.symbol : assetAData.symbol}
        </div>
        <div className="col-span-1 pl-3">{t("MyTradeSummary:dateColumnTitle")}</div>
      </div>
      <ScrollArea className="h-72 w-full rounded-md border">
        <div className="grid grid-cols-4">
          {filteredMarketHistory.map((res, index) => {
            return (
              <div className="col-span-4" key={`mts_${index}_${type}`}>
                <div className="grid grid-cols-4 text-sm">
                  <div className="col-span-1 border-r-2 pl-3">{res.price}</div>
                  <div className="col-span-1 border-r-2 pl-3">
                    {type === "buy" ? res.baseAmount : res.quoteAmount}
                  </div>
                  <div className="col-span-1 border-r-2 pl-3">
                    {type === "buy" ? res.quoteAmount : res.baseAmount}
                  </div>
                  <div className="col-span-1 border-r-2 pl-3">{getTimeSince(res.date)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </>
  );
}
