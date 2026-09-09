import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  memo,
} from "react";
import { List } from "react-window";

import { useChainObjectsLive } from "@/hooks/useChainObjectsLive";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";

import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
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

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import BasicAssetDropDownCard from "@/components/Market/BasicAssetDropDownCard.jsx";
import { humanReadableFloat } from "@/bts/common";
import {
  Droplets,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  X,
  ArrowUpRight,
  ExternalLink,
  Coins,
  RefreshCw,
} from "lucide-react";

function extractPoolNum(id) {
  const parts = id.split(".");
  return parseInt(parts[parts.length - 1], 10) || 0;
}

const PoolRow = memo(function PoolRow({ index, style, remainingPools, assets, t }) {
  const pool = remainingPools[index];
  const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
  const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
  const shareAsset = assets.find((asset) => asset.id === pool.share_asset_id);

  if (!assetA || !assetB || !shareAsset) {
    return null;
  }

  const takerFee = pool.taker_fee_percent / 100;
  const withdrawalFee = pool.withdrawal_fee_percent / 100;

  return (
    <div style={style} key={`poolNo${index}`}>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="w-full px-2 text-left rounded-md border border-transparent hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)] dark:hover:bg-[hsl(var(--accent-1)/0.1)] transition-all duration-150 cursor-pointer group focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent-1)/0.5)]"
          >
            <div className="grid grid-cols-[3fr_3fr_1fr_1fr_3fr_1fr] gap-2 items-center text-sm">
              <div className="flex items-center gap-1.5 min-w-0 px-1">
                <span className="font-semibold text-foreground truncate">
                  {assetA.symbol}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-semibold text-foreground truncate">
                  {assetB.symbol}
                </span>
              </div>

              <div className="flex items-center gap-1 min-w-0 justify-center tabular-nums">
                <span className="text-xs text-muted-foreground truncate">
                  {humanReadableFloat(pool.balance_a, assetA.precision)}
                </span>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-xs text-muted-foreground truncate">
                  {humanReadableFloat(pool.balance_b, assetB.precision)}
                </span>
              </div>

              <div className="flex items-center justify-center">
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 font-medium tabular-nums"
                >
                  {takerFee}%
                </Badge>
              </div>

              <div className="flex items-center justify-center">
                {withdrawalFee > 0 ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 font-medium tabular-nums"
                  >
                    {withdrawalFee}%
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>

              <div className="text-xs text-muted-foreground truncate text-center">
                {shareAsset.symbol}
              </div>

              <div className="text-xs text-muted-foreground tabular-nums text-center">
                #{pool.id}
              </div>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px] bg-card max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)]">
                <Droplets className="h-3.5 w-3.5 text-[hsl(var(--accent-1))]" />
              </span>
              {assetA.symbol}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              {assetB.symbol}
            </DialogTitle>
            <DialogDescription>
              {t("PoolList:dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                  {t("CustomPoolOverview:poolId")}
                </div>
                <div className="font-mono text-sm font-medium">{pool.id}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                  {t("CustomPoolOverview:shareAsset")}
                </div>
                <div className="font-mono text-sm font-medium truncate">
                  {shareAsset.symbol}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
                {t("PoolList:details")}
              </div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-bold py-1.5 px-2">
                      {assetA.symbol}
                    </TableCell>
                    <TableCell className="py-1.5 px-2 tabular-nums">
                      {humanReadableFloat(pool.balance_a, assetA.precision)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold py-1.5 px-2">
                      {assetB.symbol}
                    </TableCell>
                    <TableCell className="py-1.5 px-2 tabular-nums">
                      {humanReadableFloat(pool.balance_b, assetB.precision)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold py-1.5 px-2">
                      {t("CustomPoolOverview:takerFee")}
                    </TableCell>
                    <TableCell className="py-1.5 px-2">{takerFee}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold py-1.5 px-2">
                      {t("CustomPoolOverview:withdrawalFee")}
                    </TableCell>
                    <TableCell className="py-1.5 px-2">
                      {withdrawalFee}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Separator />

            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
                Pool Actions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a href={`/swap.html?pool=${pool.id}`}>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("PoolList:simpleSwap")}
                  </Button>
                </a>
                <a href={`/stake.html?pool=${pool.id}`}>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Coins className="h-3.5 w-3.5" />
                    {t("PoolList:stakeAssets")}
                  </Button>
                </a>
                <a href={`/dex.html?market=${shareAsset.symbol}_BTS`}>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {t("PoolList:buyPoolShareAsset")}
                  </Button>
                </a>
              </div>
            </div>

            {[assetA, assetB].map((asset, index) => {
              return (
                <div key={`assetInternalLinks${index}`}>
                  <Separator />
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 mt-1">
                    {asset.symbol}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <a
                      href={`/dex.html?market=${asset.symbol}_${
                        asset.symbol === "BTS" ? "HONEST.USD" : "BTS"
                      }`}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-1.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t("PoolList:buyAsset")}
                      </Button>
                    </a>
                    <a
                      href={`/borrow.html?tab=searchOffers&searchTab=borrow&searchText=${
                        asset.symbol ?? ""
                      }`}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-1.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t("PoolList:borrowAsset")}
                      </Button>
                    </a>
                    {asset.bitasset_data_id ? (
                      <a href={`/smartcoin.html?id=${asset.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-1.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t("PoolList:issueAsset")}
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
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
    async function fetchUsrBalances() {
      if (!(usr && usr.id && assets && assets.length)) {
        setUsrBalances([]);
        return;
      }

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

    fetchUsrBalances();
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
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(poolShareAsset.issuer)))
      );
    });

    return relevantPools;
  }, [assets, blocklist, _poolsBTS, _poolsTEST, _chain]);

  // Live pool balances subscription - overrides build-time balance_a/balance_b
  const poolIds = useMemo(() => pools.map((p) => p.id), [pools]);
  const livePools = useChainObjectsLive({
    chain: _chain,
    ids: poolIds,
    enabled: Boolean(_chain && poolIds.length > 0),
    specificNode: currentNode ? currentNode.url : null,
  });
  const livePoolMap = useMemo(
    () => (livePools.objects ? new Map(Object.entries(livePools.objects)) : null),
    [livePools.objects]
  );

  const [sellingAsset, setSellingAsset] = useState(null);
  const [buyingAsset, setBuyingAsset] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("id");
  const [sortDirection, setSortDirection] = useState("asc");

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

    // overlay live balances onto the static build-time pool list
    let _remainingPools = livePoolMap
      ? pools.map((pool) => {
          const live = livePoolMap.get(pool.id);
          return live ? { ...pool, ...live } : pool;
        })
      : pools;

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

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      _remainingPools = _remainingPools.filter((pool) => {
        const shareAsset = assets.find(
          (asset) => asset.id === pool.share_asset_id
        );
        const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
        const assetB = assets.find((asset) => asset.id === pool.asset_b_id);

        const poolIdMatch = pool.id.toString().includes(q);
        const shareMatch = shareAsset
          ? shareAsset.symbol.toLowerCase().includes(q)
          : false;
        const assetAMatch = assetA
          ? assetA.symbol.toLowerCase().includes(q)
          : false;
        const assetBMatch = assetB
          ? assetB.symbol.toLowerCase().includes(q)
          : false;

        return poolIdMatch || shareMatch || assetAMatch || assetBMatch;
      });
    }

    _remainingPools = [..._remainingPools].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "id") {
        cmp = extractPoolNum(a.id) - extractPoolNum(b.id);
      } else if (sortColumn === "balances") {
        const assetA_a = assets.find((x) => x.id === a.asset_a_id);
        const assetB_a = assets.find((x) => x.id === a.asset_b_id);
        const assetA_b = assets.find((x) => x.id === b.asset_a_id);
        const assetB_b = assets.find((x) => x.id === b.asset_b_id);
        const valA = assetA_a
          ? humanReadableFloat(a.balance_a, assetA_a.precision)
          : 0;
        const valB = assetB_a
          ? humanReadableFloat(a.balance_b, assetB_a.precision)
          : 0;
        const valC = assetA_b
          ? humanReadableFloat(b.balance_a, assetA_b.precision)
          : 0;
        const valD = assetB_b
          ? humanReadableFloat(b.balance_b, assetB_b.precision)
          : 0;
        cmp = valA + valB - (valC + valD);
      } else if (sortColumn === "takerFee") {
        cmp = a.taker_fee_percent - b.taker_fee_percent;
      } else if (sortColumn === "withdrawalFee") {
        cmp = a.withdrawal_fee_percent - b.withdrawal_fee_percent;
      } else if (sortColumn === "shareAsset") {
        const shareA = assets.find((x) => x.id === a.share_asset_id);
        const shareB = assets.find((x) => x.id === b.share_asset_id);
        cmp = (shareA?.symbol || "").localeCompare(shareB?.symbol || "");
      } else if (sortColumn === "poolId") {
        cmp = a.id.localeCompare(b.id);
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return _remainingPools;
  }, [
    pools,
    livePoolMap,
    assets,
    buyingAssetData,
    sellingAssetData,
    searchQuery,
    sortColumn,
    sortDirection,
  ]);

  const totalPoolCount = pools ? pools.length : 0;
  const filteredCount = remainingPools ? remainingPools.length : 0;

  function handleSort(col) {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  }

  function SortIcon({ col }) {
    if (sortColumn !== col) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 inline-block ml-0.5" />
    ) : (
      <ArrowDown className="h-3 w-3 inline-block ml-0.5" />
    );
  }

  const poolRowProps = useMemo(() => ({ remainingPools, assets, t }), [remainingPools, assets, t]);

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
                  <Droplets className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                </span>
                {t("PoolList:title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("PoolList:description")}
              </p>
            </div>
          </div>

          <Card className="p-3">
            <div className="grid grid-cols-1 gap-3">
              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    {t("CustomPoolOverview:assetA")}
                  </label>
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
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    {t("CustomPoolOverview:assetB")}
                  </label>
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

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search pool ID, asset..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-sm w-[200px]"
                    />
                  </div>
                  {(buyingAsset || sellingAsset || searchQuery) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2.5 shrink-0"
                      onClick={() => {
                        setBuyingAsset(null);
                        setSellingAsset(null);
                        setSearchQuery("");
                      }}
                      title={t("CustomPoolOverview:reset")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Pool count */}
              <div className="flex items-center justify-between">
                <HoverInfo
                  content={t("CustomPoolOverview:hoverPoolDetailsContent")}
                  header={t("CustomPoolOverview:hoverPoolDetailsHeader")}
                />
                <div className="text-xs text-muted-foreground">
                  {searchQuery || buyingAsset || sellingAsset ? (
                    <span>
                      Showing <span className="font-medium text-foreground">{filteredCount}</span> of{" "}
                      <span className="font-medium text-foreground">{totalPoolCount}</span> pools
                    </span>
                  ) : (
                    <span>
                      <span className="font-medium text-foreground">{totalPoolCount}</span> pools
                    </span>
                  )}
                </div>
              </div>

              {/* Column Headers - clickable for sorting */}
              <div className="grid grid-cols-[3fr_3fr_1fr_1fr_3fr_1fr] gap-2 items-center text-[11px] text-muted-foreground uppercase tracking-wider px-2">
                <div>Asset Pair</div>
                <button
                  type="button"
                  className="text-center cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("balances")}
                >
                  Balances <SortIcon col="balances" />
                </button>
                <button
                  type="button"
                  className="text-center cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("takerFee")}
                >
                  Taker Fee <SortIcon col="takerFee" />
                </button>
                <button
                  type="button"
                  className="text-center cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("withdrawalFee")}
                >
                  WD Fee <SortIcon col="withdrawalFee" />
                </button>
                <button
                  type="button"
                  className="text-center cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("shareAsset")}
                >
                  Share Asset <SortIcon col="shareAsset" />
                </button>
                <button
                  type="button"
                  className="text-center cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("id")}
                >
                  Pool ID <SortIcon col="id" />
                </button>
              </div>

              {/* Pool List - single scrollbar via react-window */}
              <div className="w-full h-[500px] border rounded-lg border-border">
                {remainingPools && remainingPools.length > 0 ? (
                  <List
                    rowComponent={PoolRow}
                    rowCount={remainingPools.length}
                    rowHeight={42}
                    height={500}
                    width="100%"
                    rowProps={poolRowProps}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Droplets className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm font-medium">No pools found</p>
                    <p className="text-xs mt-1">
                      Try adjusting your filters or search query
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <DexLiveFooterCard
        lastFetchAt={livePools.lastFetchAt}
        isSubscribed={livePools.isSubscribed}
        blockNumber={livePools.blockNumber}
        nodeUrl={currentNode ? currentNode.url : null}
        warningThresholdSec={10}
      
        chain={_chain}/>
    </div>
  );
}
