import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
  memo,
} from "react";
import { List } from "react-window";

const AVATAR_EXPRESSION = { eye: "normal", mouth: "smile" };
const MAX_VISIBLE_COLLATERAL = 8;

const CreditBorrowCommonRow = memo(function CreditBorrowCommonRow({ style, res, foundAsset, assets, balanceAssetIDs, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet }) {
  const offerID = res.id.replace("1.21.", "");
  const offeringAmount = humanReadableFloat(res.current_balance, foundAsset.precision);
  const isOutOfFunds = Number(res.current_balance) === 0;
  const feePct = (res.fee_rate / 10000).toFixed(2);
  const repayHours = (res.max_duration_seconds / 60 / 60).toFixed(res.max_duration_seconds / 60 / 60 < 1 ? 2 : 0);
  const minAmount = humanReadableFloat(res.min_deal_amount, foundAsset.precision);
  const validHours = hoursTillExpiration(res.auto_disable_time);
  const fullTitle = `${t("CreditBorrow:common.offer")} #${offerID} - ${t("CreditBorrow:common.offeringWord")} ${offeringAmount} ${foundAsset.symbol} - ${t("CreditBorrow:common.chargingWord")} ${feePct}% ${t("CreditBorrow:common.feeWord")}`;
  const collateralSymbols = useMemo(() => {
    if (!assets || !assets.length || !res.acceptable_collateral) return null;
    const out = [];
    for (let i = 0; i < res.acceptable_collateral.length; i++) {
      const id = res.acceptable_collateral[i][0];
      const symbol = assetById ? assetById.get(id)?.symbol : assets.find((y) => y.id === id)?.symbol;
      if (symbol) out.push(symbol);
    }
    return out;
  }, [res.acceptable_collateral, assets, assetById]);
  const orderedCollateral = useMemo(() => {
    if (!collateralSymbols) return null;
    return [...collateralSymbols].sort((a, b) => {
      const heldA = balanceSet
        ? (assetBySymbol?.get(a) && balanceSet.has(assetBySymbol.get(a).id) ? 0 : 1)
        : 0;
      const heldB = balanceSet
        ? (assetBySymbol?.get(b) && balanceSet.has(assetBySymbol.get(b).id) ? 0 : 1)
        : 0;
      return heldA - heldB;
    });
  }, [collateralSymbols, balanceSet, assetBySymbol]);
  const visibleCollateral = orderedCollateral ? orderedCollateral.slice(0, MAX_VISIBLE_COLLATERAL) : null;
  const hiddenCollateralCount = orderedCollateral ? orderedCollateral.length - visibleCollateral.length : 0;
  const validityClass = validHours < 0 ? "text-red-400/90" : validHours < 24 ? "text-amber-400/90" : "text-foreground/85";
  const validityText = validHours < 0 ? t("CreditBorrow:common.expiredShort") : `${validHours}h`;
  const isExpired = validHours < 0;
  const isFav = favouriteSet ? favouriteSet.has(res.owner_account) : (favouriteUsers || []).some((u) => u.id === res.owner_account);
  const isBlocked = blockSet ? blockSet.has(res.owner_account) : (chainUserBlockList || []).some((u) => u.id === res.owner_account);
  return (
    <div style={{ ...style, padding: "0 8px 10px 8px", overflow: "hidden" }} key={`acard-${res.id}`}>
      <Card className="h-full overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.03)] hover:shadow-md hover:shadow-[color:hsl(var(--accent-1)/0.05)] transition-all py-0 gap-0">
        <div className="p-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] flex-shrink-0">
                <HandCoins className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              <h3 title={fullTitle} className="text-[13px] font-semibold leading-tight truncate min-w-0">
                <span className="text-muted-foreground font-normal">{t("CreditBorrow:common.offer")} </span>
                <span className="font-mono tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">#{offerID}</span>
                <span className="text-muted-foreground/60 font-normal"> - </span>
                <span className="text-muted-foreground font-normal">{t("CreditBorrow:common.offeringWord")} </span>
                <span className="font-mono tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">{offeringAmount} {foundAsset.symbol}</span>
                <span className="text-muted-foreground/60 font-normal"> - </span>
                <span className="text-muted-foreground font-normal">{t("CreditBorrow:common.chargingWord")} </span>
                <span className="font-mono tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">{feePct}% {t("CreditBorrow:common.feeWord")}</span>
              </h3>
            </div>
            <Badge variant="outline" className="gap-1.5 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] text-[11px] py-0 px-1.5 flex-shrink-0 max-w-[45%]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" title={`${res.owner_name} (${res.owner_account})`} aria-label={`${res.owner_name} (${res.owner_account})`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer min-w-0">
                    <Avatar size={14} name={res.owner_name} extra="offer-owner" expression={AVATAR_EXPRESSION} />
                    <span className="whitespace-nowrap truncate">{res.owner_name}</span>
                    <span className="text-muted-foreground/50 text-[10px] flex-shrink-0 hidden sm:inline">({res.owner_account})</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => {
                      const chain = usr?.chain ?? "bitshares";
                      if (isFav) { removeFavouriteUser(chain, { name: res.owner_name, id: res.owner_account }); } else { addFavouriteUser(chain, { name: res.owner_name, id: res.owner_account }); }
                    }}
                  >
                    {isFav ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                    {isFav ? t("Blocklist:unfavouriteAccount") : t("Blocklist:favouriteAccount")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (isBlocked) return;
                      setBlockTarget({ name: res.owner_name, id: res.owner_account });
                      setBlockConfirmOpen(true);
                    }}
                    disabled={isBlocked}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    {isBlocked ? t("Blocklist:alreadyBlocked") : t("Blocklist:blockAccount")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Badge>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mb-1.5">
            <div className="w-full md:w-1/2 rounded-lg border border-border/60 bg-card/40 px-2 py-1">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">{t("CreditBorrow:common.accepting")}</div>
              <div className="font-mono text-xs tabular-nums text-foreground/85 leading-snug break-words min-h-[2.75em] max-h-[2.75em] overflow-hidden">
                {visibleCollateral ? (<>
                  {visibleCollateral.map((x, idx) => { const a = assetBySymbol ? assetBySymbol.get(x) : assets.find((y) => y.symbol === x); const hasBal = a && (balanceSet ? balanceSet.has(a.id) : balanceAssetIDs && balanceAssetIDs.includes(a.id)); return (<span key={`${x}-${idx}`} className={cn("inline", hasBal ? "font-semibold text-foreground" : "text-muted-foreground/60")}>{x}{idx < visibleCollateral.length - 1 || hiddenCollateralCount > 0 ? ", " : ""}</span>); })}
                  {hiddenCollateralCount > 0 && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 inline-flex cursor-help whitespace-nowrap rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-1.5 py-px font-sans text-[10px] font-medium text-[hsl(var(--accent-1-fg))]">{t("CreditBorrow:common.moreCollateral", { count: hiddenCollateralCount })}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs break-words">
                          {orderedCollateral.join(", ")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>) : t("CreditBorrow:common.loading")}
              </div>
            </div>
            <div className="w-full md:w-1/2 rounded-lg border border-border/60 bg-card/40 px-2 py-1">
              <div className="grid grid-cols-3 gap-2">
                <div className="min-w-0"><div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5 truncate">{t("CreditBorrow:common.repayPeriodLabel")}</div><div className="font-mono text-[11px] tabular-nums text-foreground/85">{repayHours}h</div></div>
                <div className="min-w-0"><div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5 truncate">{t("CreditBorrow:common.minLabel")}</div><div title={`${minAmount} ${foundAsset.symbol}`} className="font-mono text-[11px] tabular-nums text-foreground/85 truncate">{minAmount} {foundAsset.symbol}</div></div>
                <div className="min-w-0"><div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5 truncate">{t("CreditBorrow:common.validityLabel")}</div><div className={cn("font-mono text-[11px] tabular-nums", validityClass)}>{validityText}</div></div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">{isExpired ? (<span title={t("CreditBorrow:common.expiredOfferDescription")}><Button size="sm" disabled className="w-auto border border-border/60 bg-card/40 text-muted-foreground/70 cursor-not-allowed disabled:opacity-70">{t("CreditBorrow:common.expiredOffer", { offerID })}</Button></span>) : isOutOfFunds ? (<span title={t("CreditBorrow:common.outOfFundsDescription")}><Button size="sm" disabled className="w-auto border border-border/60 bg-card/40 text-muted-foreground/70 cursor-not-allowed disabled:opacity-70">{t("CreditBorrow:common.outOfFunds", { offerID })}</Button></span>) : (<a href={`/offer.html?id=${res.id}`}><Button size="sm" className="w-auto bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] transition-all">{t("CreditBorrow:common.proceed", { offerID })}<ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Button></a>)}<div className="flex items-center gap-2"><Dialog><DialogTrigger asChild><Button size="sm" variant="outline" className="w-auto border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]"><FileJson className="h-3.5 w-3.5 mr-1.5" />{t("CreditBorrow:common.json")}</Button></DialogTrigger><DialogContent className="!bg-card border border-border text-foreground/85 sm:max-w-[620px]"><DialogHeader><DialogTitle>{t("CreditBorrow:common.jsonTitle", { offerID })}</DialogTitle><DialogDescription className="text-muted-foreground/80">{t("CreditBorrow:common.jsonDescription")}</DialogDescription></DialogHeader><div className="grid grid-cols-1"><div className="col-span-1"><ScrollArea className="h-72 rounded-md border border-border bg-card/60 text-sm"><pre className="text-xs text-foreground/80 p-3 font-mono">{JSON.stringify(res, null, 2)}</pre></ScrollArea><Button variant="outline" className="mt-2 border-border bg-card/40 hover:border-[hsl(var(--accent-warning)/0.4)] hover:bg-[hsl(var(--accent-warning)/0.1)] text-foreground/80 hover:text-accent-foreground" onClick={() => { navigator.clipboard.writeText(JSON.stringify(res, null, 2)); }}><CircleCheck className="h-3.5 w-3.5 mr-1.5" />{t("DeepLinkDialog:tabsContent.copyOperationJSON")}</Button></div></div></DialogContent></Dialog><a href={`/lend.html?id=${res.id}`}><Button size="sm" variant="outline" className="w-auto border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]">{t(`CreditBorrow:common.${usr.id === res.owner_account ? "edit" : "view"}`, { offerID: res.id.replace("1.21.", "") })}</Button></a></div></div>
        </div>
      </Card>
    </div>
  );
});

const CreditBorrowBalanceRow = memo(function CreditBorrowBalanceRow({ index, style, compatibleOffers, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet }) {
  const res = compatibleOffers[index];
  if (!res) return null;
  const foundAsset = assetById ? assetById.get(res.asset_type) : assets.find((x) => x.id === res.asset_type);
  if (!foundAsset) return null;
  return <CreditBorrowCommonRow style={style} res={res} foundAsset={foundAsset} assets={assets} balanceAssetIDs={balanceAssetIDs} t={t} usr={usr} favouriteUsers={favouriteUsers} chainUserBlockList={chainUserBlockList} setBlockTarget={setBlockTarget} setBlockConfirmOpen={setBlockConfirmOpen} assetById={assetById} assetBySymbol={assetBySymbol} balanceSet={balanceSet} favouriteSet={favouriteSet} blockSet={blockSet} />;
});
const CreditBorrowOfferRow = memo(function CreditBorrowOfferRow({ index, style, offers, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet }) {
  const res = offers[index];
  if (!res) return null;
  const foundAsset = assetById ? assetById.get(res.asset_type) : assets.find((x) => x.id === res.asset_type);
  if (!foundAsset) return null;
  return <CreditBorrowCommonRow style={style} res={res} foundAsset={foundAsset} assets={assets} balanceAssetIDs={balanceAssetIDs} t={t} usr={usr} favouriteUsers={favouriteUsers} chainUserBlockList={chainUserBlockList} setBlockTarget={setBlockTarget} setBlockConfirmOpen={setBlockConfirmOpen} assetById={assetById} assetBySymbol={assetBySymbol} balanceSet={balanceSet} favouriteSet={favouriteSet} blockSet={blockSet} />;
});
const CreditBorrowSearchRow = memo(function CreditBorrowSearchRow({ index, style, thisResult, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet }) {
  const res = thisResult[index]?.item;
  if (!res) return null;
  const foundAsset = assetById ? assetById.get(res.asset_type) : assets.find((x) => x.id === res.asset_type);
  if (!foundAsset) return null;
  return <CreditBorrowCommonRow style={style} res={res} foundAsset={foundAsset} assets={assets} balanceAssetIDs={balanceAssetIDs} t={t} usr={usr} favouriteUsers={favouriteUsers} chainUserBlockList={chainUserBlockList} setBlockTarget={setBlockTarget} setBlockConfirmOpen={setBlockConfirmOpen} assetById={assetById} assetBySymbol={assetBySymbol} balanceSet={balanceSet} favouriteSet={favouriteSet} blockSet={blockSet} />;
});
import Fuse from "fuse.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import {
  HandCoins,
  Search,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Star,
  StarOff,
  Ban,
  FileJson,
  CircleCheck,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import { Avatar } from "./Avatar.tsx";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createCreditOfferStore } from "@/nanoeffects/CreditOffers.ts";
import {
  useChainObjectsLive,
  useAccountBalancesLive,
} from "@/hooks/useChainObjectsLive";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";
import { useInitCache } from "@/nanoeffects/Init.ts";

import { $currentUser } from "@/stores/users.ts";
import {
  $blockList,
  $userBlockList,
  addBlockedUser,
} from "@/stores/blocklist.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import {
  $favouriteUsers,
  addFavouriteUser,
  removeFavouriteUser,
} from "@/stores/favourites.ts";

import { humanReadableFloat, debounce } from "@/lib/common.js";

function hoursTillExpiration(expirationTime) {
  var expirationDate = new Date(expirationTime);
  var currentDate = new Date();
  var difference = expirationDate - currentDate;
  var hours = Math.round(difference / 1000 / 60 / 60);
  return hours;
}

function applyOfferFiltersAndSort(list, controls, normalizedAmount, offerIdNumber) {
  if (!list || !list.length) return [];
  let result = [...list];

  if (controls.lender !== "all") {
    result = result.filter((o) => o.owner_account === controls.lender);
  }

  if (controls.asset !== "all") {
    result = result.filter((o) => o.asset_type === controls.asset);
  }

  switch (controls.sort) {
    case "amount-asc":
      result.sort((a, b) => normalizedAmount(a) - normalizedAmount(b));
      break;
    case "amount-desc":
      result.sort((a, b) => normalizedAmount(b) - normalizedAmount(a));
      break;
    case "fee-asc":
      result.sort((a, b) => a.fee_rate - b.fee_rate);
      break;
    case "fee-desc":
      result.sort((a, b) => b.fee_rate - a.fee_rate);
      break;
    case "id-asc":
      result.sort((a, b) => offerIdNumber(a) - offerIdNumber(b));
      break;
    case "id-desc":
      result.sort((a, b) => offerIdNumber(b) - offerIdNumber(a));
      break;
    case "duration-asc":
      result.sort(
        (a, b) => a.max_duration_seconds - b.max_duration_seconds
      );
      break;
    case "duration-desc":
      result.sort(
        (a, b) => b.max_duration_seconds - a.max_duration_seconds
      );
      break;
    default:
      break;
  }

  return result;
}

const CreditBorrowFilterRow = memo(function CreditBorrowFilterRow({ controls, onChange, onClear, hasActiveFilters, lenderOptions, borrowAssetOptions, t }) {
  return (
    <div className="mb-3 flex flex-wrap items-end gap-2 px-1">
      <div className="flex min-w-[150px] flex-1 flex-col gap-1">
        <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {t("CreditBorrow:card.filterLender")}
        </span>
        <Select
          value={controls.lender}
          onValueChange={(v) =>
            onChange((prev) => ({ ...prev, lender: v }))
          }
        >
          <SelectTrigger className="border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus:ring-[hsl(var(--accent-1)/0.4)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("CreditBorrow:card.filterAll")}</SelectItem>
            {lenderOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[150px] flex-1 flex-col gap-1">
        <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {t("CreditBorrow:card.filterBorrowAsset")}
        </span>
        <Select
          value={controls.asset}
          onValueChange={(v) =>
            onChange((prev) => ({ ...prev, asset: v }))
          }
        >
          <SelectTrigger className="border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus:ring-[hsl(var(--accent-1)/0.4)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("CreditBorrow:card.filterAll")}</SelectItem>
            {borrowAssetOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[150px] flex-1 flex-col gap-1">
        <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {t("CreditBorrow:card.sortLabel")}
        </span>
        <Select
          value={controls.sort}
          onValueChange={(v) =>
            onChange((prev) => ({ ...prev, sort: v }))
          }
        >
          <SelectTrigger className="border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus:ring-[hsl(var(--accent-1)/0.4)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("CreditBorrow:card.sortNone")}</SelectItem>
            <SelectItem value="amount-asc">{t("CreditBorrow:card.sortAmountAsc")}</SelectItem>
            <SelectItem value="amount-desc">{t("CreditBorrow:card.sortAmountDesc")}</SelectItem>
            <SelectItem value="fee-asc">{t("CreditBorrow:card.sortFeeAsc")}</SelectItem>
            <SelectItem value="fee-desc">{t("CreditBorrow:card.sortFeeDesc")}</SelectItem>
            <SelectItem value="id-asc">{t("CreditBorrow:card.sortIdAsc")}</SelectItem>
            <SelectItem value="id-desc">{t("CreditBorrow:card.sortIdDesc")}</SelectItem>
            <SelectItem value="duration-asc">{t("CreditBorrow:card.sortDurationAsc")}</SelectItem>
            <SelectItem value="duration-desc">{t("CreditBorrow:card.sortDurationDesc")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="shrink-0 border-[hsl(var(--accent-1)/0.2)] bg-card/60 hover:bg-[hsl(var(--accent-1)/0.1)]"
        >
          {t("CreditBorrow:card.clearFilters")}
        </Button>
      ) : null}
    </div>
  );
});

const isValid = (str) => /^[a-zA-Z0-9.-]+$/.test(str);

export default function CreditBorrow(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
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
  const favouriteUsers = useStore($favouriteUsers)[usr?.chain ?? "bitshares"] ?? [];
  const userBlockList = useSyncExternalStore(
    $userBlockList.subscribe,
    $userBlockList.get,
    () => true
  );
  const chainUserBlockList = useMemo(() => {
    if (!userBlockList) return [];
    return userBlockList[usr?.chain ?? "bitshares"] ?? [];
  }, [userBlockList, usr]);

  const { _assetsBTS, _assetsTEST } = properties;

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

  const [allOffers, setAllOffers] = useState([]);
  const [showExpired, setShowExpired] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const creditOfferStore = createCreditOfferStore([
      _chain,
      currentNodeUrl || "",
    ]);

    const unsub = creditOfferStore.subscribe(({ data, error, loading }) => {
      if (cancelled) return;
      if (data && !error && !loading) {
        setAllOffers(data);
      }
    });

    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [_chain, currentNodeUrl]);

  const offers = useMemo(() => {
    if (_chain && allOffers && allOffers.length) {
      let currentOffers = allOffers;

      if (!showExpired) {
        currentOffers = currentOffers.filter(
          (x) => hoursTillExpiration(x.auto_disable_time) >= 0
        );
      }

      if (_chain === "bitshares" && blocklist && blocklist.users) {
        currentOffers = currentOffers.filter(
          (offer) =>
            !blocklist.users.includes(
              toHex(sha256(utf8ToBytes(offer.owner_account)))
            )
        );
      }

      if (chainUserBlockList && chainUserBlockList.length) {
        currentOffers = currentOffers.filter(
          (offer) =>
            !chainUserBlockList.some((u) => u.id === offer.owner_account)
        );
      }

      return currentOffers;
    }
    return [];
  }, [allOffers, _chain, blocklist, chainUserBlockList, showExpired]);

  const [offerControls, setOfferControls] = useState({
    sort: "none",
    lender: "all",
    asset: "all",
  });

  const lenderOptions = useMemo(() => {
    const ids = Array.from(
      new Set((offers ?? []).map((o) => o.owner_account).filter(Boolean))
    );
    return ids
      .map((id) => {
        const found = (offers ?? []).find((o) => o.owner_account === id);
        const name = found?.owner_name;
        return { value: id, label: name ? `${name} (${id})` : id };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [offers]);

  const borrowAssetOptions = useMemo(() => {
    const ids = Array.from(
      new Set((offers ?? []).map((o) => o.asset_type).filter(Boolean))
    );
    return ids
      .map((id) => {
        const found = (assets ?? []).find((a) => a.id === id);
        return { value: id, label: found ? `${found.symbol} (${id})` : id };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [offers, assets]);

  const normalizedAmount = useCallback(
    (offer) => {
      const found = (assets ?? []).find((a) => a.id === offer.asset_type);
      const precision = found?.precision ?? 5;
      return offer.current_balance / Math.pow(10, precision);
    },
    [assets]
  );

  const offerIdNumber = useCallback((offer) => {
    const parts = (offer.id ?? "").split(".");
    const num = parseInt(parts[2] ?? parts[parts.length - 1] ?? "0", 10);
    return Number.isNaN(num) ? 0 : num;
  }, []);

  const displayedOffers = useMemo(() => {
    return applyOfferFiltersAndSort(offers, offerControls, normalizedAmount, offerIdNumber);
  }, [offers, offerControls, normalizedAmount, offerIdNumber]);

  const hasActiveOfferFilters =
    offerControls.sort !== "none" ||
    offerControls.lender !== "all" ||
    offerControls.asset !== "all";

  const clearOfferControls = useCallback(() => {
    setOfferControls({ sort: "none", lender: "all", asset: "all" });
  }, []);

  const filterRowElement = (
    <CreditBorrowFilterRow
      controls={offerControls}
      onChange={setOfferControls}
      onClear={clearOfferControls}
      hasActiveFilters={hasActiveOfferFilters}
      lenderOptions={lenderOptions}
      borrowAssetOptions={borrowAssetOptions}
      t={t}
    />
  );

  const [activeTab, setActiveTab] = useState("allOffers");
  const [activeSearch, setActiveSearch] = useState("borrow");
  const [thisInput, setThisInput] = useState();
  const [thisResult, setThisResult] = useState();

  const [usrBalances, setUsrBalances] = useState();
  const [balanceAssetIDs, setBalanceAssetIDs] = useState([]);
  const assetIdSet = useMemo(() => new Set((assets || []).map((x) => x.id)), [assets]);
  useEffect(() => {
    if (!(usr && usr.id)) return;
    let cancelled = false;
    const userBalancesStore = createUserBalancesStore([
      usr.chain,
      usr.id,
      currentNodeUrl || "",
    ]);

    const unsub = userBalancesStore.subscribe(({ data, error, loading }) => {
      if (cancelled) return;
      if (data && !error && !loading) {
        const filteredData = data.filter((balance) =>
          assetIdSet.has(balance.asset_id)
        );

        setBalanceAssetIDs(filteredData.map((x) => x.asset_id));
        setUsrBalances(filteredData);
      }
    });

    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [usr, currentNodeUrl, assetIdSet]);

  // Live balances (push per block when user state changes)
  const liveBorrowBalances = useAccountBalancesLive({
    chain: usr ? usr.chain : _chain,
    accountId: usr ? usr.id : null,
    enabled: Boolean(usr && usr.id),
    specificNode: currentNodeUrl || null,
  });
  useEffect(() => {
    if (liveBorrowBalances.balances && assets && assets.length) {
      const filteredData = liveBorrowBalances.balances.filter((balance) =>
        assetIdSet.has(balance.asset_id)
      );
      if (filteredData.length) {
        setBalanceAssetIDs(filteredData.map((x) => x.asset_id));
        setUsrBalances(filteredData);
      }
    }
  }, [liveBorrowBalances.balances, assets, assetIdSet]);

  // Live subscription for *visible* offers so new/updated offers appear
  // without a page refresh. The heavy full scan stays one-shot.
  const visibleOfferIds = useMemo(() => offers.map((x) => x.id), [offers]);
  const liveOffers = useChainObjectsLive({
    chain: _chain,
    ids: visibleOfferIds,
    enabled: Boolean(_chain && visibleOfferIds.length > 0),
    specificNode: currentNodeUrl || null,
  });
  useEffect(() => {
    if (!liveOffers.objects || !allOffers || !allOffers.length) return;
    let changed = false;
    const merged = allOffers.map((offer) => {
      const live = liveOffers.objects[offer.id];
      if (!live) return offer;
      let differs = false;
      for (const k of Object.keys(live)) {
        if (offer[k] !== live[k]) { differs = true; break; }
      }
      if (differs) {
        changed = true;
        return { ...offer, ...live };
      }
      return offer;
    });
    if (changed) setAllOffers(merged);
  }, [liveOffers.objects]);

  const compatibleOffers = useMemo(() => {
    if (!offers || !balanceAssetIDs) return [];
    const held = new Set(balanceAssetIDs);
    return offers.filter((offer) => {
      return offer.acceptable_collateral.some((x) => held.has(x[0]));
    });
  }, [offers, balanceAssetIDs]);

  const assetByIdForSearch = useMemo(() => {
    const m = new Map();
    for (const a of assets || []) m.set(a.id, a);
    return m;
  }, [assets]);

  const offerSearch = useMemo(() => {
    if (!offers || !offers.length || !assets || !assets.length) {
      return;
    }

    const adjustedOffers = [];
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      if (!offer) {
        continue;
      }
      const copy = { ...offer };
      if (copy.acceptable_collateral) {
        copy.collateral_symbols = copy.acceptable_collateral
          .map((asset) => assetByIdForSearch.get(asset[0])?.symbol)
          .filter((x) => x);
      }
      copy.offer_symbols = [
        assetByIdForSearch.get(copy.asset_type)?.symbol,
      ].filter(Boolean);
      adjustedOffers.push(copy);
    }

    let keys = [];
    if (activeSearch === "borrow") {
      keys = ["offer_symbols"];
    } else if (activeSearch === "collateral") {
      keys = ["collateral_symbols"];
    } else if (activeSearch === "owner_name") {
      keys = ["owner_name"];
    }
    return new Fuse(adjustedOffers, {
      includeScore: true,
      threshold: 0.2,
      keys: keys,
    });
  }, [offers, assets, assetByIdForSearch, activeSearch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());

    let finalTab = "";
    let finalSearchTab = "";
    let searchInput = "";
    let finalURL = "?";
    if (
      params &&
      params.tab &&
      ["allOffers", "availableOffers", "searchOffers"].includes(params.tab)
    ) {
      finalTab = params.tab;
      finalURL += `tab=${params.tab}`;
    } else {
      finalTab = "allOffers";
      finalURL += "tab=allOffers";
    }

    if (
      params &&
      params.tab &&
      params.tab === "searchOffers" &&
      params.searchTab
    ) {
      if (["borrow", "collateral", "owner_name"].includes(params.searchTab)) {
        finalSearchTab = params.searchTab;
        finalURL += `&searchTab=${params.searchTab}`;
      } else {
        finalSearchTab = "borrow";
        finalURL += "&searchTab=borrow";
      }
    }

    if (
      params &&
      params.tab &&
      params.searchTab &&
      params.tab === "searchOffers" &&
      params.searchText &&
      params.searchText.length
    ) {
      if (isValid(params.searchText)) {
        searchInput = params.searchText;
        finalURL += `&searchText=${params.searchText}`;
      } else {
        searchInput = "";
        finalURL += "&searchText=bts";
      }
    }

    setActiveTab(finalTab);
    setActiveSearch(finalSearchTab);
    setThisInput(searchInput);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", finalURL);
    }
  }, []);

  useEffect(() => {
    if (offerSearch && thisInput) {
      if (!isValid(thisInput)) {
        return;
      }
      if (typeof window !== "undefined") {
        window.history.replaceState(
          {},
          "",
          `?tab=searchOffers&searchTab=${activeSearch ?? "borrow"}${
            thisInput ? `&searchText=${thisInput}` : ""
          }`
        );
      }
      const result = offerSearch.search(thisInput);
      setThisResult(result);
    }
  }, [offerSearch, thisInput, activeSearch]);

  const displayedCompatibleOffers = useMemo(() => {
    return applyOfferFiltersAndSort(compatibleOffers, offerControls, normalizedAmount, offerIdNumber);
  }, [compatibleOffers, offerControls, normalizedAmount, offerIdNumber]);

  const displayedSearchResult = useMemo(() => {
    if (!thisResult || !thisResult.length) return thisResult;
    // Filter Fuse hits by shared lender/asset controls
    let filtered = thisResult.filter(({ item }) => {
      if (!item) return false;
      if (offerControls.lender !== "all" && item.owner_account !== offerControls.lender) return false;
      if (offerControls.asset !== "all" && item.asset_type !== offerControls.asset) return false;
      return true;
    });
    // Apply shared sort; when sort is "none" keep Fuse relevance order
    if (offerControls.sort === "none") return filtered;
    const items = filtered.map((r) => r.item);
    const sortedItems = applyOfferFiltersAndSort(
      items,
      { ...offerControls, lender: "all", asset: "all" },
      normalizedAmount,
      offerIdNumber
    );
    const order = new Map(sortedItems.map((o, idx) => [o.id, idx]));
    return [...filtered].sort((a, b) => (order.get(a.item.id) ?? 0) - (order.get(b.item.id) ?? 0));
  }, [thisResult, offerControls, normalizedAmount, offerIdNumber]);

  const assetById = useMemo(() => {
    const m = new Map();
    for (const a of assets || []) if (a?.id) m.set(a.id, a);
    return m;
  }, [assets]);
  const assetBySymbol = useMemo(() => {
    const m = new Map();
    for (const a of assets || []) if (a?.symbol) m.set(a.symbol, a);
    return m;
  }, [assets]);
  const balanceSet = useMemo(() => new Set(balanceAssetIDs || []), [balanceAssetIDs]);
  const favouriteSet = useMemo(() => new Set((favouriteUsers || []).map((u) => u.id)), [favouriteUsers]);
  const blockSet = useMemo(() => new Set((chainUserBlockList || []).map((u) => u.id)), [chainUserBlockList]);

  const creditBorrowCommonProps = useMemo(() => ({ assets, t, usr, favouriteUsers, chainUserBlockList, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet }), [assets, t, usr, favouriteUsers, chainUserBlockList, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet]);
  const offerRowProps = useMemo(() => ({ offers: displayedOffers, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet }), [displayedOffers, assets, t, usr, favouriteUsers, chainUserBlockList, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet]);
  const balanceRowProps = useMemo(() => ({ compatibleOffers: displayedCompatibleOffers, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet }), [displayedCompatibleOffers, assets, t, usr, favouriteUsers, chainUserBlockList, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet]);
  const searchRowProps = useMemo(() => ({ thisResult: displayedSearchResult, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet }), [displayedSearchResult, assets, t, usr, favouriteUsers, chainUserBlockList, balanceAssetIDs, assetById, assetBySymbol, balanceSet, favouriteSet, blockSet]);

  const [thisSearchInput, setThisSearchInput] = useState();

  const debouncedSetSearchInput = useCallback(
    debounce((event) => {
      const value = event.target.value;
      setThisInput(value);
      if (typeof window !== "undefined") {
        window.history.replaceState(
          {},
          "",
          `?tab=searchOffers&searchTab=${activeSearch}&searchText=${value}`
        );
      }
    }, 500),
    [activeSearch]
  );

  const tabs = [
    { id: "allOffers", label: t("CreditBorrow:card.viewAll"), activeLabel: t("CreditBorrow:card.viewingAll"), icon: Sparkles },
    { id: "availableOffers", label: t("CreditBorrow:card.viewAvailable"), activeLabel: t("CreditBorrow:card.viewingAvailable"), icon: ShieldCheck },
    { id: "searchOffers", label: t("CreditBorrow:card.viewSearch"), activeLabel: t("CreditBorrow:card.viewingSearch"), icon: Search },
  ];

  const searchTabs = [
    { id: "borrow", label: t("CreditBorrow:card.borrowSearch"), activeLabel: t("CreditBorrow:card.borrowSearching") },
    { id: "collateral", label: t("CreditBorrow:card.collateralSearch"), activeLabel: t("CreditBorrow:card.collateralSearching") },
    { id: "owner_name", label: t("CreditBorrow:card.ownerSearch"), activeLabel: t("CreditBorrow:card.ownerSearching") },
  ];

  return (
    <div className="container mx-auto mt-5 mb-5 w-full lg:w-3/4">
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)] py-0 gap-0">
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
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <HandCoins className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("CreditBorrow:card.title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("CreditBorrow:card.description")}
                </p>
              </div>
            </div>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={showExpired ? t("CreditBorrow:card.hideExpired") : t("CreditBorrow:card.showExpired")}
                    onClick={() => setShowExpired(!showExpired)}
                    className={cn(
                      "h-9 w-9 rounded-xl border transition-all",
                      showExpired
                        ? "border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.15)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                        : "border-border bg-card/60 text-muted-foreground hover:border-[hsl(var(--accent-1)/0.4)] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]"
                    )}
                  >
                    {showExpired ? <EyeOpenIcon className="h-4 w-4" /> : <EyeClosedIcon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-card border-border text-foreground/85">
                  <p>{showExpired ? t("CreditBorrow:card.hideExpired") : t("CreditBorrow:card.showExpired")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {allOffers && allOffers.length ? (
            <>
              <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 mb-5">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <Button
                      key={tab.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (activeTab !== tab.id) {
                          setActiveTab(tab.id);
                          window.history.replaceState(
                            {},
                            "",
                            `?tab=${tab.id}`
                          );
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center gap-1.5",
                        active
                          ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] dark:text-white border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(16,185,129,0.6)]"
                          : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {active ? tab.activeLabel : tab.label}
                    </Button>
                  );
                })}
              </div>

              {activeTab === "allOffers" && (
                <div>
                  <div className="mb-3 flex flex-wrap items-end gap-2 px-1">
                    <Sparkles className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                    <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                      {t("CreditBorrow:card.allOffers")}
                    </span>
                    <span className="text-xs text-muted-foreground/60">·</span>
                    <span className="text-xs text-muted-foreground">
                      {displayedOffers.length} {displayedOffers.length === 1 ? "offer" : "offers"}
                      {hasActiveOfferFilters && displayedOffers.length !== offers.length ? ` (${t("CreditBorrow:card.ofFilter", { count: offers.length })})` : ""}
                    </span>
                  </div>
                  {filterRowElement}
                  {assets && displayedOffers && displayedOffers.length ? (
                    <div className="w-full h-[600px]">
                      <List
                        rowComponent={CreditBorrowOfferRow}
                        rowCount={displayedOffers.length}
                        rowHeight={isDesktop ? 172 : 235}
                        rowProps={offerRowProps}
                        height={600}
                        width="100%"
                      />
                    </div>
                  ) : null}
                  {assets && offers && offers.length && !displayedOffers.length ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {t("CreditBorrow:card.noFilterMatch")}
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === "availableOffers" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <ShieldCheck className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                    <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                      {t("CreditBorrow:card.availableOffers")}
                    </span>
                    <span className="text-xs text-muted-foreground/60">·</span>
                    <span className="text-xs text-muted-foreground">
                      {displayedCompatibleOffers.length} compatible
                      {hasActiveOfferFilters && displayedCompatibleOffers.length !== compatibleOffers.length ? ` (${t("CreditBorrow:card.ofFilter", { count: compatibleOffers.length })})` : ""}
                    </span>
                  </div>
                  {filterRowElement}
                  {assets && displayedCompatibleOffers && displayedCompatibleOffers.length ? (
                    <div className="w-full h-[600px]">
                      <List
                        rowComponent={CreditBorrowBalanceRow}
                        rowCount={displayedCompatibleOffers.length}
                        rowHeight={isDesktop ? 172 : 235}
                        rowProps={balanceRowProps}
                        height={600}
                        width="100%"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {assets && compatibleOffers && compatibleOffers.length && !displayedCompatibleOffers.length
                        ? t("CreditBorrow:card.noFilterMatch")
                        : t("CreditBorrow:card.noCompatibleOffers")}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "searchOffers" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Search className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                    <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                      {t("CreditBorrow:card.searchPrompt")}
                    </span>
                  </div>

                  <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 mb-3">
                    {searchTabs.map((tab) => {
                      const active = activeSearch === tab.id;
                      return (
                        <Button
                          key={tab.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (activeSearch !== tab.id) {
                              setActiveSearch(tab.id);
                              window.history.replaceState(
                                {},
                                "",
                                `?tab=searchOffers&searchTab=${tab.id}${
                                  thisInput ? `&searchText=${thisInput}` : ""
                                }`
                              );
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                            active
                              ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] dark:text-white border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(16,185,129,0.6)]"
                              : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                          )}
                        >
                          {active ? tab.activeLabel : tab.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      name="searchInput"
                      placeholder={thisSearchInput ?? t("Smartcoins:enterSearchText")}
                      className="pl-9 bg-card/40 border-border focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                      value={thisSearchInput || ""}
                      onChange={(event) => {
                        setThisSearchInput(event.target.value);
                        debouncedSetSearchInput(event);
                      }}
                    />
                  </div>

                  {filterRowElement}

                  {["borrow", "collateral", "owner_name"].includes(activeSearch) && (
                    <>
                      {displayedSearchResult && displayedSearchResult.length ? (
                        <div className="w-full h-[600px]">
                          <List
                            rowComponent={CreditBorrowSearchRow}
                            rowCount={displayedSearchResult.length}
                            rowHeight={isDesktop ? 172 : 235}
                            rowProps={searchRowProps}
                            height={600}
                            width="100%"
                          />
                        </div>
                      ) : null}
                      {thisInput && thisResult && thisResult.length && displayedSearchResult && !displayedSearchResult.length ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t("CreditBorrow:card.noFilterMatch")}
                        </div>
                      ) : null}
                      {thisInput && thisResult && !thisResult.length ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t("CreditBorrow:card.noResults")}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12">
              <Spinner className="size-6 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
              <p className="text-foreground/70 text-sm">
                {t("CreditBorrow:card.loading")}
              </p>
            </div>
          )}
        </div>
      </Card>

      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Blocklist:blockConfirmTitle", { name: blockTarget?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("Blocklist:blockConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Blocklist:blockConfirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(var(--accent-danger))] hover:bg-[hsl(var(--accent-danger))] text-[hsl(var(--accent-danger-gradFg))]"
              onClick={() => {
                if (blockTarget) {
                  const chain = usr?.chain ?? "bitshares";
                  addBlockedUser(chain, blockTarget);
                }
                setBlockTarget(null);
                setBlockConfirmOpen(false);
              }}
            >
              {t("Blocklist:blockConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DexLiveFooterCard
        lastFetchAt={liveOffers.lastFetchAt}
        isSubscribed={liveOffers.isSubscribed}
        blockNumber={liveOffers.blockNumber}
        nodeUrl={currentNodeUrl || null}
        warningThresholdSec={10}
      
        chain={_chain}/>
    </div>
  );
}
