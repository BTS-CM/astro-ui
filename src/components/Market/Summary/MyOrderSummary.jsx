import React, { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { ScrollArea } from "@/components/ui/scroll-area";
import { humanReadableFloat, isInvertedMarket } from "@/lib/common";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import ExternalLink from "@/components/common/ExternalLink.jsx";
import { $currentUser } from "@/stores/users.ts";

export default function MyOrderSummary(properties) {
  const { type, assetAData, assetBData, usrLimitOrders } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const filteredUsrLimitOrders = useMemo(
    () =>
      usrLimitOrders
        .filter((x) =>
          type === "buy"
            ? x.sell_price.base.asset_id === assetAData.id
            : x.sell_price.base.asset_id === assetBData.id
        )
        .map((res) => {
          const basePrecision = [assetAData, assetBData].find(
            (x) => x.id === res.sell_price.base.asset_id
          ).precision;

          const quotePrecision = [assetAData, assetBData].find(
            (x) => x.id === res.sell_price.quote.asset_id
          ).precision;

          const isInverted = isInvertedMarket(
            res.sell_price.base.asset_id,
            res.sell_price.quote.asset_id
          );

          //const minBaseAmount = humanReadableFloat(1, basePrecision);
          //const minQuoteAmount = humanReadableFloat(1, quotePrecision);

          let parsedBaseAmount = humanReadableFloat(res.sell_price.base.amount, basePrecision);
          let parsedQuoteAmount = humanReadableFloat(res.sell_price.quote.amount, quotePrecision);

          let price = parseFloat(
            !isInverted
              ? parsedBaseAmount * parsedQuoteAmount
              : parsedBaseAmount / parsedQuoteAmount
          );

          let receiving = 0;
          let paying = 0;
          const _paying = humanReadableFloat(res.for_sale, basePrecision);

          if (type === "buy" && !isInverted) {
            paying = (price * _paying).toFixed(quotePrecision);
            receiving = _paying.toFixed(basePrecision);
          } else if (type === "buy" && isInverted) {
            receiving = (price * _paying).toFixed(basePrecision);
            paying = _paying.toFixed(quotePrecision);
          } else if (type === "sell" && !isInverted) {
            receiving = _paying.toFixed(quotePrecision);
            paying = (price * _paying).toFixed(basePrecision);
          } else if (type === "sell" && isInverted) {
            receiving = (_paying / price).toFixed(quotePrecision);
            paying = _paying.toFixed(basePrecision);
          }

          return {
            ...res,
            price,
            paying,
            receiving,
            basePrecision,
            quotePrecision,
          };
        })
        .sort((a, b) => {
          return a.price - b.price;
        }),
    [usrLimitOrders, type, assetAData, assetBData]
  );

  const orderElements = useMemo(
    () =>
      filteredUsrLimitOrders.map((res, index) => {
        const minBaseAmount = humanReadableFloat(1, res.basePrecision);
        const minQuoteAmount = humanReadableFloat(1, res.quotePrecision);

        return (
          <Dialog key={`${type}Dialog${index}`}>
            <DialogTrigger asChild>
              <div className="col-span-3" key={`mos_${index}_${type}`}>
                <div className="grid grid-cols-4 border-b-2 text-sm">
                  <div className="col-span-1 border-r-2 pl-3">
                    {type === "buy" && res.price < minQuoteAmount ? (
                      <HoverCard key={`hover_less_than_min_${res.id.replace("1.7.", "")}`}>
                        <HoverCardTrigger>{`< ${minQuoteAmount}`}</HoverCardTrigger>
                        <HoverCardContent className={`w-${res.quotePrecision * 5}`}>
                          {res.price}
                        </HoverCardContent>
                      </HoverCard>
                    ) : null}
                    {type === "sell" && res.price < minBaseAmount ? (
                      <HoverCard key={`hover_less_than_min_${res.id.replace("1.7.", "")}`}>
                        <HoverCardTrigger>{`< ${minBaseAmount}`}</HoverCardTrigger>
                        <HoverCardContent className={`w-${res.basePrecision * 5}`}>
                          {res.price}
                        </HoverCardContent>
                      </HoverCard>
                    ) : null}
                    {type === "buy" && res.price >= minQuoteAmount
                      ? res.price.toFixed(res.quotePrecision)
                      : null}
                    {type === "sell" && res.price >= minBaseAmount
                      ? res.price.toFixed(res.basePrecision)
                      : null}
                  </div>

                  <div className="col-span-1 border-r-2 pl-3">{res.receiving}</div>
                  <div className="col-span-1 border-r-2 pl-3">{res.paying}</div>
                  <div className="col-span-1 border-r-2 pl-3">
                    {res.expiration.replace("T", " ")}
                  </div>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white">
              <DialogHeader>
                <DialogTitle>{t("MyOrderSummary:editLimitOrderTitle")}</DialogTitle>
                <DialogDescription>
                  {t("MyOrderSummary:editLimitOrderDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1">
                <div className="col-span-1">
                  {t("MyOrderSummary:selectedOpenOrderData")}
                  <ScrollArea className="h-72 rounded-md border text-sm">
                    <pre>{JSON.stringify(res, null, 2)}</pre>
                  </ScrollArea>
                </div>
                <div className="col-span-1 text-left mt-5">
                  <a href={`/order/index.html?id=${res.id}`}>
                    <Button variant="outline" className="mt-2 mr-2">
                      {t("MyOrderSummary:proceedToUpdateButton")}
                    </Button>
                  </a>
                  <ExternalLink
                    variant="outline"
                    classnamecontents=""
                    type="button"
                    text={t("MyOrderSummary:viewObjectOnBlocksights")}
                    hyperlink={usr && usr.chain ? `https://blocksights.info/#/objects/${res.id}${
                      usr.chain === "bitshares" ? "" : "?network=testnet"
                    }` : ''}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      }),
    [filteredUsrLimitOrders, assetAData, assetBData, type]
  );

  return (
    <>
      <div className="grid grid-cols-4">
        <div className="col-span-1 pl-3">{t("MyOrderSummary:priceColumnTitle")}</div>
        <div className="col-span-1 pl-3 text-md">{assetAData.symbol}</div>
        <div className="col-span-1 pl-3 text-md">{assetBData.symbol}</div>
        <div className="col-span-1 pl-3">{t("MyOrderSummary:expirationDateColumnTitle")}</div>
      </div>
      <ScrollArea className="h-72 w-full rounded-md border">
        <div className="grid grid-cols-3">{orderElements}</div>
      </ScrollArea>
    </>
  );
}
