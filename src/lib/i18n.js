import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { persistentAtom } from "@nanostores/persistent";

const languages = ["en"];
const pages = [
  "borrow",
  "deals",
  "dex",
  "featured",
  "index",
  "ltm",
  "offer",
  "order",
  "portfolio",
  "settlement",
  "smartcoin",
  "smartcoins",
  "stake",
  "transfer",
];

async function fetchLocales() {
  const translations = {};
  for (const language of languages) {
    const localPages = {};
    for (const page of pages) {
      const response = await fetch(`./locales/${language}/${page}.json`);
      if (response.ok) {
        const pageContents = await response.json();
        localPages[page] = pageContents;
      } else {
        console.error(`Failed to fetch: ./locales/${language}/${page}.json`);
      }
    }
    translations[language] = localPages;
  }
  console.log({ translations });
  return translations;
}

const locale = persistentAtom("locale", "en");

i18n.use(initReactI18next).init(
  {
    resources: await fetchLocales(),
    lng: "en",
    defaultNS: pages,
    fallbackLng: ["en"],
    ns: pages,
  },
  (err, t) => {
    if (err) {
      console.log("something went wrong loading", err);
    }
  }
);

/*
function setLocale(newLocale) {
  locale.setKey("locale", newLocale);
  i18next.changeLanguage(newLocale);
}
*/

export { i18n, locale };
