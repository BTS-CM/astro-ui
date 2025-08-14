import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { FixedSizeList as List } from "react-window";

import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex as toHex } from "@noble/hashes/utils";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { $poolTrackers, updateTrackers } from "@/stores/poolTracker";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentUser } from "@/stores/users";
import { $currentNode } from "@/stores/node.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import BasicAssetDropDownCard from "@/components/Market/BasicAssetDropDownCard.jsx";
import { humanReadableFloat } from "@/bts/common";

export default function CustomPoolOverview(properties) {
  const {
    _assetsBTS,
    _assetsTEST,
    _poolsBTS,
    _poolsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
  } = properties;

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && assets && assets.length) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setUsrBalances(filteredData);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assets]);

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);

  const pools = useMemo(() => {
    if (!_chain || !blocklist || (!_poolsBTS && !_poolsTEST)) {
      return [];
    }

    if (_chain !== "bitshares") {
      return _poolsTEST;
    }

    const relevantPools = _poolsBTS.filter((pool) => {
      const poolShareAsset = assets.find(
        (asset) => asset.id === pool.share_asset_id
      );
      if (!poolShareAsset) return false;
      return !blocklist.users.includes(toHex(sha256(poolShareAsset.issuer)));
    });

    return relevantPools;
  }, [assets, blocklist, _poolsBTS, _poolsTEST, _chain]);

  const [sellingAsset, setSellingAsset] = useState(null);
  const [buyingAsset, setBuyingAsset] = useState(null);

  const buyingAssetData = useMemo(() => {
    if (!assets || !buyingAsset) {
      return null;
    }
    return assets.find((asset) => asset.symbol === buyingAsset);
  }, [assets, buyingAsset]);

  const sellingAssetData = useMemo(() => {
    if (!assets || !sellingAsset) {
      return null;
    }
    return assets.find((asset) => asset.symbol === sellingAsset);
  }, [assets, sellingAsset]);

  const remainingPools = useMemo(() => {
    if (!pools || !assets) {
      return null;
    }

    let _remainingPools = pools;

    if (buyingAssetData || sellingAssetData) {
      _remainingPools = pools.filter((pool) => {
        const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
        const assetB = assets.find((asset) => asset.id === pool.asset_b_id);

        if (!assetA || !assetB) {
          return false;
        }

        const matchesBuyingAsset = buyingAssetData
          ? assetA.symbol === buyingAssetData.symbol ||
            assetB.symbol === buyingAssetData.symbol
          : true;

        const matchesSellingAsset = sellingAssetData
          ? assetA.symbol === sellingAssetData.symbol ||
            assetB.symbol === sellingAssetData.symbol
          : true;

        if (buyingAssetData && !sellingAssetData) {
          return matchesBuyingAsset;
        }

        if (!buyingAssetData && sellingAssetData) {
          return matchesSellingAsset;
        }

        return matchesBuyingAsset && matchesSellingAsset;
      });
    }

    return _remainingPools;
  }, [pools, assets, buyingAssetData, sellingAssetData]);

  const PoolRow = ({ index, style }) => {
    const pool = remainingPools[index];
    const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
    const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
    const shareAsset = assets.find((asset) => asset.id === pool.share_asset_id);

    if (!assetA || !assetB || !shareAsset) {
      return null;
    }

    return (
      <div style={style} key={`poolNo${index}`}>
        <Dialog>
          <DialogTrigger asChild>
            <Card className="hover:bg-purple-100">
              <CardHeader className="p-0">
                <CardDescription>
                  <div className="grid grid-cols-8 gap-2">
                    <div className="flex items-center justify-center">
                      {pool.id}
                    </div>
                    <div className="flex items-center justify-center">
                      {shareAsset.symbol}
                    </div>
                    <div className="flex items-center justify-center">
                      {assetA.symbol}
                    </div>
                    <div className="flex items-center justify-center">
                      {humanReadableFloat(pool.balance_a, assetA.precision)}
                    </div>
                    <div className="flex items-center justify-center">
                      {assetB.symbol}
                    </div>
                    <div className="flex items-center justify-center">
                      {humanReadableFloat(pool.balance_b, assetB.precision)}
                    </div>
                    <div className="flex items-center justify-center">
                      {pool.taker_fee_percent / 100}%
                    </div>
                    <div className="flex items-center justify-center">
                      {pool.withdrawal_fee_percent / 100}%
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("PoolList:dialogTitle", { id: pool.id })}
              </DialogTitle>
              <DialogDescription>
                {t("PoolList:dialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <h2>{shareAsset.symbol}</h2>
              </div>
              <a href={`/swap/index.html?pool=${pool.id}`}>
                <Button variant="outline" className="w-full">
                  {t("PoolList:simpleSwap")}
                </Button>
              </a>
              <a href={`/stake/index.html?pool=${pool.id}`}>
                <Button variant="outline" className="w-full">
                  {t("PoolList:stakeAssets")}
                </Button>
              </a>
              <a href={`/dex/index.html?market=${shareAsset.symbol}_BTS`}>
                <Button variant="outline" className="w-full">
                  {t("PoolList:buyPoolShareAsset")}
                </Button>
              </a>
            </div>
            {[assetA, assetB].map((asset, index) => {
              return (
                <div
                  className="grid grid-cols-2 gap-2"
                  key={`assetInternalLinks${index}`}
                >
                  <div className="col-span-2">
                    <h2>{asset.symbol}</h2>
                  </div>
                  <a
                    href={`/dex/index.html?market=${asset.symbol}_${
                      asset.symbol === "BTS" ? "HONEST.USD" : "BTS"
                    }`}
                  >
                    <Button variant="outline" className="w-full">
                      {t(`PoolList:buyAsset`)}
                    </Button>
                  </a>
                  <a
                    href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${
                      asset.symbol ?? ""
                    }`}
                  >
                    <Button variant="outline" className="w-full">
                      {t(`PoolList:borrowAsset`)}
                    </Button>
                  </a>
                  {asset.bitasset_data_id ? (
                    <a href={`/smartcoin/index.html?id=${asset.id}`}>
                      <Button variant="outline" className="w-full">
                        {t("PoolList:issueAsset")}
                      </Button>
                    </a>
                  ) : null}
                </div>
              );
            })}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <Card className="p-2">
        <CardHeader>
          <CardTitle>{t("PoolList:title")}</CardTitle>
          <CardDescription>{t("PoolList:description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <HoverInfo
                  content={t("CustomPoolOverview:hoverBuyingContent")}
                  header={t("CustomPoolOverview:hoverBuyingHeader")}
                />
                <BasicAssetDropDownCard
                  assetSymbol={buyingAsset ?? ""}
                  assetData={buyingAssetData}
                  storeCallback={setBuyingAsset}
                  otherAsset={sellingAsset}
                  marketSearch={marketSearch}
                  type={"base"}
                  size="small"
                  chain={_chain}
                  borrowPositions={[]}
                  usrBalances={usrBalances}
                />
              </div>
              <div>
                <HoverInfo
                  content={t("CustomPoolOverview:hoverSellingContent")}
                  header={t("CustomPoolOverview:hoverSellingHeader")}
                />
                <BasicAssetDropDownCard
                  assetSymbol={sellingAsset ?? ""}
                  assetData={sellingAssetData}
                  storeCallback={setSellingAsset}
                  otherAsset={buyingAsset}
                  marketSearch={marketSearch}
                  type={"base"}
                  size="small"
                  chain={_chain}
                  borrowPositions={[]}
                  usrBalances={usrBalances}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="w-1/2 mt-5"
                  onClick={() => {
                    setBuyingAsset(null);
                    setSellingAsset(null);
                  }}
                >
                  {t("CustomPoolOverview:reset")}
                </Button>
              </div>
            </div>
            <HoverInfo
              content={t("CustomPoolOverview:hoverPoolDetailsContent")}
              header={t("CustomPoolOverview:hoverPoolDetailsHeader")}
            />
            <div className="grid grid-cols-8 gap-2 text-center">
              <div>{t("CustomPoolOverview:poolId")}</div>
              <div>{t("CustomPoolOverview:shareAsset")}</div>
              <div>{t("CustomPoolOverview:assetA")}</div>
              <div>{t("CustomPoolOverview:assetAQty")}</div>
              <div>{t("CustomPoolOverview:assetB")}</div>
              <div>{t("CustomPoolOverview:assetBQty")}</div>
              <div>{t("CustomPoolOverview:takerFee")}</div>
              <div>{t("CustomPoolOverview:withdrawalFee")}</div>
            </div>
            <div className="border rounded border-gray-300 p-2">
              <List
                height={200}
                itemCount={remainingPools.length}
                itemSize={30}
                className="w-full"
              >
                {PoolRow}
              </List>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
