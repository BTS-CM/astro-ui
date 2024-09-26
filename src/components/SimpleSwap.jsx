import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useStore } from '@nanostores/react';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex as toHex } from '@noble/hashes/utils';
import { QuestionMarkCircledIcon, CircleIcon, CheckCircledIcon } from '@radix-ui/react-icons'
import { useTranslation } from "react-i18next";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { blockchainFloat, humanReadableFloat } from "@/lib/common";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";

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
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createPoolAssetStore } from "@/nanoeffects/Assets.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

export default function SimpleSwap() {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNode = useStore($currentNode);

  const [pool, setPool] = useState("");

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  const blocklist = useSyncExternalStore($blockList.subscribe, $blockList.get, () => true);

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
    if (!_chain || (!_assetsBTS && !_assetsTEST)) {
      return [];
    }
  
    if (_chain !== "bitshares") {
      return _assetsTEST;
    }
  
    const relevantAssets = _assetsBTS.filter((asset) => {
      return !blocklist.users.includes(toHex(sha256(asset.issuer)));
    });
  
    return relevantAssets;
  }, [blocklist, _assetsBTS, _assetsTEST, _chain]);

  const pools = useMemo(() => {
    if (!_chain || (!_poolsBTS && !_poolsTEST)) {
      return [];
    }
  
    if (_chain !== "bitshares") {
      return _poolsTEST;
    }
  
    const relevantPools = _poolsBTS.filter((pool) => {
      const poolShareAsset = assets.find((asset) => asset.id === pool.share_asset_id);
      if (!poolShareAsset) return false;
      return !blocklist.users.includes(toHex(sha256(poolShareAsset.issuer)));
    });
  
    return relevantPools;
  }, [assets, blocklist, _poolsBTS, _poolsTEST, _chain]);

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

  const [selectedAssetA, setSelectedAssetA] = useState();
  const [selectedAssetB, setSelectedAssetB] = useState();

  const poolAssets = useMemo(() => {
    if (pools && pools.length) {
      const allSymbols = pools.flatMap(pool => [pool.asset_a_symbol, pool.asset_b_symbol]);
      return [...new Set(allSymbols)];
    }
    return [];
  }, [pools]);

  const possiblePools = useMemo(() => {
    if (selectedAssetA && pools && pools.length) {
      return pools.filter((x) => x.asset_a_symbol === selectedAssetA || x.asset_b_symbol === selectedAssetA);
    }
  }, [selectedAssetA, pools]);

  const possiblePoolAssets = useMemo(() => {
    if (possiblePools && possiblePools.length) {
      return [
        ...new Set(
          possiblePools.map((x) => (x.asset_a_symbol === selectedAssetA ? x.asset_b_symbol : x.asset_a_symbol))
        )
      ];
    }
  }, [possiblePools, selectedAssetA]);
  
  const [finalPools, setFinalPools] = useState([]);
  useEffect(() => {
    if (!_chain) return;
    if (selectedAssetA && selectedAssetB) {
      let relevantPools = pools.filter(
        (x) => x.asset_a_symbol === selectedAssetA && x.asset_b_symbol === selectedAssetB ||
               x.asset_a_symbol === selectedAssetB && x.asset_b_symbol === selectedAssetA
      );
      
      if (relevantPools && relevantPools.length) {
        setPool(relevantPools[0].id); 
        setFinalPools(relevantPools);
      }
    } else {
      setPool("");
      setFinalPools([]);
    }
  }, [_chain, selectedAssetA, selectedAssetB]);

  useEffect(() => {
    async function parseUrlParams() {
      if (window.location.search) {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlSearchParams.entries());
        const poolParameter = params && params.pool ? params.pool : null;

        function defaultPool() { 
          setPool(pools[0].id);
          setSelectedAssetA(pools[0].asset_a_symbol);
          setSelectedAssetB(pools[0].asset_b_symbol);
        }

        if (!poolParameter || !poolParameter.length) {
          console.log("Invalid pool parameters 1");
          defaultPool();
          return;
        }

        if (poolParameter && poolParameter.length && !poolParameter.includes("1.19.")) {
          console.log("Invalid pool parameters 2");
          defaultPool();
          return;
        }

        const poolIds = pools && pools.length ? pools.map((x) => x.id) : [];
        if (!poolIds.includes(poolParameter)) {
          console.log("Replacing unknown pool with first pool in list");
          defaultPool();
          return;
        }

        setPool(poolParameter);
        setSelectedAssetA(pools.find((x) => x.id === poolParameter).asset_a_symbol);
        setSelectedAssetB(pools.find((x) => x.id === poolParameter).asset_b_symbol);
      }
    }

    if (pools && pools.length) {
      parseUrlParams();
    }
  }, [pools]);

  const [sellAmount, setSellAmount] = useState(1);

  const [foundPool, setFoundPool] = useState();
  const [assetA, setAssetA] = useState("");
  const [assetB, setAssetB] = useState("");

  const [foundPoolDetails, setFoundPoolDetails] = useState();
  
  const [assetADetails, setAssetADetails] = useState(null);
  const [assetBDetails, setAssetBDetails] = useState(null);
  const [poolShareDetails, setPoolShareDetails] = useState(null);

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
        currentNode ? currentNode.url : null
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

  const [inverted, setInverted] = useState(false);
  const buyAmount = useMemo(() => {
    // Calculating the amount the user can buy
    if (assetA && assetB && foundPool) {
      let poolamounta = Number(foundPool.balance_a);
      let poolamountap = Number(10 ** assetA.precision);

      let poolamountb = Number(foundPool.balance_b);
      let poolamountbp = Number(10 ** assetB.precision);

      const maker_market_fee_percenta = assetA && assetA.options && assetA.options.market_fee_percent
        ? assetA.options.market_fee_percent
        : 0;

      const maker_market_fee_percentb = assetB && assetB.options && assetB.options.market_fee_percent
        ? assetB.options.market_fee_percent
        : 0;

      const max_market_feea = assetA && assetA.options && assetA.options.max_market_fee
        ? assetA.options.max_market_fee
        : 0;

      const max_market_feeb = assetB && assetB.options && assetB.options.max_market_fee
        ? assetB.options.max_market_fee
        : 0;

      const taker_fee_percenta = foundPool.taker_fee_percent;

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
  }, [sellAmount, assetA, assetB, inverted, foundPool]);

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
  }, [pool]);

  const RowA = ({ index, style }) => {
    const selectedAsset = poolAssets[index];
    return (
      <SelectItem value={selectedAsset} key={`asset_a_${selectedAsset}`} style={style}>
        {selectedAsset}
      </SelectItem>
    );
  };

  const RowB = ({ index, style }) => {
    const selectedAsset = possiblePoolAssets[index];
    return (
      <SelectItem value={selectedAsset} key={`asset_b_${selectedAsset}`} style={style}>
        {selectedAsset}
      </SelectItem>
    );
  };

  const [isRotating, setIsRotating] = useState(false);
  const rotateStyle = isRotating
    ? {
        transition: "transform 0.5s",
        transform: "rotate(360deg)",
      }
    : {};

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card className="p-2">
            <CardHeader>
              <CardTitle>{t("SimpleSwap:title")}</CardTitle>
              <CardDescription>{t("SimpleSwap:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {!pools ? <p>{t("SimpleSwap:loadingPoolData")}</p> : null}
              {!assets ? <p>{t("SimpleSwap:loadingAssetData")}</p> : null}
              {pools && assets ? (
                <>
                  <Form {...form}>
                    <form
                      onSubmit={() => {
                        setShowDialog(true);
                        event.preventDefault();
                      }}
                    >

                      <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-1">
                          <FormItem>
                            <FormLabel>
                              <div className="grid grid-cols-4">
                                <div className="col-span-1">{t("SimpleSwap:amountToSwap")}</div>
                                <div className="col-span-3">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <QuestionMarkCircledIcon />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          {
                                            !inverted
                                              ? t("SimpleSwap:enterAmountToSwap", {
                                                  symbolA: assetA ? assetA.symbol : "???",
                                                  symbolB: assetB ? assetB.symbol : "???",
                                                })
                                              : t("SimpleSwap:enterAmountToSwap", {
                                                symbolA: assetB ? assetB.symbol : "???",
                                                symbolB: assetA ? assetA.symbol : "???",
                                              })
                                          }
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            </FormLabel>
                            <FormControl
                              onChange={(event) => {
                                const input = event.target.value;
                                const regex = /^[0-9]*\.?[0-9]*$/;
                                if (regex.test(input)) {
                                  setSellAmount(input);
                                }
                              }}
                            >
                              <Input
                                label={
                                  !inverted
                                    ? t("SimpleSwap:amountToSwap", {symbol: assetA ? assetA.symbol : "???"})
                                    : t("SimpleSwap:amountToSwap", {symbol: assetB ? assetB.symbol : "???"})
                                }
                                value={sellAmount}
                                placeholder={sellAmount}
                                className="mb-3"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        </div>
                        <div className="col-span-1 mt-6">
                          <FormField
                            control={form.control}
                            name="assetA"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" className="hover:bg-gray-100 hover:shadow-lg w-full">
                                        {
                                          selectedAssetA
                                            ? inverted ? selectedAssetB : selectedAssetA
                                            : t("SimpleSwap:sendAsset")
                                        }
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="mt-10 p-0 w-[300px]" side="end">
                                      <Command className="rounded-lg border shadow-md">
                                        <CommandInput placeholder={t("PageHeader:commandSearchPlaceholder")} />
                                        <CommandList>
                                          <CommandEmpty>{t("PageHeader:noResultsFound")}</CommandEmpty>
                                          <CommandGroup>
                                            {
                                              poolAssets
                                                ? poolAssets.map((asset) => (
                                                  <CommandItem className="hover:bg-gray-200 bg-gray-100">
                                                    <span className="grid grid-cols-8 w-full" onClick={() => {
                                                      setSelectedAssetA(asset)
                                                      setSelectedAssetB();
                                                      setInverted(false);
                                                    }}>
                                                      {asset}
                                                    </span>
                                                  </CommandItem>
                                                ))
                                                : null
                                            }
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="col-span-1 text-right mt-5">
                        <Toggle
                          variant="outline"
                          onClick={() => {
                            setInverted(!inverted);
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

                      <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-1">
                          <FormField
                            control={form.control}
                            name="buyAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <div className="grid grid-cols-4">
                                    <div className="col-span-1">
                                      {t("SimpleSwap:totalAmount")}
                                    </div>
                                    <div className="col-span-3">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <QuestionMarkCircledIcon />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>
                                              {
                                                !inverted
                                                  ? t("SimpleSwap:totalAmountDescription", {
                                                      symbolA: assetA ? assetA.symbol : "???",
                                                      symbolB: assetB ? assetB.symbol : "???",
                                                    })
                                                  : t("SimpleSwap:totalAmountDescription", {
                                                      symbolA: assetB ? assetB.symbol : "???",
                                                      symbolB: assetA ? assetA.symbol : "???",
                                                    })
                                              }
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  </div>
                                </FormLabel>
                                <FormControl>
                                  {buyAmountInput}
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-1 mt-6">
                          <FormField
                            control={form.control}
                            name="assetB"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" className="hover:bg-gray-100 hover:shadow-lg w-full">
                                        {
                                          selectedAssetB
                                            ? inverted ? selectedAssetA : selectedAssetB
                                            : t("SimpleSwap:sendAsset")
                                        }
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="mt-10 p-0 w-[300px]" side="end">
                                      <Command className="rounded-lg border shadow-md">
                                        <CommandInput placeholder={t("PageHeader:commandSearchPlaceholder")} />
                                        <CommandList>
                                          <CommandEmpty>{t("PageHeader:noResultsFound")}</CommandEmpty>
                                          <CommandGroup>
                                            {
                                              possiblePoolAssets
                                                ? possiblePoolAssets.map((asset) => (
                                                  <CommandItem className="hover:bg-gray-200 bg-gray-100">
                                                    <span className="grid grid-cols-8 w-full" onClick={() => setSelectedAssetB(asset)}>
                                                      {asset}
                                                    </span>
                                                  </CommandItem>
                                                ))
                                                : null
                                            }
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {
                        foundPool
                          ? <Table className="mt-5">
                              <TableCaption>
                                {
                                  finalPools && finalPools.length > 1
                                  ? t("SimpleSwap:noPoolDetails")
                                  : null
                                }
                              </TableCaption>
                              <TableHeader>
                                <TableRow>
                                  <TableHead></TableHead>
                                  <TableHead>ID</TableHead>
                                  <TableHead>
                                    
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="grid grid-cols-2"><span>Pool fee</span><QuestionMarkCircledIcon /></div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{t("SimpleSwap:poolFeeDescription")}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableHead>
                                  <TableHead>{selectedAssetA}</TableHead>
                                  <TableHead>{selectedAssetB}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {finalPools && finalPools.length ? finalPools.map((_pool) => (
                                  <TableRow key={`pool_${_pool.id}`}>
                                    <TableCell>
                                      {
                                        _pool.id === pool
                                        ? <CheckCircledIcon />
                                        : <CircleIcon 
                                            onClick={() => {
                                              setPool(_pool.id);
                                            }}
                                          />
                                      }
                                    </TableCell>
                                    <TableCell>{_pool.id}</TableCell>
                                    <TableCell>
                                      {
                                        `${(
                                          (_pool.taker_fee_percent / 10000) *
                                          sellAmount
                                        ).toFixed(!inverted ? assetA.precision : assetB.precision)} (${!inverted ? assetA.symbol : assetB.symbol}) (${
                                          _pool.taker_fee_percent / 100
                                        }% ${t("SimpleSwap:fee")})`
                                      }
                                    </TableCell>
                                    <TableCell>
                                      {humanReadableFloat(_pool.balance_a, assetA.precision)}
                                    </TableCell>
                                    <TableCell>
                                      {humanReadableFloat(_pool.balance_b, assetB.precision)}
                                    </TableCell>
                                  </TableRow>
                                )) : null}
                              </TableBody>
                            </Table>
                          : null
                      }

                      {!pool || !sellAmount || !buyAmount || showDialog !== false ? (
                        <Button className="mt-5 w-full bg-purple-300 hover:bg-purple-400" variant="primary" disabled type="submit">
                          {t("SimpleSwap:exchange")}
                        </Button>
                      ) : (
                        <Button className="mt-5 w-full bg-purple-300 hover:bg-purple-400" variant="outline" type="submit">
                          {t("SimpleSwap:exchange")}
                        </Button>
                      )}
                    </form>
                  </Form>
                  {showDialog ? (
                    <DeepLinkDialog
                      operationNames={["liquidity_pool_exchange"]}
                      username={usr.username}
                      usrChain={usr.chain}
                      userID={usr.id}
                      dismissCallback={setShowDialog}
                      key={`Exchanging${sellAmount}${!inverted ? assetA.symbol : assetB.symbol}for${buyAmount}${!inverted ? assetB.symbol : assetA.symbol}`}
                      headerText={t("SimpleSwap:exchangeHeader", {
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
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {
          pool
          ? <div className="grid grid-cols-2 gap-3 mt-5">
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
                      <CardTitle>{t("SimpleSwap:quoteAsset")}</CardTitle>
                      <CardDescription className="text-lg">{t("SimpleSwap:loading")}</CardDescription>
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
                      <CardTitle>{t("SimpleSwap:baseAsset")}</CardTitle>
                      <CardDescription className="text-lg">{t("SimpleSwap:loading")}</CardDescription>
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
              {foundPool && marketSearch && usrBalances ? (
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
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>{t("SimpleSwap:poolShareAsset")}</CardTitle>
                      <CardDescription className="text-lg">{t("SimpleSwap:loading")}</CardDescription>
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

                <Card>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle>{t("SimpleSwap:borrowAssets")}</CardTitle>
                    <CardDescription className="text-sm">
                      {t("SimpleSwap:borrowAssetsDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm pb-3">
                    <Label>{t("SimpleSwap:searchBorrowableAssets")}</Label>
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
                    <Label>{t("SimpleSwap:searchAcceptedCollateral")}</Label>
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
            </div>
          : null
        }
        
        <div className="grid grid-cols-2 gap-3 mt-5">
            {pool && assetA && assetB ? (
              <>
                <a
                  href={
                    !inverted
                      ? `/dex/index.html?market=${foundPool?.share_asset_symbol}_${assetA.symbol !== "BTS" ? "BTS" : assetA.symbol}`
                      : `/dex/index.html?market=${foundPool?.share_asset_symbol}_${assetB.symbol !== "BTS" ? "BTS" : assetB.symbol}`
                    }
                >
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>{t("SimpleSwap:purchaseStake")}</CardTitle>
                      <CardDescription className="text-sm">
                        {t("SimpleSwap:shareAsset", { shareAsset: foundPool?.share_asset_symbol })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pb-2">
                      {t("SimpleSwap:purchaseStakeDescription")}
                    </CardContent>
                  </Card>
                </a>
                <a href={`/stake/index.html?pool=${pool}`}>
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>{t("SimpleSwap:stakeAssets")}</CardTitle>
                      <CardDescription className="text-sm">
                        {t("SimpleSwap:shareAsset", { shareAsset: foundPool?.share_asset_symbol })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pb-2">
                      {t("SimpleSwap:stakeAssetsDescription")}
                    </CardContent>
                  </Card>
                </a>
                <a href={
                  !inverted
                  ? `/dex/index.html?market=${assetA.symbol}_${assetB.symbol}`
                  : `/dex/index.html?market=${assetB.symbol}_${assetA.symbol}`
                }>
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle>{t("SimpleSwap:tradeOnDex")}</CardTitle>
                      <CardDescription className="text-sm">
                        {
                          !inverted
                            ? t("SimpleSwap:market", { symbolA: assetA.symbol, symbolB: assetB.symbol })
                            : t("SimpleSwap:market", { symbolA: assetB.symbol, symbolB: assetA.symbol })
                         }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pb-2">
                      {t("SimpleSwap:tradeOnDexDescription")}
                    </CardContent>
                  </Card>
                </a>
              </>
            ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 mt-5 ml-8 mr-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("SimpleSwap:risksTitle")}</CardTitle>
            <CardDescription>{t("SimpleSwap:risksDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-sm">
              <Label className="mb-0 pb-0 text-lg">{t("SimpleSwap:liquidityPoolRisks")}</Label>
              <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
                <li>{t("SimpleSwap:liquidityPoolRisk1")}</li>
                <li>{t("SimpleSwap:liquidityPoolRisk2")}</li>
              </ul>
            </span>
            <span className="text-sm">
              <Label className="mb-0 pb-0 text-lg">{t("SimpleSwap:swappableAssetRisks")}</Label>
              <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
                <li>{t("SimpleSwap:swappableAssetRisk1")}</li>
                <li>
                  {
                    !inverted
                    ? t("SimpleSwap:swappableAssetRisk2", {
                        symbol: assetA.symbol !== "BTS" ? "BTS" : assetA.symbol,
                      })
                    : t("SimpleSwap:swappableAssetRisk2", {
                        symbol: assetB.symbol !== "BTS" ? "BTS" : assetB.symbol,
                      })
                  }
                </li>
                <li>{t("SimpleSwap:swappableAssetRisk3")}</li>
              </ul>
            </span>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
