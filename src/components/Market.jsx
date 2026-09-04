import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeftRight,
  LineChart,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ExternalLink as ExternalLinkIcon,
  Activity,
  Wallet,
} from "lucide-react";

import { trimPrice, isInvertedMarket } from "@/lib/common";
import { createMarketTradeHistoryStore } from "@/nanoeffects/MarketTradeHistory.ts";
import { createMarketOrderStore } from "@/nanoeffects/MarketOrderBook.ts";
import { useDexOrderBookLive } from "@/hooks/useDexLiveSubscriptions";
import { useMarketCandles } from "@/hooks/useMarketCandles";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";
import { $currentNode } from "@/stores/node.ts";
import CandleChart from "./InstantTrade/CandleChart.jsx";
import DepthChart from "./InstantTrade/DepthChart.jsx";

import LimitOrderCard from "./Market/LimitOrderCard.jsx";
import MarketOrderCard from "./Market/MarketOrderCard.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import MarketSummaryTabs from "./Market/MarketSummaryTabs.jsx";
import Sparkline from "./Market/Sparkline.jsx";
import ExternalLink from "./common/ExternalLink.jsx";
import { getTimeSince } from "@/lib/common";
import { cn } from "@/lib/utils";

function SummaryRow({ icon, label, value, color = "text-foreground/85" }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-white/[0.015] px-2.5 py-1.5">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span>{label}</span>
      </div>
      <div className={cn("text-xs font-mono tabular-nums font-semibold truncate", color)}>
        {value}
      </div>
    </div>
  );
}

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

  const [previousBuyOrders, setPreviousBuyOrders] = useState([]);
  const [previousSellOrders, setPreviousSellOrders] = useState([]);

  const [usrBalances, setUsrBalances] = useState(null);
  const [usrLimitOrders, setUsrLimitOrders] = useState(null);
  const [publicMarketHistory, setPublicMarketHistory] = useState(null);
  const [usrHistory, setUsrHistory] = useState(null);
  const [tickerData, setTickerData] = useState(null);

  const [marketItr, setMarketItr] = useState(0);
  const [orderBookItr, setOrderBookItr] = useState(0);
  const currentNode = useStore($currentNode);

  // style states
  const [activeLimitCard, setActiveLimitCard] = useState("buy");
  const [activeMOC, setActiveMOC] = useState("buy");

  const invertedMarket = useMemo(() => {
    return isInvertedMarket(assetAData.id, assetBData.id);
  }, [assetAData, assetBData]);

  useEffect(() => {
    async function parseURL() {
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const _type = params.type;

      let finalType = activeLimitCard;
      if (_type === "buy" || _type === "sell") {
        finalType = _type;
      }

      return {
        finalType,
      };
    }

    parseURL().then(({ finalType }) => {
      if (finalType !== activeLimitCard) {
        setActiveLimitCard(finalType);
      }
    });
  }, []);

  function _resetOrders() {
    setBuyOrders(null);
    setSellOrders(null);
  }

  function _resetMarketData() {
    // If either asset changes then several states need to be erased
    setUsrBalances(null);
    setUsrLimitOrders(null);
    setPublicMarketHistory(null);
    setUsrHistory(null);
    setTickerData(null);
  }

  const marketOrdersStore = useMemo(() => {
    return createMarketOrderStore([usr.chain, assetA, assetB, 50]);
  }, [usr, assetA, assetB, orderBookItr]);

  const {
    data: marketOrdersData,
    loading: marketOrdersLoading,
    error: marketOrdersError,
  } = useStore(marketOrdersStore);

  // Live DEX subscription (pilot, 500ms batch like bitshares-ui)
  // Mirrors MarketOrderBook.ts polling swap: poll uses get_order_book(base=assetB, quote=assetA) via fetcher inversion.
  // We use asset ids directly for live subscription (more reliable than symbols).
  // Pass currentNode.url for both mainnet/testnet node switching (nodes page)
  const dexNodeUrl = currentNode?.chain === usr.chain ? currentNode?.url : null;
  const {
    bids: liveBids,
    asks: liveAsks,
    loading: liveOrderBookLoading,
    error: liveOrderBookError,
    isSubscribed: isLiveSubscribed,
    lastFetchAt: liveLastFetchAt,
    blockNumber: liveBlockNumber,
    balances: liveBalances,
    marketHistory: liveMarketHistory,
    usrLimitOrders: liveUsrLimitOrders,
    usrTrades: liveUsrTrades,
    ticker: liveTicker,
    historyAvailable: liveHistoryAvailable,
  } = useDexOrderBookLive({
    chain: usr.chain,
    baseId: assetBData?.id ?? null,
    quoteId: assetAData?.id ?? null,
    accountId: usr.id ?? null,
    enabled: !!assetAData && !!assetBData,
    limit: 50,
    specificNode: dexNodeUrl,
  });

  // Prefer live subscription when available; fallback to nanoquery poll store
  useEffect(() => {
    if (isLiveSubscribed && liveBids && liveAsks) {
      setBuyOrders(liveBids);
      setSellOrders(liveAsks);
      setPreviousBuyOrders(liveBids);
      setPreviousSellOrders(liveAsks);
      return;
    }
    if (marketOrdersData && !marketOrdersLoading && !marketOrdersError) {
      setBuyOrders(marketOrdersData.bids);
      setSellOrders(marketOrdersData.asks);
      setPreviousBuyOrders(marketOrdersData.bids);
      setPreviousSellOrders(marketOrdersData.asks);
    } else if (!isLiveSubscribed) {
      setBuyOrders(null);
      setSellOrders(null);
    }
  }, [
    liveBids,
    liveAsks,
    isLiveSubscribed,
    marketOrdersData,
    marketOrdersLoading,
    marketOrdersError,
  ]);

  // Candle history — subscription-adaptive (re-fetch on market push), side-by-side charts Option B
  const [candleBucketSec, setCandleBucketSec] = useState(3600);
  const {
    candles,
    buckets,
    loading: candlesLoading,
    historyAvailable: candlesHistoryAvailable,
    lastFetchAt: candlesLastFetchAt,
  } = useMarketCandles({
    chain: usr.chain ?? "",
    baseId: assetBData?.id ?? null,
    quoteId: assetAData?.id ?? null,
    basePrecision: assetBData?.precision ?? null,
    quotePrecision: assetAData?.precision ?? null,
    bucketSeconds: candleBucketSec,
    enabled: !!assetAData && !!assetBData,
    specificNode: dexNodeUrl,
    liveTick: liveLastFetchAt,
  });

  // Use the store
  const marketHistoryStore = useMemo(() => {
    return createMarketTradeHistoryStore([
      usr.chain,
      assetAData.id,
      assetBData.id,
      usr.id,
    ]);
  }, [usr, assetAData, assetBData, marketItr]);

  const {
    data: marketHistoryData,
    loading: marketHistoryLoading,
    error: marketHistoryError,
  } = useStore(marketHistoryStore);

  useEffect(() => {
    // Live subscription provides ticker/balances/limit-orders on every market push.
    // History slices (marketHistory/usrTrades) are only trusted when the node has
    // its history plugin enabled (liveHistoryAvailable); otherwise fall back to
    // the polling store below so users on restricted nodes still see trade history.
    if (isLiveSubscribed && liveTicker) {
      setTickerData(liveTicker);
    }
    if (isLiveSubscribed && liveBalances) {
      setUsrBalances(liveBalances);
    }
    if (isLiveSubscribed && liveUsrLimitOrders) {
      setUsrLimitOrders(liveUsrLimitOrders);
    }
    if (isLiveSubscribed && liveHistoryAvailable && liveMarketHistory) {
      setPublicMarketHistory(liveMarketHistory);
    }
    if (isLiveSubscribed && liveHistoryAvailable && liveUsrTrades) {
      setUsrHistory(liveUsrTrades);
    }

    if (marketHistoryData && !marketHistoryLoading && !marketHistoryError) {
      // polling store fills any slice the live subscription doesn't cover
      // (history-disabled nodes, or before first live push)
      setUsrBalances((prev) => prev ?? marketHistoryData.balances);
      setUsrLimitOrders((prev) => prev ?? marketHistoryData.accountLimitOrders);
      setPublicMarketHistory((prev) => {
        const liveStale = isLiveSubscribed && !liveHistoryAvailable;
        return liveStale || prev === null ? marketHistoryData.marketHistory : (prev ?? marketHistoryData.marketHistory);
      });
      setUsrHistory((prev) => {
        const liveStale = isLiveSubscribed && !liveHistoryAvailable;
        return liveStale || prev === null ? marketHistoryData.usrTrades : (prev ?? marketHistoryData.usrTrades);
      });
      setTickerData((prev) => prev ?? marketHistoryData.ticker);
    } else if (!isLiveSubscribed) {
      setUsrBalances(null);
      setUsrLimitOrders(null);
      setPublicMarketHistory(null);
      setUsrHistory(null);
      setTickerData(null);
    }
  }, [
    isLiveSubscribed,
    liveTicker,
    liveBalances,
    liveUsrLimitOrders,
    liveMarketHistory,
    liveUsrTrades,
    liveHistoryAvailable,
    marketHistoryData,
    marketHistoryLoading,
    marketHistoryError,
  ]);

  const percentChangeNum = parseFloat(
    String(tickerData?.percent_change || "").replace("%", "")
  );
  const isPositiveChange = !isNaN(percentChangeNum) && percentChangeNum >= 0;

  const spreadInfo = useMemo(() => {
    if (
      !tickerData ||
      tickerData.lowest_ask == null ||
      tickerData.highest_bid == null
    )
      return null;
    const ask = parseFloat(tickerData.lowest_ask);
    const bid = parseFloat(tickerData.highest_bid);
    if (!isFinite(ask) || !isFinite(bid) || ask <= 0) return null;
    const diff = ask - bid;
    const pct = (diff / ask) * 100;
    return { abs: diff, pct, ask, bid };
  }, [tickerData]);

  const sparklineData = useMemo(() => {
    if (!publicMarketHistory || publicMarketHistory.length < 2) return [];
    const sorted = [...publicMarketHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const recent = sorted.slice(-40);
    return recent.map((trade) => ({
      value: parseFloat(trade.price),
      label: getTimeSince(trade.date),
    }));
  }, [publicMarketHistory]);

  // Order book stats
  const orderBookStats = useMemo(() => {
    const stats = {
      buyOrderCount: 0,
      sellOrderCount: 0,
      totalBuyDepth: 0,
      totalSellDepth: 0,
      largestBuyWall: 0,
      largestSellWall: 0,
    };

    if (buyOrders && buyOrders.length) {
      stats.buyOrderCount = buyOrders.length;
      stats.totalBuyDepth = buyOrders.reduce(
        (acc, order) => acc + parseFloat(order.base),
        0
      );
      stats.largestBuyWall = Math.max(
        ...buyOrders.map((order) => parseFloat(order.base))
      );
    }

    if (sellOrders && sellOrders.length) {
      stats.sellOrderCount = sellOrders.length;
      stats.totalSellDepth = sellOrders.reduce(
        (acc, order) => acc + parseFloat(order.base),
        0
      );
      stats.largestSellWall = Math.max(
        ...sellOrders.map((order) => parseFloat(order.base))
      );
    }

    return stats;
  }, [buyOrders, sellOrders]);

  // Market history stats
  const marketHistoryStats = useMemo(() => {
    const stats = {
      completedBuyTrades: 0,
      completedSellTrades: 0,
      totalBuyVolume: 0,
      totalSellVolume: 0,
      avgBuyTradeSize: 0,
      avgSellTradeSize: 0,
    };

    if (publicMarketHistory && publicMarketHistory.length) {
      const buyTrades = publicMarketHistory.filter((x) => x.type === "buy");
      const sellTrades = publicMarketHistory.filter((x) => x.type === "sell");

      stats.completedBuyTrades = buyTrades.length;
      stats.completedSellTrades = sellTrades.length;

      stats.totalBuyVolume = buyTrades.reduce(
        (acc, trade) => acc + parseFloat(trade.amount),
        0
      );
      stats.totalSellVolume = sellTrades.reduce(
        (acc, trade) => acc + parseFloat(trade.amount),
        0
      );

      stats.avgBuyTradeSize =
        stats.completedBuyTrades > 0
          ? stats.totalBuyVolume / stats.completedBuyTrades
          : 0;
      stats.avgSellTradeSize =
        stats.completedSellTrades > 0
          ? stats.totalSellVolume / stats.completedSellTrades
          : 0;
    }

    return stats;
  }, [publicMarketHistory]);

  // User activity stats
  const userActivityStats = useMemo(() => {
    const stats = {
      myOpenBuyOrders: 0,
      myOpenSellOrders: 0,
      myBuyOrderValue: 0,
      mySellOrderValue: 0,
      myCompletedBuyTrades: 0,
      myCompletedSellTrades: 0,
      myBuyTradeVolume: 0,
      mySellTradeVolume: 0,
    };

    // My open orders
    if (usrLimitOrders && usrLimitOrders.length) {
      const buyOrdersFiltered = usrLimitOrders.filter(
        (order) => order.sell_price.quote.asset_id === assetBData?.id
      );
      const sellOrdersFiltered = usrLimitOrders.filter(
        (order) => order.sell_price.quote.asset_id === assetAData?.id
      );

      stats.myOpenBuyOrders = buyOrdersFiltered.length;
      stats.myOpenSellOrders = sellOrdersFiltered.length;

      stats.myBuyOrderValue = buyOrdersFiltered.reduce(
        (acc, order) => acc + parseFloat(order.for_sale || 0),
        0
      );
      stats.mySellOrderValue = sellOrdersFiltered.reduce(
        (acc, order) => acc + parseFloat(order.for_sale || 0),
        0
      );
    }

    // My completed trades
    if (usrHistory && usrHistory.length && assetAData && assetBData) {
      const myBuyTrades = usrHistory.filter(
        (x) =>
          x.op[1].pays.asset_id === assetBData.id &&
          x.op[1].receives.asset_id === assetAData.id
      );
      const mySellTrades = usrHistory.filter(
        (x) =>
          x.op[1].pays.asset_id === assetAData.id &&
          x.op[1].receives.asset_id === assetBData.id
      );

      stats.myCompletedBuyTrades = myBuyTrades.length;
      stats.myCompletedSellTrades = mySellTrades.length;

      stats.myBuyTradeVolume = myBuyTrades.reduce(
        (acc, trade) => acc + parseFloat(trade.op[1].receives.amount || 0),
        0
      );
      stats.mySellTradeVolume = mySellTrades.reduce(
        (acc, trade) => acc + parseFloat(trade.op[1].receives.amount || 0),
        0
      );
    }

    return stats;
  }, [usrLimitOrders, usrHistory, assetAData, assetBData]);

  const marketSummaryCard = (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[hsl(var(--accent-1)/0.15)] via-[hsl(var(--accent-1)/0.03)] to-transparent" />
      <div className="relative">
        <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
              {t("Market:marketSummary")}
            </h3>
            <p className="text-[11px] text-muted-foreground/70 font-mono tabular-nums truncate">
              {activeLimitCard === "buy" ? `${assetA}/${assetB}` : `${assetB}/${assetA}`}
            </p>
          </div>
          {sparklineData.length > 1 ? (
            <Sparkline
              data={sparklineData}
              width={120}
              height={36}
              strokeWidth={1.5}
              className="shrink-0"
            />
          ) : null}
        </div>

        <div className="p-4 space-y-2.5">
          <SummaryRow
            icon={<Activity className="h-3.5 w-3.5" />}
            label={t("Market:latestPrice")}
            value={
              tickerData && assetAData
                ? trimPrice(tickerData.latest, assetAData.precision)
                : "?"
            }
            color="text-[hsl(var(--accent-warning-fg))]"
          />
          <SummaryRow
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={t("Market:24HrChange")}
            value={tickerData ? tickerData.percent_change : "?"}
            color={
              !tickerData
                ? "text-muted-foreground"
                : isPositiveChange
                ? "text-[hsl(var(--accent-success-fg))]"
                : "text-[hsl(var(--accent-danger-fg))]"
            }
          />
          <SummaryRow
            icon={<Wallet className="h-3.5 w-3.5" />}
            label={t("Market:24HrBaseVolume")}
            value={
              !tickerData
                ? "?"
                : activeLimitCard === "buy"
                ? tickerData.base_volume
                : tickerData.quote_volume
            }
            color="text-foreground/85"
          />
          <SummaryRow
            icon={<Wallet className="h-3.5 w-3.5" />}
            label={t("Market:24HrQuoteVolume")}
            value={
              !tickerData
                ? "?"
                : activeLimitCard === "buy"
                ? tickerData.quote_volume
                : tickerData.base_volume
            }
            color="text-foreground/85"
          />
          <SummaryRow
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label={t("Market:lowestAsk")}
            value={
              tickerData && assetAData
                ? trimPrice(tickerData.lowest_ask, assetAData.precision)
                : "?"
            }
            color="text-[hsl(var(--accent-danger-fg))]"
          />
          <SummaryRow
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={t("Market:highestBid")}
            value={
              tickerData && assetAData
                ? trimPrice(tickerData.highest_bid, assetAData.precision)
                : "?"
            }
            color="text-[hsl(var(--accent-success-fg))]"
          />
          {spreadInfo ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-white/[0.025] px-2.5 py-2 mt-1">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                </span>
                <span>{t("Market:spread")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums font-semibold">
                <span className="text-foreground/85">
                  {spreadInfo.pct.toFixed(3)}%
                </span>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                    spreadInfo.pct < 1
                      ? "bg-[hsl(var(--accent-success)/0.15)] text-[hsl(var(--accent-success-fg))]"
                      : spreadInfo.pct < 5
                      ? "bg-[hsl(var(--accent-warning)/0.15)] text-[hsl(var(--accent-warning-fg))]"
                      : "bg-[hsl(var(--accent-danger)/0.15)] text-[hsl(var(--accent-danger-fg))]"
                  )}
                >
                  {spreadInfo.pct < 1
                    ? t("Market:spreadTight")
                    : spreadInfo.pct < 5
                    ? t("Market:spreadNormal")
                    : t("Market:spreadWide")}
                </span>
              </div>
            </div>
          ) : null}

          {/* Order Book Stats */}
          <div className="pt-2 mt-2 border-t border-border/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("Market:orderBookSection")}
            </p>
          </div>
          <SummaryRow
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={t("Market:openBuyOrders")}
            value={orderBookStats.buyOrderCount}
            color="text-[hsl(var(--accent-success-fg))]"
          />
          <SummaryRow
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label={t("Market:openSellOrders")}
            value={orderBookStats.sellOrderCount}
            color="text-[hsl(var(--accent-danger-fg))]"
          />
          <SummaryRow
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={t("Market:totalBuyDepth")}
            value={
              assetBData
                ? orderBookStats.totalBuyDepth.toFixed(assetBData.precision)
                : orderBookStats.totalBuyDepth.toFixed(2)
            }
            color="text-[hsl(var(--accent-success-fg))]"
          />
          <SummaryRow
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label={t("Market:totalSellDepth")}
            value={
              assetBData
                ? orderBookStats.totalSellDepth.toFixed(assetBData.precision)
                : orderBookStats.totalSellDepth.toFixed(2)
            }
            color="text-[hsl(var(--accent-danger-fg))]"
          />
          <SummaryRow
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={t("Market:largestBuyWall")}
            value={
              assetBData
                ? orderBookStats.largestBuyWall.toFixed(assetBData.precision)
                : orderBookStats.largestBuyWall.toFixed(2)
            }
            color="text-[hsl(var(--accent-success-fg))]"
          />
          <SummaryRow
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label={t("Market:largestSellWall")}
            value={
              assetBData
                ? orderBookStats.largestSellWall.toFixed(assetBData.precision)
                : orderBookStats.largestSellWall.toFixed(2)
            }
            color="text-[hsl(var(--accent-danger-fg))]"
          />

          {/* Recent Trades Stats */}
          <div className="pt-2 mt-2 border-t border-border/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("Market:recentTradesSection")}
            </p>
          </div>
          <SummaryRow
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={t("Market:completedBuyTrades")}
            value={marketHistoryStats.completedBuyTrades}
            color="text-[hsl(var(--accent-success-fg))]"
          />
          <SummaryRow
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label={t("Market:completedSellTrades")}
            value={marketHistoryStats.completedSellTrades}
            color="text-[hsl(var(--accent-danger-fg))]"
          />
          <SummaryRow
            icon={<Wallet className="h-3.5 w-3.5" />}
            label={t("Market:totalBuyVolume")}
            value={
              assetAData
                ? marketHistoryStats.totalBuyVolume.toFixed(assetAData.precision)
                : marketHistoryStats.totalBuyVolume.toFixed(2)
            }
            color="text-[hsl(var(--accent-success-fg))]"
          />
          <SummaryRow
            icon={<Wallet className="h-3.5 w-3.5" />}
            label={t("Market:totalSellVolume")}
            value={
              assetAData
                ? marketHistoryStats.totalSellVolume.toFixed(assetAData.precision)
                : marketHistoryStats.totalSellVolume.toFixed(2)
            }
            color="text-[hsl(var(--accent-danger-fg))]"
          />
          <SummaryRow
            icon={<Activity className="h-3.5 w-3.5" />}
            label={t("Market:avgBuyTradeSize")}
            value={
              assetAData
                ? marketHistoryStats.avgBuyTradeSize.toFixed(assetAData.precision)
                : marketHistoryStats.avgBuyTradeSize.toFixed(2)
            }
            color="text-[hsl(var(--accent-success-fg))]"
          />
          <SummaryRow
            icon={<Activity className="h-3.5 w-3.5" />}
            label={t("Market:avgSellTradeSize")}
            value={
              assetAData
                ? marketHistoryStats.avgSellTradeSize.toFixed(assetAData.precision)
                : marketHistoryStats.avgSellTradeSize.toFixed(2)
            }
            color="text-[hsl(var(--accent-danger-fg))]"
          />

          {/* User Activity Stats */}
          {(usrLimitOrders?.length > 0 || usrHistory?.length > 0) && (
            <>
              <div className="pt-2 mt-2 border-t border-border/40">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("Market:myActivitySection")}
                </p>
              </div>
              <SummaryRow
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label={t("Market:myOpenBuyOrders")}
                value={userActivityStats.myOpenBuyOrders}
                color="text-[hsl(var(--accent-success-fg))]"
              />
              <SummaryRow
                icon={<TrendingDown className="h-3.5 w-3.5" />}
                label={t("Market:myOpenSellOrders")}
                value={userActivityStats.myOpenSellOrders}
                color="text-[hsl(var(--accent-danger-fg))]"
              />
              <SummaryRow
                icon={<Wallet className="h-3.5 w-3.5" />}
                label={t("Market:myBuyOrderValue")}
                value={
                  assetAData
                    ? userActivityStats.myBuyOrderValue.toFixed(assetAData.precision)
                    : userActivityStats.myBuyOrderValue.toFixed(2)
                }
                color="text-[hsl(var(--accent-success-fg))]"
              />
              <SummaryRow
                icon={<Wallet className="h-3.5 w-3.5" />}
                label={t("Market:mySellOrderValue")}
                value={
                  assetAData
                    ? userActivityStats.mySellOrderValue.toFixed(assetAData.precision)
                    : userActivityStats.mySellOrderValue.toFixed(2)
                }
                color="text-[hsl(var(--accent-danger-fg))]"
              />
              <SummaryRow
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label={t("Market:myCompletedBuyTrades")}
                value={userActivityStats.myCompletedBuyTrades}
                color="text-[hsl(var(--accent-success-fg))]"
              />
              <SummaryRow
                icon={<TrendingDown className="h-3.5 w-3.5" />}
                label={t("Market:myCompletedSellTrades")}
                value={userActivityStats.myCompletedSellTrades}
                color="text-[hsl(var(--accent-danger-fg))]"
              />
              <SummaryRow
                icon={<Wallet className="h-3.5 w-3.5" />}
                label={t("Market:myBuyTradeVolume")}
                value={
                  assetAData
                    ? userActivityStats.myBuyTradeVolume.toFixed(assetAData.precision)
                    : userActivityStats.myBuyTradeVolume.toFixed(2)
                }
                color="text-[hsl(var(--accent-success-fg))]"
              />
              <SummaryRow
                icon={<Wallet className="h-3.5 w-3.5" />}
                label={t("Market:mySellTradeVolume")}
                value={
                  assetAData
                    ? userActivityStats.mySellTradeVolume.toFixed(assetAData.precision)
                    : userActivityStats.mySellTradeVolume.toFixed(2)
                }
                color="text-[hsl(var(--accent-danger-fg))]"
              />
            </>
          )}
        </div>

        {usr.chain === "bitshares" ? (
          <div className="border-t border-border/60 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("Market:externalMarketLinks")}
            </p>
            <div className="flex flex-wrap gap-2">
              <ExternalLink
                hyperlink={
                  activeLimitCard === "buy"
                    ? `https://bts.exchange/#/market/${assetA}_${assetB}`
                    : `https://bts.exchange/#/market/${assetB}_${assetA}`
                }
                type="text"
                text="BTS.Exchange"
                classnamecontents="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 dark:hover:border-white/20 px-2.5 py-1.5 text-xs text-foreground/80 hover:text-accent-foreground transition-all cursor-pointer"
              />
              <ExternalLink
                hyperlink={
                  activeLimitCard === "buy"
                    ? `https://ex.xbts.io/market/${assetA}_${assetB}`
                    : `https://ex.xbts.io/market/${assetB}_${assetA}`
                }
                type="text"
                text="XBTS"
                classnamecontents="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 dark:hover:border-white/20 px-2.5 py-1.5 text-xs text-foreground/80 hover:text-accent-foreground transition-all cursor-pointer"
              />

              {/* Internal links: Pools and Credit Offers for quick access */}
              <a
                href={`/swap.html?market=${assetA}_${assetB}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 px-2.5 py-1.5 text-xs text-foreground/80 hover:text-accent-foreground transition-all"
              >
                <ExternalLinkIcon className="h-3 w-3" />
                Pools
              </a>

              <a
                href={`/lend.html?asset=${assetA}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 px-2.5 py-1.5 text-xs text-foreground/80 hover:text-accent-foreground transition-all"
              >
                <ExternalLinkIcon className="h-3 w-3" />
                Credit Offers
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="col-span-1 space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl"
              >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[hsl(var(--accent-1)/0.15)] via-[hsl(var(--accent-1)/0.03)] to-transparent" />
              <div className="relative flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))]">
                    <LineChart className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
                      {t("Market:controls")}
                    </h3>
                    <p className="text-[11px] text-muted-foreground/70 font-mono">
                      {usr.chain === "bitshares" ? "Bitshares" : "Bitshares (Testnet)"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-4">
                <div className="rounded-lg border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.04)] px-3 py-2">
                  <AssetDropDown
                    assetSymbol={assetA}
                    assetData={assetAData}
                    storeCallback={setAssetA}
                    otherAsset={assetB}
                    marketSearch={marketSearch}
                    type={activeLimitCard === "buy" ? "quote" : "base"}
                    size="small"
                    chain={usr.chain}
                    balances={balances}
                  />
                </div>
                <a
                  href={`/dex.html?market=${assetB}_${assetA}`}
                  className="group flex h-10 w-10 items-center justify-center rounded-full border border-border bg-accent/40 hover:bg-[hsl(var(--accent-1)/0.1)] hover:border-[hsl(var(--accent-1)/0.4)] transition-all"
                  title="Swap assets"
                >
                  <ArrowLeftRight className="h-4 w-4 text-foreground/70 group-hover:text-[hsl(var(--accent-1-fg))] group-hover:rotate-180 transition-all duration-300" />
                </a>
                <div className="rounded-lg border border-[hsl(var(--accent-2)/0.2)] bg-[hsl(var(--accent-2)/0.04)] px-3 py-2">
                  <AssetDropDown
                    assetSymbol={assetB}
                    assetData={assetBData}
                    storeCallback={setAssetB}
                    otherAsset={assetA}
                    marketSearch={marketSearch}
                    type={activeLimitCard === "sell" ? "quote" : "base"}
                    size="small"
                    chain={usr.chain}
                    balances={balances}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-accent/20 p-1">
              <button
                type="button"
                disabled={!assetAData || !assetBData}
                onClick={() => {
                  if (activeLimitCard === "buy") return;
                  setActiveLimitCard("buy");
                  window.history.replaceState(
                    {},
                    "",
                    `${window.location.pathname}?${new URLSearchParams({
                      ...new URLSearchParams(window.location.search),
                      price: 0,
                      amount: 0,
                    }).toString()}`
                  );
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                  activeLimitCard === "buy"
                    ? "bg-gradient-to-r from-[hsl(var(--accent-success))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] text-[hsl(var(--accent-success-gradFg))] shadow-lg shadow-[color:hsl(var(--accent-success)/0.3)]"
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-accent/40",
                  (!assetAData || !assetBData) && "opacity-50 cursor-not-allowed"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                {t("Market:buy")}
              </button>
              <button
                type="button"
                disabled={!assetAData || !assetBData}
                onClick={() => {
                  if (activeLimitCard === "sell") return;
                  setActiveLimitCard("sell");
                  window.history.replaceState(
                    {},
                    "",
                    `${window.location.pathname}?${new URLSearchParams({
                      ...new URLSearchParams(window.location.search),
                      price: 0,
                    }).toString()}`
                  );
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                  activeLimitCard === "sell"
                    ? "bg-gradient-to-r from-[hsl(var(--accent-danger))] via-[hsl(var(--accent-warning))] to-[hsl(var(--accent-warning))] text-[hsl(var(--accent-danger-gradFg))] shadow-lg shadow-[color:hsl(var(--accent-danger)/0.3)]"
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-accent/40",
                  (!assetAData || !assetBData) && "opacity-50 cursor-not-allowed"
                )}
              >
                <TrendingDown className="h-4 w-4" />
                {t("Market:sell")}
              </button>
            </div>

            <LimitOrderCard
              usr={usr}
              thisAssetA={assetA}
              thisAssetB={assetB}
              assetAData={assetAData}
              assetBData={assetBData}
              buyOrders={buyOrders}
              sellOrders={sellOrders}
              usrBalances={usrBalances}
              orderType={activeLimitCard}
              key={activeLimitCard}
              marketSearch={marketSearch}
              fee={limitOrderFee}
              invertedMarket={invertedMarket}
            />
          </div>
          <div className="col-span-1">
            {tickerData && assetAData && assetBData ? marketSummaryCard : (
              <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[hsl(var(--accent-1)/0.15)] via-[hsl(var(--accent-1)/0.03)] to-transparent" />
                <div className="relative">
                  <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))]">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
                        {t("Market:marketSummary")}
                      </h3>
                      <p className="text-[11px] text-muted-foreground/70 font-mono">❔/❔</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-2.5">
                    <SummaryRow icon={<Activity className="h-3.5 w-3.5" />} label={t("Market:latestPrice")} value="❔" color="text-muted-foreground" />
                    <SummaryRow icon={<TrendingUp className="h-3.5 w-3.5" />} label={t("Market:24HrChange")} value="❔" color="text-muted-foreground" />
                    <SummaryRow icon={<Wallet className="h-3.5 w-3.5" />} label={t("Market:24HrBaseVolume")} value="❔" color="text-muted-foreground" />
                    <SummaryRow icon={<Wallet className="h-3.5 w-3.5" />} label={t("Market:24HrQuoteVolume")} value="❔" color="text-muted-foreground" />
                    <SummaryRow icon={<TrendingDown className="h-3.5 w-3.5" />} label={t("Market:lowestAsk")} value="❔" color="text-muted-foreground" />
                    <SummaryRow icon={<TrendingUp className="h-3.5 w-3.5" />} label={t("Market:highestBid")} value="❔" color="text-muted-foreground" />
                    <div className="pt-2 mt-2 border-t border-border/40">
                      <Skeleton className="h-3 w-20 bg-accent/30 dark:bg-white/[0.05]" />
                    </div>
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <div className="pt-2 mt-2 border-t border-border/40">
                      <Skeleton className="h-3 w-24 bg-accent/30 dark:bg-white/[0.05]" />
                    </div>
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-full bg-accent/30 dark:bg-white/[0.05]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <CandleChart
            candles={candles}
            buckets={buckets}
            bucketSec={candleBucketSec}
            onBucketChange={setCandleBucketSec}
            baseSymbol={assetB}
            quoteSymbol={assetA}
            loading={candlesLoading}
            historyAvailable={candlesHistoryAvailable}
            lastFetchAt={candlesLastFetchAt}
          />
          <DepthChart
            bids={buyOrders}
            asks={sellOrders}
            baseSymbol={assetB}
            quoteSymbol={assetA}
            loading={!buyOrders && !sellOrders}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <div>
            {assetADetails ? (
              <MarketAssetCard
                asset={assetA}
                assetData={assetAData}
                assetDetails={assetADetails}
                bitassetData={assetABitassetData}
                marketSearch={marketSearch}
                chain={usr.chain}
                usrBalances={usrBalances}
                type={activeLimitCard === "buy" ? "buy" : "sell"}
                otherAsset={assetB}
                storeCallback={setAssetA}
              />
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl">
                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-muted-foreground">
                      {activeLimitCard === "buy"
                        ? t("Market:quoteAsset")
                        : t("Market:baseAsset")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t("Market:loading")}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px] bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-[200px] bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-[250px] bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-[200px] bg-accent/30 dark:bg-white/[0.05]" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            {assetBDetails ? (
              <MarketAssetCard
                asset={assetB}
                assetData={assetBData}
                assetDetails={assetBDetails}
                bitassetData={assetBBitassetData}
                marketSearch={marketSearch}
                chain={usr.chain}
                usrBalances={usrBalances}
                type={activeLimitCard === "sell" ? "buy" : "sell"}
                otherAsset={assetA}
                storeCallback={setAssetB}
              />
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl">
                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-muted-foreground">
                      {activeLimitCard === "sell"
                        ? t("Market:baseAsset")
                        : t("Market:quoteAsset")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t("Market:loading")}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px] bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-[200px] bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-[250px] bg-accent/30 dark:bg-white/[0.05]" />
                    <Skeleton className="h-4 w-[200px] bg-accent/30 dark:bg-white/[0.05]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 mt-5">
          {assetAData && assetBData ? (
            <>
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
                {buyOrders && (!marketOrdersLoading || isLiveSubscribed) ? (
                  <MarketOrderCard
                    cardType="buy"
                    assetA={assetA}
                    assetAData={assetAData}
                    assetB={assetB}
                    assetBData={assetBData}
                    marketOrders={buyOrders}
                  />
                ) : null}
                {sellOrders && (!marketOrdersLoading || isLiveSubscribed) ? (
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

        {assetA && assetB ? (
          <MarketSummaryTabs
            activeLimitCard={activeLimitCard}
            assetAData={assetAData}
            assetBData={assetBData}
            usr={usr}
            marketItr={marketItr}
            setMarketItr={setMarketItr}
            usrLimitOrders={usrLimitOrders}
            publicMarketHistory={publicMarketHistory}
            usrHistory={usrHistory}
            _resetMarketData={_resetMarketData}
          />
        ) : null}

        <DexLiveFooterCard
          lastFetchAt={liveLastFetchAt}
          isSubscribed={isLiveSubscribed}
          blockNumber={liveBlockNumber}
          nodeUrl={dexNodeUrl || (usr.chain === "bitshares" ? "wss://node.xbts.io/ws" : "wss://testnet.dex.trading/")}
          warningThresholdSec={10}
        
        chain={usr?.chain}/>
      </div>
    </>
  );
}
