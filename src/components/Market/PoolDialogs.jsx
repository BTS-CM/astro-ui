import React, { useState, useEffect } from "react";
import { FixedSizeList as List } from 'react-window';

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { $currentUser, eraseCurrentUser } from '../../stores/users.ts'

export default function PoolDialogs(properties) {
    const {
        assetA,
        assetB,
        assetAData,
        assetBData
    } = properties;

    const [usr, setUsr] = useState();
    useEffect(() => {
        const unsubscribe = $currentUser.subscribe((value) => {
          setUsr(value);
        });
        return unsubscribe;
    }, [$currentUser]);

    const [pools, setPools] = useState(); // pools retrieved from api
    useEffect(() => {
        /**
         * Retrieves the pools from the api
         */
        async function retrieve() {
            const poolResponse = await fetch(`http://localhost:8080/cache/pools/${usr.chain}`, { method: "GET" });
  
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
  
        if (usr && usr.chain) {
            retrieve();
        }
    }, [usr]);

    const [assetAPools, setAssetAPools] = useState();
    const [assetBPools, setAssetBPools] = useState();
    const [assetMarketPools, setAssetMarketPools] = useState();

    useEffect(() => {
        function fetchAssetAPools() {
            console.log("Fetching asset A pools")
            const foundPools = pools.filter((pool) => pool.asset_a_symbol === assetA || pool.asset_b_symbol === assetA);
            setAssetAPools(foundPools);
        }
        if (pools && assetA) {
          fetchAssetAPools();   
        }
    }, [pools, assetA]);
    
    useEffect(() => {
        function fetchAssetBPools() {
            console.log("Fetching asset B pools")
            const foundPools = pools.filter((pool) => pool.asset_a_symbol === assetB || pool.asset_b_symbol === assetB);
            setAssetBPools(foundPools);
        }

        if (pools && assetB) {
            fetchAssetBPools();
        }
    }, [pools, assetB]);

    useEffect(() => {
        function fetchAssetMarketPools() {
            // Searching for market matching pools
            console.log("Fetching asset market pools")
            const foundPools = pools.filter(
                (pool) =>
                (pool.asset_a_symbol === assetA && pool.asset_b_symbol === assetB) ||
                (pool.asset_a_symbol === assetB && pool.asset_b_symbol === assetA)
            );
            setAssetMarketPools(
                foundPools && foundPools.length
                ? foundPools
                : []
            );
        }
        
        if (pools && assetA && assetB) {
            fetchAssetMarketPools();
        }
    }, [pools, assetA, assetB]);

    function RowHyperlink({ 
        id,
        share_asset_symbol,
        asset_a_symbol,
        asset_b_symbol
     }) {
        return (
            <div className="grid grid-cols-10">
                <div className="col-span-1">
                    <p>{id}</p>
                </div>
                <div className="col-span-3">
                    <p>{share_asset_symbol}</p>
                </div>
                <div className="col-span-3">
                    <p>{asset_a_symbol}</p>
                </div>
                <div className="col-span-3">
                    <p>{asset_b_symbol}</p>
                </div>
            </div>
        )
    }

    const PoolRowA = ({ index, style }) => {
        const pool = assetAPools[index];
        return (
            <a
                style={style}
                href={`/pool/index.html?pool=${pool.id}`}
                key={`a_${pool.id}`}
            >
                <RowHyperlink
                    id={pool.id}
                    share_asset_symbol={pool.share_asset_symbol}
                    asset_a_symbol={pool.asset_a_symbol}
                    asset_b_symbol={pool.asset_b_symbol}
                />
            </a>
        );
    };

    const PoolRowB = ({ index, style }) => {
        const pool = assetBPools[index];
        return (
            <a
                style={style}
                href={`/pool/index.html?pool=${pool.id}`}
                key={`a_${pool.id}`}
            >
                <RowHyperlink
                    id={pool.id}
                    share_asset_symbol={pool.share_asset_symbol}
                    asset_a_symbol={pool.asset_a_symbol}
                    asset_b_symbol={pool.asset_b_symbol}
                />
            </a>
        );
    };

    const PoolRowMarket = ({ index, style }) => {
        const pool = assetMarketPools[index];
        return (
            <a
                style={style}
                href={`/pool/index.html?pool=${pool.id}`}
                key={`a_${pool.id}`}
            >
                <RowHyperlink
                    id={pool.id}
                    share_asset_symbol={pool.share_asset_symbol}
                    asset_a_symbol={pool.asset_a_symbol}
                    asset_b_symbol={pool.asset_b_symbol}
                />
            </a>
        );
    };

    function PoolDialog({ 
        title,
        poolArray,
        dialogTitle,
        dialogDescription,
        type
     }) {
        if (!poolArray) {
            return (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>
                            {title}
                        </CardTitle>
                        <CardDescription>
                            loading...
                        </CardDescription>
                    </CardHeader>
                </Card>
            );
        }
        if (!poolArray.length) {
            return (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>
                            {title}
                        </CardTitle>
                        <CardDescription>
                            0 pools found
                        </CardDescription>
                    </CardHeader>
                </Card>
            );
        }

        let PoolRow;
        if (type === "A") {
            PoolRow = PoolRowA;
        } else if (type === "B") {
            PoolRow = PoolRowB;
        } else {
            PoolRow = PoolRowMarket;
        }

        return (
            <Dialog>
                <DialogTrigger asChild>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>
                                {title}
                            </CardTitle>
                            <CardDescription>
                                {poolArray && poolArray.length} pools found
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] bg-white">
                  <DialogHeader>
                    <DialogTitle>
                      {dialogTitle}
                    </DialogTitle>
                    <DialogDescription>
                      {dialogDescription}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1">
                    <div className="grid grid-cols-10">
                        <div className="col-span-1">
                            id
                        </div>
                        <div className="col-span-3">
                            Share asset
                        </div>
                        <div className="col-span-3">
                            Asset A
                        </div>
                        <div className="col-span-3">
                            Asset B
                        </div>
                    </div>
                        <List
                            height={300}
                            itemCount={poolArray.length}
                            itemSize={35}
                            className="w-full"
                        >
                            {PoolRow}
                        </List>
                  </div>
                </DialogContent>
            </Dialog>
        );
    }  

    return (
        <div className="grid grid-cols-3 gap-5 mt-5">
            <PoolDialog
                title={`${assetA && assetA.length < 12 ? assetA : assetAData.id} Pools`}
                poolArray={assetAPools}
                dialogTitle={`${assetA} Pools`}
                dialogDescription={`These Bitshares pools use ${assetA} (${assetAData.id}) as one of the assets.`}
                type="A"
            />
            <PoolDialog
                title={`Market Pools`}
                poolArray={assetMarketPools}
                dialogTitle={`${assetA} Pools`}
                dialogDescription={`Theese pools trade between ${assetA} and ${assetB}.`}
                type="Market"
            />
            <PoolDialog
                title={`${assetB && assetB.length < 12 ? assetB : assetBData.id} Pools`}
                poolArray={assetBPools}
                dialogTitle={`${assetB} Pools`}
                dialogDescription={`These Bitshares pools use ${assetB} (${assetBData.id})  as one of the assets.`}
                type="B"
            />
        </div>
    )
}