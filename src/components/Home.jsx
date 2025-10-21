import React, { useEffect, useMemo } from "react";
import WaveHero from "./WaveHero";
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

  const accordionSections = [
    {
      value: "item-1",
      icon: "💱",
      headingKey: "PageHeader:exchangingFundsHeading",
      cards: [
        {
          key: "dex",
          href: "/dex/index.html",
          titleKey: "Home:dex.title",
          subtitleKey: "Home:dex.subtitle",
          hoverKeys: [
            "Home:dex.hover1",
            "Home:dex.hover2",
            "Home:dex.hover3",
            "Home:dex.hover4",
          ],
        },
        {
          key: "swap",
          href: "/swap/index.html",
          titleKey: "Home:swap.title",
          subtitleKey: "Home:swap.subtitle",
          hoverKeys: [
            "Home:swap.hover1",
            "Home:swap.hover2",
            "Home:swap.hover3",
          ],
        },
        {
          key: "poolStake",
          href: "/stake/index.html",
          titleKey: "Home:stake.title",
          subtitleKey: "Home:stake.subtitle",
          hoverKeys: [
            "Home:stake.hover1",
            "Home:stake.hover2",
            "Home:stake.hover3",
          ],
        },
        {
          key: "barter",
          href: "/barter/index.html",
          titleKey: "Home:barter.title",
          subtitleKey: "Home:barter.subtitle",
          hoverKeys: [
            "Home:barter.hover1",
            "Home:barter.hover2",
            "Home:barter.hover3",
          ],
        },
        {
          key: "tfunds",
          href: "/tfund_user/index.html",
          titleKey: "Home:tfund_user.title",
          subtitleKey: "Home:tfund_user.subtitle",
          hoverKeys: [
            "Home:tfund_user.hover1",
            "Home:tfund_user.hover2",
            "Home:tfund_user.hover3",
          ],
        },
        {
          key: "predictions",
          href: "/predictions/index.html",
          titleKey: "Home:prediction_markets.title",
          subtitleKey: "Home:prediction_markets.subtitle",
          hoverKeys: [
            "Home:prediction_markets.hover1",
            "Home:prediction_markets.hover2",
            "Home:prediction_markets.hover3",
          ],
        },
      ],
    },
    {
      value: "item-2",
      icon: "📩",
      headingKey: "PageHeader:transferFundsHeading",
      cards: [
        {
          key: "transfer",
          href: "/transfer/index.html",
          titleKey: "Home:transfer.title",
          subtitleKey: "Home:transfer.subtitle",
          hoverKeys: ["Home:transfer.hover1"],
        },
        {
          key: "timed_transfer",
          href: "/timed_transfer/index.html",
          titleKey: "Home:timed_transfer.title",
          subtitleKey: "Home:timed_transfer.subtitle",
          hoverKeys: ["Home:timed_transfer.hover1"],
        },
        {
          key: "withdraw_permissions",
          href: "/withdraw_permissions/index.html",
          titleKey: "Home:withdraw_permission.title",
          subtitleKey: "Home:withdraw_permission.subtitle",
          hoverKeys: [
            "Home:withdraw_permission.hover1",
            "Home:withdraw_permission.hover2",
          ],
        },
        {
          key: "htlc",
          href: "/htlc/index.html",
          titleKey: "Home:htlc.title",
          subtitleKey: "Home:htlc.subtitle",
          hoverKeys: [
            "Home:htlc.hover1",
            "Home:htlc.hover2",
            "Home:htlc.hover3",
          ],
        },
        {
          key: "create_vesting",
          href: "/create_vesting/index.html",
          titleKey: "Home:create_vesting.title",
          subtitleKey: "Home:create_vesting.subtitle",
          hoverKeys: [
            "Home:create_vesting.hover1",
            "Home:create_vesting.hover2",
            "Home:create_vesting.hover3",
            "Home:create_vesting.hover4",
          ],
        },
      ],
    },
    {
      value: "item-3",
      icon: "🏦",
      headingKey: "PageHeader:formsOfDebtHeading",
      cards: [
        {
          key: "borrow",
          href: "/borrow/index.html",
          titleKey: "Home:borrow.title",
          subtitleKey: "Home:borrow.subtitle",
          hoverKeys: [
            "Home:borrow.hover1",
            "Home:borrow.hover2",
            "Home:borrow.hover3",
          ],
        },
        {
          key: "lend",
          href: "/lend/index.html",
          titleKey: "Home:lend.title",
          subtitleKey: "Home:lend.subtitle",
          hoverKeys: [
            "Home:lend.hover1",
            "Home:lend.hover2",
            "Home:lend.hover3",
          ],
        },
        {
          key: "smartcoins",
          href: "/smartcoins/index.html",
          titleKey: "Home:smartcoins.title",
          subtitleKey: "Home:smartcoins.subtitle",
          hoverKeys: [
            "Home:smartcoins.hover1",
            "Home:smartcoins.hover2",
            "Home:smartcoins.hover3",
            "Home:smartcoins.hover4",
          ],
        },
        {
          key: "tfunds",
          href: "/tfunds/index.html",
          titleKey: "Home:tfunds.title",
          subtitleKey: "Home:tfunds.subtitle",
          hoverKeys: [
            "Home:tfunds.hover1",
            "Home:tfunds.hover2",
            "Home:tfunds.hover3",
            "Home:tfunds.hover4",
          ],
        },
      ],
    },
    {
      value: "item-6",
      icon: "💎",
      headingKey: "PageHeader:assetCreation",
      cards: [
        {
          key: "create_prediction",
          href: "/create_prediction/index.html",
          titleKey: "Home:create_prediction.title",
          subtitleKey: "Home:create_prediction.subtitle",
          hoverKeys: [
            "Home:create_prediction.hover1",
            "Home:create_prediction.hover2",
            "Home:create_prediction.hover3",
          ],
        },
        {
          key: "create_uia",
          href: "/create_uia/index.html",
          titleKey: "Home:create_uia.title",
          subtitleKey: "Home:create_uia.subtitle",
          hoverKeys: [
            "Home:create_uia.hover1",
            "Home:create_uia.hover2",
            "Home:create_uia.hover3",
          ],
        },
        {
          key: "create_smartcoin",
          href: "/create_smartcoin/index.html",
          titleKey: "Home:create_smartcoin.title",
          subtitleKey: "Home:create_smartcoin.subtitle",
          hoverKeys: [
            "Home:create_smartcoin.hover1",
            "Home:create_smartcoin.hover2",
            "Home:create_smartcoin.hover3",
          ],
        },
      ],
    },
    {
      value: "item-4",
      icon: "👤",
      headingKey: "PageHeader:accountOverviewsHeading",
      cards: [
        {
          key: "portfolio",
          href: "/portfolio/index.html",
          titleKey: "Home:portfolio.title",
          subtitleKey: "Home:portfolio.subtitle",
          hoverKeys: [
            "Home:portfolio.hover1",
            "Home:portfolio.hover2",
            "Home:portfolio.hover3",
          ],
        },
        {
          key: "issued_assets",
          href: "/issued_assets/index.html",
          titleKey: "Home:issued_assets.title",
          subtitleKey: "Home:issued_assets.subtitle",
          hoverKeys: [
            "Home:issued_assets.hover1",
            "Home:issued_assets.hover2",
            "Home:issued_assets.hover3",
          ],
        },
        {
          key: "offers",
          href: "/offers/index.html",
          titleKey: "Home:offers.title",
          subtitleKey: "Home:offers.subtitle",
          hoverKeys: ["Home:offers.hover1", "Home:offers.hover2"],
        },
        {
          key: "deals",
          href: "/deals/index.html",
          titleKey: "Home:deals.title",
          subtitleKey: "Home:deals.subtitle",
          hoverKeys: ["Home:deals.hover1", "Home:deals.hover2"],
        },
        {
          key: "vesting",
          href: "/vesting/index.html",
          titleKey: "Home:vesting.title",
          subtitleKey: "Home:vesting.subtitle",
          hoverKeys: ["Home:vesting.hover1", "Home:vesting.hover2"],
        },
        {
          key: "proposals",
          href: "/proposals/index.html",
          titleKey: "Home:proposals.title",
          subtitleKey: "Home:proposals.subtitle",
          hoverKeys: ["Home:proposals.hover1", "Home:proposals.hover2"],
        },
      ],
    },
    {
      value: "item-5",
      icon: "⛓️",
      headingKey: "PageHeader:blockchainOverviewsHeading",
      cards: [
        {
          key: "featured",
          href: "/featured/index.html",
          titleKey: "Home:featured.title",
          subtitleKey: "Home:featured.subtitle",
          hoverKeys: [
            "Home:featured.hover1",
            "Home:featured.hover2",
            "Home:featured.hover3",
          ],
        },
        {
          key: "blocks",
          href: "/blocks/index.html",
          titleKey: "Home:blocks.title",
          subtitleKey: "Home:blocks.subtitle",
          hoverKeys: [
            "Home:blocks.hover1",
            "Home:blocks.hover2",
            "Home:blocks.hover3",
          ],
        },
        {
          key: "custom_pool_tracker",
          href: "/custom_pool_overview/index.html",
          titleKey: "Home:custom_pool_tracker.title",
          subtitleKey: "Home:custom_pool_tracker.subtitle",
          hoverKeys: [
            "Home:custom_pool_tracker.hover1",
            "Home:custom_pool_tracker.hover2",
          ],
        },
        {
          key: "pools",
          href: "/pools/index.html",
          titleKey: "Home:pools.title",
          subtitleKey: "Home:pools.subtitle",
          hoverKeys: [
            "Home:pools.hover1",
            "Home:pools.hover2",
            "Home:pools.hover3",
          ],
        },
      ],
    },
    {
      value: "item-8",
      icon: "🪪",
      headingKey: "PageHeader:governanceHeading",
      cards: [
        {
          key: "witnesses",
          href: "/witnesses/index.html",
          titleKey: "Home:witnesses.title",
          subtitleKey: "Home:witnesses.subtitle",
          hoverKeys: [
            "Home:witnesses.hover1",
            "Home:witnesses.hover2",
            "Home:witnesses.hover3",
          ],
        },
        {
          key: "committee",
          href: "/committee/index.html",
          titleKey: "Home:committee.title",
          subtitleKey: "Home:committee.subtitle",
          hoverKeys: [
            "Home:committee.hover1",
            "Home:committee.hover2",
            "Home:committee.hover3",
          ],
        },
        {
          key: "governance",
          href: "/governance/index.html",
          titleKey: "Home:governance.title",
          subtitleKey: "Home:governance.subtitle",
          hoverKeys: ["Home:governance.hover1", "Home:governance.hover2"],
        },
        {
          key: "create_worker",
          href: "/create_worker/index.html",
          titleKey: "Home:create_worker.title",
          subtitleKey: "Home:create_worker.subtitle",
          hoverKeys: [
            "Home:create_worker.hover1",
            "Home:create_worker.hover2",
            "Home:create_worker.hover3",
          ],
        },
        {
          key: "create_ticket",
          icon: "🎫",
          href: "/create_ticket/index.html",
          titleKey: "Home:create_ticket.title",
          subtitleKey: "Home:create_ticket.subtitle",
          hoverKeys: [
            "Home:create_ticket.hover1",
            "Home:create_ticket.hover2",
            "Home:create_ticket.hover3",
          ],
        },
        {
          key: "ticket_leaderboard",
          icon: "📊",
          href: "/ticket_leaderboard/index.html",
          titleKey: "Home:ticket_leaderboard.title",
          subtitleKey: "Home:ticket_leaderboard.subtitle",
          hoverKeys: [
            "Home:ticket_leaderboard.hover1",
            "Home:ticket_leaderboard.hover2",
            "Home:ticket_leaderboard.hover3",
          ],
        },
      ],
    },
    {
      value: "item-7",
      icon: "⚙️",
      headingKey: "PageHeader:settingsHeading",
      cards: [
        {
          key: "accountLists",
          href: "/account_lists/index.html",
          titleKey: "Home:accountLists.title",
          subtitleKey: "Home:accountLists.subtitle",
          hoverKeys: [
            "Home:accountLists.hover1",
            "Home:accountLists.hover2",
            "Home:accountLists.hover3",
          ],
        },
        {
          key: "ltm",
          href: "/ltm/index.html",
          titleKey: "Home:ltm.title",
          subtitleKey: "Home:ltm.subtitle",
          hoverKeys: [
            "Home:ltm.hover1",
            "Home:ltm.hover2",
            "Home:ltm.hover3",
            "Home:ltm.hover4",
          ],
        },
        {
          key: "nodes",
          href: "/nodes/index.html",
          titleKey: "Home:nodes.title",
          subtitleKey: "Home:nodes.subtitle",
          hoverKeys: ["Home:nodes.hover1", "Home:nodes.hover2"],
        },
        {
          key: "create_account",
          href: "/create_account/index.html",
          titleKey: "Home:create_account.title",
          subtitleKey: "Home:create_account.subtitle",
          hoverKeys: [
            "Home:create_account.hover1",
            "Home:create_account.hover2",
          ],
        },
      ],
    },
  ];

  const renderHoverCard = (card) => (
    <HoverCard key={card.key}>
      <HoverCardTrigger asChild>
        <a href={card.href} style={{ textDecoration: "none" }}>
          <Card className="h-full hover:shadow-md hover:shadow-black">
            <CardHeader>
              <CardTitle>{t(card.titleKey)}</CardTitle>
              <CardDescription>{t(card.subtitleKey)}</CardDescription>
            </CardHeader>
          </Card>
        </a>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm pt-1">
        <ul className="ml-2 list-disc [&>li]:mt-2">
          {card.hoverKeys?.map((hoverKey, index) => (
            <li key={`${card.key}-hover-${index}`}>{t(hoverKey)}</li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );

  return (
    <>
      {/* full-bleed hero wrapper: spans entire window, clips horizontal overflow */}
      <div className="w-full overflow-hidden">
        <WaveHero />
      </div>
      <div className="container mx-auto mt-3 mb-5">
        <div className="grid grid-cols-3 gap-3 justify-items-center mb-5">
          <div className="col-span-3">
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-5">
              {t("Home:features.heading")}
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
                {t("Home:features.zeroAuth.title")}
              </ItemTitle>
              <ItemDescription>
                {t("Home:features.zeroAuth.description")}
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
                {t("Home:features.multiBroadcast.title")}
              </ItemTitle>
              <ItemDescription>
                {t("Home:features.multiBroadcast.description")}
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
                {t("Home:features.supportsLatest.title")}
              </ItemTitle>
              <ItemDescription>
                {t("Home:features.supportsLatest.description")}
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
                {t("Home:features.switchChains.title")}
              </ItemTitle>
              <ItemDescription>
                {t("Home:features.switchChains.description")}
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
                {t("Home:features.nearInstant.title")}
              </ItemTitle>
              <ItemDescription>
                {t("Home:features.nearInstant.description")}
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
                {t("Home:features.evergreen.title")}
              </ItemTitle>
              <ItemDescription>
                {t("Home:features.evergreen.description")}
              </ItemDescription>
            </ItemContent>
          </Item>

          <Item
            key="feature-7"
            variant="outline"
            className="w-full bg-white max-w-sm"
          >
            <ItemMedia variant="icon">👛</ItemMedia>
            <ItemContent>
              <ItemTitle className="text-black">
                {t("Home:features.multiWallets.title")}
              </ItemTitle>
              <ItemDescription>
                {t("Home:features.multiWallets.description")}
              </ItemDescription>
            </ItemContent>
          </Item>

          <Item
            key="feature-8"
            variant="outline"
            className="w-full bg-white max-w-sm"
          >
            <ItemMedia variant="icon">🌍</ItemMedia>
            <ItemContent>
              <ItemTitle className="text-black">
                {t("Home:features.localized.title")}
              </ItemTitle>
              <ItemDescription>
                {t("Home:features.localized.description")}
              </ItemDescription>
            </ItemContent>
          </Item>

          <Item
            key="feature-9"
            variant="outline"
            className="w-full bg-white max-w-sm"
          >
            <ItemMedia variant="icon">🤚</ItemMedia>
            <ItemContent>
              <ItemTitle className="text-black">
                {t("Home:features.blockActors.title")}
              </ItemTitle>
              <ItemDescription>
                {t("Home:features.blockActors.description")}
              </ItemDescription>
            </ItemContent>
          </Item>
        </div>

        <br />

        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-5 text-center mt-10">
          {t("Home:features.functionalityHeading")}
        </h3>

        <Item variant="outline">
          <ItemContent>
            <ItemDescription>
              <Accordion
                type="single"
                collapsible
                className="w-full"
                defaultValue="item-1"
              >
                {accordionSections.map((section) => (
                  <AccordionItem key={section.value} value={section.value}>
                    <AccordionTrigger>
                      <h4 className="mt-3 mb-2 scroll-m-20 text-xl font-semibold tracking-tight text-white">
                        {section.icon} {t(section.headingKey)}
                      </h4>
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-4 text-balance">
                      <div className="grid grid-cols-5 gap-3">
                        {section.cards.map((card) => renderHoverCard(card))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ItemDescription>
          </ItemContent>
        </Item>
      </div>
    </>
  );
}
