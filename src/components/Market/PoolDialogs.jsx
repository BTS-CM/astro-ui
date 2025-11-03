import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { List } from "react-window";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $blockList } from "@/stores/blocklist.ts";

export default function PoolDialogs(properties) {
  const { assetA, assetB, assetAData, assetBData, chain } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const { _assetsBTS, _assetsTEST, _poolsBTS, _poolsTEST } = properties;

  useInitCache(chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (chain && (_assetsBTS || _assetsTEST)) {
      return chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, chain]);

  const pools = useMemo(() => {
    if (!chain || (!_poolsBTS && !_poolsTEST)) {
      return [];
    }

    if (chain !== "bitshares") {
      return _poolsTEST;
    }

    const relevantPools = _poolsBTS.filter((pool) => {
      const poolShareAsset = assets.find(
        (asset) => asset.id === pool.share_asset_id
      );
      if (!poolShareAsset) return false;
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(poolShareAsset.issuer)))
      );
    });

    return relevantPools;
  }, [assets, _poolsBTS, _poolsTEST, chain]);

  const [assetAPools, setAssetAPools] = useState();
  const [assetBPools, setAssetBPools] = useState();
  const [assetMarketPools, setAssetMarketPools] = useState();

  useEffect(() => {
    function fetchAssetAPools() {
      //console.log("Processing asset A pools");
      const foundPools = pools.filter(
        (pool) =>
          pool.asset_a_symbol === assetA || pool.asset_b_symbol === assetA
      );
      setAssetAPools(foundPools);
    }
    if (pools && assetA) {
      fetchAssetAPools();
    }
  }, [pools, assetA]);

  useEffect(() => {
    function fetchAssetBPools() {
      //console.log("Processing asset B pools");
      const foundPools = pools.filter(
        (pool) =>
          pool.asset_a_symbol === assetB || pool.asset_b_symbol === assetB
      );
      setAssetBPools(foundPools);
    }

    if (pools && assetB) {
      fetchAssetBPools();
    }
  }, [pools, assetB]);

  useEffect(() => {
    function fetchAssetMarketPools() {
      // Searching for market matching pools
      //console.log("Processing asset market pools");
      const foundPools = pools.filter(
        (pool) =>
          (pool.asset_a_symbol === assetA && pool.asset_b_symbol === assetB) ||
          (pool.asset_a_symbol === assetB && pool.asset_b_symbol === assetA)
      );
      setAssetMarketPools(foundPools && foundPools.length ? foundPools : []);
    }

    if (pools && assetA && assetB) {
      fetchAssetMarketPools();
    }
  }, [pools, assetA, assetB]);

  function RowHyperlink({
    id,
    share_asset_symbol,
    asset_a_symbol,
    asset_b_symbol,
  }) {
    return (
      <>
        <div className="hidden md:grid md:grid-cols-10 hover:bg-slate-100">
          <div className="col-span-1">
            <p>{id}</p>
          </div>
          <div className="col-span-3">
            <p>{share_asset_symbol}</p>
          </div>
          <div className="col-span-3">
            <p>{asset_a_symbol}</p>
          </div>
          <div className="col-span-3">
            <p>{asset_b_symbol}</p>
          </div>
        </div>
        <div
          className="grid md:hidden grid-cols-10 hover:bg-slate-100"
          title={share_asset_symbol}
        >
          <div className="col-span-2">
            <p>{id}</p>
          </div>
          <div className="col-span-4">
            <p>{asset_a_symbol}</p>
          </div>
          <div className="col-span-4">
            <p>{asset_b_symbol}</p>
          </div>
        </div>
      </>
    );
  }

  const PoolRowA = ({ index, style }) => {
    const pool = assetAPools[index];
    return (
      <a
        style={style}
        href={`/swap/index.html?pool=${pool.id}`}
        key={`a_${pool.id}`}
      >
        <RowHyperlink
          id={pool.id}
          share_asset_symbol={pool.share_asset_symbol}
          asset_a_symbol={pool.asset_a_symbol}
          asset_b_symbol={pool.asset_b_symbol}
        />
      </a>
    );
  };

  const PoolRowB = ({ index, style }) => {
    const pool = assetBPools[index];
    return (
      <a
        style={style}
        href={`/swap/index.html?pool=${pool.id}`}
        key={`a_${pool.id}`}
      >
        <RowHyperlink
          id={pool.id}
          share_asset_symbol={pool.share_asset_symbol}
          asset_a_symbol={pool.asset_a_symbol}
          asset_b_symbol={pool.asset_b_symbol}
        />
      </a>
    );
  };

  const PoolRowMarket = ({ index, style }) => {
    const pool = assetMarketPools[index];
    return (
      <a
        style={style}
        href={`/swap/index.html?pool=${pool.id}`}
        key={`a_${pool.id}`}
      >
        <RowHyperlink
          id={pool.id}
          share_asset_symbol={pool.share_asset_symbol}
          asset_a_symbol={pool.asset_a_symbol}
          asset_b_symbol={pool.asset_b_symbol}
        />
      </a>
    );
  };

  function PoolDialog({
    title,
    poolArray,
    dialogTitle,
    dialogDescription,
    type,
  }) {
    if (!poolArray) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{t("PoolDialogs:loadingMessage")}</CardDescription>
          </CardHeader>
        </Card>
      );
    }
    if (!poolArray.length) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {t("PoolDialogs:noPoolsFoundMessage")}
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    let PoolRow;
    if (type === "A") {
      PoolRow = PoolRowA;
    } else if (type === "B") {
      PoolRow = PoolRowB;
    } else {
      PoolRow = PoolRowMarket;
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Card>
            <CardHeader className="pb-3 pt-3">
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                {t("PoolDialogs:poolsFound", {
                  count: poolArray && poolArray.length,
                })}
              </CardDescription>
            </CardHeader>
          </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] bg-white">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1">
            <div className="hidden md:grid md:grid-cols-10">
              <div className="col-span-1">{t("PoolDialogs:idColumnTitle")}</div>
              <div className="col-span-3">
                {t("PoolDialogs:shareAssetColumnTitle")}
              </div>
              <div className="col-span-3">
                {t("PoolDialogs:assetAColumnTitle")}
              </div>
              <div className="col-span-3">
                {t("PoolDialogs:assetBColumnTitle")}
              </div>
            </div>
            <div className="grid md:hidden grid-cols-10">
              <div className="col-span-2">{t("PoolDialogs:idColumnTitle")}</div>
              <div className="col-span-4">
                {t("PoolDialogs:assetAColumnTitle")}
              </div>
              <div className="col-span-4">
                {t("PoolDialogs:assetBColumnTitle")}
              </div>
            </div>
            <div className="w-full max-h-[300px] overflow-auto">
              <List
                rowComponent={PoolRow}
                rowCount={poolArray.length}
                rowHeight={35}
                rowProps={{}}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-3">
      <HoverCard key="hover_a">
        <HoverCardTrigger asChild>
          <div>
            <PoolDialog
              title={t("PoolDialogs:assetAPoolsTitle", {
                assetA: assetA && assetA.length < 12 ? assetA : assetAData.id,
              })}
              poolArray={assetAPools}
              dialogTitle={t("PoolDialogs:assetAPoolsDialogTitle", { assetA })}
              dialogDescription={t("PoolDialogs:assetAPoolsDialogDescription", {
                assetA,
                assetAId: assetAData.id,
              })}
              type="A"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-60">
          {t("PoolDialogs:assetAHoverCardContent", { assetA })}
        </HoverCardContent>
      </HoverCard>
      <HoverCard key="hover_b">
        <HoverCardTrigger asChild>
          <div>
            <PoolDialog
              title={t("PoolDialogs:marketPoolsTitle")}
              poolArray={assetMarketPools}
              dialogTitle={t("PoolDialogs:marketPoolsDialogTitle", {
                assetA,
                assetB,
              })}
              dialogDescription={t("PoolDialogs:marketPoolsDialogDescription", {
                assetA,
                assetB,
              })}
              type="Market"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-60">
          {t("PoolDialogs:marketHoverCardContent", { assetA, assetB })}
        </HoverCardContent>
      </HoverCard>
      <HoverCard key="hover_c">
        <HoverCardTrigger asChild>
          <div>
            <PoolDialog
              title={t("PoolDialogs:assetBPoolsTitle", {
                assetB: assetB && assetB.length < 12 ? assetB : assetBData.id,
              })}
              poolArray={assetBPools}
              dialogTitle={t("PoolDialogs:assetBPoolsDialogTitle", { assetB })}
              dialogDescription={t("PoolDialogs:assetBPoolsDialogDescription", {
                assetB,
                assetBId: assetBData.id,
              })}
              type="B"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-60">
          {t("PoolDialogs:assetBHoverCardContent", { assetB })}
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
