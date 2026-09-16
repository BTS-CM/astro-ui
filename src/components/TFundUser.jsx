import React, {
  useSyncExternalStore,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  ArrowDownUp,
  Handshake,
  Landmark,
  Percent,
  Sparkles,
  Banknote,
  TrendingUp,
  Wallet,
  Zap,
  ChevronRight,
  Info,
  Plus,
} from "lucide-react";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createEverySameTFundStore } from "@/nanoeffects/SameTFunds.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";

import {
  humanReadableFloat,
  blockchainFloat,
  assetAmountRegex,
} from "@/lib/common.js";
import { $currentNodeUrl } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { cn } from "@/lib/utils";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import LimitOrderWizard from "./Market/LimitOrderWizard.jsx";

const STEP_ACCENTS = {
  1: {
    bar: "from-[hsl(var(--accent-1)/0.8)] via-[hsl(var(--accent-1)/0.8)] to-[hsl(var(--accent-1)/0.8)]",
    glow: "bg-[hsl(var(--accent-1)/0.1)]",
    border: "border-[hsl(var(--accent-1)/0.25)]",
    text: "dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]",
    bg: "from-[hsl(var(--accent-1)/0.06)] to-transparent",
  },
  2: {
    bar: "from-[hsl(var(--accent-2)/0.8)] via-[hsl(var(--accent-2)/0.8)] to-[hsl(var(--accent-2)/0.8)]",
    glow: "bg-[hsl(var(--accent-2)/0.1)]",
    border: "border-[hsl(var(--accent-2)/0.25)]",
    text: "dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]",
    bg: "from-[hsl(var(--accent-2)/0.06)] to-transparent",
  },
  3: {
    bar: "from-[hsl(var(--accent-success)/0.8)] via-[hsl(var(--accent-success)/0.8)] to-[hsl(var(--accent-2)/0.8)]",
    glow: "bg-[hsl(var(--accent-success)/0.1)]",
    border: "border-[hsl(var(--accent-success)/0.25)]",
    text: "dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))]",
    bg: "from-[hsl(var(--accent-success)/0.06)] to-transparent",
  },
};

