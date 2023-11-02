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

import { humanReadableFloat, getFlagBooleans } from "../lib/common.js";
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

  const debtAssetHoldings = useMemo(() => {
    if (parsedAsset && usrBalances && usrBalances.length) {
      const foundAsset = usrBalances.find((x) => x.asset_id === parsedAsset.id);
      if (!foundAsset) {
        return 0;
      }
      const finalAmount = humanReadableFloat(foundAsset.amount, parsedAsset.p);
      return finalAmount;
    }
  }, [parsedAsset, usrBalances]);

  const collateralAssetHoldings = useMemo(() => {
    if (parsedCollateralAsset && usrBalances && usrBalances.length) {
      const foundAsset = usrBalances.find(
        (x) => x.asset_id === parsedCollateralAsset.id
      );
      if (!foundAsset) {
        return 0;
      }
      const finalAmount = humanReadableFloat(
        foundAsset.amount,
        parsedCollateralAsset.p
      );
      return finalAmount;
    }
  }, [parsedCollateralAsset, usrBalances]);

  const [finalAsset, setFinalAsset] = useState();
  const [finalBitasset, setFinalBitasset] = useState();
  const [finalCollateralAsset, setFinalCollateralAsset] = useState();
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
          setFinalCollateralAsset(data[1]);
          setFinalBitasset(data[2]);
          setUsrMarginPositions(data[3]);
          setAssetCallOrders(data[4]);
          setAssetSettleOrders(data[5]);
          setBuyOrders(data[6].asks);
          setSellOrders(data[6].bids);
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [parsedAsset, parsedBitasset, usr]);

  const settlementFund = useMemo(() => {
    if (finalAsset && parsedAsset && parsedCollateralAsset) {
      const finalSettlementFund = humanReadableFloat(
        parseInt(finalBitasset.settlement_fund),
        parsedCollateralAsset.p
      );

      const finalSettlementPrice = parseFloat(
        (
          1 /
          (humanReadableFloat(
            finalBitasset.settlement_price.quote.amount,
            parsedCollateralAsset.p
          ) /
            humanReadableFloat(
              finalBitasset.settlement_price.base.amount,
              parsedAsset.p
            ))
        ).toFixed(parsedAsset.p)
      );

      return { finalSettlementFund, finalSettlementPrice };
    }
  }, [finalBitasset, parsedAsset, parsedCollateralAsset]);

  const parsedAssetFlags = useMemo(() => {
    if (finalAsset) {
      const obj = getFlagBooleans(finalAsset.options.flags);
      return Object.keys(obj).map((key) => (
        <Badge className="mr-2">{key}</Badge>
      ));
    }
  }, [finalAsset]);

  const collateralFlags = useMemo(() => {
    if (finalCollateralAsset) {
      const obj = getFlagBooleans(finalCollateralAsset.options.flags);
      return Object.keys(obj).map((key) => (
        <Badge className="mr-2">{key}</Badge>
      ));
    }
  }, [finalCollateralAsset]);

  const parsedIsserPermissions = useMemo(() => {
    if (finalAsset) {
      const obj = getFlagBooleans(finalAsset.options.issuer_permissions);
      return Object.keys(obj).map((key) => (
        <Badge className="mr-2">{key}</Badge>
      ));
    }
  }, [finalAsset]);

  const collateralPermissions = useMemo(() => {
    if (finalCollateralAsset) {
      const obj = getFlagBooleans(
        finalCollateralAsset.options.issuer_permissions
      );
      return Object.keys(obj).map((key) => (
        <Badge className="mr-2">{key}</Badge>
      ));
    }
  }, [finalCollateralAsset]);

  const [activeOrderTab, setActiveOrderTab] = useState("buy");
  const [showDialog, setShowDialog] = useState(false);

  const [debtAmount, setDebtAmount] = useState(0);
  const [collateralAmount, setCollateralAmount] = useState(0);
  const [ratioValue, setRatioValue] = useState(0);

  const MarginPositionRow = ({ index, style }) => {
    const res = assetCallOrders[index];
    const collateralAmount = humanReadableFloat(
      res.collateral,
      parsedCollateralAsset.p
    );
    const debtAmount = humanReadableFloat(res.debt, parsedAsset.p);
    const callPrice = (
      humanReadableFloat(res.call_price.quote.amount, parsedAsset.p) /
      humanReadableFloat(res.call_price.base.amount, parsedCollateralAsset.p)
    ).toFixed(parsedAsset.p);
    const tcr = res.target_collateral_ratio
      ? `${res.target_collateral_ratio / 10}%`
      : `0%`;
    const ratio = (collateralAmount / debtAmount / 100).toFixed(3);
    return (
      <div className="grid grid-cols-6 text-sm" style={style}>
        <div className="col-span-1">
          <ExternalLink
            classNameContents="text-blue-500"
            type="text"
            text={res.borrower}
            hyperlink={`https://blocksights.info/#/accounts/${res.borrower}`}
          />
        </div>
        <div className="col-span-1">{collateralAmount}</div>
        <div className="col-span-1">{debtAmount}</div>
        <div className="col-span-1">{callPrice}</div>
        <div className="col-span-1">{tcr}</div>
        <div className="col-span-1">{ratio}</div>
      </div>
    );
  };

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

  const SettlementRow = ({ index, style }) => {
    let res = assetSettleOrders[index];
    return (
      <div className="grid grid-cols-3 text-sm" style={style}>
        <div className="col-span-1">{res.account_id_type ?? "?"}</div>
        <div className="col-span-1">{res.asset ?? "?"}</div>
        <div className="col-span-1">{res.time_point_sec ?? "?"}</div>
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
                                Available: {debtAssetHoldings ?? 0}{" "}
                                {parsedAsset ? parsedAsset.s : "?"}
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
                                Available: {collateralAssetHoldings ?? 0}{" "}
                                {parsedCollateralAsset
                                  ? parsedCollateralAsset.s
                                  : "?"}
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

          {parsedCollateralAsset &&
          parsedAsset &&
          settlementFund &&
          settlementFund.finalSettlementFund &&
          settlementFund.finalSettlementFund > 0 ? (
            <>
              <div className="grid grid-cols-1 mt-2 mb-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>{finalAsset.symbol} settlement fund</CardTitle>
                    <CardDescription>
                      This smartcoin currently has a settlement fund and so is
                      likely in a form of global settlement.
                      <br />
                      Borrowing may be unavailable until settlement is complete.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3">
                      <div className="col-span-1">
                        Fund
                        <br />
                        <span className="text-md">
                          {settlementFund.finalSettlementFund}{" "}
                          {parsedCollateralAsset.s}
                        </span>
                      </div>
                      <div className="col-span-1">
                        Price
                        <br />
                        <span className="text-md">
                          {settlementFund.finalSettlementPrice} {parsedAsset.s}/
                          {parsedCollateralAsset.s}
                        </span>
                      </div>
                      <div className="col-span-1">
                        Fund collateral ratio
                        <br />
                        <span className="text-md">
                          {settlementFund.finalSettlementPrice} {parsedAsset.s}/
                          {parsedCollateralAsset.s}
                        </span>
                      </div>
                    </div>
                    <a href="/bid/index.html">
                      <Button className="mt-3 pb-2">
                        Bid on {finalAsset.symbol}'s settlement fund
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}

          {finalAsset && parsedAsset && parsedBitasset ? (
            <Card className="mt-2">
              <CardHeader className="pb-2">
                <CardTitle>
                  About the{" "}
                  {parsedBitasset.issuer.id === "1.2.0"
                    ? "Bitasset"
                    : "Smartcoin"}{" "}
                  {parsedAsset.s} ({parsedAsset.id})
                </CardTitle>
                <CardDescription>
                  Use this information to improve your understanding of{" "}
                  {parsedAsset.s}.<br />
                  Thoroughly do your own research before proceeding to borrow
                  any smartcoins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label>
                  General asset info
                  {" ("}
                  <ExternalLink
                    classNameContents="text-blue-500"
                    type="text"
                    text="More info"
                    hyperlink={`https://blocksights.info/#/assets/${parsedAsset.id}`}
                  />
                  {")"}
                </Label>
                <br />
                <Badge className="mr-2 mt-2">Issuer: {parsedAsset.u}</Badge>
                <Badge className="mr-2">
                  Market fee: {finalAsset.options.market_fee_percent / 100}%
                </Badge>

                <br />

                <Label>
                  {parsedBitasset.issuer.id === "1.2.0"
                    ? "Bitasset info"
                    : "Smartcoin info"}
                  {" ("}
                  <ExternalLink
                    classNameContents="text-blue-500"
                    type="text"
                    text="More info"
                    hyperlink={`https://blocksights.info/#/objects/${parsedBitasset.id}`}
                  />
                  {")"}
                </Label>
                <br />
                <Badge className="mr-2">
                  Feed qty: {parsedBitasset ? parsedBitasset.feeds.length : 0}
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
                <Badge className="mr-2">
                  Collateral:{" "}
                  {parsedCollateralAsset ? parsedCollateralAsset.s : "?"}
                </Badge>
                <br />
                <Label className="pb-0">Asset flags</Label>
                <br />
                {parsedAssetFlags}
                <br />
                <Label>Asset permissions</Label>
                <br />
                {parsedIsserPermissions}
              </CardContent>
            </Card>
          ) : null}

          {finalCollateralAsset && parsedCollateralAsset ? (
            <Card className="mt-2">
              <CardHeader className="pb-2">
                <CardTitle>
                  About the backing collateral {parsedCollateralAsset.s} (
                  {parsedCollateralAsset.id})
                </CardTitle>
                <CardDescription>
                  Use this information to improve your understanding of{" "}
                  {parsedCollateralAsset.s}.<br />
                  Thoroughly do your own research before proceeding to borrow
                  any smartcoins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label>
                  General asset info
                  {" ("}
                  <ExternalLink
                    classNameContents="text-blue-500"
                    type="text"
                    text="More info"
                    hyperlink={`https://blocksights.info/#/assets/${parsedCollateralAsset.id}`}
                  />
                  {")"}
                </Label>
                <br />
                <Badge className="mr-2 mt-2">
                  Issuer: {parsedCollateralAsset.u}
                </Badge>
                <Badge className="mr-2">
                  Market fee:{" "}
                  {finalCollateralAsset.options.market_fee_percent / 100}%
                </Badge>
                <Badge className="mr-2">
                  Asset type:
                  {finalCollateralAsset.bitasset_data_id
                    ? " Smartcoin"
                    : " UIA"}
                </Badge>
                <br />
                <Label className="pb-0">Asset flags</Label>
                <br />
                {collateralFlags && collateralFlags.length ? (
                  collateralFlags
                ) : (
                  <span className="text-sm">No flags enabled</span>
                )}
                <br />
                <Label>Asset permissions</Label>
                <br />
                {collateralPermissions && collateralPermissions.length ? (
                  collateralPermissions
                ) : (
                  <span className="text-sm">No permissions activated</span>
                )}
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
                  <CardDescription>
                    Note: Only displaying the top 10 buy/sell orders
                  </CardDescription>
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                {parsedAsset && parsedCollateralAsset
                  ? `${parsedAsset.s} call orders`
                  : "Call orders loading..."}
              </CardTitle>
              <CardDescription>
                Check out other users margin positions on the dex
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetCallOrders && assetCallOrders.length ? (
                <>
                  <div className="grid grid-cols-6">
                    <div className="col-span-1">Borrower</div>
                    <div className="col-span-1">Collateral</div>
                    <div className="col-span-1">Debt</div>
                    <div className="col-span-1">Call price</div>
                    <div className="col-span-1">TCR</div>
                    <div className="col-span-1">Ratio</div>
                  </div>
                  <List
                    height={260}
                    itemCount={assetCallOrders.length}
                    itemSize={25}
                    className="w-full"
                  >
                    {MarginPositionRow}
                  </List>
                </>
              ) : null}
              {assetCallOrders && !assetCallOrders.length
                ? "No call orders found"
                : null}
              {!assetCallOrders ? "Loading..." : null}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                {parsedAsset && parsedCollateralAsset
                  ? `${parsedAsset.s} settle orders`
                  : "Settle orders loading..."}
              </CardTitle>
              <CardDescription>
                Check out other users settle orders on the dex
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetSettleOrders && assetSettleOrders.length ? (
                <>
                  <div className="grid grid-cols-6">
                    <div className="col-span-1">Owner</div>
                    <div className="col-span-1">Balance</div>
                    <div className="col-span-1">Settlement date</div>
                  </div>
                  <List
                    height={260}
                    itemCount={assetSettleOrders.length}
                    itemSize={25}
                    className="w-full"
                  >
                    {SettlementRow}
                  </List>
                </>
              ) : null}
              {assetSettleOrders && !assetSettleOrders.length
                ? "No settle orders found"
                : null}
              {!assetSettleOrders ? "Loading..." : null}
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
