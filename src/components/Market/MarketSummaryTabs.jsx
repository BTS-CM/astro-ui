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

  const [activeTab, setActiveTab] = useState("marketTrades");
  const [activeMarketTradesTab, setActiveMarketTradesTab] = useState("buy");
  const [activeUsrHistoryTab, setActiveUsrHistoryTab] = useState("buy");
  const [activeUsrLimitOrdersTab, setActiveUsrLimitOrdersTab] = useState("buy");

  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

  return (
    <>
      <div className="grid grid-cols-1 mt-5">
        <Tabs defaultValue="marketTrades" className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-2">
            {activeTab === "marketTrades" ? (
              <TabsTrigger value="marketTrades" style={activeTabStyle}>
                {t("MarketSummaryTabs:marketTradesTabTitle")}
              </TabsTrigger>
            ) : (
              <TabsTrigger value="marketTrades" onClick={() => setActiveTab("marketTrades")}>
                {t("MarketSummaryTabs:marketTradesTabTitle")}
              </TabsTrigger>
            )}
            {activeTab === "usrLimitOrders" ? (
              <TabsTrigger value="usrLimitOrders" style={activeTabStyle}>
                {t("MarketSummaryTabs:yourOpenOrdersTabTitle")}
              </TabsTrigger>
            ) : (
              <TabsTrigger value="usrLimitOrders" onClick={() => setActiveTab("usrLimitOrders")}>
                {t("MarketSummaryTabs:yourOpenOrdersTabTitle")}
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="marketTrades">
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="grid w-full grid-cols-2 gap-2">
                {activeMarketTradesTab === "buy" ? (
                  <TabsTrigger value="buy" style={activeTabStyle}>
                    {t("MarketSummaryTabs:buyOrdersTabTitle")}
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="buy" onClick={() => setActiveMarketTradesTab("buy")}>
                    {t("MarketSummaryTabs:buyOrdersTabTitle")}
                  </TabsTrigger>
                )}
                {activeMarketTradesTab === "sell" ? (
                  <TabsTrigger value="sell" style={activeTabStyle}>
                    {t("MarketSummaryTabs:sellOrdersTabTitle")}
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="sell" onClick={() => setActiveMarketTradesTab("sell")}>
                    {t("MarketSummaryTabs:sellOrdersTabTitle")}
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="buy">
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
              </TabsContent>
              <TabsContent value="sell">
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
              </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="usrHistory">
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="grid w-full grid-cols-2 gap-2">
                {activeUsrHistoryTab === "buy" ? (
                  <TabsTrigger value="buy" style={activeTabStyle}>
                    {t("MarketSummaryTabs:buyOrdersTabTitle")}
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="buy" onClick={() => setActiveUsrHistoryTab("buy")}>
                    {t("MarketSummaryTabs:buyOrdersTabTitle")}
                  </TabsTrigger>
                )}
                {activeUsrHistoryTab === "sell" ? (
                  <TabsTrigger value="sell" style={activeTabStyle}>
                    {t("MarketSummaryTabs:sellOrdersTabTitle")}
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="sell" onClick={() => setActiveUsrHistoryTab("sell")}>
                    {t("MarketSummaryTabs:sellOrdersTabTitle")}
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="buy">
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
              </TabsContent>
              <TabsContent value="sell">
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
              </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="usrLimitOrders">
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="grid w-full grid-cols-2 gap-2">
                {activeUsrLimitOrdersTab === "buy" ? (
                  <TabsTrigger value="buy" style={activeTabStyle}>
                    {t("MarketSummaryTabs:yourBuyOrdersTabTitle")}
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="buy" onClick={() => setActiveUsrLimitOrdersTab("buy")}>
                    {t("MarketSummaryTabs:yourBuyOrdersTabTitle")}
                  </TabsTrigger>
                )}
                {activeUsrLimitOrdersTab === "sell" ? (
                  <TabsTrigger value="sell" style={activeTabStyle}>
                    {t("MarketSummaryTabs:yourSellOrdersTabTitle")}
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="sell" onClick={() => setActiveUsrLimitOrdersTab("sell")}>
                    {t("MarketSummaryTabs:yourSellOrdersTabTitle")}
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="buy">
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
              </TabsContent>
              <TabsContent value="sell">
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
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
