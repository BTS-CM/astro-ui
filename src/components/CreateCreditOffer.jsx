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

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";

import CurrentUser from "./common/CurrentUser.jsx";

export default function CreateCreditOffer(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <HoverCard key="poolExchange">
            <HoverCardTrigger asChild>
              <a href="/pool/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>💱 Pool exchange</CardTitle>
                    <CardDescription>Swap assets via a pool</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>Swap assets via user created liquidity pools.</li>
                <li>Pools have different trading pairs and fees.</li>
                <li>Simpler but more costly than a limit order.</li>
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
