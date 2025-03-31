import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";

import MarketTradeContents from "./Contents/MarketTradeContents";
import MyOpenOrders from "./Contents/MyOpenOrders";
import MyCompletedTrades from "./Contents/MyCompletedTrades";

export default function MarketSummaryTabs(properties) {
  const {
    activeLimitCard,
    assetAData,
    assetBData,
    usr,
    marketItr,
    setMarketItr,
    usrLimitOrders,
    usrHistory,
    publicMarketHistory,
    _resetMarketData,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const [marketHistoryInProgress, setMarketHistoryInProgress] = useState(false);
  useEffect(() => {
    if (publicMarketHistory) {
      setMarketHistoryInProgress(false);
    }
  }, [publicMarketHistory]);

  return (
    <>
      <div className="grid grid-cols-1 mt-5 gap-5">
        <div className="grid grid-cols-2 gap-5">
          <MarketTradeContents
            type="buy"
            publicMarketHistory={publicMarketHistory}
            marketHistoryInProgress={marketHistoryInProgress}
            reset={() => {
              _resetMarketData();
              setMarketHistoryInProgress(true);
              setMarketItr(marketItr + 1);
            }}
            assetAData={assetAData}
            assetBData={assetBData}
          />
          <MarketTradeContents
            type="sell"
            publicMarketHistory={publicMarketHistory}
            marketHistoryInProgress={marketHistoryInProgress}
            reset={() => {
              _resetMarketData();
              setMarketHistoryInProgress(true);
              setMarketItr(marketItr + 1);
            }}
            assetAData={assetAData}
            assetBData={assetBData}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <MyOpenOrders
            type="buy"
            assetAData={assetAData}
            assetBData={assetBData}
            usrLimitOrders={usrLimitOrders}
            usrHistory={usrHistory}
            marketHistoryInProgress={marketHistoryInProgress}
            reset={() => {
              _resetMarketData();
              setMarketHistoryInProgress(true);
              setMarketItr(marketItr + 1);
            }}
          />

          <MyOpenOrders
            type="sell"
            assetAData={assetAData}
            assetBData={assetBData}
            usrLimitOrders={usrLimitOrders}
            usrHistory={usrHistory}
            marketHistoryInProgress={marketHistoryInProgress}
            reset={() => {
              _resetMarketData();
              setMarketHistoryInProgress(true);
              setMarketItr(marketItr + 1);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <MyCompletedTrades
            type="buy"
            assetAData={assetAData}
            assetBData={assetBData}
            usrHistory={usrHistory}
            marketHistoryInProgress={marketHistoryInProgress}
            reset={() => {
              _resetMarketData();
              setMarketHistoryInProgress(true);
              setMarketItr(marketItr + 1);
            }}
          />
          <MyCompletedTrades
            type="sell"
            assetAData={assetAData}
            assetBData={assetBData}
            usrHistory={usrHistory}
            marketHistoryInProgress={marketHistoryInProgress}
            reset={() => {
              _resetMarketData();
              setMarketHistoryInProgress(true);
              setMarketItr(marketItr + 1);
            }}
          />
        </div>
      </div>
    </>
  );
}
