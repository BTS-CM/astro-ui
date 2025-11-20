import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useSidebar } from "@/components/ui/sidebar";

export default function AppSidebar() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const exchangingFundsHeading = [
    { title: "Home:dex.title", href: "/dex/index.html" },
    { title: "Home:instant_trade.title", href: "/instant_trade/index.html" },
    { title: "Home:swap.title", href: "/swap/index.html" },
    { title: "Home:stake.title", href: "/stake/index.html" },
    { title: "Home:barter.title", href: "/barter/index.html" },
    { title: "Home:tfund_user.title", href: "/tfund_user/index.html" },
    { title: "Home:prediction_markets.title", href: "/predictions/index.html" },
  ];

  const transferFundsHeading = [
    { title: "Home:transfer.title", href: "/transfer/index.html" },
    { title: "Home:timed_transfer.title", href: "/timed_transfer/index.html" },
    { title: "Home:htlc.title", href: "/htlc/index.html" },
    {
      title: "Home:withdraw_permission.title",
      href: "/withdraw_permissions/index.html",
    },
    { title: "Home:create_vesting.title", href: "/create_vesting/index.html" },
  ];

  const formsOfDebtHeading = [
    { title: "Home:borrow.title", href: "/borrow/index.html" },
    { title: "Home:lend.title", href: "/lend/index.html" },
    { title: "Home:smartcoins.title", href: "/smartcoins/index.html" },
    { title: "Home:tfunds.title", href: "/tfunds/index.html" },
  ];

  const assetCreation = [
    {
      title: "Home:create_prediction.title",
      href: "/create_prediction/index.html",
    },
    { title: "Home:create_uia.title", href: "/create_uia/index.html" },
    {
      title: "Home:create_smartcoin.title",
      href: "/create_smartcoin/index.html",
    },
    {
      title: "Home:create_liquidity_pool.title",
      href: "/create_pool/index.html",
    },
  ];

  const accountOverviewsHeading = [
    { title: "Home:portfolio_balances.title", href: "/balances/index.html" },
    {
      title: "Home:portfolio_open_orders.title",
      href: "/open-orders/index.html",
    },
    {
      title: "Home:portfolio_recent_activity.title",
      href: "/recent-activity/index.html",
    },
    { title: "Home:favourites.title", href: "/favourites/index.html" },
    { title: "Home:issued_assets.title", href: "/issued_assets/index.html" },
    { title: "Home:offers.title", href: "/offers/index.html" },
    { title: "Home:deals.title", href: "/deals/index.html" },
    { title: "Home:vesting.title", href: "/vesting/index.html" },
    { title: "Home:proposals.title", href: "/proposals/index.html" },
  ];

  const blockchainOverviewsHeading = [
    { title: "Home:featured.title", href: "/featured/index.html" },
    { title: "Home:blocks.title", href: "/blocks/index.html" },
    {
      title: "Home:custom_pool_tracker.title",
      href: "/custom_pool_overview/index.html",
    },
    { title: "Home:pools.title", href: "/pools/index.html" },
  ];

  const governanceHeading = [
    { title: "Home:vote.title", href: "/vote/index.html" },
    { title: "Home:witnesses.title", href: "/witnesses/index.html" },
    { title: "Home:committee.title", href: "/committee/index.html" },
    { title: "Home:governance.title", href: "/governance/index.html" },
    { title: "Home:create_worker.title", href: "/create_worker/index.html" },
    { title: "Home:create_ticket.title", href: "/create_ticket/index.html" },
    {
      title: "Home:ticket_leaderboard.title",
      href: "/ticket_leaderboard/index.html",
    },
  ];

  const settingsHeading = [
    { title: "Home:accountLists.title", href: "/account_lists/index.html" },
    { title: "Home:ltm.title", href: "/ltm/index.html" },
    { title: "Home:nodes.title", href: "/nodes/index.html" },
    { title: "Home:create_account.title", href: "/create_account/index.html" },
  ];

  const invoicingHeading = [
    {
      title: "Home:invoice_inventory.title",
      href: "/invoice_inventory/index.html",
    },
    {
      title: "Home:create_invoice.title",
      href: "/create_invoice/index.html",
    },
    {
      title: "Home:pay_invoice.title",
      href: "/pay_invoice/index.html",
    },
    {
      title: "Home:stored_invoices.title",
      href: "/stored_invoices/index.html",
    },
  ];

  const sections = [
    {
      key: "exchanging",
      label: t("PageHeader:exchangingFundsHeading"),
      items: exchangingFundsHeading,
    },
    {
      key: "transfer",
      label: t("PageHeader:transferFundsHeading"),
      items: transferFundsHeading,
    },
    {
      key: "debt",
      label: t("PageHeader:formsOfDebtHeading"),
      items: formsOfDebtHeading,
    },
    {
      key: "assets",
      label: t("PageHeader:assetCreation"),
      items: assetCreation,
    },
    {
      key: "accounts",
      label: t("PageHeader:accountOverviewsHeading"),
      items: accountOverviewsHeading,
    },
    {
      key: "chain",
      label: t("PageHeader:blockchainOverviewsHeading"),
      items: blockchainOverviewsHeading,
    },
    {
      key: "gov",
      label: t("PageHeader:governanceHeading"),
      items: governanceHeading,
    },
    {
      key: "invoicing",
      label: t("PageHeader:invoicingHeading"),
      items: invoicingHeading,
    },
    {
      key: "settings",
      label: t("PageHeader:settingsHeading"),
      items: settingsHeading,
    },
  ];

  const groupEmojis = {
    exchanging: "💱",
    transfer: "💸",
    debt: "🏦",
    accounts: "📊",
    chain: "⛓️",
    assets: "🛠️",
    gov: "🏛️",
    settings: "⚙️",
    invoicing: "🏪",
  };

  const { openMobile, isMobile } = useSidebar();
  const [accValue, setAccValue] = React.useState(sections[0].key);

  React.useEffect(() => {
    // When opening the mobile sidebar sheet, default to the first group
    if (isMobile && openMobile) {
      setAccValue(sections[0].key);
    }
  }, [isMobile, openMobile]);

  return (
    <Sidebar>
      <SidebarContent>
        <Accordion
          type="single"
          collapsible
          value={accValue}
          onValueChange={setAccValue}
          className="w-full"
        >
          {sections.map((section) => (
            <AccordionItem key={section.key} value={section.key}>
              <AccordionTrigger className="py-2 text-sm">
                <SidebarGroupLabel className="px-2 py-0.5 text-[13px]">
                  <span className="mr-2" aria-hidden>
                    {groupEmojis[section.key]}
                  </span>
                  {section.label}
                </SidebarGroupLabel>
              </AccordionTrigger>
              <AccordionContent>
                <SidebarGroup>
                  <SidebarGroupContent className="ml-3 pl-3 border-l border-sidebar-border">
                    <SidebarMenu>
                      {section.items.map((it) => (
                        <SidebarMenuItem key={it.href}>
                          <SidebarMenuButton asChild>
                            <a href={it.href}>
                              <span>{t(it.title)}</span>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SidebarContent>
    </Sidebar>
  );
}
