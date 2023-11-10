import React, { useState, useEffect, useSyncExternalStore } from "react";
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

import CurrentUser from "./common/CurrentUser.jsx";

import { createMarketsStore } from "../effects/Market.ts";

export default function Featured(properties) {
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  //useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const [retrievedMarkets, setRetrievedMarkets] = useState();
  useEffect(() => {
    let unsubscribeMarkets;

    if (usr && usr.chain && usr.chain.length) {
      const marketsStore = createMarketsStore(usr.chain);

      unsubscribeMarkets = marketsStore.subscribe(({ data, loading, error }) => {
        if (data && !error && !loading) {
          setRetrievedMarkets(data);
        }
      });
    }

    return () => {
      if (unsubscribeMarkets) unsubscribeMarkets();
    };
  }, [usr, createMarketsStore]);

  const [marketRows, setMarketRows] = useState();
  useEffect(() => {
    if (retrievedMarkets && retrievedMarkets.length) {
      setMarketRows(
        retrievedMarkets.map((market) => (
          <a
            href={`/dex/index.html?market=${market.pair.replace("/", "_")}`}
            key={market.pair.replace("/", "_")}
          >
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
                These market trading pairs are the highest volume in the last 24 hours.
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
                  <div className="grid grid-cols-1 gap-2 text-center">{marketRows}</div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}
        </div>
      </div>
    </>
  );
}
