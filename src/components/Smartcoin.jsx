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

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useInitCache } from "../effects/Init.ts";
import { createUserBalancesStore } from "../effects/User.ts";
import {
  createSmartcoinDataStore,
  createBitassetDataStore,
  createCachedAssetStore,
} from "../effects/Assets.ts";

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

  const [finalAsset, setFinalAsset] = useState();
  const [finalBitasset, setFinalBitasset] = useState();

  useEffect(() => {
    let unsub;

    if (parsedBitasset && parsedBitasset && usr && usr.chain) {
      const bitassetDataStore = createSmartcoinDataStore([
        usr.chain,
        parsedAsset.id,
        parsedBitasset.id,
      ]);
      unsub = bitassetDataStore.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          console.log({ data });
          setFinalAsset(data[0]);
          setFinalBitasset(data[1]);
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [parsedAsset, parsedBitasset, usr]);

  console.log({ finalAsset, finalBitasset });

  const [showDialog, setShowDialog] = useState(false);

  const [debtAmount, setDebtAmount] = useState(0);
  const [collateralAmount, setCollateralAmount] = useState(0);
  const [ratioValue, setRatioValue] = useState(0);

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
              key={`HeaderText`}
              headerText={`HeaderText`}
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
          {usr && usr.username && usr.username.length ? (
            <CurrentUser usr={usr} />
          ) : null}
        </div>
      </div>
    </>
  );
}
