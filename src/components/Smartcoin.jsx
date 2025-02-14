import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { useForm } from "react-hook-form";
import { LockOpen2Icon, LockClosedIcon } from "@radix-ui/react-icons";
import { useStore } from "@nanostores/react";
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

import { humanReadableFloat, getFlagBooleans, debounce, blockchainFloat } from "@/lib/common.js";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createFullSmartcoinStore } from "@/nanoeffects/FullSmartcoin.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import DeepLinkDialog from "./common/DeepLinkDialog";
import ExternalLink from "./common/ExternalLink.jsx";
import CardRow from "./common/CardRow.jsx";
import EmptyRow from "./common/EmptyRow.jsx";

const activeTabStyle = {
  backgroundColor: "#252526",
  color: "white",
};

function timeAgo(dateString, t) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMilliseconds = now - date;
  const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

  if (diffInDays < 1) {
    return t("Smartcoin:today");
  } else if (diffInDays < 30) {
    return t("Smartcoin:daysAgo", { days: diffInDays });
  } else {
    const diffInMonths = Math.floor(diffInDays / 30);
    return t("Smartcoin:monthsAgo", { months: diffInMonths });
  }
}

export default function Smartcoin(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNode = useStore($currentNode);

  const tips = {
    charge_market_fee: t("Smartcoin:chargeMarketFee"),
    white_list: t("Smartcoin:whiteList"),
    override_authority: t("Smartcoin:overrideAuthority"),
    transfer_restricted: t("Smartcoin:transferRestricted"),
    disable_force_settle: t("Smartcoin:disableForceSettle"),
    global_settle: t("Smartcoin:globalSettle"),
    disable_confidential: t("Smartcoin:disableConfidential"),
    witness_fed_asset: t("Smartcoin:witnessFedAsset"),
    committee_fed_asset: t("Smartcoin:committeeFedAsset"),
    disable_collateral_bidding: t("Smartcoin:disableCollateralBidding"),
  };

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const {
    _assetsBTS,
    _assetsTEST,
    _bitAssetDataBTS,
    _bitAssetDataTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _globalParamsBTS,
    _globalParamsTEST
  } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const bitAssetData = useMemo(() => {
    if (_chain && (_bitAssetDataBTS || _bitAssetDataTEST)) {
      return _chain === "bitshares" ? _bitAssetDataBTS : _bitAssetDataTEST;
    }
    return [];
  }, [_bitAssetDataBTS, _bitAssetDataTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 3);
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const parsedUrlParams = useMemo(() => {
    if (marketSearch && marketSearch.length && window.location.search) {
      //console.log("Parsing url params");
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

  const [usrBalances, setUsrBalances] = useState();
  /*
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = data.filter((balance) =>
            assets.find((x) => x.id === balance.asset_id)
          );
          setUsrBalances(filteredData);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr]);
  */

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
      const smartcoinDataStore = createFullSmartcoinStore([
        usr.chain,
        parsedAsset.id,
        parsedBitasset.collateral,
        parsedBitasset.id,
        parsedCollateralBitasset && parsedCollateralBitasset.id ? parsedCollateralBitasset.id : "",
        usr.id,
        currentNode ? currentNode.url : null,
      ]);
      unsub = smartcoinDataStore.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          const filteredData = data[0].filter((balance) =>
            assets.find((x) => x.id === balance.asset_id)
          );
          setUsrBalances(filteredData);
          setFinalAsset(data[1]);
          setFinalCollateralAsset(data[2]);
          setFinalBitasset(data[3]);
          if (data[4].id) {
            setFinalCollateralBitasset(data[4]);
          }
          setUsrMarginPositions(data[5]);
          setAssetCallOrders(data[6]);
          setAssetSettleOrders(data[7]);
          setBuyOrders(data[8].asks);
          setSellOrders(data[8].bids);
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [parsedAsset, parsedBitasset, usr]);

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

  const currentFeedSettlementPrice = useMemo(() => {
    if (finalBitasset && finalBitasset.current_feed && parsedCollateralAsset && parsedAsset) {
      return parseFloat(
        (
          humanReadableFloat(
            parseInt(
              individualSettlementFund && individualSettlementFund._debt
                ? finalBitasset.median_feed.settlement_price.quote.amount
                : finalBitasset.current_feed.settlement_price.quote.amount
            ),
            parsedCollateralAsset.p
          ) /
          humanReadableFloat(
            parseInt(
              individualSettlementFund && individualSettlementFund._debt
                ? finalBitasset.median_feed.settlement_price.base.amount
                : finalBitasset.current_feed.settlement_price.base.amount
            ),
            parsedAsset.p
          )
        ).toFixed(parsedCollateralAsset.p)
      );
    }
  }, [finalBitasset, parsedAsset, parsedCollateralAsset, individualSettlementFund]);

  const individualSettlementPrice = useMemo(() => {
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
      const regex = /^[0-9]*\.?[0-9]*$/;
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
            {t("Smartcoin:currentMarginPosition", {
              asset: parsedAsset.s,
              id: parsedAsset.id,
            })}
          </CardTitle>
          <CardDescription>{t("Smartcoin:marginPositionDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {t("Smartcoin:balance")}
          <b>{debtAssetHoldings ?? 0}</b>
          {parsedAsset ? ` ${parsedAsset.s}` : " ?"}
          <br />
          {t("Smartcoin:debt")}
          <b>{humanReadableFloat(usrMarginPositions[0].debt, parsedAsset.p)}</b> {parsedAsset.s}
          <br />
          {t("Smartcoin:collateralAtRisk")}
          <b>
            {humanReadableFloat(usrMarginPositions[0].collateral, parsedCollateralAsset.p)}
          </b>{" "}
          {parsedCollateralAsset.s}
          <br />
          {t("Smartcoin:currentRatio")}
          <b>{ratio}</b>
          <br />
          {t("Smartcoin:marginCallPrice")}
          <b>{callPrice}</b> {parsedCollateralAsset.s}
          {" ("}
          {(1 / callPrice).toFixed(parsedAsset.p)} {parsedAsset.s}/{parsedCollateralAsset.s}
          {")"}
          {tcr ? (
            <>
              <br />
              {t("Smartcoin:targetCollateralRatio")}
              <b>{tcr}</b>
            </>
          ) : null}
          <br />
          <Button className="mt-3 mr-2" onClick={() => setShowClosePositionDialog(true)}>
            {t("Smartcoin:closePosition")}
          </Button>
          <a
            href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${parsedAsset.s}`}
          >
            <Button className="mr-2">{t("Smartcoin:borrow", { asset: parsedAsset.s })}</Button>
          </a>
          <a href={`/dex/index.html?market=${parsedAsset.s}_${parsedCollateralAsset.s}`}>
            <Button className="mr-2">
              {t("Smartcoin:buyWith", { asset1: parsedAsset.s, asset2: parsedCollateralAsset.s })}
            </Button>
          </a>
          {showClosePositionDialog ? (
            <DeepLinkDialog
              operationNames={["call_order_update"]}
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setShowClosePositionDialog}
              key={`Closing${parsedAsset.s}debtposition`}
              headerText={t("Smartcoin:closingDebtPosition", { asset: parsedAsset.s })}
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
                {type === "debt"
                  ? t("Smartcoin:aboutAsset", {
                      assetType: bitassetInfo.issuer.id === "1.2.0" ? "Bitasset" : "Smartcoin",
                      asset: assetInfo.s,
                      id: assetInfo.id,
                    })
                  : t("Smartcoin:aboutBackingCollateral", { asset: assetInfo.s, id: assetInfo.id })}
              </div>
              <div className="col-span-2 text-right">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-5">
                      {t("Smartcoin:viewJSON")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-white">
                    <DialogHeader>
                      <DialogTitle>
                        {t("Smartcoin:jsonSummaryData", { asset: assetInfo.s })}
                      </DialogTitle>
                      <DialogDescription>{t("Smartcoin:dataUsedToRender")}</DialogDescription>
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
            {type === "debt"
              ? t("Smartcoin:researchBeforeBorrow", { asset: assetInfo.s })
              : t("Smartcoin:researchBeforeBacking", { asset: assetInfo.s })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2">
            <div className="col-span-1">
              <Label>{t("Smartcoin:generalAssetInfo")}</Label>
            </div>
            <div className="col-span-1 text-right">
              <ExternalLink
                classnamecontents="h-5 mb-2"
                variant="outline"
                type="button"
                text={t("Smartcoin:viewAssetOnBlocksights")}
                hyperlink={`https://blocksights.info/#/assets/${assetInfo.id}${
                  usr.chain === "bitshares" ? "" : "?network=testnet"
                }`}
              />
            </div>
          </div>
          <div className="grid grid-cols-11 gap-1 w-full text-sm">
            <div className="col-span-5">
              <div className="grid grid-cols-1 gap-1 w-full text-sm">
                <CardRow
                  title={t("Smartcoin:issuer")}
                  button={assetInfo.u.split(" ")[0]}
                  dialogtitle={t("Smartcoin:issuerOfAsset", { asset: assetInfo.s })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:issuerDetail1")}</li>
                      <li>{t("Smartcoin:issuerDetail2")}</li>
                      <li>{t("Smartcoin:issuerDetail3")}</li>
                      <li>{t("Smartcoin:issuerDetail4")}</li>
                      <ExternalLink
                        classnamecontents="h-8 mb-2 mt-3"
                        type="button"
                        text={t("Smartcoin:viewIssuerOnBlocksights")}
                        hyperlink={`https://blocksights.info/#/accounts/${
                          assetInfo.u.split(" ")[0]
                        }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                      />
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutAssetIssuer")}
                />
                <CardRow
                  title={t("Smartcoin:maximumSupply")}
                  button={humanReadableFloat(
                    fullAssetInfo.options.max_supply,
                    fullAssetInfo.precision
                  )}
                  dialogtitle={t("Smartcoin:maximumSupplyOfAsset", { asset: assetInfo.s })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:maximumSupplyDetail")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreInfoOnMaxSupply")}
                />

                <CardRow
                  title={t("Smartcoin:minQuantity")}
                  button={humanReadableFloat(1, fullAssetInfo.precision)}
                  dialogtitle={t("Smartcoin:minQuantityOfAsset", { asset: assetInfo.s })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:minQuantityDetail1")}</li>
                      <li>{t("Smartcoin:minQuantityDetail2")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutMinQuantity")}
                />

                <CardRow
                  title={t("Smartcoin:precision")}
                  button={fullAssetInfo.precision}
                  dialogtitle={t("Smartcoin:precisionOfAsset", { asset: assetInfo.s })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:precisionDetail")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutAssetPrecision")}
                />
              </div>
            </div>
            <div className="col-span-1 flex justify-center items-center">
              <Separator orientation="vertical" />
            </div>
            <div className="col-span-5">
              <div className="grid grid-cols-1 gap-1 w-full text-sm">
                <CardRow
                  title={t("Smartcoin:marketFee")}
                  button={`${
                    fullAssetInfo.options.market_fee_percent
                      ? fullAssetInfo.options.market_fee_percent / 100
                      : 0
                  }%`}
                  dialogtitle={t("Smartcoin:marketFeeOfAsset", { asset: assetInfo.s })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:marketFeeDetail1")}</li>
                      <li>{t("Smartcoin:marketFeeDetail2")}</li>
                      <li>{t("Smartcoin:marketFeeDetail3")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutMarketFee")}
                />

                <CardRow
                  title={t("Smartcoin:takerFeePercent")}
                  button={`${
                    fullAssetInfo.options.extensions.taker_fee_percent
                      ? fullAssetInfo.options.extensions.taker_fee_percent / 100
                      : 0
                  }%`}
                  dialogtitle={t("Smartcoin:takerFeePercentOfAsset", { asset: assetInfo.s })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:takerFeePercentDetail")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutTakerFeePercent")}
                />

                <CardRow
                  title={t("Smartcoin:rewardPercent")}
                  button={
                    fullAssetInfo.options.extensions.reward_percent
                      ? fullAssetInfo.options.extensions.reward_percent / 100
                      : 0
                  }
                  dialogtitle={t("Smartcoin:rewardPercentOfAsset", { asset: assetInfo.s })}
                  dialogdescription={
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>{t("Smartcoin:rewardPercentDetail")}</li>
                    </ul>
                  }
                  tooltip={t("Smartcoin:moreAboutRewardPercent")}
                />
              </div>
            </div>
          </div>

          {bitassetInfo && bitassetInfo.id ? (
            <>
              <div className="grid grid-cols-2">
                <div className="col-span-1">
                  <Label>
                    {bitassetInfo.issuer.id === "1.2.0"
                      ? t("Smartcoin:bitassetInfo")
                      : t("Smartcoin:smartcoinInfo")}
                  </Label>
                </div>
                <div className="col-span-1 text-right">
                  <ExternalLink
                    classnamecontents="h-5 mb-2"
                    variant="outline"
                    type="button"
                    text={t("Smartcoin:viewBitassetOnBlocksights")}
                    hyperlink={`https://blocksights.info/#/objects/${bitassetInfo.id}${
                      usr.chain === "bitshares" ? "" : "?network=testnet"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-11 gap-1 w-full text-sm">
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <CardRow
                      title={t("Smartcoin:collateralAsset")}
                      button={parsedCollateralAsset ? parsedCollateralAsset.s : ""}
                      dialogtitle={t("Smartcoin:collateralAssetOfSmartcoin", {
                        asset: assetInfo.s,
                      })}
                      dialogdescription={
                        <ul className="ml-2 list-disc [&>li]:mt-2">
                          <li>{t("Smartcoin:collateralAssetDetail")}</li>
                        </ul>
                      }
                      tooltip={t("Smartcoin:moreAboutCollateralAsset")}
                    />

                    <CardRow
                      title={t("Smartcoin:MCR")}
                      button={`${bitassetInfo ? bitassetInfo.mcr / 10 : 0} %`}
                      dialogtitle={t("Smartcoin:MCRofAsset", { asset: assetInfo.s })}
                      dialogdescription={
                        <ul className="ml-2 list-disc [&>li]:mt-2">
                          <li>{t("Smartcoin:MCRDetail")}</li>
                        </ul>
                      }
                      tooltip={t("Smartcoin:moreAboutMCR")}
                    />

                    <CardRow
                      title={t("Smartcoin:MSSR")}
                      button={`${bitassetInfo ? bitassetInfo.mssr / 10 : 0} %`}
                      dialogtitle={t("Smartcoin:MSSROfAsset", { asset: assetInfo.s })}
                      dialogdescription={
                        <ul className="ml-2 list-disc [&>li]:mt-2">
                          <li>{t("Smartcoin:MSSRDetail")}</li>
                        </ul>
                      }
                      tooltip={t("Smartcoin:moreAboutMSSR")}
                    />

                    <CardRow
                      title={t("Smartcoin:ICR")}
                      button={`${bitassetInfo ? bitassetInfo.icr / 10 : 0} %`}
                      dialogtitle={t("Smartcoin:ICROfAsset", { asset: assetInfo.s })}
                      dialogdescription={
                        <ul className="ml-2 list-disc [&>li]:mt-2">
                          <li>{t("Smartcoin:ICRDetail")}</li>
                        </ul>
                      }
                      tooltip={t("Smartcoin:moreAboutICR")}
                    />

                    <CardRow
                      title={t("Smartcoin:feedQty")}
                      button={bitassetInfo ? bitassetInfo.feeds.length : 0}
                      dialogtitle={t("Smartcoin:feedQtyOfAsset", { asset: assetInfo.s })}
                      dialogdescription={
                        <ul className="ml-2 list-disc [&>li]:mt-2">
                          <li>{t("Smartcoin:feedQtyDetail1")}</li>
                          <li>{t("Smartcoin:feedQtyDetail2")}</li>
                          <li>{t("Smartcoin:feedQtyDetail3")}</li>
                          <li>{t("Smartcoin:feedQtyDetail4")}</li>
                          <li>{t("Smartcoin:feedQtyDetail5")}</li>
                        </ul>
                      }
                      tooltip={t("Smartcoin:moreAboutFeedQty")}
                    />

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.force_settlement_offset_percent ? (
                      <CardRow
                        title={t("Smartcoin:settlementOffset")}
                        button={`${
                          fullBitassetInfo.options.force_settlement_offset_percent / 100
                        }%`}
                        dialogtitle={t("Smartcoin:settlementOffsetOfAsset", { asset: assetInfo.s })}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>{t("Smartcoin:settlementOffsetDetail")}</li>
                          </ul>
                        }
                        tooltip={t("Smartcoin:moreAboutSettlementOffset")}
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
                        title={t("Smartcoin:settlementFee")}
                        button={`${
                          fullBitassetInfo.options.extensions.force_settle_fee_percent / 100
                        }%`}
                        dialogtitle={t("Smartcoin:settlementFeeOfAsset", { asset: assetInfo.s })}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>{t("Smartcoin:settlementFeeDetail")}</li>
                          </ul>
                        }
                        tooltip={t("Smartcoin:moreAboutSettlementFee")}
                      />
                    ) : null}

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.margin_call_fee_ratio ? (
                      <CardRow
                        title={t("Smartcoin:marginCallFee")}
                        button={`${
                          fullBitassetInfo.options.extensions.margin_call_fee_ratio / 100
                        }%`}
                        dialogtitle={t("Smartcoin:marginCallFeeOfAsset", { asset: assetInfo.s })}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>{t("Smartcoin:marginCallFeeDetail1")}</li>
                            <li>{t("Smartcoin:marginCallFeeDetail2")}</li>
                          </ul>
                        }
                        tooltip={t("Smartcoin:moreAboutMarginCallFee")}
                      />
                    ) : null}

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.black_swan_response_method ? (
                      <CardRow
                        title={t("Smartcoin:BSRM")}
                        button={fullBitassetInfo.options.extensions.black_swan_response_method}
                        dialogtitle={t("Smartcoin:BSRMOfAsset", { asset: assetInfo.s })}
                        dialogdescription={
                          <ScrollArea className="h-72">
                            <ul className="ml-2 list-disc [&>li]:mt-2 text-sm">
                              <li>{t("Smartcoin:BSRMDetail1")}</li>
                              <li>
                                <b>{t("Smartcoin:globalSettlement")}</b>
                                <br />
                                {t("Smartcoin:globalSettlementDetail")}
                              </li>
                              <li>
                                <b>{t("Smartcoin:noSettlement")}</b>
                                <br />
                                {t("Smartcoin:noSettlementDetail")}
                              </li>
                              <li>
                                <b>{t("Smartcoin:individualSettlementToFund")}</b>
                                <br />
                                {t("Smartcoin:individualSettlementToFundDetail")}
                              </li>
                              <li>
                                <b>{t("Smartcoin:individualSettlementToOrder")}</b>
                                <br />
                                {t("Smartcoin:individualSettlementToOrderDetail")}
                              </li>
                            </ul>
                          </ScrollArea>
                        }
                        tooltip={t("Smartcoin:moreAboutBSRM")}
                      />
                    ) : null}

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.initial_collateral_ratio ? (
                      <CardRow
                        title={t("Smartcoin:manualICR")}
                        button={fullBitassetInfo.options.extensions.initial_collateral_ratio}
                        dialogtitle={t("Smartcoin:manualICROfAsset", { asset: assetInfo.s })}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>{t("Smartcoin:manualICRDetail")}</li>
                          </ul>
                        }
                        tooltip={t("Smartcoin:moreAboutManualICR")}
                      />
                    ) : null}

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.maintenance_collateral_ratio ? (
                      <CardRow
                        title={t("Smartcoin:manualMCR")}
                        button={fullBitassetInfo.options.extensions.maintenance_collateral_ratio}
                        dialogtitle={t("Smartcoin:manualMCROfAsset", { asset: assetInfo.s })}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>{t("Smartcoin:manualMCRDetail")}</li>
                          </ul>
                        }
                        tooltip={t("Smartcoin:moreAboutManualMCR")}
                      />
                    ) : null}

                    {fullBitassetInfo &&
                    fullBitassetInfo.options.extensions &&
                    fullBitassetInfo.options.extensions.maximum_short_squeeze_ratio ? (
                      <CardRow
                        title={t("Smartcoin:manualMSSR")}
                        button={fullBitassetInfo.options.extensions.maximum_short_squeeze_ratio}
                        dialogtitle={t("Smartcoin:manualMSSROfAsset", { asset: assetInfo.s })}
                        dialogdescription={
                          <ul className="ml-2 list-disc [&>li]:mt-2">
                            <li>{t("Smartcoin:manualMSSRDetail")}</li>
                          </ul>
                        }
                        tooltip={t("Smartcoin:moreAboutManualMSSR")}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <Label className="pb-0">{t("Smartcoin:assetFlags")}</Label>
          <br />
          {assetInfoFlags && assetInfoFlags.length ? (
            assetInfoFlags
          ) : (
            <span className="text-sm">{t("Smartcoin:noFlagsEnabled")}</span>
          )}
          <br />
          <Label>{t("Smartcoin:assetPermissions")}</Label>
          <br />
          {assetPermissions && assetPermissions.length ? (
            assetPermissions
          ) : (
            <span className="text-sm">{t("Smartcoin:noPermissionsEnabled")}</span>
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
            hyperlink={`https://blocksights.info/#/accounts/${res.borrower}${
              usr.chain === "bitshares" ? "" : "?network=testnet"
            }`}
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

    if (!reference || !res) {
      return null;
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
            hyperlink={`https://blocksights.info/#/accounts/${userID}${
              usr.chain === "bitshares" ? "" : "?network=testnet"
            }`}
          />
        </div>
        <div className="col-span-2 ml-1">{timeAgo(date, t)}</div>
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
              <CardTitle>{t("Smartcoin:invalidSmartcoinIdTitle")}</CardTitle>
              <CardDescription>{t("Smartcoin:invalidSmartcoinIdDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {t("Smartcoin:invalidSmartcoinIdContent1")}{" "}
              <a className="text-blue-500" href="/smartcoins/index.html">
                {t("Smartcoin:invalidSmartcoinIdContent2")}
              </a>{" "}
              {t("Smartcoin:invalidSmartcoinIdContent3")}
            </CardContent>
          </Card>
        ) : null}

        {!invalidUrlParams && parsedBitasset ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{t("Smartcoin:CDPFormTitle")}</CardTitle>
              <CardDescription>
                {t("Smartcoin:CDPFormDescription1")}
                <br />
                {t("Smartcoin:CDPFormDescription2")}
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
                        <FormLabel>{t("Smartcoin:borrowingAccount")}</FormLabel>
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
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="borrowAsset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Smartcoin:assetToBorrow")}</FormLabel>
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
                                  {t("Smartcoin:changeAssetButton")}
                                </Button>
                              </a>
                            </span>
                          </span>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>{t("Smartcoin:currentFeedPriceTitle")}</CardTitle>
                        <CardDescription>
                          {t("Smartcoin:currentFeedPriceDescription")}
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
                        <CardTitle>{t("Smartcoin:marginCallPriceTitle")}</CardTitle>
                        <CardDescription>
                          {t("Smartcoin:marginCallPriceDescription")}
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
                        <FormLabel>{t("Smartcoin:debtAmount")}</FormLabel>
                        <FormDescription style={{ marginTop: 0, paddingTop: 0 }}>
                          <span className="grid grid-cols-3 mt-0 pt-0">
                            <span className="col-span-2 mt-0 pt-0">
                              {t("Smartcoin:debtAmountDescription", {
                                asset: parsedAsset ? parsedAsset.s : "?",
                              })}
                            </span>
                            <span className="col-span-1 text-right">
                              {t("Smartcoin:debtAmountBalance", {
                                balance: debtAssetHoldings ?? "",
                                asset: parsedAsset ? parsedAsset.s : "",
                              })}
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
                                    ? t("Smartcoin:lockDebtAmount")
                                    : t("Smartcoin:debtAmountLocked")}
                                </HoverCardContent>
                              </HoverCard>
                            </span>
                            <span className="col-span-7">
                              <Input
                                label={t("Smartcoin:amountOfDebtToIssue")}
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
                                    <Label>{t("Smartcoin:changeDebtAmount")}</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>{t("Smartcoin:provideNewDebtAmount")}</Label>{" "}
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
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="collateralAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Smartcoin:collateralAmount")}</FormLabel>
                        <FormDescription style={{ marginTop: 0, paddingTop: 0 }}>
                          <span className="grid grid-cols-3 mt-0 pt-0">
                            <span className="col-span-2 mt-0 pt-0">
                              {t("Smartcoin:collateralAmountDescription", {
                                asset: parsedCollateralAsset ? parsedCollateralAsset.s : "?",
                              })}
                            </span>
                            <span className="col-span-1 text-right">
                              {t("Smartcoin:collateralAmountBalance", {
                                balance: collateralAssetHoldings ?? 0,
                                asset: parsedCollateralAsset ? parsedCollateralAsset.s : "",
                              })}
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
                                    ? t("Smartcoin:lockCollateralAmount")
                                    : t("Smartcoin:collateralAmountLocked")}
                                </HoverCardContent>
                              </HoverCard>
                            </span>
                            <span className="col-span-7">
                              <Input
                                label={t("Smartcoin:amountOfCollateralToCommit")}
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
                                    <Label>{t("Smartcoin:changeCollateralAmount")}</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>{t("Smartcoin:provideNewCollateralAmount")}</Label>{" "}
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
                        <FormLabel>{t("Smartcoin:collateralDebtRatio")}</FormLabel>
                        <FormDescription>
                          <span className="grid grid-cols-3 mt-0 pt-0">
                            <span className="col-span-2 mt-0 pt-0">
                              {t("Smartcoin:collateralDebtRatioDescription")}
                            </span>
                            <span className="col-span-1 text-right">
                              {t("Smartcoin:collateralDebtRatioMin", {
                                min: parsedBitasset.mcr / 1000,
                              })}
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
                                    ? t("Smartcoin:lockRatioValue")
                                    : t("Smartcoin:unlockRatioValue")}
                                </HoverCardContent>
                              </HoverCard>
                            </span>
                            <span className="col-span-7">
                              {ratioValue ? (
                                <Input
                                  label={t("Smartcoin:ratioOfCollateralToDebt")}
                                  placeholder={ratioValue}
                                  className="mb-3"
                                  disabled
                                  readOnly
                                />
                              ) : (
                                <Input
                                  label={t("Smartcoin:ratioOfCollateralToDebt")}
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
                                    <Label>{t("Smartcoin:changeRatioValue")}</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>{t("Smartcoin:provideNewRatio")}</Label>{" "}
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
                            {t("Smartcoin:debtCollateralRatioWarning", {
                              min: parsedBitasset.mcr / 1000,
                            })}
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
                            {t("Smartcoin:enableTargetCollateralRatio")}{" "}
                          </>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {tcrEnabled ? (
                    <FormField
                      control={form.control}
                      name="tcrValue"
                      render={({ field }) => (
                        <FormItem className="mt-0">
                          <FormLabel>{t("Smartcoin:targetCollateralRatioValue")}</FormLabel>
                          <FormDescription>
                            <span className="grid grid-cols-4 mt-0 pt-0">
                              <span className="col-span-3 mt-0 pt-0">
                                {t("Smartcoin:targetCollateralRatioDescription")}
                              </span>
                              <span className="col-span-1 text-right">
                                {t("Smartcoin:targetCollateralRatioMin", {
                                  min: parsedBitasset.mcr / 1000,
                                })}
                              </span>
                            </span>
                          </FormDescription>
                          <FormControl>
                            <span className="grid grid-cols-12">
                              <span className="col-span-8">
                                <Input
                                  label={t("Smartcoin:ratioOfCollateralToDebt")}
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
                                      <Label>{t("Smartcoin:changeTCRValue")}</Label>
                                    </span>
                                  </PopoverTrigger>
                                  <PopoverContent>
                                    <Label>{t("Smartcoin:provideNewTCR")}</Label>
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
                        </FormItem>
                      )}
                    />
                  ) : null}

                  <FormField
                    control={form.control}
                    name="networkFee"
                    render={({ field }) => (
                      <FormItem className="mb-1 mt-3">
                        <FormLabel>{t("Smartcoin:networkBroadcastFee")}</FormLabel>
                        <FormDescription>
                          {t("Smartcoin:networkBroadcastFeeDescription")}
                        </FormDescription>
                        <FormControl>
                          <Input disabled placeholder={fee ? `${fee} BTS` : ""} readOnly />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button className="mt-5 mb-3" type="submit">
                    {t("Smartcoin:submit")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : null}

        {!invalidUrlParams && !parsedBitasset ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("Smartcoin:collateralDebtPositionFormTitle")}</CardTitle>
              <CardDescription>
                {t("Smartcoin:collateralDebtPositionFormDescription")}
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
                        <FormLabel>{t("Smartcoin:account")}</FormLabel>{" "}
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
                            <span className="col-span-1 mt-1">{t("Smartcoin:assetToBorrow")}</span>
                            <span className="col-span-1 text-right">
                              <Badge>{t("Smartcoin:changeAsset")}</Badge>
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
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="callPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Smartcoin:yourCallPrice")}</FormLabel>{" "}
                        <FormControl>
                          <Input disabled className="mb-3 mt-3" value="" readOnly />
                        </FormControl>
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
                              {t("Smartcoin:amountToBorrowDescription")}
                            </span>
                            <span className="col-span-1 text-right text-sm">
                              {t("Smartcoin:availableToBorrow", { available: 0 })}
                            </span>
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
                              <Input placeholder="0" className="mb-3" disabled readOnly />
                            </span>
                            <span className="col-span-2 ml-3">
                              <Button variant="outline">{t("Smartcoin:change")}</Button>{" "}
                            </span>
                          </span>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="collateralAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Smartcoin:collateralAmountPlaceholder")}</FormLabel>
                        <FormDescription className="mt-0 pt-0">
                          <span className="grid grid-cols-3 mt-0 pt-0">
                            <span className="col-span-2 mt-0 pt-0 text-sm">
                              {t("Smartcoin:collateralAmountDescriptionPlaceholder")}
                            </span>
                            <span className="col-span-1 text-right text-sm">
                              {t("Smartcoin:availableCollateral", { available: 0 })}
                            </span>
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
                              <Input placeholder="0" className="mb-3" disabled readOnly />
                            </span>
                            <span className="col-span-2 ml-3">
                              <Button variant="outline">{t("Smartcoin:change")}</Button>
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
                        <FormLabel>{t("Smartcoin:ratioOfCollateralToDebt")}</FormLabel>{" "}
                        <FormControl>
                          <span className="grid grid-cols-12">
                            <span className="col-span-1">
                              <Toggle variant="outline">
                                <LockOpen2Icon className="h-4 w-4" />
                              </Toggle>
                            </span>
                            <span className="col-span-11">
                              <Input
                                value={ratioValue}
                                placeholder={ratioValue}
                                className="mb-3"
                                disabled
                                readOnly
                              />
                            </span>
                          </span>
                        </FormControl>
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
                        {t("Smartcoin:enableTargetCollateralRatio")}
                      </label>
                    </span>
                  </span>

                  <FormField
                    control={form.control}
                    name="networkFee"
                    render={({ field }) => (
                      <FormItem className="mb-1 mt-3">
                        <FormLabel>{t("Smartcoin:networkBroadcastFee")}</FormLabel>
                        <FormDescription>
                          {t("Smartcoin:networkBroadcastFeeDescription")}
                        </FormDescription>
                        <FormControl>
                          <Input disabled readOnly />
                        </FormControl>
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
                  <CardTitle>
                    {t("Smartcoin:settlementFundTitle", { symbol: finalAsset.symbol })}
                  </CardTitle>
                  <CardDescription>
                    {t("Smartcoin:settlementFundDescription")}
                    <br />
                    {t("Smartcoin:borrowingUnavailable")}{" "}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4">
                    <div className="col-span-1">
                      {t("Smartcoin:fund")}
                      <br />
                      <span className="text-sm">
                        {settlementFund.finalSettlementFund}
                        <br />
                        {parsedCollateralAsset.s}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {t("Smartcoin:settlementPrice")} <br />
                      <span className="text-sm">
                        {settlementFund.finalSettlementPrice}
                        <br />
                        {parsedAsset.s}/{parsedCollateralAsset.s}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {t("Smartcoin:currentPrice")}
                      <br />
                      <span className="text-sm">
                        {(1 / currentFeedSettlementPrice).toFixed(parsedAsset.p)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {t("Smartcoin:fundingRatio")}
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
                  <a href={`/settlement/index.html?id=${finalAsset.id}`}>
                    <Button className="mt-3 pb-2">
                      {t("Smartcoin:bidOnSettlementFund", { symbol: finalAsset.symbol })}
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
                  <CardTitle>
                    {t("Smartcoin:individualSettlementFund", { symbol: finalAsset.symbol })}
                  </CardTitle>{" "}
                  <CardDescription>
                    {t("Smartcoin:individualSettlementFundDescription")}
                    <br />
                    {t("Smartcoin:fundsCanBeBidOn")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4">
                    <div className="col-span-1">
                      {t("Smartcoin:fund")}
                      <br />
                      <span className="text-sm">
                        {individualSettlementFund._fund}
                        <br />
                        {parsedCollateralAsset.s}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {t("Smartcoin:debt2")}
                      <br />
                      <span className="text-sm">
                        {individualSettlementFund._debt}
                        <br />
                        {parsedAsset.s}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {t("Smartcoin:feedPrice")}
                      <br />
                      <span className="text-sm">
                        {individualSettlementPrice.toFixed(parsedAsset.p)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {t("Smartcoin:fundingRatio")}
                      <br />
                      <span className="text-sm">
                        {(
                          ((individualSettlementFund._debt * individualSettlementPrice) /
                            individualSettlementFund._fund) *
                          100
                        ).toFixed(2)}
                        {" % ("}
                        <span className="text-red-500">
                          {"-"}
                          {(
                            100 -
                            ((individualSettlementFund._debt * individualSettlementPrice) /
                              individualSettlementFund._fund) *
                              100
                          ).toFixed(2)}
                          {" %"}
                        </span>
                        {")"}
                      </span>
                    </div>
                  </div>
                  <a href={`/settlement/index.html?id=${finalAsset.id}`}>
                    <Button className="mt-3 pb-2">
                      {t("Smartcoin:bidOnSettlementFund", { symbol: finalAsset.symbol })}
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
                  <div className="col-span-6">{t("Smartcoin:aboutSmartcoinAsset")}</div>
                  <div className="col-span-2 text-right">
                    <Button variant="outline" className="h-5">
                      {t("Smartcoin:viewJson")}
                    </Button>
                  </div>
                </div>
              </CardTitle>
              <CardDescription>
                {t("Smartcoin:aboutSmartcoinAssetDescription")}
                <br />
                {t("Smartcoin:doYourOwnResearch")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2">
                <div className="col-span-1">
                  <Label>{t("Smartcoin:generalAssetInfo")}</Label>
                </div>
                <div className="col-span-1 text-right">
                  <Button variant="outline" classnamecontents="h-5 mb-2">
                    {t("Smartcoin:viewAssetOnBlocksights")}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-11 gap-1 w-full text-sm">
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={t("Smartcoin:issuer")} button="" />
                    <EmptyRow title={t("Smartcoin:maximumSupply")} button="" />
                    <EmptyRow title={t("Smartcoin:minQuantity")} button="" />
                    <EmptyRow title={t("Smartcoin:precision")} button="" />
                  </div>
                </div>
                <div className="col-span-1 flex justify-center items-center">
                  <Separator orientation="vertical" />
                </div>
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={t("Smartcoin:marketFee")} button="" />
                    <EmptyRow title={t("Smartcoin:takerFeePercent")} button="" />
                    <EmptyRow title={t("Smartcoin:rewardPercent")} button="" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="col-span-1">
                  <Label>{t("Smartcoin:smartcoinInfo")}</Label>
                </div>
                <div className="col-span-1 text-right">
                  <Button variant="outline" classnamecontents="h-5 mb-2">
                    {t("Smartcoin:viewBitassetOnBlocksights")}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-11 gap-1 w-full text-sm">
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={t("Smartcoin:collateralAsset")} button="" />
                    <EmptyRow title={t("Smartcoin:mcr")} button="" />
                    <EmptyRow title={t("Smartcoin:mssr")} button="" />
                    <EmptyRow title={t("Smartcoin:icr")} button="" />
                    <EmptyRow title={t("Smartcoin:feedQty")} button="" />
                    <EmptyRow title={t("Smartcoin:settlementOffset")} button="" />
                  </div>
                </div>
                <div className="col-span-1 flex justify-center items-center">
                  <Separator orientation="vertical" />
                </div>
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={t("Smartcoin:marketFee")} button="" />{" "}
                  </div>
                </div>
              </div>

              <Label className="pb-0">{t("Smartcoin:assetFlags")}</Label>
              <br />
              <span className="text-sm"> </span>
              <br />
              <Label>{t("Smartcoin:assetPermissions")}</Label>
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
                  <div className="col-span-6">{t("Smartcoin:about")}</div>
                  <div className="col-span-2 text-right">
                    <Button variant="outline" className="h-5">
                      {t("Smartcoin:viewJson")}
                    </Button>
                  </div>
                </div>
              </CardTitle>
              <CardDescription>
                {t("Smartcoin:aboutSmartcoinAssetDescription")}
                <br />
                {t("Smartcoin:doYourOwnResearch")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2">
                <div className="col-span-1">
                  <Label>{t("Smartcoin:generalAssetInfo")}</Label>
                </div>
                <div className="col-span-1 text-right">
                  <Button variant="outline" classnamecontents="h-5 mb-2">
                    {t("Smartcoin:viewAssetOnBlocksights")}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-11 gap-1 w-full text-sm">
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={t("Smartcoin:issuer")} button="" />
                    <EmptyRow title={t("Smartcoin:maximumSupply")} button="" />
                    <EmptyRow title={t("Smartcoin:minQuantity")} button="" />
                    <EmptyRow title={t("Smartcoin:precision")} button="" />
                  </div>
                </div>
                <div className="col-span-1 flex justify-center items-center">
                  <Separator orientation="vertical" />
                </div>
                <div className="col-span-5">
                  <div className="grid grid-cols-1 gap-1 w-full text-sm">
                    <EmptyRow title={t("Smartcoin:marketFee")} button="" />
                    <EmptyRow title={t("Smartcoin:takerFeePercent")} button="" />
                    <EmptyRow title={t("Smartcoin:rewardPercent")} button="" />
                  </div>
                </div>
              </div>

              <br />

              <Label className="pb-0">{t("Smartcoin:assetFlags")}</Label>
              <br />
              <span className="text-sm"> </span>
              <br />
              <Label>{t("Smartcoin:assetPermissions")}</Label>
              <br />
              <span className="text-sm"> </span>
            </CardContent>
          </Card>
        ) : null}

        {showDialog && trxJSON ? (
          <DeepLinkDialog
            operationNames={["call_order_update"]}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            key={`Borrowing${parsedAsset.s}with${parsedCollateralAsset.s}backingcollateral`}
            headerText={t("Smartcoin:borrowingWithBacking", {
              asset: parsedAsset.s,
              collateral: parsedCollateralAsset.s,
            })}
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
                      ? t("Smartcoin:orderBookForAssets", {
                          asset1: parsedAsset.s,
                          asset2: parsedCollateralAsset.s,
                        })
                      : t("Smartcoin:orderBookLoading")}
                  </CardTitle>
                  <CardDescription>{t("Smartcoin:orderBookNote")}</CardDescription>
                </div>
                <div className="col-span-1 text-right">
                  <a
                    href={
                      parsedAsset && parsedCollateralAsset
                        ? `/dex/index.html?market=${parsedAsset.s}_${parsedCollateralAsset.s}`
                        : ""
                    }
                  >
                    <Button>{t("Smartcoin:goToMarket")}</Button>
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-2">
                  {activeOrderTab === "buy" ? (
                    <TabsTrigger value="buy" style={activeTabStyle}>
                      {t("Smartcoin:viewingBuyOrders")}
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger value="buy" onClick={() => setActiveOrderTab("buy")}>
                      {t("Smartcoin:viewBuyOrders")}
                    </TabsTrigger>
                  )}
                  {activeOrderTab === "sell" ? (
                    <TabsTrigger value="sell" style={activeTabStyle}>
                      {t("Smartcoin:viewingSellOrders")}
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger value="sell" onClick={() => setActiveOrderTab("sell")}>
                      {t("Smartcoin:viewSellOrders")}
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="buy">
                  {buyOrders && buyOrders.length ? (
                    <>
                      <div className="grid grid-cols-4">
                        <div className="col-span-1">{t("Smartcoin:price")}</div>
                        <div className="col-span-1">{parsedCollateralAsset.s}</div>
                        <div className="col-span-1">{parsedAsset.s}</div>
                        <div className="col-span-1">{t("Smartcoin:total")}</div>
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
                  {buyOrders && !buyOrders.length ? t("Smartcoin:noBuyOrdersFound") : null}
                  {!buyOrders ? t("Smartcoin:loading") : null}
                </TabsContent>
                <TabsContent value="sell">
                  {sellOrders && sellOrders.length ? (
                    <>
                      <div className="grid grid-cols-4">
                        <div className="col-span-1">{t("Smartcoin:price")}</div>
                        <div className="col-span-1">{parsedAsset.s}</div>
                        <div className="col-span-1">{parsedCollateralAsset.s}</div>
                        <div className="col-span-1">{t("Smartcoin:total")}</div>
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
                  ? t("Smartcoin:callOrdersForAssets", {
                      asset1: parsedAsset.s,
                      asset2: parsedCollateralAsset.s,
                    })
                  : t("Smartcoin:callOrdersLoading")}
              </CardTitle>
              <CardDescription>{t("Smartcoin:checkMarginPositions")}</CardDescription>
            </CardHeader>
            <CardContent>
              {assetCallOrders && assetCallOrders.length ? (
                <>
                  <div className="grid grid-cols-6">
                    <div className="col-span-1">{t("Smartcoin:borrower")}</div>
                    <div className="col-span-1">{t("Smartcoin:collateral")}</div>
                    <div className="col-span-1">{t("Smartcoin:debt")}</div>
                    <div className="col-span-1">{t("Smartcoin:callPrice")}</div>
                    <div className="col-span-1">{t("Smartcoin:tcr")}</div>
                    <div className="col-span-1">{t("Smartcoin:ratio")}</div>
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
              {assetCallOrders && !assetCallOrders.length ? t("Smartcoin:noCallOrdersFound") : null}
              {!assetCallOrders ? t("Smartcoin:loading") : null}
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
                  ? t("Smartcoin:settleOrdersForAssets", {
                      asset1: parsedAsset.s,
                      asset2: parsedCollateralAsset.s,
                    })
                  : t("Smartcoin:settleOrdersLoading")}
              </CardTitle>
              <CardDescription>{t("Smartcoin:checkSettleOrders")}</CardDescription>
            </CardHeader>
            <CardContent>
              {assetSettleOrders && assetSettleOrders.length ? (
                <>
                  <div className="grid grid-cols-6">
                    <div className="col-span-1">{t("Smartcoin:owner")}</div>
                    <div className="col-span-1">{t("Smartcoin:balance2")}</div>
                    <div className="col-span-1">{t("Smartcoin:settlementDate")}</div>
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
                ? t("Smartcoin:noSettleOrdersFound")
                : null}
              {!assetSettleOrders ? t("Smartcoin:loading") : null}
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
                  ? t("Smartcoin:priceFeedsForAsset", { asset: parsedAsset.s })
                  : t("Smartcoin:priceFeedsLoading")}
              </CardTitle>
              <CardDescription>{t("Smartcoin:checkLatestPriceFeeds")}</CardDescription>
            </CardHeader>
            <CardContent>
              {finalBitasset && finalBitasset.feeds ? (
                <>
                  <div className="grid grid-cols-11">
                    <div className="col-span-2">{t("Smartcoin:user")}</div>
                    <div className="col-span-2">{t("Smartcoin:date")}</div>
                    <div className="col-span-2">{t("Smartcoin:cer")}</div>
                    <div className="col-span-2">{t("Smartcoin:settlement")}</div>
                    <div className="col-span-1">{t("Smartcoin:icr")}</div>
                    <div className="col-span-1">{t("Smartcoin:mcr")}</div>
                    <div className="col-span-1">{t("Smartcoin:mssr")}</div>
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
                ? t("Smartcoin:noSmartcoinFeedsFound")
                : null}
              {!finalBitasset ? t("Smartcoin:loading") : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 mt-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("Smartcoin:risksAssociated")}</CardTitle>
            <CardDescription>{t("Smartcoin:doYourOwnResearch2")}</CardDescription>
          </CardHeader>
          <CardContent>
            {t("Smartcoin:internalRiskFactors")}
            <br />
            <span className="text-sm">
              <Label className="mb-0 pb-0 text-lg">
                {t("Smartcoin:risksAssociatedDebtCollateral")}
              </Label>
              <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
                <li>{t("Smartcoin:riskLossCollateral")}</li>
                <li>{t("Smartcoin:riskSmartcoinValueLoss")}</li>
                <li>{t("Smartcoin:researchBeforeMarginPositions")}</li>
                <li>{t("Smartcoin:committeeOwnedBitAssets")}</li>
                <li>{t("Smartcoin:riskWithSmartcoinBacking")}</li>
                <li>{t("Smartcoin:riskWithEBA")}</li>
              </ul>
            </span>
            <br />
            {t("Smartcoin:externalRiskFactors")}
            <br />
            <span className="text-sm">
              <Label className="mb-0 pb-0 text-lg">{t("Smartcoin:priceFeedExposure")}</Label>
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                <li>{t("Smartcoin:riskPriceFluctuation")}</li>
                <li>{t("Smartcoin:riskReferenceAssetCease")}</li>
              </ul>
              <Label className="mb-0 pb-0 text-lg">
                {t("Smartcoin:priceFeedPublisherActivity")}
              </Label>
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                <li>{t("Smartcoin:riskPriceFeedInactivity")}</li>
                <li>{t("Smartcoin:riskUnstableFeedScripts")}</li>
                <li>{t("Smartcoin:riskExhaustedBalance")}</li>
                <li>{t("Smartcoin:riskPriceFeedDisagreement")}</li>
              </ul>
              <Label className="mb-0 pb-0 text-lg">
                {t("Smartcoin:exposureToEBABackAssetBlockchainDowntime")}
              </Label>
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                <li>{t("Smartcoin:riskGatewayDepositServiceDown")}</li>
              </ul>
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
