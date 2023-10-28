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
import { createUserCreditDealsStore } from "../effects/User.ts";

import { blockchainFloat, humanReadableFloat } from "../lib/common.js";

import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

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

  useInitCache(usr && usr.chain ? usr.chain : "bitshares");

  const globalParams = useSyncExternalStore(
    $globalParamsCache.subscribe,
    $globalParamsCache.get,
    () => true
  );

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.parameters) {
      const foundFee = globalParams.find((x) => x[0] === 73);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

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

    const [repayAmount, setRepayAmount] = useState(borrowedAmount ?? 0);
    const redeemCollateral = useMemo(() => {
      if (repayAmount && borrowedAmount && collateralAmount) {
        return (repayAmount / borrowedAmount) * collateralAmount;
      }
    }, [repayAmount, borrowedAmount, collateralAmount]);

    const loanFee = useMemo(() => {
      if (repayAmount && res && debtAsset) {
        return ((repayAmount / 100) * (res.fee_rate / 10000)).toFixed(
          debtAsset.precision
        );
      }
      return 0;
    }, [repayAmount, res, debtAsset]);

    const finalRepayment = useMemo(() => {
      if (repayAmount && loanFee && debtAsset) {
        return (parseFloat(repayAmount) + parseFloat(loanFee)).toFixed(
          debtAsset.precision
        );
      }
      return 0;
    }, [repayAmount, loanFee, debtAsset]);

    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2 pb-3" onClick={() => {}}>
          <CardHeader className="pb-1">
            <CardTitle>
              Deal #
              <a
                target="_blank"
                className="text-blue-500"
                href={`https://blocksights.info/#/objects/${res.id}`}
              >
                {res.id.replace("1.22.", "")}
              </a>{" "}
              with{" "}
              <a
                target="_blank"
                className="text-blue-500"
                href={`https://blocksights.info/#/accounts/${
                  type === "borrower" ? res.offer_owner : res.borrower
                }`}
              >
                {type === "borrower" ? res.offer_owner : res.borrower}
              </a>
            </CardTitle>
            <CardDescription>
              {type === "borrower" ? "You borrowed" : "They borrowed"}:
              <b>
                {` ${borrowedAmount} ${debtAsset.symbol}`} (
                <a
                  target="_blank"
                  className="text-blue-500"
                  href={`https://blocksights.info/#/assets/${res.debt_asset}`}
                >
                  {res.debt_asset}
                </a>
                )
              </b>
              <br />
              Loan collateral:
              <b>
                {` ${collateralAmount} ${collateralAsset.symbol}`} (
                <a
                  target="_blank"
                  className="text-blue-500"
                  href={`https://blocksights.info/#/assets/${res.collateral_asset}`}
                >
                  {res.collateral_asset}
                </a>
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
                      <DialogDescription>test</DialogDescription>
                      Remaining debt: {borrowedAmount} {debtAsset.symbol}
                      <br />
                      Remaining collateral: {collateralAmount}{" "}
                      {collateralAsset.symbol}
                      <br />
                      <Form {...form}>
                        <form
                          onSubmit={() => {
                            setShowDialog(true);
                            event.preventDefault();
                          }}
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
                            name="repayAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{`Amount of ${debtAsset.symbol} to repay`}</FormLabel>
                                <FormControl
                                  onChange={(event) => {
                                    const input = event.target.value;
                                    const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                                    if (regex.test(input)) {
                                      setRepayAmount(input);
                                    }
                                  }}
                                >
                                  <Input
                                    label={`Amount of ${debtAsset.symbol} to repay`}
                                    value={repayAmount}
                                    placeholder={repayAmount}
                                    className="mb-3"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {repayAmount ? (
                            <FormField
                              control={form.control}
                              name="loanFee"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Estimated loan fee</FormLabel>
                                  <FormControl>
                                    <Input
                                      disabled
                                      placeholder="0"
                                      className="mb-3 mt-3"
                                      value={`${loanFee} (${
                                        debtAsset.symbol
                                      }) (${res.fee_rate / 10000}% fee) (${
                                        res.fee_rate
                                      })`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : null}

                          {repayAmount ? (
                            <FormField
                              control={form.control}
                              name="finalRepayment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Final repayment</FormLabel>
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
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : null}

                          <FormField
                            control={form.control}
                            name="networkFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Network fee</FormLabel>
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

                          {redeemCollateral ? (
                            <>
                              <FormField
                                control={form.control}
                                name="collateralRedemtionAmount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Redeem collateral</FormLabel>
                                    <FormDescription>{`Amount of ${collateralAsset.symbol} backing collateral you'll redeem`}</FormDescription>
                                    <FormControl>{`${redeemCollateral ?? "?"} ${
                                      collateralAsset.symbol
                                    }`}</FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          ) : null}

                          {!redeemCollateral || !repayAmount ? (
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
                          key={`Repaying${repayAmount}${debtAsset.symbol}toclaimback${collateralAsset.symbol}`}
                          headerText={`Repaying ${repayAmount} ${debtAsset.symbol}, to claim back ${collateralAsset.symbol}`}
                          trxJSON={[
                            {
                              account: usr.id,
                              deal_id: res.id,
                              repay_amount: {
                                amount: blockchainFloat(
                                  repayAmount,
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
                Avoid missing deadlines, keep on top of your credit deals.
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
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? (
            <CurrentUser usr={usr} />
          ) : null}
        </div>
      </div>
    </>
  );
}
