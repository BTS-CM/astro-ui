import React, { useSyncExternalStore, useMemo, useState, useEffect, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from "@nanostores/react";
import { ReloadIcon } from "@radix-ui/react-icons";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { createLimitOrdersStore } from "@/nanoeffects/MarketLimitOrders.ts";
import { $currentNode } from "@/stores/node.ts";

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

import { debounce, humanReadableFloat, blockchainFloat } from "@/lib/common.js";

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
        updatedBalances
    } = properties;

    const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
    const currentNode = useStore($currentNode);

    const [marketLimitOrders, setMarketLimitOrders] = useState([]);
    const [clicked, setClicked] = useState(false);

    const handleClick = () => {
        setClicked(true);

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

    useEffect(() => {
        async function fetching() {
            const limitOrdersStore = createLimitOrdersStore([
                chain,
                sellingAsset,
                buyingAsset,
                100,
                currentNode ? currentNode.url : null,
            ]);

            limitOrdersStore.subscribe(({ data, error, loading }) => {
                if (data && !error && !loading) {
                    setMarketLimitOrders(data.filter((_limitOrder) => {
                        return _limitOrder.sell_price.base.asset_id === sellingAssetData.id && _limitOrder.sell_price.quote.asset_id === buyingAssetData.id;
                    }));
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
    }, [sellingAsset, sellingAssetData, buyingAsset, buyingAssetData, chain, currentNode]);

    const limitOrderRow = ({ index, style }) => {
        let _order = marketLimitOrders[index];

        if (!_order) {
            return null;
        }

        const regex = new RegExp(`^[0-9]*\\.?[0-9]{0,${sellingAssetData.precision}}$`);

        const existingOperation = operations.find(op => op.id === _order.id);
        const [limitOrderBuyAmount, setLimitOrderBuyAmount] = useState(
            existingOperation
                ? existingOperation.final_buy_amount
                : 0
        );
            
        const _baseAmount = humanReadableFloat(_order.sell_price.base.amount, sellingAssetData.precision);
        const _quoteAmount = humanReadableFloat(_order.sell_price.quote.amount, buyingAssetData.precision);

        const percentageCommitted = limitOrderBuyAmount > 0
            ? ((limitOrderBuyAmount / _quoteAmount) * 100).toFixed(3)
            : 0;

        const price = (_quoteAmount / _baseAmount).toFixed(sellingAssetData.precision);

        const _quoteAsset = assets.find((x) => x.id === _order.sell_price.quote.asset_id);
        const _quoteFee = _quoteAsset && _quoteAsset.market_fee_percent ? _quoteAsset.market_fee_percent / 100 : 0;

        return (
            <div
                style={style}
                key={`marketLimitOrder-${_order.id}`}
                className="grid grid-cols-5 gap-3 border rounded border-gray-300 p-2 text-center"
            >
                <div>
                    {_quoteAmount}
                </div>
                <div className="border-l border-r border-gray-300">
                    {_baseAmount}
                </div>
                <div className="border-r border-gray-300">
                    {price}
                </div>
                <div className="border-r border-gray-300">
                    {percentageCommitted}
                </div>
                <Dialog>
                    <DialogTrigger>
                        <Button variant="outline">
                            Buy
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                        <DialogHeader>
                            <DialogTitle>Buying into open limit order</DialogTitle>
                            <DialogDescription>
                                How much of the following open market order do you want to buy?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Buying
                                    </label>
                                </div>
                                <Input
                                    value={limitOrderBuyAmount}
                                    type="text"
                                    onInput={(e) => {
                                        const value = e.currentTarget.value;
                                        if (regex.test(value)) {
                                            setLimitOrderBuyAmount(value > _quoteAmount ? _quoteAmount : value);
                                        }
                                    }}
                                />
                                <Input
                                    value={buyingAssetData.symbol}
                                    type="text"
                                    disabled
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Selling
                                    </label>
                                </div>
                                <Input
                                    value={(limitOrderBuyAmount / price).toFixed(sellingAssetData.precision)}
                                    type="text"
                                    disabled
                                />
                                <Input
                                    value={sellingAssetData.symbol}
                                    type="text"
                                    disabled
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Price
                                    </label>
                                </div>
                                <Input
                                    value={price}
                                    type="text"
                                    disabled
                                />
                                <Input
                                    value={`${buyingAssetData.symbol}/${sellingAssetData.symbol}`}
                                    type="text"
                                    disabled
                                />
                            </div>
                            {
                                _quoteFee > 0
                                    ? <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Market fee
                                            </label>
                                        </div>
                                        <Input
                                            value={(_quoteFee * limitOrderBuyAmount).toFixed(buyingAssetData.precision)}
                                            type="text"
                                            disabled
                                        />
                                        <Input
                                            value={buyingAssetData.symbol}
                                            type="text"
                                            disabled
                                        />
                                    </div>
                                    : null
                            }
                            <div className="grid grid-cols-6 gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setLimitOrderBuyAmount(0);
                                    }}
                                >
                                    0%
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setLimitOrderBuyAmount(_quoteAmount * 0.25);
                                    }}
                                >
                                    25%
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setLimitOrderBuyAmount(_quoteAmount * 0.50);
                                    }}
                                >
                                    50%
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setLimitOrderBuyAmount(_quoteAmount * 0.75);
                                    }}
                                >
                                    75%
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setLimitOrderBuyAmount(_quoteAmount);
                                    }}
                                >
                                    100%
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const sellingAssetBalance = updatedBalances.find((x) => x.asset_id === sellingAssetData.id);
                                        const percentPossible = sellingAssetBalance.amount / _baseAmount;
                                        if (percentPossible > 1) {
                                            setLimitOrderBuyAmount(_quoteAmount);
                                        } else {
                                            setLimitOrderBuyAmount(_quoteAmount * percentPossible);
                                        }
                                    }}
                                >
                                    Max
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setOperations((prevOperations) => {
                                        const _ops = [...prevOperations];
                                    
                                        const existingOperationIndex = _ops.findIndex(op => op.id === _order.id);
                                        const existingOperation = existingOperationIndex !== -1 ? _ops[existingOperationIndex] : null;
                                    
                                        // Early return if the value is already set
                                        if (existingOperation && existingOperation.final_buy_amount === limitOrderBuyAmount) {
                                            return _ops;
                                        }
                                    
                                        const hasLaterOrders = _ops.some(op => {
                                            const orderIndex = marketLimitOrders.findIndex(order => order.id === op.id);
                                            return orderIndex > index;
                                        });
                                    
                                        if (limitOrderBuyAmount === 0) {
                                            // Remove the current order if set to 0%
                                            return _ops.filter(op => op.id !== _order.id);
                                        } else if (limitOrderBuyAmount < _quoteAmount && hasLaterOrders) {
                                            // Remove subsequent market limit orders if the current order is less than 100% and there are later orders
                                            for (let i = index + 1; i < marketLimitOrders.length; i++) {
                                                const subsequentOrder = marketLimitOrders[i];
                                                const existingSubsequentOperationIndex = _ops.findIndex(op => op.id === subsequentOrder.id);
                                        
                                                if (existingSubsequentOperationIndex !== -1) {
                                                    // Remove existing subsequent operation
                                                    _ops.splice(existingSubsequentOperationIndex, 1);
                                                }
                                            }
                                        }
                                    
                                        if (limitOrderBuyAmount !== 0) {
                                        // Set prior market limit orders to 100% only if the current order is not set to 0%
                                        for (let i = 0; i < index; i++) {
                                            const priorOrder = marketLimitOrders[i];
                                            const priorOrderAmount = humanReadableFloat(priorOrder.sell_price.quote.amount, buyingAssetData.precision);
                                            const existingPriorOperationIndex = _ops.findIndex(op => op.id === priorOrder.id);
                                    
                                            if (existingPriorOperationIndex !== -1) {
                                                // Update existing prior operation
                                                _ops[existingPriorOperationIndex] = {
                                                    ..._ops[existingPriorOperationIndex],
                                                    final_buy_amount: priorOrderAmount
                                                };
                                            } else {
                                                // Add new prior operation
                                                priorOrder["final_buy_amount"] = priorOrderAmount;
                                                _ops.push(priorOrder);
                                            }
                                        }
                                        }
                                    
                                        // Set current order to the specified buy amount
                                        if (existingOperationIndex !== -1) {
                                            // Update existing operation
                                            _ops[existingOperationIndex] = {
                                                ..._ops[existingOperationIndex],
                                                final_buy_amount: limitOrderBuyAmount
                                            };
                                        } else {
                                            // Add new operation
                                            _order["final_buy_amount"] = limitOrderBuyAmount;
                                            _ops.push(_order);
                                        }
                                    
                                        return _ops;
                                    });
                                }}
                            >
                                Submit
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    };

    return (
        <Dialog open={addOperationDialog} onOpenChange={setAddOperationDialog}>
            <DialogTrigger>
                <Button variant="outline" className="mt-3">
                    + Add
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1080px] bg-white">
            <DialogHeader>
                <DialogTitle>What would you like to trade?</DialogTitle>
                <DialogDescription>
                    Configure your limit orders with this form.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-7 gap-5">
                <div className="col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-left">
                                    Buying
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
                        {
                            buyingAssetData
                                ? <CardContent>
                                    {
                                        updatedBalances && updatedBalances.length && updatedBalances.find((x) => x.asset_id === buyingAssetData.id)
                                            ? `${updatedBalances.find((x) => x.asset_id === buyingAssetData.id).amount} ${buyingAssetData.symbol}`
                                            : `0 ${buyingAssetData.symbol}`
                                    }
                                    </CardContent>
                                : null
                        }
                    </Card>
                </div>
                <div className="flex items-center justify-center">
                {
                        buyingAsset && sellingAsset
                            ? <Button
                                variant="outline"
                                className="w-full h-7"
                                onClick={handleClick}
                            >
                                {clicked ? <ReloadIcon className="animate-spin" /> : <ReloadIcon />}
                            </Button>
                            : <Button
                                variant="outline"
                                className="w-full h-7"
                                disabled
                            >
                                <ReloadIcon />
                            </Button>
                    }
                </div>
                <div className="col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="text-left">
                                        Selling
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
                        {
                            sellingAssetData
                                ? <CardContent>
                                    {
                                        updatedBalances && updatedBalances.length && updatedBalances.find((x) => x.asset_id === sellingAssetData.id)
                                            ? `${updatedBalances.find((x) => x.asset_id === sellingAssetData.id).amount} ${sellingAssetData.symbol}`
                                            : `0 ${sellingAssetData.symbol}`
                                    }
                                    </CardContent>
                                : null
                        }
                    </Card>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
                {
                    buyingAsset && sellingAsset
                        ? <Card>
                            <CardHeader>
                                <CardTitle>
                                    Market Limit Orders
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-5 gap-2 text-center">
                                    <div>
                                        {buyingAssetData ? buyingAssetData.symbol : null}
                                    </div>
                                    <div>
                                        {sellingAssetData ? sellingAssetData.symbol : null}
                                    </div>
                                    <div>Price</div>
                                    <div>Buying %</div>
                                    <div></div>
                                </div>
                                {
                                    marketLimitOrders && marketLimitOrders.length && sellingAsset !== buyingAsset
                                        ? <List
                                            height={200}
                                            itemCount={marketLimitOrders.length}
                                            itemSize={50}
                                            key={`list-limitorders`}
                                            className="w-full mt-3"
                                            >
                                            {limitOrderRow}
                                            </List>
                                        : <div className="text-center mt-5">No orders available</div>
                                }
                            </CardContent>
                        </Card>
                        : null
                }
            </div>
            </DialogContent>
        </Dialog>
    );
}