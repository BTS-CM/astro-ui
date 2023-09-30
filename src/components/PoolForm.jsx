import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { FixedSizeList as List } from "react-window";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Card, CardContent } from "@/components/ui/card";

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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { blockchainFloat, copyToClipboard } from "../lib/common";
import { $currentUser, eraseCurrentUser } from "../stores/users.ts";
import AccountSelect from "./AccountSelect.jsx";
import CurrentUser from "./common/CurrentUser.jsx";

export default function PoolForm() {
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const [usr, setUsr] = useState();
  useEffect(() => {
    // Subscribes to the user nanostore state
    const unsubscribe = $currentUser.subscribe((value) => {
      setUsr(value);
    });
    return unsubscribe;
  }, [$currentUser]);

  const [data, setData] = useState(""); // form data container
  const [pool, setPool] = useState(""); // dropdown selected pool

  const [pools, setPools] = useState(); // pools retrieved from api
  const [assetData, setAssetData] = useState(); // assets retrieved from api

  useEffect(() => {
    /**
     * Retrieves the pools from the api
     */
    async function retrieve() {
      const poolResponse = await fetch(
        `http://localhost:8080/cache/pools/${usr.chain}`,
        { method: "GET" }
      );

      if (!poolResponse.ok) {
        console.log({
          error: new Error(`${response.status} ${response.statusText}`),
          msg: "Couldn't generate deeplink.",
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

  useEffect(() => {
    async function parseUrlParams() {
      if (window.location.search) {
        console.log("Parsing url params");
        const urlSearchParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlSearchParams.entries());
        const poolParameter = params && params.pool ? params.pool : null;

        if (!poolParameter || !poolParameter.length) {
          console.log("No pool parameter found");
          setPool("1.19.0");
          return;
        }

        if (poolParameter & !poolParameter.includes("1.9.")) {
          console.log("Invalid pool parameters");
          setPool("1.19.0");
          return;
        }

        const poolIds = pools.map((x) => x.id);
        if (!poolIds.includes(poolParameter)) {
          console.log("Replacing unknown pool with first pool in list");
          setPool("1.19.0");
          return;
        }

        setPool(poolParameter);
      }
    }

    if (pools && pools.length) {
      parseUrlParams();
    }
  }, [pools]);

  useEffect(() => {
    /**
     * Retrieves the assets from the api
     */
    async function retrieve() {
      const assetResponse = await fetch(
        `http://localhost:8080/cache/poolAssets/${usr.chain}`,
        { method: "GET" }
      );

      if (!assetResponse.ok) {
        console.log({
          error: new Error(`${response.status} ${response.statusText}`),
          msg: "Couldn't generate deeplink.",
        });
        return;
      }

      const dataResponse = await assetResponse.json();

      if (dataResponse) {
        setAssetData(dataResponse);
      }
    }

    if (usr && usr.chain) {
      retrieve();
    }
  }, [usr]);

  const [sellAmount, setSellAmount] = useState(0);
  const [buyAmount, setBuyAmount] = useState(0);

  const [foundPool, setFoundPool] = useState();
  const [assetA, setAssetA] = useState("");
  const [assetB, setAssetB] = useState("");
  useEffect(() => {
    // Setting various react states as the user interacts with the form
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
      console.log("Calculating the amount the user can buy");

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
          return Math.min(
            Number(max_market_feea),
            Math.ceil(
              Number(sellAmount) *
                Number(poolamountap) *
                (Number(maker_market_fee_percenta) / 10000)
            )
          );
        }
      }

      function flagsb() {
        if (maker_market_fee_percentb === 0) {
          return 0;
        }
        if (maker_market_fee_percentb > 0) {
          return Math.min(
            Number(max_market_feeb),
            Math.ceil(
              Number(sellAmount) *
                Number(poolamountbp) *
                (Number(maker_market_fee_percentb) / 10000)
            )
          );
        }
      }

      function taker_market_fee_percenta() {
        if (
          typeof taker_fee_percenta == "undefined" &&
          maker_market_fee_percenta > 0
        ) {
          return Number(maker_market_fee_percenta) / 10000;
        }
        if (
          typeof taker_fee_percenta == "undefined" &&
          maker_market_fee_percenta === 0
        ) {
          return 0;
        } else {
          return Number(taker_fee_percenta) / 10000;
        }
      }
      let taker_market_fee_percent_a = Number(taker_market_fee_percenta());

      let result;
      if (assetA.id === foundPool.asset_a_id) {
        let tmp_delta_b =
          Number(poolamountb) -
          Math.ceil(
            (Number(poolamountb) * Number(poolamounta)) /
              (Number(poolamounta) +
                (Number(sellAmount) * Number(poolamountap) - Number(flagsa())))
          );
        let tmp_b = (Number(tmp_delta_b) * Number(taker_fee_percenta)) / 10000;
        result =
          (Number(tmp_delta_b) -
            Math.floor(Number(tmp_b)) -
            Math.ceil(
              Math.min(
                Number(max_market_feeb),
                Math.ceil(
                  Number(tmp_delta_b) * Number(taker_market_fee_percent_a)
                )
              )
            )) /
          Number(poolamountbp);
      } else {
        let tmp_delta_a =
          Number(poolamounta) -
          Math.ceil(
            (Number(poolamounta) * Number(poolamountb)) /
              (Number(poolamountb) +
                (Number(sellAmount) * Number(poolamountbp) - Number(flagsb())))
          );
        let tmp_a = (Number(tmp_delta_a) * Number(taker_fee_percenta)) / 10000;
        result =
          (Number(tmp_delta_a) -
            Math.floor(Number(tmp_a)) -
            Math.ceil(
              Math.min(
                Number(max_market_feea),
                Math.ceil(
                  Number(tmp_delta_a) * Number(taker_market_fee_percent_a)
                )
              )
            )) /
          Number(poolamountap);
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

  const [deeplink, setDeeplink] = useState("");
  const [trxJSON, setTRXJSON] = useState();
  const [deepLinkInProgress, setDeepLinkInProgress] = useState(false);
  useEffect(() => {
    if (data) {
      /**
       * Generates a deeplink for the pool exchange operation
       */
      async function generate() {
        setDeepLinkInProgress(true);
        const opJSON = [
          {
            account: usr.id,
            pool: pool,
            amount_to_sell: {
              amount: blockchainFloat(sellAmount, assetA.precision),
              asset_id: assetA.id,
            },
            min_to_receive: {
              amount: blockchainFloat(buyAmount, assetB.precision),
              asset_id: assetB.id,
            },
            extensions: [],
          },
        ];
        setTRXJSON(opJSON);

        const response = await fetch(
          `http://localhost:8080/api/deeplink/${usr.chain}/liquidity_pool_exchange`,
          {
            method: "POST",
            body: JSON.stringify(opJSON),
          }
        );

        if (!response.ok) {
          console.log({
            error: new Error(`${response.status} ${response.statusText}`),
            msg: "Couldn't generate deeplink.",
          });
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

      generate();
    }
  }, [data, assetA, assetB]);

  const [buyAmountInput, setBuyAmountInput] = useState();
  useEffect(() => {
    setBuyAmountInput(
      <Input value={buyAmount ?? 0} disabled className="mb-3" />
    );
  }, [buyAmount]);

  const [showDialog, setShowDialog] = useState(false);
  const [poolKey, setPoolKey] = useState("default_pool_key");
  useEffect(() => {
    if (pool) {
      window.history.replaceState({}, "", `?pool=${pool}`); // updating the url parameters
    }
    setPoolKey(`pool_key${Date.now()}`);
  }, [pool]);

  if (!usr || !usr.id || !usr.id.length) {
    return <AccountSelect />;
  }

  const Row = ({ index, style }) => {
    const pool = pools[index];
    return (
      <SelectItem value={pool.id} style={style}>
        {`${pool.id} - ${pool.share_asset_symbol} - ${pool.asset_a_symbol}:${pool.asset_b_symbol}`}
      </SelectItem>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card className="p-2">
            <CardContent>
              {!pools ? <p>Loading pool data</p> : null}
              {!assetData ? <p>Loading asset data</p> : null}
              {pools && assetData ? (
                <>
                  <Form {...form}>
                    <form
                      onSubmit={() => {
                        setData(true);
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
                        name="pool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pool</FormLabel>
                            <FormControl
                              onValueChange={(chosenPool) => {
                                setPool(chosenPool);
                              }}
                            >
                              <Select key={poolKey}>
                                <SelectTrigger className="mb-3">
                                  <SelectValue
                                    placeholder={
                                      foundPool
                                        ? `${foundPool.id} - ${foundPool.share_asset_symbol} - ${foundPool.asset_a_symbol}:${foundPool.asset_b_symbol}`
                                        : "Select a pool.."
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  <List
                                    height={150}
                                    itemCount={pools.length}
                                    itemSize={35}
                                    className="w-full"
                                    initialScrollOffset={
                                      pools.map((x) => x.id).indexOf(pool) * 35
                                    }
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

                      {pool ? (
                        <>
                          <FormField
                            control={form.control}
                            name="sellAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{`Amount of ${
                                  assetA ? assetA.symbol : "???"
                                } to sell:`}</FormLabel>
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
                                    label={`Amount of ${
                                      assetA ? assetA.symbol : "???"
                                    } to sell`}
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
                      ) : null}

                      {pool ? (
                        <>
                          <FormField
                            control={form.control}
                            name="buyAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{`Amount of ${
                                  assetB ? assetB.symbol : "???"
                                } you'll receive:`}</FormLabel>
                                <FormControl>{buyAmountInput}</FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : null}

                      {!pool ||
                      !sellAmount ||
                      !buyAmount ||
                      deepLinkInProgress !== false ? (
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
                  {showDialog && data && deeplink && (
                    <Dialog
                      open={showDialog}
                      onOpenChange={(open) => {
                        if (!open) {
                          // Clearing generated deeplink
                          setData("");
                          setDeeplink("");
                          setTRXJSON();
                          // Clearing form data
                          setPool("");
                          setSellAmount(0);
                          setBuyAmount(0);
                          setFoundPool();
                          setAssetA("");
                          setAssetB("");
                          // Clearing keys
                          setPoolKey(`pool_key${Date.now()}`);
                        }
                        setShowDialog(open);
                      }}
                    >
                      <DialogContent className="sm:max-w-[425px] bg-white">
                        <>
                          <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight">
                            Exchanging {sellAmount} {assetA.symbol} for{" "}
                            {buyAmount} {assetB.symbol}
                          </h1>
                          <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
                            Your requested Bitshares pool exchange operation is
                            ready!
                          </h3>
                          <div className="grid grid-cols-1 gap-3">
                            <Button
                              color="gray"
                              className="w-full"
                              onClick={() => {
                                copyToClipboard(JSON.stringify(trxJSON));
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

                            <a
                              href={`rawbeet://api?chain=BTS&request=${deeplink}`}
                            >
                              <Button variant="outline" className="w-full">
                                Trigger raw Beet deeplink
                              </Button>
                            </a>
                          </div>
                        </>
                      </DialogContent>
                    </Dialog>
                  )}
                  {pool && !deepLinkInProgress ? (
                    <Button
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
                  ) : null}
                  {pool && deepLinkInProgress ? (
                    <Button variant="outline" mt="xl" disabled>
                      Swap buy/sell
                    </Button>
                  ) : null}
                  {pool ? (
                    <a
                      href={`https://blocksights.info/#/pools/${pool}${
                        usr.chain !== "bitshares" ? "?network=testnet" : ""
                      }`}
                      target="_blank"
                    >
                      <Button variant="outline" className="ml-2">
                        Blocksights pool explorer
                      </Button>
                    </a>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
      {usr ? (
        <CurrentUser
          usr={usr}
          resetCallback={() => {
            eraseCurrentUser();
            setData("");
            setPool("");
            setPools();
            setAssetData();
            setSellAmount(0);
            setBuyAmount(0);
            setFoundPool();
            setAssetA("");
            setAssetB("");
            setDeeplink("");
            setTRXJSON();
            setDeepLinkInProgress(false);
            setBuyAmountInput();
          }}
        />
      ) : null}
    </>
  );
}
