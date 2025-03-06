import React, { useSyncExternalStore, useMemo, useState, useEffect, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex as toHex } from "@noble/hashes/utils";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

import BasicAssetDropDownCard from "@/components/Market/BasicAssetDropDownCard.jsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createEverySameTFundStore } from "@/nanoeffects/SameTFunds.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createLimitOrdersStore } from "@/nanoeffects/MarketLimitOrders.ts";

import { $currentUser } from "@/stores/users.ts";

import { debounce, humanReadableFloat, blockchainFloat } from "@/lib/common.js";
import { $currentNode } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import ExternalLink from "./common/ExternalLink.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

export default function SameTFunds(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  const blocklist = useSyncExternalStore($blockList.subscribe, $blockList.get, () => true);
  const currentNode = useStore($currentNode);

  const { _assetsBTS, _assetsTEST, _marketSearchBTS, _marketSearchTEST } = properties;

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

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      let _ref = usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
      return usr.chain === "bitshares" && blocklist && blocklist.users
        ? _ref.filter(
            (asset) => !blocklist.users.includes(
              toHex(sha256(asset.u.split(" ")[1].replace("(", "").replace(")", "")))
            ),
          )
        : _ref;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);

  const [sameTFunds, setSameTFunds] = useState();
  useEffect(() => {
    async function fetching() {
      const sameTFundsStore = createEverySameTFundStore([
        _chain,
        currentNode ? currentNode.url : null,
      ]);

      sameTFundsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          let filteredData = data.filter((x) => x);
          if (_chain === "bitshares") {
            // filter out any tfunds owned by banned users
            filteredData = filteredData.filter(
              (x) => !blocklist.users.includes(toHex(sha256(x.owner_account)))
            ).filter(
              (x) => x.fee_rate < 500000 // 50% max fee...
            );
          }
          setSameTFunds(filteredData);
        }
      });
    }

    if (_chain && currentNode) {
      fetching();
    }
  }, [_chain, currentNode]);

  const allUserIDs = useMemo(() => {
    if (sameTFunds && sameTFunds.length) {
      const uniqueIDs = new Set(sameTFunds.map((x) => x.owner_account));
      return Array.from(uniqueIDs);
    }
    return [];
  }, [sameTFunds]);

  const [lenderAccounts, setLenderAccounts] = useState([]);
  useEffect(() => {
    async function fetching() {
      const objectsStore = createObjectStore([
        _chain,
        JSON.stringify(allUserIDs),
        currentNode ? currentNode.url : null,
      ]);

      objectsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setLenderAccounts(data);
        }
      });
    }

    if (allUserIDs.length && _chain && currentNode) {
      fetching();
    }
  }, [allUserIDs, _chain, currentNode]);

  const [usrBalances, setUsrBalances] = useState();
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

  const [borrowPositions, setBorrowPositions] = useState([]);
  const BorrowPositionRow = ({ index, style }) => {
    let _borrowPosition = borrowPositions[index];

    if (!_borrowPosition) {
      return null;
    }

    const borrowAsset = assets.find((x) => x.id === _borrowPosition.asset_id);

    return (
        <Card className="w-full">
          <CardHeader className="pt-1 pb-1">
            <CardDescription>
              <div className="grid grid-cols-3">
                <div>
                  {_borrowPosition.id}
                </div>
                <div>
                  {_borrowPosition.borrow_amount} {borrowAsset.symbol} 
                </div>
                <div>
                  {(_borrowPosition.borrow_amount * sameTFunds.find((x) => x.id === _borrowPosition.id).fee_rate / 1000000).toFixed(borrowAsset.precision)}
                  {" "}
                  {borrowAsset.symbol}
                </div>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
    )
  };

  const FundRow = ({ index, style }) => {
    let fund = sameTFunds[index];

    if (!fund || !assets || !assets.length) {
      return null;
    }

    const asset = assets.find((x) => x.id === fund.asset_type);
    const regex = new RegExp(`^[0-9]*\\.?[0-9]{0,${asset.precision}}$`);

    const assetName = asset ? asset.symbol : fund.asset_type;
    const balance = humanReadableFloat(fund.balance, asset.precision);
    const feeRate = fund.fee_rate / 10000;
    const unpaidAmount = humanReadableFloat(fund.unpaid_amount, asset.precision);
    const lender = lenderAccounts.find((x) => x.id === fund.owner_account);

    const [borrowAmount, setBorrowAmount] = useState(
      borrowPositions.find((x) => x.id === fund.id)?.borrow_amount || 0
    );
    const [borrowPositionDialog, setBorrowPositionDialog] = useState(false);

    return (
      <div style={style} key={`sametfund-${fund.id}`}>
        <Card className="w-full">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-10">
              <CardHeader className="pt-1 pb-1">
                <CardDescription>
                  {t("SameTFunds:fund")}
                  {" #"}
                  <ExternalLink
                    classnamecontents="hover:text-purple-500"
                    type="text"
                    text={fund.id.replace("1.20.", "")}
                    hyperlink={`https://blocksights.info/#/objects/${fund.id}${
                      usr.chain === "bitshares" ? "" : "?network=testnet"
                    }`}
                  />{" "}
                  {t("CreditBorrow:common.by")}{" "}
                  {lender ? (
                    <ExternalLink
                      classnamecontents="hover:text-purple-500"
                      type="text"
                      text={lender.name}
                      hyperlink={`https://blocksights.info/#/accounts/${lender.name}${
                        usr.chain === "bitshares" ? "" : "?network=testnet"
                      }`}
                    />
                  ) : (
                    "???"
                  )}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="col-span-2">
                      <div className="grid grid-cols-2">
                        <div>
                          {t("SameTFunds:offering")}:<b>{` ${balance - unpaidAmount} ${assetName}`}</b>
                        </div>
                        <div>
                          {t("SameTFunds:fee")}:<b>{` ${feeRate} %`}</b>
                          {feeRate > 20 ? "⚠️" : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-2 flex items-center justify-center">
              <Dialog open={borrowPositionDialog} onOpenChange={setBorrowPositionDialog}>
                <DialogTrigger>
                  <Button
                    variant="outline"
                    className="self-center"
                  >
                    Borrow
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white w-1/2 max-w-4xl bg-gray-100">
                  <DialogHeader>
                    <DialogTitle>How much would you like to borrow?</DialogTitle>
                    <DialogDescription>
                      Amount available: {balance - unpaidAmount} {assetName}<br/>
                      Fee rate: {feeRate}%
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-3">
                    <Input
                      value={borrowAmount}
                      type="text"
                      onInput={(e) => {
                        const value = e.currentTarget.value;
                        if (regex.test(value)) {
                          setBorrowAmount(balance - unpaidAmount < value ? balance - unpaidAmount : value);
                        }
                      }}
                    />
                    <div className="grid grid-cols-5 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowAmount(0);
                        }}
                      >
                        0%
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowAmount((balance - unpaidAmount) * 0.25);
                        }}
                      >
                        25%
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowAmount((balance - unpaidAmount) * 0.50);
                        }}
                      >
                        50%
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowAmount((balance - unpaidAmount) * 0.75);
                        }}
                      >
                        75%
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowAmount(balance - unpaidAmount);
                        }}
                      >
                        100%
                      </Button>
                    </div>
                    {
                      borrowAmount > 0
                        ? <Button
                            variant="outline"
                            onClick={() => {
                              setBorrowPositions((prevBorrowPositions) => {
                                const _borrows = [...prevBorrowPositions];
                                const existingBorrow = _borrows.find((x) => x.id === fund.id);
                          
                                if (existingBorrow) {
                                  existingBorrow.borrow_amount = parseFloat(borrowAmount);
                                } else {
                                  _borrows.push({
                                    id: fund.id,
                                    asset_id: fund.asset_type,
                                    borrow_amount: parseFloat(borrowAmount),
                                    fee_rate: fund.fee_rate
                                  });
                                }
                          
                                return _borrows;
                              });

                              setBorrowPositionDialog(false);
                            }}
                          >
                            Submit
                          </Button>
                        : <Button
                            variant="outline"
                            onClick={() => {
                              setBorrowPositions((prevBorrowPositions) => {
                                const _borrows = prevBorrowPositions.filter((x) => x.id !== fund.id);
                                return _borrows;
                              });
                          
                              setBorrowPositionDialog(false);
                            }}
                          >
                            Submit
                          </Button>
                    }
                    
                  </div>
                </DialogContent>
              </Dialog>

            </div>
          </div>
        </Card>
      </div>
    );
  };

  const [deeplinkDialog, setDeeplinkDialog] = useState(false);
  const [operations, setOperations] = useState([]);

  const operationsJSON = useMemo(() => {
    let _operations = [];
    if (
      !usr ||
      !usr.id ||
      !sameTFunds ||
      !sameTFunds.length ||
      !operations.length ||
      !borrowPositions.length
    ) {
      return _operations;
    }

    /*
      {
        id: fund.id,
        asset_id: fund.asset_type,
        borrow_amount: parseFloat(borrowAmount),
      }
    */

    borrowPositions.map((x) => {
      const _id = x.id;
      const _borrowAssetID = x.asset_id;
      const _borrowAmount = x.borrow_amount;

      const _referenceFundAsset = assets.find((x) => x.id === _borrowAssetID);
      _operations.push({
        borrower: usr.id,
        fund_id: _id,
        borrow_amount: {
          amount: blockchainFloat(_borrowAmount, _referenceFundAsset.precision),
          asset_id: _referenceFundAsset.id
        },
        extensions: {}
      });
    });

    _operations.concat(operations);

    borrowPositions.map((x) => {
      const _id = x.id;
      const _borrowAssetID = x.asset_id;
      const _borrowAmount = x.borrow_amount;
      const _feeRate = x.fee_rate;

      const _referenceFundAsset = assets.find((x) => x.id === _borrowAssetID);

      const _feeAmount = _borrowAmount * _feeRate / 1000000;

      _operations.push({
        account: usr.id,
        fund_id: _id,
        repay_amount: {
          amount: blockchainFloat(_borrowAmount, _referenceFundAsset.precision),
          asset_id: _referenceFundAsset.id
        },
        fund_fee: {
          amount: blockchainFloat(_feeAmount, _referenceFundAsset.precision),
          asset_id: _referenceFundAsset.id
        },
        extensions: {}
      });
    });

    return _operations;
  }, [borrowPositions, operations, sameTFunds, usr]);

  const [sellingAsset, setSellingAsset] = useState(null);
  const [buyingAsset, setBuyingAsset] = useState(null);

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

  const [marketLimitOrders, setMarketLimitOrders] = useState([]);
  useEffect(() => {
    async function fetching() {
      const limitOrdersStore = createLimitOrdersStore([
        _chain,
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
      _chain &&
      currentNode
    ) {
      fetching();
    }
  }, [sellingAsset, sellingAssetData, buyingAsset, buyingAssetData, _chain, currentNode]);

  const limitOrderRow = ({ index, style }) => {
    let _order = marketLimitOrders[index];

    if (!_order) {
      return null;
    }

    const regex = new RegExp(`^[0-9]*\\.?[0-9]{0,${sellingAssetData.precision}}$`);

    /*
      {
          "id": "1.7.558989518",
          "expiration": "2025-11-26T05:56:04",
          "seller": "1.2.114122",
          "for_sale": 90000,
          "sell_price": {
              "base": {
                  "amount": 2988000,
                  "asset_id": "1.3.0"
              },
              "quote": {
                  "amount": 498,
                  "asset_id": "1.3.106"
              }
          },
          "filled_amount": "2898000",
          "deferred_fee": 0,
          "deferred_paid_fee": {
              "amount": 0,
              "asset_id": "1.3.0"
          },
          "is_settled_debt": false,
          "on_fill": []
      }
    */

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
          {(_quoteAmount / _baseAmount).toFixed(sellingAssetData.precision)}
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
              <div className="grid grid-cols-5 gap-2">
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

  const OpRow = ({ index, style }) => {
    let _operation = operations[index];

    console.log({
      operations
    });

    if (!_operation) {
      return null;
    }

    const _baseAsset = assets.find((x) => x.id === _operation.sell_price.base.asset_id);
    const _quoteAsset = assets.find((x) => x.id === _operation.sell_price.quote.asset_id);

    const _baseAmount = humanReadableFloat(_operation.sell_price.base.amount, _baseAsset.precision);
    const _quoteAmount = humanReadableFloat(_operation.sell_price.quote.amount, _quoteAsset.precision);

    /*
      {
          "id": "1.7.560724540",
          "expiration": "2027-01-28T05:37:09",
          "seller": "1.2.1811273",
          "for_sale": 2011688,
          "sell_price": {
              "base": {
                  "amount": 2011688,
                  "asset_id": "1.3.5286"
              },
              "quote": {
                  "amount": 20116880,
                  "asset_id": "1.3.0"
              }
          },
          "filled_amount": "0",
          "deferred_fee": 48260,
          "deferred_paid_fee": {
              "amount": 0,
              "asset_id": "1.3.0"
          },
          "is_settled_debt": false,
          "on_fill": [],
          "final_buy_amount": 50.2922
      }
    */
    
    return (
      <div style={style} key={`operation-summary-${_operation.id}-${index}`}>
        <Card className="w-full">
          <CardHeader className="pt-1 pb-1">
            <CardDescription>
              <div className="grid grid-cols-10">
                <div className="col-span-3">
                  {_quoteAmount}<br/>
                  {_quoteAsset.symbol}
                </div>
                <div className="col-span-3">
                  {_baseAmount}<br/>
                  {_baseAsset.symbol}
                </div>
                <div className="col-span-3">
                  {(_quoteAmount / _baseAmount).toFixed(_baseAsset.precision)}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log("Editing operation");
                    setBuyingAsset(_quoteAsset.symbol);
                    setSellingAsset(_baseAsset.symbol);
                    setAddOperationDialog(true);
                  }}
                >
                  ⚙️
                </Button>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  };

  const [addOperationDialog, setAddOperationDialog] = useState(false);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{t("SameTFunds:title")}</CardTitle>
              <CardDescription>{t("SameTFunds:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Available Same-T Funds
                  </label>
                  <div className="border rounded border-gray-300 p-2">
                    {
                      sameTFunds && sameTFunds.length > 0 ? (
                        <List
                          height={250}
                          itemCount={sameTFunds.length}
                          itemSize={55}
                          key={`list-sametfunds`}
                          className="w-full mt-3"
                        >
                          {FundRow}
                        </List>
                      ) : (
                        <div className="mt-5">{t("SameTFunds:noFunds")}</div>
                      )
                    }
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Same-T Fund Borrow Positions
                  </label>
                  {
                    borrowPositions && borrowPositions.length
                      ? (
                        <div className="grid grid-cols-3 border rounded border-gray-300 p-2">
                          <div>
                            Fund
                          </div>
                          <div>
                            Borrowed
                          </div>
                          <div>
                            Borrow Fees
                          </div>
                          <div className="col-span-3">
                            <List
                              height={200}
                              itemCount={borrowPositions.length}
                              itemSize={65}
                              key={`list-borrowpositions`}
                              className="w-full mt-1"
                            >
                              {BorrowPositionRow}
                            </List>
                          </div>
                        </div>
                      ) : <div className="mt-3">
                            No borrow positions
                          </div>
                  }
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Chain of operations
                  </label>
                  {
                    borrowPositions && borrowPositions.length
                      ? <div className="grid grid-cols-6 gap-2">
                          <div className="col-span-5 rounded border border-gray-300 p-2">
                            <div className="grid grid-cols-10">
                              <div className="col-span-3">
                                Buying
                              </div>
                              <div className="col-span-3">
                                Selling
                              </div>
                              <div className="col-span-3">
                                Price
                              </div>
                              <div>
                              </div>
                            </div>
                            <List
                              height={200}
                              itemCount={operations.length}
                              itemSize={55}
                              key={`list-operations`}
                              className="w-full mt-3"
                            >
                              {OpRow}
                            </List>
                          </div>
                          <div>
                            <Dialog open={addOperationDialog} onOpenChange={setAddOperationDialog}>
                              <DialogTrigger>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    console.log("Adding an operation")
                                  }}  
                                >
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
                                <div className="grid grid-cols-2 gap-5">
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
                                              chain={usr && usr.chain ? usr.chain : "bitshares"}
                                              borrowPositions={borrowPositions}
                                              usrBalances={usrBalances}
                                            />
                                          </div>
                                        </div>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent></CardContent>
                                  </Card>
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
                                              chain={usr && usr.chain ? usr.chain : "bitshares"}
                                              borrowPositions={borrowPositions}
                                              usrBalances={usrBalances}
                                            />
                                          </div>
                                        </div>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent></CardContent>
                                  </Card>
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
                                                : "No orders available"
                                            }
                                          </CardContent>
                                        </Card>
                                      : null
                                  }
                                </div>
                              </DialogContent>
                            </Dialog>
      
                          </div>
                        </div>
                      : <div className="mt-3">
                          No borrow positions
                        </div>
                  }
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Summary
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Card>
                      <CardHeader className="p-1">
                        <CardDescription>
                          Limit orders: {operations.length}<br/>
                          Network fees: {operations.length * 0.01} BTS<br/>
                          Market fees:<br/>
                          x HONEST.USD<br/>
                          y HONEST.CNY
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-1">
                        <CardDescription>
                          Balances before:<br/>
                          BTS: 1234<br/>
                          TEST: 1234<br/>
                          NFTEA: 1234<br/>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-1">
                        <CardDescription>
                          Balances after:<br/>
                          BTS: 1235 (+ 1)<br/>
                          TEST: 1235 (+ 1)<br/>
                          NFTEA: 1235 (+ 1)
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>
              </div>

              <Button
                className="w-1/4 mt-3"
                variant="outline"
                onClick={() => {
                  setDeeplinkDialog(true);
                }}
              >
                Generate Deeplink
              </Button>
            </CardContent>
          </Card>

          {
            usr && deeplinkDialog
              ? <DeepLinkDialog
                  operationNames={[
                    "samet_fund_borrow",
                    // ....
                    "samet_fund_repay"
                  ]}
                  username={usr && usr.username ? usr.username : ""}
                  usrChain={usr && usr.chain ? usr.chain : "bitshares"}
                  userID={usr.id}
                  dismissCallback={setDeeplinkDialog}
                  key={`constructing_samet_fund_trades_${username}`}
                  headerText={t("TFundUser:deeplinkHeaderText")}
                  trxJSON={operationsJSON}
                />
              : null
          }

        </div>
      </div>
    </>
  );
}
