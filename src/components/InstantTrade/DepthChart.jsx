import React, { useMemo, useState, useEffect } from "react";
import { DepthChart as FastDepthChart } from "@pairlens/fast-financial-charts/react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Spinner } from "@/components/ui/spinner";
import { Layers } from "lucide-react";

export default function DepthChart({ bids, asks, baseSymbol, quoteSymbol, loading, height = 260 }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const data = useMemo(() => {
    const toNum = (v) => parseFloat(v) || 0;
    const bidsLevels = (bids ?? [])
      .map((o) => ({ price: toNum(o.price), size: toNum(o.base ?? o.quote) }))
      .filter((l) => Number.isFinite(l.price) && Number.isFinite(l.size) && l.price > 0 && l.size > 0);
    const asksLevels = (asks ?? [])
      .map((o) => ({ price: toNum(o.price), size: toNum(o.base ?? o.quote) }))
      .filter((l) => Number.isFinite(l.price) && Number.isFinite(l.size) && l.price > 0 && l.size > 0);
    return { bids: bidsLevels, asks: asksLevels };
  }, [bids, asks]);

  const hasData = data.bids.length > 0 || data.asks.length > 0;
  const midPrice = useMemo(() => {
    if (!hasData) return null;
    const bidPrices = data.bids.map((b) => b.price);
    const askPrices = data.asks.map((a) => a.price);
    if (!bidPrices.length || !askPrices.length) return null;
    return (Math.max(...bidPrices) + Math.min(...askPrices)) / 2;
  }, [data, hasData]);

  const { resolvedTheme } = useTheme();
  const [chartTheme, setChartTheme] = useState(() => ({
    background: "transparent",
    grid: "rgba(255,255,255,0.08)",
    axisText: "#9aa4b2",
    axisBackground: "transparent",
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      const s = getComputedStyle(document.documentElement);
      const toHsl = (varName, fallback) => {
        const raw = s.getPropertyValue(varName).trim();
        if (!raw) return fallback;
        const parts = raw.split(/\s+/);
        if (parts.length === 3) return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
        return `hsl(${raw})`;
      };
      const border = toHsl("--border", resolvedTheme === "dark" ? "#2a2f3a" : "#e5e7eb");
      const mutedFg = toHsl("--muted-foreground", "#6b7280");
      // Transparent so the containing card's bg-card/60 shows through — already verified for depth chart
      setChartTheme({
        background: "transparent",
        grid: border,
        axisText: mutedFg,
        axisBackground: "transparent",
      });
    };
    compute();
    const observer = new MutationObserver(compute);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const themeStyle = document.getElementById("custom-theme-vars");
    if (themeStyle) observer.observe(themeStyle, { attributes: true, childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [resolvedTheme]);

  const theme = useMemo(() => ({
    background: chartTheme.background,
    grid: chartTheme.grid,
    axisText: chartTheme.axisText,
    axisBackground: chartTheme.axisBackground,
    // Bid/ask greens/reds are market convention and stay fixed across themes
    // (theming carve-out, same as the order-book SIDE_STYLES).
    bid: { stroke: "#22c55e", fillTop: "rgba(34,197,94,0.22)", fillBottom: "rgba(34,197,94,0.06)" },
    ask: { stroke: "#ef4444", fillTop: "rgba(239,68,68,0.22)", fillBottom: "rgba(239,68,68,0.06)" },
  }), [chartTheme]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-2)/0.40)] to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[hsl(var(--accent-2)/0.07)] blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[hsl(var(--accent-3)/0.07)] blur-3xl" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-2)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.20)] to-[hsl(var(--accent-3)/0.20)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-2)/0.4)]">
            <Layers className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">{t("Charts:orderbook_depth")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {baseSymbol && quoteSymbol
                ? t("Charts:depth_summary", { base: baseSymbol, quote: quoteSymbol, bids: data.bids.length, asks: data.asks.length })
                : t("Charts:cumulative_liquidity")}
              {midPrice ? ` • ${t("Charts:mid_price")} ${midPrice.toFixed(5)}` : ""}
            </p>
          </div>
        </div>

        {loading && !hasData ? (
          <div className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-border/40 bg-card/30`} style={{ height: `${height}px` }}>
            <Spinner className="size-6 text-[hsl(var(--accent-2-fg))]" />
            <span className="text-xs text-muted-foreground">{t("Charts:loading_depth")}</span>
          </div>
        ) : !hasData ? (
          <div className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-border/40 bg-card/30 text-center p-4`} style={{ height: `${height}px` }}>
            <Layers className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground/70">{t("Charts:no_depth_data")}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/40 bg-card/30 overflow-hidden p-2 sm:p-3">
            <div className="w-full" style={{ height: `${height}px` }}>
              {/* Depth chart has no indicator worker — flag kept for consistency, no warning in either chart now */}
              <FastDepthChart
                data={data}
                theme={theme}
                /* @ts-ignore — DepthChart has no worker, prop is no-op but keeps both charts explicitly inline */
                {...{ performance: { indicatorWorker: false } }}
                style={{ height: `${height}px`, width: "100%" }}
              />
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[hsl(var(--accent-success))]" /> {t("Charts:bids")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[hsl(var(--accent-danger))]" /> {t("Charts:asks")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
