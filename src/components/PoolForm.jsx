import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Fuse from "fuse.js";
import { useForm } from "react-hook-form";
import { FixedSizeList as List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

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

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar as Av, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Avatar } from "@/components/Avatar.tsx";

import { blockchainFloat, copyToClipboard, humanReadableFloat } from "../lib/common";

import {
  $assetCacheBTS,
  $assetCacheTEST,
  $poolCacheBTS,
  $poolCacheTEST,
  $marketSearchCacheBTS,
  $marketSearchCacheTEST,
  $globalParamsCacheBTS,
  $globalParamsCacheTEST,
} from "../stores/cache.ts";
import { $currentUser } from "../stores/users.ts";

import { createDynamicDataStore } from "../effects/Assets.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { useInitCache } from "../effects/Init.ts";

import { createObjectStore } from "@/nanoeffects/Objects.ts";

import PoolDialogs from "./Market/PoolDialogs.jsx";
import MarketAssetCard from "./Market/MarketAssetCard.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

export default function PoolForm() {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const [pool, setPool] = useState(""); // dropdown selected pool

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const _assetsBTS = useSyncExternalStore($assetCacheBTS.subscribe, $assetCacheBTS.get, () => true);
  const _assetsTEST = useSyncExternalStore(
    $assetCacheTEST.subscribe,
    $assetCacheTEST.get,
    () => true
  );

  const _poolsBTS = useSyncExternalStore($poolCacheBTS.subscribe, $poolCacheBTS.get, () => true);
  const _poolsTEST = useSyncExternalStore($poolCacheTEST.subscribe, $poolCacheTEST.get, () => true);

  const _marketSearchBTS = useSyncExternalStore(
    $marketSearchCacheBTS.subscribe,
    $marketSearchCacheBTS.get,
    () => true
  );

  const _marketSearchTEST = useSyncExternalStore(
    $marketSearchCacheTEST.subscribe,
    $marketSearchCacheTEST.get,
    () => true
  );

  const _globalParamsBTS = useSyncExternalStore(
    $globalParamsCacheBTS.subscribe,
    $globalParamsCacheBTS.get,
    () => true
  );

  const _globalParamsTEST = useSyncExternalStore(
    $globalParamsCacheTEST.subscribe,
    $globalParamsCacheTEST.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", ["marketSearch", "assets", "pools", "globalParams"]);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const pools = useMemo(() => {
    if (_chain && (_poolsBTS || _poolsTEST)) {
      return _chain === "bitshares" ? _poolsBTS : _poolsTEST;
    }
    return [];
  }, [_poolsBTS, _poolsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [fee, setFee] = useState();
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
  const [thisResult, setThisResult] = useState();
  useEffect(() => {
    if (poolSearch && thisInput) {
      const searchResult = poolSearch.search(thisInput);
      setThisResult(searchResult);
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
        //console.log("Parsing url params");
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

  const [isRotating, setIsRotating] = useState(false);

  const rotateStyle = isRotating
    ? {
        transition: "transform 0.5s",
        transform: "rotate(360deg)",
      }
    : {};

  useEffect(() => {
    // Setting various react states as the user interacts with the form
    if (pools && pool && assets) {
      const currentPool = pools.find((x) => x.id === pool);
      if (!currentPool) {
        console.log("Invalid pool");
        return;
      }
      setFoundPool(currentPool);
      const foundA = assets.find((x) => x.id === currentPool.asset_a_id);
      const foundB = assets.find((x) => x.id === currentPool.asset_b_id);
      setAssetA(foundA);
      setAssetB(foundB);
      setSellAmount(1);
    }
  }, [pool, pools, assets]);

  const [foundPoolDetails, setFoundPoolDetails] = useState();
  useEffect(() => {
    let unsubscribePoolDetails;

    if (usr && usr.chain && foundPool && assetA && assetB && assets) {
      const poolDetailsStore = createObjectStore([usr.chain, [foundPool.id]]);

      unsubscribePoolDetails = poolDetailsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          let finalResult = data[0];
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

    if (usr && usr.id && assets && assetA && assetB && foundPool) {
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
        const bitassetDataStoreA = createObjectStore([usr.chain, [assetA.bitasset_data_id]]);
        unsubscribeABitassetData = bitassetDataStoreA.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setABitassetData(data[0]);
          }
        });
      }

      if (assetB.bitasset_data_id) {
        const bitassetDataStoreB = createObjectStore([usr.chain, [assetB.bitasset_data_id]]);
        unsubscribeBBitassetData = bitassetDataStoreB.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setBBitassetData(data[0]);
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

  const [inverted, setInverted] = useState(false);
  const buyAmount = useMemo(() => {
    // Calculating the amount the user can buy
    if (assetA && assetB && foundPoolDetails) {
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
      if (assetA && foundPool && !inverted) {
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
  }, [sellAmount, assetA, assetB, inverted, foundPoolDetails]);

  const [buyAmountInput, setBuyAmountInput] = useState();
  useEffect(() => {
    setBuyAmountInput(<Input readOnly value={buyAmount ?? 0} disabled className="mb-3" />);
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
              <CardTitle>{t("PoolForm:title")}</CardTitle>
              <CardDescription>{t("PoolForm:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {!pools ? <p>{t("PoolForm:loadingPoolData")}</p> : null}
              {!assets ? <p>{t("PoolForm:loadingAssetData")}</p> : null}
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
                            <FormLabel>{t("PoolForm:accountLabel")}</FormLabel>{" "}
                            <FormControl>
                              <div className="grid grid-cols-8">
                                <div className="col-span-1 ml-5">
                                  {usr && usr.username ? (
                                    <Avatar
                                      size={40}
                                      name={usr.username}
                                      extra="Target"
                                      expression={{
                                        eye: "normal",
                                        mouth: "open",
                                      }}
                                      colors={[
                                        "#92A1C6",
                                        "#146A7C",
                                        "#F0AB3D",
                                        "#C271B4",
                                        "#C20D90",
                                      ]}
                                    />
                                  ) : (
                                    <Av>
                                      <AvatarFallback>?</AvatarFallback>
                                    </Av>
                                  )}
                                </div>
                                <div className="col-span-7">
                                  <Input
                                    disabled
                                    readOnly
                                    placeholder="Bitshares account (1.2.x)"
                                    className="mb-3 mt-1"
                                    value={`${usr.username} (${usr.id})`}
                                  />
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("PoolForm:liquidityPoolLabel")}</FormLabel>
                            <FormDescription style={{ marginTop: "0px" }}>
                              {foundPoolDetails
                                ? t("PoolForm:foundPoolDetails")
                                : t("PoolForm:noPoolDetails")}
                            </FormDescription>
                            <FormControl
                              onChange={(event) => {
                                setPool(event.target.value);
                              }}
                            >
                              <div className="grid grid-cols-5 mt-3">
                                <div className="mt-1 col-span-4">
                                  <Select key={poolKey}>
                                    <SelectTrigger className="mb-3">
                                      <SelectValue
                                        placeholder={
                                          foundPool
                                            ? `${foundPool.id} - ${foundPool.share_asset_symbol} - ${foundPool.asset_a_symbol}:${foundPool.asset_b_symbol}`
                                            : t("PoolForm:selectPoolPlaceholder")
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
                                </div>
                                <div className="text-gray-500 text-right col-span-1 ml-3">
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
                                      <Button variant="outline" className="h-9 mt-1 p-3 w-full">
                                        {t("PoolForm:searchButton")}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[900px] bg-white">
                                      <DialogHeader>
                                        <DialogTitle>{t("PoolForm:searchDialogTitle")}</DialogTitle>
                                        <DialogDescription>
                                          {t("PoolForm:searchDialogDescription")}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="grid grid-cols-1">
                                        <div className="col-span-1">
                                          <Tabs defaultValue="asset">
                                            <TabsList className="grid max-w-[400px] grid-cols-2 mb-1 gap-3">
                                              {activeTab === "asset" ? (
                                                <TabsTrigger style={activeTabStyle} value="asset">
                                                  {t("PoolForm:swappableAssetsTab")}
                                                </TabsTrigger>
                                              ) : (
                                                <TabsTrigger
                                                  value="asset"
                                                  onClick={() => setActiveTab("asset")}
                                                >
                                                  {t("PoolForm:swappableAssetsTab")}
                                                </TabsTrigger>
                                              )}
                                              {activeTab === "share" ? (
                                                <TabsTrigger style={activeTabStyle} value="share">
                                                  {t("PoolForm:poolShareAssetTab")}
                                                </TabsTrigger>
                                              ) : (
                                                <TabsTrigger
                                                  value="share"
                                                  onClick={() => setActiveTab("share")}
                                                >
                                                  {t("PoolForm:poolShareAssetTab")}
                                                </TabsTrigger>
                                              )}
                                            </TabsList>

                                            <Input
                                              name="assetSearch"
                                              placeholder="Enter search text"
                                              className="mb-3 max-w-[400px]"
                                              onChange={(event) => {
                                                setThisInput(event.target.value);
                                                event.preventDefault();
                                                event.stopPropagation();
                                              }}
                                            />

                                            <TabsContent value="share">
                                              {thisResult && thisResult.length ? (
                                                <>
                                                  <div className="grid grid-cols-12">
                                                    <div className="col-span-2">
                                                      {t("PoolForm:idColumnTitle")}
                                                    </div>
                                                    <div className="col-span-3">
                                                      <b>{t("PoolForm:shareAssetColumnTitle")}</b>
                                                    </div>
                                                    <div className="col-span-3">
                                                      {t("PoolForm:assetAColumnTitle")}
                                                    </div>
                                                    <div className="col-span-3">
                                                      {t("PoolForm:assetBColumnTitle")}
                                                    </div>
                                                    <div className="col-span-1">
                                                      {t("PoolForm:takerFeeColumnTitle")}
                                                    </div>
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
                                                    <div className="col-span-2">
                                                      {t("PoolForm:idColumnTitle")}
                                                    </div>
                                                    <div className="col-span-3">
                                                      {t("PoolForm:shareAssetColumnTitle")}
                                                    </div>
                                                    <div className="col-span-3">
                                                      <b>{t("PoolForm:assetAColumnTitle")}</b>
                                                    </div>
                                                    <div className="col-span-3">
                                                      <b>{t("PoolForm:assetBColumnTitle")}</b>
                                                    </div>
                                                    <div className="col-span-1">
                                                      {t("PoolForm:takerFeeColumnTitle")}
                                                    </div>
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
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-11 gap-5 mt-1 mb-1">
                        {pool && foundPoolDetails && assetA && assetB ? (
                          <>
                            <div className="col-span-5">
                              <Card>
                                <CardHeader className="pb-0">
                                  <CardTitle className="text-sm pt-0">
                                    {t("PoolForm:swappable")}{" "}
                                    <ExternalLink
                                      classnamecontents="text-blue-500"
                                      type="text"
                                      text={!inverted ? assetA.symbol : assetB.symbol}
                                      hyperlink={`https://blocksights.info/#/assets/${!inverted ? assetA.id : assetB.id}`}
                                    />
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="text-lg mt-0 pt-0">
                                  {
                                    foundPoolDetails[
                                      !inverted
                                        ? 'readable_balance_a'
                                        : 'readable_balance_b'
                                    ].split(" ")[0]
                                  }
                                </CardContent>
                              </Card>
                            </div>
                            <div className="col-span-1 text-center mt-8">
                              <Toggle
                                variant="outline"
                                onClick={() => {
                                  setInverted(!inverted);
                                  /*
                                  const oldAssetA = assetA;
                                  const oldAssetB = assetB;
                                  setAssetA(oldAssetB);
                                  setAssetB(oldAssetA);
                                  */
                                  setIsRotating(true);
                                  setTimeout(() => setIsRotating(false), 500);
                                }}
                              >
                                <svg
                                  style={rotateStyle}
                                  width="15"
                                  height="15"
                                  viewBox="0 0 15 15"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M1.90321 7.29677C1.90321 10.341 4.11041 12.4147 6.58893 12.8439C6.87255 12.893 7.06266 13.1627 7.01355 13.4464C6.96444 13.73 6.69471 13.9201 6.41109 13.871C3.49942 13.3668 0.86084 10.9127 0.86084 7.29677C0.860839 5.76009 1.55996 4.55245 2.37639 3.63377C2.96124 2.97568 3.63034 2.44135 4.16846 2.03202L2.53205 2.03202C2.25591 2.03202 2.03205 1.80816 2.03205 1.53202C2.03205 1.25588 2.25591 1.03202 2.53205 1.03202L5.53205 1.03202C5.80819 1.03202 6.03205 1.25588 6.03205 1.53202L6.03205 4.53202C6.03205 4.80816 5.80819 5.03202 5.53205 5.03202C5.25591 5.03202 5.03205 4.80816 5.03205 4.53202L5.03205 2.68645L5.03054 2.68759L5.03045 2.68766L5.03044 2.68767L5.03043 2.68767C4.45896 3.11868 3.76059 3.64538 3.15554 4.3262C2.44102 5.13021 1.90321 6.10154 1.90321 7.29677ZM13.0109 7.70321C13.0109 4.69115 10.8505 2.6296 8.40384 2.17029C8.12093 2.11718 7.93465 1.84479 7.98776 1.56188C8.04087 1.27898 8.31326 1.0927 8.59616 1.14581C11.4704 1.68541 14.0532 4.12605 14.0532 7.70321C14.0532 9.23988 13.3541 10.4475 12.5377 11.3662C11.9528 12.0243 11.2837 12.5586 10.7456 12.968L12.3821 12.968C12.6582 12.968 12.8821 13.1918 12.8821 13.468C12.8821 13.7441 12.6582 13.968 12.3821 13.968L9.38205 13.968C9.10591 13.968 8.88205 13.7441 8.88205 13.468L8.88205 10.468C8.88205 10.1918 9.10591 9.96796 9.38205 9.96796C9.65819 9.96796 9.88205 10.1918 9.88205 10.468L9.88205 12.3135L9.88362 12.3123C10.4551 11.8813 11.1535 11.3546 11.7585 10.6738C12.4731 9.86976 13.0109 8.89844 13.0109 7.70321Z"
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                  ></path>
                                </svg>
                              </Toggle>
                            </div>
                            <div className="col-span-5">
                              <Card>
                                <CardHeader className="pb-0">
                                  <CardTitle className="text-sm pt-0">
                                    {t("PoolForm:swappable")}{" "}
                                    <ExternalLink
                                      classnamecontents="text-blue-500"
                                      type="text"
                                      text={!inverted ? assetB.symbol : assetA.symbol}
                                      hyperlink={`https://blocksights.info/#/assets/${!inverted ? assetB.id : assetA.id}`}
                                    />
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="text-lg">
                                  {
                                    foundPoolDetails[
                                      !inverted
                                        ? 'readable_balance_b'
                                        : 'readable_balance_a'
                                    ].split(" ")[0]
                                  }
                                </CardContent>
                              </Card>
                            </div>
                          </>
                        ) : null}
                      </div>

                      {pool && pool.length ? (
                        <>
                          <FormItem>
                            <FormLabel>
                              {
                                !inverted
                                  ? t("PoolForm:amountToSwap", {symbol: assetA ? assetA.symbol : "???"})
                                  : t("PoolForm:amountToSwap", {symbol: assetB ? assetB.symbol : "???"})
                              }
                            </FormLabel>
                            <FormDescription style={{ marginTop: "0px" }}>
                              {
                                !inverted
                                  ? t("PoolForm:enterAmountToSwap", {
                                      symbolA: assetA ? assetA.symbol : "???",
                                      symbolB: assetB ? assetB.symbol : "???",
                                    })
                                  : t("PoolForm:enterAmountToSwap", {
                                    symbolA: assetB ? assetB.symbol : "???",
                                    symbolB: assetA ? assetA.symbol : "???",
                                  })
                              }
                            </FormDescription>
                            <FormControl
                              onChange={(event) => {
                                const input = event.target.value;
                                const regex = /^[0-9]*\.?[0-9]*$/;
                                if (regex.test(input)) {
                                  setSellAmount(input);
                                }
                              }}
                            >
                              <div className="grid grid-cols-2">
                                <div className="col-span-1">
                                  <Input
                                    label={
                                      !inverted
                                        ? t("PoolForm:amountToSwap", {symbol: assetA ? assetA.symbol : "???"})
                                        : t("PoolForm:amountToSwap", {symbol: assetB ? assetB.symbol : "???"})
                                    }
                                    value={sellAmount}
                                    placeholder={sellAmount}
                                    className="mb-3"
                                  />
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        </>
                      ) : null}

                      {foundPoolDetails ? (
                        <>
                          <FormField
                            control={form.control}
                            name="buyAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("PoolForm:totalAmount")}</FormLabel>
                                <FormDescription style={{ marginTop: "0px" }}>
                                  {
                                    !inverted
                                      ? t("PoolForm:totalAmountDescription", {
                                          symbolA: assetA ? assetA.symbol : "???",
                                          symbolB: assetB ? assetB.symbol : "???",
                                        })
                                      : t("PoolForm:totalAmountDescription", {
                                          symbolA: assetB ? assetB.symbol : "???",
                                          symbolB: assetA ? assetA.symbol : "???",
                                        })
                                  }
                                </FormDescription>
                                <FormControl>
                                  <div className="grid grid-cols-2 mb-3 mt-3">
                                    <div className="col-span-1">{buyAmountInput}</div>
                                  </div>
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
                            name="poolFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("PoolForm:poolFee")}</FormLabel>
                                <FormDescription style={{ marginTop: "0px" }}>
                                  {t("PoolForm:poolFeeDescription")}
                                </FormDescription>
                                <FormControl>
                                  <div className="grid grid-cols-2 mb-3 mt-3">
                                    <div className="col-span-1">
                                      <Input
                                        disabled
                                        readOnly
                                        placeholder="0"
                                        value={`${(
                                          (foundPoolDetails.taker_fee_percent / 10000) *
                                          sellAmount
                                        ).toFixed(!inverted ? assetA.precision : assetB.precision)} (${!inverted ? assetA.symbol : assetB.symbol}) (${
                                          foundPoolDetails.taker_fee_percent / 100
                                        }% ${t("PoolForm:fee")})`}
                                      />
                                    </div>
                                  </div>
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
                              <FormLabel>{t("PoolForm:networkFee")}</FormLabel>
                              <FormDescription style={{ marginTop: "0px" }}>
                                {t("PoolForm:networkFeeDescription")}
                              </FormDescription>
                              <FormControl>
                                <div className="grid grid-cols-2 mb-3 mt-3">
                                  <div className="col-span-1">
                                    <Input
                                      disabled
                                      readOnly
                                      placeholder={`${fee} ${t("PoolForm:feeCurrency")}`}
                                    />
                                  </div>
                                </div>
                              </FormControl>
                              {usr.id === usr.referrer ? (
                                <FormMessage>
                                  {t("PoolForm:rebate", { rebate: fee * 0.8, currency: "BTS" })}
                                </FormMessage>
                              ) : null}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : null}

                      {!pool || !sellAmount || !buyAmount || showDialog !== false ? (
                        <Button className="mt-5 mb-3" variant="outline" disabled type="submit">
                          {t("PoolForm:submit")}
                        </Button>
                      ) : (
                        <Button className="mt-5 mb-3" variant="outline" type="submit">
                          {t("PoolForm:submit")}
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
                      key={`Exchanging${sellAmount}${!inverted ? assetA.symbol : assetB.symbol}for${buyAmount}${!inverted ? assetB.symbol : assetA.symbol}`}
                      headerText={t("PoolForm:exchangeHeader", {
                        sellAmount: sellAmount,
                        symbolA: !inverted ? assetA.symbol : assetB.symbol,
                        buyAmount: buyAmount,
                        symbolB: !inverted ? assetB.symbol : assetA.symbol,
                      })}
                      trxJSON={[
                        {
                          account: usr.id,
                          pool: pool,
                          amount_to_sell: {
                            amount: blockchainFloat(sellAmount, !inverted ? assetA.precision : assetB.precision),
                            asset_id: !inverted ? assetA.id : assetB.id,
                          },
                          min_to_receive: {
                            amount: blockchainFloat(buyAmount, !inverted ? assetB.precision : assetA.precision),
                            asset_id: !inverted ? assetB.id : assetA.id,
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
                        /*
                        const oldAssetA = assetA;
                        const oldAssetB = assetB;
                        setAssetA(oldAssetB);
                        setAssetB(oldAssetA);
                        */
                        setInverted(!inverted);
                        setIsRotating(true);
                        setTimeout(() => setIsRotating(false), 500);
                      }}
                    >
                      {t("PoolForm:swapBuySell")}
                    </Button>
                  ) : null}
                  {pool && showDialog ? (
                    <Button variant="outline" mt="xl" disabled>
                      {t("PoolForm:swapBuySell")}
                    </Button>
                  ) : null}
                  {pool ? (
                    <ExternalLink
                      variant="outline"
                      classnamecontents="ml-2"
                      type="button"
                      text={t("PoolForm:blocksightsPoolExplorer")}
                      hyperlink={`https://blocksights.info/#/pools/${pool}${
                        usr.chain !== "bitshares" ? "?network=testnet" : ""
                      }`}
                    />
                  ) : null}
                  {foundPoolDetails ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="ml-2" variant="outline">
                          {t("PoolForm:poolJsonButton")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[550px] bg-white">
                        <DialogHeader>
                          <DialogTitle>{t("PoolForm:liquidityPoolJsonTitle")}</DialogTitle>
                          <DialogDescription>
                            {t("PoolForm:liquidityPoolJsonDescription")}
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
                  {assetADetails && assetBDetails ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="ml-2" variant="outline">
                          {t("PoolForm:swappableAssetJsonButton")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[550px] bg-white">
                        <DialogHeader>
                          <DialogTitle>{t("PoolForm:swappableAssetJsonTitle")}</DialogTitle>
                          <DialogDescription>
                            {t("PoolForm:swappableAssetJsonDescription")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1">
                          <div className="col-span-1">
                            <ScrollArea className="h-72 rounded-md border">
                              <pre>
                                {
                                assetA &&
                                assetADetails &&
                                assetB &&
                                assetBDetails &&
                                poolShareDetails ?
                                JSON.stringify(
                                  {
                                    assetA: !inverted ? assetA : assetB,
                                    assetADetails: !inverted ? assetADetails : assetBDetails,
                                    aBitassetData: !inverted ? aBitassetData : bBitassetData,
                                    assetB: !inverted ? assetB : assetA,
                                    assetBDetails: !inverted ? assetBDetails : assetADetails,
                                    bBitassetData: !inverted ? bBitassetData : aBitassetData,
                                    poolShareDetails: poolShareDetails,
                                  },
                                  null,
                                  2
                                )
                                : "Loading..."
                              }
                              </pre>
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
            assetA={!inverted ? assetA.symbol : assetB.symbol}
            assetAData={!inverted ? assetA : assetB}
            assetB={!inverted ? assetB.symbol : assetA.symbol}
            assetBData={!inverted ? assetB : assetA}
            chain={usr.chain}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-5 mt-5">
          {pool ? (
            <div className="grid grid-cols-1 gap-3">
              {usrBalances && foundPoolDetails ? (
                <>
                  <MarketAssetCard
                    asset={!inverted ? assetB.symbol : assetA.symbol}
                    assetData={!inverted ? assetB : assetA}
                    assetDetails={!inverted ? assetBDetails : assetADetails}
                    bitassetData={!inverted ? bBitassetData : aBitassetData}
                    marketSearch={marketSearch}
                    chain={usr.chain}
                    usrBalances={usrBalances}
                    type="buy"
                  />
                  <MarketAssetCard
                    asset={!inverted ? assetA.symbol : assetB.symbol}
                    assetData={!inverted ? assetA : assetB}
                    assetDetails={!inverted ? assetADetails : assetBDetails}
                    bitassetData={!inverted ? aBitassetData : bBitassetData}
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
                      <CardTitle>{t("PoolForm:quoteAsset")}</CardTitle>
                      <CardDescription className="text-lg">{t("PoolForm:loading")}</CardDescription>
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
                      <CardTitle>{t("PoolForm:baseAsset")}</CardTitle>
                      <CardDescription className="text-lg">{t("PoolForm:loading")}</CardDescription>
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
                <a href={
                  !inverted
                  ? `/dex/index.html?market=${assetA.symbol}_${assetB.symbol}`
                  : `/dex/index.html?market=${assetB.symbol}_${assetA.symbol}`
                }>
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>{t("PoolForm:tradeOnDex")}</CardTitle>
                      <CardDescription className="text-sm">
                        {
                          !inverted
                            ? t("PoolForm:market", { symbolA: assetA.symbol, symbolB: assetB.symbol })
                            : t("PoolForm:market", { symbolA: assetB.symbol, symbolB: assetA.symbol })
                         }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pb-2">
                      {t("PoolForm:tradeOnDexDescription")}
                    </CardContent>
                  </Card>
                </a>
                <a
                  href={
                    !inverted
                      ? `/dex/index.html?market=${foundPool?.share_asset_symbol}_${assetA.symbol !== "BTS" ? "BTS" : assetA.symbol}`
                      : `/dex/index.html?market=${foundPool?.share_asset_symbol}_${assetB.symbol !== "BTS" ? "BTS" : assetB.symbol}`
                    }
                >
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>{t("PoolForm:purchaseStake")}</CardTitle>
                      <CardDescription className="text-sm">
                        {t("PoolForm:shareAsset", { shareAsset: foundPool?.share_asset_symbol })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pb-2">
                      {t("PoolForm:purchaseStakeDescription")}
                    </CardContent>
                  </Card>
                </a>
                <a href={`/stake/index.html?pool=${pool}`}>
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>{t("PoolForm:stakeAssets")}</CardTitle>
                      <CardDescription className="text-sm">
                        {t("PoolForm:shareAsset", { shareAsset: foundPool?.share_asset_symbol })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pb-2">
                      {t("PoolForm:stakeAssetsDescription")}
                    </CardContent>
                  </Card>
                </a>

                <Card>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle>{t("PoolForm:borrowAssets")}</CardTitle>
                    <CardDescription className="text-sm">
                      {t("PoolForm:borrowAssetsDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm pb-3">
                    <Label>{t("PoolForm:searchBorrowableAssets")}</Label>
                    <br />
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${!inverted ? assetA.symbol : assetB.symbol}`}
                    >
                      <Badge>{!inverted ? assetA.symbol : assetB.symbol}</Badge>
                    </a>
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${assetB.symbol}`}
                    >
                      <Badge className="ml-2 mt-1 mb-1">{!inverted ? assetB.symbol : assetA.symbol}</Badge>
                    </a>
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${foundPool?.share_asset_symbol}`}
                    >
                      <Badge className="ml-2 mt-1 mb-1">{foundPool?.share_asset_symbol}</Badge>
                    </a>
                    <br />
                    <Label>{t("PoolForm:searchAcceptedCollateral")}</Label>
                    <br />
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${!inverted ? assetA.symbol : assetB.symbol}`}
                    >
                      <Badge>{!inverted ? assetA.symbol : assetB.symbol}</Badge>
                    </a>
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${!inverted ? assetB.symbol : assetA.symbol}`}
                    >
                      <Badge className="ml-2 mt-1">{!inverted ? assetB.symbol : assetA.symbol}</Badge>
                    </a>
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${foundPool?.share_asset_symbol}`}
                    >
                      <Badge className="ml-2 mt-1">{foundPool?.share_asset_symbol}</Badge>
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
                      <CardTitle>{t("PoolForm:poolShareAsset")}</CardTitle>
                      <CardDescription className="text-lg">{t("PoolForm:loading")}</CardDescription>
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

      <div className="grid grid-cols-1 mt-5 ml-8 mr-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("PoolForm:risksTitle")}</CardTitle>
            <CardDescription>{t("PoolForm:risksDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-sm">
              <Label className="mb-0 pb-0 text-lg">{t("PoolForm:liquidityPoolRisks")}</Label>
              <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
                <li>{t("PoolForm:liquidityPoolRisk1")}</li>
                <li>{t("PoolForm:liquidityPoolRisk2")}</li>
              </ul>
            </span>
            <span className="text-sm">
              <Label className="mb-0 pb-0 text-lg">{t("PoolForm:swappableAssetRisks")}</Label>
              <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
                <li>{t("PoolForm:swappableAssetRisk1")}</li>
                <li>
                  {
                    !inverted
                    ? t("PoolForm:swappableAssetRisk2", {
                        symbol: assetA.symbol !== "BTS" ? "BTS" : assetA.symbol,
                      })
                    : t("PoolForm:swappableAssetRisk2", {
                        symbol: assetB.symbol !== "BTS" ? "BTS" : assetB.symbol,
                      })
                  }
                </li>
                <li>{t("PoolForm:swappableAssetRisk3")}</li>
              </ul>
            </span>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
