import React, { useSyncExternalStore, useMemo, useState, useEffect, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from "@nanostores/react";
import Fuse from "fuse.js";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex as toHex } from "@noble/hashes/utils";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
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

import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createEverySameTFundStore } from "@/nanoeffects/SameTFunds.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

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
      return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
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
              (x) => x.fee_rate < 10000
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
      <div className="grid grid-cols-3">
        <div>
          {_borrowPosition.id}
        </div>
        <div>
          {_borrowPosition.borrow_amount} {borrowAsset.symbol} 
        </div>
        <div>
          {(_borrowPosition.borrow_amount * sameTFunds.find((x) => x.id === _borrowPosition.id).fee_rate / 10000).toFixed(borrowAsset.precision)}
          {" "}
          {borrowAsset.symbol}
        </div>
      </div>
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
    const feeRate = fund.fee_rate / 100;
    const unpaidAmount = humanReadableFloat(fund.unpaid_amount, asset.precision);
    const lender = lenderAccounts.find((x) => x.id === fund.owner_account);

    const [borrowAmount, setBorrowAmount] = useState(0);
    const [borrowPositionDialog, setBorrowPositionDialog] = useState(false);

    return (
      <div style={style} key={`sametfund-${fund.id}`}>
        <Card className="w-full">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-10">
              <CardHeader className="pt-2 pb-0">
                <CardTitle>
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
                </CardTitle>
                <CardDescription>
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
                <DialogContent className="bg-white w-full max-w-4xl bg-gray-100">
                  <DialogHeader>
                    <DialogTitle>How much would you like to borrow?</DialogTitle>
                    <DialogDescription>
                      Amount available: {balance - unpaidAmount} {assetName}<br/>
                      Fee rate: {feeRate}%
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-3 gap-5">
                    <Input
                      value={borrowAmount}
                      type="text"
                      onInput={(e) => {
                        const value = e.currentTarget.value;
                        if (regex.test(value)) {
                          setBorrowAmount(value);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBorrowAmount(balance - unpaidAmount);
                      }}
                    >
                      100%
                    </Button>
                    {
                      borrowAmount > 0
                      ? <Button
                          variant="outline"
                          onClick={() => {
                            setBorrowPositions((prevBorrowPositions) => {
                              const _borrows = [...prevBorrowPositions];
                              const existingBorrow = _borrows.find((x) => x.id === fund.id);
                        
                              if (existingBorrow) {
                                existingBorrow.borrow_amount += parseFloat(borrowAmount);
                              } else {
                                _borrows.push({
                                  id: fund.id,
                                  asset_id: fund.asset_type,
                                  borrow_amount: parseFloat(borrowAmount),
                                });
                              }
                        
                              return _borrows;
                            });

                            setBorrowPositionDialog(false);
                          }}
                        >
                          Submit
                        </Button>
                      : <Button variant="outline" disabled>
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

  const [operations, setOperations] = useState([]);
  const OpRow = ({ index, style }) => {
    let _operation = operations[index];

    if (!_operation) {
      return null;
    }

    return (
      <div className="grid grid-cols-1">
        Trading x for y
      </div>
    );
  };

  const [deeplinkDialog, setDeeplinkDialog] = useState(false);

  const operationsJSON = useMemo(() => {
    let _operations = [];
    if (
      !usr ||
      !usr.id ||
      !sameTFunds ||
      !sameTFunds.length ||
      !operations.length ||
      !Object.keys(borrowPositions).length
    ) {
      return _operations;
    }

    Object.keys(borrowPositions).map((key) => {
      const _referenceFund = sameTFunds.find((x) => x.id === key.replaceAll("_", "."));
      const _referenceFundAsset = assets.find((x) => x.id === _referenceFund.asset_type);
      _operations.push({
        borrower: usr.id,
        fund_id: _referenceFund.id,
        borrow_amount: {
          amount: blockchainFloat(borrowPositions[key], _referenceFundAsset.precision),
          asset_id: _referenceFundAsset.id
        },
        extensions: []
      });
    });

    _operations.concat(operations);

    Objects.keys(borrowPositions).map((key) => {
      const _referenceFund = sameTFunds.find((x) => x.id === key.replaceAll("_", "."));
      const _referenceFundAsset = assets.find((x) => x.id === _referenceFund.asset_type);

      const _debtAmount = blockchainFloat(borrowPositions[key], _referenceFundAsset.precision);
      const _feeAmount = _debtAmount * _referenceFund.fee_rate / 100;

      _operations.push({
        account: usr.id,
        fund_id: _referenceFund.id,
        repay_amount: {
          amount: blockchainFloat(borrowPositions[key], _referenceFundAsset.precision),
          asset_id: _referenceFundAsset.id
        },
        fund_fee: {
          amount: _feeAmount,
          asset_id: _referenceFundAsset.id
        },
        extensions: []
      });
    });

    return _operations;
  }, [borrowPositions, operations, sameTFunds, usr]);

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
                  {
                    sameTFunds && sameTFunds.length > 0 ? (
                      <List
                        height={250}
                        itemCount={sameTFunds.length}
                        itemSize={65}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Same-T Fund Borrow Positions
                  </label>
                  <div className="grid grid-cols-3 border rounded border-gray-300 p-2">
                    <div>
                      Fund
                    </div>
                    <div>
                      Borrowed
                    </div>
                    <div>
                      Owed
                    </div>
                    <div className="col-span-3">
                      {
                        borrowPositions && borrowPositions.length
                          ? (
                            <List
                              height={250}
                              itemCount={borrowPositions.length}
                              itemSize={65}
                              key={`list-borrowpositions`}
                              className="w-full mt-3"
                            >
                              {BorrowPositionRow}
                            </List>
                          ) : (
                            <div className="mt-5">{t("SameTFunds:noBorrowPositions")}</div>
                          )
                      }
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Chain of operations
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    <div className="col-span-5 rounded border border-gray-300 p-2">
                      <List
                        height={200}
                        itemCount={operations.length}
                        itemSize={50}
                        key={`list-operations`}
                        className="w-full mt-3"
                      >
                        {OpRow}
                      </List>
                    </div>
                    <div>

                      <Dialog>
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
                        <DialogContent className="bg-white w-full max-w-4xl bg-gray-100">
                          <DialogHeader>
                            <DialogTitle>What would you like to trade?</DialogTitle>
                            <DialogDescription>
                              Configure your limit orders with this form.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-3 gap-5">
                            Select Borrowed asset<br/>
                            Establish trading pair<br/>
                            Fetch latest order book for trading pair<br/>
                            Show order book<br/>
                            Enable user to buy into order book with borrowed funds
                          </div>
                        </DialogContent>
                      </Dialog>

                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Summary
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      Limit orders: {operations.length}
                    </div>
                    <div className="col-span-2">
                      Earnings: x BTS, y USD, z EUR
                    </div>
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
