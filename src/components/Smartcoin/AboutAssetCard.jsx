import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import CardRow from "@/components/common/CardRow.jsx";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function AboutAssetCard({
  assetInfo,
  bitassetInfo,
  fullAssetInfo,
  fullBitassetInfo,
  type,
  assetInfoFlags,
  assetPermissions,
  parsedCollateralAsset,
  usr,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <Card className="mt-2 relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)] h-full">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl" />
      <CardContent className="relative p-5">
        <div className="flex flex-row items-center justify-between gap-3 mb-4 p-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] flex-shrink-0">
              <Info className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-foreground tracking-tight min-w-0 flex-1">
                {type === "debt"
                  ? t("Smartcoin:aboutAsset", {
                      assetType:
                        bitassetInfo.issuer?.id === "1.2.0"
                          ? "Bitasset"
                          : "Smartcoin",
                      asset: assetInfo.s,
                      id: assetInfo.id,
                    })
                  : t("Smartcoin:aboutBackingCollateral", {
                      asset: assetInfo.s,
                      id: assetInfo.id,
                    })}
              </h3>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex shrink-0 cursor-help">
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px]">
                      <p>
                        {type === "debt"
                          ? t("Smartcoin:researchBeforeBorrow", { asset: assetInfo.s })
                          : t("Smartcoin:researchBeforeBacking", { asset: assetInfo.s })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] transition-colors text-xs">
                {t("Smartcoin:viewJSON")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card">
              <DialogHeader>
                <DialogTitle>
                  {t("Smartcoin:jsonSummaryData", { asset: assetInfo.s })}
                </DialogTitle>
                <DialogDescription>
                  {t("Smartcoin:dataUsedToRender")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1">
                <div className="col-span-1">
                  <ScrollArea className="h-72 rounded-md border text-sm">
                    <pre>
                      {JSON.stringify(
                        { fullAssetInfo, fullBitassetInfo },
                        null,
                        2,
                      )}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)] mb-1">
          {t("Smartcoin:generalAssetInfo")}
        </div>

        <div className="grid grid-cols-1 gap-1 w-full text-sm">
          <CardRow
            title={t("Smartcoin:issuer")}
            button={assetInfo.u.split(" ")[0]}
            dialogtitle={t("Smartcoin:issuerOfAsset", {
              asset: assetInfo.s,
            })}
            dialogdescription={
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("Smartcoin:issuerDetail1")}</li>
                <li>{t("Smartcoin:issuerDetail2")}</li>
                <li>{t("Smartcoin:issuerDetail3")}</li>
                <li>{t("Smartcoin:issuerDetail4")}</li>
                <span className="h-8 mb-2 mt-3 block">
                  {t("Smartcoin:viewIssuerOnbitshares")}
                </span>
              </ul>
            }
            tooltip={t("Smartcoin:moreInfoOnMaxSupply")}
          />

          <CardRow
            title={t("Smartcoin:maximumSupply")}
            button={fullAssetInfo.options?.max_supply}
            dialogtitle={t("Smartcoin:maximumSupplyOfAsset", {
              asset: assetInfo.s,
            })}
            dialogdescription={
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("Smartcoin:maximumSupplyDetail")}</li>
              </ul>
            }
            tooltip={t("Smartcoin:moreInfoOnMaxSupply")}
          />

          <CardRow
            title={t("Smartcoin:minQuantity")}
            button={1}
            dialogtitle={t("Smartcoin:minQuantityOfAsset", {
              asset: assetInfo.s,
            })}
            dialogdescription={
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("Smartcoin:minQuantityDetail1")}</li>
                <li>{t("Smartcoin:minQuantityDetail2")}</li>
              </ul>
            }
            tooltip={t("Smartcoin:moreAboutMinQuantity")}
          />

          <CardRow
            title={t("Smartcoin:precision")}
            button={fullAssetInfo.precision}
            dialogtitle={t("Smartcoin:precisionOfAsset", {
              asset: assetInfo.s,
            })}
            dialogdescription={
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("Smartcoin:precisionDetail")}</li>
              </ul>
            }
            tooltip={t("Smartcoin:moreAboutAssetPrecision")}
          />

          <CardRow
            title={t("Smartcoin:marketFee")}
            button={`${
              fullAssetInfo.options?.market_fee_percent
                ? fullAssetInfo.options.market_fee_percent / 100
                : 0
            }%`}
            dialogtitle={t("Smartcoin:marketFeeOfAsset", {
              asset: assetInfo.s,
            })}
            dialogdescription={
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("Smartcoin:marketFeeDetail1")}</li>
                <li>{t("Smartcoin:marketFeeDetail2")}</li>
                <li>{t("Smartcoin:marketFeeDetail3")}</li>
              </ul>
            }
            tooltip={t("Smartcoin:moreAboutMarketFee")}
          />

          <CardRow
            title={t("Smartcoin:takerFeePercent")}
            button={`${
              fullAssetInfo.options?.extensions?.taker_fee_percent
                ? fullAssetInfo.options.extensions.taker_fee_percent / 100
                : 0
            }%`}
            dialogtitle={t("Smartcoin:takerFeePercentOfAsset", {
              asset: assetInfo.s,
            })}
            dialogdescription={
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("Smartcoin:takerFeePercentDetail")}</li>
              </ul>
            }
            tooltip={t("Smartcoin:moreAboutTakerFeePercent")}
          />

          <CardRow
            title={t("Smartcoin:rewardPercent")}
            button={
              fullAssetInfo.options?.extensions?.reward_percent
                ? fullAssetInfo.options.extensions.reward_percent / 100
                : 0
            }
            dialogtitle={t("Smartcoin:rewardPercentOfAsset", {
              asset: assetInfo.s,
            })}
            dialogdescription={
              <ul className="ml-2 list-disc [&>li]:mt-2">
                <li>{t("Smartcoin:rewardPercentDetail")}</li>
              </ul>
            }
            tooltip={t("Smartcoin:moreAboutRewardPercent")}
          />
        </div>

        {bitassetInfo && bitassetInfo.id ? (
          <>
            <div className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)] mb-1 mt-2">
              {bitassetInfo.issuer?.id === "1.2.0"
                ? t("Smartcoin:bitassetInfo")
                : t("Smartcoin:smartcoinInfo")}
            </div>

            <div className="grid grid-cols-1 gap-1 w-full text-sm">
              <CardRow
                title={t("Smartcoin:collateralAsset")}
                button={
                  parsedCollateralAsset ? parsedCollateralAsset.s : ""
                }
                dialogtitle={t("Smartcoin:collateralAssetOfSmartcoin", {
                  asset: assetInfo.s,
                })}
                dialogdescription={
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Smartcoin:collateralAssetDetail")}</li>
                  </ul>
                }
                tooltip={t("Smartcoin:moreAboutCollateralAsset")}
              />

              <CardRow
                title={t("Smartcoin:MCR")}
                button={`${bitassetInfo ? bitassetInfo.mcr / 10 : 0} %`}
                dialogtitle={t("Smartcoin:MCRofAsset", {
                  asset: assetInfo.s,
                })}
                dialogdescription={
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Smartcoin:MCRDetail")}</li>
                  </ul>
                }
                tooltip={t("Smartcoin:moreAboutMCR")}
              />

              <CardRow
                title={t("Smartcoin:MSSR")}
                button={`${bitassetInfo ? bitassetInfo.mssr / 10 : 0} %`}
                dialogtitle={t("Smartcoin:MSSROfAsset", {
                  asset: assetInfo.s,
                })}
                dialogdescription={
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Smartcoin:MSSRDetail")}</li>
                  </ul>
                }
                tooltip={t("Smartcoin:moreAboutMSSR")}
              />

              <CardRow
                title={t("Smartcoin:ICR")}
                button={`${bitassetInfo ? bitassetInfo.icr / 10 : 0} %`}
                dialogtitle={t("Smartcoin:ICROfAsset", {
                  asset: assetInfo.s,
                })}
                dialogdescription={
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Smartcoin:ICRDetail")}</li>
                  </ul>
                }
                tooltip={t("Smartcoin:moreAboutICR")}
              />

              <CardRow
                title={t("Smartcoin:feedQty")}
                button={bitassetInfo ? bitassetInfo.feeds.length : 0}
                dialogtitle={t("Smartcoin:feedQtyOfAsset", {
                  asset: assetInfo.s,
                })}
                dialogdescription={
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Smartcoin:feedQtyDetail1")}</li>
                    <li>{t("Smartcoin:feedQtyDetail2")}</li>
                    <li>{t("Smartcoin:feedQtyDetail3")}</li>
                    <li>{t("Smartcoin:feedQtyDetail4")}</li>
                    <li>{t("Smartcoin:feedQtyDetail5")}</li>
                  </ul>
                }
                tooltip={t("Smartcoin:moreAboutFeedQty")}
              />

              {fullBitassetInfo?.options
                ?.force_settlement_offset_percent ? (
                <CardRow
                  title={t("Smartcoin:settlementOffset")}
                  button={`${
                    fullBitassetInfo.options
                      .force_settlement_offset_percent / 100
                  }%`}
                  dialogtitle={t("Smartcoin:settlementOffsetOfAsset", {
                    asset: assetInfo.s,
                  })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:settlementOffsetDetail")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutSettlementOffset")}
                />
              ) : null}

              {fullBitassetInfo?.options?.extensions
                ?.force_settle_fee_percent ? (
                <CardRow
                  title={t("Smartcoin:settlementFee")}
                  button={`${
                    fullBitassetInfo.options.extensions
                      .force_settle_fee_percent / 100
                  }%`}
                  dialogtitle={t("Smartcoin:settlementFeeOfAsset", {
                    asset: assetInfo.s,
                  })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:settlementFeeDetail")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutSettlementFee")}
                />
              ) : null}

              {fullBitassetInfo?.options?.extensions
                ?.margin_call_fee_ratio ? (
                <CardRow
                  title={t("Smartcoin:marginCallFee")}
                  button={`${
                    fullBitassetInfo.options.extensions
                      .margin_call_fee_ratio / 100
                  }%`}
                  dialogtitle={t("Smartcoin:marginCallFeeOfAsset", {
                    asset: assetInfo.s,
                  })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:marginCallFeeDetail1")}</li>
                      <li>{t("Smartcoin:marginCallFeeDetail2")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutMarginCallFee")}
                />
              ) : null}

              {fullBitassetInfo?.options?.extensions
                ?.black_swan_response_method ? (
                <CardRow
                  title={t("Smartcoin:BSRM")}
                  button={
                    fullBitassetInfo.options.extensions
                      .black_swan_response_method
                  }
                  dialogtitle={t("Smartcoin:BSRMOfAsset", {
                    asset: assetInfo.s,
                  })}
                  dialogdescription={
                    <ScrollArea className="h-72">
                      <ul className="ml-2 list-disc [&>li]:mt-2 text-sm">
                        <li>{t("Smartcoin:BSRMDetail1")}</li>
                        <li>
                          <b>{t("Smartcoin:globalSettlement")}</b>
                          <br />
                          {t("Smartcoin:globalSettlementDetail")}
                        </li>
                        <li>
                          <b>{t("Smartcoin:noSettlement")}</b>
                          <br />
                          {t("Smartcoin:noSettlementDetail")}
                        </li>
                        <li>
                          <b>{t("Smartcoin:individualSettlementToFund")}</b>
                          <br />
                          {t("Smartcoin:individualSettlementToFundDetail")}
                        </li>
                        <li>
                          <b>
                            {t("Smartcoin:individualSettlementToOrder")}
                          </b>
                          <br />
                          {t("Smartcoin:individualSettlementToOrderDetail")}
                        </li>
                      </ul>
                    </ScrollArea>
                  }
                  tooltip={t("Smartcoin:moreAboutBSRM")}
                />
              ) : null}

              {fullBitassetInfo?.options?.extensions
                ?.initial_collateral_ratio ? (
                <CardRow
                  title={t("Smartcoin:manualICR")}
                  button={
                    fullBitassetInfo.options.extensions
                      .initial_collateral_ratio
                  }
                  dialogtitle={t("Smartcoin:manualICROfAsset", {
                    asset: assetInfo.s,
                  })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:manualICRDetail")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutManualICR")}
                />
              ) : null}

              {fullBitassetInfo?.options?.extensions
                ?.maintenance_collateral_ratio ? (
                <CardRow
                  title={t("Smartcoin:manualMCR")}
                  button={
                    fullBitassetInfo.options.extensions
                      .maintenance_collateral_ratio
                  }
                  dialogtitle={t("Smartcoin:manualMCROfAsset", {
                    asset: assetInfo.s,
                  })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:manualMCRDetail")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutManualMCR")}
                />
              ) : null}

              {fullBitassetInfo?.options?.extensions
                ?.maximum_short_squeeze_ratio ? (
                <CardRow
                  title={t("Smartcoin:manualMSSR")}
                  button={
                    fullBitassetInfo.options.extensions
                      .maximum_short_squeeze_ratio
                  }
                  dialogtitle={t("Smartcoin:manualMSSROfAsset", {
                    asset: assetInfo.s,
                  })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:manualMSSRDetail")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutManualMSSR")}
                />
              ) : null}
            </div>
          </>
        ) : null}

        <div className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)] mb-1">
          {t("Smartcoin:assetFlags")}
        </div>
        {assetInfoFlags && assetInfoFlags.length ? (
          assetInfoFlags
        ) : (
          <span className="text-sm text-muted-foreground">{t("Smartcoin:noFlagsEnabled")}</span>
        )}
        <br />
        <div className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)] mb-1 mt-3">
          {t("Smartcoin:assetPermissions")}
        </div>
        {assetPermissions && assetPermissions.length ? (
          assetPermissions
        ) : (
          <span className="text-sm text-muted-foreground">{t("Smartcoin:noPermissionsEnabled")}</span>
        )}
      </CardContent>
    </Card>
  );
}
