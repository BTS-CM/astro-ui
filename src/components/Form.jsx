import React, { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { Apis } from 'bitsharesjs-ws';
import { v4 as uuidv4 } from 'uuid';

import TransactionBuilder from "../lib/TransactionBuilder";

import pools from "../data/pools.json";
import assetData from "../data/assetData.json";

const schema = yup
  .object({
    account: yup.string().required(),
    pool: yup.string().required(),
  })
  .required()

/**
 * Returns deeplink contents
 * @param {Array} operations
 * @returns {Object}
 */
async function generateDeepLink(operations) {
    return new Promise(async (resolve, reject) => {
        // eslint-disable-next-line no-unused-expressions
        try {
            await Apis.instance(
                "wss://node.xbts.io/ws",
                true,
                10000,
                { enableCrypto: false, enableOrders: true },
                (error) => console.log(error),
            ).init_promise;
        } catch (error) {
            console.log(error);
            reject(error);
            return;
        }
    
        const tr = new TransactionBuilder();
        for (let i = 0; i < operations.length; i++) {
            tr.add_type_operation("liquidity_pool_exchange", operations[i]);
        }

        try {
            await tr.update_head_block();
        } catch (error) {
            console.error(error);
            reject();
            return;
        }

        try {
            await tr.set_required_fees();
        } catch (error) {
            console.error(error);
            reject(error);
            return;
        }

        try {
            tr.set_expire_seconds(7200);
        } catch (error) {
            console.error(error);
            reject();
            return;
        }

        try {
            tr.finalize();
        } catch (error) {
            console.error(error);
            reject();
            return;
        }

        const request = {
            type: 'api',
            id: await uuidv4(),
            payload: {
            method: 'injectedCall',
            params: [
                "signAndBroadcast",
                JSON.stringify(tr.toObject()),
                [],
            ],
            appName: "Astro_pool_tool",
            chain: "BTS",
            browser: 'vercel_server',
            origin: 'vercel_servers'
            }
        };
    
        let encodedPayload;
        try {
            encodedPayload = encodeURIComponent(
            JSON.stringify(request),
            );
        } catch (error) {
            console.log(error);
            reject();
            return;
        }
    
        resolve(encodedPayload);
    });
}
  
export default function Form() {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        resolver: yupResolver(schema)
    });
    const [data, setData] = useState("");

    const [account, setAccount] = useState("");
    const [pool, setPool] = useState("");

    const poolRows = pools.map((pool) => (
        <option key={pool.id} value={pool.id}>
            {pool.id} - {pool.details.share_asset.symbol} - {pool.details.asset_a.symbol}:{pool.details.asset_b.symbol} 
        </option>
    ));

    const [sellAmount, setSellAmount] = useState(0);
    const [buyAmount, setBuyAmount] = useState(0);

    const [foundPool, setFoundPool] = useState();
    const [assetA, setAssetA] = useState("");
    const [assetB, setAssetB] = useState("");
    useEffect(() => {
        if (pool) {
            const currentPool = pools.find((x) => x.id === pool);
            setFoundPool(currentPool);
            const foundA = assetData.find((x) => x.id === currentPool.asset_a);
            const foundB = assetData.find((x) => x.id === currentPool.asset_b);
            setAssetA(foundA);
            setAssetB(foundB);
            setSellAmount(1);
        }
    }, [pool]);

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
            
            let tmp_delta_a = Number(poolamounta) - Math.ceil(
                Number(poolamounta) * Number(poolamountb) / ( Number(poolamountb) + ( (Number(sellAmount) * Number(poolamountbp)) - Number(flagsb())))
            );
            let tmp_delta_b = Number(poolamountb) - Math.ceil(
                Number(poolamountb) * Number(poolamounta) / ( Number(poolamounta) + ( (Number(sellAmount) * Number(poolamountap)) - Number(flagsa())))
            );
    
            let tmp_a = (Number(tmp_delta_a) * Number(taker_fee_percenta) / 10000);
            let tmp_b = (Number(tmp_delta_b) * Number(taker_fee_percenta) / 10000);
    
            let taker_market_fee_percent_a = (Number(taker_market_fee_percenta()));

            const result = (
                Number(
                    assetA.id === foundPool.asset_a
                    ? tmp_delta_b
                    : tmp_delta_a
                ) -
                Math.floor(
                    Number(
                        assetA.id === foundPool.asset_a
                            ? tmp_b
                            : tmp_a
                    )
                ) -
                Math.ceil(
                  Math.min(
                    Number(
                        assetA.id === foundPool.asset_a
                            ? max_market_feeb
                            : max_market_feea
                    ),
                    Math.ceil(
                        Number(
                            assetA.id === foundPool.asset_a
                                ? tmp_delta_b
                                : tmp_delta_a
                        ) * Number(taker_market_fee_percent_a))
                  )
                )
              ) / Number(
                    assetA.id === foundPool.asset_a
                        ? poolamountbp
                        : poolamountap
                );

            setBuyAmount(result);
        }
    }, [sellAmount, assetA, assetB]);

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
          .then(() => {
            console.log('Text copied to clipboard');
          })
          .catch((error) => {
            console.error('Error copying text to clipboard:', error);
          });
      }

    const [downloadClicked, setDownloadClicked] = useState(false);

    const handleDownloadClick = () => {
        if (!downloadClicked) {
            setDownloadClicked(true);
            setTimeout(() => {
            setDownloadClicked(false);
            }, 10000);
        }
    };

    /**
     * Convert human readable quantity into the token's blockchain representation
     * @param {Float} satoshis
     * @param {Number} precision
     * @returns {Number}
     */
    function blockchainFloat(satoshis, precision) {
        return satoshis * 10 ** precision;
    }

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
                let deeplinkValue;
                try {
                    deeplinkValue = await generateDeepLink(opJSON);
                } catch (error) {
                    console.log(error);
                    return;
                }

                if (deeplinkValue) {
                    setDeeplink(deeplinkValue);
                }
            }

            generate();
        }
    }, [data, assetA, assetB]);

    const [buyAmountInput, setBuyAmountInput] = useState();
    useEffect(() => {
        setBuyAmountInput(
            <input style={{color:'white'}} value={buyAmount ?? 0} disabled />
        );
    }, [buyAmount]);
    
    if (data && deeplink) {
        return (
            <dialog
                open
                style={{
                    marginBottom: "2rem",
                    border: "1px solid rgba(var(--accent-light), 25%)",
                    background: "linear-gradient(rgba(var(--accent-dark), 66%), rgba(var(--accent-dark), 33%))",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    color: "white"
                }}
            >
                <p>Your Bitshares pool exchange is ready!</p>
                <button
                    style={{marginRight: "5px"}}
                    onClick={() => {
                        copyToClipboard(JSON.stringify(trxJSON));
                    }}
                >
                    Copy JSON
                </button>
                
                {
                  downloadClicked
                    ? (
                    <button style={{marginRight: "5px"}} disabled>
                      Downloading...
                    </button>
                    )
                    : (
                    <a
                      href={`data:text/json;charset=utf-8,${deeplink}`}
                      download={`pool_exchange.json`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={handleDownloadClick}
                    >
                      <button style={{marginRight: "5px"}}>
                        Local download
                      </button>
                    </a>
                    )
                }

                <a href={`rawbeet://api?chain=BTS&request=${deeplink}`}>
                    <button
                        style={{marginBottom: "20px"}}
                    >
                        Beet Deeplink
                    </button>
                </a>

                <form method="dialog">
                    <button onClick={() => {
                        setAccount();
                        setPool();
                        setSellAmount();
                        setBuyAmount();
                        setFoundPool();
                        setAssetA();
                        setAssetB();
                        setData();
                        setTRXJSON();
                        reset();
                    }}>
                        Close window
                    </button>
                </form>
            </dialog>
        )
    }

    return (
        <div
            style={{
                marginBottom: "2rem",
                border: "1px solid rgba(var(--accent-light), 25%)",
                background: "linear-gradient(rgba(var(--accent-dark), 66%), rgba(var(--accent-dark), 33%))",
                padding: "1.5rem",
                borderRadius: "8px"
            }}
        >
            <form
                onSubmit={handleSubmit((formData) => {
                    setData(formData);
                })}>
                <label>Account</label>
                <br/>
                <input
                    placeholder="Bitshares account (1.2.x)"
                    {
                        ...register(
                            'account',
                            {
                                required: true,
                                onChange: (event) => {
                                    setAccount(event.target.value);
                                }
                            }
                        )
                    }
                />
                <br/>
                {errors.account && <><span style={{fontSize: "15px", paddingBottom: "10px"}}>Enter your Bitshares account ID to proceed.</span><br/></>}
                <label>Pool</label>
                <br/>
                <select
                    placeholder="Select a pool.."
                    {
                        ...register(
                            "pool",
                            {
                                required: true,
                                onChange: (event) => {
                                    setPool(event.target.value);
                                }
                            }
                        )
                    }
                >
                    <option value="">Select...</option>
                    {
                        poolRows ?? null
                    }
                </select>
                <br/>
                {errors.account && <><span style={{fontSize: "15px", paddingBottom: "10px"}}>Select a pool to proceed.</span><br/></>}
                {
                    account && pool
                    ? <>
                        <label>Amount of {assetA ? assetA.symbol : '???'} to sell</label>
                        <br/>
                        <input
                            placeholder={1}
                            {
                                ...register(
                                    'amount',
                                    {
                                        required: true,
                                        onChange: (event) => {
                                            setSellAmount(Number(event.target.value));
                                        }
                                    }
                                )
                            }
                        />
                    </>
                    : null
                }
                <br/>
                {errors.account && <><span style={{fontSize: "15px", paddingBottom: "10px"}}>Select a pool to proceed.</span><br/></>}
                {
                    account && pool
                    ? <>
                        <label>Amount of {assetB ? assetB.symbol : '???'} you'll receive:</label>
                        <br/>
                        {
                            buyAmountInput
                        }
                    </>
                    : null
                }
                <br/>
                {
                    (errors.account || errors.pool || errors.amount)
                    || (!account || !pool || !sellAmount || !buyAmount)
                        ? <input disabled type="submit" />
                        : <input type="submit" />
                }
            </form>
            <br/>
            {
                account && pool
                    ?   <button
                            onClick={() => {
                                const oldAssetA = assetA;
                                const oldAssetB = assetB;
                                setAssetA(oldAssetB);
                                setAssetB(oldAssetA);
                            }}
                        >
                            Swap buy/sell
                        </button>
                    : null
            }
        </div>
    );
}