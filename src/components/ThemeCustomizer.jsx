import React from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";

import {
  $customTheme,
  $draftTheme,
  setActiveTheme,
  updateTheme,
  updateThemeSeed,
  updateThemeToken,
  updateBrand,
  updateSectionAccent,
  updateStatusAccent,
  updatePageAccent,
  updateGlobalAccent,
  resolveBrand,
  resolveSectionAccent,
  resolveStatus,
  resolvePageAccent,
  renameTheme,
  createDraftTheme,
  duplicateDraftTheme,
  saveDraftTheme,
  discardDraftTheme,
  deleteTheme,
  isValidThemeName,
  PRESET_THEMES,
  NAV_SECTIONS,
  STATUS_ROLES,
} from "@/stores/customTheme.ts";

import { ColorPicker, ColorArea, ColorSlider } from "@fluentui/react-color-picker";
import { TinyColor } from "@ctrl/tinycolor";
import { buildAccentVars } from "@/lib/accentVars.js";
import {
  EDITABLE_TOKENS,
  buildThemeVars,
  auditTokenContrast,
  contrastRatio,
  readableForeground,
  hexToRgb,
  hexToHsl,
  hsvToHex,
  hexToHsv,
} from "@/lib/tailwindPalette.js";
import { THEMABLE_PAGES } from "@/lib/pages.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Palette,
  Plus,
  Copy,
  Trash2,
  Check,
  Save,
  X,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";


const TOKEN_LABEL_KEYS = {
  primary: "primary",
  background: "token_background",
  card: "token_card",
  secondary: "secondary",
  muted: "token_muted",
  accent: "token_accent",
  border: "token_border",
  ring: "token_ring",
  destructive: "token_destructive",
  sidebar: "token_sidebar",
  sidebarAccent: "token_sidebarAccent",
};

// English fallbacks for token labels (used when a locale file lacks the key).
const TOKEN_FALLBACKS = {
  primary: "Primary",
  background: "Background",
  card: "Card / Popover",
  secondary: "Secondary",
  muted: "Muted",
  accent: "Accent",
  border: "Border / Input",
  ring: "Focus ring",
  destructive: "Destructive",
  sidebar: "Sidebar",
  sidebarAccent: "Sidebar accent",
};

// Maps nav section ids to PageHeader short-label keys so section names reuse
// the already-translated navigation labels in all locales.
const SECTION_NAV_KEYS = {
  exchanging: "exchange",
  transfer: "transfer",
  debt: "debt",
  assetCreation: "assets",
  account: "account",
  blockchain: "blockchain",
  governance: "governance",
  invoicing: "invoicing",
  liquidityPools: "liquidityPools",
  community: "community",
  settings: "settings",
};
const SECTION_FALLBACKS = {
  exchanging: "Exchange",
  transfer: "Transfer",
  debt: "Debt",
  assetCreation: "Assets",
  account: "Account",
  blockchain: "Blockchain",
  governance: "Governance",
  invoicing: "Invoicing",
  liquidityPools: "Liquidity pools",
  community: "Community",
  settings: "Settings",
};

