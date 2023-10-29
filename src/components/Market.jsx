import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";

import { nanoquery } from "@nanostores/query";
import { useStore } from "@nanostores/react";

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

import LimitOrderCard from "./Market/LimitOrderCard.jsx";
import MarketOrderCard from "./Market/MarketOrderCard.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import MarketSummaryTabs from "./Market/MarketSummaryTabs.jsx";
import PoolDialogs from "./Market/PoolDialogs.jsx";

import ExternalLink from "./common/ExternalLink.jsx";

import { trimPrice } from "../lib/common";

import { $marketSearchCache } from "../stores/cache.ts";

import {
  createMarketHistoryStore,
  createMarketOrdersStore,
} from "../effects/Market.ts";

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
  } = properties;

  const marketSearch = useSyncExternalStore(
    $marketSearchCache.subscribe,
    $marketSearchCache.get,
    () => true
  );

  // End of init

  const [buyOrders, setBuyOrders] = useState(null);
  const [sellOrders, setSellOrders] = useState(null);

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

  // Use the store
  const marketOrdersStore = useMemo(() => {
    return createMarketOrdersStore([usr.chain, assetA, assetB, usr.id]);
  }, [usr, assetA, assetB, orderBookItr]);

  const {
    data: marketOrdersData,
    loading: marketOrdersLoading,
    error: marketOrdersError,
  } = useStore(marketOrdersStore);

  useEffect(() => {
    if (marketOrdersData && !marketOrdersLoading && !marketOrdersError) {
      setBuyOrders(marketOrdersData.asks);
      setSellOrders(marketOrdersData.bids);
    } else {
      setBuyOrders(null);
      setSellOrders(null);
    }
  }, [marketOrdersData, marketOrdersLoading, marketOrdersError]);

  // Use the store
  const marketHistoryStore = useMemo(() => {
    return createMarketHistoryStore([
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
      console.log({ marketHistoryData });
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

  useEffect(() => {
    if (assetA && assetB && usr && usr.chain) {
      const interval = setInterval(() => {
        // Fetching data from the API every 30 seconds
        setMarketItr(marketItr + 1);
        setOrderBookItr(orderBookItr + 1);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [assetA, assetB, usr]);

  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

  const marketHoverCard = (
    <HoverCard>
      <HoverCardTrigger asChild style={{ position: "relative" }}>
        <Card className="mt-5">
          <CardHeader className="pt-4 pb-2">
            <CardTitle>Market summary</CardTitle>
            <CardDescription className="text-lg">
              {activeLimitCard === "buy" ? `${assetA}/${assetB}` : null}
              {activeLimitCard === "sell" ? `${assetB}/${assetA}` : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm pb-4">
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-5">
                <div className="col-span-2">Latest price:</div>
                <div className="col-span-3">
                  <Badge variant="outline" className="ml-2 mb-1">
                    {tickerData && assetAData
                      ? trimPrice(tickerData.latest, assetAData.precision)
                      : "?"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-5">
                <div className="col-span-2">24Hr change:</div>
                <div className="col-span-3">
                  <Badge variant="outline" className="ml-2 mb-1">
                    {tickerData ? tickerData.percent_change : "?"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-5">
                <div className="col-span-2">24Hr base volume:</div>
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
                <div className="col-span-2">24Hr quote volume:</div>
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
                <div className="col-span-2">Lowest ask:</div>
                <div className="col-span-3">
                  <Badge variant="outline" className="ml-2 mb-1">
                    {tickerData && assetAData
                      ? trimPrice(tickerData.lowest_ask, assetAData.precision)
                      : "?"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-5">
                <div className="col-span-2">Highest bid:</div>
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
          {assetA}/{assetB} External market links
        </b>
        <br />
        <ExternalLink
          variant="outline"
          classNameContents="mb-2 mt-2"
          type="button"
          text={`🔎 Blocksights market explorer`}
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
              classNameContents="ml-2"
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
              classNameContents="ml-2"
              type="button"
              text={`🔗 BTWTY`}
              hyperlink={
                activeLimitCard === "buy"
                  ? `https://wallet.btwty.com/market/${assetA}_${assetB}?r=nftprofessional1`
                  : `https://wallet.btwty.com/market/${assetB}_${assetA}?r=nftprofessional1`
              }
            />
            <ExternalLink
              variant="outline"
              classNameContents="ml-2 mt-2"
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
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="grid w-full grid-cols-2 gap-2">
                {!assetAData || !assetBData ? (
                  <>
                    <TabsTrigger disabled value="buy" style={activeTabStyle}>
                      Buy
                    </TabsTrigger>
                    <TabsTrigger disabled value="sell">
                      Sell
                    </TabsTrigger>
                  </>
                ) : null}
                {assetAData && assetBData && activeLimitCard === "buy" ? (
                  <>
                    <TabsTrigger value="buy" style={activeTabStyle}>
                      Buy
                    </TabsTrigger>
                    <TabsTrigger
                      value="sell"
                      onClick={() => setActiveLimitCard("sell")}
                    >
                      Sell
                    </TabsTrigger>
                  </>
                ) : null}
                {assetAData && assetBData && activeLimitCard === "sell" ? (
                  <>
                    <TabsTrigger
                      value="buy"
                      onClick={() => setActiveLimitCard("buy")}
                    >
                      Buy
                    </TabsTrigger>
                    <TabsTrigger value="sell" style={activeTabStyle}>
                      Sell
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
                />
              </TabsContent>
            </Tabs>

            {tickerData &&
            assetAData &&
            assetBData &&
            (assetABitassetData || assetBBitassetData)
              ? marketHoverCard
              : null}
          </div>
          <div className="col-span-1">
            <div className="grid grid-cols-1 gap-y-2">
              <div className="flex-grow">
                <Card>
                  <CardHeader className="pt-2 pb-2">
                    <CardTitle className="text-center text-lg">
                      {usr.chain === "bitshares"
                        ? "Bitshares"
                        : "Bitshares (Testnet)"}{" "}
                      DEX Market controls
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
                      />
                      <HoverCard>
                        <HoverCardTrigger
                          asChild
                          style={{ position: "relative" }}
                        >
                          <Button
                            variant="outline"
                            className="h-5 ml-1 mr-1 p-3"
                            onClick={() => {
                              // Erasing data
                              _resetOrders();
                              _resetMarketData();
                              // Swapping asset A for B
                              const tmp = assetA;
                              setAssetA(assetB);
                              setAssetB(tmp);
                            }}
                          >
                            ⇄
                          </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-40 text-md text-center">
                          Swap asset order
                        </HoverCardContent>
                      </HoverCard>
                      <AssetDropDown
                        assetSymbol={assetB}
                        assetData={assetBData}
                        storeCallback={setAssetB}
                        otherAsset={assetA}
                        marketSearch={marketSearch}
                        type={activeLimitCard === "sell" ? "quote" : "base"}
                        size="small"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {tickerData &&
              assetAData &&
              !assetABitassetData &&
              assetBData &&
              !assetBBitassetData
                ? marketHoverCard
                : null}

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
                  />
                ) : (
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>
                        {activeLimitCard === "buy"
                          ? "Quote asset"
                          : "Base asset"}
                      </CardTitle>
                      <CardDescription className="text-lg">
                        Loading...
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
                  />
                ) : (
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>
                        {activeLimitCard === "sell"
                          ? "Base asset"
                          : "Quote asset"}
                      </CardTitle>
                      <CardDescription className="text-lg">
                        Loading...
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
            </div>
          </div>
        </div>

        {assetA && assetB && assetAData && assetBData ? (
          <PoolDialogs
            assetA={assetA}
            assetAData={assetAData}
            assetB={assetB}
            assetBData={assetBData}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-5 mt-5">
          {assetAData && assetBData ? (
            <>
              <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-1">
                  {activeMOC === "buy" ? (
                    <TabsTrigger value="buy" style={activeTabStyle}>
                      Buy
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger
                      value="buy"
                      onClick={() => setActiveMOC("buy")}
                    >
                      Buy
                    </TabsTrigger>
                  )}
                  {activeMOC === "sell" ? (
                    <TabsTrigger value="sell" style={activeTabStyle}>
                      Sell
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger
                      value="sell"
                      onClick={() => setActiveMOC("sell")}
                    >
                      Sell
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="buy">
                  <MarketOrderCard
                    cardType="buy"
                    activeLimitCard={activeLimitCard}
                    assetA={assetA}
                    assetAData={assetAData}
                    assetB={assetB}
                    assetBData={assetBData}
                    buyOrders={buyOrders}
                    sellOrders={sellOrders}
                    marketOrdersLoading={marketOrdersLoading}
                    orderBookItr={orderBookItr}
                    setOrderBookItr={setOrderBookItr}
                    _resetOrders={_resetOrders}
                  />
                </TabsContent>
                <TabsContent value="sell">
                  <MarketOrderCard
                    cardType="sell"
                    activeLimitCard={activeLimitCard}
                    assetA={assetA}
                    assetAData={assetAData}
                    assetB={assetB}
                    assetBData={assetBData}
                    buyOrders={buyOrders}
                    sellOrders={sellOrders}
                    marketOrdersLoading={marketOrdersLoading}
                    orderBookItr={orderBookItr}
                    setOrderBookItr={setOrderBookItr}
                    _resetOrders={_resetOrders}
                  />
                </TabsContent>
              </Tabs>
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
