import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { persistentAtom } from "@nanostores/persistent";

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
  const _locale = locale.get();

  if (_parsed && _parsed.locale && _parsed.locale === _locale) {
    console.log(`Using cached ${locale.get()} translations`);
    return _parsed.translations;
  }

  const translations = {};
  const localPages = {};
  for (const page of pages) {
    const filePath = `../data/locales/${_locale}/${page}.json`;
    const response = await fetch(filePath);
    const jsonContents = await response.json();
    localPages[page] = jsonContents;
  }

  translations[_locale] = localPages;

  storedLocale.set(JSON.stringify({ translations, locale: _locale }));
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
