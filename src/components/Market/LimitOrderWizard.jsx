import React, { useMemo, useState, useEffect } from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { ReloadIcon, HeartFilledIcon, HeartIcon } from "@radix-ui/react-icons";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { createLimitOrdersStore } from "@/nanoeffects/MarketLimitOrders.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import {
  $favouriteAssets,
  addFavouriteAsset,
  removeFavouriteAsset,
} from "@/stores/favourites.ts";

import { humanReadableFloat, assetAmountRegex } from "@/lib/common.js";
import { cn } from "@/lib/utils";

import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

import {
  ArrowDownUp,
  Coins,
  Plus,
  Minus,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

const LimitOrderRow = React.memo(function LimitOrderRow({ index, style, marketLimitOrders, operations, setOperations, assets, updatedBalances, sellingAssetData, buyingAssetData, t }) {
    let _order = marketLimitOrders[index];
    const [buyDialogOpen, setBuyDialogOpen] = useState(false);
    const [tempBuyAmount, setTempBuyAmount] = useState("0");

    if (!_order) {
      return null;
    }

    const existingOperation = operations.find((op) => op.id === _order.id);

    const _assetLimitOrderOffers = assets.find(
      (x) => x.id === _order.sell_price.base.asset_id
    );
    const _assetLimitOrderWants = assets.find(
      (x) => x.id === _order.sell_price.quote.asset_id
    );
    const _amountOffered = humanReadableFloat(
      _order.sell_price.base.amount,
      _assetLimitOrderOffers.precision
    );
    const _amountSellerDesires = humanReadableFloat(
      _order.sell_price.quote.amount,
      _assetLimitOrderWants.precision
    );

    const percentageCommitted =
      existingOperation
        ? (
            (parseFloat(existingOperation.final_buy_amount) / parseFloat(_amountOffered)) *
            100
          ).toFixed(1)
        : 0;

    const price = (
      parseFloat(_amountSellerDesires) / parseFloat(_amountOffered)
    ).toFixed(_assetLimitOrderWants.precision);

    const sellingAssetBalance = updatedBalances.find(
      (x) => x.asset_id === _assetLimitOrderWants.id
    );

    let totalAmountRequired = 0;
    for (let i = 0; i < index; i++) {
      const priorOrder = marketLimitOrders[i];
      const priorOrderAsset = assets.find(
        (x) => x.id === priorOrder.sell_price.quote.asset_id
      );
      const priorOrderAmount = humanReadableFloat(
        priorOrder.sell_price.quote.amount,
        priorOrderAsset.precision
      );
      const priorOrderOperation = operations.find(
        (op) => op.id === priorOrder.id
      );

      if (priorOrderOperation) {
        const remainingAmount =
          parseFloat(priorOrderAmount) -
          parseFloat(
            priorOrderOperation.final_buy_amount *
              priorOrderOperation.final_price
          );
        if (remainingAmount <= 0) {
          continue;
        }
        totalAmountRequired += remainingAmount;
      } else {
        totalAmountRequired += parseFloat(priorOrderAmount);
      }
    }

    const hasEnoughFunds =
      sellingAssetBalance &&
      parseFloat(sellingAssetBalance.amount) >= totalAmountRequired;

    const previousOperation =
      index > 0
        ? operations.find((op) => op.id === marketLimitOrders[index - 1].id)
        : null;

    const previousRowOfferedAmount =
      previousOperation && marketLimitOrders[index - 1]
        ? humanReadableFloat(
            marketLimitOrders[index - 1].sell_price.base.amount,
            _assetLimitOrderOffers.precision
          )
        : 0;

    const previousRowAmount = previousOperation
      ? parseFloat(previousOperation.final_buy_amount)
      : 0;

    const boughtMax =
      previousRowAmount > 0 && previousRowAmount >= previousRowOfferedAmount;

    const canInteract =
      index === 0 ||
      (hasEnoughFunds && boughtMax) ||
      (existingOperation && parseFloat(existingOperation.final_buy_amount) > 0);

    const isSelected = !!existingOperation;
    const regex = assetAmountRegex(sellingAssetData);
    const _quoteFee =
      _assetLimitOrderOffers && _assetLimitOrderOffers.market_fee_percent
        ? _assetLimitOrderOffers.market_fee_percent / 10000
        : 0;
    const percentPossible =
      sellingAssetBalance &&
      sellingAssetBalance.amount &&
      parseFloat(sellingAssetBalance.amount) > 0
        ? (parseFloat(sellingAssetBalance.amount) +
            parseFloat(existingOperation?.final_buy_amount || 0) * parseFloat(price)) /
          parseFloat(_amountSellerDesires)
        : 0;

    return (
      <div style={style} key={`marketLimitOrder-${_order.id}`}>
        <div
          className={cn(
            "group flex items-center gap-2 rounded-xl border transition-all px-3 py-2.5",
            isSelected
              ? "border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-r from-[hsl(var(--accent-1)/0.08)] to-transparent hover:border-[hsl(var(--accent-1)/0.6)]"
              : "border-border/40 bg-card/30 hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.04)]"
          )}
        >
          <div className="grid grid-cols-5 gap-2 flex-1 items-center text-xs">
            <div className="font-mono tabular-nums text-foreground/85">
              {_amountOffered}
            </div>
            <div className="font-mono tabular-nums text-foreground/85">
              {_amountSellerDesires}
            </div>
            <div className="font-mono tabular-nums text-muted-foreground">
              {price}
            </div>
            <div className="flex items-center gap-1">
              {isSelected ? (
                <div className="w-full bg-[hsl(var(--accent-1)/0.2)] rounded-full h-1.5">
                  <div
                    className="bg-[hsl(var(--accent-1))] h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, percentageCommitted)}%` }}
                  />
                </div>
              ) : (
                <span className="text-muted-foreground/50">—</span>
              )}
            </div>
            <div className="flex items-center justify-end gap-1">
              {canInteract ? (
                <Dialog open={buyDialogOpen} onOpenChange={(open) => {
                  setBuyDialogOpen(open);
                  if (open) {
                    setTempBuyAmount(existingOperation ? existingOperation.final_buy_amount : "0");
                  }
                }}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all",
                        isSelected
                          ? "border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                          : "border-border/60 bg-card/40 text-muted-foreground hover:border-[hsl(var(--accent-1)/0.4)] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]"
                      )}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[520px] !bg-card border border-border rounded-2xl">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent"
                    />
                    <DialogHeader>
                      <DialogTitle className="text-foreground">
                        {t("LimitOrderWizard:buyingIntoOpenLimitOrder")}
                      </DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        {t("LimitOrderWizard:howMuchToBuy")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            {t("TFundUser:amountAvailable")}
                          </span>
                          <Badge
                            variant="outline"
                            className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] font-mono text-[10px]"
                          >
                            {_amountOffered} {_assetLimitOrderOffers.symbol}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <Input
                            value={tempBuyAmount}
                            type="text"
                            onInput={(e) => {
                              const value = e.currentTarget.value;
                              if (regex.test(value)) {
                                setTempBuyAmount(
                                  value > _amountOffered ? _amountOffered : value
                                );
                              }
                            }}
                            className="!bg-card/40 border-border text-foreground text-lg font-semibold"
                          />
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!percentPossible || percentPossible <= 0}
                                  onClick={() => {
                                    if (
                                      !sellingAssetBalance ||
                                      !sellingAssetBalance.amount ||
                                      sellingAssetBalance.amount <= 0
                                    ) {
                                      setTempBuyAmount(0);
                                      return;
                                    }
                                    if (percentPossible > 1) {
                                      setTempBuyAmount(parseFloat(_amountOffered));
                                    } else {
                                      setTempBuyAmount(
                                        parseFloat(_amountOffered * percentPossible)
                                      );
                                    }
                                  }}
                                  className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)]"
                                >
                                  <Wallet className="h-3.5 w-3.5 mr-1" />
                                  {t("LimitOrderWizard:max")}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-card border-border text-foreground/85">
                                <p>{t("LimitOrderWizard:maxTooltip", "Set maximum affordable amount")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1 block">
                              {t("LimitOrderWizard:buying")}
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono text-sm tabular-nums text-[hsl(var(--accent-success-fg))] font-semibold">
                                {parseFloat(tempBuyAmount * price).toFixed(
                                  sellingAssetData.precision
                                )}
                              </span>
                              <span className="text-xs text-foreground/70">
                                {sellingAssetData.symbol}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1 block">
                              {t("LimitOrderWizard:price")}
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono text-sm tabular-nums text-foreground/85">
                                {price}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {_assetLimitOrderWants.symbol}/{_assetLimitOrderOffers.symbol}
                              </span>
                            </div>
                          </div>
                        </div>
                        {_quoteFee > 0 ? (
                          <div className="border-t border-border/40 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                {t("LimitOrderWizard:marketFee")}
                              </span>
                              <span className="font-mono text-xs text-foreground/70">
                                {(
                                  parseFloat(_quoteFee) * parseFloat(tempBuyAmount)
                                ).toFixed(buyingAssetData.precision)}{" "}
                                {buyingAssetData.symbol}
                                <span className="text-muted-foreground/50 ml-1">
                                  ({(_quoteFee * 100).toFixed(2)}%)
                                </span>
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-11 rounded-xl font-semibold transition-all",
                          "border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]",
                          "hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.6)] hover:shadow-[0_0_24px_-6px_rgba(59,130,246,0.4)]"
                        )}
                        onClick={() => {
                          setOperations((prevOperations) => {
                            const _ops = [...prevOperations];
                            const existingOperationIndex = _ops.findIndex(
                              (op) => op.id === _order.id
                            );
                            const existingOp =
                              existingOperationIndex !== -1
                                ? _ops[existingOperationIndex]
                                : null;

                            if (
                              existingOp &&
                              existingOp.final_buy_amount === tempBuyAmount
                            ) {
                              return _ops;
                            }

                            for (let i = 0; i < index; i++) {
                              const priorOrder = marketLimitOrders[i];

                              const _assetPurchased = assets.find(
                                (x) => x.id === priorOrder.sell_price.quote.asset_id
                              );
                              const _assetSold = assets.find(
                                (x) => x.id === priorOrder.sell_price.base.asset_id
                              );

                              const _amountBought = humanReadableFloat(
                                priorOrder.sell_price.quote.amount,
                                _assetPurchased.precision
                              );
                              const _amountSold = humanReadableFloat(
                                priorOrder.sell_price.base.amount,
                                _assetSold.precision
                              );

                              const _price = parseFloat(
                                (_amountBought / _amountSold).toFixed(
                                  _assetPurchased.precision
                                )
                              );

                              const existingPriorOperationIndex = _ops.findIndex(
                                (op) => op.id === priorOrder.id
                              );
                              if (existingPriorOperationIndex !== -1) {
                                _ops[existingPriorOperationIndex] = {
                                  ..._ops[existingPriorOperationIndex],
                                  final_buy_amount: _amountSold,
                                  final_asset_purchased: _assetLimitOrderOffers.id,
                                  final_asset_sold: _assetLimitOrderWants.id,
                                  final_price: _price,
                                };
                              } else {
                                priorOrder["final_buy_amount"] = _amountSold;
                                priorOrder["final_asset_purchased"] =
                                  _assetLimitOrderOffers.id;
                                priorOrder["final_asset_sold"] =
                                  _assetLimitOrderWants.id;
                                priorOrder["final_price"] = _price;
                                _ops.push(priorOrder);
                              }
                            }

                            if (tempBuyAmount < _amountOffered) {
                              for (
                                let i = index + 1;
                                i < marketLimitOrders.length;
                                i++
                              ) {
                                const subsequentOrder = marketLimitOrders[i];
                                const existingSubsequentOperationIndex =
                                  _ops.findIndex(
                                    (op) => op.id === subsequentOrder.id
                                  );

                                if (existingSubsequentOperationIndex !== -1) {
                                  _ops.splice(existingSubsequentOperationIndex, 1);
                                }
                              }

                              if (tempBuyAmount === 0) {
                                return _ops.filter((op) => op.id !== _order.id);
                              }
                            }

                            if (existingOperationIndex !== -1) {
                              _ops[existingOperationIndex] = {
                                ..._ops[existingOperationIndex],
                                final_buy_amount: tempBuyAmount,
                              };
                            } else {
                              _order["final_buy_amount"] = tempBuyAmount;
                              _order["final_asset_purchased"] =
                                _assetLimitOrderOffers.id;
                              _order["final_asset_sold"] = _assetLimitOrderWants.id;
                              _order["final_price"] = parseFloat(price);
                              _ops.push(_order);
                            }

                            return _ops;
                          });
                          setBuyDialogOpen(false);
                        }}
                      >
                        {t("LimitOrderWizard:submit")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/30 bg-card/20 text-muted-foreground/30 cursor-not-allowed"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                </button>
              )}
              {isSelected ? (
                <button
                  type="button"
                  onClick={() => {
                    setOperations((prevOperations) => {
                      const _ops = [...prevOperations];
                      const existingOperationIndex = _ops.findIndex(
                        (op) => op.id === _order.id
                      );
                      if (existingOperationIndex !== -1) {
                        _ops.splice(existingOperationIndex, 1);
                        for (let i = index + 1; i < marketLimitOrders.length; i++) {
                          const subsequentOrder = marketLimitOrders[i];
                          const idx = _ops.findIndex(
                            (op) => op.id === subsequentOrder.id
                          );
                          if (idx !== -1) {
                            _ops.splice(idx, 1);
                          }
                        }
                      }
                      return _ops;
                    });
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.1)] text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.2)] hover:border-[hsl(var(--accent-danger)/0.5)] transition-all"
                >
                  <Minus className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  });

