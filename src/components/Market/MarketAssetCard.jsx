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

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { humanReadableFloat } from "../../lib/common";

const CardRow = (properties) => {
  return (
    <div className="col-span-1">
      <div className="grid grid-cols-10">
        <div className="col-span-9">
          {properties.title}:
          <Badge variant="outline" className="ml-2 mb-1">
            {properties.button}
          </Badge>
        </div>
        <div className="col-span-1">
          <TooltipProvider>
            <Dialog>
              <DialogContent className="sm:max-w-[400px] bg-white">
                <DialogHeader>
                  <DialogTitle>{properties.dialogtitle}</DialogTitle>
                  <DialogDescription>
                    {properties.dialogdescription}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 text-gray-400"
                    >
                      ?
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>{properties.tooltip}</TooltipContent>
              </Tooltip>
            </Dialog>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default function MarketAssetCard(properties) {
  const {
    asset,
    assetData,
    tradingPairData,
    assetDetails,
    bitassetData,
    marketSearch,
    chain,
    usrBalances,
    type,
  } = properties;

  const [assetBalance, setAssetBalance] = useState(0);
  useEffect(() => {
    if (assetData && usrBalances) {
      const id = assetData.id;
      const foundBalance = usrBalances.find((x) => x.asset_id === id);
      if (foundBalance) {
        const balance = humanReadableFloat(
          foundBalance.amount,
          assetData.precision
        ).toLocaleString(undefined, {
          minimumFractionDigits: assetData.precision,
        });
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
        marketSearch.find(
          (x) => x.id === bitassetData.settlement_price.base.asset_id
        )
      );
      setQuoteAsset(
        marketSearch.find(
          (x) => x.id === bitassetData.settlement_price.quote.asset_id
        )
      );
      setBackingAsset(
        marketSearch.find(
          (x) => x.id === bitassetData.options.short_backing_asset
        )
      );
    }
  }, [bitassetData]);

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
        <div className="grid grid-cols-2 gap-3 mb-3 w-full">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-6">
                Asset info
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] bg-white">
              <DialogHeader>
                <DialogTitle>
                  {asset} ({assetData.id}) supply info
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
                    ? humanReadableFloat(
                        assetData.max_supply,
                        assetData.precision
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: assetData.precision,
                      })
                    : "???"}{" "}
                  maximum supply
                  <br />
                  {assetDetails && assetData
                    ? humanReadableFloat(
                        assetDetails.confidential_supply,
                        assetData.precision
                      )
                    : "???"}{" "}
                  {asset} in confidential supply
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <a
                  target="_blank"
                  href={
                    chain === "bitshares"
                      ? `https://blocksights.info/#/assets/${asset}`
                      : `https://blocksights.info/#/assets/${asset}?network=testnet`
                  }
                >
                  <Button variant="outline">🔗 Blocksights</Button>
                </a>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-6"
                style={{ marginLeft: "3px" }}
              >
                Asset JSON
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
                  <ScrollArea className="h-72 rounded-md border">
                    <pre>
                      {JSON.stringify(
                        { assetData, assetDetails, bitassetData },
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
        {assetDetails && assetData && marketSearch && marketSearch.length ? (
          <div className="grid grid-cols-1 gap-1 w-full">
            <CardRow
              title={"Your balance"}
              button={`${assetBalance} ${asset}`}
              dialogtitle={`${asset} (${assetData.id}) balance`}
              dialogdescription={`This is how much ${asset} you have available in your
          account.`}
              tooltip={"More about your balance"}
            />

            <CardRow
              title={"Issuer"}
              button={marketSearch.find((x) => x.id === assetData.id).u}
              dialogtitle={`${assetData.symbol}'s issuer`}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  This is the blockchain account which created this asset. Pay
                  attention to such a detail to understand what it is you're
                  buying and from whom.
                  <br />
                  In this case the issuer is:
                  <br />
                  <b>{marketSearch.find((x) => x.id === assetData.id).u}</b>
                </ul>
              }
              tooltip={"More about asset issuer"}
            />

            {assetData.market_fee_percent ? (
              <CardRow
                title={"Market fee"}
                button={`${assetData.market_fee_percent / 100} %`}
                dialogtitle={"Info on asset market fees"}
                dialogdescription={
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>
                      Asset creators can introduce market fees to passively earn
                      as trades occur.
                    </li>
                    <li>
                      The market fee only applies to one side of the trade.
                    </li>
                    <li>
                      Make sure that the market fee is reasonable before
                      proceeding.
                    </li>
                  </ul>
                }
                tooltip={"More about market fees"}
              />
            ) : null}

            <CardRow
              title={"Precision"}
              button={assetData.precision}
              dialogtitle={"Asset precision info"}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>
                    The precision of an asset is the quantity of decimal places
                    it has.
                  </li>
                  <li>
                    For example {assetData.symbol} with a precision of{" "}
                    {assetData.precision} can be traded in quantities of{" "}
                    {humanReadableFloat(1, assetData.precision)}{" "}
                    {assetData.symbol}.
                  </li>
                </ul>
              }
              tooltip={"More about asset precision"}
            />

            <CardRow
              title={"Asset type"}
              button={
                <>
                  {!bitassetData ? "User Issued Asset" : null}
                  {bitassetData && bitassetData.is_prediction_market
                    ? "Prediction market"
                    : null}
                  {bitassetData && !bitassetData.is_prediction_market
                    ? "Smartcoin"
                    : null}
                </>
              }
              dialogtitle={"Asset type info"}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>
                    {!bitassetData ? "User Issued Asset description" : null}
                    {bitassetData && bitassetData.is_prediction_market
                      ? "Prediction market description"
                      : null}
                    {bitassetData && !bitassetData.is_prediction_market
                      ? "Smartcoin description"
                      : null}
                  </li>
                </ul>
              }
              tooltip={"More about asset type"}
            />

            {bitassetData && !bitassetData.is_prediction_market ? (
              <>
                <CardRow
                  title={"Smartcoin ID"}
                  button={bitassetData.id}
                  dialogtitle={"Smartcoin ID"}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      The ID required to fetch the bitasset details like the
                      feed price, settlement price, etc.
                    </ul>
                  }
                  tooltip={"More about Smartcoin ID"}
                />

                {backingAsset ? (
                  <CardRow
                    title={"Backing asset"}
                    button={
                      <>
                        {backingAsset.s} (
                        {bitassetData.options.short_backing_asset})
                      </>
                    }
                    dialogtitle={"Backing asset info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        Smartcoins (bitassets & stablecoins) require backing
                        collateral to be lent into existence.
                        <br />
                        The backing asset is used as collateral to back the
                        smartcoin.
                        <br />
                        The backing asset is chosen by the smartcoin's issuer
                        and can't be changed once users hold it.
                      </ul>
                    }
                    tooltip={"More about backing asset"}
                  />
                ) : null}

                {bitassetData.current_feed &&
                bitassetData.current_feed.settlement_price &&
                bitassetData.settlement_price.base.amount &&
                bitassetData.settlement_price.quote.amount &&
                baseAsset &&
                quoteAsset &&
                backingAsset ? (
                  <CardRow
                    title={"Feed price"}
                    button={
                      <>
                        {(
                          humanReadableFloat(
                            bitassetData.current_feed.settlement_price.base
                              .amount,
                            baseAsset.p
                          ) /
                          humanReadableFloat(
                            bitassetData.current_feed.settlement_price.quote
                              .amount,
                            quoteAsset.p
                          )
                        ).toFixed(backingAsset.p)}{" "}
                        {baseAsset.s}/{backingAsset.s}
                      </>
                    }
                    dialogtitle={"Feed price info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          Feed producers are chosen by the asset issuer; each
                          producer contributes price feeds for the asset.
                        </li>
                        <li>
                          These price feeds are used to determine the smartcoin
                          variables, such as the settlement price, so it
                          constantly tracks the price of the backing asset.
                        </li>
                        <li>
                          Bitassets are price fed by witnesses, however user
                          created smartcoins can allow any pre-approved
                          bitshares account to provide price feeds.
                        </li>
                        <li>
                          Checking the price feed quality can help reduce your
                          risk exposure when trading/holding smartcoins.
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
                          The rate at which you'll receive backing collateral if
                          you force/instant settle smartcoins.
                        </li>
                        <li>
                          Whilst a smartcoin is in global settlement conditions,
                          new issuance is halted until conditions resolve.
                        </li>
                        <li>
                          Depending on the global settlement recovery mechanism
                          configured by the smartcoin asset issuer, the feed
                          price may be below the settlement price.
                        </li>
                      </ul>
                    }
                    tooltip={"More about this settlement price"}
                  />
                ) : null}

                <CardRow
                  title={"Feed quantity"}
                  button={bitassetData.feeds.length}
                  dialogtitle={"Smartcoin feed quantity info"}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>
                        The quantity of feed producers contributing reference
                        feed data for this smartcoin to track the true value of
                        the reference asset.
                      </li>
                      <li>
                        There can be as few as 1 feed producer for a smartcoin
                        to operate, however the greater the quantity of feed
                        producers the more stable it becomes.
                      </li>
                      <li>
                        If a smartcoin is fed by witnesses or comittee, the
                        quantity of feed producers cannot exceed the pool of
                        active witnesses and committee members.
                      </li>
                    </ul>
                  }
                  tooltip={"More about feed quantities"}
                />

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
                        })}{" "}
                        {backingAsset.s}
                      </>
                    }
                    dialogtitle={"Settlement fund info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          A settlement fund is the backing collateral held aside
                          during global settlement conditions.
                        </li>
                        <li>
                          Smartcoin holders can claim their share of the
                          settlement fund if they force/instant settle their
                          smartcoins.
                        </li>
                        <li>
                          On creation of the settlement fund the debt holders
                          have 100% backing set aside in the fund, and the rest
                          (above 100% collateral) returned to their account.
                        </li>
                      </ul>
                    }
                    tooltip={"More about settlement funds"}
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
                        })}
                        {asset}
                      </>
                    }
                    dialogtitle={"Individual settlement debt info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          The individual settlement pool. In the event of
                          individual settlements (to fund or to order), debt and
                          collateral of the margin positions which got settled
                          are moved here.
                        </li>
                        <li>
                          For individual settlement to fund, collateral assets
                          in the pool can only be retrieved through forced
                          settlements.
                        </li>
                        <li>
                          For individual settlement to order, collateral assets
                          in the pool can only be retrieved through limit
                          orders.
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
                        })}
                        {asset}
                      </>
                    }
                    dialogtitle={"Individual settlement fund info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          The amount of collateral (backing asset) collected due
                          to individual settlements.
                        </li>
                      </ul>
                    }
                    tooltip={"More about individual settlement funds"}
                  />
                ) : null}

                {bitassetData.options.force_settlement_delay_sec ? (
                  <CardRow
                    title={"Force settlement delay"}
                    button={
                      <>
                        {bitassetData.options.force_settlement_delay_sec / 60}{" "}
                        mins
                      </>
                    }
                    dialogtitle={"Force settlement delay info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          The amount of time which the blockchain will wait
                          before processing your force settlement operation.
                        </li>
                      </ul>
                    }
                    tooltip={"More about force settlement delays"}
                  />
                ) : null}

                <CardRow
                  title={"Force settlement offset"}
                  button={
                    <>
                      {bitassetData.options.force_settlement_offset_percent /
                        100}
                      %
                    </>
                  }
                  dialogtitle={"Force settlement offset info"}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>
                        A percentage offset from the price feed for settlement
                      </li>
                    </ul>
                  }
                  tooltip={"More about force settlement offset"}
                />

                <CardRow
                  title={"Max force settlement volume"}
                  button={
                    <>
                      {bitassetData.options.maximum_force_settlement_volume /
                        100}{" "}
                      %
                    </>
                  }
                  dialogtitle={"Max force settlement volume info"}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>
                        Maximum percentage of the supply that can be settled per
                        day
                      </li>
                    </ul>
                  }
                  tooltip={"More about force settlement offset"}
                />

                {bitassetData.options.extensions.black_swan_response_method ? (
                  <CardRow
                    title={"Global settlement response method"}
                    button={
                      bitassetData.options.extensions.black_swan_response_method
                    }
                    dialogtitle={
                      "Global settlement response (BSRM) method info"
                    }
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          Specifies the asset issuer configured global
                          settlement response method (BSRM)
                        </li>
                        <li>
                          Global settlement response methods handle how issuance
                          and settlement occur, specifically during highly
                          volatile market activity.
                        </li>
                      </ul>
                    }
                    tooltip={"More about global settlement response methods"}
                  />
                ) : null}

                {bitassetData.options.extensions
                  .maintenance_collateral_ratio ? (
                  <CardRow
                    title={"Maintenance collateral ratio"}
                    button={
                      <>
                        {bitassetData.options.extensions
                          .maintenance_collateral_ratio / 100}
                        %
                      </>
                    }
                    dialogtitle={"Maintenance collateral ratio info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          The minimum collateral ratio (MCR) specified by the
                          asset issuer.
                        </li>
                        <li>
                          If your debt position drops below this ratio then
                          you're likely to be margin called.
                        </li>
                        <li>
                          If your debt position is margin called, you will lose
                          the collateral plus the offset percent.
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
                        {bitassetData.options.extensions
                          .initial_collateral_ratio / 100}{" "}
                        %
                      </>
                    }
                    dialogtitle={"Initial collateral ratio info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          The initial collateral ratio (ICR) is the minimum
                          ratio required when creating a debt position.
                        </li>
                        <li>
                          Your debt position margin ratio can fall below this
                          ICR ratio, but it must stay above the MCR to avoid
                          margin call.
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
                        {bitassetData.options.extensions
                          .maximum_short_squeeze_ratio / 100}{" "}
                        %
                      </>
                    }
                    dialogtitle={"Maximum short squeeze ratio info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          The max short squeeze ratio is the maximum ratio which
                          a debt position will be protected against short
                          squeezes.
                        </li>
                      </ul>
                    }
                    tooltip={"More about the max short squeeze ratio"}
                  />
                ) : null}

                {bitassetData.options.extensions.margin_call_fee_ratio ? (
                  <CardRow
                    title={"Margin call fee ratio"}
                    button={
                      <>
                        {bitassetData.options.extensions.margin_call_fee_ratio /
                          100}{" "}
                        %
                      </>
                    }
                    dialogtitle={"Margin call fee ratio info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          Enables the asset issuer to charge a fee against
                          margin call trading.
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
                    button={
                      <>
                        {bitassetData.options.extensions
                          .force_settle_fee_percent / 100}{" "}
                        %
                      </>
                    }
                    dialogtitle={"Force settle fee percent info"}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          Enables the asset issuer to charge a fee against force
                          settlement operations.
                        </li>
                        <li>Configured by the asset issuer.</li>
                      </ul>
                    }
                    tooltip={"More about the force settle fee percent"}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
