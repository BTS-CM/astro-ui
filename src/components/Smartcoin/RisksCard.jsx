import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { ShieldAlert, ChevronDown } from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

function RiskSection({ title, defaultOpen, children }) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group rounded-lg border border-border/60 bg-card/40"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-warning-fg)/0.7)] text-[hsl(var(--accent-warning-fg)/0.8)]">
          {title}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

export default function RisksCard() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  return (
    <div className="grid grid-cols-1 mt-5">
      <Card className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-warning)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-warning)/0.1)]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-warning)/0.6)] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-warning)/0.08)] blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-warning)/0.08)] blur-3xl" />
        <CardContent className="relative p-5">
          <div className="flex flex-row items-center gap-3 mb-4 p-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-warning)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.2)] to-[hsl(var(--accent-warning)/0.2)] text-[hsl(var(--accent-warning-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-warning)/0.4)] flex-shrink-0">
              <ShieldAlert className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {t("Smartcoin:risksAssociated")}
              </h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {t("Smartcoin:doYourOwnResearch2")}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <RiskSection
              title={t("Smartcoin:risksAssociatedDebtCollateral")}
              defaultOpen
            >
              <ul className="ml-2 list-disc [&>li]:mt-1 pl-2 text-sm">
              <li>{t("Smartcoin:riskLossCollateral")}</li>
              <li>{t("Smartcoin:riskSmartcoinValueLoss")}</li>
              <li>{t("Smartcoin:researchBeforeMarginPositions")}</li>
              <li>{t("Smartcoin:committeeOwnedBitAssets")}</li>
              <li>{t("Smartcoin:riskWithSmartcoinBacking")}</li>
              <li>{t("Smartcoin:riskWithEBA")}</li>
              </ul>
            </RiskSection>

            <RiskSection title={t("Smartcoin:priceFeedExposure")}>
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2 text-sm">
                <li>{t("Smartcoin:riskPriceFluctuation")}</li>
                <li>{t("Smartcoin:riskReferenceAssetCease")}</li>
              </ul>
            </RiskSection>

            <RiskSection title={t("Smartcoin:priceFeedPublisherActivity")}>
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2 text-sm">
                <li>{t("Smartcoin:riskPriceFeedInactivity")}</li>
                <li>{t("Smartcoin:riskUnstableFeedScripts")}</li>
                <li>{t("Smartcoin:riskExhaustedBalance")}</li>
                <li>{t("Smartcoin:riskPriceFeedDisagreement")}</li>
              </ul>
            </RiskSection>

            <RiskSection
              title={t("Smartcoin:exposureToEBABackAssetBlockchainDowntime")}
            >
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2 text-sm">
                <li>{t("Smartcoin:riskGatewayDepositServiceDown")}</li>
              </ul>
            </RiskSection>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
