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

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { $currentUser, eraseCurrentUser } from '../stores/users.ts'
import AccountSelect from './AccountSelect.jsx'
import LimitOrderCard from "./LimitOrderCard.jsx";
import MarketOrderCard from "./MarketOrderCard.jsx";

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

  // Fetch 1
  const [buyOrders, setBuyOrders] = useState([]);
  const [sellOrders, setSellOrders] = useState([]);
  const [lastOrderBook, setLastOrderBook] = useState(null);

  // Fetch 2
  const [marketTrades, setMarketTrades] = useState([]);
  const [myTrades, setMyTrades] = useState([]);
  const [myOpenOrders, setMyOpenOrders] = useState([]);
  useEffect(() => {
    async function fetchMarketData () {
      if (lastOrderBook) {
        if (lastOrderBook === `${assetB}_${assetA}` || lastOrderBook === `${assetA}_${assetB}`) {
          console.log("Avoid duplicate call");
          return;
        }
      }

      const fetchedMarketOrders = await fetch(`http://localhost:8080/api/orderBook/${usr.chain}/${assetA}/${assetB}`, { method: "GET" });

      if (!fetchedMarketOrders.ok) {
          console.log("Failed to fetch market orders");
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

    async function fetchMarketActivity () {
      // bottom tab content
    }

    if (assetA && assetB && usr && usr.chain) {
      // Fetching the required market orders
      window.history.replaceState({}, "", `?market=${assetA}_${assetB}`);
      fetchMarketData()
    }
  }, [assetA, assetB, usr]);

  const [assetAData, setAssetAData] = useState(null);
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
      fetchAssetA();      
    }
  }, [assetA, usr]);

  const [assetBData, setAssetBData] = useState(null);
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
      fetchAssetB();      
    }
  }, [assetB, usr]);
  

  if (!usr || !usr.id || !usr.id.length) {
      return <AccountSelect />;
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
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="buy">Buy</TabsTrigger>
                      <TabsTrigger value="sell">Sell</TabsTrigger>
                    </TabsList>
                    <TabsContent value="buy">
                      <LimitOrderCard
                        usr={usr}
                        thisAssetA={assetA}
                        thisAssetB={assetB}
                        storeA={setAssetA}
                        storeB={setAssetB}
                        buyOrders={buyOrders}
                        sellOrders={sellOrders}
                        setBuyOrders={setBuyOrders}
                        setSellOrders={setSellOrders}
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
                        storeA={setAssetA}
                        storeB={setAssetB}
                        buyOrders={buyOrders}
                        sellOrders={sellOrders}
                        setBuyOrders={setBuyOrders}
                        setSellOrders={setSellOrders}
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
          <div className="grid grid-cols-1 gap-5">
            <Card>
              <CardHeader>
                <CardTitle>{assetA} details</CardTitle>
                <CardDescription>Please wait...</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{assetB} details</CardTitle>
                <CardDescription>Please wait...</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 mt-5">
          {
            assetAData && assetBData
              ? (
                <>
                  <Tabs defaultValue="buy" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="buy">Buy orders</TabsTrigger>
                      <TabsTrigger value="sell">Sell orders</TabsTrigger>
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
              <>
                <div className="grid grid-cols-1 mt-5">
                  <Tabs defaultValue="marketTrades" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="marketTrades">Market trades</TabsTrigger>
                      <TabsTrigger value="myTrades">My trades</TabsTrigger>
                      <TabsTrigger value="myOpenOrders">My open orders</TabsTrigger>
                    </TabsList>
                    <TabsContent value="marketTrades">
                      <Card>
                        <CardHeader>
                          <CardTitle>Market trades</CardTitle>
                          <CardDescription>
                            Recent market trades by everyone
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          content
                        </CardContent>
                        <CardFooter>
                          footer
                        </CardFooter>
                      </Card>
                    </TabsContent>
                    <TabsContent value="myTrades">
                      <Card>
                        <CardHeader>
                          <CardTitle>My trades</CardTitle>
                          <CardDescription>
                            Your recent trades in this market
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          content
                        </CardContent>
                        <CardFooter>
                          footer
                        </CardFooter>
                      </Card>
                    </TabsContent>
                    <TabsContent value="myOpenOrders">
                      <Card>
                        <CardHeader>
                          <CardTitle>My open orders</CardTitle>
                          <CardDescription>
                            Your open limit orders for this market
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          content
                        </CardContent>
                        <CardFooter>
                          footer
                        </CardFooter>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </>
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
