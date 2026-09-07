import React, { useEffect, useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import { useStore } from "@nanostores/react";
import { TinyColor } from "@ctrl/tinycolor";
import { List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import {
  $customTheme,
  $currentPage,
  getThemeForPage,
  resolvePageAccent,
  resolveStatusAll,
} from "@/stores/customTheme.ts";
import { PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

import { Activity, RefreshCw, PieChart as PieChartIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { $currentUser } from "@/stores/users.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { createTopOperationsStore } from "@/nanoeffects/TopOperations.ts";

// Minimum hue separation (degrees) between pie slices, so chunks stay visually
// distinct even when a theme sets primary/secondary/tertiary to near-identical
// colors (e.g. the default slate seed, which previously painted three large
// slices the same dark navy).
const PIE_MIN_HUE_SEP = 30;

function pieHueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Keep the theme's hue but enforce vivid saturation + mode-appropriate
// lightness, so slices stay legible on both light and dark cards.
function normalizePieColor(hex, isDark) {
  const tc = new TinyColor(hex);
  if (!tc.isValid) {
    return new TinyColor(isDark ? "#38bdf8" : "#0284c7");
  }
  const { h, s } = tc.toHsl();
  return new TinyColor({ h, s: Math.max(s, 0.62), l: isDark ? 0.62 : 0.5 });
}

// Build a categorical palette from the active theme's roles. Candidates that
// clash in hue with an already-picked slice are rotated away (+47° steps,
// which cycle through many distinct hues), and any overflow beyond the roles
// is generated via golden-angle rotation from the page primary. The result is
// deterministic: same theme + mode + count always yields the same colors.
function buildDistinctPiePalette(roleHexes, isDark, count) {
  const norm360 = (h) => ((h % 360) + 360) % 360;
  const picked = [];
  const pushSeparated = (tc) => {
    // Try hue rotations; keep the clash-free candidate when one exists,
    // otherwise the rotation maximizing distance to its nearest neighbour
    // (best effort once the wheel fills up with many slices).
    let best = tc;
    let bestMin = -1;
    let c = tc;
    for (let attempt = 0; attempt < 12; attempt++) {
      const h = norm360(c.toHsl().h);
      let nearest = Infinity;
      for (const p of picked) nearest = Math.min(nearest, pieHueDistance(norm360(p.toHsl().h), h));
      if (nearest > bestMin) {
        bestMin = nearest;
        best = c;
      }
      if (nearest >= PIE_MIN_HUE_SEP) break;
      const hsl = c.toHsl();
      c = new TinyColor({ h: (hsl.h + 47) % 360, s: hsl.s, l: hsl.l });
    }
    picked.push(best);
  };
  for (const hex of roleHexes) {
    if (picked.length >= count) break;
    pushSeparated(normalizePieColor(hex, isDark));
  }
  const anchorHsl = picked.length ? picked[0].toHsl() : { h: 160, s: 0.7, l: isDark ? 0.62 : 0.5 };
  let n = 1;
  while (picked.length < count) {
    pushSeparated(
      new TinyColor({
        h: (anchorHsl.h + n * 137.508) % 360,
        s: 0.7,
        l: isDark ? 0.62 : 0.5,
      })
    );
    n += 1;
  }
  return picked.map((c) => c.toHexString());
}

// Tracks light/dark via the .dark class (covers the toggle + system mode).
function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

const Row = ({ index, style, operations, t, data }) => {
  // react-window v2 spreads rowProps directly, but be defensive: support both {operations,t} and {data:{operations,t}}
  const ops = operations ?? data?.operations;
  const tr = t ?? data?.t;
  const op = ops?.[index];
  if (!op) return null;
  const displayName = op.method
    ? (tr ?? ((k, opts) => opts?.defaultValue ?? k))(`Activity:${op.method}.method`, { defaultValue: op.fallbackName })
    : op.fallbackName;
  return (
    <div
      style={style}
      className="grid grid-cols-[3rem_1fr_6rem_5rem] items-center gap-2 rounded-lg border border-border/60 px-3 py-2 mb-1 transition-colors hover:border-[hsl(var(--accent-success)/0.5)] hover:bg-[hsl(var(--accent-success)/0.04)]"
    >
      <span className="font-mono text-sm text-muted-foreground">
        {op.type}
      </span>
      <span className="font-medium text-sm truncate" title={displayName}>
        {displayName}
      </span>
      <span className="font-mono text-sm text-right tabular-nums text-[hsl(var(--accent-success-fg))]">
        {op.count.toLocaleString()}
      </span>
      <span className="font-mono text-sm text-right tabular-nums text-muted-foreground">
        {op.percentage.toFixed(1)}%
      </span>
    </div>
  );
};

export default function BlockchainTopOperations() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const _chain = usr && usr.chain ? usr.chain : "bitshares";
  const isTestnet = Boolean(usr && usr.chain && usr.chain !== "bitshares");
  useInitCache(_chain, []);

  const [refreshCounter, setRefreshCounter] = useState(0);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const isDark = useIsDark();
  // Subscribe so the palette rebuilds live when the theme/page theme changes.
  const themeState = useStore($customTheme);
  const pageThemeState = useStore($currentPage);

  const pieData = useMemo(() => {
    if (!operations || !operations.length) return [];
    const major = [];
    let otherCount = 0;
    let otherPerc = 0;
    for (const op of operations) {
      if (op.percentage >= 1) {
        const label = op.method
          ? t(`Activity:${op.method}.method`, { defaultValue: op.fallbackName })
          : op.fallbackName;
        major.push({
          name: label,
          value: op.count,
          percentage: op.percentage,
          key: String(op.type),
        });
      } else {
        otherCount += op.count;
        otherPerc += op.percentage;
      }
    }
    if (otherCount > 0) {
      major.push({
        name: t("Home:top_operations.other", "Other"),
        value: otherCount,
        percentage: otherPerc,
        key: "other",
      });
    }
    return major;
  }, [operations, t]);

  // Theme-tied but collision-proof slice colors. Role order keeps the largest
  // slice on the page's success green (as before), then spreads across the
  // page primary + status hues; any hue clashes are rotated away and overflow
  // slices are generated by golden-angle rotation. "Other" keeps its gray.
  const piePalette = useMemo(() => {
    const theme = getThemeForPage("top-operations");
    const accent = resolvePageAccent(theme, "top-operations");
    const status = resolveStatusAll(theme);
    const roles = [
      status.success,
      accent.primary,
      status.warning,
      status.info,
      status.danger,
      accent.secondary,
      accent.tertiary,
    ];
    const count = pieData.filter((d) => d.key !== "other").length;
    return buildDistinctPiePalette(roles, isDark, Math.max(count, 1));
  }, [pieData, isDark, themeState, pageThemeState]);

  useEffect(() => {
    if (isTestnet) return;
    const store = createTopOperationsStore([30]);
    const unsub = store.subscribe(({ data, error, loading }) => {
      setLoading(Boolean(loading));
      if (data && !error && !loading) {
        setOperations(data);
      } else if (!loading && error) {
        setOperations([]);
      }
    });
    return () => unsub();
  }, [isTestnet, refreshCounter]);

  if (isTestnet) {
    return (
      <div className="container mx-auto mt-5 mb-5 max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-success)/0.20)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-success)/0.70)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-success)/0.10)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.10)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-success)/0.40)] bg-gradient-to-br from-[hsl(var(--accent-success)/0.30)] to-[hsl(var(--accent-1)/0.30)] dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-success)/0.4)]">
                <Activity className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {t("Home:top_operations.title")}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2">
              {t("Home:testnetUnsupported")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-4xl">
      <div className="grid grid-cols-1 gap-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-success)/0.20)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-success)/0.70)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-success)/0.10)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.10)] blur-3xl"
          />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-success)/0.40)] bg-gradient-to-br from-[hsl(var(--accent-success)/0.30)] to-[hsl(var(--accent-1)/0.30)] dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-success)/0.4)]">
                <Activity className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("Home:top_operations.title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("Home:top_operations.subtitle")}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--accent-success)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-success)/0.06)] to-transparent p-4">
                <Spinner />
                <p>{t("Market:loading")}</p>
              </div>
            ) : operations && operations.length ? (
              <div className="rounded-xl border border-[hsl(var(--accent-success)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-success)/0.06)] to-transparent p-2 sm:p-3 overflow-hidden">
                <div className="grid grid-cols-[3rem_1fr_6rem_5rem] items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground font-medium border-b border-border/40 mb-1">
                  <span>{t("Home:top_operations.columnType", "Type")}</span>
                  <span>{t("Home:top_operations.columnName", "Name")}</span>
                  <span className="text-right">{t("Home:top_operations.columnQuantity", "Quantity")}</span>
                  <span className="text-right">{t("Home:top_operations.columnPercentage", "%")}</span>
                </div>
                <div className="h-[500px]">
                  <List
                    rowComponent={Row}
                    rowCount={operations.length}
                    rowHeight={42}
                    style={{ height: 500, width: "100%" }}
                    rowProps={{ operations, t }}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[hsl(var(--accent-success)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-success)/0.06)] to-transparent p-4">
                <p>{t("PortfolioTabs:noRecentActivityFound")}</p>
              </div>
            )}

            <div className="mt-4">
              <Button
                onClick={() => setRefreshCounter(refreshCounter + 1)}
                disabled={loading}
                aria-busy={loading}
                className="bg-gradient-to-r from-[hsl(var(--accent-success))] to-[hsl(var(--accent-1))] text-white dark:text-white shadow-[0_8px_28px_-12px_hsl(var(--accent-success)/0.7)] hover:shadow-[0_12px_36px_-12px_hsl(var(--accent-success)/0.9)] transition-all"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("PortfolioTabs:refreshRecentActivityButton")}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-success)/0.20)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-success)/0.70)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-success)/0.10)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.10)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-success)/0.40)] bg-gradient-to-br from-[hsl(var(--accent-success)/0.30)] to-[hsl(var(--accent-1)/0.30)] dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-success)/0.4)]">
                <PieChartIcon className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("Home:top_operations.pieTitle", "Operation breakdown")}
                </h3>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("Home:top_operations.pieSubtitle", "Share of each operation type — operations below 1% grouped as Other.")}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--accent-success)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-success)/0.06)] to-transparent p-4">
                <Spinner />
                <p>{t("Market:loading")}</p>
              </div>
            ) : pieData && pieData.length ? (
              <div className="rounded-xl border border-[hsl(var(--accent-success)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-success)/0.06)] to-transparent p-2 sm:p-3 overflow-hidden">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        innerRadius={45}
                        paddingAngle={1.5}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      >
                        {(() => {
                          let colorIdx = 0;
                          return pieData.map((entry, idx) => {
                            const fill =
                              entry.key === "other"
                                ? "hsl(var(--muted-foreground) / 0.55)"
                                : piePalette[colorIdx++ % piePalette.length];
                            return (
                              <Cell
                                key={`cell-${entry.key}-${idx}`}
                                fill={fill}
                              />
                            );
                          });
                        })()}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => {
                          const pct = props?.payload?.percentage;
                          return [`${Number(value).toLocaleString()} (${pct != null ? pct.toFixed(1) : "?"}%)`, name];
                        }}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                        }}
                      />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[hsl(var(--accent-success)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-success)/0.06)] to-transparent p-4">
                <p>{t("PortfolioTabs:noRecentActivityFound")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
