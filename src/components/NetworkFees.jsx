import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { Coins, Info, ReceiptText } from "lucide-react";

import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";

import { createFeesStore } from "@/nanoeffects/Fees.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";

import { humanReadableFloat } from "@/lib/common.js";
import { opTypes } from "@/lib/opTypes.js";
import { opDescriptions } from "@/lib/opDescriptions.js";

// Fee parameter names that get dedicated columns instead of being listed
// underneath the operation's main fee.
const MAIN_FEE_PARAMS = ["fee", "price_per_kbyte"];

const EXTRA_PARAM_LABELS = {
  basic_fee: "Basic fee",
  premium_fee: "Premium name fee",
  price_per_output: "Price per output",
  fee_per_day: "Fee per day",
  fee_per_kb: "Fee per KB",
  symbol3: "3-char symbol fee",
  symbol4: "4-char symbol fee",
  long_symbol: "Long symbol fee",
  membership_annual_fee: "Annual membership fee",
  membership_lifetime_fee: "Lifetime membership fee",
};

function extraParamLabel(key) {
  return EXTRA_PARAM_LABELS[key] || key.replace(/_/g, " ");
}

// Operation family tints for the op-ID badges (protocol-stable ID sets).
// Full literal class strings — Tailwind cannot build them dynamically.
const OP_FAMILY_IDS = {
  1: new Set([0, 38, 39, 40, 41]),
  2: new Set([1, 2, 3, 4, 45, 46, 77]),
  3: new Set([5, 6, 7, 8, 9]),
  success: new Set([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 42, 43, 47, 48]),
  warning: new Set([20, 21, 22, 23, 24, 29, 30, 31, 34]),
  info: new Set([25, 26, 27, 28, 32, 33, 49, 50, 51, 52, 53]),
};

const OP_FAMILY_TINT = {
  1: "border-[hsl(var(--accent-1)/0.35)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))]",
  2: "border-[hsl(var(--accent-2)/0.35)] bg-[hsl(var(--accent-2)/0.1)] text-[hsl(var(--accent-2-fg))]",
  3: "border-[hsl(var(--accent-3)/0.35)] bg-[hsl(var(--accent-3)/0.1)] text-[hsl(var(--accent-3-fg))]",
  success:
    "border-[hsl(var(--accent-success)/0.35)] bg-[hsl(var(--accent-success)/0.1)] text-[hsl(var(--accent-success-fg))]",
  warning:
    "border-[hsl(var(--accent-warning)/0.35)] bg-[hsl(var(--accent-warning)/0.1)] text-[hsl(var(--accent-warning-fg))]",
  info: "border-[hsl(var(--accent-info)/0.35)] bg-[hsl(var(--accent-info)/0.1)] text-[hsl(var(--accent-info-fg))]",
};

function opFamilyTint(opId) {
  for (const [family, ids] of Object.entries(OP_FAMILY_IDS)) {
    if (ids.has(opId)) return OP_FAMILY_TINT[family];
  }
  return null;
}

function formatFee(satoshis, symbol) {
  return `${humanReadableFloat(Number(satoshis), 5).toFixed(5)} ${symbol}`;
}

const DESKTOP_GRID =
  "grid grid-cols-[56px_minmax(0,1fr)_repeat(4,minmax(130px,1fr))] gap-3 items-center";

