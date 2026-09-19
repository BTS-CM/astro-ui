import React from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import {
  $customTheme,
  setPageTheme,
  PRESET_THEMES,
  PAGE_SECTIONS,
  resolveSectionAccent,
  getThemeForPage,
} from "@/stores/customTheme.ts";
import { THEMABLE_PAGES } from "@/lib/pages.js";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { $userStorage } from "@/stores/users.ts";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

// Mirrors ThemeCustomizer section labels so section names reuse translated nav labels.
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
const SECTION_ORDER = [
  "exchanging",
  "liquidityPools",
  "transfer",
  "debt",
  "assetCreation",
  "account",
  "blockchain",
  "community",
  "governance",
  "invoicing",
  "settings",
];

export default function PageThemes() {
  const { t } = useTranslation();
  // Rehydrate the header user on cold load, using the last used chain
  useInitCache($userStorage.get().lastAccount?.[0]?.chain ?? "bitshares", []);
  const state = useStore($customTheme);
  const themes = state.themes || {};
  const activeTheme = getThemeForPage("page_themes");

  const groups = SECTION_ORDER.map((section) => ({
    section,
    pages: THEMABLE_PAGES.filter((p) => (PAGE_SECTIONS[p.slug] || "settings") === section),
  })).filter((g) => g.pages.length > 0);
  const ungrouped = THEMABLE_PAGES.filter(
    (p) => !PAGE_SECTIONS[p.slug] || !SECTION_ORDER.includes(PAGE_SECTIONS[p.slug])
  );

  const renderRow = (p, section) => {
    const assigned = state.pageThemeMap[p.slug] || "";
    const overridden = Boolean(assigned && themes[assigned]);
    const sectionPair = section ? resolveSectionAccent(activeTheme, section) : null;
    const dotHex = overridden
      ? themes[assigned].seed?.hex || "#808080"
      : sectionPair
      ? sectionPair.primary
      : "#808080";
    return (
      <div
        key={p.slug}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-all",
          overridden
            ? "border-ring bg-accent/40"
            : "border-border/60 hover:bg-[hsl(var(--accent-1)/0.05)]"
        )}
        style={
          !overridden && sectionPair
            ? { borderColor: undefined }
            : undefined
        }
        onMouseEnter={(e) => {
          if (!overridden && sectionPair) {
            e.currentTarget.style.borderColor = `${sectionPair.primary}55`;
          }
        }}
        onMouseLeave={(e) => {
          if (!overridden) e.currentTarget.style.borderColor = "";
        }}
      >
        <span className="text-xs flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              overridden
                ? "shadow-[0_0_8px_-1px_hsl(var(--accent-1)/0.6)]"
                : "opacity-70"
            )}
            style={{ backgroundColor: dotHex }}
            title={
              overridden
                ? t("PageThemes:overrideActive")
                : t("PageThemes:useActive")
            }
          />
          <span className="truncate">{p.label}</span>
        </span>
        <Select
          value={assigned || "__default__"}
          onValueChange={(v) =>
            setPageTheme(p.slug, v === "__default__" ? null : v)
          }
        >
          <SelectTrigger
            className={cn(
              "h-8 w-40 shrink-0",
              overridden && "border-[hsl(var(--accent-1)/0.4)]"
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">
              {t("PageThemes:useActive")}
            </SelectItem>
            {Object.values(themes).map((th) => (
              <SelectItem key={th.id} value={th.id}>
                {th.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderGroupHeader = (section) => {
    const pair = resolveSectionAccent(activeTheme, section);
    const label = t(
      `PageHeader:navShort.${SECTION_NAV_KEYS[section]}`,
      SECTION_FALLBACKS[section] || section
    );
    return (
      <div key={`hdr-${section}`} className="flex items-center gap-2 pt-2 first:pt-0">
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-md border shrink-0"
          style={{
            background: `linear-gradient(135deg, ${pair.primary}33, ${pair.secondary}33)`,
            borderColor: `${pair.primary}55`,
            color: pair.primary,
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: pair.primary }} />
        </span>
        <span className="text-xs font-semibold tracking-wide text-foreground/80">
          {label}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.25)] to-transparent" />
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5 text-foreground">
      <div className="grid grid-cols-1 gap-3">
      <Card className="overflow-hidden bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm gap-0">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <Layers className="h-4.5 w-4.5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {t("PageThemes:title")}
              </h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {t("PageThemes:description")}
              </p>
            </div>
            <span className="ml-auto inline-flex shrink-0 items-center rounded-full border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-2 py-0.5 font-mono tabular-nums text-[11px] text-[hsl(var(--accent-1-fg))]">
              {Object.keys(state.pageThemeMap || {}).length}
            </span>
          </div>
        </div>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            {groups.flatMap((g) => [
              renderGroupHeader(g.section),
              ...g.pages.map((p) => renderRow(p, g.section)),
            ])}
            {ungrouped.length ? (
              <div key="hdr-other" className="flex items-center gap-2 pt-2 md:col-span-2">
                <span className="text-xs font-semibold tracking-wide text-foreground/80">
                  {t("PageThemes:otherPages", "Other pages")}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.25)] to-transparent" />
              </div>
            ) : null}
            {ungrouped.map((p) => renderRow(p, null))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
