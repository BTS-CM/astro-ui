import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  memo,
} from "react";
import { List } from "react-window";
import { useForm, Controller } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Coins, ShieldAlert, AlertTriangle, Repeat, FileSignature, ChevronDown } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldContent,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createBorrowerDealsStore } from "@/nanoeffects/BorrowerDeals.ts";
import { createLenderDealsStore } from "@/nanoeffects/LenderDeals.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import {
  blockchainFloat,
  humanReadableFloat,
  assetAmountRegex,
} from "@/lib/common.js";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

function autoRepayBadgeLabel(t, value) {
  if (value === 0) return t("CreditOffer:cardContent.noAutoRepayment");
  if (value === 1) return t("CreditOffer:cardContent.onlyFullRepayment");
  if (value === 2) return t("CreditOffer:cardContent.allowPartialRepayment");
  return null;
}

function dealIdNumber(deal) {
  return parseInt(((deal && deal.id) || "").split(".")[2] || "0", 10);
}

function dealTimeLeft(deal) {
  return new Date(deal.latest_repay_time).getTime() - Date.now();
}

function dealFeeHuman(deal, assets) {
  const found = (assets ?? []).find((x) => x.id === deal.debt_asset);
  if (!found) return 0;
  return (
    (Number(humanReadableFloat(deal.debt_amount, found.precision)) *
      deal.fee_rate) /
    1000000
  );
}

function applyDealSort(deals, sort, assets) {
  const arr = [...deals];
  const tie = (a, b) => dealIdNumber(a) - dealIdNumber(b);
  switch (sort) {
    case "deal-id-asc":
      arr.sort((a, b) => dealIdNumber(a) - dealIdNumber(b));
      break;
    case "deal-desc":
      arr.sort((a, b) => dealIdNumber(b) - dealIdNumber(a));
      break;
    case "time-asc":
      arr.sort((a, b) => dealTimeLeft(a) - dealTimeLeft(b) || tie(a, b));
      break;
    case "time-desc":
      arr.sort((a, b) => dealTimeLeft(b) - dealTimeLeft(a) || tie(a, b));
      break;
    case "fee-asc":
      arr.sort(
        (a, b) => dealFeeHuman(a, assets) - dealFeeHuman(b, assets) || tie(a, b)
      );
      break;
    case "fee-desc":
      arr.sort(
        (a, b) => dealFeeHuman(b, assets) - dealFeeHuman(a, assets) || tie(a, b)
      );
      break;
    default:
      break;
  }
  return arr;
}

const defaultTabControls = {
  sort: "deal-desc",
  debt: "all",
  collateral: "all",
  party: "all",
};

