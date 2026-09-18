import React, {
  useState,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import { useForm, Controller } from "react-hook-form";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import {
  Landmark,
  Coins,
  ShieldAlert,
  ArrowRightLeft,
  Sparkles,
  Wallet,
  Percent,
  Clock,
  AlertTriangle,
  Info,
  Users,
  ListChecks,
  Receipt,
} from "lucide-react";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Avatar as Av,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  blockchainFloat,
  humanReadableFloat,
  assetAmountRegex,
} from "@/lib/common.js";

import { $currentUser } from "@/stores/users.ts";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { Avatar } from "./Avatar.tsx";

function hoursTillExpiration(expirationTime) {
  // Parse the expiration time
  var expirationDate = new Date(expirationTime);

  // Get the current date and time
  var currentDate = new Date();

  // Calculate the difference in milliseconds
  var difference = expirationDate - currentDate;

  // Convert the difference to hours and round it to the nearest integer
  var hours = Math.round(difference / 1000 / 60 / 60);

  return hours;
}

function SectionHeader({ icon: Icon, step, title }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-2 first:mt-2">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.12)] text-[11px] font-bold text-[hsl(var(--accent-1-fg))] flex-shrink-0">
        {step}
      </span>
      <Icon className="h-4 w-4 text-[hsl(var(--accent-1-fg))] flex-shrink-0" />
      <h4 className="text-sm font-semibold text-foreground whitespace-nowrap">
        {title}
      </h4>
      <span className="h-px flex-1 bg-gradient-to-r from-[hsl(var(--accent-1)/0.25)] to-transparent" />
    </div>
  );
}