export default function TFundUser(properties) {
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

  const {
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;

  const [sameTFunds, setSameTFunds] = useState();
  const [loadingFunds, setLoadingFunds] = useState(true);
  const [lenderAccounts, setLenderAccounts] = useState([]);
  const [usrBalances, setUsrBalances] = useState();

  const [borrowPositions, setBorrowPositions] = useState([]);
  const [operations, setOperations] = useState([]);

  const [sellingAsset, setSellingAsset] = useState(null);
  const [buyingAsset, setBuyingAsset] = useState(null);

  const [addOperationDialog, setAddOperationDialog] = useState(false);
  const [deeplinkDialog, setDeeplinkDialog] = useState(false);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [limitOrderFee, setLimitOrderFee] = useState(0);
  const [sameTFundBorrowFee, setSameTFundBorrowFee] = useState(0);
  const [sameTFundRepayFee, setSameTFundRepayFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const fee1 = globalParams.find((x) => x.id === 1);
      const finalFee = humanReadableFloat(fee1.data.fee, 5);
      setLimitOrderFee(finalFee);

      const fee67 = globalParams.find((x) => x.id === 67);
      const finalFee67 = humanReadableFloat(fee67.data.fee, 5);
      setSameTFundBorrowFee(finalFee67);

      const fee68 = globalParams.find((x) => x.id === 68);
      const finalFee68 = humanReadableFloat(fee68.data.fee, 5);
      setSameTFundRepayFee(finalFee68);
    }
  }, [globalParams]);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      let _ref =
        usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
      return usr.chain === "bitshares" && blocklist && blocklist.users
        ? _ref.filter(
            (asset) =>
              !blocklist.users.includes(
                toHex(
                  sha256(
                    utf8ToBytes(
                      asset.u.split(" ")[1].replace("(", "").replace(")", "")
                    )
                  )
                )
              )
          )
        : _ref;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);

  useEffect(() => {
    async function fetching() {
      setLoadingFunds(true);
      const sameTFundsStore = createEverySameTFundStore([
        _chain,
        currentNodeUrl || "",
      ]);

      sameTFundsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          let filteredData = data.filter((x) => x);
          if (_chain === "bitshares") {
            filteredData = filteredData
              .filter(
                (x) =>
                  !blocklist.users.includes(
                    toHex(sha256(utf8ToBytes(x.owner_account)))
                  )
              )
              .filter(
                (x) => x.fee_rate < 500000
              );
          }
          setSameTFunds(filteredData);
          setLoadingFunds(false);
        }
      });
    }

    if (_chain && currentNodeUrl) {
      fetching();
    }
  }, [_chain, currentNodeUrl]);

  const allUserIDs = useMemo(() => {
    if (sameTFunds && sameTFunds.length) {
      const uniqueIDs = new Set(sameTFunds.map((x) => x.owner_account));
      return Array.from(uniqueIDs);
    }
    return [];
  }, [sameTFunds]);

  useEffect(() => {
    async function fetching() {
      const objectsStore = createObjectStore([
        _chain,
        JSON.stringify(allUserIDs),
        currentNodeUrl || "",
      ]);

      objectsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setLenderAccounts(data);
        }
      });
    }

    if (allUserIDs.length && _chain && currentNodeUrl) {
      fetching();
    }
  }, [allUserIDs, _chain, currentNodeUrl]);

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
            setUsrBalances(filteredData);
          }
        });
      }
    }
    fetchUserBalances();
  }, [usr]);

  const operationsJSON = useMemo(() => {
    let _operationChain = [];
    if (
      !usr ||
      !usr.id ||
      !sameTFunds ||
      !sameTFunds.length ||
      !operations.length ||
      !borrowPositions.length
    ) {
      return _operationChain;
    }

    borrowPositions.forEach((x) => {
      const _id = x.id;
      const _borrowAssetID = x.asset_id;
      const _borrowAmount = parseFloat(x.borrow_amount);

      const _referenceFundAsset = assets.find((x) => x.id === _borrowAssetID);
      _operationChain.push({
        borrower: usr.id,
        fund_id: _id,
        borrow_amount: {
          amount: blockchainFloat(_borrowAmount, _referenceFundAsset.precision),
          asset_id: _referenceFundAsset.id,
        },
        extensions: {},
      });
    });

    operations.forEach((operation) => {
      const _purchasedAsset = assets.find(
        (x) => x.id === operation.final_asset_purchased
      );
      const _soldAsset = assets.find(
        (x) => x.id === operation.final_asset_sold
      );
      const date = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

      const _amountToSell = blockchainFloat(
        parseFloat(operation.final_buy_amount) *
          parseFloat(operation.final_price),
        _soldAsset.precision
      );

      const _amountToReceive = blockchainFloat(
        parseFloat(operation.final_buy_amount),
        _purchasedAsset.precision
      );

      _operationChain.push({
        seller: usr.id,
        amount_to_sell: {
          amount: _amountToSell,
          asset_id: _soldAsset.id,
        },
        min_to_receive: {
          amount: _amountToReceive,
          asset_id: _purchasedAsset.id,
        },
        expiration: date,
        fill_or_kill: true,
        extensions: {},
      });
    });

    borrowPositions.forEach((x) => {
      const _id = x.id;
      const _borrowAssetID = x.asset_id;
      const _borrowAmount = parseFloat(x.borrow_amount);
      const _feeRate = x.fee_rate;

      const _referenceFundAsset = assets.find((x) => x.id === _borrowAssetID);

      const _feeAmount = (_borrowAmount * _feeRate) / 1000000;

      _operationChain.push({
        account: usr.id,
        fund_id: _id,
        repay_amount: {
          amount: blockchainFloat(_borrowAmount, _referenceFundAsset.precision),
          asset_id: _referenceFundAsset.id,
        },
        fund_fee: {
          amount: blockchainFloat(_feeAmount, _referenceFundAsset.precision),
          asset_id: _referenceFundAsset.id,
        },
        extensions: {},
      });
    });

    return _operationChain;
  }, [borrowPositions, operations, sameTFunds, usr]);

  const [updatedBalances, setUpdatedBalances] = useState([]);
  useEffect(() => {
    if (!borrowPositions || !usrBalances) {
      return;
    }

    const relevantAssetIds = new Set();

    borrowPositions.forEach((position) => {
      relevantAssetIds.add(position.asset_id);
    });

    operations.forEach((operation) => {
      relevantAssetIds.add(operation.sell_price.base.asset_id);
      relevantAssetIds.add(operation.sell_price.quote.asset_id);
    });

    const newBalances = usrBalances.map((balance) => {
      const asset = assets.find((x) => x.id === balance.asset_id);
      return {
        asset_id: balance.asset_id,
        amount: humanReadableFloat(balance.amount, asset.precision),
        symbol: asset.symbol,
        display: relevantAssetIds.has(balance.asset_id),
      };
    });

    borrowPositions.forEach((position) => {
      const asset = assets.find((x) => x.id === position.asset_id);
      const balance = newBalances.find((b) => b.asset_id === position.asset_id);
      if (balance) {
        balance.amount = parseFloat(
          (
            parseFloat(balance.amount) + parseFloat(position.borrow_amount)
          ).toFixed(asset.precision)
        );
      } else {
        newBalances.push({
          asset_id: position.asset_id,
          amount: parseFloat(position.borrow_amount),
          symbol: asset.symbol,
          display: true,
        });
      }
    });

    operations.forEach((operation) => {
      if (!operation) {
        return;
      }

      const _purchasedAsset = assets.find(
        (x) => x.id === operation.final_asset_purchased
      );
      const _soldAsset = assets.find(
        (x) => x.id === operation.final_asset_sold
      );
      const buyAmount = parseFloat(operation.final_buy_amount);

      const sellAmount = buyAmount * parseFloat(operation.final_price);
      const marketFeePercent = _purchasedAsset.market_fee_percent
        ? _purchasedAsset.market_fee_percent / 10000
        : 0;
      const marketFee = buyAmount * marketFeePercent;
      const netBuyAmount = buyAmount - marketFee;

      const sellBalance = newBalances.find((b) => b.asset_id === _soldAsset.id);
      const buyBalance = newBalances.find(
        (b) => b.asset_id === _purchasedAsset.id
      );

      if (sellBalance) {
        sellBalance.amount -= sellAmount;
      } else {
        newBalances.push({
          asset_id: operation.final_buy_amount,
          amount: -sellAmount,
          symbol: _purchasedAsset.symbol,
        });
      }

      if (buyBalance) {
        buyBalance.amount += netBuyAmount;
      } else {
        newBalances.push({
          asset_id: _purchasedAsset.id,
          amount: netBuyAmount,
          symbol: _purchasedAsset.symbol,
          display: true,
        });
      }
    });

    setUpdatedBalances(newBalances);
  }, [operations, usrBalances, borrowPositions]);

  const [marketFees, setMarketFees] = useState([]);
  useEffect(() => {
    if (!operations.length || !assets.length) {
      setMarketFees([]);
      return;
    }

    const totalFees = {};
    operations.forEach((operation) => {
      const _purchasedAsset = assets.find(
        (x) => x.id === operation.final_asset_purchased
      );
      const buyAmount = parseFloat(operation.final_buy_amount);

      const marketFeePercent = _purchasedAsset.market_fee_percent
        ? _purchasedAsset.market_fee_percent / 10000
        : 0;
      const marketFee = buyAmount * marketFeePercent;

      if (totalFees[_purchasedAsset.symbol]) {
        totalFees[_purchasedAsset.symbol] += marketFee;
      } else {
        totalFees[_purchasedAsset.symbol] = marketFee;
      }
    });

    const feesArray = Object.entries(totalFees)
      .map(([symbol, fee]) => ({
        symbol,
        fee: parseFloat(fee).toFixed(
          assets.find((x) => x.symbol === symbol).precision
        ),
      }))
      .filter(({ fee }) => fee > 0);

    setMarketFees(feesArray);
  }, [operations, assets]);

  const fundRowProps = useMemo(() => ({ sameTFunds }), [sameTFunds]);
  const borrowPositionRowProps = useMemo(() => ({ borrowPositions }), [borrowPositions]);
  const opRowProps = useMemo(() => ({ operations }), [operations]);
  const balanceRowProps = useMemo(() => ({ updatedBalances }), [updatedBalances]);

  // ─── Step 1: Fund Selection ────────────────────────────────────
  const accent1 = STEP_ACCENTS[1];
  const FundRow = ({ index, style }) => {
    let fund = sameTFunds[index];

    if (!fund || !assets || !assets.length) {
      return null;
    }

    const asset = assets.find((x) => x.id === fund.asset_type);
    const regex = assetAmountRegex(asset);

    const assetName = asset ? asset.symbol : fund.asset_type;
    const balance = humanReadableFloat(fund.balance, asset.precision);
    const feeRate = fund.fee_rate / 10000;
    const unpaidAmount = humanReadableFloat(
      fund.unpaid_amount,
      asset.precision
    );
    const lender = lenderAccounts.find((x) => x.id === fund.owner_account);
    const available = balance - unpaidAmount;

    const [borrowAmount, setBorrowAmount] = useState(
      borrowPositions.find((x) => x.id === fund.id)?.borrow_amount || 0
    );
    const [borrowPositionDialog, setBorrowPositionDialog] = useState(false);

    const hasExistingBorrow = borrowPositions.some((x) => x.id === fund.id);

    return (
      <div style={style} key={`sametfund-${fund.id}`}>
        <Dialog
          open={borrowPositionDialog}
          onOpenChange={setBorrowPositionDialog}
        >
          <DialogTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full text-left group relative overflow-hidden rounded-xl border transition-all",
                hasExistingBorrow
                  ? "border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.08)] to-[hsl(var(--accent-1)/0.04)] hover:border-[hsl(var(--accent-1)/0.6)] hover:shadow-[0_0_24px_-6px_rgba(139,92,246,0.3)]"
                  : "border-border/60 bg-card/40 hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.03)]"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity",
                  hasExistingBorrow
                    ? "via-[hsl(var(--accent-1)/0.6)]"
                    : "via-[hsl(var(--accent-1)/0.3)]"
                )}
              />
              <div className="px-3 py-2">
                <div className="grid grid-cols-4 gap-2 items-center text-sm">
                  <div className="flex items-center gap-1.5 col-span-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shrink-0">
                      <Landmark className="h-2.5 w-2.5" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      #{fund.id.replace("1.20.", "")}
                    </span>
                  </div>
                  <div className="text-foreground/80 font-medium text-xs truncate col-span-1">
                    {lender ? lender.name : "???"}
                  </div>
                  <div className="font-mono text-xs tabular-nums text-foreground/85 col-span-1">
                    <span className="dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))] font-semibold">
                      {parseFloat(available).toLocaleString(undefined, {
                        maximumFractionDigits: asset ? asset.precision : 4,
                      })}
                    </span>{" "}
                    <span className="text-muted-foreground/60">{assetName}</span>
                  </div>
                  <div className="font-mono text-xs tabular-nums text-foreground/70 col-span-1 flex items-center gap-1 justify-end">
                    <Percent className="h-2.5 w-2.5 text-muted-foreground/50" />
                    {feeRate.toFixed(2)}%
                    {hasExistingBorrow ? (
                      <Badge
                        variant="outline"
                        className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] text-[10px] ml-1"
                      >
                        {t("TFundUser:selected", "Selected")}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] !bg-card border border-border rounded-2xl">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent"
            />
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {t("TFundUser:dialogTitle")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground space-y-1">
                <div>
                  {t("WithdrawPermissions:id")}:{" "}
                  <span className="font-mono text-foreground/80 hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))] transition-colors">
                    {fund.id}
                  </span>
                </div>
                {lender ? (
                  <div>
                    {t("Smartcoin:owner")}:{" "}
                    <span className="font-medium text-foreground/80 hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))] transition-colors">
                      {lender.name}
                    </span>
                  </div>
                ) : null}
                <div>
                  {t("TFundUser:amountAvailable")}:{" "}
                  <span className="font-mono font-semibold text-foreground/85">
                    {parseFloat(available).toLocaleString(undefined, {
                      maximumFractionDigits: asset ? asset.precision : 4,
                    })}{" "}
                    {assetName}
                  </span>
                </div>
                <div>
                  {t("TFundUser:feeRate")}:{" "}
                  <span className="font-mono text-foreground/80">
                    {feeRate.toFixed(2)}%
                  </span>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  {t("TFundUser:borrowAmount", "Borrow amount")}
                </label>
                <Input
                  value={borrowAmount}
                  type="text"
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    if (regex.test(value)) {
                      setBorrowAmount(
                        available < value ? available : value
                      );
                    }
                  }}
                  className="!bg-card/40 border-border text-foreground text-lg font-semibold"
                />
                <div className="flex items-center gap-1.5 mt-2">
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const label = [
                      t("TFundUser:zeroPercent"),
                      t("TFundUser:twentyFivePercent"),
                      t("TFundUser:fiftyPercent"),
                      t("TFundUser:seventyFivePercent"),
                      t("TFundUser:hundredPercent"),
                    ][Math.round(pct * 4)];
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setBorrowAmount(available * pct);
                        }}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border transition-all",
                          parseFloat(borrowAmount) === available * pct
                            ? "border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                            : "border-border/60 bg-card/40 text-muted-foreground hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.1)]"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                variant="outline"
                className={cn(
                  "w-full h-11 rounded-xl font-semibold transition-all",
                  borrowAmount > 0
                    ? "border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.6)] hover:shadow-[0_0_24px_-6px_rgba(139,92,246,0.4)]"
                    : "border-border text-muted-foreground"
                )}
                onClick={() => {
                  if (borrowAmount > 0) {
                    setBorrowPositions((prevBorrowPositions) => {
                      const _borrows = [...prevBorrowPositions];
                      const existingBorrow = _borrows.find(
                        (x) => x.id === fund.id
                      );

                      if (existingBorrow) {
                        existingBorrow.borrow_amount = parseFloat(borrowAmount);
                      } else {
                        _borrows.push({
                          id: fund.id,
                          asset_id: fund.asset_type,
                          borrow_amount: parseFloat(borrowAmount),
                          fee_rate: fund.fee_rate,
                        });
                      }

                      return _borrows;
                    });

                    setBorrowPositionDialog(false);
                  } else {
                    setBorrowPositions((prevBorrowPositions) => {
                      const _borrows = prevBorrowPositions.filter(
                        (x) => x.id !== fund.id
                      );
                      return _borrows;
                    });

                    setBorrowPositionDialog(false);
                  }
                }}
              >
                {borrowAmount > 0
                  ? t("TFundUser:submit")
                  : t("TFundUser:removeBorrow", "Remove")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ─── Step 1 Header ─────────────────────────────────────────────
  const Step1Section = (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          accent1.bar
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-20 h-48 w-48 rounded-full blur-3xl"
        style={{ background: "rgba(139,92,246,0.08)" }}
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <span
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-gradient-to-br",
              accent1.border,
              accent1.bg,
              accent1.text
            )}
          >
            <Handshake className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] text-[10px]"
              >
                {t("TFundUser:stepIndicator", "Step 1")}
              </Badge>
              <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                {t("TFundUser:step1")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t("TFundUser:step1Description")}
            </p>
          </div>
        </div>

        {loadingFunds ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border/40 bg-card/30 p-3"
              >
                <div className="grid grid-cols-4 gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : lenderAccounts &&
          lenderAccounts.length &&
          sameTFunds &&
          sameTFunds.length > 0 ? (
          <>
            <div className="grid grid-cols-4 gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              <div>{t("WithdrawPermissions:id")}</div>
              <div>{t("Smartcoin:owner")}</div>
              <div>{t("CreditBorrow:common.offering")}</div>
              <div className="text-right">{t("PoolForm:fee")}</div>
            </div>
            <div className="w-full h-[400px] rounded-lg border border-border/40 bg-card/20">
              <List
                rowComponent={FundRow}
                rowCount={sameTFunds.length}
                rowHeight={52}
                rowProps={fundRowProps}
                key={`list-sametfunds`} height={260} width="100%" />
            </div>
          </>
        ) : (
          <Empty className="border border-dashed border-[hsl(var(--accent-1)/0.2)] rounded-xl bg-[hsl(var(--accent-1)/0.03)]">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
                <Landmark className="w-6 h-6" />
              </EmptyMedia>
              <EmptyTitle className="text-foreground/80">
                {t("TFundUser:noFundsAvailable", "No Same-T Funds available")}
              </EmptyTitle>
              <EmptyDescription className="text-muted-foreground">
                {t("TFundUser:noFundsDescription", "There are no Same-T Funds currently available to borrow from.")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );

  // ─── Borrow Positions ──────────────────────────────────────────
  const BorrowPositionRow = ({ index, style }) => {
    let _borrowPosition = borrowPositions[index];

    if (!_borrowPosition) {
      return null;
    }

    const borrowAsset = assets.find((x) => x.id === _borrowPosition.asset_id);
    const sameTFund = sameTFunds.find((x) => x.id === _borrowPosition.id);
    const borrowAmount = parseFloat(_borrowPosition.borrow_amount);
    const feeRate = sameTFund ? sameTFund.fee_rate : 0;
    const feeAmount = ((parseFloat(borrowAmount) * feeRate) / 1000000).toFixed(
      borrowAsset.precision
    );

    return (
      <div style={style} key={`borrowposition-${_borrowPosition.id}`}>
        <div className="group flex items-center justify-between rounded-lg border border-[hsl(var(--accent-1)/0.15)] bg-gradient-to-r from-[hsl(var(--accent-1)/0.04)] to-transparent hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)] transition-all px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
              <Landmark className="h-2.5 w-2.5" />
            </span>
            <span className="font-mono text-xs font-semibold text-foreground">
              #{_borrowPosition.id.replace("1.20.", "")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs tabular-nums text-foreground/85">
              {parseFloat(borrowAmount).toLocaleString(undefined, {
                maximumFractionDigits: borrowAsset ? borrowAsset.precision : 4,
              })}{" "}
              <span className="text-muted-foreground/60">{borrowAsset.symbol}</span>
            </span>
            <span className="text-muted-foreground/40">|</span>
            <span className="font-mono text-xs tabular-nums text-[hsl(var(--accent-danger-fg)/0.8)]">
              +{feeAmount} <span className="text-muted-foreground/60">{borrowAsset.symbol}</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  const BorrowPositionsSection = borrowPositions && borrowPositions.length ? (
    <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--accent-1)/0.2)] bg-card/60 backdrop-blur-xl">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.4)] to-transparent"
      />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
            <Wallet className="h-3 w-3" />
          </span>
          <h4 className="text-sm font-semibold text-foreground">
            {t("TFundUser:borrowPositions")}
          </h4>
          <Badge
            variant="outline"
            className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] text-[10px]"
          >
            {borrowPositions.length}
          </Badge>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-card border-border text-foreground/85">
                <p className="max-w-xs">{t("TFundUser:borrowPositionsDescription")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/30">
          <div className="grid grid-cols-2 gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border/40">
            <div>{t("TFundUser:fund")}</div>
            <div className="text-right">
              {t("TFundUser:borrowed")} / {t("TFundUser:borrowFees")}
            </div>
          </div>
          <div className="w-full h-[400px]">
            <List
              rowComponent={BorrowPositionRow}
              rowCount={borrowPositions.length}
              rowHeight={48}
              rowProps={borrowPositionRowProps}
              key={`list-borrowpositions`} height={280} width="100%" />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ─── Step 2: Operations ────────────────────────────────────────
  const accent2 = STEP_ACCENTS[2];
  const OpRow = ({ index, style }) => {
    let _operation = operations[index];

    if (!_operation) {
      return null;
    }

    const _purchasedAsset = assets.find(
      (x) => x.id === _operation.final_asset_purchased
    );

    const _soldAsset = assets.find((x) => x.id === _operation.final_asset_sold);

    const _marketPurchaseFee = _purchasedAsset.market_fee_percent
      ? _purchasedAsset.market_fee_percent / 10000
      : 0;

    const _amountPurchased = (
      parseFloat(_operation.final_buy_amount) -
      parseFloat(_operation.final_buy_amount) * _marketPurchaseFee
    ).toFixed(_purchasedAsset.precision);

    const _amountSold = (
      parseFloat(_amountPurchased) * _operation.final_price
    ).toFixed(_soldAsset.precision);

    return (
      <div style={style} key={`operation-summary-${_operation.id}-${index}`}>
        <div className="group flex items-center justify-between rounded-lg border border-[hsl(var(--accent-2)/0.15)] bg-gradient-to-r from-[hsl(var(--accent-2)/0.04)] to-transparent hover:border-[hsl(var(--accent-2)/0.3)] hover:bg-[hsl(var(--accent-2)/0.06)] transition-all px-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-2)/0.15)] border border-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]">
              <TrendingUp className="h-2.5 w-2.5" />
            </span>
            <span className="font-mono text-xs tabular-nums text-[hsl(var(--accent-success-fg))] font-semibold">
              +{_amountPurchased}
            </span>
            <span className="text-xs text-foreground/80 font-medium">
              {_purchasedAsset.symbol}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            <span className="font-mono text-xs tabular-nums text-[hsl(var(--accent-danger-fg)/0.8)]">
              -{_amountSold}
            </span>
            <span className="text-xs text-foreground/80 font-medium">
              {_soldAsset.symbol}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground/60">
              @ {_operation.final_price}
            </span>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setBuyingAsset(_purchasedAsset.symbol);
                      setSellingAsset(_soldAsset.symbol);
                      setAddOperationDialog(true);
                    }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] hover:border-[hsl(var(--accent-2)/0.5)] transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-card border-border text-foreground/85">
                  <p>{t("TFundUser:editOperation", "Edit operation")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );
  };

  const Step2Section = borrowPositions && borrowPositions.length ? (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          accent2.bar
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full blur-3xl"
        style={{ background: "rgba(59,130,246,0.08)" }}
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <span
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-gradient-to-br",
              accent2.border,
              accent2.bg,
              accent2.text
            )}
          >
            <ArrowDownUp className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] text-[10px]"
              >
                {t("TFundUser:stepIndicator2", "Step 2")}
              </Badge>
              <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                {t("TFundUser:step2")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t("TFundUser:step2Description")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="rounded-xl border border-border/40 bg-card/30 flex-1 mr-3">
            <div className="grid grid-cols-2 gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border/40">
              <div>{t("TFundUser:operation", "Operation")}</div>
              <div className="text-right">{t("TFundUser:price")}</div>
            </div>
            <div className="w-full h-[400px]">
              <List
                rowComponent={OpRow}
                rowCount={operations.length}
                rowHeight={52}
                rowProps={opRowProps}
                key={`list-operations`} height={280} width="100%" />
            </div>
          </div>

          <LimitOrderWizard
            addOperationDialog={addOperationDialog}
            setAddOperationDialog={setAddOperationDialog}
            buyingAsset={buyingAsset}
            setBuyingAsset={setBuyingAsset}
            sellingAsset={sellingAsset}
            setSellingAsset={setSellingAsset}
            marketSearch={marketSearch}
            assets={assets}
            chain={usr && usr.chain ? usr.chain : "bitshares"}
            borrowPositions={borrowPositions}
            operations={operations}
            setOperations={setOperations}
            usrBalances={usrBalances}
            updatedBalances={updatedBalances}
          />
        </div>
      </div>
    </div>
  ) : null;

  // ─── Step 3: Analysis ──────────────────────────────────────────
  const accent3 = STEP_ACCENTS[3];
  const BalanceRow = ({ index, style }) => {
    const _balance = updatedBalances.filter((x) => x.display)[index];
    const _priorBalance = usrBalances.find(
      (x) => x.asset_id === _balance.asset_id
    );
    const _asset = assets.find((x) => x.id === _balance.asset_id);
    const _diff = (
      parseFloat(_balance.amount) -
      humanReadableFloat(
        _priorBalance ? _priorBalance.amount : 0,
        _asset.precision
      )
    ).toFixed(_asset.precision);

    const _allBorrowPositionsInScope = borrowPositions.filter(
      (x) => x.asset_id === _balance.asset_id
    );

    let _totalBorrowedAmount = 0;
    let _totalOwedAmount = 0;

    _allBorrowPositionsInScope.forEach((position) => {
      const _borrowedAmount = parseFloat(position.borrow_amount);
      const _borrowFee = position.fee_rate || 0;
      const _owedAmount = _borrowedAmount * (_borrowFee / 1000000);
      _totalBorrowedAmount += _borrowedAmount;
      _totalOwedAmount += _owedAmount;
    });

    const _finalAmount = (
      parseFloat(_balance.amount) -
      (_totalBorrowedAmount + _totalOwedAmount)
    ).toFixed(_asset.precision);

    let _finalAmountColor = "text-foreground/85";
    if (_finalAmount < 0) {
      _finalAmountColor = "text-[hsl(var(--accent-danger-fg))] font-semibold";
    } else if (_finalAmount > 0) {
      _finalAmountColor = parseFloat(_diff) > 0
        ? "text-[hsl(var(--accent-success-fg))] font-semibold"
        : "text-foreground/85";
    }

    let _diffColor = "text-muted-foreground/50";
    if (parseFloat(_diff) > 0) {
      _diffColor = "text-[hsl(var(--accent-success-fg))]";
    } else if (parseFloat(_diff) < 0) {
      _diffColor = "text-[hsl(var(--accent-danger-fg))]";
    }

    return (
      <div style={style} key={`balance-${_balance.asset_id}`}>
        <div className="flex items-center justify-between rounded-lg border border-border/30 bg-card/30 hover:bg-card/50 transition-all px-3 py-2">
          <span className="text-xs font-semibold text-foreground w-16">
            {_balance.symbol}
          </span>
          <span className="font-mono text-xs tabular-nums text-foreground/85 w-24 text-right">
            {parseFloat(_balance.amount).toFixed(_asset.precision)}
          </span>
          <span className={cn("font-mono text-xs tabular-nums w-20 text-right", _diffColor)}>
            {parseFloat(_diff) === 0 ? "—" : parseFloat(_diff) > 0 ? `+${_diff}` : _diff}
          </span>
          <span className="font-mono text-xs tabular-nums text-foreground/70 w-24 text-right">
            {_totalBorrowedAmount > 0
              ? `${(_totalBorrowedAmount + _totalOwedAmount).toFixed(
                  _asset.precision
                )}`
              : "—"}
          </span>
          <span className={cn("font-mono text-xs tabular-nums w-24 text-right", _finalAmountColor)}>
            {_finalAmount}
          </span>
        </div>
      </div>
    );
  };

  const Step3Section = borrowPositions &&
    borrowPositions.length &&
    updatedBalances &&
    updatedBalances.length ? (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          accent3.bar
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl"
        style={{ background: "rgba(52,211,153,0.08)" }}
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <span
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-gradient-to-br",
              accent3.border,
              accent3.bg,
              accent3.text
            )}
          >
            <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-[hsl(var(--accent-success)/0.3)] bg-[hsl(var(--accent-success)/0.1)] dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))] text-[10px]"
              >
                {t("TFundUser:stepIndicator3", "Step 3")}
              </Badge>
              <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                {t("TFundUser:step3")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t("TFundUser:step3Description")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/30">
          <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border/40">
            <div>{t("TFundUser:asset")}</div>
            <div className="text-right">{t("TFundUser:balance")}</div>
            <div className="text-right">{t("TFundUser:difference")}</div>
            <div className="text-right">{t("TFundUser:borrowed")}</div>
            <div className="text-right">{t("TFundUser:finalAmount")}</div>
          </div>
          <div className="w-full h-[400px]">
            <List
              rowComponent={BalanceRow}
              rowCount={updatedBalances.filter((x) => x.display).length}
              rowHeight={44}
              rowProps={balanceRowProps}
              key={`list-updatedbalances`} height={280} width="100%" />
          </div>
        </div>

        {operations && operations.length ? (
          <div className="mt-4 rounded-xl border border-[hsl(var(--accent-3)/0.2)] bg-[hsl(var(--accent-3)/0.05)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[hsl(var(--accent-3)/0.3)] bg-[hsl(var(--accent-3)/0.1)] dark:text-[hsl(var(--accent-3-fg))] text-[hsl(var(--accent-3-fg))]">
                <Zap className="h-3 w-3" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                {t("TFundUser:estimatedFees")}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-[hsl(var(--accent-3)/0.3)] bg-[hsl(var(--accent-3)/0.1)] dark:text-[hsl(var(--accent-3-fg))] text-[hsl(var(--accent-3-fg))] font-mono"
              >
                <Zap className="h-3 w-3 mr-1" />
                {(
                  operations.length * limitOrderFee +
                  borrowPositions.length *
                    2 *
                    sameTFundBorrowFee +
                  borrowPositions.length * 2 * sameTFundRepayFee
                ).toFixed(5)}{" "}
                {usr && usr.chain === "bitshares" ? "BTS" : "TEST"}
              </Badge>
              {marketFees && marketFees.length
                ? marketFees.map(({ symbol, fee }) => (
                    <Badge
                      key={symbol}
                      variant="outline"
                      className="border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] font-mono"
                    >
                      <Percent className="h-3 w-3 mr-1" />
                      {fee} {symbol}
                    </Badge>
                  ))
                : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  // ─── Generate Deeplink Button ──────────────────────────────────
  const DeeplinkButton = operations && operations.length ? (
    <div className="flex justify-center mt-6">
      <button
        onClick={() => setDeeplinkDialog(true)}
        className="group relative overflow-hidden inline-flex items-center gap-2 h-12 px-8 rounded-2xl text-sm font-semibold bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_32px_-12px_rgba(139,92,246,0.7)] hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.9)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-1))] transition-all active:scale-[0.99]"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.18)_50%,transparent_70%)] bg-[length:200%_100%] group-hover:animate-[shimmer_1.6s_linear_infinite]"
        />
        <Zap className="h-4 w-4" />
        <span className="relative">{t("TFundUser:generateDeeplink")}</span>
      </button>
    </div>
  ) : null;

  // ─── Main Render ────────────────────────────────────────────────
  return (
    <>
      <div className="container mx-auto mt-5 mb-10 max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)] mb-6">
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
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                <Banknote className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("TFundUser:title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("TFundUser:description")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {Step1Section}

          {BorrowPositionsSection}

          {Step2Section}

          {Step3Section}

          {DeeplinkButton}
        </div>
      </div>

      {usr && deeplinkDialog ? (
        <DeepLinkDialog
          operationNames={[
            ...Array(borrowPositions.length).fill("samet_fund_borrow"),
            ...operations.map(() => "limit_order_create"),
            ...Array(borrowPositions.length).fill("samet_fund_repay"),
          ]}
          username={usr && usr.username ? usr.username : ""}
          usrChain={usr && usr.chain ? usr.chain : "bitshares"}
          userID={usr.id}
          dismissCallback={setDeeplinkDialog}
          key={`constructing_deeplink_${
            usr && usr.username ? usr.username : ""
          }`}
          headerText={t("TFundUser:deeplinkHeaderText")}
          trxJSON={operationsJSON}
        />
      ) : null}
    </>
  );
}
