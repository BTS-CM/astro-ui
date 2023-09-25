import React, { useState, useEffect } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
  
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

import { $currentUser, eraseCurrentUser } from '../stores/users.ts'
import AccountSelect from './AccountSelect.jsx'
import LimitOrderCard from "./Market/LimitOrderCard.jsx";
import MarketOrderCard from "./Market/MarketOrderCard.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import MarketSummaryTabs from "./Market/MarketSummaryTabs.jsx";

import { humanReadableFloat } from '../lib/common';

export default function Market(properties) {
  const [usr, setUsr] = useState();
  useEffect(() => {
      const unsubscribe = $currentUser.subscribe((value) => {
        setUsr(value);
      });
      return unsubscribe;
  }, [$currentUser]);

  const [assetA, setAssetA] = useState(!window.location.search ? "BTS" : null);
  const [assetB, setAssetB] = useState(!window.location.search ? "USD" : null);
  useEffect(() => {
    if (window.location.search) {
      console.log("Parsing market parameters");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const market = params.market;
      const asset_a = market.split('_')[0];
      const asset_b = market.split('_')[1];
      if (asset_a !== asset_b) {
        setAssetA(asset_a);
        setAssetB(asset_b);
        return;
      }
      console.log("Invalid market query parameter");
    }
  }, []);

  const [marketSearch, setMarketSearch] = useState([]);
  useEffect(() => {
    // Fetching the required market asset data
    async function fetchCachedData () {
      const cachedMarketAssets = await fetch(`http://localhost:8080/cache/marketSearch/${usr.chain}`, { method: "GET" });

      if (!cachedMarketAssets.ok) {
          console.log("Failed to fetch cached data");
          return;
      }

      const assetJSON = await cachedMarketAssets.json();

      if (assetJSON) {
        setMarketSearch(assetJSON);
      }
    }

    if (usr && usr.chain) {
      fetchCachedData();
    }
  }, [usr]);

  const [buyOrders, setBuyOrders] = useState([]);
  const [sellOrders, setSellOrders] = useState([]);
  const [lastOrderBook, setLastOrderBook] = useState(null);
  const [orderBookItr, setOrderBookItr] = useState(0);

  const [assetAData, setAssetAData] = useState(null);
  const [assetADetails, setAssetADetails] = useState(null);

  const [assetBData, setAssetBData] = useState(null);
  const [assetBDetails, setAssetBDetails] = useState(null);

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
  }

  function _resetB() {
    setAssetBData(null);
    setAssetBDetails(null);
  }

  function _resetOrders() {
    setBuyOrders();
    setSellOrders();
  }

  function _resetMarketData() {
    // If either asset changes then several states need to be erased
    setUsrBalances();
    setUsrLimitOrders();
    setPublicMarketHistory();
    setUsrHistory();
  }

  useEffect(() => {
    async function fetchMarketData () {
      if (lastOrderBook) {
        if (lastOrderBook === `${assetB}_${assetA}`) {
          console.log("Avoid duplicate call");
          return;
        }
      }

      const fetchedMarketOrders = await fetch(`http://localhost:8080/api/orderBook/${usr.chain}/${assetA}/${assetB}`, { method: "GET" });

      if (!fetchedMarketOrders.ok) {
          console.log("Failed to fetch market orders");
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
        setLastOrderBook(`${assetA}_${assetB}`);
      }
    }

    if (assetA && assetB && usr && usr.chain) {
      // Fetching the required market orders
      window.history.replaceState({}, "", `?market=${assetA}_${assetB}`); // updating the url parameters
      fetchMarketData(); // updating market data
    }
  }, [assetA, assetB, usr, orderBookItr]);

  useEffect(() => {
    async function fetchAssetA() {
      const fetchedAssetA = await fetch(`http://localhost:8080/cache/asset/${usr.chain}/${assetA}`, { method: "GET" });
      
      if (!fetchedAssetA.ok) {
          console.log("Failed to fetch asset A");
          return;
      }

      const assetAJSON = await fetchedAssetA.json();

      if (assetAJSON && assetAJSON.result) {
        console.log("Fetched asset A data");
        setAssetAData(assetAJSON.result);
      }
    }

    if (assetA && usr && usr.chain) {
      _resetA();
      _resetMarketData();
      fetchAssetA();      
    }
  }, [assetA, usr]);

  useEffect(() => {
    async function fetching() {
      const fetchedDynamicData = await fetch(
        `http://localhost:8080/cache/dynamic/${usr.chain}/${assetAData.id.replace("1.3.", "2.3.")}`,
        { method: "GET" }
      );

      if (!fetchedDynamicData.ok) {
        console.log(`Failed to fetch ${assetA} dynamic data`);
        return;
      }

      const dynamicDataJSON = await fetchedDynamicData.json();

      if (dynamicDataJSON && dynamicDataJSON.result) {
        console.log(`Fetched ${assetA} dynamic data`);
        setAssetADetails(dynamicDataJSON.result);
      }
    }

    if (assetAData && usr && usr.chain) {
      fetching();
    }
  }, [assetAData]);

  useEffect(() => {
    async function fetchAssetB() {
      const fetchedAssetB = await fetch(`http://localhost:8080/cache/asset/${usr.chain}/${assetB}`, { method: "GET" });
      
      if (!fetchedAssetB.ok) {
          console.log("Failed to fetch asset B");
          return;
      }

      const assetBJSON = await fetchedAssetB.json();

      if (assetBJSON && assetBJSON.result) {
        console.log("Fetched asset B data");
        setAssetBData(assetBJSON.result);
      }
    }

    if (assetB && usr && usr.chain) {
      _resetB();
      _resetMarketData();
      fetchAssetB();
    }
  }, [assetB, usr]);
  
  useEffect(() => {
    async function fetching() {
      const fetchedDynamicData = await fetch(
        `http://localhost:8080/cache/dynamic/${usr.chain}/${assetBData.id.replace("1.3.", "2.3.")}`,
        { method: "GET" }
      );

      if (!fetchedDynamicData.ok) {
        console.log(`Failed to fetch ${assetB} dynamic data`);
        return;
      }

      const dynamicDataJSON = await fetchedDynamicData.json();

      if (dynamicDataJSON && dynamicDataJSON.result) {
        console.log(`Fetched ${assetB} dynamic data`);
        setAssetBDetails(dynamicDataJSON.result);
      }
    }

    if (assetBData && usr && usr.chain) {
      fetching();
    }
  }, [assetBData]);

  useEffect(() => {
    async function fetchMarketHistory() {
      // Fetching the data for the market summary tabs component
      const fetchedMarketHistory = await fetch(`http://localhost:8080/api/getMarketHistory/${usr.chain}/${assetAData.id}/${assetBData.id}/${usr.id}`, { method: "GET" });
      
      if (!fetchedMarketHistory.ok) {
          console.log("Failed to fetch market history");
          if (marketItr < 5) {
            setMarketItr(marketItr + 1); // retrying the query
          }
          return;
      }

      const marketHistoryJSON = await fetchedMarketHistory.json();

      if (marketHistoryJSON && marketHistoryJSON.result) {
        console.log("Fetched market history");
        const { result } = marketHistoryJSON;
        const { balances, marketHistory, accountLimitOrders, usrTrades, ticker } = result;
        setUsrBalances(balances);
        setUsrLimitOrders(accountLimitOrders);
        setPublicMarketHistory(marketHistory);
        setUsrHistory(usrTrades);
        setTickerData(ticker);
      }
    }
    
    if (assetAData && assetBData) {
      console.log("Fetching market history");
      fetchMarketHistory();
    }
  }, [assetAData, assetBData, usr, marketItr]);

  if (!usr || !usr.id || !usr.id.length) {
      return <AccountSelect />;
  }

  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  }

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-2 gap-5">
          {
            marketSearch && marketSearch.length
              ? (
                <>
                  <Tabs defaultValue="buy" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 gap-2">

                        {
                            activeLimitCard === "buy"
                                ? <TabsTrigger value="buy" style={activeTabStyle}>Buy</TabsTrigger>
                                : <TabsTrigger value="buy" onClick={() => setActiveLimitCard("buy")}>Buy</TabsTrigger>
                        }
                        {
                            activeLimitCard === "sell"
                                ? <TabsTrigger value="sell" style={activeTabStyle}>Sell</TabsTrigger>
                                : <TabsTrigger value="sell" onClick={() => setActiveLimitCard("sell")}>Sell</TabsTrigger>
                        }
                    </TabsList>
                    <TabsContent value="buy">
                      <LimitOrderCard
                        usr={usr}
                        thisAssetA={assetA}
                        thisAssetB={assetB}
                        buyOrders={buyOrders}
                        sellOrders={sellOrders}
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
                        buyOrders={buyOrders}
                        sellOrders={sellOrders}
                        orderType="sell"
                        key="sellLimit"
                        marketSearch={marketSearch}
                      />
                    </TabsContent>
                  </Tabs>
                </>
              )
              : null
          }
          <div className="col-span-1">
            <div className="grid grid-cols-1 gap-y-2">
              
              <div className="flex-grow">
                <Card style={{ maxHeight: '80px' }}>
                  <CardHeader className="pt-2">
                    <CardTitle className="text-center text-lg">
                      {usr.chain === "bitshares" ? "Bitshares" : "Bitshares (Testnet)"} DEX Market controls
                    </CardTitle>
                    <CardDescription>
                      <div className="grid grid-cols-3 gap-1">
                        <AssetDropDown
                          assetSymbol={assetA}
                          assetData={assetAData}
                          storeCallback={setAssetA}
                          otherAsset={assetB}
                          marketSearch={marketSearch}
                          type="quote"
                        />
                        <HoverCard>
                          <HoverCardTrigger asChild style={{ position: 'relative' }}>
                            <Button
                              variant="outline"
                              className="h-5 ml-1 mr-1 p-3"
                              onClick={() => {
                                  const tmp = assetA;
                                  setAssetA(assetB);
                                  setAssetB(tmp);

                                  const tmp2 = buyOrders;
                                  setBuyOrders(sellOrders);
                                  setSellOrders(tmp2);
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
                          type="base"
                        />
                      </div>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>

              <div className="flex-grow">
                <HoverCard>
                  <HoverCardTrigger asChild style={{ position: 'relative' }}>
                    <Card>
                      <CardHeader className="pt-2">
                        <CardDescription>
                          <div className="grid grid-cols-1 gap-1">
                            <div className="col-span-1 mb-1">
                              <CardTitle className="text-center text-lg">{assetA}/{assetB} Market summary</CardTitle>
                            </div>
                            <div className="col-span-1">
                              Latest price:
                              <Badge variant="outline" className="ml-2">
                                {tickerData ? tickerData.latest : 'Loading...'}
                              </Badge>
                            </div>
                            <div className="col-span-1">
                              24Hr change:
                              <Badge variant="outline" className="ml-2">
                                {tickerData ? tickerData.percent_change : 'Loading...'}
                              </Badge>
                            </div>
                            <div className="col-span-1">
                              24Hr base volume:
                              <Badge variant="outline" className="ml-2">
                                {tickerData ? tickerData.base_volume : 'Loading...'}
                              </Badge>
                            </div>
                            <div className="col-span-1">
                              24Hr quote volume:
                              <Badge variant="outline" className="ml-2">
                                {tickerData ? tickerData.quote_volume : 'Loading...'}
                              </Badge>
                            </div>
                            <div className="col-span-1">
                              Lowest ask:
                              <Badge variant="outline" className="ml-2">
                                {tickerData ? tickerData.lowest_ask : 'Loading...'}
                              </Badge>
                            </div>
                            <div className="col-span-1">
                              Highest bid:
                              <Badge variant="outline" className="ml-2">
                                {tickerData ? tickerData.highest_bid : 'Loading...'}
                              </Badge>
                            </div>
                          </div>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 text-sm text-center">
                    <b>{assetA}/{assetB} Market links</b><br/>
                    <a
                      href={
                          usr.chain === "bitshares"
                              ? `https://blocksights.info/#/markets/${assetA}/${assetB}`
                              : `https://blocksights.info/#/markets/${assetA}/${assetB}?network=testnet`
                      }
                      target="_blank"
                    >
                        <Button variant="outline" className="ml-2">
                            {assetA}/{assetB} Market explorer
                        </Button>
                    </a>
                    {
                      usr.chain === "bitshares"
                        ? <a
                            href={`https://bts.exchange/#/market/${assetA}_${assetB}?r=nftprofessional1`}
                            target="_blank"
                          >
                              <Button variant="outline" className="ml-2">
                                  BTS.Exchange
                              </Button>
                          </a>
                        : null
                    }
                  </HoverCardContent>
                </HoverCard>
              </div>

              <div className="flex-grow" style={{ paddingBottom: '0px' }}>
                <MarketAssetCard
                  asset={assetA}
                  assetData={assetAData}
                  assetDetails={assetADetails}
                  marketSearch={marketSearch}
                  chain={usr.chain}
                  usrBalances={usrBalances}
                  type="buy"
                />
              </div>

              <div className="flex-grow">
                <MarketAssetCard
                  asset={assetB}
                  assetData={assetBData}
                  assetDetails={assetBDetails}
                  marketSearch={marketSearch}
                  chain={usr.chain}
                  usrBalances={usrBalances}
                  type="sell"
                />
              </div>

            </div>
          </div>

        </div>
        <div className="grid grid-cols-1 gap-5 mt-5">
          {
            assetAData && assetBData
              ? (
                <>
                  <Tabs defaultValue="buy" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 gap-1">
                      {
                        activeMOC === "buy"
                          ? <TabsTrigger value="buy" style={activeTabStyle}>Buy</TabsTrigger>
                          : <TabsTrigger value="buy" onClick={() => setActiveMOC("buy")}>Buy</TabsTrigger>
                      }
                      {
                        activeMOC === "sell"
                          ? <TabsTrigger value="sell" style={activeTabStyle}>Sell</TabsTrigger>
                          : <TabsTrigger value="sell" onClick={() => setActiveMOC("sell")}>Sell</TabsTrigger>
                      }
                    </TabsList>
                    <TabsContent value="buy">
                      <MarketOrderCard
                        cardType="buy"
                        assetA={assetA}
                        assetAData={assetAData}
                        assetB={assetB}
                        assetBData={assetBData}
                        buyOrders={buyOrders}
                        sellOrders={sellOrders}
                        orderBookItr={orderBookItr}
                        setOrderBookItr={setOrderBookItr}
                        _resetOrders={_resetOrders}
                      />
                    </TabsContent>
                    <TabsContent value="sell">
                      <MarketOrderCard
                        cardType="sell"
                        assetA={assetA}
                        assetAData={assetAData}
                        assetB={assetB}
                        assetBData={assetBData}
                        buyOrders={buyOrders}
                        sellOrders={sellOrders}
                        orderBookItr={orderBookItr}
                        setOrderBookItr={setOrderBookItr}
                        _resetOrders={_resetOrders}
                      />
                    </TabsContent>
                  </Tabs>
                </>
              )
              : null
          }
        </div>
        {
          assetA && assetB
            ? (
              <MarketSummaryTabs
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
            )
            : null
        }
      </div>
      <div className="flex justify-center">
        <Button
          className="mt-5"
          onClick={() => {
            eraseCurrentUser();
          }}
        >
          Switch account/chain
        </Button>
      </div>
    </>
  );
}
