import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useForm } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import {
  QuestionMarkCircledIcon,
  CircleIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { List } from "react-window";

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
} from "@/components/ui/tooltip";

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
// Removed Toggle import as it's no longer used
// import { Toggle } from "@/components/ui/toggle";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createPoolAssetStore } from "@/nanoeffects/Assets.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

export default function SimpleSwap(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
      // Removed initial values for assetA/B from form defaults as they are handled by state
    },
  });
  const currentNode = useStore($currentNode);

  const [pool, setPool] = useState(""); // Currently selected Pool ID

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const {
    _marketSearchBTS,
    _marketSearchTEST,
    _assetsBTS,
    _assetsTEST,
    _poolsBTS,
    _poolsTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (!_chain || (!_assetsBTS && !_assetsTEST)) {
      return [];
    }

    const currentAssets = _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    if (!currentAssets) return [];

    const relevantAssets = currentAssets.filter((asset) => {
      // Ensure asset.issuer exists before hashing
      return (
        asset.issuer &&
        !blocklist.users.includes(toHex(sha256(utf8ToBytes(asset.issuer))))
      );
    });

    return relevantAssets;
  }, [blocklist, _assetsBTS, _assetsTEST, _chain]);

  const pools = useMemo(() => {
    if (!_chain || (!_poolsBTS && !_poolsTEST)) {
      return [];
    }

    const currentPools = _chain === "bitshares" ? _poolsBTS : _poolsTEST;
    if (!currentPools || !assets || assets.length === 0) return [];

    const relevantPools = currentPools.filter((pool) => {
      const poolShareAsset = assets.find(
        (asset) => asset.id === pool.share_asset_id
      );
      if (!poolShareAsset || !poolShareAsset.issuer) return false; // Check issuer exists
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(poolShareAsset.issuer)))
      );
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
      // Operation 63: liquidity_pool_exchange
      const foundFee = globalParams.find((x) => x.id === 63);
      if (
        foundFee &&
        foundFee.data &&
        typeof foundFee.data.fee !== "undefined"
      ) {
        const finalFee = humanReadableFloat(foundFee.data.fee, 5); // Assuming core asset precision 5
        setFee(finalFee);
      }
    }
  }, [globalParams]);

  // State for the symbols of selected assets
  const [selectedAssetASymbol, setSelectedAssetASymbol] = useState(); // Asset User wants to SELL
  const [selectedAssetBSymbol, setSelectedAssetBSymbol] = useState(); // Asset User wants to BUY

  // Memoized list of unique asset symbols available in pools
  const poolAssets = useMemo(() => {
    if (pools && pools.length) {
      const allSymbols = pools.flatMap((pool) => [
        pool.asset_a_symbol,
        pool.asset_b_symbol,
      ]);
      return [...new Set(allSymbols)].sort(); // Sort alphabetically for consistent dropdown order
    }
    return [];
  }, [pools]);

  // Memoized list of pools that involve the selected selling asset (selectedAssetASymbol)
  const possiblePools = useMemo(() => {
    if (selectedAssetASymbol && pools && pools.length) {
      return pools.filter(
        (x) =>
          x.asset_a_symbol === selectedAssetASymbol ||
          x.asset_b_symbol === selectedAssetASymbol
      );
    }
    return [];
  }, [selectedAssetASymbol, pools]);

  // Memoized list of asset symbols that can be bought when selling selectedAssetASymbol
  const possiblePoolAssets = useMemo(() => {
    if (possiblePools && possiblePools.length) {
      return [
        ...new Set(
          possiblePools.map((x) =>
            x.asset_a_symbol === selectedAssetASymbol
              ? x.asset_b_symbol
              : x.asset_a_symbol
          )
        ),
      ].sort(); // Sort alphabetically
    }
    return [];
  }, [possiblePools, selectedAssetASymbol]);

  // Memoized list of pools matching the selected pair (A and B)
  const [finalPools, setFinalPools] = useState([]);
  useEffect(() => {
    if (!_chain || !pools || pools.length === 0) return;

    if (selectedAssetASymbol && selectedAssetBSymbol) {
      let relevantPools = pools.filter(
        (x) =>
          (x.asset_a_symbol === selectedAssetASymbol &&
            x.asset_b_symbol === selectedAssetBSymbol) ||
          (x.asset_a_symbol === selectedAssetBSymbol &&
            x.asset_b_symbol === selectedAssetASymbol)
      );

      if (relevantPools && relevantPools.length) {
        // If a pool is already selected and it's still valid, keep it. Otherwise, select the first one.
        const currentPoolIsValid = relevantPools.some((p) => p.id === pool);
        if (!currentPoolIsValid) {
          setPool(relevantPools[0].id);
        }
        setFinalPools(relevantPools);
      } else {
        setPool("");
        setFinalPools([]);
      }
    } else {
      // Clear pool selection if assets aren't fully selected
      setPool("");
      setFinalPools([]);
    }
  }, [_chain, selectedAssetASymbol, selectedAssetBSymbol, pools, pool]); // Added pool dependency

  // Effect to parse URL parameters on load/pools change
  useEffect(() => {
    async function parseUrlParams() {
      if (!window.location.search || !pools || !pools.length) {
        return;
      }

      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const poolParameter = params?.pool;

      function defaultPool() {
        // Set default to the first pool in the overall list if no valid URL param
        if (pools && pools.length > 0) {
          const firstPool = pools[0];
          setPool(firstPool.id);
          setSelectedAssetASymbol(firstPool.asset_a_symbol);
          setSelectedAssetBSymbol(firstPool.asset_b_symbol);
        }
      }

      if (
        !poolParameter ||
        !poolParameter.length ||
        !poolParameter.includes("1.19.")
      ) {
        // No valid pool parameter found, potentially set a default if desired
        // For now, let's not automatically set a default here, user needs to select
        // defaultPool(); // Uncomment if you want to default if URL param is missing/invalid
        return;
      }

      const foundPoolByURL = pools.find((p) => p.id === poolParameter);

      if (!foundPoolByURL) {
        console.log("URL Pool parameter not found in available pools.");
        // defaultPool(); // Optionally default if the specific pool isn't available
        return;
      }

      setPool(foundPoolByURL.id);
      setSelectedAssetASymbol(foundPoolByURL.asset_a_symbol);
      setSelectedAssetBSymbol(foundPoolByURL.asset_b_symbol);
    }

    parseUrlParams();
    // Run only once when pools are loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pools]);

  const [sellAmount, setSellAmount] = useState("1"); // Input for amount to sell

  // State variables to hold data for the *selected* pool and its assets
  const [foundPool, setFoundPool] = useState(); // The pool object matching the 'pool' ID state
  const [assetA, setAssetA] = useState(null); // Asset details for selectedAssetASymbol
  const [assetB, setAssetB] = useState(null); // Asset details for selectedAssetBSymbol

  const [foundPoolDetails, setFoundPoolDetails] = useState(); // Dynamic pool details
  const [assetADetails, setAssetADetails] = useState(null); // Dynamic asset details for A
  const [assetBDetails, setAssetBDetails] = useState(null); // Dynamic asset details for B
  const [poolShareDetails, setPoolShareDetails] = useState(null); // Dynamic details for pool share asset

  const [aBitassetData, setABitassetData] = useState(null); // Bitasset data if A is MPA
  const [bBitassetData, setBBitassetData] = useState(null); // Bitasset data if B is MPA

  // Effect to fetch detailed pool/asset data when the selected pool changes
  useEffect(() => {
    // Reset state when pool or assets required for lookup are missing
    if (
      !usr ||
      !usr.chain ||
      !pool ||
      !pools ||
      !assets ||
      !selectedAssetASymbol ||
      !selectedAssetBSymbol
    ) {
      return;
    }

    const poolStore = createPoolAssetStore([
      usr.chain,
      JSON.stringify(pools), // Pass all pools for potential lookups within store
      JSON.stringify(assets), // Pass all assets for lookups
      pool, // The specific pool ID to focus on
      currentNode ? currentNode.url : null,
    ]);

    let subscribed = true;
    const unsubscribe = poolStore.subscribe(({ data, error, loading }) => {
      if (!subscribed) return; // Prevent state updates after unmount or dependency change

      if (error) {
        console.log({ error, location: "poolStore.subscribe" });
        // Consider resetting state on error
        setFoundPool(null);
        setAssetA(null);
        setAssetB(null);
      } else if (data && !loading) {
        // We have data, now align it with selectedAssetASymbol and selectedAssetBSymbol
        const poolData = data.foundPool; // The pool object from the store (matches 'pool' id)
        const assetDataA = data.assetA; // Asset A from the pool's perspective
        const assetDataB = data.assetB; // Asset B from the pool's perspective

        setFoundPool(poolData);
        setPoolShareDetails(data.poolAsset);
        setFoundPoolDetails(data.foundPoolDetails);

        // IMPORTANT: Align state (assetA, assetB) with user selection (selectedAssetASymbol, selectedAssetBSymbol)
        if (assetDataA && assetDataB && poolData) {
          if (assetDataA.symbol === selectedAssetASymbol) {
            // Pool's A matches user's Sell Asset
            setAssetA(assetDataA);
            setAssetB(assetDataB);
            setAssetADetails(data.assetADetails);
            setAssetBDetails(data.assetBDetails);
            setABitassetData(data.bitassetA);
            setBBitassetData(data.bitassetB);
          } else if (assetDataB.symbol === selectedAssetASymbol) {
            // Pool's B matches user's Sell Asset (swap them for component state)
            setAssetA(assetDataB); // assetA state now holds the Sell asset's data
            setAssetB(assetDataA); // assetB state now holds the Buy asset's data
            setAssetADetails(data.assetBDetails);
            setAssetBDetails(data.assetADetails);
            setABitassetData(data.bitassetB);
            setBBitassetData(data.bitassetA);
          } else {
            // This shouldn't happen if pool selection logic is correct, but handle defensively
            console.error("Mismatch between selected assets and pool assets");
            setAssetA(null);
            setAssetB(null);
          }
        } else {
          // Data missing, reset
          setAssetA(null);
          setAssetB(null);
          setAssetADetails(null);
          setAssetBDetails(null);
          setABitassetData(null);
          setBBitassetData(null);
        }
      }
    });

    return () => {
      subscribed = false; // Mark as unsubscribed
      // Check if unsubscribe function exists before calling, although store should provide it
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
    // Depend on the core identifiers and data sources
  }, [
    usr,
    pool,
    pools,
    assets,
    currentNode,
    selectedAssetASymbol,
    selectedAssetBSymbol,
  ]);

  // Fetch user balances
  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && assets && assets.length > 0 && currentNode) {
      // Ensure assets are loaded
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode.url,
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            // Filter balances to only include assets known by the UI
            const assetIds = new Set(assets.map((a) => a.id));
            const filteredData = data.filter((balance) =>
              assetIds.has(balance.asset_id)
            );
            setUsrBalances(filteredData);
          } else if (error) {
            console.error("Error fetching user balances:", error);
            setUsrBalances([]); // Set to empty on error
          }
        }
      );
    } else {
      setUsrBalances(undefined); // Reset if prerequisites aren't met
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assets, currentNode]); // Depend on user, assets list, and node

  // Calculate the expected buy amount based on sellAmount, selected assets, and pool data
  const buyAmount = useMemo(() => {
    // Ensure all required data is available
    if (
      !sellAmount ||
      !assetA ||
      !assetB ||
      !foundPool ||
      !foundPool.balance_a ||
      !foundPool.balance_b
    ) {
      return 0; // Or null/undefined, depending on desired display for invalid state
    }

    const sellAmountNum = parseFloat(sellAmount);
    if (isNaN(sellAmountNum) || sellAmountNum <= 0) {
      return 0;
    }

    // assetA is the SELLING asset, assetB is the BUYING asset (due to alignment in useEffect)
    const sellingAssetDetails = assetA;
    const buyingAssetDetails = assetB;

    const sellPrecision = 10 ** sellingAssetDetails.precision;
    const buyPrecision = 10 ** buyingAssetDetails.precision;

    // Determine which pool balance corresponds to which asset (A=Sell, B=Buy)
    let poolBalanceSell, poolBalanceBuy;
    if (foundPool.asset_a_id === sellingAssetDetails.id) {
      poolBalanceSell = Number(foundPool.balance_a);
      poolBalanceBuy = Number(foundPool.balance_b);
    } else if (foundPool.asset_b_id === sellingAssetDetails.id) {
      poolBalanceSell = Number(foundPool.balance_b);
      poolBalanceBuy = Number(foundPool.balance_a);
    } else {
      console.error(
        "Pool assets don't match selected assets in buyAmount calculation."
      );
      return 0; // Should not happen
    }

    // --- Fee Calculations ---

    // 1. Market Fee on Input (Selling Asset)
    const makerFeePercentSell =
      sellingAssetDetails?.options?.market_fee_percent ?? 0;
    const maxMarketFeeSell = sellingAssetDetails?.options?.max_market_fee ?? 0;
    let marketFeeAmountSell = 0;
    if (makerFeePercentSell > 0) {
      marketFeeAmountSell = Math.min(
        Number(maxMarketFeeSell),
        Math.ceil(
          sellAmountNum * sellPrecision * (Number(makerFeePercentSell) / 10000)
        )
      );
    }
    const amountToSellInBlockchainUnits = sellAmountNum * sellPrecision;
    const effectiveSellAmountUnits =
      amountToSellInBlockchainUnits - marketFeeAmountSell;

    if (effectiveSellAmountUnits <= 0) return 0; // Cannot sell less than fee

    // --- AMM Calculation ---
    // Formula: output = poolBalanceBuy - floor((poolBalanceBuy * poolBalanceSell) / (poolBalanceSell + effectiveSellAmountUnits))
    // Use floor for constant product preservation as often seen in DEX implementations.
    // Ensure no division by zero if poolBalanceSell is somehow 0 (though unlikely for active pools)
    if (poolBalanceSell + effectiveSellAmountUnits === 0) return 0;

    const raw_delta_b_units =
      Number(poolBalanceBuy) -
      Math.floor(
        (Number(poolBalanceBuy) * Number(poolBalanceSell)) /
          (Number(poolBalanceSell) + effectiveSellAmountUnits)
      );

    if (raw_delta_b_units <= 0) return 0; // No output amount

    // 2. Pool Taker Fee (on output)
    const takerFeePercentPool = foundPool.taker_fee_percent ?? 0;
    const poolTakerFeeAmountUnits = Math.floor(
      (Number(raw_delta_b_units) * Number(takerFeePercentPool)) / 10000
    );

    // 3. Market Fee on Output (Buying Asset)
    const makerFeePercentBuy =
      buyingAssetDetails?.options?.market_fee_percent ?? 0;
    const maxMarketFeeBuy = buyingAssetDetails?.options?.max_market_fee ?? 0;
    let marketFeeAmountBuyUnits = 0;
    if (makerFeePercentBuy > 0) {
      // Apply fee on the amount *after* pool fee might be more accurate, but let's follow original structure's apparent logic (fee on raw output)
      // Revisit if Bitshares core logic applies market fee differently (e.g., after pool fee).
      marketFeeAmountBuyUnits = Math.min(
        Number(maxMarketFeeBuy),
        Math.ceil(
          Number(raw_delta_b_units) * (Number(makerFeePercentBuy) / 10000)
        )
      );
    }

    // --- Final Amount ---
    const final_amount_b_units =
      Number(raw_delta_b_units) -
      Number(poolTakerFeeAmountUnits) -
      Number(marketFeeAmountBuyUnits);

    const result = final_amount_b_units / buyPrecision;

    // Return final amount, ensuring it's not negative and has reasonable precision
    return result > 0
      ? parseFloat(result.toFixed(buyingAssetDetails.precision))
      : 0;
  }, [sellAmount, assetA, assetB, foundPool]); // Dependencies: Input amount, aligned asset details, and pool data

  const [buyAmountInput, setBuyAmountInput] = useState();
  useEffect(() => {
    // Update the readonly input field when buyAmount calculation changes
    setBuyAmountInput(
      <Input readOnly value={buyAmount ?? "0"} disabled className="mb-3" />
    );
  }, [buyAmount]);

  const [showDialog, setShowDialog] = useState(false);

  // Update URL when pool selection changes
  useEffect(() => {
    if (pool && pool.length && selectedAssetASymbol && selectedAssetBSymbol) {
      const currentUrlParams = new URLSearchParams(window.location.search);
      currentUrlParams.set("pool", pool);
      window.history.replaceState({}, "", `?${currentUrlParams.toString()}`);
    }
  }, [pool, selectedAssetASymbol, selectedAssetBSymbol]); // Update when pool or assets change

  // Component for rendering a row in the pool list
  const poolRow = ({ index, style }) => {
    const _pool = finalPools[index];

    // Need asset details to get precision for formatting balances
    // Note: assetA and assetB state vars hold the *selected* sell/buy asset details
    const assetDetailA = assetA; // Corresponds to selectedAssetASymbol
    const assetDetailB = assetB; // Corresponds to selectedAssetBSymbol

    if (!assetDetailA || !assetDetailB) {
      // Render placeholder or empty if details not loaded yet
      return <div style={style}>Loading pool details...</div>;
    }

    // Determine which pool balance belongs to which selected asset
    let balanceForSelectedA, balanceForSelectedB;
    let precisionForSelectedA, precisionForSelectedB;

    if (_pool.asset_a_symbol === selectedAssetASymbol) {
      balanceForSelectedA = _pool.balance_a;
      precisionForSelectedA = assetDetailA.precision;
      balanceForSelectedB = _pool.balance_b;
      precisionForSelectedB = assetDetailB.precision;
    } else {
      // Pool's A is the user's B, Pool's B is the user's A
      balanceForSelectedA = _pool.balance_b;
      precisionForSelectedA = assetDetailA.precision;
      balanceForSelectedB = _pool.balance_a;
      precisionForSelectedB = assetDetailB.precision;
    }

    // Calculate approximate fee amount for display (using current sellAmount)
    const sellAmountNum = parseFloat(sellAmount) || 0;
    const feePercent = (_pool.taker_fee_percent ?? 0) / 100; // e.g., 0.2
    // This is a simplification for display, actual fee depends on output amount.
    // Let's show the fee percentage directly.

    return (
      <div
        style={style} // Important for react-window virtualization
        className={`grid grid-cols-12 hover:bg-purple-100 p-1 cursor-pointer ${
          pool === _pool.id ? "bg-purple-200" : ""
        }`}
        key={`pool_${_pool.id}`}
        onClick={() => {
          setPool(_pool.id); // Select this pool when clicked
        }}
      >
        <div className="col-span-1 flex items-center">
          {_pool.id === pool ? (
            <CheckCircledIcon className="mt-1 text-green-600" />
          ) : (
            <CircleIcon className="mt-1 text-gray-400" />
          )}
        </div>
        <div className="col-span-1 text-sm flex items-center">
          {_pool.id.split(".")[2]}
        </div>{" "}
        {/* Short ID */}
        <div className="col-span-4 text-sm flex items-center">
          {`${feePercent}% ${t("SimpleSwap:fee")}`}
        </div>
        <div className="col-span-3 text-sm flex items-center justify-end">
          {humanReadableFloat(balanceForSelectedA, precisionForSelectedA)}
        </div>
        <div className="col-span-3 text-sm flex items-center justify-end">
          {humanReadableFloat(balanceForSelectedB, precisionForSelectedB)}
        </div>
      </div>
    );
  };

  // Determine if the form is ready for submission
  const canSubmit =
    pool &&
    sellAmount &&
    parseFloat(sellAmount) > 0 &&
    buyAmount > 0 &&
    assetA &&
    assetB &&
    !showDialog;

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
                    {/* Use a standard form element */}
                    <form
                      onSubmit={(event) => {
                        event.preventDefault(); // Prevent default form submission
                        if (canSubmit) {
                          setShowDialog(true);
                        }
                      }}
                    >
                      {/* Row 1: Sell Amount and Sell Asset Selector */}
                      <div className="grid grid-cols-2 gap-5 mb-4">
                        {/* Sell Amount Input */}
                        <div className="col-span-1">
                          <FormItem>
                            <FormLabel>
                              <div className="flex items-center space-x-1">
                                <span>{t("SimpleSwap:amountToSwap")}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <QuestionMarkCircledIcon className="cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {t("SimpleSwap:enterAmountToSwap", {
                                          symbolA:
                                            selectedAssetASymbol ?? "???",
                                          symbolB:
                                            selectedAssetBSymbol ?? "???",
                                        })}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number" // Use number type for better input handling
                                step="any" // Allow decimals
                                min="0" // Prevent negative numbers
                                value={sellAmount}
                                placeholder="0.0"
                                className="mb-3" // Removed label prop as FormLabel is used
                                onChange={(event) => {
                                  const input = event.target.value;
                                  // Allow empty string, numbers, and a single decimal point
                                  if (
                                    input === "" ||
                                    /^[0-9]*\.?[0-9]*$/.test(input)
                                  ) {
                                    setSellAmount(input);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />{" "}
                            {/* For potential validation errors */}
                          </FormItem>
                        </div>

                        {/* Sell Asset Selector */}
                        <div className="col-span-1 self-end mb-3">
                          {" "}
                          {/* Align to bottom */}
                          <FormField
                            control={form.control} // Still needed for RHF integration if validation added later
                            name="assetA" // Logical name
                            render={(
                              { field } // field not directly used for value, handled by state
                            ) => (
                              <FormItem>
                                <FormControl>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="hover:bg-gray-100 hover:shadow-lg w-full justify-start font-normal" // Align text left
                                      >
                                        {selectedAssetASymbol
                                          ? selectedAssetASymbol
                                          : t("SimpleSwap:sendAsset")}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      className="p-0 w-[300px]" // Removed mt-10, side="end"
                                      align="start" // Align dropdown content start
                                    >
                                      <Command className="rounded-lg border shadow-md">
                                        <CommandInput
                                          placeholder={t(
                                            "PageHeader:commandSearchPlaceholder"
                                          )}
                                        />
                                        <CommandList>
                                          <CommandEmpty>
                                            {t("PageHeader:noResultsFound")}
                                          </CommandEmpty>
                                          <CommandGroup>
                                            {poolAssets.length > 0 ? (
                                              poolAssets.map((assetSymbol) => (
                                                <CommandItem
                                                  key={`sell-${assetSymbol}`}
                                                  onSelect={() => {
                                                    setSelectedAssetASymbol(
                                                      assetSymbol
                                                    );
                                                    setSelectedAssetBSymbol(
                                                      undefined
                                                    ); // Reset buy asset when sell asset changes
                                                    setPool(""); // Reset pool selection
                                                    // RHF field update if needed: field.onChange(assetSymbol);
                                                  }}
                                                  className="cursor-pointer"
                                                >
                                                  {assetSymbol}
                                                </CommandItem>
                                              ))
                                            ) : (
                                              <CommandItem disabled>
                                                {t("SimpleSwap:loading")}
                                              </CommandItem>
                                            )}
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

                      {/* Removed the Invert Toggle Button section */}

                      {/* Row 2: Buy Amount and Buy Asset Selector */}
                      <div className="grid grid-cols-2 gap-5">
                        {/* Buy Amount Display */}
                        <div className="col-span-1">
                          <FormItem>
                            <FormLabel>
                              <div className="flex items-center space-x-1">
                                <span>{t("SimpleSwap:totalAmount")}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <QuestionMarkCircledIcon className="cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {t(
                                          "SimpleSwap:totalAmountDescription",
                                          {
                                            symbolA:
                                              selectedAssetASymbol ?? "???",
                                            symbolB:
                                              selectedAssetBSymbol ?? "???",
                                          }
                                        )}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </FormLabel>
                            <FormControl>{buyAmountInput}</FormControl>{" "}
                            {/* The readonly input */}
                          </FormItem>
                        </div>

                        {/* Buy Asset Selector */}
                        <div className="col-span-1 self-end mb-3">
                          {" "}
                          {/* Align to bottom */}
                          <FormField
                            control={form.control}
                            name="assetB"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      asChild
                                      disabled={!selectedAssetASymbol}
                                    >
                                      <Button
                                        variant="outline"
                                        className="hover:bg-gray-100 hover:shadow-lg w-full justify-start font-normal"
                                        disabled={!selectedAssetASymbol} // Disable if sell asset not chosen
                                      >
                                        {selectedAssetBSymbol
                                          ? selectedAssetBSymbol
                                          : t("SimpleSwap:sendAsset")}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      className="p-0 w-[300px]"
                                      align="start"
                                    >
                                      <Command className="rounded-lg border shadow-md">
                                        <CommandInput
                                          placeholder={t(
                                            "PageHeader:commandSearchPlaceholder"
                                          )}
                                        />
                                        <CommandList>
                                          <CommandEmpty>
                                            {t("PageHeader:noResultsFound")}
                                          </CommandEmpty>
                                          <CommandGroup
                                            heading={t(
                                              "SimpleSwap:selectAssetToReceive"
                                            )}
                                          >
                                            {possiblePoolAssets.length > 0 ? (
                                              possiblePoolAssets.map(
                                                (assetSymbol) => (
                                                  <CommandItem
                                                    key={`buy-${assetSymbol}`}
                                                    onSelect={() => {
                                                      setSelectedAssetBSymbol(
                                                        assetSymbol
                                                      );
                                                      // field.onChange(assetSymbol); // RHF update if needed
                                                    }}
                                                    className="cursor-pointer"
                                                  >
                                                    {assetSymbol}
                                                  </CommandItem>
                                                )
                                              )
                                            ) : (
                                              <CommandItem disabled>
                                                {selectedAssetASymbol
                                                  ? t(
                                                      "SimpleSwap:noAssetsAvailable"
                                                    )
                                                  : t(
                                                      "SimpleSwap:selectSendFirst"
                                                    )}
                                              </CommandItem>
                                            )}
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

                      {/* Pool Selection List */}
                      {finalPools &&
                      finalPools.length > 0 &&
                      selectedAssetASymbol &&
                      selectedAssetBSymbol ? (
                        <div className="mt-5 border rounded-md p-2">
                          <Label className="text-md mb-2 block">
                            {t("SimpleSwap:choosePool")}
                          </Label>
                          {finalPools.length > 1 ? (
                            <p className="text-sm text-gray-600 mb-2">
                              {t("SimpleSwap:multiplePoolsFound", {
                                count: finalPools.length,
                              })}
                            </p>
                          ) : null}

                          {/* Headers for Pool List */}
                          <div className="grid grid-cols-12 text-xs text-gray-500 mb-1 p-1 border-b">
                            <div className="col-span-1"></div>{" "}
                            {/* Check icon space */}
                            <div className="col-span-1">ID</div>
                            <div className="col-span-4">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center cursor-help">
                                      {t("SimpleSwap:poolFee")}{" "}
                                      <QuestionMarkCircledIcon className="ml-1" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("SimpleSwap:poolFeeDescription")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="col-span-3 text-right">
                              {selectedAssetASymbol} ({t("SimpleSwap:balance")})
                            </div>
                            <div className="col-span-3 text-right">
                              {selectedAssetBSymbol} ({t("SimpleSwap:balance")})
                            </div>
                          </div>
                          {/* Virtualized List */}
                          <div
                            className={`w-full max-h-[${Math.min(
                              210,
                              finalPools.length * 40
                            )}px] overflow-auto`}
                          >
                            <List
                              rowComponent={poolRow}
                              rowCount={finalPools.length}
                              rowHeight={40}
                              rowProps={{}}
                            />
                          </div>
                        </div>
                      ) : null}
                      {/* Show message if assets selected but no pools found */}
                      {selectedAssetASymbol &&
                        selectedAssetBSymbol &&
                        finalPools.length === 0 &&
                        pools &&
                        pools.length > 0 && (
                          <p className="text-red-500 mt-4">
                            {t("SimpleSwap:noPoolsForPair")}
                          </p>
                        )}

                      {/* Submit Button */}
                      <Button
                        className="mt-5 w-full bg-purple-500 hover:bg-purple-600 text-white" // Adjusted colors
                        variant="default" // Use default variant which often maps to primary styling
                        disabled={!canSubmit}
                        type="submit"
                      >
                        {t("SimpleSwap:exchange")}
                      </Button>
                    </form>
                  </Form>

                  {/* Deep Link Dialog */}
                  {showDialog && assetA && assetB && usr ? ( // Ensure needed data exists
                    <DeepLinkDialog
                      operationNames={["liquidity_pool_exchange"]} // Static operation name
                      username={usr.username}
                      usrChain={usr.chain}
                      userID={usr.id}
                      dismissCallback={() => setShowDialog(false)} // Use callback to hide
                      // Key ensures dialog re-renders if crucial parameters change
                      key={`Exchanging${sellAmount}${assetA.symbol}for${buyAmount}${assetB.symbol}_${pool}`}
                      headerText={t("SimpleSwap:exchangeHeader", {
                        sellAmount: sellAmount,
                        symbolA: assetA.symbol, // Sell Asset
                        buyAmount: buyAmount.toFixed(assetB.precision), // Buy Asset, format to precision
                        symbolB: assetB.symbol,
                      })}
                      trxJSON={[
                        // Construct the transaction JSON
                        {
                          fee: { amount: 0, asset_id: "1.3.0" }, // Placeholder fee
                          account: usr.id,
                          pool: pool, // The selected pool ID
                          amount_to_sell: {
                            amount: blockchainFloat(
                              sellAmount,
                              assetA.precision // Precision of the selling asset
                            ),
                            asset_id: assetA.id, // ID of the selling asset
                          },
                          min_to_receive: {
                            // Use calculated buyAmount, maybe with slight reduction for slippage tolerance
                            // For now, using the calculated amount directly. Consider adding slippage control later.
                            amount: blockchainFloat(
                              buyAmount,
                              assetB.precision, // Precision of the buying asset
                              true // Floor the value for min_to_receive safety
                            ),
                            asset_id: assetB.id, // ID of the buying asset
                          },
                          extensions: [],
                        },
                      ]}
                    />
                  ) : null}
                </>
              ) : (
                // Show loading skeleton or message while pools/assets load initially
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Asset Information Cards */}
        {pool && assetA && assetB ? ( // Only show cards if a pool and assets are selected/loaded
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            {/* Buying Asset Card (Asset B) */}
            {assetB && assetBDetails ? (
              <MarketAssetCard
                asset={assetB.symbol}
                assetData={assetB}
                assetDetails={assetBDetails}
                bitassetData={bBitassetData}
                marketSearch={marketSearch}
                chain={usr?.chain ?? _chain}
                usrBalances={usrBalances}
                type="buy" // Indicates this is the asset being bought
              />
            ) : (
              <AssetCardSkeleton title={t("SimpleSwap:quoteAsset")} />
            )}

            {/* Selling Asset Card (Asset A) */}
            {assetA && assetADetails ? (
              <MarketAssetCard
                asset={assetA.symbol}
                assetData={assetA}
                assetDetails={assetADetails}
                bitassetData={aBitassetData}
                marketSearch={marketSearch}
                chain={usr?.chain ?? _chain}
                usrBalances={usrBalances}
                type="sell" // Indicates this is the asset being sold
              />
            ) : (
              <AssetCardSkeleton title={t("SimpleSwap:baseAsset")} />
            )}

            {/* Pool Share Asset Card */}
            {foundPool && poolShareDetails && foundPool.share_asset_details ? ( // Ensure share asset details exist
              <MarketAssetCard
                asset={foundPool.share_asset_symbol}
                assetData={foundPool.share_asset_details} // Static share asset data
                assetDetails={poolShareDetails} // Dynamic share asset data
                bitassetData={null} // Pool shares are typically not bitassets
                marketSearch={marketSearch}
                chain={usr?.chain ?? _chain}
                usrBalances={usrBalances}
                type="pool"
              />
            ) : (
              <AssetCardSkeleton title={t("SimpleSwap:poolShareAsset")} />
            )}

            {/* Borrow Links Card */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle>{t("SimpleSwap:borrowAssets")}</CardTitle>
                <CardDescription className="text-sm">
                  {t("SimpleSwap:borrowAssetsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm pb-3">
                {assetA && assetB ? (
                  <>
                    <Label>{t("SimpleSwap:searchBorrowableAssets")}</Label>
                    <br />
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${assetA.symbol}`}
                    >
                      <Badge className="mr-2 mt-1 mb-1 cursor-pointer hover:bg-blue-200">
                        {assetA.symbol}
                      </Badge>
                    </a>
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${assetB.symbol}`}
                    >
                      <Badge className="mr-2 mt-1 mb-1 cursor-pointer hover:bg-blue-200">
                        {assetB.symbol}
                      </Badge>
                    </a>
                    {foundPool?.share_asset_symbol && (
                      <a
                        href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${foundPool.share_asset_symbol}`}
                      >
                        <Badge className="mr-2 mt-1 mb-1 cursor-pointer hover:bg-blue-200">
                          {foundPool.share_asset_symbol}
                        </Badge>
                      </a>
                    )}
                    <br />
                    <Label className="mt-2 block">
                      {t("SimpleSwap:searchAcceptedCollateral")}
                    </Label>
                    <br />
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${assetA.symbol}`}
                    >
                      <Badge className="mr-2 mt-1 cursor-pointer hover:bg-blue-200">
                        {assetA.symbol}
                      </Badge>
                    </a>
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${assetB.symbol}`}
                    >
                      <Badge className="mr-2 mt-1 cursor-pointer hover:bg-blue-200">
                        {assetB.symbol}
                      </Badge>
                    </a>
                    {foundPool?.share_asset_symbol && (
                      <a
                        href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${foundPool.share_asset_symbol}`}
                      >
                        <Badge className="mr-2 mt-1 cursor-pointer hover:bg-blue-200">
                          {foundPool.share_asset_symbol}
                        </Badge>
                      </a>
                    )}
                  </>
                ) : (
                  <Skeleton className="h-4 w-[200px]" />
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Related Actions Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {pool && assetA && assetB && foundPool?.share_asset_symbol ? ( // Check required data
            <>
              {/* Link to Purchase Stake (DEX market for Share Asset vs Core/Quote) */}
              <a
                href={
                  `/dex/index.html?market=${foundPool.share_asset_symbol}_${
                    assetA.symbol === "BTS" ? assetB.symbol : "BTS"
                  }` // Market vs BTS or the other asset if A is BTS
                }
              >
                <ActionCard
                  title={t("SimpleSwap:purchaseStake")}
                  description={t("SimpleSwap:shareAsset", {
                    shareAsset: foundPool.share_asset_symbol,
                  })}
                  content={t("SimpleSwap:purchaseStakeDescription")}
                />
              </a>

              {/* Link to Stake Page */}
              <a href={`/stake/index.html?pool=${pool}`}>
                <ActionCard
                  title={t("SimpleSwap:stakeAssets")}
                  description={t("SimpleSwap:shareAsset", {
                    shareAsset: foundPool.share_asset_symbol,
                  })}
                  content={t("SimpleSwap:stakeAssetsDescription")}
                />
              </a>

              {/* Link to DEX Market for the Pair */}
              <a
                href={`/dex/index.html?market=${assetA.symbol}_${assetB.symbol}`}
              >
                <ActionCard
                  title={t("SimpleSwap:tradeOnDex")}
                  description={t("SimpleSwap:market", {
                    symbolA: assetA.symbol,
                    symbolB: assetB.symbol,
                  })}
                  content={t("SimpleSwap:tradeOnDexDescription")}
                />
              </a>
            </>
          ) : null}
        </div>
      </div>

      {/* Risks Section */}
      <div className="grid grid-cols-1 mt-5 ml-4 mr-4 md:ml-8 md:mr-8 mb-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("SimpleSwap:risksTitle")}</CardTitle>
            <CardDescription>
              {t("SimpleSwap:risksDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-sm block mb-3">
              {" "}
              {/* Added block and margin */}
              <Label className="mb-1 text-lg block">
                {" "}
                {/* Added block */}
                {t("SimpleSwap:liquidityPoolRisks")}
              </Label>
              <ul className="ml-2 list-disc [&>li]:mt-1 pl-3">
                {" "}
                {/* Adjusted padding */}
                <li>{t("SimpleSwap:liquidityPoolRisk1")}</li>
                <li>{t("SimpleSwap:liquidityPoolRisk2")}</li>
              </ul>
            </span>
            <span className="text-sm block">
              {" "}
              {/* Added block */}
              <Label className="mb-1 text-lg block">
                {" "}
                {/* Added block */}
                {t("SimpleSwap:swappableAssetRisks")}
              </Label>
              <ul className="ml-2 list-disc [&>li]:mt-1 pl-3">
                {" "}
                {/* Adjusted padding */}
                <li>{t("SimpleSwap:swappableAssetRisk1")}</li>
                <li>
                  {/* Simplified risk 2 - just mention backing asset */}
                  {t("SimpleSwap:swappableAssetRisk2", { symbol: "BTS" })}{" "}
                  {/* Assuming BTS is common backing */}
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

// Helper component for skeleton loading state of asset cards
function AssetCardSkeleton({ title }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-lg">
          {t("SimpleSwap:loading")}
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
  );
}

// Helper component for action links cards
function ActionCard({ title, description, content }) {
  return (
    <Card className="hover:shadow-md transition-shadow h-full">
      {" "}
      {/* Ensure cards have same height */}
      <CardHeader className="pb-2 pt-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm pb-4">{content}</CardContent>
    </Card>
  );
}
