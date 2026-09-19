import React, {
  useSyncExternalStore,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useInitCache } from "@/nanoeffects/Init.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";

import { createVestingBalanceStore } from "@/nanoeffects/VestingBalances.ts";

import { humanReadableFloat } from "@/lib/common.js";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { Coins, PiggyBank, TrendingUp, Clock, Calendar as Cal, ArrowUpCircle, Hourglass } from "lucide-react";

function hoursTillExpiration(expirationTime) {
  var expirationDate = new Date(expirationTime);
  var currentDate = new Date();
  var difference = expirationDate - currentDate;
  var hours = Math.round(difference / 1000 / 60 / 60);
  return hours;
}

function VestingRow({ index, style, chosenVestingData, assets, t, onClaim }) {
  let res = chosenVestingData[index];
  const foundAsset = assets.find((x) => x.id === res.balance.asset_id);

  if (!res || !foundAsset) {
    return null;
  }

  const readableBalance = ` ${humanReadableFloat(
    res.balance.amount,
    foundAsset.precision
  )} ${foundAsset.symbol}`;

  const policy = res.balance_type === "cashback" ? res.policy[1] : null;

  return (
    <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} key={`acard-${res.id}`}>
      <div className="m-2 rounded-2xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-[hsl(var(--accent-1)/0.02)] hover:border-[hsl(var(--accent-1)/0.5)] hover:shadow-[0_0_24px_-6px_hsl(var(--accent-1)/0.35)] transition-all px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
              <Coins className="h-3 w-3" />
            </span>
            <span className="font-mono text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
              {readableBalance}
            </span>
          </div>
          <Badge
            variant="outline"
            className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] text-[10px] font-mono"
          >
            {res.id}
          </Badge>
        </div>
        
        {policy ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-[hsl(var(--accent-2-fg))]" />
                <span className="text-[10px] text-muted-foreground">{t("Vesting:vesting_seconds")}</span>
                <span className="font-mono text-xs text-foreground/85">{policy.vesting_seconds}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cal className="h-3 w-3 text-[hsl(var(--accent-2-fg))]" />
                <span className="text-[10px] text-muted-foreground">{t("Vesting:start_claim")}</span>
                <span className="font-mono text-xs text-foreground/70">
                  {new Date(policy.start_claim).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-[hsl(var(--accent-2-fg))]" />
                <span className="text-[10px] text-muted-foreground">{t("Vesting:coin_seconds_earned")}</span>
                <span className="font-mono text-xs text-foreground/85">{policy.coin_seconds_earned}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-[hsl(var(--accent-2-fg))]" />
                <span className="text-[10px] text-muted-foreground">{t("Vesting:coin_seconds_earned_last_update")}</span>
                <span className="font-mono text-xs text-foreground/70">
                  {new Date(policy.coin_seconds_earned_last_update).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ) : null}
        
        <div className="mt-3 pt-3 border-t border-border/40">
          <Button
            onClick={() => {
              onClaim(res, readableBalance);
            }}
            className="w-full h-9 rounded-xl font-semibold transition-all bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_28px_-12px_hsl(var(--accent-1)/0.7)] hover:shadow-[0_12px_36px_-12px_hsl(var(--accent-3)/0.9)] hover:border-[hsl(var(--accent-3)/0.6)] border border-transparent"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            {t(
              `Vesting:${
                res.balance_type === "cashback" ? "claim_a" : "claim_b"
              }`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
const MemoVestingRow = React.memo(VestingRow);

export default function Vesting(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNodeUrl = useStore($currentNodeUrl);

  const [showDialog, setShowDialog] = useState(false);
  const [chosenVestingBalance, setChosenVestingBalance] = useState(null);

  const [vestingType, setVestingType] = useState("cashback");

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

  const vestingStore = useMemo(() => {
    if (!usr || !usr.chain || !usr.id || !currentNodeUrl) {
      return;
    }
    return createVestingBalanceStore([
      usr.chain,
      usr.id,
      currentNodeUrl || "",
    ]);
  }, [usr, currentNodeUrl]);

  const {
    data: vestingData,
    loading: vestingLoading,
    error: vestingError,
  } = useStore(vestingStore);

  const chosenVestingData = useMemo(() => {
    if (!vestingData || !vestingData.length) {
      return [];
    }
    return vestingData.filter((x) => x.balance_type === vestingType);
  }, [vestingData, vestingType]);

  const handleVestingClaim = useCallback((res, readableBalance) => {
    setChosenVestingBalance({ res, readableBalance });
    setShowDialog(true);
  }, []);

  const vestingRowProps = useMemo(() => ({ chosenVestingData, assets, t, onClaim: handleVestingClaim }), [chosenVestingData, assets, t, handleVestingClaim]);

  // Fixed row stride must exceed the tallest row content: cashback rows carry
  // a 4-cell policy grid that stacks on mobile, so the stride is responsive.
  const [isMobileRows, setIsMobileRows] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setIsMobileRows(window.innerWidth < 640);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const vestingRowHeight =
    vestingType === "cashback" ? (isMobileRows ? 320 : 224) : 136;

  return (
    <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:1/2">
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
          <div className="flex items-start gap-3 mb-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <Hourglass className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" strokeWidth={2.25} />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] text-[10px]"
                >
                  Vesting
                </Badge>
                <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  {t("Vesting:card.title")}
                </h3>
                {vestingData && vestingData.length ? (
                  <span className="inline-flex items-center rounded-full border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] px-2 py-0.5 font-mono tabular-nums text-[11px] text-[hsl(var(--accent-2-fg))]">
                    {vestingData.length}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Vesting:card.description")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <Button
              onClick={() => setVestingType("cashback")}
              variant={vestingType === "cashback" ? "" : "outline"}
              className={
                vestingType === "cashback"
                  ? "rounded-2xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-[hsl(var(--accent-1)/0.02)] text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.5)] h-auto py-3"
                  : "rounded-2xl border-border hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.03)] h-auto py-3"
              }
            >
              <Coins className="h-4 w-4 mr-2" />
              {t("Vesting:cashback")}
              {vestingData && vestingData.length ? (
                <span className="ml-1 font-mono text-[11px] opacity-80">
                  ({vestingData.filter((x) => x.balance_type === "cashback").length})
                </span>
              ) : null}
            </Button>
            <Button
              onClick={() => setVestingType("market_fee_sharing")}
              variant={vestingType === "market_fee_sharing" ? "" : "outline"}
              className={
                vestingType === "market_fee_sharing"
                  ? "rounded-2xl border border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.07)] to-[hsl(var(--accent-2)/0.02)] text-[hsl(var(--accent-2-fg))] hover:border-[hsl(var(--accent-2)/0.5)] h-auto py-3"
                  : "rounded-2xl border-border hover:border-[hsl(var(--accent-2)/0.3)] hover:bg-[hsl(var(--accent-2)/0.03)] h-auto py-3"
              }
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {t("Vesting:market_fees")}
              {vestingData && vestingData.length ? (
                <span className="ml-1 font-mono text-[11px] opacity-80">
                  ({vestingData.filter((x) => x.balance_type === "market_fee_sharing").length})
                </span>
              ) : null}
            </Button>
          </div>

          <>
            {chosenVestingData && chosenVestingData.length ? (
              <div className="w-full mt-4 h-[400px]">
                <List
                  height={400}
                  width="100%"
                  rowComponent={MemoVestingRow}
                  rowCount={chosenVestingData.length}
                  rowHeight={vestingRowHeight}
                  rowProps={vestingRowProps}
                />
              </div>
            ) : null}
            {chosenVestingData && !chosenVestingData.length ? (
              <Empty className="mt-4 border border-[hsl(var(--accent-1)/0.2)] rounded-xl bg-[hsl(var(--accent-1)/0.04)]">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
                    <PiggyBank className="w-6 h-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground/80">
                    {t("Vesting:card.empty")}
                  </EmptyTitle>
                  <EmptyDescription className="text-muted-foreground">
                    {t("Vesting:card.description")}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))]">
                    <a href="/ltm.html">
                      {t("Vesting:cashback")}
                    </a>
                  </Button>
                </EmptyContent>
              </Empty>
            ) : null}
          </>
        </div>
      </div>

      {showDialog ? (
        <DeepLinkDialog
          operationNames={["vesting_balance_withdraw"]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`deeplink-dialog-${chosenVestingBalance.res.id}`}
          headerText={t("Vesting:dialogContent.header", {
            readable: chosenVestingBalance.readableBalance,
          })}
          trxJSON={[
            {
              vesting_balance: chosenVestingBalance.res.id,
              owner: usr.id,
              amount: {
                amount: chosenVestingBalance.res.balance.amount,
                asset_id: chosenVestingBalance.res.balance.asset_id,
              },
            },
          ]}
        />
      ) : null}
    </div>
  );
}
