import React, { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { useSyncExternalStore } from "react";


import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { Separator } from "@/components/ui/separator";

import Hero from "./home/Hero";

import {
  Activity,
  Hourglass,
  BookOpen,
  Briefcase,
  TrendingUp,
  Sparkles,
  Send,
  Wallet,
  ClipboardList,
  Star,
  LineChart,
  Info,
  Server,
  UserX,
  UserPlus,
  Palette,
  ArrowUpRight,
  Repeat,
  Wrench,
  Zap,
  ArrowLeftRight,
  LockKeyhole,
  Users,
  CircleDollarSign,
  Boxes,
  Calculator,
  Gavel,
  FileSignature,
  Coins,
  Landmark,
  Vote,
  Globe,
  Receipt,
  Gem,
  Lock,
  KeyRound,
  EyeOff,
  Layers,
  Banknote,
  HandCoins,
  FileText,
  Pickaxe,
  BarChart3,
  Ticket,
  Trophy,
  FilePlus,
  FileCheck,
  FileClock,
  FileStack,
  Timer,
  Handshake,
  Crown,
  Eye,
  Droplets,
  Package,
  CreditCard,
  Database,
  ListOrdered,
  Clock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { itemAccentStyles, sectionAccentStyles } from "@/lib/accentStyles.js";
import {
  $customTheme,
  getThemeForPage,
  resolveItemAccent,
  resolveSectionAccent,
} from "@/stores/customTheme.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList, updateBlockList } from "@/stores/blocklist.ts";

import { createBlockedAccountStore } from "@/nanoeffects/BlockedAccounts.ts";

const ITEM_ICONS = {
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
  create_account: UserPlus,
  blocked_users: UserX,
  configure_visuals: Palette,
  theme_customizer: Palette,
  page_themes: Layers,
  about: Info,
  create_uia: Gem,
  create_smartcoin: Gem,
  create_liquidity_pool: Droplets,
  airdrop_calculate: Calculator,
  recent_activity: Activity,
  top_markets: TrendingUp,
  top_pools: Droplets,
  docs: BookOpen,
  mcp: Server,
};

// Section metadata (icon + i18n keys). All colors now come from the theme via
// resolveSectionAccent()/resolveItemAccent() + the accent registry.
const SECTION_META = {
  exchanging: { icon: Repeat, titleKey: "PageHeader:exchangingFundsHeading", subtitleKey: "Home:sections.exchangingSubtitle" },
  transfer: { icon: Send, titleKey: "PageHeader:transferFundsHeading", subtitleKey: "Home:sections.transferSubtitle" },
  debt: { icon: Coins, titleKey: "PageHeader:formsOfDebtHeading", subtitleKey: "Home:sections.debtSubtitle" },
  assetCreation: { icon: Gem, titleKey: "PageHeader:assetCreation", subtitleKey: "Home:sections.assetCreationSubtitle" },
  account: { icon: Wallet, titleKey: "PageHeader:accountOverviewsHeading", subtitleKey: "Home:sections.accountSubtitle" },
  blockchain: { icon: Globe, titleKey: "PageHeader:blockchainOverviewsHeading", subtitleKey: "Home:sections.blockchainSubtitle" },
  governance: { icon: Vote, titleKey: "PageHeader:governanceHeading", subtitleKey: "Home:sections.governanceSubtitle" },
  invoicing: { icon: Receipt, titleKey: "PageHeader:invoicingHeading", subtitleKey: "Home:sections.invoicingSubtitle" },
  settings: { icon: Wrench, titleKey: "PageHeader:settingsHeading", subtitleKey: "Home:sections.settingsSubtitle" },
};

export default function Home(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  useStore($customTheme);
  const [isDark, setIsDark] = React.useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  React.useEffect(() => {
    const el = document.documentElement;
    const check = () => setIsDark(el.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const theme = getThemeForPage("index");
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true,
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true,
  );
  const currentNode = useStore($currentNode);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);
  useEffect(() => {
    if (
      blocklist &&
      blocklist.timestamp &&
      usr &&
      usr.chain &&
      usr.chain === "bitshares" &&
      currentNode &&
      currentNode.url
    ) {
      const currentTime = Date.now();
      const isOlderThan24Hours =
        currentTime - blocklist.timestamp > 24 * 60 * 60 * 1000;
      if (isOlderThan24Hours || !blocklist.users.length) {
        const blockListStore = createBlockedAccountStore([
          usr.chain,
          currentNode.url,
        ]);
        const unsub = blockListStore.subscribe((result) => {
          if (result.error) {
            console.error(result.error);
          }
          if (!result.loading && result.data) {
            updateBlockList(result.data);
          }
        });
        return () => {
          unsub();
        };
      }
    }
  }, [usr, currentNode]);

  const exchangingFunds = [
    { key: "dex", href: "/dex.html", titleKey: "Home:dex.title", subtitleKey: "Home:dex.subtitle", hoverKeys: ["Home:dex.hover1", "Home:dex.hover2", "Home:dex.hover3", "Home:dex.hover4"] },
    { key: "instant_trade", href: "/instant_trade.html", titleKey: "Home:instant_trade.title", subtitleKey: "Home:instant_trade.subtitle", hoverKeys: ["Home:instant_trade.hover1", "Home:instant_trade.hover2", "Home:instant_trade.hover3"] },
    { key: "swap", href: "/swap.html", titleKey: "Home:swap.title", subtitleKey: "Home:swap.subtitle", hoverKeys: ["Home:swap.hover1", "Home:swap.hover2", "Home:swap.hover3"] },
    { key: "stake", href: "/stake.html", titleKey: "Home:stake.title", subtitleKey: "Home:stake.subtitle", hoverKeys: ["Home:stake.hover1", "Home:stake.hover2", "Home:stake.hover3"] },
    { key: "barter", href: "/barter.html", titleKey: "Home:barter.title", subtitleKey: "Home:barter.subtitle", hoverKeys: ["Home:barter.hover1", "Home:barter.hover2", "Home:barter.hover3"] },
    { key: "tfund_user", href: "/tfund_user.html", titleKey: "Home:tfund_user.title", subtitleKey: "Home:tfund_user.subtitle", hoverKeys: ["Home:tfund_user.hover1", "Home:tfund_user.hover2", "Home:tfund_user.hover3"] },
  ];

  const transferFunds = [
    { key: "transfer", href: "/transfer.html", titleKey: "Home:transfer.title", subtitleKey: "Home:transfer.subtitle", hoverKeys: ["Home:transfer.hover1"] },
    { key: "timed_transfer", href: "/timed_transfer.html", titleKey: "Home:timed_transfer.title", subtitleKey: "Home:timed_transfer.subtitle", hoverKeys: ["Home:timed_transfer.hover1"] },
    { key: "withdraw_permissions", href: "/withdraw_permissions.html", titleKey: "Home:withdraw_permission.title", subtitleKey: "Home:withdraw_permission.subtitle", hoverKeys: ["Home:withdraw_permission.hover1", "Home:withdraw_permission.hover2"] },
    { key: "htlc", href: "/htlc.html", titleKey: "Home:htlc.title", subtitleKey: "Home:htlc.subtitle", hoverKeys: ["Home:htlc.hover1", "Home:htlc.hover2", "Home:htlc.hover3"] },
    { key: "create_vesting", href: "/create_vesting.html", titleKey: "Home:create_vesting.title", subtitleKey: "Home:create_vesting.subtitle", hoverKeys: ["Home:create_vesting.hover1", "Home:create_vesting.hover2", "Home:create_vesting.hover3", "Home:create_vesting.hover4"] },
    { key: "blind_transfers", href: "/blind_transfers.html", titleKey: "Home:blind_transfers.title", subtitleKey: "Home:blind_transfers.subtitle", hoverKeys: ["Home:blind_transfers.hover1", "Home:blind_transfers.hover2", "Home:blind_transfers.hover3"] },
    { key: "airdrop_calculate", href: "/airdrop_calculate.html", titleKey: "Home:airdrop_calculate.title", subtitleKey: "Home:airdrop_calculate.subtitle", hoverKeys: ["Home:airdrop_calculate.hover1", "Home:airdrop_calculate.hover2", "Home:airdrop_calculate.hover3"] },
  ];

  const formsOfDebt = [
    { key: "borrow", href: "/borrow.html", titleKey: "Home:borrow.title", subtitleKey: "Home:borrow.subtitle", hoverKeys: ["Home:borrow.hover1", "Home:borrow.hover2", "Home:borrow.hover3"] },
    { key: "lend", href: "/lend.html", titleKey: "Home:lend.title", subtitleKey: "Home:lend.subtitle", hoverKeys: ["Home:lend.hover1", "Home:lend.hover2", "Home:lend.hover3"] },
    { key: "smartcoins", href: "/smartcoins.html", titleKey: "Home:smartcoins.title", subtitleKey: "Home:smartcoins.subtitle", hoverKeys: ["Home:smartcoins.hover1", "Home:smartcoins.hover2", "Home:smartcoins.hover3", "Home:smartcoins.hover4"] },
    { key: "tfunds", href: "/tfunds.html", titleKey: "Home:tfunds.title", subtitleKey: "Home:tfunds.subtitle", hoverKeys: ["Home:tfunds.hover1", "Home:tfunds.hover2", "Home:tfunds.hover3", "Home:tfunds.hover4"] },
  ];

  const assetCreation = [
    { key: "create_uia", href: "/create_uia.html", titleKey: "Home:create_uia.title", subtitleKey: "Home:create_uia.subtitle", hoverKeys: ["Home:create_uia.hover1", "Home:create_uia.hover2", "Home:create_uia.hover3"] },
    { key: "create_smartcoin", href: "/create_smartcoin.html", titleKey: "Home:create_smartcoin.title", subtitleKey: "Home:create_smartcoin.subtitle", hoverKeys: ["Home:create_smartcoin.hover1", "Home:create_smartcoin.hover2", "Home:create_smartcoin.hover3"] },
    { key: "create_liquidity_pool", href: "/create_pool.html", titleKey: "Home:create_liquidity_pool.title", subtitleKey: "Home:create_liquidity_pool.subtitle", hoverKeys: ["Home:create_liquidity_pool.hover1", "Home:create_liquidity_pool.hover2", "Home:create_liquidity_pool.hover3"] },
  ];

  const accountOverviews = [
    { key: "portfolio_balances", href: "/balances.html", titleKey: "Home:portfolio_balances.title", subtitleKey: "Home:portfolio_balances.subtitle", hoverKeys: ["Home:portfolio_balances.hover1", "Home:portfolio_balances.hover2", "Home:portfolio_balances.hover3"] },
    { key: "portfolio_open_orders", href: "/open-orders.html", titleKey: "Home:portfolio_open_orders.title", subtitleKey: "Home:portfolio_open_orders.subtitle", hoverKeys: ["Home:portfolio_open_orders.hover1", "Home:portfolio_open_orders.hover2", "Home:portfolio_open_orders.hover3"] },
    { key: "call_orders", href: "/call-orders.html", titleKey: "Home:call_orders.title", subtitleKey: "Home:call_orders.subtitle", hoverKeys: ["Home:call_orders.hover1", "Home:call_orders.hover2", "Home:call_orders.hover3"] },
    { key: "custom_authorities", href: "/custom_authorities.html", titleKey: "Home:custom_authorities.title", subtitleKey: "Home:custom_authorities.subtitle", hoverKeys: ["Home:custom_authorities.hover1", "Home:custom_authorities.hover2", "Home:custom_authorities.hover3"] },
    { key: "favourites", href: "/favourites.html", titleKey: "Home:favourites.title", subtitleKey: "Home:favourites.subtitle", hoverKeys: ["Home:favourites.hover1", "Home:favourites.hover2"] },
    { key: "issued_assets", href: "/issued_assets.html", titleKey: "Home:issued_assets.title", subtitleKey: "Home:issued_assets.subtitle", hoverKeys: ["Home:issued_assets.hover1", "Home:issued_assets.hover2", "Home:issued_assets.hover3"] },
    { key: "offers", href: "/offers.html", titleKey: "Home:offers.title", subtitleKey: "Home:offers.subtitle", hoverKeys: ["Home:offers.hover1", "Home:offers.hover2"] },
    { key: "deals", href: "/deals.html", titleKey: "Home:deals.title", subtitleKey: "Home:deals.subtitle", hoverKeys: ["Home:deals.hover1", "Home:deals.hover2"] },
    { key: "vesting", href: "/vesting.html", titleKey: "Home:vesting.title", subtitleKey: "Home:vesting.subtitle", hoverKeys: ["Home:vesting.hover1", "Home:vesting.hover2"] },
    { key: "proposals", href: "/proposals.html", titleKey: "Home:proposals.title", subtitleKey: "Home:proposals.subtitle", hoverKeys: ["Home:proposals.hover1", "Home:proposals.hover2"] },
    { key: "recent_activity", href: "/recent-activity.html", titleKey: "Home:recent_activity.title", subtitleKey: "Home:recent_activity.subtitle", hoverKeys: ["Home:recent_activity.hover1", "Home:recent_activity.hover2"] },
  ];

  const blockchainOverviews = [
    { key: "blocks", href: "/blocks.html", titleKey: "Home:blocks.title", subtitleKey: "Home:blocks.subtitle", hoverKeys: ["Home:blocks.hover1", "Home:blocks.hover2", "Home:blocks.hover3"] },
    { key: "custom_pool_tracker", href: "/custom_pool_overview.html", titleKey: "Home:custom_pool_tracker.title", subtitleKey: "Home:custom_pool_tracker.subtitle", hoverKeys: ["Home:custom_pool_tracker.hover1", "Home:custom_pool_tracker.hover2"] },
    { key: "pools", href: "/pools.html", titleKey: "Home:pools.title", subtitleKey: "Home:pools.subtitle", hoverKeys: ["Home:pools.hover1", "Home:pools.hover2", "Home:pools.hover3"] },
    { key: "top_markets", href: "/top-markets.html", titleKey: "Home:top_markets.title", subtitleKey: "Home:top_markets.subtitle", hoverKeys: ["Home:top_markets.hover1", "Home:top_markets.hover2"] },
    { key: "top_pools", href: "/top-pools.html", titleKey: "Home:top_pools.title", subtitleKey: "Home:top_pools.subtitle", hoverKeys: ["Home:top_pools.hover1", "Home:top_pools.hover2"] },
  ];

  const governance = [
    { key: "vote", href: "/vote.html", titleKey: "Home:vote.title", subtitleKey: "Home:vote.subtitle", hoverKeys: ["Home:vote.hover1", "Home:vote.hover2", "Home:vote.hover3"] },
    { key: "witnesses", href: "/witnesses.html", titleKey: "Home:witnesses.title", subtitleKey: "Home:witnesses.subtitle", hoverKeys: ["Home:witnesses.hover1", "Home:witnesses.hover2", "Home:witnesses.hover3"] },
    { key: "committee", href: "/committee.html", titleKey: "Home:committee.title", subtitleKey: "Home:committee.subtitle", hoverKeys: ["Home:committee.hover1", "Home:committee.hover2", "Home:committee.hover3"] },
    { key: "governance", href: "/governance.html", titleKey: "Home:governance.title", subtitleKey: "Home:governance.subtitle", hoverKeys: ["Home:governance.hover1", "Home:governance.hover2"] },
    { key: "create_worker", href: "/create_worker.html", titleKey: "Home:create_worker.title", subtitleKey: "Home:create_worker.subtitle", hoverKeys: ["Home:create_worker.hover1", "Home:create_worker.hover2", "Home:create_worker.hover3"] },
    { key: "create_ticket", href: "/create_ticket.html", titleKey: "Home:create_ticket.title", subtitleKey: "Home:create_ticket.subtitle", hoverKeys: ["Home:create_ticket.hover1", "Home:create_ticket.hover2", "Home:create_ticket.hover3"] },
    { key: "ticket_leaderboard", href: "/ticket_leaderboard.html", titleKey: "Home:ticket_leaderboard.title", subtitleKey: "Home:ticket_leaderboard.subtitle", hoverKeys: ["Home:ticket_leaderboard.hover1", "Home:ticket_leaderboard.hover2", "Home:ticket_leaderboard.hover3"] },
  ];

  const invoicing = [
    { key: "invoice_inventory", href: "/invoice_inventory.html", titleKey: "Home:invoice_inventory.title", subtitleKey: "Home:invoice_inventory.subtitle", hoverKeys: ["Home:invoice_inventory.hover1"] },
    { key: "create_invoice", href: "/create_invoice.html", titleKey: "Home:create_invoice.title", subtitleKey: "Home:create_invoice.subtitle", hoverKeys: ["Home:create_invoice.hover1"] },
    { key: "pay_invoice", href: "/pay_invoice.html", titleKey: "Home:pay_invoice.title", subtitleKey: "Home:pay_invoice.subtitle", hoverKeys: ["Home:pay_invoice.hover1", "Home:pay_invoice.hover2"] },
    { key: "stored_invoices", href: "/stored_invoices.html", titleKey: "Home:stored_invoices.title", subtitleKey: "Home:stored_invoices.subtitle", hoverKeys: ["Home:stored_invoices.hover1", "Home:stored_invoices.hover2", "Home:stored_invoices.hover3"] },
  ];

  const settings = [
    { key: "accountLists", href: "/account_lists.html", titleKey: "Home:accountLists.title", subtitleKey: "Home:accountLists.subtitle", hoverKeys: ["Home:accountLists.hover1", "Home:accountLists.hover2", "Home:accountLists.hover3"] },
    { key: "blocked_users", href: "/blocked-users.html", titleKey: "Home:blocked_users.title", subtitleKey: "Home:blocked_users.subtitle", hoverKeys: ["Home:blocked_users.hover1", "Home:blocked_users.hover2"] },
    { key: "ltm", href: "/ltm.html", titleKey: "Home:ltm.title", subtitleKey: "Home:ltm.subtitle", hoverKeys: ["Home:ltm.hover1", "Home:ltm.hover2", "Home:ltm.hover3", "Home:ltm.hover4"] },
    { key: "nodes", href: "/nodes.html", titleKey: "Home:nodes.title", subtitleKey: "Home:nodes.subtitle", hoverKeys: ["Home:nodes.hover1", "Home:nodes.hover2"] },
    { key: "create_account", href: "/create_account.html", titleKey: "Home:create_account.title", subtitleKey: "Home:create_account.subtitle", hoverKeys: ["Home:create_account.hover1", "Home:create_account.hover2"] },
    { key: "configure_visuals", href: "/visuals.html", titleKey: "Home:configure_visuals.title", subtitleKey: "Home:configure_visuals.subtitle", hoverKeys: ["Home:configure_visuals.hover1", "Home:configure_visuals.hover2"] },
    { key: "theme_customizer", href: "/theme.html", titleKey: "Home:theme_customizer.title", subtitleKey: "Home:theme_customizer.subtitle", hoverKeys: ["Home:theme_customizer.hover1", "Home:theme_customizer.hover2"] },
    { key: "page_themes", href: "/page_themes.html", titleKey: "Home:page_themes.title", subtitleKey: "Home:page_themes.subtitle", hoverKeys: ["Home:page_themes.hover1"] },
    { key: "mcp", href: "/mcp.html", titleKey: "Home:mcp.title", subtitleKey: "Home:mcp.subtitle", hoverKeys: ["Home:mcp.hover1"] },
    { key: "docs", href: "docs/docs-index.html", titleKey: "Home:docs.title", subtitleKey: "Home:docs.subtitle", hoverKeys: ["Home:docs.hover1"] },
  ];

  const renderHoverCard = (card, sectionKey) => {
    const Icon = ITEM_ICONS[card.key] || Sparkles;
    const pair = resolveItemAccent(theme, card.key, sectionKey);
    const accent = itemAccentStyles(pair.primary, pair.secondary, isDark);
    return (
      <HoverCard key={card.key} openDelay={120} closeDelay={80}>
        <HoverCardTrigger asChild>
          <a
            href={card.href}
            className="group relative overflow-hidden block rounded-2xl border border-border bg-card/30 p-4 sm:p-5 transition-all duration-200 ease-out hover:border-border hover:bg-accent/50 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity"
              style={accent.bar}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"
              style={accent.glow}
            />
            <div className="relative flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                style={accent.chip}
              >
                <Icon className={cn("h-5 w-5", isDark && "text-white")} style={isDark ? undefined : accent.text} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground leading-snug">
                  {t(card.titleKey)}
                </h3>
                <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground line-clamp-2">
                  {t(card.subtitleKey)}
                </p>
              </div>
              <ArrowUpRight
                className="h-4 w-4 shrink-0 text-muted-foreground/60 -translate-x-0.5 translate-y-0.5 group-hover:text-foreground/80 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-200 ease-out"
                aria-hidden="true"
              />
            </div>
          </a>
        </HoverCardTrigger>
        {card.hoverKeys && card.hoverKeys.length ? (
          <HoverCardContent
            sideOffset={10}
            align="center"
            className="w-80 overflow-hidden rounded-2xl border border-border p-4 text-sm !bg-card text-muted-foreground shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r opacity-80"
              style={accent.bar}
            />
            <ul className="ml-4 list-disc [&>li]:mt-2 marker:text-muted-foreground">
              {card.hoverKeys.map((hoverKey, index) => (
                <li key={`${card.key}-hover-${index}`} className="leading-relaxed">
                  {t(hoverKey)}
                </li>
              ))}
            </ul>
          </HoverCardContent>
        ) : null}
      </HoverCard>
    );
  };

  const renderCardGrid = (cards, sectionKey, gridColsClass = "lg:grid-cols-3") => (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridColsClass} gap-3 sm:gap-4`}>
      {cards.map((card) => renderHoverCard(card, sectionKey))}
    </div>
  );

  const renderSection = (cards, sectionKey) => {
    const meta = SECTION_META[sectionKey] || SECTION_META.settings;
    const pair = resolveSectionAccent(theme, sectionKey);
    const style = sectionAccentStyles(pair.primary, pair.secondary, isDark);
    const SectionIcon = meta.icon;
    return (
      <section className="mt-10 sm:mt-14">
        <div
          className="relative overflow-hidden rounded-2xl border p-4 sm:p-5 bg-gradient-to-br"
          style={{ ...style.border, ...style.bg }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full blur-3xl"
            style={style.blobA}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full blur-3xl"
            style={style.blobB}
          />
          <div className="relative flex items-center gap-3 sm:gap-4">
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
              style={{ ...style.iconBg, ...style.iconBorder }}
            >
              <SectionIcon className={cn("h-5 w-5", isDark && "text-white")} style={isDark ? undefined : style.iconText} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight leading-tight">
                {t(meta.titleKey)}
              </h2>
              <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground leading-snug">
                {t(meta.subtitleKey)}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="hidden md:flex items-center gap-1 pr-1"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={style.dot} />
              <span className="h-1.5 w-1.5 rounded-full opacity-60" style={style.dot} />
              <span className="h-1.5 w-1.5 rounded-full opacity-30" style={style.dot} />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 bottom-0 h-px"
            style={style.underline}
          />
        </div>
        <div className="mt-3 sm:mt-4">
          {renderCardGrid(cards, sectionKey, "lg:grid-cols-3")}
        </div>
      </section>
    );
  };

  return (
    <div className="container mx-auto mt-3 mb-5 px-3 sm:px-4">
      {renderSection(exchangingFunds, "exchanging")}
      {renderSection(transferFunds, "transfer")}
      {renderSection(formsOfDebt, "debt")}
      {renderSection(assetCreation, "assetCreation")}
      {renderSection(accountOverviews, "account")}
      {renderSection(invoicing, "invoicing")}
      {renderSection(governance, "governance")}
      {renderSection(blockchainOverviews, "blockchain")}
      {renderSection(settings, "settings")}
    </div>
  );
}
