import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useStore } from "@nanostores/react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { trimPrice, isInvertedMarket } from "@/lib/common";
import { createMarketTradeHistoryStore } from "@/nanoeffects/MarketTradeHistory.ts";
import { createMarketOrderStore } from "@/nanoeffects/MarketOrderBook.ts";

import LimitOrderCard from "./Market/LimitOrderCard.jsx";
import MarketOrderCard from "./Market/MarketOrderCard.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import MarketSummaryTabs from "./Market/MarketSummaryTabs.jsx";
import PoolDialogs from "./Market/PoolDialogs.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

export default function Market(properties) {
  const {
    usr,
    assetA,
    assetB,
    assetAData,
    assetADetails,
    assetABitassetData,
    assetBData,
    assetBDetails,
    assetBBitassetData,
    limitOrderFee,
    //
    setAssetA,
    setAssetB,
    //
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _poolsBTS,
    _poolsTEST,
    //
    balances,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);
  // End of init

  const [buyOrders, setBuyOrders] = useState(null);
  const [sellOrders, setSellOrders] = useState(null);

  const [previousBuyOrders, setPreviousBuyOrders] = useState([]);
  const [previousSellOrders, setPreviousSellOrders] = useState([]);

  const [usrBalances, setUsrBalances] = useState(null);
  const [usrLimitOrders, setUsrLimitOrders] = useState(null);
  const [publicMarketHistory, setPublicMarketHistory] = useState(null);
  const [usrHistory, setUsrHistory] = useState(null);
  const [tickerData, setTickerData] = useState(null);

  const [marketItr, setMarketItr] = useState(0);
  const [orderBookItr, setOrderBookItr] = useState(0);

  // style states
  const [activeLimitCard, setActiveLimitCard] = useState("buy");
  const [activeMOC, setActiveMOC] = useState("buy");

  const invertedMarket = useMemo(() => {
    return isInvertedMarket(assetAData.id, assetBData.id);
  }, [assetAData, assetBData]);

  useEffect(() => {
    async function parseURL() {
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const _type = params.type;

      let finalType = activeLimitCard;
      if (_type === "buy" || _type === "sell") {
        finalType = _type;
      }

      return {
        finalType,
      };
    }

    parseURL().then(({ finalType }) => {
      if (finalType !== activeLimitCard) {
        setActiveLimitCard(finalType);
      }
    });
  }, []);

  function _resetOrders() {
    setBuyOrders(null);
    setSellOrders(null);
  }

  function _resetMarketData() {
    // If either asset changes then several states need to be erased
    setUsrBalances(null);
    setUsrLimitOrders(null);
    setPublicMarketHistory(null);
    setUsrHistory(null);
    setTickerData(null);
  }

  const marketOrdersStore = useMemo(() => {
    return createMarketOrderStore([usr.chain, assetA, assetB, 50]);
  }, [usr, assetA, assetB, orderBookItr]);

  const {
    data: marketOrdersData,
    loading: marketOrdersLoading,
    error: marketOrdersError,
  } = useStore(marketOrdersStore);

  useEffect(() => {
    if (marketOrdersData && !marketOrdersLoading && !marketOrdersError) {
      setBuyOrders(marketOrdersData.bids);
      setSellOrders(marketOrdersData.asks);
      setPreviousBuyOrders(marketOrdersData.bids);
      setPreviousSellOrders(marketOrdersData.asks);
    } else {
      setBuyOrders(null);
      setSellOrders(null);
    }
  }, [marketOrdersData, marketOrdersLoading, marketOrdersError]);

  // Use the store
  const marketHistoryStore = useMemo(() => {
    return createMarketTradeHistoryStore([
      usr.chain,
      assetAData.id,
      assetBData.id,
      usr.id,
    ]);
  }, [usr, assetAData, assetBData, marketItr]);

  const {
    data: marketHistoryData,
    loading: marketHistoryLoading,
    error: marketHistoryError,
  } = useStore(marketHistoryStore);

  useEffect(() => {
    if (marketHistoryData && !marketHistoryLoading && !marketHistoryError) {
      setUsrBalances(marketHistoryData.balances);
      setUsrLimitOrders(marketHistoryData.accountLimitOrders);
      setPublicMarketHistory(marketHistoryData.marketHistory);
      setUsrHistory(marketHistoryData.usrTrades);
      setTickerData(marketHistoryData.ticker);
    } else {
      setUsrBalances(null);
      setUsrLimitOrders(null);
      setPublicMarketHistory(null);
      setUsrHistory(null);
      setTickerData(null);
    }
  }, [marketHistoryData, marketHistoryLoading, marketHistoryError]);

  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

  const [clicked, setClicked] = useState(false);

  const marketHoverCard = (
    <HoverCard>
      <HoverCardTrigger asChild style={{ position: "relative" }}>
        <Card>
          <CardHeader className="pt-4 pb-2">
            <CardTitle>{t("Market:marketSummary")}</CardTitle>
            <CardDescription className="text-lg">
              {activeLimitCard === "buy" ? `${assetA}/${assetB}` : null}
              {activeLimitCard === "sell" ? `${assetB}/${assetA}` : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm pb-4">
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-5">
                <div className="col-span-2">{t("Market:latestPrice")}</div>
                <div className="col-span-3">
                  <Badge variant="outline" className="ml-2 mb-1">
                    {tickerData && assetAData
                      ? trimPrice(tickerData.latest, assetAData.precision)
                      : "?"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-5">
                <div className="col-span-2">{t("Market:24HrChange")}</div>
                <div className="col-span-3">
                  <Badge variant="outline" className="ml-2 mb-1">
                    {tickerData ? tickerData.percent_change : "?"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-5">
                <div className="col-span-2">{t("Market:24HrBaseVolume")}</div>
                <div className="col-span-3">
                  <Badge variant="outline" className="ml-2 mb-1">
                    {!tickerData ? "?" : null}
                    {activeLimitCard === "buy" && tickerData
                      ? tickerData.base_volume
                      : null}
                    {activeLimitCard === "sell" && tickerData
                      ? tickerData.quote_volume
                      : null}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-5">
                <div className="col-span-2">{t("Market:24HrQuoteVolume")}</div>
                <div className="col-span-3">
                  <Badge variant="outline" className="ml-2 mb-1">
                    {!tickerData ? "?" : null}
                    {activeLimitCard === "buy" && tickerData
                      ? tickerData.quote_volume
                      : null}
                    {activeLimitCard === "sell" && tickerData
                      ? tickerData.base_volume
                      : null}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-5">
                <div className="col-span-2">{t("Market:lowestAsk")}</div>
                <div className="col-span-3">
                  <Badge variant="outline" className="ml-2 mb-1">
                    {tickerData && assetAData
                      ? trimPrice(tickerData.lowest_ask, assetAData.precision)
                      : "?"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-5">
                <div className="col-span-2">{t("Market:highestBid")}</div>
                <div className="col-span-3">
                  <Badge variant="outline" className="ml-2">
                    {tickerData && assetAData
                      ? trimPrice(tickerData.highest_bid, assetAData.precision)
                      : "?"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm text-center">
        <b>
          {assetA}/{assetB} {t("Market:externalMarketLinks")}
        </b>
        <br />
        <ExternalLink
          variant="outline"
          classnamecontents="mb-2 mt-2"
          type="button"
          text={t("Market:blocksightsMarketExplorer")}
          hyperlink={
            usr.chain === "bitshares"
              ? `https://blocksights.info/#/markets/${
                  activeLimitCard === "buy" ? assetA : assetB
                }/${activeLimitCard === "buy" ? assetB : assetA}`
              : `https://blocksights.info/#/markets/${
                  activeLimitCard === "buy" ? assetA : assetB
                }/${
                  activeLimitCard === "buy" ? assetB : assetA
                }?network=testnet`
          }
        />
        {usr.chain === "bitshares" ? (
          <>
            <ExternalLink
              variant="outline"
              classnamecontents="ml-2"
              type="button"
              text={`🔗 BTS.Exchange`}
              hyperlink={
                activeLimitCard === "buy"
                  ? `https://bts.exchange/#/market/${assetA}_${assetB}?r=nftprofessional1`
                  : `https://bts.exchange/#/market/${assetB}_${assetA}?r=nftprofessional1`
              }
            />
            <ExternalLink
              variant="outline"
              classnamecontents="ml-2 mt-2"
              type="button"
              text={`🔗 XBTS`}
              hyperlink={
                activeLimitCard === "buy"
                  ? `https://ex.xbts.io/market/${assetA}_${assetB}?r=nftprofessional1`
                  : `https://ex.xbts.io/market/${assetB}_${assetA}?r=nftprofessional1`
              }
            />
          </>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-1">
            <div className="flex-grow mb-2">
              <Card>
                <CardHeader className="pt-2 pb-2">
                  <CardTitle className="text-lg">
                    {usr.chain === "bitshares"
                      ? "Bitshares "
                      : "Bitshares (Testnet) "}
                    {t("Market:controls")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-3 gap-1">
                    <AssetDropDown
                      assetSymbol={assetA}
                      assetData={assetAData}
                      storeCallback={setAssetA}
                      otherAsset={assetB}
                      marketSearch={marketSearch}
                      type={activeLimitCard === "buy" ? "quote" : "base"}
                      size="small"
                      chain={usr.chain}
                      balances={balances}
                    />

                    <a
                      style={{ lineHeight: 1 }}
                      href={`/dex/index.html?market=${assetB}_${assetA}`}
                      onClick={() => setClicked(true)}
                    >
                      <Button variant="outline" className="w-full h-7">
                        {clicked ? (
                          <ReloadIcon className="animate-spin" />
                        ) : (
                          <ReloadIcon />
                        )}
                      </Button>
                    </a>

                    <AssetDropDown
                      assetSymbol={assetB}
                      assetData={assetBData}
                      storeCallback={setAssetB}
                      otherAsset={assetA}
                      marketSearch={marketSearch}
                      type={activeLimitCard === "sell" ? "quote" : "base"}
                      size="small"
                      chain={usr.chain}
                      balances={balances}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs
              defaultValue={activeLimitCard}
              value={activeLimitCard}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 gap-2">
                {!assetAData || !assetBData ? (
                  <>
                    <TabsTrigger disabled value="buy" style={activeTabStyle}>
                      {t("Market:buy")}
                    </TabsTrigger>
                    <TabsTrigger disabled value="sell">
                      {t("Market:sell")}
                    </TabsTrigger>
                  </>
                ) : null}
                {assetAData && assetBData && activeLimitCard === "buy" ? (
                  <>
                    <TabsTrigger value="buy" style={activeTabStyle}>
                      {t("Market:buy")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="sell"
                      onClick={() => {
                        setActiveLimitCard("sell");
                        window.history.replaceState(
                          {},
                          "",
                          `${window.location.pathname}?${new URLSearchParams({
                            ...new URLSearchParams(window.location.search),
                            price: 0,
                          }).toString()}`
                        );
                      }}
                    >
                      {t("Market:sell")}
                    </TabsTrigger>
                  </>
                ) : null}
                {assetAData && assetBData && activeLimitCard === "sell" ? (
                  <>
                    <TabsTrigger
                      value="buy"
                      onClick={() => {
                        setActiveLimitCard("buy");
                        window.history.replaceState(
                          {},
                          "",
                          `${window.location.pathname}?${new URLSearchParams({
                            ...new URLSearchParams(window.location.search),
                            price: 0,
                            amount: 0,
                          }).toString()}`
                        );
                      }}
                    >
                      {t("Market:buy")}
                    </TabsTrigger>
                    <TabsTrigger value="sell" style={activeTabStyle}>
                      {t("Market:sell")}
                    </TabsTrigger>
                  </>
                ) : null}
              </TabsList>
              <TabsContent value="buy">
                <LimitOrderCard
                  usr={usr}
                  thisAssetA={assetA}
                  thisAssetB={assetB}
                  assetAData={assetAData}
                  assetBData={assetBData}
                  buyOrders={buyOrders}
                  sellOrders={sellOrders}
                  usrBalances={usrBalances}
                  orderType="buy"
                  key="buyLimit"
                  marketSearch={marketSearch}
                  fee={limitOrderFee}
                  invertedMarket={invertedMarket}
                />
              </TabsContent>
              <TabsContent value="sell">
                <LimitOrderCard
                  usr={usr}
                  thisAssetA={assetA}
                  thisAssetB={assetB}
                  assetAData={assetAData}
                  assetBData={assetBData}
                  buyOrders={buyOrders}
                  sellOrders={sellOrders}
                  usrBalances={usrBalances}
                  orderType="sell"
                  key="sellLimit"
                  marketSearch={marketSearch}
                  fee={limitOrderFee}
                  invertedMarket={invertedMarket}
                />
              </TabsContent>
            </Tabs>
          </div>
          <div className="col-span-1">
            <div className="grid grid-cols-1 gap-y-2">
              <div className="flex-grow" style={{ paddingBottom: "0px" }}>
                {assetADetails ? (
                  <MarketAssetCard
                    asset={assetA}
                    assetData={assetAData}
                    assetDetails={assetADetails}
                    bitassetData={assetABitassetData}
                    marketSearch={marketSearch}
                    chain={usr.chain}
                    usrBalances={usrBalances}
                    type={activeLimitCard === "buy" ? "buy" : "sell"}
                    otherAsset={assetB}
                    storeCallback={setAssetA}
                  />
                ) : (
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>
                        {activeLimitCard === "buy"
                          ? t("Market:quoteAsset")
                          : t("Market:baseAsset")}
                      </CardTitle>
                      <CardDescription className="text-lg">
                        {t("Market:loading")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex-grow">
                {assetBDetails ? (
                  <MarketAssetCard
                    asset={assetB}
                    assetData={assetBData}
                    assetDetails={assetBDetails}
                    bitassetData={assetBBitassetData}
                    marketSearch={marketSearch}
                    chain={usr.chain}
                    usrBalances={usrBalances}
                    type={activeLimitCard === "sell" ? "buy" : "sell"}
                    otherAsset={assetA}
                    storeCallback={setAssetB}
                  />
                ) : (
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>
                        {activeLimitCard === "sell"
                          ? t("Market:baseAsset")
                          : t("Market:quoteAsset")}
                      </CardTitle>
                      <CardDescription className="text-lg">
                        {t("Market:loading")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {!tickerData || !assetAData || !assetBData ? (
                <Card className="mt-2">
                  <CardHeader className="pt-4 pb-2">
                    <CardTitle>{t("Market:marketSummary")}</CardTitle>
                    <CardDescription className="text-lg">❔/❔</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm pb-4">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="grid grid-cols-5">
                        <div className="col-span-2">
                          {t("Market:latestPrice")}
                        </div>
                        <div className="col-span-3">
                          <Badge variant="outline" className="ml-2 mb-1">
                            ❔
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-5">
                        <div className="col-span-2">
                          {t("Market:24HrChange")}
                        </div>
                        <div className="col-span-3">❔</div>
                      </div>
                      <div className="grid grid-cols-5">
                        <div className="col-span-2">
                          {t("Market:24HrBaseVolume")}
                        </div>
                        <div className="col-span-3">
                          <Badge variant="outline" className="ml-2 mb-1">
                            ❔
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-5">
                        <div className="col-span-2">
                          {t("Market:24HrQuoteVolume")}
                        </div>
                        <div className="col-span-3">
                          <Badge variant="outline" className="ml-2 mb-1">
                            ❔
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-5">
                        <div className="col-span-2">
                          {t("Market:lowestAsk")}
                        </div>
                        <div className="col-span-3">
                          <Badge variant="outline" className="ml-2 mb-1">
                            ❔
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-5">
                        <div className="col-span-2">
                          {t("Market:highestBid")}
                        </div>
                        <div className="col-span-3">
                          <Badge variant="outline" className="ml-2">
                            ❔
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {tickerData && assetAData && assetBData ? marketHoverCard : null}
            </div>
          </div>
        </div>

        {assetA && assetB && assetAData && assetBData ? (
          <PoolDialogs
            assetA={assetA}
            assetAData={assetAData}
            assetB={assetB}
            assetBData={assetBData}
            chain={usr.chain}
            _assetsBTS={_assetsBTS}
            _assetsTEST={_assetsTEST}
            _poolsBTS={_poolsBTS}
            _poolsTEST={_poolsTEST}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-5 mt-5">
          {assetAData && assetBData ? (
            <>
              <div className="w-full grid grid-cols-2 gap-5">
                {buyOrders ? (
                  <MarketOrderCard
                    cardType="buy"
                    activeLimitCard={activeLimitCard}
                    assetA={assetA}
                    assetAData={assetAData}
                    assetB={assetB}
                    assetBData={assetBData}
                    buyOrders={buyOrders}
                    previousBuyOrders={previousBuyOrders}
                    sellOrders={sellOrders}
                    previousSellOrders={previousSellOrders}
                    marketOrdersLoading={marketOrdersLoading}
                    orderBookItr={orderBookItr}
                    setOrderBookItr={setOrderBookItr}
                    _resetOrders={_resetOrders}
                    invertedMarket={invertedMarket}
                  />
                ) : null}
                {sellOrders ? (
                  <MarketOrderCard
                    cardType="sell"
                    activeLimitCard={activeLimitCard}
                    assetA={assetA}
                    assetAData={assetAData}
                    assetB={assetB}
                    assetBData={assetBData}
                    buyOrders={buyOrders}
                    previousBuyOrders={previousBuyOrders}
                    sellOrders={sellOrders}
                    previousSellOrders={previousSellOrders}
                    marketOrdersLoading={marketOrdersLoading}
                    orderBookItr={orderBookItr}
                    setOrderBookItr={setOrderBookItr}
                    _resetOrders={_resetOrders}
                    invertedMarket={invertedMarket}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {assetA && assetB ? (
          <MarketSummaryTabs
            activeLimitCard={activeLimitCard}
            assetAData={assetAData}
            assetBData={assetBData}
            usr={usr}
            marketItr={marketItr}
            setMarketItr={setMarketItr}
            usrLimitOrders={usrLimitOrders}
            publicMarketHistory={publicMarketHistory}
            usrHistory={usrHistory}
            _resetMarketData={_resetMarketData}
          />
        ) : null}
      </div>
    </>
  );
}
