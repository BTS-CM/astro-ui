import React, { useState, useEffect, useMemo } from "react";
import { useStore } from '@nanostores/react';
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

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";

export default function Home(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  return (
    <div className="container mx-auto mt-3 mb-5">
      <h4 className="mb-2">
        {t("PageHeader:exchangingFundsHeading")}
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <HoverCard key="dex">
          <HoverCardTrigger asChild>
            <a href="/dex/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:dex.title")}</CardTitle>
                  <CardDescription>{t("Home:dex.subtitle")}</CardDescription>
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

        <HoverCard key="poolExchange">
          <HoverCardTrigger asChild>
            <a href="/pool/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:pool.title")}</CardTitle>
                  <CardDescription>{t("Home:pool.subtitle")}</CardDescription>
                </CardHeader>
              </Card>
            </a>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 text-sm pt-1">
            <ul className="ml-2 list-disc [&>li]:mt-2">
              <li>{t("Home:pool.hover1")}</li>
              <li>{t("Home:pool.hover2")}</li>
              <li>{t("Home:pool.hover3")}</li>
            </ul>
          </HoverCardContent>
        </HoverCard>

        <HoverCard key="swap">
          <HoverCardTrigger asChild>
            <a href="/swap/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:swap.title")}</CardTitle>
                  <CardDescription>{t("Home:swap.subtitle")}</CardDescription>
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
            <a href="/stake/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:stake.title")}</CardTitle>
                  <CardDescription>{t("Home:stake.subtitle")}</CardDescription>
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
            <a href="/transfer/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:transfer.title")}</CardTitle>
                  <CardDescription>{t("Home:transfer.subtitle")}</CardDescription>
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
      </div>

      <h4 className="mt-3 mb-2">
        {t("PageHeader:formsOfDebtHeading")}
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <HoverCard key="borrow">
          <HoverCardTrigger asChild>
            <a href="/borrow/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:borrow.title")}</CardTitle>
                  <CardDescription>{t("Home:borrow.subtitle")}</CardDescription>
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
                  <CardDescription>{t("Home:lend.subtitle")}</CardDescription>
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
            <a href="/smartcoins/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:smartcoins.title")}</CardTitle>
                  <CardDescription>{t("Home:smartcoins.subtitle")}</CardDescription>
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
            <a href="/tfunds/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:tfunds.title")}</CardTitle>
                  <CardDescription>{t("Home:tfunds.subtitle")}</CardDescription>
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
      </div>

      <h4 className="mt-3 mb-2">
        {t("PageHeader:overviewsHeading")}
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <HoverCard key="portfolio">
          <HoverCardTrigger asChild>
            <a href="/portfolio/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:portfolio.title")}</CardTitle>
                  <CardDescription>{t("Home:portfolio.subtitle")}</CardDescription>
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

        <HoverCard key="featured">
          <HoverCardTrigger asChild>
            <a href="/featured/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:featured.title")}</CardTitle>
                  <CardDescription>{t("Home:featured.subtitle")}</CardDescription>
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

        <HoverCard key="deals">
          <HoverCardTrigger asChild>
            <a href="/deals/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:deals.title")}</CardTitle>
                  <CardDescription>{t("Home:deals.subtitle")}</CardDescription>
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
            <a href="/offers/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:offers.title")}</CardTitle>
                  <CardDescription>{t("Home:offers.subtitle")}</CardDescription>
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
            <a href="/vesting/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:vesting.title")}</CardTitle>
                  <CardDescription>{t("Home:vesting.subtitle")}</CardDescription>
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

        <HoverCard key="predictions">
          <HoverCardTrigger asChild>
            <a href="/predictions/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:prediction_markets.title")}</CardTitle>
                  <CardDescription>{t("Home:prediction_markets.subtitle")}</CardDescription>
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
      </div>

      <h4 className="mt-3 mb-2">
        {t("PageHeader:assetCreation")}
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <HoverCard key="create_prediction">
          <HoverCardTrigger asChild>
            <a href="/create_prediction/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:create_prediction.title")}</CardTitle>
                  <CardDescription>{t("Home:create_prediction.subtitle")}</CardDescription>
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
      </div>

      <h4 className="mt-3 mb-2">
        {t("PageHeader:settingsHeading")}
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <HoverCard key="ltm">
          <HoverCardTrigger asChild>
            <a href="/ltm/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:ltm.title")}</CardTitle>
                  <CardDescription>{t("Home:ltm.subtitle")}</CardDescription>
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
            <a href="/nodes/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full hover:shadow-md hover:shadow-black">
                <CardHeader>
                  <CardTitle>{t("Home:nodes.title")}</CardTitle>
                  <CardDescription>{t("Home:nodes.subtitle")}</CardDescription>
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
      </div>

    </div>
  );
}