function FieldHint({ text }) {
  if (!text) return null;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={text}
            className="inline-flex items-center text-muted-foreground/50 hover:text-[hsl(var(--accent-1-fg))] transition-colors cursor-help"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TermRow({ label, hint, value, sub, valueClass }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 pt-px">
        <span>{label}</span>
        <FieldHint text={hint} />
      </div>
      <div className="text-right min-w-0">
        <div
          className={cn(
            "font-mono text-[13px] font-semibold tabular-nums break-words",
            valueClass ?? "text-foreground/90"
          )}
        >
          {value}
        </div>
        {sub ? (
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}

export default function CreditOffer(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

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
  const currentNodeUrl = useStore($currentNodeUrl);

  const {
    _assetsBTS,
    _assetsTEST,
    _globalParamsBTS,
    _globalParamsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
  } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assetIssuers = useMemo(() => {
    if (
      _chain &&
      ((_marketSearchBTS && _marketSearchBTS.length) ||
        (_marketSearchTEST && _marketSearchTEST.length))
    ) {
      const targetCache =
        _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
      let mappedCache = targetCache.map((x) => {
        const split = x.u.split("(");
        const name = split[0].replace(" ", "");
        const id = split[1].replace(")", "").replace(" ", "");
        return { name, id };
      });

      let uniqueEntries = new Set();
      let filteredCache = mappedCache.filter((entry) => {
        const key = `${entry.name}-${entry.id}`;
        if (!uniqueEntries.has(key)) {
          uniqueEntries.add(key);
          return true;
        }
        return false;
      });

      return filteredCache;
    }
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 72);
      const finalFee = humanReadableFloat(foundFee?.data?.fee ?? 0, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [error, setError] = useState(false);
  const [foundAsset, setFoundAsset] = useState(null);
  const [relevantOffer, setRelevantOffer] = useState(null);
  useEffect(() => {
    async function parseUrlAssets() {
      //console.log("Parsing url parameters");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const id = params.id;

      if (!id) {
        console.log("Credit offer parameter not found");
        return null;
      }

      return id;
    }

    parseUrlAssets().then((id) => {
      if (!id) {
        setError(true);
        return;
      }

      const offerStore = createObjectStore([
        _chain,
        JSON.stringify([id]),
        currentNodeUrl || null,
      ]);
      offerStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const foundOffer = data[0];
          if (foundOffer) {
            if (_chain === "bitshares") {
              const hashedID = toHex(
                sha256(utf8ToBytes(foundOffer.owner_account))
              );
              if (blocklist.users.includes(hashedID)) {
                // Credit offer is owned by a banned user
                setError(true);
                setRelevantOffer();
                setFoundAsset();
                return;
              }
            }

            setRelevantOffer(foundOffer);
            const foundAsset = assets.find(
              (asset) => asset.id === foundOffer.asset_type
            );
            setError(false);
            setFoundAsset(foundAsset);
          }
        }
        if (error) {
          setError(true);
        }
      });
    });
  }, [_chain, assets, currentNodeUrl, blocklist]);

  const [usrBalances, setUsrBalances] = useState();
  const [balanceAssetIDs, setBalanceAssetIDs] = useState([]);
  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNodeUrl || "",
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setBalanceAssetIDs(filteredData.map((x) => x.asset_id));
            setUsrBalances(filteredData);
          }
        });
      }
    }

    fetchUserBalances();
  }, [usr]);

  const [chosenCollateral, setChosenCollateral] = useState(null);
  const acceptedCollateral = useMemo(() => {
    if (relevantOffer && relevantOffer.acceptable_collateral) {
      return relevantOffer.acceptable_collateral
        .map((asset) => asset[0])
        .map((x) => {
          const currentAsset = assets.find((y) => y.id === x);
          return currentAsset;
        })
        .filter((asset) => asset);
    }
    return [];
  }, [relevantOffer, assets]);

  const positiveBalanceIDs = useMemo(() => {
    if (usrBalances && usrBalances.length && assets && assets.length) {
      return usrBalances
        .filter((balance) => {
          const balanceAsset = assets.find((x) => x.id === balance.asset_id);
          if (!balanceAsset) return false;
          return (
            humanReadableFloat(balance.amount, balanceAsset.precision) > 0
          );
        })
        .map((balance) => balance.asset_id);
    }
    return [];
  }, [usrBalances, assets]);

  const compatibleCollateral = useMemo(() => {
    return acceptedCollateral.filter((asset) =>
      positiveBalanceIDs.includes(asset.id)
    );
  }, [acceptedCollateral, positiveBalanceIDs]);

  const hasNoCompatibleCollateral =
    relevantOffer != null &&
    acceptedCollateral.length > 0 &&
    compatibleCollateral.length === 0;

  useEffect(() => {
    if (chosenCollateral == null && compatibleCollateral.length > 0) {
      setChosenCollateral(compatibleCollateral[0].id);
    }
  }, [chosenCollateral, compatibleCollateral]);

  useEffect(() => {
    if (
      chosenCollateral != null &&
      usrBalances != null &&
      relevantOffer != null &&
      acceptedCollateral.length > 0 &&
      compatibleCollateral.length === 0
    ) {
      setChosenCollateral(null);
    }
  }, [chosenCollateral, usrBalances, relevantOffer, acceptedCollateral, compatibleCollateral]);

  const availableAmount = useMemo(() => {
    if (relevantOffer && foundAsset) {
      return humanReadableFloat(
        relevantOffer.current_balance,
        foundAsset.precision
      );
    } else {
      return 0;
    }
  }, [relevantOffer, foundAsset]);

  const minAmount = useMemo(() => {
    if (relevantOffer && foundAsset) {
      return humanReadableFloat(
        relevantOffer.min_deal_amount,
        foundAsset.precision
      );
    } else {
      return 1;
    }
  }, [relevantOffer, foundAsset]);

  const [inputValue, setInputValue] = useState();
  const [finalBorrowAmount, setFinalBorrowAmount] = useState();

  const effectiveInputValue = inputValue != null ? inputValue : minAmount;

  useEffect(() => {
    if (inputValue == null && minAmount != null) {
      setFinalBorrowAmount(minAmount);
    }
  }, [minAmount, inputValue]);

  const collateralInfo = useMemo(() => {
    if (chosenCollateral && balanceAssetIDs && assets && usrBalances) {
      const collateralAsset = assets.find(
        (asset) => asset.id === chosenCollateral
      );
      const collateralBalance = usrBalances.find(
        (balance) => balance.asset_id === chosenCollateral
      );

      return {
        amount: collateralBalance
          ? humanReadableFloat(
              collateralBalance.amount,
              collateralAsset.precision
            )
          : 0,
        holding: balanceAssetIDs.includes(chosenCollateral),
        symbol: collateralAsset.symbol,
        precision: collateralAsset.precision,
        id: collateralAsset.id,
        isBitasset: collateralAsset.bitasset_data_id ? true : false,
      };
    }
  }, [chosenCollateral, balanceAssetIDs, assets, usrBalances]);

  const offerRepayPeriod = useMemo(() => {
    if (relevantOffer) {
      let hours = relevantOffer.max_duration_seconds / 3600;
      let futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + hours);

      let formattedDate = `${futureDate.getDate()}/${
        futureDate.getMonth() + 1
      }/${futureDate.getFullYear()}`;

      if (hours > 24) {
        return `${Math.floor(hours / 24)} days (due by ${formattedDate})`;
      } else {
        return `${hours.toFixed(
          hours < 1 ? 2 : 0
        )} hours (due by ${formattedDate})`;
      }
    }
  }, [relevantOffer]);

  const offerExpiration = useMemo(() => {
    if (relevantOffer) {
      const hours = hoursTillExpiration(relevantOffer.auto_disable_time);
      let date = new Date(relevantOffer.auto_disable_time);
      let formattedDate = `${date.getDate()}/${
        date.getMonth() + 1
      }/${date.getFullYear()}`;

      if (hours > 24) {
        return `${Math.floor(hours / 24)} days (on ${formattedDate})`;
      } else {
        return `${hours.toFixed(
          hours < 1 ? 2 : 0
        )} hours (on ${formattedDate})`;
      }
    }
  }, [relevantOffer]);

  const requiredCollateralAmount = useMemo(() => {
    if (finalBorrowAmount && collateralInfo && relevantOffer) {
      let calculatedAmount = 0;
      const data = relevantOffer.acceptable_collateral.find((x) => {
        return x[0] === collateralInfo.id;
      });
      const base = data[1].base;
      const quote = data[1].quote;
      if (quote.asset_id === collateralInfo.id) {
        const ratio =
          humanReadableFloat(quote.amount, collateralInfo.precision) /
          humanReadableFloat(
            base.amount,
            assets.find((x) => x.id === base.asset_id).precision
          );
        calculatedAmount += finalBorrowAmount * ratio;
      }
      return calculatedAmount.toFixed(collateralInfo.precision);
    }
  }, [finalBorrowAmount, collateralInfo, relevantOffer]);

  const requiredCollateralPrice = useMemo(() => {
    if (finalBorrowAmount && collateralInfo && relevantOffer) {
      const data = relevantOffer.acceptable_collateral.find((x) => {
        return x[0] === collateralInfo.id;
      });
      const base = data[1].base;
      const quote = data[1].quote;
      if (quote.asset_id === collateralInfo.id) {
        const ratio =
          humanReadableFloat(quote.amount, collateralInfo.precision) /
          humanReadableFloat(
            base.amount,
            assets.find((x) => x.id === base.asset_id).precision
          );
        return ratio;
      }
    }
  }, [finalBorrowAmount, collateralInfo, relevantOffer]);

  const [showDialog, setShowDialog] = useState(false);
  const [repayPeriod, setRepayPeriod] = useState("no_auto_repayment");
  const repayType = useMemo(() => {
    if (repayPeriod) {
      if (repayPeriod === "no_auto_repayment") {
        return 0;
      }

      if (repayPeriod === "only_full_repayment") {
        return 1;
      }

      if (repayPeriod === "allow_partial_repayment") {
        return 2;
      }
    }
  }, [repayPeriod]);

  const handleInputChange = (event) => {
    const input = event.target.value;
    const regex = assetAmountRegex(foundAsset);
    if (regex.test(input)) {
      let adjustedValue = input;

      if (availableAmount && input > availableAmount) {
        adjustedValue = availableAmount;
      } else if (input < minAmount) {
        adjustedValue = minAmount;
      } else if (
        input.toString().split(".").length > 1 &&
        input.toString().split(".")[1].length > foundAsset.precision
      ) {
        adjustedValue = parseFloat(input).toFixed(foundAsset.precision);
      }

      setInputValue(adjustedValue);
      setFinalBorrowAmount(adjustedValue);
    }
  };

  const [creditOfferOwner, setCreditOfferOwner] = useState();
  useEffect(() => {
    if (assetIssuers && assetIssuers.length && relevantOffer) {
      let foundOwner = assetIssuers.find(
        (x) => x.id === relevantOffer.owner_account
      );
      if (foundOwner) {
        setCreditOfferOwner(foundOwner);
      } else {
        const userStore = createObjectStore([
          _chain,
          JSON.stringify([relevantOffer.owner_account]),
          currentNodeUrl || null,
        ]);
        userStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const foundUser = data[0];
            const newOwner = { id: foundUser.id, name: foundUser.name };
            setCreditOfferOwner(newOwner);
          }
        });
      }
    }
  }, [assetIssuers, relevantOffer]);

  const idSuffix = useMemo(
    () => (relevantOffer?.id || "offer").toString().replace(/\./g, "-"),
    [relevantOffer?.id]
  );

  const inputCls =
    "border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]";
  const selectTriggerCls =
    "border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus:ring-[hsl(var(--accent-1)/0.4)] focus:border-[hsl(var(--accent-1)/0.5)]";

  const estimatedFee = useMemo(() => {
    if (finalBorrowAmount && relevantOffer) {
      return finalBorrowAmount * (relevantOffer.fee_rate / 10000);
    }
    return null;
  }, [finalBorrowAmount, relevantOffer]);

  const submitDisabled =
    !chosenCollateral ||
    !repayPeriod ||
    !finalBorrowAmount ||
    !(finalBorrowAmount >= minAmount) ||
    !(finalBorrowAmount <= availableAmount) ||
    (collateralInfo && !collateralInfo.holding) ||
    (collateralInfo &&
      collateralInfo.holding &&
      collateralInfo.amount < requiredCollateralAmount);

  let submitHint = null;
  if (hasNoCompatibleCollateral) {
    submitHint = t("CreditOffer:submitHint.submitHintImpossible");
  } else if (!chosenCollateral) {
    submitHint = t("CreditOffer:submitHint.submitHintCollateral");
  } else if (
    !finalBorrowAmount ||
    !(finalBorrowAmount >= minAmount) ||
    !(finalBorrowAmount <= availableAmount)
  ) {
    submitHint = t("CreditOffer:submitHint.submitHintAmount", {
      minAmount: minAmount ?? "?",
      availableAmount: availableAmount ?? "?",
      symbol: foundAsset?.symbol ?? "?",
    });
  } else if (!repayPeriod) {
    submitHint = t("CreditOffer:submitHint.submitHintRepay");
  } else if (
    collateralInfo &&
    (!collateralInfo.holding ||
      collateralInfo.amount < requiredCollateralAmount)
  ) {
    submitHint = t("CreditOffer:submitHint.submitHintBalance", {
      symbol: collateralInfo.symbol,
    });
  }

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-11/12 lg:w-3/4 lg:max-w-[1440px]">
        <div className="grid grid-cols-1 gap-3">
          {error ? (
            <Card className="relative overflow-hidden rounded-2xl border border-[hsl(var(--accent-danger)/0.25)] bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-danger)/0.2)]">
              <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-danger)/0.2)] to-[hsl(var(--accent-warning)/0.2)] blur-3xl" />
              <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-danger)/0.7)] via-[hsl(var(--accent-warning)/0.7)] to-[hsl(var(--accent-danger)/0.7)]" />
              <CardHeader className="pb-1 mb-3 mt-3">
                <CardTitle className="flex items-center gap-2 text-[hsl(var(--accent-danger-fg))]">
                  <AlertTriangle className="h-5 w-5" />
                  {t("CreditOffer:errorCard.title")}
                </CardTitle>
                <CardDescription className="pt-2">
                  {t("CreditOffer:errorCard.description1")}
                  <br />
                  {t("CreditOffer:errorCard.description2")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href="/offers.html">
                  <Button className="h-6 bg-gradient-to-r from-[hsl(var(--accent-danger))] to-[hsl(var(--accent-warning))] text-[hsl(var(--accent-danger-gradFg))] shadow-md shadow-[color:hsl(var(--accent-danger)/0.3)] hover:shadow-[color:hsl(var(--accent-danger)/0.5)] active:scale-95 transition-all duration-200 cursor-pointer">
                    {t("CreditOffer:errorCard.buttonLabel")}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ) : null}
          {!error ? (
            <div className="md:grid md:grid-cols-[minmax(0,1fr)_360px] md:gap-4 md:items-start">
            <div className="min-w-0 grid grid-cols-1 gap-4 content-start">
            <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)] min-w-0 pt-4">
              <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-1)/0.2)] blur-3xl" />
              <CardHeader className="pb-1 pt-0">
                <CardTitle className="text-lg bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-[hsl(var(--accent-1-fg))]" />
                  {creditOfferOwner
                    ? t("CreditOffer:offerCardHeader.viewingOffer", {
                        id: relevantOffer.id,
                        owner_name: creditOfferOwner.name,
                        owner_account: creditOfferOwner.id,
                      })
                    : t("CreditOffer:offerCardHeader.loadingOfferTerms")}
                </CardTitle>
                <CardDescription>
                  {t("CreditOffer:offerCardHeader.offerDescription1")}
                  <br />
                  {t("CreditOffer:offerCardHeader.offerDescription2")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 mt-3">
                  <div className="col-span-1">
                      <form
                        onSubmit={form.handleSubmit(() => {
                          setShowDialog(true);
                        })}
                      >
                        <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.05)] to-[hsl(var(--accent-2)/0.05)] p-4 mb-4">
                          <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.15)] to-[hsl(var(--accent-2)/0.15)] blur-2xl" />
                          <div className="flex items-center gap-3 mb-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-gradFg))] flex-shrink-0">
                              <Coins className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold leading-tight truncate">
                                {foundAsset
                                  ? `${foundAsset.symbol} · ${relevantOffer?.id}`
                                  : t("CreditOffer:offerCardHeader.loadingOfferTerms")}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {creditOfferOwner
                                  ? t("CreditOffer:cardContent.lendingAccountShort", {
                                      owner_name: creditOfferOwner.name,
                                    })
                                  : null}
                              </div>
                            </div>
                            <div className="ml-auto flex flex-wrap gap-1.5 justify-end">
                              {foundAsset ? (
                                <Badge
                                  variant="outline"
                                  className="border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] text-[hsl(var(--accent-2-fg))]"
                                >
                                  {foundAsset.bitasset_data_id ? "MPA" : "UIA"}
                                </Badge>
                              ) : null}
                              {relevantOffer ? (
                                <Badge
                                  variant="outline"
                                  className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))]"
                                >
                                  <Percent className="h-3 w-3 mr-1" />
                                  {relevantOffer.fee_rate / 10000}%
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                <Wallet className="h-3 w-3" />
                                {t("CreditOffer:cardContent.available")}
                              </div>
                              <div className="mt-0.5 text-sm font-semibold">
                                {foundAsset && relevantOffer
                                  ? `${humanReadableFloat(
                                      relevantOffer.current_balance,
                                      foundAsset.precision
                                    )} ${foundAsset.symbol}`
                                  : t("CreditOffer:cardContent.loading")}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                <Sparkles className="h-3 w-3" />
                                {t("CreditOffer:cardContent.minimum")}
                              </div>
                              <div className="mt-0.5 text-sm font-semibold">
                                {minAmount != null
                                  ? `${minAmount} ${foundAsset?.symbol ?? ""}`
                                  : t("CreditOffer:cardContent.loading")}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 col-span-2 sm:col-span-1">
                              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {t("CreditOffer:cardContent.expiry")}
                              </div>
                              <div className="mt-0.5 text-sm font-semibold">
                                {offerExpiration ?? t("CreditOffer:cardContent.loading")}
                              </div>
                            </div>
                          </div>
                        </div>
                        <FieldGroup>
                        <SectionHeader icon={Users} step="1" title={t("CreditOffer:steps.step1Title")} />
                        <Field className="gap-2">
                          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2">
                            {usr && usr.username ? (
                              <Avatar
                                size={32}
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
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                                <span>{t("CreditOffer:cardContent.borrowingAccount")}</span>
                                <FieldHint text={t("CreditOffer:cardContent.broadcastDescription")} />
                              </div>
                              <div className="truncate text-sm font-semibold text-foreground">
                                {usr ? `${usr.username} (${usr.id})` : ""}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))] text-[10px] flex-shrink-0"
                            >
                              {t("CreditOffer:steps.youBadge")}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2">
                            {creditOfferOwner && creditOfferOwner.name ? (
                              <Avatar
                                size={32}
                                name={creditOfferOwner.name}
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
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                                <span>{t("CreditOffer:cardContent.lendingAccount")}</span>
                                <FieldHint
                                  text={t("CreditOffer:cardContent.borrowingDescription", {
                                    symbol: foundAsset?.symbol,
                                  })}
                                />
                              </div>
                              <div className="truncate text-sm font-semibold text-foreground">
                                {creditOfferOwner && creditOfferOwner.name
                                  ? `${creditOfferOwner.name} (${creditOfferOwner.id})`
                                  : ""}
                              </div>
                            </div>
                            {creditOfferOwner ? (
                              <Badge
                                variant="outline"
                                className="border-border/60 bg-card/60 text-muted-foreground text-[10px] flex-shrink-0"
                              >
                                {t("CreditOffer:steps.lenderBadge")}
                              </Badge>
                            ) : null}
                          </div>
                        </Field>

                        <SectionHeader icon={ListChecks} step="2" title={t("CreditOffer:steps.step2Title")} />

                        <Field className="gap-0">
                          <div className="rounded-xl border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.04)] p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[10px] font-bold text-[hsl(var(--accent-1-gradFg))] flex-shrink-0">
                                1
                              </span>
                              <FieldLabel htmlFor={`collateral-${idSuffix}`}>
                                {t("CreditOffer:steps.dealStep1")}
                              </FieldLabel>
                              <FieldHint
                                text={t("CreditOffer:cardContent.borrowDescription", {
                                  symbol: foundAsset?.symbol,
                                  owner_name: creditOfferOwner?.name ?? relevantOffer?.owner_name ?? "",
                                })}
                              />
                            </div>
                            <FieldContent>
                              {!hasNoCompatibleCollateral ? (
                              <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5 mb-1">
                                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground min-w-0">
                                  {collateralInfo ? (
                                    <span className="truncate font-mono tabular-nums">
                                      {t("CreditOffer:cardContent.currentBalance", {
                                        amount: collateralInfo.amount,
                                        symbol: collateralInfo.symbol,
                                      })}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground min-w-0">
                                  <span className="truncate">
                                    {collateralInfo
                                      ? t("CreditOffer:cardContent.designatedPriceLabel", {
                                          quote: collateralInfo.symbol,
                                          base: foundAsset?.symbol ?? "?",
                                        })
                                      : t("CreditOffer:cardContent.designatedPricePending")}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="min-w-0">
                                  <Select
                                    value={chosenCollateral ?? ""}
                                    onValueChange={(collateral) => {
                                      setChosenCollateral(collateral);
                                    }}
                                    disabled={compatibleCollateral.length === 0}
                                  >
                                    <SelectTrigger className={cn(selectTriggerCls)}>
                                      <SelectValue
                                        placeholder={
                                          collateralInfo
                                            ? `${collateralInfo.symbol} (${collateralInfo.id})`
                                            : t(
                                                "CreditOffer:cardContent.selectCollateral"
                                              )
                                        }
                                      />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card/80 backdrop-blur-xl border border-[hsl(var(--accent-1)/0.2)]">
                                      {compatibleCollateral.map((collateralAsset) => (
                                        <SelectItem
                                          key={collateralAsset.id}
                                          value={collateralAsset.id}
                                        >
                                          {`${collateralAsset.symbol} (${collateralAsset.id})`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="min-w-0">
                                  <Input
                                    disabled
                                    readOnly
                                    value={
                                      requiredCollateralPrice != null &&
                                      collateralInfo
                                        ? requiredCollateralPrice.toFixed(
                                            collateralInfo.precision
                                          )
                                        : t("CreditOffer:summary.pendingValue")
                                    }
                                    className={cn(
                                      "font-mono tabular-nums",
                                      inputCls
                                    )}
                                  />
                                </div>
                              </div>
                              </>
                              ) : null}
                            </FieldContent>
                            {hasNoCompatibleCollateral ? (
                              <div
                                role="alert"
                                className="flex items-start gap-2 rounded-xl border border-[hsl(var(--accent-danger)/0.4)] bg-[hsl(var(--accent-danger)/0.08)] px-3 py-2.5 mt-2"
                              >
                                <AlertTriangle className="h-4 w-4 text-[hsl(var(--accent-danger-fg))] flex-shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold text-[hsl(var(--accent-danger-fg))]">
                                    {t("CreditOffer:cardContent.noCompatibleTitle")}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {t("CreditOffer:cardContent.noCompatibleDesc", {
                                      symbols: acceptedCollateral
                                        .map((x) => x.symbol)
                                        .join(", "),
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                            {!collateralInfo && !hasNoCompatibleCollateral ? (
                              <div className="text-xs text-muted-foreground/70 mt-1.5">
                                {t("CreditOffer:cardContent.borrowDescription", {
                                  symbol: foundAsset?.symbol,
                                  owner_name: creditOfferOwner?.name ?? relevantOffer?.owner_name ?? "",
                                })}
                              </div>
                            ) : null}
                            {!hasNoCompatibleCollateral &&
                            balanceAssetIDs &&
                            chosenCollateral &&
                            !balanceAssetIDs.includes(chosenCollateral) ? (
                              <FieldError>
                                {t("CreditOffer:cardContent.noCollateralMessage")}
                              </FieldError>
                            ) : null}
                          </div>
                        </Field>

                        <Field className="gap-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="rounded-xl border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.04)] p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[10px] font-bold text-[hsl(var(--accent-1-gradFg))] flex-shrink-0">
                                2
                              </span>
                              <FieldLabel htmlFor={`borrow-${idSuffix}`}>
                                {t("CreditOffer:steps.dealStep2")}
                              </FieldLabel>
                              <FieldHint
                                text={t("CreditOffer:cardContent.inputBorrowAmount", {
                                  symbol: foundAsset?.symbol,
                                  owner_name: creditOfferOwner?.name ?? relevantOffer?.owner_name ?? "",
                                })}
                              />
                            </div>
                            <div
                              title={t(
                                "CreditOffer:cardContent.availableAmountRange",
                                {
                                  minAmount: minAmount ?? "?",
                                  availableAmount: availableAmount ?? "?",
                                  symbol: foundAsset?.symbol,
                                }
                              )}
                              className="font-mono text-[11px] tabular-nums text-muted-foreground truncate mb-1"
                            >
                              {t(
                                "CreditOffer:cardContent.availableAmountRange",
                                {
                                  minAmount: minAmount ?? "?",
                                  availableAmount: availableAmount ?? "?",
                                  symbol: foundAsset?.symbol,
                                }
                              )}
                            </div>
                            <FieldContent>
                              {!availableAmount ? (
                                <Input
                                  disabled
                                  value={0}
                                  className={cn(inputCls)}
                                  readOnly
                                />
                              ) : (
                                <Controller
                                  control={form.control}
                                  name="borrowAmount"
                                  defaultValue={effectiveInputValue}
                                  render={({ field }) => (
                                    <Input
                                      id={`borrow-${idSuffix}`}
                                      className={cn("font-mono tabular-nums text-base font-semibold", inputCls)}
                                      value={effectiveInputValue}
                                      onChange={(e) => {
                                        handleInputChange(e);
                                        field.onChange(e.target.value);
                                      }}
                                    />
                                  )}
                              />
                            )}
                            </FieldContent>
                          </div>
                          <div className="rounded-xl border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.04)] p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[10px] font-bold text-[hsl(var(--accent-1-gradFg))] flex-shrink-0">
                                3
                              </span>
                              <FieldLabel htmlFor={`repaymethod-${idSuffix}`}>
                                {t("CreditOffer:steps.dealStep3")}
                              </FieldLabel>
                              <FieldHint
                                text={t("CreditOffer:cardContent.selectRepaymentMethod")}
                              />
                            </div>
                            <div
                              aria-hidden="true"
                              className="font-mono text-[11px] tabular-nums mb-1 invisible select-none"
                            >
                              &nbsp;
                            </div>
                            <FieldContent>
                              <Select
                                value={repayPeriod}
                                onValueChange={(period) => {
                                  setRepayPeriod(period);
                                }}
                              >
                                <SelectTrigger className={cn("mb-1", selectTriggerCls)}>
                                  <SelectValue
                                    placeholder={t(
                                      "CreditOffer:cardContent.selectRepayMethod"
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-card/80 backdrop-blur-xl border border-[hsl(var(--accent-1)/0.2)]">
                                  <SelectItem value={"no_auto_repayment"}>
                                    {t("CreditOffer:cardContent.noAutoRepayment")}
                                  </SelectItem>
                                  <SelectItem value={"only_full_repayment"}>
                                    {t(
                                      "CreditOffer:cardContent.onlyFullRepayment"
                                    )}
                                  </SelectItem>
                                  <SelectItem value={"allow_partial_repayment"}>
                                    {t(
                                      "CreditOffer:cardContent.allowPartialRepayment"
                                    )}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FieldContent>
                          </div>
                          </div>
                        </Field>

                        <SectionHeader icon={Receipt} step="3" title={t("CreditOffer:steps.step3Title")} />
                        <Field className="gap-0">
                          <div className="rounded-xl border border-border/60 bg-card/40 px-3 divide-y divide-border/40">
                            <TermRow
                              label={t("CreditOffer:cardContent.requiredCollateral")}
                              hint={
                                finalBorrowAmount && foundAsset
                                  ? t("CreditOffer:cardContent.collateralNeeded", {
                                      borrowAmount: finalBorrowAmount ?? "",
                                      symbol: foundAsset ? foundAsset.symbol : "",
                                    })
                                  : t("CreditOffer:cardContent.enterValidBorrowAmount")
                              }
                              value={
                                requiredCollateralAmount && collateralInfo
                                  ? `${requiredCollateralAmount} ${collateralInfo.symbol}`
                                  : t("CreditOffer:summary.pendingValue")
                              }
                              sub={
                                collateralInfo
                                  ? t("CreditOffer:cardContent.currentBalance", {
                                      amount: collateralInfo.amount,
                                      symbol: collateralInfo.symbol,
                                    })
                                  : t("CreditOffer:cardContent.loadingBalance")
                              }
                            />
                            {collateralInfo &&
                            collateralInfo.holding &&
                            collateralInfo.amount < requiredCollateralAmount ? (
                              <FieldError>
                                {t(
                                  "CreditOffer:cardContent.insufficientBalance",
                                  {
                                    symbol: collateralInfo.symbol,
                                    requiredMore: (
                                      requiredCollateralAmount -
                                      collateralInfo.amount
                                    ).toFixed(collateralInfo.precision),
                                  }
                                )}
                              </FieldError>
                            ) : null}
                            {collateralInfo && !collateralInfo.holding ? (
                              <FieldError>
                                {t("CreditOffer:cardContent.noAssetHeld")}
                              </FieldError>
                            ) : null}

                            <TermRow
                              label={t("CreditOffer:cardContent.repayPeriod")}
                              hint={t("CreditOffer:cardContent.repayPeriodDescription")}
                              value={
                                offerRepayPeriod ??
                                t("CreditOffer:cardContent.loading")
                              }
                            />

                            <TermRow
                              label={t("CreditOffer:cardContent.offerExpiry")}
                              hint={t("CreditOffer:cardContent.offerExpiryDescription")}
                              value={
                                offerExpiration ??
                                t("CreditOffer:cardContent.loading")
                              }
                            />

                            <TermRow
                              label={t("CreditOffer:cardContent.estimatedFee")}
                              hint={t("CreditOffer:cardContent.feeDescription", {
                                symbol: foundAsset ? foundAsset.symbol : "?",
                                owner_name: creditOfferOwner
                                  ? creditOfferOwner.name
                                  : "?",
                              })}
                              value={
                                estimatedFee != null && foundAsset
                                  ? `${estimatedFee.toFixed(foundAsset.precision)} ${
                                      foundAsset.symbol
                                    }`
                                  : t("CreditOffer:cardContent.zeroFee", {
                                      symbol: foundAsset
                                        ? foundAsset.symbol
                                        : "?",
                                    })
                              }
                              sub={
                                relevantOffer
                                  ? t("CreditOffer:cardContent.borrowFeeRate", {
                                      feeRate: relevantOffer.fee_rate / 10000,
                                    })
                                  : t("CreditOffer:cardContent.loadingFee")
                              }
                            />

                            <TermRow
                              label={t("CreditOffer:cardContent.networkFee")}
                              hint={t("CreditOffer:cardContent.networkFeeDescription")}
                              value={`${fee ?? "?"} BTS`}
                              sub={
                                usr && usr.id === usr.referrer
                                  ? t("CreditOffer:cardContent.ltmRebate", {
                                      rebate: 0.8 * fee,
                                    })
                                  : null
                              }
                            />
                          </div>
                        </Field>
                      </FieldGroup>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1">
              <Card className="relative overflow-hidden rounded-2xl border border-[hsl(var(--accent-warning)/0.2)] bg-card/60 backdrop-blur-xl shadow-md shadow-[color:hsl(var(--accent-warning)/0.15)]">
                <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[hsl(var(--accent-warning)/0.12)] blur-3xl" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[hsl(var(--accent-warning-fg))]">
                    <ShieldAlert className="h-5 w-5" />
                    {t("CreditOffer:risks.risksTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {t("CreditOffer:risks.risksDescription")}
                  <ul className="ml-2 list-disc [&>li]:mt-2 pl-2 marker:text-[hsl(var(--accent-warning))]">
                    <li>{t("CreditOffer:risks.riskCollateral")}</li>
                    <li>{t("CreditOffer:risks.riskLiquidity")}</li>
                    <li>{t("CreditOffer:risks.riskPlatform")}</li>
                    <li>{t("CreditOffer:risks.riskUser")}</li>
                    <li>{t("CreditOffer:risks.riskNetwork")}</li>
                  </ul>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  {t("CreditOffer:risks.risksFooter")}
                </CardFooter>
              </Card>
            </div>
            </div>
            <aside className="md:sticky md:top-4 min-w-0 mt-4 md:mt-0">
              <Card className="relative overflow-hidden rounded-2xl border border-[hsl(var(--accent-1)/0.25)] bg-card/70 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)]">
                <div className="pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                    {t("CreditOffer:summary.title")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t("CreditOffer:summary.subtitle")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-1">
                  <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] px-3 py-2.5 text-center mb-1">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {t("CreditOffer:summary.youBorrow")}
                    </div>
                    <div className="font-mono text-xl font-bold tabular-nums text-[hsl(var(--accent-1-fg))] break-words">
                      {finalBorrowAmount
                        ? `${finalBorrowAmount} ${foundAsset?.symbol ?? ""}`
                        : t("CreditOffer:summary.pendingValue")}
                    </div>
                  </div>
                  <TermRow
                    label={t("CreditOffer:summary.youLock")}
                    value={
                      requiredCollateralAmount && collateralInfo
                        ? `${requiredCollateralAmount} ${collateralInfo.symbol}`
                        : t("CreditOffer:summary.pendingValue")
                    }
                  />
                  <TermRow
                    label={t("CreditOffer:summary.lenderFee")}
                    value={
                      estimatedFee != null && foundAsset
                        ? `${estimatedFee.toFixed(foundAsset.precision)} ${
                            foundAsset.symbol
                          }`
                        : t("CreditOffer:summary.pendingValue")
                    }
                  />
                  <TermRow
                    label={t("CreditOffer:summary.repayBy")}
                    value={
                      offerRepayPeriod ??
                      t("CreditOffer:cardContent.loading")
                    }
                  />
                  <TermRow
                    label={t("CreditOffer:summary.networkCost")}
                    value={`${fee ?? "?"} BTS`}
                  />
                  {submitHint ? (
                    <p className="flex items-center gap-1.5 text-xs text-amber-400/90 mt-2">
                      <Info className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{submitHint}</span>
                    </p>
                  ) : null}
                  <Button
                    disabled={submitDisabled}
                    onClick={() => setShowDialog(true)}
                    className="w-full mt-2 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.3)] hover:shadow-[color:hsl(var(--accent-1)/0.5)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    {t("CreditOffer:cardContent.submit")}
                  </Button>
                </CardContent>
              </Card>
            </aside>
            </div>
          ) : null}
        </div>
        {showDialog ? (
          <DeepLinkDialog
            operationNames={["credit_offer_accept"]}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            key={`Borrowing${finalBorrowAmount}${foundAsset.symbol}from${creditOfferOwner.name}(${creditOfferOwner.id})`}
            headerText={t("CreditOffer:dialogContent.borrowing", {
              finalBorrowAmount: finalBorrowAmount,
              symbol: foundAsset.symbol,
              owner_name: creditOfferOwner.name,
              owner_account: creditOfferOwner.id,
            })}
            trxJSON={[
              {
                borrower: usr.id,
                offer_id: relevantOffer.id,
                borrow_amount: {
                  amount: blockchainFloat(
                    finalBorrowAmount,
                    foundAsset.precision
                  ),
                  asset_id: foundAsset.id,
                },
                collateral: {
                  amount: blockchainFloat(
                    requiredCollateralAmount,
                    collateralInfo.precision
                  ),
                  asset_id: collateralInfo.id,
                },
                max_fee_rate: relevantOffer.fee_rate,
                min_duration_seconds: relevantOffer.max_duration_seconds,
                extensions: {
                  auto_repay: repayType ?? 0,
                },
              },
            ]}
          />
        ) : null}
      </div>
    </>
  );
}
