import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { FastFinancialChart } from "@pairlens/fast-financial-charts/react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EnterFullScreenIcon, ExitFullScreenIcon } from "@radix-ui/react-icons";
import { List } from "react-window";

function bucketSecToTimeframe(sec) {
  switch (sec) {
    case 60: return "1m";
    case 300: return "5m";
    case 900: return "15m";
    case 1800: return "30m";
    case 3600: return "1h";
    case 7200: return "2h";
    case 14400: return "4h";
    case 86400: return "1d";
    case 259200: return "3d";
    case 604800: return "1w";
    default:
      if (sec < 60) return "1m";
      if (sec < 300) return "1m";
      if (sec < 900) return "5m";
      if (sec < 1800) return "15m";
      if (sec < 3600) return "30m";
      if (sec < 7200) return "1h";
      if (sec <= 14400) return "4h";
      if (sec < 86400) return "1d";
      return "1d";
  }
}

// All 90 built-in indicators with default pane (from INDICATORS.md) — used for picker
const ALL_INDICATORS = [
  // Moving Averages (17) — overlay
  { type: "EMA", label: "EMA", pane: "overlay", desc: "period (20)" },
  { type: "SMA", label: "SMA", pane: "overlay", desc: "period (20)" },
  { type: "WMA", label: "WMA", pane: "overlay", desc: "period (20)" },
  { type: "DEMA", label: "DEMA", pane: "overlay", desc: "period (20)" },
  { type: "TEMA", label: "TEMA", pane: "overlay", desc: "period (20)" },
  { type: "VWAP", label: "VWAP", pane: "overlay", desc: "—" },
  { type: "HMA", label: "HMA", pane: "overlay", desc: "period (9)" },
  { type: "VWMA", label: "VWMA", pane: "overlay", desc: "period (20)" },
  { type: "ALMA", label: "ALMA", pane: "overlay", desc: "period (9)" },
  { type: "KAMA", label: "KAMA", pane: "overlay", desc: "period (10)" },
  { type: "SMMA", label: "SMMA", pane: "overlay", desc: "period (7)" },
  { type: "LSMA", label: "LSMA", pane: "overlay", desc: "period (25)" },
  { type: "McGinleyDynamic", label: "McGinley Dynamic", pane: "overlay", desc: "period (14)" },
  { type: "MovingAverageHamming", label: "MA Hamming", pane: "overlay", desc: "period (20)" },
  { type: "MovingAverageChannel", label: "MA Channel", pane: "overlay", desc: "period (20)" },
  { type: "MovingAverageMultiple", label: "MA Multiple", pane: "overlay", desc: "periods (10,20,50…)" },
  { type: "GuppyMMA", label: "Guppy MMA", pane: "overlay", desc: "—" },
  // Oscillators & Momentum (35) — separate
  { type: "RSI", label: "RSI", pane: "separate", desc: "period (14)" },
  { type: "MACD", label: "MACD", pane: "separate", desc: "fast 12, slow 26, signal 9" },
  { type: "Stochastic", label: "Stochastic", pane: "separate", desc: "k 14, d 3, smooth 3" },
  { type: "StochRSI", label: "StochRSI", pane: "separate", desc: "rsi 14, stoch 14" },
  { type: "WilliamsR", label: "Williams %R", pane: "separate", desc: "period (14)" },
  { type: "CCI", label: "CCI", pane: "separate", desc: "period (20)" },
  { type: "MFI", label: "MFI", pane: "separate", desc: "period (14)" },
  { type: "Momentum", label: "Momentum", pane: "separate", desc: "period (10)" },
  { type: "ROC", label: "ROC", pane: "separate", desc: "period (12)" },
  { type: "Aroon", label: "Aroon", pane: "separate", desc: "period (25)" },
  { type: "ADX", label: "ADX", pane: "separate", desc: "period (14)" },
  { type: "TRIX", label: "TRIX", pane: "separate", desc: "period 15, signal 9" },
  { type: "BBPercent", label: "BB %B", pane: "separate", desc: "period 20, stdDev 2" },
  { type: "AwesomeOscillator", label: "Awesome Oscillator", pane: "separate", desc: "fast 5, slow 34" },
  { type: "ChoppinessIndex", label: "Choppiness Index", pane: "separate", desc: "period 14" },
  { type: "FisherTransform", label: "Fisher Transform", pane: "separate", desc: "period 9" },
  { type: "VortexIndicator", label: "Vortex Indicator", pane: "separate", desc: "period 14" },
  { type: "UltimateOscillator", label: "Ultimate Oscillator", pane: "separate", desc: "7, 14, 28" },
  { type: "CoppockCurve", label: "Coppock Curve", pane: "separate", desc: "14, 11, 10" },
  { type: "KST", label: "KST", pane: "separate", desc: "10,15,20,30" },
  { type: "ElderForceIndex", label: "Elder Force Index", pane: "separate", desc: "period 13" },
  { type: "DPO", label: "DPO", pane: "separate", desc: "period 20" },
  { type: "CMO", label: "CMO", pane: "separate", desc: "period 9" },
  { type: "RVI", label: "RVI", pane: "separate", desc: "period 10, signal 4" },
  { type: "TSI", label: "TSI", pane: "separate", desc: "25,13,7" },
  { type: "SMIErgodic", label: "SMI Ergodic", pane: "separate", desc: "20,5,5" },
  { type: "ConnorsRSI", label: "Connors RSI", pane: "separate", desc: "3,2,100" },
  { type: "BalanceOfPower", label: "Balance of Power", pane: "separate", desc: "period 14" },
  { type: "RelativeVolatilityIndex", label: "Rel. Volatility Index", pane: "separate", desc: "10,14" },
  { type: "AcceleratorOscillator", label: "Accelerator Oscillator", pane: "separate", desc: "5,34,5" },
  { type: "MassIndex", label: "Mass Index", pane: "separate", desc: "9,25" },
  { type: "PriceOscillator", label: "Price Oscillator", pane: "separate", desc: "12,26" },
  { type: "DirectionalMovement", label: "Directional Movement", pane: "separate", desc: "period 14" },
  { type: "TrendStrengthIndex", label: "Trend Strength Index", pane: "separate", desc: "period 14" },
  { type: "RankCorrelationIndex", label: "Rank Correlation Index", pane: "separate", desc: "period 14" },
  // Bands & Channels (5) — overlay
  { type: "BollingerBands", label: "Bollinger Bands", pane: "overlay", desc: "20, 2" },
  { type: "DonchianChannels", label: "Donchian Channels", pane: "overlay", desc: "20" },
  { type: "KeltnerChannels", label: "Keltner Channels", pane: "overlay", desc: "20,10,2" },
  { type: "Envelopes", label: "Envelopes", pane: "overlay", desc: "20,10%" },
  { type: "PriceChannel", label: "Price Channel", pane: "overlay", desc: "20" },
  // Trend (10) — overlay
  { type: "SuperTrend", label: "SuperTrend", pane: "overlay", desc: "10, 3" },
  { type: "Ichimoku", label: "Ichimoku Cloud", pane: "overlay", desc: "9,26,52" },
  { type: "ParabolicSAR", label: "Parabolic SAR", pane: "overlay", desc: "0.02,0.02,0.2" },
  { type: "Alligator", label: "Williams Alligator", pane: "overlay", desc: "13,8,5" },
  { type: "WilliamsFractal", label: "Williams Fractal", pane: "overlay", desc: "period 2" },
  { type: "ZigZag", label: "Zig Zag", pane: "overlay", desc: "deviation 5" },
  { type: "ChandeKrollStop", label: "Chande Kroll Stop", pane: "overlay", desc: "10,1,9" },
  { type: "MACross", label: "MA Cross", pane: "overlay", desc: "9,21" },
  { type: "EMACross", label: "EMA Cross", pane: "overlay", desc: "9,21" },
  { type: "MAWithEMACross", label: "MA with EMA Cross", pane: "overlay", desc: "10,21" },
  // Volume (9) — separate
  { type: "Volume", label: "Volume", pane: "separate", desc: "—" },
  { type: "OBV", label: "OBV", pane: "separate", desc: "—" },
  { type: "AD", label: "A/D", pane: "separate", desc: "—" },
  { type: "CMF", label: "CMF", pane: "separate", desc: "period 20" },
  { type: "KlingerOscillator", label: "Klinger Oscillator", pane: "separate", desc: "34,55,13" },
  { type: "PVT", label: "PVT", pane: "separate", desc: "—" },
  { type: "EaseOfMovement", label: "Ease of Movement", pane: "separate", desc: "period 14" },
  { type: "VolumeOscillator", label: "Volume Oscillator", pane: "separate", desc: "5,10" },
  { type: "NetVolume", label: "Net Volume", pane: "separate", desc: "—" },
  // Volatility (7)
  { type: "ATR", label: "ATR", pane: "separate", desc: "period 14" },
  { type: "BBWidth", label: "BB Width", pane: "separate", desc: "20,2" },
  { type: "HistoricalVolatility", label: "Historical Volatility", pane: "separate", desc: "20" },
  { type: "PivotPoints", label: "Pivot Points", pane: "overlay", desc: "standard" },
  { type: "StandardDeviation", label: "Standard Deviation", pane: "separate", desc: "20" },
  { type: "ChaikinVolatility", label: "Chaikin Volatility", pane: "separate", desc: "10,10" },
  { type: "FiftyTwoWeekHighLow", label: "52W High/Low", pane: "overlay", desc: "252" },
  // Statistical (7)
  { type: "AveragePrice", label: "Average Price", pane: "overlay", desc: "—" },
  { type: "MedianPrice", label: "Median Price", pane: "overlay", desc: "—" },
  { type: "TypicalPrice", label: "Typical Price", pane: "overlay", desc: "—" },
  { type: "LinearRegressionCurve", label: "LinReg Curve", pane: "overlay", desc: "25" },
  { type: "LinearRegressionSlope", label: "LinReg Slope", pane: "separate", desc: "25" },
  { type: "AccumulativeSwingIndex", label: "Accum. Swing Index", pane: "separate", desc: "limit 0" },
  { type: "MajorityRule", label: "Majority Rule", pane: "separate", desc: "14" },
];

