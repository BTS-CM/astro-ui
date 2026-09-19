import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export function GlobalSettlementCard({
  settlementFund,
  parsedCollateralAsset,
  parsedAsset,
  finalAsset,
  currentFeedSettlementPrice,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  if (!settlementFund || !settlementFund.finalSettlementFund || settlementFund.finalSettlementFund <= 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 mt-2 mb-2">
      <Card className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-danger)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-danger)/0.1)]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-danger)/0.6)] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-danger)/0.08)] blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
        <CardContent className="relative p-5">
          <div className="flex flex-row items-center gap-3 mb-4 p-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-danger)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-danger)/0.2)] to-[hsl(var(--accent-1)/0.2)] text-[hsl(var(--accent-danger-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-danger)/0.4)] flex-shrink-0">
              <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {t("Smartcoin:settlementFundTitle", {
                  symbol: finalAsset.symbol,
                })}
              </h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {t("Smartcoin:settlementFundDescription")}
                <br />
                {t("Smartcoin:borrowingUnavailable")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:fund")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-danger-fg)/0.9)] text-[hsl(var(--accent-danger-fg))] font-semibold">
                {settlementFund.finalSettlementFund} {parsedCollateralAsset.s}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:settlementPrice")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-danger-fg)/0.9)] text-[hsl(var(--accent-danger-fg))] font-semibold">
                {settlementFund.finalSettlementPrice} {parsedAsset.s}/{parsedCollateralAsset.s}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:currentPrice")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-danger-fg)/0.9)] text-[hsl(var(--accent-danger-fg))] font-semibold">
                {(1 / currentFeedSettlementPrice).toFixed(parsedAsset.p)}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:fundingRatio")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-danger-fg)/0.9)] text-[hsl(var(--accent-danger-fg))] font-semibold">
                {(
                  (1 /
                    currentFeedSettlementPrice /
                    settlementFund.finalSettlementPrice) *
                  100
                ).toFixed(2)}%
                <span className="text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))] text-xs ml-1">
                  (-{(100 - (1 / currentFeedSettlementPrice / settlementFund.finalSettlementPrice) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          <a href={`/settlement.html?id=${finalAsset.id}`}>
            <Button className="bg-gradient-to-r from-[hsl(var(--accent-danger))] to-[hsl(var(--accent-1))] text-[hsl(var(--accent-danger-gradFg))] shadow-[0_4px_14px_-4px_rgba(239,68,68,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(239,68,68,0.6)] hover:from-[hsl(var(--accent-danger))] hover:to-[hsl(var(--accent-1))] transition-all">
              {t("Smartcoin:bidOnSettlementFund", {
                symbol: finalAsset.symbol,
              })}
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

export function IndividualSettlementCard({
  individualSettlementFund,
  individualSettlementPrice,
  parsedCollateralAsset,
  parsedAsset,
  finalAsset,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  if (!individualSettlementFund || !individualSettlementFund._debt) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 mt-2 mb-2">
      <Card className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
        <CardContent className="relative p-5">
          <div className="flex flex-row items-center gap-3 mb-4 p-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] flex-shrink-0">
              <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {t("Smartcoin:individualSettlementFund", {
                  symbol: finalAsset.symbol,
                })}
              </h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {t("Smartcoin:individualSettlementFundDescription")}
                <br />
                {t("Smartcoin:fundsCanBeBidOn")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:fund")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))] font-semibold">
                {individualSettlementFund._fund} {parsedCollateralAsset.s}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:debt2")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))] font-semibold">
                {individualSettlementFund._debt} {parsedAsset.s}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:feedPrice")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))] font-semibold">
                {individualSettlementPrice.toFixed(parsedAsset.p)}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:fundingRatio")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))] font-semibold">
                {(
                  ((individualSettlementFund._debt *
                    individualSettlementPrice) /
                    individualSettlementFund._fund) *
                  100
                ).toFixed(2)}%
                <span className="text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))] text-xs ml-1">
                  (-{(100 - ((individualSettlementFund._debt * individualSettlementPrice) / individualSettlementFund._fund) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          <a href={`/settlement.html?id=${finalAsset.id}`}>
            <Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_4px_14px_-4px_rgba(245,158,11,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(245,158,11,0.6)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-1))] transition-all">
              {t("Smartcoin:bidOnSettlementFund", {
                symbol: finalAsset.symbol,
              })}
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
