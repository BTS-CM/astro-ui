import React, { useMemo, useState, useEffect } from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { ReloadIcon, HeartFilledIcon, HeartIcon } from "@radix-ui/react-icons";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { createLimitOrdersStore } from "@/nanoeffects/MarketLimitOrders.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  $favouriteAssets,
  addFavouriteAsset,
  removeFavouriteAsset,
} from "@/stores/favourites.ts";

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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { humanReadableFloat, assetAmountRegex } from "@/lib/common.js";

import BasicAssetDropDownCard from "@/components/Market/BasicAssetDropDownCard.jsx";

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
  const currentNode = useStore($currentNode);
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
        currentNode ? currentNode.url : null,
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
      sellingAsset !== buyingAsset && // prevent invalid market pairs
      sellingAssetData &&
      buyingAssetData &&
      chain &&
      currentNode
    ) {
      fetching();
    }
  }, [
    sellingAsset,
    sellingAssetData,
    buyingAsset,
    buyingAssetData,
    chain,
    currentNode,
  ]);

  const limitOrderRow = ({ index, style }) => {
    let _order = marketLimitOrders[index];

    if (!_order) {
      return null;
    }

    const regex = assetAmountRegex(sellingAssetData);

    const existingOperation = operations.find((op) => op.id === _order.id);
    const [limitOrderBuyAmount, setLimitOrderBuyAmount] = useState(
      existingOperation ? existingOperation.final_buy_amount : 0
    );

    const [tempBuyAmount, setTempBuyAmount] = useState(
      existingOperation ? existingOperation.final_buy_amount : 0
    );

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
      limitOrderBuyAmount > 0
        ? (
            (parseFloat(limitOrderBuyAmount) / parseFloat(_amountOffered)) *
            100
          ).toFixed(3)
        : 0;

    const price = (
      parseFloat(_amountSellerDesires) / parseFloat(_amountOffered)
    ).toFixed(_assetLimitOrderWants.precision);

    const _quoteFee =
      _assetLimitOrderOffers && _assetLimitOrderOffers.market_fee_percent
        ? _assetLimitOrderOffers.market_fee_percent / 100
        : 0;

    const sellingAssetBalance = updatedBalances.find(
      (x) => x.asset_id === _assetLimitOrderWants.id
    );

    const percentPossible =
      sellingAssetBalance &&
      sellingAssetBalance.amount &&
      parseFloat(sellingAssetBalance.amount) > 0
        ? (parseFloat(sellingAssetBalance.amount) +
            parseFloat(limitOrderBuyAmount) * parseFloat(price)) /
          parseFloat(_amountSellerDesires)
        : 0;

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

    const previousRowAmount = previousOperation
      ? parseFloat(previousOperation.final_buy_amount)
      : 0;

    const previousRowOfferedAmount =
      previousOperation && marketLimitOrders[index - 1]
        ? humanReadableFloat(
            marketLimitOrders[index - 1].sell_price.base.amount,
            _assetLimitOrderOffers.precision
          )
        : 0;

    const boughtMax =
      previousRowAmount > 0 && previousRowAmount >= previousRowOfferedAmount;

    return (
      <div
        style={style}
        key={`marketLimitOrder-${_order.id}`}
        className="grid grid-cols-5 gap-3 border rounded border-gray-300 p-2 text-center"
      >
        <div>{_amountOffered}</div>
        <div className="border-l border-r border-gray-300">
          {_amountSellerDesires}
        </div>
        <div className="border-r border-gray-300">{price}</div>
        <div className="border-r border-gray-300">{percentageCommitted}</div>
        <div className="grid grid-cols-2 gap-2">
          {index === 0 || // first row
          (hasEnoughFunds && boughtMax) || // has enough funds and has bought max in previous row
          percentageCommitted > 0 ? ( // has bought something in this row
            <Dialog>
              <DialogTrigger>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTempBuyAmount(limitOrderBuyAmount);
                  }}
                >
                  ➕
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>
                    {t("LimitOrderWizard:buyingIntoOpenLimitOrder")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("LimitOrderWizard:howMuchToBuy")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t("TFundUser:amountAvailable")}
                      </label>
                    </div>
                    <Input value={_amountOffered} type="text" disabled />
                    <Input
                      value={_assetLimitOrderOffers.symbol}
                      type="text"
                      disabled
                    />
                  </div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("LimitOrderWizard:buying")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
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
                    />
                    {percentPossible > 0 ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (
                            !sellingAssetBalance ||
                            !sellingAssetBalance.amount ||
                            sellingAssetBalance.amount <= 0
                          ) {
                            setTempBuyAmount(parseFloat(0));
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
                      >
                        {t("LimitOrderWizard:max")}
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        {t("LimitOrderWizard:max")}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t("LimitOrderWizard:selling")}
                    </label>
                  </div>
                  <Input
                    value={parseFloat(tempBuyAmount * price).toFixed(
                      sellingAssetData.precision
                    )}
                    type="text"
                    disabled
                  />
                  <Input value={sellingAssetData.symbol} type="text" disabled />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t("LimitOrderWizard:price")}
                    </label>
                  </div>
                  <Input value={price} type="text" disabled />
                  <Input
                    value={`${_assetLimitOrderWants.symbol}/${_assetLimitOrderOffers.symbol}`}
                    type="text"
                    disabled
                  />
                </div>
                {_quoteFee > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t("LimitOrderWizard:marketFee")}
                      </label>
                    </div>
                    <Input
                      value={`${(
                        parseFloat(_quoteFee) * parseFloat(tempBuyAmount)
                      ).toFixed(buyingAssetData.precision)} (${
                        _quoteFee * 100
                      }%)`}
                      type="text"
                      disabled
                    />
                    <Input
                      value={buyingAssetData.symbol}
                      type="text"
                      disabled
                    />
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLimitOrderBuyAmount(tempBuyAmount);
                      setOperations((prevOperations) => {
                        const _ops = [...prevOperations];

                        const existingOperationIndex = _ops.findIndex(
                          (op) => op.id === _order.id
                        );
                        const existingOperation =
                          existingOperationIndex !== -1
                            ? _ops[existingOperationIndex]
                            : null;

                        // Early return if the value is already set
                        if (
                          existingOperation &&
                          existingOperation.final_buy_amount === tempBuyAmount
                        ) {
                          return _ops;
                        }

                        // Update prior orders to 100%
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
                            // Update existing prior operation
                            _ops[existingPriorOperationIndex] = {
                              ..._ops[existingPriorOperationIndex],
                              final_buy_amount: _amountSold,
                              final_asset_purchased: _assetLimitOrderOffers.id,
                              final_asset_sold: _assetLimitOrderWants.id,
                              final_price: _price,
                            };
                          } else {
                            // Add new prior operation
                            priorOrder["final_buy_amount"] = _amountSold;
                            priorOrder["final_asset_purchased"] =
                              _assetLimitOrderOffers.id;
                            priorOrder["final_asset_sold"] =
                              _assetLimitOrderWants.id;
                            priorOrder["final_price"] = _price;
                            _ops.push(priorOrder);
                          }
                        }

                        // Remove subsequent orders if the current order is less than 100%
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
                              // Remove existing subsequent operation
                              _ops.splice(existingSubsequentOperationIndex, 1);
                            }
                          }

                          if (tempBuyAmount === 0) {
                            // Remove the current order if set to 0%
                            return _ops.filter((op) => op.id !== _order.id);
                          }
                        }

                        // Set current order to the specified buy amount
                        if (existingOperationIndex !== -1) {
                          // Update existing operation
                          _ops[existingOperationIndex] = {
                            ..._ops[existingOperationIndex],
                            final_buy_amount: tempBuyAmount,
                          };
                        } else {
                          // Add new operation
                          _order["final_buy_amount"] = tempBuyAmount;
                          _order["final_asset_purchased"] =
                            _assetLimitOrderOffers.id;
                          _order["final_asset_sold"] = _assetLimitOrderWants.id;
                          _order["final_price"] = parseFloat(price);
                          _ops.push(_order);
                        }

                        return _ops;
                      });
                    }}
                  >
                    {t("LimitOrderWizard:submit")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          {operations &&
          operations.length &&
          operations.find((op) => op.id === _order.id) ? (
            <Button
              variant="outline"
              onClick={() => {
                setOperations((prevOperations) => {
                  const _ops = [...prevOperations];
                  const existingOperationIndex = _ops.findIndex(
                    (op) => op.id === _order.id
                  );
                  if (existingOperationIndex !== -1) {
                    // Remove the current operation
                    _ops.splice(existingOperationIndex, 1);

                    // Remove subsequent operations that rely on the current operation
                    for (let i = index + 1; i < marketLimitOrders.length; i++) {
                      const subsequentOrder = marketLimitOrders[i];
                      const existingSubsequentOperationIndex = _ops.findIndex(
                        (op) => op.id === subsequentOrder.id
                      );

                      if (existingSubsequentOperationIndex !== -1) {
                        _ops.splice(existingSubsequentOperationIndex, 1);
                      }
                    }
                  }
                  return _ops;
                });
              }}
            >
              ➖
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={addOperationDialog} onOpenChange={setAddOperationDialog}>
      <DialogTrigger>
        <Button variant="outline" className="mt-3">
          ➕
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1080px] bg-white">
        <DialogHeader>
          <DialogTitle>{t("LimitOrderWizard:title")}</DialogTitle>
          <DialogDescription>
            {t("LimitOrderWizard:description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-7 gap-5">
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-left">
                      {t("LimitOrderWizard:buying")}
                    </div>
                    <div className="text-right">
                      <BasicAssetDropDownCard
                        assetSymbol={buyingAsset ?? ""}
                        assetData={buyingAssetData}
                        storeCallback={setBuyingAsset}
                        otherAsset={sellingAsset}
                        marketSearch={marketSearch}
                        type={"quote"}
                        size="small"
                        chain={chain}
                        borrowPositions={borrowPositions}
                        usrBalances={usrBalances}
                      />
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              {buyingAssetData ? (
                <CardContent>
                  <div style={{ display: "flex", alignItems: "left" }}>
                    {updatedBalances &&
                    updatedBalances.length &&
                    updatedBalances.find(
                      (x) => x.asset_id === buyingAssetData.id
                    )
                      ? `${parseFloat(
                          updatedBalances.find(
                            (x) => x.asset_id === buyingAssetData.id
                          ).amount
                        ).toFixed(buyingAssetData.precision)} ${
                          buyingAssetData.symbol
                        } `
                      : `0 ${buyingAssetData.symbol} `}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {isFavouriteBuy ? (
                            <HeartFilledIcon
                              className="mt-1 ml-2"
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
                              className="mt-1 ml-2"
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
                        <TooltipContent>
                          {t("LimitOrderWizard:favourite")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              ) : null}
            </Card>
          </div>
          <div className="flex items-center justify-center">
            {buyingAsset && sellingAsset ? (
              <Button
                variant="outline"
                className="w-full h-7"
                onClick={handleClick}
              >
                {clicked ? (
                  <ReloadIcon className="animate-spin" />
                ) : (
                  <ReloadIcon />
                )}
              </Button>
            ) : (
              <Button variant="outline" className="w-full h-7" disabled>
                <ReloadIcon />
              </Button>
            )}
          </div>
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-left">
                      {t("LimitOrderWizard:selling")}
                    </div>
                    <div className="text-right">
                      <BasicAssetDropDownCard
                        assetSymbol={sellingAsset ?? ""}
                        assetData={sellingAssetData}
                        storeCallback={setSellingAsset}
                        otherAsset={buyingAsset}
                        marketSearch={marketSearch}
                        type={"base"}
                        size="small"
                        chain={chain}
                        borrowPositions={borrowPositions}
                        usrBalances={usrBalances}
                      />
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              {sellingAssetData ? (
                <CardContent>
                  <div style={{ display: "flex", alignItems: "left" }}>
                    {updatedBalances &&
                    updatedBalances.length &&
                    updatedBalances.find(
                      (x) => x.asset_id === sellingAssetData.id
                    )
                      ? `${parseFloat(
                          updatedBalances.find(
                            (x) => x.asset_id === sellingAssetData.id
                          ).amount
                        ).toFixed(sellingAssetData.precision)} ${
                          sellingAssetData.symbol
                        } `
                      : `0 ${sellingAssetData.symbol} `}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {isFavouriteSell ? (
                            <HeartFilledIcon
                              className="mt-1 ml-2"
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
                              className="mt-1 ml-2"
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
                        <TooltipContent>
                          {t("LimitOrderWizard:favourite")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              ) : null}
            </Card>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {buyingAsset && sellingAsset ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("LimitOrderWizard:marketLimitOrders")}</CardTitle>
                <CardDescription>
                  {t("LimitOrderWizard:marketLimitOrdersDescription", {
                    buyingAsset: buyingAssetData ? buyingAssetData.symbol : "",
                    sellingAsset: sellingAssetData
                      ? sellingAssetData.symbol
                      : "",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div>{buyingAssetData ? buyingAssetData.symbol : null}</div>
                  <div>{sellingAssetData ? sellingAssetData.symbol : null}</div>
                  <div>{t("LimitOrderWizard:price")}</div>
                  <div>{t("LimitOrderWizard:buyingPercentage")}</div>
                  <div></div>
                </div>
                {isFetching && sellingAsset !== buyingAsset ? (
                  <div className="space-y-2 mt-5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : null}
                {!isFetching &&
                (!marketLimitOrders || !marketLimitOrders.length) &&
                sellingAsset !== buyingAsset ? (
                  <div className="text-center mt-5">
                    {t("LimitOrderWizard:noOrdersAvailable")}
                  </div>
                ) : null}
                {sellingAsset === buyingAsset ? (
                  <div className="text-center mt-5">
                    {t("LimitOrderWizard:invalidTradingPair")}
                  </div>
                ) : null}
                {!isFetching &&
                marketLimitOrders &&
                marketLimitOrders.length &&
                sellingAsset !== buyingAsset ? (
                  <div className="w-full mt-3 max-h-[200px] overflow-auto">
                    <List
                      rowComponent={limitOrderRow}
                      rowCount={marketLimitOrders.length}
                      rowHeight={50}
                      rowProps={{}}
                      key={`list-limitorders`}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
