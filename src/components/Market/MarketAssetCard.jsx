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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { humanReadableFloat } from "../../lib/common";

import ExternalLink from "../common/ExternalLink.jsx";
import CardRow from "../common/CardRow.jsx";

export default function MarketAssetCard(properties) {
  const { asset, assetData, assetDetails, bitassetData, marketSearch, chain, usrBalances, type } =
    properties;

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
      setBaseAsset(marketSearch.find((x) => x.id === bitassetData.settlement_price.base.asset_id));
      setQuoteAsset(
        marketSearch.find((x) => x.id === bitassetData.settlement_price.quote.asset_id)
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
              <span>Quote asset</span> -<span className="text-sm"> Buying</span>
            </>
          ) : null}
          {type === "sell" ? (
            <>
              <span>Base asset</span> -<span className="text-sm"> Selling</span>
            </>
          ) : null}
          {type === "pool" ? <span>Pool stake asset</span> : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm pb-2">
        <div className="grid grid-cols-3 gap-3 mb-3 w-full">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-6">
                Info
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] bg-white">
              <DialogHeader>
                <DialogTitle>
                  {asset} {assetData ? `(${assetData.id})` : ""} supply info
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
                  {asset} in total circulation
                  <br />
                  {assetDetails && assetData
                    ? humanReadableFloat(assetData.max_supply, assetData.precision).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: assetData.precision,
                        }
                      )
                    : "???"}{" "}
                  maximum supply
                  <br />
                  {assetDetails && assetData
                    ? humanReadableFloat(assetDetails.confidential_supply, assetData.precision)
                    : "???"}{" "}
                  {asset} in confidential supply
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-6" style={{ marginLeft: "3px" }}>
                Links
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white">
              <DialogHeader>
                <DialogTitle>{asset} external links</DialogTitle>
                <DialogDescription>
                  The buttons below link directly to external {asset} resources.
                  <br />
                  User discretion is advised when interacting with external resources.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <b>Explorers</b>
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
                  <b>Web wallets</b>
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
                    text={`BTWTY.com`}
                    hyperlink={`https://wallet.btwty.com/asset/${asset}?r=nftprofessional1`}
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
                JSON
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white">
              <DialogHeader>
                <DialogTitle>{asset} JSON summary data</DialogTitle>
                <DialogDescription>
                  The data used for generating {asset} limit orders.
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
              title={"Your balance"}
              button={`${assetBalance}`}
              dialogtitle={`${asset} (${assetData ? assetData.id : "?"}) balance`}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>This is how much {asset} you have available in your account.</li>
                  <li>You can use this balance to place limit orders in this market.</li>
                  <li>
                    To get more {asset}, you can create a limit order, swap assets via a liquidity
                    pool, or receive a transfer from another account.
                  </li>
                </ul>
              }
              tooltip={"More about your balance"}
            />

            <CardRow
              title={"Asset type"}
              button={
                <>
                  {!bitassetData ? "User Issued Asset" : null}
                  {bitassetData && bitassetData.is_prediction_market ? "Prediction market" : null}
                  {bitassetData && !bitassetData.is_prediction_market ? "Smartcoin" : null}
                </>
              }
              dialogtitle={`
                ${!bitassetData ? "User Issued Asset type summary" : ""}
                ${
                  bitassetData && bitassetData.is_prediction_market
                    ? "Prediction Market Asset type summary"
                    : ""
                }
                ${
                  bitassetData && !bitassetData.is_prediction_market
                    ? "Smartcoin asset type summary"
                    : ""
                }
              `}
              dialogdescription={
                <>
                  {!bitassetData ? (
                    <ScrollArea className="h-72 rounded-md border text-sm">
                      <ul className="ml-2 list-disc [&>li]:mt-2 pl-5 pr-5">
                        <li>User Issued Assets (UIA) are user created blockchain assets.</li>
                        <li>
                          Since they're user defined, they each have unique names, settings,
                          descriptions and purposes.
                        </li>
                        <li>
                          UIA which are used by Exchanges/Gateways to issue user deposited funds are
                          called Exchange Backed Assets (EBA).
                        </li>
                        <li>
                          UIA can be non-fungible tokens (NFTs) containing a variety of multimedia.
                        </li>
                        <li>UIA are used for liquidity pool share assets too.</li>
                        <li>
                          Always evaluate UIA settings, description and issuer before utilizing them
                          on the DEX to reduce your risk exposure.
                        </li>
                      </ul>
                    </ScrollArea>
                  ) : null}

                  {bitassetData && bitassetData.is_prediction_market ? (
                    <ScrollArea className="h-72 rounded-md border text-sm">
                      <ul className="ml-2 list-disc [&>li]:mt-2 pl-5 pr-5">
                        <li>
                          A Prediction Market Asset (PMA) is a specialized BitAsset such that total
                          debt and total collateral are always equal amounts (although asset IDs
                          differ).
                        </li>
                        <li>
                          No margin calls or force settlements may be performed on a prediction
                          market asset.
                        </li>
                        <li>
                          A prediction market is globally settled by the issuer after the event
                          being predicted resolves, thus a prediction market must always have the
                          global_settle permission enabled.
                        </li>
                        <li>
                          The maximum price for global settlement or short sale of a prediction
                          market asset is 1-to-1.
                        </li>
                        <li>
                          Given that the prediction market oracle is the issuer, the PMA issuer must
                          be a trusted party. PMA participants are exposed to both the risk of the
                          bet and the oracle fulfiling their role truthly.
                        </li>
                      </ul>
                    </ScrollArea>
                  ) : null}

                  {bitassetData && !bitassetData.is_prediction_market ? (
                    <ScrollArea className="h-72 rounded-md border text-sm">
                      <ul className="ml-2 list-disc [&>li]:mt-2 pl-5 pr-5">
                        <li>
                          A smartcoin is an asset which has backing collateral, an external
                          reference feed price and self-issuance.
                        </li>
                        <li>
                          Anyone can create a smartcoin, and anyone can issue smartcoins to their
                          own account given sufficient backing collateral assets.
                        </li>
                        <li>
                          Smartcoins are used by the committee-account owned bitassets; bitassets
                          (like USD, CNY, EUR) are committee branded market pegged assets (MPAs)
                          which reference external FIAT currency price feeds and are backed by BTS
                          (1.3.0) core token.
                        </li>
                        <li>
                          Users can create their own privatized bitassets (smartcoins) which
                          reference an external feed of their selection and often have highly unique
                          backing collateral requirements and recovery mechanisms implemented.
                        </li>
                        <li>
                          If you borrow smartcoins into existence, stay vigilant maintaining your
                          personal risk exposure and spend some time researching the smartcoin, its
                          options and issuer before doing so. Debt holders positions are exposed to
                          both the reference asset and backing asset price volatilities; their
                          collateral is at risk.
                        </li>
                        <li>
                          Smartcoin holders are exposed to the risk of the debt holder's backing
                          collateral falling below required minimum levels, however each smartcoin
                          has a different risk profile given their different backing collateral
                          configurations.
                        </li>
                      </ul>
                    </ScrollArea>
                  ) : null}
                </>
              }
              tooltip={"More about asset type"}
            />

            <CardRow
              title={"Issuer"}
              button={marketSearch ? marketSearch.find((x) => x.id === assetData.id).u : "?"}
              dialogtitle={`${assetData.symbol}'s issuer`}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>
                    This is the blockchain account which created this asset. Pay attention to such a
                    detail to understand what it is you're buying and from whom.
                  </li>
                  <li>
                    Asset issuer can change over time as the issuer can easily transfer ownership.
                  </li>
                  <li>
                    Committee account owned assets are usually the core bitassets maintained by the
                    committee.
                  </li>
                  <li>
                    If the issuer is 'null-account' then the ownership of the asset has effectively
                    been burned.
                  </li>
                </ul>
              }
              tooltip={"More about asset issuer"}
            />

            <CardRow
              title={"Precision"}
              button={assetData.precision}
              dialogtitle={"Asset precision info"}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>The precision of an asset is the quantity of decimal places it has.</li>
                  <li>
                    For example {assetData.symbol} with a precision of {assetData.precision} can be
                    traded in quantities of {humanReadableFloat(1, assetData.precision)}{" "}
                    {assetData.symbol}.
                  </li>
                </ul>
              }
              tooltip={"More about asset precision"}
            />

            {assetData.market_fee_percent ? (
              <CardRow
                title={"Market fee"}
                button={`${assetData.market_fee_percent / 100} %`}
                dialogtitle={"Info on asset market fees"}
                dialogdescription={
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>
                      Asset creators can introduce market fees to passively earn as trades occur.
                    </li>
                    <li>The market fee only applies to one side of the trade.</li>
                    <li>Make sure that the market fee is reasonable before proceeding.</li>
                  </ul>
                }
                tooltip={"More about market fees"}
              />
            ) : null}

            {bitassetData && !bitassetData.is_prediction_market ? (
              <>
                {backingAsset ? (
                  <CardRow
                    title={"Backing asset"}
                    button={
                      <>
                        {backingAsset.s} ({bitassetData.options.short_backing_asset})
                      </>
                    }
                    dialogtitle={"Backing asset info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          Smartcoins (bitassets & stablecoins) require backing collateral to be lent
                          into existence.
                        </li>
                        <li>The backing asset is used as collateral to back the smartcoin.</li>
                        <li>
                          The backing asset is chosen by the smartcoin's issuer and can't be changed
                          once users hold it.
                        </li>
                      </ul>
                    }
                    tooltip={"More about backing asset"}
                  />
                ) : null}

                {bitassetData.options.extensions.margin_call_fee_ratio ? (
                  <CardRow
                    title={"Margin call fee ratio"}
                    button={<>{bitassetData.options.extensions.margin_call_fee_ratio / 100} %</>}
                    dialogtitle={"Margin call fee ratio info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          Enables the asset issuer to charge a fee against margin call trading.
                        </li>
                        <li>Configured by the asset issuer.</li>
                      </ul>
                    }
                    tooltip={"More about the margin call fee ratio"}
                  />
                ) : null}

                {bitassetData.options.extensions.force_settle_fee_percent ? (
                  <CardRow
                    title={"Force settle fee percent"}
                    button={<>{bitassetData.options.extensions.force_settle_fee_percent / 100} %</>}
                    dialogtitle={"Force settle fee percent info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          Enables the asset issuer to charge a fee against force settlement
                          operations.
                        </li>
                        <li>Configured by the asset issuer.</li>
                      </ul>
                    }
                    tooltip={"More about the force settle fee percent"}
                  />
                ) : null}

                {bitassetData.settlement_fund && backingAsset ? (
                  <CardRow
                    title={"Settlement fund"}
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
                    dialogtitle={"Settlement fund info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          A settlement fund is the backing collateral held aside during global
                          settlement conditions.
                        </li>
                        <li>
                          Smartcoin holders can claim their share of the settlement fund if they
                          force/instant settle their smartcoins.
                        </li>
                        <li>
                          On creation of the settlement fund the debt holders have 100% backing set
                          aside in the fund, and the rest (above 100% collateral) returned to their
                          account.
                        </li>
                      </ul>
                    }
                    tooltip={"More about settlement funds"}
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
                    title={"Feed price"}
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
                        ).toFixed(backingAsset.p)}{" "}
                        {type === "buy" ? quoteAsset.s : baseAsset.s}/{backingAsset.s}
                      </>
                    }
                    dialogtitle={"Feed price info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          Feed producers are chosen by the asset issuer; each producer contributes
                          price feeds for the asset.
                        </li>
                        <li>
                          These price feeds are used to determine the smartcoin variables, such as
                          the settlement price, so it constantly tracks the price of the backing
                          asset.
                        </li>
                        <li>
                          Bitassets are price fed by witnesses, however user created smartcoins can
                          allow any pre-approved bitshares account to provide price feeds.
                        </li>
                        <li>
                          Checking the price feed quality can help reduce your risk exposure when
                          trading/holding smartcoins.
                        </li>
                      </ul>
                    }
                    tooltip={"More about feed prices"}
                  />
                ) : null}

                {bitassetData.settlement_price &&
                bitassetData.settlement_price.base.amount &&
                bitassetData.settlement_price.quote.amount &&
                baseAsset &&
                quoteAsset &&
                backingAsset ? (
                  <CardRow
                    title={"Settlement price"}
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
                    dialogtitle={"Settlement price info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          The rate at which you'll receive backing collateral if you force/instant
                          settle smartcoins.
                        </li>
                        <li>
                          Whilst a smartcoin is in global settlement conditions, new issuance is
                          halted until conditions resolve.
                        </li>
                        <li>
                          Depending on the global settlement recovery mechanism configured by the
                          smartcoin asset issuer, the feed price may be below the settlement price.
                        </li>
                      </ul>
                    }
                    tooltip={"More about this settlement price"}
                  />
                ) : null}

                {bitassetData.individual_settlement_debt && backingAsset ? (
                  <CardRow
                    title={"Ind. Settlement debt"}
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
                    dialogtitle={"Individual settlement debt info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          The individual settlement pool. In the event of individual settlements (to
                          fund or to order), debt and collateral of the margin positions which got
                          settled are moved here.
                        </li>
                        <li>
                          For individual settlement to fund, collateral assets in the pool can only
                          be retrieved through forced settlements.
                        </li>
                        <li>
                          For individual settlement to order, collateral assets in the pool can only
                          be retrieved through limit orders.
                        </li>
                        <li>Amount of debt due to individual settlements</li>
                      </ul>
                    }
                    tooltip={"More about individual settlement debt"}
                  />
                ) : null}

                {bitassetData.individual_settlement_fund && backingAsset ? (
                  <CardRow
                    title={"Ind. Settlement fund"}
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
                    dialogtitle={"Individual settlement fund info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          The amount of collateral (backing asset) collected due to individual
                          settlements.
                        </li>
                      </ul>
                    }
                    tooltip={"More about individual settlement funds"}
                  />
                ) : null}
              </>
            ) : null}

            {bitassetData ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-5 p-3">
                    More smartcoin info
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px] bg-white">
                  <DialogHeader>
                    <DialogTitle>Additional bitasset info</DialogTitle>
                    <DialogDescription>
                      These values don't freuqently change value but do affect traders.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1">
                    <div className="col-span-1">
                      {bitassetData && !bitassetData.is_prediction_market ? (
                        <>
                          <CardRow
                            title={"Smartcoin ID"}
                            button={bitassetData.id}
                            dialogtitle={"Smartcoin ID"}
                            dialogdescription={
                              <ul className="ml-2 list-disc [&>li]:mt-2">
                                <li>
                                  The ID required to fetch the bitasset details like the feed price,
                                  settlement price, etc.
                                </li>
                              </ul>
                            }
                            tooltip={"More about Smartcoin ID"}
                          />

                          <CardRow
                            title={"Feed quantity"}
                            button={bitassetData.feeds.length}
                            dialogtitle={"Smartcoin feed quantity info"}
                            dialogdescription={
                              <ul className="ml-2 list-disc [&>li]:mt-2">
                                <li>
                                  The quantity of feed producers contributing reference feed data
                                  for this smartcoin to track the true value of the reference asset.
                                </li>
                                <li>
                                  There can be as few as 1 feed producer for a smartcoin to operate,
                                  however the greater the quantity of feed producers the more stable
                                  it becomes.
                                </li>
                                <li>
                                  If a smartcoin is fed by witnesses or comittee, the quantity of
                                  feed producers cannot exceed the pool of active witnesses and
                                  committee members.
                                </li>
                              </ul>
                            }
                            tooltip={"More about feed quantities"}
                          />

                          {bitassetData.options.force_settlement_delay_sec ? (
                            <CardRow
                              title={"Force settlement delay"}
                              button={
                                <>{bitassetData.options.force_settlement_delay_sec / 60} mins</>
                              }
                              dialogtitle={"Force settlement delay info"}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>
                                    The amount of time which the blockchain will wait before
                                    processing your force settlement operation.
                                  </li>
                                </ul>
                              }
                              tooltip={"More about force settlement delays"}
                            />
                          ) : null}

                          <CardRow
                            title={"Force settlement offset"}
                            button={
                              <>{bitassetData.options.force_settlement_offset_percent / 100}%</>
                            }
                            dialogtitle={"Force settlement offset info"}
                            dialogdescription={
                              <ul className="ml-2 list-disc [&>li]:mt-2">
                                <li>A percentage offset from the price feed for settlement</li>
                              </ul>
                            }
                            tooltip={"More about force settlement offset"}
                          />

                          <CardRow
                            title={"Max force settlement volume"}
                            button={
                              <>{bitassetData.options.maximum_force_settlement_volume / 100} %</>
                            }
                            dialogtitle={"Max force settlement volume info"}
                            dialogdescription={
                              <ul className="ml-2 list-disc [&>li]:mt-2">
                                <li>
                                  Maximum percentage of the supply that can be settled per day
                                </li>
                              </ul>
                            }
                            tooltip={"More about force settlement offset"}
                          />

                          {bitassetData.options.extensions.black_swan_response_method ? (
                            <CardRow
                              title={"Global settlement response method"}
                              button={bitassetData.options.extensions.black_swan_response_method}
                              dialogtitle={"Global settlement response (BSRM) method info"}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>
                                    Specifies the asset issuer configured global settlement response
                                    method (BSRM)
                                  </li>
                                  <li>
                                    Global settlement response methods handle how issuance and
                                    settlement occur, specifically during highly volatile market
                                    activity.
                                  </li>
                                </ul>
                              }
                              tooltip={"More about global settlement response methods"}
                            />
                          ) : null}

                          {bitassetData.options.extensions.maintenance_collateral_ratio ? (
                            <CardRow
                              title={"Maintenance collateral ratio"}
                              button={
                                <>
                                  {bitassetData.options.extensions.maintenance_collateral_ratio /
                                    10}
                                  %
                                </>
                              }
                              dialogtitle={"Maintenance collateral ratio info"}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>
                                    The minimum collateral ratio (MCR) specified by the asset
                                    issuer.
                                  </li>
                                  <li>
                                    If your debt position drops below this ratio then you're likely
                                    to be margin called.
                                  </li>
                                  <li>
                                    If your debt position is margin called, you will lose the
                                    collateral plus the offset percent.
                                  </li>
                                </ul>
                              }
                              tooltip={"More about the maintenance collateral ratio"}
                            />
                          ) : null}

                          {bitassetData.options.extensions.initial_collateral_ratio ? (
                            <CardRow
                              title={"Initial collateral ratio"}
                              button={
                                <>
                                  {bitassetData.options.extensions.initial_collateral_ratio / 10} %
                                </>
                              }
                              dialogtitle={"Initial collateral ratio info"}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>
                                    The initial collateral ratio (ICR) is the minimum ratio required
                                    when creating a debt position.
                                  </li>
                                  <li>
                                    Your debt position margin ratio can fall below this ICR ratio,
                                    but it must stay above the MCR to avoid margin call.
                                  </li>
                                </ul>
                              }
                              tooltip={"More about the initial collateral ratio"}
                            />
                          ) : null}

                          {bitassetData.options.extensions.maximum_short_squeeze_ratio ? (
                            <CardRow
                              title={"Maximum short squeeze ratio"}
                              button={
                                <>
                                  {bitassetData.options.extensions.maximum_short_squeeze_ratio / 10}{" "}
                                  %
                                </>
                              }
                              dialogtitle={"Maximum short squeeze ratio info"}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>
                                    The max short squeeze ratio is the maximum ratio which a debt
                                    position will be protected against short squeezes.
                                  </li>
                                </ul>
                              }
                              tooltip={"More about the max short squeeze ratio"}
                            />
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
