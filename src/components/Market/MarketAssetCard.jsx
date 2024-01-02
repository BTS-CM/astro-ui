import React, { useState, useEffect } from "react";
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

import ExternalLink from "../common/ExternalLink.jsx";
import CardRow from "../common/CardRow.jsx";

import { humanReadableFloat } from "../../lib/common";

export default function MarketAssetCard(properties) {
  const { asset, assetData, assetDetails, bitassetData, marketSearch, chain, usrBalances, type } =
    properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const [assetBalance, setAssetBalance] = useState(0);
  useEffect(() => {
    if (assetData && usrBalances) {
      const id = assetData.id;
      const foundBalance = usrBalances.find((x) => x.asset_id === id);
      if (foundBalance) {
        const balance = humanReadableFloat(foundBalance.amount, assetData.precision).toLocaleString(
          undefined,
          {
            minimumFractionDigits: assetData.precision,
          }
        );
        setAssetBalance(balance);
      }
    }
  }, [assetData, usrBalances]);

  const [baseAsset, setBaseAsset] = useState();
  const [quoteAsset, setQuoteAsset] = useState();
  const [backingAsset, setBackingAsset] = useState();

  useEffect(() => {
    if (marketSearch && bitassetData) {
      setBaseAsset(
        marketSearch.find((x) => x.id === bitassetData.current_feed.settlement_price.base.asset_id)
      );
      setQuoteAsset(
        marketSearch.find((x) => x.id === bitassetData.current_feed.settlement_price.quote.asset_id)
      );
      setBackingAsset(marketSearch.find((x) => x.id === bitassetData.options.short_backing_asset));
    }
  }, [bitassetData, marketSearch]);

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle>
          {asset} {assetData ? `(${assetData.id})` : ""}
        </CardTitle>
        <CardDescription className="text-lg">
          {type === "buy" ? (
            <>
              <span>{t("MarketAssetCard:quoteAsset")}</span> -
              <span className="text-sm"> {t("MarketAssetCard:buying")}</span>
            </>
          ) : null}
          {type === "sell" ? (
            <>
              <span>{t("MarketAssetCard:baseAsset")}</span> -
              <span className="text-sm"> {t("MarketAssetCard:selling")}</span>
            </>
          ) : null}
          {type === "pool" ? <span>{t("MarketAssetCard:poolStakeAsset")}</span> : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm pb-2">
        <div className="grid grid-cols-3 gap-3 mb-3 w-full">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-6">
                {t("MarketAssetCard:supply")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] bg-white">
              <DialogHeader>
                <DialogTitle>
                  {asset} {assetData ? `(${assetData.id})` : ""} {t("MarketAssetCard:supplyInfo")}
                </DialogTitle>
                <DialogDescription>
                  {assetDetails && assetData
                    ? humanReadableFloat(
                        assetDetails.current_supply,
                        assetData.precision
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: assetData.precision,
                      })
                    : "???"}{" "}
                  {t("MarketAssetCard:totalCirculation", { asset: asset })}
                  <br />
                  {assetDetails && assetData
                    ? humanReadableFloat(assetData.max_supply, assetData.precision).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: assetData.precision,
                        }
                      )
                    : "???"}{" "}
                  {t("MarketAssetCard:maximumSupply")}
                  <br />
                  {assetDetails && assetData
                    ? humanReadableFloat(assetDetails.confidential_supply, assetData.precision)
                    : "???"}{" "}
                  {t("MarketAssetCard:confidentialSupply", { asset: asset })}
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-6" style={{ marginLeft: "3px" }}>
                {t("MarketAssetCard:links")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white">
              <DialogHeader>
                <DialogTitle>{t("MarketAssetCard:externalLinks", { asset: asset })}</DialogTitle>
                <DialogDescription>
                  {t("MarketAssetCard:externalLinksDescription", { asset: asset })}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <b>{t("MarketAssetCard:explorers")}</b>
                </div>
                <div>
                  <ExternalLink
                    variant="outline"
                    classnamecontents=""
                    type="button"
                    text={`Blocksights.info`}
                    hyperlink={
                      chain === "bitshares"
                        ? `https://blocksights.info/#/assets/${asset}`
                        : `https://blocksights.info/#/assets/${asset}?network=testnet`
                    }
                  />
                  {chain === "bitshares" ? (
                    <ExternalLink
                      variant="outline"
                      classnamecontents="ml-2"
                      type="button"
                      text={`Kibana.bts.mobi`}
                      hyperlink={`https://kibana.bts.mobi/app/dashboards#/view/c767fb10-5c58-11eb-a22a-3fca5c3996eb?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-1M,to:now))&_a=(filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'55c28590-5c51-11eb-a22a-3fca5c3996eb',key:operation_type,negate:!t,params:(query:19),type:phrase),query:(match_phrase:(operation_type:19))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'55c28590-5c51-11eb-a22a-3fca5c3996eb',key:operation_type,negate:!t,params:(query:2),type:phrase),query:(match_phrase:(operation_type:2)))),query:(language:kuery,query:'${assetData.id}'))`}
                    />
                  ) : null}
                  {chain === "bitshares" ? (
                    <ExternalLink
                      variant="outline"
                      classnamecontents="ml-2"
                      type="button"
                      text={`Bitsharescan.info (cn)`}
                      hyperlink={`https://www.bitsharescan.info/asset/${asset}`}
                    />
                  ) : null}
                </div>
                <div>
                  <b>{t("MarketAssetCard:webWallets")}</b>
                </div>
                <div>
                  <ExternalLink
                    classnamecontents=""
                    variant="outline"
                    type="button"
                    text={`BTS.exchange`}
                    hyperlink={`https://bts.exchange/#/asset/${asset}?r=nftprofessional1`}
                  />
                  <ExternalLink
                    classnamecontents="ml-2"
                    variant="outline"
                    type="button"
                    text={`XBTS.io`}
                    hyperlink={`https://ex.xbts.io/#/asset/${asset}?r=nftprofessional1`}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-6" style={{ marginLeft: "3px" }}>
                {t("MarketAssetCard:json")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white">
              <DialogHeader>
                <DialogTitle>{t("MarketAssetCard:jsonSummaryData", { asset: asset })}</DialogTitle>
                <DialogDescription>
                  {t("MarketAssetCard:jsonSummaryDataDescription", { asset: asset })}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1">
                <div className="col-span-1">
                  <ScrollArea className="h-72 rounded-md border text-sm">
                    <pre>{JSON.stringify({ assetData, assetDetails, bitassetData }, null, 2)}</pre>
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {assetDetails && assetData && marketSearch && marketSearch.length ? (
          <div className="grid grid-cols-1 gap-1 w-full">
            <CardRow
              title={t("MarketAssetCard:yourBalance")}
              button={`${assetBalance}`}
              dialogtitle={t("MarketAssetCard:assetBalance", {
                asset: asset,
                id: assetData ? assetData.id : "?",
              })}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>{t("MarketAssetCard:balanceDescription1", { asset: asset })}</li>
                  <li>{t("MarketAssetCard:balanceDescription2")}</li>
                  <li>{t("MarketAssetCard:balanceDescription3", { asset: asset })}</li>
                </ul>
              }
              tooltip={t("MarketAssetCard:balanceTooltip")}
            />

            <CardRow
              title={t("MarketAssetCard:assetType")}
              button={
                <>
                  {!bitassetData ? t("MarketAssetCard:userIssuedAsset") : null}
                  {bitassetData && bitassetData.is_prediction_market
                    ? t("MarketAssetCard:predictionMarket")
                    : null}
                  {bitassetData && !bitassetData.is_prediction_market
                    ? t("MarketAssetCard:smartcoin")
                    : null}
                </>
              }
              dialogtitle={`
                ${!bitassetData ? t("MarketAssetCard:userIssuedAssetSummary") : ""}
                ${
                  bitassetData && bitassetData.is_prediction_market
                    ? t("MarketAssetCard:predictionMarketSummary")
                    : ""
                }
                ${
                  bitassetData && !bitassetData.is_prediction_market
                    ? t("MarketAssetCard:smartcoinSummary")
                    : ""
                }
              `}
              dialogdescription={
                <>
                  {!bitassetData ? (
                    <ScrollArea className="h-72 rounded-md border text-sm">
                      <ul className="ml-2 list-disc [&>li]:mt-2 pl-5 pr-5">
                        <li>{t("MarketAssetCard:userIssuedAssetDescription1")}</li>
                        <li>{t("MarketAssetCard:userIssuedAssetDescription2")}</li>
                        <li>{t("MarketAssetCard:userIssuedAssetDescription3")}</li>
                        <li>{t("MarketAssetCard:userIssuedAssetDescription4")}</li>
                        <li>{t("MarketAssetCard:userIssuedAssetDescription5")}</li>
                        <li>{t("MarketAssetCard:userIssuedAssetDescription6")}</li>
                      </ul>
                    </ScrollArea>
                  ) : null}

                  {bitassetData && bitassetData.is_prediction_market ? (
                    <ScrollArea className="h-72 rounded-md border text-sm">
                      <ul className="ml-2 list-disc [&>li]:mt-2 pl-5 pr-5">
                        <li>{t("MarketAssetCard:predictionMarketDescription1")}</li>
                        <li>{t("MarketAssetCard:predictionMarketDescription2")}</li>
                        <li>{t("MarketAssetCard:predictionMarketDescription3")}</li>
                        <li>{t("MarketAssetCard:predictionMarketDescription4")}</li>
                        <li>{t("MarketAssetCard:predictionMarketDescription5")}</li>
                      </ul>
                    </ScrollArea>
                  ) : null}

                  {bitassetData && !bitassetData.is_prediction_market ? (
                    <ScrollArea className="h-72 rounded-md border text-sm">
                      <ul className="ml-2 list-disc [&>li]:mt-2 pl-5 pr-5">
                        <li>{t("MarketAssetCard:smartcoinDescription1")}</li>
                        <li>{t("MarketAssetCard:smartcoinDescription2")}</li>
                        <li>{t("MarketAssetCard:smartcoinDescription3")}</li>
                        <li>{t("MarketAssetCard:smartcoinDescription4")}</li>
                        <li>{t("MarketAssetCard:smartcoinDescription5")}</li>
                        <li>{t("MarketAssetCard:smartcoinDescription6")}</li>
                      </ul>
                    </ScrollArea>
                  ) : null}
                </>
              }
              tooltip={t("MarketAssetCard:moreAboutAssetType")}
            />

            <CardRow
              title={t("MarketAssetCard:issuer")}
              button={marketSearch ? marketSearch.find((x) => x.id === assetData.id).u : "?"}
              dialogtitle={t("MarketAssetCard:assetIssuer", { asset: assetData.symbol })}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>{t("MarketAssetCard:issuerDescription1")}</li>
                  <li>{t("MarketAssetCard:issuerDescription2")}</li>
                  <li>{t("MarketAssetCard:issuerDescription3")}</li>
                  <li>{t("MarketAssetCard:issuerDescription4")}</li>
                </ul>
              }
              tooltip={t("MarketAssetCard:moreAboutAssetIssuer")}
            />

            <CardRow
              title={t("MarketAssetCard:precision")}
              button={assetData.precision}
              dialogtitle={t("MarketAssetCard:assetPrecisionInfo")}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>{t("MarketAssetCard:precisionDescription1")}</li>
                  <li>
                    {t("MarketAssetCard:precisionDescription2", {
                      asset: assetData.symbol,
                      precision: assetData.precision,
                      quantity: humanReadableFloat(1, assetData.precision),
                    })}
                  </li>
                </ul>
              }
              tooltip={t("MarketAssetCard:moreAboutAssetPrecision")}
            />

            {assetData.market_fee_percent ? (
              <CardRow
                title={t("MarketAssetCard:marketFee")}
                button={`${assetData.market_fee_percent / 100} %`}
                dialogtitle={t("MarketAssetCard:infoOnAssetMarketFees")}
                dialogdescription={
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("MarketAssetCard:marketFeeDescription1")}</li>
                    <li>{t("MarketAssetCard:marketFeeDescription2")}</li>
                    <li>{t("MarketAssetCard:marketFeeDescription3")}</li>
                  </ul>
                }
                tooltip={t("MarketAssetCard:moreAboutMarketFees")}
              />
            ) : null}

            {bitassetData && !bitassetData.is_prediction_market ? (
              <>
                {backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:backingAsset")}
                    button={
                      <>
                        {backingAsset.s} ({bitassetData.options.short_backing_asset})
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:backingAssetInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>{t("MarketAssetCard:backingAssetDescription1")}</li>
                        <li>{t("MarketAssetCard:backingAssetDescription2")}</li>
                        <li>{t("MarketAssetCard:backingAssetDescription3")}</li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutBackingAsset")}
                  />
                ) : null}

                {bitassetData.options.extensions.margin_call_fee_ratio ? (
                  <CardRow
                    title={t("MarketAssetCard:marginCallFeeRatio")}
                    button={<>{bitassetData.options.extensions.margin_call_fee_ratio / 100} %</>}
                    dialogtitle={t("MarketAssetCard:marginCallFeeRatioInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>{t("MarketAssetCard:marginCallFeeRatioDescription1")}</li>
                        <li>{t("MarketAssetCard:marginCallFeeRatioDescription2")}</li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutMarginCallFeeRatio")}
                  />
                ) : null}

                {bitassetData.options.extensions.force_settle_fee_percent ? (
                  <CardRow
                    title={t("MarketAssetCard:forceSettleFeePercent")}
                    button={<>{bitassetData.options.extensions.force_settle_fee_percent / 100} %</>}
                    dialogtitle={t("MarketAssetCard:forceSettleFeePercentInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>{t("MarketAssetCard:forceSettleFeePercentDescription1")}</li>
                        <li>{t("MarketAssetCard:forceSettleFeePercentDescription2")}</li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutForceSettleFeePercent")}
                  />
                ) : null}

                {bitassetData.settlement_fund && backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:settlementFund")}
                    button={
                      <>
                        {humanReadableFloat(
                          bitassetData.settlement_fund,
                          backingAsset.p
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: backingAsset.p,
                        })}
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:settlementFundInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>{t("MarketAssetCard:settlementFundDescription1")}</li>
                        <li>{t("MarketAssetCard:settlementFundDescription2")}</li>
                        <li>{t("MarketAssetCard:settlementFundDescription3")}</li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutSettlementFunds")}
                  />
                ) : null}

                {bitassetData.current_feed &&
                bitassetData.current_feed.settlement_price &&
                bitassetData.current_feed.settlement_price.base.amount &&
                bitassetData.current_feed.settlement_price.quote.amount &&
                baseAsset &&
                quoteAsset &&
                backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:feedPrice")}
                    button={
                      <>
                        {(
                          humanReadableFloat(
                            bitassetData.current_feed.settlement_price.base.amount,
                            baseAsset.p
                          ) /
                          humanReadableFloat(
                            bitassetData.current_feed.settlement_price.quote.amount,
                            quoteAsset.p
                          )
                        ).toFixed(backingAsset.p)}
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:feedPriceInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>{t("MarketAssetCard:feedProducerDescription1")}</li>
                        <li>{t("MarketAssetCard:feedProducerDescription2")}</li>
                        <li>{t("MarketAssetCard:feedProducerDescription3")}</li>
                        <li>{t("MarketAssetCard:feedProducerDescription4")}</li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutFeedPrices")}
                  />
                ) : null}

                {bitassetData.settlement_price &&
                bitassetData.settlement_price.base.amount &&
                bitassetData.settlement_price.quote.amount &&
                baseAsset &&
                quoteAsset &&
                backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:settlementPrice")}
                    button={
                      <>
                        {(
                          humanReadableFloat(
                            bitassetData.settlement_price.base.amount,
                            baseAsset.p
                          ) /
                          humanReadableFloat(
                            bitassetData.settlement_price.quote.amount,
                            quoteAsset.p
                          )
                        ).toFixed(backingAsset.p)}{" "}
                        {baseAsset.s}/{backingAsset.s}
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:settlementPriceInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>{t("MarketAssetCard:settlementPriceDescription1")}</li>
                        <li>{t("MarketAssetCard:settlementPriceDescription2")}</li>
                        <li>{t("MarketAssetCard:settlementPriceDescription3")}</li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutSettlementPrice")}
                  />
                ) : null}

                {bitassetData.individual_settlement_debt && backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:individualSettlementDebt")}
                    button={
                      <>
                        {humanReadableFloat(
                          bitassetData.individual_settlement_debt,
                          backingAsset.p
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: backingAsset.p,
                        })}{" "}
                        {asset}
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:individualSettlementDebtInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>{t("MarketAssetCard:individualSettlementDebtDescription1")}</li>
                        <li>{t("MarketAssetCard:individualSettlementDebtDescription2")}</li>
                        <li>{t("MarketAssetCard:individualSettlementDebtDescription3")}</li>
                        <li>{t("MarketAssetCard:individualSettlementDebtDescription4")}</li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutIndividualSettlementDebt")}
                  />
                ) : null}

                {bitassetData.individual_settlement_fund && backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:individualSettlementFund")}
                    button={
                      <>
                        {humanReadableFloat(
                          bitassetData.individual_settlement_fund,
                          backingAsset.p
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: backingAsset.p,
                        })}{" "}
                        {asset}
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:individualSettlementFundInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>{t("MarketAssetCard:individualSettlementFundDescription")}</li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutIndividualSettlementFunds")}
                  />
                ) : null}
              </>
            ) : null}

            <span className="grid grid-cols-2 gap-2 mt-2">
              {bitassetData ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-5 p-3">
                      {t("MarketAssetCard:smartcoinInfoButton")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-white">
                    <DialogHeader>
                      <DialogTitle>{t("MarketAssetCard:additionalBitassetInfoTitle")}</DialogTitle>
                      <DialogDescription>
                        {t("MarketAssetCard:additionalBitassetInfoDescription")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1">
                      <div className="col-span-1">
                        {bitassetData && !bitassetData.is_prediction_market ? (
                          <>
                            <CardRow
                              title={t("MarketAssetCard:smartcoinID")}
                              button={bitassetData.id}
                              dialogtitle={t("MarketAssetCard:smartcoinIDInfo")}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>{t("MarketAssetCard:smartcoinIDDescription")}</li>
                                </ul>
                              }
                              tooltip={t("MarketAssetCard:moreAboutSmartcoinID")}
                            />

                            <CardRow
                              title={t("MarketAssetCard:feedQuantity")}
                              button={bitassetData.feeds.length}
                              dialogtitle={t("MarketAssetCard:feedQuantityInfo")}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>{t("MarketAssetCard:feedQuantityDescription1")}</li>
                                  <li>{t("MarketAssetCard:feedQuantityDescription2")}</li>
                                  <li>{t("MarketAssetCard:feedQuantityDescription3")}</li>
                                </ul>
                              }
                              tooltip={t("MarketAssetCard:moreAboutFeedQuantities")}
                            />

                            {bitassetData.options.force_settlement_delay_sec ? (
                              <CardRow
                                title={t("MarketAssetCard:forceSettlementDelay")}
                                button={
                                  <>{bitassetData.options.force_settlement_delay_sec / 60} mins</>
                                }
                                dialogtitle={t("MarketAssetCard:forceSettlementDelayInfo")}
                                dialogdescription={
                                  <ul className="ml-2 list-disc [&>li]:mt-2">
                                    <li>{t("MarketAssetCard:forceSettlementDelayDescription")}</li>
                                  </ul>
                                }
                                tooltip={t("MarketAssetCard:moreAboutForceSettlementDelays")}
                              />
                            ) : null}

                            <CardRow
                              title={t("MarketAssetCard:forceSettlementOffset")}
                              button={
                                <>{bitassetData.options.force_settlement_offset_percent / 100}%</>
                              }
                              dialogtitle={t("MarketAssetCard:forceSettlementOffsetInfo")}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>{t("MarketAssetCard:forceSettlementOffsetDescription")}</li>
                                </ul>
                              }
                              tooltip={t("MarketAssetCard:moreAboutForceSettlementOffset")}
                            />

                            <CardRow
                              title={t("MarketAssetCard:maxForceSettlementVolume")}
                              button={
                                <>{bitassetData.options.maximum_force_settlement_volume / 100} %</>
                              }
                              dialogtitle={t("MarketAssetCard:maxForceSettlementVolumeInfo")}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>
                                    {t("MarketAssetCard:maxForceSettlementVolumeDescription")}
                                  </li>
                                </ul>
                              }
                              tooltip={t("MarketAssetCard:moreAboutMaxForceSettlementVolume")}
                            />

                            {bitassetData.options.extensions.black_swan_response_method ? (
                              <CardRow
                                title={t("MarketAssetCard:globalSettlementResponseMethod")}
                                button={bitassetData.options.extensions.black_swan_response_method}
                                dialogtitle={t(
                                  "MarketAssetCard:globalSettlementResponseMethodInfo"
                                )}
                                dialogdescription={
                                  <ul className="ml-2 list-disc [&>li]:mt-2">
                                    <li>
                                      {t(
                                        "MarketAssetCard:globalSettlementResponseMethodDescription1"
                                      )}
                                    </li>
                                    <li>
                                      {t(
                                        "MarketAssetCard:globalSettlementResponseMethodDescription2"
                                      )}
                                    </li>
                                  </ul>
                                }
                                tooltip={t(
                                  "MarketAssetCard:moreAboutGlobalSettlementResponseMethods"
                                )}
                              />
                            ) : null}

                            {bitassetData.options.extensions.maintenance_collateral_ratio ? (
                              <CardRow
                                title={t("MarketAssetCard:maintenanceCollateralRatio")}
                                button={
                                  <>
                                    {bitassetData.options.extensions.maintenance_collateral_ratio /
                                      10}
                                    %
                                  </>
                                }
                                dialogtitle={t("MarketAssetCard:maintenanceCollateralRatioInfo")}
                                dialogdescription={
                                  <ul className="ml-2 list-disc [&>li]:mt-2">
                                    <li>
                                      {t("MarketAssetCard:maintenanceCollateralRatioDescription1")}
                                    </li>
                                    <li>
                                      {t("MarketAssetCard:maintenanceCollateralRatioDescription2")}
                                    </li>
                                    <li>
                                      {t("MarketAssetCard:maintenanceCollateralRatioDescription3")}
                                    </li>
                                  </ul>
                                }
                                tooltip={t("MarketAssetCard:moreAboutMaintenanceCollateralRatio")}
                              />
                            ) : null}

                            {bitassetData.options.extensions.initial_collateral_ratio ? (
                              <CardRow
                                title={t("MarketAssetCard:initialCollateralRatio")}
                                button={
                                  <>
                                    {bitassetData.options.extensions.initial_collateral_ratio / 10}{" "}
                                    %
                                  </>
                                }
                                dialogtitle={t("MarketAssetCard:initialCollateralRatioInfo")}
                                dialogdescription={
                                  <ul className="ml-2 list-disc [&>li]:mt-2">
                                    <li>
                                      {t("MarketAssetCard:initialCollateralRatioDescription1")}
                                    </li>
                                    <li>
                                      {t("MarketAssetCard:initialCollateralRatioDescription2")}
                                    </li>
                                  </ul>
                                }
                                tooltip={t("MarketAssetCard:moreAboutInitialCollateralRatio")}
                              />
                            ) : null}

                            {bitassetData.options.extensions.maximum_short_squeeze_ratio ? (
                              <CardRow
                                title={t("MarketAssetCard:maximumShortSqueezeRatio")}
                                button={
                                  <>
                                    {bitassetData.options.extensions.maximum_short_squeeze_ratio /
                                      10}{" "}
                                    %
                                  </>
                                }
                                dialogtitle={t("MarketAssetCard:maximumShortSqueezeRatioInfo")}
                                dialogdescription={
                                  <ul className="ml-2 list-disc [&>li]:mt-2">
                                    <li>
                                      {t("MarketAssetCard:maximumShortSqueezeRatioDescription")}
                                    </li>
                                  </ul>
                                }
                                tooltip={t("MarketAssetCard:moreAboutMaximumShortSqueezeRatio")}
                              />
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}

              {bitassetData ? (
                <a href={`/smartcoin/index.html?id=${assetData.id}`}>
                  <Button variant="outline" className="h-5 p-3 w-full">
                    {t("MarketAssetCard:borrowButton")}
                  </Button>
                </a>
              ) : null}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
