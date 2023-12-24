import { ReloadIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MarketPlaceholder(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-2 gap-5">
        <div className="col-span-1">
          <Tabs defaultValue="buy" className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-2">
              <TabsTrigger disabled value="buy" style={activeTabStyle}>
                {t("MarketPlaceholder:buyTab")}
              </TabsTrigger>
              <TabsTrigger disabled value="sell">
                {t("MarketPlaceholder:sellTab")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="buy">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>{t("MarketPlaceholder:marketLimitOrderFormTitle")}</CardTitle>
                  <CardDescription>
                    {t("MarketPlaceholder:marketLimitOrderFormDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1">
                    <div className="grid grid-cols-2 mt-2">
                      <div className="text-sm mt-1">{t("MarketPlaceholder:priceLabel")}</div>
                      <div className="text-gray-500 text-right">
                        <span variant="link">?</span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Input disabled className="mb-2" />
                    </div>
                    <div className="col-span-1 text-sm">{t("MarketPlaceholder:pricePerAsset")}</div>
                    <div className="grid grid-cols-2 mt-2">
                      <div className="text-sm mt-1">{t("MarketPlaceholder:amountLabel")}</div>
                      <div className="text-gray-500 text-right">?</div>
                    </div>
                    <div className="col-span-1">
                      <Input disabled className="mb-2" />
                    </div>
                    <div className="col-span-1 text-sm">
                      {t("MarketPlaceholder:amountDescription")}
                    </div>

                    <div className="grid grid-cols-2 mt-2">
                      <div className="text-sm mt-1">{t("MarketPlaceholder:totalLabel")}</div>
                      <div className="text-gray-500 text-right">?</div>
                    </div>
                    <div className="col-span-1">
                      <Input disabled className="mb-2" />
                    </div>
                    <div className="col-span-1 text-sm">
                      {t("MarketPlaceholder:totalDescription")}
                    </div>

                    <div className="text-sm col-span-1 mt-2">
                      {t("MarketPlaceholder:expirationLabel")}
                    </div>
                    <div className="col-span-1">
                      <Select disabled>
                        <SelectTrigger className="mb-3">
                          <SelectValue placeholder={t("MarketPlaceholder:expirationPlaceholder")} />
                        </SelectTrigger>
                      </Select>
                    </div>
                    <div className="col-span-1 text-sm">
                      {t("MarketPlaceholder:expirationDescription")}
                    </div>

                    <div className="text-sm col-span-1">{t("MarketPlaceholder:feeLabel")}</div>
                    <div className="col-span-1">
                      <Input disabled label={t("MarketPlaceholder:feeInputLabel")} />
                    </div>
                    <div className="col-span-1 text-sm">
                      {t("MarketPlaceholder:feeDescription")}
                    </div>

                    <div className="col-span-1">
                      <Button disabled className="mt-4 mb-1" variant="outline" type="submit">
                        {t("MarketPlaceholder:submitButton")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="mt-5">
            <CardHeader className="pt-4 pb-2">
              <CardTitle>{t("MarketPlaceholder:marketSummaryTitle")}</CardTitle>
              <CardDescription className="text-lg">❔/❔</CardDescription>
            </CardHeader>
            <CardContent className="text-sm pb-4">
              <div className="grid grid-cols-1 gap-2">
                <div className="grid grid-cols-5">
                  <div className="col-span-2">{t("MarketPlaceholder:latestPriceLabel")}</div>
                  <div className="col-span-3">
                    <Badge variant="outline" className="ml-2 mb-1">
                      ❔
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-5">
                  <div className="col-span-2">{t("MarketPlaceholder:24HrChangeLabel")}</div>
                  <div className="col-span-3">❔</div>
                </div>
                <div className="grid grid-cols-5">
                  <div className="col-span-2">{t("MarketPlaceholder:24HrBaseVolumeLabel")}</div>
                  <div className="col-span-3">
                    <Badge variant="outline" className="ml-2 mb-1">
                      ❔
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-5">
                  <div className="col-span-2">{t("MarketPlaceholder:24HrQuoteVolumeLabel")}</div>
                  <div className="col-span-3">
                    <Badge variant="outline" className="ml-2 mb-1">
                      ❔
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-5">
                  <div className="col-span-2">{t("MarketPlaceholder:lowestAskLabel")}</div>
                  <div className="col-span-3">
                    <Badge variant="outline" className="ml-2 mb-1">
                      ❔
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-5">
                  <div className="col-span-2">{t("MarketPlaceholder:highestBidLabel")}</div>
                  <div className="col-span-3">
                    <Badge variant="outline" className="ml-2">
                      ❔
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            <div className="flex-grow">
              <Card>
                <CardHeader className="pt-2 pb-2">
                  <CardTitle className="text-center text-lg">
                    {t("MarketPlaceholder:dexMarketControlsTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-3 gap-1">
                    <Button variant="outline" className={`h-5 p-3`}>
                      ❔
                    </Button>
                    <Button variant="outline" className="w-full h-5 p-3">
                      <ReloadIcon />
                    </Button>
                    <Button variant="outline" className={`h-5 p-3`}>
                      ❔
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-grow" style={{ paddingBottom: "0px" }}>
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle>{t("MarketPlaceholder:assetCardTitle", { asset: "?" })}</CardTitle>
                  <CardDescription className="text-lg">
                    {t("MarketPlaceholder:loadingAssetDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-grow">
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle>{t("MarketPlaceholder:assetCardTitle", { asset: "?" })}</CardTitle>
                  <CardDescription className="text-lg">
                    {t("MarketPlaceholder:loadingAssetDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mt-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>?</CardTitle>
            <CardDescription>{t("MarketPlaceholder:loadingAssetDescription")}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>?</CardTitle>
            <CardDescription>{t("MarketPlaceholder:loadingAssetDescription")}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>?</CardTitle>
            <CardDescription>{t("MarketPlaceholder:loadingAssetDescription")}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 mt-5">
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-1">
            <TabsTrigger value="buy" style={activeTabStyle}>
              {t("MarketPlaceholder:buyTabTitle")}
            </TabsTrigger>
            <TabsTrigger value="sell">{t("MarketPlaceholder:sellTabTitle")}</TabsTrigger>
          </TabsList>
          <TabsContent value="buy">
            <Card>
              <CardHeader>
                <CardTitle>{t("MarketPlaceholder:loadingMarketOrdersTitle")}</CardTitle>
                <CardDescription>
                  {t("MarketPlaceholder:loadingMarketOrdersDescription")}
                </CardDescription>
                <CardContent>
                  <Skeleton className="h-4 w-full mt-1" />
                  <Skeleton className="h-4 w-full mt-1" />
                  <Skeleton className="h-4 w-full mt-1" />
                  <Skeleton className="h-4 w-full mt-1" />
                  <Skeleton className="h-4 w-full mt-1" />
                </CardContent>
                <CardFooter>
                  <Button className="mt-5">{t("MarketPlaceholder:retryRequestButton")}</Button>
                </CardFooter>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 mt-5">
        <Tabs defaultValue="marketTrades" className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-2">
            <TabsTrigger value="marketTrades" style={activeTabStyle}>
              {t("MarketPlaceholder:marketTradesTabTitle")}
            </TabsTrigger>
            <TabsTrigger value="usrHistory">
              {t("MarketPlaceholder:yourTradesTabTitle")}
            </TabsTrigger>
            <TabsTrigger value="usrLimitOrders">
              {t("MarketPlaceholder:yourOpenOrdersTabTitle")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="marketTrades">
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="grid w-full grid-cols-2 gap-2">
                <TabsTrigger value="buy" style={activeTabStyle}>
                  {t("MarketPlaceholder:buyOrdersTabTitle")}
                </TabsTrigger>
                <TabsTrigger value="sell">{t("MarketPlaceholder:sellOrdersTabTitle")}</TabsTrigger>
              </TabsList>
              <TabsContent value="buy">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t("MarketPlaceholder:completedOrdersTitle", { asset: "?" })}
                    </CardTitle>
                    <CardDescription>
                      {t("MarketPlaceholder:recentlyCompletedOrdersDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full mt-1" />
                    <Skeleton className="h-4 w-full mt-1" />
                    <Skeleton className="h-4 w-full mt-1" />
                    <Skeleton className="h-4 w-full mt-1" />
                    <Skeleton className="h-4 w-full mt-1" />
                    <Skeleton className="h-4 w-full mt-1" />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
