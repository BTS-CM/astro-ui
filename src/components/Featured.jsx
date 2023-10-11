import React, { useState, useEffect, useSyncExternalStore } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { eraseCurrentUser } from "../stores/users.ts";
import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";

import CurrentUser from "./common/CurrentUser.jsx";

export default function Featured(properties) {
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares");

  const [retrievedMarkets, setRetrievedMarkets] = useState();
  useEffect(() => {
    async function getMarkets(chain) {
      const response = await fetch(
        `http://localhost:8080/api/getFeaturedMarkets/${chain}`,
        { method: "GET" }
      );

      if (!response.ok) {
        console.log("Failed to fetch featured market data");
        return;
      }

      const responseContents = await response.json();

      if (
        responseContents &&
        responseContents.result &&
        responseContents.result.length
      ) {
        setRetrievedMarkets(responseContents.result);
      }
    }

    if (usr && usr.chain && usr.chain.length) {
      getMarkets(usr.chain);
    }
  }, [usr]);

  const [marketRows, setMarketRows] = useState();
  useEffect(() => {
    if (retrievedMarkets && retrievedMarkets.length) {
      setMarketRows(
        retrievedMarkets.map((market) => (
          <a href={`/dex/index.html?market=${market.pair.replace("/", "_")}`}>
            <div className="col-span-1 border-b-2">
              <div className="grid grid-cols-3 gap-1">
                <div className="col-span-1">{market.pair}</div>
                <div className="col-span-1">{market["24h_volume"]}</div>
                <div className="col-span-1">{market.nb_operations}</div>
              </div>
            </div>
          </a>
        ))
      );
    }
  }, [retrievedMarkets]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Featured market trading pairs</CardTitle>
              <CardDescription>
                These market trading pairs are the highest volume in the last 24
                hours.
                <br />
                Click on a market trading pair below to go to its market page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {marketRows && marketRows.length ? (
                <>
                  <div className="grid grid-cols-1">
                    <div className="col-span-1">
                      <div className="grid grid-cols-3 gap-1 text-center border-b-2">
                        <div className="col-span-1">
                          <b>Market trading pair</b>
                        </div>
                        <div className="col-span-1">
                          <b>24 Hour volume</b>
                        </div>
                        <div className="col-span-1">
                          <b>Trades</b>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-center">
                    {marketRows}
                  </div>
                </>
              ) : null}
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
