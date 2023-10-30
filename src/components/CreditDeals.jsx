import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { FixedSizeList as List } from "react-window";
import { useForm } from "react-hook-form";

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

import { $currentUser } from "../stores/users.ts";
import { $globalParamsCache, $assetCache } from "../stores/cache.ts";

import { useInitCache } from "../effects/Init.ts";
import {
  createUserCreditDealsStore,
  createUserBalancesStore,
} from "../effects/User.ts";

import { blockchainFloat, humanReadableFloat } from "../lib/common.js";

import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

export default function CreditDeals(properties) {
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const assets = useSyncExternalStore(
    $assetCache.subscribe,
    $assetCache.get,
    () => true
  );

  const globalParams = useSyncExternalStore(
    $globalParamsCache.subscribe,
    $globalParamsCache.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", [
    "assets",
    "globalParams",
  ]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 73);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            setUsrBalances(data);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr]);

  const [usrCreditDeals, setUsrCreditDeals] = useState(); // { borrowerDeals, ownerDeals, }
  useEffect(() => {
    let unsubscribeUserCreditDeals;

    if (usr && usr.id) {
      const userCreditDealsStore = createUserCreditDealsStore([
        usr.chain,
        usr.id,
      ]);

      unsubscribeUserCreditDeals = userCreditDealsStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            setUsrCreditDeals(data);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserCreditDeals) unsubscribeUserCreditDeals();
    };
  }, [usr]);

  function CommonRow({ style, res, type }) {
    const debtAsset = assets.find((x) => x.id === res.debt_asset);
    const collateralAsset = assets.find((x) => x.id === res.collateral_asset);

    const borrowedAmount = humanReadableFloat(
      res.debt_amount,
      debtAsset.precision
    );

    const collateralAmount = humanReadableFloat(
      res.collateral_amount,
      collateralAsset.precision
    );

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
      const hours =
        parseFloat(`0.${(diffInHours / 24).toString().split(".")[1]}`) * 24;
      const minutes = parseFloat(`0.${hours.toString().split(".")[1]}`) * 60;
      remainingTime = ` ${days} days ${hours.toFixed(
        0
      )} hours ${minutes.toFixed(0)} mins`;
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
        return ((finalRepayAmount / 100) * (res.fee_rate / 10000)).toFixed(
          debtAsset.precision
        );
      }
      return 0;
    }, [finalRepayAmount, res, debtAsset]);

    const finalRepayment = useMemo(() => {
      if (finalRepayAmount && loanFee && debtAsset) {
        return (parseFloat(finalRepayAmount) + parseFloat(loanFee)).toFixed(
          debtAsset.precision
        );
      }
      return 0;
    }, [finalRepayAmount, loanFee, debtAsset]);

    const debtAssetBalance = useMemo(() => {
      if (usrBalances && usrBalances.length && debtAsset) {
        const foundBalance = usrBalances.find(
          (x) => x.asset_id === debtAsset.id
        );
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
        debouncedInputValue.toString().split(".")[1].length >
          debtAsset.precision
      ) {
        const fixedValue = parseFloat(debouncedInputValue).toFixed(
          debtAsset.precision
        );
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
              Deal #
              <ExternalLink
                classNameContents="text-blue-500"
                type="text"
                text={res.id.replace("1.22.", "")}
                hyperlink={`https://blocksights.info/#/objects/${res.id}`}
              />{" "}
              with{" "}
              <ExternalLink
                classNameContents="text-blue-500"
                type="text"
                text={type === "borrower" ? res.offer_owner : res.borrower}
                hyperlink={`https://blocksights.info/#/accounts/${
                  type === "borrower" ? res.offer_owner : res.borrower
                }`}
              />
            </CardTitle>
            <CardDescription>
              {type === "borrower" ? "You borrowed" : "They borrowed"}:
              <b>
                {` ${borrowedAmount} ${debtAsset.symbol}`} (
                <ExternalLink
                  classNameContents="text-blue-500"
                  type="text"
                  text={res.debt_asset}
                  hyperlink={`https://blocksights.info/#/assets/${res.debt_asset}`}
                />
                )
              </b>
              <br />
              Loan collateral:
              <b>
                {` ${collateralAmount} ${collateralAsset.symbol}`} (
                <ExternalLink
                  classNameContents="text-blue-500"
                  type="text"
                  text={res.collateral_asset}
                  hyperlink={`https://blocksights.info/#/assets/${res.collateral_asset}`}
                />
                )
              </b>
              <br />
              {type === "borrower" ? "Borrow fee" : "Earnings"}:
              <b>
                {` ${borrowedAmount * (res.fee_rate / 10000)} ${
                  debtAsset.symbol
                } (${res.fee_rate / 10000}%)`}
              </b>
              <br />
              Remaining time:
              <b>
                {remainingTime} ({res.latest_repay_time})
              </b>
            </CardDescription>
          </CardHeader>
          {type === "borrower" ? (
            <CardFooter className="pb-0 mt-2">
              <Button onClick={() => setOpenRepay(true)}>Repay loan</Button>
              <a
                href={`/dex/index.html?market=${debtAsset.symbol}_${collateralAsset.symbol}`}
              >
                <Button className="ml-2">
                  Trade {debtAsset.symbol} on DEX
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
                      <DialogTitle>Repaying loan #{res.id}</DialogTitle>
                      <DialogDescription>
                        Use this form to control your credit deal repayments.
                      </DialogDescription>
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
                                <FormLabel>Account</FormLabel>
                                <FormControl>
                                  <Input
                                    disabled
                                    readOnly
                                    placeholder="Bitshares account (1.2.x)"
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
                                  Your current {debtAsset.symbol} balance
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
                                      {`Amount of ${debtAsset.symbol} to repay`}
                                    </div>
                                    <div className="col-span-1 text-right">
                                      {`Remaining debt: ${borrowedAmount} ${debtAsset.symbol}`}
                                    </div>
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  To get back all your collateral back, repay
                                  the debt in full.
                                </FormDescription>
                                <FormControl
                                  onChange={(event) => {
                                    const input = event.target.value;
                                    const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                                    if (regex.test(input)) {
                                      setInputValue(input);
                                    }
                                  }}
                                >
                                  <Input
                                    label={`Amount of ${debtAsset.symbol} to repay`}
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
                                      Redeem collateral
                                    </div>
                                    <div className="col-span-1 text-right">
                                      {`Remaining collateral: ${collateralAmount} ${collateralAsset.symbol}`}
                                    </div>
                                  </div>
                                </FormLabel>
                                <FormDescription>{`Amount of ${collateralAsset.symbol} backing collateral you'll redeem`}</FormDescription>
                                <FormControl>
                                  <Input
                                    label={`Amount of ${debtAsset.symbol} to repay`}
                                    value={
                                      redeemCollateral && collateralAmount
                                        ? `${redeemCollateral ?? "?"} ${
                                            collateralAsset.symbol
                                          } (${(
                                            (redeemCollateral /
                                              collateralAmount) *
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
                                    <div className="mt-2">
                                      Estimated loan fee
                                    </div>
                                  </FormLabel>
                                  <FormDescription>
                                    This is the fee you'll pay to the lender.
                                  </FormDescription>
                                  <FormControl>
                                    <Input
                                      disabled
                                      placeholder="0"
                                      className="mb-3 mt-3"
                                      value={`${loanFee} (${
                                        debtAsset.symbol
                                      }) (${res.fee_rate / 10000}% fee)`}
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
                                    <div className="mt-2">Final repayment</div>
                                  </FormLabel>
                                  <FormDescription>
                                    Once repaid in full, your{" "}
                                    {collateralAsset.symbol} collateral will be
                                    returned to you.
                                  </FormDescription>
                                  <FormControl>
                                    <Input
                                      disabled
                                      placeholder="0"
                                      className="mb-3 mt-3"
                                      value={`${finalRepayment} (${
                                        debtAsset.symbol
                                      }) (debt + ${res.fee_rate / 10000}% fee)`}
                                    />
                                  </FormControl>
                                  {debtAssetBalance < finalRepayment ? (
                                    <FormMessage>
                                      Insufficient {debtAsset.symbol} balance
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
                                  <div className="mt-2">Network fee</div>
                                </FormLabel>
                                <FormDescription>
                                  This is the fee to broadcast your credit deal
                                  repayment operation onto the blockchain.
                                </FormDescription>
                                <FormControl>
                                  <Input
                                    disabled
                                    placeholder={`${fee} BTS`}
                                    className="mb-3 mt-3"
                                  />
                                </FormControl>
                                {usr.id === usr.referrer ? (
                                  <FormMessage>
                                    Rebate: {fee * 0.8} BTS (vesting)
                                  </FormMessage>
                                ) : null}
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {!redeemCollateral ||
                          !finalRepayAmount ||
                          debtAssetBalance < finalRepayment ? (
                            <Button
                              className="mt-5 mb-3"
                              variant="outline"
                              disabled
                              type="submit"
                            >
                              Submit
                            </Button>
                          ) : (
                            <Button
                              className="mt-5 mb-3"
                              variant="outline"
                              type="submit"
                            >
                              Submit
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
                          headerText={`Repaying ${finalRepayAmount} ${debtAsset.symbol}, to claim back ${collateralAsset.symbol}`}
                          trxJSON={[
                            {
                              account: usr.id,
                              deal_id: res.id,
                              repay_amount: {
                                amount: blockchainFloat(
                                  finalRepayAmount,
                                  debtAsset.precision
                                ),
                                asset_id: debtAsset.id,
                              },
                              credit_fee: {
                                amount: blockchainFloat(
                                  loanFee,
                                  debtAsset.precision
                                ),
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
    let res = usrCreditDeals.borrowerDeals[index];

    if (!res) {
      return null;
    }

    return <CommonRow style={style} res={res} type="borrower" />;
  };

  const OwnerRow = ({ index, style }) => {
    let res = usrCreditDeals.ownerDeals[index];

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
              <CardTitle>💱 Check your active credit deals</CardTitle>
              <CardDescription>
                From here you can both monitor active credit deals and manage
                repayments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="borrowings" className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-2">
                  {activeTab === "borrowings" ? (
                    <TabsTrigger value="borrowings" style={activeTabStyle}>
                      Viewing your borrowings
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger
                      value="borrowings"
                      onClick={() => setActiveTab("borrowings")}
                    >
                      View your borrowings
                    </TabsTrigger>
                  )}
                  {activeTab === "lendings" ? (
                    <TabsTrigger value="lendings" style={activeTabStyle}>
                      Viewing your lendings
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger
                      value="lendings"
                      onClick={() => setActiveTab("lendings")}
                    >
                      View your lendings
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="borrowings">
                  {usrCreditDeals &&
                  usrCreditDeals.borrowerDeals &&
                  usrCreditDeals.borrowerDeals.length ? (
                    <List
                      height={500}
                      itemCount={usrCreditDeals.borrowerDeals.length}
                      itemSize={225}
                      className="w-full"
                    >
                      {BorrowerRow}
                    </List>
                  ) : null}
                  {usrCreditDeals &&
                  usrCreditDeals.borrowerDeals &&
                  !usrCreditDeals.borrowerDeals.length
                    ? "No active borrowings found"
                    : null}
                  {!usrCreditDeals || !usrCreditDeals.borrowerDeals
                    ? "Loading..."
                    : null}
                </TabsContent>
                <TabsContent value="lendings">
                  {usrCreditDeals &&
                  usrCreditDeals.ownerDeals &&
                  usrCreditDeals.ownerDeals.length ? (
                    <List
                      height={500}
                      itemCount={usrCreditDeals.ownerDeals.length}
                      itemSize={165}
                      className="w-full"
                    >
                      {OwnerRow}
                    </List>
                  ) : null}
                  {usrCreditDeals &&
                  usrCreditDeals.ownerDeals &&
                  !usrCreditDeals.ownerDeals.length
                    ? "No active lendings found"
                    : null}
                  {!usrCreditDeals || !usrCreditDeals.ownerDeals
                    ? "Loading..."
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
                  ? `Borrower Risk Warning`
                  : `Lender Risk Warning`}
              </CardTitle>
              <CardDescription>
                Important information about your responsibilities and risks
                associated with credit deals.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
                {activeTab === "borrowings" ? (
                  <li>
                    You ( <b>{usr?.username}</b> ) are responsible for managing
                    your credit deals and repaying them in a timely manner,
                    noone else. Consider using an automatic repayment method to
                    avoid missing the repayment deadline if you might forget the
                    deadline.
                  </li>
                ) : (
                  <li>
                    You ( <b>{usr?.username}</b> ) are responsible for managing
                    your credit offers, their parameters and their risk
                    exposure, noone else. Consider creating automated scripts to
                    manage the state of your credit offers.
                  </li>
                )}
                {activeTab === "borrowings" ? (
                  <li>
                    Be aware of your exposure to external volatilities during
                    the credit deal repay period; the value of your borrowed
                    assets and your backing collateral will fluctuate, you
                    should consider such volatility exposure when deciding on
                    how/when you'll repay the credit deal.
                  </li>
                ) : (
                  <li>
                    Be aware of your exposure to external volatilities during
                    the credit deal repay period; the value of the assets you
                    lended to other users and the backing collateral they
                    provided will fluctuate, you should consider your personal
                    risk tollerance when deciding on your credit offer
                    parameters. You should actively manage your credit offers as
                    markets fluctuate to minimize your risk exposure.
                  </li>
                )}
                {activeTab === "lendings" ? (
                  <li>
                    As a lender, once a credit deal exists, you ({" "}
                    {usr?.username} ) cannot cancel it, the borrower is
                    responsible for the duration of the deal within the
                    repayment period. A credit deal's repayment date can also
                    exceed your credit offer's expiration date.
                  </li>
                ) : null}
                {activeTab === "borrowings" ? (
                  <li>
                    Failure to repay a credit deal will result in the loss of
                    remaining backing collateral assets. There isn't a credit
                    score system which punishes defaulting borrowers; the agreed
                    terms of the credit deal will be honoured.
                  </li>
                ) : (
                  <li>
                    If borrowers fail to repay their credit deals, their backing
                    collateral assets will be forfeit to you. There isn't a
                    credit score system which punishes borrowers for defaulting;
                    the agreed terms of the credit deal will always be honoured,
                    so plan your credit offers accordingly to your personal risk
                    tollerance.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? (
            <CurrentUser usr={usr} />
          ) : null}
        </div>
      </div>
    </>
  );
}
