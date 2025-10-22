import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@nanostores/react";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createTopMarketsStore } from "@/nanoeffects/TopMarkets.ts";
import { $currentUser } from "@/stores/users.ts";
import PoolDialogs from "@/components/Market/PoolDialogs.jsx";

export default function Featured(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const chain = usr && usr.chain ? usr.chain : "bitshares";
  useInitCache(chain, []);

  const { _assetsBTS, _assetsTEST, _poolsBTS, _poolsTEST } = properties;
  const assets = useMemo(() => {
    if (chain && (_assetsBTS || _assetsTEST)) {
      return chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, chain]);
  const poolsBTS = _poolsBTS;
  const poolsTEST = _poolsTEST;

  const [retrievedMarkets, setRetrievedMarkets] = useState();
  useEffect(() => {
    async function fetchTopMarkets() {
      if (!(usr && usr.chain)) return;

      const marketsStore = createTopMarketsStore(usr.chain);
      marketsStore.subscribe(({ data, loading, error }) => {
        if (data && !error && !loading) {
          setRetrievedMarkets(data);
        }
      });
    }

    fetchTopMarkets();
  }, [usr]);

  const marketRows = useMemo(() => {
    if (!retrievedMarkets || !retrievedMarkets.length) return [];

    const Row = ({ market }) => {
      const pairUnderscore = market.pair.replace("/", "_");
      const [assetA, assetB] = market.pair.split("/");
      const assetAData = assets?.find?.((a) => a.symbol === assetA) || {
        id: assetA,
        symbol: assetA,
      };
      const assetBData = assets?.find?.((a) => a.symbol === assetB) || {
        id: assetB,
        symbol: assetB,
      };
      const [showPools, setShowPools] = useState(false);

      return (
        <div className="col-span-1 border-b-2 py-2" key={pairUnderscore}>
          <div className="grid grid-cols-4 gap-2 items-center">
            <a
              className="col-span-1 hover:underline"
              href={`/dex/index.html?market=${pairUnderscore}`}
            >
              {market.pair}
            </a>
            <a
              className="col-span-1"
              href={`/dex/index.html?market=${pairUnderscore}`}
            >
              {market["24h_volume"]}
            </a>
            <a
              className="col-span-1"
              href={`/dex/index.html?market=${pairUnderscore}`}
            >
              {market.nb_operations}
            </a>
            <div className="col-span-1 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPools((v) => !v)}
                title={t("PageHeader:pools")}
              >
                {t("PageHeader:pools")}
              </Button>
            </div>
          </div>
          {showPools ? (
            <div className="mt-2">
              <PoolDialogs
                assetA={assetA}
                assetB={assetB}
                assetAData={assetAData}
                assetBData={assetBData}
                chain={chain}
                _assetsBTS={_assetsBTS}
                _assetsTEST={_assetsTEST}
                _poolsBTS={poolsBTS}
                _poolsTEST={poolsTEST}
              />
            </div>
          ) : null}
        </div>
      );
    };

    return retrievedMarkets.map((market) => (
      <Row key={market.pair} market={market} />
    ));
  }, [
    retrievedMarkets,
    assets,
    chain,
    _assetsBTS,
    _assetsTEST,
    poolsBTS,
    poolsTEST,
    t,
  ]);

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
                  <div className="grid grid-cols-1 gap-2 text-center">
                    {marketRows}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
