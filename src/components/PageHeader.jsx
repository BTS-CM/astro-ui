import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { HamburgerMenuIcon, ReloadIcon } from "@radix-ui/react-icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

import { Button } from "@/components/ui/button";

function MenuRow(properties) {
  const { url, text, icon } = properties;

  const [hover, setHover] = useState(false);
  const [isCurrentPage, setIsCurrentPage] = useState(false);

  useEffect(() => {
    setIsCurrentPage(window.location.pathname === url);
  }, [url]);

  const [clicked, setClicked] = useState(false);

  return (
    <a
      href={url}
      onClick={() => {
        setClicked(true);
        if (window.location.pathname === "/blocks/index.html") {
          window.electron.stopBlocks({});
        }
      }}
    >
      <CommandItem
        onMouseEnter={() => {
          setHover(true);
        }}
        onMouseLeave={() => {
          setHover(false);
        }}
        style={{
          backgroundColor: hover || isCurrentPage ? "#F1F1F1" : "",
        }}
      >
        <span className="grid grid-cols-8 w-full">
          <span className="col-span-1">{icon}</span>
          <span className="col-span-6">{text}</span>
          <span className="col-span-1 text-right">
            {clicked && !isCurrentPage ? <ReloadIcon className="ml-2 mt-1 animate-spin" /> : ""}
          </span>
        </span>
      </CommandItem>
    </a>
  );
}

function LanguageRow(properties) {
  const { language, text, i18n } = properties;

  const [hover, setHover] = useState(false);
  const [isCurrentLanguage, setIsCurrentLanguage] = useState(false);

  useEffect(() => {
    setIsCurrentLanguage(language === locale.get());
  }, [language]);

  return (
    <CommandItem
      onMouseEnter={() => {
        setHover(true);
      }}
      onMouseLeave={() => {
        setHover(false);
      }}
      onSelect={() => {
        i18n.changeLanguage(language);
        locale.set(language);
        window.location.reload();
      }}
      style={{
        backgroundColor: hover || isCurrentLanguage ? "#F1F1F1" : "",
      }}
    >
      <span className="grid grid-cols-8 w-full">
        <span className="col-span-6">{text}</span>
        <span className="col-span-1 text-right">{isCurrentLanguage ? "✓" : ""}</span>
      </span>
    </CommandItem>
  );
}

