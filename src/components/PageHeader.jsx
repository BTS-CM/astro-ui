import React, { useState, useEffect, useSyncExternalStore, lazy, Suspense } from "react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

const LanguageSelector = lazy(() => import("./LanguageSelector.jsx"));
import ThemeToggle from "@/components/ui/theme-toggle.jsx";
import ThemeSelector from "@/components/ui/theme-selector.jsx";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  HoverCardPortal,
} from "@/components/ui/hover-card";

import {
  ChevronDown,
  Sparkles,
  Send,
  LineChart,
  Wallet,
  ClipboardList,
  Star,
  Info,
  Server,
  UserPlus,
  UserX,
  Palette,
  Repeat,
  Zap,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  Gem,
  Globe,
  Vote,
  FileText,
  Receipt,
  SlidersHorizontal,
  LockKeyhole,
  Users,
  CircleDollarSign,
  Boxes,
  Calculator,
  Gavel,
  FileSignature,
  Lock,
  KeyRound,
  EyeOff,
  Banknote,
  Coins,
  HandCoins,
  Landmark,
  Pickaxe,
  BarChart3,
  Ticket,
  Trophy,
  BookOpen,
  FilePlus,
  FileCheck,
  FileClock,
  FileStack,
  Timer,
  Handshake,
  Hourglass,
  Crown,
  Eye,
  Droplets,
  Package,
  Database,
  ListOrdered,
  Clock,
  MessageSquare,
  Home,
  Layers,
  Menu,
  ReceiptText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useStore } from "@nanostores/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import CurrentUser from "./common/CurrentUser.jsx";
import WaveBackground from "./WaveBackground.jsx";

import { $currentUser } from "@/stores/users.ts";
import {
  $customTheme,
  getThemeForPage,
  setCurrentPage,
  resolveBrand,
  resolveSectionAccent,
} from "@/stores/customTheme.ts";
import { getNavAccentStyles, brandBackdropStyles } from "@/lib/accentStyles.js";

const ICONS = {
  explorer: Database,
  dex: LineChart,
  instant_trade: Zap,
  swap: ArrowLeftRight,
  stake: Lock,
  barter: Handshake,
  tfund_user: Banknote,
  transfer: Send,
  timed_transfer: Timer,
  withdraw_permissions: FileCheck,
  htlc: LockKeyhole,
  create_vesting: Clock,
  borrow: HandCoins,
  lend: Coins,
  smartcoins: CircleDollarSign,
  tfunds: Landmark,
  portfolio_balances: Wallet,
  portfolio_open_orders: ListOrdered,
  call_orders: ListOrdered,
  custom_authorities: KeyRound,
  blind_transfers: EyeOff,
  favourites: Star,
  issued_assets: Boxes,
  offers: FileText,
  deals: FileSignature,
  vesting: Hourglass,
  proposals: Gavel,
  blocks: Database,
  custom_pool_tracker: BarChart3,
  pools: Droplets,
  vote: Vote,
  witnesses: Eye,
  committee: Users,
  committee_parameters: SlidersHorizontal,
  governance: Vote,
  create_worker: Pickaxe,
  create_ticket: Ticket,
  ticket_leaderboard: Trophy,
  invoice_inventory: Package,
  create_invoice: FilePlus,
  pay_invoice: CreditCard,
  stored_invoices: FileStack,
  accountLists: ClipboardList,
  ltm: Crown,
  nodes: Server,
  network_fees: ReceiptText,
  create_account: UserPlus,
  change_password: KeyRound,
  monthly_referrer: HandCoins,
  configure_visuals: Palette,
  theme_customizer: Palette,
  page_themes: Layers,
  docs: BookOpen,
  home: Home,
  create_uia: Gem,
  create_smartcoin: Gem,
  create_liquidity_pool: Droplets,
  airdrop_calculate: Calculator,
  blocked_users: UserX,
  trollbox: MessageSquare,
  forum: MessageSquare,
};

// Matches a nav item href against the current path. The root ("/") must match
// exactly, otherwise the home link (href ".html" -> "/") would match every
// path via startsWith and mark itself + its section active everywhere.
function hrefMatchesPath(href, path) {
  const clean = href.replace(/\/index\.html$/, "/");
  if (clean === "/") return path === "/" || path === ".html" || path === "";
  return path.startsWith(clean);
}

