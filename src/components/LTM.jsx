import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import {
  Crown,
  ShieldCheck,
  BadgePercent,
  Users,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LTM(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const [showDialog, setShowDialog] = useState(false);

  const isMember = usr && usr.id === usr.referrer;

  const benefits = [
    {
      icon: BadgePercent,
      titleKey: "LTM:feeRebate",
      descKey: "LTM:benefit1",
    },
    {
      icon: Users,
      titleKey: "LTM:referralEarnings",
      descKey: "LTM:benefit2",
    },
    {
      icon: Sparkles,
      titleKey: "LTM:premiumNames",
      descKey: "LTM:benefit3",
    },
  ];

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:w-1/2">
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
          />

          <div className="relative p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                  <Crown className="h-4.5 w-4.5" strokeWidth={2.25} />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                    {t("LTM:cardTitle")}
                  </h2>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {t("LTM:cardDescription")}
                  </p>
                </div>
              </div>
              {isMember && (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {t("LTM:memberBadge")}
                </Badge>
              )}
            </div>

            {/* Already a member state */}
            {isMember && (
              <div className="mb-5 rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.05)] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Check className="h-4 w-4 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
                  <span className="text-sm font-medium dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                    {t("LTM:alreadyMember")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70 ml-6">
                  {t("LTM:benefitsTitle")}
                </p>
              </div>
            )}

            {/* Benefits Section */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                  <Sparkles className="h-3 w-3" strokeWidth={2.25} />
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  {isMember ? t("LTM:benefitsTitle") : t("LTM:exclusiveBenefits")}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div
                      key={benefit.titleKey ?? benefit.title ?? index}
                      className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3.5 hover:border-[hsl(var(--accent-1)/0.2)] hover:bg-[hsl(var(--accent-1)/0.03)] transition-all group"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] group-hover:shadow-[0_0_12px_-4px_rgba(16,185,129,0.4)] transition-all shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                        <Icon className="h-4 w-4" strokeWidth={2.25} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground mb-0.5">
                          {t(benefit.titleKey)}
                        </div>
                        <div className="text-xs text-muted-foreground/70 leading-relaxed">
                          {t(benefit.descKey)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Purchase Section */}
            {!isMember && (
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                    <Crown className="h-3 w-3" strokeWidth={2.25} />
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    {t("LTM:readyToUpgrade")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4 ml-8">
                  {t("LTM:wantToPurchase")}
                </p>
                <Button
                  className="w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] transition-all"
                  onClick={() => setShowDialog(true)}
                >
                  <Crown className="h-4 w-4 mr-1.5" />
                  {t("LTM:purchaseButton")}
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            )}

            {showDialog ? (
              <DeepLinkDialog
                operationNames={["account_upgrade"]}
                username={usr.username}
                usrChain={usr.chain}
                userID={usr.id}
                dismissCallback={setShowDialog}
                key={`BuyLTM${usr.id}`}
                headerText={t("LTM:headerText", { username: usr.username })}
                trxJSON={[
                  {
                    account_to_upgrade: usr.id,
                    upgrade_to_lifetime_member: true,
                    extensions: {},
                  },
                ]}
              />
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}
