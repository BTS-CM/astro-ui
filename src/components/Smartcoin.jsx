import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { useForm } from "react-hook-form";
import { LockOpen2Icon, LockClosedIcon } from "@radix-ui/react-icons";

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Avatar as Av, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Avatar } from "@/components/Avatar.tsx";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useInitCache } from "../effects/Init.ts";
import { createUserBalancesStore } from "../effects/User.ts";
import { createSmartcoinDataStore } from "../effects/Assets.ts";

import { $currentUser } from "../stores/users.ts";
import { $globalParamsCache, $bitAssetDataCache, $marketSearchCache } from "../stores/cache.ts";

import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog";
import ExternalLink from "./common/ExternalLink.jsx";
import CardRow from "./common/CardRow.jsx";
import EmptyRow from "./common/EmptyRow.jsx";

import { humanReadableFloat, getFlagBooleans, debounce, blockchainFloat } from "../lib/common.js";

const activeTabStyle = {
  backgroundColor: "#252526",
  color: "white",
};

const tips = {
  charge_market_fee: "The asset issuer can enable market fees.",
  white_list: "The asset issuer can create a list of approved markets",
  override_authority: "The asset issuer can transfer this NFT back to themselves.",
  transfer_restricted: "This asset may only be transferred to/from the issuer or market orders",
  disable_force_settle: "Users may request force-settlement of this market-issued asset.",
  global_settle:
    "The issuer of this market-issued asset has the ability to globally settle the asset",
  disable_confidential: "The issuer of this asset can disable stealth transactions.",
  witness_fed_asset:
    "This market-issued asset can have its price feeds supplied by Bitshares witnesses.",
  committee_fed_asset:
    "This market-issued asset can have its price feeds supplied by Bitshares committee members.",
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

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

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

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setUsrBalances(data);
        }
      });
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

      const poolIds = marketSearch && marketSearch.length ? marketSearch.map((x) => x.id) : [];
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

      const poolIds = marketSearch && marketSearch.length ? marketSearch.map((x) => x.id) : [];
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
      const foundBitasset = bitAssetData.find((x) => x.assetID === parsedAsset.id);
      return foundBitasset;
    }
    return null;
  }, [parsedAsset, bitAssetData]);

  const parsedCollateralAsset = useMemo(() => {
    if (parsedBitasset && bitAssetData) {
      const foundAsset = marketSearch.find((x) => x.id === parsedBitasset.collateral);
      return foundAsset;
    }
  }, [parsedBitasset, bitAssetData]);

  const parsedCollateralBitasset = useMemo(() => {
    if (parsedCollateralAsset && bitAssetData) {
      const foundBitasset = bitAssetData.find((x) => x.assetID === parsedCollateralAsset.id);
      return foundBitasset;
    }
  }, [parsedCollateralAsset, bitAssetData]);

  const parsedCollateralBitassetCollateralAsset = useMemo(() => {
    if (parsedCollateralBitasset && marketSearch) {
      const foundAsset = marketSearch.find((x) => x.id === parsedCollateralBitasset.collateral);
      return foundAsset;
    }
  }, [parsedCollateralBitasset, marketSearch]);

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
      const foundAsset = usrBalances.find((x) => x.asset_id === parsedCollateralAsset.id);
      if (!foundAsset) {
        return 0;
      }
      const finalAmount = humanReadableFloat(foundAsset.amount, parsedCollateralAsset.p);
      return finalAmount;
    }
  }, [parsedCollateralAsset, usrBalances]);

  const [finalAsset, setFinalAsset] = useState();
  const [finalBitasset, setFinalBitasset] = useState();
  const [finalCollateralAsset, setFinalCollateralAsset] = useState();
  const [finalCollateralBitasset, setFinalCollateralBitasset] = useState();
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
        parsedCollateralBitasset && parsedCollateralBitasset.id ? parsedCollateralBitasset.id : "",
        usr.id,
      ]);
      unsub = smartcoinDataStore.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          setFinalAsset(data[0]);
          setFinalCollateralAsset(data[1]);
          setFinalBitasset(data[2]);
          if (data[3].id) {
            setFinalCollateralBitasset(data[3]);
          }
          setUsrMarginPositions(data[4]);
          setAssetCallOrders(data[5]);
          setAssetSettleOrders(data[6]);
          setBuyOrders(data[7].asks);
          setSellOrders(data[7].bids);
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [parsedAsset, parsedBitasset, usr]);

  const currentFeedSettlementPrice = useMemo(() => {
    if (finalBitasset && finalBitasset.current_feed && parsedCollateralAsset && parsedAsset) {
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
            humanReadableFloat(finalBitasset.settlement_price.base.amount, parsedAsset.p))
        ).toFixed(parsedAsset.p)
      );

      return { finalSettlementFund, finalSettlementPrice };
    }
  }, [finalBitasset, parsedAsset, parsedCollateralAsset]);

  const individualSettlementFund = useMemo(() => {
    if (finalBitasset && parsedAsset && parsedCollateralAsset) {
      const _debt = humanReadableFloat(
        parseInt(finalBitasset.individual_settlement_debt),
        parsedAsset.p
      );
      const _fund = humanReadableFloat(
        parseInt(finalBitasset.individual_settlement_fund),
        parsedCollateralAsset.p
      );
      return {
        _debt,
        _fund,
      };
    }
  }, [finalBitasset, parsedAsset, parsedCollateralAsset]);

  const parsedAssetFlags = useMemo(() => {
    if (finalAsset) {
      const obj = getFlagBooleans(finalAsset.options.flags);
      return Object.keys(obj).map((key) => (
        <HoverCard key={`${key}_debtFlags`}>
          <HoverCardTrigger>
            <Badge className="mr-2">{key}</Badge>
          </HoverCardTrigger>
          <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
            {tips[key]}
          </HoverCardContent>
        </HoverCard>
      ));
    }
  }, [finalAsset]);

  const collateralFlags = useMemo(() => {
    if (finalCollateralAsset) {
      const obj = getFlagBooleans(finalCollateralAsset.options.flags);
      return Object.keys(obj).map((key) => (
        <HoverCard key={`${key}_collateralFlags`}>
          <HoverCardTrigger>
            <Badge className="mr-2">{key}</Badge>
          </HoverCardTrigger>
          <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
            {tips[key]}
          </HoverCardContent>
        </HoverCard>
      ));
    }
  }, [finalCollateralAsset]);

  const debtPermissions = useMemo(() => {
    if (finalAsset) {
      const obj = getFlagBooleans(finalAsset.options.issuer_permissions);
      return Object.keys(obj).map((key) => (
        <HoverCard key={`${key}_debtPermissions`}>
          <HoverCardTrigger>
            <Badge className="mr-2">{key}</Badge>
          </HoverCardTrigger>
          <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
            {tips[key]}
          </HoverCardContent>
        </HoverCard>
      ));
    }
  }, [finalAsset]);

  const collateralPermissions = useMemo(() => {
    if (finalCollateralAsset) {
      const obj = getFlagBooleans(finalCollateralAsset.options.issuer_permissions);
      return Object.keys(obj).map((key) => (
        <HoverCard key={`${key}_collateralPermissions`}>
          <HoverCardTrigger>
            <Badge className="mr-2">{key}</Badge>
          </HoverCardTrigger>
          <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
            {tips[key]}
          </HoverCardContent>
        </HoverCard>
      ));
    }
  }, [finalCollateralAsset]);

  const [activeOrderTab, setActiveOrderTab] = useState("buy");
  const [showDialog, setShowDialog] = useState(false);

  const [debtLock, setDebtLock] = useState("editable");
  const [collateralLock, setCollateralLock] = useState("editable");
  const [ratioLock, setRatioLock] = useState("locked");

  const [formCallPrice, setFormCallPrice] = useState(0);

  const [debtAmount, setDebtAmount] = useState(0);
  const [collateralAmount, setCollateralAmount] = useState(0);
  const [ratioValue, setRatioValue] = useState(0);

  const [tcrEnabled, setTCREnabled] = useState(false);
  const [tcrValue, setTCRValue] = useState(0);

  useEffect(() => {
    if (parsedBitasset) {
      if (usrMarginPositions && usrMarginPositions.length) {
        const res = usrMarginPositions[0];
        const collateralAmount = humanReadableFloat(res.collateral, parsedCollateralAsset.p);
        const debtAmount = humanReadableFloat(res.debt, parsedAsset.p);
        const _mcr = parsedBitasset.mcr / 1000;

        const tcr = res.target_collateral_ratio ? res.target_collateral_ratio / 1000 : null;
        const _ratio = 1 / ((currentFeedSettlementPrice * debtAmount) / collateralAmount);
        const ratio = parseFloat(_ratio.toFixed(3));
        const callPrice = res.target_collateral_ratio
          ? parseFloat(
              (
                currentFeedSettlementPrice *
                (collateralAmount /
                  (debtAmount *
                    (currentFeedSettlementPrice * (res.target_collateral_ratio / 1000))))
              ).toFixed(parsedCollateralAsset.p)
            )
          : parseFloat(
              (
                currentFeedSettlementPrice *
                (collateralAmount / (debtAmount * (currentFeedSettlementPrice * _mcr)))
              ).toFixed(parsedCollateralAsset.p)
            );

        setCollateralAmount(collateralAmount);
        setDebtAmount(debtAmount);

        setRatioValue(ratio);
        setFormCallPrice(callPrice);
        if (tcr) {
          setTCREnabled(true);
          setTCRValue(tcr);
        }
      } else {
        const _mcr = parsedBitasset.mcr / 1000;
        const _collateralAmount = (currentFeedSettlementPrice * _mcr).toFixed(
          parsedCollateralAsset.p
        );

        setCollateralAmount(_collateralAmount);
        setDebtAmount(1);
        setRatioValue(_mcr);
        setFormCallPrice(
          parseFloat(
            (
              currentFeedSettlementPrice *
              (_collateralAmount / (debtAmount * (currentFeedSettlementPrice * _mcr)))
            ).toFixed(parsedCollateralAsset.p)
          )
        );
        setTCREnabled(false);
        setTCRValue(_mcr);
      }
    }
  }, [usrMarginPositions, parsedBitasset]);

  useEffect(() => {
    if (
      currentFeedSettlementPrice &&
      parsedCollateralAsset &&
      debtAmount &&
      collateralAmount &&
      ratioValue
    ) {
      const callPrice = tcrValue
        ? parseFloat(
            (
              currentFeedSettlementPrice *
              (collateralAmount / (debtAmount * (currentFeedSettlementPrice * tcrValue)))
            ).toFixed(parsedCollateralAsset.p)
          )
        : parseFloat(
            (
              currentFeedSettlementPrice *
              (collateralAmount / (debtAmount * (currentFeedSettlementPrice * 1.4)))
            ).toFixed(parsedCollateralAsset.p)
          );
      setFormCallPrice(callPrice);
    }
  }, [currentFeedSettlementPrice, parsedCollateralAsset, debtAmount, collateralAmount, ratioValue]);

  const debouncedDebtAmount = useCallback(
    debounce(
      (
        input,
        current_feed_price,
        current_collateral_amount,
        current_ratio_value,
        debtPrecision,
        collateralPrecision,
        _debtLock,
        _collateralLock,
        _ratioLock
      ) => {
        setShowDialog(false);
        const _minDebt = humanReadableFloat(1, debtPrecision);
        const _minCollateral = humanReadableFloat(1, collateralPrecision);

        let parsedDebtAmount = Math.max(parseFloat(input), _minDebt);
        let parsedCollateralAmount = parseFloat(current_collateral_amount);

        const _requiredCollateral = parseFloat(
          (parsedDebtAmount * current_feed_price * current_ratio_value).toFixed(collateralPrecision)
        );

        const _minDebtFeedPrice = _minDebt * current_feed_price;

        if (
          parsedCollateralAmount <= 0 ||
          _requiredCollateral <= 0 ||
          parsedCollateralAmount < _minCollateral ||
          _requiredCollateral < _minCollateral
        ) {
          const _minDebtReqdCollateral = _minDebtFeedPrice / _ratio;
          const _minCollateralReqdDebt = _minCollateral / current_feed_price;
          const _minReqdCollateral = _minDebtFeedPrice;

          if (_minDebtReqdCollateral >= _minCollateral) {
            parsedDebtAmount = _minDebt;
            parsedCollateralAmount = _minDebtReqdCollateral;
          } else if (_minCollateralReqdDebt >= _minDebt) {
            parsedDebtAmount = _minCollateralReqdDebt;
            parsedCollateralAmount = _minCollateral;
          } else if (_minReqdCollateral >= _minCollateral) {
            parsedDebtAmount = _minDebt;
            parsedCollateralAmount = _minReqdCollateral;
          } else {
            let x = _minCollateral / _minDebtFeedPrice;
            parsedDebtAmount = _minDebt * x;
            parsedCollateralAmount = _minCollateral;
          }
        } else {
          parsedCollateralAmount = _requiredCollateral;
        }

        const _ratio = 1 / ((current_feed_price * parsedDebtAmount) / parsedCollateralAmount);

        if (_debtLock === "locked" || _collateralLock === "locked") {
          setRatioValue(_ratio);
        }

        if (_ratioLock === "locked") {
          setCollateralAmount(parsedCollateralAmount);
        }

        setDebtAmount(parsedDebtAmount);
      },
      200
    ),
    []
  );

  const debouncedCollateralAmount = useCallback(
    debounce(
      (
        input,
        current_feed_price,
        current_debt_amount,
        current_collateral_amount,
        debtPrecision,
        collateralPrecision,
        existingRatio,
        _debtLock,
        _collateralLock,
        _ratioLock
      ) => {
        setShowDialog(false);
        const _minDebt = humanReadableFloat(1, debtPrecision);
        const _minCollateral = humanReadableFloat(1, collateralPrecision);

        const existingDebtAmount = parseFloat(current_debt_amount);

        let parsedCollateralAmount = Math.max(
          parseFloat(parseFloat(input).toFixed(collateralPrecision)),
          _minCollateral
        );

        let parsedDebtAmount = parseFloat(
          (parsedCollateralAmount / current_feed_price / existingRatio).toFixed(debtPrecision)
        );

        if (parsedDebtAmount < _minDebt) {
          parsedCollateralAmount = _minDebt * current_feed_price * existingRatio;
          parsedDebtAmount = _minDebt;
        }

        if (_ratioLock === "locked") {
          // only set debt
          setDebtAmount(parsedDebtAmount);
        }

        if (_debtLock === "locked" || _collateralLock === "locked") {
          // change the ratio
          const updatedRatio = parseFloat(
            (1 / ((current_feed_price * existingDebtAmount) / parsedCollateralAmount)).toFixed(3)
          );

          setRatioValue(updatedRatio);
        }

        setCollateralAmount(parsedCollateralAmount);
      },
      200
    ),
    []
  );

  const debouncedSetRatioValue = useCallback(
    debounce(
      (
        input,
        current_feed_price,
        current_debt_amount,
        current_collateral_amount,
        mcr,
        debtPrecision,
        collateralPrecision,
        _debtLock,
        _collateralLock,
        _ratioLock
      ) => {
        setShowDialog(false);
        let parsedRatioAmount = parseFloat(input);
        if (parsedRatioAmount < mcr / 1000) {
          parsedRatioAmount = mcr / 1000;
        }
        const _collateralAmount = parseFloat(current_collateral_amount);

        if (_ratioLock === "locked" || _collateralLock === "locked") {
          // change the debt
          const finalDebt = parseFloat(
            (_collateralAmount / (current_feed_price * parsedRatioAmount)).toFixed(debtPrecision)
          );
          setDebtAmount(finalDebt);
        }

        if (_debtLock === "locked") {
          // maintain the debt, change the collateral
          const _debtAmount = parseFloat(current_debt_amount);
          const newCollateralAmount = parseFloat(
            (_debtAmount * current_feed_price * parsedRatioAmount).toFixed(collateralPrecision)
          );
          setCollateralAmount(newCollateralAmount);
        }

        setRatioValue(parsedRatioAmount);
      },
      5
    ),
    []
  );

  const debouncedSetTCRValue = useCallback(
    debounce((input, mcr) => {
      const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
      if (regex.test(input)) {
        if (input < mcr / 1000) {
          setTCRValue(mcr / 1000);
        } else if (input > 20) {
          setTCRValue(20);
        } else {
          setTCRValue(input);
        }
      }
    }, 5),
    []
  );

  const exitJSON = useMemo(() => {
    if (!usrMarginPositions || !usrMarginPositions.length) {
      return null;
    }
    const _debtPosition = usrMarginPositions[0].debt;
    const _collateralPosition = usrMarginPositions[0].collateral;
    return {
      funding_account: usr.id,
      delta_collateral: {
        amount: 0 - _collateralPosition,
        asset_id: parsedBitasset.collateral,
      },
      delta_debt: {
        amount: 0 - _debtPosition,
        asset_id: parsedBitasset.assetID,
      },
      extensions: {},
    };
  }, [usrMarginPositions]);

  const trxJSON = useMemo(() => {
    if (!parsedAsset || !parsedCollateralAsset) {
      return null;
    }
    if (usrMarginPositions && usrMarginPositions.length) {
      const _debtPosition = usrMarginPositions[0].debt;
      const _collateralPosition = usrMarginPositions[0].collateral;

      const newDebtPosition = parseInt(blockchainFloat(debtAmount, parsedAsset.p));
      const newCollateralPosition = parseInt(
        blockchainFloat(collateralAmount, parsedCollateralAsset.p)
      );

      let finalDebtPosition = 0;
      if (newDebtPosition > _debtPosition) {
        finalDebtPosition = newDebtPosition - _debtPosition;
      } else if (newDebtPosition < _debtPosition) {
        finalDebtPosition = _debtPosition - newDebtPosition;
      }

      let finalCollateralPosition = 0;
      if (newCollateralPosition > _collateralPosition) {
        finalCollateralPosition = newCollateralPosition - _collateralPosition;
      } else if (newCollateralPosition < _collateralPosition) {
        finalCollateralPosition = _collateralPosition - newCollateralPosition;
      }

      if (finalDebtPosition === 0 || finalCollateralPosition === 0) {
        return null;
      }

      return {
        funding_account: usr.id,
        delta_collateral: {
          amount: finalDebtPosition,
          asset_id: parsedBitasset.collateral,
        },
        delta_debt: {
          amount: finalCollateralPosition,
          asset_id: parsedBitasset.assetID,
        },
        extensions:
          tcrEnabled && tcrValue
            ? {
                target_collateral_ratio: tcrValue,
              }
            : {},
      };
    } else {
      return {
        funding_account: usr.id,
        delta_collateral: {
          amount: parseInt(blockchainFloat(collateralAmount, parsedCollateralAsset.p)),
          asset_id: parsedBitasset.collateral,
        },
        delta_debt: {
          amount: parseInt(blockchainFloat(debtAmount, parsedAsset.p)),
          asset_id: parsedBitasset.assetID,
        },
        extensions:
          tcrEnabled && tcrValue
            ? {
                target_collateral_ratio: tcrValue,
              }
            : {},
      };
    }
  }, [
    usrMarginPositions,
    parsedAsset,
    parsedCollateralAsset,
    collateralAmount,
    debtAmount,
    tcrEnabled,
    tcrValue,
  ]);

  const [showClosePositionDialog, setShowClosePositionDialog] = useState(false);

  const UsrMarginPositionCard = () => {
    const res = usrMarginPositions[0];
    const collateralAmount = humanReadableFloat(res.collateral, parsedCollateralAsset.p);
    const debtAmount = humanReadableFloat(res.debt, parsedAsset.p);

    const tcr = res.target_collateral_ratio ? `${res.target_collateral_ratio / 10}%` : null;

    const _ratio = 1 / ((currentFeedSettlementPrice * debtAmount) / collateralAmount);
    const ratio = parseFloat(_ratio.toFixed(3));

    const callPrice = res.target_collateral_ratio
      ? parseFloat(
          (
            currentFeedSettlementPrice *
            (collateralAmount /
              (debtAmount * (currentFeedSettlementPrice * (res.target_collateral_ratio / 1000))))
          ).toFixed(parsedCollateralAsset.p)
        )
      : parseFloat(
          (
            currentFeedSettlementPrice *
            (collateralAmount / (debtAmount * (currentFeedSettlementPrice * 1.4)))
          ).toFixed(parsedCollateralAsset.p)
        );

    return (
      <Card className="mt-2">
        <CardHeader className="pb-2">
          <CardTitle>
            Your current {parsedAsset.s} ({parsedAsset.id}) margin position
          </CardTitle>
          <CardDescription>You have an ongoing margin position for this smartcoin.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {"Balance: "}
          <b>{debtAssetHoldings ?? 0}</b>
          {parsedAsset ? ` ${parsedAsset.s}` : " ?"}
          <br />
          {"Debt: "}
          <b>{humanReadableFloat(usrMarginPositions[0].debt, parsedAsset.p)}</b> {parsedAsset.s}
          <br />
          {"Collateral at risk: "}
          <b>
            {humanReadableFloat(usrMarginPositions[0].collateral, parsedCollateralAsset.p)}
          </b>{" "}
          {parsedCollateralAsset.s}
          <br />
          {"Current ratio: "}
          <b>{ratio}</b>
          <br />
          {"Margin call price: "}
          <b>{callPrice}</b> {parsedCollateralAsset.s}
          {" ("}
          {(1 / callPrice).toFixed(parsedAsset.p)} {parsedAsset.s}/{parsedCollateralAsset.s}
          {")"}
          {tcr ? (
            <>
              <br />
              {"Target collateral ratio: "}
              <b>{tcr}</b>
            </>
          ) : null}
          <br />
          <Button className="mt-3 mr-2" onClick={() => setShowClosePositionDialog(true)}>
            Close position
          </Button>
          <a
            href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${parsedAsset.s}`}
          >
            <Button className="mr-2">Borrow {parsedAsset.s}</Button>
          </a>
          <a href={`/dex/index.html?market=${parsedAsset.s}_${parsedCollateralAsset.s}`}>
            <Button className="mr-2">
              Buy {parsedAsset.s} with {parsedCollateralAsset.s}
            </Button>
          </a>
          {showClosePositionDialog ? (
            <DeepLinkDialog
              operationName="call_order_update"
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setShowClosePositionDialog}
              key={`Closing${parsedAsset.s}debtposition`}
              headerText={`Closing your ${parsedAsset.s} debt position`}
              trxJSON={[exitJSON]}
            />
          ) : null}
        </CardContent>
      </Card>
    );
  };

  const AboutAssetCard = ({
    assetInfo,
    bitassetInfo,
    fullAssetInfo,
    fullBitassetInfo,
    type,
    assetInfoFlags,
    assetPermissions,
  }) => {
    return (
      <Card className="mt-2">
        <CardHeader className="pb-2">
          <CardTitle>
            <div className="grid grid-cols-8">
              <div className="col-span-6">
                {type === "debt" ? (
                  <>
                    About the {bitassetInfo.issuer.id === "1.2.0" ? "Bitasset" : "Smartcoin"}{" "}
                    {assetInfo.s} ({assetInfo.id})
                  </>
                ) : (
                  <>
                    About the backing collateral {assetInfo.s} ({assetInfo.id})
                  </>
                )}
              </div>
              <div className="col-span-2 text-right">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-5">
                      View JSON
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-white">
                    <DialogHeader>
                      <DialogTitle>{assetInfo.s} JSON summary data</DialogTitle>
                      <DialogDescription>The data used to render this card</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1">
                      <div className="col-span-1">
                        <ScrollArea className="h-72 rounded-md border text-sm">
                          <pre>{JSON.stringify({ fullAssetInfo, fullBitassetInfo }, null, 2)}</pre>
                        </ScrollArea>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardTitle>
          <CardDescription>
            {type === "debt" ? (
              <>
                Use this information to improve your understanding of {assetInfo.s}.
                <br />
                Thoroughly do your own research before proceeding to borrow any smartcoins.
              </>
            ) : (
              <>
                Use this information to improve your understanding of {assetInfo.s}.
                <br />
                Thoroughly do your own research before using this asset as smartcoin backing
                collateral.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2">
            <div className="col-span-1">
              <Label>General asset info</Label>
            </div>
            <div className="col-span-1 text-right">
              <ExternalLink
                classnamecontents="h-5 mb-2"
                variant="outline"
                type="button"
                text="View asset on blocksights.info"
                hyperlink={`https://blocksights.info/#/assets/${assetInfo.id}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-11 gap-1 w-full text-sm">
            <div className="col-span-5">
              <div className="grid grid-cols-1 gap-1 w-full text-sm">
                <CardRow
                  title={"Issuer"}
                  button={assetInfo.u.split(" ")[0]}
                  dialogtitle={`${assetInfo.s}'s issuer`}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>
                        This is the blockchain account which created this asset. Pay attention to
                        such a detail to understand what it is you're buying and from whom.
                      </li>
                      <li>
                        Asset issuer can change over time as the issuer can easily transfer
                        ownership.
                      </li>
                      <li>
                        Committee account owned assets are usually the core bitassets maintained by
                        the committee.
                      </li>
                      <li>
                        If the issuer is 'null-account' then the ownership of the asset has
                        effectively been burned.
                      </li>
                      <ExternalLink
                        classnamecontents="h-8 mb-2 mt-3"
                        type="button"
                        text="View issuer on blocksights.info"
                        hyperlink={`https://blocksights.info/#/accounts/${
                          assetInfo.u.split(" ")[0]
                        }`}
                      />
                    </ul>
                  }
                  tooltip={"More about asset issuer"}
                />

                <CardRow
                  title={"Maximum supply"}
                  button={humanReadableFloat(
                    fullAssetInfo.options.max_supply,
                    fullAssetInfo.precision
                  )}
                  dialogtitle={`${assetInfo.s}'s maximum supply`}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>This is the max supply of this asset</li>
                    </ul>
                  }
                  tooltip={"More info on max supply"}
                />

                <CardRow
                  title={"Min quantity"}
                  button={humanReadableFloat(1, fullAssetInfo.precision)}
                  dialogtitle={`${assetInfo.s}'s minimum quantity`}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>
                        This is the smallest amount of this asset that can be borrowed or used as
                        collateral.
                      </li>
                      <li>This is effectively 1 "satoshi" of this asset.</li>
                    </ul>
                  }
                  tooltip={"More about asset precision"}
                />

                <CardRow
                  title={"Precision"}
                  button={fullAssetInfo.precision}
                  dialogtitle={`${assetInfo.s}'s precision`}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>
                        This is the number of decimal places this asset supports for its quantity.
                      </li>
                    </ul>
                  }
                  tooltip={"More about asset precision"}
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
                    fullAssetInfo.options.market_fee_percent
                      ? fullAssetInfo.options.market_fee_percent / 100
                      : 0
                  }%`}
                  dialogtitle={`${assetInfo.s}'s market fee`}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>
                        Asset creators can introduce market fees to passively earn as trades occur.
                      </li>
                      <li>The market fee only applies to one side of the trade.</li>
                      <li>Make sure that the market fee is reasonable before proceeding.</li>
                    </ul>
                  }
                  tooltip={"More about the market fee"}
                />

                <CardRow
                  title={"Taker fee percent"}
                  button={`${
                    fullAssetInfo.options.extensions.taker_fee_percent
                      ? fullAssetInfo.options.extensions.taker_fee_percent / 100
                      : 0
                  }%`}
                  dialogtitle={`${assetInfo.s}'s taker fee percent`}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>
                        This is the number of decimal places this asset supports for its quantity.
                      </li>
                    </ul>
                  }
                  tooltip={"More about taker fee percent"}
                />

                <CardRow
                  title={"Reward percent"}
                  button={
                    fullAssetInfo.options.extensions.reward_percent
                      ? fullAssetInfo.options.extensions.reward_percent / 100
                      : 0
                  }
                  dialogtitle={`${assetInfo.s}'s reward percent`}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>
                        This is the share of the market fee that is paid to the account registrar.
                      </li>
                    </ul>
                  }
                  tooltip={"More about asset market fee reward percent"}
                />
              </div>
            </div>
          </div>

          {bitassetInfo && bitassetInfo.id ? (
            <>
              <Label></Label>

              <div className="grid grid-cols-2">
                <div className="col-span-1">
                  <Label>
                    {bitassetInfo.issuer.id === "1.2.0" ? "Bitasset info" : "Smartcoin info"}
                  </Label>
                </div>
                <div className="col-span-1 text-right">
                  <ExternalLink
                    classnamecontents="h-5 mb-2"
                    variant="outline"
                    type="button"
                    text="View bitasset on blocksights.info"
                    hyperlink={`https://blocksights.info/#/objects/${bitassetInfo.id}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-11 gap-1 w-full text-sm">
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <CardRow
                      title={"Collateral asset"}
                      button={parsedCollateralAsset ? parsedCollateralAsset.s : ""}
                      dialogtitle={`${assetInfo.s} smartcoin backing collateral asset`}
                      dialogdescription={
                        <ul className="ml-2 list-disc [&>li]:mt-2">
                          <li>
                            This is the asset which is used as collateral for issuing this
                            smartcoin.
                          </li>
                        </ul>
                      }
                      tooltip={"More about smartcoin backing collateral assets"}
                    />

                    <CardRow
                      title={"MCR"}
                      button={`${bitassetInfo ? bitassetInfo.mcr / 10 : 0} %`}
                      dialogtitle={`${assetInfo.s} minimum collateral requirements`}
                      dialogdescription={
                        <ul className="ml-2 list-disc [&>li]:mt-2">
                          <li>
                            The minimum collateral requirement is set by the issuer, any margin
                            position which fails to maintain a backing collateral ratio above this
                            value will face margin call.
                          </li>
                        </ul>
                      }
                      tooltip={"More about smartcoin minimum collateral requirements"}
                    />

                    <CardRow
                      title={"MSSR"}
                      button={`${bitassetInfo ? bitassetInfo.mssr / 10 : 0} %`}
                      dialogtitle={`${assetInfo.s} maximum Short Squeeze Ratio`}
                      dialogdescription={
                        <ul className="ml-2 list-disc [&>li]:mt-2">
                          <li>Maximum Short Squeeze Ratio (MSSR): Max. liquidation penalty.</li>
                        </ul>
                      }
                      tooltip={"More about smartcoin Maximum Short Squeeze Ratio"}
                    />

                    <CardRow
                      title={"ICR"}
                      button={`${bitassetInfo ? bitassetInfo.icr / 10 : 0} %`}
                      dialogtitle={`${assetInfo.s} Initial Collateral Ratio`}
                      dialogdescription={
                        <ul className="ml-2 list-disc [&>li]:mt-2">
                          <li>
                            Initial Collateral Ratio (ICR): Minimum CR for updating margin position.
                          </li>
                        </ul>
                      }
                      tooltip={"More about smartcoin Initial Collateral Ratio"}
                    />

                    <CardRow
                      title={"Feed qty"}
                      button={bitassetInfo ? bitassetInfo.feeds.length : 0}
                      dialogtitle={`${assetInfo.s} smartcoin price feed quantity`}
                      dialogdescription={
                        <ul className="ml-2 list-disc [&>li]:mt-2">
                          <li>This is the quantity of unique recently published price feeds.</li>
                          <li>
                            The more feeds, the more decentralized the price feed arguably is.
                          </li>
                          <li>
                            Some assets are fed by the committee or the witnesses, such as the
                            bitassets.
                          </li>
                          <li>Private smartcoins can be fed by custom price feed publishers.</li>
                          <li>
                            You should verify the correctness and the trustworthiness of price feeds
                            to reduce your risk exposure.
                          </li>
                        </ul>
                      }
                      tooltip={"More about smartcoin price feed quantities"}
                    />

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.force_settlement_offset_percent ? (
                      <CardRow
                        title={"Settlement offset"}
                        button={`${
                          fullBitassetInfo.options.force_settlement_offset_percent / 100
                        }%`}
                        dialogtitle={`${assetInfo.s} force settlement offset`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>How much a force settlement order will be offset by.</li>
                          </ul>
                        }
                        tooltip={"More about force settlement offset"}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="col-span-1 flex justify-center items-center">
                  <Separator orientation="vertical" />
                </div>
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.force_settle_fee_percent ? (
                      <CardRow
                        title={"Settlement fee"}
                        button={`${
                          fullBitassetInfo.options.extensions.force_settle_fee_percent / 100
                        }%`}
                        dialogtitle={`${assetInfo.s} force settlement fee`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              If you choose to force settle a smartcoin in return for its backing
                              collateral, you will pay this fee.
                            </li>
                          </ul>
                        }
                        tooltip={"More about smartcoin force settlement fees"}
                      />
                    ) : null}

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.margin_call_fee_ratio ? (
                      <CardRow
                        title={"Margin call fee"}
                        button={`${
                          fullBitassetInfo.options.extensions.margin_call_fee_ratio / 100
                        }%`}
                        dialogtitle={`${assetInfo.s} margin call fee`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>If your call order is margin called, this fee will be applied.</li>
                            <li>
                              Bear such a fee in mind before you enter into a margin position.
                            </li>
                          </ul>
                        }
                        tooltip={"More about smartcoin margin call fees"}
                      />
                    ) : null}

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.black_swan_response_method ? (
                      <CardRow
                        title={"BSRM"}
                        button={fullBitassetInfo.options.extensions.black_swan_response_method}
                        dialogtitle={`${assetInfo.s} black swan response method`}
                        dialogdescription={
                          <ScrollArea className="h-72">
                            <ul className="ml-2 list-disc [&>li]:mt-2 text-sm">
                              <li>
                                This is the method chosen by the smartcoin owner for how to handle
                                "black swan" events, such as the undercollateralization of the
                                smartcoin.
                              </li>
                              <li>
                                <b>global_settlement</b> (the default method)
                                <br />
                                All debt positions are closed, all or some collateral is moved to a
                                global-settlement fund.
                                <br />
                                Debt asset holders can claim collateral via force-settlement.
                                <br />
                                It is not allowed to create new debt positions when the fund is not
                                empty
                              </li>
                              <li>
                                <b>no_settlement</b> aka "Global Settlement Protection"
                                <br />
                                No debt position is closed, and the derived settlement price is
                                dynamically capped at the collateral ratio of the debt position with
                                the least collateral ratio so that all debt positions are able to
                                pay off their debt when being margin called or force-settled.
                                <br />
                                Able to adjust existing debt positions or create new debt positions.
                              </li>
                              <li>
                                <b>individual_settlement_to_fund</b>
                                <br />
                                Only the undercollateralized debt positions are closed and their
                                collateral is moved to a fund which can be claimed via
                                force-settlement. The derived settlement price is capped at the
                                fund's collateral ratio so that remaining debt positions will not be
                                margin called or force-settled at a worse price.
                                <br />
                                Able to adjust existing debt positions or create new debt positions.
                              </li>
                              <li>
                                <b>individual_settlement_to_order</b>
                                <br />
                                Only the undercollateralized debt positions are closed and their
                                collateral is moved to a limit order on the order book which can be
                                bought. The derived settlement price is NOT capped, which means
                                remaining debt positions could be margin called at a worse price.
                                <br />
                                Able to adjust existing debt positions or create new debt positions.
                              </li>
                            </ul>
                          </ScrollArea>
                        }
                        tooltip={"More about the black swan response method"}
                      />
                    ) : null}

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.initial_collateral_ratio ? (
                      <CardRow
                        title={"Manual ICR"}
                        button={fullBitassetInfo.options.extensions.initial_collateral_ratio}
                        dialogtitle={`${assetInfo.s} manually configured initial collateral ratio`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              This is the initial collateral ratio (ICR) set by the asset owner.
                            </li>
                          </ul>
                        }
                        tooltip={"More about manual ICR"}
                      />
                    ) : null}

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.maintenance_collateral_ratio ? (
                      <CardRow
                        title={"Manual MCR"}
                        button={fullBitassetInfo.options.extensions.maintenance_collateral_ratio}
                        dialogtitle={`${assetInfo.s} manually configured minimum collateral ratio`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              This is the minimum collateral ratio (MCR) set by the asset owner.
                            </li>
                          </ul>
                        }
                        tooltip={"More about manual MCR"}
                      />
                    ) : null}

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.maximum_short_squeeze_ratio ? (
                      <CardRow
                        title={"Manual MSSR"}
                        button={fullBitassetInfo.options.extensions.maximum_short_squeeze_ratio}
                        dialogtitle={`${assetInfo.s} manually configured maximum short squeeze ratio`}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>
                              This is the maximum short squeeze ratio (MSSR) set by the asset owner.
                            </li>
                          </ul>
                        }
                        tooltip={"More about manual MSSR"}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <Label className="pb-0">Asset flags</Label>
          <br />
          {assetInfoFlags && assetInfoFlags.length ? (
            assetInfoFlags
          ) : (
            <span className="text-sm">No flags enabled</span>
          )}
          <br />
          <Label>Asset permissions</Label>
          <br />
          {assetPermissions && assetPermissions.length ? (
            assetPermissions
          ) : (
            <span className="text-sm">No permissions enabled</span>
          )}
        </CardContent>
      </Card>
    );
  };

  const MarginPositionRow = ({ index, style }) => {
    const res = assetCallOrders[index];
    const collateralAmount = humanReadableFloat(res.collateral, parsedCollateralAsset.p);
    const debtAmount = humanReadableFloat(res.debt, parsedAsset.p);

    const tcr = res.target_collateral_ratio ? `${res.target_collateral_ratio / 10}%` : `0%`;

    const _ratio = 1 / ((currentFeedSettlementPrice * debtAmount) / collateralAmount);
    const ratio = parseFloat(_ratio.toFixed(3));

    const callPrice = res.target_collateral_ratio
      ? parseFloat(
          (
            currentFeedSettlementPrice *
            (collateralAmount /
              (debtAmount * (currentFeedSettlementPrice * (res.target_collateral_ratio / 1000))))
          ).toFixed(parsedCollateralAsset.p)
        )
      : parseFloat(
          (
            currentFeedSettlementPrice *
            (collateralAmount / (debtAmount * (currentFeedSettlementPrice * 1.4)))
          ).toFixed(parsedCollateralAsset.p)
        );

    return (
      <div className="grid grid-cols-6 text-sm" style={style}>
        <div className="col-span-1">
          <ExternalLink
            classnamecontents="text-blue-500"
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
        <div className="col-span-1">{parseFloat(res.price).toFixed(precision)}</div>
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
        <div className="col-span-1">{res.account_id_type ?? ""}</div>
        <div className="col-span-1">{res.asset ?? ""}</div>
        <div className="col-span-1">{res.time_point_sec ?? ""}</div>
      </div>
    );
  };

  const PriceFeedRow = ({ index, style }) => {
    let res = finalBitasset.feeds[index];
    const userID = res[0];
    const date = res[1][0];
    const feedObj = res[1][1];

    const coreExchangeRate = (
      1 /
      (humanReadableFloat(feedObj.core_exchange_rate.base.amount, parsedAsset.p) /
        humanReadableFloat(feedObj.core_exchange_rate.quote.amount, parsedCollateralAsset.p))
    ).toFixed(parsedCollateralAsset.p);

    const feedPrice = (
      1 /
      (humanReadableFloat(feedObj.settlement_price.base.amount, parsedAsset.p) /
        humanReadableFloat(feedObj.settlement_price.quote.amount, parsedCollateralAsset.p))
    ).toFixed(parsedCollateralAsset.p);

    return (
      <div className="grid grid-cols-11 text-sm" style={style}>
        <div className="col-span-2 mr-1">
          <ExternalLink
            classnamecontents="text-blue-500"
            type="text"
            text={userID}
            hyperlink={`https://blocksights.info/#/accounts/${userID}`}
          />
        </div>
        <div className="col-span-2 ml-1">{timeAgo(date)}</div>
        <div className="col-span-2">{coreExchangeRate}</div>
        <div className="col-span-2">{feedPrice}</div>
        <div className="col-span-1">{feedObj.initial_collateral_ratio}</div>
        <div className="col-span-1">{feedObj.maintenance_collateral_ratio}</div>
        <div className="col-span-1">{feedObj.maximum_short_squeeze_ratio}</div>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 gap-3">
        {marketSearch && invalidUrlParams ? (
          <Card>
            <CardHeader>
              <CardTitle>⚠️ Invalid smartcoin id provided</CardTitle>
              <CardDescription>
                Unfortunately an invalid smartcoin id has been provided; unable to proceed with
                smartcoin issuance.
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
            <CardHeader className="pb-2">
              <CardTitle>💵 Collateral debt position form</CardTitle>
              <CardDescription>
                You can use this form to borrow this smartcoin into existence, given sufficient
                collateral.
                <br />
                Thoroughly research assets before continuing, know your risk exposure and
                tolerances.
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
                        <FormLabel>Borrowing account</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-8 mt-4">
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
                                  colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
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
                                placeholder="Bitshares account (1.2.x)"
                                className="mb-3"
                                value={`${usr.username} (${usr.id})`}
                                readOnly
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
                    name="borrowAsset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset to borrow</FormLabel>
                        <FormControl>
                          <span className="grid grid-cols-8">
                            <span className="col-span-6">
                              <Input
                                disabled
                                placeholder="Bitshares smartcoin (1.3.x)"
                                className="mb-1"
                                value={`${parsedAsset ? parsedAsset.s : ""} (${
                                  parsedAsset ? parsedAsset.id : ""
                                })`}
                                readOnly
                              />
                            </span>
                            <span className="col-span-2">
                              <a href="/smartcoins/index.html">
                                <Button className="ml-3" variant="outline">
                                  Change asset
                                </Button>
                              </a>
                            </span>
                          </span>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Current feed price</CardTitle>
                        <CardDescription>Calculated from multiple feeds</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="grid grid-cols-2">
                          <span className="col-span-1">
                            <HoverCard key="feedPrice1">
                              <HoverCardTrigger asChild>
                                <Input
                                  disabled
                                  className="mr-1"
                                  value={currentFeedSettlementPrice ?? ""}
                                  readOnly
                                />
                              </HoverCardTrigger>
                              <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                                {parsedCollateralAsset.s}/{parsedAsset.s}
                              </HoverCardContent>
                            </HoverCard>
                          </span>
                          <span className="col-span-1">
                            <HoverCard key="feedPrice2">
                              <HoverCardTrigger asChild>
                                <Input
                                  disabled
                                  className="ml-1"
                                  value={
                                    currentFeedSettlementPrice
                                      ? (1 / currentFeedSettlementPrice).toFixed(parsedAsset.p)
                                      : ""
                                  }
                                  readOnly
                                />
                              </HoverCardTrigger>
                              <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                                {parsedAsset.s}/{parsedCollateralAsset.s}
                              </HoverCardContent>
                            </HoverCard>
                          </span>
                        </span>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Your margin call price</CardTitle>
                        <CardDescription>
                          Your calculated collateral liquidation rate
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="grid grid-cols-2">
                          <span className="col-span-1">
                            <HoverCard key="feedPrice1">
                              <HoverCardTrigger asChild>
                                <Input
                                  disabled
                                  className="mr-1"
                                  value={
                                    formCallPrice && parsedCollateralAsset
                                      ? formCallPrice.toFixed(parsedCollateralAsset.p)
                                      : ""
                                  }
                                  readOnly
                                />
                              </HoverCardTrigger>
                              <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                                {parsedCollateralAsset.s}/{parsedAsset.s}
                              </HoverCardContent>
                            </HoverCard>
                          </span>
                          <span className="col-span-1">
                            <HoverCard key="feedPrice2">
                              <HoverCardTrigger asChild>
                                <Input
                                  disabled
                                  className="ml-1"
                                  value={
                                    formCallPrice && parsedAsset
                                      ? (1 / formCallPrice).toFixed(parsedAsset.p)
                                      : ""
                                  }
                                  readOnly
                                />
                              </HoverCardTrigger>
                              <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                                {parsedAsset.s}/{parsedCollateralAsset.s}
                              </HoverCardContent>
                            </HoverCard>
                          </span>
                        </span>
                      </CardContent>
                    </Card>
                  </div>

                  <FormField
                    control={form.control}
                    name="debtAmount"
                    render={({ field }) => (
                      <FormItem className="mt-2">
                        <FormLabel>Debt amount</FormLabel>
                        <FormDescription style={{ marginTop: 0, paddingTop: 0 }}>
                          <span className="grid grid-cols-3 mt-0 pt-0">
                            <span className="col-span-2 mt-0 pt-0">
                              The amount of {parsedAsset ? parsedAsset.s : "?"} you intend to borrow
                              into existence.
                            </span>
                            <span className="col-span-1 text-right">
                              Balance: {debtAssetHoldings ?? ""} {parsedAsset ? parsedAsset.s : ""}
                            </span>
                          </span>
                        </FormDescription>
                        <FormControl>
                          <span className="grid grid-cols-12">
                            <span className="col-span-1">
                              <HoverCard key="debtLockCard">
                                <HoverCardTrigger asChild>
                                  <Toggle
                                    variant="outline"
                                    onClick={() => {
                                      if (debtLock === "editable") {
                                        setDebtLock("locked");
                                        setRatioLock("editable");
                                        setCollateralLock("editable");
                                      }
                                    }}
                                  >
                                    {debtLock === "editable" ? (
                                      <LockOpen2Icon className="h-4 w-4" />
                                    ) : (
                                      <LockClosedIcon className="h-4 w-4" />
                                    )}
                                  </Toggle>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                                  {debtLock === "editable"
                                    ? "Lock debt amount"
                                    : "Debt amount locked"}
                                </HoverCardContent>
                              </HoverCard>
                            </span>
                            <span className="col-span-7">
                              <Input
                                label={`Amount of debt to issue`}
                                value={
                                  debtAmount
                                    ? `${debtAmount} ${parsedAsset.s}`
                                    : `0 ${parsedAsset.s}`
                                }
                                disabled
                                readOnly
                                className="mb-3"
                              />
                            </span>
                            <span className="col-span-4 ml-3">
                              <Popover>
                                <PopoverTrigger>
                                  <span
                                    onClick={() => {
                                      event.preventDefault();
                                    }}
                                    className="inline-block border border-grey rounded pl-4 pb-1 pr-4"
                                  >
                                    <Label>Change debt amount</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>Provide a new debt amount</Label>
                                  <Input
                                    placeholder={debtAmount}
                                    className="mb-2 mt-1"
                                    onChange={(event) => {
                                      const input = event.target.value;
                                      const regex = /^[0-9]*\.?[0-9]*$/;
                                      if (input && input.length && regex.test(input)) {
                                        debouncedDebtAmount(
                                          input,
                                          currentFeedSettlementPrice,
                                          collateralAmount,
                                          ratioValue,
                                          parsedAsset.p,
                                          parsedCollateralAsset.p,
                                          debtLock,
                                          collateralLock,
                                          ratioLock
                                        );
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </span>
                          </span>
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
                        <FormDescription style={{ marginTop: 0, paddingTop: 0 }}>
                          <span className="grid grid-cols-3 mt-0 pt-0">
                            <span className="col-span-2 mt-0 pt-0">
                              The amount of {parsedCollateralAsset.s} backing collateral you'll need
                              to provide.
                            </span>
                            <span className="col-span-1 text-right">
                              Balance: {collateralAssetHoldings ?? 0}{" "}
                              {parsedCollateralAsset ? parsedCollateralAsset.s : ""}
                            </span>
                          </span>
                        </FormDescription>
                        <FormControl>
                          <span className="grid grid-cols-12">
                            <span className="col-span-1">
                              <HoverCard key="collateralLockCard">
                                <HoverCardTrigger asChild>
                                  <Toggle
                                    variant="outline"
                                    onClick={() => {
                                      if (collateralLock === "editable") {
                                        setDebtLock("editable");
                                        setRatioLock("editable");
                                        setCollateralLock("locked");
                                      }
                                    }}
                                  >
                                    {collateralLock === "editable" ? (
                                      <LockOpen2Icon className="h-4 w-4" />
                                    ) : (
                                      <LockClosedIcon className="h-4 w-4" />
                                    )}
                                  </Toggle>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                                  {collateralLock === "editable"
                                    ? "Lock collateral amount"
                                    : "Collateral amount locked"}
                                </HoverCardContent>
                              </HoverCard>
                            </span>
                            <span className="col-span-7">
                              <Input
                                label={`Amount of collateral to commit`}
                                placeholder={
                                  collateralAmount && collateralAmount > 0
                                    ? `${collateralAmount} ${parsedCollateralAsset.s}`
                                    : `? ${parsedCollateralAsset.s}`
                                }
                                readOnly
                                disabled
                                className="mb-3"
                              />
                            </span>
                            <span className="col-span-4 ml-3">
                              <Popover>
                                <PopoverTrigger>
                                  <span
                                    onClick={() => {
                                      event.preventDefault();
                                    }}
                                    className="inline-block border border-grey rounded pl-4 pb-1 pr-4"
                                  >
                                    <Label>Change collateral amount</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>Provide a new collateral amount</Label>
                                  <Input
                                    placeholder={collateralAmount}
                                    className="mb-2 mt-1"
                                    onChange={(event) => {
                                      const input = event.target.value;
                                      const regex = /^[0-9]*\.?[0-9]*$/;
                                      if (input && input.length && regex.test(input)) {
                                        debouncedCollateralAmount(
                                          input,
                                          currentFeedSettlementPrice,
                                          debtAmount,
                                          collateralAmount,
                                          parsedAsset.p,
                                          parsedCollateralAsset.p,
                                          ratioValue,
                                          debtLock,
                                          collateralLock,
                                          ratioLock
                                        );
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </span>
                          </span>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ratioValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ratio of collateral to debt</FormLabel>
                        <FormDescription>
                          <span className="grid grid-cols-3 mt-0 pt-0">
                            <span className="col-span-2 mt-0 pt-0">
                              The level of collateralization you wish to maintain for this margin
                              position.
                            </span>
                            <span className="col-span-1 text-right">
                              Min: {parsedBitasset.mcr / 1000}
                            </span>
                          </span>
                        </FormDescription>
                        <FormControl>
                          <span className="grid grid-cols-12">
                            <span className="col-span-1">
                              <HoverCard key="ratioLockCard">
                                <HoverCardTrigger asChild>
                                  <Toggle
                                    variant="outline"
                                    onClick={() => {
                                      if (ratioLock === "editable") {
                                        setDebtLock("editable");
                                        setRatioLock("locked");
                                        setCollateralLock("editable");
                                      } else {
                                        setDebtLock("editable");
                                        setRatioLock("editable");
                                        setCollateralLock("locked");
                                      }
                                    }}
                                  >
                                    {ratioLock === "editable" ? (
                                      <LockOpen2Icon className="h-4 w-4" />
                                    ) : (
                                      <LockClosedIcon className="h-4 w-4" />
                                    )}
                                  </Toggle>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                                  {ratioLock === "editable"
                                    ? "Lock the ratio value"
                                    : "Unlock ratio value"}
                                </HoverCardContent>
                              </HoverCard>
                            </span>
                            <span className="col-span-7">
                              {ratioValue ? (
                                <Input
                                  label={`Ratio of collateral to debt`}
                                  placeholder={ratioValue}
                                  className="mb-3"
                                  disabled
                                  readOnly
                                />
                              ) : (
                                <Input
                                  label={`Ratio of collateral to debt`}
                                  className="mb-3"
                                  disabled
                                  readOnly
                                />
                              )}
                              <Slider
                                defaultValue={[ratioValue]}
                                value={[ratioValue]}
                                max={20}
                                min={parsedBitasset.mcr / 1000}
                                step={0.01}
                                onValueChange={(value) => {
                                  debouncedSetRatioValue(
                                    value[0],
                                    currentFeedSettlementPrice,
                                    debtAmount,
                                    collateralAmount,
                                    parsedBitasset.mcr,
                                    parsedAsset.p,
                                    parsedCollateralAsset.p,
                                    debtLock,
                                    collateralLock,
                                    ratioLock
                                  );
                                }}
                              />
                            </span>
                            <span className="col-span-4 ml-3">
                              <Popover>
                                <PopoverTrigger>
                                  <span
                                    onClick={() => {
                                      event.preventDefault();
                                    }}
                                    className="inline-block border border-grey rounded pl-4 pb-1 pr-4"
                                  >
                                    <Label>Change ratio value</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>Provide a new ratio</Label>
                                  <Input
                                    placeholder={ratioValue}
                                    className="mb-2 mt-1"
                                    onChange={(event) => {
                                      const input = event.target.value;
                                      const regex = /^[0-9]*\.?[0-9]*$/;
                                      if (input && input.length && regex.test(input)) {
                                        debouncedSetRatioValue(
                                          input,
                                          currentFeedSettlementPrice,
                                          debtAmount,
                                          collateralAmount,
                                          parsedBitasset.mcr,
                                          parsedAsset.p,
                                          parsedCollateralAsset.p,
                                          debtLock,
                                          collateralLock,
                                          ratioLock
                                        );
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </span>
                          </span>
                        </FormControl>
                        {ratioValue && parsedBitasset && ratioValue < parsedBitasset.mcr / 1000 ? (
                          <FormMessage>
                            Warning: Your debt collateral ratio is below the minimum collateral
                            ratio of {parsedBitasset.mcr / 1000}
                          </FormMessage>
                        ) : null}
                      </FormItem>
                    )}
                  />

                  <br />
                  <FormField
                    control={form.control}
                    name="tcrValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <>
                            <Checkbox
                              id="terms1"
                              className="mr-2"
                              checked={tcrEnabled}
                              onClick={() => {
                                setTCREnabled(!tcrEnabled);
                              }}
                            />
                            Enable Target Collateral Ratio
                          </>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {tcrEnabled ? (
                    <FormField
                      control={form.control}
                      name="tcrValue"
                      render={({ field }) => (
                        <FormItem className="mt-0">
                          <FormLabel>Target collateral ratio value</FormLabel>
                          <FormDescription>
                            <span className="grid grid-cols-4 mt-0 pt-0">
                              <span className="col-span-3 mt-0 pt-0">
                                Provide a ratio for the blockchain to automatically maintain through
                                collateral sales.
                              </span>
                              <span className="col-span-1 text-right">
                                Min: {parsedBitasset.mcr / 1000}
                              </span>
                            </span>
                          </FormDescription>
                          <FormControl>
                            <span className="grid grid-cols-12">
                              <span className="col-span-8">
                                <Input
                                  label={`Ratio of collateral to debt`}
                                  placeholder={tcrValue}
                                  disabled
                                  readOnly
                                />
                                <Slider
                                  className="mt-3"
                                  defaultValue={[tcrValue ?? parsedBitasset.mcr / 1000]}
                                  max={20}
                                  min={parsedBitasset.mcr / 1000}
                                  step={0.1}
                                  onValueChange={(value) => {
                                    debouncedSetTCRValue(value[0], parsedBitasset.mcr);
                                  }}
                                />
                              </span>

                              <span className="col-span-4 ml-3">
                                <Popover>
                                  <PopoverTrigger>
                                    <span
                                      onClick={() => {
                                        event.preventDefault();
                                      }}
                                      className="inline-block border border-grey rounded pl-4 pb-1 pr-4"
                                    >
                                      <Label>Change TCR value</Label>
                                    </span>
                                  </PopoverTrigger>
                                  <PopoverContent>
                                    <Label>Provide a new target collateral ratio</Label>
                                    <Input
                                      placeholder={tcrValue}
                                      className="mb-2 mt-1"
                                      onChange={(event) => {
                                        const input = event.target.value;
                                        const regex = /^[0-9]*\.?[0-9]*$/;
                                        if (input && input.length && regex.test(input)) {
                                          debouncedSetTCRValue(input, parsedBitasset.mcr);
                                        }
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </span>
                            </span>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  <FormField
                    control={form.control}
                    name="networkFee"
                    render={({ field }) => (
                      <FormItem className="mb-1 mt-3">
                        <FormLabel>Network broadcast fee</FormLabel>
                        <FormDescription>
                          The fee required to broadcast your call order update operation onto the
                          blockchain
                        </FormDescription>
                        <FormControl>
                          <Input disabled placeholder={fee ? `${fee} BTS` : ""} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button className="mt-5 mb-3" type="submit">
                    Submit
                  </Button>
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
                You can use this form to borrow this smartcoin into existence, given sufficient
                collateral.
                <br />
                Thoroughly research assets before continuing, know your risk exposure and
                tolerances.
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
                          <span className="grid grid-cols-2 mt-2">
                            <span className="col-span-1 mt-1">Asset to borrow</span>
                            <span className="col-span-1 text-right">
                              <Badge>Change asset</Badge>
                            </span>
                          </span>
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
                          <Input disabled className="mb-3 mt-3" placeholder="" readOnly />
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
                        <FormDescription style={{ marginTop: 0, paddingTop: 0 }}>
                          <span className="grid grid-cols-3 mt-0 pt-0">
                            <span className="col-span-2 mt-0 pt-0 text-sm">
                              The amount of ? you intend to borrow into existence.
                            </span>
                            <span className="col-span-1 text-right text-sm">Available: 0 ?</span>
                          </span>
                        </FormDescription>
                        <FormControl>
                          <span className="grid grid-cols-12 gaps-2">
                            <span className="col-span-1">
                              <Toggle variant="outline">
                                <LockOpen2Icon className="h-4 w-4" />
                              </Toggle>
                            </span>
                            <span className="col-span-9">
                              <Input
                                label={`Amount of debt to issue`}
                                placeholder="0"
                                className="mb-3"
                                disabled
                                readOnly
                              />
                            </span>
                            <span className="col-span-2 ml-3">
                              <Button variant="outline">Change</Button>
                            </span>
                          </span>
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
                        <FormDescription style={{ marginTop: 0, paddingTop: 0 }}>
                          <span className="grid grid-cols-3 mt-0 pt-0">
                            <span className="col-span-2 mt-0 pt-0 text-sm">
                              The amount of ? backing collateral you'll need to provide.
                            </span>
                            <span className="col-span-1 text-right text-sm">Available: 0 ?</span>
                          </span>
                        </FormDescription>
                        <FormControl>
                          <span className="grid grid-cols-12 gaps-2">
                            <span className="col-span-1">
                              <Toggle variant="outline">
                                <LockOpen2Icon className="h-4 w-4" />
                              </Toggle>
                            </span>
                            <span className="col-span-9">
                              <Input
                                label={`Amount of collateral to commit`}
                                placeholder="0"
                                className="mb-3"
                                disabled
                                readOnly
                              />
                            </span>
                            <span className="col-span-2 ml-3">
                              <Button variant="outline">Change</Button>
                            </span>
                          </span>
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
                          <span className="grid grid-cols-12">
                            <span className="col-span-1">
                              <Toggle variant="outline">
                                <LockOpen2Icon className="h-4 w-4" />
                              </Toggle>
                            </span>
                            <span className="col-span-11">
                              <Input
                                label={`Ratio of collateral to debt`}
                                value={ratioValue}
                                placeholder={ratioValue}
                                className="mb-3"
                                disabled
                                readOnly
                              />
                            </span>
                          </span>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Slider defaultValue={[2]} max={20} min={1.4} step={0.01} />
                  <br />
                  <span className="items-top flex space-x-2">
                    <Checkbox id="terms1" />
                    <span className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="terms1"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Enable Target Collateral Ratio
                      </label>
                    </span>
                  </span>

                  <FormField
                    control={form.control}
                    name="networkFee"
                    render={({ field }) => (
                      <FormItem className="mb-1 mt-3">
                        <FormLabel>Network broadcast fee</FormLabel>
                        <FormDescription>
                          The fee required to broadcast your call order update operation onto the
                          blockchain
                        </FormDescription>
                        <FormControl>
                          <Input disabled readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button className="mt-5 mb-3" variant="outline" disabled type="submit">
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
                    This smartcoin currently has a settlement fund and so is likely in a form of
                    global settlement.
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
                        {(1 / currentFeedSettlementPrice).toFixed(parsedAsset.p)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      Funding ratio
                      <br />
                      <span className="text-sm">
                        {(
                          (1 / currentFeedSettlementPrice / settlementFund.finalSettlementPrice) *
                          100
                        ).toFixed(2)}
                        {" % ("}
                        <span className="text-red-500">
                          {"-"}
                          {(
                            100 -
                            (1 / currentFeedSettlementPrice / settlementFund.finalSettlementPrice) *
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

        {individualSettlementFund && individualSettlementFund._debt ? (
          <>
            <div className="grid grid-cols-1 mt-2 mb-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>{finalAsset.symbol} individual settlement fund</CardTitle>
                  <CardDescription>
                    This smartcoin currently has an individual settlement fund.
                    <br />
                    These funds can be bid on.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4">
                    <div className="col-span-1">
                      Fund
                      <br />
                      <span className="text-sm">
                        {individualSettlementFund._fund}
                        <br />
                        {parsedCollateralAsset.s}
                      </span>
                    </div>
                    <div className="col-span-1">
                      Debt
                      <br />
                      <span className="text-sm">
                        {individualSettlementFund._debt}
                        <br />
                        {parsedAsset.s}
                      </span>
                    </div>
                    <div className="col-span-1">
                      Feed price
                      <br />
                      <span className="text-sm">
                        {currentFeedSettlementPrice.toFixed(parsedAsset.p)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      Funding ratio
                      <br />
                      <span className="text-sm">
                        {(
                          ((individualSettlementFund._debt * currentFeedSettlementPrice) /
                            individualSettlementFund._fund) *
                          100
                        ).toFixed(2)}
                        {" % ("}
                        <span className="text-red-500">
                          {"-"}
                          {(
                            100 -
                            ((individualSettlementFund._debt * currentFeedSettlementPrice) /
                              individualSettlementFund._fund) *
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

        {usrMarginPositions && usrMarginPositions.length ? <UsrMarginPositionCard /> : null}

        {!invalidUrlParams && finalAsset && parsedAsset && parsedBitasset ? (
          <AboutAssetCard
            assetInfo={parsedAsset}
            bitassetInfo={parsedBitasset}
            fullAssetInfo={finalAsset}
            fullBitassetInfo={finalBitasset}
            type="debt"
            assetInfoFlags={parsedAssetFlags}
            assetPermissions={debtPermissions}
          />
        ) : null}

        {!invalidUrlParams && (!finalAsset || !parsedAsset || !parsedBitasset) ? (
          <Card className="mt-2">
            <CardHeader className="pb-2">
              <CardTitle>
                <div className="grid grid-cols-8">
                  <div className="col-span-6">About smartcoin asset</div>
                  <div className="col-span-2 text-right">
                    <Button variant="outline" className="h-5">
                      View JSON
                    </Button>
                  </div>
                </div>
              </CardTitle>
              <CardDescription>
                Use this information to improve your understanding
                <br />
                Thoroughly do your own research before proceeding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2">
                <div className="col-span-1">
                  <Label>General asset info</Label>
                </div>
                <div className="col-span-1 text-right">
                  <Button variant="outline" classnamecontents="h-5 mb-2">
                    View asset on blocksights.info
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-11 gap-1 w-full text-sm">
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={"Issuer"} button="" />
                    <EmptyRow title={"Maximum supply"} button="" />
                    <EmptyRow title={"Min quantity"} button="" />
                    <EmptyRow title={"Precision"} button="" />
                  </div>
                </div>
                <div className="col-span-1 flex justify-center items-center">
                  <Separator orientation="vertical" />
                </div>
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={"Market fee"} button="" />
                    <EmptyRow title={"Taker fee percent"} button="" />
                    <EmptyRow title={"Reward percent"} button="" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="col-span-1">
                  <Label>Smartcoin info</Label>
                </div>
                <div className="col-span-1 text-right">
                  <Button variant="outline" classnamecontents="h-5 mb-2">
                    View bitasset on blocksights.info
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-11 gap-1 w-full text-sm">
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={"Collateral asset"} button="" />
                    <EmptyRow title={"MCR"} button="" />
                    <EmptyRow title={"MSSR"} button="" />
                    <EmptyRow title={"ICR"} button="" />
                    <EmptyRow title={"Feed qty"} button="" />
                    <EmptyRow title={"Settlement offset"} button="" />
                  </div>
                </div>
                <div className="col-span-1 flex justify-center items-center">
                  <Separator orientation="vertical" />
                </div>
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={"Market fee"} button="" />
                  </div>
                </div>
              </div>

              <Label className="pb-0">Asset flags</Label>
              <br />
              <span className="text-sm"> </span>
              <br />
              <Label>Asset permissions</Label>
              <br />
              <span className="text-sm"> </span>
            </CardContent>
          </Card>
        ) : null}

        {!invalidUrlParams && finalCollateralAsset && parsedCollateralAsset ? (
          <AboutAssetCard
            assetInfo={parsedCollateralAsset}
            bitassetInfo={parsedCollateralBitasset ?? {}}
            fullAssetInfo={finalCollateralAsset}
            fullBitassetInfo={finalCollateralBitasset ?? {}}
            type="collateral"
            assetInfoFlags={collateralFlags}
            assetPermissions={collateralPermissions}
          />
        ) : null}

        {!invalidUrlParams && (!finalCollateralAsset || !parsedCollateralAsset) ? (
          <Card className="mt-2">
            <CardHeader className="pb-2">
              <CardTitle>
                <div className="grid grid-cols-8">
                  <div className="col-span-6">About</div>
                  <div className="col-span-2 text-right">
                    <Button variant="outline" className="h-5">
                      View JSON
                    </Button>
                  </div>
                </div>
              </CardTitle>
              <CardDescription>
                Use this information to improve your understanding
                <br />
                Thoroughly do your own research before proceeding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2">
                <div className="col-span-1">
                  <Label>General asset info</Label>
                </div>
                <div className="col-span-1 text-right">
                  <Button variant="outline" classnamecontents="h-5 mb-2">
                    View asset on blocksights.info
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-11 gap-1 w-full text-sm">
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={"Issuer"} button="" />
                    <EmptyRow title={"Maximum supply"} button="" />
                    <EmptyRow title={"Min quantity"} button="" />
                    <EmptyRow title={"Precision"} button="" />
                  </div>
                </div>
                <div className="col-span-1 flex justify-center items-center">
                  <Separator orientation="vertical" />
                </div>
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={"Market fee"} button="" />
                    <EmptyRow title={"Taker fee percent"} button="" />
                    <EmptyRow title={"Reward percent"} button="" />
                  </div>
                </div>
              </div>

              <br />

              <Label className="pb-0">Asset flags</Label>
              <br />
              <span className="text-sm"> </span>
              <br />
              <Label>Asset permissions</Label>
              <br />
              <span className="text-sm"> </span>
            </CardContent>
          </Card>
        ) : null}

        {showDialog && trxJSON ? (
          <DeepLinkDialog
            operationName="call_order_update"
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            key={`Borrowing${parsedAsset.s}with${parsedCollateralAsset.s}backingcollateral`}
            headerText={`Borrowing ${parsedAsset.s} with ${parsedCollateralAsset.s} backing collateral`}
            trxJSON={[trxJSON]}
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
                    <TabsTrigger value="buy" onClick={() => setActiveOrderTab("buy")}>
                      View buy orders
                    </TabsTrigger>
                  )}
                  {activeOrderTab === "sell" ? (
                    <TabsTrigger value="sell" style={activeTabStyle}>
                      Viewing sell orders
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger value="sell" onClick={() => setActiveOrderTab("sell")}>
                      View sell orders
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="buy">
                  {buyOrders && buyOrders.length ? (
                    <>
                      <div className="grid grid-cols-4">
                        <div className="col-span-1">Price</div>
                        <div className="col-span-1">{parsedCollateralAsset.s}</div>
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
                  {buyOrders && !buyOrders.length ? "No buy orders found" : null}
                  {!buyOrders ? "Loading..." : null}
                </TabsContent>
                <TabsContent value="sell">
                  {sellOrders && sellOrders.length ? (
                    <>
                      <div className="grid grid-cols-4">
                        <div className="col-span-1">Price</div>
                        <div className="col-span-1">{parsedAsset.s}</div>
                        <div className="col-span-1">{parsedCollateralAsset.s}</div>
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
                  {sellOrders && !sellOrders.length ? "No sell orders found" : null}
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
              <CardDescription>Check out other users margin positions on the dex</CardDescription>
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
              {assetCallOrders && !assetCallOrders.length ? "No call orders found" : null}
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
              <CardDescription>Check out other users settle orders on the dex</CardDescription>
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
              {assetSettleOrders && !assetSettleOrders.length ? "No settle orders found" : null}
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
              {finalBitasset && !finalBitasset.feeds.length ? "No smartcoin feeds found..." : null}
              {!finalBitasset ? "Loading..." : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 mt-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Risks associated with collateral debt positions</CardTitle>
            <CardDescription>
              Please thouroughly do your own research into smartcoins/bitassets before proceeding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            Internal risk factors to consider
            <br />
            <span className="text-sm">
              <Label className="mb-0 pb-0 text-lg">
                Risks associated with the debt and collateral assets
              </Label>
              <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
                <li>
                  By opening a margin position you accept the risk loss of some or all of your
                  collateral.
                </li>
                <li>
                  By holding a smartcoin you accept the risk that the backing collateral will fail
                  to reflect the intended reference feed price, leading to loss of smartcoin value.
                </li>
                <li>
                  These assets can be user created, as such their settings and published price feeds
                  will be radically different. Thoroughly research each asset using the blocksights
                  explorer, and through word of mouth, before opening margin positions.
                </li>
                <li>
                  The committee-owned "bitAssets", which are the original branded smartcoins, can be
                  considered to have a more stable smartcoin settings as a committee of Bitshares
                  users need to come to an agreement on all configurations. These are elected roles
                  however, so you should participate in the voting system to ensure the
                  decentralization of the committee.
                </li>
                <li>
                  Smartcoins which use other smartcoins as backing collateral are possible, however
                  you should be aware of the additional risks you're exposing yourself to.
                </li>
                <li>
                  If you purchase a smartcoin which uses an exchange backed asset (EBA) as backing
                  collateral, and then claim the backing collateral, the gateway may impose
                  additional KYC/AML requirements on you.
                </li>
              </ul>
            </span>
            <br />
            External risk factors to consider
            <br />
            <span className="text-sm">
              <Label className="mb-0 pb-0 text-lg">Price feed exposure</Label>
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                <li>
                  Smartcoin price feed calculations reference the value of an external asset in
                  terms of backing collateral, as such if either the reference or collateral assets
                  price fluctuates then you are directly exposed to this risk.
                </li>
                <li>
                  If the reference asset were to cease to exist, then the smartcoin external
                  reference asset value will become invalid; global settlement could be the
                  smartcoin owner's response.
                </li>
              </ul>
              <Label className="mb-0 pb-0 text-lg">Price feed publisher activity</Label>
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                <li>
                  Price feed publishing scripts could run into issues if external asset reference
                  sources go offline, potentially resulting in a period of price feed inactivity.
                </li>
                <li>
                  Privately owned smartcoins require the development of custom price feed scripts,
                  such code could be unstable if the smartcoin's price feeding strategy rollout is
                  rushed. Before creating a margin position, look into the price feed publishing
                  strategy and feed scripts in use, this will reduce your risk exposure.
                </li>
                <li>
                  Publishing a price feed has an associated fee, which could cause a price feed
                  publisher to stop publishing if they exhaust their BTS balance, resulting in a
                  lack of price feeds until they replenish their account's balance.
                </li>
                <li>
                  Price feed publishers may disagree on the how to calculate the price feed,
                  resulting in unexected price feed volatility. There are several privatized
                  smartcoins which attempt to use different smartcoin collateralization strategies
                  for this reason.
                </li>
              </ul>
              <Label className="mb-0 pb-0 text-lg">
                Exposure to EBA backing asset blockchain downtime
              </Label>
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                <li>
                  If you've used an EBA as backing collateral and want to close/adjust your margin
                  position at a later date, if the gateway deposit service is down you may be unable
                  to deposit sufficient collateral to avoid being margin called.
                </li>
              </ul>
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 mt-5">
        {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}
      </div>
    </div>
  );
}
