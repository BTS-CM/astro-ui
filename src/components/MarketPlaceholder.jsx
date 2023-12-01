import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ReloadIcon } from "@radix-ui/react-icons";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MarketPlaceholder(properties) {
  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-1">
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="grid w-full grid-cols-2 gap-2">
                <TabsTrigger disabled value="buy" style={activeTabStyle}>
                  Buy
                </TabsTrigger>
                <TabsTrigger disabled value="sell">
                  Sell
                </TabsTrigger>
              </TabsList>
              <TabsContent value="buy">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Market limit order form</CardTitle>
                    <CardDescription>
                      Use this form to create a limit order operation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1">
                      <div className="grid grid-cols-2 mt-2">
                        <div className="text-sm mt-1">Price</div>
                        <div className="text-gray-500 text-right">
                          <span variant="link">?</span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Input disabled className="mb-2" />
                      </div>
                      <div className="col-span-1 text-sm">Your price per ? in ?</div>
                      <div className="grid grid-cols-2 mt-2">
                        <div className="text-sm mt-1">Amount</div>
                        <div className="text-gray-500 text-right">?</div>
                      </div>
                      <div className="col-span-1">
                        <Input disabled className="mb-2" />
                      </div>
                      <div className="col-span-1 text-sm">The amount of ? you ......</div>

                      <div className="grid grid-cols-2 mt-2">
                        <div className="text-sm mt-1">Total</div>
                        <div className="text-gray-500 text-right">?</div>
                      </div>
                      <div className="col-span-1">
                        <Input disabled className="mb-2" />
                      </div>
                      <div className="col-span-1 text-sm">The total ? you will ...</div>

                      <div className="text-sm col-span-1 mt-2">Limit order expriration</div>
                      <div className="col-span-1">
                        <Select disabled>
                          <SelectTrigger className="mb-3">
                            <SelectValue placeholder="1hr" />
                          </SelectTrigger>
                        </Select>
                      </div>
                      <div className="col-span-1 text-sm">Time till expiration...</div>

                      <div className="text-sm col-span-1">Fee</div>
                      <div className="col-span-1">
                        <Input disabled label={`fees`} />
                      </div>
                      <div className="col-span-1 text-sm">The network fee...</div>

                      <div className="col-span-1">
                        <Button disabled className="mt-4 mb-1" variant="outline" type="submit">
                          Submit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="mt-5">
              <CardHeader className="pt-4 pb-2">
                <CardTitle>Market summary</CardTitle>
                <CardDescription className="text-lg">❔/❔</CardDescription>
              </CardHeader>
              <CardContent className="text-sm pb-4">
                <div className="grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-5">
                    <div className="col-span-2">Latest price:</div>
                    <div className="col-span-3">
                      <Badge variant="outline" className="ml-2 mb-1">
                        ❔
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div className="col-span-2">24Hr change:</div>
                    <div className="col-span-3">❔</div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div className="col-span-2">24Hr base volume:</div>
                    <div className="col-span-3">
                      <Badge variant="outline" className="ml-2 mb-1">
                        ❔
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div className="col-span-2">24Hr quote volume:</div>
                    <div className="col-span-3">
                      <Badge variant="outline" className="ml-2 mb-1">
                        ❔
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div className="col-span-2">Lowest ask:</div>
                    <div className="col-span-3">
                      <Badge variant="outline" className="ml-2 mb-1">
                        ❔
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div className="col-span-2">Highest bid:</div>
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
                    <CardTitle className="text-center text-lg">DEX Market controls</CardTitle>
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
                    <CardTitle>? asset</CardTitle>
                    <CardDescription className="text-lg">Loading...</CardDescription>
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
                    <CardTitle>? asset</CardTitle>
                    <CardDescription className="text-lg">Loading...</CardDescription>
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
              <CardDescription>loading...</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>?</CardTitle>
              <CardDescription>loading...</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>?</CardTitle>
              <CardDescription>loading...</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 mt-5">
          <Tabs defaultValue="buy" className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-1">
              <TabsTrigger value="buy" style={activeTabStyle}>
                Buy
              </TabsTrigger>
              <TabsTrigger value="sell">Sell</TabsTrigger>
            </TabsList>
            <TabsContent value="buy">
              <Card>
                <CardHeader>
                  <CardTitle>Loading market orders</CardTitle>
                  <CardDescription>Fetching requested market data, please wait...</CardDescription>
                  <CardContent>
                    <Skeleton className="h-4 w-full mt-1" />
                    <Skeleton className="h-4 w-full mt-1" />
                    <Skeleton className="h-4 w-full mt-1" />
                    <Skeleton className="h-4 w-full mt-1" />
                    <Skeleton className="h-4 w-full mt-1" />
                  </CardContent>
                  <CardFooter>
                    <Button className="mt-5">Retry request</Button>
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
                Market trades
              </TabsTrigger>
              <TabsTrigger value="usrHistory">Your trades</TabsTrigger>
              <TabsTrigger value="usrLimitOrders">Your open orders</TabsTrigger>
            </TabsList>
            <TabsContent value="marketTrades">
              <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-2">
                  <TabsTrigger value="buy" style={activeTabStyle}>
                    Buy orders
                  </TabsTrigger>
                  <TabsTrigger value="sell">Sell orders</TabsTrigger>
                </TabsList>
                <TabsContent value="buy">
                  <Card>
                    <CardHeader>
                      <CardTitle>Completed ❔ orders</CardTitle>
                      <CardDescription>
                        Recently completed ❔ orders on the Bitshares DEX
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
    </>
  );
}
