import { persistentMap } from "@nanostores/persistent";
import { atom } from "nanostores";
import { buildThemeCss } from "@/lib/tailwindPalette.js";

// localStorage key holding the compiled CSS of the active theme. Read by the
// blocking inline <head> script so themes apply before first paint (no FOUC),
// exactly like the light/dark class toggle. NOTE: this must NOT start with the
// persistentMap prefix ("customTheme:"), otherwise the map would ingest it as a
// phantom store key.
export const ACTIVE_CSS_KEY = "btsThemeActiveCss";

// The authoritative current page slug, published by PageHeader (not guessed
// from the URL). Used to resolve per-page theme overrides.
export const $currentPage = atom<string>("index");
export function setCurrentPage(slug: string) {
  if (slug) $currentPage.set(slug);
}

// Canonical nav section ids (shared by PageHeader & AppSidebar). AppSidebar
// maps its local keys onto these.
export const NAV_SECTIONS = [
  "exchanging",
  "transfer",
  "debt",
  "assetCreation",
  "account",
  "blockchain",
  "governance",
  "invoicing",
  "settings",
] as const;

export type NavSection = (typeof NAV_SECTIONS)[number];

export type PaletteRef = { hex: string };

// A two-color accent used by gradients (bars, hero, section backgrounds).
// Values are hex color strings (e.g. "#06b6d4").
export type AccentPair = { primary: string; secondary: string };

// A three-color accent used by page components (primary/secondary/tertiary).
export type AccentTriple = { primary: string; secondary: string; tertiary: string };

// Status roles used by data components (buy/sell, success/danger, etc.).
export const STATUS_ROLES = ["success", "danger", "warning", "info"] as const;
export type StatusRole = (typeof STATUS_ROLES)[number];

export const THEME_NAME_MAX_LENGTH = 24;
const THEME_NAME_RE = /^[a-zA-Z0-9 ]*$/;

export function isValidThemeName(name: string): boolean {
  return name.trim().length > 0 && name.length <= THEME_NAME_MAX_LENGTH && THEME_NAME_RE.test(name);
}

export type CustomTheme = {
  id: string;
  name: string;
  baseMode: "light" | "dark";
  seed: PaletteRef;
  tokenOverrides: Record<string, PaletteRef>;
  // Brand pair drives the hero panel + page-header backdrop.
  brand?: AccentPair;
  // Sparse per-section overrides; when unset a section (and its item cards) use
  // their built-in defaults, so an untouched theme looks identical to before.
  sectionAccents?: Partial<Record<NavSection, AccentPair>>;
  // Status role -> palette color name.
  statusAccents?: Partial<Record<StatusRole, string>>;
  // Per-page accent-role overrides (page components: primary/secondary/tertiary).
  pageAccents?: Record<string, AccentTriple>;
  // Optional single accent applied to all pages that lack a per-page override.
  globalAccent?: AccentTriple;
  // True while the theme is a draft — not yet persisted to storage.
  draft?: boolean;
};

// Brand pair (hero + header backdrop) — matches the original indigo→fuchsia.
export const DEFAULT_BRAND: AccentPair = { primary: "#6366f1", secondary: "#d946ef" };

// Analogous colour neighbours (hex values) used to derive a pleasant
// secondary/tertiary from a single seed colour.
const SECONDARY_HEX: Record<string, string> = {
  "#64748b": "#6b7280", "#6b7280": "#71717a", "#71717a": "#64748b",
  "#ef4444": "#f97316", "#f97316": "#f59e0b", "#f59e0b": "#f97316",
  "#eab308": "#f59e0b", "#84cc16": "#22c55e", "#22c55e": "#10b981",
  "#10b981": "#14b8a6", "#14b8a6": "#06b6d4", "#06b6d4": "#0ea5e9",
  "#0ea5e9": "#3b82f6", "#3b82f6": "#6366f1", "#6366f1": "#8b5cf6",
  "#8b5cf6": "#d946ef", "#a855f7": "#8b5cf6", "#d946ef": "#ec4899",
  "#ec4899": "#f43f5e", "#f43f5e": "#ef4444",
};
const TERTIARY_HEX: Record<string, string> = {
  "#64748b": "#71717a", "#6b7280": "#64748b", "#71717a": "#6b7280",
  "#ef4444": "#f59e0b", "#f97316": "#eab308", "#f59e0b": "#eab308",
  "#eab308": "#84cc16", "#84cc16": "#10b981", "#22c55e": "#14b8a6",
  "#10b981": "#06b6d4", "#14b8a6": "#0ea5e9", "#06b6d4": "#3b82f6",
  "#0ea5e9": "#6366f1", "#3b82f6": "#8b5cf6", "#6366f1": "#d946ef",
  "#8b5cf6": "#a855f7", "#a855f7": "#d946ef", "#d946ef": "#f43f5e",
  "#ec4899": "#ef4444", "#f43f5e": "#f97316",
};

// Per-section accent pairs mirror the original Home SECTION_STYLES gradients.
export const DEFAULT_SECTION_ACCENTS: Record<NavSection, AccentPair> = {
  exchanging: { primary: "#06b6d4", secondary: "#3b82f6" },
  transfer: { primary: "#0ea5e9", secondary: "#3b82f6" },
  debt: { primary: "#10b981", secondary: "#14b8a6" },
  assetCreation: { primary: "#8b5cf6", secondary: "#d946ef" },
  account: { primary: "#10b981", secondary: "#0ea5e9" },
  blockchain: { primary: "#64748b", secondary: "#6b7280" },
  governance: { primary: "#6366f1", secondary: "#8b5cf6" },
  invoicing: { primary: "#f59e0b", secondary: "#f97316" },
  settings: { primary: "#8b5cf6", secondary: "#f43f5e" },
};

// Status defaults (conventional colors).
export const DEFAULT_STATUS: Record<StatusRole, string> = {
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#0ea5e9",
};

