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

import { trimPrice, isInvertedMarket } from "@/lib/common";
import { createMarketTradeHistoryStore } from "@/nanoeffects/MarketTradeHistory.ts";
import { createMarketOrderStore } from "@/nanoeffects/MarketOrderBook.ts";

import HorizontalTradeCard from "./Market/HorizontalTradeCard.jsx";
import MarketOrderCard from "./Market/MarketOrderCard.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import PoolDialogs from "./Market/PoolDialogs.jsx";

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
  const [usrBalances, setUsrBalances] = useState(null);

  const invertedMarket = useMemo(() => {
    return isInvertedMarket(assetAData.id, assetBData.id);
  }, [assetAData, assetBData]);

  useEffect(() => {
    async function fetchMarketOrders() {
      const marketOrdersStore = createMarketOrderStore([
        usr.chain,
        assetA,
        assetB,
        50,
      ]);

      marketOrdersStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBuyOrders(data.bids);
          setSellOrders(data.asks);
        } else {
          setBuyOrders(null);
          setSellOrders(null);
        }
      });
    }

    if (usr && assetA && assetB) {
      fetchMarketOrders();
    }
  }, [usr, assetA, assetB]);

  useEffect(() => {
    async function fetchUsrBalances() {
      if (usr && usr.id) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setUsrBalances(filteredData);
          }
        });
      }
    }

    fetchUsrBalances();
  }, [usr]);

  const [clicked, setClicked] = useState(false);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="col-span-1">
            <div className="flex-grow mb-2">
              <Card>
                <CardHeader className="pt-2 pb-2">
                  <CardTitle className="text-lg">
                    {usr.chain === "bitshares"
                      ? "Bitshares "
                      : "Bitshares (Testnet) "}
                    Instant Trade
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
                      type={"quote"}
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
                      type={"base"}
                      size="small"
                      chain={usr.chain}
                      balances={balances}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/*

                <HorizontalTradeCard
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

              */}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 mt-5">
          {assetAData && assetBData ? (
            <>
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
                {sellOrders && !marketOrdersLoading ? (
                  <MarketOrderCard
                    cardType="sell"
                    assetA={assetA}
                    assetAData={assetAData}
                    assetB={assetB}
                    assetBData={assetBData}
                    marketOrders={sellOrders}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {/*assetA && assetB && assetAData && assetBData ? (
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
        ) : null*/}
      </div>
    </>
  );
}
