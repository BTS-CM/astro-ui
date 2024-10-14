import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { persistentAtom } from "@nanostores/persistent";

const languages = ["en", "da", "de", "es", "fr", "it", "ja", "ko", "pt", "th"];
const pages = [
  "AccountSearch",
  "AccountSelect",
  "AssetDropDownCard",
  "CreditOfferEditor",
  "CreditBorrow",
  "CreditOffers",
  "CreditDeals",
  "CreditOffer",
  "CurrentUser",
  "DeepLinkDialog",
  "ExternalLink",
  "Featured",
  "Home",
  "CreatePrediction",
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
  "SimpleSwap",
  "Vesting",
  "Predictions",
  "SameTFunds",
  "CreateVestingBalance",
  "CreateUIA",
  "IssuedAssets",
  "AssetCommon",
  "CreateSmartcoin",
  "LiveBlocks",
  "AccountLists",
  "Proposals",
  "Operations",
];

const locale = persistentAtom("locale", "en");

async function fetchTranslations() {
  const _locale = locale.get();

  const translations = {};
  const localPages = {};
  for (const page of pages) {
    let response;
    if (window && window.electron) {
      response = await fetch(`/locales/${_locale}/${page}.json`);
    } else {
      response = await fetch(`../src/data/locales/${_locale}/${page}.json`);
    }
    if (response) {
      const jsonContents = await response.json();
      localPages[page] = jsonContents;
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
    }
  );
}

initialize();

export { i18n, locale };
