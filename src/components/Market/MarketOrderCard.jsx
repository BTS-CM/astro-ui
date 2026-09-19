import React, { useState, useEffect, useMemo } from "react";
import { List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import {
  TrendingDown,
  TrendingUp,
  Inbox,
  ArrowRight,
  Wallet,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MarketOrderRow = React.memo(function MarketOrderRow({ index, style, marketOrders, isBuy, assetA, assetB, assetAData, assetBData, totalBase, cardType, t }) {
    const order = marketOrders[index];

    const price = parseFloat(order.price).toFixed(assetBData.precision);
    const base = parseFloat(order.base);
    const quote = parseFloat(order.quote);

    const cumulativeBase = marketOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.base))
      .reduce((acc, curr) => acc + curr, 0)
      .toFixed(assetBData.precision);

    const cumulativeQuote = marketOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.quote))
      .reduce((acc, curr) => acc + curr, 0)
      .toFixed(assetAData.precision);

    const cumulativeForDepth = marketOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.base))
      .reduce((acc, curr) => acc + curr, 0);

    const depthPercent =
      totalBase > 0 ? Math.min((cumulativeForDepth / totalBase) * 100, 100) : 0;

    const baseAmt = isBuy
      ? base.toFixed(assetBData.precision)
      : quote.toFixed(assetAData.precision);
    const quoteAmt = isBuy
      ? quote.toFixed(assetAData.precision)
      : base.toFixed(assetBData.precision);

    const accent = isBuy
      ? {
          bgHover: "hover:bg-[hsl(var(--accent-success)/0.12)]",
          bgDepth: "bg-[hsl(var(--accent-success)/0.08)]",
          textBright: "dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))]",
          chip: "bg-[hsl(var(--accent-success)/0.1)] border-[hsl(var(--accent-success)/0.3)] dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))]",
          gradient: "from-[hsl(var(--accent-success))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))]",
        }
      : {
          bgHover: "hover:bg-[hsl(var(--accent-danger)/0.12)]",
          bgDepth: "bg-[hsl(var(--accent-danger)/0.08)]",
          textBright: "dark:text-[hsl(var(--accent-danger-fg))] text-[hsl(var(--accent-danger-fg))]",
          chip: "bg-[hsl(var(--accent-danger)/0.1)] border-[hsl(var(--accent-danger)/0.3)] dark:text-[hsl(var(--accent-danger-fg))] text-[hsl(var(--accent-danger-fg))]",
          gradient: "from-[hsl(var(--accent-danger))] via-[hsl(var(--accent-warning))] to-[hsl(var(--accent-warning))]",
        };

    return (
      <div style={{ ...style, overflow: "hidden" }}>
        <Dialog key={`${cardType}Dialog${index}`}>
          <DialogTrigger asChild>
            <button
              type="button"
              className={cn(
                "group relative w-full text-left px-3 py-1.5 transition-colors",
                "border-b border-border/40 cursor-pointer",
                accent.bgHover
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-0 right-0 pointer-events-none transition-opacity",
                  accent.bgDepth
                )}
                style={{ width: `${depthPercent}%` }}
              />
              <div className="relative grid grid-cols-4 gap-2 text-xs font-mono tabular-nums items-center">
                <div
                  className={cn(
                    "text-right font-semibold",
                    accent.textBright
                  )}
                >
                  {price}
                </div>
                <div className="text-right text-foreground/80">{baseAmt}</div>
                <div className="text-right text-muted-foreground">{quoteAmt}</div>
                <div className="text-right text-muted-foreground">{cumulativeBase}</div>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[640px] !bg-card border border-border text-foreground"
          >
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    accent.chip,
                    "border"
                  )}
                >
                  {isBuy ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <DialogTitle>
                    {t("MarketOrderCard:proceedLimitOrderDataTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {t("MarketOrderCard:proceedLimitOrderDataDescription", {
                      cardType: isBuy ? "sell" : "buy",
                    })}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-3 space-y-3 rounded-lg border border-border bg-accent/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("MarketOrderCard:sellingQuoteForBase", {
                    totalQuote: cumulativeQuote,
                    assetA: isBuy ? assetA : assetB,
                    totalBase: cumulativeBase,
                    assetB: isBuy ? assetB : assetA,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-3 text-sm">
                <span className="text-muted-foreground">
                  {t("MarketOrderCard:pricePerAsset", {
                    price: price,
                    assetB: assetB,
                    assetA: assetA,
                  })}
                </span>
                <span
                  className={cn(
                    "font-mono tabular-nums font-semibold",
                    accent.textBright
                  )}
                >
                  {price} {assetB}
                </span>
              </div>
            </div>

            <a
              href={
                isBuy
                  ? `/dex.html?market=${assetA}_${assetB}&type=sell&price=${price}&amount=${cumulativeQuote}`
                  : `/dex.html?market=${assetA}_${assetB}&type=buy&price=${price}&amount=${cumulativeQuote}`
              }
            >
              <Button
                className={cn(
                  "mt-4 w-full h-11 gap-2 text-foreground font-semibold",
                  "bg-gradient-to-r shadow-lg shadow-black/30",
                  accent.gradient,
                  "hover:brightness-110 active:scale-[0.99] transition-all"
                )}
              >
                {t("MarketOrderCard:proceedButton")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </DialogContent>
        </Dialog>
      </div>
    );
  });

