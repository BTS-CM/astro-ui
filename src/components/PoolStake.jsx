import React, {
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  useMemo,
  memo,
  useCallback,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Avatar as Av,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Avatar } from "@/components/Avatar.tsx";

import {
  blockchainFloat,
  humanReadableFloat,
  assetAmountRegex,
} from "@/lib/common";

import { $currentNode } from "@/stores/node.ts";

import { createPoolAssetStore } from "@/nanoeffects/Assets.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { useChainObjectsLive, useAccountBalancesLive } from "@/hooks/useChainObjectsLive";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";

import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import MarketAssetCardPlaceholder from "./Market/MarketAssetCardPlaceholder.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import { Spinner } from "@/components/ui/spinner";

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
  QuestionMarkCircledIcon,
  CircleIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";

import {
  Layers,
  Zap,
  Lock,
  TrendingUp,
  RefreshCw,
  ArrowDownUp,
} from "lucide-react";

export default function PoolStake(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNode = useStore($currentNode);

  const [pool, setPool] = useState(""); // dropdown selected pool

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true,
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true,
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

    if (_chain !== "bitshares") {
      return _assetsTEST;
    }

    const relevantAssets = _assetsBTS.filter((asset) => {
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(asset.issuer))),
      );
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
      const poolShareAsset = assets.find(
        (asset) => asset.id === pool.share_asset_id,
      );
      if (!poolShareAsset) return false;
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(poolShareAsset.issuer))),
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

  const [fee, setFee] = useState(); // staking deposit fee
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 61);
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [unstakeFee, setUnstakeFee] = useState(); // staking withdraw fee
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 62);
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setUnstakeFee(finalFee);
    }
  }, [globalParams]);

  // State for the symbols of selected assets
  const [selectedAssetASymbol, setSelectedAssetASymbol] = useState(); // Asset User wants to SELL
  const [selectedAssetBSymbol, setSelectedAssetBSymbol] = useState(); // Asset User wants to BUY
  // Controlled open state for dropdown menus so we can close them on selection
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [receiveMenuOpen, setReceiveMenuOpen] = useState(false);

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
          x.asset_b_symbol === selectedAssetASymbol,
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
              : x.asset_a_symbol,
          ),
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
            x.asset_b_symbol === selectedAssetASymbol),
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
  }, [_chain, selectedAssetASymbol, selectedAssetBSymbol, pools, pool]);



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

        if (
          poolParameter &&
          poolParameter.length &&
          !poolParameter.includes("1.19.")
        ) {
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
        const foundPoolByURL = pools.find((p) => p.id === poolParameter);
        if (foundPoolByURL) {
          setSelectedAssetASymbol(foundPoolByURL.asset_a_symbol);
          setSelectedAssetBSymbol(foundPoolByURL.asset_b_symbol);
        }
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
            console.log({ error, location: "poolStore.subscribe" });
          }
          if (data && !error && !loading) {
            const poolData = data.foundPool;
            const assetDataA = data.assetA;
            const assetDataB = data.assetB;

            setFoundPool(poolData);
            setPoolShareDetails(data.poolAsset);

            if (assetDataA && assetDataB && poolData) {
              if (assetDataA.symbol === selectedAssetASymbol) {
                setAssetA(assetDataA);
                setAssetB(assetDataB);
                setAssetADetails(data.assetADetails);
                setAssetBDetails(data.assetBDetails);
                if (data.bitassetA) setABitassetData(data.bitassetA);
                if (data.bitassetB) setBBitassetData(data.bitassetB);
              } else if (assetDataB.symbol === selectedAssetASymbol) {
                setAssetA(assetDataB);
                setAssetB(assetDataA);
                setAssetADetails(data.assetBDetails);
                setAssetBDetails(data.assetADetails);
                if (data.bitassetB) setABitassetData(data.bitassetB);
                if (data.bitassetA) setBBitassetData(data.bitassetA);
              } else {
                // Fallback if symbols don't match (e.g. initial load or URL param)
                setAssetA(assetDataA);
                setAssetB(assetDataB);
                setAssetADetails(data.assetADetails);
                setAssetBDetails(data.assetBDetails);
                if (data.bitassetA) setABitassetData(data.bitassetA);
                if (data.bitassetB) setBBitassetData(data.bitassetB);
              }
            }

            setFoundPoolDetails(data.foundPoolDetails);
          }
        });
      } catch (error) {
        console.log({ error });
      }
    }
  }, [usr, pool, pools, assets, selectedAssetASymbol, selectedAssetBSymbol]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    async function fetchUsrBalances() {
      if (!(usr && usr.id && assetA && assetB)) {
        setUsrBalances([]);
        return;
      }

      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = data.filter((balance) =>
            assets.find((x) => x.id === balance.asset_id),
          );
          setUsrBalances(filteredData);
        }
      });
    }

    fetchUsrBalances();
  }, [usr, assetA, assetB]);

  // Live pool object subscription (balance_a/balance_b/current_supply push)
  const liveStakePool = useChainObjectsLive({
    chain: usr ? usr.chain : "",
    ids: pool ? [pool] : [],
    enabled: Boolean(usr && pool),
    specificNode: currentNode ? currentNode.url : null,
  });
  useEffect(() => {
    if (liveStakePool.objects && pool && liveStakePool.objects[pool]) {
      const live = liveStakePool.objects[pool];
      setFoundPool((prev) => (prev ? { ...prev, ...live } : prev));
      setFoundPoolDetails((prev) =>
        prev && live.dynamic_asset_data_id
          ? prev
          : prev
      );
    }
  }, [liveStakePool.objects, pool]);

  // Live user balances (push per block when user state changes)
  const liveStakeBalances = useAccountBalancesLive({
    chain: usr ? usr.chain : "",
    accountId: usr ? usr.id : null,
    enabled: Boolean(usr && usr.id),
    specificNode: currentNode ? currentNode.url : null,
  });
  useEffect(() => {
    if (liveStakeBalances.balances && assets.length) {
      const filteredData = liveStakeBalances.balances.filter((balance) =>
        assets.find((x) => x.id === balance.asset_id),
      );
      if (filteredData.length) {
        setUsrBalances(filteredData);
      }
    }
  }, [liveStakeBalances.balances, assets]);

  const [aStake, setAStake] = useState(0);
  const [bStake, setBStake] = useState(0);
  const [totalReceiving, setTotalReceiving] = useState(0);

  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawingA, setWithdrawingA] = useState(0);
  const [withdrawingB, setWithdrawingB] = useState(0);

  const [stakeNotice, setStakeNotice] = useState("");
  const [unstakeNotice, setUnstakeNotice] = useState("");

  // Whether the UI asset A/B selection is swapped vs the pool's canonical
  // (balance_a/asset_a) orientation. foundPool itself is never swapped, only
  // the assetA/assetB states are, so resolve sides by canonical symbol.
  const isStakeSwapped = useMemo(() => {
    if (!assetA || !foundPool || !foundPool.asset_a_symbol) return false;
    return assetA.symbol !== foundPool.asset_a_symbol;
  }, [assetA, foundPool]);

  // Pool balances mapped to the UI asset A/B orientation
  const poolSides = useMemo(() => {
    if (!foundPool || !assetA || !assetB) return null;
    const rawA = isStakeSwapped ? foundPool.balance_b : foundPool.balance_a;
    const rawB = isStakeSwapped ? foundPool.balance_a : foundPool.balance_b;
    const precA = isStakeSwapped
      ? foundPool.asset_b_precision
      : foundPool.asset_a_precision;
    const precB = isStakeSwapped
      ? foundPool.asset_a_precision
      : foundPool.asset_b_precision;
    if (rawA == null || rawB == null || precA == null || precB == null) {
      return null;
    }
    return {
      rawA: Number(rawA),
      rawB: Number(rawB),
      precA,
      precB,
      humanA: humanReadableFloat(Number(rawA), precA),
      humanB: humanReadableFloat(Number(rawB), precB),
    };
  }, [foundPool, assetA, assetB, isStakeSwapped]);

  const readablePoolA = useMemo(() => {
    if (!foundPool) return "0";
    if (!isStakeSwapped && foundPool.readable_balance_a) {
      return foundPool.readable_balance_a.split(" ")[0];
    }
    if (isStakeSwapped && foundPool.readable_balance_b) {
      return foundPool.readable_balance_b.split(" ")[0];
    }
    return poolSides ? String(poolSides.humanA) : "0";
  }, [foundPool, isStakeSwapped, poolSides]);

  const readablePoolB = useMemo(() => {
    if (!foundPool) return "0";
    if (!isStakeSwapped && foundPool.readable_balance_b) {
      return foundPool.readable_balance_b.split(" ")[0];
    }
    if (isStakeSwapped && foundPool.readable_balance_a) {
      return foundPool.readable_balance_a.split(" ")[0];
    }
    return poolSides ? String(poolSides.humanB) : "0";
  }, [foundPool, isStakeSwapped, poolSides]);

  const getUserHumanBalance = useCallback(
    (asset) => {
      if (!asset || !asset.id || !usrBalances) return 0;
      const found = usrBalances.find((x) => x.asset_id === asset.id);
      if (!found) return 0;
      return humanReadableFloat(Number(found.amount), asset.precision);
    },
    [usrBalances],
  );

  const userBalanceA = useMemo(
    () => getUserHumanBalance(assetA),
    [getUserHumanBalance, assetA],
  );
  const userBalanceB = useMemo(
    () => getUserHumanBalance(assetB),
    [getUserHumanBalance, assetB],
  );
  const userShareBalance = useMemo(() => {
    if (!foundPool) return 0;
    const shareId = foundPool.share_asset || foundPool.share_asset_id;
    const sharePrec = foundPool.share_asset_details
      ? foundPool.share_asset_details.precision
      : null;
    if (!shareId || sharePrec == null || !usrBalances) return 0;
    const found = usrBalances.find((x) => x.asset_id === shareId);
    if (!found) return 0;
    return humanReadableFloat(Number(found.amount), sharePrec);
  }, [foundPool, usrBalances]);

  const floorToPrecision = useCallback((value, precision) => {
    if (!isFinite(value) || value <= 0) return 0;
    const factor = 10 ** precision;
    return Math.floor(value * factor + 1e-9) / factor;
  }, []);

  const calcShareReceive = useCallback(
    (aHum, bHum) => {
      if (!poolSides || !foundPoolDetails || !foundPool) return 0;
      const supply = humanReadableFloat(
        foundPoolDetails.current_supply,
        foundPool.share_asset_details.precision,
      );
      if (!poolSides.humanA || !poolSides.humanB || !supply) return 0;
      const shareA = (aHum / poolSides.humanA) * supply;
      const shareB = (bHum / poolSides.humanB) * supply;
      const share = Math.min(shareA, shareB);
      if (!isFinite(share) || share <= 0) return 0;
      return parseFloat(
        share.toFixed(foundPool.share_asset_details.precision),
      );
    },
    [poolSides, foundPoolDetails, foundPool],
  );

  const calcWithdrawPair = useCallback(
    (shareHum) => {
      if (!poolSides || !foundPoolDetails || !foundPool) return { a: 0, b: 0 };
      const supply = humanReadableFloat(
        foundPoolDetails.current_supply,
        foundPool.share_asset_details.precision,
      );
      if (!supply || !(shareHum > 0)) return { a: 0, b: 0 };
      const ratio = shareHum / supply;
      return {
        a: parseFloat((poolSides.humanA * ratio).toFixed(poolSides.precA)),
        b: parseFloat((poolSides.humanB * ratio).toFixed(poolSides.precB)),
      };
    },
    [poolSides, foundPoolDetails, foundPool],
  );

  // Largest affordable (a,b) pair fitting both balances and the pool ratio.
  // Priority side is kept at its balance when possible, otherwise falls back
  // to the other side's constraint.
  const computeMaxStakePair = useCallback(
    (priority) => {
      if (!poolSides || !poolSides.humanA || !poolSides.humanB) {
        return { a: 0, b: 0, clamped: false };
      }
      const ratio = poolSides.humanB / poolSides.humanA; // B per 1 A
      if (!isFinite(ratio) || ratio <= 0) return { a: 0, b: 0, clamped: false };
      if (priority === "B") {
        const bTry = floorToPrecision(userBalanceB, poolSides.precB);
        const aNeed = floorToPrecision(bTry / ratio, poolSides.precA);
        if (aNeed <= userBalanceA + 1e-12) {
          return {
            a: aNeed,
            b: floorToPrecision(aNeed * ratio, poolSides.precB),
            clamped: false,
          };
        }
        const a = floorToPrecision(userBalanceA, poolSides.precA);
        return {
          a,
          b: floorToPrecision(a * ratio, poolSides.precB),
          clamped: true,
        };
      }
      const aTry = floorToPrecision(userBalanceA, poolSides.precA);
      const bNeed = floorToPrecision(aTry * ratio, poolSides.precB);
      if (bNeed <= userBalanceB + 1e-12) {
        return { a: aTry, b: bNeed, clamped: false };
      }
      const b = floorToPrecision(userBalanceB, poolSides.precB);
      return {
        a: floorToPrecision(b / ratio, poolSides.precA),
        b,
        clamped: true,
      };
    },
    [poolSides, userBalanceA, userBalanceB, floorToPrecision],
  );

  const applyStakePair = useCallback(
    (aHum, bHum, notice) => {
      const a = Number(aHum) || 0;
      const b = Number(bHum) || 0;
      setAStake(a);
      setBStake(b);
      form.setValue("stakeA", a);
      form.setValue("stakeB", b);
      setTotalReceiving(calcShareReceive(a, b));
      setStakeNotice(notice || "");
    },
    [calcShareReceive, form],
  );

  const handleStakeInput = useCallback(
    (side, input) => {
      if (!poolSides) return;
      const want = parseFloat(input);
      if (!isFinite(want) || want <= 0) return;
      const ratio = poolSides.humanB / poolSides.humanA;
      if (!isFinite(ratio) || ratio <= 0) return;
      let a;
      let b;
      let clamped = false;
      if (side === "A") {
        a = floorToPrecision(want, poolSides.precA);
        b = floorToPrecision(a * ratio, poolSides.precB);
        if (a > userBalanceA + 1e-12 || b > userBalanceB + 1e-12) {
          const max = computeMaxStakePair("A");
          a = max.a;
          b = max.b;
          clamped = true;
        }
      } else {
        b = floorToPrecision(want, poolSides.precB);
        a = floorToPrecision(b / ratio, poolSides.precA);
        if (a > userBalanceA + 1e-12 || b > userBalanceB + 1e-12) {
          const max = computeMaxStakePair("B");
          a = max.a;
          b = max.b;
          clamped = true;
        }
      }
      applyStakePair(
        a,
        b,
        clamped ? t("PoolStake:adjustedToMax") : "",
      );
    },
    [
      poolSides,
      floorToPrecision,
      userBalanceA,
      userBalanceB,
      computeMaxStakePair,
      applyStakePair,
      t,
    ],
  );

  const handleStakeMax = useCallback(
    (priority) => {
      // A Max click always lands on the max affordable pair by construction,
      // so clear any stale notice rather than claiming an over-balance.
      const max = computeMaxStakePair(priority);
      applyStakePair(max.a, max.b, "");
    },
    [computeMaxStakePair, applyStakePair],
  );

  const applyUnstakeAmount = useCallback(
    (shareHum, notice) => {
      const amount = Number(shareHum) || 0;
      setWithdrawAmount(amount);
      form.setValue("withdrawalAmount", amount ? String(amount) : "");
      const pair = calcWithdrawPair(amount);
      setWithdrawingA(pair.a);
      setWithdrawingB(pair.b);
      setUnstakeNotice(notice || "");
    },
    [calcWithdrawPair, form],
  );

  const handleUnstakeInput = useCallback(
    (input) => {
      const want = parseFloat(input);
      if (!isFinite(want) || want <= 0) return;
      const sharePrec = foundPool?.share_asset_details?.precision ?? 0;
      const floored = floorToPrecision(want, sharePrec);
      if (floored > userShareBalance + 1e-12) {
        applyUnstakeAmount(
          floorToPrecision(userShareBalance, sharePrec),
          t("PoolStake:adjustedToMax"),
        );
        return;
      }
      applyUnstakeAmount(floored, "");
    },
    [foundPool, floorToPrecision, userShareBalance, applyUnstakeAmount, t],
  );

  const handleUnstakeMax = useCallback(() => {
    const sharePrec = foundPool?.share_asset_details?.precision ?? 0;
    applyUnstakeAmount(floorToPrecision(userShareBalance, sharePrec), "");
  }, [foundPool, floorToPrecision, userShareBalance, applyUnstakeAmount]);

  const isStakeOverBalance = useMemo(() => {
    return (
      parseFloat(aStake) > userBalanceA + 1e-12 ||
      parseFloat(bStake) > userBalanceB + 1e-12
    );
  }, [aStake, bStake, userBalanceA, userBalanceB]);

  const isUnstakeOverBalance =
    parseFloat(withdrawAmount) > userShareBalance + 1e-12;

  const [showDialog, setShowDialog] = useState(false);
  const [poolKey, setPoolKey] = useState("default_pool_key");
  useEffect(() => {
    if (pool && pool.length) {
      window.history.replaceState({}, "", `?pool=${pool}`); // updating the url parameters
    }
    setPoolKey(`pool_key${Date.now()}`);
  }, [pool]);

  // Reset stake/unstake inputs when the pool or its assets change, so stale
  // amounts from a previous pool can't sit over the new balances.
  // Note: deliberately keyed on ids only — foundPool object identity changes
  // on every live block update and must not wipe user input.
  const assetAId = assetA && assetA.id ? assetA.id : "";
  const assetBId = assetB && assetB.id ? assetB.id : "";
  useEffect(() => {
    setAStake(0);
    setBStake(0);
    setTotalReceiving(0);
    setWithdrawAmount(0);
    setWithdrawingA(0);
    setWithdrawingB(0);
    setStakeNotice("");
    setUnstakeNotice("");
    form.setValue("stakeA", 0);
    form.setValue("stakeB", 0);
    form.setValue("withdrawalAmount", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, assetAId, assetBId]);

  const poolRow = useCallback(({ index, style }) => {
    const _pool = finalPools[index];

    const assetDetailA = assetA;
    const assetDetailB = assetB;

    if (!assetDetailA || !assetDetailB) {
      return <div style={style}>Loading pool details...</div>;
    }

    let balanceForSelectedA, balanceForSelectedB;
    let precisionForSelectedA, precisionForSelectedB;

    if (_pool.asset_a_symbol === selectedAssetASymbol) {
      balanceForSelectedA = _pool.balance_a;
      precisionForSelectedA = assetDetailA.precision;
      balanceForSelectedB = _pool.balance_b;
      precisionForSelectedB = assetDetailB.precision;
    } else {
      balanceForSelectedA = _pool.balance_b;
      precisionForSelectedA = assetDetailA.precision;
      balanceForSelectedB = _pool.balance_a;
      precisionForSelectedB = assetDetailB.precision;
    }

    const feePercent = (_pool.taker_fee_percent ?? 0) / 100; // e.g., 0.2

    return (
      <div
        style={style}
        className={`grid grid-cols-12 hover:bg-[hsl(var(--accent-1)/0.06)] hover:border-[hsl(var(--accent-1)/0.2)] p-1 cursor-pointer transition-colors ${
          pool === _pool.id ? "bg-[hsl(var(--accent-1)/0.25)] border-[hsl(var(--accent-1)/0.4)]" : ""
        }`}
        key={`pool_${_pool.id}`}
        onClick={() => {
          setPool(_pool.id);
        }}
      >
        <div className="col-span-1 flex items-center">
          {_pool.id === pool ? (
            <CheckCircledIcon className="mt-1 text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))]" />
          ) : (
            <CircleIcon className="mt-1 text-muted-foreground" />
          )}
        </div>
        <div className="col-span-1 text-sm flex items-center font-mono text-foreground/85">
          {_pool.id.split(".")[2]}
        </div>
        <div className="col-span-2 text-sm flex items-center font-mono dark:text-[hsl(var(--accent-1-fg)/0.8)] text-[hsl(var(--accent-1-fg))]">
          {feePercent}%
        </div>
        <div className="col-span-2 text-sm flex items-center font-mono text-muted-foreground">
          {_pool.withdrawal_fee_percent / 100}%
        </div>
        <div className="col-span-3 text-sm flex items-center justify-end font-mono text-foreground/85">
          {humanReadableFloat(balanceForSelectedA, precisionForSelectedA)}
        </div>
        <div className="col-span-3 text-sm flex items-center justify-end font-mono text-foreground/85">
          {humanReadableFloat(balanceForSelectedB, precisionForSelectedB)}
        </div>
      </div>
    );
  }, [finalPools, assetA, assetB, selectedAssetASymbol, pool]);

  const Row = ({ index, style }) => {
    const pool = pools[index];
    return (
      <SelectItem value={pool.id} style={style}>
        {`${pool.id} - ${pool.share_asset_symbol} - ${pool.asset_a_symbol}:${pool.asset_b_symbol}`}
      </SelectItem>
    );
  };

  // Determine when enough data is available to safely render the rest of the form
  const isFormReady = useMemo(() => {
    return Boolean(pool && foundPool && foundPoolDetails && assetA && assetB);
  }, [pool, foundPool, foundPoolDetails, assetA, assetB]);

  const [stakeTab, setStakeTab] = useState("stake");

  const isStakeSubmitDisabled =
    !(parseFloat(aStake) > 0 && parseFloat(bStake) > 0) ||
    isStakeOverBalance;
  const isUnstakeSubmitDisabled =
    !(parseFloat(withdrawAmount) > 0) || isUnstakeOverBalance;
  const isSubmitDisabled =
    stakeTab === "stake" ? isStakeSubmitDisabled : isUnstakeSubmitDisabled;

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 max-w-4xl">
        <div className="grid grid-cols-1 gap-5">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
            />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                  <Lock className="h-4.5 w-4.5" strokeWidth={2.25} />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                    {t("PoolStake:title")}
                  </h2>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {t("PoolStake:description")}
                  </p>
                </div>
              </div>
              {!pools ? <p className="text-muted-foreground text-sm">{t("PoolStake:loadingPoolData")}</p> : null}
              {!assets ? <p className="text-muted-foreground text-sm">{t("PoolStake:loadingAssetData")}</p> : null}
              {pools && assets ? (
                <>
                  <form
                    onSubmit={form.handleSubmit(() => {
                      setShowDialog(true);
                    })}
                  >
                    <FieldGroup>
                      <Field className="mb-1">
                        <FieldLabel>{t("PoolStake:account")}</FieldLabel>
                        <FieldContent>
                          <div className="grid grid-cols-8 gap-3">
                            <div className="col-span-1 flex items-center justify-center">
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
                        </FieldContent>
                      </Field>

                      <div className="grid grid-cols-2 gap-5 mb-1">
                        <div className="col-span-1">
                          <Controller
                            name="assetA"
                            control={form.control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel className="text-foreground/80">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                                      <ArrowDownUp className="h-3 w-3" strokeWidth={2.5} />
                                    </span>
                                    {t("PoolStake:assetA")}
                                  </span>
                                </FieldLabel>
                                <FieldContent>
                                  <DropdownMenu
                                    open={sendMenuOpen}
                                    onOpenChange={setSendMenuOpen}
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="hover:bg-card/80 hover:border-[hsl(var(--accent-1)/0.4)] hover:shadow-lg w-full justify-start font-normal bg-card/60 border-border text-foreground"
                                        aria-label={t(
                                          "SimpleSwap:selectSendAsset",
                                        )}
                                        aria-invalid={fieldState.invalid}
                                      >
                                        <span className="flex items-center gap-2">
                                          <Layers className="h-4 w-4 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
                                          {selectedAssetASymbol
                                            ? selectedAssetASymbol
                                            : t("SimpleSwap:sendAsset")}
                                        </span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      className="p-0 w-[300px] !bg-card border border-border rounded-2xl overflow-hidden shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
                                      align="start"
                                    >
                                      <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent"
                                      />
                                      <Command className="rounded-2xl bg-transparent border-0 shadow-none">
                                        <CommandInput
                                          placeholder={t(
                                            "PageHeader:commandSearchPlaceholder",
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
                                                      assetSymbol,
                                                    );
                                                    setSelectedAssetBSymbol(
                                                      undefined,
                                                    );
                                                    setPool("");
                                                    field.onChange(assetSymbol);
                                                    setSendMenuOpen(false);
                                                  }}
                                                  className="cursor-pointer text-foreground/85 data-[selected=true]:!bg-[hsl(var(--accent-1)/0.15)] data-[selected=true]:!text-foreground aria-selected:bg-[hsl(var(--accent-1)/0.15)]"
                                                >
                                                  <span className="flex items-center gap-2">
                                                    <Layers className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                                                    {assetSymbol}
                                                  </span>
                                                  {selectedAssetASymbol === assetSymbol && (
                                                    <CheckCircledIcon className="ml-auto text-[hsl(var(--accent-1-fg))]" />
                                                  )}
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
                                </FieldContent>
                              </Field>
                            )}
                          />
                        </div>

                        <div className="col-span-1">
                          <Controller
                            name="assetB"
                            control={form.control}
                            rules={{
                              validate: (val) => !selectedAssetASymbol || !!val,
                            }}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel className="text-foreground/80">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-2-fg)/0.9)] text-[hsl(var(--accent-2-fg))]">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-2)/0.15)] border border-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]">
                                      <ArrowDownUp className="h-3 w-3" strokeWidth={2.5} />
                                    </span>
                                    {t("PoolStake:assetB")}
                                  </span>
                                </FieldLabel>
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
                                        className="hover:bg-card/80 hover:border-[hsl(var(--accent-2)/0.4)] hover:shadow-lg w-full justify-start font-normal bg-card/60 border-border text-foreground disabled:opacity-50"
                                        disabled={!selectedAssetASymbol}
                                        aria-label={t(
                                          "SimpleSwap:selectReceiveAsset",
                                        )}
                                        aria-invalid={fieldState.invalid}
                                      >
                                        <span className="flex items-center gap-2">
                                          <Layers className="h-4 w-4 dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]" />
                                          {selectedAssetBSymbol
                                            ? selectedAssetBSymbol
                                            : t("SimpleSwap:sendAsset")}
                                        </span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      className="p-0 w-[300px] !bg-card border border-border rounded-2xl overflow-hidden shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
                                      align="start"
                                    >
                                      <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-2)/0.6)] to-transparent"
                                      />
                                      <Command className="rounded-2xl bg-transparent border-0 shadow-none">
                                        <CommandInput
                                          placeholder={t(
                                            "PageHeader:commandSearchPlaceholder",
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
                                                        assetSymbol,
                                                      );
                                                      field.onChange(
                                                        assetSymbol,
                                                      );
                                                      setReceiveMenuOpen(false);
                                                    }}
                                                    className="cursor-pointer text-foreground/85 data-[selected=true]:!bg-[hsl(var(--accent-2)/0.15)] data-[selected=true]:!text-foreground aria-selected:bg-[hsl(var(--accent-2)/0.15)]"
                                                  >
                                                    <span className="flex items-center gap-2">
                                                      <Layers className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-2-fg)/0.7)] text-[hsl(var(--accent-2-fg)/0.8)]" />
                                                      {assetSymbol}
                                                    </span>
                                                    {selectedAssetBSymbol === assetSymbol && (
                                                      <CheckCircledIcon className="ml-auto text-[hsl(var(--accent-2-fg))]" />
                                                    )}
                                                  </CommandItem>
                                                ),
                                              )
                                            ) : (
                                              <CommandItem disabled>
                                                {selectedAssetASymbol
                                                  ? t(
                                                      "SimpleSwap:noAssetsAvailable",
                                                    )
                                                  : t(
                                                      "SimpleSwap:selectSendFirst",
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
                                  <FieldError errors={[fieldState.error]} />
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
                        <div className="mt-5 rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-3 mb-1">
                          <div className="grid grid-cols-12 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 p-1 border-b border-[hsl(var(--accent-1)/0.2)]">
                            <div className="col-span-1"></div>
                            <div className="col-span-1">ID</div>
                            <div className="col-span-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center cursor-help dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                                      {t("SimpleSwap:poolFee")}{" "}
                                      <QuestionMarkCircledIcon className="ml-1" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-card border-[hsl(var(--accent-1)/0.3)] text-foreground/85">
                                    <p>{t("SimpleSwap:poolFeeDescription")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="col-span-2">
                              {t("PoolStake:withdrawFee")}
                            </div>
                            <div className="col-span-3 text-right">
                              {selectedAssetASymbol} ({t("SimpleSwap:balance")})
                            </div>
                            <div className="col-span-3 text-right">
                              {selectedAssetBSymbol} ({t("SimpleSwap:balance")})
                            </div>
                          </div>

                          <div
                            className={`w-full max-h-[${Math.min(
                              210,
                              finalPools.length * 40,
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

                      {selectedAssetASymbol &&
                        selectedAssetBSymbol &&
                        finalPools.length === 0 &&
                        pools &&
                        pools.length > 0 && (
                          <p className="text-sm text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))] mt-4 mb-4 flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-danger)/0.15)] border border-[hsl(var(--accent-danger)/0.3)]">
                              <ExclamationTriangleIcon className="h-3 w-3" />
                            </span>
                            {t("SimpleSwap:noPoolsForPair")}
                          </p>
                        )}

                      {pool && !isFormReady ? (
                        <div className="flex items-center justify-center py-10">
                          <Spinner className="size-6" />
                        </div>
                      ) : null}

                      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 mt-1 mb-1">
                        {isFormReady ? (
                          <>
                            <div className="col-span-5">
                              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-transparent p-3 sm:p-4">
                                <div className="text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.8)] text-[hsl(var(--accent-1-fg))] mb-1 inline-flex items-center gap-1">
                                  <Layers className="h-3 w-3" strokeWidth={2.5} />
                                  {t("PoolStake:assetA")}: {assetA.symbol}
                                </div>
                                <div className="text-[10px] text-muted-foreground mb-1">
                                  {t("PoolStake:currentTotalAmountInPool")}
                                </div>
                                <div className="font-mono text-lg tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                                  {foundPool && foundPoolDetails
                                    ? readablePoolA
                                    : "0"}
                                </div>
                                <div className="mt-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                                  {t("PoolStake:balance", {
                                    amount: userBalanceA.toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: assetA.precision,
                                        maximumFractionDigits: assetA.precision,
                                      },
                                    ),
                                    symbol: assetA.symbol,
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="col-span-5">
                              <div className="rounded-xl border border-[hsl(var(--accent-2)/0.15)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.07)] to-transparent p-3 sm:p-4">
                                <div className="text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-2-fg)/0.8)] text-[hsl(var(--accent-2-fg))] mb-1 inline-flex items-center gap-1">
                                  <Layers className="h-3 w-3" strokeWidth={2.5} />
                                  {t("PoolStake:assetB")}: {assetB.symbol}
                                </div>
                                <div className="text-[10px] text-muted-foreground mb-1">
                                  {t("PoolStake:currentTotalAmountInPool")}
                                </div>
                                <div className="font-mono text-lg tabular-nums dark:text-[hsl(var(--accent-2-fg)/0.9)] text-[hsl(var(--accent-2-fg))]">
                                  {foundPool && foundPoolDetails
                                    ? readablePoolB
                                    : "0"}
                                </div>
                                <div className="mt-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                                  {t("PoolStake:balance", {
                                    amount: userBalanceB.toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: assetB.precision,
                                        maximumFractionDigits: assetB.precision,
                                      },
                                    ),
                                    symbol: assetB.symbol,
                                  })}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>

                      {isFormReady ? (
                        <Tabs
                          key={`staking_${stakeTab}`}
                          defaultValue={stakeTab}
                          className="w-full mt-5"
                        >
                          <TabsList className="grid w-full grid-cols-2 gap-2 bg-card/40 border border-border">
                            {stakeTab === "stake" ? (
                              <TabsTrigger value="stake" className="bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(168,85,247,0.6)]">
                                {t("PoolStake:stakingAssets")}
                              </TabsTrigger>
                            ) : (
                              <TabsTrigger
                                value="stake"
                                onClick={(event) => {
                                  setStakeTab("stake");
                                }}
                                className="text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                              >
                                {t("PoolStake:stakeAssets")}
                              </TabsTrigger>
                            )}
                            {stakeTab === "unstake" ? (
                              <TabsTrigger
                                value="unstake"
                                className="bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(168,85,247,0.6)]"
                              >
                                {t("PoolStake:unstakingAssets")}
                              </TabsTrigger>
                            ) : (
                              <TabsTrigger
                                value="unstake"
                                onClick={(event) => {
                                  setStakeTab("unstake");
                                }}
                                className="text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                              >
                                {t("PoolStake:unstakeAssets")}
                              </TabsTrigger>
                            )}
                          </TabsList>

                          <TabsContent value="stake">
                            <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-transparent p-3 sm:p-4 mt-3">
                            <div className="grid grid-cols-1">
                              <Field className="mb-4">
                                <FieldLabel className="text-foreground/80">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                                      <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                                    </span>
                                    {t("PoolStake:howMuchToStake", {
                                      symbol: assetA ? assetA.symbol : "???",
                                    })}
                                  </span>
                                </FieldLabel>
                                <FieldContent>
                                  <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-8">
                                      <Input
                                        disabled
                                        readOnly
                                        value={
                                          assetA && aStake
                                            ? `${aStake} ${assetA.symbol}`
                                            : `0 ${assetA.symbol}`
                                        }
                                        className="!bg-card/40 border-border text-foreground placeholder:text-muted-foreground/50"
                                      />
                                      <div className="mt-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                                        {t("PoolStake:balance", {
                                          amount:
                                            userBalanceA.toLocaleString(
                                              undefined,
                                              {
                                                minimumFractionDigits:
                                                  assetA.precision,
                                                maximumFractionDigits:
                                                  assetA.precision,
                                              },
                                            ),
                                          symbol: assetA.symbol,
                                        })}
                                      </div>
                                    </div>
                                    <div className="col-span-4 ml-3 flex flex-wrap items-center gap-2">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <span
                                            onClick={(e) => {
                                              e.preventDefault();
                                            }}
                                            className="inline-flex items-center rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-colors cursor-pointer"
                                          >
                                            {t("PoolStake:changeAmount")}
                                          </span>
                                        </PopoverTrigger>
                                        <PopoverContent className="bg-card border-border">
                                          <Label className="text-foreground/80">
                                            {t("PoolStake:newAmount")}
                                          </Label>{" "}
                                          <Controller
                                            control={form.control}
                                            name="stakeA"
                                            render={({ field }) => (
                                              <Input
                                                placeholder={aStake}
                                                className="mb-2 mt-1"
                                                value={field.value ?? ""}
                                                onChange={(event) => {
                                                  const input =
                                                    event.target.value;
                                                  const regex =
                                                    assetAmountRegex(assetA);
                                                  if (
                                                    input &&
                                                    input.length &&
                                                    regex.test(input)
                                                  ) {
                                                    field.onChange(input);
                                                    handleStakeInput("A", input);
                                                  }
                                                }}
                                              />
                                            )}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleStakeMax("A");
                                        }}
                                        className="inline-flex items-center rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-colors cursor-pointer"
                                      >
                                        {t("PoolStake:stakeMax")}
                                      </button>
                                    </div>
                                  </div>
                                </FieldContent>
                              </Field>
                              <Field className="mb-4">
                                <FieldLabel className="text-foreground/80">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-2-fg)/0.9)] text-[hsl(var(--accent-2-fg))]">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-2)/0.15)] border border-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]">
                                      <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                                    </span>
                                    {t("PoolStake:howMuchToStake", {
                                      symbol: assetB ? assetB.symbol : "???",
                                    })}
                                  </span>
                                </FieldLabel>
                                <FieldContent>
                                  <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-8">
                                      <Input
                                        disabled
                                        readOnly
                                        value={
                                          assetB && bStake
                                            ? `${bStake} ${assetB.symbol}`
                                            : `0 ${assetB.symbol}`
                                        }
                                        className="!bg-card/40 border-border text-foreground placeholder:text-muted-foreground/50"
                                      />
                                      <div className="mt-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                                        {t("PoolStake:balance", {
                                          amount:
                                            userBalanceB.toLocaleString(
                                              undefined,
                                              {
                                                minimumFractionDigits:
                                                  assetB.precision,
                                                maximumFractionDigits:
                                                  assetB.precision,
                                              },
                                            ),
                                          symbol: assetB.symbol,
                                        })}
                                      </div>
                                    </div>
                                    <div className="col-span-4 ml-3 flex flex-wrap items-center gap-2">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <span
                                            onClick={(e) => {
                                              e.preventDefault();
                                            }}
                                            className="inline-flex items-center rounded-md border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] hover:border-[hsl(var(--accent-2)/0.5)] transition-colors cursor-pointer"
                                          >
                                            {t("PoolStake:changeAmount")}
                                          </span>
                                        </PopoverTrigger>
                                        <PopoverContent className="bg-card border-border">
                                          <Label className="text-foreground/80">
                                            {t("PoolStake:newAmount")}
                                          </Label>{" "}
                                          <Controller
                                            control={form.control}
                                            name="stakeB"
                                            render={({ field }) => (
                                              <Input
                                                placeholder={bStake}
                                                className="mb-2 mt-1"
                                                value={field.value ?? ""}
                                                onChange={(event) => {
                                                  const input =
                                                    event.target.value;
                                                  const regex =
                                                    assetAmountRegex(assetB);
                                                  if (
                                                    input &&
                                                    input.length &&
                                                    regex.test(input)
                                                  ) {
                                                    field.onChange(input);
                                                    handleStakeInput("B", input);
                                                  }
                                                }}
                                              />
                                            )}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleStakeMax("B");
                                        }}
                                        className="inline-flex items-center rounded-md border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] hover:border-[hsl(var(--accent-2)/0.5)] transition-colors cursor-pointer"
                                      >
                                        {t("PoolStake:stakeMax")}
                                      </button>
                                    </div>
                                  </div>
                                </FieldContent>
                              </Field>
                              {stakeNotice || isStakeOverBalance ? (
                                <div
                                  className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                                    isStakeOverBalance
                                      ? "border-[hsl(var(--accent-danger)/0.4)] bg-[hsl(var(--accent-danger)/0.1)] text-[hsl(var(--accent-danger-fg))]"
                                      : "border-[hsl(var(--accent-warning)/0.4)] bg-[hsl(var(--accent-warning)/0.1)] text-[hsl(var(--accent-warning-fg))]"
                                  }`}
                                >
                                  <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                                  {isStakeOverBalance
                                    ? t("PoolStake:insufficientBalance")
                                    : stakeNotice}
                                </div>
                              ) : null}
                              <Field className="mb-4">
                                <FieldLabel className="text-foreground/80">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                                      <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                                    </span>
                                    {t("PoolStake:totalShareAssetReceive")}
                                  </span>
                                </FieldLabel>
                                <FieldContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 mb-3 mt-3">
                                    <Input
                                      disabled
                                      readOnly
                                      placeholder={
                                        foundPoolDetails
                                          ? `${totalReceiving} ${foundPool?.share_asset_symbol}`
                                          : "0"
                                      }
                                      className="!bg-card/40 border-border text-foreground font-mono"
                                    />
                                  </div>
                                </FieldContent>
                              </Field>
                            </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="unstake">
                            <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-transparent p-3 sm:p-4 mt-3">
                            <div className="grid grid-cols-1">
                              <Field className="mb-4">
                                <FieldLabel className="text-foreground/80">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                                      <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                                    </span>
                                    {t("PoolStake:withdrawLabel", {
                                      symbol: foundPool.share_asset_symbol,
                                    })}
                                  </span>
                                </FieldLabel>
                                <FieldDescription className="text-muted-foreground/70">
                                  {t("PoolStake:withdrawDesc")}
                                </FieldDescription>
                                <FieldContent>
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
                                        className="!bg-card/40 border-border text-foreground placeholder:text-muted-foreground/50"
                                      />
                                      <div className="mt-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                                        {t("PoolStake:balance", {
                                          amount:
                                            userShareBalance.toLocaleString(
                                              undefined,
                                              {
                                                minimumFractionDigits:
                                                  foundPool.share_asset_details
                                                    .precision,
                                                maximumFractionDigits:
                                                  foundPool.share_asset_details
                                                    .precision,
                                              },
                                            ),
                                          symbol: foundPool.share_asset_symbol,
                                        })}
                                      </div>
                                    </div>
                                    <div className="col-span-4 ml-3 flex flex-wrap items-center gap-2">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <span
                                            onClick={(e) => {
                                              e.preventDefault();
                                            }}
                                            className="inline-flex items-center rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-colors cursor-pointer"
                                          >
                                            {t("PoolStake:changeAmount")}
                                          </span>
                                        </PopoverTrigger>
                                        <PopoverContent className="bg-card border-border">
                                          <Label className="text-foreground/80">
                                            {t("PoolStake:newAmount")}
                                          </Label>{" "}
                                          <Controller
                                            control={form.control}
                                            name="withdrawalAmount"
                                            render={({ field }) => (
                                              <Input
                                                placeholder={withdrawAmount}
                                                className="mb-2 mt-1"
                                                value={field.value ?? ""}
                                                onChange={(event) => {
                                                  const input =
                                                    event.target.value;
                                                  const regex =
                                                    assetAmountRegex({
                                                      precision:
                                                        foundPool
                                                          .share_asset_details
                                                          .precision,
                                                    });
                                                  if (
                                                    input &&
                                                    input.length &&
                                                    regex.test(input)
                                                  ) {
                                                    field.onChange(input);
                                                    handleUnstakeInput(input);
                                                  }
                                                }}
                                              />
                                            )}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleUnstakeMax();
                                        }}
                                        className="inline-flex items-center rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-colors cursor-pointer"
                                      >
                                        {t("PoolStake:unstakeMax")}
                                      </button>
                                    </div>
                                  </div>
                                </FieldContent>
                              </Field>

                              {unstakeNotice || isUnstakeOverBalance ? (
                                <div
                                  className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                                    isUnstakeOverBalance
                                      ? "border-[hsl(var(--accent-danger)/0.4)] bg-[hsl(var(--accent-danger)/0.1)] text-[hsl(var(--accent-danger-fg))]"
                                      : "border-[hsl(var(--accent-warning)/0.4)] bg-[hsl(var(--accent-warning)/0.1)] text-[hsl(var(--accent-warning-fg))]"
                                  }`}
                                >
                                  <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                                  {isUnstakeOverBalance
                                    ? t("PoolStake:insufficientBalance")
                                    : unstakeNotice}
                                </div>
                              ) : null}
                              <Field className="mb-4">
                                <FieldLabel className="text-foreground/80">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                                    {t("PoolStake:withdrawingA", {
                                      symbol: assetA.symbol,
                                    })}
                                  </span>
                                </FieldLabel>
                                <FieldContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 mb-3 mt-3 gap-3">
                                    <Input
                                      disabled
                                      readOnly
                                      placeholder={`${withdrawingA} ${assetA.symbol}`}
                                      className="!bg-card/40 border-border text-foreground font-mono"
                                    />
                                  </div>
                                </FieldContent>
                              </Field>
                              <Field>
                                <FieldLabel className="text-foreground/80">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-2-fg)/0.9)] text-[hsl(var(--accent-2-fg))]">
                                    {t("PoolStake:withdrawingB", {
                                      symbol: assetB.symbol,
                                    })}
                                  </span>
                                </FieldLabel>
                                <FieldContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 mb-3 mt-3 gap-3">
                                    <Input
                                      disabled
                                      readOnly
                                      placeholder={`${withdrawingB} ${assetB.symbol}`}
                                      className="!bg-card/40 border-border text-foreground font-mono"
                                    />
                                  </div>
                                </FieldContent>
                              </Field>
                            </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      ) : null}

                      {isFormReady ? (
                        <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] p-3 mt-5">
                          <FieldLabel className="text-foreground/80">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.8)] text-[hsl(var(--accent-1-fg))]">
                              <Zap className="h-3 w-3" strokeWidth={2.5} />
                              {t("PoolStake:networkFee")}
                            </span>
                          </FieldLabel>
                          <FieldDescription className="text-muted-foreground/70 text-xs mt-1">
                            {t(
                              `PoolStake:networkFeeDescription${
                                stakeTab === "stake" ? "1" : "2"
                              }`,
                            )}
                          </FieldDescription>
                          <FieldContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 mb-3 mt-3 gap-3">
                              <div className="col-span-1">
                                <div className="flex items-center gap-1.5 font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                                  <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                                  {stakeTab === "stake" ? fee : unstakeFee} BTS
                                </div>
                              </div>
                            </div>
                          </FieldContent>
                          {usr.id === usr.referrer ? (
                            <FieldDescription className="text-xs text-muted-foreground/70">
                              {t("PoolStake:rebate", {
                                rebate:
                                  stakeTab === "stake"
                                    ? (fee * 0.8).toFixed(5)
                                    : (unstakeFee * 0.8).toFixed(5),
                              })}
                            </FieldDescription>
                          ) : null}
                        </div>
                      ) : null}
                      {isFormReady ? (
                        <button
                          type="submit"
                          disabled={isSubmitDisabled}
                          title={
                            isSubmitDisabled
                              ? t("PoolStake:insufficientBalance")
                              : undefined
                          }
                          className="mt-6 w-full h-14 rounded-2xl font-semibold text-[hsl(var(--accent-1-gradFg))] bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] shadow-[0_8px_32px_-12px_rgba(168,85,247,0.7)] hover:shadow-[0_12px_40px_-12px_rgba(168,85,247,0.9)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-2))] hover:to-[hsl(var(--accent-3))] transition-all flex items-center justify-center gap-2 text-base group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_8px_32px_-12px_rgba(168,85,247,0.7)]"
                        >
                          <Layers
                            className="h-4 w-4 group-hover:scale-110 transition-transform"
                            strokeWidth={2.5}
                          />
                          {t("PoolStake:submit")}
                        </button>
                      ) : null}
                    </FieldGroup>
                  </form>
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
                              foundPool.share_asset_details.precision,
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
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-5 mt-5 items-stretch">
          {pool && !isFormReady ? (
            <div className="col-span-2 flex items-center justify-center py-10">
              <Spinner className="size-6 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
            </div>
          ) : null}
          {isFormReady ? (
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
            {isFormReady ? (
              <>
                <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl">
                  <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))]" />
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      {t("PoolStake:borrowAssets")}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("PoolStake:borrowAssetsDescription")}
                    </p>
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">{t("PoolStake:searchBorrowableAssets")}</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <a
                        href={`/borrow.html?tab=searchOffers&searchTab=borrow&searchText=${assetA.symbol}`}
                      >
                        <Badge className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] cursor-pointer transition-colors">{assetA.symbol}</Badge>
                      </a>
                      <a
                        href={`/borrow.html?tab=searchOffers&searchTab=borrow&searchText=${assetB.symbol}`}
                      >
                        <Badge className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] cursor-pointer transition-colors">{assetB.symbol}</Badge>
                      </a>
                      <a
                        href={`/borrow.html?tab=searchOffers&searchTab=borrow&searchText=${foundPool?.share_asset_symbol}`}
                      >
                        <Badge className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] cursor-pointer transition-colors">
                          {foundPool?.share_asset_symbol}
                        </Badge>
                      </a>
                    </div>
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-3 block">{t("PoolStake:searchByAcceptedCollateral")}</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <a
                        href={`/borrow.html?tab=searchOffers&searchTab=collateral&searchText=${assetA.symbol}`}
                      >
                        <Badge className="border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] cursor-pointer transition-colors">{assetA.symbol}</Badge>
                      </a>
                      <a
                        href={`/borrow.html?tab=searchOffers&searchTab=collateral&searchText=${assetB.symbol}`}
                      >
                        <Badge className="border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] cursor-pointer transition-colors">{assetB.symbol}</Badge>
                      </a>
                      <a
                        href={`/borrow.html?tab=searchOffers&searchTab=collateral&searchText=${foundPool?.share_asset_symbol}`}
                      >
                        <Badge className="border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] cursor-pointer transition-colors">
                          {foundPool?.share_asset_symbol}
                        </Badge>
                      </a>
                    </div>
                  </div>
                </div>

                {foundPool &&
                foundPoolDetails &&
                marketSearch &&
                usrBalances ? (
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

        <div className="grid grid-cols-1 mt-5">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
            <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))]" />
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                  <Lock className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    {t("PoolStake:risksAssociated")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("PoolStake:doYourOwnResearch")}
                  </p>
                </div>
              </div>
              <span className="text-sm">
                <ul className="ml-2 list-disc [&>li]:mt-1 pl-2 text-foreground/80">
                  <li>{t("PoolStake:risk1")}</li>
                  <li>{t("PoolStake:risk2")}</li>
                  <li>{t("PoolStake:risk3")}</li>
                  <li>{t("PoolStake:risk4")}</li>
                  <li>{t("PoolStake:risk5")}</li>
                  <li>{t("PoolStake:risk6")}</li>
                  <li>{t("PoolStake:risk7")}</li>
                </ul>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-5">
        <DexLiveFooterCard
          lastFetchAt={liveStakePool.lastFetchAt}
          isSubscribed={liveStakePool.isSubscribed}
          blockNumber={liveStakePool.blockNumber}
          nodeUrl={currentNode ? currentNode.url : null}
          warningThresholdSec={10}
        
        chain={_chain}/>
      </div>
    </>
  );
}