const DRAWING_TOOLS = [
  { value: "select", labelKey: "Charts:tool_select" },
  { value: "line", labelKey: "Charts:tool_line" },
  { value: "ray", labelKey: "Charts:tool_ray" },
  { value: "xline", labelKey: "Charts:tool_xline" },
  { value: "hline", labelKey: "Charts:tool_hline" },
  { value: "hray", labelKey: "Charts:tool_hray" },
  { value: "vline", labelKey: "Charts:tool_vline" },
  { value: "crossline", labelKey: "Charts:tool_crossline" },
  { value: "info-line", labelKey: "Charts:tool_info-line" },
  { value: "trend-angle", labelKey: "Charts:tool_trend-angle" },
  { value: "arrow", labelKey: "Charts:tool_arrow" },
  { value: "channel", labelKey: "Charts:tool_channel" },
  { value: "pitchfork", labelKey: "Charts:tool_pitchfork" },
  { value: "polyline", labelKey: "Charts:tool_polyline" },
  { value: "arc", labelKey: "Charts:tool_arc" },
  { value: "rectangle", labelKey: "Charts:tool_rectangle" },
  { value: "rotated-rectangle", labelKey: "Charts:tool_rotated-rectangle" },
  { value: "circle", labelKey: "Charts:tool_circle" },
  { value: "ellipse", labelKey: "Charts:tool_ellipse" },
  { value: "path", labelKey: "Charts:tool_path" },
  { value: "text", labelKey: "Charts:tool_text" },
  { value: "callout", labelKey: "Charts:tool_callout" },
  { value: "brush", labelKey: "Charts:tool_brush" },
  { value: "highlighter", labelKey: "Charts:tool_highlighter" },
  { value: "fibonacci", labelKey: "Charts:tool_fibonacci" },
  { value: "fib-extension", labelKey: "Charts:tool_fib-extension" },
  { value: "fib-channel", labelKey: "Charts:tool_fib-channel" },
  { value: "fib-time-zone", labelKey: "Charts:tool_fib-time-zone" },
  { value: "fib-wedge", labelKey: "Charts:tool_fib-wedge" },
  { value: "gann-fan", labelKey: "Charts:tool_gann-fan" },
  { value: "gann-box", labelKey: "Charts:tool_gann-box" },
  { value: "triangle-pattern", labelKey: "Charts:tool_triangle-pattern" },
  { value: "abcd-pattern", labelKey: "Charts:tool_abcd-pattern" },
  { value: "xabcd-pattern", labelKey: "Charts:tool_xabcd-pattern" },
  { value: "head-shoulders", labelKey: "Charts:tool_head-shoulders" },
  { value: "elliott-wave", labelKey: "Charts:tool_elliott-wave" },
  { value: "long-position", labelKey: "Charts:tool_long-position" },
  { value: "short-position", labelKey: "Charts:tool_short-position" },
  { value: "forecast", labelKey: "Charts:tool_forecast" },
  { value: "anchored-vwap", labelKey: "Charts:tool_anchored-vwap" },
  { value: "measure", labelKey: "Charts:tool_measure" },
  { value: "date-range", labelKey: "Charts:tool_date-range" },
  { value: "price-date-range", labelKey: "Charts:tool_price-date-range" },
];

