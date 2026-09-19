import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  memo,
} from "react";
import { List } from "react-window";

import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { $poolTrackers, updateTrackers } from "@/stores/poolTracker";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentUser } from "@/stores/users";
import { $currentNodeUrl } from "@/stores/node.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { getAccountBalances } from "@/nanoeffects/UserBalances.ts";

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
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import { BarChart3, Plus, SearchX, TriangleAlert } from "lucide-react";

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";


const PoolRow = memo(function PoolRow({ index, style, remainingPools, assets, selectedPools, chosenPoolSwappableAssets, setSelectedPools }) {
  const pool = remainingPools[index];
  const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
  const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
  const shareAsset = assets.find((asset) => asset.id === pool.share_asset_id);

  if (!assetA || !assetB || !shareAsset) {
    return null;
  }

  return (
    <div
      style={{ ...style, overflow: "hidden" }}
      key={`poolNo${index}`}>
      <Card
        className="py-0 gap-0"
        onClick={() => {
          if (!selectedPools.includes(pool.id)) {
            const newAssets = [assetA.symbol, assetB.symbol].filter(
              (symbol) =>
                !chosenPoolSwappableAssets ||
                !chosenPoolSwappableAssets.includes(symbol)
            );

            if (
              chosenPoolSwappableAssets &&
              chosenPoolSwappableAssets.length + newAssets.length > 5
            ) {
              console.log("Unable to track more than 5 swappable assets.");
              return;
            }

            setSelectedPools([...selectedPools, pool.id]);
          }
        }}
      >
        <CardHeader className="p-0">
          <CardDescription>
            <div className="grid grid-cols-4 gap-2">
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
                {assetB.symbol}
              </div>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
});

const ChosenPoolRow = memo(function ChosenPoolRow({ index, style, chosenPools, assets, selectedPools, setSelectedPools }) {
  const pool = chosenPools[index];
  const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
  const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
  const shareAsset = assets.find((asset) => asset.id === pool.share_asset_id);

  if (!assetA || !assetB || !shareAsset) {
    return null;
  }

  return (
    <div
      style={{ ...style, overflow: "hidden" }}
      key={`poolNo${index}`}>
      <Card
        className="py-0 gap-0"
        onClick={() => {
          setSelectedPools(
            selectedPools.filter((poolId) => poolId !== pool.id)
          );
        }}
      >
        <CardHeader className="p-0">
          <CardDescription>
            <div className="grid grid-cols-4 gap-2">
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
                {assetB.symbol}
              </div>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
});

const TrackerRow = memo(function TrackerRow({ index, style, trackers, _chain, pools, assets, t }) {
  const _tracker = trackers[_chain][index];

  const _pools = _tracker.pools.map((poolId) =>
    pools.find((pool) => pool.id === poolId)
  );
  const _uniqueAssets = [];

  _pools.forEach((_pool) => {
    const _assetA = assets.find((asset) => asset.id === _pool.asset_a_id);
    const _assetB = assets.find((asset) => asset.id === _pool.asset_b_id);
    if (_assetA && !_uniqueAssets.includes(_assetA.symbol)) {
      _uniqueAssets.push(_assetA.symbol);
    }
    if (_assetB && !_uniqueAssets.includes(_assetB.symbol)) {
      _uniqueAssets.push(_assetB.symbol);
    }
  });

  const [deletePrompt, setDeletePrompt] = useState(false);

  return (
    <div
      style={{ ...style, overflow: "hidden" }}
      key={`poolTrackerNo${index}`}
      className="grid grid-cols-6 gap-2 items-center"
    >
      <div className="col-span-5">
        <a href={`/custom_pool_tracker.html?id=${_tracker.id}`}>
          <Card className="py-0 gap-0">
            <CardHeader className="pt-2 pb-2">
              <CardDescription>
                <b>{_tracker.name}</b>
                <br />
                <div className="grid grid-cols-1 gap-1">
                  <p>
                    {t("CustomPoolOverview:swappableAssets")}:{" "}
                    {_uniqueAssets.join(", ")}
                  </p>
                  <p>
                    {t("CustomPoolOverview:poolShareAssets")}:{" "}
                    {_pools
                      .map((x) =>
                        _pools.length > 4
                          ? x.id
                          : `${x.share_asset_symbol} (${x.id})`
                      )
                      .join(", ")}
                  </p>
                </div>
              </CardDescription>
            </CardHeader>
          </Card>
        </a>
      </div>
      <div className="flex items-center justify-center">
        <Dialog open={deletePrompt} onOpenChange={setDeletePrompt}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-3/4">
              {t("CustomPoolOverview:delete")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[375px] bg-card">
            <DialogHeader>
              <DialogTitle>{t("CustomPoolOverview:areYouSure")}</DialogTitle>
            </DialogHeader>
            <p>{t("CustomPoolOverview:deleteTracker")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  const updatedTrackers = trackers[_chain].filter(
                    (thisTracker) => thisTracker.name !== _tracker.name
                  );
                  updateTrackers(_chain, updatedTrackers);
                  setDeletePrompt(false);
                }}
              >
                {t("CustomPoolOverview:yes")}
              </Button>
              <Button
                onClick={() => {
                  setDeletePrompt(false);
                }}
                variant="outline"
              >
                {t("CustomPoolOverview:no")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
});

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
  const currentNodeUrl = useStore($currentNodeUrl);
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
    async function loadBalances() {
      if (!(usr && usr.id && assets && assets.length)) return;

      try {
        const data = await getAccountBalances(
          usr.chain,
          usr.id,
          currentNodeUrl || null
        );

        if (!data) return;

        const filteredData = data.filter((balance) =>
          assets.find((x) => x.id === balance.asset_id)
        );
        setUsrBalances(filteredData);
      } catch (e) {
        console.log({ e });
      }
    }

    loadBalances();
  }, [usr, assets, currentNodeUrl]);

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
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(poolShareAsset.issuer)))
      );
    });

    return relevantPools;
  }, [assets, blocklist, _poolsBTS, _poolsTEST, _chain]);

  const trackers = useStore($poolTrackers);
  const [modalOpen, setModalOpen] = useState(false);

  const [newTrackerTitle, setNewTrackerTitle] = useState("");
  const [selectedPools, setSelectedPools] = useState([]);
  const [nameError, setNameError] = useState(false);

  const chosenPools = useMemo(() => {
    if (!pools || !selectedPools || !selectedPools.length) {
      return null;
    }
    return pools.filter((pool) => selectedPools.includes(pool.id));
  }, [pools, selectedPools]);

  const chosenPoolSwappableAssets = useMemo(() => {
    if (!assets || !chosenPools || !chosenPools.length) {
      return null;
    }
    const _assets = [];
    chosenPools.forEach((pool) => {
      const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
      const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
      if (assetA && !_assets.includes(assetA.symbol)) {
        _assets.push(assetA.symbol);
      }
      if (assetB && !_assets.includes(assetB.symbol)) {
        _assets.push(assetB.symbol);
      }
    });
    return _assets;
  }, [assets, chosenPools]);

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
          return !selectedPools.includes(pool.id) && matchesBuyingAsset;
        }

        if (!buyingAssetData && sellingAssetData) {
          return !selectedPools.includes(pool.id) && matchesSellingAsset;
        }

        return (
          !selectedPools.includes(pool.id) &&
          matchesBuyingAsset &&
          matchesSellingAsset
        );
      });
    }

    if (chosenPoolSwappableAssets && chosenPoolSwappableAssets.length >= 4) {
      // only show pools which swap the max 5 trackable assets
      _remainingPools = _remainingPools.filter((pool) => {
        const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
        const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
        if (!assetA || !assetB) {
          return false;
        }
        return chosenPoolSwappableAssets.length >= 5
          ? chosenPoolSwappableAssets.includes(assetA.symbol) &&
              chosenPoolSwappableAssets.includes(assetB.symbol)
          : chosenPoolSwappableAssets.includes(assetA.symbol) ||
              chosenPoolSwappableAssets.includes(assetB.symbol);
      });
    }

    if (selectedPools && selectedPools.length) {
      _remainingPools = _remainingPools.filter(
        (pool) => !selectedPools.includes(pool.id)
      );
    }

    return _remainingPools;
  }, [
    pools,
    assets,
    selectedPools,
    buyingAssetData,
    sellingAssetData,
    chosenPoolSwappableAssets,
  ]);

  const poolRowProps = useMemo(() => ({ remainingPools, assets, selectedPools, chosenPoolSwappableAssets, setSelectedPools }), [remainingPools, assets, selectedPools, chosenPoolSwappableAssets, setSelectedPools]);
  const chosenPoolRowProps = useMemo(() => ({ chosenPools, assets, selectedPools, setSelectedPools }), [chosenPools, assets, selectedPools, setSelectedPools]);
  const trackerRowProps = useMemo(() => ({ trackers, _chain, pools, assets, t }), [trackers, _chain, pools, assets, t]);

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.2)] blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-2)/0.2)] blur-3xl"
        />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                  <BarChart3 className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                </span>
                {t("CustomPoolOverview:title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("CustomPoolOverview:description")}
              </p>
            </div>
          </div>
          <Card className="p-2 gap-0">
            {trackers && trackers[_chain] && trackers[_chain].length ? (
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-5 border rounded border-border p-3">
                  <div className="w-full h-[200px]">
                    <List
                      rowComponent={TrackerRow}
                      rowCount={trackers[_chain].length}
                      rowHeight={108}
                      height={200}
                      width="100%"
                      rowProps={trackerRowProps}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => setModalOpen(true)}
                  className="bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_32px_-12px_rgba(6,182,212,0.7)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))]"
                >
                  {t("CustomPoolOverview:createTracker")}
                </Button>
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia
                    variant="icon"
                    className="border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)]"
                  >
                    <BarChart3 className="h-5 w-5 text-[hsl(var(--accent-1-fg))]" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {t("CustomPoolOverview:noTrackersTitle")}
                  </EmptyTitle>
                  <EmptyDescription>
                    {t("CustomPoolOverview:noTrackersDescription")}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    onClick={() => setModalOpen(true)}
                    className="bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_32px_-12px_rgba(6,182,212,0.7)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))]"
                  >
                    <Plus className="h-4 w-4" />
                    {t("CustomPoolOverview:createTracker")}
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </Card>
        </div>
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[720px] bg-card">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.15)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-2)/0.15)] blur-3xl"
          />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
              </span>
              {t("CustomPoolOverview:creatingTracker")}
            </DialogTitle>
            <DialogDescription>
              {t("CustomPoolOverview:selectAssets")}
            </DialogDescription>
          </DialogHeader>
          <div className="relative grid grid-cols-1 gap-3">
            <HoverInfo
              content={t("CustomPoolOverview:hoverCreatingContent")}
              header={t("CustomPoolOverview:hoverCreatingHeader")}
            />
            <div>
              <Input
                type="text"
                placeholder={t("CustomPoolOverview:trackerName")}
                onChange={(e) => {
                  const sanitizedValue = e.target.value.replace(
                    /[^a-zA-Z0-9 .,!?-]/g,
                    ""
                  );
                  setNewTrackerTitle(sanitizedValue);
                  if (sanitizedValue) {
                    setNameError(false);
                  }
                }}
                onKeyUp={(e) => {
                  const sanitizedValue = e.target.value.replace(
                    /[^a-zA-Z0-9 .,!?-]/g,
                    ""
                  );
                  if (sanitizedValue !== e.target.value) {
                    e.target.value = sanitizedValue;
                  }
                }}
                className={`w-full ${
                  nameError
                    ? "border-[hsl(var(--accent-danger)/0.7)] focus-visible:ring-[hsl(var(--accent-danger)/0.4)]"
                    : ""
                }`}
              />
              {nameError ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--accent-danger-fg))]">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  {t("CustomPoolOverview:nameRequired")}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--accent-1))]" />
                  <HoverInfo
                    content={t("CustomPoolOverview:hoverBuyingContent")}
                    header={t("CustomPoolOverview:hoverBuyingHeader")}
                  />
                </div>
                <AssetDropDown
                  assetSymbol={buyingAsset ?? ""}
                  assetData={buyingAssetData}
                  storeCallback={(symbol) => {
                    setBuyingAsset(symbol);
                  }}
                  otherAsset={sellingAsset}
                  marketSearch={marketSearch}
                  type={"base"}
                  size="small"
                  chain={_chain}
                  balances={usrBalances}
                />
              </div>
              <div className="rounded-xl border border-[hsl(var(--accent-2)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.06)] to-transparent p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--accent-2))]" />
                  <HoverInfo
                    content={t("CustomPoolOverview:hoverSellingContent")}
                    header={t("CustomPoolOverview:hoverSellingHeader")}
                  />
                </div>
                <AssetDropDown
                  assetSymbol={sellingAsset ?? ""}
                  assetData={sellingAssetData}
                  storeCallback={(symbol) => {
                    setSellingAsset(symbol);
                  }}
                  otherAsset={buyingAsset}
                  marketSearch={marketSearch}
                  type={"base"}
                  size="small"
                  chain={_chain}
                  balances={usrBalances}
                />
              </div>
              <div className="flex items-end justify-end">
                <Button
                  variant="outline"
                  className="w-1/2 border-[hsl(var(--accent-1)/0.3)] hover:border-[hsl(var(--accent-1)/0.5)] hover:bg-[hsl(var(--accent-1)/0.1)]"
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
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>{t("CustomPoolOverview:poolId")}</div>
              <div>{t("CustomPoolOverview:shareAsset")}</div>
              <div>{t("CustomPoolOverview:assetA")}</div>
              <div>{t("CustomPoolOverview:assetB")}</div>
            </div>
            {remainingPools && remainingPools.length ? (
              <div className="border rounded border-border p-2">
                <div className="w-full h-[200px]">
                  <List
                    rowComponent={PoolRow}
                    rowCount={remainingPools.length}
                    rowHeight={26}
                    height={200}
                    width="100%"
                    rowProps={poolRowProps}
                  />
                </div>
              </div>
            ) : (
              <div className="border rounded border-dashed border-border bg-[hsl(var(--accent-1)/0.04)] p-6">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia
                      variant="icon"
                      className="border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)]"
                    >
                      <SearchX className="h-5 w-5 text-[hsl(var(--accent-1-fg))]" />
                    </EmptyMedia>
                    <EmptyTitle>
                      {t("CustomPoolOverview:noPoolsToTrackTitle")}
                    </EmptyTitle>
                    <EmptyDescription>
                      {t("CustomPoolOverview:noPoolsToTrackDescription")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
            <HoverInfo
              content={t("CustomPoolOverview:hoverSelectedPoolDetailsContent")}
              header={t("CustomPoolOverview:hoverSelectedPoolDetailsHeader")}
            />
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>{t("CustomPoolOverview:poolId")}</div>
              <div>{t("CustomPoolOverview:shareAsset")}</div>
              <div>{t("CustomPoolOverview:assetA")}</div>
              <div>{t("CustomPoolOverview:assetB")}</div>
            </div>
            <div className="w-full h-[200px] border rounded border-border p-2">
              <List
                height={200}
                width="100%"
                rowComponent={ChosenPoolRow}
                rowCount={selectedPools.length}
                rowHeight={26}
                rowProps={chosenPoolRowProps}
              />
            </div>
            <Button
              onClick={() => {
                if (!newTrackerTitle) {
                  setNameError(true);
                  return;
                }
                setNameError(false);

                const existingTracker = trackers[_chain].find(
                  (tracker) => tracker.name === newTrackerTitle
                );
                if (existingTracker) {
                  console.log(t("CustomPoolOverview:trackerExists"));
                  return;
                }

                if (!selectedPools.length) {
                  console.log(t("CustomPoolOverview:noPoolsSelected"));
                  return;
                }

                const newTracker = {
                  name: newTrackerTitle,
                  pools: selectedPools,
                  chain: _chain,
                  id: toHex(sha256(utf8ToBytes(newTrackerTitle))),
                };

                const updatedTrackers = [...trackers[_chain], newTracker];
                updateTrackers(_chain, updatedTrackers);

                setModalOpen(false);
              }}
              className="bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_32px_-12px_rgba(6,182,212,0.7)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))]"
            >
              {t("CustomPoolOverview:create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
