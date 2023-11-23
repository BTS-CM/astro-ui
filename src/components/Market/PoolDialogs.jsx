import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { FixedSizeList as List } from "react-window";

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

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { $poolCacheBTS, $poolCacheTEST } from "../../stores/cache.ts";

export default function PoolDialogs(properties) {
  const { assetA, assetB, assetAData, assetBData, chain } = properties;

  const _poolsBTS = useSyncExternalStore($poolCacheBTS.subscribe, $poolCacheBTS.get, () => true);
  const _poolsTEST = useSyncExternalStore($poolCacheTEST.subscribe, $poolCacheTEST.get, () => true);

  const pools = useMemo(() => {
    if (chain && (_poolsBTS || _poolsTEST)) {
      return chain === "bitshares" ? _poolsBTS : _poolsTEST;
    }
    return [];
  }, [_poolsBTS, _poolsTEST, chain]);

  const [assetAPools, setAssetAPools] = useState();
  const [assetBPools, setAssetBPools] = useState();
  const [assetMarketPools, setAssetMarketPools] = useState();

  useEffect(() => {
    function fetchAssetAPools() {
      //console.log("Processing asset A pools");
      const foundPools = pools.filter(
        (pool) => pool.asset_a_symbol === assetA || pool.asset_b_symbol === assetA
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
        (pool) => pool.asset_a_symbol === assetB || pool.asset_b_symbol === assetB
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

  function RowHyperlink({ id, share_asset_symbol, asset_a_symbol, asset_b_symbol }) {
    return (
      <div className="grid grid-cols-10">
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
    );
  }

  const PoolRowA = ({ index, style }) => {
    const pool = assetAPools[index];
    return (
      <a style={style} href={`/pool/index.html?pool=${pool.id}`} key={`a_${pool.id}`}>
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
      <a style={style} href={`/pool/index.html?pool=${pool.id}`} key={`a_${pool.id}`}>
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
      <a style={style} href={`/pool/index.html?pool=${pool.id}`} key={`a_${pool.id}`}>
        <RowHyperlink
          id={pool.id}
          share_asset_symbol={pool.share_asset_symbol}
          asset_a_symbol={pool.asset_a_symbol}
          asset_b_symbol={pool.asset_b_symbol}
        />
      </a>
    );
  };

  function PoolDialog({ title, poolArray, dialogTitle, dialogDescription, type }) {
    if (!poolArray) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{title}</CardTitle>
            <CardDescription>loading...</CardDescription>
          </CardHeader>
        </Card>
      );
    }
    if (!poolArray.length) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{title}</CardTitle>
            <CardDescription>0 pools found</CardDescription>
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
              <CardDescription>{poolArray && poolArray.length} pools found</CardDescription>
            </CardHeader>
          </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] bg-white">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1">
            <div className="grid grid-cols-10">
              <div className="col-span-1">id</div>
              <div className="col-span-3">Share asset</div>
              <div className="col-span-3">Asset A</div>
              <div className="col-span-3">Asset B</div>
            </div>
            <List height={300} itemCount={poolArray.length} itemSize={35} className="w-full">
              {PoolRow}
            </List>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-5 mt-5">
      <HoverCard key="hover_a">
        <HoverCardTrigger asChild>
          <div>
            <PoolDialog
              title={`${assetA && assetA.length < 12 ? assetA : assetAData.id} Pools`}
              poolArray={assetAPools}
              dialogTitle={`${assetA} Pools`}
              dialogDescription={`These Bitshares pools use ${assetA} (${assetAData.id}) as one of the assets.`}
              type="A"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-60">
          Swap {assetA} using one of these liquidity pools
        </HoverCardContent>
      </HoverCard>
      <HoverCard key="hover_b">
        <HoverCardTrigger asChild>
          <div>
            <PoolDialog
              title={`Market Pools`}
              poolArray={assetMarketPools}
              dialogTitle={`${assetA}/${assetB} Pools`}
              dialogDescription={`These pools trade between ${assetA} and ${assetB}.`}
              type="Market"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-60">
          Swap between {assetA} and {assetB} using one of these liquidity pools
        </HoverCardContent>
      </HoverCard>
      <HoverCard key="hover_c">
        <HoverCardTrigger asChild>
          <div>
            <PoolDialog
              title={`${assetB && assetB.length < 12 ? assetB : assetBData.id} Pools`}
              poolArray={assetBPools}
              dialogTitle={`${assetB} Pools`}
              dialogDescription={`These Bitshares pools use ${assetB} (${assetBData.id})  as one of the assets.`}
              type="B"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-60">
          Swap {assetB} using one of these liquidity pools
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
