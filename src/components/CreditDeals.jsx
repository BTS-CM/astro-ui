import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { useForm } from "react-hook-form";
import { useStore } from '@nanostores/react';
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  $assetCacheBTS,
  $assetCacheTEST,
  $globalParamsCacheBTS,
  $globalParamsCacheTEST,
} from "@/stores/cache.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createBorrowerDealsStore } from "@/nanoeffects/BorrowerDeals.ts";
import { createLenderDealsStore } from "@/nanoeffects/LenderDeals.ts";

import { blockchainFloat, humanReadableFloat } from "@/lib/common.js";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

export default function CreditDeals(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNode = useStore($currentNode);

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const _assetsBTS = useSyncExternalStore($assetCacheBTS.subscribe, $assetCacheBTS.get, () => true);
  const _assetsTEST = useSyncExternalStore(
    $assetCacheTEST.subscribe,
    $assetCacheTEST.get,
    () => true
  );

  const _globalParamsBTS = useSyncExternalStore(
    $globalParamsCacheBTS.subscribe,
    $globalParamsCacheBTS.get,
    () => true
  );
  const _globalParamsTEST = useSyncExternalStore(
    $globalParamsCacheTEST.subscribe,
    $globalParamsCacheTEST.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", ["assets", "globalParams"]);

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

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 73);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [borrowerDeals, setBorrowerDeals] = useState();
  useEffect(() => {
    let unsubscribeBorrowerDeals;

    if (usr && usr.id) {
      const borrowerDealsStore = createBorrowerDealsStore([usr.chain, usr.id]);

      unsubscribeBorrowerDeals = borrowerDealsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBorrowerDeals(data);
        }
      });
    }
    
    return () => {
      if (unsubscribeBorrowerDeals) unsubscribeBorrowerDeals();
    }
  }, [usr]);

  const [lenderDeals, setLenderDeals] = useState();
  useEffect(() => {
    let unsubscribeLenderDeals;

    if (usr && usr.id) {
      const lenderDealsStore = createLenderDealsStore([usr.chain, usr.id]);
      
      unsubscribeLenderDeals = lenderDealsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setLenderDeals(data);
        }
      });
    }

    return () => {
      if (unsubscribeLenderDeals) unsubscribeLenderDeals();
    }
  }, [usr]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id, currentNode ? currentNode.url : null]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setUsrBalances(data);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr]);

  function CommonRow({ style, res, type }) {
    const debtAsset = assets.find((x) => x.id === res.debt_asset);
    const collateralAsset = assets.find((x) => x.id === res.collateral_asset);

    const borrowedAmount = humanReadableFloat(res.debt_amount, debtAsset.precision);

    const collateralAmount = humanReadableFloat(res.collateral_amount, collateralAsset.precision);

    // Assuming latest_repay_time is in ISO format
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

    //const [repayAmount, setRepayAmount] = useState(borrowedAmount ?? 0);
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
        if (foundBalance) {
          return humanReadableFloat(foundBalance.amount, debtAsset.precision);
        }
      }
      return 0;
    }, [usrBalances, debtAsset]);

    const [inputValue, setInputValue] = useState();
    const [debouncedInputValue, setDebouncedInputValue] = useState();

    // Update debouncedInputValue after user stops typing for 1 second
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedInputValue(inputValue);
      }, 1000);
      return () => clearTimeout(timer);
    }, [inputValue]);

    // Calculate finalRepayAmount when debouncedInputValue or borrowedAmount changes
    useEffect(() => {
      if (!debouncedInputValue || !borrowedAmount || !debtAsset) {
        return;
      }

      const minAmount = humanReadableFloat(1, debtAsset.precision);

      if (debouncedInputValue > borrowedAmount) {
        setFinalRepayAmount(borrowedAmount);
        setInputValue(borrowedAmount); // Set value to maximum available amount
      } else if (debouncedInputValue < minAmount) {
        setFinalRepayAmount(minAmount);
        setInputValue(minAmount); // Set value to minimum accepted amount
      } else if (
        debouncedInputValue.toString().split(".").length > 1 &&
        debouncedInputValue.toString().split(".")[1].length > debtAsset.precision
      ) {
        const fixedValue = parseFloat(debouncedInputValue).toFixed(debtAsset.precision);
        setFinalRepayAmount(fixedValue);
        setInputValue(fixedValue); // Set value to minimum accepted amount
      } else {
        setFinalRepayAmount(debouncedInputValue);
      }
    }, [debouncedInputValue, borrowedAmount, debtAsset]);

    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2 pb-3" onClick={() => {}}>
          <CardHeader className="pb-1">
            <CardTitle>
              {t("CreditDeals:dealNo")}
              <ExternalLink
                classnamecontents="text-blue-500"
                type="text"
                text={res.id.replace("1.22.", "")}
                hyperlink={`https://blocksights.info/#/objects/${res.id}`}
              />
              {t("CreditDeals:with")}
              <ExternalLink
                classnamecontents="text-blue-500"
                type="text"
                text={type === "borrower" ? res.offer_owner : res.borrower}
                hyperlink={`https://blocksights.info/#/accounts/${
                  type === "borrower" ? res.offer_owner : res.borrower
                }`}
              />
            </CardTitle>
            <CardDescription>
              {type === "borrower" ? t("CreditDeals:borrowed") : t("CreditDeals:lent")}:
              <b>
                {` ${borrowedAmount} ${debtAsset.symbol}`} (
                <ExternalLink
                  classnamecontents="text-blue-500"
                  type="text"
                  text={res.debt_asset}
                  hyperlink={`https://blocksights.info/#/assets/${res.debt_asset}`}
                />
                )
              </b>
              <br />
              {t("CreditDeals:loanCollateral")}
              <b>
                {` ${collateralAmount} ${collateralAsset.symbol}`} (
                <ExternalLink
                  classnamecontents="text-blue-500"
                  type="text"
                  text={res.collateral_asset}
                  hyperlink={`https://blocksights.info/#/assets/${res.collateral_asset}`}
                />
                )
              </b>
              <br />
              {type === "borrower" ? t("CreditDeals:borrower") : t("CreditDeals:lender")}:
              <b>
                {` ${borrowedAmount * (res.fee_rate / 10000)} ${debtAsset.symbol} (${
                  res.fee_rate / 10000
                }%)`}
              </b>
              <br />
              {t("CreditDeals:remainingTime")}
              <b>
                {remainingTime} ({res.latest_repay_time})
              </b>
            </CardDescription>
          </CardHeader>
          {type === "borrower" ? (
            <CardFooter className="pb-0 mt-2">
              <Button onClick={() => setOpenRepay(true)}>{t("CreditDeals:repayLoan")}</Button>
              <a href={`/dex/index.html?market=${debtAsset.symbol}_${collateralAsset.symbol}`}>
                <Button className="ml-2">
                  {t("CreditDeals:trade", { symbol: debtAsset.symbol })}
                </Button>
              </a>
              {openRepay ? (
                <Dialog
                  open={openRepay}
                  onOpenChange={(open) => {
                    setOpenRepay(open);
                  }}
                >
                  <DialogContent className="sm:max-w-[900px] bg-white">
                    <DialogHeader>
                      <DialogTitle>{t("CreditDeals:dialogTitle", { id: res.id })}</DialogTitle>
                      <DialogDescription>{t("CreditDeals:description")}</DialogDescription>
                      <Form {...form}>
                        <form
                          onSubmit={() => {
                            setShowDialog(true);
                            event.preventDefault();
                          }}
                          className="gaps-5"
                        >
                          <FormField
                            control={form.control}
                            name="account"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("CreditDeals:account")}</FormLabel>
                                <FormControl>
                                  <Input
                                    disabled
                                    readOnly
                                    placeholder="Bitshares account"
                                    className="mb-3 mt-3"
                                    value={`${usr.username} (${usr.id})`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="balance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t("CreditDeals:balance", { symbol: debtAsset.symbol })}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    disabled
                                    readOnly
                                    className="mb-3 mt-3"
                                    value={`${debtAssetBalance} ${debtAsset.symbol}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="repayAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="col-span-1">
                                      {t("CreditDeals:repayAmount", { symbol: debtAsset.symbol })}
                                    </div>
                                    <div className="col-span-1 text-right">
                                      {t("CreditDeals:remainingDebt", {
                                        amount: borrowedAmount,
                                        symbol: debtAsset.symbol,
                                      })}
                                    </div>
                                  </div>
                                </FormLabel>
                                <FormDescription>{t("CreditDeals:repayDesc")}</FormDescription>
                                <FormControl
                                  onChange={(event) => {
                                    const input = event.target.value;
                                    const regex = /^[0-9]*\.?[0-9]*$/;
                                    if (regex.test(input)) {
                                      setInputValue(input);
                                    }
                                  }}
                                >
                                  <Input
                                    label={t("CreditDeals:repayAmount", {
                                      symbol: debtAsset.symbol,
                                    })}
                                    className="mb-3"
                                    value={inputValue ?? ""}
                                    placeholder={borrowedAmount}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="collateralRedemtionAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="col-span-1">
                                      {t("CreditDeals:redeemCollateral")}
                                    </div>
                                    <div className="col-span-1 text-right">
                                      {t("CreditDeals:remainingCollateral", {
                                        amount: collateralAmount,
                                        symbol: collateralAsset.symbol,
                                      })}
                                    </div>
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  {t("CreditDeals:collateralRedemption", {
                                    symbol: collateralAsset.symbol,
                                  })}
                                </FormDescription>
                                <FormControl>
                                  <Input
                                    label={t("CreditDeals:repayAmount", {
                                      symbol: debtAsset.symbol,
                                    })}
                                    value={
                                      redeemCollateral && collateralAmount
                                        ? `${redeemCollateral ?? "?"} ${collateralAsset.symbol} (${(
                                            (redeemCollateral / collateralAmount) *
                                            100
                                          ).toFixed(2)}%)`
                                        : "0"
                                    }
                                    disabled
                                    readOnly
                                    className="mb-3"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {finalRepayAmount ? (
                            <FormField
                              control={form.control}
                              name="loanFee"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    <div className="mt-2">{t("CreditDeals:loanLabel")}</div>
                                  </FormLabel>
                                  <FormDescription>{t("CreditDeals:loanDesc")}</FormDescription>
                                  <FormControl>
                                    <Input
                                      disabled
                                      placeholder="0"
                                      className="mb-3 mt-3"
                                      value={`${loanFee} (${debtAsset.symbol}) (${
                                        res.fee_rate / 10000
                                      }% fee)`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : null}

                          {finalRepayAmount ? (
                            <FormField
                              control={form.control}
                              name="finalRepayment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    <div className="mt-2">{t("CreditDeals:finalPaymentLabel")}</div>
                                  </FormLabel>
                                  <FormDescription>
                                    {t("CreditDeals:finalPaymentDesc", {
                                      symbol: collateralAsset.symbol,
                                    })}
                                  </FormDescription>
                                  <FormControl>
                                    <Input
                                      disabled
                                      placeholder="0"
                                      className="mb-3 mt-3"
                                      value={`${finalRepayment} (${debtAsset.symbol}) (debt + ${
                                        res.fee_rate / 10000
                                      }% fee)`}
                                    />
                                  </FormControl>
                                  {debtAssetBalance < finalRepayment ? (
                                    <FormMessage>
                                      {t("CreditDeals:finalPaymentWarning", {
                                        symbol: debtAsset.symbol,
                                      })}
                                    </FormMessage>
                                  ) : null}
                                </FormItem>
                              )}
                            />
                          ) : null}

                          <FormField
                            control={form.control}
                            name="networkFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <div className="mt-2">{t("CreditDeals:networkFee")}</div>
                                </FormLabel>
                                <FormDescription>{t("CreditDeals:networkFeeDesc")}</FormDescription>
                                <FormControl>
                                  <Input
                                    disabled
                                    placeholder={`${fee} BTS`}
                                    className="mb-3 mt-3"
                                  />
                                </FormControl>
                                {usr.id === usr.referrer ? (
                                  <FormMessage>
                                    {t("CreditDeals:rebate", {
                                      fee: fee * 0.8,
                                      chain: usr.chain === "bitshares" ? "BTS" : "TEST",
                                    })}
                                  </FormMessage>
                                ) : null}
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {!redeemCollateral ||
                          !finalRepayAmount ||
                          debtAssetBalance < finalRepayment ? (
                            <Button className="mt-5 mb-3" variant="outline" disabled type="submit">
                              {t("CreditDeals:submit")}
                            </Button>
                          ) : (
                            <Button className="mt-5 mb-3" variant="outline" type="submit">
                              {t("CreditDeals:submit")}
                            </Button>
                          )}
                        </form>
                      </Form>
                      {showDialog ? (
                        <DeepLinkDialog
                          operationName="credit_deal_repay"
                          username={usr.username}
                          usrChain={usr.chain}
                          userID={usr.id}
                          dismissCallback={setShowDialog}
                          key={`Repaying${finalRepayAmount}${debtAsset.symbol}toclaimback${collateralAsset.symbol}`}
                          headerText={t("CreditDeals:deepLink", {
                            finalRepayAmount: finalRepayAmount,
                            debtAsset: debtAsset.symbol,
                            collateralAsset: collateralAsset.symbol,
                          })}
                          trxJSON={[
                            {
                              account: usr.id,
                              deal_id: res.id,
                              repay_amount: {
                                amount: blockchainFloat(finalRepayAmount, debtAsset.precision),
                                asset_id: debtAsset.id,
                              },
                              credit_fee: {
                                amount: blockchainFloat(loanFee, debtAsset.precision),
                                asset_id: debtAsset.id,
                              },
                              extensions: [],
                            },
                          ]}
                        />
                      ) : null}
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              ) : null}
            </CardFooter>
          ) : null}
        </Card>
      </div>
    );
  }

  const BorrowerRow = ({ index, style }) => {
    let res = borrowerDeals[index];

    if (!res) {
      return null;
    }

    return <CommonRow style={style} res={res} type="borrower" />;
  };

  const OwnerRow = ({ index, style }) => {
    let res = lenderDeals[index];

    if (!res) {
      return null;
    }

    return <CommonRow style={style} res={res} type="lender" />;
  };

  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

  const [activeTab, setActiveTab] = useState("borrowings");

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("CreditDeals:card.title")}</CardTitle>
              <CardDescription>{t("CreditDeals:card.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="borrowings" className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-2">
                  {activeTab === "borrowings" ? (
                    <TabsTrigger value="borrowings" style={activeTabStyle}>
                      {t("CreditDeals:card.viewingBorrowings")}
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger value="borrowings" onClick={() => setActiveTab("borrowings")}>
                      {t("CreditDeals:card.viewBorrowings")}
                    </TabsTrigger>
                  )}
                  {activeTab === "lendings" ? (
                    <TabsTrigger value="lendings" style={activeTabStyle}>
                      {t("CreditDeals:card.viewingLendings")}
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger value="lendings" onClick={() => setActiveTab("lendings")}>
                      {t("CreditDeals:card.viewLendings")}
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="borrowings">
                  {borrowerDeals &&
                  borrowerDeals.length ? (
                    <List
                      height={500}
                      itemCount={borrowerDeals.length}
                      itemSize={225}
                      className="w-full"
                    >
                      {BorrowerRow}
                    </List>
                  ) : null}
                  {borrowerDeals &&
                  !borrowerDeals.length
                    ? t("CreditDeals:card.noBorrowers")
                    : null}
                  {!borrowerDeals
                    ? t("CreditDeals:card.loading")
                    : null}
                </TabsContent>
                <TabsContent value="lendings">
                  {lenderDeals &&
                  lenderDeals.length ? (
                    <List
                      height={500}
                      itemCount={lenderDeals.length}
                      itemSize={165}
                      className="w-full"
                    >
                      {OwnerRow}
                    </List>
                  ) : null}
                  {lenderDeals && !lenderDeals.length
                    ? t("CreditDeals:card.noLendings")
                    : null}
                  {!lenderDeals
                    ? t("CreditDeals:card.loading")
                    : null}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-3 mt-5">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>
                {activeTab === "borrowings"
                  ? t("CreditDeals:risks.borrowerTitle")
                  : t("CreditDeals:risks.lenderTitle")}
              </CardTitle>
              <CardDescription>{t("CreditDeals:risks.description")}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                {activeTab === "borrowings" ? (
                  <li>{t("CreditDeals:risks.borrower.risk1", { username: usr?.username })}</li>
                ) : (
                  <li>{t("CreditDeals:risks.lender.risk1", { username: usr?.username })}</li>
                )}
                {activeTab === "borrowings" ? (
                  <li>{t("CreditDeals:risks.borrower.risk2")}</li>
                ) : (
                  <li>{t("CreditDeals:risks.lender.risk2")}</li>
                )}
                {activeTab === "lendings" ? (
                  <li>{t("CreditDeals:risks.lender.risk3", { username: usr?.username })}</li>
                ) : null}
                {activeTab === "borrowings" ? (
                  <li>{t("CreditDeals:risks.borrower.risk3")}</li>
                ) : (
                  <li>{t("CreditDeals:risks.lender.risk4")}</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
