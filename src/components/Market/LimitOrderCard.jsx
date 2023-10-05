import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  copyToClipboard,
  trimPrice,
  humanReadableFloat,
  blockchainFloat,
} from "@/lib/common.js";
import { opTypes } from "@/lib/opTypes";

/**
 * Creating a market card component for buy and sell limit orders
 */
export default function LimitOrderCard(properties) {
  const {
    usr,
    thisAssetA,
    thisAssetB,
    assetAData,
    assetBData,
    orderType,
    marketSearch,
    usrBalances,
  } = properties;

  const { buyOrders, sellOrders } = properties;

  const [amount, setAmount] = useState(0.0);
  const [price, setPrice] = useState(0.0);
  const [total, setTotal] = useState(0);
  const [marketFees, setMarketFees] = useState(0.0);

  useEffect(() => {
    if (amount && price && total) {
      if (
        orderType === "buy" &&
        assetAData &&
        assetAData.market_fee_percent &&
        assetAData.market_fee_percent > 0
      ) {
        const calculatedMarketFee =
          parseFloat(amount) * (assetAData.market_fee_percent / 100);
        setMarketFees(calculatedMarketFee.toFixed(assetAData.precision));
      }

      if (
        orderType === "sell" &&
        assetBData &&
        assetBData.market_fee_percent &&
        assetBData.market_fee_percent > 0
      ) {
        const calculatedMarketFee =
          parseFloat(total) * (assetBData.market_fee_percent / 100);
        setMarketFees(calculatedMarketFee.toFixed(assetBData.precision));
      }
    }
  }, [amount, price, total]);

  const [expiryType, setExpiryType] = useState("1hr");
  const [expiry, setExpiry] = useState(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });

  const [date, setDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ); // Solely for the calendar component to display a date string

  useEffect(() => {
    if (expiryType === "specific" && date) {
      setExpiry(date);
    }
  }, [expiryType, date]);

  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const [deeplink, setDeeplink] = useState("");
  const [trxJSON, setTRXJSON] = useState();
  const [deepLinkInProgress, setDeepLinkInProgress] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [data, setData] = useState(false);
  useEffect(() => {
    if (data) {
      /**
       * Generates a deeplink for the pool exchange operation
       */
      async function generate() {
        setDeepLinkInProgress(true);

        var opExpiry = new Date();
        opExpiry.setMinutes(opExpiry.getMinutes() + 60); // TODO: make this configurable

        const opJSON =
          orderType === "buy"
            ? [
                {
                  seller: usr.id,
                  amount_to_sell: {
                    amount: blockchainFloat(
                      total,
                      assetBData.precision
                    ).toFixed(0),
                    asset_id: marketSearch.find(
                      (asset) => asset.s === thisAssetB
                    ).id,
                  },
                  min_to_receive: {
                    amount: blockchainFloat(
                      amount,
                      assetAData.precision
                    ).toFixed(0),
                    asset_id: marketSearch.find(
                      (asset) => asset.s === thisAssetA
                    ).id,
                  },
                  expiration: expiry,
                  fill_or_kill: false,
                  extensions: [],
                },
              ]
            : [
                {
                  seller: usr.id,
                  amount_to_sell: {
                    amount: blockchainFloat(
                      amount,
                      assetAData.precision
                    ).toFixed(0),
                    asset_id: marketSearch.find(
                      (asset) => asset.s === thisAssetA
                    ).id,
                  },
                  min_to_receive: {
                    amount: blockchainFloat(
                      total,
                      assetBData.precision
                    ).toFixed(0),
                    asset_id: marketSearch.find(
                      (asset) => asset.s === thisAssetB
                    ).id,
                  },
                  expiration: expiry,
                  fill_or_kill: false,
                  extensions: [],
                },
              ];

        setTRXJSON(opJSON);

        const response = await fetch(
          `http://localhost:8080/api/deeplink/${usr.chain}/limit_order_create`,
          {
            method: "POST",
            body: JSON.stringify(opJSON),
          }
        );

        if (!response.ok) {
          console.log("Failed to generate deeplink");
          return;
        }

        const deeplinkValue = await response.json();

        if (
          deeplinkValue &&
          deeplinkValue.result &&
          deeplinkValue.result.generatedDeepLink
        ) {
          setDeeplink(deeplinkValue.result.generatedDeepLink);
        }
        setDeepLinkInProgress(false);
      }

      if (marketSearch) {
        generate();
      }
    }
  }, [data, thisAssetA, thisAssetB, marketSearch]);

  const [downloadClicked, setDownloadClicked] = useState(false);
  const handleDownloadClick = () => {
    if (!downloadClicked) {
      setDownloadClicked(true);
      setTimeout(() => {
        setDownloadClicked(false);
      }, 10000);
    }
  };

  const [assetABalance, setAssetABalance] = useState(0);
  const [assetBBalance, setAssetBBalance] = useState(0);
  useEffect(() => {
    function getReadableBalance(assetData) {
      const id = assetData.id;
      const foundBalance = usrBalances.find((x) => x.asset_id === id);
      return foundBalance
        ? humanReadableFloat(
            foundBalance.amount,
            assetData.precision
          ).toLocaleString(undefined, {
            minimumFractionDigits: assetData.precision,
          })
        : 0;
    }

    if (assetAData && usrBalances) {
      const aBalance = getReadableBalance(assetAData);
      setAssetABalance(aBalance);
    }

    if (assetBData && usrBalances) {
      const bBalance = getReadableBalance(assetBData);
      setAssetBBalance(bBalance);
    }
  }, [assetAData, assetBData, usrBalances]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>
          {orderType === "buy"
            ? `Buying ${thisAssetA} with ${thisAssetB}`
            : `Selling ${thisAssetA} for ${thisAssetB}`}
        </CardTitle>
        <CardDescription>
          Use this form to create a limit order operation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {thisAssetA &&
        thisAssetB &&
        marketSearch &&
        assetAData &&
        assetBData ? (
          <Form {...form}>
            <form
              onSubmit={(event) => {
                setData(true);
                setShowDialog(true);
                event.preventDefault();
              }}
            >
              <FormField
                control={form.control}
                name="sellPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="grid grid-cols-2 mt-3">
                        <div className="mt-1">Price</div>
                        <div className="text-gray-500 text-right">
                          {(orderType === "buy" && !sellOrders) ||
                          (sellOrders && !sellOrders.length) ||
                          (orderType === "sell" && !buyOrders) ||
                          (buyOrders && !buyOrders.length) ? (
                            <Badge disabled>
                              {orderType === "buy"
                                ? `Use lowest ask`
                                : `Use highest bid`}
                            </Badge>
                          ) : (
                            <span
                              variant="link"
                              onClick={(event) => {
                                event.preventDefault();
                                let finalPrice;
                                if (
                                  orderType === "buy" &&
                                  sellOrders &&
                                  sellOrders.length > 0
                                ) {
                                  finalPrice = trimPrice(
                                    sellOrders[0].price,
                                    assetBData.precision
                                  );
                                } else if (
                                  orderType === "sell" &&
                                  buyOrders &&
                                  buyOrders.length > 0
                                ) {
                                  finalPrice = trimPrice(
                                    buyOrders[0].price,
                                    assetBData.precision
                                  );
                                }

                                if (finalPrice) {
                                  setPrice(
                                    parseFloat(finalPrice).toFixed(
                                      orderType === "buy"
                                        ? assetBData.precision
                                        : assetAData.precision
                                    )
                                  );

                                  if (amount) {
                                    setTotal(
                                      (
                                        parseFloat(finalPrice) *
                                        parseFloat(amount)
                                      ).toFixed(assetBData.precision)
                                    );
                                  }
                                }
                              }}
                            >
                              <Badge>
                                {orderType === "buy"
                                  ? `Use lowest ask`
                                  : `Use highest bid`}
                              </Badge>
                            </span>
                          )}
                        </div>
                      </div>
                    </FormLabel>
                    <FormControl
                      onChange={(event) => {
                        const input = event.target.value;
                        const regex = /^[0-9,]*\.?[0-9]*$/;
                        if (regex.test(input)) {
                          const parsedInput = parseFloat(
                            input.replaceAll(",", "")
                          );
                          if (parsedInput) {
                            setPrice(
                              parsedInput.toFixed(
                                orderType === "buy"
                                  ? assetBData.precision
                                  : assetAData.precision
                              )
                            );
                            if (amount) {
                              setTotal(
                                (parsedInput * amount).toFixed(
                                  orderType === "buy"
                                    ? assetBData.precision
                                    : assetAData.precision
                                )
                              );
                            }
                          }
                        }
                      }}
                    >
                      <Input
                        value={price}
                        placeholder={price}
                        className="mb-3"
                      />
                    </FormControl>
                    <FormDescription>
                      {orderType === "buy"
                        ? `Your price per ${thisAssetA} in ${thisAssetB}`
                        : `Your price per ${thisAssetB} in ${thisAssetA}`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="grid grid-cols-2 mt-3">
                        <div className="mt-1">Amount</div>
                        <div className="text-gray-500 text-right">
                          {orderType === "sell" && assetABalance ? (
                            <Badge
                              onClick={() => {
                                let parsedAmount = parseFloat(
                                  assetABalance.replaceAll(",", "")
                                );
                                if (parsedAmount) {
                                  setAmount(
                                    parsedAmount.toFixed(assetAData.precision)
                                  );
                                  if (price) {
                                    setTotal(
                                      (parsedAmount * price).toFixed(
                                        assetBData.precision
                                      )
                                    );
                                  }
                                }
                              }}
                            >
                              Use balance
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </FormLabel>
                    <FormControl
                      onChange={(event) => {
                        const input = event.target.value;
                        const regex = /^[0-9,]*\.?[0-9]*$/;
                        if (regex.test(input)) {
                          const parsedInput = parseFloat(
                            input.replaceAll(",", "")
                          );
                          if (parsedInput) {
                            setAmount(
                              parsedInput.toFixed(assetAData.precision)
                            );

                            if (price) {
                              setTotal(
                                (parsedInput * price).toFixed(
                                  assetBData.precision
                                )
                              );
                            }
                          }
                        }
                      }}
                    >
                      <Input
                        value={amount}
                        placeholder={amount}
                        className="mb-3"
                      />
                    </FormControl>
                    <FormDescription>
                      {orderType === "buy"
                        ? `The amount of ${thisAssetA} you want to buy`
                        : `The amount of ${thisAssetA} you will have to spend`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="grid grid-cols-2 mt-3">
                        <div className="mt-1">Total</div>
                        <div className="text-gray-500 text-right">
                          {orderType === "buy" && assetBBalance ? (
                            <Badge
                              onClick={() => {
                                let parsedAmount = parseFloat(
                                  assetBBalance.replaceAll(",", "")
                                );
                                if (parsedAmount) {
                                  setTotal(
                                    parsedAmount.toFixed(assetBData.precision)
                                  );
                                  if (price) {
                                    setAmount(
                                      (parsedAmount / price).toFixed(
                                        assetAData.precision
                                      )
                                    );
                                  }
                                }
                              }}
                            >
                              Use balance
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </FormLabel>
                    <FormControl
                      onChange={(event) => {
                        const input = event.target.value;
                        const regex = /^[0-9,]*\.?[0-9]*$/;
                        if (regex.test(input)) {
                          const parsedFloat = parseFloat(
                            input.replaceAll(",", "")
                          );
                          if (parsedFloat) {
                            setTotal(parsedFloat.toFixed(assetBData.precision));
                            if (price) {
                              setAmount(
                                (parsedFloat / price).toFixed(
                                  assetAData.precision
                                )
                              );
                            }
                          }
                        }
                      }}
                    >
                      <Input
                        value={total}
                        placeholder={total}
                        className="mb-3"
                      />
                    </FormControl>
                    <FormDescription>
                      {orderType === "buy"
                        ? `The total ${thisAssetB} you will have to spend`
                        : `The total ${thisAssetB} you will receive`}
                    </FormDescription>

                    {orderType === "buy" &&
                    assetBBalance &&
                    parseFloat(assetBBalance.replaceAll(",", "")).toFixed(
                      assetBData.precision
                    ) < amount &&
                    total - parseFloat(assetBBalance.replaceAll(",", "")) >
                      0 ? (
                      <FormMessage>
                        A further{" "}
                        {total -
                          parseFloat(assetBBalance.replaceAll(",", "")).toFixed(
                            assetBData.precision
                          )}{" "}
                        {thisAssetB} is required
                      </FormMessage>
                    ) : null}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limit order expriration</FormLabel>
                    <FormControl
                      onValueChange={(selectedExpiry) => {
                        setExpiryType(selectedExpiry);
                        const oneHour = 60 * 60 * 1000;
                        const oneDay = 24 * oneHour;
                        if (
                          selectedExpiry !== "specific" &&
                          selectedExpiry !== "fkill"
                        ) {
                          const now = new Date();
                          let expiryDate;
                          if (selectedExpiry === "1hr") {
                            expiryDate = new Date(now.getTime() + oneHour);
                          } else if (selectedExpiry === "12hr") {
                            const duration = oneHour * 12;
                            expiryDate = new Date(now.getTime() + duration);
                          } else if (selectedExpiry === "24hr") {
                            const duration = oneDay;
                            expiryDate = new Date(now.getTime() + duration);
                          } else if (selectedExpiry === "7d") {
                            const duration = oneDay * 7;
                            expiryDate = new Date(now.getTime() + duration);
                          } else if (selectedExpiry === "30d") {
                            const duration = oneDay * 30;
                            expiryDate = new Date(now.getTime() + duration);
                          }

                          if (expiryDate) {
                            setDate(expiryDate);
                          }
                          setExpiry(selectedExpiry);
                        } else if (selectedExpiry === "fkill") {
                          const now = new Date();
                          setExpiry(new Date(now.getTime() + oneDay));
                        } else if (selectedExpiry === "specific") {
                          // Setting a default date expiry
                          setExpiry();
                        }
                      }}
                    >
                      <Select>
                        <SelectTrigger className="mb-3">
                          <SelectValue placeholder="1hr" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="1hr">1 hour</SelectItem>
                          <SelectItem value="12hr">12 hours</SelectItem>
                          <SelectItem value="24hr">24 hours</SelectItem>
                          <SelectItem value="7d">7 days</SelectItem>
                          <SelectItem value="30d">30 days</SelectItem>
                          <SelectItem value="specific">
                            Specific date
                          </SelectItem>
                          <SelectItem value="fkill">Fill or kill</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      {expiryType === "specific" ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date ? (
                                format(date, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={(e) => {
                                const parsedDate = new Date(e);
                                const now = new Date();
                                if (parsedDate < now) {
                                  console.log("Not a valid date");
                                  setDate(
                                    new Date(
                                      Date.now() + 1 * 24 * 60 * 60 * 1000
                                    )
                                  );
                                  return;
                                }
                                console.log("Setting expiry date");
                                setDate(e);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      ) : null}
                      {expiryType === "fkill"
                        ? `This order immediately expires if not fillable`
                        : null}
                      {expiryType !== "specific" && expiryType !== "fkill"
                        ? `This limit order will expire ${expiryType} after broadcast`
                        : null}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                disabled
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee</FormLabel>
                    <FormControl>
                      <Input
                        disabled
                        label={`fees`}
                        value={`0.4826 BTS`}
                        placeholder={1}
                      />
                    </FormControl>
                    <FormDescription>
                      The network fee to broadcast this operation
                    </FormDescription>
                    {expiryType === "fkill" || usr.id === usr.referrer ? (
                      <FormMessage>
                        {expiryType === "fkill"
                          ? `Unfilled rebate: ${1 * 0.4826} BTS (instant)`
                          : null}
                        {usr.id === usr.referrer
                          ? `LTM rebate: ${0.8 * 0.4826} BTS (vesting)`
                          : null}
                      </FormMessage>
                    ) : null}
                  </FormItem>
                )}
              />

              {orderType === "buy" &&
              assetAData &&
              assetAData.market_fee_percent &&
              assetAData.market_fee_percent > 0 ? (
                <FormField
                  control={form.control}
                  disabled
                  name="marketFees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market fee</FormLabel>
                      <FormControl>
                        <Input
                          disabled
                          value={`${marketFees} ${assetAData.symbol}`}
                          placeholder={`${marketFees} ${assetAData.symbol}`}
                        />
                      </FormControl>
                      <FormDescription>
                        The market fee applied by asset issuer
                      </FormDescription>
                    </FormItem>
                  )}
                />
              ) : null}

              {orderType === "sell" &&
              assetBData &&
              assetBData.market_fee_percent &&
              assetBData.market_fee_percent > 0 ? (
                <FormField
                  control={form.control}
                  disabled
                  name="marketFees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market fee</FormLabel>
                      <FormControl>
                        <Input
                          disabled
                          value={`${marketFees} ${assetBData.symbol}`}
                          placeholder={`${marketFees} ${assetBData.symbol}`}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        The market fee applied by asset issuer
                      </FormDescription>
                    </FormItem>
                  )}
                />
              ) : null}

              {!amount || !price || !expiry || deepLinkInProgress !== false ? (
                <Button
                  className="mt-7 mb-1"
                  variant="outline"
                  disabled
                  type="submit"
                >
                  Submit
                </Button>
              ) : (
                <Button className="mt-7 mb-1" variant="outline" type="submit">
                  Submit
                </Button>
              )}
            </form>
          </Form>
        ) : (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="sellPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="grid grid-cols-2 mt-3">
                        <div className="mt-1">Price</div>
                        <div className="text-gray-500 text-right">
                          <span variant="link">
                            <Badge>Use lowest ask</Badge>
                          </span>
                        </div>
                      </div>
                    </FormLabel>

                    <Input disabled className="mb-3" />
                    <FormDescription>Your price per ? in ?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="grid grid-cols-2 mt-3">
                        <div className="mt-1">Amount</div>
                        <div className="text-gray-500 text-right">
                          {orderType === "sell" && assetABalance ? (
                            <Badge>Use balance</Badge>
                          ) : null}
                        </div>
                      </div>
                    </FormLabel>
                    <Input disabled className="mb-3" />
                    <FormDescription>
                      {orderType === "buy"
                        ? `The amount of ? you want to buy`
                        : `The amount of ? you will have to spend`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="grid grid-cols-2 mt-3">
                        <div className="mt-1">Total</div>
                        <div className="text-gray-500 text-right">
                          {orderType === "buy" && assetBBalance ? (
                            <Badge>Use balance</Badge>
                          ) : null}
                        </div>
                      </div>
                    </FormLabel>
                    <Input disabled className="mb-3" />
                    <FormDescription>
                      {orderType === "buy"
                        ? `The total ? you will have to spend`
                        : `The total ? you will receive`}
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limit order expriration</FormLabel>
                    <Select disabled>
                      <SelectTrigger className="mb-3">
                        <SelectValue placeholder="1hr" />
                      </SelectTrigger>
                    </Select>
                    <FormDescription>Time till expiration...</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                disabled
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee</FormLabel>
                    <Input disabled label={`fees`} />
                    <FormDescription>
                      The network fee to broadcast this operation
                    </FormDescription>
                    {expiryType === "fkill" || usr.id === usr.referrer ? (
                      <FormMessage>
                        {expiryType === "fkill"
                          ? `Unfilled rebate: ${1 * 0.4826} BTS (instant)`
                          : null}
                        {usr.id === usr.referrer
                          ? `LTM rebate: ${0.8 * 0.4826} BTS (vesting)`
                          : null}
                      </FormMessage>
                    ) : null}
                  </FormItem>
                )}
              />

              <Button
                disabled
                className="mt-7 mb-1"
                variant="outline"
                type="submit"
              >
                Submit
              </Button>
            </form>
          </Form>
        )}
        {showDialog && data && deeplink && (
          <Dialog
            open={showDialog}
            onOpenChange={(open) => {
              if (!open) {
                // Clearing generated deeplink
                setData("");
                setDeeplink("");
                setTRXJSON();
              }
              setShowDialog(open);
            }}
          >
            <DialogContent className="sm:max-w-[425px] bg-white">
              <>
                <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight">
                  {orderType === "buy"
                    ? `Buying ${amount} ${thisAssetA} for ${total} ${thisAssetB}`
                    : `Selling ${amount} ${thisAssetA} for ${total} ${thisAssetB}`}
                </h1>
                <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
                  With the account: {usr.username} ({usr.id})<br />
                  Your Bitshares create limit order operation is ready!
                  <br />
                  Use the links below to interact with the Beet wallet.
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    color="gray"
                    className="w-full"
                    onClick={() => {
                      copyToClipboard(JSON.stringify(trxJSON, null, 4));
                    }}
                    variant="outline"
                  >
                    Copy operation JSON
                  </Button>

                  {downloadClicked ? (
                    <Button variant="outline" disabled>
                      Downloading...
                    </Button>
                  ) : (
                    <a
                      href={`data:text/json;charset=utf-8,${deeplink}`}
                      download={`pool_exchange.json`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={handleDownloadClick}
                    >
                      <Button variant="outline" className="w-full">
                        Download Beet operation JSON
                      </Button>
                    </a>
                  )}

                  <a href={`rawbeet://api?chain=BTS&request=${deeplink}`}>
                    <Button variant="outline" className="w-full">
                      Trigger raw Beet deeplink
                    </Button>
                  </a>
                </div>
              </>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
