import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { useForm } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  humanReadableFloat,
  getFlagBooleans,
  debounce,
  blockchainFloat,
} from "@/lib/common.js";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createFullSmartcoinStore } from "@/nanoeffects/FullSmartcoin.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";

import DeepLinkDialog from "./common/DeepLinkDialog";
import EmptyRow from "./common/EmptyRow.jsx";

import AboutAssetCard from "@/components/Smartcoin/AboutAssetCard.jsx";
import RisksCard from "@/components/Smartcoin/RisksCard.jsx";
import UsrMarginPositionCard from "@/components/Smartcoin/UsrMarginPositionCard.jsx";
import CDPForm from "@/components/Smartcoin/CDPForm.jsx";
import PlaceholderForm from "@/components/Smartcoin/PlaceholderForm.jsx";
import {
  GlobalSettlementCard,
  IndividualSettlementCard,
} from "@/components/Smartcoin/SettlementFundCard.jsx";
import {
  OrderBookCard,
  CallOrdersCard,
  SettleOrdersCard,
  PriceFeedsCard,
} from "@/components/Smartcoin/DataCards.jsx";

export default function Smartcoin(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNodeUrl = useStore($currentNodeUrl);

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

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const {
    _assetsBTS,
    _assetsTEST,
    _bitAssetDataBTS,
    _bitAssetDataTEST,
    _marketSearchBTS,
    _marketSearchTEST,
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
      const finalFee = humanReadableFloat(foundFee?.data?.fee ?? 0, 5);
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

      const poolIds =
        marketSearch && marketSearch.length
          ? marketSearch.map((x) => x.id)
          : [];
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
      const foundBitasset = bitAssetData.find(
        (x) => x.assetID === parsedAsset.id
      );
      return foundBitasset;
    }
    return null;
  }, [parsedAsset, bitAssetData]);

  const parsedCollateralAsset = useMemo(() => {
    if (parsedBitasset && bitAssetData) {
      const foundAsset = marketSearch.find(
        (x) => x.id === parsedBitasset.collateral
      );
      return foundAsset;
    }
  }, [parsedBitasset, bitAssetData]);

  const parsedCollateralBitasset = useMemo(() => {
    if (parsedCollateralAsset && bitAssetData) {
      const foundBitasset = bitAssetData.find(
        (x) => x.assetID === parsedCollateralAsset.id
      );
      return foundBitasset;
    }
  }, [parsedCollateralAsset, bitAssetData]);

  const [usrBalances, setUsrBalances] = useState();
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
        parsedCollateralBitasset && parsedCollateralBitasset.id
          ? parsedCollateralBitasset.id
          : "",
        usr.id,
        currentNodeUrl || "",
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
            humanReadableFloat(
              finalBitasset.settlement_price.base.amount,
              parsedAsset.p
            ))
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
    if (
      finalBitasset &&
      finalBitasset.current_feed &&
      parsedCollateralAsset &&
      parsedAsset
    ) {
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
  }, [
    finalBitasset,
    parsedAsset,
    parsedCollateralAsset,
    individualSettlementFund,
  ]);

  const individualSettlementPrice = useMemo(() => {
    if (
      finalBitasset &&
      finalBitasset.current_feed &&
      parsedCollateralAsset &&
      parsedAsset
    ) {
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
            <Badge className="mr-2 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.08)] font-mono text-[11px] font-normal text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.15)] transition-colors">{key}</Badge>
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
            <Badge className="mr-2 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.08)] font-mono text-[11px] font-normal text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.15)] transition-colors">{key}</Badge>
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
            <Badge className="mr-2 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.08)] font-mono text-[11px] font-normal text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.15)] transition-colors">{key}</Badge>
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
      const obj = getFlagBooleans(
        finalCollateralAsset.options.issuer_permissions
      );
      return Object.keys(obj).map((key) => (
        <HoverCard key={`${key}_collateralPermissions`}>
          <HoverCardTrigger>
            <Badge className="mr-2 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.08)] font-mono text-[11px] font-normal text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.15)] transition-colors">{key}</Badge>
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

  const [originalDebtAmount, setOriginalDebtAmount] = useState(0);
  const [originalCollateralAmount, setOriginalCollateralAmount] = useState(0);

  const [tcrEnabled, setTCREnabled] = useState(false);
  const [tcrValue, setTCRValue] = useState(0);

  useEffect(() => {
    if (parsedBitasset) {
      if (usrMarginPositions && usrMarginPositions.length) {
        const res = usrMarginPositions[0];
        const collateralAmount = humanReadableFloat(
          res.collateral,
          parsedCollateralAsset.p
        );
        const debtAmount = humanReadableFloat(res.debt, parsedAsset.p);
        const _mcr = parsedBitasset.mcr / 1000;

        const tcr = res.target_collateral_ratio
          ? res.target_collateral_ratio / 1000
          : null;
        const _ratio =
          1 / ((currentFeedSettlementPrice * debtAmount) / collateralAmount);
        const ratio = parseFloat(_ratio.toFixed(3));
        const callPrice = res.target_collateral_ratio
          ? parseFloat(
              (
                currentFeedSettlementPrice *
                (collateralAmount /
                  (debtAmount *
                    (currentFeedSettlementPrice *
                      (res.target_collateral_ratio / 1000))))
              ).toFixed(parsedCollateralAsset.p)
            )
          : parseFloat(
              (
                currentFeedSettlementPrice *
                (collateralAmount /
                  (debtAmount * (currentFeedSettlementPrice * _mcr)))
              ).toFixed(parsedCollateralAsset.p)
            );

        setCollateralAmount(collateralAmount);
        setOriginalCollateralAmount(collateralAmount);
        setDebtAmount(debtAmount);
        setOriginalDebtAmount(debtAmount);
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
              (_collateralAmount /
                (debtAmount * (currentFeedSettlementPrice * _mcr)))
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
              (collateralAmount /
                (debtAmount * (currentFeedSettlementPrice * tcrValue)))
            ).toFixed(parsedCollateralAsset.p)
          )
        : parseFloat(
            (
              currentFeedSettlementPrice *
              (collateralAmount /
                (debtAmount * (currentFeedSettlementPrice * 1.4)))
            ).toFixed(parsedCollateralAsset.p)
          );
      setFormCallPrice(callPrice);
    }
  }, [
    currentFeedSettlementPrice,
    parsedCollateralAsset,
    debtAmount,
    collateralAmount,
    ratioValue,
  ]);

  const debtAssetHoldings = useMemo(() => {
    if (parsedAsset && usrBalances && usrBalances.length) {
      const currentDebtAssetBalance = usrBalances.find(
        (x) => x.asset_id === parsedAsset.id
      );
      const _balance =
        currentDebtAssetBalance && currentDebtAssetBalance.amount
          ? humanReadableFloat(currentDebtAssetBalance.amount, parsedAsset.p)
          : 0;

      let _output = 0;
      if (debtAmount === originalDebtAmount) {
        _output = _balance;
      } else if (debtAmount < originalDebtAmount) {
        _output = _balance - (originalDebtAmount - debtAmount);
      } else if (debtAmount > originalDebtAmount) {
        _output = _balance + (debtAmount - originalDebtAmount);
      }

      return parseFloat(_output.toFixed(parsedAsset.p));
    }
  }, [
    parsedAsset,
    usrBalances,
    debtLock,
    debtAmount,
    originalDebtAmount,
  ]);

  const collateralAssetHoldings = useMemo(() => {
    if (parsedCollateralAsset && usrBalances && usrBalances.length) {
      const foundAsset = usrBalances.find(
        (x) => x.asset_id === parsedCollateralAsset.id
      );

      const _collateralBalance = humanReadableFloat(
        foundAsset.amount,
        parsedCollateralAsset.p
      );
      let _output = 0;
      if (collateralAmount === originalCollateralAmount) {
        _output = _collateralBalance;
      }

      if (collateralAmount < originalCollateralAmount) {
        _output =
          _collateralBalance + (originalCollateralAmount - collateralAmount);
      }
      if (collateralAmount > originalCollateralAmount) {
        _output =
          _collateralBalance - (collateralAmount - originalCollateralAmount);
      }

      return parseFloat(_output.toFixed(parsedCollateralAsset.p));
    }
  }, [
    parsedCollateralAsset,
    usrBalances,
    collateralLock,
    collateralAmount,
    originalCollateralAmount,
  ]);

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
          (parsedDebtAmount * current_feed_price * current_ratio_value).toFixed(
            collateralPrecision
          )
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

        const _ratio =
          1 /
          ((current_feed_price * parsedDebtAmount) / parsedCollateralAmount);

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
          (parsedCollateralAmount / current_feed_price / existingRatio).toFixed(
            debtPrecision
          )
        );

        if (parsedDebtAmount < _minDebt) {
          parsedCollateralAmount =
            _minDebt * current_feed_price * existingRatio;
          parsedDebtAmount = _minDebt;
        }

        if (_ratioLock === "locked") {
          setDebtAmount(parsedDebtAmount);
        }

        if (_debtLock === "locked" || _collateralLock === "locked") {
          const updatedRatio = parseFloat(
            (
              1 /
              ((current_feed_price * existingDebtAmount) /
                parsedCollateralAmount)
            ).toFixed(3)
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
          const finalDebt = parseFloat(
            (
              _collateralAmount /
              (current_feed_price * parsedRatioAmount)
            ).toFixed(debtPrecision)
          );
          setDebtAmount(finalDebt);
        }

        if (_debtLock === "locked") {
          const _debtAmount = parseFloat(current_debt_amount);
          const newCollateralAmount = parseFloat(
            (_debtAmount * current_feed_price * parsedRatioAmount).toFixed(
              collateralPrecision
            )
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

      const newDebtPosition = parseInt(
        blockchainFloat(debtAmount, parsedAsset.p)
      );
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
          amount: parseInt(
            blockchainFloat(collateralAmount, parsedCollateralAsset.p)
          ),
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

  return (
    <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4">
      <div className="grid grid-cols-1 gap-3">
        {marketSearch && invalidUrlParams ? (
          <Card className="relative overflow-hidden border-[hsl(var(--accent-1)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)]">
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent" />
            <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl" />
            <CardHeader className="relative">
              <CardTitle>{t("Smartcoin:invalidSmartcoinIdTitle")}</CardTitle>
              <CardDescription>
                {t("Smartcoin:invalidSmartcoinIdDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {t("Smartcoin:invalidSmartcoinIdContent1")}{" "}
              <a className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))]" href="/smartcoins.html">
                {t("Smartcoin:invalidSmartcoinIdContent2")}
              </a>{" "}
              {t("Smartcoin:invalidSmartcoinIdContent3")}
            </CardContent>
          </Card>
        ) : null}

        {!invalidUrlParams && parsedBitasset ? (
          <CDPForm
            form={form}
            usr={usr}
            parsedAsset={parsedAsset}
            parsedCollateralAsset={parsedCollateralAsset}
            parsedBitasset={parsedBitasset}
            currentFeedSettlementPrice={currentFeedSettlementPrice}
            formCallPrice={formCallPrice}
            fee={fee}
            debtLock={debtLock}
            setDebtLock={setDebtLock}
            collateralLock={collateralLock}
            setCollateralLock={setCollateralLock}
            ratioLock={ratioLock}
            setRatioLock={setRatioLock}
            debtAmount={debtAmount}
            collateralAmount={collateralAmount}
            ratioValue={ratioValue}
            tcrEnabled={tcrEnabled}
            setTCREnabled={setTCREnabled}
            tcrValue={tcrValue}
            debtAssetHoldings={debtAssetHoldings}
            collateralAssetHoldings={collateralAssetHoldings}
            debouncedDebtAmount={debouncedDebtAmount}
            debouncedCollateralAmount={debouncedCollateralAmount}
            debouncedSetRatioValue={debouncedSetRatioValue}
            debouncedSetTCRValue={debouncedSetTCRValue}
            setShowDialog={setShowDialog}
          />
        ) : null}

        {!invalidUrlParams && !parsedBitasset ? (
          <PlaceholderForm form={form} ratioValue={ratioValue} />
        ) : null}

        {!invalidUrlParams &&
        parsedCollateralAsset &&
        parsedAsset &&
        settlementFund &&
        settlementFund.finalSettlementFund &&
        settlementFund.finalSettlementFund > 0 ? (
          <GlobalSettlementCard
            settlementFund={settlementFund}
            parsedCollateralAsset={parsedCollateralAsset}
            parsedAsset={parsedAsset}
            finalAsset={finalAsset}
            currentFeedSettlementPrice={currentFeedSettlementPrice}
          />
        ) : null}

        {individualSettlementFund && individualSettlementFund._debt ? (
          <IndividualSettlementCard
            individualSettlementFund={individualSettlementFund}
            individualSettlementPrice={individualSettlementPrice}
            parsedCollateralAsset={parsedCollateralAsset}
            parsedAsset={parsedAsset}
            finalAsset={finalAsset}
          />
        ) : null}

        {usrMarginPositions && usrMarginPositions.length ? (
          <UsrMarginPositionCard
            usrMarginPositions={usrMarginPositions}
            parsedCollateralAsset={parsedCollateralAsset}
            parsedAsset={parsedAsset}
            currentFeedSettlementPrice={currentFeedSettlementPrice}
            debtAssetHoldings={debtAssetHoldings}
            usr={usr}
            exitJSON={exitJSON}
          />
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {!invalidUrlParams && finalAsset && parsedAsset && parsedBitasset ? (
            <AboutAssetCard
              assetInfo={parsedAsset}
              bitassetInfo={parsedBitasset}
              fullAssetInfo={finalAsset}
              fullBitassetInfo={finalBitasset}
              type="debt"
              assetInfoFlags={parsedAssetFlags}
              assetPermissions={debtPermissions}
              parsedCollateralAsset={parsedCollateralAsset}
              usr={usr}
            />
          ) : null}

          {!invalidUrlParams &&
          (!finalAsset || !parsedAsset || !parsedBitasset) ? (
            <Card className="mt-2 relative overflow-hidden border-[hsl(var(--accent-1)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)]">
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent" />
              <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl" />
              <CardHeader className="pb-2 relative">
                <CardTitle>
                  <div className="grid grid-cols-8">
                    <div className="col-span-6">
                      {t("Smartcoin:aboutSmartcoinAsset")}
                    </div>
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
                </div>
                <div className="grid grid-cols-1 gap-1 w-full text-sm">
                  <EmptyRow title={t("Smartcoin:issuer")} button="" />
                  <EmptyRow title={t("Smartcoin:maximumSupply")} button="" />
                  <EmptyRow title={t("Smartcoin:minQuantity")} button="" />
                  <EmptyRow title={t("Smartcoin:precision")} button="" />
                  <EmptyRow title={t("Smartcoin:marketFee")} button="" />
                  <EmptyRow title={t("Smartcoin:takerFeePercent")} button="" />
                  <EmptyRow title={t("Smartcoin:rewardPercent")} button="" />
                </div>

                <div className="grid grid-cols-2">
                  <div className="col-span-1">
                    <Label>{t("Smartcoin:smartcoinInfo")}</Label>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1 w-full text-sm">
                  <EmptyRow title={t("Smartcoin:collateralAsset")} button="" />
                  <EmptyRow title={t("Smartcoin:mcr")} button="" />
                  <EmptyRow title={t("Smartcoin:mssr")} button="" />
                  <EmptyRow title={t("Smartcoin:icr")} button="" />
                  <EmptyRow title={t("Smartcoin:feedQty")} button="" />
                  <EmptyRow title={t("Smartcoin:settlementOffset")} button="" />
                  <EmptyRow title={t("Smartcoin:settlementFee")} button="" />
                  <EmptyRow title={t("Smartcoin:marginCallFee")} button="" />
                  <EmptyRow title={t("Smartcoin:bsrm")} button="" />
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
              parsedCollateralAsset={parsedCollateralAsset}
              usr={usr}
            />
          ) : null}

          {!invalidUrlParams &&
          (!finalCollateralAsset || !parsedCollateralAsset) ? (
            <Card className="mt-2 relative overflow-hidden border-[hsl(var(--accent-1)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)]">
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent" />
              <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl" />
              <CardHeader className="pb-2 relative">
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
                </div>
                <div className="grid grid-cols-1 gap-1 w-full text-sm">
                  <EmptyRow title={t("Smartcoin:issuer")} button="" />
                  <EmptyRow title={t("Smartcoin:maximumSupply")} button="" />
                  <EmptyRow title={t("Smartcoin:minQuantity")} button="" />
                  <EmptyRow title={t("Smartcoin:precision")} button="" />
                  <EmptyRow title={t("Smartcoin:marketFee")} button="" />
                  <EmptyRow title={t("Smartcoin:takerFeePercent")} button="" />
                  <EmptyRow title={t("Smartcoin:rewardPercent")} button="" />
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
        </div>

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

      {!invalidUrlParams && parsedAsset && parsedCollateralAsset ? (
        <OrderBookCard
          parsedAsset={parsedAsset}
          parsedCollateralAsset={parsedCollateralAsset}
          activeOrderTab={activeOrderTab}
          setActiveOrderTab={setActiveOrderTab}
          buyOrders={buyOrders}
          sellOrders={sellOrders}
        />
      ) : null}

      {!invalidUrlParams && parsedAsset && parsedCollateralAsset ? (
        <CallOrdersCard
          parsedAsset={parsedAsset}
          parsedCollateralAsset={parsedCollateralAsset}
          assetCallOrders={assetCallOrders}
          currentFeedSettlementPrice={currentFeedSettlementPrice}
        />
      ) : null}

      {!invalidUrlParams && parsedAsset && parsedCollateralAsset ? (
        <SettleOrdersCard
          parsedAsset={parsedAsset}
          parsedCollateralAsset={parsedCollateralAsset}
          assetSettleOrders={assetSettleOrders}
        />
      ) : null}

      {!invalidUrlParams && parsedAsset && parsedCollateralAsset ? (
        <PriceFeedsCard
          parsedAsset={parsedAsset}
          parsedCollateralAsset={parsedCollateralAsset}
          finalBitasset={finalBitasset}
        />
      ) : null}

      <RisksCard />
    </div>
  );
}
