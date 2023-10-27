import React, { useState, useEffect, useSyncExternalStore } from "react";
import { FixedSizeList as List } from "react-window";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";
import { $offersCache, $assetCache } from "../stores/cache.ts";
import { humanReadableFloat } from "@/lib/common.js";

import CurrentUser from "./common/CurrentUser.jsx";

function hoursTillExpiration(expirationTime) {
  // Parse the expiration time
  var expirationDate = new Date(expirationTime);

  // Get the current date and time
  var currentDate = new Date();

  // Calculate the difference in milliseconds
  var difference = expirationDate - currentDate;

  // Convert the difference to hours and round it to the nearest integer
  var hours = Math.round(difference / 1000 / 60 / 60);

  return hours;
}

export default function CreditBorrow(properties) {
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const assets = useSyncExternalStore(
    $assetCache.subscribe,
    $assetCache.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares");

  const offers = useSyncExternalStore(
    $offersCache.subscribe,
    $offersCache.get,
    () => true
  );

  const [activeTab, setActiveTab] = useState("allOffers");
  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

  const OfferRow = ({ index, style }) => {
    const res = offers[index];
    const foundAsset = assets.find((x) => x.id === res.asset_type);

    if (!res || !foundAsset) {
      return null;
    }

    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2" onClick={() => {}}>
          <CardHeader className="pb-1">
            <CardTitle>
              Offer #{res.id.replace("1.21.", "")} by {res.owner_name ?? "?"} (
              {res.owner_account})
            </CardTitle>
            <CardDescription>
              Offering
              <b>
                {` ${humanReadableFloat(
                  res.current_balance,
                  foundAsset.precision
                )} ${foundAsset.symbol} (${res.asset_type})`}
              </b>
              <br />
              Accepting
              <b>
                {` ${res.acceptable_collateral
                  .map((asset) => asset[0])
                  .map((x) => {
                    return assets.find((y) => y.id === x).symbol;
                  })
                  .join(", ")}`}
              </b>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm pb-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-1">
                Fee: {res.fee_rate / 10000}%<br />
                {`Repay period: ${(res.max_duration_seconds / 60 / 60).toFixed(
                  res.max_duration_seconds / 60 / 60 < 1 ? 2 : 0
                )} hours`}
              </div>
              <div className="col-span-1">
                {`Offer valid for: ${hoursTillExpiration(
                  res.auto_disable_time
                )} hours`}
                <br />
                {`Min amount: ${humanReadableFloat(
                  res.min_deal_amount,
                  foundAsset.precision
                )} ${foundAsset.symbol}`}
              </div>
            </div>
          </CardContent>
          <CardFooter className="pb-5">
            <a href={`/offer/index.html?id=${res.id}`}>
              <Button>
                Proceed with credit offer #{res.id.replace("1.21.", "")}
              </Button>
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>🏦 Viewing available credit offers</CardTitle>
              <CardDescription>
                Credit offers are user generated, they offer different rates,
                assets and durations; evaluate terms prior to accepting offers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {offers && offers.length ? (
                <>
                  <Tabs defaultValue="allOffers" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 gap-2">
                      {activeTab === "allOffers" ? (
                        <TabsTrigger value="allOffers" style={activeTabStyle}>
                          Viewing all offers
                        </TabsTrigger>
                      ) : (
                        <TabsTrigger
                          value="allOffers"
                          onClick={() => setActiveTab("allOffers")}
                        >
                          View all offers
                        </TabsTrigger>
                      )}
                      {activeTab === "availableOffers" ? (
                        <TabsTrigger
                          value="availableOffers"
                          style={activeTabStyle}
                        >
                          Viewing compatible orders
                        </TabsTrigger>
                      ) : (
                        <TabsTrigger
                          value="availableOffers"
                          onClick={() => setActiveTab("availableOffers")}
                        >
                          View compatible orders
                        </TabsTrigger>
                      )}
                      {activeTab === "searchOffers" ? (
                        <TabsTrigger
                          value="searchOffers"
                          style={activeTabStyle}
                        >
                          Searching
                        </TabsTrigger>
                      ) : (
                        <TabsTrigger
                          value="searchOffers"
                          onClick={() => setActiveTab("searchOffers")}
                        >
                          Search
                        </TabsTrigger>
                      )}
                    </TabsList>
                    <TabsContent value="allOffers">
                      <List
                        height={500}
                        itemCount={offers.length}
                        itemSize={225}
                        className="w-full"
                      >
                        {OfferRow}
                      </List>
                    </TabsContent>
                    <TabsContent value="availableOffers"></TabsContent>
                    <TabsContent value="searchOffers"></TabsContent>
                  </Tabs>
                </>
              ) : (
                <>Loading offers...</>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? (
            <CurrentUser usr={usr} />
          ) : null}
        </div>
      </div>
    </>
  );
}
