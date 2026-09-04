import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  useSyncExternalStore,
} from "react";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { List } from "react-window";

import {
  ArrowLeftRight,
  ArrowUpDown,
  ClipboardList,
  Copy,
  ListOrdered,
  Loader2Icon,
  Pencil,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createAccountLimitOrderStore } from "@/nanoeffects/AccountLimitOrders.ts";
import { revalidateAccountLimitOrders } from "@/nanoeffects/AccountLimitOrders.ts";
import { useDexAccountOrdersLive } from "@/hooks/useDexLiveSubscriptions";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";

import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import { humanReadableFloat } from "@/lib/common";
import { cn } from "@/lib/utils";

const TIME_TICK_MS = 30_000;

function formatTimeRemaining(expiration, now) {
  const expirationDate = new Date(expiration);
  const timeDiff = expirationDate - now;
  if (timeDiff <= 0) {
    return { text: "0d 0h 0m", status: "expired" };
  }
  const minutes = Math.floor((timeDiff / 1000 / 60) % 60);
  const hours = Math.floor((timeDiff / 1000 / 60 / 60) % 24);
  const days = Math.floor(timeDiff / 1000 / 60 / 60 / 24);
  let status = "healthy";
  if (days < 1) status = "imminent";
  else if (days <= 7) status = "soon";
  return { text: `${days}d ${hours}h ${minutes}m`, status };
}

