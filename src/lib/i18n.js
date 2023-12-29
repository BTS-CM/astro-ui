import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { persistentAtom } from "@nanostores/persistent";
import * as fflate from "fflate";

const languages = ["en", "da", "de", "es", "fr", "it", "ja", "ko", "pt", "th"];
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
const storedLocale = persistentAtom("storedLocale", "");

async function fetchTranslations() {
  const _stored = storedLocale.get();
  const _parsed = _stored ? JSON.parse(_stored) : null;
  if (_parsed && _parsed.locale && _parsed.locale === locale.get()) {
    console.log(`Using cached ${locale.get()} translations`);
    return _parsed.translations;
  }
  const response = await fetch(`http://localhost:8080/cache/translations/${locale.get()}`);
  if (response.ok) {
    const pageContents = await response.json();

    if (pageContents && pageContents.result) {
      const decompressed = fflate.decompressSync(fflate.strToU8(pageContents.result, true));
      const history = JSON.parse(fflate.strFromU8(decompressed));
      const translations = {};
      translations[locale.get()] = history;
      storedLocale.set(JSON.stringify({ translations, locale: locale.get() }));
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
