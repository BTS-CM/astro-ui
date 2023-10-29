import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { humanReadableFloat } from "../../../lib/common";

export default function MyOrderSummary(properties) {
  const { type, assetAData, assetBData, usrLimitOrders } = properties;
  const refAsset = useMemo(
    () => (type === "buy" ? assetAData : assetBData),
    [type, assetAData, assetBData]
  );

  const filteredUsrLimitOrders = useMemo(
    () =>
      usrLimitOrders.filter((x) => x.sell_price.base.asset_id === refAsset.id),
    [usrLimitOrders, refAsset]
  );

  const orderElements = useMemo(
    () =>
      filteredUsrLimitOrders.map((res, index) => {
        const parsedBaseAmount = humanReadableFloat(
          res.sell_price.base.amount,
          [assetAData, assetBData].find(
            (x) => x.id === res.sell_price.base.asset_id
          )?.precision
        );

        const parsedQuoteAmount = humanReadableFloat(
          res.sell_price.quote.amount,
          [assetAData, assetBData].find(
            (x) => x.id === res.sell_price.quote.asset_id
          )?.precision
        );

        const calculated = parsedQuoteAmount / parsedBaseAmount;

        return (
          <div className="col-span-3" key={`mos_${index}_${type}`}>
            <div className="grid grid-cols-3 border-b-2 text-sm">
              <div className="col-span-1 border-r-2 pl-3">{calculated}</div>
              <div className="col-span-1 border-r-2 pl-3">{res.for_sale}</div>
              <div className="col-span-1 border-r-2 pl-3">
                {res.expiration.replace("T", " ")}
              </div>
            </div>
          </div>
        );
      }),
    [filteredUsrLimitOrders, assetAData, assetBData, type]
  );

  return (
    <>
      <div className="grid grid-cols-3">
        <div className="col-span-1 pl-3">Price</div>
        <div className="col-span-1 pl-3 text-md">Amount</div>
        <div className="col-span-1 pl-3">Expiration date</div>
      </div>
      <ScrollArea className="h-72 w-full rounded-md border">
        <div className="grid grid-cols-3">{orderElements}</div>
      </ScrollArea>
    </>
  );
}
