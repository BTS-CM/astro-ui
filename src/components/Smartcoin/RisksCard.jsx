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
import { Label } from "@/components/ui/label";

export default function RisksCard() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  return (
    <div className="grid grid-cols-1 mt-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t("Smartcoin:risksAssociated")}</CardTitle>
          <CardDescription>{t("Smartcoin:doYourOwnResearch2")}</CardDescription>
        </CardHeader>
        <CardContent>
          {t("Smartcoin:internalRiskFactors")}
          <br />
          <span className="text-sm">
            <Label className="mb-0 pb-0 text-lg">
              {t("Smartcoin:risksAssociatedDebtCollateral")}
            </Label>
            <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
              <li>{t("Smartcoin:riskLossCollateral")}</li>
              <li>{t("Smartcoin:riskSmartcoinValueLoss")}</li>
              <li>{t("Smartcoin:researchBeforeMarginPositions")}</li>
              <li>{t("Smartcoin:committeeOwnedBitAssets")}</li>
              <li>{t("Smartcoin:riskWithSmartcoinBacking")}</li>
              <li>{t("Smartcoin:riskWithEBA")}</li>
            </ul>
          </span>
          <br />
          {t("Smartcoin:externalRiskFactors")}
          <br />
          <span className="text-sm">
            <Label className="mb-0 pb-0 text-lg">
              {t("Smartcoin:priceFeedExposure")}
            </Label>
            <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
              <li>{t("Smartcoin:riskPriceFluctuation")}</li>
              <li>{t("Smartcoin:riskReferenceAssetCease")}</li>
            </ul>
            <Label className="mb-0 pb-0 text-lg">
              {t("Smartcoin:priceFeedPublisherActivity")}
            </Label>
            <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
              <li>{t("Smartcoin:riskPriceFeedInactivity")}</li>
              <li>{t("Smartcoin:riskUnstableFeedScripts")}</li>
              <li>{t("Smartcoin:riskExhaustedBalance")}</li>
              <li>{t("Smartcoin:riskPriceFeedDisagreement")}</li>
            </ul>
            <Label className="mb-0 pb-0 text-lg">
              {t("Smartcoin:exposureToEBABackAssetBlockchainDowntime")}
            </Label>
            <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
              <li>{t("Smartcoin:riskGatewayDepositServiceDown")}</li>
            </ul>
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
