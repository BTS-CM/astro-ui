import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
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

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";

import CurrentUser from "./common/CurrentUser.jsx";

import { createMarketsStore } from "../effects/Market.ts";

export default function Featured(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const [retrievedMarkets, setRetrievedMarkets] = useState();
  useEffect(() => {
    let unsubscribeMarkets;

    if (usr && usr.chain && usr.chain.length) {
      let marketsStore;
      try {
        marketsStore = createMarketsStore(usr.chain);
      } catch (e) {
        console.log(e);
        return;
      }

      unsubscribeMarkets = marketsStore
        ? marketsStore.subscribe(({ data, loading, error }) => {
            if (data && !error && !loading) {
              setRetrievedMarkets(data);
            }
          })
        : null;
    }

    return () => {
      if (unsubscribeMarkets) unsubscribeMarkets();
    };
  }, [usr]);

  const marketRows = useMemo(() => {
    if (retrievedMarkets && retrievedMarkets.length) {
      return retrievedMarkets.map((market) => (
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
      ));
    }
  }, [retrievedMarkets]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("Featured:cardTitle")}</CardTitle>
              <CardDescription>{t("Featured:cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {marketRows && marketRows.length ? (
                <>
                  <div className="grid grid-cols-1">
                    <div className="col-span-1">
                      <div className="grid grid-cols-3 gap-1 text-center border-b-2">
                        <div className="col-span-1">
                          <b>{t("Featured:marketTradingPair")}</b>
                        </div>
                        <div className="col-span-1">
                          <b>{t("Featured:hourVolume")}</b>
                        </div>
                        <div className="col-span-1">
                          <b>{t("Featured:trades")}</b>
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
      </div>
    </>
  );
}
