import { List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { BookOpen, BarChart3, AlertTriangle, Radio } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  MarginPositionRow,
  OrderRow,
  SettlementRow,
  PriceFeedRow,
} from "@/components/Smartcoin/SmartcoinRows.jsx";

export function OrderBookCard({
  parsedAsset,
  parsedCollateralAsset,
  activeOrderTab,
  setActiveOrderTab,
  buyOrders,
  sellOrders,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="grid grid-cols-1 mt-5">
      <Card className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)] p-4">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl" />
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] flex-shrink-0">
              <BookOpen className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {parsedAsset && parsedCollateralAsset
                  ? t("Smartcoin:orderBookForAssets", {
                      asset1: parsedAsset.s,
                      asset2: parsedCollateralAsset.s,
                    })
                  : t("Smartcoin:orderBookLoading")}
              </h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {t("Smartcoin:orderBookNote")}
              </p>
            </div>
          </div>
          <a
            href={
              parsedAsset && parsedCollateralAsset
                ? `/dex.html?market=${parsedAsset.s}_${parsedCollateralAsset.s}`
                : ""
            }
          >
            <Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_4px_14px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(99,102,241,0.6)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] transition-all text-xs">
              {t("Smartcoin:goToMarket")}
            </Button>
          </a>
        </div>
        <Tabs defaultValue="buy" className="w-full">
          <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 mb-3 w-full">
            <button
              type="button"
              onClick={() => setActiveOrderTab("buy")}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center justify-center gap-1.5",
                activeOrderTab === "buy"
                  ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(99,102,241,0.6)]"
                  : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
              )}
            >
              {t("Smartcoin:viewBuyOrders")}
            </button>
            <button
              type="button"
              onClick={() => setActiveOrderTab("sell")}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center justify-center gap-1.5",
                activeOrderTab === "sell"
                  ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(99,102,241,0.6)]"
                  : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
              )}
            >
              {t("Smartcoin:viewSellOrders")}
            </button>
          </div>
          <TabsContent value="buy">
            {buyOrders && buyOrders.length ? (
              <>
                <div className="grid grid-cols-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                  <div className="col-span-1">{t("Smartcoin:price")}</div>
                  <div className="col-span-1">
                    {parsedCollateralAsset.s}
                  </div>
                  <div className="col-span-1">{parsedAsset.s}</div>
                  <div className="col-span-1">{t("Smartcoin:total")}</div>
                </div>
                <div className="w-full max-h-[260px] overflow-auto rounded-lg border border-border/60 bg-card/40">
                  <List
                    rowComponent={(props) => (
                      <OrderRow
                        {...props}
                        activeOrderTab={activeOrderTab}
                        buyOrders={buyOrders}
                        sellOrders={sellOrders}
                        parsedAsset={parsedAsset}
                        parsedCollateralAsset={parsedCollateralAsset}
                      />
                    )}
                    rowCount={buyOrders.length}
                    rowHeight={25}
                    rowProps={{}} height={260} width="100%" />
                </div>
              </>
            ) : null}
            {buyOrders && !buyOrders.length ? (
              <p className="rounded-lg border border-dashed border-border/60 px-4 py-5 text-center text-sm text-muted-foreground">
                {t("Smartcoin:noBuyOrdersFound")}
              </p>
            ) : null}
            {!buyOrders ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : null}
          </TabsContent>
          <TabsContent value="sell">
            {sellOrders && sellOrders.length ? (
              <>
                <div className="grid grid-cols-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                  <div className="col-span-1">{t("Smartcoin:price")}</div>
                  <div className="col-span-1">{parsedAsset.s}</div>
                  <div className="col-span-1">
                    {parsedCollateralAsset.s}
                  </div>
                  <div className="col-span-1">{t("Smartcoin:total")}</div>
                </div>
                <div className="w-full max-h-[260px] overflow-auto rounded-lg border border-border/60 bg-card/40">
                  <List
                    rowComponent={(props) => (
                      <OrderRow
                        {...props}
                        activeOrderTab={activeOrderTab}
                        buyOrders={buyOrders}
                        sellOrders={sellOrders}
                        parsedAsset={parsedAsset}
                        parsedCollateralAsset={parsedCollateralAsset}
                      />
                    )}
                    rowCount={sellOrders.length}
                    rowHeight={25}
                    rowProps={{}} height={260} width="100%" />
                </div>
              </>
            ) : null}
            {sellOrders && !sellOrders.length ? (
              <p className="rounded-lg border border-dashed border-border/60 px-4 py-5 text-center text-sm text-muted-foreground">
                {t("Smartcoin:noSellOrdersFound")}
              </p>
            ) : null}
            {!sellOrders ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

export function CallOrdersCard({
  parsedAsset,
  parsedCollateralAsset,
  assetCallOrders,
  currentFeedSettlementPrice,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="grid grid-cols-1 mt-5">
      <Card className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)] p-4">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl" />
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] flex-shrink-0">
            <BarChart3 className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              {parsedAsset && parsedCollateralAsset
                ? t("Smartcoin:callOrdersForAssets", {
                    asset1: parsedAsset.s,
                    asset2: parsedCollateralAsset.s,
                  })
                : t("Smartcoin:callOrdersLoading")}
            </h3>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {t("Smartcoin:checkMarginPositions")}
            </p>
          </div>
        </div>
        {assetCallOrders && assetCallOrders.length ? (
          <>
            <div className="grid grid-cols-4 md:grid-cols-6 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
              <div className="col-span-1">{t("Smartcoin:borrower")}</div>
              <div className="col-span-1">
                {t("Smartcoin:collateral")}
              </div>
              <div className="col-span-1">{t("Smartcoin:debt")}</div>
              <div className="col-span-1">{t("Smartcoin:callPrice")}</div>
              <div className="hidden md:block col-span-1">
                {t("Smartcoin:tcr")}
              </div>
              <div className="hidden md:block col-span-1">
                {t("Smartcoin:ratio")}
              </div>
            </div>
            <div className="w-full max-h-[260px] overflow-auto rounded-lg border border-border/60 bg-card/40">
              <List
                rowComponent={(props) => (
                  <MarginPositionRow
                    {...props}
                    assetCallOrders={assetCallOrders}
                    parsedCollateralAsset={parsedCollateralAsset}
                    parsedAsset={parsedAsset}
                    currentFeedSettlementPrice={currentFeedSettlementPrice}
                  />
                )}
                rowCount={assetCallOrders.length}
                rowHeight={25}
                rowProps={{}} height={260} width="100%" />
            </div>
          </>
        ) : null}
        {assetCallOrders && !assetCallOrders.length ? (
          <p className="rounded-lg border border-dashed border-border/60 px-4 py-5 text-center text-sm text-muted-foreground">
            {t("Smartcoin:noCallOrdersFound")}
          </p>
        ) : null}
        {!assetCallOrders ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export function SettleOrdersCard({
  parsedAsset,
  parsedCollateralAsset,
  assetSettleOrders,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="grid grid-cols-1 mt-5">
      <Card className="rounded-xl border border-[hsl(var(--accent-warning)/0.15)] bg-card/60 p-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-warning)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.2)] to-[hsl(var(--accent-warning)/0.2)] text-[hsl(var(--accent-warning-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-warning)/0.4)] flex-shrink-0">
            <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              {parsedAsset && parsedCollateralAsset
                ? t("Smartcoin:settleOrdersForAssets", {
                    asset1: parsedAsset.s,
                    asset2: parsedCollateralAsset.s,
                  })
                : t("Smartcoin:settleOrdersLoading")}
            </h3>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {t("Smartcoin:checkSettleOrders")}
            </p>
          </div>
        </div>
        {assetSettleOrders && assetSettleOrders.length ? (
          <>
            <div className="grid grid-cols-3 md:grid-cols-6 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
              <div className="col-span-1">{t("Smartcoin:owner")}</div>
              <div className="col-span-1">{t("Smartcoin:balance2")}</div>
              <div className="col-span-1">
                {t("Smartcoin:settlementDate")}
              </div>
            </div>
            <div className="w-full max-h-[260px] overflow-auto rounded-lg border border-border/60 bg-card/40">
              <List
                rowComponent={(props) => (
                  <SettlementRow
                    {...props}
                    assetSettleOrders={assetSettleOrders}
                  />
                )}
                rowCount={assetSettleOrders.length}
                rowHeight={25}
                rowProps={{}} height={260} width="100%" />
            </div>
          </>
        ) : null}
        {assetSettleOrders && !assetSettleOrders.length ? (
          <p className="rounded-lg border border-dashed border-border/60 px-4 py-5 text-center text-sm text-muted-foreground">
            {t("Smartcoin:noSettleOrdersFound")}
          </p>
        ) : null}
        {!assetSettleOrders ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export function PriceFeedsCard({
  parsedAsset,
  parsedCollateralAsset,
  finalBitasset,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="grid grid-cols-1 mt-5">
      <Card className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)] p-4">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl" />
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] flex-shrink-0">
            <Radio className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              {parsedAsset && parsedCollateralAsset
                ? t("Smartcoin:priceFeedsForAsset", { asset: parsedAsset.s })
                : t("Smartcoin:priceFeedsLoading")}
            </h3>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {t("Smartcoin:checkLatestPriceFeeds")}
            </p>
          </div>
        </div>
        {finalBitasset && finalBitasset.feeds ? (
          <>
            <div className="grid grid-cols-7 md:grid-cols-11 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
              <div className="hidden md:block col-span-2">{t("Smartcoin:user")}</div>
              <div className="hidden md:block col-span-2">{t("Smartcoin:date")}</div>
              <div className="col-span-2">{t("Smartcoin:cer")}</div>
              <div className="col-span-2">
                {t("Smartcoin:settlement")}
              </div>
              <div className="col-span-1">{t("Smartcoin:icr")}</div>
              <div className="col-span-1">{t("Smartcoin:mcr")}</div>
              <div className="col-span-1">{t("Smartcoin:mssr")}</div>
            </div>
            <div className="w-full max-h-[260px] overflow-auto rounded-lg border border-border/60 bg-card/40">
              <List
                rowComponent={(props) => (
                  <PriceFeedRow
                    {...props}
                    finalBitasset={finalBitasset}
                    parsedAsset={parsedAsset}
                    parsedCollateralAsset={parsedCollateralAsset}
                  />
                )}
                rowCount={finalBitasset.feeds.length}
                rowHeight={25}
                rowProps={{}} height={260} width="100%" />
            </div>
          </>
        ) : null}
        {finalBitasset && !finalBitasset.feeds.length ? (
          <p className="rounded-lg border border-dashed border-border/60 px-4 py-5 text-center text-sm text-muted-foreground">
            {t("Smartcoin:noSmartcoinFeedsFound")}
          </p>
        ) : null}
        {!finalBitasset ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