// Per-page default accent triples (primary/secondary/tertiary), captured from
// each page's original hardcoded palette so the default look is preserved once
// a page is migrated to the accent-var system. Entries are added as each page
// is migrated; unlisted pages fall back to the brand pair.
export const PAGE_ACCENTS: Record<string, AccentTriple> = {
  instant_trade: { primary: "#f59e0b", secondary: "#3b82f6", tertiary: "#f97316" },
  pool: { primary: "#06b6d4", secondary: "#3b82f6", tertiary: "#6366f1" },
  stake: { primary: "#a855f7", secondary: "#8b5cf6", tertiary: "#6366f1" },
  invoice_inventory: { primary: "#10b981", secondary: "#f43f5e", tertiary: "#14b8a6" },
  tfund_user: { primary: "#8b5cf6", secondary: "#3b82f6", tertiary: "#f59e0b" },
  offereditor: { primary: "#8b5cf6", secondary: "#6366f1", tertiary: "#14b8a6" },
  stored_invoices: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#3b82f6" },
  smartcoins: { primary: "#6366f1", secondary: "#06b6d4", tertiary: "#8b5cf6" },
  create_invoice: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  tfunds: { primary: "#f43f5e", secondary: "#14b8a6", tertiary: "#3b82f6" },
  proposals: { primary: "#6366f1", secondary: "#06b6d4", tertiary: "#f59e0b" },
  pay_invoice: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  create_vesting: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  borrow: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  htlc: { primary: "#f43f5e", secondary: "#10b981", tertiary: "#14b8a6" },
  create_pool: { primary: "#06b6d4", secondary: "#0ea5e9", tertiary: "#6366f1" },
  withdraw_permissions: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#14b8a6" },
  vote: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#a855f7" },
  witnesses: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#a855f7" },
  committee: { primary: "#8b5cf6", secondary: "#6366f1", tertiary: "#a855f7" },
  governance: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#a855f7" },
  create_ticket: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#a855f7" },
  deals: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#a855f7" },
  offers: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#a855f7" },
  smartcoin: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#a855f7" },
  dex: { primary: "#06b6d4", secondary: "#0ea5e9", tertiary: "#6366f1" },
  order: { primary: "#f59e0b", secondary: "#0ea5e9", tertiary: "#6366f1" },
  offer: { primary: "#06b6d4", secondary: "#0ea5e9", tertiary: "#6366f1" },
  settlement: { primary: "#f59e0b", secondary: "#0ea5e9", tertiary: "#6366f1" },
  "portfolio-open-orders": { primary: "#06b6d4", secondary: "#0ea5e9", tertiary: "#6366f1" },
  "portfolio-recent-activity": { primary: "#3b82f6", secondary: "#06b6d4", tertiary: "#6366f1" },
  "portfolio-balances": { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  featured: { primary: "#06b6d4", secondary: "#0ea5e9", tertiary: "#6366f1" },
  barter: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  vesting: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  AccountLists: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  ltm: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  create_worker: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  uia: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  create_account: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#0ea5e9" },
  issuedAssets: { primary: "#f43f5e", secondary: "#0ea5e9", tertiary: "#f59e0b" },
  "blocked-users": { primary: "#f43f5e", secondary: "#0ea5e9", tertiary: "#f59e0b" },
  favourites: { primary: "#f59e0b", secondary: "#0ea5e9", tertiary: "#6366f1" },
  ticket_leaderboard: { primary: "#f59e0b", secondary: "#0ea5e9", tertiary: "#6366f1" },
  transfer: { primary: "#8b5cf6", secondary: "#6366f1", tertiary: "#d946ef" },
  timed_transfer: { primary: "#06b6d4", secondary: "#0ea5e9", tertiary: "#6366f1" },
  create_smartcoin: { primary: "#8b5cf6", secondary: "#6366f1", tertiary: "#d946ef" },
  custom_pool_tracker: { primary: "#a855f7", secondary: "#6366f1", tertiary: "#d946ef" },
  custom_pool_overview: { primary: "#a855f7", secondary: "#6366f1", tertiary: "#d946ef" },
  blocks: { primary: "#a855f7", secondary: "#6366f1", tertiary: "#d946ef" },
  pools: { primary: "#a855f7", secondary: "#6366f1", tertiary: "#d946ef" },
  configure_visuals: { primary: "#8b5cf6", secondary: "#6366f1", tertiary: "#d946ef" },
  airdrop_calculate: { primary: "#8b5cf6", secondary: "#d946ef", tertiary: "#6366f1" },
  "top-operations": { primary: "#10b981", secondary: "#0ea5e9", tertiary: "#8b5cf6" },
};

// Fallback triple derived from the brand pair for pages not yet catalogued.
function brandTriple(theme: CustomTheme): AccentTriple {
  if (theme?.brand) {
    return {
      primary: theme.brand.primary,
      secondary: theme.brand.secondary,
      tertiary: TERTIARY_HEX[theme.brand.primary] || theme.brand.secondary,
    };
  }
  const seedHex = theme?.seed?.hex || DEFAULT_BRAND.primary;
  return {
    primary: seedHex,
    secondary: SECONDARY_HEX[seedHex] || seedHex,
    tertiary: TERTIARY_HEX[seedHex] || SECONDARY_HEX[seedHex] || seedHex,
  };
}

// Per-item accent pairs, migrated verbatim from the original Home ITEM_ACCENTS,
// so each card keeps its exact default color unless its section is customized.
export const DEFAULT_ITEM_ACCENTS: Record<string, AccentPair> = {
  dex: { primary: "#6366f1", secondary: "#06b6d4" },
  instant_trade: { primary: "#f59e0b", secondary: "#f97316" },
  swap: { primary: "#3b82f6", secondary: "#6366f1" },
  stake: { primary: "#06b6d4", secondary: "#0ea5e9" },
  barter: { primary: "#0ea5e9", secondary: "#3b82f6" },
  tfund_user: { primary: "#10b981", secondary: "#14b8a6" },
  transfer: { primary: "#0ea5e9", secondary: "#3b82f6" },
  timed_transfer: { primary: "#06b6d4", secondary: "#0ea5e9" },
  withdraw_permissions: { primary: "#3b82f6", secondary: "#6366f1" },
  htlc: { primary: "#8b5cf6", secondary: "#a855f7" },
  create_vesting: { primary: "#d946ef", secondary: "#ec4899" },
  borrow: { primary: "#10b981", secondary: "#14b8a6" },
  lend: { primary: "#f59e0b", secondary: "#f97316" },
  smartcoins: { primary: "#6366f1", secondary: "#06b6d4" },
  tfunds: { primary: "#f43f5e", secondary: "#ef4444" },
  portfolio_balances: { primary: "#10b981", secondary: "#14b8a6" },
  portfolio_open_orders: { primary: "#06b6d4", secondary: "#0ea5e9" },
  favourites: { primary: "#f59e0b", secondary: "#eab308" },
  issued_assets: { primary: "#8b5cf6", secondary: "#a855f7" },
  offers: { primary: "#0ea5e9", secondary: "#3b82f6" },
  deals: { primary: "#3b82f6", secondary: "#6366f1" },
  vesting: { primary: "#d946ef", secondary: "#ec4899" },
  proposals: { primary: "#f43f5e", secondary: "#ef4444" },
  blocks: { primary: "#64748b", secondary: "#6b7280" },
  custom_pool_tracker: { primary: "#14b8a6", secondary: "#06b6d4" },
  pools: { primary: "#06b6d4", secondary: "#0ea5e9" },
  vote: { primary: "#6366f1", secondary: "#8b5cf6" },
  witnesses: { primary: "#f59e0b", secondary: "#f97316" },
  committee: { primary: "#10b981", secondary: "#14b8a6" },
  committee_parameters: { primary: "#8b5cf6", secondary: "#a855f7" },
  governance: { primary: "#8b5cf6", secondary: "#a855f7" },
  create_worker: { primary: "#0ea5e9", secondary: "#3b82f6" },
  create_ticket: { primary: "#d946ef", secondary: "#ec4899" },
  ticket_leaderboard: { primary: "#f43f5e", secondary: "#ef4444" },
  invoice_inventory: { primary: "#f59e0b", secondary: "#f97316" },
  create_invoice: { primary: "#06b6d4", secondary: "#0ea5e9" },
  pay_invoice: { primary: "#10b981", secondary: "#14b8a6" },
  stored_invoices: { primary: "#0ea5e9", secondary: "#3b82f6" },
  accountLists: { primary: "#64748b", secondary: "#6b7280" },
  ltm: { primary: "#f59e0b", secondary: "#eab308" },
  nodes: { primary: "#14b8a6", secondary: "#06b6d4" },
  create_account: { primary: "#10b981", secondary: "#22c55e" },
  blocked_users: { primary: "#f43f5e", secondary: "#ef4444" },
  configure_visuals: { primary: "#8b5cf6", secondary: "#d946ef" },
  theme_customizer: { primary: "#8b5cf6", secondary: "#d946ef" },
  about: { primary: "#3b82f6", secondary: "#6366f1" },
  create_uia: { primary: "#8b5cf6", secondary: "#d946ef" },
  create_smartcoin: { primary: "#8b5cf6", secondary: "#a855f7" },
  create_liquidity_pool: { primary: "#d946ef", secondary: "#ec4899" },
};

type MakeThemeOpts = {
  brand?: AccentPair;
  sectionAccents?: Partial<Record<NavSection, AccentPair>>;
  statusAccents?: Partial<Record<StatusRole, string>>;
  tokenOverrides?: Record<string, PaletteRef>;
  pageAccents?: Record<string, AccentTriple>;
  globalAccent?: AccentTriple;
};

function makeTheme(
  id: string,
  name: string,
  baseMode: "light" | "dark",
  seed: PaletteRef,
  opts: MakeThemeOpts = {}
): CustomTheme {
  return {
    id,
    name,
    baseMode,
    seed,
    tokenOverrides: opts.tokenOverrides || {},
    brand: opts.brand,
    sectionAccents: opts.sectionAccents || {},
    statusAccents: opts.statusAccents || {},
    pageAccents: opts.pageAccents,
    globalAccent: opts.globalAccent,
  };
}

// Built-in presets users can start from. Each theme fully defines token
// overrides, section accents, status colors, per-page accents and a global
// accent triple so every part of the UI is themed.
export const PRESET_THEMES: Record<string, CustomTheme> = {
  // ── Default ──────────────────────────────────────────────────────────
  // Minimal: the pristine default applies no overrides so the app looks
  // exactly like the shipped globals.css.
  default: makeTheme("default", "Default", "light", { hex: "#334155" }),

  // ── Ocean ────────────────────────────────────────────────────────────
  ocean: makeTheme("ocean", "Ocean", "dark", { hex: "#0891b2" }, {
    brand: { primary: "#06b6d4", secondary: "#3b82f6" },
    tokenOverrides: {
      primary: { hex: "#06b6d4" },
      secondary: { hex: "#2563eb" },
      accent: { hex: "#38bdf8" },
      ring: { hex: "#22d3ee" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#155e75" },
    },
    sectionAccents: {
      exchanging: { primary: "#06b6d4", secondary: "#0ea5e9" },
      transfer: { primary: "#0ea5e9", secondary: "#3b82f6" },
      debt: { primary: "#3b82f6", secondary: "#6366f1" },
      assetCreation: { primary: "#6366f1", secondary: "#8b5cf6" },
      account: { primary: "#06b6d4", secondary: "#14b8a6" },
      blockchain: { primary: "#3b82f6", secondary: "#6366f1" },
      governance: { primary: "#6366f1", secondary: "#8b5cf6" },
      invoicing: { primary: "#0ea5e9", secondary: "#06b6d4" },
      settings: { primary: "#14b8a6", secondary: "#3b82f6" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#06b6d4" },
    globalAccent: { primary: "#06b6d4", secondary: "#3b82f6", tertiary: "#6366f1" },
    pageAccents: {
      instant_trade: { primary: "#06b6d4", secondary: "#0ea5e9", tertiary: "#3b82f6" },
      pool: { primary: "#3b82f6", secondary: "#06b6d4", tertiary: "#0ea5e9" },
      stake: { primary: "#6366f1", secondary: "#3b82f6", tertiary: "#8b5cf6" },
      transfer: { primary: "#0ea5e9", secondary: "#3b82f6", tertiary: "#06b6d4" },
      dex: { primary: "#06b6d4", secondary: "#6366f1", tertiary: "#3b82f6" },
      proposals: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#3b82f6" },
      vote: { primary: "#3b82f6", secondary: "#6366f1", tertiary: "#06b6d4" },
      account: { primary: "#06b6d4", secondary: "#14b8a6", tertiary: "#0ea5e9" },
      settings: { primary: "#64748b", secondary: "#3b82f6", tertiary: "#06b6d4" },
      featured: { primary: "#06b6d4", secondary: "#0ea5e9", tertiary: "#6366f1" },
    },
  }),

  // ── Sunset ───────────────────────────────────────────────────────────
  sunset: makeTheme("sunset", "Sunset", "light", { hex: "#ea580c" }, {
    brand: { primary: "#f97316", secondary: "#f43f5e" },
    tokenOverrides: {
      primary: { hex: "#f97316" },
      secondary: { hex: "#fb7185" },
      accent: { hex: "#fbbf24" },
      ring: { hex: "#fb923c" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#ea580c" },
    },
    sectionAccents: {
      exchanging: { primary: "#f59e0b", secondary: "#f97316" },
      transfer: { primary: "#f97316", secondary: "#f43f5e" },
      debt: { primary: "#f43f5e", secondary: "#ef4444" },
      assetCreation: { primary: "#ec4899", secondary: "#f43f5e" },
      account: { primary: "#f97316", secondary: "#f59e0b" },
      blockchain: { primary: "#fb923c", secondary: "#f97316" },
      governance: { primary: "#f43f5e", secondary: "#ef4444" },
      invoicing: { primary: "#f97316", secondary: "#f59e0b" },
      settings: { primary: "#f59e0b", secondary: "#fbbf24" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#0ea5e9" },
    globalAccent: { primary: "#f97316", secondary: "#f43f5e", tertiary: "#f59e0b" },
    pageAccents: {
      instant_trade: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#f43f5e" },
      pool: { primary: "#f97316", secondary: "#f43f5e", tertiary: "#f59e0b" },
      stake: { primary: "#f43f5e", secondary: "#ec4899", tertiary: "#f97316" },
      transfer: { primary: "#f97316", secondary: "#f59e0b", tertiary: "#f43f5e" },
      dex: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#eab308" },
      proposals: { primary: "#f43f5e", secondary: "#ef4444", tertiary: "#f97316" },
      vote: { primary: "#f97316", secondary: "#f43f5e", tertiary: "#8b5cf6" },
      account: { primary: "#f97316", secondary: "#f59e0b", tertiary: "#10b981" },
      settings: { primary: "#64748b", secondary: "#f97316", tertiary: "#f43f5e" },
      featured: { primary: "#f97316", secondary: "#f59e0b", tertiary: "#f43f5e" },
    },
  }),

  // ── Emerald ──────────────────────────────────────────────────────────
  emerald: makeTheme("emerald", "Emerald", "light", { hex: "#059669" }, {
    brand: { primary: "#10b981", secondary: "#14b8a6" },
    tokenOverrides: {
      primary: { hex: "#059669" },
      secondary: { hex: "#14b8a6" },
      accent: { hex: "#2dd4bf" },
      ring: { hex: "#34d399" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#047857" },
    },
    sectionAccents: {
      exchanging: { primary: "#10b981", secondary: "#14b8a6" },
      transfer: { primary: "#14b8a6", secondary: "#06b6d4" },
      debt: { primary: "#10b981", secondary: "#22c55e" },
      assetCreation: { primary: "#14b8a6", secondary: "#06b6d4" },
      account: { primary: "#14b8a6", secondary: "#06b6d4" },
      blockchain: { primary: "#059669", secondary: "#10b981" },
      governance: { primary: "#10b981", secondary: "#14b8a6" },
      invoicing: { primary: "#34d399", secondary: "#10b981" },
      settings: { primary: "#22c55e", secondary: "#34d399" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#14b8a6" },
    globalAccent: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#06b6d4" },
    pageAccents: {
      instant_trade: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#f59e0b" },
      pool: { primary: "#14b8a6", secondary: "#06b6d4", tertiary: "#10b981" },
      stake: { primary: "#10b981", secondary: "#22c55e", tertiary: "#14b8a6" },
      transfer: { primary: "#14b8a6", secondary: "#10b981", tertiary: "#06b6d4" },
      dex: { primary: "#06b6d4", secondary: "#14b8a6", tertiary: "#3b82f6" },
      proposals: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#64748b" },
      vote: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#8b5cf6" },
      account: { primary: "#14b8a6", secondary: "#06b6d4", tertiary: "#10b981" },
      settings: { primary: "#64748b", secondary: "#10b981", tertiary: "#14b8a6" },
      featured: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#06b6d4" },
    },
  }),

  // ── High Contrast ────────────────────────────────────────────────────
  contrast: makeTheme("contrast", "High Contrast", "dark", { hex: "#eab308" }, {
    brand: { primary: "#eab308", secondary: "#f59e0b" },
    tokenOverrides: {
      primary: { hex: "#facc15" },
      secondary: { hex: "#f59e0b" },
      accent: { hex: "#fde047" },
      ring: { hex: "#facc15" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#854d0e" },
    },
    sectionAccents: {
      exchanging: { primary: "#eab308", secondary: "#f59e0b" },
      transfer: { primary: "#eab308", secondary: "#f59e0b" },
      debt: { primary: "#f59e0b", secondary: "#f97316" },
      assetCreation: { primary: "#eab308", secondary: "#84cc16" },
      account: { primary: "#f59e0b", secondary: "#eab308" },
      blockchain: { primary: "#84cc16", secondary: "#22c55e" },
      governance: { primary: "#eab308", secondary: "#f59e0b" },
      invoicing: { primary: "#f59e0b", secondary: "#f97316" },
      settings: { primary: "#eab308", secondary: "#f59e0b" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#06b6d4" },
    globalAccent: { primary: "#eab308", secondary: "#f59e0b", tertiary: "#f97316" },
    pageAccents: {
      instant_trade: { primary: "#eab308", secondary: "#f59e0b", tertiary: "#f97316" },
      pool: { primary: "#f59e0b", secondary: "#eab308", tertiary: "#84cc16" },
      stake: { primary: "#eab308", secondary: "#f59e0b", tertiary: "#22c55e" },
      transfer: { primary: "#f59e0b", secondary: "#eab308", tertiary: "#f97316" },
      dex: { primary: "#eab308", secondary: "#84cc16", tertiary: "#f59e0b" },
      proposals: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#eab308" },
      vote: { primary: "#eab308", secondary: "#f59e0b", tertiary: "#8b5cf6" },
      account: { primary: "#f59e0b", secondary: "#eab308", tertiary: "#10b981" },
      settings: { primary: "#eab308", secondary: "#f59e0b", tertiary: "#64748b" },
      featured: { primary: "#eab308", secondary: "#f59e0b", tertiary: "#f97316" },
    },
  }),

  // ── Terracotta & Teal ────────────────────────────────────────────────
  // Palette: ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"]
  terracottaTeal: makeTheme("terracottaTeal", "Terracotta & Teal", "dark", { hex: "#0d9488" }, {
    brand: { primary: "#14b8a6", secondary: "#f97316" },
    tokenOverrides: {
      primary: { hex: "#14b8a6" },
      secondary: { hex: "#fb923c" },
      accent: { hex: "#fbbf24" },
      ring: { hex: "#2dd4bf" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#115e59" },
    },
    sectionAccents: {
      exchanging: { primary: "#14b8a6", secondary: "#06b6d4" },
      transfer: { primary: "#14b8a6", secondary: "#0ea5e9" },
      debt: { primary: "#10b981", secondary: "#14b8a6" },
      assetCreation: { primary: "#f97316", secondary: "#f59e0b" },
      account: { primary: "#14b8a6", secondary: "#06b6d4" },
      blockchain: { primary: "#06b6d4", secondary: "#0ea5e9" },
      governance: { primary: "#f97316", secondary: "#f59e0b" },
      invoicing: { primary: "#f59e0b", secondary: "#f97316" },
      settings: { primary: "#f97316", secondary: "#fb923c" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#06b6d4" },
    globalAccent: { primary: "#14b8a6", secondary: "#f97316", tertiary: "#f59e0b" },
    pageAccents: {
      instant_trade: { primary: "#14b8a6", secondary: "#f59e0b", tertiary: "#f97316" },
      pool: { primary: "#06b6d4", secondary: "#14b8a6", tertiary: "#3b82f6" },
      stake: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#06b6d4" },
      transfer: { primary: "#14b8a6", secondary: "#f97316", tertiary: "#f59e0b" },
      dex: { primary: "#14b8a6", secondary: "#3b82f6", tertiary: "#06b6d4" },
      proposals: { primary: "#f97316", secondary: "#f59e0b", tertiary: "#14b8a6" },
      vote: { primary: "#14b8a6", secondary: "#f97316", tertiary: "#8b5cf6" },
      account: { primary: "#14b8a6", secondary: "#06b6d4", tertiary: "#10b981" },
      settings: { primary: "#64748b", secondary: "#14b8a6", tertiary: "#f97316" },
      featured: { primary: "#14b8a6", secondary: "#f97316", tertiary: "#f59e0b" },
    },
  }),

  // ── Warm Earthy ──────────────────────────────────────────────────────
  // Palette: ["#F4F1DE", "#E07A5F", "#3D405B", "#F2CC8F", "#81B29A"]
  warmEarthy: makeTheme("warmEarthy", "Warm Earthy", "light", { hex: "#f97316" }, {
    brand: { primary: "#f97316", secondary: "#10b981" },
    tokenOverrides: {
      primary: { hex: "#f97316" },
      secondary: { hex: "#34d399" },
      accent: { hex: "#fcd34d" },
      ring: { hex: "#fb923c" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#ea580c" },
    },
    sectionAccents: {
      exchanging: { primary: "#f97316", secondary: "#f59e0b" },
      transfer: { primary: "#f97316", secondary: "#f43f5e" },
      debt: { primary: "#10b981", secondary: "#14b8a6" },
      assetCreation: { primary: "#f59e0b", secondary: "#f97316" },
      account: { primary: "#10b981", secondary: "#14b8a6" },
      blockchain: { primary: "#fb923c", secondary: "#f97316" },
      governance: { primary: "#f97316", secondary: "#ef4444" },
      invoicing: { primary: "#f59e0b", secondary: "#f97316" },
      settings: { primary: "#10b981", secondary: "#34d399" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#14b8a6" },
    globalAccent: { primary: "#f97316", secondary: "#10b981", tertiary: "#f59e0b" },
    pageAccents: {
      instant_trade: { primary: "#f97316", secondary: "#f59e0b", tertiary: "#10b981" },
      pool: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#06b6d4" },
      stake: { primary: "#10b981", secondary: "#22c55e", tertiary: "#14b8a6" },
      transfer: { primary: "#f97316", secondary: "#f59e0b", tertiary: "#f43f5e" },
      dex: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#eab308" },
      proposals: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#f97316" },
      vote: { primary: "#f97316", secondary: "#10b981", tertiary: "#8b5cf6" },
      account: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#06b6d4" },
      settings: { primary: "#78716c", secondary: "#f97316", tertiary: "#10b981" },
      featured: { primary: "#f97316", secondary: "#f59e0b", tertiary: "#10b981" },
    },
  }),

  // ── Vintage Americana ────────────────────────────────────────────────
  // Palette: ["#E63946", "#F1FAEE", "#A8DADC", "#457B9D", "#1D3557"]
  vintageAmericana: makeTheme("vintageAmericana", "Vintage Americana", "dark", { hex: "#1e40af" }, {
    brand: { primary: "#ef4444", secondary: "#3b82f6" },
    tokenOverrides: {
      primary: { hex: "#ef4444" },
      secondary: { hex: "#2563eb" },
      accent: { hex: "#67e8f9" },
      ring: { hex: "#f87171" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#1d4ed8" },
    },
    sectionAccents: {
      exchanging: { primary: "#ef4444", secondary: "#f97316" },
      transfer: { primary: "#3b82f6", secondary: "#6366f1" },
      debt: { primary: "#06b6d4", secondary: "#3b82f6" },
      assetCreation: { primary: "#ef4444", secondary: "#f43f5e" },
      account: { primary: "#3b82f6", secondary: "#06b6d4" },
      blockchain: { primary: "#0ea5e9", secondary: "#3b82f6" },
      governance: { primary: "#3b82f6", secondary: "#06b6d4" },
      invoicing: { primary: "#ef4444", secondary: "#f97316" },
      settings: { primary: "#6366f1", secondary: "#8b5cf6" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#06b6d4" },
    globalAccent: { primary: "#ef4444", secondary: "#3b82f6", tertiary: "#06b6d4" },
    pageAccents: {
      instant_trade: { primary: "#ef4444", secondary: "#3b82f6", tertiary: "#06b6d4" },
      pool: { primary: "#3b82f6", secondary: "#06b6d4", tertiary: "#6366f1" },
      stake: { primary: "#3b82f6", secondary: "#6366f1", tertiary: "#8b5cf6" },
      transfer: { primary: "#3b82f6", secondary: "#ef4444", tertiary: "#06b6d4" },
      dex: { primary: "#06b6d4", secondary: "#3b82f6", tertiary: "#6366f1" },
      proposals: { primary: "#3b82f6", secondary: "#06b6d4", tertiary: "#ef4444" },
      vote: { primary: "#ef4444", secondary: "#3b82f6", tertiary: "#8b5cf6" },
      account: { primary: "#3b82f6", secondary: "#06b6d4", tertiary: "#10b981" },
      settings: { primary: "#64748b", secondary: "#3b82f6", tertiary: "#ef4444" },
      featured: { primary: "#ef4444", secondary: "#3b82f6", tertiary: "#06b6d4" },
    },
  }),

  // ── Nordic Crimson ───────────────────────────────────────────────────
  // Palette: ["#2B2D42", "#8D99AE", "#EDF2F4", "#EF233C", "#D90429"]
  nordicCrimson: makeTheme("nordicCrimson", "Nordic Crimson", "dark", { hex: "#1e293b" }, {
    brand: { primary: "#ef4444", secondary: "#64748b" },
    tokenOverrides: {
      primary: { hex: "#ef4444" },
      secondary: { hex: "#94a3b8" },
      accent: { hex: "#f87171" },
      ring: { hex: "#f87171" },
      destructive: { hex: "#dc2626" },
      sidebarAccent: { hex: "#334155" },
    },
    sectionAccents: {
      exchanging: { primary: "#ef4444", secondary: "#f43f5e" },
      transfer: { primary: "#ef4444", secondary: "#f97316" },
      debt: { primary: "#3b82f6", secondary: "#06b6d4" },
      assetCreation: { primary: "#f43f5e", secondary: "#ec4899" },
      account: { primary: "#6366f1", secondary: "#3b82f6" },
      blockchain: { primary: "#ef4444", secondary: "#f97316" },
      governance: { primary: "#ef4444", secondary: "#f97316" },
      invoicing: { primary: "#ef4444", secondary: "#f59e0b" },
      settings: { primary: "#f43f5e", secondary: "#ef4444" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#64748b" },
    globalAccent: { primary: "#ef4444", secondary: "#9ca3af", tertiary: "#f43f5e" },
    pageAccents: {
      instant_trade: { primary: "#ef4444", secondary: "#64748b", tertiary: "#f43f5e" },
      pool: { primary: "#64748b", secondary: "#ef4444", tertiary: "#6b7280" },
      stake: { primary: "#ef4444", secondary: "#f43f5e", tertiary: "#64748b" },
      transfer: { primary: "#ef4444", secondary: "#f97316", tertiary: "#64748b" },
      dex: { primary: "#64748b", secondary: "#ef4444", tertiary: "#6b7280" },
      proposals: { primary: "#ef4444", secondary: "#64748b", tertiary: "#f43f5e" },
      vote: { primary: "#ef4444", secondary: "#8b5cf6", tertiary: "#64748b" },
      account: { primary: "#64748b", secondary: "#6b7280", tertiary: "#ef4444" },
      settings: { primary: "#64748b", secondary: "#71717a", tertiary: "#ef4444" },
      featured: { primary: "#ef4444", secondary: "#64748b", tertiary: "#f43f5e" },
    },
  }),

  // ── Retro Sunburst ──────────────────────────────────────────────────
  // Palette: ["#003049", "#D62828", "#F77F00", "#FCBF49", "#EAE2B7"]
  retroSunburst: makeTheme("retroSunburst", "Retro Sunburst", "dark", { hex: "#1e3a8a" }, {
    brand: { primary: "#f97316", secondary: "#3b82f6" },
    tokenOverrides: {
      primary: { hex: "#f97316" },
      secondary: { hex: "#dc2626" },
      accent: { hex: "#fcd34d" },
      ring: { hex: "#fb923c" },
      destructive: { hex: "#dc2626" },
      sidebarAccent: { hex: "#1e40af" },
    },
    sectionAccents: {
      exchanging: { primary: "#f59e0b", secondary: "#f97316" },
      transfer: { primary: "#f97316", secondary: "#ef4444" },
      debt: { primary: "#ef4444", secondary: "#f43f5e" },
      assetCreation: { primary: "#f97316", secondary: "#eab308" },
      account: { primary: "#f59e0b", secondary: "#f97316" },
      blockchain: { primary: "#fbbf24", secondary: "#f97316" },
      governance: { primary: "#ef4444", secondary: "#f97316" },
      invoicing: { primary: "#f97316", secondary: "#f59e0b" },
      settings: { primary: "#fbbf24", secondary: "#f97316" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#3b82f6" },
    globalAccent: { primary: "#f97316", secondary: "#ef4444", tertiary: "#f59e0b" },
    pageAccents: {
      instant_trade: { primary: "#f97316", secondary: "#f59e0b", tertiary: "#ef4444" },
      pool: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#eab308" },
      stake: { primary: "#ef4444", secondary: "#f97316", tertiary: "#f59e0b" },
      transfer: { primary: "#f97316", secondary: "#ef4444", tertiary: "#f59e0b" },
      dex: { primary: "#f59e0b", secondary: "#eab308", tertiary: "#f97316" },
      proposals: { primary: "#ef4444", secondary: "#f97316", tertiary: "#f59e0b" },
      vote: { primary: "#f97316", secondary: "#ef4444", tertiary: "#8b5cf6" },
      account: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#10b981" },
      settings: { primary: "#64748b", secondary: "#f97316", tertiary: "#ef4444" },
      featured: { primary: "#f97316", secondary: "#f59e0b", tertiary: "#ef4444" },
    },
  }),

  // ── Sage & Moss ──────────────────────────────────────────────────────
  // Palette: ["#6B705C", "#A5A58D", "#B7B7A4", "#FFE8D6", "#DDBEA9"]
  sageMoss: makeTheme("sageMoss", "Sage & Moss", "light", { hex: "#57534e" }, {
    brand: { primary: "#78716c", secondary: "#f97316" },
    tokenOverrides: {
      primary: { hex: "#57534e" },
      secondary: { hex: "#a8a29e" },
      accent: { hex: "#fcd34d" },
      ring: { hex: "#a8a29e" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#57534e" },
    },
    sectionAccents: {
      exchanging: { primary: "#fcd34d", secondary: "#f59e0b" },
      transfer: { primary: "#f59e0b", secondary: "#f97316" },
      debt: { primary: "#10b981", secondary: "#14b8a6" },
      assetCreation: { primary: "#f59e0b", secondary: "#f97316" },
      account: { primary: "#10b981", secondary: "#14b8a6" },
      blockchain: { primary: "#34d399", secondary: "#10b981" },
      governance: { primary: "#f97316", secondary: "#fb923c" },
      invoicing: { primary: "#f59e0b", secondary: "#f97316" },
      settings: { primary: "#fb923c", secondary: "#f59e0b" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#14b8a6" },
    globalAccent: { primary: "#a8a29e", secondary: "#f59e0b", tertiary: "#10b981" },
    pageAccents: {
      instant_trade: { primary: "#78716c", secondary: "#f59e0b", tertiary: "#10b981" },
      pool: { primary: "#f59e0b", secondary: "#78716c", tertiary: "#f97316" },
      stake: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#78716c" },
      transfer: { primary: "#78716c", secondary: "#f59e0b", tertiary: "#64748b" },
      dex: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#78716c" },
      proposals: { primary: "#78716c", secondary: "#64748b", tertiary: "#f59e0b" },
      vote: { primary: "#78716c", secondary: "#10b981", tertiary: "#f59e0b" },
      account: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#78716c" },
      settings: { primary: "#78716c", secondary: "#64748b", tertiary: "#f59e0b" },
      featured: { primary: "#78716c", secondary: "#f59e0b", tertiary: "#10b981" },
    },
  }),

  // ── Deep Ocean ───────────────────────────────────────────────────────
  // Palette: ["#03045E", "#023E8A", "#0077B6", "#0096C7", "#00B4D8"]
  deepOcean: makeTheme("deepOcean", "Deep Ocean", "dark", { hex: "#1d4ed8" }, {
    brand: { primary: "#3b82f6", secondary: "#06b6d4" },
    tokenOverrides: {
      primary: { hex: "#3b82f6" },
      secondary: { hex: "#06b6d4" },
      accent: { hex: "#38bdf8" },
      ring: { hex: "#60a5fa" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#1d4ed8" },
    },
    sectionAccents: {
      exchanging: { primary: "#06b6d4", secondary: "#0ea5e9" },
      transfer: { primary: "#3b82f6", secondary: "#6366f1" },
      debt: { primary: "#06b6d4", secondary: "#3b82f6" },
      assetCreation: { primary: "#0ea5e9", secondary: "#3b82f6" },
      account: { primary: "#06b6d4", secondary: "#14b8a6" },
      blockchain: { primary: "#3b82f6", secondary: "#0ea5e9" },
      governance: { primary: "#3b82f6", secondary: "#06b6d4" },
      invoicing: { primary: "#0ea5e9", secondary: "#06b6d4" },
      settings: { primary: "#0ea5e9", secondary: "#6366f1" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#06b6d4" },
    globalAccent: { primary: "#3b82f6", secondary: "#06b6d4", tertiary: "#0ea5e9" },
    pageAccents: {
      instant_trade: { primary: "#3b82f6", secondary: "#06b6d4", tertiary: "#0ea5e9" },
      pool: { primary: "#06b6d4", secondary: "#3b82f6", tertiary: "#6366f1" },
      stake: { primary: "#6366f1", secondary: "#3b82f6", tertiary: "#8b5cf6" },
      transfer: { primary: "#3b82f6", secondary: "#0ea5e9", tertiary: "#06b6d4" },
      dex: { primary: "#06b6d4", secondary: "#6366f1", tertiary: "#3b82f6" },
      proposals: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#3b82f6" },
      vote: { primary: "#3b82f6", secondary: "#6366f1", tertiary: "#06b6d4" },
      account: { primary: "#06b6d4", secondary: "#14b8a6", tertiary: "#3b82f6" },
      settings: { primary: "#64748b", secondary: "#3b82f6", tertiary: "#06b6d4" },
      featured: { primary: "#3b82f6", secondary: "#06b6d4", tertiary: "#6366f1" },
    },
  }),

  // ── Cotton Candy ─────────────────────────────────────────────────────
  // Palette: ["#CDB4DB", "#FFC8DD", "#FFAFCC", "#BDE0FE", "#A2D2FF"]
  cottonCandy: makeTheme("cottonCandy", "Cotton Candy", "light", { hex: "#f9a8d4" }, {
    brand: { primary: "#ec4899", secondary: "#0ea5e9" },
    tokenOverrides: {
      primary: { hex: "#f472b6" },
      secondary: { hex: "#7dd3fc" },
      accent: { hex: "#7dd3fc" },
      ring: { hex: "#f472b6" },
      destructive: { hex: "#f87171" },
      sidebarAccent: { hex: "#ec4899" },
    },
    sectionAccents: {
      exchanging: { primary: "#ec4899", secondary: "#f43f5e" },
      transfer: { primary: "#0ea5e9", secondary: "#3b82f6" },
      debt: { primary: "#a855f7", secondary: "#ec4899" },
      assetCreation: { primary: "#ec4899", secondary: "#d946ef" },
      account: { primary: "#0ea5e9", secondary: "#06b6d4" },
      blockchain: { primary: "#a855f7", secondary: "#6366f1" },
      governance: { primary: "#ec4899", secondary: "#a855f7" },
      invoicing: { primary: "#0ea5e9", secondary: "#ec4899" },
      settings: { primary: "#a855f7", secondary: "#ec4899" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#0ea5e9" },
    globalAccent: { primary: "#ec4899", secondary: "#0ea5e9", tertiary: "#a855f7" },
    pageAccents: {
      instant_trade: { primary: "#ec4899", secondary: "#0ea5e9", tertiary: "#a855f7" },
      pool: { primary: "#0ea5e9", secondary: "#ec4899", tertiary: "#3b82f6" },
      stake: { primary: "#a855f7", secondary: "#ec4899", tertiary: "#d946ef" },
      transfer: { primary: "#ec4899", secondary: "#f43f5e", tertiary: "#0ea5e9" },
      dex: { primary: "#0ea5e9", secondary: "#3b82f6", tertiary: "#ec4899" },
      proposals: { primary: "#a855f7", secondary: "#ec4899", tertiary: "#8b5cf6" },
      vote: { primary: "#ec4899", secondary: "#a855f7", tertiary: "#d946ef" },
      account: { primary: "#0ea5e9", secondary: "#06b6d4", tertiary: "#ec4899" },
      settings: { primary: "#a855f7", secondary: "#ec4899", tertiary: "#0ea5e9" },
      featured: { primary: "#ec4899", secondary: "#0ea5e9", tertiary: "#a855f7" },
    },
  }),

  // ── Dusty Rose ───────────────────────────────────────────────────────
  // Palette: ["#FFCDB2", "#FFB4A2", "#E5989B", "#B5828C", "#6D6875"]
  dustyRose: makeTheme("dustyRose", "Dusty Rose", "light", { hex: "#fb7185" }, {
    brand: { primary: "#f43f5e", secondary: "#a855f7" },
    tokenOverrides: {
      primary: { hex: "#fb7185" },
      secondary: { hex: "#a855f7" },
      accent: { hex: "#d8b4fe" },
      ring: { hex: "#fb7185" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#f43f5e" },
    },
    sectionAccents: {
      exchanging: { primary: "#f43f5e", secondary: "#ec4899" },
      transfer: { primary: "#f43f5e", secondary: "#ec4899" },
      debt: { primary: "#a855f7", secondary: "#f43f5e" },
      assetCreation: { primary: "#ec4899", secondary: "#f43f5e" },
      account: { primary: "#f43f5e", secondary: "#ec4899" },
      blockchain: { primary: "#8b5cf6", secondary: "#a855f7" },
      governance: { primary: "#f43f5e", secondary: "#a855f7" },
      invoicing: { primary: "#ec4899", secondary: "#f43f5e" },
      settings: { primary: "#d946ef", secondary: "#a855f7" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#a855f7" },
    globalAccent: { primary: "#f43f5e", secondary: "#a855f7", tertiary: "#ec4899" },
    pageAccents: {
      instant_trade: { primary: "#f43f5e", secondary: "#a855f7", tertiary: "#ec4899" },
      pool: { primary: "#a855f7", secondary: "#f43f5e", tertiary: "#8b5cf6" },
      stake: { primary: "#f43f5e", secondary: "#ec4899", tertiary: "#a855f7" },
      transfer: { primary: "#f43f5e", secondary: "#f97316", tertiary: "#a855f7" },
      dex: { primary: "#a855f7", secondary: "#ec4899", tertiary: "#f43f5e" },
      proposals: { primary: "#f43f5e", secondary: "#ef4444", tertiary: "#a855f7" },
      vote: { primary: "#a855f7", secondary: "#f43f5e", tertiary: "#8b5cf6" },
      account: { primary: "#f43f5e", secondary: "#ec4899", tertiary: "#10b981" },
      settings: { primary: "#a855f7", secondary: "#f43f5e", tertiary: "#64748b" },
      featured: { primary: "#f43f5e", secondary: "#a855f7", tertiary: "#ec4899" },
    },
  }),

  // ── Twilight Gray ────────────────────────────────────────────────────
  // Palette: ["#22223B", "#4A4E69", "#9A8C98", "#C9ADA7", "#F2E9E4"]
  twilightGray: makeTheme("twilightGray", "Twilight Gray", "dark", { hex: "#312e81" }, {
    brand: { primary: "#6366f1", secondary: "#f43f5e" },
    tokenOverrides: {
      primary: { hex: "#6366f1" },
      secondary: { hex: "#fda4af" },
      accent: { hex: "#c084fc" },
      ring: { hex: "#818cf8" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#4338ca" },
    },
    sectionAccents: {
      exchanging: { primary: "#6366f1", secondary: "#8b5cf6" },
      transfer: { primary: "#6366f1", secondary: "#3b82f6" },
      debt: { primary: "#8b5cf6", secondary: "#6366f1" },
      assetCreation: { primary: "#a855f7", secondary: "#8b5cf6" },
      account: { primary: "#6366f1", secondary: "#8b5cf6" },
      blockchain: { primary: "#8b5cf6", secondary: "#a855f7" },
      governance: { primary: "#a855f7", secondary: "#6366f1" },
      invoicing: { primary: "#a855f7", secondary: "#8b5cf6" },
      settings: { primary: "#8b5cf6", secondary: "#f43f5e" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#6366f1" },
    globalAccent: { primary: "#6366f1", secondary: "#f43f5e", tertiary: "#a855f7" },
    pageAccents: {
      instant_trade: { primary: "#6366f1", secondary: "#f43f5e", tertiary: "#a855f7" },
      pool: { primary: "#a855f7", secondary: "#6366f1", tertiary: "#8b5cf6" },
      stake: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#a855f7" },
      transfer: { primary: "#6366f1", secondary: "#3b82f6", tertiary: "#f43f5e" },
      dex: { primary: "#a855f7", secondary: "#6366f1", tertiary: "#3b82f6" },
      proposals: { primary: "#a855f7", secondary: "#8b5cf6", tertiary: "#6366f1" },
      vote: { primary: "#6366f1", secondary: "#a855f7", tertiary: "#f43f5e" },
      account: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#10b981" },
      settings: { primary: "#64748b", secondary: "#6366f1", tertiary: "#a855f7" },
      featured: { primary: "#6366f1", secondary: "#f43f5e", tertiary: "#a855f7" },
    },
  }),

  // ── Retro Sunset ─────────────────────────────────────────────────────
  // Palette: ["#355C7D", "#6C5B7B", "#C06C84", "#F67280", "#F8B195"]
  retroSunset: makeTheme("retroSunset", "Retro Sunset", "dark", { hex: "#1e40af" }, {
    brand: { primary: "#f43f5e", secondary: "#a855f7" },
    tokenOverrides: {
      primary: { hex: "#fb7185" },
      secondary: { hex: "#a855f7" },
      accent: { hex: "#f9a8d4" },
      ring: { hex: "#fb7185" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#7e22ce" },
    },
    sectionAccents: {
      exchanging: { primary: "#f43f5e", secondary: "#ec4899" },
      transfer: { primary: "#a855f7", secondary: "#8b5cf6" },
      debt: { primary: "#f43f5e", secondary: "#f97316" },
      assetCreation: { primary: "#ec4899", secondary: "#f43f5e" },
      account: { primary: "#a855f7", secondary: "#f43f5e" },
      blockchain: { primary: "#8b5cf6", secondary: "#a855f7" },
      governance: { primary: "#f43f5e", secondary: "#ef4444" },
      invoicing: { primary: "#f97316", secondary: "#f43f5e" },
      settings: { primary: "#d946ef", secondary: "#f43f5e" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#a855f7" },
    globalAccent: { primary: "#f43f5e", secondary: "#a855f7", tertiary: "#ec4899" },
    pageAccents: {
      instant_trade: { primary: "#f43f5e", secondary: "#ec4899", tertiary: "#f97316" },
      pool: { primary: "#a855f7", secondary: "#f43f5e", tertiary: "#8b5cf6" },
      stake: { primary: "#f43f5e", secondary: "#8b5cf6", tertiary: "#a855f7" },
      transfer: { primary: "#f43f5e", secondary: "#f97316", tertiary: "#ec4899" },
      dex: { primary: "#a855f7", secondary: "#ec4899", tertiary: "#f43f5e" },
      proposals: { primary: "#f43f5e", secondary: "#ef4444", tertiary: "#a855f7" },
      vote: { primary: "#a855f7", secondary: "#f43f5e", tertiary: "#8b5cf6" },
      account: { primary: "#a855f7", secondary: "#f43f5e", tertiary: "#10b981" },
      settings: { primary: "#64748b", secondary: "#a855f7", tertiary: "#f43f5e" },
      featured: { primary: "#f43f5e", secondary: "#a855f7", tertiary: "#ec4899" },
    },
  }),

  // ── Teal & Gold ──────────────────────────────────────────────────────
  // Palette: ["#005F73", "#0A9396", "#94D2BD", "#E9D8A6", "#EE9B00"]
  tealGold: makeTheme("tealGold", "Teal & Gold", "dark", { hex: "#0f766e" }, {
    brand: { primary: "#14b8a6", secondary: "#f59e0b" },
    tokenOverrides: {
      primary: { hex: "#14b8a6" },
      secondary: { hex: "#fbbf24" },
      accent: { hex: "#6ee7b7" },
      ring: { hex: "#2dd4bf" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#0f766e" },
    },
    sectionAccents: {
      exchanging: { primary: "#14b8a6", secondary: "#06b6d4" },
      transfer: { primary: "#14b8a6", secondary: "#3b82f6" },
      debt: { primary: "#10b981", secondary: "#14b8a6" },
      assetCreation: { primary: "#f59e0b", secondary: "#f97316" },
      account: { primary: "#10b981", secondary: "#06b6d4" },
      blockchain: { primary: "#14b8a6", secondary: "#0ea5e9" },
      governance: { primary: "#14b8a6", secondary: "#10b981" },
      invoicing: { primary: "#f59e0b", secondary: "#f97316" },
      settings: { primary: "#f59e0b", secondary: "#14b8a6" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#06b6d4" },
    globalAccent: { primary: "#14b8a6", secondary: "#f59e0b", tertiary: "#10b981" },
    pageAccents: {
      instant_trade: { primary: "#14b8a6", secondary: "#f59e0b", tertiary: "#10b981" },
      pool: { primary: "#06b6d4", secondary: "#14b8a6", tertiary: "#3b82f6" },
      stake: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#06b6d4" },
      transfer: { primary: "#14b8a6", secondary: "#10b981", tertiary: "#f59e0b" },
      dex: { primary: "#14b8a6", secondary: "#3b82f6", tertiary: "#06b6d4" },
      proposals: { primary: "#10b981", secondary: "#14b8a6", tertiary: "#f59e0b" },
      vote: { primary: "#14b8a6", secondary: "#10b981", tertiary: "#8b5cf6" },
      account: { primary: "#10b981", secondary: "#06b6d4", tertiary: "#14b8a6" },
      settings: { primary: "#64748b", secondary: "#14b8a6", tertiary: "#f59e0b" },
      featured: { primary: "#14b8a6", secondary: "#f59e0b", tertiary: "#10b981" },
    },
  }),

  // ── Cyber Luxury ─────────────────────────────────────────────────────
  // Palette: ["#000814", "#001D3D", "#003566", "#FFC300", "#ffd60a"]
  cyberLuxury: makeTheme("cyberLuxury", "Cyber Luxury", "dark", { hex: "#1e3a8a" }, {
    brand: { primary: "#f59e0b", secondary: "#3b82f6" },
    tokenOverrides: {
      primary: { hex: "#fbbf24" },
      secondary: { hex: "#2563eb" },
      accent: { hex: "#fde047" },
      ring: { hex: "#fbbf24" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#1e40af" },
    },
    sectionAccents: {
      exchanging: { primary: "#f59e0b", secondary: "#eab308" },
      transfer: { primary: "#f59e0b", secondary: "#f97316" },
      debt: { primary: "#3b82f6", secondary: "#6366f1" },
      assetCreation: { primary: "#eab308", secondary: "#f59e0b" },
      account: { primary: "#3b82f6", secondary: "#06b6d4" },
      blockchain: { primary: "#06b6d4", secondary: "#3b82f6" },
      governance: { primary: "#f59e0b", secondary: "#3b82f6" },
      invoicing: { primary: "#eab308", secondary: "#f59e0b" },
      settings: { primary: "#6366f1", secondary: "#06b6d4" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#3b82f6" },
    globalAccent: { primary: "#f59e0b", secondary: "#3b82f6", tertiary: "#eab308" },
    pageAccents: {
      instant_trade: { primary: "#f59e0b", secondary: "#eab308", tertiary: "#3b82f6" },
      pool: { primary: "#3b82f6", secondary: "#f59e0b", tertiary: "#06b6d4" },
      stake: { primary: "#3b82f6", secondary: "#6366f1", tertiary: "#f59e0b" },
      transfer: { primary: "#f59e0b", secondary: "#3b82f6", tertiary: "#eab308" },
      dex: { primary: "#f59e0b", secondary: "#06b6d4", tertiary: "#3b82f6" },
      proposals: { primary: "#3b82f6", secondary: "#f59e0b", tertiary: "#6366f1" },
      vote: { primary: "#f59e0b", secondary: "#3b82f6", tertiary: "#8b5cf6" },
      account: { primary: "#3b82f6", secondary: "#06b6d4", tertiary: "#10b981" },
      settings: { primary: "#64748b", secondary: "#3b82f6", tertiary: "#f59e0b" },
      featured: { primary: "#f59e0b", secondary: "#3b82f6", tertiary: "#eab308" },
    },
  }),

  // ── Corporate ────────────────────────────────────────────────────────
  // Palette: ["#14213D", "#FCA311", "#E5E5E5", "#FFFFFF", "#000000"]
  corporateContrast: makeTheme("corporateContrast", "Corporate", "dark", { hex: "#0f172a" }, {
    brand: { primary: "#f59e0b", secondary: "#64748b" },
    tokenOverrides: {
      primary: { hex: "#f59e0b" },
      secondary: { hex: "#94a3b8" },
      accent: { hex: "#d1d5db" },
      ring: { hex: "#fbbf24" },
      destructive: { hex: "#ef4444" },
      sidebarAccent: { hex: "#1e293b" },
    },
    sectionAccents: {
      exchanging: { primary: "#f59e0b", secondary: "#f97316" },
      transfer: { primary: "#f59e0b", secondary: "#eab308" },
      debt: { primary: "#3b82f6", secondary: "#2563eb" },
      assetCreation: { primary: "#f59e0b", secondary: "#f97316" },
      account: { primary: "#2563eb", secondary: "#3b82f6" },
      blockchain: { primary: "#f97316", secondary: "#fb923c" },
      governance: { primary: "#f59e0b", secondary: "#fbbf24" },
      invoicing: { primary: "#f59e0b", secondary: "#f97316" },
      settings: { primary: "#fb923c", secondary: "#f59e0b" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#64748b" },
    globalAccent: { primary: "#f59e0b", secondary: "#9ca3af", tertiary: "#9ca3af" },
    pageAccents: {
      instant_trade: { primary: "#f59e0b", secondary: "#64748b", tertiary: "#f97316" },
      pool: { primary: "#64748b", secondary: "#f59e0b", tertiary: "#6b7280" },
      stake: { primary: "#64748b", secondary: "#6b7280", tertiary: "#f59e0b" },
      transfer: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#64748b" },
      dex: { primary: "#f59e0b", secondary: "#eab308", tertiary: "#64748b" },
      proposals: { primary: "#64748b", secondary: "#f59e0b", tertiary: "#6b7280" },
      vote: { primary: "#f59e0b", secondary: "#64748b", tertiary: "#8b5cf6" },
      account: { primary: "#64748b", secondary: "#6b7280", tertiary: "#f59e0b" },
      settings: { primary: "#64748b", secondary: "#71717a", tertiary: "#f59e0b" },
      featured: { primary: "#f59e0b", secondary: "#64748b", tertiary: "#f97316" },
    },
  }),

  // ── Neon Pastel ──────────────────────────────────────────────────────
  // Palette: ["#70D6FF", "#FF70A6", "#FF9770", "#FFD670", "#E9FF70"]
  neonPastel: makeTheme("neonPastel", "Neon Pastel", "light", { hex: "#7dd3fc" }, {
    brand: { primary: "#ec4899", secondary: "#0ea5e9" },
    tokenOverrides: {
      primary: { hex: "#f472b6" },
      secondary: { hex: "#7dd3fc" },
      accent: { hex: "#fcd34d" },
      ring: { hex: "#f472b6" },
      destructive: { hex: "#f87171" },
      sidebarAccent: { hex: "#ec4899" },
    },
    sectionAccents: {
      exchanging: { primary: "#ec4899", secondary: "#f43f5e" },
      transfer: { primary: "#0ea5e9", secondary: "#3b82f6" },
      debt: { primary: "#f59e0b", secondary: "#f97316" },
      assetCreation: { primary: "#ec4899", secondary: "#d946ef" },
      account: { primary: "#0ea5e9", secondary: "#06b6d4" },
      blockchain: { primary: "#a855f7", secondary: "#6366f1" },
      governance: { primary: "#ec4899", secondary: "#0ea5e9" },
      invoicing: { primary: "#f59e0b", secondary: "#f97316" },
      settings: { primary: "#a855f7", secondary: "#0ea5e9" },
    },
    statusAccents: { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#0ea5e9" },
    globalAccent: { primary: "#ec4899", secondary: "#0ea5e9", tertiary: "#f59e0b" },
    pageAccents: {
      instant_trade: { primary: "#ec4899", secondary: "#0ea5e9", tertiary: "#f59e0b" },
      pool: { primary: "#0ea5e9", secondary: "#ec4899", tertiary: "#3b82f6" },
      stake: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#ec4899" },
      transfer: { primary: "#ec4899", secondary: "#f43f5e", tertiary: "#0ea5e9" },
      dex: { primary: "#0ea5e9", secondary: "#3b82f6", tertiary: "#ec4899" },
      proposals: { primary: "#f59e0b", secondary: "#f97316", tertiary: "#ec4899" },
      vote: { primary: "#ec4899", secondary: "#a855f7", tertiary: "#0ea5e9" },
      account: { primary: "#0ea5e9", secondary: "#06b6d4", tertiary: "#ec4899" },
      settings: { primary: "#0ea5e9", secondary: "#ec4899", tertiary: "#f59e0b" },
      featured: { primary: "#ec4899", secondary: "#0ea5e9", tertiary: "#f59e0b" },
    },
  }),
};

// --- Accent resolvers (fall back to defaults so partial themes are safe) ----
export function resolveBrand(theme: CustomTheme): AccentPair {
  if (theme?.brand) return theme.brand;
  if (theme && theme.id !== "default" && theme.seed?.hex) {
    const secondary = SECONDARY_HEX[theme.seed.hex] || theme.seed.hex;
    return { primary: theme.seed.hex, secondary };
  }
  return DEFAULT_BRAND;
}

// Neutral greys that are NOT part of any theme's chromatic identity. A section
// or item accent resolving to one of these (e.g. stale data persisted before a
// theme was fully coloured) is treated as "unthemed" so it never silently
// renders grey on an otherwise colourful theme.
const NEUTRAL_GRAYS = new Set([
  "#334155",
  "#475569",
  "#57534e",
  "#64748b",
  "#6b7280",
  "#71717a",
  "#78716c",
  "#94a3b8",
  "#9ca3af",
  "#a8a29e",
]);

function isNeutralGray(pair: AccentPair | undefined): boolean {
  if (!pair) return false;
  const p = (pair.primary || "").toLowerCase();
  const s = (pair.secondary || "").toLowerCase();
  return NEUTRAL_GRAYS.has(p) || NEUTRAL_GRAYS.has(s);
}

// A section uses its explicit override if set. Otherwise the pristine "default"
// theme keeps the original multi-color design, while every other theme falls
// back to its brand pair so selecting a theme visibly recolors the whole app.
// For non-default themes a grey (unthemed) override is ignored so a section can
// never suddenly appear grey.
export function resolveSectionAccent(theme: CustomTheme, section: string): AccentPair {
  const override = theme?.sectionAccents?.[section as NavSection];
  if (override && !(theme && theme.id !== "default" && isNeutralGray(override)))
    return override;
  if (theme && theme.id !== "default") return resolveBrand(theme);
  return DEFAULT_SECTION_ACCENTS[section as NavSection] || DEFAULT_BRAND;
}

// Item cards keep their bespoke default only on the pristine "default" theme (or
// when their section is untouched); any other theme applies its section/brand
// color so the card grid follows the selected theme. As above, a grey override
// on a non-default theme is ignored so cards stay on-theme.
export function resolveItemAccent(
  theme: CustomTheme,
  itemSlug: string,
  section: string
): AccentPair {
  const sectionOverride = theme?.sectionAccents?.[section as NavSection];
  if (
    sectionOverride &&
    !(theme && theme.id !== "default" && isNeutralGray(sectionOverride))
  )
    return sectionOverride;
  if (theme && theme.id !== "default") return resolveBrand(theme);
  return (
    DEFAULT_ITEM_ACCENTS[itemSlug] ||
    DEFAULT_SECTION_ACCENTS[section as NavSection] ||
    DEFAULT_BRAND
  );
}

export function resolveStatus(theme: CustomTheme, role: StatusRole): string {
  return theme?.statusAccents?.[role] || DEFAULT_STATUS[role];
}

export function resolveStatusAll(theme: CustomTheme): Record<StatusRole, string> {
  return {
    success: resolveStatus(theme, "success"),
    danger: resolveStatus(theme, "danger"),
    warning: resolveStatus(theme, "warning"),
    info: resolveStatus(theme, "info"),
  };
}

// Page component accent triple. Precedence: explicit per-page override →
// theme-wide global accent → catalogued page default → brand fallback.
// Precedence: explicit per-page override → theme-wide global accent → for the
// pristine "default" theme the faithful catalogued default → otherwise the
// theme's brand (so selecting/customizing a theme recolors page components) →
// catalogued default → brand fallback.
export function resolvePageAccent(theme: CustomTheme, page: string): AccentTriple {
  if (theme?.pageAccents?.[page]) return theme.pageAccents[page];
  if (theme?.globalAccent) return theme.globalAccent;
  if (theme && theme.id === "default") {
    return PAGE_ACCENTS[page] || brandTriple(theme);
  }
  return brandTriple(theme);
}

type ThemeStore = {
  themes: Record<string, CustomTheme>;
  activeThemeId: string;
  pageThemeMap: Record<string, string>;
};

const DEFAULTS: ThemeStore = {
  themes: PRESET_THEMES,
  activeThemeId: "default",
  pageThemeMap: {},
};

export const $customTheme = persistentMap<ThemeStore>(
  "customTheme:",
  DEFAULTS,
  {
    encode: (v) => JSON.stringify(v),
    // persistentMap decodes each top-level key's value individually.
    decode: (str) => {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    },
  }
);

function genId(): string {
  return "theme_" + Math.random().toString(36).slice(2, 9);
}

// --- Draft theme (not persisted until the user clicks Save) -----------------
export const $draftTheme = atom<CustomTheme | null>(null);
// Tracks the name of the source theme when a draft was created via duplicate,
// so saveDraftTheme can decide whether to overwrite or create new.
export const $draftOriginalName = atom<string | null>(null);

export function createDraftTheme(name?: string): string {
  const id = "draft_" + genId();
  const theme = makeTheme(id, name || "New Theme", "light", {
    hex: "#7c3aed",
  });
  theme.draft = true;
  $draftTheme.set(theme);
  $draftOriginalName.set(null);
  return id;
}

export function duplicateDraftTheme(id: string): string | null {
  const src = $customTheme.get().themes[id];
  if (!src) return null;
  const newId = "draft_" + genId();
  const clone = structuredClone(src);
  let clonedName = `${src.name} copy`;
  if (clonedName.length > THEME_NAME_MAX_LENGTH) {
    clonedName = clonedName.slice(0, THEME_NAME_MAX_LENGTH);
  }
  const draft: CustomTheme = { ...clone, id: newId, name: clonedName, draft: true };
  $draftTheme.set(draft);
  $draftOriginalName.set(src.name);
  return newId;
}

export function saveDraftTheme(
  draft: CustomTheme,
  editedName: string
): { id: string; isNew: boolean } {
  const themes = { ...$customTheme.get().themes };
  const trimmedName = editedName.trim();
  // Find existing non-preset, non-draft theme with matching name
  const existingId = Object.keys(themes).find(
    (k) => !PRESET_THEMES[k] && !themes[k].draft && themes[k].name === trimmedName
  );
  if (existingId) {
    // Overwrite existing theme (keep its id)
    const { draft: _draft, ...saved } = { ...draft, id: existingId, name: trimmedName };
    themes[existingId] = saved;
    $customTheme.setKey("themes", themes);
    $draftTheme.set(null);
    $draftOriginalName.set(null);
    return { id: existingId, isNew: false };
  }
  // Create new theme
  const newId = genId();
  const { draft: _draft, ...saved } = { ...draft, id: newId, name: trimmedName };
  themes[newId] = saved;
  $customTheme.setKey("themes", themes);
  $draftTheme.set(null);
  $draftOriginalName.set(null);
  return { id: newId, isNew: true };
}

export function discardDraftTheme() {
  $draftTheme.set(null);
  $draftOriginalName.set(null);
}

export function isDraftTheme(id: string): boolean {
  return $draftTheme.get()?.id === id;
}

export function getThemes(): Record<string, CustomTheme> {
  return $customTheme.get().themes || {};
}

export function getActiveTheme(): CustomTheme {
  const state = $customTheme.get();
  return state.themes[state.activeThemeId] || PRESET_THEMES.default;
}

export function getThemeForPage(pageSlug: string): CustomTheme {
  const state = $customTheme.get();
  const mapped = state.pageThemeMap[pageSlug];
  if (mapped && state.themes[mapped]) return state.themes[mapped];
  return state.themes[state.activeThemeId] || PRESET_THEMES.default;
}

export function setActiveTheme(id: string) {
  if (!$customTheme.get().themes[id]) return;
  $customTheme.setKey("activeThemeId", id);
}

export function setPageTheme(pageSlug: string, themeId: string | null) {
  const map = { ...$customTheme.get().pageThemeMap };
  if (!themeId) delete map[pageSlug];
  else map[pageSlug] = themeId;
  $customTheme.setKey("pageThemeMap", map);
}

export function updateTheme(id: string, patch: Partial<CustomTheme>) {
  // If editing a draft, update the draft atom instead of the persistent store
  if ($draftTheme.get()?.id === id) {
    $draftTheme.set({ ...$draftTheme.get()!, ...patch });
    return;
  }
  const themes = { ...$customTheme.get().themes };
  if (!themes[id]) return;
  themes[id] = { ...themes[id], ...patch };
  $customTheme.setKey("themes", themes);
}

export function updateThemeSeed(id: string, seed: PaletteRef) {
  updateTheme(id, { seed });
}

export function updateThemeToken(id: string, token: string, ref: PaletteRef | null) {
  const draft = $draftTheme.get();
  if (draft?.id === id) {
    const overrides = { ...draft.tokenOverrides };
    if (!ref) delete overrides[token];
    else overrides[token] = ref;
    $draftTheme.set({ ...draft, tokenOverrides: overrides });
    return;
  }
  const themes = { ...$customTheme.get().themes };
  const theme = themes[id];
  if (!theme) return;
  const overrides = { ...theme.tokenOverrides };
  if (!ref) delete overrides[token];
  else overrides[token] = ref;
  themes[id] = { ...theme, tokenOverrides: overrides };
  $customTheme.setKey("themes", themes);
}

export function updateBrand(id: string, brand: AccentPair) {
  updateTheme(id, { brand });
}

export function updateSectionAccent(
  id: string,
  section: string,
  pair: AccentPair | null
) {
  const draft = $draftTheme.get();
  if (draft?.id === id) {
    const sectionAccents = { ...(draft.sectionAccents || {}) };
    if (!pair) delete sectionAccents[section as NavSection];
    else sectionAccents[section as NavSection] = pair;
    $draftTheme.set({ ...draft, sectionAccents });
    return;
  }
  const themes = { ...$customTheme.get().themes };
  const theme = themes[id];
  if (!theme) return;
  const sectionAccents = { ...(theme.sectionAccents || {}) };
  if (!pair) delete sectionAccents[section as NavSection];
  else sectionAccents[section as NavSection] = pair;
  themes[id] = { ...theme, sectionAccents };
  $customTheme.setKey("themes", themes);
}

export function updateStatusAccent(id: string, role: StatusRole, color: string) {
  const draft = $draftTheme.get();
  if (draft?.id === id) {
    $draftTheme.set({
      ...draft,
      statusAccents: { ...(draft.statusAccents || {}), [role]: color },
    });
    return;
  }
  const themes = { ...$customTheme.get().themes };
  const theme = themes[id];
  if (!theme) return;
  themes[id] = {
    ...theme,
    statusAccents: { ...(theme.statusAccents || {}), [role]: color },
  };
  $customTheme.setKey("themes", themes);
}

export function updatePageAccent(id: string, page: string, triple: AccentTriple | null) {
  const draft = $draftTheme.get();
  if (draft?.id === id) {
    const pageAccents = { ...(draft.pageAccents || {}) };
    if (!triple) delete pageAccents[page];
    else pageAccents[page] = triple;
    $draftTheme.set({ ...draft, pageAccents });
    return;
  }
  const themes = { ...$customTheme.get().themes };
  const theme = themes[id];
  if (!theme) return;
  const pageAccents = { ...(theme.pageAccents || {}) };
  if (!triple) delete pageAccents[page];
  else pageAccents[page] = triple;
  themes[id] = { ...theme, pageAccents };
  $customTheme.setKey("themes", themes);
}

export function updateGlobalAccent(id: string, triple: AccentTriple | null) {
  const draft = $draftTheme.get();
  if (draft?.id === id) {
    $draftTheme.set({ ...draft, globalAccent: triple || undefined });
    return;
  }
  const themes = { ...$customTheme.get().themes };
  const theme = themes[id];
  if (!theme) return;
  themes[id] = { ...theme, globalAccent: triple || undefined };
  $customTheme.setKey("themes", themes);
}

export function createTheme(name?: string): string {
  const id = genId();
  const themes = { ...$customTheme.get().themes };
  themes[id] = makeTheme(id, name || "New Theme", "light", {
    hex: "#7c3aed",
  });
  $customTheme.setKey("themes", themes);
  $customTheme.setKey("activeThemeId", id);
  return id;
}

export function duplicateTheme(id: string): string | null {
  const src = $customTheme.get().themes[id];
  if (!src) return null;
  const newId = genId();
  const themes = { ...$customTheme.get().themes };
  themes[newId] = { ...structuredClone(src), id: newId, name: `${src.name} copy` };
  $customTheme.setKey("themes", themes);
  $customTheme.setKey("activeThemeId", newId);
  return newId;
}

export function deleteTheme(id: string) {
  if (PRESET_THEMES[id]) return; // never delete built-in presets
  const state = $customTheme.get();
  const themes = { ...state.themes };
  delete themes[id];
  const map = { ...state.pageThemeMap };
  for (const k of Object.keys(map)) if (map[k] === id) delete map[k];
  $customTheme.setKey("themes", themes);
  $customTheme.setKey("pageThemeMap", map);
  if (state.activeThemeId === id) $customTheme.setKey("activeThemeId", "default");
}

export function renameTheme(id: string, name: string) {
  updateTheme(id, { name });
}

export function exportTheme(id: string): string {
  const draft = $draftTheme.get();
  if (draft?.id === id) {
    const { draft: _draft, ...exportable } = draft;
    return JSON.stringify(exportable, null, 2);
  }
  const theme = $customTheme.get().themes[id];
  return theme ? JSON.stringify(theme, null, 2) : "";
}

export function importTheme(json: string): string | null {
  try {
    const parsed = JSON.parse(json) as CustomTheme;
    if (!parsed || !parsed.seed) return null;
    const id = genId();
    const themes = { ...$customTheme.get().themes };
    themes[id] = {
      ...parsed,
      id,
      name: parsed.name ? `${parsed.name} (imported)` : "Imported theme",
      tokenOverrides: parsed.tokenOverrides || {},
      brand: parsed.brand,
      sectionAccents: parsed.sectionAccents || {},
      statusAccents: parsed.statusAccents || {},
      pageAccents: parsed.pageAccents || {},
      globalAccent: parsed.globalAccent,
    };
    $customTheme.setKey("themes", themes);
    $customTheme.setKey("activeThemeId", id);
    return id;
  } catch {
    return null;
  }
}

export function resetThemes() {
  $customTheme.setKey("themes", PRESET_THEMES);
  $customTheme.setKey("activeThemeId", "default");
  $customTheme.setKey("pageThemeMap", {});
}

// Compiled CSS for a theme; empty string means "use globals.css as-is".
export function compileThemeCss(theme: CustomTheme): string {
  // The pristine "default" preset applies NO token overrides, so the app keeps
  // the exact shipped globals.css neutral surfaces (both :root and .dark) —
  // identical to the pre-theme-system look. Per-page accent vars are still
  // injected separately by CustomThemeStyle so pages keep their catalogued
  // colors (now readable in dark mode after the -fg fix).
  if (theme && theme.id === "default") return "";
  try {
    return buildThemeCss(theme);
  } catch {
    return "";
  }
}

// Persist the active (global) theme CSS so the blocking <head> script can
// apply it before first paint on the next load, just like the dark-mode class.
function persistActiveCss() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      ACTIVE_CSS_KEY,
      JSON.stringify(compileThemeCss(getActiveTheme()))
    );
  } catch {
    /* ignore quota / serialization errors */
  }
}

if (typeof window !== "undefined") {
  persistActiveCss();
  $customTheme.listen(() => persistActiveCss());
}
