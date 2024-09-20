import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Fuse from "fuse.js";
import { useForm } from "react-hook-form";
import { FixedSizeList as List } from "react-window";
import { useStore } from '@nanostores/react';
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

import { Avatar as Av, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Avatar } from "@/components/Avatar.tsx";

import { blockchainFloat, humanReadableFloat } from "@/lib/common";

import {
  $assetCacheBTS,
  $assetCacheTEST,
  $poolCacheBTS,
  $poolCacheTEST,
  $marketSearchCacheBTS,
  $marketSearchCacheTEST,
  $globalParamsCacheBTS,
  $globalParamsCacheTEST,
} from "@/stores/cache.ts";
import { $currentNode } from "@/stores/node.ts";

import { createPoolAssetStore } from "@/nanoeffects/Assets.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";

import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import MarketAssetCardPlaceholder from "./Market/MarketAssetCardPlaceholder.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

export default function PoolStake() {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNode = useStore($currentNode);

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

  const [fee, setFee] = useState(); // staking deposit fee
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 61);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [unstakeFee, setUnstakeFee] = useState(); // staking withdraw fee
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 62);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setUnstakeFee(finalFee);
    }
  }, [globalParams]);

  // Search dialog
  const [activeTab, setActiveTab] = useState("asset");
  const [stakeTab, setStakeTab] = useState("stake");
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

  const [foundPool, setFoundPool] = useState();
  const [foundPoolDetails, setFoundPoolDetails] = useState();
  const [poolShareDetails, setPoolShareDetails] = useState(null);

  const [assetA, setAssetA] = useState("");
  const [assetB, setAssetB] = useState("");

  const [assetADetails, setAssetADetails] = useState(null);
  const [assetBDetails, setAssetBDetails] = useState(null);

  const [aBitassetData, setABitassetData] = useState(null);
  const [bBitassetData, setBBitassetData] = useState(null);

  useEffect(() => {
    // Setting various react states as the user interacts with the form
    if (usr && usr.chain && pools && assets && pool) {
      const poolStore = createPoolAssetStore([
        usr.chain,
        JSON.stringify(pools),
        JSON.stringify(assets),
        pool,
      ]);

      try {
        poolStore.subscribe(({ data, error, loading }) => {
          if (error) {
            console.log({error, location: "poolStore.subscribe"});
          }
          if (data && !error && !loading) {
            setFoundPool(data.foundPool);
            setPoolShareDetails(data.poolAsset);
  
            setAssetA(data.assetA);
            setAssetB(data.assetB);
      
            setFoundPoolDetails(data.foundPoolDetails);
            setAssetADetails(data.assetADetails);
            setAssetBDetails(data.assetBDetails);
            if (data.bitassetA) {
              setABitassetData(data.bitassetA);
            }
            if (data.bitassetB) {
              setBBitassetData(data.bitassetB);
            }
          }
        });
      } catch (error) {
        console.log({error});
      }

    }
  }, [usr, pool, pools, assets]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && assetA && assetB) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id, currentNode ? currentNode.url : null]);

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

  const [aStake, setAStake] = useState(0);
  const [bStake, setBStake] = useState(0);
  const [totalReceiving, setTotalReceiving] = useState(0);

  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawingA, setWithdrawingA] = useState(0);
  const [withdrawingB, setWithdrawingB] = useState(0);

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
              <CardTitle>{t("PoolStake:title")}</CardTitle>
              <CardDescription>{t("PoolStake:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {!pools ? <p>{t("PoolStake:loadingPoolData")}</p> : null}
              {!assets ? <p>{t("PoolStake:loadingAssetData")}</p> : null}
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
                            <FormLabel>{t("PoolStake:account")}</FormLabel>
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
                            <FormLabel>{t("PoolStake:liquidityPool")}</FormLabel>
                            <FormDescription style={{ marginTop: "0px" }}>
                              {pool
                                ? t("PoolStake:liquidityPoolChosen")
                                : t("PoolStake:selectLiquidityPool")}
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
                                            : t("PoolStake:selectPoolPlaceholder")
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
                                        {t("PoolStake:searchButton")}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[900px] bg-white">
                                      <DialogHeader>
                                        <DialogTitle>
                                          {t("PoolStake:searchDialogTitle")}
                                        </DialogTitle>
                                        <DialogDescription>
                                          {t("PoolStake:searchDialogDescription")}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="grid grid-cols-1">
                                        <div className="col-span-1">
                                          <Tabs defaultValue="asset">
                                            <TabsList className="grid max-w-[400px] grid-cols-2 mb-1 gap-3">
                                              {activeTab === "asset" ? (
                                                <TabsTrigger style={activeTabStyle} value="asset">
                                                  {t("PoolStake:swappableAssets")}
                                                </TabsTrigger>
                                              ) : (
                                                <TabsTrigger
                                                  value="asset"
                                                  onClick={() => setActiveTab("asset")}
                                                >
                                                  {t("PoolStake:swappableAssets")}
                                                </TabsTrigger>
                                              )}
                                              {activeTab === "share" ? (
                                                <TabsTrigger style={activeTabStyle} value="share">
                                                  {t("PoolStake:poolShareAsset")}
                                                </TabsTrigger>
                                              ) : (
                                                <TabsTrigger
                                                  value="share"
                                                  onClick={() => setActiveTab("share")}
                                                >
                                                  {t("PoolStake:poolShareAsset")}
                                                </TabsTrigger>
                                              )}
                                            </TabsList>

                                            <Input
                                              name="assetSearch"
                                              placeholder={t("PoolStake:searchPlaceholder")}
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
                                                      {t("PoolStake:id")}
                                                    </div>
                                                    <div className="col-span-3">
                                                      <b>{t("PoolStake:shareAsset")}</b>
                                                    </div>
                                                    <div className="col-span-3">
                                                      {t("PoolStake:assetA")}
                                                    </div>
                                                    <div className="col-span-3">
                                                      {t("PoolStake:assetB")}
                                                    </div>
                                                    <div className="col-span-1">
                                                      {t("PoolStake:takerFee")}
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
                                                      {t("PoolStake:id")}
                                                    </div>
                                                    <div className="col-span-3">
                                                      {t("PoolStake:shareAsset")}
                                                    </div>
                                                    <div className="col-span-3">
                                                      <b>{t("PoolStake:assetA")}</b>
                                                    </div>
                                                    <div className="col-span-3">
                                                      <b>{t("PoolStake:assetB")}</b>
                                                    </div>
                                                    <div className="col-span-1">
                                                      {t("PoolStake:takerFee")}
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

                      <div className="grid grid-cols-10 gap-5 mt-1 mb-1">
                        {pool && assetA && assetB ? (
                          <>
                            <div className="col-span-5">
                              <Card>
                                <CardHeader className="pb-0">
                                  <CardTitle className="text-sm pt-0">
                                    {t("PoolStake:assetA")}:{" "}
                                    <ExternalLink
                                      classnamecontents="text-blue-500"
                                      type="text"
                                      text={assetA.symbol}
                                      hyperlink={`https://blocksights.info/#/assets/${assetA.id}`}
                                    />
                                  </CardTitle>
                                  <CardDescription>
                                    {t("PoolStake:currentTotalAmountInPool")}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="text-lg mt-0 pt-0">
                                  {foundPoolDetails
                                    ? foundPool.readable_balance_a.split(" ")[0]
                                    : "0"}
                                </CardContent>
                              </Card>
                            </div>
                            <div className="col-span-5">
                              <Card>
                                <CardHeader className="pb-0">
                                  <CardTitle className="text-sm pt-0">
                                    {t("PoolStake:assetB")}:{" "}
                                    <ExternalLink
                                      classnamecontents="text-blue-500"
                                      type="text"
                                      text={assetB.symbol}
                                      hyperlink={`https://blocksights.info/#/assets/${assetB.id}`}
                                    />
                                  </CardTitle>
                                  <CardDescription>
                                    {t("PoolStake:currentTotalAmountInPool")}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="text-lg">
                                  {foundPoolDetails
                                    ? foundPool.readable_balance_b.split(" ")[0]
                                    : "0"}
                                </CardContent>
                              </Card>
                            </div>
                          </>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-3 mt-5 text-center">
                        {pool ? (
                          <>
                            <ExternalLink
                              variant="outline"
                              classnamecontents="ml-2"
                              type="button"
                              text={t("PoolStake:blocksightsPoolExplorer")}
                              hyperlink={`https://blocksights.info/#/pools/${pool}${
                                usr.chain !== "bitshares" ? "?network=testnet" : ""
                              }`}
                            />
                            {foundPool && foundPoolDetails ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button className="ml-2" variant="outline">
                                    {t("PoolStake:poolJson")}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[550px] bg-white">
                                  <DialogHeader>
                                    <DialogTitle>{t("PoolStake:liquidityPoolJson")}</DialogTitle>
                                    <DialogDescription>
                                      {t("PoolStake:checkPoolDetails")}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1">
                                    <div className="col-span-1">
                                      <ScrollArea className="h-72 rounded-md border">
                                        <pre>
                                          {JSON.stringify(
                                            [foundPool, foundPoolDetails],
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </ScrollArea>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <Button className="ml-2" variant="outline">
                                {t("PoolStake:poolJson")}
                              </Button>
                            )}
                            {assetADetails && assetBDetails ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button className="ml-2" variant="outline">
                                    {t("PoolStake:swappableAssetJson")}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[550px] bg-white">
                                  <DialogHeader>
                                    <DialogTitle>{t("PoolStake:swappableAssetJson")}</DialogTitle>
                                    <DialogDescription>
                                      {t("PoolStake:checkSwappableAssetsDetails")}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1">
                                    <div className="col-span-1">
                                      <ScrollArea className="h-72 rounded-md border">
                                        <pre>
                                          {JSON.stringify(
                                            {
                                              assetA: assetA ?? "",
                                              assetADetails: assetADetails ?? {},
                                              aBitassetData: aBitassetData ?? {},
                                              assetB: assetB ?? "",
                                              assetBDetails: assetBDetails ?? {},
                                              bBitassetData: bBitassetData ?? {},
                                              poolShareDetails: poolShareDetails ?? {},
                                            },
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </ScrollArea>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <Button className="ml-2" variant="outline">
                                {t("PoolStake:swappableAssetJson")}
                              </Button>
                            )}
                          </>
                        ) : null}
                      </div>

                      {pool && pool.length ? (
                        <Tabs
                          key={`staking_${stakeTab}`}
                          defaultValue={stakeTab}
                          className="w-full mt-5"
                        >
                          <TabsList className="grid w-full grid-cols-2 gap-2">
                            {stakeTab === "stake" ? (
                              <TabsTrigger value="stake" style={activeTabStyle}>
                                {t("PoolStake:stakingAssets")}
                              </TabsTrigger>
                            ) : (
                              <TabsTrigger
                                value="stake"
                                onClick={(event) => {
                                  setStakeTab("stake");
                                }}
                              >
                                {t("PoolStake:stakeAssets")}
                              </TabsTrigger>
                            )}
                            {stakeTab === "unstake" ? (
                              <TabsTrigger value="unstake" style={activeTabStyle}>
                                {t("PoolStake:unstakingAssets")}
                              </TabsTrigger>
                            ) : (
                              <TabsTrigger
                                value="unstake"
                                onClick={(event) => {
                                  setStakeTab("unstake");
                                }}
                              >
                                {t("PoolStake:unstakeAssets")}
                              </TabsTrigger>
                            )}
                          </TabsList>

                          <TabsContent value="stake">
                            <div className="grid grid-cols-1">
                              <FormField
                                control={form.control}
                                name="stakeA"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {t("PoolStake:howMuchToStake", {
                                        symbol: assetA ? assetA.symbol : "???",
                                      })}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="grid grid-cols-12">
                                        <div className="col-span-8">
                                          <Input
                                            disabled
                                            readOnly
                                            value={
                                              assetA && aStake
                                                ? `${aStake} ${assetA.symbol}`
                                                : `0 ${assetA.symbol}`
                                            }
                                            onChange={(event) => {
                                              const input = event.target.value;
                                              const regex = /^[0-9]*\.?[0-9]*$/;
                                              if (regex.test(input)) {
                                                setAStake(input);
                                              }
                                            }}
                                          />
                                        </div>
                                        <div className="col-span-4 ml-3">
                                          <Popover>
                                            <PopoverTrigger>
                                              <span
                                                onClick={() => {
                                                  event.preventDefault();
                                                }}
                                                className="inline-block border border-grey rounded pl-4 pb-1 pr-4"
                                              >
                                                <Label>{t("PoolStake:changeAmount")}</Label>
                                              </span>
                                            </PopoverTrigger>
                                            <PopoverContent>
                                              <Label>{t("PoolStake:newAmount")}</Label>{" "}
                                              <Input
                                                placeholder={aStake}
                                                className="mb-2 mt-1"
                                                onChange={(event) => {
                                                  const input = event.target.value;
                                                  const regex = /^[0-9]*\.?[0-9]*$/;
                                                  if (input && input.length && regex.test(input)) {
                                                    setAStake(input);

                                                    if (
                                                      foundPool.balance_a &&
                                                      foundPool.balance_b
                                                    ) {
                                                      const _aAmount = parseFloat(input);
                                                      const _bAmount = parseFloat(
                                                        (
                                                          _aAmount *
                                                          (humanReadableFloat(
                                                            Number(foundPool.balance_b),
                                                            foundPool.asset_b_precision
                                                          ) /
                                                            humanReadableFloat(
                                                              Number(foundPool.balance_a),
                                                              foundPool.asset_a_precision
                                                            ))
                                                        ).toFixed(
                                                          foundPool.asset_a_precision
                                                        )
                                                      );

                                                      setBStake(_bAmount);

                                                      const _supply = humanReadableFloat(
                                                        foundPoolDetails.current_supply,
                                                        foundPool.share_asset_details
                                                          .precision
                                                      );

                                                      const balanceA = humanReadableFloat(
                                                        Number(foundPool.balance_a),
                                                        foundPool.asset_a_precision
                                                      );

                                                      const balanceB = humanReadableFloat(
                                                        Number(foundPool.balance_b),
                                                        foundPool.asset_b_precision
                                                      );

                                                      const shareAssetAmountA =
                                                        (_aAmount / balanceA) * _supply;
                                                      const shareAssetAmountB =
                                                        (_bAmount / balanceB) * _supply;

                                                      const shareAssetAmount = Math.min(
                                                        shareAssetAmountA,
                                                        shareAssetAmountB
                                                      );

                                                      setTotalReceiving(
                                                        parseFloat(
                                                          shareAssetAmount.toFixed(
                                                            foundPool.share_asset_details
                                                              .precision
                                                          )
                                                        )
                                                      );
                                                    }
                                                  }
                                                }}
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="stakeB"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {t("PoolStake:howMuchToStake", {
                                        symbol: assetB ? assetB.symbol : "???",
                                      })}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="grid grid-cols-12">
                                        <div className="col-span-8">
                                          <Input
                                            disabled
                                            readOnly
                                            value={
                                              assetB && bStake
                                                ? `${bStake} ${assetB.symbol}`
                                                : `0 ${assetB.symbol}`
                                            }
                                          />
                                        </div>
                                        <div className="col-span-4 ml-3">
                                          <Popover>
                                            <PopoverTrigger>
                                              <span
                                                onClick={() => {
                                                  event.preventDefault();
                                                }}
                                                className="inline-block border border-grey rounded pl-4 pb-1 pr-4"
                                              >
                                                <Label>{t("PoolStake:changeAmount")}</Label>
                                              </span>
                                            </PopoverTrigger>
                                            <PopoverContent>
                                              <Label>{t("PoolStake:newAmount")}</Label>{" "}
                                              <Input
                                                placeholder={bStake}
                                                className="mb-2 mt-1"
                                                onChange={(event) => {
                                                  const input = event.target.value;
                                                  const regex = /^[0-9]*\.?[0-9]*$/;
                                                  if (input && input.length && regex.test(input)) {
                                                    setBStake(input);

                                                    if (
                                                      foundPool.balance_a &&
                                                      foundPool.balance_b
                                                    ) {
                                                      const _bAmount = parseFloat(input);
                                                      const _aAmount = parseFloat(
                                                        (
                                                          _bAmount *
                                                          (humanReadableFloat(
                                                            Number(foundPool.balance_a),
                                                            foundPool.asset_a_precision
                                                          ) /
                                                            humanReadableFloat(
                                                              Number(foundPool.balance_b),
                                                              foundPool.asset_b_precision
                                                            ))
                                                        ).toFixed(
                                                          foundPool.asset_a_precision
                                                        )
                                                      );

                                                      setAStake(_aAmount);

                                                      const _supply = humanReadableFloat(
                                                        foundPoolDetails.current_supply,
                                                        foundPool.share_asset_details
                                                          .precision
                                                      );

                                                      const balanceA = humanReadableFloat(
                                                        Number(foundPool.balance_a),
                                                        foundPool.asset_a_precision
                                                      );

                                                      const balanceB = humanReadableFloat(
                                                        Number(foundPool.balance_b),
                                                        foundPool.asset_b_precision
                                                      );

                                                      const shareAssetAmountA =
                                                        (_aAmount / balanceA) * _supply;
                                                      const shareAssetAmountB =
                                                        (_bAmount / balanceB) * _supply;

                                                      const shareAssetAmount = Math.min(
                                                        shareAssetAmountA,
                                                        shareAssetAmountB
                                                      );

                                                      setTotalReceiving(
                                                        parseFloat(
                                                          shareAssetAmount.toFixed(
                                                            foundPool.share_asset_details
                                                              .precision
                                                          )
                                                        )
                                                      );
                                                    }
                                                  }
                                                }}
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="poolShareAssetAmount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t("PoolStake:totalShareAssetReceive")}</FormLabel>
                                    <FormControl>
                                      <div className="grid grid-cols-2 mb-3 mt-3">
                                        <Input
                                          disabled
                                          readOnly
                                          placeholder={
                                            foundPoolDetails
                                              ? `${totalReceiving} ${foundPoolDetails?.share_asset_symbol}`
                                              : "0"
                                          }
                                        />
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </TabsContent>
                          <TabsContent value="unstake">
                            <div className="grid grid-cols-1">
                              <FormField
                                control={form.control}
                                name="withdrawalAmount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {t("PoolStake:withdrawLabel", {
                                        symbol: foundPool.share_asset_symbol,
                                      })}
                                    </FormLabel>
                                    <FormDescription>{t("PoolStake:withdrawDesc")}</FormDescription>
                                    <FormControl>
                                      <div className="grid grid-cols-12">
                                        <div className="col-span-8">
                                          <Input
                                            disabled
                                            readOnly
                                            value={
                                              withdrawAmount
                                                ? `${withdrawAmount} ${foundPool.share_asset_symbol}`
                                                : `0 ${foundPool.share_asset_symbol}`
                                            }
                                          />
                                        </div>
                                        <div className="col-span-4 ml-3">
                                          <Popover>
                                            <PopoverTrigger>
                                              <span
                                                onClick={() => {
                                                  event.preventDefault();
                                                }}
                                                className="inline-block border border-grey rounded pl-4 pb-1 pr-4"
                                              >
                                                <Label>{t("PoolStake:changeAmount")}</Label>
                                              </span>
                                            </PopoverTrigger>
                                            <PopoverContent>
                                              <Label>{t("PoolStake:newAmount")}</Label>{" "}
                                              <Input
                                                placeholder={withdrawAmount}
                                                className="mb-2 mt-1"
                                                onChange={(event) => {
                                                  const input = event.target.value;
                                                  const regex = /^[0-9]*\.?[0-9]*$/;
                                                  if (input && input.length && regex.test(input)) {
                                                    const _input = parseFloat(
                                                      Number(input).toFixed(
                                                        foundPool.share_asset_details
                                                          .precision
                                                      )
                                                    );

                                                    setWithdrawAmount(_input);

                                                    const _supply = humanReadableFloat(
                                                      foundPoolDetails.current_supply,
                                                      foundPool.share_asset_details.precision
                                                    );

                                                    const _balanceA = humanReadableFloat(
                                                      Number(foundPool.balance_a),
                                                      foundPool.asset_a_precision
                                                    );

                                                    const _balanceB = humanReadableFloat(
                                                      Number(foundPool.balance_b),
                                                      foundPool.asset_b_precision
                                                    );

                                                    const _withdrawRatio = _input / _supply;
                                                    const _allocatedA = parseFloat(
                                                      (_balanceA * _withdrawRatio).toFixed(
                                                        foundPool.asset_a_precision
                                                      )
                                                    );
                                                    const _allocatedB = parseFloat(
                                                      (_balanceB * _withdrawRatio).toFixed(
                                                        foundPool.asset_b_precision
                                                      )
                                                    );

                                                    setWithdrawingA(_allocatedA);
                                                    setWithdrawingB(_allocatedB);
                                                  }
                                                }}
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="withdrawingA"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {t("PoolStake:withdrawingA", {
                                        symbol: assetA.symbol,
                                      })}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="grid grid-cols-2 mb-3 mt-3">
                                        <Input
                                          disabled
                                          readOnly
                                          placeholder={`${withdrawingA} ${assetA.symbol}`}
                                        />
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="withdrawingB"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {t("PoolStake:withdrawingB", {
                                        symbol: assetB.symbol,
                                      })}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="grid grid-cols-2 mb-3 mt-3">
                                        <Input
                                          disabled
                                          readOnly
                                          placeholder={`${withdrawingB} ${assetB.symbol}`}
                                        />
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </TabsContent>
                        </Tabs>
                      ) : null}

                      {foundPool ? (
                        <FormField
                          control={form.control}
                          name="networkFee"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("PoolStake:networkFee")}</FormLabel>
                              <FormDescription style={{ marginTop: "0px" }}>
                                {t(
                                  `PoolStake:networkFeeDescription${
                                    stakeTab === "stake" ? "1" : "2"
                                  }`
                                )}
                              </FormDescription>
                              <FormControl>
                                <div className="grid grid-cols-2 mb-3 mt-3">
                                  <div className="col-span-1">
                                    <Input
                                      disabled
                                      readOnly
                                      placeholder={`${stakeTab === "stake" ? fee : unstakeFee} BTS`}
                                    />
                                  </div>
                                </div>
                              </FormControl>
                              {usr.id === usr.referrer ? (
                                <FormMessage>
                                  {t("PoolStake:rebate", {
                                    rebate:
                                      stakeTab === "stake"
                                        ? (fee * 0.8).toFixed(5)
                                        : (unstakeFee * 0.8).toFixed(5),
                                  })}
                                </FormMessage>
                              ) : null}
                            </FormItem>
                          )}
                        />
                      ) : null}
                      <Button className="mt-5 mb-3" variant="outline" type="submit">
                        {t("PoolStake:submit")}
                      </Button>
                    </form>
                  </Form>
                  {showDialog && stakeTab === "stake" ? (
                    <DeepLinkDialog
                      operationNames={["liquidity_pool_deposit"]}
                      username={usr.username}
                      usrChain={usr.chain}
                      userID={usr.id}
                      dismissCallback={setShowDialog}
                      key={`Staking${aStake}${assetA.symbol}and${bStake}${assetB.symbol}`}
                      headerText={t("PoolStake:stakingAssetsDesc", {
                        aStake,
                        assetASymbol: assetA.symbol,
                        bStake,
                        assetBSymbol: assetB.symbol,
                        poolId: pool,
                      })}
                      trxJSON={[
                        {
                          account: usr.id,
                          pool: pool,
                          amount_a: {
                            amount: blockchainFloat(aStake, assetA.precision),
                            asset_id: assetA.id,
                          },
                          amount_b: {
                            amount: blockchainFloat(bStake, assetB.precision),
                            asset_id: assetB.id,
                          },
                          extensions: [],
                        },
                      ]}
                    />
                  ) : null}
                  {showDialog && stakeTab === "unstake" ? (
                    <DeepLinkDialog
                      operationNames={["liquidity_pool_withdraw"]}
                      username={usr.username}
                      usrChain={usr.chain}
                      userID={usr.id}
                      dismissCallback={setShowDialog}
                      key={`Withdrawing`}
                      headerText={t("PoolStake:unstakingDesc", {
                        amount: withdrawAmount,
                        symbol: foundPool.share_asset_symbol,
                        poolId: pool,
                      })}
                      trxJSON={[
                        {
                          account: usr.id,
                          pool: pool,
                          share_amount: {
                            amount: blockchainFloat(
                              withdrawAmount,
                              foundPool.share_asset_details.precision
                            ),
                            asset_id: foundPool.share_asset,
                          },
                          extensions: [],
                        },
                      ]}
                    />
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>

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
                  <MarketAssetCardPlaceholder type="buy" />
                  <MarketAssetCardPlaceholder type="sell" />
                </>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3">
            {pool && assetA && assetB ? (
              <>
                <Card>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle>{t("PoolStake:borrowAssets")}</CardTitle>
                    <CardDescription className="text-sm">
                      {t("PoolStake:borrowAssetsDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm pb-3">
                    <Label>{t("PoolStake:searchBorrowableAssets")}</Label>
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
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${foundPool?.share_asset_symbol}`}
                    >
                      <Badge className="ml-2 mt-1 mb-1">{foundPool?.share_asset_symbol}</Badge>
                    </a>
                    <br />
                    <Label>{t("PoolStake:searchByAcceptedCollateral")}</Label>
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
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${foundPool?.share_asset_symbol}`}
                    >
                      <Badge className="ml-2 mt-1">{foundPool?.share_asset_symbol}</Badge>
                    </a>
                  </CardContent>
                </Card>

                {foundPoolDetails && marketSearch && usrBalances ? (
                  <MarketAssetCard
                    asset={foundPool.share_asset_symbol}
                    assetData={foundPool.share_asset_details}
                    assetDetails={poolShareDetails}
                    bitassetData={null}
                    marketSearch={marketSearch}
                    chain={usr.chain}
                    usrBalances={usrBalances}
                    type="pool"
                  />
                ) : (
                  <MarketAssetCardPlaceholder type="pool" />
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 mt-5 ml-8 mr-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("PoolStake:risksAssociated")}</CardTitle>
            <CardDescription>{t("PoolStake:doYourOwnResearch")}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-sm">
              <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
                <li>{t("PoolStake:risk1")}</li>
                <li>{t("PoolStake:risk2")}</li>
                <li>{t("PoolStake:risk3")}</li>
                <li>{t("PoolStake:risk4")}</li>
                <li>{t("PoolStake:risk5")}</li>
                <li>{t("PoolStake:risk6")}</li>
                <li>{t("PoolStake:risk7")}</li>
              </ul>
            </span>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