export default function PageHeader(properties) {
  const { page, backURL } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <>
      <div key={`header`} className="container mx-auto mb-3">
        <div className="grid grid-cols-12">
          <div className="col-span-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <HamburgerMenuIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-10 p-0" side="end">
                <Command className="rounded-lg border shadow-md">
                  <CommandInput placeholder={t("PageHeader:commandSearchPlaceholder")} />
                  <CommandList>
                    <CommandEmpty>{t("PageHeader:noResultsFound")}</CommandEmpty>
                    <CommandGroup heading={t("PageHeader:exchangingFundsHeading")}>
                      <MenuRow
                        url="/dex/index.html"
                        text={t("PageHeader:dexLimitOrders")}
                        icon="📈"
                      />
                      <MenuRow
                        url="/pool/index.html"
                        text={t("PageHeader:poolExchange")}
                        icon="💱"
                      />
                      <MenuRow url="/swap/index.html" text={t("PageHeader:simpleSwap")} icon="🔄" />
                      <MenuRow url="/stake/index.html" text={t("PageHeader:poolStake")} icon="🔒" />
                      <MenuRow
                        url="/transfer/index.html"
                        text={t("PageHeader:transferAssets")}
                        icon="💸"
                      />
                      <MenuRow
                        url="/create_vesting/index.html"
                        text={t("PageHeader:vestAssets")}
                        icon="🫰"
                      />
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading={t("PageHeader:formsOfDebtHeading")}>
                      <MenuRow
                        url="/borrow/index.html"
                        text={t("PageHeader:borrowFunds")}
                        icon="🏦"
                      />
                      <MenuRow
                        url="/lend/index.html"
                        text={t("PageHeader:createOffer")}
                        icon="📝"
                      />
                      <MenuRow
                        url="/smartcoins/index.html"
                        text={t("PageHeader:createDebt")}
                        icon="💵"
                      />
                      <MenuRow
                        url="/tfunds/index.html"
                        text={t("PageHeader:sameTFunds")}
                        icon="🤖"
                      />
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading={t("PageHeader:overviewsHeading")}>
                      <MenuRow
                        url="/portfolio/index.html"
                        text={t("PageHeader:portfolio")}
                        icon="💰"
                      />
                      <MenuRow
                        url="/featured/index.html"
                        text={t("PageHeader:topMarkets")}
                        icon="🏆"
                      />
                      <MenuRow
                        url="/deals/index.html"
                        text={t("PageHeader:creditDeals")}
                        icon="🤝"
                      />
                      <MenuRow
                        url="/offers/index.html"
                        text={t("PageHeader:creditOffers")}
                        icon="📜"
                      />
                      <MenuRow
                        url="/vesting/index.html"
                        text={t("PageHeader:vestingBalances")}
                        icon="⌚"
                      />
                      <MenuRow
                        url="/predictions/index.html"
                        text={t("PageHeader:predictions")}
                        icon="🎲"
                      />
                      <MenuRow
                        url="/proposals/index.html"
                        text={t("PageHeader:proposals")}
                        icon="🤔"
                      />
                      <MenuRow
                        url="/issued_assets/index.html"
                        text={t("PageHeader:issuedAssets")}
                        icon="📃"
                      />
                      <MenuRow
                        url="/blocks/index.html"
                        text={t("PageHeader:blockExplorer")}
                        icon="💾"
                      />
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading={t("PageHeader:assetsHeading")}>
                      <MenuRow
                        url="/create_prediction/index.html"
                        text={t("PageHeader:createPrediction")}
                        icon="🔮"
                      />
                      <MenuRow
                        url="/create_uia/index.html"
                        text={t("PageHeader:create_uia")}
                        icon="🍬"
                      />
                      <MenuRow
                        url="/create_smartcoin/index.html"
                        text={t("PageHeader:create_smartcoin")}
                        icon="💷"
                      />
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading={t("PageHeader:settingsHeading")}>
                      <MenuRow
                        url="/account_lists/index.html"
                        text={t("PageHeader:accountLists")}
                        icon="📋"
                      />
                      <MenuRow url="/ltm/index.html" text={t("PageHeader:buyLTM")} icon="🏅" />
                      <MenuRow url="/nodes/index.html" text={t("PageHeader:nodes")} icon="🌐" />
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="col-span-8 text-center">
            <h2>
              <a
                href="/index.html"
                onClick={() => {
                  if (window.location.pathname === "/blocks/index.html") {
                    window.electron.stopBlocks({});
                  }
                }}
              >
                {page && page === "index" ? t("PageHeader:welcomeMessage") : ""}
                <span
                  style={{
                    backgroundImage: "var(--accent-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundSize: "400%",
                    backgroundPosition: "0%",
                  }}
                >
                  {t("PageHeader:uiName")}
                </span>
              </a>
            </h2>
            <h4 className="text-muted-foreground">{t(`PageHeader:descText.${page}`)}</h4>
          </div>
          <div className="col-span-2 text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <svg viewBox="0 0 512 512" fill="currentColor" height="1em" width="1em">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={32}
                      d="M48 112h288M192 64v48M272 448l96-224 96 224M301.5 384h133M281.3 112S257 206 199 277 80 384 80 384"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={32}
                      d="M256 336s-35-27-72-75-56-85-56-85"
                    />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-10 p-0" side="end">
                <Command className="rounded-lg border shadow-md">
                  <CommandInput placeholder={t("PageHeader:commandSearchPlaceholder")} />
                  <CommandList>
                    <CommandEmpty>{t("PageHeader:noResultsFound")}</CommandEmpty>
                    <CommandGroup heading={t("PageHeader:exchangingFundsHeading")}>
                      <LanguageRow language="en" i18n={i18n} text={t("PageHeader:english")} />
                      <LanguageRow language="da" i18n={i18n} text={t("PageHeader:danish")} />
                      <LanguageRow language="de" i18n={i18n} text={t("PageHeader:german")} />
                      <LanguageRow language="es" i18n={i18n} text={t("PageHeader:spanish")} />
                      <LanguageRow language="fr" i18n={i18n} text={t("PageHeader:french")} />
                      <LanguageRow language="it" i18n={i18n} text={t("PageHeader:italian")} />
                      <LanguageRow language="ja" i18n={i18n} text={t("PageHeader:japanese")} />
                      <LanguageRow language="ko" i18n={i18n} text={t("PageHeader:korean")} />
                      <LanguageRow language="pt" i18n={i18n} text={t("PageHeader:portuguese")} />
                      <LanguageRow language="th" i18n={i18n} text={t("PageHeader:thai")} />
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
}
