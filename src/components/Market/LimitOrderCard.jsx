import React, { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

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

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { copyToClipboard, trimPrice } from "@/lib/common.js";

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
        marketSearch
    } = properties;

    const { buyOrders, sellOrders } = properties;

    const [amount, setAmount] = useState(0.0);
    const [price, setPrice] = useState(0.0);
    const [calculatedAmount, setCalculatedAmount] = useState(0.0);
    const [marketFees, setMarketFees] = useState(0.0);
    const [expiry, setExpiry] = useState("1hr");
    const [date, setDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))

    const form = useForm({
        defaultValues: {
            account: "",
        },
    });

    useEffect(() => {
        if (amount && price) {
            setCalculatedAmount(amount * price);
        }
    }, [amount, price]);

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

                var expiry = new Date();
                expiry.setMinutes(expiry.getMinutes() + 60); // TODO: make this configurable

                const opJSON = [
                    {
                        seller: usr.id,
                        amount_to_sell: {
                          amount: amount, // to blockchain amount...
                          asset_id: orderType === "buy"
                            ? marketSearch.find((asset) => asset.s === thisAssetA).id
                            : marketSearch.find((asset) => asset.s === thisAssetB).id
                        },
                        min_to_receive: {
                          amount: calculatedAmount, // to blockchain amount...
                          asset_id: orderType === "buy"
                            ? marketSearch.find((asset) => asset.s === thisAssetB).id
                            : marketSearch.find((asset) => asset.s === thisAssetA).id
                        },
                        expiration: expiry,
                        fill_or_kill: false,
                        extensions: []
                      }
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

                if (deeplinkValue && deeplinkValue.result && deeplinkValue.result.generatedDeepLink) {
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

    const [amountWarning, setAmountWarning] = useState(false);
    const [total, setTotal] = useState(0);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle>
                {
                    orderType === "buy"
                    ? `Buying ${thisAssetA} with ${thisAssetB}`
                    : `Selling ${thisAssetA} for ${thisAssetB}`
                }
                </CardTitle>
                <CardDescription>
                    Use this form to create a limit order operation.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {
                    thisAssetA && thisAssetB && marketSearch
                        ?  (
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
                                                    Price
                                                </FormLabel>
                                                <FormControl
                                                    onChange={(event) => {
                                                        const input = event.target.value;
                                                        const regex = /^[0-9,]*\.?[0-9]*$/;
                                                        if (regex.test(input)) {
                                                            setPrice(input.replaceAll(",", ""));
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
                                                    {
                                                        `Your price per ${thisAssetA} in ${thisAssetB}`
                                                    }
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
                                                Amount (<a href="/index.html">Use balance</a>)
                                            </FormLabel>
                                            <FormControl
                                                onChange={(event) => {
                                                    const input = event.target.value;
                                                    const regex = /^[0-9,]*\.?[0-9]*$/;
                                                    if (regex.test(input)) {
                                                        setAmount(input.replaceAll(",", ""));
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
                                                {
                                                    orderType === "buy"
                                                        ?   `The amount of ${thisAssetA} you want to buy`
                                                        :   `The amount of ${thisAssetA} you will have to spend`
                                                }
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
                                                Total
                                            </FormLabel>
                                            <FormControl
                                                onChange={(event) => {
                                                    const input = event.target.value;
                                                    const regex = /^[0-9,]*\.?[0-9]*$/;
                                                    if (regex.test(input)) {
                                                        setTotal(input.replaceAll(",", ""));
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
                                                {
                                                    orderType === "buy"
                                                        ?   `The total ${thisAssetB} you will have to spend`
                                                        :   `The total ${thisAssetB} you will receive`
                                                }
                                            </FormDescription>
                                            {
                                                amountWarning
                                                    ?   <FormMessage>
                                                            Can't exceed maximum
                                                        </FormMessage>
                                                    :   null
                                            }
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
                                                    onValueChange={(expiry) => {
                                                        if (expiry !== "specific" && expiry !== "fkill") {
                                                            const now = new Date();
                                                            let expiryDate;
                                                            const oneHour = 60 * 60 * 1000;
                                                            const oneDay = 24 * oneHour;
                                                            if (expiry === "1hr") {
                                                                expiryDate = new Date(now.getTime() + oneHour);
                                                            } else if (expiry === "12hr") {
                                                                const duration = oneHour * 12;
                                                                expiryDate = new Date(now.getTime() + duration);
                                                            } else if (expiry === "24hr") {
                                                                const duration = oneDay;
                                                                expiryDate = new Date(now.getTime() + duration);
                                                            } else if (expiry === "7d") {
                                                                const duration = oneDay * 7;
                                                                expiryDate = new Date(now.getTime() + duration);
                                                            } else if (expiry === "30d") {
                                                                const duration = oneDay * 30;
                                                                expiryDate = new Date(now.getTime() + duration);
                                                            }

                                                            if (expiryDate) {
                                                                setDate(expiryDate);
                                                            }
                                                            setExpiry(expiry);
                                                        } else {
                                                            setExpiry(expiry);
                                                        }
                                                    }}
                                                >
                                                    <Select>
                                                        <SelectTrigger className="mb-3">
                                                            <SelectValue placeholder="1hr" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white">
                                                            <SelectItem value="1hr">
                                                                1 hour
                                                            </SelectItem>
                                                            <SelectItem value="12hr">
                                                                12 hours
                                                            </SelectItem>
                                                            <SelectItem value="24hr">
                                                                24 hours
                                                            </SelectItem>
                                                            <SelectItem value="7d">
                                                                7 days
                                                            </SelectItem>
                                                            <SelectItem value="30d">
                                                                30 days
                                                            </SelectItem>
                                                            <SelectItem value="specific">
                                                                Specific date
                                                            </SelectItem>
                                                            <SelectItem value="fkill">
                                                                Fill or kill
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormDescription>
                                                    {
                                                        expiry === "specific"
                                                            ?   <Popover>
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
                                                                                console.log("Setting expiry date")
                                                                                setDate(e);
                                                                            }}
                                                                            initialFocus
                                                                        />
                                                                    </PopoverContent>
                                                                </Popover>
                                                            :  null
                                                    }
                                                    {
                                                        expiry === "fkill"
                                                            ?  `This order immediately expires if not fillable`
                                                            :  null
                                                    }
                                                    {
                                                        expiry !== "specific" && expiry !== "fkill"
                                                            ?  `This limit order will expire ${expiry} after broadcast`
                                                            :  null
                                                    }
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
                                            </FormItem>
                                        )}
                                    />

                                    {
                                        orderType === "buy" &&
                                            assetAData &&
                                            assetAData.market_fee_percent &&
                                            assetAData.market_fee_percent > 0
                                                ?   <FormField
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
                                                :   null
                                    }

                                    {
                                        orderType === "sell" &&
                                            assetBData &&
                                            assetBData.market_fee_percent &&
                                            assetBData.market_fee_percent > 0
                                                ?   <FormField
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
                                                :   null
                                    }      

                                    {
                                        (!amount || !price) || deepLinkInProgress !== false
                                            ? <Button className="mt-7 mb-1" variant="outline" disabled type="submit">Submit</Button>
                                            : <Button className="mt-7 mb-1" variant="outline" type="submit">Submit</Button>
                                    }

                                    {
                                        ((orderType === "buy" && !sellOrders || sellOrders && !sellOrders.length) || (orderType === "sell" && !buyOrders || buyOrders && !buyOrders.length))
                                            ? (
                                                <Button
                                                    disabled
                                                    variant="outline"
                                                    className="ml-2"
                                                >
                                                    {
                                                    orderType === "buy"
                                                        ? `Use lowest ask`
                                                        : `Use highest bid`
                                                    }
                                                </Button>
                                            )
                                            : (
                                                <Button
                                                    variant="outline"
                                                    className="ml-2"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        if (orderType === "buy" && sellOrders && sellOrders.length > 0) {
                                                            setPrice(trimPrice(sellOrders[0].price, assetBData.precision));
                                                            return;
                                                        } else if (orderType === "sell" && buyOrders && buyOrders.length > 0) {
                                                            setPrice(trimPrice(buyOrders[0].price, assetBData.precision));
                                                            return;
                                                        }
                                                    }}
                                                >
                                                    {
                                                        orderType === "buy"
                                                            ? `Use lowest ask`
                                                            : `Use highest bid`
                                                    }
                                                </Button>
                                            )
                                    }
                                </form>
                            </Form>
                        )
                        : "Loading market data..."
                }
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
                            setShowDialog(open)
                        }}
                    >
                        <DialogContent className="sm:max-w-[425px] bg-white">
                            <>
                                <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight">
                                    Buying {amount} {thisAssetA} for {calculatedAmount} {thisAssetB}
                                </h1>
                                <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
                                    With the account: {usr.username} ({usr.id})<br/>
                                    Your Bitshares create limit order operation is ready!<br/>
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
                                    
                                    {
                                        downloadClicked
                                        ? (
                                            <Button variant="outline" disabled>
                                                Downloading...
                                            </Button>
                                        )
                                        : (
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
                                        )
                                    }

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