function NavPanel({ section, accent, t, isDark }) {
  const SectionIcon = section.icon;

  return (
    <div
      className="relative w-full bg-popover"
      style={{ backgroundColor: "hsl(var(--popover))" }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r"
        style={accent.bar}
      />
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b dark:border-white/5 border-border/50">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border"
          style={{ background: accent.chip.background, border: accent.chip.border }}
        >
          <SectionIcon className={cn("h-3.5 w-3.5", "dark:!text-white", isDark && "text-white")} />
        </span>
        <h3 className="text-sm font-semibold dark:text-white text-popover-foreground tracking-tight truncate">
          {t(section.label)}
        </h3>
      </div>
      <ul className="p-2 grid grid-cols-1 gap-1 min-w-[320px] max-w-[420px]">
        {section.items.map((item) => {
          const Icon = ICONS[item.slug] || Sparkles;
          const itemAccent = { color: accent.color, bg: accent.bg, border: accent.border };
          const isCurrent = typeof window !== "undefined" && hrefMatchesPath(item.href, window.location.pathname);
          return (
            <li key={item.slug} className="group/navitem">
              <a
                href={item.href}
                className={cn(
                  "relative flex items-start gap-3 rounded-xl border border-transparent p-2.5",
                  "dark:bg-white/[0.02] dark:hover:bg-white/[0.06] hover:bg-accent/50",
                  "transition-all duration-150 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 dark:focus-visible:ring-white/30 focus-visible:ring-ring",
                  isCurrent && "dark:bg-white/[0.08] dark:border-white/15 bg-accent border-border"
                )}
                style={itemAccent.border}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border dark:border-white/10 border-border"
                  style={itemAccent.bg}
                >
                  <Icon className={cn("h-4 w-4", "dark:!text-white", isDark && "text-white")} style={isDark ? undefined : itemAccent.color} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold dark:text-white text-popover-foreground truncate">
                      {t(item.title)}
                    </span>
                    {isCurrent && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full dark:bg-white/80 bg-popover-foreground/80" />
                    )}
                  </span>
                  <span className="block mt-0.5 text-[12px] leading-snug dark:text-white/55 text-muted-foreground line-clamp-2">
                    {t(item.description)}
                  </span>
                </span>
                <ArrowUpRight
                  className={cn(
                    "h-4 w-4 shrink-0 dark:text-white/0 text-transparent -translate-x-1 translate-y-1",
                    "group-hover/navitem:dark:text-white/70 group-hover/navitem:text-muted-foreground group-hover/navitem:translate-x-0 group-hover/navitem:translate-y-0",
                    "transition-all duration-200 ease-out"
                  )}
                  aria-hidden="true"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HoverPopover({ section, accent, t, isDark, children }) {
  return (
      <HoverCard openDelay={60} closeDelay={180}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent
          sideOffset={10}
          align="center"
          className={cn(
            "w-auto p-0 overflow-hidden rounded-2xl",
            "dark:border-white/10 border-border",
            "!bg-popover",
            "shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          )}
        >
          <NavPanel section={section} accent={accent} t={t} isDark={isDark} />
        </HoverCardContent>
      </HoverCardPortal>
      </HoverCard>
  );
}

export default function PageHeader(properties) {
  const { page, backURL } = properties;
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true,
  );

  useStore($customTheme);
  const { resolvedTheme } = useTheme();
  const [domIsDark, setDomIsDark] = React.useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  React.useEffect(() => {
    const el = document.documentElement;
    const check = () => setDomIsDark(el.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const isDark = resolvedTheme ? resolvedTheme === "dark" : domIsDark;
  const activeTheme = getThemeForPage(page || "index");
  const brand = resolveBrand(activeTheme);

  const NAV_SECTIONS = [
    {
      id: "exchanging",
      label: "PageHeader:exchangingFundsHeading",
      icon: Repeat,
      items: [
        { slug: "dex", title: "Home:dex.title", description: "Home:dex.subtitle", href: "/dex.html" },
        { slug: "instant_trade", title: "Home:instant_trade.title", description: "Home:instant_trade.subtitle", href: "/instant_trade.html" },
        { slug: "swap", title: "Home:swap.title", description: "Home:swap.subtitle", href: "/swap.html" },
        { slug: "stake", title: "Home:stake.title", description: "Home:stake.subtitle", href: "/stake.html" },
        { slug: "barter", title: "Home:barter.title", description: "Home:barter.subtitle", href: "/barter.html" },
        { slug: "tfund_user", title: "Home:tfund_user.title", description: "Home:tfund_user.subtitle", href: "/tfund_user.html" },
      ],
    },
    {
      id: "transfer",
      label: "PageHeader:transferFundsHeading",
      icon: Send,
      items: [
        { slug: "transfer", title: "Home:transfer.title", description: "Home:transfer.subtitle", href: "/transfer.html" },
        { slug: "timed_transfer", title: "Home:timed_transfer.title", description: "Home:timed_transfer.subtitle", href: "/timed_transfer.html" },
        { slug: "withdraw_permissions", title: "Home:withdraw_permission.title", description: "Home:withdraw_permission.subtitle", href: "/withdraw_permissions.html" },
        { slug: "htlc", title: "Home:htlc.title", description: "Home:htlc.subtitle", href: "/htlc.html" },
        { slug: "create_vesting", title: "Home:create_vesting.title", description: "Home:create_vesting.subtitle", href: "/create_vesting.html" },
        { slug: "blind_transfers", title: "BlindTransfers:title", description: "BlindTransfers:description", href: "/blind_transfers.html" },
        { slug: "airdrop_calculate", title: "Home:airdrop_calculate.title", description: "Home:airdrop_calculate.subtitle", href: "/airdrop_calculate.html" },
      ],
    },
    {
      id: "debt",
      label: "PageHeader:formsOfDebtHeading",
      icon: Coins,
      items: [
        { slug: "borrow", title: "Home:borrow.title", description: "Home:borrow.subtitle", href: "/borrow.html" },
        { slug: "lend", title: "Home:lend.title", description: "Home:lend.subtitle", href: "/lend.html" },
        { slug: "smartcoins", title: "Home:smartcoins.title", description: "Home:smartcoins.subtitle", href: "/smartcoins.html" },
        { slug: "tfunds", title: "Home:tfunds.title", description: "Home:tfunds.subtitle", href: "/tfunds.html" },
      ],
    },
    {
      id: "assetCreation",
      label: "PageHeader:assetCreation",
      icon: Gem,
      items: [
        { slug: "create_uia", title: "Home:create_uia.title", description: "Home:create_uia.subtitle", href: "/create_uia.html" },
        { slug: "create_smartcoin", title: "Home:create_smartcoin.title", description: "Home:create_smartcoin.subtitle", href: "/create_smartcoin.html" },
        { slug: "create_liquidity_pool", title: "Home:create_liquidity_pool.title", description: "Home:create_liquidity_pool.subtitle", href: "/create_pool.html" },
      ],
    },
    {
      id: "account",
      label: "PageHeader:accountOverviewsHeading",
      icon: Wallet,
      items: [
        { slug: "portfolio_balances", title: "Home:portfolio_balances.title", description: "Home:portfolio_balances.subtitle", href: "/balances.html" },
        { slug: "portfolio_open_orders", title: "Home:portfolio_open_orders.title", description: "Home:portfolio_open_orders.subtitle", href: "/open-orders.html" },
        { slug: "call_orders", title: "CallOrders:title", description: "CallOrders:description", href: "/call-orders.html" },
        { slug: "custom_authorities", title: "CustomAuthorities:title", description: "CustomAuthorities:description", href: "/custom_authorities.html" },
        { slug: "favourites", title: "Home:favourites.title", description: "Home:favourites.subtitle", href: "/favourites.html" },
        { slug: "issued_assets", title: "Home:issued_assets.title", description: "Home:issued_assets.subtitle", href: "/issued_assets.html" },
        { slug: "offers", title: "Home:offers.title", description: "Home:offers.subtitle", href: "/offers.html" },
        { slug: "deals", title: "Home:deals.title", description: "Home:deals.subtitle", href: "/deals.html" },
        { slug: "vesting", title: "Home:vesting.title", description: "Home:vesting.subtitle", href: "/vesting.html" },
        { slug: "proposals", title: "Home:proposals.title", description: "Home:proposals.subtitle", href: "/proposals.html" },
      ],
    },
    {
      id: "blockchain",
      label: "PageHeader:blockchainOverviewsHeading",
      icon: Globe,
      items: [
        { slug: "explorer", title: "Home:explorer.title", description: "Home:explorer.subtitle", href: "/explorer.html" },
        { slug: "blocks", title: "Home:blocks.title", description: "Home:blocks.subtitle", href: "/blocks.html" },
        { slug: "custom_pool_tracker", title: "Home:custom_pool_tracker.title", description: "Home:custom_pool_tracker.subtitle", href: "/custom_pool_overview.html" },
        { slug: "pools", title: "Home:pools.title", description: "Home:pools.subtitle", href: "/pools.html" },
        { slug: "top_operations", title: "Home:top_operations.title", description: "Home:top_operations.subtitle", href: "/top-operations.html" },
        { slug: "trollbox", title: "Home:trollbox.title", description: "Home:trollbox.subtitle", href: "/trollbox.html" },
        { slug: "forum", title: "Home:forum.title", description: "Home:forum.subtitle", href: "/forum.html" },
      ],
    },
    {
      id: "governance",
      label: "PageHeader:governanceHeading",
      icon: Vote,
      items: [
        { slug: "vote", title: "Home:vote.title", description: "Home:vote.subtitle", href: "/vote.html" },
        { slug: "witnesses", title: "Home:witnesses.title", description: "Home:witnesses.subtitle", href: "/witnesses.html" },
        { slug: "committee", title: "Home:committee.title", description: "Home:committee.subtitle", href: "/committee.html" },
        { slug: "committee_parameters", title: "Home:committee_parameters.title", description: "Home:committee_parameters.subtitle", href: "/committee_parameters.html" },
        { slug: "governance", title: "Home:governance.title", description: "Home:governance.subtitle", href: "/governance.html" },
        { slug: "create_worker", title: "Home:create_worker.title", description: "Home:create_worker.subtitle", href: "/create_worker.html" },
        { slug: "create_ticket", title: "Home:create_ticket.title", description: "Home:create_ticket.subtitle", href: "/create_ticket.html" },
        { slug: "ticket_leaderboard", title: "Home:ticket_leaderboard.title", description: "Home:ticket_leaderboard.subtitle", href: "/ticket_leaderboard.html" },
      ],
    },
    {
      id: "invoicing",
      label: "PageHeader:invoicingHeading",
      icon: Receipt,
      items: [
        { slug: "invoice_inventory", title: "Home:invoice_inventory.title", description: "Home:invoice_inventory.subtitle", href: "/invoice_inventory.html" },
        { slug: "create_invoice", title: "Home:create_invoice.title", description: "Home:create_invoice.subtitle", href: "/create_invoice.html" },
        { slug: "pay_invoice", title: "Home:pay_invoice.title", description: "Home:pay_invoice.subtitle", href: "/pay_invoice.html" },
        { slug: "stored_invoices", title: "Home:stored_invoices.title", description: "Home:stored_invoices.subtitle", href: "/stored_invoices.html" },
      ],
    },
    {
      id: "settings",
      label: "PageHeader:settingsHeading",
      icon: SlidersHorizontal,
      items: [
        { slug: "accountLists", title: "Home:accountLists.title", description: "Home:accountLists.subtitle", href: "/account_lists.html" },
        { slug: "ltm", title: "Home:ltm.title", description: "Home:ltm.subtitle", href: "/ltm.html" },
        { slug: "nodes", title: "Home:nodes.title", description: "Home:nodes.subtitle", href: "/nodes.html" },
        { slug: "network_fees", title: "Home:network_fees.title", description: "Home:network_fees.subtitle", href: "/network_fees.html" },
        { slug: "create_account", title: "Home:create_account.title", description: "Home:create_account.subtitle", href: "/create_account.html" },
        { slug: "change_password", title: "Home:change_password.title", description: "Home:change_password.subtitle", href: "/change_password.html" },
        { slug: "monthly_referrer", title: "Home:monthly_referrer.title", description: "Home:monthly_referrer.subtitle", href: "/monthly_referrer.html" },
        { slug: "configure_visuals", title: "Home:configure_visuals.title", description: "Home:configure_visuals.subtitle", href: "/visuals.html" },
        { slug: "theme_customizer", title: "Home:theme_customizer.title", description: "Home:theme_customizer.subtitle", href: "/theme.html" },
        { slug: "page_themes", title: "Home:page_themes.title", description: "Home:page_themes.subtitle", href: "/page_themes.html" },
        { slug: "docs", title: "Home:docs.title", description: "Home:docs.subtitle", href: "docs/docs-index.html" },
      ],
    },
  ];

  const [currentPath, setCurrentPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "",
  );

  useEffect(() => {
    if (page) setCurrentPage(page);
  }, [page]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const update = () => setCurrentPath(window.location.pathname);
    update();
    document.addEventListener("astro:after-swap", update);
    window.addEventListener("popstate", update);
    return () => {
      document.removeEventListener("astro:after-swap", update);
      window.removeEventListener("popstate", update);
    };
  }, []);

  const isActiveSection = (section) =>
    section.items.some((item) => hrefMatchesPath(item.href, currentPath));

  return (
    <div key={`header`}>
      <div className="mb-3 relative min-h-[195px]">
        <div
          className="absolute inset-0 overflow-hidden rounded-lg border border-border dark:border-white/[0.06] bg-gradient-to-br"
          style={brandBackdropStyles(brand.primary, brand.secondary)}
        >
          <WaveBackground />
        </div>
        <div className="container mx-auto px-3 sm:px-4 relative">
          <div className="grid grid-cols-12 gap-3 items-center min-h-[195px]">
            <div className="col-span-12 md:col-span-3 mt-2 flex flex-col items-start gap-2 lg:flex-row lg:items-center">
              <Suspense fallback={<div className="h-8 w-24 bg-muted animate-pulse rounded" />}>
                <LanguageSelector />
              </Suspense>
              <ThemeToggle />
              <ThemeSelector />

              <Button
                variant="outline"
                className="lg:hidden relative h-12 w-12 bg-card/55 backdrop-blur-xl dark:text-white text-foreground border border-border hover:border-[hsl(var(--accent-1)/0.5)] hover:bg-card/60 transition-all duration-200 rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                onClick={() =>
                  window.__toggleSidebar && window.__toggleSidebar()
                }
                aria-label="Toggle Sidebar"
                title="Toggle Sidebar"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 top-0 h-px"
                  style={{
                    background: "linear-gradient(90deg, transparent, #22d3eecc, transparent)",
                  }}
                />
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            <div className="col-span-12 md:col-span-6 text-center">
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground dark:text-white dark:[text-shadow:_0_1px_2px_rgba(0,0,0,0.9),_0_2px_12px_rgba(0,0,0,0.7),_0_0_24px_rgba(0,0,0,0.5)]">
                  <a href="../index.html">
                    {page && page === "index"
                      ? <span className="font-medium">{t("PageHeader:welcomeMessage")}</span>
                      : ""}
                    <span>
                      {t("PageHeader:uiName")}
                    </span>
                  </a>
                </h2>
                <h4 className="mt-1 text-sm sm:text-base font-medium text-foreground dark:text-white dark:[text-shadow:_0_1px_2px_rgba(0,0,0,0.9),_0_2px_12px_rgba(0,0,0,0.7),_0_0_24px_rgba(0,0,0,0.5)]">
                  {t(`PageHeader:descText.${page}`)}
                </h4>
              </div>
            </div>

            <div className="col-span-12 md:col-span-3 text-center md:text-right mt-2">
              {usr && usr.username && usr.username.length ? (
                <CurrentUser usr={usr} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="w-full mx-auto mb-4 px-3 sm:px-4 hidden lg:flex justify-center">
        <div
          className="inline-flex w-full max-w-full justify-center items-center gap-1 rounded-2xl dark:border-white/10 border-border dark:bg-slate-950/55 bg-card/80 backdrop-blur-xl p-1.5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.04)] dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]"
        >
          {NAV_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            const accent = getNavAccentStyles(resolveSectionAccent(activeTheme, section.id).primary, isDark);
            const active = isActiveSection(section);
            return (
              <HoverPopover key={section.id} section={section} accent={accent} t={t} isDark={isDark}>
                <button
                  type="button"
                  className={cn(
                    "group/navtrigger relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium",
                    "dark:text-white/80 dark:hover:text-white text-muted-foreground hover:text-foreground",
                    "border border-transparent dark:hover:border-white/10 hover:border-border",
                    "dark:bg-white/0 dark:hover:bg-white/[0.06] hover:bg-accent/50",
                    "transition-all duration-200 ease-out",
                    "data-[state=open]:dark:text-white data-[state=open]:dark:bg-white/[0.08] data-[state=open]:dark:border-white/15 data-[state=open]:text-foreground data-[state=open]:bg-accent data-[state=open]:border-border",
                    "focus-visible:outline-none focus-visible:ring-2 dark:focus-visible:ring-white/30 focus-visible:ring-ring",
                    active && "dark:text-white dark:border-white/10 dark:bg-white/[0.07] text-foreground border-border bg-accent"
                  )}
                >
                  <SectionIcon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors dark:!text-white",
                      active ? "dark:!text-white text-foreground" : "dark:!text-white/70 dark:group-hover/navtrigger:!text-white text-muted-foreground group-hover/navtrigger:text-foreground"
                    )}
                  />
                  <span className="whitespace-nowrap">{t(section.label)}</span>
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 dark:!text-white/60 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:dark:!text-white group-data-[state=open]:text-foreground"
                    aria-hidden="true"
                  />
                  {active && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 -bottom-[6px] -translate-x-1/2 h-1.5 w-1.5 rounded-full shadow-[0_0_10px_2px_currentColor]"
                      style={accent.dot}
                    />
                  )}
                </button>
              </HoverPopover>
            );
          })}
        </div>
      </div>
    </div>
  );
}
