import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { useStore } from "@nanostores/react";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useForm, Controller } from "react-hook-form";
import { List } from "react-window";

import {
  humanReadableFloat,
  trimPrice,
  isInvertedMarket,
  blockchainFloat,
  copyToClipboard,
  assetAmountRegex,
} from "@/lib/common";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createAssetFromSymbolStore } from "@/nanoeffects/Assets.ts";
import { createMarketOrderStore } from "@/nanoeffects/MarketOrderBook.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldContent,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";

import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

export default function InstantTrade(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  const {
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    async function fetchUserBalances() {
      if (!(usr && usr.id && currentNode && assets && assets.length)) {
        setBalances([]);
        return;
      }

      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = data.filter((balance) =>
            assets.find((x) => x.id === balance.asset_id)
          );
          setBalances(filteredData);
        }
      });
    }

    fetchUserBalances();
  }, [usr, assets, currentNode, balanceCounter]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [limitOrderFee, setLimitOrderFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.parameters) {
      const foundFee = globalParams.find((x) => x.id === 1);
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setLimitOrderFee(finalFee);
    }
  }, [globalParams]);

  // End of init

  const searchSymbols = useMemo(
    () => marketSearch.map((asset) => asset.s),
    [marketSearch]
  );

  const searchIds = useMemo(
    () => marketSearch.map((asset) => asset.id),
    [marketSearch]
  );

  const [assetA, setAssetA] = useState(!window.location.search ? "CNY" : null);
  const [assetB, setAssetB] = useState(!window.location.search ? "BTS" : null);

  useEffect(() => {
    async function parseUrlAssets() {
      //console.log("Parsing market parameters");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const market = params.market;

      let finalAssetA = assetA;
      let finalAssetB = assetB;

      if (!market || !market.length) {
        console.log("No market parameters found.");
        finalAssetA = "1.3.0";
        finalAssetB = "CNY";
      } else {
        let asset_a = market.split("_")[0].toUpperCase();
        let asset_b = market.split("_")[1].toUpperCase();

        if (asset_a && asset_b && asset_b.length && asset_a === asset_b) {
          // Avoid invalid duplicate asset market pairs
          asset_b = asset_a === "BTS" ? "CNY" : "1.3.0";
          console.log("Invalid market parameters - replaced quote asset.");
        }

        if (
          !asset_a ||
          !asset_a.length ||
          (!searchSymbols.includes(asset_a) && !searchIds.includes(asset_a))
        ) {
          console.log("Asset A replaced with default.");
          finalAssetA = "1.3.0";
        }

        if (!finalAssetA) {
          const foundAssetA = marketSearch.find(
            (asset) => asset.id === asset_a || asset.s === asset_a
          );
          if (foundAssetA) {
            //console.log("Setting asset A.");
            finalAssetA = foundAssetA.s;
          } else {
            console.log("Setting default asset A");
            finalAssetA = "1.3.0";
          }
        }

        if (
          !asset_b ||
          !asset_b.length ||
          (!searchSymbols.includes(asset_b) && !searchIds.includes(asset_b))
        ) {
          console.log("Asset B replaced with default.");
          finalAssetB = finalAssetA !== "CNY" ? "CNY" : "1.3.0";
        }

        if (!finalAssetB) {
          const foundAssetB = marketSearch.find(
            (asset) => asset.id === asset_b || asset.s === asset_b
          );
          if (foundAssetB) {
            finalAssetB = foundAssetB.s;
          } else {
            console.log("Setting default asset B");
            finalAssetB =
              asset_a !== "BTS" && asset_a !== "1.3.0" ? "1.3.0" : "CNY";
          }
        }
      }

      return { finalAssetA, finalAssetB };
    }

    if (marketSearch && marketSearch.length && window.location.search) {
      parseUrlAssets().then(({ finalAssetA, finalAssetB }) => {
        setAssetA(finalAssetA);
        setAssetB(finalAssetB);
      });
    }
  }, [marketSearch]);

  const [assetAData, setAssetAData] = useState(null);
  const [assetBData, setAssetBData] = useState(null);

  const [orderType, setOrderType] = useState("buy"); // buy or sell

  const [assetADetails, setAssetADetails] = useState(null);
  const [assetBDetails, setAssetBDetails] = useState(null);
  const [aBitassetData, setABitassetData] = useState(null);
  const [bBitassetData, setBBitassetData] = useState(null);

  function _resetA() {
    setAssetAData(null);
    setAssetADetails(null);
    setABitassetData(null);
  }

  function _resetB() {
    setAssetBData(null);
    setAssetBDetails(null);
    setBBitassetData(null);
  }

  useEffect(() => {
    if (usr && usr.chain && assets && assets.length && assetA) {
      _resetA();

      const assetSymbolStore = createAssetFromSymbolStore([usr.chain, assetA]);
      assetSymbolStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          console.log("Retrieved asset A from API");
          const extra = data.extra;
          if (extra && extra.length) {
            setAssetADetails(extra[0]);
            if (extra.length > 1) {
              setABitassetData(extra[1]);
            }
          }
          setAssetAData(data.assetData);
        }
      });
    }
  }, [assets, assetA, usr]);

  useEffect(() => {
    if (usr && usr.chain && assets && assets.length && assetB) {
      _resetB();

      const assetSymbolStore = createAssetFromSymbolStore([usr.chain, assetB]);
      assetSymbolStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          console.log("Retrieved asset B from API");
          const extra = data.extra;
          if (extra && extra.length) {
            setAssetBDetails(extra[0]);
            if (extra.length > 1) {
              setBBitassetData(extra[1]);
            }
          }
          setAssetBData(data.assetData);
        }
      });
    }
  }, [assets, assetB, usr]);

  const [usrBalances, setUsrBalances] = useState(null);
  useEffect(() => {
    async function fetchUsrBalances() {
      if (usr && usr.id) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setUsrBalances(filteredData);
          }
        });
      }
    }

    fetchUsrBalances();
  }, [usr]);

  const invertedMarket = useMemo(() => {
    if (!assetAData || !assetBData) {
      return;
    }
    return isInvertedMarket(assetAData.id, assetBData.id);
  }, [assetAData, assetBData]);

  const [buyOrders, setBuyOrders] = useState(null);
  //const [sellOrders, setSellOrders] = useState(null);

  useEffect(() => {
    async function fetchMarketOrders() {
      const marketOrdersStore = createMarketOrderStore([
        usr.chain,
        assetA,
        assetB,
        50,
      ]);

      marketOrdersStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBuyOrders(data.bids);

          console.log({
            bids: data.bids,
            asks: data.asks,
          });
        } else {
          setBuyOrders(null);
        }
      });
    }

    if (usr && assetA && assetB) {
      fetchMarketOrders();
    }
  }, [usr, assetA, assetB]);

  const [clicked, setClicked] = useState(false);
  const [amountA, setAmountA] = useState(0.0);
  const [amountB, setAmountB] = useState(0.0);
  const [price, setPrice] = useState(0.0);
  const [total, setTotal] = useState(0);

  const marketFees = useMemo(() => {
    let calculatedMarketFee = 0.0;

    if (amountA && price && total) {
      if (
        assetAData &&
        assetAData.market_fee_percent &&
        assetAData.market_fee_percent > 0
      ) {
        calculatedMarketFee =
          parseFloat(amountA) * (assetAData.market_fee_percent / 100);
        return calculatedMarketFee.toFixed(assetAData.precision);
      }
    }

    return calculatedMarketFee;
  }, [amountA, price, total, assetAData]);

  const [expiryType, setExpiryType] = useState("fkill");
  const [expiry, setExpiry] = useState(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });

  const [date, setDate] = useState(
    new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
  );

  const form = useForm({
    defaultValues: {
      priceAmount: 0.0,
      sellAmount: 0.0,
      sellTotal: 0,
      expiry: "fkill",
      fee: 0,
      marketFees: 0,
    },
  });

  const [showDialog, setShowDialog] = useState(false);

  function getReadableBalance(assetData, balances) {
    const id = assetData.id;
    const foundBalance = balances.find((x) => x.asset_id === id);
    return foundBalance
      ? humanReadableFloat(
          foundBalance.amount,
          assetData.precision
        ).toLocaleString(undefined, {
          minimumFractionDigits: assetData.precision,
        })
      : 0;
  }

  const assetABalance = useMemo(() => {
    return assetAData && usrBalances
      ? getReadableBalance(assetAData, usrBalances)
      : 0;
  }, [assetAData, usrBalances]);

  const assetBBalance = useMemo(() => {
    return assetBData && usrBalances
      ? getReadableBalance(assetBData, usrBalances)
      : 0;
  }, [assetBData, usrBalances]);

  const [inputChars, setInputChars] = useState(0);
  useEffect(() => {
    if (inputChars > 0) {
      let finalUrlParams = `?market=${assetA}_${assetB}`;

      window.history.replaceState({}, "", finalUrlParams);
    }
  }, [assetA, assetB]);

  const trxJSON = useMemo(() => {
    // TODO: process limit orders which match multiple open market orders
    if (!usr || !usr.id || !assetAData || !assetBData || !marketSearch) {
      return null;
    }

    return [
      {
        seller: usr.id,
        amount_to_sell: {
          amount: blockchainFloat(amountA, assetAData.precision).toFixed(0),
          asset_id: marketSearch.find((asset) => asset.s === assetA).id,
        },
        min_to_receive: {
          amount: blockchainFloat(amountB, assetBData.precision).toFixed(0),
          asset_id: marketSearch.find((asset) => asset.s === assetB).id,
        },
        expiration: date,
        fill_or_kill: true,
        extensions: {},
      },
    ];
  }, [
    usr,
    total,
    assetBData,
    assetB,
    amountA,
    amountB,
    assetAData,
    assetA,
    date,
    marketSearch,
  ]);

  const [buyOrderDetails, setBuyOrderDetails] = useState(null);
  useEffect(() => {
    async function fetching() {
      const _store = createObjectStore([
        _chain,
        JSON.stringify(buyOrders.map((x) => x.id)),
        currentNode ? currentNode.url : null,
      ]);

      _store.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          if (!data.length) {
            return;
          }
          console.log({ aaaaaa: data });
          setBuyOrderDetails(data);
        }
      });
    }

    if (_chain && currentNode && buyOrders && buyOrders.length) {
      fetching();
    }
  }, [currentNode, _chain, buyOrders]);

  const maxPurchaseable = useMemo(() => {
    if (buyOrders && buyOrders.length && assetBData) {
      const totalBase = buyOrders
        .map((x) => parseFloat(x.base))
        .reduce((acc, curr) => acc + curr, 0)
        .toFixed(assetBData.precision);
      return totalBase;
    }
  }, [buyOrders, assetBData]);

  if (
    !usr ||
    !usr.chain ||
    !assetA ||
    !assetB ||
    !assetAData ||
    !assetADetails ||
    !assetBData ||
    !assetBDetails
  ) {
    return (
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3 text-center">
          <p>{t("MarketPlaceholder:loadingAssetDescription")}</p>
        </div>
      </div>
    );
  }

  const Row = ({ index, style }) => {
    const order = buyOrders[index];

    const orderDetails =
      buyOrderDetails && buyOrderDetails.length
        ? buyOrderDetails.find((x) => x.id === order.id)
        : null;

    const price = parseFloat(order.price).toFixed(assetBData.precision);
    const base = parseFloat(order.base);
    const quote = parseFloat(order.quote);

    const totalBase = buyOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.base))
      .reduce((acc, curr) => acc + curr, 0)
      .toFixed(assetBData.precision);

    return (
      <div style={style}>
        <div className="grid grid-cols-6 text-sm hover:bg-gray-400">
          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Badge
                  variant="secondary"
                  className="h-4 min-w-4 rounded-full px-1 font-mono tabular-nums"
                >
                  {order.id}
                </Badge>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] bg-white">
                <DialogHeader>
                  <DialogTitle>Limit Order Contents</DialogTitle>
                  <DialogDescription>
                    These are the underlying details of this individual limit
                    order on the order book.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1">
                  <div className="col-span-1">
                    <ScrollArea className="h-72 rounded-md border">
                      <pre>
                        {JSON.stringify([order, orderDetails], null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                  <div className="col-span-2 mt-3">
                    <Button
                      variant="outline"
                      className="mr-2"
                      onClick={() => {
                        copyToClipboard(
                          JSON.stringify([order, orderDetails], null, 4)
                        );
                      }}
                    >
                      {t("DeepLinkDialog:tabsContent.copyOperationJSON")}
                    </Button>
                    <ExternalLink
                      type="button"
                      text={order.id}
                      hyperlink={`https://explorer.bitshares.ws/#/objects/${
                        order.id
                      }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div>
            <ExternalLink
              classnamecontents="hover:text-purple-500"
              type="text"
              text={order.owner_name}
              hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                order.owner_name
              }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
            />
          </div>
          <div>
            {orderDetails && orderDetails.on_fill.length ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-4 rounded-full px-1 font-mono tabular-nums"
                  >
                    ✔️
                  </Badge>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] bg-white">
                  <DialogHeader>
                    <DialogTitle>On Fill Operation Details</DialogTitle>
                    <DialogDescription>
                      This limit order in the order book has an "on fill"
                      condition, which may repeat this order at or near its
                      current price once purchased.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1">
                    <div className="col-span-1">
                      <ScrollArea className="h-72 rounded-md border">
                        <pre>
                          {JSON.stringify(orderDetails.on_fill, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                    <div className="col-span-1 mt-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          copyToClipboard(
                            JSON.stringify(orderDetails.on_fill, null, 4)
                          );
                        }}
                      >
                        {t("DeepLinkDialog:tabsContent.copyOperationJSON")}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
          <div className="col-span-1 pl-3 font-mono text-right tabular-nums">
            {quote.toFixed(assetAData.precision)}
          </div>
          <div className="col-span-1 pl-3 font-mono text-right tabular-nums">
            {price}
          </div>
          <div className="col-span-1 pl-3 font-mono text-right tabular-nums">
            {totalBase}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-2 md:grid-cols-1 gap-5">
        <Card>
          <CardHeader className="pt-2 pb-2">
            <CardTitle className="text-lg">
              {usr.chain === "bitshares"
                ? "Bitshares "
                : "Bitshares (Testnet) "}
              Instant Trade
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-3 gap-1">
              <AssetDropDown
                assetSymbol={assetB}
                assetData={assetBData}
                storeCallback={setAssetB}
                otherAsset={assetA}
                marketSearch={marketSearch}
                type={"quote"}
                size="small"
                chain={usr.chain}
                balances={balances}
              />

              <a
                style={{ lineHeight: 1 }}
                href={`/instant_trade/index.html?market=${assetB}_${assetA}`}
                onClick={() => setClicked(true)}
              >
                <Button variant="outline" className="w-full h-7">
                  {clicked ? (
                    <ReloadIcon className="animate-spin" />
                  ) : (
                    <ReloadIcon />
                  )}
                </Button>
              </a>

              <AssetDropDown
                assetSymbol={assetA}
                assetData={assetAData}
                storeCallback={setAssetA}
                otherAsset={assetB}
                marketSearch={marketSearch}
                type={"base"}
                size="small"
                chain={usr.chain}
                balances={balances}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {t("LimitOrderCard:buyingWith", {
                assetA: assetB,
                assetB: assetA,
              })}
            </CardTitle>
            <CardDescription>
              Enter how much {assetB} you want by selling {assetA}, you will be
              matched with existing bid orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assetA && assetB && marketSearch && assetAData && assetBData ? (
              <form onSubmit={form.handleSubmit(() => setShowDialog(true))}>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Controller
                      name="sellAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          invalid={fieldState.invalid}
                          className="mt-4 text-xs"
                        >
                          <FieldLabel>
                            {t("LimitOrderCard:sellAmount.sellDescription", {
                              asset: assetA,
                            })}
                          </FieldLabel>

                          <Input
                            placeholder={amountA}
                            className="mb-2 mt-1"
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = assetAmountRegex(assetAData);
                              if (input && input.length && regex.test(input)) {
                                const parsedInput = parseFloat(
                                  input.replaceAll(",", "")
                                );
                                if (parsedInput) {
                                  setAmountA(
                                    parsedInput.toFixed(assetAData.precision)
                                  );
                                  setInputChars(inputChars + 1);
                                }
                              }
                            }}
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      name="buyAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          invalid={fieldState.invalid}
                          className="mt-4 text-xs"
                        >
                          <FieldLabel>
                            {t("LimitOrderCard:sellAmount.sellDescription", {
                              asset: assetB,
                            })}
                          </FieldLabel>
                          <Input
                            {...field}
                            label={`Buy Amount`}
                            placeholder={amountB}
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = assetAmountRegex(assetBData);
                              if (input && input.length && regex.test(input)) {
                                const parsedInput = parseFloat(
                                  input.replaceAll(",", "")
                                );
                                if (parsedInput) {
                                  setAmountB(
                                    parsedInput.toFixed(assetBData.precision)
                                  );
                                  setInputChars(inputChars + 1);
                                }
                              }
                            }}
                          />
                        </Field>
                      )}
                    />
                  </div>

                  {/*
                      <Controller
                      name="fee"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid} disabled>
                          <FieldLabel>
                            {t("LimitOrderCard:fee.label")}
                          </FieldLabel>
                          <FieldDescription>
                            {t("LimitOrderCard:fee.description")}
                          </FieldDescription>
                          <Input
                            {...field}
                            disabled
                            label={t("LimitOrderCard:fee.label")}
                            value={`${fee} BTS`}
                            placeholder={1}
                          />
                          {expiryType === "fkill" || usr.id === usr.referrer ? (
                            <FieldError>
                              {expiryType === "fkill"
                                ? t("LimitOrderCard:fee.unfilledRebate", {
                                    fee,
                                  })
                                : null}
                              <br />
                              {usr.id === usr.referrer
                                ? t("LimitOrderCard:fee.ltmRebate", {
                                    rebate: 0.8 * fee,
                                  })
                                : null}
                            </FieldError>
                          ) : null}
                        </Field>
                      )}
                    />
                    */}

                  {orderType === "buy" &&
                  assetAData &&
                  assetAData.market_fee_percent &&
                  assetAData.market_fee_percent > 0 ? (
                    <Controller
                      name="marketFees"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid} disabled>
                          <FieldLabel>
                            {t("LimitOrderCard:marketFees.label")}
                          </FieldLabel>
                          <Input
                            {...field}
                            disabled
                            value={`${marketFees} ${assetAData.symbol}`}
                            placeholder={`${marketFees} ${assetAData.symbol}`}
                          />
                          <FieldDescription>
                            {t("LimitOrderCard:marketFees.description")}
                          </FieldDescription>
                        </Field>
                      )}
                    />
                  ) : null}
                  {!amountA || !amountB || !price || !expiry ? (
                    <Button
                      className="mt-7 mb-1"
                      variant="outline"
                      disabled
                      type="submit"
                    >
                      {t("LimitOrderCard:submit")}
                    </Button>
                  ) : (
                    <Button
                      className="mt-7 mb-1"
                      variant="outline"
                      type="submit"
                    >
                      {t("LimitOrderCard:submit")}
                    </Button>
                  )}
                </FieldGroup>
              </form>
            ) : null}
          </CardContent>

          <Card>
            <CardHeader>
              <CardTitle>
                {t("MarketOrderCard:openBuyLimitOrdersTitle")}
              </CardTitle>
              <CardDescription>
                {t("MarketOrderCard:buyLimitOrdersDescription", {
                  assetA: assetB,
                  assetB: assetA,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {buyOrders && buyOrders.length ? (
                <>
                  <div className="grid grid-cols-6">
                    <div>ID</div>
                    <div>Seller</div>
                    <div>On Repeat?</div>
                    <div className="col-span-1 pl-3 text-right pr-2">
                      Amount {assetA}
                    </div>
                    <div className="col-span-1 pl-3 text-md text-right pr-2">
                      Price {assetB}/{assetA}
                    </div>
                    <div className="col-span-1 pl-3 text-md text-right pr-2">
                      Total {assetB}
                    </div>
                  </div>
                  <div className="h-[300px] overflow-hidden">
                    {buyOrders && buyOrderDetails ? (
                      <List
                        height={300}
                        rowComponent={Row}
                        rowCount={buyOrders.length}
                        rowHeight={20}
                        rowProps={{}}
                      />
                    ) : (
                      <div className="flex items-center">
                        <Spinner className="size-8" />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                t("MarketOrderCard:noOpenOrders")
              )}
            </CardContent>
          </Card>

          {showDialog ? (
            <DeepLinkDialog
              operationNames={["limit_order_create"]}
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setShowDialog}
              key={`Buying${amountA}${assetA}for${total}${assetB}`}
              headerText={t("LimitOrderCard:headerText.buying", {
                amountA,
                assetA,
                amountB,
                assetB,
              })}
              trxJSON={trxJSON}
            />
          ) : null}
        </Card>
      </div>
    </div>
  );
}