// ColorField: label+swatch sidebar on left, Fluent ColorPicker + palette shortcuts on right
function ColorField({ label, value, onChange, disabled }) {
  const currentHex = value?.hex || "#808080";
  const rgb = hexToRgb(currentHex) || { r: 128, g: 128, b: 128 };
  const [hsv, setHsv] = React.useState(() => hexToHsv(currentHex));
  const [hexInput, setHexInput] = React.useState("");
  const [rgbInputs, setRgbInputs] = React.useState({ r: "", g: "", b: "" });
  const [editingField, setEditingField] = React.useState(null);

  React.useEffect(() => {
    const hsvFromPalette = hexToHsv(currentHex);
    setHsv(hsvFromPalette);
  }, [currentHex]);

  React.useEffect(() => {
    if (editingField !== "hex") setHexInput(hsvToHex(hsv.h, hsv.s, hsv.v).replace("#", "").toUpperCase());
    if (editingField !== "rgb") setRgbInputs({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
  }, [hsv, rgb.r, rgb.g, rgb.b, editingField]);

  const handleFluentChange = React.useCallback((_, data) => {
    const newHsv = { h: data.color.h, s: data.color.s, v: data.color.v };
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    onChange({ hex });
  }, [onChange]);

  const commitHex = (raw) => {
    const clean = raw.replace(/[^a-fA-F0-9]/g, "").slice(0, 6);
    setHexInput(clean);
    if (clean.length === 6) {
      const hex = "#" + clean;
      setHsv(hexToHsv(hex));
      onChange({ hex });
    }
  };

  const commitRgb = (key, raw) => {
    const clean = raw.replace(/[^0-9]/g, "").slice(0, 3);
    const val = Math.min(255, Math.max(0, parseInt(clean || "0", 10)));
    const next = { ...rgbInputs, [key]: clean };
    setRgbInputs(next);
    if (clean.length >= 1) {
      const r = key === "r" ? val : parseInt(rgbInputs.r || "0", 10);
      const g = key === "g" ? val : parseInt(rgbInputs.g || "0", 10);
      const b = key === "b" ? val : parseInt(rgbInputs.b || "0", 10);
      const toHex = (n) => n.toString(16).padStart(2, "0");
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      setHsv(hexToHsv(hex));
      onChange({ hex });
    }
  };

  return (
    <div className="rounded-lg p-3 space-y-3 overflow-hidden">
      {/* Fluent ColorPicker */}
      <div className="w-full max-w-full overflow-hidden">
        <ColorPicker color={hsv} onColorChange={handleFluentChange} shape="square">
          <ColorArea />
          <ColorSlider channel="hue" />
        </ColorPicker>
      </div>
      {/* Hex + RGB inputs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">#</span>
          <input
            type="text"
            value={hexInput}
            disabled={disabled}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            onBlur={() => commitHex(hexInput)}
            onKeyDown={(e) => { if (e.key === "Enter") commitHex(hexInput); }}
            onFocus={() => setEditingField("hex")}
            maxLength={6}
            placeholder="FFFFFF"
            className={cn(
              "w-[68px] h-6 rounded border border-border/60 bg-background px-1.5 text-[11px] font-mono uppercase",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
        <div className="flex items-center gap-0.5">
          {["r", "g", "b"].map((key) => (
            <React.Fragment key={key}>
              {key !== "r" && <span className="text-[9px] text-muted-foreground">,</span>}
              <input
                type="text"
                value={rgbInputs[key]}
                disabled={disabled}
                onChange={(e) => commitRgb(key, e.target.value)}
                onFocus={() => setEditingField("rgb")}
                maxLength={3}
                placeholder={key.toUpperCase()}
                className={cn(
                  "w-[30px] h-6 rounded border border-border/60 bg-background px-1 text-[11px] font-mono text-center",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContrastBadge({ bgHex, fgHex, t }) {
  const ratio = contrastRatio(bgHex, fgHex);
  const rounded = Math.round(ratio * 10) / 10;
  const pass = ratio >= 4.5;
  const passLarge = ratio >= 3;
  const tt = (key, fallback) => (t ? t(`ThemeCustomizer:${key}`, fallback) : fallback);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono border",
        pass
          ? "bg-[hsl(var(--accent-success)/0.15)] text-[hsl(var(--accent-success-fg))] border-[hsl(var(--accent-success)/0.4)]"
          : passLarge
          ? "bg-[hsl(var(--accent-warning)/0.15)] text-[hsl(var(--accent-warning-fg))] border-[hsl(var(--accent-warning)/0.4)]"
          : "bg-[hsl(var(--accent-danger)/0.15)] text-[hsl(var(--accent-danger-fg))] border-[hsl(var(--accent-danger)/0.4)]"
      )}
      title={pass ? tt("contrastAA", "WCAG AA") : passLarge ? tt("contrastAALarge", "AA large text only") : tt("contrastFail", "Fails WCAG AA")}
    >
      {rounded}:1 {pass ? "AA" : passLarge ? "AA-lg" : "!"}
    </span>
  );
}

const AUDIT_ROLES = [
  ["--accent-1", "rolePagePrimary"],
  ["--accent-2", "rolePageSecondary"],
  ["--accent-3", "rolePageTertiary"],
  ["--accent-success", "roleStatusSuccess"],
  ["--accent-danger", "roleStatusDanger"],
  ["--accent-warning", "roleStatusWarning"],
  ["--accent-info", "roleStatusInfo"],
];

const AUDIT_ROLE_FALLBACKS = {
  rolePagePrimary: "Page primary",
  rolePageSecondary: "Page secondary",
  rolePageTertiary: "Page tertiary",
  roleStatusSuccess: "Status success",
  roleStatusDanger: "Status danger",
  roleStatusWarning: "Status warning",
  roleStatusInfo: "Status info",
};

// Maps auditTokenContrast() row keys to locale keys (English fallbacks kept
// next to each usage site).
const AUDIT_TOKEN_KEYS = {
  background: "token_background",
  card: "token_card",
  primary: "primary",
  secondary: "secondary",
  muted: "token_muted",
  accent: "token_accent",
  destructive: "token_destructive",
  sidebar: "token_sidebar",
  sidebarAccent: "token_sidebarAccent",
};

function tripletToHex(triplet) {
  if (!triplet || typeof triplet !== "string") return "#808080";
  const parts = triplet.trim().split(/\s+/);
  if (parts.length !== 3) return "#808080";
  try {
    return new TinyColor(`hsl(${parts[0]},${parts[1]},${parts[2]})`).toHexString();
  } catch {
    return "#808080";
  }
}

// Whole-theme contrast audit: every text-bearing token pair plus the page
// accent/status roles, in both modes. Surfaces AA failures (e.g. a custom
// primary that neither black nor white text passes on) inside the customizer
// instead of in production. Chrome uses accent roles (not fixed palette) so
// the panel itself follows the theme being audited.
function AuditPanel({ theme, accentPage, t }) {
  const rows = React.useMemo(() => {
    try {
      const tv = buildThemeVars(theme);
      const tokenRows = auditTokenContrast(theme).map((r) => {
        const labelKey = AUDIT_TOKEN_KEYS[r.key];
        const label = labelKey ? t(`ThemeCustomizer:${labelKey}`, r.label) : r.label;
        return {
          label: label + (r.fixed || r.fixedDark ? t("ThemeCustomizer:autoFixedSuffix", " · auto-fixed") : ""),
          bgLight: r.bg,
          fgLight: r.fg,
          bgDark: r.bgDark,
          fgDark: r.fgDark,
        };
      });
      const triple = resolvePageAccent(theme, accentPage);
      const status = {
        success: resolveStatus(theme, "success"),
        danger: resolveStatus(theme, "danger"),
        warning: resolveStatus(theme, "warning"),
        info: resolveStatus(theme, "info"),
      };
      const { light, dark } = buildAccentVars(triple, status, null, null, tv.bgLightHex, tv.bgDarkHex);
      const roleRows = AUDIT_ROLES.map(([base, key]) => ({
        label: t(`ThemeCustomizer:${key}`, AUDIT_ROLE_FALLBACKS[key]),
        bgLight: tv.bgLightHex,
        fgLight: tripletToHex(light[`${base}-fg`]),
        bgDark: tv.bgDarkHex,
        fgDark: tripletToHex(dark[`${base}-fg`]),
      }));
      return [...tokenRows, ...roleRows];
    } catch {
      return [];
    }
  }, [theme, accentPage, t]);

  const failures = rows.filter(
    (r) => contrastRatio(r.bgLight, r.fgLight) < 4.5 || contrastRatio(r.bgDark, r.fgDark) < 4.5
  ).length;
  const autoFixed = rows.filter((r) => r.label.endsWith(t("ThemeCustomizer:autoFixedSuffix", " · auto-fixed"))).length;
  const hardFails = rows.filter(
    (r) => contrastRatio(r.bgLight, r.fgLight) < 3 || contrastRatio(r.bgDark, r.fgDark) < 3
  ).length;
  const grade = failures === 0 ? "A" : hardFails === 0 ? "B" : "F";

  return (
    <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-success))] to-[hsl(var(--accent-info))]" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--accent-success)/0.15)]">
            <ShieldCheck className="h-4 w-4 text-[hsl(var(--accent-success-fg))]" />
          </span>
          {t("ThemeCustomizer:auditTitle", "Contrast audit")}
          <span
            className={cn(
              "ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold",
              grade === "A"
                ? "bg-[hsl(var(--accent-success)/0.15)] text-[hsl(var(--accent-success-fg))] border-[hsl(var(--accent-success)/0.4)]"
                : grade === "B"
                ? "bg-[hsl(var(--accent-warning)/0.15)] text-[hsl(var(--accent-warning-fg))] border-[hsl(var(--accent-warning)/0.4)]"
                : "bg-[hsl(var(--accent-danger)/0.15)] text-[hsl(var(--accent-danger-fg))] border-[hsl(var(--accent-danger)/0.4)]"
            )}
            title={t("ThemeCustomizer:auditGradeTitle", { grade, defaultValue: `Overall accessibility grade: ${grade}` })}
          >
            {grade}
          </span>
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {failures === 0
            ? t("ThemeCustomizer:auditDescAllPass", { count: rows.length, defaultValue: `All ${rows.length} text pairs pass WCAG AA in light and dark mode.` })
            : t("ThemeCustomizer:auditDescFail", { failures, total: rows.length, defaultValue: `${failures} of ${rows.length} pairs fail WCAG AA — adjust the flagged colours.` })}
          {autoFixed > 0
            ? " " + t("ThemeCustomizer:auditAutoFixed", "Pairs marked auto-fixed are corrected in the emitted CSS, but the swatch over-promises — prefer fixing the colour itself.")
            : null}
          <span className="block mt-1">
            {t("ThemeCustomizer:auditLegend", "A ratio like 18.2:1 compares text against its background. AA needs \u2265 4.5 for normal text; AA-large needs \u2265 3. Light and dark columns test each pair on that mode\u2019s background.")}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-accent/40"
            >
              <span className="text-xs truncate">{r.label}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-muted-foreground">{t("ThemeCustomizer:auditLight", "light")}</span>
                <ContrastBadge bgHex={r.bgLight} fgHex={r.fgLight} t={t} />
                <span className="text-[10px] text-muted-foreground">{t("ThemeCustomizer:auditDark", "dark")}</span>
                <ContrastBadge bgHex={r.bgDark} fgHex={r.fgDark} t={t} />
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// Compact whole-theme overview (SYS-15): every nav section, status role and
// the previewed page triple in one place, so section collisions and status
// camouflage are visible without navigating the app. Chips show raw hexes
// (mode-independent); text legibility per mode is covered by the audit panel.
function MatrixPanel({ theme, accentPage, t }) {
  const rows = React.useMemo(() => {
    try {
      const sections = NAV_SECTIONS.map((id) => {
        const pair = resolveSectionAccent(theme, id);
        return {
          label: t(`PageHeader:navShort.${SECTION_NAV_KEYS[id]}`, SECTION_FALLBACKS[id] || id),
          primary: pair.primary,
          secondary: pair.secondary,
        };
      });
      const triple = resolvePageAccent(theme, accentPage);
      const status = ["success", "danger", "warning", "info"].map((role) => ({
        label: t(`ThemeCustomizer:status_${role}`, role),
        primary: resolveStatus(theme, role),
      }));
      return {
        sections,
        status,
        triple: [
          { label: `1° ${triple.primary}`, primary: triple.primary },
          { label: `2° ${triple.secondary}`, primary: triple.secondary },
          { label: `3° ${triple.tertiary}`, primary: triple.tertiary },
        ],
      };
    } catch {
      return { sections: [], status: [], triple: [] };
    }
  }, [theme, accentPage, t]);

  const chip = (label, primary, secondary, key) => {
    const colors = secondary && secondary !== primary ? `${primary} → ${secondary}` : `${primary}`;
    return (
    <span
      key={key || label}
      title={t("ThemeCustomizer:chipTitle", { label, colors, defaultValue: `${label}: ${colors}` })}
      className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1 text-[11px]"
    >
      <span
        className="h-3 w-3 rounded-full border border-black/10 shrink-0"
        style={{ background: secondary && secondary !== primary ? `linear-gradient(135deg, ${primary}, ${secondary})` : primary }}
      />
      <span className="text-foreground/80">{label}</span>
    </span>
    );
  };

  return (
    <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))]" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--accent-2)/0.15)]">
            <Palette className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
          </span>
          {t("ThemeCustomizer:matrixTitle", "Palette matrix")}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t("ThemeCustomizer:matrixDesc", "All 11 nav sections, status roles and the previewed page triple at a glance. Adjacent sections sharing a hue, or status roles matching brand chrome, stand out here.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground mb-1.5">{t("ThemeCustomizer:matrixSections", "Sections")}</div>
          <div className="flex flex-wrap gap-1.5">
            {rows.sections.map((s) => chip(s.label, s.primary, s.secondary))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-muted-foreground mb-1.5">{t("ThemeCustomizer:matrixStatus", "Status roles")}</div>
          <div className="flex flex-wrap gap-1.5">
            {rows.status.map((s) => chip(s.label, s.primary, null))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-muted-foreground mb-1.5">{t("ThemeCustomizer:matrixTriple", "Page triple")}</div>
          <div className="flex flex-wrap gap-1.5">
            {rows.triple.map((s) => chip(s.label, s.primary, null))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Dark-mode variant editors (SYS-03 W2). Optional per-role overrides that
// replace the light triple/status hexes when `.dark` is active; absence means
// "same in both modes". Edits flow through pendingEdits, so Save/Discard and
// the app-wide live preview treat them like every other tweak.
function DarkVariantsPanel({ theme, accentPage, canEdit, onPickDark, onResetDark, t }) {
  const lightTriple = resolvePageAccent(theme, accentPage);
  const darkTriple = (theme.darkPageAccents || {})[accentPage] || {};
  const PAGE_ROLE_KEYS = { primary: "rolePagePrimary", secondary: "rolePageSecondary", tertiary: "rolePageTertiary" };
  const PAGE_ROLE_FALLBACKS = { primary: "Page primary", secondary: "Page secondary", tertiary: "Page tertiary" };
  const rows = [
    ...["primary", "secondary", "tertiary"].map((role) => ({
      id: `dark_page_${role}`,
      label: t(`ThemeCustomizer:${PAGE_ROLE_KEYS[role]}`, PAGE_ROLE_FALLBACKS[role]),
      fallback: lightTriple[role],
      value: darkTriple[role] || null,
    })),
    ...STATUS_ROLES.map((role) => ({
      id: `dark_status_${role}`,
      label: t(`ThemeCustomizer:status_${role}`, role),
      fallback: resolveStatus(theme, role),
      value: ((theme.darkStatusAccents || {})[role]) || null,
    })),
  ];
  return (
    <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-3))] to-[hsl(var(--accent-1))]" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--accent-3)/0.15)]">
            <Palette className="h-4 w-4 text-[hsl(var(--accent-3-fg))]" />
          </span>
          {t("ThemeCustomizer:darkVariants") || "Dark-mode variants"}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t("ThemeCustomizer:darkVariantsDesc") ||
            "Optional overrides used only in dark mode. Empty means “same in both modes”. Follows Save/Discard like other edits."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
          {rows.map((r) => (
            <li
              key={r.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2 py-1",
                r.value
                  ? "bg-[hsl(var(--accent-1)/0.07)] border border-[hsl(var(--accent-1)/0.25)]"
                  : "hover:bg-accent/40"
              )}
            >
              <span className="flex items-center gap-2 text-xs min-w-0">
                <span
                  className="h-4 w-4 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: r.value || r.fallback }}
                  title={r.value ? t("ThemeCustomizer:darkOverrideTitle", { value: r.value, fallback: r.fallback, defaultValue: `dark override ${r.value} (light: ${r.fallback})` }) : t("ThemeCustomizer:darkFollowsTitle", { fallback: r.fallback, defaultValue: `follows light: ${r.fallback}` })}
                />
                <span className="truncate">{r.label}</span>
                {!r.value && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{t("ThemeCustomizer:followsLight", "follows light")}</span>
                )}
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <input
                  type="color"
                  value={r.value || r.fallback}
                  disabled={!canEdit}
                  onChange={(e) => onPickDark(r.id, e.target.value)}
                  className="h-7 w-10 rounded border border-border bg-transparent p-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t("ThemeCustomizer:darkAriaLabel", { label: r.label, defaultValue: `${r.label} dark override` })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canEdit || !r.value}
                  onClick={() => onResetDark(r.id)}
                  className="h-7 w-7 p-0"
                  title={t("ThemeCustomizer:resetDark", "Reset to light value")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PreviewPanel({ theme, accent, status, mode, t }) {
  const { light, dark, bgLightHex, bgDarkHex } = buildThemeVars(theme);
  const vars = mode === "dark" ? dark : light;
  const modeName = t(mode === "dark" ? "ThemeCustomizer:modeDark" : "ThemeCustomizer:modeLight", mode + " mode");
  // W6: marched text colours beside each swatch so authors design against
  // reality (a 20L march means the swatch over-promises brightness).
  let fgById = {};
  try {
    const roles = buildAccentVars(accent, status, null, null, bgLightHex, bgDarkHex);
    const map = mode === "dark" ? roles.dark : roles.light;
    const hex = (trip) => tripletToHex(map[trip]);
    fgById = {
      1: [hex("--accent-1-fg"), accent.primary],
      2: [hex("--accent-2-fg"), accent.secondary],
      3: [hex("--accent-3-fg"), accent.tertiary],
    };
    if (status) {
      fgById.ok = [hex("--accent-success-fg"), status.success];
      fgById.err = [hex("--accent-danger-fg"), status.danger];
      fgById.warn = [hex("--accent-warning-fg"), status.warning];
      fgById.info = [hex("--accent-info-fg"), status.info];
    }
  } catch {
    fgById = {};
  }
  const swatch = (id, label, color) => {
    const [fgHex, baseHex] = fgById[id] || [null, color];
    const fill = baseHex || color;
    const ratio = fgHex ? Math.round(contrastRatio(fill, fgHex) * 10) / 10 : null;
    const tip = fgHex
      ? t("ThemeCustomizer:swatchTitle", { label, fill, text: fgHex, ratio, mode: modeName, defaultValue: `${label}: fill ${fill} → text ${fgHex} (${ratio}:1 in ${modeName})` })
      : `${label}: ${color}`;
    return (
      <div key={id} className="flex flex-col items-center gap-1">
        <span
          className="h-6 w-6 rounded-md border border-black/10"
          style={{ backgroundColor: color || "#808080" }}
          title={tip}
        />
        <span
          className="text-[9px] opacity-70"
          style={fgHex ? { color: fgHex, opacity: 1 } : undefined}
          title={tip}
        >
          {label}
        </span>
      </div>
    );
  };
  const style = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, v])
  );
  const wrapStyle = {
    background: `hsl(${vars["--background"]})`,
    color: `hsl(${vars["--foreground"]})`,
    ...style,
  };
  return (
    <div
      className="rounded-xl border border-border p-4 space-y-3"
      style={wrapStyle}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t("ThemeCustomizer:previewTitle", "Preview")}</span>
        <span className="text-xs opacity-70">{modeName}</span>
      </div>
      <div
        className="rounded-lg p-3 border"
        style={{
          background: `hsl(${vars["--card"]})`,
          color: `hsl(${vars["--card-foreground"]})`,
          borderColor: `hsl(${vars["--border"]})`,
        }}
      >
        <div className="text-sm font-medium mb-2">{t("ThemeCustomizer:cardSurface", "Card surface")}</div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium"
            style={{
              background: `hsl(${vars["--primary"]})`,
              color: `hsl(${vars["--primary-foreground"]})`,
            }}
          >
            {t("ThemeCustomizer:primary")}
          </span>
          <span
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm"
            style={{
              background: `hsl(${vars["--secondary"]})`,
              color: `hsl(${vars["--secondary-foreground"]})`,
            }}
          >
            {t("ThemeCustomizer:secondary")}
          </span>
          <span
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm"
            style={{
              background: `hsl(${vars["--accent"]})`,
              color: `hsl(${vars["--accent-foreground"]})`,
            }}
          >
            {t("ThemeCustomizer:token_accent", "Accent")}
          </span>
        </div>
      </div>
      {accent ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {swatch("1", "1", accent.primary)}
          {swatch("2", "2", accent.secondary)}
          {swatch("3", "3", accent.tertiary)}
          {status ? (
            <>
              {swatch("ok", t("ThemeCustomizer:status_success"), status.success)}
              {swatch("err", t("ThemeCustomizer:status_danger"), status.danger)}
              {swatch("warn", t("ThemeCustomizer:status_warning"), status.warning)}
              {swatch("info", t("ThemeCustomizer:status_info"), status.info)}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Row component for the react-window saved themes list
function ThemeRow({ index, style, themes, activeId, draftTheme, onSelect, t }) {
  const th = themes[index];
  const active = th.id === activeId;
  return (
    <div style={style} className="px-1 py-0.5">
      <button
        type="button"
        onClick={() => onSelect(th)}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
          active
            ? "border-ring bg-accent"
            : "border-border/60 hover:bg-accent/50"
        )}
      >
        <span
          className="h-5 w-5 rounded-md border border-border/50 shrink-0"
          style={{ backgroundColor: th.seed?.hex || "#808080" }}
        />
        <span className="flex-1 truncate text-sm">{th.name}</span>
        {th.draft ? (
          <span className="text-[10px] uppercase tracking-wide text-[hsl(var(--accent-info-fg))]">
            {t("ThemeCustomizer:draft")}
          </span>
        ) : PRESET_THEMES[th.id] ? (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("ThemeCustomizer:preset")}
          </span>
        ) : null}
        {active ? <Check className="h-4 w-4 text-foreground/70" /> : null}
      </button>
    </div>
  );
}

// Row component for the react-window color items list.
// Each row is either a category header or an item — never both.
function ColorItemRow({ index, style, colorItems, selectedColor, onSelect }) {
  const item = colorItems[index];
  if (item.type === "header") {
    return (
      <div style={style} className="flex items-end px-3 pb-1 bg-[hsl(var(--accent-1)/0.05)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.category}</span>
      </div>
    );
  }
  return (
    <div style={style}>
      <button
        type="button"
        onClick={() => onSelect(index)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 h-full text-left transition-colors border-l-2",
          item.selectedIndex === selectedColor
            ? "bg-[hsl(var(--accent-1)/0.12)] border-l-[hsl(var(--accent-1))]"
            : "border-l-transparent hover:bg-accent/50"
        )}
      >
        <span
          className={cn(
            "rounded-full shrink-0 border",
            item.selectedIndex === selectedColor
              ? "h-5 w-5 border-[hsl(var(--accent-1))] shadow-[0_0_10px_-1px_hsl(var(--accent-1)/0.7)]"
              : "h-4 w-4 border-black/10"
          )}
          style={{ backgroundColor: item.value?.hex || "#808080" }}
        />
        <span className="text-xs truncate">{item.label}</span>
      </button>
    </div>
  );
}

export default function ThemeCustomizer() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const state = useStore($customTheme);
  const draftTheme = useStore($draftTheme);
  const [accentPage, setAccentPage] = React.useState(THEMABLE_PAGES[0]?.slug || "index");
  const [editedName, setEditedName] = React.useState("");
  const [nameError, setNameError] = React.useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [previewThemeId, setPreviewThemeId] = React.useState(state.activeThemeId);
  const [pendingEdits, setPendingEdits] = React.useState(null);
  const [previewMode, setPreviewMode] = React.useState(state.themes[state.activeThemeId]?.baseMode || "light");
  const prevActiveIdRef = React.useRef(null);

  // Sync preview when the global active theme changes (e.g. from header theme-selector)
  React.useEffect(() => {
    setPreviewThemeId(state.activeThemeId);
    setPendingEdits(null);
    setEditedName("");
  }, [state.activeThemeId]);

  const themes = state.themes || {};
  const activeId = draftTheme?.id || previewThemeId;
  const baseTheme = draftTheme && draftTheme.id === activeId ? draftTheme : (themes[activeId] || PRESET_THEMES.default);
  const theme = pendingEdits ? { ...baseTheme, ...pendingEdits } : baseTheme;
  const isPreset = Boolean(PRESET_THEMES[activeId]);
  const isDraft = Boolean(draftTheme && draftTheme.id === activeId);
  const canEdit = !isPreset;
  const isDirty = Boolean(pendingEdits || isDraft);

  const seedHex = theme.seed?.hex || "#808080";

  // Sorted theme list for the react-window list (draft first, then saved themes)
  const themeList = React.useMemo(() => {
    return [
      ...(draftTheme ? [draftTheme] : []),
      ...Object.values(themes).filter((th) => !draftTheme || th.id !== draftTheme.id),
    ];
  }, [themes, draftTheme]);

  // Build flattened color items list for the left panel (headers + items as separate rows)
  const colorItems = React.useMemo(() => {
    const groups = [];
    const br = resolveBrand(theme);
    // Seed
    groups.push({ category: t("ThemeCustomizer:seedColor"), items: [
      { id: "seed", label: t("ThemeCustomizer:seedColor"), value: theme.seed },
    ]});
    // Tokens
    groups.push({ category: t("ThemeCustomizer:tokens"), items: EDITABLE_TOKENS.map((token) => ({
      id: `token_${token}`, label: t(`ThemeCustomizer:${TOKEN_LABEL_KEYS[token]}`, TOKEN_FALLBACKS[token] || token), value: theme.tokenOverrides[token] || theme.seed,
    }))});
    // Brand
    groups.push({ category: t("ThemeCustomizer:brand"), items: [
      { id: "brand_primary", label: t("ThemeCustomizer:primary"), value: { hex: br.primary } },
      { id: "brand_secondary", label: t("ThemeCustomizer:secondary"), value: { hex: br.secondary } },
    ]});
    // Section accents
    const sectionItems = [];
    NAV_SECTIONS.forEach((section) => {
      const pair = resolveSectionAccent(theme, section);
      const sectionName = t(`PageHeader:navShort.${SECTION_NAV_KEYS[section]}`, SECTION_FALLBACKS[section] || section);
      sectionItems.push({ id: `section_${section}_primary`, label: `${sectionName} ${t("ThemeCustomizer:primary")}`, value: { hex: pair.primary } });
      sectionItems.push({ id: `section_${section}_secondary`, label: `${sectionName} ${t("ThemeCustomizer:secondary")}`, value: { hex: pair.secondary } });
    });
    groups.push({ category: t("ThemeCustomizer:sectionAccents"), items: sectionItems });
    // Status
    groups.push({ category: t("ThemeCustomizer:status"), items: STATUS_ROLES.map((role) => ({
      id: `status_${role}`, label: t(`ThemeCustomizer:status_${role}`), value: { hex: resolveStatus(theme, role) },
    }))});
    // Global accent
    const ga = theme.globalAccent || resolvePageAccent(theme, accentPage);
    groups.push({ category: t("ThemeCustomizer:globalAccent"), items: ["primary", "secondary", "tertiary"].map((role) => ({
      id: `global_${role}`, label: `${t("ThemeCustomizer:globalAccent")} ${t(`ThemeCustomizer:${role}`)}`, value: { hex: ga[role] },
    }))});
    // Page accents
    const pa = resolvePageAccent(theme, accentPage);
    groups.push({ category: t("ThemeCustomizer:pageAccents"), items: ["primary", "secondary", "tertiary"].map((role) => ({
      id: `page_${role}`, label: `${t("ThemeCustomizer:pageAccents")} ${t(`ThemeCustomizer:${role}`)}`, value: { hex: pa[role] },
    }))});

    // Flatten: each category gets a header row then item rows
    const flat = [];
    let itemIndex = 0;
    for (const group of groups) {
      flat.push({ type: "header", category: group.category });
      for (const item of group.items) {
        flat.push({ ...item, type: "item", category: group.category, selectedIndex: itemIndex });
        itemIndex++;
      }
    }
    return flat;
  }, [theme, accentPage, t]);

  const [selectedColor, setSelectedColor] = React.useState(0);
  // selectedColor is the logical item index; find the flat index for display
  const selectedFlatIndex = React.useMemo(() => {
    return colorItems.findIndex((ci) => ci.type === "item" && ci.selectedIndex === selectedColor);
  }, [colorItems, selectedColor]);
  const selectedItem = colorItems.find((ci) => ci.type === "item" && ci.selectedIndex === selectedColor);

  // SYS-04: warn when the edited status role sits within ~15° of the brand
  // hue (status camouflaged as decoration). Convention keeps the hue; the
  // mitigation is icon+text pairing, never colour alone.
  const statusOverlap = (() => {
    if (!selectedItem || !selectedItem.id.startsWith("status_")) return null;
    try {
      const a = hexToHsl(selectedItem.value?.hex);
      const b = hexToHsl(resolveBrand(theme).primary);
      if (!a || !b) return null;
      const d = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h));
      return d <= 15 ? Math.round(d) : null;
    } catch {
      return null;
    }
  })();

  // SYS-10: surface-character meter — seed saturation drives the surface tint
  // strength (min(24, round(s*0.35))); below ~6% the theme reads near-gray.
  const seedTint = (() => {
    if (!selectedItem || selectedItem.id !== "seed") return null;
    try {
      const hsl = hexToHsl(selectedItem.value?.hex || seedHex);
      if (!hsl) return null;
      return Math.min(24, Math.round(hsl.s * 0.35)) || 12;
    } catch {
      return null;
    }
  })();

  const handleColorChange = React.useCallback((ref) => {
    if (!canEdit || !selectedItem) return;
    const id = selectedItem.id;
    setPendingEdits((prev) => {
      const base = prev || {};
      if (id === "seed") {
        return { ...base, seed: ref };
      } else if (id.startsWith("token_")) {
        const tokenOverrides = { ...(base.tokenOverrides || theme.tokenOverrides || {}), [id.slice(6)]: ref };
        return { ...base, tokenOverrides };
      } else if (id === "brand_primary" || id === "brand_secondary") {
        const br = base.brand || resolveBrand(theme);
        const key = id === "brand_primary" ? "primary" : "secondary";
        return { ...base, brand: { ...br, [key]: ref.hex } };
      } else if (id.startsWith("section_")) {
        const parts = id.split("_");
        const section = parts[1];
        const key = parts[2];
        const sectionAccents = { ...(base.sectionAccents || theme.sectionAccents || {}) };
        const pair = sectionAccents[section] || resolveSectionAccent(theme, section);
        sectionAccents[section] = { ...pair, [key]: ref.hex };
        return { ...base, sectionAccents };
      } else if (id.startsWith("status_")) {
        const statusAccents = { ...(base.statusAccents || theme.statusAccents || {}), [id.slice(7)]: ref.hex };
        return { ...base, statusAccents };
      } else if (id.startsWith("global_")) {
        const role = id.slice(7);
        const current = base.globalAccent || theme.globalAccent || resolvePageAccent(theme, accentPage);
        return { ...base, globalAccent: { ...current, [role]: ref.hex } };
      } else if (id.startsWith("page_")) {
        const role = id.slice(5);
        const pageAccents = { ...(base.pageAccents || theme.pageAccents || {}) };
        const current = pageAccents[accentPage] || resolvePageAccent(theme, accentPage);
        pageAccents[accentPage] = { ...current, [role]: ref.hex };
        return { ...base, pageAccents };
      }
      return prev;
    });
  }, [canEdit, selectedItem, theme, accentPage]);

  // SYS-03 W2: dark-variant edits ride pendingEdits (Save/Discard + live
  // preview treat them like every other tweak; per-role fallback to light
  // values is handled by the resolvers when a key is absent).
  const handleDarkPick = React.useCallback((id, hex) => {
    if (!canEdit) return;
    setPendingEdits((prev) => {
      const base = prev || {};
      if (id.startsWith("dark_page_")) {
        const role = id.slice("dark_page_".length);
        const cur = theme.darkPageAccents || {};
        const triple = cur[accentPage] || resolvePageAccent(theme, accentPage);
        return { ...base, darkPageAccents: { ...cur, [accentPage]: { ...triple, [role]: hex } } };
      }
      const role = id.slice("dark_status_".length);
      const cur = theme.darkStatusAccents || {};
      return { ...base, darkStatusAccents: { ...cur, [role]: hex } };
    });
  }, [canEdit, theme, accentPage]);

  const handleDarkReset = React.useCallback((id) => {
    if (!canEdit) return;
    setPendingEdits((prev) => {
      const base = prev || {};
      if (id.startsWith("dark_page_")) {
        const role = id.slice("dark_page_".length);
        const cur = { ...(theme.darkPageAccents || {}) };
        const triple = { ...(cur[accentPage] || {}) };
        delete triple[role];
        if (!Object.keys(triple).length) delete cur[accentPage];
        else cur[accentPage] = triple;
        return { ...base, darkPageAccents: cur };
      }
      const role = id.slice("dark_status_".length);
      const cur = { ...(theme.darkStatusAccents || {}) };
      delete cur[role];
      return { ...base, darkStatusAccents: cur };
    });
  }, [canEdit, theme, accentPage]);

  // Sync editedName when the active theme changes (not on every store update)
  React.useEffect(() => {
    if (prevActiveIdRef.current !== activeId) {
      prevActiveIdRef.current = activeId;
      setEditedName(theme.name);
      setNameError("");
    }
  }, [activeId, theme.name]);

  const handleSaveDraft = () => {
    if (!draftTheme) return;
    const name = editedName.trim();
    if (!isValidThemeName(name)) {
      if (!name) setNameError(t("ThemeCustomizer:nameRequired") || "Name is required");
      else if (name.length > 24) setNameError(t("ThemeCustomizer:nameTooLong") || "Max 24 characters");
      else setNameError(t("ThemeCustomizer:nameInvalidChars") || "Only letters, numbers and spaces");
      return;
    }
    // Flush pending edits into the draft before saving
    if (pendingEdits) {
      const updated = { ...draftTheme, ...pendingEdits, name: editedName.trim() };
      $draftTheme.set(updated);
      setPendingEdits(null);
    }
    const result = saveDraftTheme(pendingEdits ? { ...draftTheme, ...pendingEdits } : draftTheme, editedName);
    setActiveTheme(result.id);
    prevActiveIdRef.current = result.id;
  };

  const handleSaveEdits = () => {
    if (!pendingEdits) return;
    const name = (pendingEdits.name || theme.name || "").trim();
    if (!isValidThemeName(name)) {
      if (!name) setNameError(t("ThemeCustomizer:nameRequired") || "Name is required");
      else if (name.length > 24) setNameError(t("ThemeCustomizer:nameTooLong") || "Max 24 characters");
      else setNameError(t("ThemeCustomizer:nameInvalidChars") || "Only letters, numbers and spaces");
      return;
    }
    updateTheme(activeId, { ...pendingEdits, name });
    setPendingEdits(null);
    setEditedName("");
  };

  const handleDiscardEdits = () => {
    setPendingEdits(null);
    setEditedName("");
    setNameError("");
  };

  const handleDiscardDraft = () => {
    discardDraftTheme();
    setPendingEdits(null);
    setActiveTheme("default");
    prevActiveIdRef.current = "default";
  };

  return (
    <div className="container mx-auto mt-5 mb-5 text-foreground space-y-3">
      {/* Hero: page identity + sandbox notice (edits preview below, Save applies app-wide) */}
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
        />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <Palette className="h-4.5 w-4.5" strokeWidth={2.25} />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {t("ThemeCustomizer:themes")}
              </h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {t("ThemeCustomizer:themesDesc")}
              </p>
            </div>
            <span className="ml-auto inline-flex items-center rounded-full border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-2 py-0.5 font-mono tabular-nums text-[11px] text-[hsl(var(--accent-1-fg))]">
              {themeList.length}
            </span>
            {isDirty ? (
              <span className="inline-flex items-center rounded-full border border-[hsl(var(--accent-warning)/0.3)] bg-[hsl(var(--accent-warning)/0.1)] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--accent-warning-fg))]">
                {t("ThemeCustomizer:unsavedChanges", "Unsaved changes")}
              </span>
            ) : null}
          </div>
          <p className="relative mt-3 rounded-xl border border-[hsl(var(--accent-info)/0.3)] bg-[hsl(var(--accent-info)/0.08)] px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            {t("ThemeCustomizer:sandboxNotice", "The editor is a sandbox: selecting or editing a theme only changes the previews below. Use Save to apply a theme app-wide.")}
          </p>
        </div>
      </Card>
      {/* Row 1: Themes */}
      <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
        <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))]" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--accent-1)/0.15)]">
              <Palette className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
            </span>
            {t("ThemeCustomizer:themes")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("ThemeCustomizer:themesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Theme list */}
            <div className="lg:w-1/3 shrink-0 flex flex-col">
              <div className="flex-1" style={{ maxHeight: "320px" }}>
                {themeList.length > 0 ? (
                  <List
                    rowComponent={ThemeRow}
                    rowCount={themeList.length}
                    rowHeight={44}
                    rowProps={{ themes: themeList, activeId, draftTheme, t, onSelect: (th) => {
                      if (draftTheme && th.id !== draftTheme.id) {
                        discardDraftTheme();
                      }
                      setPendingEdits(null);
                      setEditedName("");
                      setNameError("");
                      setPreviewThemeId(th.id);
                    } }} height={320} width="100%" />
                ) : (
                  <div className="p-3 text-xs text-muted-foreground">{t("ThemeCustomizer:noThemes", "No themes")}</div>
                )}
              </div>
            </div>

            {/* Buttons + preview */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const id = createDraftTheme(t("ThemeCustomizer:newTheme"));
                  prevActiveIdRef.current = id;
                }}>
                  <Plus className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:create")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const id = duplicateDraftTheme(activeId);
                  if (id) {
                    prevActiveIdRef.current = id;
                  }
                }}>
                  <Copy className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:duplicate")}
                </Button>
                <Select
                  value={previewMode}
                  onValueChange={(v) => setPreviewMode(v)}
                >
                  <SelectTrigger className="h-8" title={t("ThemeCustomizer:previewModeHelp")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("ThemeCustomizer:previewLight")}</SelectItem>
                    <SelectItem value="dark">{t("ThemeCustomizer:previewDark")}</SelectItem>
                  </SelectContent>
                </Select>
                {/* SYS-06: baseMode is a suggested default, not a lock — the live
                    app mode follows the OS/app toggle. */}
                <div className="col-span-2 text-[11px] text-muted-foreground">
                  {t("ThemeCustomizer:suggestsMode", { name: theme.name, mode: t(theme.baseMode === "dark" ? "ThemeCustomizer:modeDark" : "ThemeCustomizer:modeLight", `${theme.baseMode} mode`), defaultValue: `“${theme.name}” suggests ${theme.baseMode} mode for previews; the live app follows your system/app setting.` })}
                </div>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[hsl(var(--accent-danger-fg))]"
                      disabled={isPreset || isDraft}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:delete")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.2)]">
                          <Trash2 className="h-4 w-4 text-[hsl(var(--accent-danger-fg))]" />
                        </span>
                        {t("ThemeCustomizer:deleteDialogTitle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("ThemeCustomizer:deleteDialogDesc")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("ThemeCustomizer:deleteDialogCancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteTheme(activeId);
                          setDeleteDialogOpen(false);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("ThemeCustomizer:deleteDialogConfirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <PreviewPanel
                theme={theme}
                accent={resolvePageAccent(theme, accentPage)}
                mode={previewMode}
                t={t}
                status={{
                  success: resolveStatus(theme, "success"),
                  danger: resolveStatus(theme, "danger"),
                  warning: resolveStatus(theme, "warning"),
                  info: resolveStatus(theme, "info"),
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Row 2: Theme customizer */}
      <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
        <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))]" />
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--accent-2)/0.15)]">
              <SlidersHorizontal className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
                </span>
                {t("ThemeCustomizer:customizerTitle")}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                {t("ThemeCustomizer:customizerDesc")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isDraft ? (
                <div className="flex flex-col gap-1">
                  <Input
                    value={editedName}
                    onChange={(e) => {
                      setEditedName(e.target.value);
                      setNameError("");
                    }}
                    maxLength={24}
                    pattern="[a-zA-Z0-9 ]*"
                    className={cn("h-9 w-56 font-medium", nameError && "border-[hsl(var(--accent-danger)/0.3)]")}
                    placeholder={t("ThemeCustomizer:themeName") || "Theme name"}
                  />
                  {nameError ? (
                    <span className="text-[11px] text-[hsl(var(--accent-danger-fg))]">{nameError}</span>
                  ) : null}
                </div>
              ) : (
                <Input
                  value={isDirty ? (editedName || theme.name) : theme.name}
                  disabled={isPreset}
                  onChange={(e) => {
                    setEditedName(e.target.value);
                    setNameError("");
                    setPendingEdits((prev) => ({ ...(prev || {}), name: e.target.value }));
                  }}
                  className="h-9 w-56 font-medium"
                />
              )}
              {isDraft ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={!editedName.trim()}
                  >
                    <Save className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:save") || "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscardDraft}
                  >
                    <X className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:discard") || "Discard"}
                  </Button>
                </div>
              ) : pendingEdits ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdits}
                  >
                    <Save className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:save") || "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscardEdits}
                  >
                    <X className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:discard") || "Discard"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          {isPreset ? (
            <CardDescription className="text-[hsl(var(--accent-warning-fg))]">
              {t("ThemeCustomizer:presetReadonly")}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="flex gap-4" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
            {/* Left: color items list */}
            <div className="w-1/3 shrink-0 flex flex-col border border-border/60 rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border/60 bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground">{t("ThemeCustomizer:themeElements")}</span>
              </div>
              <div className="flex-1 overflow-auto">
                {colorItems.length > 0 ? (
                  <List
                    rowComponent={ColorItemRow}
                    rowCount={colorItems.length}
                    rowHeight={36}
                    rowProps={{ colorItems, selectedColor, onSelect: (flatIdx) => {
                      const item = colorItems[flatIdx];
                      if (item?.type === "item") setSelectedColor(item.selectedIndex);
                    } }} height={400} width="100%" />
                ) : (
                  <div className="p-3 text-xs text-muted-foreground">{t("ThemeCustomizer:noColorItems", "No color items")}</div>
                )}
              </div>
            </div>

            {/* Right: single color picker */}
            <div className="flex-1 flex flex-col">
              {selectedItem ? (
                <>
                  <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center gap-2 rounded-t-lg">
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: selectedItem.value?.hex || "#808080" }} />
                    <span className="text-sm font-medium">{selectedItem.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{selectedItem.category}</span>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <ColorField
                      label={selectedItem.label}
                      value={selectedItem.value}
                      onChange={handleColorChange}
                      disabled={!canEdit}
                    />
                    {selectedItem.id === "seed" && (
                      <div className="flex flex-col gap-2 text-sm mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{t("ThemeCustomizer:contrast")}:</span>
                          <ContrastBadge bgHex={seedHex} fgHex={readableForeground(seedHex)} t={t} />
                        </div>
                        {seedTint !== null && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{t("ThemeCustomizer:surfaceCharacter", "Surface character:")}</span>
                            <span className="font-mono text-xs">{seedTint}%</span>
                            {seedTint < 6 && (
                              <span className="text-[11px] text-[hsl(var(--accent-warning-fg))]">
                                {t("ThemeCustomizer:surfaceWeak", "Weak — surfaces will read near-gray in both modes.")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {statusOverlap !== null && (
                      <div className="flex items-center gap-2 text-sm mt-3 rounded-md border border-[hsl(var(--accent-warning)/0.3)] bg-[hsl(var(--accent-warning)/0.08)] px-2.5 py-1.5">
                        <span className="text-[11px] text-[hsl(var(--accent-warning-fg))]">
                          {t("ThemeCustomizer:statusOverlap", { degrees: statusOverlap, defaultValue: `Overlaps the brand hue (Δ${statusOverlap}°) — pair with icon + text, never colour alone.` })}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  {t("ThemeCustomizer:selectColor", "Select a color to edit")}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <MatrixPanel theme={theme} accentPage={accentPage} t={t} />

      <DarkVariantsPanel
        theme={theme}
        accentPage={accentPage}
        canEdit={canEdit}
        onPickDark={handleDarkPick}
        onResetDark={handleDarkReset}
        t={t}
      />

      <AuditPanel theme={theme} accentPage={accentPage} t={t} />

    </div>
  );
}