// Translate known English parameter words inside an indicator's desc string
// (e.g. "period (20)" -> "Periode (20)"). Acronyms/numbers are left untouched.
const PARAM_TOKENS = [
  ["stdDev", "param_stddav"],
  ["period", "param_period"],
  ["fast", "param_fast"],
  ["slow", "param_slow"],
  ["signal", "param_signal"],
  ["smooth", "param_smooth"],
  ["deviation", "param_deviation"],
  ["multiplier", "param_multiplier"],
  ["offset", "param_offset"],
  ["sigma", "param_sigma"],
  ["displacement", "param_displacement"],
  ["method", "param_method"],
  ["stop", "param_stop"],
];

function localizedDesc(desc, t) {
  let out = desc;
  for (const [token, key] of PARAM_TOKENS) {
    const translated = t(key);
    if (translated && translated !== key) {
      out = out.replace(new RegExp(token, "g"), translated);
    }
  }
  return out;
}

function IndicatorRow({ index, style, indicators, enabledSet, toggle, t }) {
  const item = indicators[index];
  if (!item) return null;
  const checked = enabledSet.has(item.type);
  const paneKey = item.pane === "overlay" ? "Charts:overlay_pane" : "Charts:separate_pane";
  return (
    <div style={style} className="flex items-center gap-3 px-3 py-2 border-b border-border/40 hover:bg-accent/30">
      <Checkbox
        id={`ind-${item.type}`}
        checked={checked}
        onCheckedChange={() => toggle(item.type)}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <Label htmlFor={`ind-${item.type}`} className="text-xs font-medium cursor-pointer truncate block">
          {item.label}
        </Label>
        <span className="text-[11px] text-muted-foreground truncate block">{item.type} • {localizedDesc(item.desc, t)}</span>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${item.pane === "overlay" ? "bg-[hsl(var(--accent-1)/0.12)] text-[hsl(var(--accent-1-fg))]" : "bg-[hsl(var(--accent-2)/0.12)] text-[hsl(var(--accent-2-fg))]"}`}>
        {t(paneKey)}
      </span>
    </div>
  );
}

export default function CandleChart({
  candles,
  buckets,
  bucketSec,
  onBucketChange,
  baseSymbol,
  quoteSymbol,
  loading,
  historyAvailable = true,
  lastFetchAt,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const chartRef = useRef(null);
  const fullscreenChartRef = useRef(null);

  const bucketOptions = useMemo(() => {
    const allowed = (buckets && buckets.length ? buckets : [60, 300, 900, 1800, 3600, 14400, 86400]).filter((v) => v !== 60);
    const labelFor = (s) => {
      if (s < 60) return `${s}s`;
      if (s < 3600) return `${s / 60}m`;
      if (s < 86400) return `${s / 3600}h`;
      return `${s / 86400}D`;
    };
    return [...allowed].sort((a, b) => a - b).map((s) => ({ value: s, label: labelFor(s) }));
  }, [buckets]);

  const timeframe = useMemo(() => bucketSecToTimeframe(bucketSec), [bucketSec]);

  const series = useMemo(() => {
    if (!candles || !candles.length) return [];
    const bars = candles.map((c) => ({
      ts: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? 0,
    }));
    const id = baseSymbol && quoteSymbol ? `${baseSymbol}/${quoteSymbol}` : "Market";
    return [
      {
        id,
        label: id,
        bars,
        color: "#22c55e",
        pricePrecision: 5,
      },
    ];
  }, [candles, baseSymbol, quoteSymbol]);

  const seriesId = useMemo(() => (baseSymbol && quoteSymbol ? `${baseSymbol}/${quoteSymbol}` : "Market"), [baseSymbol, quoteSymbol]);

  const [chartType, setChartType] = useState("candles");
  const [priceScaleMode, setPriceScaleMode] = useState("normal");

  const chartTypes = [
    { value: "candles", labelKey: "Charts:chart_candles" },
    { value: "heikinAshi", labelKey: "Charts:chart_heikinAshi" },
    { value: "hollowCandles", labelKey: "Charts:chart_hollowCandles" },
    { value: "bar", labelKey: "Charts:chart_bar" },
    { value: "highLow", labelKey: "Charts:chart_highLow" },
    { value: "line", labelKey: "Charts:chart_line" },
    { value: "stepLine", labelKey: "Charts:chart_stepLine" },
    { value: "area", labelKey: "Charts:chart_area" },
    { value: "hlcArea", labelKey: "Charts:chart_hlcArea" },
    { value: "histogram", labelKey: "Charts:chart_histogram" },
    { value: "column", labelKey: "Charts:chart_column" },
    { value: "renko", labelKey: "Charts:chart_renko" },
    { value: "lineBreak", labelKey: "Charts:chart_lineBreak" },
    { value: "kagi", labelKey: "Charts:chart_kagi" },
    { value: "pointFigure", labelKey: "Charts:chart_pointFigure" },
  ];

  const priceScaleModes = [
    { value: "normal", labelKey: "Charts:scale_normal" },
    { value: "logarithmic", labelKey: "Charts:scale_logarithmic" },
  ];

  // Fullscreen + indicators/drawings state — reset on close
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [indicators, setIndicators] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [activeTool, setActiveTool] = useState(null);

  const handleFullscreenChange = useCallback((open) => {
    setFullscreenOpen(open);
    if (!open) {
      setIndicators([]);
      setDrawings([]);
      setActiveTool(null);
      setIndicatorsOpen(false);
      // Imperatively clear engine drawings when controlled is off
      try { fullscreenChartRef.current?.executeCommand?.({ type: "clearDrawings" }); } catch {}
    }
  }, []);

  const handleDrawingsChange = useCallback((next) => {
    // Uncontrolled drawings: just mirror for badge/clear, do not feed back to engine to avoid #185 loop
    setDrawings(next);
  }, []);

  const handleActiveToolChange = useCallback((next) => {
    setActiveTool(next);
  }, []);

  const controlled = useMemo(() => ({ indicators: true }), []);

  const toggleIndicator = useCallback((type) => {
    setIndicators((prev) => {
      const exists = prev.find((i) => i.type === type);
      if (exists) return prev.filter((i) => i.type !== type);
      const def = ALL_INDICATORS.find((a) => a.type === type);
      return [
        ...prev,
        {
          type,
          seriesId,
          pane: def?.pane ?? "overlay",
        },
      ];
    });
  }, [seriesId]);

  const enabledSet = useMemo(() => new Set(indicators.map((i) => i.type)), [indicators]);
  const indicatorRowData = useMemo(() => ({ indicators: ALL_INDICATORS, enabledSet, toggle: toggleIndicator }), [enabledSet, toggleIndicator]);

  const { resolvedTheme } = useTheme();
  // Candlestick up/down colours are market convention and stay fixed across
  // themes (theming carve-out, same as the order-book SIDE_STYLES). Grid/axis
  // read live CSS vars with static pre-hydration fallbacks below.
  const [chartTheme, setChartTheme] = useState(() => ({
    background: "transparent",
    grid: "rgba(0,0,0,0.06)",
    axisText: "#6b7280",
    axisBackground: "transparent",
    upCandle: "#22c55e",
    downCandle: "#ef4444",
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
      setChartTheme({
        background: "transparent",
        grid: border,
        axisText: mutedFg,
        axisBackground: "transparent",
        upCandle: "#22c55e",
        downCandle: "#ef4444",
        crosshair: mutedFg,
      });
    };
    compute();
    const observer = new MutationObserver(compute);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const themeStyle = document.getElementById("custom-theme-vars");
    if (themeStyle) observer.observe(themeStyle, { attributes: true, childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [resolvedTheme, bucketSec]);

  const theme = useMemo(() => ({
    background: chartTheme.background,
    grid: chartTheme.grid,
    axisText: chartTheme.axisText,
    axisBackground: chartTheme.axisBackground,
    upCandle: chartTheme.upCandle,
    downCandle: chartTheme.downCandle,
    crosshair: chartTheme.crosshair,
    gridRows: 6,
    gridColumns: 8,
  }), [chartTheme]);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.40)] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.07)] blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[hsl(var(--accent-2)/0.07)] blur-3xl" />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <TrendingUp className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                {t("Charts:market_price", { base: baseSymbol ?? t("Charts:market"), quote: quoteSymbol ?? "" }).replace(" /  ", " ")}
              </h3>
                <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {historyAvailable
                    ? `${bucketOptions.find((o)=>o.value===bucketSec)?.label ?? bucketSec+"s"} • ${t("Charts:candles_count", { count: candles?.length ?? 0 })}`
                    : t("Charts:history_unavailable")}
                  {lastFetchAt ? ` • ${new Date(lastFetchAt).toLocaleTimeString()}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1">
                  {bucketOptions.map((opt) => {
                    const active = opt.value === bucketSec;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onBucketChange && onBucketChange(opt.value)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-lg transition-all",
                          active
                            ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] border border-[hsl(var(--accent-1)/0.40)] shadow-[0_0_18px_-8px_hsl(var(--accent-1)/0.6)]"
                            : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("Charts:enter_fullscreen")}
                  onClick={() => setFullscreenOpen(true)}
                  className="h-8 w-8 rounded-full border border-border bg-card/40 hover:bg-card/60 hover:border-[hsl(var(--accent-1)/0.40)] text-muted-foreground hover:text-foreground shrink-0"
                >
                  <EnterFullScreenIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="w-[160px] h-9 bg-card/40 border-border text-xs">
                    <SelectValue placeholder={t("Charts:chart_type")} />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypes.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value} className="text-xs">
                        {t(ct.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priceScaleMode} onValueChange={setPriceScaleMode}>
                  <SelectTrigger className="w-[160px] h-9 bg-card/40 border-border text-xs">
                    <SelectValue placeholder={t("Charts:price_scale")} />
                  </SelectTrigger>
                  <SelectContent>
                    {priceScaleModes.map((ps) => (
                      <SelectItem key={ps.value} value={ps.value} className="text-xs">
                        {t(ps.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading && (!candles || !candles.length) ? (
            <div className="h-[340px] flex flex-col items-center justify-center gap-3 rounded-lg border border-border/40 bg-card/30">
              <Spinner className="size-6 text-[hsl(var(--accent-1-fg))]" />
              <span className="text-xs text-muted-foreground">{t("Charts:loading_candles")}</span>
            </div>
          ) : !series.length || !series[0].bars.length ? (
            <div className="h-[340px] flex flex-col items-center justify-center gap-2 rounded-lg border border-border/40 bg-card/30 text-center p-4">
              <TrendingUp className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground/70">
                {historyAvailable ? t("Charts:no_candle_data") : t("Charts:history_api_unavailable")}
              </p>
              <p className="text-xs text-muted-foreground/50">{t("Charts:history_node_required")}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/40 bg-card/30 overflow-hidden">
              <div className="h-[340px] w-full">
                <FastFinancialChart
                  ref={chartRef}
                  series={series}
                  timeframe={timeframe}
                  chartType={chartType}
                  priceScaleMode={priceScaleMode}
                  performance={{ indicatorWorker: false }}
                  defaultViewport={{ type: "last-bars", bars: 200 }}
                  theme={theme}
                  style={{ height: "340px", width: "100%" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Dialog — 75% width, large chart with full indicator + drawing support */}
      <Dialog open={fullscreenOpen} onOpenChange={handleFullscreenChange}>
        <DialogContent className="max-w-[75vw] w-[75vw] h-[75vh] sm:max-w-[75vw] p-0 gap-0 bg-card border border-border overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
              {baseSymbol && quoteSymbol ? `${baseSymbol} / ${quoteSymbol}` : t("Charts:market")} {t("Charts:fullscreen_suffix")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {bucketOptions.find((o)=>o.value===bucketSec)?.label ?? bucketSec+"s"} • {t("Charts:candles_count", { count: candles?.length ?? 0 })} • {t(chartTypes.find(c=>c.value===chartType)?.labelKey ?? "Charts:chart_candles")} • {t(priceScaleModes.find(p=>p.value===priceScaleMode)?.labelKey ?? "Charts:scale_normal")}
            </DialogDescription>
          </DialogHeader>

          {/* Controls duplicated in dialog */}
          <div className="px-6 pb-3 shrink-0 flex flex-col gap-3 border-b border-border/40">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1">
                {bucketOptions.map((opt) => {
                  const active = opt.value === bucketSec;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onBucketChange && onBucketChange(opt.value)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-lg transition-all",
                        active
                          ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] border border-[hsl(var(--accent-1)/0.40)]"
                          : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-[160px] h-9 bg-card/40 border-border text-xs">
                  <SelectValue placeholder={t("Charts:chart_type")} />
                </SelectTrigger>
                <SelectContent>
                  {chartTypes.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value} className="text-xs">
                      {t(ct.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priceScaleMode} onValueChange={setPriceScaleMode}>
                <SelectTrigger className="w-[160px] h-9 bg-card/40 border-border text-xs">
                  <SelectValue placeholder={t("Charts:price_scale")} />
                </SelectTrigger>
                <SelectContent>
                  {priceScaleModes.map((ps) => (
                    <SelectItem key={ps.value} value={ps.value} className="text-xs">
                      {t(ps.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("Charts:exit_fullscreen")}
                onClick={() => handleFullscreenChange(false)}
                className="h-8 w-8 rounded-full border border-border bg-card/40 hover:bg-card/60 text-muted-foreground hover:text-foreground ml-auto"
              >
                <ExitFullScreenIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Indicators launcher — opens nested dialog, does NOT close parent */}
              <Dialog open={indicatorsOpen} onOpenChange={setIndicatorsOpen}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIndicatorsOpen(true)}
                  className="h-8 gap-1.5 border-border bg-card/40 hover:bg-card/60 text-xs"
                >
                  {t("Charts:indicators")}
                  {indicators.length > 0 ? <span className="bg-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] rounded-full px-1.5 py-0.5 text-[10px]">{indicators.length}</span> : null}
                </Button>
                <DialogContent
                  className="sm:max-w-[520px] max-h-[70vh] p-0 gap-0 bg-card border border-border overflow-hidden flex flex-col"
                  onEscapeKeyDown={(e) => { e.stopPropagation(); }}
                >
                  <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
                    <DialogTitle className="text-sm">{t("Charts:indicators_available", { count: ALL_INDICATORS.length })}</DialogTitle>
                    <DialogDescription className="text-xs">
                      {t("Charts:indicators_description")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="px-5 pb-2 flex items-center justify-between gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{enabledSet.size} {t("Charts:enabled")}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIndicators([])}
                      disabled={indicators.length === 0}
                    >
                      {t("Charts:clear_all")}
                    </Button>
                  </div>
                  <div className="h-[400px] border-t border-border/40 overflow-hidden">
                    <List
                      height={400}
                      width="100%"
                      rowCount={ALL_INDICATORS.length}
                      rowHeight={44}
                      rowProps={{ indicators: ALL_INDICATORS, enabledSet, toggle: toggleIndicator, t }}
                      rowComponent={IndicatorRow}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Drawing tools — 42 tools */}
              <Select value={activeTool ?? "select"} onValueChange={(v) => setActiveTool(v === "select" ? null : v)}>
                <SelectTrigger className="w-[200px] h-8 bg-card/40 border-border text-xs">
                  <SelectValue placeholder={t("Charts:drawing_tool")} />
                </SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  {DRAWING_TOOLS.map((tool) => (
                    <SelectItem key={tool.value} value={tool.value} className="text-xs">
                      {t(tool.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {drawings.length > 0 || activeTool ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setDrawings([]);
                    setActiveTool(null);
                    try { fullscreenChartRef.current?.executeCommand?.({ type: "clearDrawings" }); } catch {}
                  }}
                >
                  {t("Charts:clear_drawings")}
                </Button>
              ) : null}
              <span className="text-[11px] text-muted-foreground ml-2 hidden sm:inline">
                {t("Charts:draw_hint")}
              </span>
            </div>
          </div>

          {/* Fullscreen chart — single default pane (no double), indicators controlled, drawings uncontrolled to avoid #185 */}
          <div className="flex-1 min-h-0 px-6 pb-6">
            <div className="h-full w-full rounded-lg border border-border/40 bg-card/30 overflow-hidden">
              <FastFinancialChart
                ref={fullscreenChartRef}
                series={series}
                timeframe={timeframe}
                chartType={chartType}
                priceScaleMode={priceScaleMode}
                indicators={indicators}
                activeTool={activeTool}
                onDrawingsChange={handleDrawingsChange}
                onActiveToolChange={handleActiveToolChange}
                controlled={controlled}
                performance={{ indicatorWorker: false }}
                defaultViewport={{ type: "last-bars", bars: 200 }}
                theme={theme}
                style={{ height: "100%", width: "100%" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
