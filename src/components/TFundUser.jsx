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

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createEverySameTFundStore } from "@/nanoeffects/SameTFunds.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";

import { humanReadableFloat, blockchainFloat } from "@/lib/common.js";
import { $currentNode } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import ExternalLink from "./common/ExternalLink.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import LimitOrderWizard from "./Market/LimitOrderWizard.jsx";

export default function SameTFunds(properties) {
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
  const currentNode = useStore($currentNode);

  const {
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;

  const [sameTFunds, setSameTFunds] = useState();
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
      const fee1 = globalParams.find((x) => x.id === 1); // operation: limit_order_create
      const finalFee = humanReadableFloat(fee1.data.fee, 5);
      setLimitOrderFee(finalFee);

      const fee67 = globalParams.find((x) => x.id === 67); // operation: same_tfund_borrow
      const finalFee67 = humanReadableFloat(fee67.data.fee, 5);
      setSameTFundBorrowFee(finalFee67);

      const fee68 = globalParams.find((x) => x.id === 68); // operation: same_tfund_repay
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
      const sameTFundsStore = createEverySameTFundStore([
        _chain,
        currentNode ? currentNode.url : null,
      ]);

      sameTFundsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          let filteredData = data.filter((x) => x);
          if (_chain === "bitshares") {
            // filter out any tfunds owned by banned users
            filteredData = filteredData
              .filter(
                (x) =>
                  !blocklist.users.includes(
                    toHex(sha256(utf8ToBytes(x.owner_account)))
                  )
              )
              .filter(
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

  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setUsrBalances(filteredData);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
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

    /*
      {
        id: fund.id,
        asset_id: fund.asset_type,
        borrow_amount: parseFloat(borrowAmount),
      }
    */

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

    // Collect asset IDs from borrow positions
    borrowPositions.forEach((position) => {
      relevantAssetIds.add(position.asset_id);
    });

    // Collect asset IDs from operations
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
        ? _purchasedAsset.market_fee_percent / 100
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
        ? _purchasedAsset.market_fee_percent / 100
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
    const unpaidAmount = humanReadableFloat(
      fund.unpaid_amount,
      asset.precision
    );
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
                  {t("TFundUser:fund")}
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
                      hyperlink={`https://blocksights.info/#/accounts/${
                        lender.name
                      }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                    />
                  ) : (
                    "???"
                  )}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="col-span-2">
                      <div className="grid grid-cols-2">
                        <div>
                          {t("TFundUser:offering")}:
                          <b>{` ${balance - unpaidAmount} ${assetName}`}</b>
                        </div>
                        <div>
                          {t("TFundUser:fee")}:<b>{` ${feeRate} %`}</b>
                          {feeRate > 20 ? "⚠️" : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-2 flex items-center justify-center">
              <Dialog
                open={borrowPositionDialog}
                onOpenChange={setBorrowPositionDialog}
              >
                <DialogTrigger>
                  <Button variant="outline" className="self-center">
                    {t("TFundUser:borrow")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white w-1/2 max-w-4xl bg-gray-100">
                  <DialogHeader>
                    <DialogTitle>{t("TFundUser:dialogTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("TFundUser:amountAvailable")}: {balance - unpaidAmount}{" "}
                      {assetName}
                      <br />
                      {t("TFundUser:feeRate")}: {feeRate}%
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-3">
                    <Input
                      value={borrowAmount}
                      type="text"
                      onInput={(e) => {
                        const value = e.currentTarget.value;
                        if (regex.test(value)) {
                          setBorrowAmount(
                            balance - unpaidAmount < value
                              ? balance - unpaidAmount
                              : value
                          );
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
                        {t("TFundUser:zeroPercent")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowAmount((balance - unpaidAmount) * 0.25);
                        }}
                      >
                        {t("TFundUser:twentyFivePercent")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowAmount((balance - unpaidAmount) * 0.5);
                        }}
                      >
                        {t("TFundUser:fiftyPercent")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowAmount((balance - unpaidAmount) * 0.75);
                        }}
                      >
                        {t("TFundUser:seventyFivePercent")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowAmount(balance - unpaidAmount);
                        }}
                      >
                        {t("TFundUser:hundredPercent")}
                      </Button>
                    </div>
                    {borrowAmount > 0 ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowPositions((prevBorrowPositions) => {
                            const _borrows = [...prevBorrowPositions];
                            const existingBorrow = _borrows.find(
                              (x) => x.id === fund.id
                            );

                            if (existingBorrow) {
                              existingBorrow.borrow_amount =
                                parseFloat(borrowAmount);
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
                        }}
                      >
                        {t("TFundUser:submit")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBorrowPositions((prevBorrowPositions) => {
                            const _borrows = prevBorrowPositions.filter(
                              (x) => x.id !== fund.id
                            );
                            return _borrows;
                          });

                          setBorrowPositionDialog(false);
                        }}
                      >
                        {t("TFundUser:submit")}
                      </Button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>
      </div>
    );
  };

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
        <Card className="w-full">
          <CardHeader className="pt-1 pb-1">
            <CardDescription>
              <div className="grid grid-cols-3">
                <div>{_borrowPosition.id}</div>
                <div>
                  {borrowAmount} {borrowAsset.symbol}
                </div>
                <div>
                  {feeAmount} {borrowAsset.symbol}
                </div>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  };

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

    let _finalAmountStyle = "";
    if (_finalAmount < 0) {
      _finalAmountStyle = "text-red-500";
    } else if (_finalAmount > 0) {
      _finalAmountStyle = _diff > 0 ? "text-green-500" : "";
    }

    return (
      <div style={style} key={`balance-${_balance.asset_id}`}>
        <Card>
          <CardHeader className="pt-1 pb-1">
            <CardDescription>
              <div className="grid grid-cols-5 gap-2">
                <div>{_balance.symbol}</div>
                <div>
                  {parseFloat(_balance.amount).toFixed(_asset.precision)}
                </div>
                <div>
                  {_diff === 0 ? "" : null}
                  {_diff < 0 ? _diff : `+${_diff}`}
                </div>
                <div>
                  {_diff === 0 ? "" : null}
                  {_totalBorrowedAmount > 0
                    ? (_totalBorrowedAmount + _totalOwedAmount).toFixed(
                        _asset.precision
                      )
                    : null}
                </div>
                <div className={_finalAmountStyle}>{_finalAmount}</div>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  };

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
      ? _purchasedAsset.market_fee_percent / 100
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
        <Card className="w-full">
          <CardHeader className="pt-1 pb-1">
            <CardDescription>
              <div className="grid grid-cols-10">
                <div className="col-span-3">
                  {_amountPurchased}
                  <br />
                  {_purchasedAsset.symbol}
                </div>
                <div className="col-span-3">
                  {_amountSold}
                  <br />
                  {_soldAsset.symbol}
                </div>
                <div className="col-span-3">{_operation.final_price}</div>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log("Editing operation");
                    setBuyingAsset(_purchasedAsset.symbol);
                    setSellingAsset(_soldAsset.symbol);
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

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{t("TFundUser:title")}</CardTitle>
              <CardDescription>{t("TFundUser:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("TFundUser:step1")}
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    {t("TFundUser:step1Description")}
                  </label>
                  <div className="border rounded border-gray-300 p-2 mt-2">
                    {lenderAccounts &&
                    lenderAccounts.length &&
                    sameTFunds &&
                    sameTFunds.length > 0 ? (
                      <div className="w-full max-h-[250px] overflow-auto">
                        <List
                          rowComponent={FundRow}
                          rowCount={sameTFunds.length}
                          rowHeight={55}
                          rowProps={{}}
                          key={`list-sametfunds`}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2 mt-5">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    )}
                  </div>
                </div>
                {borrowPositions && borrowPositions.length ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("TFundUser:borrowPositions")}
                    </label>
                    <label className="block text-xs font-medium text-gray-700">
                      {t("TFundUser:borrowPositionsDescription")}
                    </label>
                    <div className="grid grid-cols-3 border rounded border-gray-300 p-2 mt-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t("TFundUser:fund")}
                      </label>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("TFundUser:borrowed")}
                      </label>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("TFundUser:borrowFees")}
                      </label>
                      <div className="col-span-3">
                        <div className="w-full mt-1 max-h-[200px] overflow-auto">
                          <List
                            rowComponent={BorrowPositionRow}
                            rowCount={borrowPositions.length}
                            rowHeight={35}
                            rowProps={{}}
                            key={`list-borrowpositions`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                {borrowPositions && borrowPositions.length ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("TFundUser:step2")}
                    </label>
                    <label className="block text-xs font-medium text-gray-700">
                      {t("TFundUser:step2Description")}
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      <div className="col-span-5 rounded border border-gray-300 p-2 mt-2">
                        <div className="grid grid-cols-4">
                          <label className="block text-sm font-medium text-gray-700">
                            {t("TFundUser:buying")}
                          </label>
                          <label className="block text-sm font-medium text-gray-700">
                            {t("TFundUser:selling")}
                          </label>
                          <label className="block text-sm font-medium text-gray-700">
                            {t("TFundUser:price")}
                          </label>
                          <div></div>
                        </div>
                        <div className="w-full mt-3 max-h-[200px] overflow-auto">
                          <List
                            rowComponent={OpRow}
                            rowCount={operations.length}
                            rowHeight={55}
                            rowProps={{}}
                            key={`list-operations`}
                          />
                        </div>
                      </div>
                      <div>
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
                ) : null}

                {borrowPositions &&
                borrowPositions.length &&
                updatedBalances &&
                updatedBalances.length ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("TFundUser:step3")}
                    </label>
                    <label className="block text-xs font-medium text-gray-700">
                      {t("TFundUser:step3Description")}
                    </label>
                    <div className="rounded border border-gray-300 p-2 mt-2">
                      <div className="grid grid-cols-5 gap-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {t("TFundUser:asset")}
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("TFundUser:balance")}
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("TFundUser:difference")}
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("TFundUser:borrowed")}
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("TFundUser:finalAmount")}
                        </label>
                      </div>
                      <div className="w-full mt-3 max-h-[200px] overflow-auto">
                        <List
                          rowComponent={BalanceRow}
                          rowCount={
                            updatedBalances.filter((x) => x.display).length
                          }
                          rowHeight={35}
                          rowProps={{}}
                          key={`list-updatedbalances`}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {operations && operations.length ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("TFundUser:estimatedFees")}
                    </label>
                    <Card>
                      <CardHeader className="p-1">
                        <CardDescription>
                          <div className="grid grid-cols-6 gap-2">
                            <Badge className="m-1" key={"core_asset"}>
                              {(
                                operations.length * limitOrderFee +
                                borrowPositions.length *
                                  2 *
                                  sameTFundBorrowFee +
                                borrowPositions.length * 2 * sameTFundRepayFee
                              ).toFixed(5)}{" "}
                              {usr && usr.chain === "bitshares"
                                ? "BTS"
                                : "TEST"}
                            </Badge>
                            {marketFees && marketFees.length
                              ? marketFees.map(({ symbol, fee }) => (
                                  <Badge className="m-1" key={symbol}>
                                    {fee} {symbol}
                                  </Badge>
                                ))
                              : null}
                          </div>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                ) : null}
              </div>

              {operations && operations.length ? (
                <Button
                  className="w-1/4 mt-3"
                  variant="outline"
                  onClick={() => {
                    setDeeplinkDialog(true);
                  }}
                >
                  {t("TFundUser:generateDeeplink")}
                </Button>
              ) : null}
            </CardContent>
          </Card>

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
        </div>
      </div>
    </>
  );
}
