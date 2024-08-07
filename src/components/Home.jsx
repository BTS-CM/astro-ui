import React, { useState, useEffect, useMemo } from "react";
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
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-3 gap-3">
        <HoverCard key="dex">
          <HoverCardTrigger asChild>
            <a href="/dex/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full">
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
              <Card className="h-full">
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

        <HoverCard key="poolStake">
          <HoverCardTrigger asChild>
            <a href="/stake/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full">
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

        <HoverCard key="smartcoins">
          <HoverCardTrigger asChild>
            <a href="/smartcoins/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full">
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

        <HoverCard key="borrow">
          <HoverCardTrigger asChild>
            <a href="/borrow/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full">
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
              <Card className="h-full">
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

        <HoverCard key="deals">
          <HoverCardTrigger asChild>
            <a href="/deals/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full">
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

        <HoverCard key="transfer">
          <HoverCardTrigger asChild>
            <a href="/transfer/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full">
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

        <HoverCard key="ltm">
          <HoverCardTrigger asChild>
            <a href="/ltm/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full">
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

        <HoverCard key="portfolio">
          <HoverCardTrigger asChild>
            <a href="/portfolio/index.html" style={{ textDecoration: "none" }}>
              <Card className="h-full">
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
              <Card className="h-full">
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
      </div>
    </div>
  );
}
