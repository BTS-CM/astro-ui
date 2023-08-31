import React, { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"

import pools from "../data/pools.json";
import assetData from "../data/matchingData.json";

const schema = yup
  .object({
    account: yup.string().required(),
    pool: yup.string().required(),
  })
  .required()

export default function Form() {
    const {
        register,
        handleSubmit,
        formState: { errors },
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

    const [assetA, setAssetA] = useState("");
    const [assetB, setAssetB] = useState("");
    useEffect(() => {
        if (pool) {
            const currentPool = pools.find((x) => x.id === pool);
            const foundA = assetData.find((x) => x.id === currentPool.asset_a);
            const foundB = assetData.find((x) => x.id === currentPool.asset_b);
            setAssetA(foundA);
            setAssetB(foundB);
            setSellAmount(1);
        }
    }, [pool]);

    useEffect(() => {
        // Calculating the amount the user can buy
        if (assetA && assetB) {
            let poolamounta = Number(pool.balance_a);
            let poolamountap = Number(10 ** assetA.precision);

            let poolamountb = Number(pool.balance_b);
            let poolamountbp = Number(10 ** assetB.precision);
    
            const maker_market_fee_percenta = assetA.market_fee_percent;
            const maker_market_fee_percentb = assetB.market_fee_percent;
    
            const max_market_feea = assetA.max_market_fee;
            const max_market_feeb = assetB.max_market_fee;
    
            const taker_fee_percenta = pool.taker_fee_percent;
    
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
                    return Math.min(Number(max_market_feeb), Math.ceil((Number(sellAmount) * Number(poolamountbp)) * (Number(maker_market_fee_percentb) / 10000)))
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
    
            let tmp_b = (Number(tmp_delta_b) * Number(pool.get("taker_fee_percent")) / 10000);
    
            let taker_market_fee_percent_a = (Number(taker_market_fee_percenta()));
        
            setBuyAmount(
                (Number(tmp_delta_b) - Math.floor(Number(tmp_b)) - Math.ceil(Math.min(
                  Number(max_market_feeb),
                  Math.ceil(Math.ceil(Number(tmp_delta_b) * Number(taker_market_fee_percent_a)))
                ))) / Number(poolamountbp)
            );

        }
    }, [sellAmount, assetA, assetB]);

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
            <form onSubmit={handleSubmit((formData) => setData(formData))}>
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
                        <input style={{color:'white'}} value={buyAmount ?? 0} disabled />
                    </>
                    : null
                }
                <br/>
                {
                    (errors.account || errors.pool || errors.amount)
                    || (!account || !pool || !sellAmount)
                        ? <input disabled type="submit" />
                        : <input type="submit" />
                }
            </form>
        </div>
    );
}