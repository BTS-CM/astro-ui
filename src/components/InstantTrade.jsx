import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { useStore } from "@nanostores/react";
import { ReloadIcon, ResetIcon } from "@radix-ui/react-icons";
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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

  /*
  const invertedMarket = useMemo(() => {
    if (!assetAData || !assetBData) {
      return;
    }
    return isInvertedMarket(assetAData.id, assetBData.id);
  }, [assetAData, assetBData]);
  */

  const [buyOrders, setBuyOrders] = useState(null);
  const [buyOrderIterator, setBuyOrderIterator] = useState(0);
  const [updatingMarket, setUpdatingMarket] = useState(false);
  const [marketTimestamp, setMarketTimestamp] = useState(null);

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
        } else {
          setBuyOrders(null);
        }
        setUpdatingMarket(false);
        setMarketTimestamp(new Date());
      });
    }

    if (usr && assetA && assetB) {
      fetchMarketOrders();
      setUpdatingMarket(true);
    }
  }, [usr, assetA, assetB, buyOrderIterator]);

  const maxPurchaseable = useMemo(() => {
    if (buyOrders && buyOrders.length && assetBData) {
      const totalBase = buyOrders
        .map((x) => parseFloat(x.base))
        .reduce((acc, curr) => acc + curr, 0)
        .toFixed(assetBData.precision);
      return totalBase;
    }
  }, [buyOrders, assetBData]);

  const maxSellable = useMemo(() => {
    if (buyOrders && buyOrders.length && assetAData) {
      const totalQuote = buyOrders
        .map((x) => parseFloat(x.quote))
        .reduce((acc, curr) => acc + curr, 0)
        .toFixed(assetAData.precision);
      return totalQuote;
    }
  }, [buyOrders, assetAData]);

  const [clicked, setClicked] = useState(false);
  const [amountA, setAmountA] = useState(0.0);
  const [amountB, setAmountB] = useState(0.0);
  const [avgPrice, setAvgPrice] = useState(0.0);
  const [tradeMode, setTradeMode] = useState("sell");

  const orderCalc = useMemo(() => {
    if (buyOrders && buyOrders.length && assetBData && assetAData) {
      if (tradeMode === "sell" && amountA) {
        let amountToSell = parseFloat(amountA);

        if (amountToSell > maxSellable) {
          form.setValue("sellAmount", maxSellable);
          setAmountA(maxSellable);
          return;
        }

        let totalBought = 0;
        let amountSold = 0;
        const involvedOrders = [];

        for (const order of buyOrders) {
          if (amountToSell <= 0) break;

          const orderQuote = parseFloat(order.quote); // Amount of Asset A in the order
          const orderBase = parseFloat(order.base); // Amount of Asset B in the order

          if (amountToSell >= orderQuote) {
            // Consume the entire order
            totalBought += orderBase;
            amountToSell -= orderQuote;
            amountSold += orderQuote;
            involvedOrders.push(order);
          } else {
            // Partial fill
            const fraction = amountToSell / orderQuote;
            totalBought += orderBase * fraction;
            amountSold += orderQuote * fraction;
            amountToSell = 0;
            involvedOrders.push(order);
          }
        }

        return {
          buyAmount: totalBought,
          sellAmount: parseFloat(amountA),
          avgPrice: trimPrice(totalBought / amountSold, assetBData.precision),
          orders: involvedOrders,
        };
      } else if (tradeMode === "buy" && amountB) {
        let amountToBuy = parseFloat(amountB);

        if (amountToBuy > maxPurchaseable) {
          form.setValue("buyAmount", maxPurchaseable);
          setAmountB(maxPurchaseable);
          return;
        }

        let totalSold = 0;
        let amountBought = 0;
        const involvedOrders = [];

        for (const order of buyOrders) {
          if (amountToBuy <= 0) break;

          const orderQuote = parseFloat(order.quote); // Amount of Asset A
          const orderBase = parseFloat(order.base); // Amount of Asset B

          if (amountToBuy >= orderBase) {
            // Consume the entire order
            totalSold += orderQuote;
            amountToBuy -= orderBase;
            amountBought += orderBase;
            involvedOrders.push(order);
          } else {
            // Partial fill
            const fraction = amountToBuy / orderBase;
            totalSold += orderQuote * fraction;
            amountBought += orderBase * fraction;
            amountToBuy = 0;
            involvedOrders.push(order);
          }
        }

        return {
          buyAmount: parseFloat(amountB),
          sellAmount: totalSold,
          avgPrice: trimPrice(amountBought / totalSold, assetBData.precision),
          orders: involvedOrders,
        };
      }
    }
    return null;
  }, [amountA, amountB, tradeMode, buyOrders, assetBData, assetAData]);

  useEffect(() => {
    if (orderCalc) {
      if (tradeMode === "sell") {
        setAmountB(orderCalc.buyAmount.toFixed(assetBData.precision));
        form.setValue("buyAmount", orderCalc.buyAmount);
      } else {
        setAmountA(orderCalc.sellAmount.toFixed(assetAData.precision));
        form.setValue("sellAmount", orderCalc.sellAmount);
      }
      setAvgPrice(orderCalc.avgPrice);
    } else {
      if (tradeMode === "sell") {
        setAmountB(0.0);
        form.setValue("buyAmount", 0.0);
      } else {
        setAmountA(0.0);
        form.setValue("sellAmount", 0.0);
      }
      setAvgPrice(0.0);
    }
  }, [orderCalc, tradeMode]);

  const marketFees = useMemo(() => {
    let calculatedMarketFee = 0.0;

    if (amountB) {
      if (
        assetBData &&
        assetBData.options.market_fee_percent &&
        assetBData.options.market_fee_percent > 0
      ) {
        calculatedMarketFee =
          parseFloat(amountB) * (assetBData.options.market_fee_percent / 10000);
        return calculatedMarketFee.toFixed(assetBData.precision);
      }
    }

    return calculatedMarketFee;
  }, [amountA, amountB, assetBData]);

  const [expiry, setExpiry] = useState(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });

  const [date, setDate] = useState(
    new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
  );

  const [tradeMethod, setTradeMethod] = useState("single");

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

    if (
      tradeMethod === "multiple" &&
      orderCalc &&
      orderCalc.orders &&
      orderCalc.orders.length
    ) {
      const operations = [];
      let remainingAmountA = parseFloat(amountA);

      for (const order of orderCalc.orders) {
        if (remainingAmountA <= 0) break;

        const orderQuote = parseFloat(order.quote); // Amount of A they want to buy
        const orderBase = parseFloat(order.base); // Amount of B they offer

        let sellAmountForThisOrder = 0;
        let receiveAmountForThisOrder = 0;

        if (remainingAmountA >= orderQuote) {
          // Full fill of this order
          sellAmountForThisOrder = orderQuote;
          receiveAmountForThisOrder = orderBase;
        } else {
          // Partial fill
          sellAmountForThisOrder = remainingAmountA;
          // Calculate proportional receive amount
          // receive = orderBase * (sell / orderQuote)
          receiveAmountForThisOrder =
            orderBase * (sellAmountForThisOrder / orderQuote);
        }

        operations.push({
          seller: usr.id,
          amount_to_sell: {
            amount: blockchainFloat(
              sellAmountForThisOrder,
              assetAData.precision
            ).toFixed(0),
            asset_id: assetAData.id,
          },
          min_to_receive: {
            amount: blockchainFloat(
              receiveAmountForThisOrder,
              assetBData.precision
            ).toFixed(0),
            asset_id: assetBData.id,
          },
          expiration: date,
          fill_or_kill: true,
          extensions: {},
        });

        remainingAmountA -= sellAmountForThisOrder;
      }
      return operations;
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
    assetBData,
    assetB,
    amountA,
    amountB,
    assetAData,
    assetA,
    date,
    marketSearch,
    tradeMethod,
    orderCalc,
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
          setBuyOrderDetails(data);
        }
      });
    }

    if (_chain && currentNode && buyOrders && buyOrders.length) {
      fetching();
    }
  }, [currentNode, _chain, buyOrders]);

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
    const quote = parseFloat(order.quote);

    const totalBase = buyOrders
      .slice(0, index + 1)
      .map((x) => parseFloat(x.base))
      .reduce((acc, curr) => acc + curr, 0)
      .toFixed(assetBData.precision);

    return (
      <div style={style}>
        <div className="grid grid-cols-3 md:grid-cols-6 text-sm hover:bg-gray-400">
          <div className="hidden md:block">
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
                  <DialogTitle>
                    {t("InstantTrade:limit_order_contents")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("InstantTrade:limit_order_details")}
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
          <div className="hidden md:block">
            <ExternalLink
              classnamecontents="hover:text-purple-500"
              type="text"
              text={order.owner_name}
              hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                order.owner_name
              }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
            />
          </div>
          <div className="hidden md:block">
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
                    <DialogTitle>
                      {t("InstantTrade:on_fill_details")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("InstantTrade:on_fill_desc")}
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
      <div className="grid grid-cols-1 gap-5">
        <Card>
          <CardHeader className="pt-2 pb-2">
            <CardTitle className="text-lg">
              {usr.chain === "bitshares"
                ? "Bitshares "
                : "Bitshares (Testnet) "}
              {t("InstantTrade:instant_trade")}
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
              {t("InstantTrade:description", { assetB, assetA })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assetA && assetB && marketSearch && assetAData && assetBData ? (
              <form onSubmit={form.handleSubmit(() => setShowDialog(true))}>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Controller
                      name="sellAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          invalid={fieldState.invalid}
                          className="mt-1 text-xs"
                        >
                          <FieldLabel>
                            <div className="w-full grid grid-cols-2">
                              <div className="text-left">
                                {t(
                                  "LimitOrderCard:sellAmount.sellDescription",
                                  {
                                    asset: assetA,
                                  }
                                )}
                              </div>
                              <div className="text-right">
                                {t("InstantTrade:balance", {
                                  balance: assetABalance,
                                  asset: assetA,
                                })}
                              </div>
                            </div>
                          </FieldLabel>

                          <Input
                            value={amountA}
                            className="mb-2 mt-1"
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = assetAmountRegex(assetAData);
                              if (regex.test(input)) {
                                setAmountA(input);
                                setTradeMode("sell");
                                form.setValue("sellAmount", input);
                                setInputChars(inputChars + 1);
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
                          className="mt-1 text-xs"
                        >
                          <FieldLabel>
                            <div className="w-full grid grid-cols-2">
                              <div className="text-left">
                                {t("LimitOrderCard:sellAmount.buyDescription", {
                                  asset: assetB,
                                })}
                              </div>
                              <div className="text-right">
                                {t("InstantTrade:balance", {
                                  balance: assetBBalance,
                                  asset: assetB,
                                })}
                              </div>
                            </div>
                          </FieldLabel>
                          <Input
                            value={amountB}
                            className="mb-2 mt-1"
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = assetAmountRegex(assetBData);
                              if (regex.test(input)) {
                                setAmountB(input);
                                setTradeMode("buy");
                                form.setValue("buyAmount", input);
                                setInputChars(inputChars + 1);
                              }
                            }}
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      name="maxSellable"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field className="text-xs">
                          <FieldLabel>
                            {t("InstantTrade:max_purchaseable_assetA", {
                              assetA,
                            })}
                          </FieldLabel>

                          <Input
                            placeholder={maxSellable}
                            className="mb-2 mt-1"
                            readOnly
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      name="maxPurchaseable"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field className="text-xs">
                          <FieldLabel>
                            {t("InstantTrade:max_purchaseable_assetB", {
                              assetB,
                            })}
                          </FieldLabel>

                          <Input
                            placeholder={maxPurchaseable}
                            className="mb-2 mt-1"
                            readOnly
                          />
                        </Field>
                      )}
                    />

                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                      <Controller
                        name="avgPrice"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="text-xs">
                            <FieldLabel>
                              {t("InstantTrade:effective_average_price", {
                                assetB,
                                assetA,
                              })}
                            </FieldLabel>

                            <Input
                              placeholder={avgPrice}
                              className="mb-2 mt-1"
                              readOnly
                            />
                          </Field>
                        )}
                      />

                      <Controller
                        name="qtyLimitOrders"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="text-xs">
                            <FieldLabel>
                              {t("InstantTrade:quantity_limit_orders")}
                            </FieldLabel>

                            <Input
                              placeholder={
                                orderCalc ? orderCalc.orders.length : 0
                              }
                              className="mb-2 mt-1"
                              readOnly
                            />
                          </Field>
                        )}
                      />

                      <Controller
                        name="uniqueSellers"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="text-xs">
                            <FieldLabel>
                              {t("InstantTrade:unique_sellers")}
                            </FieldLabel>

                            <Input
                              placeholder={
                                orderCalc &&
                                orderCalc.orders &&
                                orderCalc.orders.length
                                  ? [
                                      ...new Set(
                                        orderCalc.orders.map(
                                          (x) => x.owner_name
                                        )
                                      ),
                                    ].length
                                  : 0
                              }
                              className="mb-2 mt-1"
                              readOnly
                            />
                          </Field>
                        )}
                      />
                    </div>

                    {marketFees && assetBData ? (
                      <Controller
                        name="marketFees"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field>
                            <FieldLabel>
                              {t("LimitOrderCard:marketFees.label")}
                            </FieldLabel>
                            <Input
                              disabled
                              placeholder={`${marketFees} ${assetBData.symbol}`}
                              className="mb-2 mt-1"
                            />
                            <FieldDescription>
                              {t("LimitOrderCard:marketFees.description")}
                            </FieldDescription>
                          </Field>
                        )}
                      />
                    ) : null}
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

                  <div className="mb-3">
                    <Label className="mb-4 block">
                      {t("InstantTrade:instant_trading_method")}
                    </Label>
                    <RadioGroup
                      defaultValue="single"
                      value={tradeMethod}
                      onValueChange={setTradeMethod}
                      className="flex flex-row space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="r1" />
                        <Label htmlFor="r1">
                          {t("InstantTrade:single_limit_order")}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="multiple" id="r2" />
                        <Label htmlFor="r2">
                          {t("InstantTrade:multiple_limit_orders")}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {!amountA || !amountB ? (
                    <Button
                      className="mt-7 mb-1 w-full md:w-1/4 text-left"
                      variant="outline"
                      disabled
                      type="submit"
                    >
                      {t("LimitOrderCard:submit")}
                    </Button>
                  ) : (
                    <Button
                      className="mt-7 mb-1 w-full md:w-1/4 text-left"
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
        </Card>

        <Card>
          <Accordion
            type="single"
            defaultValue="openBuyLimitOrders"
            collapsible
          >
            <AccordionItem key="openBuyLimitOrders" value="openBuyLimitOrders">
              <AccordionTrigger>
                <CardHeader>
                  <CardTitle>
                    {t("MarketOrderCard:openBuyLimitOrdersTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("MarketOrderCard:buyLimitOrdersDescription", {
                      assetA: assetB,
                      assetB: assetA,
                    })}
                    <br />
                    {updatingMarket ? (
                      <Spinner className="size-4" />
                    ) : (
                      t("InstantTrade:last_updated", {
                        time: marketTimestamp
                          ? marketTimestamp.toLocaleTimeString()
                          : "",
                      })
                    )}
                  </CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent>
                  {buyOrders && buyOrders.length ? (
                    <>
                      <div className="grid grid-cols-3 md:grid-cols-6 font-bold">
                        <div className="hidden md:block">
                          {t("InstantTrade:id")}
                        </div>
                        <div className="hidden md:block">
                          {t("InstantTrade:seller")}
                        </div>
                        <div className="hidden md:block">
                          {t("InstantTrade:on_repeat")}
                        </div>
                        <div className="col-span-1 pl-3 text-right pr-2">
                          {t("InstantTrade:amount_assetA", { assetA })}
                        </div>
                        <div className="col-span-1 pl-3 text-md text-right pr-2">
                          {t("InstantTrade:price_assetB_assetA", {
                            assetB,
                            assetA,
                          })}
                        </div>
                        <div className="col-span-1 pl-3 text-md text-right pr-2">
                          {t("InstantTrade:total_assetB", { assetB })}
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
                <CardFooter>
                  <Button
                    onClick={() => setBuyOrderIterator((n) => n + 1)}
                    variant="outline"
                  >
                    <ReloadIcon className="hover:animate-spin" />
                  </Button>
                </CardFooter>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("InstantTrade:market_limit_orders_buying_from")}
            </CardTitle>
            <CardDescription>
              <div className="w-full grid grid-cols-2">
                <div className="text-left">
                  {t("InstantTrade:market_limit_orders_desc")}
                </div>
                <div className="text-right">
                  {updatingMarket ? (
                    <Spinner className="size-4" />
                  ) : (
                    t("InstantTrade:last_updated", {
                      time: marketTimestamp
                        ? marketTimestamp.toLocaleTimeString()
                        : "",
                    })
                  )}
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orderCalc && orderCalc.orders.length ? (
              <>
                <div className="grid grid-cols-3 md:grid-cols-6">
                  <div className="hidden md:block">{t("InstantTrade:id")}</div>
                  <div className="hidden md:block">
                    {t("InstantTrade:seller")}
                  </div>
                  <div className="hidden md:block">
                    {t("InstantTrade:on_repeat")}
                  </div>
                  <div className="col-span-1 pl-3 text-right pr-2">
                    {t("InstantTrade:amount_assetA", { assetA })}
                  </div>
                  <div className="col-span-1 pl-3 text-md text-right pr-2">
                    {t("InstantTrade:price_assetB_assetA", {
                      assetB,
                      assetA,
                    })}
                  </div>
                  <div className="col-span-1 pl-3 text-md text-right pr-2">
                    {t("InstantTrade:total_assetB", { assetB })}
                  </div>
                </div>
                <div className="h-[300px] overflow-hidden">
                  {orderCalc && orderCalc.orders && buyOrderDetails ? (
                    <List
                      height={300}
                      rowComponent={Row}
                      rowCount={orderCalc.orders.length}
                      rowHeight={20}
                      rowProps={{}}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              t("InstantTrade:no_orders_to_purchase")
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => setBuyOrderIterator((n) => n + 1)}
              variant="outline"
            >
              <ReloadIcon className="hover:animate-spin" />
            </Button>
          </CardFooter>
        </Card>

        {showDialog ? (
          <DeepLinkDialog
            operationNames={trxJSON.map(() => "limit_order_create")}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            key={`Buying${assetB}with${assetA}`}
            headerText={t("LimitOrderCard:headerText.buying", {
              amount: amountB,
              thisAssetA: assetB,
              total: amountA,
              thisAssetB: assetA,
            })}
            trxJSON={trxJSON}
          />
        ) : null}
      </div>
    </div>
  );
}
