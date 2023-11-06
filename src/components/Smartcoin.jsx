import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
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
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";

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
import ExternalLink from "./common/ExternalLink.jsx";
import CardRow from "./common/CardRow.jsx";

import {
  humanReadableFloat,
  getFlagBooleans,
  debounce,
} from "../lib/common.js";

const activeTabStyle = {
  backgroundColor: "#252526",
  color: "white",
};

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMilliseconds = now - date;
  const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

  if (diffInDays < 1) {
    return "today";
  } else if (diffInDays < 30) {
    return diffInDays + " days ago";
  } else {
    const diffInMonths = Math.floor(diffInDays / 30);
    return diffInMonths + " months ago";
  }
}

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

  const invalidUrlParams = useMemo(() => {
    if (marketSearch && marketSearch.length && window.location.search) {
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const foundParamter = params && params.id ? params.id : null;

      if (
        !foundParamter ||
        !foundParamter.length ||
        (foundParamter && !foundParamter.includes("1.3."))
      ) {
        console.log("Invalid parameter");
        return true;
      }

      const poolIds =
        marketSearch && marketSearch.length
          ? marketSearch.map((x) => x.id)
          : [];
      if (!poolIds.includes(foundParamter)) {
        console.log("Invalid parameter");
        return true;
      }

      return false;
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

  const currentFeedSettlementPrice = useMemo(() => {
    if (
      finalBitasset &&
      finalBitasset.current_feed &&
      parsedCollateralAsset &&
      parsedAsset
    ) {
      return parseFloat(
        (
          humanReadableFloat(
            parseInt(finalBitasset.current_feed.settlement_price.quote.amount),
            parsedCollateralAsset.p
          ) /
          humanReadableFloat(
            parseInt(finalBitasset.current_feed.settlement_price.base.amount),
            parsedAsset.p
          )
        ).toFixed(parsedCollateralAsset.p)
      );
    }
  }, [finalBitasset, parsedAsset, parsedCollateralAsset]);

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

  const [debtLock, setDebtLock] = useState(false);
  const [collateralLock, setCollateralLock] = useState(false);
  const [ratioLock, setRatioLock] = useState(false);

  const [debtAmount, setDebtAmount] = useState(0);
  const [collateralAmount, setCollateralAmount] = useState(0);
  const [ratioValue, setRatioValue] = useState(0);

  const [tcrEnabled, setTCREnabled] = useState(false);
  const [tcrValue, setTCRValue] = useState(0);

  const debouncedSetRatioValue = useCallback(
    // Throttle slider
    debounce((value) => setRatioValue(value), 100),
    []
  );

  const debouncedSetTCRValue = useCallback(
    // Throttle slider
    debounce((value) => setTCRValue(value), 100),
    []
  );

  useEffect(() => {
    if (ratioValue) {
      console.log({ ratioValue });
    }
  }, [ratioValue]);

  const MarginPositionRow = ({ index, style }) => {
    const res = assetCallOrders[index];
    const collateralAmount = humanReadableFloat(
      res.collateral,
      parsedCollateralAsset.p
    );
    const debtAmount = humanReadableFloat(res.debt, parsedAsset.p);

    const tcr = res.target_collateral_ratio
      ? `${res.target_collateral_ratio / 10}%`
      : `0%`;

    const _ratio =
      1 / ((currentFeedSettlementPrice * debtAmount) / collateralAmount);
    const ratio = parseFloat(_ratio.toFixed(3));

    const callPrice = res.target_collateral_ratio
      ? parseFloat(
          (
            currentFeedSettlementPrice *
            (collateralAmount /
              (debtAmount *
                (currentFeedSettlementPrice *
                  (res.target_collateral_ratio / 1000))))
          ).toFixed(parsedCollateralAsset.p)
        )
      : parseFloat(
          (
            currentFeedSettlementPrice *
            (collateralAmount /
              (debtAmount * (currentFeedSettlementPrice * 1.4)))
          ).toFixed(parsedCollateralAsset.p)
        );

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

  const PriceFeedRow = ({ index, style }) => {
    let res = finalBitasset.feeds[index];
    const userID = res[0];
    const date = res[1][0];
    const feedObj = res[1][1];

    return (
      <div className="grid grid-cols-11 text-sm" style={style}>
        <div className="col-span-2 mr-1">
          <ExternalLink
            classNameContents="text-blue-500"
            type="text"
            text={userID}
            hyperlink={`https://blocksights.info/#/accounts/${userID}`}
          />
        </div>
        <div className="col-span-2 ml-1">{timeAgo(date)}</div>
        <div className="col-span-2">CER</div>
        <div className="col-span-2">price</div>
        <div className="col-span-1">{feedObj.initial_collateral_ratio}</div>
        <div className="col-span-1">{feedObj.maintenance_collateral_ratio}</div>
        <div className="col-span-1">{feedObj.maximum_short_squeeze_ratio}</div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          {marketSearch && invalidUrlParams ? (
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

          {!invalidUrlParams && parsedBitasset ? (
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
                              readOnly
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              readOnly
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
                              value={
                                currentFeedSettlementPrice
                                  ? `${currentFeedSettlementPrice} ${
                                      parsedCollateralAsset.s
                                    } (${(
                                      1 / currentFeedSettlementPrice
                                    ).toFixed(parsedAsset.p)} ${
                                      parsedAsset.s
                                    }/${parsedCollateralAsset.s})`
                                  : `0 ${parsedCollateralAsset.s}`
                              }
                              readOnly
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
                              readOnly
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
                          <FormLabel>Debt amount</FormLabel>
                          <FormDescription
                            style={{ marginTop: 0, paddingTop: 0 }}
                          >
                            <div className="grid grid-cols-3 mt-0 pt-0">
                              <div className="col-span-2 mt-0 pt-0">
                                The amount of{" "}
                                {parsedAsset ? parsedAsset.s : "?"} you intend
                                to borrow into existence.
                              </div>
                              <div className="col-span-1 text-right">
                                Available: {debtAssetHoldings ?? 0}{" "}
                                {parsedAsset ? parsedAsset.s : "?"}
                              </div>
                            </div>
                          </FormDescription>
                          <FormControl
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                              if (regex.test(input)) {
                                setDebtAmount(input);
                              }
                            }}
                          >
                            <div className="grid grid-cols-12">
                              <div className="col-span-1">
                                <Toggle
                                  variant="outline"
                                  onClick={() => {
                                    if (!debtLock) {
                                      setRatioLock(false);
                                      setCollateralLock(false);
                                    }
                                    setDebtLock(!debtLock);
                                  }}
                                >
                                  {debtLock ? "🔒" : "🔓"}
                                </Toggle>
                              </div>
                              <div className="col-span-11">
                                <Input
                                  label={`Amount of debt to issue`}
                                  value={debtAmount}
                                  placeholder={debtAmount}
                                  onChange={(event) => {
                                    const input = event.target.value;
                                    const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                                    if (regex.test(input)) {
                                      setDebtAmount(input);
                                    }
                                  }}
                                  className="mb-3"
                                />
                              </div>
                            </div>
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
                          <FormLabel>Collateral amount</FormLabel>
                          <FormDescription
                            style={{ marginTop: 0, paddingTop: 0 }}
                          >
                            <div className="grid grid-cols-3 mt-0 pt-0">
                              <div className="col-span-2 mt-0 pt-0">
                                The amount of {parsedCollateralAsset.s} backing
                                collateral you'll need to provide.
                              </div>
                              <div className="col-span-1 text-right">
                                Available: {collateralAssetHoldings ?? 0}{" "}
                                {parsedCollateralAsset
                                  ? parsedCollateralAsset.s
                                  : "?"}
                              </div>
                            </div>
                          </FormDescription>
                          <FormControl
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                              if (regex.test(input)) {
                                setCollateralAmount(input);
                              }
                            }}
                          >
                            <div className="grid grid-cols-12">
                              <div className="col-span-1">
                                <Toggle
                                  variant="outline"
                                  onClick={() => {
                                    if (!collateralLock) {
                                      setRatioLock(false);
                                      setDebtLock(false);
                                    }
                                    setCollateralLock(!collateralLock);
                                  }}
                                >
                                  {collateralLock ? "🔒" : "🔓"}
                                </Toggle>
                              </div>
                              <div className="col-span-11">
                                <Input
                                  label={`Amount of collateral to commit`}
                                  value={collateralAmount}
                                  placeholder={collateralAmount}
                                  className="mb-3"
                                />
                              </div>
                            </div>
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
                            <div className="grid grid-cols-12">
                              <div className="col-span-1">
                                <Toggle
                                  variant="outline"
                                  onClick={() => {
                                    if (!ratioLock) {
                                      setDebtLock(false);
                                      setCollateralLock(false);
                                    }
                                    setRatioLock(!ratioLock);
                                  }}
                                >
                                  {ratioLock ? "🔒" : "🔓"}
                                </Toggle>
                              </div>
                              <div className="col-span-11">
                                <Input
                                  label={`Ratio of collateral to debt`}
                                  value={ratioValue}
                                  placeholder={ratioValue}
                                  className="mb-3"
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Slider
                      defaultValue={[ratioValue ?? 2]}
                      max={20}
                      min={parsedBitasset.mcr / 1000}
                      step={0.1}
                      onValueChange={(value) => {
                        debouncedSetRatioValue(value[0]);
                      }}
                    />
                    <br />
                    <div className="items-top flex space-x-2">
                      <Checkbox
                        id="terms1"
                        onClick={() => {
                          setTCREnabled(!tcrEnabled);
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="terms1"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Enable Target Collateral Ratio
                        </label>
                      </div>
                    </div>
                    {tcrEnabled ? (
                      <div className="ml-6">
                        <FormField
                          control={form.control}
                          name="tcrValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Target collateral ratio value
                              </FormLabel>
                              <FormDescription>
                                Provide a ratio for the blockchain to
                                automatically maintain through collateral sales.
                              </FormDescription>
                              <FormControl
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                                  if (regex.test(input)) {
                                    setTCRValue(input);
                                  }
                                }}
                              >
                                <Input
                                  label={`Ratio of collateral to debt`}
                                  value={tcrValue}
                                  placeholder={tcrValue}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Slider
                          className="mt-3"
                          defaultValue={[tcrValue ?? parsedBitasset.mcr / 1000]}
                          max={20}
                          min={parsedBitasset.mcr / 1000}
                          step={0.1}
                          onValueChange={(value) => {
                            debouncedSetTCRValue(value[0]);
                          }}
                        />
                      </div>
                    ) : null}

                    <FormField
                      control={form.control}
                      name="networkFee"
                      render={({ field }) => (
                        <FormItem className="mb-1 mt-3">
                          <FormLabel>Network broadcast fee</FormLabel>
                          <FormDescription>
                            The fee required to broadcast your call order update
                            operation onto the blockchain
                          </FormDescription>
                          <FormControl>
                            <Input
                              disabled
                              value={`${fee ?? "?"} BTS`}
                              readOnly
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
          {!invalidUrlParams && !parsedBitasset ? (
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
                  <form>
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
                              readOnly
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

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
                                <Badge>Change asset</Badge>
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              placeholder="Bitshares smartcoin (1.3.x)"
                              className="mb-3 mt-3"
                              readOnly
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="feedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>current feed price</FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              className="mb-3 mt-3"
                              placeholder="?"
                              readOnly
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
                          <FormLabel>Your margin call price</FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              className="mb-3 mt-3"
                              value={`call price placeholder`}
                              readOnly
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
                          <FormLabel>Debt amount</FormLabel>
                          <FormDescription
                            style={{ marginTop: 0, paddingTop: 0 }}
                          >
                            <div className="grid grid-cols-3 mt-0 pt-0">
                              <div className="col-span-2 mt-0 pt-0 text-sm">
                                The amount of ? you intend to borrow into
                                existence.
                              </div>
                              <div className="col-span-1 text-right text-sm">
                                Available: 0 ?
                              </div>
                            </div>
                          </FormDescription>
                          <FormControl>
                            <div className="grid grid-cols-12">
                              <div className="col-span-1">
                                <Toggle variant="outline">🔓</Toggle>
                              </div>
                              <div className="col-span-11">
                                <Input
                                  label={`Amount of debt to issue`}
                                  placeholder="0"
                                  className="mb-3"
                                />
                              </div>
                            </div>
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
                          <FormLabel>Collateral amount</FormLabel>
                          <FormDescription
                            style={{ marginTop: 0, paddingTop: 0 }}
                          >
                            <div className="grid grid-cols-3 mt-0 pt-0">
                              <div className="col-span-2 mt-0 pt-0 text-sm">
                                The amount of ? backing collateral you'll need
                                to provide.
                              </div>
                              <div className="col-span-1 text-right text-sm">
                                Available: 0 ?
                              </div>
                            </div>
                          </FormDescription>
                          <FormControl>
                            <div className="grid grid-cols-12">
                              <div className="col-span-1">
                                <Toggle variant="outline">🔓</Toggle>
                              </div>
                              <div className="col-span-11">
                                <Input
                                  label={`Amount of collateral to commit`}
                                  placeholder="0"
                                  className="mb-3"
                                />
                              </div>
                            </div>
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
                          <FormControl>
                            <div className="grid grid-cols-12">
                              <div className="col-span-1">
                                <Toggle variant="outline">🔓</Toggle>
                              </div>
                              <div className="col-span-11">
                                <Input
                                  label={`Ratio of collateral to debt`}
                                  placeholder="0"
                                  className="mb-3"
                                  onChange={(event) => {
                                    const input = event.target.value;
                                    const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                                    if (regex.test(input)) {
                                      setRatioValue(input);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Slider defaultValue={[2]} max={20} min={1.4} step={0.1} />
                    <br />
                    <div className="items-top flex space-x-2">
                      <Checkbox id="terms1" />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="terms1"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Enable Target Collateral Ratio
                        </label>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="networkFee"
                      render={({ field }) => (
                        <FormItem className="mb-1 mt-3">
                          <FormLabel>Network broadcast fee</FormLabel>
                          <FormDescription>
                            The fee required to broadcast your call order update
                            operation onto the blockchain
                          </FormDescription>
                          <FormControl>
                            <Input disabled value={`? BTS`} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      className="mt-5 mb-3"
                      variant="outline"
                      disabled
                      type="submit"
                    >
                      Submit
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : null}

          {!invalidUrlParams &&
          parsedCollateralAsset &&
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
                    <div className="grid grid-cols-4">
                      <div className="col-span-1">
                        Fund
                        <br />
                        <span className="text-sm">
                          {settlementFund.finalSettlementFund}
                          <br />
                          {parsedCollateralAsset.s}
                        </span>
                      </div>
                      <div className="col-span-1">
                        Settlement price
                        <br />
                        <span className="text-sm">
                          {settlementFund.finalSettlementPrice}
                          <br />
                          {parsedAsset.s}/{parsedCollateralAsset.s}
                        </span>
                      </div>
                      <div className="col-span-1">
                        Current price
                        <br />
                        <span className="text-sm">
                          {(1 / currentFeedSettlementPrice).toFixed(
                            parsedAsset.p
                          )}
                          <br />
                          {parsedAsset.s}/{parsedCollateralAsset.s}
                        </span>
                      </div>
                      <div className="col-span-1">
                        Funding ratio
                        <br />
                        <span className="text-sm">
                          {(
                            (1 /
                              currentFeedSettlementPrice /
                              settlementFund.finalSettlementPrice) *
                            100
                          ).toFixed(2)}
                          {" % ("}
                          <span className="text-red-500">
                            {"-"}
                            {100 -
                              (
                                (1 /
                                  currentFeedSettlementPrice /
                                  settlementFund.finalSettlementPrice) *
                                100
                              ).toFixed(2)}
                            {" %"}
                          </span>
                          {")"}
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

          {!invalidUrlParams && finalAsset && parsedAsset && parsedBitasset ? (
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
                <div className="grid grid-cols-11 gap-1 w-full text-sm">
                  <div className="col-span-5">
                    <div className="grid grid-cols-1 gap-1 w-full text-sm">
                      <CardRow
                        title={"Issuer"}
                        button={parsedAsset.u.split(" ")[0]}
                        dialogtitle={`${parsedAsset.s}'s issuer`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              This is the blockchain account which created this
                              asset. Pay attention to such a detail to
                              understand what it is you're buying and from whom.
                            </li>
                            <li>
                              Asset issuer can change over time as the issuer
                              can easily transfer ownership.
                            </li>
                            <li>
                              Committee account owned assets are usually the
                              core bitassets maintained by the committee.
                            </li>
                            <li>
                              If the issuer is 'null-account' then the ownership
                              of the asset has effectively been burned.
                            </li>
                          </ul>
                        }
                        tooltip={"More about asset issuer"}
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center items-center">
                    <Separator orientation="vertical" />
                  </div>
                  <div className="col-span-5">
                    <div className="grid grid-cols-1 gap-1 w-full text-sm">
                      <CardRow
                        title={"Market fee"}
                        button={`${
                          finalAsset.options.market_fee_percent / 100
                        }%`}
                        dialogtitle={`${parsedAsset.s}'s market fee`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              Asset creators can introduce market fees to
                              passively earn as trades occur.
                            </li>
                            <li>
                              The market fee only applies to one side of the
                              trade.
                            </li>
                            <li>
                              Make sure that the market fee is reasonable before
                              proceeding.
                            </li>
                          </ul>
                        }
                        tooltip={"More about asset issuer"}
                      />
                    </div>
                  </div>
                </div>

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

                <div className="grid grid-cols-11 gap-1 w-full text-sm">
                  <div className="col-span-5">
                    <div className="grid grid-cols-1 gap-1 w-full text-sm">
                      <CardRow
                        title={"Feed qty"}
                        button={
                          parsedBitasset ? parsedBitasset.feeds.length : 0
                        }
                        dialogtitle={`${parsedAsset.s} smartcoin price feed quantity`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              This is the quantity of unique recently published
                              price feeds.
                            </li>
                            <li>
                              The more feeds, the more decentralized the price
                              feed arguably is.
                            </li>
                            <li>
                              Some assets are fed by the committee or the
                              witnesses, such as the bitassets.
                            </li>
                            <li>
                              Private smartcoins can be fed by custom price feed
                              publishers.
                            </li>
                            <li>
                              You should verify the correctness and the
                              trustworthiness of price feeds to reduce your risk
                              exposure.
                            </li>
                          </ul>
                        }
                        tooltip={"More about smartcoin price feed quantities"}
                      />
                      <CardRow
                        title={"MCR"}
                        button={`${
                          parsedBitasset ? parsedBitasset.mcr / 10 : 0
                        } %`}
                        dialogtitle={`${parsedAsset.s} minimum collateral requirements`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              The minimum collateral requirement is set by the
                              issuer, any margin position which fails to
                              maintain a backing collateral ratio above this
                              value will face margin call.
                            </li>
                          </ul>
                        }
                        tooltip={
                          "More about smartcoin minimum collateral requirements"
                        }
                      />

                      <CardRow
                        title={"MSSR"}
                        button={`${
                          parsedBitasset ? parsedBitasset.mssr / 10 : 0
                        } %`}
                        dialogtitle={`${parsedAsset.s} maximum Short Squeeze Ratio`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              Maximum Short Squeeze Ratio (MSSR): Max.
                              liquidation penalty.
                            </li>
                          </ul>
                        }
                        tooltip={
                          "More about smartcoin Maximum Short Squeeze Ratio"
                        }
                      />

                      <CardRow
                        title={"ICR"}
                        button={`${
                          parsedBitasset ? parsedBitasset.icr / 10 : 0
                        } %`}
                        dialogtitle={`${parsedAsset.s} Initial Collateral Ratio`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              Initial Collateral Ratio (ICR): Minimum CR for
                              updating margin position.
                            </li>
                          </ul>
                        }
                        tooltip={
                          "More about smartcoin Initial Collateral Ratio"
                        }
                      />

                      <CardRow
                        title={"Collateral asset"}
                        button={
                          parsedCollateralAsset ? parsedCollateralAsset.s : "?"
                        }
                        dialogtitle={`${parsedAsset.s} smartcoin backing collateral asset`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              This is the asset which is used as collateral for
                              issuing this smartcoin.
                            </li>
                          </ul>
                        }
                        tooltip={
                          "More about smartcoin backing collateral assets"
                        }
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center items-center">
                    <Separator orientation="vertical" />
                  </div>
                  <div className="col-span-5">
                    <div className="grid grid-cols-1 gap-1 w-full text-sm">
                      {finalBitasset &&
                      finalBitasset.options.extensions &&
                      finalBitasset.options.extensions
                        .force_settle_fee_percent ? (
                        <CardRow
                          title={"Force settle fee"}
                          button={`${
                            finalBitasset.options.extensions
                              .force_settle_fee_percent / 100
                          }%`}
                          dialogtitle={`${parsedAsset.s} force settlement fee`}
                          dialogdescription={
                            <ul className="ml-2 list-disc [&>li]:mt-2">
                              <li>
                                If you choose to force settle a smartcoin in
                                return for its backing collateral, you will pay
                                this fee.
                              </li>
                            </ul>
                          }
                          tooltip={"More about smartcoin force settlement fees"}
                        />
                      ) : null}

                      {finalBitasset &&
                      finalBitasset.options.extensions &&
                      finalBitasset.options.extensions.margin_call_fee_ratio ? (
                        <CardRow
                          title={"Margin call fee"}
                          button={`${
                            finalBitasset.options.extensions
                              .margin_call_fee_ratio / 100
                          }%`}
                          dialogtitle={`${parsedAsset.s} margin call fee`}
                          dialogdescription={
                            <ul className="ml-2 list-disc [&>li]:mt-2">
                              <li>
                                If your call order is margin called, this fee
                                will be applied.
                              </li>
                              <li>
                                Bear such a fee in mind before you enter into a
                                margin position.
                              </li>
                            </ul>
                          }
                          tooltip={"More about smartcoin margin call fees"}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

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

          {!invalidUrlParams &&
          (!finalAsset || !parsedAsset || !parsedBitasset) ? (
            <Card className="mt-2">
              <CardHeader className="pb-2">
                <CardTitle>About this asset (1.3.x)</CardTitle>
                <CardDescription>
                  Use this information to improve your understanding
                  <br />
                  Thoroughly do your own research before proceeding to borrow
                  any smartcoins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label>General asset info (more info)</Label>
                <br />
                Loading...
                <br />
                <Label>Smartcoin info (more info)</Label>
                <br />
                Loading...
                <br />
                <Label>Asset flags</Label>
                <br />
                Loading...
                <br />
                <Label>Asset permissions</Label>
                <br />
                Loading...
              </CardContent>
            </Card>
          ) : null}

          {!invalidUrlParams &&
          finalCollateralAsset &&
          parsedCollateralAsset ? (
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
                <Badge variant="outline" className="mr-2 mt-2">
                  Issuer: {parsedCollateralAsset.u}
                </Badge>
                <Badge variant="outline" className="mr-2">
                  Market fee:{" "}
                  {finalCollateralAsset.options.market_fee_percent / 100}%
                </Badge>
                <Badge variant="outline" className="mr-2">
                  Asset type:
                  {finalCollateralAsset.bitasset_data_id
                    ? " Smartcoin"
                    : " UIA"}
                </Badge>

                {finalCollateralAsset &&
                finalCollateralAsset.options.extensions &&
                finalCollateralAsset.options.extensions
                  .force_settle_fee_percent ? (
                  <Badge className="mr-2">
                    Force settle fee:{" "}
                    {finalCollateralAsset.options.extensions
                      .force_settle_fee_percent / 100}{" "}
                    %
                  </Badge>
                ) : null}
                {finalCollateralAsset &&
                finalCollateralAsset.options.extensions &&
                finalCollateralAsset.options.extensions
                  .margin_call_fee_ratio ? (
                  <Badge className="mr-2">
                    Margin call fee:{" "}
                    {finalCollateralAsset.options.extensions
                      .margin_call_fee_ratio / 100}{" "}
                    %
                  </Badge>
                ) : null}
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

          {!invalidUrlParams &&
          (!finalCollateralAsset || !parsedCollateralAsset) ? (
            <Card className="mt-2">
              <CardHeader className="pb-2">
                <CardTitle>About the backing collateral ? (1.3.x)</CardTitle>
                <CardDescription>
                  Use this information to improve your understanding of ?.
                  <br />
                  Thoroughly do your own research before proceeding to borrow
                  any smartcoins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label>General asset info (more info)</Label>
                <br />
                Loading...
                <br />
                <Label className="pb-0">Asset flags</Label>
                <br />
                Loading...
                <br />
                <Label>Asset permissions</Label>
                <br />
                Loading...
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

        {!invalidUrlParams ? (
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
        ) : null}

        {!invalidUrlParams ? (
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
        ) : null}

        {!invalidUrlParams ? (
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
        ) : null}

        {!invalidUrlParams ? (
          <div className="grid grid-cols-1 mt-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>
                  {parsedAsset && parsedCollateralAsset
                    ? `${parsedAsset.s} price feeds`
                    : "Price feeds loading..."}
                </CardTitle>
                <CardDescription>
                  Check out the latest published price feeds for this smartcoin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {finalBitasset && finalBitasset.feeds ? (
                  <>
                    <div className="grid grid-cols-11">
                      <div className="col-span-2">User</div>
                      <div className="col-span-2">Date</div>
                      <div className="col-span-2">CER</div>
                      <div className="col-span-2">Settlement</div>
                      <div className="col-span-1">ICR</div>
                      <div className="col-span-1">MCR</div>
                      <div className="col-span-1">MSSR</div>
                    </div>
                    <List
                      height={260}
                      itemCount={finalBitasset.feeds.length}
                      itemSize={25}
                      className="w-full"
                    >
                      {PriceFeedRow}
                    </List>
                  </>
                ) : null}
                {finalBitasset && !finalBitasset.feeds.length
                  ? "No smartcoin feeds found..."
                  : null}
                {!finalBitasset ? "Loading..." : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? (
            <CurrentUser usr={usr} />
          ) : null}
        </div>
      </div>
    </>
  );
}
