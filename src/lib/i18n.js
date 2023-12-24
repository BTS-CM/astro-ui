import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { persistentAtom } from "@nanostores/persistent";
import * as fflate from "fflate";

const languages = ["en", "de"];
const pages = [
  "AccountSearch",
  "AccountSelect",
  "AssetDropDownCard",
  "CreateCreditOffer",
  "CreditBorrow",
  "CreditDeals",
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
  "PoolDialogs",
  "PoolForm",
  "PoolStake",
  "PortfolioTabs",
  "Settlement",
  "Smartcoin",
  "Smartcoins",
  "Transfer",
];
const locale = persistentAtom("locale", "en");

async function fetchTranslations() {
  const response = await fetch(`http://localhost:8080/cache/translations/${locale.get()}`);
  if (response.ok) {
    const pageContents = await response.json();

    if (pageContents && pageContents.result) {
      const decompressed = fflate.decompressSync(fflate.strToU8(pageContents.result, true));
      const history = JSON.parse(fflate.strFromU8(decompressed));
      const translations = {};
      translations[locale.get()] = history;
      return translations;
    }
  } else {
    console.error(`Failed to fetch translation cache`);
  }
  return;
}

async function initialize() {
  const resources = await fetchTranslations();

  i18n.use(initReactI18next).init(
    {
      resources,
      lng: "en",
      defaultNS: pages,
      fallbackLng: ["en", "de"],
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

/*
function setLocale(newLocale) {
  locale.setKey("locale", newLocale);
  i18next.changeLanguage(newLocale);
}
*/

export { i18n, locale };
