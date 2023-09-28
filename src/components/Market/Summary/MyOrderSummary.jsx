import { ScrollArea } from "@/components/ui/scroll-area"
import { getTimeSince, trimPrice } from "../../../lib/common";

export default function MyOrderSummary(properties) {
    const {
      type,
      assetAData,
      assetBData,
      usrLimitOrders
    } = properties;
    const refAsset = type === "buy" ? assetAData : assetBData;
    const filteredUsrLimitOrders = usrLimitOrders.filter(x => limitOrder.sell_price.base.asset_id === refAsset.id);
    return (
      <>
        <div className="grid grid-cols-3">
          <div className="col-span-1 pl-3">Price</div>
          <div className="col-span-1 pl-3 text-md">Amount</div>
          <div className="col-span-1 pl-3">Date</div>
        </div>
        <ScrollArea className="h-72 w-full rounded-md border">
          <div className="grid grid-cols-3">
            {
                filteredUsrLimitOrders.length
                    ? filteredUsrLimitOrders.map((res, index) => {
                            const splitValue = res.value.split(".");
                            const parsedValue = splitValue.length > 1
                                ? trimPrice(
                                    res.sell_price.base.amount/res.sell_price.quote.amount,
                                    type === "buy" ? assetAData.precision : assetBData.precision
                                )
                                : res.price;

                            return (
                                <div className="col-span-3" key={`mos_${index}_${type}`}>
                                    <div className="grid grid-cols-4 text-sm">
                                        <div className="col-span-1 border-r-2 pl-3">{parsedValue}</div>
                                        <div className="col-span-1 border-r-2 pl-3">{res.for_sale}</div>
                                        <div className="col-span-1 border-r-2 pl-3">{getTimeSince(res.date)}</div>
                                        <div className="col-span-1 border-r-2 pl-3">{res.value}</div>
                                    </div>
                                </div>
                            );
                        })
                    : <p>
                        {
                            type === "buy"
                                ? `You have no open buy orders in this market`
                                : `You have no sell orders in this market`
                        }
                    </p>
            }
          </div>
        </ScrollArea>
      </>
    );
}