export default function LimitOrderWizard(properties) {
  const {
    addOperationDialog,
    setAddOperationDialog,
    buyingAsset,
    setBuyingAsset,
    sellingAsset,
    setSellingAsset,
    marketSearch,
    assets,
    chain,
    borrowPositions,
    operations,
    setOperations,
    usrBalances,
    updatedBalances,
  } = properties;

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNodeUrl = useStore($currentNodeUrl);
  const favouriteAssets = useStore($favouriteAssets);

  const [marketLimitOrders, setMarketLimitOrders] = useState([]);
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    setMarketLimitOrders([]);

    const _previousBuyingAsset = buyingAsset;
    const _previousSellingAsset = sellingAsset;
    setBuyingAsset(_previousSellingAsset);
    setSellingAsset(_previousBuyingAsset);

    setTimeout(() => {
      setClicked(false);
    }, 1000);
  };

  const sellingAssetData = useMemo(() => {
    if (sellingAsset && assets && assets.length) {
      return assets.find((x) => x.symbol === sellingAsset);
    }
    return null;
  }, [sellingAsset, assets]);

  const buyingAssetData = useMemo(() => {
    if (buyingAsset && assets && assets.length) {
      return assets.find((x) => x.symbol === buyingAsset);
    }
    return null;
  }, [buyingAsset, assets]);

  const isFavouriteBuy = useMemo(() => {
    if (!favouriteAssets[chain] || !buyingAssetData) {
      return false;
    }
    return favouriteAssets[chain].map((x) => x.id).includes(buyingAssetData.id);
  }, [favouriteAssets, chain, buyingAssetData]);

  const isFavouriteSell = useMemo(() => {
    if (!favouriteAssets[chain] || !sellingAssetData) {
      return false;
    }
    return favouriteAssets[chain]
      .map((x) => x.id)
      .includes(sellingAssetData.id);
  }, [favouriteAssets, chain, sellingAssetData]);

  const [isFetching, setIsFetching] = useState(false);
  useEffect(() => {
    async function fetching() {
      setIsFetching(true);
      const limitOrdersStore = createLimitOrdersStore([
        chain,
        sellingAsset,
        buyingAsset,
        100,
        currentNodeUrl || "",
      ]);

      limitOrdersStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setIsFetching(false);
          setMarketLimitOrders(
            data.filter((_limitOrder) => {
              return (
                _limitOrder.sell_price.base.asset_id === buyingAssetData.id &&
                _limitOrder.sell_price.quote.asset_id === sellingAssetData.id
              );
            })
          );
        }
      });
    }

    if (
      sellingAsset &&
      buyingAsset &&
      sellingAsset !== buyingAsset &&
      sellingAssetData &&
      buyingAssetData &&
      chain &&
      currentNodeUrl
    ) {
      fetching();
    }
  }, [
    sellingAsset,
    sellingAssetData,
    buyingAsset,
    buyingAssetData,
    chain,
    currentNodeUrl,
  ]);

  const limitOrderRowProps = useMemo(
    () => ({
      marketLimitOrders,
      operations,
      setOperations,
      assets,
      updatedBalances,
      sellingAssetData,
      buyingAssetData,
      t,
    }),
    [marketLimitOrders, operations, setOperations, assets, updatedBalances, sellingAssetData, buyingAssetData, t]
  );

  // ─── Main dialog ────────────────────────────────────────────────
  return (
    <Dialog open={addOperationDialog} onOpenChange={setAddOperationDialog}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 rounded-xl border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-2)/0.1)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.6)] hover:shadow-[0_0_24px_-6px_rgba(59,130,246,0.4)] transition-all text-xs font-semibold"
        >
          <Plus className="h-4 w-4" />
          {t("LimitOrderWizard:addOperation", "Add operation")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1080px] !bg-card border border-border rounded-2xl">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
        />
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_14px_-2px_hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
              <ShoppingCart className="h-3.5 w-3.5" />
            </span>
            {t("LimitOrderWizard:title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("LimitOrderWizard:description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 rounded-xl border border-[hsl(var(--accent-success)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-success)/0.06)] to-transparent p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-success)/0.15)] border border-[hsl(var(--accent-success)/0.3)] dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))]">
                  <TrendingUp className="h-3 w-3" />
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {t("LimitOrderWizard:buying")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {buyingAssetData ? (
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                    {updatedBalances &&
                    updatedBalances.length &&
                    updatedBalances.find(
                      (x) => x.asset_id === buyingAssetData.id
                    )
                      ? `${parseFloat(
                          updatedBalances.find(
                            (x) => x.asset_id === buyingAssetData.id
                          ).amount
                        ).toFixed(buyingAssetData.precision)}`
                      : "0"}
                  </span>
                ) : null}
                <AssetDropDown
                  assetSymbol={buyingAsset ?? ""}
                  assetData={buyingAssetData}
                  storeCallback={setBuyingAsset}
                  otherAsset={sellingAsset}
                  marketSearch={marketSearch}
                  type={"quote"}
                  size="small"
                  chain={chain}
                  balances={usrBalances}
                />
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {isFavouriteBuy ? (
                        <HeartFilledIcon
                          className="h-4 w-4 text-[hsl(var(--accent-danger-fg))] cursor-pointer shrink-0"
                          onClick={() => {
                            removeFavouriteAsset(chain, {
                              id: buyingAssetData.id,
                              symbol: buyingAssetData.symbol,
                              issuer: marketSearch.find(
                                (x) => x.s === buyingAssetData.symbol
                              ).u,
                            });
                          }}
                        />
                      ) : (
                        <HeartIcon
                          className="h-4 w-4 text-muted-foreground/50 hover:text-[hsl(var(--accent-danger-fg))] cursor-pointer shrink-0 transition-colors"
                          onClick={() => {
                            addFavouriteAsset(chain, {
                              id: buyingAssetData.id,
                              symbol: buyingAssetData.symbol,
                              issuer: marketSearch.find(
                                (x) => x.s === buyingAssetData.symbol
                              ).u,
                            });
                          }}
                        />
                      )}
                    </TooltipTrigger>
                    <TooltipContent className="bg-card border-border text-foreground/85">
                      {t("LimitOrderWizard:favourite")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleClick}
                  disabled={!buyingAsset || !sellingAsset}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card/80 hover:border-[hsl(var(--accent-1)/0.5)] hover:shadow-[0_0_24px_-6px_rgba(59,130,246,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  {clicked ? (
                    <ReloadIcon className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ArrowDownUp className="h-4 w-4 text-foreground/70 group-hover:rotate-180 transition-transform duration-300" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-card border-border text-foreground/85">
                <p>{t("LimitOrderWizard:swapPair", "Swap buying/selling pair")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex-1 rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <Coins className="h-3 w-3" />
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {t("LimitOrderWizard:selling")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {sellingAssetData ? (
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                    {updatedBalances &&
                    updatedBalances.length &&
                    updatedBalances.find(
                      (x) => x.asset_id === sellingAssetData.id
                    )
                      ? `${parseFloat(
                          updatedBalances.find(
                            (x) => x.asset_id === sellingAssetData.id
                          ).amount
                        ).toFixed(sellingAssetData.precision)}`
                      : "0"}
                  </span>
                ) : null}
                <AssetDropDown
                  assetSymbol={sellingAsset ?? ""}
                  assetData={sellingAssetData}
                  storeCallback={setSellingAsset}
                  otherAsset={buyingAsset}
                  marketSearch={marketSearch}
                  type={"base"}
                  size="small"
                  chain={chain}
                  balances={usrBalances}
                />
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {isFavouriteSell ? (
                        <HeartFilledIcon
                          className="h-4 w-4 text-[hsl(var(--accent-danger-fg))] cursor-pointer shrink-0"
                          onClick={() => {
                            removeFavouriteAsset(chain, {
                              id: sellingAssetData.id,
                              symbol: sellingAssetData.symbol,
                              issuer: marketSearch.find(
                                (x) => x.s === sellingAssetData.symbol
                              ).u,
                            });
                          }}
                        />
                      ) : (
                        <HeartIcon
                          className="h-4 w-4 text-muted-foreground/50 hover:text-[hsl(var(--accent-danger-fg))] cursor-pointer shrink-0 transition-colors"
                          onClick={() => {
                            addFavouriteAsset(chain, {
                              id: sellingAssetData.id,
                              symbol: sellingAssetData.symbol,
                              issuer: marketSearch.find(
                                (x) => x.s === sellingAssetData.symbol
                              ).u,
                            });
                          }}
                        />
                      )}
                    </TooltipTrigger>
                    <TooltipContent className="bg-card border-border text-foreground/85">
                      {t("LimitOrderWizard:favourite")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/30">
          <div className="grid grid-cols-5 gap-2 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border/40">
            <div>{buyingAssetData ? buyingAssetData.symbol : "—"}</div>
            <div>{sellingAssetData ? sellingAssetData.symbol : "—"}</div>
            <div>{t("LimitOrderWizard:price")}</div>
            <div>{t("LimitOrderWizard:buyingPercentage")}</div>
            <div className="text-right">{t("LimitOrderWizard:action", "Action")}</div>
          </div>

          {!buyingAsset || !sellingAsset ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground/60">
              {t("LimitOrderWizard:selectPair", "Select a buying and selling asset to view orders")}
            </div>
          ) : isFetching && sellingAsset !== buyingAsset ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl bg-accent/40" />
              ))}
            </div>
          ) : sellingAsset === buyingAsset ? (
            <div className="flex items-center justify-center py-12 text-sm text-[hsl(var(--accent-danger-fg)/0.7)]">
              {t("LimitOrderWizard:invalidTradingPair")}
            </div>
          ) : !marketLimitOrders || !marketLimitOrders.length ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground/60">
              {t("LimitOrderWizard:noOrdersAvailable")}
            </div>
          ) : (
            <div className="w-full h-[300px] p-1">
              <List
                height={300}
                width="100%"
                rowComponent={LimitOrderRow}
                rowCount={marketLimitOrders.length}
                rowHeight={48}
                rowProps={limitOrderRowProps}
                key={`list-limitorders`}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
