import React, { useState, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { trimPrice, humanReadableFloat, blockchainFloat } from "@/lib/common.js";
import DeepLinkDialog from "../common/DeepLinkDialog";

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
    fee,
  } = properties;

  const { buyOrders, sellOrders } = properties;

  const [amount, setAmount] = useState(0.0);
  const [price, setPrice] = useState(0.0);
  const [total, setTotal] = useState(0);

  const marketFees = useMemo(() => {
    let calculatedMarketFee = 0.0;

    if (amount && price && total) {
      if (
        orderType === "buy" &&
        assetAData &&
        assetAData.market_fee_percent &&
        assetAData.market_fee_percent > 0
      ) {
        calculatedMarketFee = parseFloat(amount) * (assetAData.market_fee_percent / 100);
        return calculatedMarketFee.toFixed(assetAData.precision);
      }

      if (
        orderType === "sell" &&
        assetBData &&
        assetBData.market_fee_percent &&
        assetBData.market_fee_percent > 0
      ) {
        calculatedMarketFee = parseFloat(total) * (assetBData.market_fee_percent / 100);
        return calculatedMarketFee.toFixed(assetBData.precision);
      }
    }

    return calculatedMarketFee;
  }, [amount, price, total, orderType, assetAData, assetBData]);

  const [expiryType, setExpiryType] = useState("1hr");
  const [expiry, setExpiry] = useState(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });

  const [date, setDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Solely for the calendar component to display a date string

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

  const [showDialog, setShowDialog] = useState(false);

  function getReadableBalance(assetData, balances) {
    const id = assetData.id;
    const foundBalance = balances.find((x) => x.asset_id === id);
    return foundBalance
      ? humanReadableFloat(foundBalance.amount, assetData.precision).toLocaleString(undefined, {
          minimumFractionDigits: assetData.precision,
        })
      : 0;
  }

  const assetABalance = useMemo(() => {
    return assetAData && usrBalances ? getReadableBalance(assetAData, usrBalances) : 0;
  }, [assetAData, usrBalances]);

  const assetBBalance = useMemo(() => {
    return assetBData && usrBalances ? getReadableBalance(assetBData, usrBalances) : 0;
  }, [assetBData, usrBalances]);

  const [osoEnabled, setOSOEnabled] = useState(false);
  const [spreadPercent, setSpreadPercent] = useState(0);
  const [sizePercent, setSizePercent] = useState(100);
  const [expirationSeconds, setExpirationSeconds] = useState(0);
  const [repeat, setRepeat] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>
          {orderType === "buy"
            ? `Buying ${thisAssetA} with ${thisAssetB}`
            : `Selling ${thisAssetA} for ${thisAssetB}`}
        </CardTitle>
        <CardDescription>Use this form to create a limit order operation.</CardDescription>
      </CardHeader>
      <CardContent>
        {thisAssetA && thisAssetB && marketSearch && assetAData && assetBData ? (
          <Form {...form}>
            <form
              onSubmit={(event) => {
                setShowDialog(true);
                event.preventDefault();
              }}
            >
              <FormField
                control={form.control}
                name="priceAmount"
                render={({ field }) => (
                  <FormItem className="mt-4 text-xs">
                    <FormLabel>Price</FormLabel>
                    <FormDescription>
                      {orderType === "buy"
                        ? `Your price per ${thisAssetA} in ${thisAssetB}`
                        : `Your price per ${thisAssetB} in ${thisAssetA}`}
                    </FormDescription>
                    <FormControl>
                      <span className="grid grid-cols-12">
                        <span className="col-span-9">
                          <Input label={`Price`} placeholder={price} disabled readOnly />
                        </span>
                        <span className="col-span-3 ml-3 text-center">
                          <Popover>
                            <PopoverTrigger>
                              <span className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg">
                                <Label>Edit</Label>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>Provide a new price</Label>
                              <Input
                                placeholder={price}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = /^[0-9,]*\.?[0-9]*$/;
                                  if (input && input.length && regex.test(input)) {
                                    const parsedInput = parseFloat(input.replaceAll(",", ""));
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
                              />

                              {(orderType === "buy" && !sellOrders) ||
                              (sellOrders && !sellOrders.length) ||
                              (orderType === "sell" && !buyOrders) ||
                              (buyOrders && !buyOrders.length) ? (
                                <Badge disabled>
                                  {orderType === "buy" ? `Use lowest ask` : `Use highest bid`}
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
                                          (parseFloat(finalPrice) * parseFloat(amount)).toFixed(
                                            assetBData.precision
                                          )
                                        );
                                      }
                                    }
                                  }}
                                >
                                  <Badge>
                                    {orderType === "buy" ? `Use lowest ask` : `Use highest bid`}
                                  </Badge>
                                </span>
                              )}
                            </PopoverContent>
                          </Popover>
                        </span>
                      </span>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellAmount"
                render={({ field }) => (
                  <FormItem className="mt-4 text-xs">
                    <FormLabel>Amount</FormLabel>
                    <FormDescription>
                      {orderType === "buy"
                        ? `The amount of ${thisAssetA} you want to buy`
                        : `The amount of ${thisAssetA} you will have to spend`}
                    </FormDescription>
                    <FormControl>
                      <span className="grid grid-cols-12">
                        <span className="col-span-9">
                          <Input label={`Amount`} placeholder={amount} disabled readOnly />
                        </span>
                        <span className="col-span-3 ml-3 text-center">
                          <Popover>
                            <PopoverTrigger>
                              <span className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg">
                                <Label>Edit</Label>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>Provide a new amount</Label>
                              <Input
                                placeholder={amount}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = /^[0-9,]*\.?[0-9]*$/;
                                  if (input && input.length && regex.test(input)) {
                                    const parsedInput = parseFloat(input.replaceAll(",", ""));
                                    if (parsedInput) {
                                      setAmount(parsedInput.toFixed(assetAData.precision));
                                      if (price) {
                                        setTotal(
                                          (parsedInput * price).toFixed(assetBData.precision)
                                        );
                                      }
                                    }
                                  }
                                }}
                              />
                              {orderType === "sell" && assetABalance ? (
                                <Badge
                                  onClick={() => {
                                    let parsedAmount = parseFloat(
                                      assetABalance.replaceAll(",", "")
                                    );
                                    if (parsedAmount) {
                                      setAmount(parsedAmount.toFixed(assetAData.precision));
                                      if (price) {
                                        setTotal(
                                          (parsedAmount * price).toFixed(assetBData.precision)
                                        );
                                      }
                                    }
                                  }}
                                >
                                  Use balance
                                </Badge>
                              ) : null}
                            </PopoverContent>
                          </Popover>
                        </span>
                      </span>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellTotal"
                render={({ field }) => (
                  <FormItem className="mt-4 text-xs">
                    <FormLabel>Total</FormLabel>
                    <FormDescription>
                      {orderType === "buy"
                        ? `The total ${thisAssetB} you will have to spend`
                        : `The total ${thisAssetB} you will receive`}
                    </FormDescription>
                    <FormControl>
                      <span className="grid grid-cols-12">
                        <span className="col-span-9">
                          <Input label={`Total`} placeholder={total} disabled readOnly />
                        </span>
                        <span className="col-span-3 ml-3 text-center">
                          <Popover>
                            <PopoverTrigger>
                              <span className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg">
                                <Label>Edit</Label>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>Provide a new total</Label>
                              <Input
                                placeholder={total}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = /^[0-9,]*\.?[0-9]*$/;
                                  if (input && input.length && regex.test(input)) {
                                    const parsedFloat = parseFloat(input.replaceAll(",", ""));
                                    if (parsedFloat) {
                                      setTotal(parsedFloat.toFixed(assetBData.precision));
                                      if (price) {
                                        setAmount(
                                          (parsedFloat / price).toFixed(assetAData.precision)
                                        );
                                      }
                                    }
                                  }
                                }}
                              />
                              {orderType === "buy" && assetBBalance ? (
                                <Badge
                                  onClick={() => {
                                    let parsedAmount = parseFloat(
                                      assetBBalance.replaceAll(",", "")
                                    );
                                    if (parsedAmount) {
                                      setTotal(parsedAmount.toFixed(assetBData.precision));
                                      if (price) {
                                        setAmount(
                                          (parsedAmount / price).toFixed(assetAData.precision)
                                        );
                                      }
                                    }
                                  }}
                                >
                                  Use balance
                                </Badge>
                              ) : null}
                            </PopoverContent>
                          </Popover>
                        </span>
                      </span>
                    </FormControl>
                    <FormMessage>
                      {orderType === "buy" &&
                      assetBBalance &&
                      parseFloat(assetBBalance.replaceAll(",", "")).toFixed(assetBData.precision) <
                        amount &&
                      total - parseFloat(assetBBalance.replaceAll(",", "")) > 0
                        ? `A further ${
                            total -
                            parseFloat(assetBBalance.replaceAll(",", "")).toFixed(
                              assetBData.precision
                            )
                          } ${thisAssetB} is required`
                        : null}
                    </FormMessage>
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
                        if (selectedExpiry !== "specific" && selectedExpiry !== "fkill") {
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
                          <SelectItem value="specific">Specific date</SelectItem>
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
                              {date ? format(date, "PPP") : <span>Pick a date</span>}
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
                                  setDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000));
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

              <Separator className="mb-2 mt-2" />

              <FormField
                control={form.control}
                name="osoValue"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <>
                        <Checkbox
                          id="terms1"
                          className="mr-2"
                          checked={osoEnabled}
                          onClick={() => {
                            setOSOEnabled(!osoEnabled);
                          }}
                        />
                        <span
                          onClick={() => {
                            setOSOEnabled(!osoEnabled);
                          }}
                        >
                          Enable Order Sends Order
                        </span>
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {osoEnabled ? (
                <>
                  <FormField
                    control={form.control}
                    name="osoSpread"
                    render={({ field }) => (
                      <FormItem className="mt-2 text-xs">
                        <FormLabel className="text-sm">Spread percent</FormLabel>
                        <FormDescription>
                          How far the price of the take profit order differs from the original order
                        </FormDescription>
                        <FormControl>
                          <span className="grid grid-cols-12">
                            <span className="col-span-9">
                              <Input
                                label={`Spread percent`}
                                placeholder={spreadPercent}
                                disabled
                                readOnly
                              />
                              <Slider
                                className="mt-3"
                                defaultValue={[spreadPercent]}
                                max={100}
                                min={0}
                                step={0.01}
                                onValueChange={(value) => {
                                  setSpreadPercent(value[0]);
                                }}
                              />
                            </span>

                            <span className="col-span-3 ml-3 text-center">
                              <Popover>
                                <PopoverTrigger>
                                  <span
                                    onClick={() => {
                                      event.preventDefault();
                                    }}
                                    className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg"
                                  >
                                    <Label>Edit</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>Provide a new spread percent</Label>
                                  <Input
                                    placeholder={spreadPercent}
                                    className="mb-2 mt-1"
                                    onChange={(event) => {
                                      const input = event.target.value;
                                      const regex = /^[0-9]*\.?[0-9]*$/;
                                      if (input && input.length && regex.test(input)) {
                                        if (input >= 0 && input <= 100) {
                                          setSpreadPercent(input);
                                        }
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </span>
                          </span>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="osoSize"
                    render={({ field }) => (
                      <FormItem className="mt-4 text-xs">
                        <FormLabel className="text-sm">Size percent</FormLabel>
                        <FormDescription>
                          Percentage to sell in the take profit order
                        </FormDescription>
                        <FormControl>
                          <span className="grid grid-cols-12">
                            <span className="col-span-9">
                              <Input
                                label={`Size percent`}
                                placeholder={sizePercent}
                                disabled
                                readOnly
                              />
                              <Slider
                                className="mt-3"
                                defaultValue={[sizePercent]}
                                max={100}
                                min={0}
                                step={0.01}
                                onValueChange={(value) => {
                                  setSizePercent(value[0]);
                                }}
                              />
                            </span>

                            <span className="col-span-3 ml-3 text-center">
                              <Popover>
                                <PopoverTrigger>
                                  <span
                                    onClick={() => {
                                      event.preventDefault();
                                    }}
                                    className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg"
                                  >
                                    <Label>Edit</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>Provide a new size percent</Label>
                                  <Input
                                    placeholder={sizePercent}
                                    className="mb-2 mt-1"
                                    onChange={(event) => {
                                      const input = event.target.value;
                                      const regex = /^[0-9]*\.?[0-9]*$/;
                                      if (input && input.length && regex.test(input)) {
                                        if (input >= 0 && input <= 100) {
                                          setSizePercent(input);
                                        }
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </span>
                          </span>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repeatValue"
                    render={({ field }) => (
                      <FormItem className="mt-4 text-xs">
                        <FormLabel className="text-sm">Set OSO to automatically repeat?</FormLabel>
                        <FormDescription>Automates repeated OSO based limit orders</FormDescription>
                        <FormControl>
                          <>
                            <Checkbox
                              id="terms2"
                              className="mr-2"
                              checked={repeat}
                              onClick={() => {
                                setRepeat(!repeat);
                              }}
                            />
                            {repeat ? `OSO configured to repeat` : `OSO configured not to repeat`}
                          </>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              <Separator className="mb-2 mt-2" />

              <FormField
                control={form.control}
                disabled
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee</FormLabel>
                    <FormControl>
                      <Input disabled label={`fees`} value={`${fee} BTS`} placeholder={1} />
                    </FormControl>
                    <FormDescription>The network fee to broadcast this operation</FormDescription>
                    {expiryType === "fkill" || usr.id === usr.referrer ? (
                      <FormMessage>
                        {expiryType === "fkill" ? `Unfilled rebate: ${fee} BTS (instant)` : null}
                        <br />
                        {usr.id === usr.referrer ? `LTM rebate: ${0.8 * fee} BTS (vesting)` : null}
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
                      <FormDescription>The market fee applied by asset issuer</FormDescription>
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
                      <FormDescription>The market fee applied by asset issuer</FormDescription>
                    </FormItem>
                  )}
                />
              ) : null}
              {!amount || !price || !expiry ? (
                <Button className="mt-7 mb-1" variant="outline" disabled type="submit">
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
                    <FormDescription>
                      {orderType === "buy"
                        ? `The amount of ? you want to buy`
                        : `The amount of ? you will have to spend`}
                    </FormDescription>
                    <Input disabled className="mb-3" />
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
                          {orderType === "buy" && assetBBalance ? <Badge>Use balance</Badge> : null}
                        </div>
                      </div>
                    </FormLabel>
                    <FormDescription>
                      {orderType === "buy"
                        ? `The total ? you will have to spend`
                        : `The total ? you will receive`}
                    </FormDescription>
                    <Input disabled className="mb-3" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limit order expriration</FormLabel>
                    <FormDescription>Time till expiration...</FormDescription>
                    <Select disabled>
                      <SelectTrigger className="mb-3">
                        <SelectValue placeholder="1hr" />
                      </SelectTrigger>
                    </Select>
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
                    <FormDescription>The network fee to broadcast this operation</FormDescription>
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

              <Button disabled className="mt-7 mb-1" variant="outline" type="submit">
                Submit
              </Button>
            </form>
          </Form>
        )}
        {showDialog ? (
          <DeepLinkDialog
            operationName="limit_order_create"
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            key={
              orderType === "buy"
                ? `Buying${amount}${thisAssetA}for${total}${thisAssetB}`
                : `Selling${amount}${thisAssetA}for${total}${thisAssetB}`
            }
            headerText={
              orderType === "buy"
                ? `Buying ${amount} ${thisAssetA} for ${total} ${thisAssetB}`
                : `Selling ${amount} ${thisAssetA} for ${total} ${thisAssetB}`
            }
            trxJSON={
              orderType === "buy"
                ? [
                    {
                      seller: usr.id,
                      amount_to_sell: {
                        amount: blockchainFloat(total, assetBData.precision).toFixed(0),
                        asset_id: marketSearch.find((asset) => asset.s === thisAssetB).id,
                      },
                      min_to_receive: {
                        amount: blockchainFloat(amount, assetAData.precision).toFixed(0),
                        asset_id: marketSearch.find((asset) => asset.s === thisAssetA).id,
                      },
                      expiration: expiry,
                      fill_or_kill: false,
                      extensions: osoEnabled
                        ? {
                            limit_order_auto_action: {
                              fee_asset_id: "1.3.0",
                              spread_percent: spreadPercent ? spreadPercent * 100 : 0,
                              size_percent: sizePercent ? sizePercent * 100 : 0,
                              expiration_seconds: 0,
                              repeat: repeat,
                            },
                          }
                        : {},
                    },
                  ]
                : [
                    {
                      seller: usr.id,
                      amount_to_sell: {
                        amount: blockchainFloat(amount, assetAData.precision).toFixed(0),
                        asset_id: marketSearch.find((asset) => asset.s === thisAssetA).id,
                      },
                      min_to_receive: {
                        amount: blockchainFloat(total, assetBData.precision).toFixed(0),
                        asset_id: marketSearch.find((asset) => asset.s === thisAssetB).id,
                      },
                      expiration: expiry,
                      fill_or_kill: false,
                      extensions: osoEnabled
                        ? {
                            limit_order_auto_action: {
                              fee_asset_id: "1.3.0",
                              spread_percent: spreadPercent,
                              size_percent: sizePercent,
                              expiration_seconds: 0,
                              repeat: repeat,
                            },
                          }
                        : {},
                    },
                  ]
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
