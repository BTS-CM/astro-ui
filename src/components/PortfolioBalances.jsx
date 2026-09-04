import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  memo,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Spinner } from "@/components/ui/spinner";

import {
  Card,
  CardContent,
  CardDescription,
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
import {
  ChevronUpIcon,
  ChevronDownIcon,
  StarIcon,
  StarFilledIcon,
} from "@radix-ui/react-icons";

import { Wallet, ArrowLeftRight } from "lucide-react";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { useAccountBalancesLive } from "@/hooks/useChainObjectsLive";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";

import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  $favouriteAssets,
  addFavouriteAsset,
  removeFavouriteAsset,
} from "@/stores/favourites.ts";

import { humanReadableFloat } from "@/lib/common";
import { cn } from "@/lib/utils";

function RowHyperlink({
  id,
  share_asset_symbol,
  asset_a_symbol,
  asset_b_symbol,
}) {
  return (
    <div className="grid grid-cols-10 text-foreground/70">
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

const BalanceRow = memo(function BalanceRow({ index, style, sortedUserBalances, assets, chainFavourites, pools, _chain, t }) {
  const rowBalance = sortedUserBalances[index];
  const currentAsset = assets.find(
    (asset) => asset.id === rowBalance.asset_id
  ) || {
    symbol: rowBalance.asset_id,
    precision: 5,
  };

  const isFavourited = currentAsset && currentAsset.id ? chainFavourites.some((a) => a.id === currentAsset.id) : false;

  const onToggleFavourite = () => {
    if (!currentAsset || !currentAsset.id) return;
    const assetObj = {
      symbol: currentAsset.symbol,
      id: currentAsset.id,
      issuer: currentAsset.issuer ?? "",
    };
    if (isFavourited) {
      removeFavouriteAsset(_chain, assetObj);
    } else {
      addFavouriteAsset(_chain, assetObj);
    }
  };

  const readableBalance = humanReadableFloat(
    rowBalance.amount,
    currentAsset.precision
  ).toLocaleString(undefined, {
    minimumFractionDigits: currentAsset.precision,
  });

  const relevantPools = pools.filter(
    (pool) =>
      pool.asset_a_symbol === currentAsset.symbol ||
      pool.asset_b_symbol === currentAsset.symbol
  );

  const rightContents = (
    <>
      <a
        href={`/dex.html?market=${currentAsset.symbol}_${
          currentAsset.symbol === "BTS" ? "HONEST.USD" : "BTS"
        }`}
      >
        <Button variant="outline" className="mr-2 h-8 gap-1.5 px-3 rounded-full border border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {t("PortfolioTabs:tradeButton")}
        </Button>
      </a>
    </>
  );

  return (
    <div style={{ ...style, marginBottom: "8px" }}>
      <Card className="bg-card/60 border-border hover:bg-[hsl(var(--accent-1)/0.03)] hover:border-[hsl(var(--accent-1)/0.2)] transition-all">
        <div className="grid grid-cols-6">
          <div className="col-span-4 md:col-span-2 text-left">
            <CardHeader className="pt-3 pb-3">
              <CardTitle className="flex items-center gap-2" title={`${t("PoolStake:id")}: ${currentAsset.id}`}>
                <span className="font-semibold">{currentAsset.symbol}</span>
                <span className="text-xs font-mono font-normal text-muted-foreground/50">{currentAsset.id}</span>
              </CardTitle>
          <CardDescription className="text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onToggleFavourite}
                    aria-label={isFavourited ? "Unfavourite" : "Favourite"}
                    title={isFavourited ? "Unfavourite" : "Favourite"}
                    className="p-0 m-0 inline-flex items-center"
                  >
                    {isFavourited ? (
                      <StarFilledIcon className="h-4 w-4 text-[hsl(var(--accent-warning-fg))]" />
                    ) : (
                      <StarIcon className="h-4 w-4 text-muted-foreground/60" />
                    )}
                  </button>

                  <span
                    title={t("PortfolioTabs:liquidAmount", {
                      amount: readableBalance,
                    })}
                    className="text-sm text-foreground/70"
                  >
                    {readableBalance}
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
          </div>
          <div className="block md:hidden text-right col-span-2 mt-4 mr-4">
            <Dialog>
              <DialogTrigger>
                <Button>{t("HTLC:actionsColumn")}</Button>
              </DialogTrigger>
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {t("HTLC:actionsColumn")} - {currentAsset.symbol}
                  </DialogTitle>
                  <DialogDescription>
                    <div className="grid grid-cols-5 gap-2">
                      {rightContents}
                    </div>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
          <div className="hidden md:block col-span-4 text-right mt-4">
            {rightContents}
          </div>
        </div>
      </Card>
    </div>
  );
});

export default function PortfolioBalances({
  _assetsBTS,
  _assetsTEST,
  _poolsBTS,
  _poolsTEST,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
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
  const currentNode = useStore($currentNode);
  const favouriteAssets = useStore($favouriteAssets);

  const [sortType, setSortType] = useState("default");
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSortClick = (type) => {
    if (type === sortType) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortType(type);
      // Sensible defaults per sort: alphabetical asc, amount desc, default asc
      setSortDirection(type === "amount" ? "desc" : "asc");
    }
  };

  const _chain = useMemo(() => {
    if (usr && usr.chain) return usr.chain;
    return "bitshares";
  }, [usr]);

  const assets = useMemo(() => {
    if (!_chain || (!_assetsBTS && !_assetsTEST)) return [];
    if (_chain !== "bitshares") return _assetsTEST;
    const relevantAssets = _assetsBTS.filter((asset) => {
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(asset.issuer)))
      );
    });
    return relevantAssets;
  }, [blocklist, _assetsBTS, _assetsTEST, _chain]);

  const pools = useMemo(() => {
    if (!_chain || (!_poolsBTS && !_poolsTEST)) return [];
    if (_chain !== "bitshares") return _poolsTEST;
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

  const chainFavourites = useMemo(() => {
    if (!favouriteAssets) return [];
    return favouriteAssets[_chain] ?? [];
  }, [favouriteAssets, _chain]);

  useInitCache(_chain ?? "bitshares", []);

  const [balanceCounter, setBalanceCounter] = useState(0);
  const [balances, setBalances] = useState();
  const [balancesLoading, setBalancesLoading] = useState(false);
  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);
        userBalancesStore.subscribe(({ data, error, loading }) => {
          setBalancesLoading(Boolean(loading));
          if (data && !error && !loading) {
            const updatedData = data
              .filter((balance) =>
                assets.find((x) => x.id === balance.asset_id)
              )
              .map((balance) => ({
                ...balance,
                symbol: assets.find((x) => x.id === balance.asset_id).symbol,
              }));
            setBalances(updatedData);
          }
          if (!data && !loading && error) {
            // clear balances on error
            setBalances([]);
          }
        });
      }
    }
    fetchUserBalances();
  }, [usr, balanceCounter, assets, currentNode]);

  // Live balances via ChainStore full-account subscription (push, per block)
  const liveBalances = useAccountBalancesLive({
    chain: usr ? usr.chain : "",
    accountId: usr ? usr.id : null,
    specificNode: currentNode ? currentNode.url : null,
    enabled: Boolean(usr && usr.id),
  });
  useEffect(() => {
    if (liveBalances.balances && assets.length) {
      const updatedData = liveBalances.balances
        .filter((balance) => assets.find((x) => x.id === balance.asset_id))
        .map((balance) => ({
          ...balance,
          symbol: assets.find((x) => x.id === balance.asset_id).symbol,
        }));
      setBalances(updatedData);
      setBalancesLoading(false);
    }
  }, [liveBalances.balances, assets]);

  const sortedUserBalances = useMemo(() => {
    if (!balances || !balances.length) return [];
    const balancesCopy = [...balances];

    const extractIdNumber = (assetId) => {
      // Expect formats like "1.3.0"; fall back gracefully
      const parts = String(assetId).split(".");
      const maybe = parseInt(parts[2] ?? parts[parts.length - 1], 10);
      return Number.isFinite(maybe) ? maybe : 0;
    };

    const cmp = (a, b) => {
      let r = 0;
      if (sortType === "alphabetical") {
        r = a.symbol.localeCompare(b.symbol);
      } else if (sortType === "amount") {
        r = parseInt(a.amount, 10) - parseInt(b.amount, 10);
      } else {
        r = extractIdNumber(a.asset_id) - extractIdNumber(b.asset_id);
      }
      return sortDirection === "asc" ? r : -r;
    };

    return balancesCopy.sort(cmp);
  }, [balances, sortType, sortDirection]);

  const balanceRowProps = useMemo(() => ({ sortedUserBalances, assets, chainFavourites, pools, _chain, t }), [sortedUserBalances, assets, chainFavourites, pools, _chain, t]);

  return (
    <div className="container mx-auto mt-5 mb-5 text-foreground">
      <div className="grid grid-cols-1 mt-5">
        <Card className="bg-card/60 border-border shadow-lg shadow-black/20">
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))]" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.15)]">
                <Wallet className="w-4 h-4 text-[hsl(var(--accent-1-fg))]" />
              </span>
              {t("PortfolioTabs:accountBalances", { username: usr?.username })}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("PortfolioTabs:accountBalancesDescription")}
            </CardDescription>
            <div className="grid grid-cols-3 gap-3 mt-2">
                <Button
                  onClick={() => handleSortClick("default")}
                  variant={sortType === "default" ? "" : "outline"}
                  className={sortType === "default" ? "bg-accent/40 dark:bg-white/10 text-foreground hover:bg-accent/50 dark:hover:bg-white/15" : "border-border text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"}
                >
                  {t("PortfolioTabs:default")}
                  {" (ID) "}
                  {sortType === "default" ? (
                    sortDirection === "asc" ? (
                      <ChevronUpIcon className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    )
                  ) : null}
                </Button>
                <Button
                  onClick={() => handleSortClick("alphabetical")}
                  variant={sortType === "alphabetical" ? "" : "outline"}
                  className={sortType === "alphabetical" ? "bg-accent/40 dark:bg-white/10 text-foreground hover:bg-accent/50 dark:hover:bg-white/15" : "border-border text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"}
                >
                  {t("PortfolioTabs:alphabetical")}
                  {sortType === "alphabetical" ? (
                    sortDirection === "asc" ? (
                      <ChevronUpIcon className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    )
                  ) : null}
                </Button>
                <Button
                  onClick={() => handleSortClick("amount")}
                  variant={sortType === "amount" ? "" : "outline"}
                  className={sortType === "amount" ? "bg-accent/40 dark:bg-white/10 text-foreground hover:bg-accent/50 dark:hover:bg-white/15" : "border-border text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"}
                >
                  {t("PortfolioTabs:amount")}
                  {sortType === "amount" ? (
                    sortDirection === "asc" ? (
                      <ChevronUpIcon className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    )
                  ) : null}
                </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-foreground/70">
            {balancesLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Spinner />
                <p className="text-muted-foreground">{t("Market:loading")}</p>
              </div>
            ) : sortedUserBalances && sortedUserBalances.length ? (
              <div className="w-full h-[500px]">
                <List
                  rowComponent={BalanceRow}
                  rowCount={sortedUserBalances.length}
                  rowHeight={80}
                  height={500}
                  width="100%"
                  rowProps={balanceRowProps}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[hsl(var(--accent-1)/0.15)] mb-3">
                  <Wallet className="w-6 h-6 text-[hsl(var(--accent-1-fg))]" />
                </div>
                <p className="text-muted-foreground text-sm">{t("PortfolioTabs:noBalancesFound")}</p>
              </div>
            )}
          </CardContent>
          <div className="px-6 pb-6">
            <Button
              onClick={() => {
                setBalances();
                setBalanceCounter(balanceCounter + 1);
              }}
              disabled={balancesLoading}
              aria-busy={balancesLoading}
            >
              {t("PortfolioTabs:refreshBalancesButton")}
            </Button>
          </div>
        </Card>

        <DexLiveFooterCard
          lastFetchAt={liveBalances.lastFetchAt}
          isSubscribed={liveBalances.isSubscribed}
          blockNumber={liveBalances.blockNumber}
          nodeUrl={currentNode ? currentNode.url : null}
          warningThresholdSec={10}
        
        chain={usr?.chain}/>
      </div>
    </div>
  );
}
