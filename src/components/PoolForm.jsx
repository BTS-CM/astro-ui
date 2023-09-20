import React, { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { FixedSizeList as List } from 'react-window';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"

import {
    Card,
    CardContent,
} from "@/components/ui/card";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import { blockchainFloat, copyToClipboard } from "../lib/common";
import { $currentUser, eraseCurrentUser } from '../stores/users.ts'
import AccountSelect from './AccountSelect.jsx'

export default function PoolForm() {
    const form = useForm({
        defaultValues: {
            account: "",
        },
    });

    const [data, setData] = useState(""); // form data container
    const [pool, setPool] = useState(""); // dropdown selected pool

    const [pools, setPools] = useState(); // pools retrieved from api
    const [assetData, setAssetData] = useState(); // assets retrieved from api

    useEffect(() => {
        async function retrieve() {
            const poolResponse = await fetch("http://localhost:8080/cache/pools/bitshares", { method: "GET" });

            if (!poolResponse.ok) {
                console.log({
                    error: new Error(`${response.status} ${response.statusText}`),
                    msg: "Couldn't generate deeplink."
                });
                return;
            }
    
            const poolJSON = await poolResponse.json();
    
            if (poolJSON) {
                setPools(poolJSON);
            }
        }

        retrieve();
    }, []);

    useEffect(() => {
        async function retrieve() {
            const assetResponse = await fetch("http://localhost:8080/cache/poolAssets/bitshares", { method: "GET" });
    
            if (!assetResponse.ok) {
                console.log({
                    error: new Error(`${response.status} ${response.statusText}`),
                    msg: "Couldn't generate deeplink."
                });
                return;
            }
    
            const dataResponse = await assetResponse.json();
    
            if (dataResponse) {
                setAssetData(dataResponse);
            }
        }

        retrieve();
    }, []);

    const [sellAmount, setSellAmount] = useState(0);
    const [buyAmount, setBuyAmount] = useState(0);

    const [foundPool, setFoundPool] = useState();
    const [assetA, setAssetA] = useState("");
    const [assetB, setAssetB] = useState("");
    useEffect(() => {
        if (pools && pool && assetData) {
            const currentPool = pools.find((x) => x.id === pool);
            setFoundPool(currentPool);
            const foundA = assetData.find((x) => x.id === currentPool.asset_a_id);
            const foundB = assetData.find((x) => x.id === currentPool.asset_b_id);
            setAssetA(foundA);
            setAssetB(foundB);
            setSellAmount(1);
        }
    }, [pool, assetData]);

    useEffect(() => {
        // Calculating the amount the user can buy
        if (assetA && assetB && foundPool) {
            console.log("Calculating the amount the user can buy")

            let poolamounta = Number(foundPool.balance_a);
            let poolamountap = Number(10 ** assetA.precision);

            let poolamountb = Number(foundPool.balance_b);
            let poolamountbp = Number(10 ** assetB.precision);
    
            const maker_market_fee_percenta = assetA.market_fee_percent;
            const maker_market_fee_percentb = assetB.market_fee_percent;
    
            const max_market_feea = assetA.max_market_fee;
            const max_market_feeb = assetB.max_market_fee;
    
            const taker_fee_percenta = foundPool.taker_fee_percent;
    
            function flagsa() {
                if (maker_market_fee_percenta === 0) {
                    return 0;
                }
                if (maker_market_fee_percenta > 0) {
                    return Math.min(Number(max_market_feea), Math.ceil((Number(sellAmount) * Number(poolamountap)) * (Number(maker_market_fee_percenta) / 10000)))
                }
            }
    
            function flagsb() {
                if (maker_market_fee_percentb === 0) {
                    return 0;
                }
                if (maker_market_fee_percentb > 0) {
                    return Math.min(
                        Number(max_market_feeb),
                        Math.ceil((Number(sellAmount) * Number(poolamountbp)) * (Number(maker_market_fee_percentb) / 10000))
                    )
                }
            }
    
            function taker_market_fee_percenta() {
                if (typeof taker_fee_percenta == 'undefined' && maker_market_fee_percenta > 0) {
                    return Number(maker_market_fee_percenta) / 10000;
                }
                if (typeof taker_fee_percenta == 'undefined' && maker_market_fee_percenta === 0) {
                    return 0;
                } else {
                    return Number(taker_fee_percenta) / 10000;
                }
            }
            let taker_market_fee_percent_a = (Number(taker_market_fee_percenta()));

            let result;
            if (assetA.id === foundPool.asset_a_id) {
                let tmp_delta_b = Number(poolamountb) - Math.ceil(
                    Number(poolamountb) * Number(poolamounta) / ( Number(poolamounta) + ( (Number(sellAmount) * Number(poolamountap)) - Number(flagsa())))
                );
                let tmp_b = (Number(tmp_delta_b) * Number(taker_fee_percenta) / 10000);
                result = (Number(tmp_delta_b) - Math.floor(Number(tmp_b)) - Math.ceil(Math.min(
                    Number(max_market_feeb),
                    Math.ceil(Number(tmp_delta_b) * Number(taker_market_fee_percent_a))
                ))) / Number(poolamountbp);
            } else {
                let tmp_delta_a = Number(poolamounta) - Math.ceil(
                    Number(poolamounta) * Number(poolamountb) / ( Number(poolamountb) + ( (Number(sellAmount) * Number(poolamountbp)) - Number(flagsb())))
                );
                let tmp_a = (Number(tmp_delta_a) * Number(taker_fee_percenta) / 10000);
                result = (Number(tmp_delta_a) - Math.floor(Number(tmp_a)) - Math.ceil(Math.min(
                    Number(max_market_feea),
                    Math.ceil(Number(tmp_delta_a) * Number(taker_market_fee_percent_a))
                ))) / Number(poolamountap);
            }
           
            setBuyAmount(result);
        }
    }, [sellAmount, assetA, assetB]);

    const [downloadClicked, setDownloadClicked] = useState(false);

    const handleDownloadClick = () => {
        if (!downloadClicked) {
            setDownloadClicked(true);
            setTimeout(() => {
                setDownloadClicked(false);
            }, 10000);
        }
    };

    const [chain, setChain] = useState("bitshares");
    const [deeplink, setDeeplink] = useState("");
    const [trxJSON, setTRXJSON] = useState();
    useEffect(() => {
        if (data) {
            async function generate() {
                const opJSON = [
                    {
                        "account": $currentUser.get().id,
                        "pool": pool,
                        "amount_to_sell": {
                            "amount": blockchainFloat(sellAmount, assetA.precision),
                            "asset_id": assetA.id
                        },
                        "min_to_receive": {
                            "amount": blockchainFloat(buyAmount, assetB.precision),
                            "asset_id": assetB.id
                        },
                        "extensions": []
                    }
                ];
                setTRXJSON(opJSON);

                const response = await fetch(`http://localhost:8080/api/deeplink/${chain}/liquidity_pool_exchange`, {
                    method: "POST",
                    body: JSON.stringify(opJSON),
                });

                if (!response.ok) {
                    console.log({
                        error: new Error(`${response.status} ${response.statusText}`),
                        msg: "Couldn't generate deeplink."
                    });
                    return;
                }

                const deeplinkValue = await response.json();

                if (deeplinkValue && deeplinkValue.result && deeplinkValue.result.generatedDeepLink) {
                    setDeeplink(deeplinkValue.result.generatedDeepLink);
                }
            }

            generate();
        }
    }, [data, assetA, assetB]);

    const [buyAmountInput, setBuyAmountInput] = useState();
    useEffect(() => {
        setBuyAmountInput(
            <Input
                value={buyAmount ?? 0}
                disabled
                className="mb-3"
            />
        );
    }, [buyAmount]);
   
    const [usr, setUsr] = useState();
    useEffect(() => {
        const unsubscribe = $currentUser.subscribe((value) => {
        setUsr(value);
        });
        return unsubscribe;
    }, [$currentUser]);

    if (!usr || !usr.id || !usr.id.length) {
        return <AccountSelect />;
    }

    let responseContent;
    if (!pools) {
        responseContent = <p>Loading pool data</p>;
    } else if (!assetData) {
        responseContent = <p>asset pool data</p>;
    } else if (!data || !deeplink) {       
        const Row = ({ index, style }) => (
            <SelectItem
                value={pools[index].id} style={style}
            >
                {`${pools[index].id} - ${pools[index].share_asset_symbol} - ${pools[index].asset_a_symbol}:${pools[index].asset_b_symbol}`}
            </SelectItem>
        );

        responseContent = <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => setData(data))}>
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
                                        value={`${$currentUser.get().username} (${$currentUser.get().id})`}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="pool"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Pool</FormLabel>
                                <FormControl onValueChange={(chosenPool) => { setPool(chosenPool) }}>
                                    <Select>
                                        <SelectTrigger className="mb-3">
                                            <SelectValue placeholder="Select a pool.." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            <List
                                                height={150}
                                                itemCount={pools.length}
                                                itemSize={35}
                                                width={500}
                                            >
                                                {Row}
                                            </List>
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {
                        pool
                        ? <>
                            <FormField
                                control={form.control}
                                name="sellAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{`Amount of ${assetA ? assetA.symbol : '???'} to sell:`}</FormLabel>
                                        <FormControl
                                            onChange={(event) => {
                                                const input = event.target.value;
                                                const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                                                if (regex.test(input)) {
                                                    setSellAmount(input);
                                                }
                                            }}
                                        >
                                            <Input
                                                label={`Amount of ${assetA ? assetA.symbol : '???'} to sell`}
                                                value={sellAmount}
                                                placeholder={sellAmount}
                                                className="mb-3"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                        : null
                    }

                    {
                        pool
                            ? <>
                            <FormField
                                control={form.control}
                                name="buyAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{`Amount of ${assetB ? assetB.symbol : '???'} you'll receive:`}</FormLabel>
                                        <FormControl>
                                            { buyAmountInput }
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                            : null
                    }

                    {
                        (!pool || !sellAmount || !buyAmount)
                            ? <Button className="mt-5 mb-3" variant="outline" disabled type="submit">Submit</Button>
                            : <Button className="mt-5 mb-3" variant="outline" type="submit">Submit</Button>
                    }
                </form>
            </Form>
            {
                pool
                    ?   <Button
                            variant="outline"
                            mt="xl"
                            onClick={() => {
                                const oldAssetA = assetA;
                                const oldAssetB = assetB;
                                setAssetA(oldAssetB);
                                setAssetB(oldAssetA);
                            }}
                        >
                            Swap buy/sell
                        </Button>
                    : null
            }
        </>;
    } else {
        responseContent = (
            <>
                <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight">
                    Exchanging {sellAmount} {assetA.symbol} for {buyAmount} {assetB.symbol}
                </h1>
                <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
                    Your requested Bitshares pool exchange operation is ready!
                </h3>
                <Button
                    color="gray"
                    style={{marginRight: "5px"}}
                    onClick={() => {
                        copyToClipboard(JSON.stringify(trxJSON));
                    }}
                    variant="outline"
                >
                    Copy JSON
                </Button>
                
                {
                downloadClicked
                    ? (
                        <Button variant="outline" style={{marginRight: "5px"}} disabled>
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
                        <Button variant="outline" ml="sm" color="gray" style={{marginRight: "5px"}}>
                            Local download
                        </Button>
                    </a>
                    )
                }

                <a href={`rawbeet://api?chain=BTS&request=${deeplink}`}>
                    <Button variant="outline" ml="sm" color="gray" style={{marginBottom: "20px"}}>
                        Beet Deeplink
                    </Button>
                </a>

                <br />

                <Button
                    onClick={() => {
                        setPool();
                        setSellAmount();
                        setBuyAmount();
                        setFoundPool();
                        setAssetA();
                        setAssetB();
                        setData();
                        setTRXJSON();
                    }}
                >
                    Create another pool exchange
                </Button>
            </>
        );
    }

    return (
        <>
          <div className="container mx-auto mt-5 mb-5">
            <div className="grid grid-cols-1 gap-3">
                <Card className="p-2">
                    <CardContent>
                        { responseContent }
                    </CardContent>
                </Card>
            </div>
          </div>
        </>
    );
}