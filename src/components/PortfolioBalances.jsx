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
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  StarIcon,
  StarFilledIcon,
} from "@radix-ui/react-icons";

import { Wallet } from "lucide-react";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { useAccountBalancesLive } from "@/hooks/useChainObjectsLive";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";
import AssetIssuerActions from "./AssetIssuerActions.jsx";
import ForceSettleDialog from "./common/ForceSettleDialog.jsx";
import ObjectJsonDialog from "./common/ObjectJsonDialog.jsx";

import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode, $currentNodeUrl } from "@/stores/node.ts";
import {
  $favouriteAssets,
  addFavouriteAsset,
  removeFavouriteAsset,
} from "@/stores/favourites.ts";

import { humanReadableFloat } from "@/lib/common";

function BalanceActionsSelect({ symbol, assetId, isSmartcoin, hasBalance, onForceSettle, onViewJson, t }) {
  const counterSymbol = symbol === "BTS" ? "HONEST.USD" : "BTS";
  const dexHref = `/dex.html?market=${symbol}_${counterSymbol}`;
  const instantTradeHref = `/instant_trade.html?market=${symbol}_${counterSymbol}`;
  const transferHref = `/transfer.html`;
  const smartcoinHref = `/smartcoin.html?id=${assetId}`;

  const itemCls =
    "cursor-pointer transition-colors data-[highlighted]:bg-[hsl(var(--accent-1)/0.12)] data-[highlighted]:text-[hsl(var(--accent-1-fg))]";
  // Remount the Select after each choice so the trigger keeps showing the
  // static "User Actions" placeholder instead of the last selected item.
  const [resetKey, setResetKey] = useState(0);
  return (
    <Select
      key={resetKey}
      onValueChange={(href) => {
        if (!href) return;
        setResetKey((k) => k + 1);
        if (href === "__force_settle__") {
          if (onForceSettle) onForceSettle();
          return;
        }
        if (href === "__view_json__") {
          if (onViewJson) onViewJson();
          return;
        }
        window.location.href = href;
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-8 gap-1.5 px-3 rounded-full border border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]"
      >
        <SelectValue
          placeholder={t("IssuedAssets:userActions", {
            defaultValue: "User Actions",
          })}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={dexHref} className={itemCls}>
          {t("PortfolioTabs:dexLimitOrder", { defaultValue: "DEX limit order" })}
        </SelectItem>
        <SelectItem value={instantTradeHref} className={itemCls}>
          {t("PortfolioTabs:instantTrade", { defaultValue: "Instant trade" })}
        </SelectItem>
        <SelectItem value={transferHref} className={itemCls}>
          {t("PortfolioTabs:transferAction", { defaultValue: "Transfer" })}
        </SelectItem>
        <SelectItem value="__view_json__" className={itemCls}>
          {t("PortfolioTabs:viewBalanceObject", { defaultValue: "View balance object" })}
        </SelectItem>
        {isSmartcoin ? (
          <>
            <SelectSeparator />
            <SelectItem value={smartcoinHref} className={itemCls}>
              {t("PortfolioTabs:manageDebt", { defaultValue: "Manage debt" })}
            </SelectItem>
            {hasBalance ? (
              <SelectItem value="__force_settle__" className={itemCls}>
                {t("PortfolioTabs:forceSettle", { defaultValue: "Force settle" })}
              </SelectItem>
            ) : null}
          </>
        ) : null}
      </SelectContent>
    </Select>
  );
}

const SortHeaderButton = memo(function SortHeaderButton({
  columnKey,
  label,
  sortType,
  sortDirection,
  onSort,
  style,
  align = "left",
}) {
  const active = sortType === columnKey;
  return (
    <button
      type="button"
      onClick={() => onSort(columnKey)}
      title={label}
      aria-label={label}
      className={`flex items-center gap-1 min-w-0 text-[10px] uppercase tracking-wide transition-colors cursor-pointer bg-transparent border-0 p-0 ${
        align === "right" ? "justify-end text-right" : "text-left"
      } ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      style={style}
    >
      <span className="truncate">{label}</span>
      {active && sortDirection === "asc" ? (
        <ArrowUpIcon className="h-3 w-3 shrink-0" />
      ) : null}
      {active && sortDirection === "desc" ? (
        <ArrowDownIcon className="h-3 w-3 shrink-0" />
      ) : null}
    </button>
  );
});

const BalanceRow = memo(function BalanceRow({ index, style, sortedUserBalances, assetMap, favouriteIds, _chain, usr, currentNode, assets, t }) {
  const rowBalance = sortedUserBalances[index];
  const currentAsset = assetMap.get(rowBalance.asset_id) || {
    symbol: rowBalance.asset_id,
    precision: 5,
  };

  const isFavourited = currentAsset.id ? favouriteIds.has(currentAsset.id) : false;

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

  const humanBalance = humanReadableFloat(
    rowBalance.amount,
    currentAsset.precision
  );

  const isZeroBalance = Number(rowBalance.amount) === 0;

  const isSmartcoin = Boolean(currentAsset.bitasset_data_id);
  const isIssuer = Boolean(
    usr && usr.id && currentAsset.issuer && usr.id === currentAsset.issuer
  );

  // The balances page asset collection strips `options` (content schema),
  // but AssetIssuerActions reads `asset.options` during render. Fetch the
  // full asset object for issuer-owned rows only before mounting it.
  const [fullAsset, setFullAsset] = useState(null);
  useEffect(() => {
    if (!isIssuer || !currentAsset.id) {
      setFullAsset(null);
      return;
    }
    let cancelled = false;
    const store = createObjectStore([
      _chain,
      JSON.stringify([currentAsset.id]),
    ]);
    const unsubscribe = store.subscribe(({ data, error, loading }) => {
      if (cancelled || loading || error) return;
      if (data && data.length && data[0] && data[0].options) {
        setFullAsset(data[0]);
      }
    });
    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch {}
      }
    };
  }, [isIssuer, currentAsset.id, _chain]);

  const [showForceSettle, setShowForceSettle] = useState(false);
  const [showBalanceJson, setShowBalanceJson] = useState(false);

  return (
    <div style={{ ...style, paddingBottom: "8px", paddingRight: "2px", overflow: "hidden" }}>
      <Card className="py-0 gap-0 h-full overflow-hidden justify-center bg-card/60 border-border hover:bg-[hsl(var(--accent-1)/0.03)] hover:border-[hsl(var(--accent-1)/0.2)] transition-all">
        <CardContent className="p-0 h-full">
          <div className="flex items-center gap-2 px-3 h-full min-h-[52px]">
            <button
              onClick={onToggleFavourite}
              aria-label={isFavourited ? "Unfavourite" : "Favourite"}
              title={isFavourited ? "Unfavourite" : "Favourite"}
              className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent/60 transition-colors"
            >
              {isFavourited ? (
                <StarFilledIcon className="h-4 w-4 text-[hsl(var(--accent-warning-fg))]" />
              ) : (
                <StarIcon className="h-4 w-4 text-muted-foreground/60" />
              )}
            </button>
            <div className="min-w-0 truncate text-left" style={{ flex: "1 1 30%" }} title={currentAsset.symbol}>
              <span className="text-sm font-semibold truncate block text-left">{currentAsset.symbol}</span>
            </div>
            <div className="min-w-0 truncate text-left" style={{ flex: "1 1 25%" }} title={`${t("PoolStake:id")}: ${currentAsset.id}`}>
              <span className="text-xs font-mono text-muted-foreground truncate block text-left">{currentAsset.id}</span>
            </div>
            <div className="min-w-0 truncate text-left" style={{ flex: "1 1 25%" }}>
              <span
                title={t("PortfolioTabs:liquidAmount", {
                  amount: readableBalance,
                })}
                className={
                  isZeroBalance
                    ? "text-sm font-mono tabular-nums text-muted-foreground truncate block text-left"
                    : "text-sm font-mono tabular-nums font-semibold text-[hsl(var(--accent-1-fg))] truncate block text-left"
                }
              >
                {readableBalance}
              </span>
            </div>
            <div className="shrink-0 flex justify-start items-center gap-2" style={{ flex: "0 0 auto" }}>
              <BalanceActionsSelect
                symbol={currentAsset.symbol}
                assetId={currentAsset.id}
                isSmartcoin={isSmartcoin}
                hasBalance={!isZeroBalance}
                onForceSettle={() => setShowForceSettle(true)}
                onViewJson={() => setShowBalanceJson(true)}
                t={t}
              />
              {isIssuer && fullAsset ? (
                <AssetIssuerActions
                  asset={fullAsset}
                  assets={assets}
                  chain={_chain}
                  currentUser={usr}
                  node={currentNode}
                  buttonVariant="outline"
                  buttonSize="sm"
                  className="h-8 rounded-full border-[hsl(var(--accent-2)/0.3)] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.1)] hover:text-[hsl(var(--accent-2-fg))]"
                />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
      {showForceSettle && isSmartcoin && !isZeroBalance ? (
        <ForceSettleDialog
          open={showForceSettle}
          onClose={() => setShowForceSettle(false)}
          assetId={currentAsset.id}
          symbol={currentAsset.symbol}
          precision={currentAsset.precision}
          humanBalance={humanBalance}
          chain={_chain}
          accountId={usr?.id}
          username={usr?.username}
          assets={assets}
          nodeUrl={currentNode?.url || null}
        />
      ) : null}
      {showBalanceJson ? (
        <ObjectJsonDialog
          open={showBalanceJson}
          onClose={() => setShowBalanceJson(false)}
          title={t("PortfolioTabs:assetTitle", {
            symbol: currentAsset.symbol,
            assetId: currentAsset.id,
          })}
          description={t("PortfolioTabs:balanceJsonDescription", {
            defaultValue: "The raw blockchain data for this balance.",
          })}
          data={rowBalance}
        />
      ) : null}
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
  const currentNodeUrl = useStore($currentNodeUrl);
  const currentNode = useStore($currentNode);
  const favouriteAssets = useStore($favouriteAssets);

  const [sortType, setSortType] = useState("id");
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSortClick = (type) => {
    if (type === sortType) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortType(type);
      // Sensible defaults: name/id asc, amount desc
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

  const chainFavourites = useMemo(() => {
    if (!favouriteAssets) return [];
    return favouriteAssets[_chain] ?? [];
  }, [favouriteAssets, _chain]);

  // O(1) lookups per row: the old `assets.find` + `chainFavourites.some`
  // per row made every list render O(balances x assets).
  const assetMap = useMemo(() => {
    const map = new Map();
    for (const asset of assets || []) {
      if (asset && asset.id) map.set(asset.id, asset);
    }
    return map;
  }, [assets]);

  const favouriteIds = useMemo(() => {
    return new Set((chainFavourites || []).map((a) => a.id));
  }, [chainFavourites]);

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
          currentNodeUrl || "",
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
  }, [usr, balanceCounter, assets, currentNodeUrl]);

  // Live balances via ChainStore full-account subscription (push, per block)
  const liveBalances = useAccountBalancesLive({
    chain: usr ? usr.chain : "",
    accountId: usr ? usr.id : null,
    specificNode: currentNodeUrl || null,
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
      // Sort by the trailing number after "1.3.x"
      const parts = String(assetId).split(".");
      const maybe = parseInt(parts[2] ?? parts[parts.length - 1], 10);
      return Number.isFinite(maybe) ? maybe : 0;
    };

    const assetPrecision = (assetId) => {
      return assetMap.get(assetId)?.precision ?? 5;
    };

    const cmp = (a, b) => {
      let r = 0;
      if (sortType === "symbol") {
        r = String(a.symbol).localeCompare(String(b.symbol), undefined, {
          sensitivity: "base",
        });
      } else if (sortType === "amount") {
        const aHuman =
          Number(a.amount) / Math.pow(10, assetPrecision(a.asset_id));
        const bHuman =
          Number(b.amount) / Math.pow(10, assetPrecision(b.asset_id));
        r = aHuman - bHuman;
      } else {
        // "id": numeric compare on the x in 1.3.x
        r = extractIdNumber(a.asset_id) - extractIdNumber(b.asset_id);
      }
      return sortDirection === "asc" ? r : -r;
    };

    return balancesCopy.sort(cmp);
  }, [balances, assetMap, sortType, sortDirection]);

  const balanceRowProps = useMemo(() => ({ sortedUserBalances, assetMap, favouriteIds, _chain, usr, currentNode, assets, t }), [sortedUserBalances, assetMap, favouriteIds, _chain, usr, currentNode, assets, t]);

  return (
    <div className="container mx-auto mt-5 mb-5 text-foreground">
      <div className="grid grid-cols-1 mt-5 gap-3">
        <Card className="relative overflow-hidden bg-card/60 border-border shadow-lg shadow-black/20 gap-0">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[hsl(var(--accent-1)/0.08)] via-[hsl(var(--accent-1)/0.02)] to-transparent"
          />
          <div className="relative border-b border-border p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Wallet className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("PortfolioTabs:accountBalances", { username: usr?.username })}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("PortfolioTabs:accountBalancesDescription")}
                </p>
              </div>
            </div>
          </div>
          <CardContent className="space-y-2 text-foreground/70">
            {balancesLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Spinner />
                <p className="text-muted-foreground">{t("Market:loading")}</p>
              </div>
            ) : sortedUserBalances && sortedUserBalances.length ? (
              <>
                <div className="flex items-center gap-2 px-3 pb-2 mb-1 border-b border-border/60">
                  <div className="shrink-0 w-7" aria-hidden="true" />
                  <SortHeaderButton
                    columnKey="symbol"
                    label={t("PortfolioTabs:nameHeader", { defaultValue: "Name" })}
                    sortType={sortType}
                    sortDirection={sortDirection}
                    onSort={handleSortClick}
                    style={{ flex: "1 1 30%" }}
                  />
                  <SortHeaderButton
                    columnKey="id"
                    label={t("PortfolioTabs:idHeader", { defaultValue: "ID" })}
                    sortType={sortType}
                    sortDirection={sortDirection}
                    onSort={handleSortClick}
                    style={{ flex: "1 1 25%" }}
                  />
                  <SortHeaderButton
                    columnKey="amount"
                    label={t("PortfolioTabs:amountHeader", { defaultValue: "Amount" })}
                    sortType={sortType}
                    sortDirection={sortDirection}
                    onSort={handleSortClick}
                    style={{ flex: "1 1 25%" }}
                  />
                  <div
                    className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground text-left"
                    style={{ flex: "0 0 auto" }}
                  >
                    {t("PortfolioTabs:actionsHeader")}
                  </div>
                </div>
                <div className="w-full h-[500px]">
                  <List
                    rowComponent={BalanceRow}
                    rowCount={sortedUserBalances.length}
                    rowHeight={60}
                    height={500}
                    width="100%"
                    rowProps={balanceRowProps}
                  />
                </div>
              </>
            ) : (
              <Empty className="mt-2 border border-border/60 rounded-xl bg-[hsl(var(--accent-1)/0.04)]">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
                    <Wallet className="w-6 h-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground/80">{t("PortfolioTabs:noBalancesFound")}</EmptyTitle>
                  <EmptyDescription className="text-muted-foreground">
                    {t("PortfolioTabs:accountBalancesDescription")}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild className="bg-[hsl(var(--accent-1))] hover:bg-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))]">
                    <a href="/dex.html">
                      {t("PortfolioTabs:tradeButton")}
                    </a>
                  </Button>
                </EmptyContent>
              </Empty>
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
              className="gap-2 bg-[hsl(var(--accent-1))] hover:bg-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))]"
            >
              {t("PortfolioTabs:refreshBalancesButton")}
            </Button>
          </div>
        </Card>

        <DexLiveFooterCard
          lastFetchAt={liveBalances.lastFetchAt}
          isSubscribed={liveBalances.isSubscribed}
          blockNumber={liveBalances.blockNumber}
          nodeUrl={currentNodeUrl || null}
          warningThresholdSec={10}
        
        chain={usr?.chain}/>
      </div>
    </div>
  );
}
