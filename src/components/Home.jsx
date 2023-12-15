import React, { useState, useEffect, useMemo } from "react";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { i18n as i18nInstance } from "../lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";

import CurrentUser from "./common/CurrentUser.jsx";

export default function Home(properties) {
  const { t, i18n } = useTranslation("en", { i18n: i18nInstance });

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <HoverCard key="poolExchange">
            <HoverCardTrigger asChild>
              <a href="/pool/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("index:pool.title")}</CardTitle>
                    <CardDescription>{t("index:pool.subtitle")}</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("index:pool.hover1")}</li>
                <li>{t("index:pool.hover2")}</li>
                <li>{t("index:pool.hover3")}</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="dex">
            <HoverCardTrigger asChild>
              <a href="/dex/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("index:dex.title")}</CardTitle>
                    <CardDescription>{t("index:dex.subtitle")}</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("index:dex.hover1")}</li>
                <li>{t("index:dex.hover2")}</li>
                <li>{t("index:dex.hover3")}</li>
                <li>{t("index:dex.hover4")}</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="transfer">
            <HoverCardTrigger asChild>
              <a href="/transfer/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("index:transfer.title")}</CardTitle>
                    <CardDescription>{t("index:transfer.subtitle")}</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("index:transfer.hover1")}</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="borrow">
            <HoverCardTrigger asChild>
              <a href="/borrow/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("index:borrow.title")}</CardTitle>
                    <CardDescription>{t("index:borrow.subtitle")}</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("index:borrow.hover1")}</li>
                <li>{t("index:borrow.hover2")}</li>
                <li>{t("index:borrow.hover3")}</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="smartcoins">
            <HoverCardTrigger asChild>
              <a href="/smartcoins/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("index:smartcoins.title")}</CardTitle>
                    <CardDescription>{t("index:smartcoins.subtitle")}</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("index:smartcoins.hover1")}</li>
                <li>{t("index:smartcoins.hover2")}</li>
                <li>{t("index:smartcoins.hover3")}</li>
                <li>{t("index:smartcoins.hover4")}</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="ltm">
            <HoverCardTrigger asChild>
              <a href="/ltm/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("index:ltm.title")}</CardTitle>
                    <CardDescription>{t("index:ltm.subtitle")}</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("index:ltm.hover1")}</li>
                <li>{t("index:ltm.hover2")}</li>
                <li>{t("index:ltm.hover3")}</li>
                <li>{t("index:ltm.hover4")}</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="portfolio">
            <HoverCardTrigger asChild>
              <a href="/portfolio/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("index:portfolio.title")}</CardTitle>
                    <CardDescription>{t("index:portfolio.subtitle")}</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("index:portfolio.hover1")}</li>
                <li>{t("index:portfolio.hover2")}</li>
                <li>{t("index:portfolio.hover3")}</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="featured">
            <HoverCardTrigger asChild>
              <a href="/featured/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("index:featured.title")}</CardTitle>
                    <CardDescription>{t("index:featured.subtitle")}</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("index:featured.hover1")}</li>
                <li>{t("index:featured.hover2")}</li>
                <li>{t("index:featured.hover3")}</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="deals">
            <HoverCardTrigger asChild>
              <a href="/deals/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("index:deals.title")}</CardTitle>
                    <CardDescription>{t("index:deals.subtitle")}</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("index:deals.hover1")}</li>
                <li>{t("index:deals.hover2")}</li>
              </ul>
            </HoverCardContent>
          </HoverCard>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}
        </div>
      </div>
    </>
  );
}
