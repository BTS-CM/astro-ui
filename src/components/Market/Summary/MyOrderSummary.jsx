import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { humanReadableFloat, isInvertedMarket } from "../../../lib/common";

export default function MyOrderSummary(properties) {
  const { type, assetAData, assetBData, usrLimitOrders } = properties;

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

          const minBaseAmount = humanReadableFloat(1, basePrecision);
          const minQuoteAmount = humanReadableFloat(1, quotePrecision);

          let parsedBaseAmount = humanReadableFloat(res.sell_price.base.amount, basePrecision);
          let parsedQuoteAmount = humanReadableFloat(res.sell_price.quote.amount, quotePrecision);

          let calculatedPrice = parseFloat(
            !isInverted
              ? parsedBaseAmount * parsedQuoteAmount
              : parsedBaseAmount / parsedQuoteAmount
          );

          let receivingAmount = 0;
          let payingAmount = 0;
          let price = 0;

          if (type === "buy" && !isInverted) {
            const paying = humanReadableFloat(res.for_sale, basePrecision);
            payingAmount = (calculatedPrice * paying).toFixed(quotePrecision);
            receivingAmount = paying.toFixed(basePrecision);
            price = calculatedPrice.toFixed(quotePrecision);
          } else if (type === "buy" && isInverted) {
            const paying = humanReadableFloat(res.for_sale, basePrecision);
            receivingAmount = (calculatedPrice * paying).toFixed(basePrecision);
            payingAmount = paying.toFixed(quotePrecision);
            price = calculatedPrice.toFixed(quotePrecision);
          } else if (type === "sell" && !isInverted) {
            const paying = humanReadableFloat(res.for_sale, basePrecision);
            receivingAmount = paying.toFixed(quotePrecision);
            payingAmount = (calculatedPrice * paying).toFixed(basePrecision);
            price = calculatedPrice.toFixed(basePrecision);
          } else if (type === "sell" && isInverted) {
            const paying = humanReadableFloat(res.for_sale, basePrecision);
            receivingAmount = (paying / calculatedPrice).toFixed(quotePrecision);
            payingAmount = paying.toFixed(basePrecision);
            price = calculatedPrice.toFixed(basePrecision);
          }

          return {
            ...res,
            price: price,
            paying: payingAmount,
            receiving: receivingAmount,
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
        let finalPrice = res.price;
        if (type === "buy" && res.price < minQuoteAmount) {
          finalPrice = `< ${minQuoteAmount}`;
        } else if (type === "sell" && res.price < minBaseAmount) {
          finalPrice = `< ${minBaseAmount}`;
        }

        return (
          <div className="col-span-3" key={`mos_${index}_${type}`}>
            <div className="grid grid-cols-4 border-b-2 text-sm">
              <div className="col-span-1 border-r-2 pl-3">{finalPrice}</div>
              <div className="col-span-1 border-r-2 pl-3">{res.receiving}</div>
              <div className="col-span-1 border-r-2 pl-3">{res.paying}</div>
              <div className="col-span-1 border-r-2 pl-3">{res.expiration.replace("T", " ")}</div>
            </div>
          </div>
        );
      }),
    [filteredUsrLimitOrders, assetAData, assetBData, type]
  );

  return (
    <>
      <div className="grid grid-cols-4">
        <div className="col-span-1 pl-3">Price</div>
        <div className="col-span-1 pl-3 text-md">{assetAData.symbol}</div>
        <div className="col-span-1 pl-3 text-md">{assetBData.symbol}</div>
        <div className="col-span-1 pl-3">Expiration date</div>
      </div>
      <ScrollArea className="h-72 w-full rounded-md border">
        <div className="grid grid-cols-3">{orderElements}</div>
      </ScrollArea>
    </>
  );
}