function DesktopRow({ index, style, rows, symbol, ltmFactor }) {
  const row = rows[index];
  if (!row) return null;

  return (
    <div style={style}>
      <div className={`h-full flex flex-col justify-center px-4 py-2 border border-transparent border-l-2 hover:border-border/60 hover:bg-[hsl(var(--accent-1)/0.04)] rounded-lg ${index % 2 === 1 ? "bg-[hsl(var(--accent-1)/0.02)]" : "bg-card/40"}`}>
        <div className={DESKTOP_GRID}>
          <Badge
            variant="outline"
            className={`justify-center font-mono text-[11px] ${
              opFamilyTint(row.opId) ?? "text-muted-foreground"
            }`}
          >
            {row.opId}
          </Badge>
          <span className="text-sm font-medium text-foreground truncate">
            {row.tooltip ? (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help border-b border-dotted border-muted-foreground/50">
                      {row.title}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-card border-border text-foreground/85 max-w-xs"
                  >
                    <p>{row.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              row.title
            )}
          </span>
          <span className="text-sm text-right font-mono text-foreground/90 truncate">
            {row.feeSat !== null ? formatFee(row.feeSat, symbol) : "—"}
          </span>
          <span className="text-sm text-right font-mono text-foreground/70 truncate">
            {row.perKbyteSat !== null ? formatFee(row.perKbyteSat, symbol) : "—"}
          </span>
          <span className="text-sm text-right font-mono text-[hsl(var(--accent-success-fg))] truncate">
            {row.feeSat !== null ? formatFee(row.feeSat * ltmFactor, symbol) : "—"}
          </span>
          <span className="text-sm text-right font-mono text-[hsl(var(--accent-success-fg))]/80 truncate">
            {row.perKbyteSat !== null
              ? formatFee(row.perKbyteSat * ltmFactor, symbol)
              : "—"}
          </span>
        </div>
        {row.extras.length ? (
          <div className="flex flex-wrap gap-x-5 gap-y-0.5 mt-1 pl-[68px] text-xs text-muted-foreground">
            {row.extras.map(([key, satoshis]) => (
              <span key={key}>
                <span className="text-[hsl(var(--accent-2-fg))]">
                  {extraParamLabel(key)}
                </span>
                :{" "}
                <span className="font-mono">{formatFee(satoshis, symbol)}</span>
                <span className="ml-1 opacity-70">
                  ({formatFee(satoshis * ltmFactor, symbol)})
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MobileRow({ index, style, rows, symbol, ltmFactor }) {
  const row = rows[index];
  if (!row) return null;

  const cells = [
    {
      label: "Standard",
      value: row.feeSat !== null ? formatFee(row.feeSat, symbol) : "—",
    },
    {
      label: "Per KByte",
      value:
        row.perKbyteSat !== null ? formatFee(row.perKbyteSat, symbol) : "—",
    },
    {
      label: "LTM",
      value: row.feeSat !== null ? formatFee(row.feeSat * ltmFactor, symbol) : "—",
      accent: true,
    },
    {
      label: "LTM Per KByte",
      value:
        row.perKbyteSat !== null
          ? formatFee(row.perKbyteSat * ltmFactor, symbol)
          : "—",
      accent: true,
    },
  ];

  return (
    <div style={style}>
      <div className={`h-full px-3 py-2 border border-transparent hover:border-border/60 hover:bg-[hsl(var(--accent-1)/0.04)] rounded-lg ${index % 2 === 1 ? "bg-[hsl(var(--accent-1)/0.02)]" : "bg-card/40"}`}>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`font-mono text-[11px] shrink-0 ${
              opFamilyTint(row.opId) ?? "text-muted-foreground"
            }`}
          >
            {row.opId}
          </Badge>
          <span className="text-sm font-medium text-foreground truncate">
            {row.title}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5">
          {cells.map((cell) => (
            <div
              key={cell.label}
              className="flex items-center justify-between gap-2 min-w-0"
            >
              <span className="text-[11px] text-muted-foreground shrink-0">
                {cell.label}
              </span>
              <span
                className={`text-xs font-mono truncate ${
                  cell.accent
                    ? "text-[hsl(var(--accent-success-fg))]"
                    : "text-foreground/85"
                }`}
              >
                {cell.value}
              </span>
            </div>
          ))}
        </div>
        {row.extras.length ? (
          <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
            {row.extras.map(([key, satoshis]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-2 min-w-0"
              >
                <span className="shrink-0 text-[hsl(var(--accent-2-fg))]">
                  {extraParamLabel(key)}
                </span>
                <span className="font-mono truncate">
                  {formatFee(satoshis, symbol)}
                  <span className="ml-1 opacity-70">
                    ({formatFee(satoshis * ltmFactor, symbol)})
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function NetworkFees() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const currentNodeUrl = useStore($currentNodeUrl);

  const chain = usr && usr.chain ? usr.chain : "bitshares";

  useInitCache(chain ?? "bitshares", []);

  const symbol = chain === "bitshares" ? "BTS" : "TEST";
  const nodeUrl = currentNodeUrl || "";

  const [feeSchedule, setFeeSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!nodeUrl) return;

    let active = true;
    setLoading(true);
    setError(false);

    const store = createFeesStore([chain, nodeUrl]);

    const sub = store.subscribe(({ data, error: storeError }) => {
      if (!active || !data || storeError) return;
      setFeeSchedule(data);
      setLoading(false);
      setError(false);
    });

    // The fetcher resolves to undefined (rather than throwing) when the
    // request fails, so settle the loading/error state via fetch().
    store
      .fetch()
      .then((result) => {
        if (!active) return;
        setLoading(false);
        if (!result || !result.data || !result.data.fees) {
          setError(true);
        }
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setError(true);
      });

    return () => {
      active = false;
      sub();
    };
  }, [chain, nodeUrl]);

  const ltmFactor = useMemo(() => {
    if (!feeSchedule) return 0;
    const scale = feeSchedule.scale || 10000;
    return (feeSchedule.networkPercentOfFee || 0) / scale;
  }, [feeSchedule]);

  const ltmDiscountPercent = ((1 - ltmFactor) * 100).toFixed(0);

  const rows = useMemo(() => {
    if (!feeSchedule || !feeSchedule.fees) return [];

    return feeSchedule.fees
      .map(([opId, params]) => {
        const safeParams = params || {};
        const extras = Object.entries(safeParams)
          .filter(([key]) => !MAIN_FEE_PARAMS.includes(key))
          .map(([key, value]) => [key, Number(value)]);

        return {
          opId,
          title: opTypes[opId] || `Operation ${opId}`,
          tooltip: Boolean(opDescriptions[opId]),
          description: opDescriptions[opId] || "",
          feeSat:
            safeParams.fee !== undefined && safeParams.fee !== null
              ? Number(safeParams.fee)
              : null,
          perKbyteSat:
            safeParams.price_per_kbyte !== undefined &&
            safeParams.price_per_kbyte !== null
              ? Number(safeParams.price_per_kbyte)
              : null,
          extras,
        };
      })
      .sort((a, b) => a.opId - b.opId);
  }, [feeSchedule]);
  const desktopRowProps = useMemo(() => ({ rows, symbol, ltmFactor }), [rows, symbol, ltmFactor]);
  const mobileRowProps = useMemo(() => ({ rows, symbol, ltmFactor }), [rows, symbol, ltmFactor]);

  // Variable row heights: rows with extra fee parameters are taller.
  const desktopRowHeight = (index) => {
    const row = rows[index];
    if (!row || !row.extras.length) return 84;
    return row.extras.length > 2 ? 132 : 116;
  };

  const mobileRowHeight = (index) => {
    const row = rows[index];
    if (!row) return 110;
    return 104 + row.extras.length * 17;
  };

  const headings = [
    "#",
    t("NetworkFees:operation", "Operation"),
    t("NetworkFees:standardFee", "Standard"),
    t("NetworkFees:standardPerKbyte", "Per KByte"),
    t("NetworkFees:ltmFee", "LTM"),
    t("NetworkFees:ltmPerKbyte", "LTM Per KByte"),
  ];

  return (
    <div className="container mx-auto mt-5 mb-10 max-w-6xl text-foreground">
      <div className="grid grid-cols-1 gap-3">
        {/* Page header card */}
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <ReceiptText className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("NetworkFees:title", "Network Fees")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t(
                    "NetworkFees:description",
                    "Every operation fee charged by the network, fetched live from the blockchain's global fee object."
                  )}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Fee schedule list */}
        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))]" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                <Coins className="h-5 w-5 text-[hsl(var(--accent-1-fg))]" />
              </span>
              {t("NetworkFees:scheduleTitle", "Operation fee schedule")}
            </CardTitle>
            <CardDescription className="ml-11">
              {t(
                "NetworkFees:scheduleDescription",
                "Hover an operation to see what it does. Fees are shown in {{symbol}}.",
                { symbol }
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && !error && feeSchedule ? (
              <div className="flex items-start gap-2 rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.08)] p-3">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--accent-1-fg))]" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(
                    "NetworkFees:ltmExplainer",
                    "Lifetime members are their own referrer and registrar, so the referrer share of every fee is rebated back to them as vesting cashback. The LTM columns show this effective cost ({{percent}}% of the standard fee, derived from the chain's network_percent_of_fee parameter). Additional per-operation parameters are listed beneath each operation, with their LTM equivalent in brackets.",
                    { percent: ltmDiscountPercent }
                  )}
                </p>
              </div>
            ) : null}
            {error ? (
              <p className="text-sm text-[hsl(var(--accent-danger-fg))] py-6 text-center">
                {t(
                  "NetworkFees:fetchError",
                  "Failed to fetch the global fee schedule from the connected node."
                )}
              </p>
            ) : loading || !rows.length ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                {/* Mobile: stacked cards */}
                <div className="md:hidden w-full max-h-[70vh] overflow-auto">
                  <List
                    rowComponent={MobileRow}
                    rowCount={rows.length}
                    rowHeight={mobileRowHeight}
                    rowProps={desktopRowProps}
                   height={400} width="100%" />
                </div>

                {/* Desktop: columnar list */}
                <div className="hidden md:block">
                  <div
                    className={`${DESKTOP_GRID} px-4 pb-2 mb-1 border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground`}
                  >
                    {headings.map((heading, index) => (
                      <span
                        key={heading}
                        className={
                          index > 1
                            ? `text-right rounded px-1 -mx-1 ${
                                index > 3
                                  ? "bg-[hsl(var(--accent-success)/0.08)] text-[hsl(var(--accent-success-fg))]"
                                  : ""
                              }`
                            : ""
                        }
                      >
                        {heading}
                      </span>
                    ))}
                  </div>
                  <div className="w-full h-[560px] pt-1">
                    <List
                      rowComponent={DesktopRow}
                      rowCount={rows.length}
                      rowHeight={desktopRowHeight}
                      rowProps={desktopRowProps}
                     height={560} width="100%" />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
