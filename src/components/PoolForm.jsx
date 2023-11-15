import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Fuse from "fuse.js";
import { useForm } from "react-hook-form";
import { FixedSizeList as List } from "react-window";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

import { blockchainFloat, copyToClipboard, humanReadableFloat } from "../lib/common";

import { eraseCurrentUser } from "../stores/users.ts";
import {
  $poolCache,
  $marketSearchCache,
  $globalParamsCache,
  $assetCache,
  resetCache,
} from "../stores/cache.ts";

import {
  createBitassetDataStore,
  createCachedAssetStore,
  createDynamicDataStore,
} from "../effects/Assets.ts";

import { createPoolDetailsStore } from "../effects/Pools.ts";

import { createUserBalancesStore } from "../effects/User.ts";

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";

import PoolDialogs from "./Market/PoolDialogs.jsx";
import MarketAssetCard from "./Market/MarketAssetCard.jsx";

import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

export default function PoolForm() {
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const [pool, setPool] = useState(""); // dropdown selected pool

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", [
    "marketSearch",
    "assets",
    "pools",
    "feeSchedule",
  ]);

  const assets = useSyncExternalStore($assetCache.subscribe, $assetCache.get, () => true);

  const pools = useSyncExternalStore($poolCache.subscribe, $poolCache.get, () => true);

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

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 63);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  // Search dialog

  const [activeTab, setActiveTab] = useState("asset");
  const poolSearch = useMemo(() => {
    if (!pools || !pools.length) {
      return null;
    }
    return new Fuse(pools, {
      includeScore: true,
      threshold: 0.2,
      keys: activeTab === "asset" ? ["asset_a_symbol", "asset_b_symbol"] : ["share_asset_symbol"],
    });
  }, [pools, activeTab]);

  const [dialogOpen, setDialogOpen] = useState(false);

  const [thisInput, setThisInput] = useState();
  const thisResult = useMemo(() => {
    if (poolSearch && thisInput) {
      return poolSearch.search(thisInput);
    }
  }, [poolSearch, thisInput]);

  const PoolRow = ({ index, style }) => {
    const res = thisResult[index].item;

    return (
      <div
        style={{ ...style }}
        className="grid grid-cols-12"
        key={`acard-${res.id}`}
        onClick={() => {
          setPool(res.id);
          setDialogOpen(false);
          setThisResult();
        }}
      >
        <div className="col-span-2">{res.id}</div>
        <div className="col-span-3">{res.share_asset_symbol}</div>
        <div className="col-span-3">
          {res.asset_a_symbol} ({res.asset_a_id})
        </div>
        <div className="col-span-3">
          {res.asset_b_symbol} ({res.asset_b_id})
        </div>
        <div className="col-span-1">{res.taker_fee_percent / 100}%</div>
      </div>
    );
  };

  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

  // End of Search dialog

  useEffect(() => {
    async function parseUrlParams() {
      if (window.location.search) {
        console.log("Parsing url params");
        const urlSearchParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlSearchParams.entries());
        const poolParameter = params && params.pool ? params.pool : null;

        if (!poolParameter || !poolParameter.length) {
          console.log("Invalid pool parameters");
          setPool("1.19.0");
          return;
        }

        if (poolParameter && poolParameter.length && !poolParameter.includes("1.19.")) {
          console.log("Invalid pool parameters");
          setPool("1.19.0");
          return;
        }

        const poolIds = pools && pools.length ? pools.map((x) => x.id) : [];
        if (!poolIds.includes(poolParameter)) {
          console.log("Replacing unknown pool with first pool in list");
          setPool("1.19.0");
          return;
        }

        setPool(poolParameter);
      }
    }

    if (pools && pools.length) {
      parseUrlParams();
    }
  }, [pools]);

  const [sellAmount, setSellAmount] = useState(0);

  const [foundPool, setFoundPool] = useState();
  const [assetA, setAssetA] = useState("");
  const [assetB, setAssetB] = useState("");
  useEffect(() => {
    // Setting various react states as the user interacts with the form
    console.log({ pools, pool, assets });
    if (pools && pool && assets) {
      const currentPool = pools.find((x) => x.id === pool);
      setFoundPool(currentPool);
      const foundA = assets.find((x) => x.id === currentPool.asset_a_id);
      const foundB = assets.find((x) => x.id === currentPool.asset_b_id);
      console.log({ foundA, foundB });
      setAssetA(foundA);
      setAssetB(foundB);
      setSellAmount(1);
    }
  }, [pool, pools, assets]);

  const [foundPoolDetails, setFoundPoolDetails] = useState();
  useEffect(() => {
    let unsubscribePoolDetails;

    if (usr && usr.chain && foundPool) {
      const poolDetailsStore = createPoolDetailsStore([usr.chain, foundPool.id]);

      unsubscribePoolDetails = poolDetailsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          let finalResult = data;
          finalResult["asset_a_symbol"] = assetA.symbol;
          finalResult["asset_a_precision"] = assetA.precision;

          finalResult["asset_b_symbol"] = assetB.symbol;
          finalResult["asset_b_precision"] = assetB.precision;

          finalResult["share_asset_symbol"] = foundPool.share_asset_symbol;

          finalResult["readable_balance_a"] = `${humanReadableFloat(
            finalResult.balance_a,
            assetA.precision
          )} ${assetA.symbol}`;
          finalResult["readable_balance_b"] = `${humanReadableFloat(
            finalResult.balance_b,
            assetB.precision
          )} ${assetB.symbol}`;
          finalResult["share_asset_details"] = assets.find((x) => x.id === finalResult.share_asset);

          setFoundPoolDetails(finalResult);
        }
      });
    }

    return () => {
      if (unsubscribePoolDetails) unsubscribePoolDetails();
    };
  }, [usr, foundPool, assetA, assetB, assets]);

  const [assetADetails, setAssetADetails] = useState(null);
  const [assetBDetails, setAssetBDetails] = useState(null);
  const [poolShareDetails, setPoolShareDetails] = useState(null);

  const [aBitassetData, setABitassetData] = useState(null);
  const [bBitassetData, setBBitassetData] = useState(null);

  useEffect(() => {
    let unsubscribeADetails;
    let unsubscribeBDetails;
    let unsubscribePoolShareDetails;
    let unsubscribeABitassetData;
    let unsubscribeBBitassetData;

    if (usr && usr.id && assetA && assetB && foundPool) {
      const dynamicDataStoreA = createDynamicDataStore([
        usr.chain,
        assetA.id.replace("1.3.", "2.3."),
      ]);
      unsubscribeADetails = dynamicDataStoreA.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setAssetADetails(data);
        }
      });

      const dynamicDataStoreB = createDynamicDataStore([
        usr.chain,
        assetB.id.replace("1.3.", "2.3."),
      ]);
      unsubscribeBDetails = dynamicDataStoreB.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setAssetBDetails(data);
        }
      });

      const poolAsset = assets.find((x) => x.symbol === foundPool.share_asset_symbol);
      const dynamicDataStorePool = createDynamicDataStore([
        usr.chain,
        poolAsset.id.replace("1.3.", "2.3."),
      ]);
      unsubscribePoolShareDetails = dynamicDataStorePool.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setPoolShareDetails(data);
        }
      });

      if (assetA.bitasset_data_id) {
        const bitassetDataStoreA = createBitassetDataStore([usr.chain, assetA.bitasset_data_id]);
        unsubscribeABitassetData = bitassetDataStoreA.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setABitassetData(data);
          }
        });
      }

      if (assetB.bitasset_data_id) {
        const bitassetDataStoreB = createBitassetDataStore([usr.chain, assetB.bitasset_data_id]);
        unsubscribeBBitassetData = bitassetDataStoreB.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setBBitassetData(data);
          }
        });
      }
    }

    return () => {
      if (unsubscribeADetails) unsubscribeADetails();
      if (unsubscribeBDetails) unsubscribeBDetails();
      if (unsubscribePoolShareDetails) unsubscribePoolShareDetails();
      if (unsubscribeABitassetData) unsubscribeABitassetData();
      if (unsubscribeBBitassetData) unsubscribeBBitassetData();
    };
  }, [usr, assetA, assetB, foundPool, assets]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && assetA && assetB) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setUsrBalances(data);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assetA, assetB]);

  const buyAmount = useMemo(() => {
    // Calculating the amount the user can buy
    if (assetA && assetB && foundPoolDetails) {
      console.log("Calculating the amount the user can buy");

      let poolamounta = Number(foundPoolDetails.balance_a);
      let poolamountap = Number(10 ** assetA.precision);

      let poolamountb = Number(foundPoolDetails.balance_b);
      let poolamountbp = Number(10 ** assetB.precision);

      const maker_market_fee_percenta = assetA.market_fee_percent;
      const maker_market_fee_percentb = assetB.market_fee_percent;

      const max_market_feea = assetA.max_market_fee;
      const max_market_feeb = assetB.max_market_fee;

      const taker_fee_percenta = foundPoolDetails.taker_fee_percent;

      function flagsa() {
        if (maker_market_fee_percenta === 0) {
          return 0;
        }
        if (maker_market_fee_percenta > 0) {
          return Math.min(
            Number(max_market_feea),
            Math.ceil(
              Number(sellAmount) *
                Number(poolamountap) *
                (Number(maker_market_fee_percenta) / 10000)
            )
          );
        }
      }

      function flagsb() {
        if (maker_market_fee_percentb === 0) {
          return 0;
        }
        if (maker_market_fee_percentb > 0) {
          return Math.min(
            Number(max_market_feeb),
            Math.ceil(
              Number(sellAmount) *
                Number(poolamountbp) *
                (Number(maker_market_fee_percentb) / 10000)
            )
          );
        }
      }

      function taker_market_fee_percenta() {
        if (typeof taker_fee_percenta == "undefined" && maker_market_fee_percenta > 0) {
          return Number(maker_market_fee_percenta) / 10000;
        }
        if (typeof taker_fee_percenta == "undefined" && maker_market_fee_percenta === 0) {
          return 0;
        } else {
          return Number(taker_fee_percenta) / 10000;
        }
      }
      let taker_market_fee_percent_a = Number(taker_market_fee_percenta());

      let result;
      if (assetA.id === foundPool.asset_a_id) {
        let tmp_delta_b =
          Number(poolamountb) -
          Math.ceil(
            (Number(poolamountb) * Number(poolamounta)) /
              (Number(poolamounta) + (Number(sellAmount) * Number(poolamountap) - Number(flagsa())))
          );
        let tmp_b = (Number(tmp_delta_b) * Number(taker_fee_percenta)) / 10000;
        result =
          (Number(tmp_delta_b) -
            Math.floor(Number(tmp_b)) -
            Math.ceil(
              Math.min(
                Number(max_market_feeb),
                Math.ceil(Number(tmp_delta_b) * Number(taker_market_fee_percent_a))
              )
            )) /
          Number(poolamountbp);
      } else {
        let tmp_delta_a =
          Number(poolamounta) -
          Math.ceil(
            (Number(poolamounta) * Number(poolamountb)) /
              (Number(poolamountb) + (Number(sellAmount) * Number(poolamountbp) - Number(flagsb())))
          );
        let tmp_a = (Number(tmp_delta_a) * Number(taker_fee_percenta)) / 10000;
        result =
          (Number(tmp_delta_a) -
            Math.floor(Number(tmp_a)) -
            Math.ceil(
              Math.min(
                Number(max_market_feea),
                Math.ceil(Number(tmp_delta_a) * Number(taker_market_fee_percent_a))
              )
            )) /
          Number(poolamountap);
      }

      return result;
    }
  }, [sellAmount, assetA, assetB, foundPoolDetails]);

  const [buyAmountInput, setBuyAmountInput] = useState();
  useEffect(() => {
    setBuyAmountInput(<Input value={buyAmount ?? 0} disabled className="mb-3" />);
  }, [buyAmount]);

  const [showDialog, setShowDialog] = useState(false);
  const [poolKey, setPoolKey] = useState("default_pool_key");
  useEffect(() => {
    if (pool && pool.length) {
      window.history.replaceState({}, "", `?pool=${pool}`); // updating the url parameters
    }
    setPoolKey(`pool_key${Date.now()}`);
  }, [pool]);

  const Row = ({ index, style }) => {
    const pool = pools[index];
    return (
      <SelectItem value={pool.id} style={style}>
        {`${pool.id} - ${pool.share_asset_symbol} - ${pool.asset_a_symbol}:${pool.asset_b_symbol}`}
      </SelectItem>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card className="p-2">
            <CardHeader>
              <CardTitle>Bitshares Liquidity Pool Exchange</CardTitle>
              <CardDescription>
                Easily swap between Bitshares assets using one of these user created liquidity
                pools.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!pools ? <p>Loading pool data</p> : null}
              {!assets ? <p>Loading asset data</p> : null}
              {pools && assets ? (
                <>
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
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <div className="grid grid-cols-2 mt-3">
                                <div className="mt-1">Liquidity pool</div>
                                <div className="text-gray-500 text-right">
                                  <Dialog
                                    open={dialogOpen}
                                    onOpenChange={(open) => {
                                      if (!open) {
                                        setThisResult();
                                      }

                                      setDialogOpen(open);
                                    }}
                                  >
                                    <DialogTrigger asChild>
                                      <Button className="h-5 p-3">Search</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[900px] bg-white">
                                      <DialogHeader>
                                        <DialogTitle>Search for a liquidity pool</DialogTitle>
                                        <DialogDescription>
                                          Select a search result to proceed with your desired asset
                                          swap.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="grid grid-cols-1">
                                        <div className="col-span-1">
                                          <Tabs defaultValue="asset">
                                            <TabsList className="grid max-w-[400px] grid-cols-2 mb-1 gap-3">
                                              {activeTab === "asset" ? (
                                                <TabsTrigger style={activeTabStyle} value="asset">
                                                  Swappable assets
                                                </TabsTrigger>
                                              ) : (
                                                <TabsTrigger
                                                  value="asset"
                                                  onClick={() => setActiveTab("asset")}
                                                >
                                                  Swappable assets
                                                </TabsTrigger>
                                              )}
                                              {activeTab === "share" ? (
                                                <TabsTrigger style={activeTabStyle} value="share">
                                                  Pool share asset
                                                </TabsTrigger>
                                              ) : (
                                                <TabsTrigger
                                                  value="share"
                                                  onClick={() => setActiveTab("share")}
                                                >
                                                  Pool share asset
                                                </TabsTrigger>
                                              )}
                                            </TabsList>

                                            <Input
                                              name="assetSearch"
                                              placeholder="Enter search text"
                                              className="mb-3 max-w-[400px]"
                                              onChange={(event) => {
                                                setThisInput(event.target.value);
                                              }}
                                            />

                                            <TabsContent value="share">
                                              {thisResult && thisResult.length ? (
                                                <>
                                                  <div className="grid grid-cols-12">
                                                    <div className="col-span-2">ID</div>
                                                    <div className="col-span-3">
                                                      <b>Share asset</b>
                                                    </div>
                                                    <div className="col-span-3">Asset A</div>
                                                    <div className="col-span-3">Asset B</div>
                                                    <div className="col-span-1">Taker Fee</div>
                                                  </div>
                                                  <List
                                                    height={400}
                                                    itemCount={thisResult.length}
                                                    itemSize={45}
                                                    className="w-full"
                                                  >
                                                    {PoolRow}
                                                  </List>
                                                </>
                                              ) : null}
                                            </TabsContent>

                                            <TabsContent value="asset">
                                              {thisResult && thisResult.length ? (
                                                <>
                                                  <div className="grid grid-cols-12">
                                                    <div className="col-span-2">ID</div>
                                                    <div className="col-span-3">Share asset</div>
                                                    <div className="col-span-3">
                                                      <b>Asset A</b>
                                                    </div>
                                                    <div className="col-span-3">
                                                      <b>Asset B</b>
                                                    </div>
                                                    <div className="col-span-1">Taker Fee</div>
                                                  </div>
                                                  <List
                                                    height={400}
                                                    itemCount={thisResult.length}
                                                    itemSize={45}
                                                    className="w-full"
                                                  >
                                                    {PoolRow}
                                                  </List>
                                                </>
                                              ) : null}
                                            </TabsContent>
                                          </Tabs>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </FormLabel>
                            <FormControl
                              onValueChange={(chosenPool) => {
                                setPool(chosenPool);
                              }}
                            >
                              <Select key={poolKey}>
                                <SelectTrigger className="mb-3">
                                  <SelectValue
                                    placeholder={
                                      foundPool
                                        ? `${foundPool.id} - ${foundPool.share_asset_symbol} - ${foundPool.asset_a_symbol}:${foundPool.asset_b_symbol}`
                                        : "Select a pool.."
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  {pools && pools.length ? (
                                    <List
                                      height={150}
                                      itemCount={pools.length}
                                      itemSize={35}
                                      className="w-full"
                                      initialScrollOffset={
                                        pools.map((x) => x.id).indexOf(pool) * 35
                                      }
                                    >
                                      {Row}
                                    </List>
                                  ) : null}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-5 mt-5 mb-5">
                        {pool && foundPoolDetails && assetA && assetB ? (
                          <>
                            <Card>
                              <CardContent>
                                <FormField
                                  control={form.control}
                                  name="balanceA"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>
                                        Swappable {assetA.symbol} (
                                        <ExternalLink
                                          classnamecontents="text-blue-500"
                                          type="text"
                                          text={assetA.id}
                                          hyperlink={`https://blocksights.info/#/assets/${assetA.id}`}
                                        />
                                        )
                                      </FormLabel>
                                      <FormControl>
                                        {foundPoolDetails ? (
                                          <Input
                                            disabled
                                            placeholder="0"
                                            className="mb-3 mt-3"
                                            value={foundPoolDetails.readable_balance_a}
                                          />
                                        ) : (
                                          <Skeleton className="h-4 w-[250px]" />
                                        )}
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent>
                                <FormField
                                  control={form.control}
                                  name="balanceB"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>
                                        Swappable {assetB.symbol} (
                                        <ExternalLink
                                          classnamecontents="text-blue-500"
                                          type="text"
                                          text={assetB.id}
                                          hyperlink={`https://blocksights.info/#/assets/${assetB.id}`}
                                        />
                                        )
                                      </FormLabel>
                                      <FormControl>
                                        {foundPoolDetails ? (
                                          <Input
                                            disabled
                                            placeholder="0"
                                            className="mb-3 mt-3"
                                            value={foundPoolDetails.readable_balance_b}
                                          />
                                        ) : (
                                          <Skeleton className="h-4 w-[250px]" />
                                        )}
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </CardContent>
                            </Card>
                          </>
                        ) : null}
                      </div>

                      {pool && pool.length ? (
                        <>
                          <FormField
                            control={form.control}
                            name="sellAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{`Amount of ${
                                  assetA ? assetA.symbol : "???"
                                } to swap`}</FormLabel>
                                <FormControl
                                  onChange={(event) => {
                                    const input = event.target.value;
                                    const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                                    if (regex.test(input)) {
                                      setSellAmount(input);
                                    }
                                  }}
                                >
                                  <Input
                                    label={`Amount of ${assetA ? assetA.symbol : "???"} to swap`}
                                    value={sellAmount}
                                    placeholder={sellAmount}
                                    className="mb-3"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : null}

                      {sellAmount && foundPoolDetails && foundPoolDetails.taker_fee_percent ? (
                        <>
                          <FormField
                            control={form.control}
                            name="marketFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pool fee</FormLabel>
                                <FormControl>
                                  <Input
                                    disabled
                                    placeholder="0"
                                    className="mb-3 mt-3"
                                    value={`${(
                                      (foundPoolDetails.taker_fee_percent / 10000) *
                                      sellAmount
                                    ).toFixed(assetA.precision)} (${assetA.symbol}) (${
                                      foundPoolDetails.taker_fee_percent / 100
                                    }% fee)`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : null}

                      {foundPool ? (
                        <FormField
                          control={form.control}
                          name="networkFee"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Network fee</FormLabel>
                              <FormControl>
                                <Input disabled placeholder={`${fee} BTS`} className="mb-3 mt-3" />
                              </FormControl>
                              {usr.id === usr.referrer ? (
                                <FormMessage>Rebate: {fee * 0.8} BTS (vesting)</FormMessage>
                              ) : null}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : null}

                      {foundPoolDetails ? (
                        <>
                          <FormField
                            control={form.control}
                            name="buyAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{`Amount of ${
                                  assetB ? assetB.symbol : "???"
                                } you'll receive`}</FormLabel>
                                <FormControl>{buyAmountInput}</FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : null}

                      {!pool || !sellAmount || !buyAmount || showDialog !== false ? (
                        <Button className="mt-5 mb-3" variant="outline" disabled type="submit">
                          Submit
                        </Button>
                      ) : (
                        <Button className="mt-5 mb-3" variant="outline" type="submit">
                          Submit
                        </Button>
                      )}
                    </form>
                  </Form>
                  {showDialog ? (
                    <DeepLinkDialog
                      operationName="liquidity_pool_exchange"
                      username={usr.username}
                      usrChain={usr.chain}
                      userID={usr.id}
                      dismissCallback={setShowDialog}
                      key={`Exchanging${sellAmount}${assetA.symbol}for${buyAmount}${assetB.symbol}`}
                      headerText={`Exchanging ${sellAmount} ${assetA.symbol} for ${buyAmount} ${assetB.symbol}`}
                      trxJSON={[
                        {
                          account: usr.id,
                          pool: pool,
                          amount_to_sell: {
                            amount: blockchainFloat(sellAmount, assetA.precision),
                            asset_id: assetA.id,
                          },
                          min_to_receive: {
                            amount: blockchainFloat(buyAmount, assetB.precision),
                            asset_id: assetB.id,
                          },
                          extensions: [],
                        },
                      ]}
                    />
                  ) : null}
                  {pool && !showDialog ? (
                    <Button
                      variant="outline"
                      mt="xl"
                      onClick={() => {
                        const oldAssetA = assetA;
                        const oldAssetB = assetB;
                        setAssetA(oldAssetB);
                        setAssetB(oldAssetA);
                      }}
                    >
                      Swap buy/sell
                    </Button>
                  ) : null}
                  {pool && showDialog ? (
                    <Button variant="outline" mt="xl" disabled>
                      Swap buy/sell
                    </Button>
                  ) : null}
                  {pool ? (
                    <ExternalLink
                      variant="outline"
                      classnamecontents="ml-2"
                      type="button"
                      text={`Blocksights pool explorer`}
                      hyperlink={`https://blocksights.info/#/pools/${pool}${
                        usr.chain !== "bitshares" ? "?network=testnet" : ""
                      }`}
                    />
                  ) : null}
                  {foundPoolDetails ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="ml-2" variant="outline">
                          Pool JSON
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[550px] bg-white">
                        <DialogHeader>
                          <DialogTitle>Liquidity Pool JSON</DialogTitle>
                          <DialogDescription>
                            Check out the details returned by the network for this pool
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1">
                          <div className="col-span-1">
                            <ScrollArea className="h-72 rounded-md border">
                              <pre>{JSON.stringify(foundPoolDetails, null, 2)}</pre>
                            </ScrollArea>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {assetA && assetB ? (
          <PoolDialogs
            assetA={assetA.symbol}
            assetAData={assetA}
            assetB={assetB.symbol}
            assetBData={assetB}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-5 mt-5">
          {pool ? (
            <div className="grid grid-cols-1 gap-3">
              {usrBalances && foundPoolDetails ? (
                <>
                  <MarketAssetCard
                    asset={assetB.symbol}
                    assetData={assetB}
                    assetDetails={assetBDetails}
                    bitassetData={bBitassetData}
                    marketSearch={marketSearch}
                    chain={usr.chain}
                    usrBalances={usrBalances}
                    type="buy"
                  />
                  <MarketAssetCard
                    asset={assetA.symbol}
                    assetData={assetA}
                    assetDetails={assetADetails}
                    bitassetData={aBitassetData}
                    marketSearch={marketSearch}
                    chain={usr.chain}
                    usrBalances={usrBalances}
                    type="sell"
                  />
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>Quote asset</CardTitle>
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
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>Base asset</CardTitle>
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
                </>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3">
            {pool && assetA && assetB ? (
              <>
                <a href={`/dex/index.html?market=${assetA.symbol}_${assetB.symbol}`}>
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>Trade on the Dex instead?</CardTitle>
                      <CardDescription className="text-sm">
                        Market: {assetA.symbol}/{assetB.symbol}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pb-2">
                      You can manually create limit orders for trading pairs of your choice on the
                      Bitshares DEX
                    </CardContent>
                  </Card>
                </a>
                <a
                  href={`/dex/index.html?market=${foundPool?.share_asset_symbol}_${
                    assetA.symbol !== "BTS" ? "BTS" : assetA.symbol
                  }`}
                >
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>Purchase stake in this pool?</CardTitle>
                      <CardDescription className="text-sm">
                        Share asset: {foundPool?.share_asset_symbol}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pb-2">
                      Receive swap fee yield over time by owning a stake in the pool via a market
                      limit order.
                    </CardContent>
                  </Card>
                </a>
                <a href={`/stake/index.html?pool=${pool}`}>
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>Stake assets in this pool?</CardTitle>
                      <CardDescription className="text-sm">
                        Share asset: {foundPool?.share_asset_symbol}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pb-2">
                      Earn swap fees on assets staked in liquidity pools minus a small pool defined
                      withdrawal fee.
                    </CardContent>
                  </Card>
                </a>

                <Card>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle>Need to borrow some assets?</CardTitle>
                    <CardDescription className="text-sm">
                      DEX users lend assets at user defined rates. You could borrow from DEX
                      participants, at their defined rates.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm pb-3">
                    <Label>Search by borrowable assets</Label>
                    <br />
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${assetA.symbol}`}
                    >
                      <Badge>{assetA.symbol}</Badge>
                    </a>
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${assetB.symbol}`}
                    >
                      <Badge className="ml-2 mt-1 mb-1">{assetB.symbol}</Badge>
                    </a>
                    <br />
                    <Label>Search by accepted collateral</Label>
                    <br />
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${assetA.symbol}`}
                    >
                      <Badge>{assetA.symbol}</Badge>
                    </a>
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${assetB.symbol}`}
                    >
                      <Badge className="ml-2 mt-1">{assetB.symbol}</Badge>
                    </a>
                  </CardContent>
                </Card>

                {foundPoolDetails && marketSearch && usrBalances ? (
                  <MarketAssetCard
                    asset={foundPoolDetails.share_asset_symbol}
                    assetData={foundPoolDetails.share_asset_details}
                    assetDetails={poolShareDetails}
                    bitassetData={null}
                    marketSearch={marketSearch}
                    chain={usr.chain}
                    usrBalances={usrBalances}
                    type="pool"
                  />
                ) : (
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>Pool share asset</CardTitle>
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
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}
    </>
  );
}
