import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { FixedSizeList as List } from "react-window";
import { useForm } from "react-hook-form";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { useInitCache } from "../effects/Init.ts";
import { createUserBalancesStore } from "../effects/User.ts";
import { createSmartcoinDataStore } from "../effects/Assets.ts";

import { $currentUser } from "../stores/users.ts";
import {
  $globalParamsCache,
  $bitAssetDataCache,
  $marketSearchCache,
} from "../stores/cache.ts";

import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog";

import { humanReadableFloat } from "../lib/common.js";
import ExternalLink from "./common/ExternalLink.jsx";

const activeTabStyle = {
  backgroundColor: "#252526",
  color: "white",
};

export default function Smartcoin(properties) {
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const bitAssetData = useSyncExternalStore(
    $bitAssetDataCache.subscribe,
    $bitAssetDataCache.get,
    () => true
  );

  const marketSearch = useSyncExternalStore(
    $marketSearchCache.subscribe,
    $marketSearchCache.get,
    () => true
  );

  const globalParams = useSyncExternalStore(
    $globalParamsCache.subscribe,
    $globalParamsCache.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", [
    "bitAssetData",
    "globalParams",
    "marketSearch",
  ]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            setUsrBalances(data);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 3);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const parsedUrlParams = useMemo(() => {
    if (marketSearch && marketSearch.length && window.location.search) {
      console.log("Parsing url params");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const foundParamter = params && params.id ? params.id : null;

      if (
        !foundParamter ||
        !foundParamter.length ||
        (foundParamter && !foundParamter.includes("1.3."))
      ) {
        console.log("Invalid parameter");
        return;
      }

      const poolIds =
        marketSearch && marketSearch.length
          ? marketSearch.map((x) => x.id)
          : [];
      if (!poolIds.includes(foundParamter)) {
        console.log("Invalid parameter");
        return;
      }

      return foundParamter;
    }
  }, [marketSearch]);

  const parsedAsset = useMemo(() => {
    if (parsedUrlParams && parsedUrlParams.length && marketSearch) {
      const foundAsset = marketSearch.find((x) => x.id === parsedUrlParams);
      return foundAsset;
    }
    return null;
  }, [parsedUrlParams, marketSearch]);

  const parsedBitasset = useMemo(() => {
    if (parsedAsset && bitAssetData) {
      const foundBitasset = bitAssetData.find(
        (x) => x.assetID === parsedAsset.id
      );
      return foundBitasset;
    }
    return null;
  }, [parsedAsset, bitAssetData]);

  const parsedCollateralAsset = useMemo(() => {
    if (parsedBitasset && bitAssetData) {
      const foundAsset = marketSearch.find(
        (x) => x.id === parsedBitasset.collateral
      );
      return foundAsset;
    }
    return null;
  }, [parsedBitasset, bitAssetData]);

  const [finalAsset, setFinalAsset] = useState();
  const [finalBitasset, setFinalBitasset] = useState();
  const [usrMarginPositions, setUsrMarginPositions] = useState();
  const [assetCallOrders, setAssetCallOrders] = useState();
  const [assetSettleOrders, setAssetSettleOrders] = useState();
  const [buyOrders, setBuyOrders] = useState();
  const [sellOrders, setSellOrders] = useState();

  useEffect(() => {
    let unsub;

    if (parsedBitasset && parsedBitasset && usr && usr.chain) {
      const smartcoinDataStore = createSmartcoinDataStore([
        usr.chain,
        parsedAsset.id,
        parsedBitasset.collateral,
        parsedBitasset.id,
        usr.id,
      ]);
      unsub = smartcoinDataStore.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          setFinalAsset(data[0]);
          setFinalBitasset(data[1]);
          setUsrMarginPositions(data[2]);
          setAssetCallOrders(data[3]);
          setAssetSettleOrders(data[4]);
          setBuyOrders(data[5].asks);
          setSellOrders(data[5].bids);
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [parsedAsset, parsedBitasset, usr]);

  const [activeOrderTab, setActiveOrderTab] = useState("buy");
  const [showDialog, setShowDialog] = useState(false);

  const [debtAmount, setDebtAmount] = useState(0);
  const [collateralAmount, setCollateralAmount] = useState(0);
  const [ratioValue, setRatioValue] = useState(0);

  const OrderRow = ({ index, style }) => {
    let reference;
    let res;
    let precision;
    if (activeOrderTab === "buy") {
      reference = buyOrders;
      res = buyOrders[index];
      precision = parsedAsset.p;
    } else {
      reference = sellOrders;
      res = sellOrders[index];
      precision = parsedCollateralAsset.p;
    }

    return (
      <div className="grid grid-cols-4 text-sm" style={style}>
        <div className="col-span-1">
          {parseFloat(res.price).toFixed(precision)}
        </div>
        <div className="col-span-1">{res.base}</div>
        <div className="col-span-1">{res.quote}</div>
        <div className="col-span-1">
          {reference
            .slice(0, index + 1)
            .map((x) => parseFloat(x.base))
            .reduce((acc, curr) => acc + curr, 0)
            .toFixed(precision)}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          {!parsedUrlParams || !parsedAsset || !parsedBitasset ? (
            <Card>
              <CardHeader>
                <CardTitle>⚠️ Invalid smartcoin id provided</CardTitle>
                <CardDescription>
                  Unfortunately an invalid smartcoin id has been provided;
                  unable to proceed with smartcoin issuance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                Please{" "}
                <a className="text-blue-500" href="/smartcoins/index.html">
                  return to the overview
                </a>{" "}
                and select another bitasset to proceed.
              </CardContent>
            </Card>
          ) : null}
          {parsedBitasset ? (
            <Card>
              <CardHeader>
                <CardTitle>💵 Collateral debt position form</CardTitle>
                <CardDescription>
                  You can use this form to borrow this smartcoin into existence,
                  given sufficient collateral.
                  <br />
                  Thoroughly research assets before continuing, know your risk
                  exposure and tolerances.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={() => {
                      setShowDialog(true);
                      event.preventDefault();
                    }}
                  >
                    <FormField
                      control={form.control}
                      name="borrowAsset"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <div className="grid grid-cols-2 mt-2">
                              <div className="col-span-1 mt-1">
                                Asset to borrow
                              </div>
                              <div className="col-span-1 text-right">
                                <a href="/smartcoins/index.html">
                                  <Badge>Change asset</Badge>
                                </a>
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              placeholder="Bitshares smartcoin (1.3.x)"
                              className="mb-3 mt-3"
                              value={`${parsedAsset ? parsedAsset.s : "?"} (${
                                parsedAsset ? parsedAsset.id : "?"
                              })`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Label>
                      {parsedBitasset.issuer.id === "1.2.0"
                        ? "Bitasset"
                        : "Smartcoin"}{" "}
                      info
                      {parsedAsset ? (
                        <>
                          {" ("}
                          <ExternalLink
                            classNameContents="text-blue-500"
                            type="text"
                            text="More info"
                            hyperlink={`https://blocksights.info/#/assets/${parsedAsset.id}`}
                          />
                          {")"}
                        </>
                      ) : null}
                    </Label>
                    <br />
                    <Badge className="mr-2 mt-2">
                      Feed qty:{" "}
                      {parsedBitasset ? parsedBitasset.feeds.length : 0}
                    </Badge>
                    <Badge className="mr-2">
                      MCR: {parsedBitasset ? parsedBitasset.mcr / 10 : 0} %
                    </Badge>
                    <Badge className="mr-2">
                      MSSR: {parsedBitasset ? parsedBitasset.mssr / 10 : 0} %
                    </Badge>
                    <Badge className="mr-2">
                      ICR: {parsedBitasset ? parsedBitasset.icr / 10 : 0} %
                    </Badge>

                    <FormField
                      control={form.control}
                      name="account"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account</FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              placeholder="Bitshares account (1.2.x)"
                              className="mb-3 mt-3"
                              value={`${usr.username} (${usr.id})`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="feedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {parsedAsset ? `${parsedAsset.s}'s` : ""} current
                            feed price
                          </FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              className="mb-3 mt-3"
                              value={`feed price placeholder`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="callPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Your {parsedAsset ? parsedAsset.s : ""} margin call
                            price
                          </FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              className="mb-3 mt-3"
                              value={`call price placeholder`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="debtAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <div className="grid grid-cols-2 mt-2">
                              <div className="col-span-1 mt-1">Debt amount</div>
                              <div className="col-span-1 text-right">
                                Available:
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                              if (regex.test(input)) {
                                setDebtAmount(input);
                              }
                            }}
                          >
                            <Input
                              label={`Amount of debt to issue`}
                              value={debtAmount}
                              placeholder={debtAmount}
                              className="mb-3"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="collateralAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <div className="grid grid-cols-2 mt-2">
                              <div className="col-span-1 mt-1">
                                Collateral amount
                              </div>
                              <div className="col-span-1 text-right">
                                Available:
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                              if (regex.test(input)) {
                                setCollateralAmount(input);
                              }
                            }}
                          >
                            <Input
                              label={`Amount of collateral to commit`}
                              value={collateralAmount}
                              placeholder={collateralAmount}
                              className="mb-3"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ratioValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ratio of collateral to debt</FormLabel>
                          <FormControl
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                              if (regex.test(input)) {
                                setRatioValue(input);
                              }
                            }}
                          >
                            <Input
                              label={`Ratio of collateral to debt`}
                              value={ratioValue}
                              placeholder={ratioValue}
                              className="mb-3"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!debtAmount ||
                    !collateralAmount ||
                    !ratioValue ||
                    showDialog !== false ? (
                      <Button
                        className="mt-5 mb-3"
                        variant="outline"
                        disabled
                        type="submit"
                      >
                        Submit
                      </Button>
                    ) : (
                      <Button className="mt-5 mb-3" type="submit">
                        Submit
                      </Button>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : null}

          {showDialog ? (
            <DeepLinkDialog
              operationName="call_order_update"
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setShowDialog}
              key={`Borrowing${parsedAsset.s}with${parsedCollateralAsset.s}backingcollateral`}
              headerText={`Borrowing ${parsedAsset.s} with ${parsedCollateralAsset.s} backing collateral`}
              trxJSON={[
                {
                  funding_account: usr.id,
                  delta_collateral: {
                    amount: collateralAmount,
                    asset_id: parsedBitasset.collateral,
                  },
                  delta_debt: {
                    amount: debtAmount,
                    asset_id: parsedBitasset.assetID,
                  },
                  extensions: [],
                },
              ]}
            />
          ) : null}
        </div>
        <div className="grid grid-cols-1 mt-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="grid grid-cols-2">
                <div className="col-span-1">
                  <CardTitle>
                    {parsedAsset && parsedCollateralAsset
                      ? `Order book for ${parsedAsset.s}/${parsedCollateralAsset.s}`
                      : "Order book loading..."}
                  </CardTitle>
                  <CardDescription>Note: Only showing top 10</CardDescription>
                </div>
                <div className="col-span-1 text-right">
                  <a
                    href={
                      parsedAsset && parsedCollateralAsset
                        ? `/dex/index.html?market=${parsedAsset.s}_${parsedCollateralAsset.s}`
                        : ""
                    }
                  >
                    <Button>Go to market</Button>
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-2">
                  {activeOrderTab === "buy" ? (
                    <TabsTrigger value="buy" style={activeTabStyle}>
                      Viewing buy orders
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger
                      value="buy"
                      onClick={() => setActiveOrderTab("buy")}
                    >
                      View buy orders
                    </TabsTrigger>
                  )}
                  {activeOrderTab === "sell" ? (
                    <TabsTrigger value="sell" style={activeTabStyle}>
                      Viewing sell orders
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger
                      value="sell"
                      onClick={() => setActiveOrderTab("sell")}
                    >
                      View sell orders
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="buy">
                  {buyOrders && buyOrders.length ? (
                    <>
                      <div className="grid grid-cols-4">
                        <div className="col-span-1">Price</div>
                        <div className="col-span-1">
                          {parsedCollateralAsset.s}
                        </div>
                        <div className="col-span-1">{parsedAsset.s}</div>
                        <div className="col-span-1">Total</div>
                      </div>
                      <List
                        height={260}
                        itemCount={buyOrders.length}
                        itemSize={25}
                        className="w-full"
                      >
                        {OrderRow}
                      </List>
                    </>
                  ) : null}
                  {buyOrders && !buyOrders.length
                    ? "No buy orders found"
                    : null}
                  {!buyOrders ? "Loading..." : null}
                </TabsContent>
                <TabsContent value="sell">
                  {sellOrders && sellOrders.length ? (
                    <>
                      <div className="grid grid-cols-4">
                        <div className="col-span-1">Price</div>
                        <div className="col-span-1">{parsedAsset.s}</div>
                        <div className="col-span-1">
                          {parsedCollateralAsset.s}
                        </div>
                        <div className="col-span-1">Total</div>
                      </div>
                      <List
                        height={260}
                        itemCount={sellOrders.length}
                        itemSize={25}
                        className="w-full"
                      >
                        {OrderRow}
                      </List>
                    </>
                  ) : null}
                  {sellOrders && !sellOrders.length
                    ? "No sell orders found"
                    : null}
                  {!sellOrders ? "Loading..." : null}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? (
            <CurrentUser usr={usr} />
          ) : null}
        </div>
      </div>
    </>
  );
}
