import React, { useState, useEffect } from "react";

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

import { $currentUser, eraseCurrentUser } from "../stores/users.ts";

import {
  $poolCache,
  $marketSearchCache,
  $globalParamsCache,
} from "../stores/cache.ts";

import { $assetCache, addAssetsToCache } from "../stores/cache.ts";

import AccountSelect from "./AccountSelect.jsx";
import LimitOrderCard from "./Market/LimitOrderCard.jsx";
import MarketOrderCard from "./Market/MarketOrderCard.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import MarketSummaryTabs from "./Market/MarketSummaryTabs.jsx";
import PoolDialogs from "./Market/PoolDialogs.jsx";
import CurrentUser from "./common/CurrentUser.jsx";

import { humanReadableFloat, trimPrice } from "../lib/common";

import {
  fetchDynamicData,
  fetchBitassetData,
  cachedAsset,
} from "../effects/Market.ts";

export default function Market(properties) {
  const [usr, setUsr] = useState();
  useEffect(() => {
    const unsubscribe = $currentUser.subscribe((value) => {
      setUsr(value);
    });
    return unsubscribe;
  }, [$currentUser]);

  const [assets, setAssetCache] = useState([]);
  useEffect(() => {
    const unsubscribe = $assetCache.subscribe((value) => {
      setAssetCache(value);
    });
    return unsubscribe;
  }, [$assetCache]);

  const [marketSearch, setMarketSearchCache] = useState([]);
  useEffect(() => {
    const unsubscribe = $marketSearchCache.subscribe((value) => {
      setMarketSearchCache(value);
    });
    return unsubscribe;
  }, [$marketSearchCache]);

  /*
  // Fees
  const [globalParamsCache, setGlobalParamsCache] = useState(null);
  useEffect(() => {
    const unsubscribe = $globalParamsCache.subscribe((value) => {
      setGlobalParamsCache(value);
    });
    return unsubscribe;
  }, [$globalParamsCache]);
  */

  const [assetA, setAssetA] = useState(!window.location.search ? "BTS" : null);
  const [assetB, setAssetB] = useState(!window.location.search ? "USD" : null);
  useEffect(() => {
    async function parseUrlAssets() {
      if (window.location.search) {
        console.log("Parsing market parameters");
        const urlSearchParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlSearchParams.entries());
        const market = params.market;
        let asset_a = market.split("_")[0].toUpperCase();
        let asset_b = market.split("_")[1].toUpperCase();

        if (asset_a && asset_b && asset_b.length && asset_a === asset_b) {
          // Avoid invalid duplicate asset market pairs
          asset_b = asset_a === "BTS" ? "USD" : "BTS";
          console.log("Invalid market parameters - replaced quote asset.");
        }

        const searchSymbols = marketSearch.map((asset) => asset.s);
        const searchIds = marketSearch.map((asset) => asset.id);

        if (
          !asset_a ||
          !asset_a.length ||
          (!searchSymbols.includes(asset_a) && !searchIds.includes(asset_a))
        ) {
          console.log("Asset A replaced with default.");
          setAssetA("BTS");
        }

        if (!assetA) {
          const foundAssetA = marketSearch.find(
            (asset) => asset.id === asset_a || asset.s === asset_a
          );
          if (foundAssetA) {
            console.log("Setting asset A.");
            setAssetA(foundAssetA.s);
          } else {
            console.log("Setting default asset A");
            setAssetA("BTS");
          }
        }

        if (
          !asset_b ||
          !asset_b.length ||
          (!searchSymbols.includes(asset_b) && !searchIds.includes(asset_b))
        ) {
          console.log("Asset B replaced with default.");
          setAssetB(assetA !== "USD" ? "USD" : "BTS");
        }

        if (!assetB) {
          const foundAssetB = marketSearch.find(
            (asset) => asset.id === asset_b || asset.s === asset_b
          );
          if (foundAssetB) {
            console.log("Setting asset B.");
            setAssetB(foundAssetB.s);
            return;
          } else {
            console.log("Setting default asset B");
            setAssetB(asset_a !== "BTS" && asset_a !== "1.3.0" ? "BTS" : "USD");
          }
        }
      }
    }

    if (marketSearch && marketSearch.length) {
      parseUrlAssets();
    }
  }, [marketSearch]);

  const [buyOrders, setBuyOrders] = useState([]);
  const [sellOrders, setSellOrders] = useState([]);
  const [orderBookItr, setOrderBookItr] = useState(0);
  const [marketInProgress, setMarketInProgress] = useState(false);

  const [assetAData, setAssetAData] = useState(null);
  const [assetBData, setAssetBData] = useState(null);

  const [assetADetails, setAssetADetails] = useState(null);
  const [assetBDetails, setAssetBDetails] = useState(null);

  const [aBitassetData, setABitassetData] = useState(null);
  const [bBitassetData, setBBitassetData] = useState(null);

  const [usrBalances, setUsrBalances] = useState();
  const [usrLimitOrders, setUsrLimitOrders] = useState();
  const [usrHistory, setUsrHistory] = useState();
  const [publicMarketHistory, setPublicMarketHistory] = useState();
  const [tickerData, setTickerData] = useState();
  const [marketItr, setMarketItr] = useState(0);

  // style states
  const [activeLimitCard, setActiveLimitCard] = useState("buy");
  const [activeMOC, setActiveMOC] = useState("buy");

  function _resetA() {
    setAssetAData(null);
    setAssetADetails(null);
    setABitassetData(null);
  }

  function _resetB() {
    setAssetBData(null);
    setAssetBDetails(null);
    setBBitassetData(null);
  }

  function _resetOrders() {
    setBuyOrders();
    setSellOrders();
  }

  function _resetMarketData() {
    // If either asset changes then several states need to be erased
    setUsrBalances();
    setUsrLimitOrders();
    setUsrHistory();
    setPublicMarketHistory();
    setTickerData();
  }

  useEffect(() => {
    async function fetchMarketData() {
      const fetchedMarketOrders = await fetch(
        `http://localhost:8080/api/orderBook/${usr.chain}/${assetA}/${assetB}`,
        { method: "GET" }
      );

      if (!fetchedMarketOrders.ok) {
        console.log("Failed to fetch market orders");
        setMarketInProgress(false);
        if (orderBookItr < 5) {
          setOrderBookItr(orderBookItr + 1); // retrying the query
        }
        return;
      }

      const marketOrdersJSON = await fetchedMarketOrders.json();

      if (marketOrdersJSON && marketOrdersJSON.result) {
        console.log(`Fetched market data for ${assetA}_${assetB}`);
        setBuyOrders(marketOrdersJSON.result.asks);
        setSellOrders(marketOrdersJSON.result.bids);
      }

      setMarketInProgress(false);
    }

    if (assetA && assetB && usr && usr.chain) {
      // Fetching the required market orders
      setMarketInProgress(true);
      window.history.replaceState({}, "", `?market=${assetA}_${assetB}`); // updating the url parameters
      fetchMarketData(); // updating market data
    }
  }, [assetA, assetB, usr, orderBookItr]);

  useEffect(() => {
    if (assetA && usr && usr.chain) {
      _resetA();
      _resetMarketData();

      if (!assets || !assets.length) {
        cachedAsset(usr.chain, assetA, setAssetAData);
        return;
      }

      const foundAsset = assets.find((asset) => asset.s === assetA);
      if (!foundAsset) {
        cachedAsset(usr.chain, assetA, setAssetAData);
        return;
      }

      console.log("Retrieved asset A from cache");
      setAssetAData(foundAsset);
    }
  }, [assetA, usr]);

  useEffect(() => {
    if (assetB && usr && usr.chain) {
      _resetB();
      _resetMarketData();

      if (!assets || !assets.length) {
        // No cache exists
        cachedAsset(usr.chain, assetB, setAssetBData);
        return;
      }

      const foundAsset = assets.find((asset) => asset.s === assetB);
      if (!foundAsset) {
        // Asset doesn't exist in cache
        cachedAsset(usr.chain, assetB, setAssetBData);
        return;
      }

      // Asset exists in cache
      console.log("Retrieved asset B from cache");
      setAssetBData(foundAsset);
    }
  }, [assetB, usr]);

  useEffect(() => {
    if (assetAData && usr && usr.chain) {
      fetchDynamicData(usr.chain, assetAData.id, setAssetADetails);
      if (assetAData.bitasset_data_id) {
        fetchBitassetData(
          usr.chain,
          assetAData.bitasset_data_id,
          setABitassetData
        );
      }
    }
  }, [assetAData]);

  useEffect(() => {
    if (assetBData && usr && usr.chain) {
      fetchDynamicData(usr.chain, assetBData.id, setAssetBDetails);
      if (assetBData.bitasset_data_id) {
        fetchBitassetData(
          usr.chain,
          assetBData.bitasset_data_id,
          setBBitassetData
        );
      }
    }
  }, [assetBData]);

  useEffect(() => {
    async function fetchMarketHistory() {
      // Fetching the data for the market summary tabs component
      console.log("Fetching market history");

      const fetchedMarketHistory = await fetch(
        `http://localhost:8080/api/getMarketHistory/${usr.chain}/${assetAData.id}/${assetBData.id}/${usr.id}`,
        { method: "GET" }
      );

      if (!fetchedMarketHistory.ok) {
        console.log("Failed to fetch market history");
        setTimeout(() => {
          setMarketItr(marketItr + 1); // retrying the query
        }, 2000);
        return;
      }

      const marketHistoryJSON = await fetchedMarketHistory.json();

      if (marketHistoryJSON && marketHistoryJSON.result) {
        console.log("Fetched market history");
        const { result } = marketHistoryJSON;
        const {
          balances,
          marketHistory,
          accountLimitOrders,
          usrTrades,
          ticker,
        } = result;
        setUsrBalances(balances);
        setUsrLimitOrders(accountLimitOrders);
        setPublicMarketHistory(marketHistory);
        setUsrHistory(usrTrades);
        setTickerData(ticker);
      }
    }

    if (assetAData && assetBData) {
      fetchMarketHistory();
    }
  }, [assetAData, assetBData, usr, marketItr]);

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

  if (!usr || !usr.id || !usr.id.length) {
    return <AccountSelect />;
  }

  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

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
                />
              </TabsContent>
            </Tabs>

            <HoverCard>
              <HoverCardTrigger asChild style={{ position: "relative" }}>
                <Card className="mt-5">
                  <CardHeader className="pt-4 pb-2">
                    <CardTitle>Market summary</CardTitle>
                    <CardDescription className="text-lg">
                      {activeLimitCard === "buy" ? `${assetA}/${assetB}` : null}
                      {activeLimitCard === "sell"
                        ? `${assetB}/${assetA}`
                        : null}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm pb-4">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="grid grid-cols-5">
                        <div className="col-span-2">Latest price:</div>
                        <div className="col-span-3">
                          <Badge variant="outline" className="ml-2 mb-1">
                            {tickerData && assetAData
                              ? trimPrice(
                                  tickerData.latest,
                                  assetAData.precision
                                )
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
                              ? trimPrice(
                                  tickerData.lowest_ask,
                                  assetAData.precision
                                )
                              : "?"}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-5">
                        <div className="col-span-2">Highest bid:</div>
                        <div className="col-span-3">
                          <Badge variant="outline" className="ml-2">
                            {tickerData && assetAData
                              ? trimPrice(
                                  tickerData.highest_bid,
                                  assetAData.precision
                                )
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
                <a
                  href={
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
                  target="_blank"
                >
                  <Button variant="outline" className="mb-2 mt-2">
                    🔎 Blocksights market explorer
                  </Button>
                </a>
                {usr.chain === "bitshares" ? (
                  <>
                    <a
                      href={
                        activeLimitCard === "buy"
                          ? `https://bts.exchange/#/market/${assetA}_${assetB}?r=nftprofessional1`
                          : `https://bts.exchange/#/market/${assetB}_${assetA}?r=nftprofessional1`
                      }
                      target="_blank"
                    >
                      <Button variant="outline" className="ml-2">
                        🔗 BTS.Exchange
                      </Button>
                    </a>
                    <a
                      href={
                        activeLimitCard === "buy"
                          ? `https://wallet.btwty.com/market/${assetA}_${assetB}?r=nftprofessional1`
                          : `https://wallet.btwty.com/market/${assetB}_${assetA}?r=nftprofessional1`
                      }
                      target="_blank"
                    >
                      <Button variant="outline" className="ml-2">
                        🔗 BTWTY
                      </Button>
                    </a>
                    <a
                      href={
                        activeLimitCard === "buy"
                          ? `https://ex.xbts.io/market/${assetA}_${assetB}?r=nftprofessional1`
                          : `https://ex.xbts.io/market/${assetB}_${assetA}?r=nftprofessional1`
                      }
                      target="_blank"
                    >
                      <Button variant="outline" className="ml-2 mt-2">
                        🔗 XBTS
                      </Button>
                    </a>
                  </>
                ) : null}
              </HoverCardContent>
            </HoverCard>
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
                              _resetA();
                              _resetB();
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
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex-grow" style={{ paddingBottom: "0px" }}>
                {assetADetails ? (
                  <MarketAssetCard
                    asset={assetA}
                    assetData={assetAData}
                    assetDetails={assetADetails}
                    bitassetData={aBitassetData}
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
                    bitassetData={bBitassetData}
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
                    marketInProgress={marketInProgress}
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
                    marketInProgress={marketInProgress}
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
      {usr ? <CurrentUser usr={usr} resetCallback={eraseCurrentUser} /> : null}
    </>
  );
}
