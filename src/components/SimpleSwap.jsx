import React, {
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  useMemo,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import {
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  Coins,
  Info,
  Percent,
  ArrowLeftRight,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { blockchainFloat, humanReadableFloat } from "@/lib/common";
import { cn } from "@/lib/utils";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createPoolAssetStore } from "@/nanoeffects/Assets.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { useChainObjectsLive } from "@/hooks/useChainObjectsLive";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";

import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import DepthChart from "./InstantTrade/DepthChart.jsx";

export default function SimpleSwap(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      sellAmount: "1",
      assetA: "",
      assetB: "",
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
  // Controlled open state for dropdown menus so we can close them on selection
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [receiveMenuOpen, setReceiveMenuOpen] = useState(false);

  // Keep RHF in sync when asset selections change programmatically
  useEffect(() => {
    if (selectedAssetASymbol !== undefined) {
      form.setValue("assetA", selectedAssetASymbol || "");
    }
  }, [selectedAssetASymbol]);
  useEffect(() => {
    if (selectedAssetBSymbol !== undefined) {
      form.setValue("assetB", selectedAssetBSymbol || "");
    }
  }, [selectedAssetBSymbol]);

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
        // No valid pool parameter found — default to the first available pool
        defaultPool();
        return;
      }

      const foundPoolByURL = pools.find((p) => p.id === poolParameter);

      if (!foundPoolByURL) {
        console.log("URL Pool parameter not found in available pools.");
        // Fall back to a sensible default pool instead of leaving selection empty
        defaultPool();
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

  const [assetADetails, setAssetADetails] = useState(null); // Dynamic asset details for A
  const [assetBDetails, setAssetBDetails] = useState(null); // Dynamic asset details for B
  const [poolShareDetails, setPoolShareDetails] = useState(null); // Dynamic details for pool share asset

  const [aBitassetData, setABitassetData] = useState(null); // Bitasset data if A is MPA
  const [bBitassetData, setBBitassetData] = useState(null); // Bitasset data if B is MPA

  // Effect to fetch detailed pool/asset data when the selected pool changes
  useEffect(() => {
    async function fetchPoolAssets() {
      // Reset/guard when pool or assets required for lookup are missing
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

      poolStore.subscribe(({ data, error, loading }) => {
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

          // IMPORTANT: Align state (assetA, assetB) with user selection (selectedAssetASymbol, selectedAssetBSymbol)
          if (assetDataA && assetDataB && poolData) {
            if (assetDataA.symbol === selectedAssetASymbol) {
              // Pool's A matches user's Sell Asset
              setAssetA(assetDataA);
              setAssetB(assetDataB);
              form.setValue("assetA", assetDataA.symbol);
              form.setValue("assetB", assetDataB.symbol);
              setAssetADetails(data.assetADetails);
              setAssetBDetails(data.assetBDetails);
              setABitassetData(data.bitassetA);
              setBBitassetData(data.bitassetB);
            } else if (assetDataB.symbol === selectedAssetASymbol) {
              // Pool's B matches user's Sell Asset (swap them for component state)
              setAssetA(assetDataB); // assetA state now holds the Sell asset's data
              setAssetB(assetDataA); // assetB state now holds the Buy asset's data
              form.setValue("assetA", assetDataB.symbol);
              form.setValue("assetB", assetDataA.symbol);
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
    }

    fetchPoolAssets();
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

  // Live pool object subscription (balance_a/balance_b/taker_fee push per swap)
  const foundPoolRef = useRef(null);
  const livePool = useChainObjectsLive({
    chain: usr ? usr.chain : "",
    ids: pool ? [pool] : [],
    enabled: Boolean(usr && pool),
    specificNode: currentNode ? currentNode.url : null,
  });
  useEffect(() => {
    if (livePool.objects && pool && livePool.objects[pool]) {
      const live = livePool.objects[pool];
      setFoundPool((prev) => {
        foundPoolRef.current = prev;
        return prev ? { ...prev, ...live } : prev;
      });
    }
  }, [livePool.objects, pool]);

  // Fetch user balances
  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id && assets && assets.length > 0 && currentNode) {
        // Ensure assets are loaded
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode.url,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
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
        });
      } else {
        setUsrBalances(undefined); // Reset if prerequisites aren't met
      }
    }

    fetchUserBalances();
  }, [usr, assets, currentNode]); // Depend on user, assets list, and node

  const buyAmount = useMemo(() => {
    if (
      !sellAmount ||
      !assetA ||
      !assetB ||
      !foundPool ||
      !foundPool.balance_a ||
      !foundPool.balance_b
    ) {
      return 0;
    }

    const sellAmountNum = parseFloat(sellAmount);
    if (isNaN(sellAmountNum) || sellAmountNum <= 0) {
      return 0;
    }

    const sellingAssetDetails = assetA;
    const buyingAssetDetails = assetB;

    const sellPrecision = 10 ** sellingAssetDetails.precision;
    const buyPrecision = 10 ** buyingAssetDetails.precision;

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
      return 0;
    }

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

    if (effectiveSellAmountUnits <= 0) return 0;

    if (poolBalanceSell + effectiveSellAmountUnits === 0) return 0;

    const raw_delta_b_units =
      Number(poolBalanceBuy) -
      Math.floor(
        (Number(poolBalanceBuy) * Number(poolBalanceSell)) /
          (Number(poolBalanceSell) + effectiveSellAmountUnits)
      );

    if (raw_delta_b_units <= 0) return 0;

    const takerFeePercentPool = foundPool.taker_fee_percent ?? 0;
    const poolTakerFeeAmountUnits = Math.floor(
      (Number(raw_delta_b_units) * Number(takerFeePercentPool)) / 10000
    );

    const makerFeePercentBuy =
      buyingAssetDetails?.options?.market_fee_percent ?? 0;
    const maxMarketFeeBuy = buyingAssetDetails?.options?.max_market_fee ?? 0;
    let marketFeeAmountBuyUnits = 0;
    if (makerFeePercentBuy > 0) {
      marketFeeAmountBuyUnits = Math.min(
        Number(maxMarketFeeBuy),
        Math.ceil(
          Number(raw_delta_b_units) * (Number(makerFeePercentBuy) / 10000)
        )
      );
    }

    const final_amount_b_units =
      Number(raw_delta_b_units) -
      Number(poolTakerFeeAmountUnits) -
      Number(marketFeeAmountBuyUnits);

    const result = final_amount_b_units / buyPrecision;

    return result > 0
      ? parseFloat(result.toFixed(buyingAssetDetails.precision))
      : 0;
  }, [sellAmount, assetA, assetB, foundPool]);

  const [showDialog, setShowDialog] = useState(false);

  // User's balance of the selected sell asset (for MAX button + display)
  const userSellBalance = useMemo(() => {
    if (!usrBalances || !assetA || !assetA.id) return null;
    const balance = usrBalances.find((b) => b.asset_id === assetA.id);
    if (!balance) return null;
    return humanReadableFloat(balance.amount, assetA.precision);
  }, [usrBalances, assetA]);

  // Live exchange rate: 1 unit of assetA = X units of assetB
  const exchangeRate = useMemo(() => {
    if (!assetA || !assetB || !buyAmount || buyAmount <= 0) return null;
    const sellNum = parseFloat(sellAmount);
    if (isNaN(sellNum) || sellNum <= 0) return null;
    const rate = buyAmount / sellNum;
    if (!isFinite(rate) || rate <= 0) return null;
    return rate;
  }, [sellAmount, buyAmount, assetA, assetB]);

  // Theoretical pool depth (CPMM x*y=k without fees) — 0→99% of pool, both sides, vs achievable price
  const poolDepth = useMemo(() => {
    if (!foundPool || !assetA || !assetB || !foundPool.balance_a || !foundPool.balance_b) {
      return { bids: [], asks: [] };
    }
    // Map pool balances to sell/buy assets
    let balanceSellA, balanceBuyB, precSellA, precBuyB;
    if (foundPool.asset_a_id === assetA.id) {
      balanceSellA = Number(foundPool.balance_a);
      balanceBuyB = Number(foundPool.balance_b);
      precSellA = assetA.precision;
      precBuyB = assetB.precision;
    } else if (foundPool.asset_b_id === assetA.id) {
      balanceSellA = Number(foundPool.balance_b);
      balanceBuyB = Number(foundPool.balance_a);
      precSellA = assetA.precision;
      precBuyB = assetB.precision;
    } else {
      return { bids: [], asks: [] };
    }
    let balanceSellB, balanceBuyA, precSellB, precBuyA;
    if (foundPool.asset_a_id === assetB.id) {
      balanceSellB = Number(foundPool.balance_a);
      balanceBuyA = Number(foundPool.balance_b);
      precSellB = assetB.precision;
      precBuyA = assetA.precision;
    } else if (foundPool.asset_b_id === assetB.id) {
      balanceSellB = Number(foundPool.balance_b);
      balanceBuyA = Number(foundPool.balance_a);
      precSellB = assetB.precision;
      precBuyA = assetA.precision;
    } else {
      return { bids: [], asks: [] };
    }

    const steps = 100;
    const maxFraction = 0.99;
    const bids = [];
    const asks = [];

    // Bids: sell assetA to get assetB — price = B per A, decreasing with size
    // Use incremental size per level (dx - prevDx) so FastDepthChart's internal cumulative does not double-count.
    // Price is achievable average price for that cumulative amount (dy/dx) — intentionally theoretical CPMM without fees.
    let prevDxA = 0;
    for (let i = 1; i <= steps; i++) {
      const frac = (maxFraction * i) / steps;
      const dx = Math.floor(balanceSellA * frac);
      if (dx <= 0) continue;
      const inc = dx - prevDxA;
      if (inc <= 0) continue;
      prevDxA = dx;
      const dy = balanceBuyB - Math.floor((balanceBuyB * balanceSellA) / (balanceSellA + dx));
      if (dy <= 0) continue;
      const price = (dy / 10 ** precBuyB) / (dx / 10 ** precSellA);
      const size = inc / 10 ** precSellA;
      if (!isFinite(price) || price <= 0) continue;
      bids.push({ price, base: size });
    }

    // Asks: sell assetB to get assetA — price = B per A, increasing with size
    let prevDxB = 0;
    for (let i = 1; i <= steps; i++) {
      const frac = (maxFraction * i) / steps;
      const dx = Math.floor(balanceSellB * frac);
      if (dx <= 0) continue;
      const inc = dx - prevDxB;
      if (inc <= 0) continue;
      prevDxB = dx;
      const dy = balanceBuyA - Math.floor((balanceBuyA * balanceSellB) / (balanceSellB + dx));
      if (dy <= 0) continue;
      const price = (dx / 10 ** precSellB) / (dy / 10 ** precBuyA);
      const size = inc / 10 ** precSellB;
      if (!isFinite(price) || price <= 0) continue;
      asks.push({ price, base: size });
    }

    return { bids, asks };
  }, [foundPool, assetA, assetB]);

  // Swap the send/receive asset selections
  const swapAssets = () => {
    if (!selectedAssetASymbol || !selectedAssetBSymbol) return;
    const tempA = selectedAssetASymbol;
    setSelectedAssetASymbol(selectedAssetBSymbol);
    setSelectedAssetBSymbol(tempA);
    setPool("");
  };

  // Set the sell input to the user's full available balance
  const setMaxBalance = () => {
    if (userSellBalance && userSellBalance > 0) {
      const formatted = userSellBalance.toFixed(Math.min(8, assetA?.precision || 4));
      setSellAmount(formatted);
      form.setValue("sellAmount", formatted);
    }
  };

  useEffect(() => {
    if (pool && pool.length && selectedAssetASymbol && selectedAssetBSymbol) {
      const currentUrlParams = new URLSearchParams(window.location.search);
      currentUrlParams.set("pool", pool);
      window.history.replaceState({}, "", `?${currentUrlParams.toString()}`);
    }
  }, [pool, selectedAssetASymbol, selectedAssetBSymbol]);

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
      <div className="container mx-auto mt-5 mb-5 max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.2)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-2)/0.2)] blur-3xl"
          />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                    <ArrowLeftRight className="h-4 w-4 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  {t("SimpleSwap:title")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("SimpleSwap:description")}
                </p>
              </div>
            </div>

            {!pools ? (
              <p className="text-muted-foreground text-sm">{t("SimpleSwap:loadingPoolData")}</p>
            ) : null}
            {!assets ? (
              <p className="text-muted-foreground text-sm">{t("SimpleSwap:loadingAssetData")}</p>
            ) : null}

            {pools && assets ? (
              <form
                onSubmit={form.handleSubmit(() => {
                  event.preventDefault();
                  if (canSubmit) {
                    setShowDialog(true);
                  }
                })}
              >
                <FieldGroup className="space-y-3">
                  <Controller
                    name="sellAmount"
                    control={form.control}
                    rules={{
                      required: t("SimpleSwap:enterPositiveAmount"),
                      validate: (v) =>
                        ((v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) &&
                          parseFloat(v) > 0) ||
                        t("SimpleSwap:enterPositiveAmount"),
                    }}
                    render={({ field, fieldState }) => (
                      <div className="rounded-2xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-[hsl(var(--accent-1)/0.02)] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.2)] border border-[hsl(var(--accent-1)/0.4)]">
                              <ArrowUp className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.8)] text-[hsl(var(--accent-1-fg))]">
                              {t("SimpleSwap:amountToSwap")}
                            </span>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="dark:text-[hsl(var(--accent-1-fg)/0.6)] dark:hover:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg)/0.8)] hover:text-[hsl(var(--accent-1-fg))] transition-colors"
                                    aria-label="More info"
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-card border-[hsl(var(--accent-1)/0.3)] text-foreground/85">
                                  <p className="max-w-xs">
                                    {t("SimpleSwap:enterAmountToSwap", {
                                      symbolA: selectedAssetASymbol ?? "???",
                                      symbolB: selectedAssetBSymbol ?? "???",
                                    })}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <Wallet className="h-3 w-3 text-muted-foreground" />
                            {userSellBalance !== null ? (
                              <>
                                <span className="text-muted-foreground font-mono">
                                  {userSellBalance.toLocaleString(undefined, {
                                    maximumFractionDigits: Math.min(
                                      6,
                                      assetA?.precision || 4
                                    ),
                                  })}
                                </span>
                                {userSellBalance > 0 && (
                                  <button
                                    type="button"
                                    onClick={setMaxBalance}
                                    className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[hsl(var(--accent-1)/0.2)] border border-[hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.3)] hover:border-[hsl(var(--accent-1)/0.6)] transition-colors"
                                  >
                                    MAX
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-[1fr_auto] gap-2 items-stretch">
                          <Field data-invalid={fieldState.invalid}>
                            <FieldContent>
                              <Input
                                {...field}
                                id="simple-swap-sell-amount"
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0.0"
                                aria-invalid={fieldState.invalid}
                                onChange={(event) => {
                                  const input = event.target.value;
                                  if (
                                    input === "" ||
                                    /^[0-9]*\.?[0-9]*$/.test(input)
                                  ) {
                                    field.onChange(input);
                                    setSellAmount(input);
                                  }
                                }}
                                className="h-16 text-3xl sm:text-4xl font-semibold bg-card/60 border-border text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.6)] px-4"
                              />
                            </FieldContent>
                            {fieldState.invalid && (
                              <FieldError
                                errors={[fieldState.error]}
                                className="text-[hsl(var(--accent-danger-fg))] text-xs mt-1"
                              />
                            )}
                          </Field>

                          <Controller
                            name="assetA"
                            control={form.control}
                            render={({ field: assetField, fieldState }) => (
                              <DropdownMenu
                                open={sendMenuOpen}
                                onOpenChange={setSendMenuOpen}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    aria-label={t(
                                      "SimpleSwap:selectSendAsset"
                                    )}
                                    aria-invalid={fieldState.invalid}
                                    className="h-16 px-4 min-w-[140px] bg-card/60 border-border hover:bg-card/80 hover:border-[hsl(var(--accent-1)/0.4)] text-foreground text-lg font-semibold justify-between gap-2"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Coins className="h-4 w-4 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
                                      {selectedAssetASymbol || t(
                                        "SimpleSwap:sendAsset"
                                      )}
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  className="p-0 w-[320px] !bg-card border border-border rounded-2xl overflow-hidden shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
                                  align="end"

                                >
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent"
                                  />
                                  <Command className="rounded-2xl bg-transparent border-0 shadow-none">
                                    <CommandInput
                                      placeholder={t(
                                        "PageHeader:commandSearchPlaceholder"
                                      )}
                                      className="[&_[cmdk-input-wrapper]]:border-border [&_svg]:text-muted-foreground [&_svg]:opacity-100 text-foreground placeholder:text-muted-foreground"
                                    />
                                    <CommandList>
                                      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                        {t("PageHeader:noResultsFound")}
                                      </CommandEmpty>
                                      <CommandGroup className="[&_[cmdk-group-heading]]:text-muted-foreground">
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
                                                );
                                                setPool("");
                                                assetField.onChange(
                                                  assetSymbol
                                                );
                                                setSendMenuOpen(false);
                                              }}
                                              className="cursor-pointer text-foreground/85 data-[selected=true]:!bg-[hsl(var(--accent-1)/0.15)] data-[selected=true]:!text-foreground aria-selected:bg-[hsl(var(--accent-1)/0.15)]"
                                            >
                                              <span className="flex items-center gap-2">
                                                  <Coins className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                                                {assetSymbol}
                                              </span>
                                              {selectedAssetASymbol ===
                                                assetSymbol && (
                                                <Check className="ml-auto h-4 w-4 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
                                              )}
                                            </CommandItem>
                                          ))
                                        ) : (
                                          <CommandItem
                                            disabled
                                            className="text-muted-foreground"
                                          >
                                            {t("SimpleSwap:loading")}
                                          </CommandItem>
                                        )}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  />

                  <div className="relative h-0 z-10">
                    <button
                      type="button"
                      onClick={swapAssets}
                      disabled={!selectedAssetASymbol || !selectedAssetBSymbol}
                      aria-label={t("SimpleSwap:swapBuySell")}
                      className={cn(
                        "absolute left-1/2 -translate-x-1/2 top-0 -translate-y-1/2",
                        "group h-11 w-11 rounded-full",
                        "bg-card border-2 border-border",
                        "shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6)]",
                        "flex items-center justify-center",
                        "hover:border-[hsl(var(--accent-1)/0.6)] hover:shadow-[0_0_24px_-2px_hsl(var(--accent-1)/0.5)]",
                        "active:scale-95 transition-all duration-300",
                        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border"
                      )}
                    >
                      <ArrowDownUp className="h-4 w-4 text-foreground dark:group-hover:text-[hsl(var(--accent-1-fg))] group-hover:text-[hsl(var(--accent-1-fg))] group-hover:rotate-180 transition-all duration-300" />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.07)] to-[hsl(var(--accent-2)/0.02)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-2)/0.2)] border border-[hsl(var(--accent-2)/0.4)]">
                          <ArrowDown className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]" />
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-2-fg)/0.8)] text-[hsl(var(--accent-2-fg))]">
                          {t("SimpleSwap:totalAmount")}
                        </span>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="dark:text-[hsl(var(--accent-2-fg)/0.6)] dark:hover:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg)/0.8)] hover:text-[hsl(var(--accent-2-fg))] transition-colors"
                                aria-label="More info"
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-card border-[hsl(var(--accent-2)/0.3)] text-foreground/85">
                              <p className="max-w-xs">
                                {t("SimpleSwap:totalAmountDescription", {
                                  symbolA: selectedAssetASymbol ?? "???",
                                  symbolB: selectedAssetBSymbol ?? "???",
                                })}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {exchangeRate !== null &&
                        selectedAssetASymbol &&
                        selectedAssetBSymbol && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <TrendingUp className="h-3 w-3 dark:text-[hsl(var(--accent-2-fg)/0.7)] text-[hsl(var(--accent-2-fg)/0.8)]" />
                            <span className="font-mono">
                              1 {selectedAssetASymbol} ={" "}
                              {exchangeRate.toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                              })}{" "}
                              {selectedAssetBSymbol}
                            </span>
                          </div>
                        )}
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-2 items-stretch">
                      <Field>
                        <FieldContent>
                          <Input
                            id="simple-swap-buy-amount"
                            readOnly
                            disabled
                            value={
                              buyAmount > 0
                                ? buyAmount.toLocaleString(undefined, {
                                    maximumFractionDigits: Math.min(
                                      8,
                                      assetB?.precision || 4
                                    ),
                                  })
                                : "0.0"
                            }
                            className="h-16 text-3xl sm:text-4xl font-semibold bg-card/60 border-border dark:text-[hsl(var(--accent-2-fg))] text-foreground placeholder:text-muted-foreground/40 px-4"
                          />
                        </FieldContent>
                      </Field>

                      <Controller
                        name="assetB"
                        control={form.control}
                        rules={{
                          validate: (val) =>
                            !selectedAssetASymbol ||
                            !!val ||
                            t("SimpleSwap:selectAssetToReceive"),
                        }}
                        render={({ field: assetField, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldContent>
                              <DropdownMenu
                                open={receiveMenuOpen}
                                onOpenChange={setReceiveMenuOpen}
                              >
                                <DropdownMenuTrigger
                                  asChild
                                  disabled={!selectedAssetASymbol}
                                >
                                  <Button
                                    variant="outline"
                                    disabled={!selectedAssetASymbol}
                                    aria-label={t(
                                      "SimpleSwap:selectReceiveAsset"
                                    )}
                                    aria-invalid={fieldState.invalid}
                                    className="h-16 px-4 min-w-[140px] bg-card/60 border-border hover:bg-card/80 hover:border-[hsl(var(--accent-2)/0.4)] text-foreground text-lg font-semibold justify-between gap-2 disabled:opacity-50"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Coins className="h-4 w-4 dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]" />
                                      {selectedAssetBSymbol || t(
                                        "SimpleSwap:sendAsset"
                                      )}
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  className="p-0 w-[320px] !bg-card border border-border rounded-2xl overflow-hidden shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
                                  align="end"

                                >
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-2)/0.6)] to-transparent"
                                  />
                                  <Command className="rounded-2xl bg-transparent border-0 shadow-none">
                                    <CommandInput
                                      placeholder={t(
                                        "PageHeader:commandSearchPlaceholder"
                                      )}
                                      className="[&_[cmdk-input-wrapper]]:border-border [&_svg]:text-muted-foreground [&_svg]:opacity-100 text-foreground placeholder:text-muted-foreground"
                                    />
                                    <CommandList>
                                      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                        {t("PageHeader:noResultsFound")}
                                      </CommandEmpty>
                                      <CommandGroup className="[&_[cmdk-group-heading]]:text-muted-foreground">
                                        {possiblePoolAssets.length > 0 ? (
                                          possiblePoolAssets.map(
                                            (assetSymbol) => (
                                              <CommandItem
                                                key={`buy-${assetSymbol}`}
                                                onSelect={() => {
                                                  setSelectedAssetBSymbol(
                                                    assetSymbol
                                                  );
                                                  assetField.onChange(
                                                    assetSymbol
                                                  );
                                                  setReceiveMenuOpen(false);
                                                }}
                                                className="cursor-pointer text-foreground/85 data-[selected=true]:!bg-[hsl(var(--accent-2)/0.15)] data-[selected=true]:!text-foreground aria-selected:bg-[hsl(var(--accent-2)/0.15)]"
                                              >
                                                <span className="flex items-center gap-2">
                                                  <Coins className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-2-fg)/0.7)] text-[hsl(var(--accent-2-fg)/0.8)]" />
                                                  {assetSymbol}
                                                </span>
                                                {selectedAssetBSymbol ===
                                                  assetSymbol && (
                                                  <Check className="ml-auto h-4 w-4 dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]" />
                                                )}
                                              </CommandItem>
                                            )
                                          )
                                        ) : (
                                          <CommandItem
                                            disabled
                                            className="text-muted-foreground"
                                          >
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
                            </FieldContent>
                            {fieldState.invalid && (
                              <FieldError
                                errors={[fieldState.error]}
                                className="text-[hsl(var(--accent-danger-fg))] text-xs mt-1"
                              />
                            )}
                          </Field>
                        )}
                      />
                    </div>
                  </div>

                  {finalPools &&
                  finalPools.length > 0 &&
                  selectedAssetASymbol &&
                  selectedAssetBSymbol ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("SimpleSwap:poolFee")}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          {finalPools.length}{" "}
                          {finalPools.length === 1 ? "pool" : "pools"}
                        </span>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground dark:hover:text-[hsl(var(--accent-1-fg))] hover:text-[hsl(var(--accent-1-fg))] transition-colors"
                                aria-label="More info"
                              >
                                <Info className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-card border-border text-foreground/85">
                              <p className="max-w-xs">
                                {t("SimpleSwap:poolFeeDescription")}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {finalPools.map((p) => {
                          const isSelected = pool === p.id;
                          const feePct = (p.taker_fee_percent ?? 0) / 100;
                          let balA = 0;
                          let balB = 0;
                          let precA = 4;
                          let precB = 4;
                          if (assetA && assetB) {
                            if (p.asset_a_symbol === selectedAssetASymbol) {
                              balA = p.balance_a;
                              precA = assetA.precision;
                              balB = p.balance_b;
                              precB = assetB.precision;
                            } else {
                              balA = p.balance_b;
                              precA = assetA.precision;
                              balB = p.balance_a;
                              precB = assetB.precision;
                            }
                          }
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPool(p.id)}
                              className={cn(
                                "group/pool relative overflow-hidden text-left min-w-[180px]",
                                "px-4 py-3 rounded-xl border",
                                "transition-all duration-200 ease-out",
                                isSelected
                                  ? "border-[hsl(var(--accent-1)/0.6)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.15)] to-[hsl(var(--accent-2)/0.1)] shadow-[0_0_24px_-4px_hsl(var(--accent-1)/0.5)]"
                                  : "border-border bg-card/40 hover:border-accent/60 dark:hover:border-white/25 hover:bg-card/60"
                              )}
                            >
                              {isSelected && (
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.8)] to-transparent"
                                />
                              )}
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--accent-1)/0.3)] border border-[hsl(var(--accent-1)/0.6)]">
                                      <Check className="h-2.5 w-2.5 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
                                  </span>
                                ) : (
                                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border dark:border-white/15" />
                                )}
                                <span
                                  className={cn(
                                    "text-xs font-mono font-semibold tracking-wider",
                                    isSelected ? "dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" : "text-foreground/70"
                                  )}
                                >
                                  #{p.id.split(".")[2]}
                                </span>
                                <span
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-md border font-semibold",
                                    isSelected
                                      ? "bg-[hsl(var(--accent-1)/0.15)] border-[hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                                      : "bg-accent/40 border-border text-muted-foreground"
                                  )}
                                >
                                  {feePct.toFixed(2)}%
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "mt-2 space-y-1 text-[11px] font-mono tabular-nums",
                                  isSelected ? "text-foreground/85" : "text-muted-foreground"
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-sans font-medium text-muted-foreground truncate">
                                    {selectedAssetASymbol}
                                  </span>
                                  <span className="text-right truncate">
                                    {humanReadableFloat(balA, precA)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-sans font-medium text-muted-foreground truncate">
                                    {selectedAssetBSymbol}
                                  </span>
                                  <span className="text-right truncate">
                                    {humanReadableFloat(balB, precB)}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {selectedAssetASymbol &&
                    selectedAssetBSymbol &&
                    finalPools.length === 0 &&
                    pools &&
                    pools.length > 0 && (
                      <div className="rounded-xl border border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.1)] px-3 py-2 text-sm text-[hsl(var(--accent-danger-fg))]">
                        {t("SimpleSwap:noPoolsForPair")}
                      </div>
                    )}

                  {foundPool && fee ? (
                    <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                           <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                            <Percent className="h-3 w-3" strokeWidth={2.5} />
                          </span>
                          {t("SimpleSwap:poolFee")}
                        </span>
                        <span className="font-mono tabular-nums dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                          {((foundPool.taker_fee_percent ?? 0) / 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="border-t border-border/40" />
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[hsl(var(--accent-3)/0.3)] bg-[hsl(var(--accent-3)/0.1)] text-[hsl(var(--accent-3-fg))]">
                            <Coins className="h-3 w-3" strokeWidth={2.5} />
                          </span>
                          {t("SimpleSwap:networkFee")}
                        </span>
                        <span className="font-mono tabular-nums text-foreground/85">
                          {fee} {t("SimpleSwap:feeCurrency")}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className={cn(
                      "group/exchange relative overflow-hidden mt-1 w-full h-14 text-base font-semibold rounded-2xl",
                      "bg-gradient-to-r from-[hsl(var(--accent-3))] via-[hsl(var(--accent-3))] to-[hsl(var(--accent-3))]",
                      "hover:from-[hsl(var(--accent-3))] hover:via-[hsl(var(--accent-3))] hover:to-[hsl(var(--accent-3))]",
                      "text-foreground border-0",
                      "shadow-[0_8px_30px_-8px_hsl(var(--accent-3)/0.6)]",
                      "hover:shadow-[0_12px_40px_-8px_hsl(var(--accent-3)/0.9)]",
                      "transition-all duration-200",
                      "active:scale-[0.99]",
                      "disabled:from-slate-200 disabled:via-slate-200 disabled:to-slate-200 dark:disabled:from-slate-800 dark:disabled:via-slate-800 dark:disabled:to-slate-800",
                      "disabled:text-muted-foreground/60 disabled:shadow-none",
                      "disabled:cursor-not-allowed"
                    )}
                  >
                    {canSubmit ? (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 opacity-0 group-hover/exchange:opacity-100 transition-opacity duration-500 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.18)_50%,transparent_70%)] bg-[length:200%_100%] group-hover/exchange:animate-[shimmer_1.6s_linear_infinite]"
                      />
                    ) : null}
                    {canSubmit ? (
                      <span className="relative flex items-center justify-center gap-2 flex-wrap">
                        <Zap className="h-4 w-4" />
                        <span>{t("SimpleSwap:exchange")}</span>
                        {assetA && assetB && sellAmount && buyAmount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-foreground/85 font-mono text-sm">
                            <span className="text-foreground/95 font-semibold tabular-nums">
                              {sellAmount}
                            </span>
                            <span className="text-muted-foreground">{assetA.symbol}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-foreground/70" />
                            <span className="text-foreground/95 font-semibold tabular-nums">
                              {buyAmount.toLocaleString(undefined, {
                                maximumFractionDigits: Math.min(
                                  6,
                                  assetB.precision || 4
                                ),
                              })}
                            </span>
                            <span className="text-muted-foreground">{assetB.symbol}</span>
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="relative flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        {t("SimpleSwap:exchange")}
                      </span>
                    )}
                  </Button>
                </FieldGroup>
              </form>
            ) : (
              <div className="space-y-3 mt-2">
                <Skeleton className="h-20 w-full rounded-2xl bg-accent/40" />
                <div className="flex justify-center -my-1">
                  <Skeleton className="h-11 w-11 rounded-full bg-accent/40" />
                </div>
                <Skeleton className="h-20 w-full rounded-2xl bg-accent/40" />
                <Skeleton className="h-14 w-full rounded-2xl bg-accent/40 mt-3" />
              </div>
            )}
          </div>
        </div>

        {foundPool && assetA && assetB ? (
          <div className="mt-5">
            <DepthChart
              bids={poolDepth.bids}
              asks={poolDepth.asks}
              baseSymbol={assetA.symbol}
              quoteSymbol={assetB.symbol}
              loading={!foundPool}
              height={340}
            />
          </div>
        ) : null}

        {pool && assetA && assetB ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            {assetB && assetBDetails ? (
              <MarketAssetCard
                asset={assetB.symbol}
                assetData={assetB}
                assetDetails={assetBDetails}
                bitassetData={bBitassetData}
                marketSearch={marketSearch}
                chain={usr?.chain ?? _chain}
                usrBalances={usrBalances}
                type="buy"
              />
            ) : (
              <AssetCardSkeleton title={t("SimpleSwap:quoteAsset")} />
            )}

            {assetA && assetADetails ? (
              <MarketAssetCard
                asset={assetA.symbol}
                assetData={assetA}
                assetDetails={assetADetails}
                bitassetData={aBitassetData}
                marketSearch={marketSearch}
                chain={usr?.chain ?? _chain}
                usrBalances={usrBalances}
                type="sell"
              />
            ) : (
              <AssetCardSkeleton title={t("SimpleSwap:baseAsset")} />
            )}

            {foundPool && poolShareDetails && foundPool.share_asset_details ? (
              <MarketAssetCard
                asset={foundPool.share_asset_symbol}
                assetData={foundPool.share_asset_details}
                assetDetails={poolShareDetails}
                bitassetData={null}
                marketSearch={marketSearch}
                chain={usr?.chain ?? _chain}
                usrBalances={usrBalances}
                type="pool"
              />
            ) : (
              <AssetCardSkeleton title={t("SimpleSwap:poolShareAsset")} />
            )}

            {pool && assetA && assetB && foundPool?.share_asset_symbol ? (
              <div className="md:col-start-2 md:row-start-2 flex flex-col gap-3">
                <a
                  href={`/dex.html?market=${foundPool.share_asset_symbol}_${
                    assetA.symbol === "BTS" ? assetB.symbol : "BTS"
                  }`}
                >
                  <ActionCard
                    icon={<Wallet className="h-4 w-4" />}
                    accent="emerald"
                    title={t("SimpleSwap:purchaseStake")}
                    description={t("SimpleSwap:shareAsset", {
                      shareAsset: foundPool.share_asset_symbol,
                    })}
                    content={t("SimpleSwap:purchaseStakeDescription")}
                  />
                </a>

                <a
                  href={`/dex.html?market=${assetA.symbol}_${assetB.symbol}`}
                >
                  <ActionCard
                    icon={<TrendingUp className="h-4 w-4" />}
                    accent="indigo"
                    title={t("SimpleSwap:tradeOnDex")}
                    description={t("SimpleSwap:market", {
                      symbolA: assetA.symbol,
                      symbolB: assetB.symbol,
                    })}
                    content={t("SimpleSwap:tradeOnDexDescription")}
                  />
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {showDialog && assetA && assetB && usr ? (
        <DeepLinkDialog
          operationNames={["liquidity_pool_exchange"]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={() => setShowDialog(false)}
          key={`Exchanging${sellAmount}${assetA.symbol}for${buyAmount}${assetB.symbol}_${pool}`}
          headerText={t("SimpleSwap:exchangeHeader", {
            sellAmount: sellAmount,
            symbolA: assetA.symbol,
            buyAmount: buyAmount.toFixed(assetB.precision),
            symbolB: assetB.symbol,
          })}
          trxJSON={[
            {
              fee: { amount: 0, asset_id: "1.3.0" },
              account: usr.id,
              pool: pool,
              amount_to_sell: {
                amount: blockchainFloat(sellAmount, assetA.precision),
                asset_id: assetA.id,
              },
              min_to_receive: {
                amount: blockchainFloat(buyAmount, assetB.precision, true),
                asset_id: assetB.id,
              },
              extensions: [],
            },
          ]}
        />
      ) : null}

      <div className="container mx-auto mt-5">
        <DexLiveFooterCard
          lastFetchAt={livePool.lastFetchAt}
          isSubscribed={livePool.isSubscribed}
          blockNumber={livePool.blockNumber}
          nodeUrl={currentNode ? currentNode.url : null}
          warningThresholdSec={10}
        
        chain={_chain}/>
      </div>
    </>
  );
}

function AssetCardSkeleton({ title }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      <div className="pb-1">
        <h3 className="text-sm font-semibold text-foreground/80 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("SimpleSwap:loading")}
        </p>
      </div>
      <div className="space-y-2 mt-3">
        <Skeleton className="h-4 w-[250px] bg-accent/50" />
        <Skeleton className="h-4 w-[200px] bg-accent/50" />
        <Skeleton className="h-4 w-[250px] bg-accent/50" />
        <Skeleton className="h-4 w-[200px] bg-accent/50" />
      </div>
    </div>
  );
}

const ACTION_ACCENTS = {
  emerald: {
    bar: "from-[hsl(var(--accent-success)/0.8)] via-[hsl(var(--accent-1)/0.8)] to-[hsl(var(--accent-1)/0.8)]",
    chip: "bg-[hsl(var(--accent-success)/0.2)] border-[hsl(var(--accent-success)/0.4)] text-[hsl(var(--accent-success-fg))]",
    icon: "text-[hsl(var(--accent-success-fg))]",
    border: "hover:border-[hsl(var(--accent-success)/0.4)]",
    glow: "bg-[hsl(var(--accent-success)/0.15)]",
  },
  indigo: {
    bar: "from-[hsl(var(--accent-3)/0.8)] via-[hsl(var(--accent-3)/0.8)] to-[hsl(var(--accent-3)/0.8)]",
    chip: "bg-[hsl(var(--accent-3)/0.2)] border-[hsl(var(--accent-3)/0.4)] text-[hsl(var(--accent-3-fg))]",
    icon: "text-[hsl(var(--accent-3-fg))]",
    border: "hover:border-[hsl(var(--accent-3)/0.4)]",
    glow: "bg-[hsl(var(--accent-3)/0.15)]",
  },
  amber: {
    bar: "from-[hsl(var(--accent-warning)/0.8)] via-[hsl(var(--accent-warning)/0.8)] to-[hsl(var(--accent-danger)/0.8)]",
    chip: "bg-[hsl(var(--accent-warning)/0.2)] border-[hsl(var(--accent-warning)/0.4)] dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))]",
    icon: "dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))]",
    border: "hover:border-[hsl(var(--accent-warning)/0.4)]",
    glow: "bg-[hsl(var(--accent-warning)/0.15)]",
  },
};

function ActionCard({ title, description, content, icon, accent = "emerald" }) {
  const a = ACTION_ACCENTS[accent] || ACTION_ACCENTS.emerald;
  return (
    <div
      className={cn(
        "group/action relative overflow-hidden",
        "rounded-2xl border border-border bg-card/60 backdrop-blur-xl",
        "shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        "transition-all duration-200 ease-out",
        a.border,
        "hover:bg-card/60"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          a.bar
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full blur-2xl opacity-50 group-hover/action:opacity-100 transition-opacity duration-300",
          a.glow
        )}
      />
      <div className="p-4">
        <div className="flex items-start gap-2.5">
          {icon && (
            <span
              className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                a.chip
              )}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              {title}
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground font-mono truncate">
              {description}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-foreground/70 leading-relaxed">
          {content}
        </p>
      </div>
    </div>
  );
}