const DealControls = memo(function DealControls({
  deals,
  assets,
  accountNames,
  controls,
  onChange,
  onClear,
  t,
  partyKey,
  partyLabel,
}) {
  const debtOptions = useMemo(() => {
    const ids = Array.from(
      new Set((deals ?? []).map((d) => d.debt_asset).filter(Boolean))
    );
    return ids
      .map((id) => {
        const found = (assets ?? []).find((a) => a.id === id);
        return { value: id, label: found ? `${found.symbol} (${id})` : id };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [deals, assets]);

  const collateralOptions = useMemo(() => {
    const ids = Array.from(
      new Set((deals ?? []).map((d) => d.collateral_asset).filter(Boolean))
    );
    return ids
      .map((id) => {
        const found = (assets ?? []).find((a) => a.id === id);
        return { value: id, label: found ? `${found.symbol} (${id})` : id };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [deals, assets]);

  const partyOptions = useMemo(() => {
    const ids = Array.from(
      new Set((deals ?? []).map((d) => d[partyKey]).filter(Boolean))
    );
    return ids
      .map((id) => ({
        value: id,
        label:
          accountNames && accountNames[id]
            ? `${accountNames[id]} (${id})`
            : id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [deals, partyKey, accountNames]);

  const hasActiveFilters =
    controls.debt !== "all" ||
    controls.collateral !== "all" ||
    controls.party !== "all";

  const selectCls =
    "border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus:ring-[hsl(var(--accent-1)/0.4)]";
  const captionCls =
    "px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70";

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2 px-2">
      <div className="flex min-w-[150px] flex-1 flex-col gap-1">
        <span className={captionCls}>{t("CreditDeals:sortLabel")}</span>
        <Select
          value={controls.sort}
          onValueChange={(v) => onChange({ sort: v })}
        >
          <SelectTrigger className={selectCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deal-desc">
              {t("CreditDeals:sortDealIdDesc")}
            </SelectItem>
            <SelectItem value="deal-id-asc">
              {t("CreditDeals:sortDealIdAsc")}
            </SelectItem>
            <SelectItem value="time-asc">
              {t("CreditDeals:sortTimeAsc")}
            </SelectItem>
            <SelectItem value="time-desc">
              {t("CreditDeals:sortTimeDesc")}
            </SelectItem>
            <SelectItem value="fee-asc">
              {t("CreditDeals:sortFeeAsc")}
            </SelectItem>
            <SelectItem value="fee-desc">
              {t("CreditDeals:sortFeeDesc")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[150px] flex-1 flex-col gap-1">
        <span className={captionCls}>{t("CreditDeals:filterDebt")}</span>
        <Select
          value={controls.debt}
          onValueChange={(v) => onChange({ debt: v })}
        >
          <SelectTrigger className={selectCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("CreditDeals:filterAll")}</SelectItem>
            {debtOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[150px] flex-1 flex-col gap-1">
        <span className={captionCls}>{t("CreditDeals:filterCollateral")}</span>
        <Select
          value={controls.collateral}
          onValueChange={(v) => onChange({ collateral: v })}
        >
          <SelectTrigger className={selectCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("CreditDeals:filterAll")}</SelectItem>
            {collateralOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[150px] flex-1 flex-col gap-1">
        <span className={captionCls}>{partyLabel}</span>
        <Select
          value={controls.party}
          onValueChange={(v) => onChange({ party: v })}
        >
          <SelectTrigger className={selectCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("CreditDeals:filterAll")}</SelectItem>
            {partyOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters ? (
        <Button variant="outline" onClick={onClear} className="shrink-0">
          {t("CreditDeals:clearFilters")}
        </Button>
      ) : null}
    </div>
  );
});

const CreditDealsCommonRow = memo(function CreditDealsCommonRow({ style, res, type, assets, usrBalances, fee, t, usr, form, accountNames, pools }) {
  const debtAsset = assets.find((x) => x.id === res.debt_asset);
  const collateralAsset = assets.find((x) => x.id === res.collateral_asset);
  const counterpartyId = type === "borrower" ? res.offer_owner : res.borrower;
  const counterpartyName = accountNames?.[counterpartyId];
  const counterpartyLabel = counterpartyName ? `${counterpartyName} (${counterpartyId})` : counterpartyId;
  const swapPool = useMemo(() => {
    if (!pools || !pools.length || !debtAsset || !collateralAsset) return null;
    return (
      pools.find((p) => {
        const a = p.asset_a_symbol;
        const b = p.asset_b_symbol;
        return (
          (a === debtAsset.symbol && b === collateralAsset.symbol) ||
          (a === collateralAsset.symbol && b === debtAsset.symbol)
        );
      }) ?? null
    );
  }, [pools, debtAsset, collateralAsset]);
  const dexHref = debtAsset && collateralAsset ? `/dex.html?market=${debtAsset.symbol}_${collateralAsset.symbol}` : "/dex.html";
  const instantTradeHref = debtAsset && collateralAsset ? `/instant_trade.html?market=${debtAsset.symbol}_${collateralAsset.symbol}` : "/instant_trade.html";
  const swapHref = swapPool ? `/swap.html?pool=${swapPool.id}` : null;
  const borrowedAmount = debtAsset ? humanReadableFloat(res.debt_amount, debtAsset.precision) : 0;
  const collateralAmount = collateralAsset ? humanReadableFloat(res.collateral_amount, collateralAsset.precision) : 0;
  const latestRepayTime = new Date(res?.latest_repay_time);
  const currentTime = new Date();
  const diffInMilliseconds = latestRepayTime - currentTime;
  const diffInHours = (diffInMilliseconds / (1000 * 60 * 60)).toFixed(2);
  let remainingTime = "";
  if (diffInHours < 24) {
    remainingTime = ` ${diffInHours} hours`;
  } else {
    const fracturedTime = (diffInHours / 24).toString().split(".");
    const days = fracturedTime[0];
    const hours = parseFloat(`0.${(diffInHours / 24).toString().split(".")[1]}`) * 24;
    const minutes = parseFloat(`0.${hours.toString().split(".")[1]}`) * 60;
    remainingTime = ` ${days} days ${hours.toFixed(0)} hours ${minutes.toFixed(0)} mins`;
  }
  const [openRepay, setOpenRepay] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [finalRepayAmount, setFinalRepayAmount] = useState();
  const redeemCollateral = useMemo(() => {
    if (finalRepayAmount && borrowedAmount && collateralAmount) {
      return (finalRepayAmount / borrowedAmount) * collateralAmount;
    }
  }, [finalRepayAmount, borrowedAmount, collateralAmount]);
  const loanFee = useMemo(() => {
    if (finalRepayAmount && res && debtAsset) {
      return ((finalRepayAmount / 100) * (res.fee_rate / 10000)).toFixed(debtAsset.precision);
    }
    return 0;
  }, [finalRepayAmount, res, debtAsset]);
  const finalRepayment = useMemo(() => {
    if (finalRepayAmount && loanFee && debtAsset) {
      return (parseFloat(finalRepayAmount) + parseFloat(loanFee)).toFixed(debtAsset.precision);
    }
    return 0;
  }, [finalRepayAmount, loanFee, debtAsset]);
  const debtAssetBalance = useMemo(() => {
    if (usrBalances && usrBalances.length && debtAsset) {
      const foundBalance = usrBalances.find((x) => x.asset_id === debtAsset.id);
      if (foundBalance) return humanReadableFloat(foundBalance.amount, debtAsset.precision);
    }
    return 0;
  }, [usrBalances, debtAsset]);
  const [inputValue, setInputValue] = useState();
  const [debouncedInputValue, setDebouncedInputValue] = useState();
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInputValue(inputValue), 1000);
    return () => clearTimeout(timer);
  }, [inputValue]);
  useEffect(() => {
    if (!debouncedInputValue || !borrowedAmount || !debtAsset) return;
    const minAmount = humanReadableFloat(1, debtAsset.precision);
    if (debouncedInputValue > borrowedAmount) {
      setFinalRepayAmount(borrowedAmount);
      setInputValue(borrowedAmount);
    } else if (debouncedInputValue < minAmount) {
      setFinalRepayAmount(minAmount);
      setInputValue(minAmount);
    } else if (debouncedInputValue.toString().split(".").length > 1 && debouncedInputValue.toString().split(".")[1].length > debtAsset.precision) {
      const fixedValue = parseFloat(debouncedInputValue).toFixed(debtAsset.precision);
      setFinalRepayAmount(fixedValue);
      setInputValue(fixedValue);
    } else {
      setFinalRepayAmount(debouncedInputValue);
    }
  }, [debouncedInputValue, borrowedAmount, debtAsset]);
  const idSuffix = useMemo(() => (res?.id || "id").toString().replace(/\./g, "-"), [res?.id]);
  if (!debtAsset || !collateralAsset) return null;
  return (
    <div style={{ ...style }} key={`acard-${res.id}`}>
      <div className="ml-2 mr-2 relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 backdrop-blur-xl shadow-md shadow-[color:hsl(var(--accent-1)/0.1)] hover:border-[hsl(var(--accent-1)/0.25)] hover:shadow-[color:hsl(var(--accent-1)/0.15)] transition-all duration-300 pb-2">
        <div className="p-3 pb-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold leading-none tracking-tight bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent">{t("CreditDeals:dealNo")}{res.id.replace("1.22.", "")}{t("CreditDeals:with")}{counterpartyLabel}</h3>
            {autoRepayBadgeLabel(t, res.auto_repay) ? (
              <Badge variant={res.auto_repay === 0 ? "secondary" : "default"} className="shrink-0 gap-1">
                <Repeat className="h-3 w-3" />
                {autoRepayBadgeLabel(t, res.auto_repay)}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{type === "borrower" ? t("CreditDeals:borrowed") : t("CreditDeals:lent")}:<b>{` ${borrowedAmount} ${debtAsset.symbol}`} ({res.debt_asset})</b><br />{t("CreditDeals:loanCollateral")}<b>{` ${collateralAmount} ${collateralAsset.symbol}`} ({res.collateral_asset})</b><br />{type === "borrower" ? t("CreditDeals:borrower") : t("CreditDeals:lender")}:<b>{` ${((borrowedAmount * res.fee_rate) / 1000000).toFixed(debtAsset.precision)} ${debtAsset.symbol} (${res.fee_rate / 10000}%)`}</b><br />{t("CreditDeals:remainingTime")}<b>{remainingTime} ({res.latest_repay_time})</b></p>
        </div>
        {type === "borrower" ? (
          <div className="px-3 pb-0 mt-2 flex flex-wrap gap-2">
            <Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:brightness-110 hover:shadow-lg hover:shadow-[color:hsl(var(--accent-1)/0.5)] hover:-translate-y-px active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer" onClick={() => setOpenRepay(true)}>{t("CreditDeals:repayLoan")}</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:brightness-110 hover:shadow-lg hover:shadow-[color:hsl(var(--accent-1)/0.5)] hover:-translate-y-px active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer">{t("CreditDeals:buy", { symbol: debtAsset.symbol })}<ChevronDown className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-[hsl(var(--accent-1)/0.12)] hover:text-[hsl(var(--accent-1-fg))] focus:bg-[hsl(var(--accent-1)/0.12)] focus:text-[hsl(var(--accent-1-fg))] transition-colors">
                  <a href={dexHref} className="w-full">{t("CreditDeals:dexLimit")}</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-[hsl(var(--accent-1)/0.12)] hover:text-[hsl(var(--accent-1-fg))] focus:bg-[hsl(var(--accent-1)/0.12)] focus:text-[hsl(var(--accent-1-fg))] transition-colors">
                  <a href={instantTradeHref} className="w-full">{t("CreditDeals:instantTrade")}</a>
                </DropdownMenuItem>
                {swapHref ? (
                  <DropdownMenuItem asChild className="cursor-pointer hover:bg-[hsl(var(--accent-1)/0.12)] hover:text-[hsl(var(--accent-1-fg))] focus:bg-[hsl(var(--accent-1)/0.12)] focus:text-[hsl(var(--accent-1-fg))] transition-colors">
                    <a href={swapHref} className="w-full">{t("CreditDeals:simpleSwap")}</a>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            <a href={`/edit_deal.html?deal=${res.id}`}><Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:brightness-110 hover:shadow-lg hover:shadow-[color:hsl(var(--accent-1)/0.5)] hover:-translate-y-px active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer">{t("CreditDeals:editDeal")}</Button></a>
            {res.offer_id ? (
              <a href={`/offer.html?id=${res.offer_id}`}><Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:brightness-110 hover:shadow-lg hover:shadow-[color:hsl(var(--accent-1)/0.5)] hover:-translate-y-px active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer">{t("CreditDeals:borrowMore")}</Button></a>
            ) : null}
            {openRepay ? (
              <Dialog open={openRepay} onOpenChange={(open) => setOpenRepay(open)}>
                <DialogContent className="sm:max-w-[900px] bg-card">
                  <DialogHeader>
                    <DialogTitle>{t("CreditDeals:dialogTitle", { id: res.id })}</DialogTitle>
                    <DialogDescription>{t("CreditDeals:description")}</DialogDescription>
                    <form onSubmit={form.handleSubmit(() => setShowDialog(true))} className="gaps-5">
                      <FieldGroup>
                        <Field><FieldLabel htmlFor={`account-${idSuffix}`}>{t("CreditDeals:account")}</FieldLabel><FieldContent><Input id={`account-${idSuffix}`} disabled readOnly placeholder="Bitshares account" className="mb-3 mt-3" value={`${usr.username} (${usr.id})`} /></FieldContent></Field>
                        <Field><FieldLabel htmlFor={`balance-${idSuffix}`}>{t("CreditDeals:balance", { symbol: debtAsset.symbol })}</FieldLabel><FieldContent><Input id={`balance-${idSuffix}`} disabled readOnly className="mb-3 mt-3" value={`${debtAssetBalance} ${debtAsset.symbol}`} /></FieldContent></Field>
                        <Controller control={form.control} name="repayAmount" defaultValue="" render={({ field }) => (
                          <Field><FieldLabel htmlFor={`repay-${idSuffix}`}><div className="grid grid-cols-2 gap-2 mt-2"><div className="col-span-1">{t("CreditDeals:repayAmount", { symbol: debtAsset.symbol })}</div><div className="col-span-1 text-right">{t("CreditDeals:remainingDebt", { amount: borrowedAmount, symbol: debtAsset.symbol })}</div></div></FieldLabel><FieldDescription>{t("CreditDeals:repayDesc")}</FieldDescription><FieldContent><Input id={`repay-${idSuffix}`} className="mb-3" value={field.value ?? ""} placeholder={borrowedAmount} onChange={(e) => { const input = e.target.value; const regex = assetAmountRegex(debtAsset); if (regex.test(input)) { setInputValue(input); field.onChange(input); } }} /></FieldContent></Field>
                        )} />
                        <Field><FieldLabel htmlFor={`collateral-${idSuffix}`}><div className="grid grid-cols-2 gap-2 mt-2"><div className="col-span-1">{t("CreditDeals:redeemCollateral")}</div><div className="col-span-1 text-right">{t("CreditDeals:remainingCollateral", { amount: collateralAmount, symbol: collateralAsset.symbol })}</div></div></FieldLabel><FieldDescription>{t("CreditDeals:collateralRedemption", { symbol: collateralAsset.symbol })}</FieldDescription><FieldContent><Input id={`collateral-${idSuffix}`} value={redeemCollateral && collateralAmount ? `${redeemCollateral ?? "?"} ${collateralAsset.symbol} (${((redeemCollateral / collateralAmount) * 100).toFixed(2)}%)` : "0"} disabled readOnly className="mb-3" /></FieldContent></Field>
                        {finalRepayAmount ? (<Field><FieldLabel htmlFor={`loanfee-${idSuffix}`}><div className="mt-2">{t("CreditDeals:loanLabel")}</div></FieldLabel><FieldDescription>{t("CreditDeals:loanDesc")}</FieldDescription><FieldContent><Input id={`loanfee-${idSuffix}`} disabled placeholder="0" className="mb-3 mt-3" value={`${loanFee} (${debtAsset.symbol}) (${res.fee_rate / 10000}% fee)`} /></FieldContent></Field>) : null}
                        {finalRepayAmount ? (<Field><FieldLabel htmlFor={`final-${idSuffix}`}><div className="mt-2">{t("CreditDeals:finalPaymentLabel")}</div></FieldLabel><FieldDescription>{t("CreditDeals:finalPaymentDesc", { symbol: collateralAsset.symbol })}</FieldDescription><FieldContent><Input id={`final-${idSuffix}`} disabled placeholder="0" className="mb-3 mt-3" value={`${finalRepayment} (${debtAsset.symbol}) (debt + ${res.fee_rate / 10000}% fee)`} />{debtAssetBalance < finalRepayment ? (<FieldError>{t("CreditDeals:finalPaymentWarning", { symbol: debtAsset.symbol })}</FieldError>) : null}</FieldContent></Field>) : null}
                        <Field><FieldLabel htmlFor={`networkfee-${idSuffix}`}><div className="mt-2">{t("CreditDeals:networkFee")}</div></FieldLabel><FieldDescription>{t("CreditDeals:networkFeeDesc")}</FieldDescription><FieldContent><Input id={`networkfee-${idSuffix}`} disabled placeholder={`${fee} BTS`} className="mb-3 mt-3" />{usr.id === usr.referrer ? (<FieldError>{t("CreditDeals:rebate", { fee: fee * 0.8, chain: usr.chain === "bitshares" ? "BTS" : "TEST" })}</FieldError>) : null}</FieldContent></Field>
                        {!redeemCollateral || !finalRepayAmount || debtAssetBalance < finalRepayment ? (<Button className="mt-5 mb-3 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:brightness-110 hover:shadow-lg hover:shadow-[color:hsl(var(--accent-1)/0.5)] hover:-translate-y-px active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer" variant="outline" disabled type="submit">{t("CreditDeals:submit")}</Button>) : (<Button className="mt-5 mb-3 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:brightness-110 hover:shadow-lg hover:shadow-[color:hsl(var(--accent-1)/0.5)] hover:-translate-y-px active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer" variant="outline" type="submit">{t("CreditDeals:submit")}</Button>)}
                      </FieldGroup>
                    </form>
                    {showDialog ? (<DeepLinkDialog operationNames={["credit_deal_repay"]} username={usr.username} usrChain={usr.chain} userID={usr.id} dismissCallback={setShowDialog} key={`Repaying${finalRepayAmount}${debtAsset.symbol}toclaimback${collateralAsset.symbol}`} headerText={t("CreditDeals:deepLink", { finalRepayAmount: finalRepayAmount, debtAsset: debtAsset.symbol, collateralAsset: collateralAsset.symbol })} trxJSON={[{ account: usr.id, deal_id: res.id, repay_amount: { amount: blockchainFloat(finalRepayAmount, debtAsset.precision), asset_id: debtAsset.id }, credit_fee: { amount: blockchainFloat(loanFee, debtAsset.precision), asset_id: debtAsset.id }, extensions: [] }]} />) : null}
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        ) : (
          <div className="px-3 pb-0 mt-2">
            <a href={`/edit_deal.html?deal=${res.id}`}><Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:brightness-110 hover:shadow-lg hover:shadow-[color:hsl(var(--accent-1)/0.5)] hover:-translate-y-px active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer">{t("CreditDeals:viewDeal")}</Button></a>
          </div>
        )}
      </div>
    </div>
  );
});

const CreditDealsBorrowerRow = memo(function CreditDealsBorrowerRow({ index, style, borrowerDeals, assets, usrBalances, fee, t, usr, form, accountNames, pools }) {
  const res = borrowerDeals[index];
  if (!res) return null;
  return <CreditDealsCommonRow style={style} res={res} type="borrower" assets={assets} usrBalances={usrBalances} fee={fee} t={t} usr={usr} form={form} accountNames={accountNames} pools={pools} />;
});
const CreditDealsOwnerRow = memo(function CreditDealsOwnerRow({ index, style, lenderDeals, assets, usrBalances, fee, t, usr, form, accountNames, pools }) {
  const res = lenderDeals[index];
  if (!res) return null;
  return <CreditDealsCommonRow style={style} res={res} type="lender" assets={assets} usrBalances={usrBalances} fee={fee} t={t} usr={usr} form={form} accountNames={accountNames} pools={pools} />;
});

const CreditDealsSummaryRow = memo(function CreditDealsSummaryRow({ index, style, rows }) {
  const row = rows[index];
  if (!row) return null;
  return (
    <div style={{ ...style }}>
      <div className="mx-2 mb-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm text-left">
        <b className="font-mono tabular-nums">{row.amount} {row.symbol} <span className="text-muted-foreground font-normal">({row.assetId})</span></b>
      </div>
    </div>
  );
});

const CreditDealsSummarySection = memo(function CreditDealsSummarySection({ title, rows }) {
  if (!rows || !rows.length) return null;
  return (
    <div className="mt-1">
      <h4 className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{title}</h4>
      <List
        rowComponent={CreditDealsSummaryRow}
        rowCount={rows.length}
        rowHeight={46}
        rowProps={{ rows }}
        height={Math.min(rows.length * 46, 230)}
        width="100%"
      />
    </div>
  );
});

export default function CreditDeals(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNode = useStore($currentNode);

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const { _assetsBTS, _assetsTEST, _globalParamsBTS, _globalParamsTEST, _poolsBTS, _poolsTEST } =
    properties;

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

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const pools = useMemo(() => {
    if (_chain && (_poolsBTS || _poolsTEST)) {
      return _chain === "bitshares" ? _poolsBTS : _poolsTEST;
    }
    return [];
  }, [_poolsBTS, _poolsTEST, _chain]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 73);
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [borrowerDeals, setBorrowerDeals] = useState();
  useEffect(() => {
    async function fetchBorrowerDeals() {
      if (usr && usr.id) {
        const borrowerDealsStore = createBorrowerDealsStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        borrowerDealsStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setBorrowerDeals(data);
          }
        });
      }
    }

    fetchBorrowerDeals();
  }, [usr]);

  const [lenderDeals, setLenderDeals] = useState();
  useEffect(() => {
    async function fetchLenderDeals() {
      if (usr && usr.id) {
        const lenderDealsStore = createLenderDealsStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        lenderDealsStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setLenderDeals(data);
          }
        });
      }
    }

    fetchLenderDeals();
  }, [usr]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setUsrBalances(filteredData);
          }
        });
      }
    }

    fetchUserBalances();
  }, [usr]);

  const [accountNames, setAccountNames] = useState({});
  useEffect(() => {
    async function fetchCounterpartyNames() {
      const allIds = new Set([
        ...(borrowerDeals ?? []).map((d) => d.offer_owner),
        ...(lenderDeals ?? []).map((d) => d.borrower),
      ].filter(Boolean));
      const uniqueIds = Array.from(allIds);
      if (!usr?.chain || !uniqueIds.length || !currentNode?.url) return;
      const neededIds = uniqueIds.filter((id) => !accountNames[id]);
      if (!neededIds.length) return;
      const objectStore = createObjectStore([
        usr.chain,
        JSON.stringify(neededIds),
        currentNode.url,
      ]);
      objectStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const newAccounts = {};
          data.forEach((acc) => {
            if (acc?.id && acc?.name) newAccounts[acc.id] = acc.name;
          });
          if (Object.keys(newAccounts).length) {
            setAccountNames((prev) => ({ ...prev, ...newAccounts }));
          }
        } else if (error) {
          console.error("Error fetching credit deal account names:", error);
        }
      });
    }
    fetchCounterpartyNames();
  }, [borrowerDeals, lenderDeals, usr, currentNode]);

  const borrowSummary = useMemo(() => {
    const grouped = { debt: [], collateral: [], fees: [] };
    if (!borrowerDeals || !borrowerDeals.length || !assets.length) return grouped;
    const debtTotals = {};
    const collateralTotals = {};
    const feeTotals = {};
    borrowerDeals.forEach((d) => {
      const debtAsset = assets.find((x) => x.id === d.debt_asset);
      if (debtAsset) {
        debtTotals[d.debt_asset] = (debtTotals[d.debt_asset] ?? 0) + Number(d.debt_amount);
        const human = Number(humanReadableFloat(d.debt_amount, debtAsset.precision));
        feeTotals[d.debt_asset] = (feeTotals[d.debt_asset] ?? 0) + (human * d.fee_rate) / 1000000;
      }
      const collateralAsset = assets.find((x) => x.id === d.collateral_asset);
      if (collateralAsset) {
        collateralTotals[d.collateral_asset] = (collateralTotals[d.collateral_asset] ?? 0) + Number(d.collateral_amount);
      }
    });
    Object.entries(debtTotals).forEach(([assetId, raw]) => {
      const found = assets.find((x) => x.id === assetId);
      grouped.debt.push({ amount: humanReadableFloat(raw, found.precision), symbol: found.symbol, assetId });
    });
    Object.entries(collateralTotals).forEach(([assetId, raw]) => {
      const found = assets.find((x) => x.id === assetId);
      grouped.collateral.push({ amount: humanReadableFloat(raw, found.precision), symbol: found.symbol, assetId });
    });
    Object.entries(feeTotals).forEach(([assetId, total]) => {
      const found = assets.find((x) => x.id === assetId);
      grouped.fees.push({ amount: total.toFixed(found.precision), symbol: found.symbol, assetId });
    });
    return grouped;
  }, [borrowerDeals, assets]);

  const lendSummary = useMemo(() => {
    const grouped = { lent: [], collateral: [], earnings: [] };
    if (!lenderDeals || !lenderDeals.length || !assets.length) return grouped;
    const lentTotals = {};
    const collateralTotals = {};
    const earningsTotals = {};
    lenderDeals.forEach((d) => {
      const debtAsset = assets.find((x) => x.id === d.debt_asset);
      if (debtAsset) {
        lentTotals[d.debt_asset] = (lentTotals[d.debt_asset] ?? 0) + Number(d.debt_amount);
        const human = Number(humanReadableFloat(d.debt_amount, debtAsset.precision));
        earningsTotals[d.debt_asset] = (earningsTotals[d.debt_asset] ?? 0) + (human * d.fee_rate) / 1000000;
      }
      const collateralAsset = assets.find((x) => x.id === d.collateral_asset);
      if (collateralAsset) {
        collateralTotals[d.collateral_asset] = (collateralTotals[d.collateral_asset] ?? 0) + Number(d.collateral_amount);
      }
    });
    Object.entries(lentTotals).forEach(([assetId, raw]) => {
      const found = assets.find((x) => x.id === assetId);
      grouped.lent.push({ amount: humanReadableFloat(raw, found.precision), symbol: found.symbol, assetId });
    });
    Object.entries(collateralTotals).forEach(([assetId, raw]) => {
      const found = assets.find((x) => x.id === assetId);
      grouped.collateral.push({ amount: humanReadableFloat(raw, found.precision), symbol: found.symbol, assetId });
    });
    Object.entries(earningsTotals).forEach(([assetId, total]) => {
      const found = assets.find((x) => x.id === assetId);
      grouped.earnings.push({ amount: total.toFixed(found.precision), symbol: found.symbol, assetId });
    });
    return grouped;
  }, [lenderDeals, assets]);

  const [activeTab, setActiveTab] = useState("borrowings");

  const [dealControls, setDealControls] = useState({
    borrowings: { ...defaultTabControls },
    lendings: { ...defaultTabControls },
  });

  const updateTabControls = (tab, patch) =>
    setDealControls((prev) => ({ ...prev, [tab]: { ...prev[tab], ...patch } }));

  const clearTabControls = (tab) =>
    setDealControls((prev) => ({ ...prev, [tab]: { ...defaultTabControls } }));

  const visibleBorrowerDeals = useMemo(() => {
    if (!borrowerDeals) return undefined;
    const c = dealControls.borrowings;
    const filtered = borrowerDeals.filter(
      (d) =>
        (c.debt === "all" || d.debt_asset === c.debt) &&
        (c.collateral === "all" || d.collateral_asset === c.collateral) &&
        (c.party === "all" || d.offer_owner === c.party)
    );
    return applyDealSort(filtered, c.sort, assets);
  }, [borrowerDeals, dealControls, assets]);

  const visibleLenderDeals = useMemo(() => {
    if (!lenderDeals) return undefined;
    const c = dealControls.lendings;
    const filtered = lenderDeals.filter(
      (d) =>
        (c.debt === "all" || d.debt_asset === c.debt) &&
        (c.collateral === "all" || d.collateral_asset === c.collateral) &&
        (c.party === "all" || d.borrower === c.party)
    );
    return applyDealSort(filtered, c.sort, assets);
  }, [lenderDeals, dealControls, assets]);

  const visibleBorrowerRowProps = useMemo(
    () => ({
      borrowerDeals: visibleBorrowerDeals,
      assets,
      usrBalances,
      fee,
      t,
      usr,
      form,
      accountNames,
      pools,
    }),
    [
      visibleBorrowerDeals,
      assets,
      usrBalances,
      fee,
      t,
      usr,
      form,
      accountNames,
      pools,
    ]
  );
  const visibleOwnerRowProps = useMemo(
    () => ({
      lenderDeals: visibleLenderDeals,
      assets,
      usrBalances,
      fee,
      t,
      usr,
      form,
      accountNames,
      pools,
    }),
    [
      visibleLenderDeals,
      assets,
      usrBalances,
      fee,
      t,
      usr,
      form,
      accountNames,
      pools,
    ]
  );

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full lg:w-1/2">
        <div className="grid grid-cols-1 gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)]">
            <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-1)/0.2)] blur-3xl" />
            <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1)/0.7)] via-[hsl(var(--accent-2)/0.7)] to-[hsl(var(--accent-1)/0.7)]" />
            <div className="p-4 pb-0">
              <h2 className="text-lg font-semibold tracking-tight bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <FileSignature className="h-4.5 w-4.5" />
                </span>
                {t("CreditDeals:card.title")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("CreditDeals:card.description")}
              </p>
            </div>
            <div className="p-4 pt-2">
              <Tabs defaultValue="borrowings" className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-2 mt-4 mx-4 w-[calc(100%-2rem)] bg-muted/50">
                  <TabsTrigger
                    value="borrowings"
                    onClick={() => setActiveTab("borrowings")}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(var(--accent-1))] data-[state=active]:to-[hsl(var(--accent-2))] data-[state=active]:text-[hsl(var(--accent-1-gradFg))] data-[state=active]:shadow-md data-[state=active]:shadow-[color:hsl(var(--accent-1)/0.3)] transition-all duration-200 data-[state=inactive]:text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {activeTab === "borrowings"
                      ? t("CreditDeals:card.viewingBorrowings")
                      : t("CreditDeals:card.viewBorrowings")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="lendings"
                    onClick={() => setActiveTab("lendings")}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(var(--accent-1))] data-[state=active]:to-[hsl(var(--accent-2))] data-[state=active]:text-[hsl(var(--accent-1-gradFg))] data-[state=active]:shadow-md data-[state=active]:shadow-[color:hsl(var(--accent-1)/0.3)] transition-all duration-200 data-[state=inactive]:text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {activeTab === "lendings"
                      ? t("CreditDeals:card.viewingLendings")
                      : t("CreditDeals:card.viewLendings")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="borrowings">
                  {borrowerDeals && borrowerDeals.length ? (
                    <DealControls
                      deals={borrowerDeals}
                      assets={assets}
                      accountNames={accountNames}
                      controls={dealControls.borrowings}
                      onChange={(patch) =>
                        updateTabControls("borrowings", patch)
                      }
                      onClear={() => clearTabControls("borrowings")}
                      t={t}
                      partyKey="offer_owner"
                      partyLabel={t("CreditDeals:filterLender")}
                    />
                  ) : null}
                  {visibleBorrowerDeals && visibleBorrowerDeals.length ? (
                    <>
                      <div className="hidden md:block w-full h-[500px]">
                        <List
                          rowComponent={CreditDealsBorrowerRow}
                          rowCount={visibleBorrowerDeals.length}
                          rowHeight={180}
                          rowProps={visibleBorrowerRowProps}
                          height={500}
                          width="100%"
                        />
                      </div>
                      <div className="block md:hidden w-full h-[500px]">
                        <List
                          rowComponent={CreditDealsBorrowerRow}
                          rowCount={visibleBorrowerDeals.length}
                          rowHeight={235}
                          rowProps={visibleBorrowerRowProps}
                          height={500}
                          width="100%"
                        />
                      </div>
                    </>
                  ) : null}
                  {borrowerDeals && !borrowerDeals.length ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">❕</EmptyMedia>
                        <EmptyTitle>
                          {t("CreditDeals:card.noBorrowers")}
                        </EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <a href="/borrow.html">
                          <Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:brightness-110 hover:shadow-lg hover:shadow-[color:hsl(var(--accent-1)/0.5)] hover:-translate-y-px active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer">{t("Home:borrow.title")}</Button>
                        </a>
                      </EmptyContent>
                    </Empty>
                  ) : null}
                  {!borrowerDeals ? t("CreditDeals:card.loading") : null}
                  {borrowerDeals &&
                  borrowerDeals.length &&
                  visibleBorrowerDeals &&
                  !visibleBorrowerDeals.length ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">❕</EmptyMedia>
                        <EmptyTitle>
                          {t("CreditDeals:noFilterMatch")}
                        </EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          variant="outline"
                          onClick={() => clearTabControls("borrowings")}
                        >
                          {t("CreditDeals:clearFilters")}
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : null}
                </TabsContent>
                <TabsContent value="lendings">
                  {lenderDeals && lenderDeals.length ? (
                    <DealControls
                      deals={lenderDeals}
                      assets={assets}
                      accountNames={accountNames}
                      controls={dealControls.lendings}
                      onChange={(patch) => updateTabControls("lendings", patch)}
                      onClear={() => clearTabControls("lendings")}
                      t={t}
                      partyKey="borrower"
                      partyLabel={t("CreditDeals:filterBorrower")}
                    />
                  ) : null}
                  {visibleLenderDeals && visibleLenderDeals.length ? (
                    <>
                      <div className="hidden md:block w-full h-[500px]">
                        <List
                          rowComponent={CreditDealsOwnerRow}
                          rowCount={visibleLenderDeals.length}
                          rowHeight={160}
                          rowProps={visibleOwnerRowProps}
                          height={500}
                          width="100%"
                        />
                      </div>
                      <div className="block md:hidden w-full h-[500px]">
                        <List
                          rowComponent={CreditDealsOwnerRow}
                          rowCount={visibleLenderDeals.length}
                          rowHeight={210}
                          rowProps={visibleOwnerRowProps}
                          height={500}
                          width="100%"
                        />
                      </div>
                    </>
                  ) : null}
                  {lenderDeals && !lenderDeals.length ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">❕</EmptyMedia>
                        <EmptyTitle>
                          {t("CreditDeals:card.noLendings")}
                        </EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  ) : null}
                  {lenderDeals &&
                  lenderDeals.length &&
                  visibleLenderDeals &&
                  !visibleLenderDeals.length ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">❕</EmptyMedia>
                        <EmptyTitle>
                          {t("CreditDeals:noFilterMatch")}
                        </EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          variant="outline"
                          onClick={() => clearTabControls("lendings")}
                        >
                          {t("CreditDeals:clearFilters")}
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : null}
                  {!lenderDeals ? t("CreditDeals:card.loading") : null}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 mt-5">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)]">
            <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-1)/0.2)] blur-3xl" />
            <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1)/0.7)] via-[hsl(var(--accent-2)/0.7)] to-[hsl(var(--accent-1)/0.7)]" />
            <div className="p-4 pb-0">
              <h2 className="text-lg font-semibold tracking-tight bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <Coins className="h-4.5 w-4.5" />
                </span>
                {t("CreditDeals:summary.title")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("CreditDeals:summary.description")}
              </p>
            </div>
            <div className="p-4 pt-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-2 mt-4 mx-4 w-[calc(100%-2rem)] bg-muted/50">
                  <TabsTrigger
                    value="borrowings"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(var(--accent-1))] data-[state=active]:to-[hsl(var(--accent-2))] data-[state=active]:text-[hsl(var(--accent-1-gradFg))] data-[state=active]:shadow-md data-[state=active]:shadow-[color:hsl(var(--accent-1)/0.3)] transition-all duration-200 data-[state=inactive]:text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {activeTab === "borrowings"
                      ? t("CreditDeals:card.viewingBorrowings")
                      : t("CreditDeals:card.viewBorrowings")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="lendings"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(var(--accent-1))] data-[state=active]:to-[hsl(var(--accent-2))] data-[state=active]:text-[hsl(var(--accent-1-gradFg))] data-[state=active]:shadow-md data-[state=active]:shadow-[color:hsl(var(--accent-1)/0.3)] transition-all duration-200 data-[state=inactive]:text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {activeTab === "lendings"
                      ? t("CreditDeals:card.viewingLendings")
                      : t("CreditDeals:card.viewLendings")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="borrowings">
                  {!borrowerDeals ? t("CreditDeals:card.loading") : (
                    <>
                      <p className="text-sm text-muted-foreground px-2 pt-1 pb-2">
                        {t("CreditDeals:summary.dealCountBorrow", { count: borrowerDeals.length })}
                      </p>
                      {!borrowSummary.debt.length && !borrowSummary.collateral.length && !borrowSummary.fees.length ? (
                        <p className="text-sm text-muted-foreground px-2 pb-2">{t("CreditDeals:summary.empty")}</p>
                      ) : (
                        <>
                          <CreditDealsSummarySection title={t("CreditDeals:summary.totalBorrowed")} rows={borrowSummary.debt} />
                          <CreditDealsSummarySection title={t("CreditDeals:summary.totalCollateralProvided")} rows={borrowSummary.collateral} />
                          <CreditDealsSummarySection title={t("CreditDeals:summary.totalBorrowFees")} rows={borrowSummary.fees} />
                        </>
                      )}
                    </>
                  )}
                </TabsContent>
                <TabsContent value="lendings">
                  {!lenderDeals ? t("CreditDeals:card.loading") : (
                    <>
                      <p className="text-sm text-muted-foreground px-2 pt-1 pb-2">
                        {t("CreditDeals:summary.dealCountLend", { count: lenderDeals.length })}
                      </p>
                      {!lendSummary.lent.length && !lendSummary.collateral.length && !lendSummary.earnings.length ? (
                        <p className="text-sm text-muted-foreground px-2 pb-2">{t("CreditDeals:summary.empty")}</p>
                      ) : (
                        <>
                          <CreditDealsSummarySection title={t("CreditDeals:summary.totalLent")} rows={lendSummary.lent} />
                          <CreditDealsSummarySection title={t("CreditDeals:summary.totalCollateralBacking")} rows={lendSummary.collateral} />
                          <CreditDealsSummarySection title={t("CreditDeals:summary.totalEarnings")} rows={lendSummary.earnings} />
                        </>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 mt-5">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-warning)/0.1)]">
            <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-warning)/0.2)] to-[hsl(var(--accent-warning)/0.2)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-warning)/0.2)] to-[hsl(var(--accent-warning)/0.2)] blur-3xl" />
            <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-warning)/0.7)] via-[hsl(var(--accent-warning)/0.7)] to-[hsl(var(--accent-warning)/0.7)]" />
            <div className="p-4 pb-0">
              <h3 className="text-base font-semibold tracking-tight bg-gradient-to-r from-[hsl(var(--accent-warning))] to-[hsl(var(--accent-warning))] bg-clip-text text-transparent flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[hsl(var(--accent-warning-fg))]" />
                {activeTab === "borrowings"
                  ? t("CreditDeals:risks.borrowerTitle")
                  : t("CreditDeals:risks.lenderTitle")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("CreditDeals:risks.description")}
              </p>
            </div>
            <div className="p-4 pt-2 text-sm">
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                {activeTab === "borrowings" ? (
                  <li>
                    {t("CreditDeals:risks.borrower.risk1", {
                      username: usr?.username,
                    })}
                  </li>
                ) : (
                  <li>
                    {t("CreditDeals:risks.lender.risk1", {
                      username: usr?.username,
                    })}
                  </li>
                )}
                {activeTab === "borrowings" ? (
                  <li>{t("CreditDeals:risks.borrower.risk2")}</li>
                ) : (
                  <li>{t("CreditDeals:risks.lender.risk2")}</li>
                )}
                {activeTab === "lendings" ? (
                  <li>
                    {t("CreditDeals:risks.lender.risk3", {
                      username: usr?.username,
                    })}
                  </li>
                ) : null}
                {activeTab === "borrowings" ? (
                  <li>{t("CreditDeals:risks.borrower.risk3")}</li>
                ) : (
                  <li>{t("CreditDeals:risks.lender.risk4")}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
