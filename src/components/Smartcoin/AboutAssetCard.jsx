import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import CardRow from "@/components/common/CardRow.jsx";

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
    <Card className="mt-2">
      <CardHeader className="pb-2">
        <CardTitle>
          <div className="grid grid-cols-8">
            <div className="col-span-6">
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
            </div>
            <div className="col-span-2 text-right">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-5">
                    {t("Smartcoin:viewJSON")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] bg-white">
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
                            2
                          )}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          {type === "debt"
            ? t("Smartcoin:researchBeforeBorrow", { asset: assetInfo.s })
            : t("Smartcoin:researchBeforeBacking", { asset: assetInfo.s })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2">
          <div className="col-span-1">
            <Label>{t("Smartcoin:generalAssetInfo")}</Label>
          </div>
          <div className="col-span-1 text-right">
            {t("Smartcoin:viewAssetOnbitshares")}
          </div>
        </div>

        <div className="grid grid-cols-11 gap-1 w-full text-sm">
          <div className="col-span-5">
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
            </div>
          </div>

          <div className="col-span-1 flex justify-center items-center">
            <Separator orientation="vertical" />
          </div>

          <div className="col-span-5">
            <div className="grid grid-cols-1 gap-1 w-full text-sm">
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
          </div>
        </div>

        {bitassetInfo && bitassetInfo.id ? (
          <>
            <div className="grid grid-cols-2">
              <div className="col-span-1">
                <Label>
                  {bitassetInfo.issuer?.id === "1.2.0"
                    ? t("Smartcoin:bitassetInfo")
                    : t("Smartcoin:smartcoinInfo")}
                </Label>
              </div>
              <div className="col-span-1 text-right">
                <Button variant="outline" className="h-5 mb-2">
                  {t("Smartcoin:viewBitassetOnbitshares")}
                </Button>
              </div>
            </div>
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
                </div>
              </div>

              <div className="col-span-1 flex justify-center items-center">
                <Separator orientation="vertical" />
              </div>

              <div className="col-span-5">
                <div className="grid grid-cols-1 gap-1 w-full text-sm">
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
              </div>
            </div>
          </>
        ) : null}

        <Label className="pb-0">{t("Smartcoin:assetFlags")}</Label>
        <br />
        {assetInfoFlags && assetInfoFlags.length ? (
          assetInfoFlags
        ) : (
          <span className="text-sm">{t("Smartcoin:noFlagsEnabled")}</span>
        )}
        <br />
        <Label>{t("Smartcoin:assetPermissions")}</Label>
        <br />
        {assetPermissions && assetPermissions.length ? (
          assetPermissions
        ) : (
          <span className="text-sm">{t("Smartcoin:noPermissionsEnabled")}</span>
        )}
      </CardContent>
    </Card>
  );
}