export default function MarketOrderCard(properties) {
  const { cardType, assetA, assetAData, assetB, assetBData, marketOrders } =
    properties;

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const isBuy = cardType === "buy";
  const accent = isBuy
    ? {
        text: "dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))]",
        textBright: "dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))]",
        bg: "bg-[hsl(var(--accent-success)/0.06)]",
        bgHover: "hover:bg-[hsl(var(--accent-success)/0.12)]",
        bgDepth: "bg-[hsl(var(--accent-success)/0.08)]",
        border: "border-[hsl(var(--accent-success)/0.3)]",
        glow: "from-[hsl(var(--accent-success)/0.2)] via-[hsl(var(--accent-success)/0.05)] to-transparent",
        gradient: "from-[hsl(var(--accent-success))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))]",
        ring: "ring-[hsl(var(--accent-success)/0.3)]",
        chip: "bg-[hsl(var(--accent-success)/0.1)] border-[hsl(var(--accent-success)/0.3)] dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))]",
      }
    : {
        text: "dark:text-[hsl(var(--accent-danger-fg))] text-[hsl(var(--accent-danger-fg))]",
        textBright: "dark:text-[hsl(var(--accent-danger-fg))] text-[hsl(var(--accent-danger-fg))]",
        bg: "bg-[hsl(var(--accent-danger)/0.06)]",
        bgHover: "hover:bg-[hsl(var(--accent-danger)/0.12)]",
        bgDepth: "bg-[hsl(var(--accent-danger)/0.08)]",
        border: "border-[hsl(var(--accent-danger)/0.3)]",
        glow: "from-[hsl(var(--accent-danger)/0.2)] via-[hsl(var(--accent-danger)/0.05)] to-transparent",
        gradient: "from-[hsl(var(--accent-danger))] via-[hsl(var(--accent-warning))] to-[hsl(var(--accent-warning))]",
        ring: "ring-[hsl(var(--accent-danger)/0.3)]",
        chip: "bg-[hsl(var(--accent-danger)/0.1)] border-[hsl(var(--accent-danger)/0.3)] dark:text-[hsl(var(--accent-danger-fg))] text-[hsl(var(--accent-danger-fg))]",
      };

  const totalBase = useMemo(() => {
    if (!marketOrders || !marketOrders.length) return 0;
    return marketOrders
      .map((x) => parseFloat(x.base))
      .reduce((acc, curr) => acc + curr, 0);
  }, [marketOrders]);

  const rowProps = useMemo(
    () => ({ marketOrders, isBuy, assetA, assetB, assetAData, assetBData, totalBase, cardType, t }),
    [marketOrders, isBuy, assetA, assetB, assetAData, assetBData, totalBase, cardType, t]
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card/60 backdrop-blur-xl",
        accent.border
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b",
          accent.glow
        )}
      />

      <div className="relative">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border",
                accent.chip
              )}
            >
              {isBuy ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
            <div>
              <h3 className={cn("text-sm font-semibold", accent.textBright)}>
                {isBuy
                  ? t("MarketOrderCard:openBuyLimitOrdersTitle")
                  : t("MarketOrderCard:openSellLimitOrdersTitle")}
              </h3>
              <p className="text-[11px] text-muted-foreground/70">
                {isBuy
                  ? t("MarketOrderCard:buyLimitOrdersDescription", {
                      assetA,
                      assetB,
                    })
                  : t("MarketOrderCard:sellLimitOrdersDescription", {
                      assetA,
                      assetB,
                    })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-accent/30 dark:bg-white/[0.05] px-2 py-1 font-mono text-[10px] tabular-nums text-muted-foreground">
            <Wallet className="h-3 w-3" />
            <span>{marketOrders?.length || 0}</span>
          </div>
        </div>

        <div className="border-b border-border/60 px-3 py-2">
          <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="text-right">
              Price <span className="text-muted-foreground/60">({assetB})</span>
            </div>
            <div className="text-right">
              {isBuy ? assetB : assetA}
            </div>
            <div className="text-right">
              {isBuy ? assetA : assetB}
            </div>
            <div className="text-right">
              Total <span className="text-muted-foreground/60">({assetB})</span>
            </div>
          </div>
        </div>

        <div className="px-0 py-1">
          {marketOrders && marketOrders.length ? (
            <div className="w-full h-[320px]">
              <List
                height={320}
                width="100%"
                rowComponent={MarketOrderRow}
                rowCount={marketOrders.length}
                rowHeight={32}
                rowProps={rowProps}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-accent/20">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="text-xs">{t("MarketOrderCard:noOpenOrders")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
