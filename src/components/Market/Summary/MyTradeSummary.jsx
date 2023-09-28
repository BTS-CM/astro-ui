import { ScrollArea } from "@/components/ui/scroll-area"
import { getTimeSince, trimPrice } from "../../../lib/common";

export default function MyTradeSummary(properties) {
    const {
      type,
      usrHistory,
      assetAData,
      assetBData
    } = properties;
    const filteredMarketHistory = usrHistory.filter(x => x.type === type);
    return (
      <>
        <div className="grid grid-cols-4">
          <div className="col-span-1 pl-3">Price</div>
          <div className="col-span-1 pl-3 text-md">Amount</div>
          <div className="col-span-1 pl-3">Date</div>
          <div className="col-span-1 pl-3">Total value</div>
        </div>
        <ScrollArea className="h-72 w-full rounded-md border">
          <div className="grid grid-cols-4">
            {filteredMarketHistory.map((res, index) => {
              const splitValue = res.value.split(".");
              const parsedValue = splitValue.length > 1
                ? trimPrice(
                    res.price,
                    type === "buy" ? assetAData.precision : assetBData.precision
                  )
                : res.price;
              return (
                <div className="col-span-4" key={`mts_${index}_${type}`}>
                    <div className="grid grid-cols-4 text-sm">
                        <div className="col-span-1 border-r-2 pl-3">{parsedValue}</div>
                        <div className="col-span-1 border-r-2 pl-3">{res.for_sale}</div>
                        <div className="col-span-1 border-r-2 pl-3">{getTimeSince(res.date)}</div>
                        <div className="col-span-1 border-r-2 pl-3">{res.value}</div>
                    </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </>
    );
}