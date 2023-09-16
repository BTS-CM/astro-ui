import React, { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { FixedSizeList as List } from 'react-window';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
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
} from "@/components/ui/form"

import { blockchainFloat, copyToClipboard } from "../lib/common";

export default function PoolForm() {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const [data, setData] = useState(""); // form data container
    const [account, setAccount] = useState(""); // text input account id
    const [pool, setPool] = useState(""); // dropdown selected pool

    const [pools, setPools] = useState(); // pools retrieved from api
    const [assetData, setAssetData] = useState(); // assets retrieved from api

    useEffect(() => {
        async function retrieve() {
            console.log("Triggered 2")
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
        console.log("Triggered 1")

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
                        "account": account,
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

                const response = await fetch(`http://localhost:8080/beet/${chain}/liquidity_pool_exchange`, {
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
                label={`Amount of ${assetB ? assetB.symbol : '???'} you'll receive:`}
                value={buyAmount ?? 0}
                disabled
                className="mb-3"
            />
        );
    }, [buyAmount]);
   
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
            <form onSubmit={handleSubmit((data) => setData(formData))}>
                <Input
                    label="Account"
                    placeholder="Bitshares account (1.2.x)"
                    value={account}
                    onChange={(event) => {
                        setAccount(event.target.value);
                    }}
                    className="mb-3 mt-3"
                />

                <Select onValueChange={setPool}>
                    <SelectTrigger className="mb-3">
                        <SelectValue placeholder="Theme" />
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

                {
                    account && pool
                    ? <>
                        <Input
                            label={`Amount of ${assetA ? assetA.symbol : '???'} to sell`}
                            value={sellAmount}
                            placeholder={1}
                            onChange={(event) => setSellAmount(event.target.value)}
                            className="mb-3"
                        />
                    </>
                    : null
                }
                {
                    account && pool
                        ? buyAmountInput
                        : null
                }
                {
                    (!account || !pool || !sellAmount || !buyAmount)
                        ? <Button className="mt-5" variant="destructive" type="submit">Submit</Button>
                        : <Button className="mt-5" variant="destructive" type="submit">Submit</Button>
                }
            </form>
            {
                account && pool
                    ?   <Button
                            variant="secondary"
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
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                    Exchanging {sellAmount} {assetA.symbol} for {buyAmount} {assetB.symbol}
                </h1>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-3 mt-1">
                    Your requested Bitshares pool exchange operation is ready!
                </h3>
                <Button
                    color="gray"
                    style={{marginRight: "5px"}}
                    onClick={() => {
                        copyToClipboard(JSON.stringify(trxJSON));
                    }}
                    variant="secondary"
                >
                    Copy JSON
                </Button>
                
                {
                downloadClicked
                    ? (
                        <Button variant="secondary" style={{marginRight: "5px"}} disabled>
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
                        <Button variant="secondary" ml="sm" color="gray" style={{marginRight: "5px"}}>
                            Local download
                        </Button>
                    </a>
                    )
                }

                <a href={`rawbeet://api?chain=BTS&request=${deeplink}`}>
                    <Button variant="secondary" ml="sm" color="gray" style={{marginBottom: "20px"}}>
                        Beet Deeplink
                    </Button>
                </a>

                <br />

                <Button
                    variant="secondary"
                    onClick={() => {
                        setAccount();
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
                    Go back
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