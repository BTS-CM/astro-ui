import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import DeepLinkDialog from "@/components/common/DeepLinkDialog";
import { humanReadableFloat } from "@/lib/common.js";

export default function UsrMarginPositionCard({
  usrMarginPositions,
  parsedCollateralAsset,
  parsedAsset,
  currentFeedSettlementPrice,
  debtAssetHoldings,
  usr,
  exitJSON,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const [showClosePositionDialog, setShowClosePositionDialog] = useState(false);

  const computed = useMemo(() => {
    if (
      !usrMarginPositions ||
      !usrMarginPositions.length ||
      !parsedAsset ||
      !parsedCollateralAsset
    )
      return null;
    const res = usrMarginPositions[0];
    const collateralAmount = humanReadableFloat(
      res.collateral,
      parsedCollateralAsset.p
    );
    const debtAmount = humanReadableFloat(res.debt, parsedAsset.p);
    const _ratio =
      1 / ((currentFeedSettlementPrice * debtAmount) / collateralAmount);
    const ratio = parseFloat(_ratio.toFixed(3));

    const callPrice = res.target_collateral_ratio
      ? parseFloat(
          (
            currentFeedSettlementPrice *
            (collateralAmount /
              (debtAmount *
                (currentFeedSettlementPrice *
                  (res.target_collateral_ratio / 1000))))
          ).toFixed(parsedCollateralAsset.p)
        )
      : parseFloat(
          (
            currentFeedSettlementPrice *
            (collateralAmount /
              (debtAmount * (currentFeedSettlementPrice * 1.4)))
          ).toFixed(parsedCollateralAsset.p)
        );

    return { res, collateralAmount, debtAmount, ratio, callPrice };
  }, [
    usrMarginPositions,
    parsedAsset,
    parsedCollateralAsset,
    currentFeedSettlementPrice,
  ]);

  if (!computed) return null;

  const { res, collateralAmount, debtAmount, ratio, callPrice } = computed;
  const tcr = res.target_collateral_ratio
    ? `${res.target_collateral_ratio / 10}%`
    : null;

  return (
    <Card className="mt-2">
      <CardHeader className="pb-2">
        <CardTitle>
          {t("Smartcoin:currentMarginPosition", {
            asset: parsedAsset.s,
            id: parsedAsset.id,
          })}
        </CardTitle>
        <CardDescription>
          {t("Smartcoin:ongoingMarginPosition")}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {t("Smartcoin:balance")} <b>{debtAssetHoldings ?? 0}</b>
        {parsedAsset ? ` ${parsedAsset.s}` : " ?"}
        <br />
        {t("Smartcoin:debt")}{" "}
        <b>{humanReadableFloat(usrMarginPositions[0].debt, parsedAsset.p)}</b>{" "}
        {parsedAsset.s}
        <br />
        {t("Smartcoin:collateralAtRisk")}{" "}
        <b>
          {humanReadableFloat(
            usrMarginPositions[0].collateral,
            parsedCollateralAsset.p
          )}
        </b>{" "}
        {parsedCollateralAsset.s}
        <br />
        {t("Smartcoin:currentRatio")} <b>{ratio}</b>
        <br />
        {t("Smartcoin:marginCallPrice")} <b>{callPrice}</b>{" "}
        {parsedCollateralAsset.s}
        {" ("}
        {(1 / callPrice).toFixed(parsedAsset.p)} {parsedAsset.s}/
        {parsedCollateralAsset.s}
        {")"}
        {tcr ? (
          <>
            <br />
            {t("Smartcoin:targetCollateralRatio")}
            <b>{tcr}</b>
          </>
        ) : null}
        <br />
        <br />
        {debtAssetHoldings >=
        humanReadableFloat(usrMarginPositions[0].debt, parsedAsset.p) ? (
          <Button
            className="mt-3 mr-2"
            onClick={() => setShowClosePositionDialog(true)}
          >
            {t("Smartcoin:closePosition")}
          </Button>
        ) : null}
        <a
          href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${parsedAsset.s}`}
        >
          <Button className="mr-2">
            {t("Smartcoin:borrow", { asset: parsedAsset.s })}
          </Button>
        </a>
        <a
          href={`/dex/index.html?market=${parsedAsset.s}_${parsedCollateralAsset.s}`}
        >
          <Button className="mr-2">
            {t("Smartcoin:buyWith", {
              asset1: parsedAsset.s,
              asset2: parsedCollateralAsset.s,
            })}
          </Button>
        </a>
        {showClosePositionDialog ? (
          <DeepLinkDialog
            operationNames={["call_order_update"]}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowClosePositionDialog}
            key={`Closing${parsedAsset.s}debtposition`}
            headerText={t("Smartcoin:closingDebtPosition", {
              asset: parsedAsset.s,
            })}
            trxJSON={[exitJSON]}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
