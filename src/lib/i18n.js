import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { persistentAtom } from "@nanostores/persistent";

import { applyWindowUI } from "./windowTitle.js";

const languages = ["en", "da", "de", "es", "et", "fr", "it", "ja", "ko", "pt", "th"];
const pages = [
  "Activity",
  "AccountSearch",
  "AccountSelect",
  "AssetDropDownCard",
  "Beautification",
  "Blocklist",
  "CreatePool",
  "CreditOfferEditor",
  "CreditBorrow",
  "CreditOffers",
  "CreditDeals",
  "CreditDealUpdate",
  "CreditOffer",
  "CurrentUser",
  "DeepLinkDialog",
  "ExternalLink",
  "Featured",
  "Home",
  "LimitOrderCard",
  "LTM",
  "Market",
  "MarketAssetCard",
  "MarketOrder",
  "MarketOrderCard",
  "MarketPlaceholder",
  "MarketSummaryTabs",
  "MarketTradeContents",
  "MyCompletedTrades",
  "MyOpenOrders",
  "MyOrderSummary",
  "MyTradeSummary",
  "PageHeader",
  "PageFooter",
  "PoolDialogs",
  "PoolForm",
  "PoolStake",
  "PortfolioTabs",
  "Settlement",
  "Smartcoin",
  "Smartcoins",
  "Transfer",
  "Nodes",
  "NetworkFees",
  "SimpleSwap",
  "Vesting",
  "SameTFunds",
  "CreateVestingBalance",
  "CreateUIA",
  "IssuedAssets",
  "AssetCommon",
  "CreateSmartcoin",
  "LiveBlocks",
  "AccountLists",
  "Proposals",
  "Airdrop",
  "AirdropCalculate",
  "Operations",
  "PoolTracker",
  "CreateAccount",
  "TFundUser",
  "LimitOrderWizard",
  "CustomPoolOverview",
  "PoolList",
  "WithdrawPermissions",
  "WithdrawDialog",
  "HTLC",
  "HTLCCreate",
  "Barter",
  "CallOrders",
  "CustomAuthorities",
  "BlindTransfers",
  "BlindAccounts",
  "GovernanceActions",
  "WorkerCreate",
  "CommitteeMembers",
  "CommitteeParams",
  "Witnesses",
  "Voting",
  "CreateTicket",
  "TicketsLeaderboard",
  "MonthlyReferrer",
  "ChangePassword",
  "Favourites",
  "Inventory",
  "InvoiceCreator",
  "PayInvoice",
  "InvoiceStorage",
  "InstantTrade",
  "SubscriptionFooter",
  "Visuals",
  "ThemeCustomizer",
  "PageThemes",
  "Explorer",
  "Common",
  "Charts",
  "PageTitles"
];

const locale = persistentAtom("locale", "en");

async function fetchTranslations() {
  const _locale = locale.get();

  const translations = {};
  const localPages = {};
  for (const page of pages) {
    let response;
    try {
      if (typeof window !== "undefined" && window.electron) {
        response = await fetch(`/locales/${_locale}/${page}.json`);
      } else {
        response = await fetch(`../src/data/locales/${_locale}/${page}.json`);
      }
    } catch (err) {
      console.warn(`Failed fetching locale file for ${page} (${_locale}):`, err);
      continue;
    }

    if (!response || !response.ok) {
      console.warn(
        `Locale file missing or not OK for ${page} (${_locale}):`,
        response && response.status
      );
      continue;
    }

    try {
      const jsonContents = await response.json();
      localPages[page] = jsonContents;
    } catch (err) {
      console.warn(`Failed parsing locale JSON for ${page} (${_locale}):`, err);
      continue;
    }
  }

  translations[_locale] = localPages;

  return translations;
}

async function initialize() {
  const resources = await fetchTranslations();

  i18n.use(initReactI18next).init(
    {
      resources,
      lng: "en",
      defaultNS: pages,
      fallbackLng: languages,
      ns: pages,
    },
    (err, t) => {
      if (err) {
        console.log("something went wrong loading", err);
      }
      applyWindowUI();
    }
  );
}

initialize();

export { i18n, locale };
