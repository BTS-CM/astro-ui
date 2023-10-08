import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { Button } from "@/components/ui/button";

import { $currentUser, eraseCurrentUser } from "../stores/users.ts";
import { usrCache } from "../effects/Cache.ts";

import AccountSelect from "./AccountSelect.jsx";
import CurrentUser from "./common/CurrentUser.jsx";

export default function Home(properties) {
  const [usr, setUsr] = useState();
  usrCache(setUsr);

  if (!usr || !usr.id || !usr.id.length) {
    return <AccountSelect />;
  }

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
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

          <HoverCard key="dex">
            <HoverCardTrigger asChild>
              <a href="/dex/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>📈 DEX limit orders</CardTitle>
                    <CardDescription>
                      Trade on the Bitshares DEX
                    </CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>Manually craft limit orders.</li>
                <li>Use any asset trading pair.</li>
                <li>Specify order expiration dates.</li>
                <li>More complex but cheaper than pool swaps.</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="transfer">
            <HoverCardTrigger asChild>
              <a href="/transfer/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>💸 Transfer assets</CardTitle>
                    <CardDescription>
                      Send assets to other users
                    </CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>
                  Transfer assets to anyone on the Bitshares blockchain in
                  seconds.
                </li>
                <li>Optional encrypted memos.</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="borrow">
            <HoverCardTrigger asChild>
              <a href="/borrow/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>🏦 Borrow funds</CardTitle>
                    <CardDescription>Borrow from other users</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>Browse the active user created credit offers.</li>
                <li>Borrow assets from them at their desired rate.</li>
                <li>Use requested collateral to secure your loan.</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="smartcoins">
            <HoverCardTrigger asChild>
              <a
                href="/smartcoins/index.html"
                style={{ textDecoration: "none" }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>🪙 Borrow bitassets</CardTitle>
                    <CardDescription>Issue collateralized debt</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>
                  Bitassets like USD, CNY and EUR are committee created
                  stablecoins (smartcoins) backed with BTS.
                </li>
                <li>
                  User created smartcoins can be backed with any asset and
                  reference any external feed.
                </li>
                <li>
                  External settlement prices are derived from configured feed
                  producers.
                </li>
                <li>
                  Exposure to external price feeds can pose a risk to
                  collateralized debt positions.
                </li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="ltm">
            <HoverCardTrigger asChild>
              <a href="/ltm/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>🏅 Buy LTM</CardTitle>
                    <CardDescription>Buy a lifetime membership</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>
                  There are multiple benefits to becoming a lifetime member.
                </li>
                <li>
                  Lifetime members receive a 80% vesting balance rebate on fees.
                </li>
                <li>
                  Lifetime members can create premium Bitshares account names.
                </li>
                <li>Lifetime members can earn through the referral system.</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="portfolio">
            <HoverCardTrigger asChild>
              <a
                href="/portfolio/index.html"
                style={{ textDecoration: "none" }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>💰 Portfolio</CardTitle>
                    <CardDescription>View your portfolio</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>Check your balances.</li>
                <li>Monitor your open orders.</li>
                <li>Analyze your recent account activity.</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="featured">
            <HoverCardTrigger asChild>
              <a href="/featured/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>🏆 Top markets</CardTitle>
                    <CardDescription>View most active markets</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>Navigate to the most active trading pairs.</li>
                <li>Compare market trading volume and value.</li>
                <li>Compare quantity of market trades.</li>
              </ul>
            </HoverCardContent>
          </HoverCard>

          <HoverCard key="deals">
            <HoverCardTrigger asChild>
              <a href="/deals/index.html" style={{ textDecoration: "none" }}>
                <Card>
                  <CardHeader>
                    <CardTitle>ℹ️ Credit deals</CardTitle>
                    <CardDescription>Check your credit deals</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm pt-1">
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>Monitor your active credit deals.</li>
                <li>Manage the state of your credit deals.</li>
              </ul>
            </HoverCardContent>
          </HoverCard>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr ? (
            <CurrentUser usr={usr} resetCallback={eraseCurrentUser} />
          ) : null}
        </div>
      </div>
    </>
  );
}