function CopyIdButton({ orderId, t }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(orderId).catch(() => {});
              }
            }}
            aria-label={t("PortfolioTabs:copyOrderIdTooltip")}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors max-w-[140px] truncate"
          >
            <span className="truncate">{orderId}</span>
            <Copy className="h-3 w-3 flex-shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{t("PortfolioTabs:copyOrderIdTooltip")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ActionIconLink({ href, icon: Icon, label, accent = "default" }) {
  const palette = {
    default: "text-muted-foreground hover:text-foreground/80 hover:bg-accent/60",
    destructive: "text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)]",
  }[accent];
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={href}
            aria-label={label}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${palette}`}
          >
            <Icon className="h-4 w-4" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ActionLabelLink({
  href,
  icon: Icon,
  children,
  accent = "outline",
  onClick,
}) {
  const palette = {
    outline:
      "border border-border text-muted-foreground hover:bg-accent/60 hover:text-foreground/80",
    destructive: "bg-[hsl(var(--accent-danger))] text-[hsl(var(--accent-danger-gradFg))] hover:bg-[hsl(var(--accent-danger))]",
  }[accent];
  const className = `inline-flex h-8 items-center justify-center gap-1.5 px-3 rounded-full text-sm font-medium transition-colors ${palette}`;
  if (onClick && !href) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{children}</span>
      </button>
    );
  }
  return (
    <a href={href} className={className}>
      <Icon className="h-3.5 w-3.5" />
      <span>{children}</span>
    </a>
  );
}

const expiryColor = {
  healthy: "dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))]",
  soon: "dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))]",
  imminent: "dark:text-[hsl(var(--accent-danger-fg))] text-[hsl(var(--accent-danger-fg))]",
  expired: "text-muted-foreground/60 line-through",
};

const OpenOrdersRow = memo(function OpenOrdersRow({ index, style, sortedOpenOrders, assets, now, showDialog, orderID, setOrderID, setShowDialog, t, usr }) {
  const order = sortedOpenOrders?.[index];
  if (!order) return null;

  const sellPriceBaseAmount = order.sell_price.base.amount;
  const sellPriceBaseAssetId = order.sell_price.base.asset_id;
  const sellPriceQuoteAmount = order.sell_price.quote.amount;
  const sellPriceQuoteAssetId = order.sell_price.quote.asset_id;
  const orderId = order.id;
  const expiration = order.expiration;

  const sellAsset =
    assets.find((asset) => asset.id === sellPriceBaseAssetId) || null;
  const buyAsset =
    assets.find((asset) => asset.id === sellPriceQuoteAssetId) || null;

  const readableBaseAmount = sellAsset
    ? humanReadableFloat(sellPriceBaseAmount, sellAsset.precision)
    : sellPriceBaseAmount;
  const readableQuoteAmount = buyAsset
    ? humanReadableFloat(sellPriceQuoteAmount, buyAsset.precision)
    : sellPriceQuoteAmount;

  let priceDisplay = "-";
  if (sellAsset && buyAsset && Number(readableBaseAmount) > 0) {
    const price = Number(readableQuoteAmount) / Number(readableBaseAmount);
    priceDisplay = price.toLocaleString(undefined, {
      maximumFractionDigits: 8,
    });
  }

  const { text: expiryText, status: expiryStatus } = formatTimeRemaining(expiration, now);

  const marketHref = `/dex.html?market=${sellAsset?.symbol ?? "?"}_${
    buyAsset?.symbol ?? "?"
  }`;
  const updateHref = `/order.html?id=${orderId}`;

  const isCancelOpen = showDialog && orderId === orderID;
  const cancelOfferKey = t("PortfolioTabs:cancelOffer", {
    baseAmount: readableBaseAmount,
    baseSymbol: sellAsset?.symbol,
    quoteAmount: readableQuoteAmount,
    quoteSymbol: buyAsset?.symbol,
  });

  return (
    <div style={{ ...style, paddingRight: "10px", paddingBottom: "4px" }}>
      {/* Mobile: stacked card */}
      <Card className="group bg-card/60 border border-border hover:bg-[hsl(var(--accent-1)/0.03)] hover:border-[hsl(var(--accent-1)/0.2)] transition-all rounded-xl border-l-2 border-l-cyan-500/30 block md:hidden">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {readableBaseAmount} {sellAsset?.symbol ?? "?"} → {readableQuoteAmount} {buyAsset?.symbol ?? "?"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <CopyIdButton orderId={orderId} t={t} />
            <div className="text-sm font-semibold dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
              {priceDisplay}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {buyAsset?.symbol}/{sellAsset?.symbol}
            </div>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("text-xs font-semibold cursor-help whitespace-nowrap", expiryColor[expiryStatus])}>
                    {expiryText}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card border-border text-foreground text-xs">
                  {new Date(expiration).toLocaleString()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ActionLabelLink href={marketHref} icon={ArrowLeftRight} accent="outline">
              {t("PortfolioTabs:tradeButton")}
            </ActionLabelLink>
            <ActionLabelLink href={updateHref} icon={Pencil} accent="outline">
              {t("PortfolioTabs:updateButton")}
            </ActionLabelLink>
            <ActionLabelLink
              icon={XCircle}
              accent="destructive"
              onClick={() => {
                setOrderID(orderId);
                setShowDialog(true);
              }}
            >
              {t("PortfolioTabs:cancelButton")}
            </ActionLabelLink>
          </div>
        </CardContent>
      </Card>

      {/* Desktop: two-row layout */}
      <Card className="group bg-card/60 border border-border hover:bg-[hsl(var(--accent-1)/0.03)] hover:border-[hsl(var(--accent-1)/0.2)] transition-all rounded-xl border-l-2 border-l-cyan-500/30 hidden md:block">
        <CardContent className="p-3">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-5 flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {readableBaseAmount} {sellAsset?.symbol ?? "?"} → {readableQuoteAmount} {buyAsset?.symbol ?? "?"}
              </span>
            </div>
            <div className="col-span-5 min-w-0 text-sm whitespace-nowrap">
              <span className="font-semibold dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">{priceDisplay}</span>
              <span className="text-muted-foreground"> {buyAsset?.symbol}/{sellAsset?.symbol}</span>
            </div>
            <div className="col-span-2">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn("text-sm font-semibold cursor-help whitespace-nowrap text-right", expiryColor[expiryStatus])}>
                    {expiryText}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card border-border text-foreground text-xs">
                  {new Date(expiration).toLocaleString()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <CopyIdButton orderId={orderId} t={t} />
            <div className="flex items-center gap-1">
              <ActionIconLink
                href={marketHref}
                icon={ArrowLeftRight}
                label={t("PortfolioTabs:tradeButton")}
              />
              <ActionIconLink
                href={updateHref}
                icon={Pencil}
                label={t("PortfolioTabs:updateButton")}
              />
              <button
                type="button"
                aria-label={t("PortfolioTabs:cancelButton")}
                onClick={() => {
                  setOrderID(orderId);
                  setShowDialog(true);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)] transition-colors"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isCancelOpen ? (
        <DeepLinkDialog
          operationNames={["limit_order_cancel"]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`Cancelling${orderId}`}
          headerText={cancelOfferKey}
          trxJSON={[
            {
              fee_paying_account: usr.id,
              order: orderId,
              extensions: [],
            },
          ]}
        />
      ) : null}
    </div>
  );
});

export default function PortfolioOpenOrders({
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
  useStore($currentNode);

  const _chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );

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

  useInitCache(_chain ?? "bitshares", []);

  const [openOrderCounter, setOpenOrderCounter] = useState(0);
  const [openOrders, setOpenOrders] = useState();
  const [openOrdersLoading, setOpenOrdersLoading] = useState(false);
  const [orderID, setOrderID] = useState();
  const [showDialog, setShowDialog] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [rowHeight, setRowHeight] = useState(88);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TIME_TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      setRowHeight(window.innerWidth < 768 ? 158 : 88);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    async function fetchLimitOrders() {
      if (usr && usr.id) {
        const limitOrdersStore = createAccountLimitOrderStore([
          usr.chain,
          usr.id,
        ]);
        limitOrdersStore.subscribe(({ data, error, loading }) => {
          setOpenOrdersLoading(Boolean(loading));
          if (data && !error && !loading) {
            // prefer live subscription when it is active; poll store fills
            // gaps (e.g. >100 orders where get_full_accounts truncates)
            setOpenOrders((prev) =>
              liveOrdersRef.current && liveOrdersRef.current.length ? prev : data
            );
          }
          if (!data && !loading && error) {
            setOpenOrders((prev) =>
              liveOrdersRef.current && liveOrdersRef.current.length ? prev : []
            );
          }
        });
      }
    }
    fetchLimitOrders();
  }, [usr, openOrderCounter]);

  // Live open-order subscription (ChainStore full-account push, ~per block)
  const currentNodeOO = useStore($currentNode);
  const ooNodeUrl =
    currentNodeOO && currentNodeOO.chain === (usr ? usr.chain : null)
      ? currentNodeOO.url
      : null;
  const liveOrders = useDexAccountOrdersLive({
    chain: usr ? usr.chain : "",
    accountId: usr ? usr.id : null,
    specificNode: ooNodeUrl,
    enabled: Boolean(usr && usr.id),
  });
  const liveOrdersRef = useRef(null);
  useEffect(() => {
    liveOrdersRef.current = liveOrders.orders;
    if (liveOrders.orders) {
      setOpenOrders(liveOrders.orders);
      setOpenOrdersLoading(false);
    }
  }, [liveOrders.orders]);

  useEffect(() => {
    if (!showDialog && orderID) {
      setOpenOrderCounter((c) => c + 1);
      setOrderID(undefined);
    }
  }, [showDialog, orderID]);

  const sortedOpenOrders = useMemo(() => {
    if (!openOrders || !openOrders.length) return openOrders;
    const copy = [...openOrders];
    if (sortBy === "newest") {
      return copy.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
    }
    if (sortBy === "expiry") {
      return copy.sort((a, b) => new Date(a.expiration) - new Date(b.expiration));
    }
    if (sortBy === "price") {
      return copy.sort((a, b) => {
        const pA = Number(a.sell_price.quote.amount) / Number(a.sell_price.base.amount) || 0;
        const pB = Number(b.sell_price.quote.amount) / Number(b.sell_price.base.amount) || 0;
        return pB - pA;
      });
    }
    return copy.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  }, [openOrders, sortBy]);

  const hasOrders =
    sortedOpenOrders && sortedOpenOrders.length > 0;

  const openOrdersRowProps = useMemo(() => ({ sortedOpenOrders, assets, now, showDialog, orderID, setOrderID, setShowDialog, t, usr }), [sortedOpenOrders, assets, now, showDialog, orderID, setOrderID, setShowDialog, t, usr]);

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-5xl text-foreground">
      <div className="grid grid-cols-1 gap-3">
        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))]" />
          <CardTitle className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                <ListOrdered className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
              </span>
              <div className="min-w-0">
                <span className="text-xl font-bold tracking-tight">
                  {t("PortfolioTabs:openOrdersTitle")}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setOpenOrders(undefined);
                if (usr && usr.id) {
                  revalidateAccountLimitOrders(usr.chain, usr.id);
                }
                setOpenOrderCounter((c) => c + 1);
              }}
              disabled={openOrdersLoading}
              aria-busy={openOrdersLoading}
              className="gap-2 bg-[hsl(var(--accent-1))] hover:bg-[hsl(var(--accent-1))] text-foreground"
            >
              {openOrdersLoading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{t("PortfolioTabs:refreshOpenOrdersButton")}</span>
            </Button>
          </CardTitle>
        </Card>

        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
          <CardContent>
            {openOrdersLoading && !hasOrders ? (
              <div
                className="space-y-2"
                aria-busy="true"
                aria-live="polite"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-accent/20"
                  >
                    <Skeleton className="h-5 w-12 rounded-full bg-accent/50" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-48 bg-accent/50" />
                      <Skeleton className="h-3 w-32 bg-accent/50" />
                    </div>
                    <Skeleton className="h-4 w-20 bg-accent/50" />
                    <Skeleton className="h-4 w-20 bg-accent/50" />
                    <div className="flex gap-1">
                      <Skeleton className="h-8 w-8 rounded-full bg-accent/50" />
                      <Skeleton className="h-8 w-8 rounded-full bg-accent/50" />
                      <Skeleton className="h-8 w-8 rounded-full bg-accent/50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : hasOrders ? (
              <>
                <div className="flex items-center gap-2 mb-2 mt-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-8 w-[160px] text-xs bg-accent/30 dark:bg-white/[0.05] border-border text-foreground/70">
                      <SelectValue className="text-foreground/70" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border shadow-2xl dark:shadow-black/40 shadow-black/15">
                      <SelectItem value="newest" className="text-foreground/70 focus:bg-white/[0.08] focus:text-foreground">
                        {t("PortfolioTabs:default")} (Newest)
                      </SelectItem>
                      <SelectItem value="expiry" className="text-foreground/70 focus:bg-white/[0.08] focus:text-foreground">
                        {t("PortfolioTabs:expirationHeader")}
                      </SelectItem>
                      <SelectItem value="price" className="text-foreground/70 focus:bg-white/[0.08] focus:text-foreground">
                        {t("PortfolioTabs:priceHeader")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full h-[600px] -mx-2 pt-2">
                  <List
                    rowComponent={OpenOrdersRow}
                    rowCount={sortedOpenOrders.length}
                    rowHeight={rowHeight}
                    height={600}
                    width="100%"
                    rowProps={openOrdersRowProps}
                  />
                </div>
              </>
            ) : (
              <Empty className="mt-2 border border-border/60 rounded-xl bg-accent/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
                    <ClipboardList className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground/80">{t("PortfolioTabs:noOpenOrdersTitle")}</EmptyTitle>
                  <EmptyDescription className="text-muted-foreground">
                    {t("PortfolioTabs:noOpenOrdersDescription")}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild className="bg-[hsl(var(--accent-1))] hover:bg-[hsl(var(--accent-1))] text-foreground">
                    <a href="/dex.html">
                      {t("PortfolioTabs:noOpenOrdersCta")}
                    </a>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        <DexLiveFooterCard
          lastFetchAt={liveOrders.lastFetchAt}
          isSubscribed={liveOrders.isSubscribed}
          blockNumber={liveOrders.blockNumber}
          nodeUrl={ooNodeUrl}
          warningThresholdSec={10}
        
        chain={usr?.chain}/>
      </div>
    </div>
  );
}