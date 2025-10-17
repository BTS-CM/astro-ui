import React, { useState, useEffect, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { useSyncExternalStore } from "react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
  ItemGroup,
} from "@/components/ui/item";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList, updateBlockList } from "@/stores/blocklist.ts";

import { createBlockedAccountStore } from "@/nanoeffects/BlockedAccounts.ts";

export default function Home(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  useEffect(() => {
    if (
      blocklist &&
      blocklist.timestamp &&
      usr &&
      usr.chain &&
      usr.chain === "bitshares" && // production only block list
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

  return (
    <div className="container mx-auto mt-3 mb-5">
      <div className="relative mb-5 min-h-[420px] flex items-center">
        <svg
          className="pointer-events-none absolute inset-0 -z-10 h-full w-[240%] -left-[70%]"
          viewBox="0 0 2000 600"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="waveGrad4" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="waveGrad5" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.5" />
            </linearGradient>
            <filter
              id="blur-strong"
              x="-200"
              y="-200"
              width="2400"
              height="1000"
              filterUnits="userSpaceOnUse"
            >
              {/* much lighter blur so thin strands remain crisp */}
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <linearGradient id="fadeY" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="black" />
              <stop offset="20%" stopColor="white" />
              <stop offset="80%" stopColor="white" />
              <stop offset="100%" stopColor="black" />
            </linearGradient>
            <mask id="fadeBandMask">
              <rect x="0" y="0" width="2000" height="600" fill="url(#fadeY)" />
            </mask>
          </defs>

          <g
            filter="url(#blur-strong)"
            strokeLinecap="round"
            mask="url(#fadeBandMask)"
          >
            {/* thinner, spaghetti-like strands */}
            <path
              d="M0 320 C 250 200 500 440 750 320 S 1250 200 1500 320 S 2000 440 2000 320"
              stroke="url(#waveGrad2)"
              strokeWidth="14"
              fill="none"
              opacity="0.65"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="-120 4; 120 -4; -120 4"
                dur="36s"
                repeatCount="indefinite"
              />
            </path>

            <path
              d="M0 350 C 260 240 540 460 820 350 S 1380 240 1640 350 S 2000 460 2000 350"
              stroke="url(#waveGrad3)"
              strokeWidth="15"
              fill="none"
              opacity="0.5"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="100 -6; -100 6; 100 -6"
                dur="44s"
                repeatCount="indefinite"
              />
            </path>

            <path
              d="M0 380 C 220 300 440 520 660 380 S 1100 300 1320 380 S 1760 520 2000 380"
              stroke="url(#waveGrad1)"
              strokeWidth="13"
              fill="none"
              opacity="0.55"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="-90 6; 90 -6; -90 6"
                dur="50s"
                repeatCount="indefinite"
              />
            </path>

            <path
              d="M0 300 C 240 200 480 360 720 300 S 1200 200 1440 300 S 1920 360 2000 300"
              stroke="url(#waveGrad4)"
              strokeWidth="11"
              fill="none"
              opacity="0.5"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="140 3; -140 -3; 140 3"
                dur="52s"
                repeatCount="indefinite"
              />
            </path>

            <path
              d="M0 420 C 260 340 520 560 780 420 S 1300 340 1560 420 S 2080 560 2000 420"
              stroke="url(#waveGrad5)"
              strokeWidth="16"
              fill="none"
              opacity="0.45"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="-140 -5; 140 5; -140 -5"
                dur="58s"
                repeatCount="indefinite"
              />
            </path>

            {/* extra thin strands for spaghetti look */}
            <path
              d="M0 340 C 200 260 400 460 600 340 S 1000 260 1200 340 S 1600 460 2000 340"
              stroke="url(#waveGrad1)"
              strokeWidth="7"
              fill="none"
              opacity="0.35"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="-60 2; 60 -2; -60 2"
                dur="30s"
                repeatCount="indefinite"
              />
            </path>

            <path
              d="M0 360 C 180 280 360 480 540 360 S 960 280 1140 360 S 1560 480 2000 360"
              stroke="url(#waveGrad3)"
              strokeWidth="6"
              fill="none"
              opacity="0.32"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="80 -3; -80 3; 80 -3"
                dur="34s"
                repeatCount="indefinite"
              />
            </path>

            {/* duplicated thinner strands (offsets + varied durations) to double density */}
            <path
              d="M0 330 C 250 210 500 430 750 330 S 1250 210 1500 330 S 2000 430 2000 330"
              stroke="url(#waveGrad2)"
              strokeWidth="12"
              fill="none"
              opacity="0.5"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="-100 3; 100 -3; -100 3"
                dur="40s"
                repeatCount="indefinite"
              />
            </path>

            <path
              d="M0 370 C 260 250 540 450 820 370 S 1380 250 1640 370 S 2000 450 2000 370"
              stroke="url(#waveGrad3)"
              strokeWidth="10"
              fill="none"
              opacity="0.42"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="90 -4; -90 4; 90 -4"
                dur="46s"
                repeatCount="indefinite"
              />
            </path>

            <path
              d="M0 395 C 220 310 440 510 660 395 S 1100 310 1320 395 S 1760 510 2000 395"
              stroke="url(#waveGrad1)"
              strokeWidth="11"
              fill="none"
              opacity="0.45"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="-80 5; 80 -5; -80 5"
                dur="52s"
                repeatCount="indefinite"
              />
            </path>

            <path
              d="M0 310 C 240 210 480 350 720 310 S 1200 210 1440 310 S 1920 350 2000 310"
              stroke="url(#waveGrad4)"
              strokeWidth="9"
              fill="none"
              opacity="0.4"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="130 2; -130 -2; 130 2"
                dur="50s"
                repeatCount="indefinite"
              />
            </path>

            <path
              d="M0 430 C 260 350 520 540 780 430 S 1300 350 1560 430 S 2080 540 2000 430"
              stroke="url(#waveGrad5)"
              strokeWidth="8"
              fill="none"
              opacity="0.36"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="-120 -4; 120 4; -120 -4"
                dur="62s"
                repeatCount="indefinite"
              />
            </path>

            <path
              d="M0 345 C 200 265 400 455 600 345 S 1000 265 1200 345 S 1600 455 2000 345"
              stroke="url(#waveGrad1)"
              strokeWidth="6"
              fill="none"
              opacity="0.28"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="-50 2; 50 -2; -50 2"
                dur="32s"
                repeatCount="indefinite"
              />
            </path>
          </g>
        </svg>

        <div className="relative z-10 mx-auto w-full max-w-4xl px-4 text-center flex flex-col items-center justify-center gap-2 mt-6">
          <h1 className="scroll-m-20 text-4xl sm:text-5xl font-extrabold tracking-tight text-balance text-white [text-shadow:_0_1px_10px_rgba(0,0,0,0.35)]">
            A Next Generation Bitshares Client!
          </h1>
          <h2 className="scroll-m-20 text-2xl sm:text-3xl font-semibold tracking-tight text-white [text-shadow:_0_1px_10px_rgba(0,0,0,0.35)]">
            Built with the latest tech, designed for ease of use!
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 justify-items-center">
        <div className="col-span-3">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-5">
            Features
          </h3>
        </div>

        <Item
          key="feature-1"
          variant="outline"
          className="w-full bg-white max-w-sm"
        >
          <ItemMedia variant="icon">⛓️‍💥</ItemMedia>
          <ItemContent>
            <ItemTitle className="text-black">
              Zero authentication required
            </ItemTitle>
            <ItemDescription>
              Construct your blockchain transactions without unlocking any
              accounts!
            </ItemDescription>
          </ItemContent>
        </Item>

        <Item
          key="feature-2"
          variant="outline"
          className="w-full bg-white max-w-sm"
        >
          <ItemMedia variant="icon">📡</ItemMedia>
          <ItemContent>
            <ItemTitle className="text-black">
              Multiple transaction broadcast routes
            </ItemTitle>
            <ItemDescription>
              Broadcast your blockchain operations via QR Codes, Deeplinks or
              local JSON files.
            </ItemDescription>
          </ItemContent>
        </Item>

        <Item
          key="feature-3"
          variant="outline"
          className="w-full bg-white max-w-sm"
        >
          <ItemMedia variant="icon">🧑‍🔬</ItemMedia>
          <ItemContent>
            <ItemTitle className="text-black">
              Supports the latest Bitshares features!
            </ItemTitle>
            <ItemDescription>
              Interested in the latest Bitshares DEX improvements? We've got you
              covered!
            </ItemDescription>
          </ItemContent>
        </Item>

        <Item
          key="feature-4"
          variant="outline"
          className="w-full bg-white max-w-sm"
        >
          <ItemMedia variant="icon">🌐</ItemMedia>
          <ItemContent>
            <ItemTitle className="text-black">
              Easily switch between supported blockchains!
            </ItemTitle>
            <ItemDescription>
              It takes seconds to switch between Bitshares mainnet and testnet
              networks!
            </ItemDescription>
          </ItemContent>
        </Item>

        <Item
          key="feature-5"
          variant="outline"
          className="w-full bg-white max-w-sm"
        >
          <ItemMedia variant="icon">🚀</ItemMedia>
          <ItemContent>
            <ItemTitle className="text-black">
              Near-instant blockchain operations!
            </ItemTitle>
            <ItemDescription>
              With three second block timings your broadcast operations are
              verified almost instantly!
            </ItemDescription>
          </ItemContent>
        </Item>

        <Item
          key="feature-6"
          variant="outline"
          className="w-full bg-white max-w-sm"
        >
          <ItemMedia variant="icon">🌲</ItemMedia>
          <ItemContent>
            <ItemTitle className="text-black">
              Built with evergreen technologies!
            </ItemTitle>
            <ItemDescription>
              Using the latest web technologies for a fast, secure and reliable
              Bitshares future!
            </ItemDescription>
          </ItemContent>
        </Item>
      </div>
      <Accordion
        type="single"
        collapsible
        className="w-full mt-10"
        defaultValue="item-1"
      >
        <AccordionItem value="item-1">
          <AccordionTrigger>
            <h4 className="mb-2">{t("PageHeader:exchangingFundsHeading")}</h4>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <div className="grid grid-cols-5 gap-3">
              <HoverCard key="dex">
                <HoverCardTrigger asChild>
                  <a href="/dex/index.html" style={{ textDecoration: "none" }}>
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:dex.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:dex.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:dex.hover1")}</li>
                    <li>{t("Home:dex.hover2")}</li>
                    <li>{t("Home:dex.hover3")}</li>
                    <li>{t("Home:dex.hover4")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="swap">
                <HoverCardTrigger asChild>
                  <a href="/swap/index.html" style={{ textDecoration: "none" }}>
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:swap.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:swap.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:swap.hover1")}</li>
                    <li>{t("Home:swap.hover2")}</li>
                    <li>{t("Home:swap.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="poolStake">
                <HoverCardTrigger asChild>
                  <a
                    href="/stake/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:stake.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:stake.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:stake.hover1")}</li>
                    <li>{t("Home:stake.hover2")}</li>
                    <li>{t("Home:stake.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="transfer">
                <HoverCardTrigger asChild>
                  <a
                    href="/transfer/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:transfer.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:transfer.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:transfer.hover1")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="timed_transfer">
                <HoverCardTrigger asChild>
                  <a
                    href="/timed_transfer/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:timed_transfer.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:timed_transfer.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:timed_transfer.hover1")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="withdraw_permissions">
                <HoverCardTrigger asChild>
                  <a
                    href="/withdraw_permissions/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>
                          {t("Home:withdraw_permission.title")}
                        </CardTitle>
                        <CardDescription>
                          {t("Home:withdraw_permission.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:withdraw_permission.hover1")}</li>
                    <li>{t("Home:withdraw_permission.hover2")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="htlc">
                <HoverCardTrigger asChild>
                  <a href="/htlc/index.html" style={{ textDecoration: "none" }}>
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:htlc.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:htlc.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:htlc.hover1")}</li>
                    <li>{t("Home:htlc.hover2")}</li>
                    <li>{t("Home:htlc.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="create_vesting">
                <HoverCardTrigger asChild>
                  <a
                    href="/create_vesting/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:create_vesting.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:create_vesting.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:create_vesting.hover1")}</li>
                    <li>{t("Home:create_vesting.hover2")}</li>
                    <li>{t("Home:create_vesting.hover3")}</li>
                    <li>{t("Home:create_vesting.hover4")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="barter">
                <HoverCardTrigger asChild>
                  <a
                    href="/barter/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:barter.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:barter.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:barter.hover1")}</li>
                    <li>{t("Home:barter.hover2")}</li>
                    <li>{t("Home:barter.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger>
            <h4 className="mt-3 mb-2">{t("PageHeader:formsOfDebtHeading")}</h4>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <div className="grid grid-cols-5 gap-3">
              <HoverCard key="borrow">
                <HoverCardTrigger asChild>
                  <a
                    href="/borrow/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:borrow.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:borrow.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:borrow.hover1")}</li>
                    <li>{t("Home:borrow.hover2")}</li>
                    <li>{t("Home:borrow.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="lend">
                <HoverCardTrigger asChild>
                  <a href="/lend/index.html" style={{ textDecoration: "none" }}>
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:lend.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:lend.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:lend.hover1")}</li>
                    <li>{t("Home:lend.hover2")}</li>
                    <li>{t("Home:lend.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="smartcoins">
                <HoverCardTrigger asChild>
                  <a
                    href="/smartcoins/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:smartcoins.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:smartcoins.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:smartcoins.hover1")}</li>
                    <li>{t("Home:smartcoins.hover2")}</li>
                    <li>{t("Home:smartcoins.hover3")}</li>
                    <li>{t("Home:smartcoins.hover4")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="tfunds">
                <HoverCardTrigger asChild>
                  <a
                    href="/tfunds/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:tfunds.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:tfunds.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:tfunds.hover1")}</li>
                    <li>{t("Home:tfunds.hover2")}</li>
                    <li>{t("Home:tfunds.hover3")}</li>
                    <li>{t("Home:tfunds.hover4")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="tfunds">
                <HoverCardTrigger asChild>
                  <a
                    href="/tfund_user/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:tfund_user.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:tfund_user.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:tfund_user.hover1")}</li>
                    <li>{t("Home:tfund_user.hover2")}</li>
                    <li>{t("Home:tfund_user.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger>
            <h4 className="mt-3 mb-2">
              {t("PageHeader:accountOverviewsHeading")}
            </h4>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <div className="grid grid-cols-5 gap-3">
              <HoverCard key="portfolio">
                <HoverCardTrigger asChild>
                  <a
                    href="/portfolio/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:portfolio.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:portfolio.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:portfolio.hover1")}</li>
                    <li>{t("Home:portfolio.hover2")}</li>
                    <li>{t("Home:portfolio.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="deals">
                <HoverCardTrigger asChild>
                  <a
                    href="/deals/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:deals.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:deals.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:deals.hover1")}</li>
                    <li>{t("Home:deals.hover2")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="offers">
                <HoverCardTrigger asChild>
                  <a
                    href="/offers/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:offers.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:offers.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:offers.hover1")}</li>
                    <li>{t("Home:offers.hover2")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="vesting">
                <HoverCardTrigger asChild>
                  <a
                    href="/vesting/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:vesting.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:vesting.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:vesting.hover1")}</li>
                    <li>{t("Home:vesting.hover2")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="proposals">
                <HoverCardTrigger asChild>
                  <a
                    href="/proposals/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:proposals.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:proposals.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:proposals.hover1")}</li>
                    <li>{t("Home:proposals.hover2")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="issued_assets">
                <HoverCardTrigger asChild>
                  <a
                    href="/issued_assets/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:issued_assets.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:issued_assets.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:issued_assets.hover1")}</li>
                    <li>{t("Home:issued_assets.hover2")}</li>
                    <li>{t("Home:issued_assets.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger>
            <h4 className="mt-3 mb-2">
              {t("PageHeader:blockchainOverviewsHeading")}
            </h4>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <div className="grid grid-cols-5 gap-3">
              <HoverCard key="featured">
                <HoverCardTrigger asChild>
                  <a
                    href="/featured/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:featured.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:featured.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:featured.hover1")}</li>
                    <li>{t("Home:featured.hover2")}</li>
                    <li>{t("Home:featured.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="custom_pool_tracker">
                <HoverCardTrigger asChild>
                  <a
                    href="/custom_pool_overview/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>
                          {t("Home:custom_pool_tracker.title")}
                        </CardTitle>
                        <CardDescription>
                          {t("Home:custom_pool_tracker.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:custom_pool_tracker.hover1")}</li>
                    <li>{t("Home:custom_pool_tracker.hover2")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="pools">
                <HoverCardTrigger asChild>
                  <a
                    href="/pools/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:pools.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:pools.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:pools.hover1")}</li>
                    <li>{t("Home:pools.hover2")}</li>
                    <li>{t("Home:pools.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="predictions">
                <HoverCardTrigger asChild>
                  <a
                    href="/predictions/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>
                          {t("Home:prediction_markets.title")}
                        </CardTitle>
                        <CardDescription>
                          {t("Home:prediction_markets.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:prediction_markets.hover1")}</li>
                    <li>{t("Home:prediction_markets.hover2")}</li>
                    <li>{t("Home:prediction_markets.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="blocks">
                <HoverCardTrigger asChild>
                  <a
                    href="/blocks/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:blocks.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:blocks.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:blocks.hover1")}</li>
                    <li>{t("Home:blocks.hover2")}</li>
                    <li>{t("Home:blocks.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="witnesses">
                <HoverCardTrigger asChild>
                  <a
                    href="/witnesses/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:witnesses.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:witnesses.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:witnesses.hover1")}</li>
                    <li>{t("Home:witnesses.hover2")}</li>
                    <li>{t("Home:witnesses.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="committee">
                <HoverCardTrigger asChild>
                  <a
                    href="/committee/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:committee.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:committee.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:committee.hover1")}</li>
                    <li>{t("Home:committee.hover2")}</li>
                    <li>{t("Home:committee.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger>
            <h4 className="mt-3 mb-2">{t("PageHeader:assetCreation")}</h4>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <div className="grid grid-cols-5 gap-3">
              <HoverCard key="create_prediction">
                <HoverCardTrigger asChild>
                  <a
                    href="/create_prediction/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>
                          {t("Home:create_prediction.title")}
                        </CardTitle>
                        <CardDescription>
                          {t("Home:create_prediction.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:create_prediction.hover1")}</li>
                    <li>{t("Home:create_prediction.hover2")}</li>
                    <li>{t("Home:create_prediction.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="create_uia">
                <HoverCardTrigger asChild>
                  <a
                    href="/create_uia/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:create_uia.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:create_uia.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:create_uia.hover1")}</li>
                    <li>{t("Home:create_uia.hover2")}</li>
                    <li>{t("Home:create_uia.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="create_smartcoin">
                <HoverCardTrigger asChild>
                  <a
                    href="/create_smartcoin/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>
                          {t("Home:create_smartcoin.title")}
                        </CardTitle>
                        <CardDescription>
                          {t("Home:create_smartcoin.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:create_smartcoin.hover1")}</li>
                    <li>{t("Home:create_smartcoin.hover2")}</li>
                    <li>{t("Home:create_smartcoin.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-6">
          <AccordionTrigger>
            <h4 className="mt-3 mb-2">{t("PageHeader:settingsHeading")}</h4>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <div className="grid grid-cols-5 gap-3">
              <HoverCard key="accountLists">
                <HoverCardTrigger asChild>
                  <a
                    href="/account_lists/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:accountLists.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:accountLists.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:accountLists.hover1")}</li>
                    <li>{t("Home:accountLists.hover2")}</li>
                    <li>{t("Home:accountLists.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="ltm">
                <HoverCardTrigger asChild>
                  <a href="/ltm/index.html" style={{ textDecoration: "none" }}>
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:ltm.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:ltm.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:ltm.hover1")}</li>
                    <li>{t("Home:ltm.hover2")}</li>
                    <li>{t("Home:ltm.hover3")}</li>
                    <li>{t("Home:ltm.hover4")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="nodes">
                <HoverCardTrigger asChild>
                  <a
                    href="/nodes/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:nodes.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:nodes.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:nodes.hover1")}</li>
                    <li>{t("Home:nodes.hover2")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="create_account">
                <HoverCardTrigger asChild>
                  <a
                    href="/create_account/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:create_account.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:create_account.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:create_account.hover1")}</li>
                    <li>{t("Home:create_account.hover2")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="governance">
                <HoverCardTrigger asChild>
                  <a
                    href="/governance/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:governance.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:governance.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:governance.hover1")}</li>
                    <li>{t("Home:governance.hover2")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>

              <HoverCard key="create_worker">
                <HoverCardTrigger asChild>
                  <a
                    href="/create_worker/index.html"
                    style={{ textDecoration: "none" }}
                  >
                    <Card className="h-full hover:shadow-md hover:shadow-black">
                      <CardHeader>
                        <CardTitle>{t("Home:create_worker.title")}</CardTitle>
                        <CardDescription>
                          {t("Home:create_worker.subtitle")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm pt-1">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Home:create_worker.hover1")}</li>
                    <li>{t("Home:create_worker.hover2")}</li>
                    <li>{t("Home:create_worker.hover3")}</li>
                  </ul>
                </HoverCardContent>
              </HoverCard>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
