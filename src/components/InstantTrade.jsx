import React, {
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  useMemo,
  useCallback,
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
import { cn } from "@/lib/utils";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createAssetFromSymbolStore } from "@/nanoeffects/Assets.ts";
import { createMarketOrderStore } from "@/nanoeffects/MarketOrderBook.ts";
import { useDexOrderBookLive } from "@/hooks/useDexLiveSubscriptions";
import { useMarketCandles } from "@/hooks/useMarketCandles";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import CandleChart from "./InstantTrade/CandleChart.jsx";
import DepthChart from "./InstantTrade/DepthChart.jsx";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import {
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  Copy,
  Info,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import {
  Field,
  FieldGroup,
  FieldLabel,
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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

function InstantTradeRow({ index, style, buyOrders, buyOrderDetails, assetBData, assetAData, t }) {
  const order = buyOrders[index];
  if (!order) return null;
  const orderDetails = buyOrderDetails && buyOrderDetails.length ? buyOrderDetails.find((x) => x.id === order.id) : null;
  const price = order.price ? parseFloat(order.price).toFixed(assetBData?.precision ?? 5) : "0";
  const quote = order.quote ? parseFloat(order.quote) : 0;
  const totalBase = buyOrders.slice(0, index + 1).map((x) => parseFloat(x.base)).reduce((acc, curr) => acc + curr, 0).toFixed(assetBData?.precision ?? 5);
  return (
    <div style={style}>
      <div className="grid grid-cols-3 md:grid-cols-6 text-sm items-center border-b border-border/40 hover:bg-[hsl(var(--accent-1)/0.06)] hover:border-[hsl(var(--accent-1)/0.20)] transition-colors py-1.5 px-2">
        <div className="hidden md:block">
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="text-[11px] font-mono dark:text-[hsl(var(--accent-1-fg)/0.70)] text-[hsl(var(--accent-1-fg)/0.80)] dark:hover:text-[hsl(var(--accent-1-fg))] hover:text-[hsl(var(--accent-1-fg))] hover:underline underline-offset-2">
                #{order.id}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] !bg-card border border-border text-foreground/85">
              <DialogHeader>
                <DialogTitle>{t("InstantTrade:limit_order_contents")}</DialogTitle>
                <DialogDescription className="text-muted-foreground">{t("InstantTrade:limit_order_details")}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1">
                <div className="col-span-1">
                  <ScrollArea className="h-72 rounded-md border border-border bg-card/60">
                    <pre className="text-xs text-foreground/80 p-3">{JSON.stringify([order, orderDetails], null, 2)}</pre>
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="hidden md:block text-muted-foreground truncate pr-2">{order.owner_name}</div>
        <div className="hidden md:block">{orderDetails && orderDetails.on_fill.length ? <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-success)/0.15)] border border-[hsl(var(--accent-success)/0.40)] text-[hsl(var(--accent-success-fg))] text-xs">✓</span> : null}</div>
        <div className="col-span-1 pl-3 font-mono text-right tabular-nums text-foreground/85">{quote.toFixed(assetAData?.precision ?? 5)}</div>
        <div className="col-span-1 pl-3 font-mono text-right tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.90)] text-[hsl(var(--accent-1-fg))]">{price}</div>
        <div className="col-span-1 pl-3 font-mono text-right tabular-nums text-muted-foreground">{totalBase}</div>
      </div>
    </div>
  );
}
const MemoInstantTradeRow = React.memo(InstantTradeRow);

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
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 1);
      if (foundFee && foundFee.data && foundFee.data.fee) {
        setLimitOrderFee(humanReadableFloat(foundFee.data.fee, 5));
      }
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

  const defaultCoreSymbol = _chain === "bitshares" ? "BTS" : "TEST";
  const defaultQuoteSymbol = _chain === "bitshares" ? "HONEST.USD" : "NFTEA.TESTNET";

  const [assetA, setAssetA] = useState(!window.location.search ? defaultQuoteSymbol : null);
  const [assetB, setAssetB] = useState(!window.location.search ? defaultCoreSymbol : null);

  useEffect(() => {
    if (!window.location.search) {
      setAssetA(defaultQuoteSymbol);
      setAssetB(defaultCoreSymbol);
    }
  }, [_chain]);

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
        finalAssetB = defaultQuoteSymbol;
      } else {
        let asset_a = market.split("_")[0].toUpperCase();
        let asset_b = market.split("_")[1].toUpperCase();

        if (asset_a && asset_b && asset_b.length && asset_a === asset_b) {
          // Avoid invalid duplicate asset market pairs
          asset_b = asset_a === defaultCoreSymbol ? defaultQuoteSymbol : "1.3.0";
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
          finalAssetB = finalAssetA !== defaultQuoteSymbol ? defaultQuoteSymbol : "1.3.0";
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
              asset_a !== defaultCoreSymbol && asset_a !== "1.3.0" ? "1.3.0" : defaultQuoteSymbol;
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
          // prefer live subscription when active; poll fills gaps/fallback
          if (!liveBidsRef.current) {
            setBuyOrders(data.bids);
          }
        } else {
          if (!liveBidsRef.current) {
            setBuyOrders(null);
          }
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

  // Live order book subscription (push on every market change, ~500ms batch)
  const liveIT = useDexOrderBookLive({
    chain: usr ? usr.chain : "",
    baseId: assetBData ? assetBData.id : null,
    quoteId: assetAData ? assetAData.id : null,
    accountId: usr ? usr.id : null,
    enabled: Boolean(usr && assetAData && assetBData),
    limit: 50,
    specificNode: currentNode && currentNode.chain === (usr ? usr.chain : "") ? currentNode.url : null,
  });
  const liveBidsRef = useRef(null);
  useEffect(() => {
    liveBidsRef.current = liveIT.bids;
    if (liveIT.bids) {
      setBuyOrders(liveIT.bids);
      setUpdatingMarket(false);
      setMarketTimestamp(new Date());
    }
  }, [liveIT.bids]);

  // Candle + buckets state — live subscription adaptive (re-fetch on market push)
  const [candleBucketSec, setCandleBucketSec] = useState(3600);
  const {
    candles,
    buckets,
    loading: candlesLoading,
    historyAvailable,
    lastFetchAt: candlesLastFetchAt,
  } = useMarketCandles({
    chain: usr ? usr.chain : "",
    baseId: assetBData ? assetBData.id : null,
    quoteId: assetAData ? assetAData.id : null,
    basePrecision: assetBData ? assetBData.precision : null,
    quotePrecision: assetAData ? assetAData.precision : null,
    bucketSeconds: candleBucketSec,
    enabled: Boolean(usr && assetAData && assetBData),
    specificNode: currentNode && currentNode.chain === (usr ? usr.chain : "") ? currentNode.url : null,
    liveTick: liveIT.lastFetchAt,
  });

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

  const instantTradeRowProps = useMemo(() => ({ buyOrders, buyOrderDetails, assetBData, assetAData, t }), [buyOrders, buyOrderDetails, assetBData, assetAData, t]);
  const orderCalcRowProps = useMemo(() => ({ buyOrders: orderCalc?.orders || [], buyOrderDetails, assetBData, assetAData, t }), [orderCalc, buyOrderDetails, assetBData, assetAData, t]);

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
      <div className="container mx-auto mt-5 mb-5 max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-8 text-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.70)] to-transparent"
          />
          <div className="flex flex-col items-center gap-3">
            <Spinner className="size-6 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
            <p className="text-foreground/70 text-sm">
              {t("MarketPlaceholder:loadingAssetDescription")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Set sell amount to user's available balance
  const setMaxA = () => {
    if (assetABalance > 0) {
      const formatted = parseFloat(assetABalance);
      setAmountA(formatted);
      form.setValue("sellAmount", formatted);
      setTradeMode("sell");
      setInputChars((c) => c + 1);
    }
  };

  // Set buy amount to user's available balance
  const setMaxB = () => {
    if (assetBBalance > 0) {
      const formatted = parseFloat(assetBBalance);
      setAmountB(formatted);
      form.setValue("buyAmount", formatted);
      setTradeMode("buy");
      setInputChars((c) => c + 1);
    }
  };



  return (
    <div className="container mx-auto mt-5 mb-5 max-w-4xl">
      <div className="grid grid-cols-1 gap-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.20)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.70)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.10)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.10)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Zap className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {usr.chain === "bitshares"
                    ? "Bitshares "
                    : "Bitshares (Testnet) "}
                  {t("InstantTrade:instant_trade")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("InstantTrade:description", { assetB, assetA })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-stretch">
              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-2">
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
              </div>

              <a
                href={`/instant_trade.html?market=${assetB}_${assetA}`}
                onClick={() => setClicked(true)}
                className="self-stretch flex items-center justify-center"
                aria-label="Swap pair"
                title="Swap pair"
              >
                <span className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-border bg-card/80 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.50)] hover:bg-card/80 hover:shadow-[0_0_24px_-6px_hsl(var(--accent-1)/0.55)] transition-all group">
                  {clicked ? (
                    <ReloadIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownUp className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                  )}
                </span>
              </a>

              <div className="rounded-xl border border-[hsl(var(--accent-2)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.06)] to-transparent p-2">
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
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.10)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.40)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.07)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[hsl(var(--accent-2)/0.07)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            {assetA && assetB && marketSearch && assetAData && assetBData ? (
              <form onSubmit={form.handleSubmit(() => setShowDialog(true))}>
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Controller
                      name="sellAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <div className="rounded-xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-transparent p-3 sm:p-4">
                          <Field
                            invalid={fieldState.invalid}
                            className="text-xs"
                          >
                            <FieldLabel className="text-foreground/80">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.90)] text-[hsl(var(--accent-1-fg))]">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.30)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                                  <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                                </span>
                                {t(
                                  "LimitOrderCard:sellAmount.sellDescription",
                                  {
                                    asset: assetA,
                                  }
                                )}
                              </span>
                            </FieldLabel>

                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-muted-foreground">
                                {t("InstantTrade:balance", {
                                  balance: assetABalance,
                                  asset: assetA,
                                })}
                              </span>
                              <button
                                type="button"
                                onClick={setMaxA}
                                className="inline-flex items-center rounded-md border border-[hsl(var(--accent-1)/0.30)] bg-[hsl(var(--accent-1)/0.10)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.20)] hover:border-[hsl(var(--accent-1)/0.50)] transition-colors"
                              >
                                MAX
                              </button>
                            </div>

                            <Input
                              value={amountA}
                              className="mt-2 h-14 sm:h-16 text-2xl sm:text-3xl font-semibold !bg-card/40 border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:!ring-[hsl(var(--accent-1)/0.40)] focus-visible:border-[hsl(var(--accent-1)/0.50)]"
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
                              placeholder="0.00"
                            />
                          </Field>
                        </div>
                      )}
                    />

                    <Controller
                      name="buyAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <div className="rounded-xl border border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.07)] to-transparent p-3 sm:p-4">
                          <Field
                            invalid={fieldState.invalid}
                            className="text-xs"
                          >
                            <FieldLabel className="text-foreground/80">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-2-fg)/0.90)] text-[hsl(var(--accent-2-fg))]">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-2)/0.15)] border border-[hsl(var(--accent-2)/0.30)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]">
                                  <ArrowDown
                                    className="h-3 w-3"
                                    strokeWidth={2.5}
                                  />
                                </span>
                                {t("LimitOrderCard:sellAmount.buyDescription", {
                                  asset: assetB,
                                })}
                              </span>
                            </FieldLabel>
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-muted-foreground">
                                {t("InstantTrade:balance", {
                                  balance: assetBBalance,
                                  asset: assetB,
                                })}
                              </span>
                              <button
                                type="button"
                                onClick={setMaxB}
                                className="inline-flex items-center rounded-md border border-[hsl(var(--accent-2)/0.30)] bg-[hsl(var(--accent-2)/0.10)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.20)] hover:border-[hsl(var(--accent-2)/0.50)] transition-colors"
                              >
                                MAX
                              </button>
                            </div>
                            <Input
                              value={amountB}
                              className="mt-2 h-14 sm:h-16 text-2xl sm:text-3xl font-semibold !bg-card/40 border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:!ring-[hsl(var(--accent-2)/0.40)] focus-visible:border-[hsl(var(--accent-2)/0.50)]"
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
                              placeholder="0.00"
                            />
                          </Field>
                        </div>
                      )}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Controller
                      name="maxSellable"
                      control={form.control}
                      render={() => (
                        <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                            {t("InstantTrade:max_purchaseable_assetA", {
                              assetA,
                            })}
                          </div>
                          <div className="font-mono text-sm tabular-nums text-foreground/85">
                            {maxSellable || "—"}
                          </div>
                        </div>
                      )}
                    />

                    <Controller
                      name="maxPurchaseable"
                      control={form.control}
                      render={() => (
                        <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                            {t("InstantTrade:max_purchaseable_assetB", {
                              assetB,
                            })}
                          </div>
                          <div className="font-mono text-sm tabular-nums text-foreground/85">
                            {maxPurchaseable || "—"}
                          </div>
                        </div>
                      )}
                    />

                    <Controller
                      name="avgPrice"
                      control={form.control}
                      render={() => (
                        <div className="rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/40 p-3">
                          <div className="text-[10px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.70)] text-[hsl(var(--accent-1-fg)/0.80)] mb-1 inline-flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                            {t("InstantTrade:effective_average_price", {
                              assetB,
                              assetA,
                            })}
                          </div>
                          <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.90)] text-[hsl(var(--accent-1-fg))]">
                            {avgPrice || "—"}
                          </div>
                        </div>
                      )}
                    />

                    <Controller
                      name="qtyLimitOrders"
                      control={form.control}
                      render={() => (
                        <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                            {t("InstantTrade:quantity_limit_orders")}
                          </div>
                          <div className="font-mono text-sm tabular-nums text-foreground/85">
                            {orderCalc ? orderCalc.orders.length : 0}
                          </div>
                        </div>
                      )}
                    />

                    <Controller
                      name="uniqueSellers"
                      control={form.control}
                      render={() => (
                        <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1 inline-flex items-center gap-1">
                            <Users className="h-3 w-3" strokeWidth={2.5} />
                            {t("InstantTrade:unique_sellers")}
                          </div>
                          <div className="font-mono text-sm tabular-nums text-foreground/85">
                            {orderCalc &&
                            orderCalc.orders &&
                            orderCalc.orders.length
                              ? [
                                  ...new Set(
                                    orderCalc.orders.map(
                                      (x) => x.owner_name
                                    )
                                  ),
                                ].length
                              : 0}
                          </div>
                        </div>
                      )}
                    />

                    <Controller
                      name="networkFee"
                      control={form.control}
                      render={() => (
                        <div className="rounded-xl border border-[hsl(var(--accent-1)/0.20)] bg-[hsl(var(--accent-1)/0.05)] p-3">
                          <div className="text-[10px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.80)] text-[hsl(var(--accent-1-fg))] mb-1 inline-flex items-center gap-1">
                            <Zap className="h-3 w-3" strokeWidth={2.5} />
                            {t("InstantTrade:networkFee")}
                          </div>
                          <div className="flex items-center gap-1 font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {limitOrderFee ? limitOrderFee.toFixed(5) : "0.00000"}
                            <span className="text-muted-foreground">BTS</span>
                          </div>
                        </div>
                      )}
                    />

                    {marketFees && assetBData ? (
                      <Controller
                        name="marketFees"
                        control={form.control}
                        render={() => (
                          <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1 inline-flex items-center gap-1">
                              <Info className="h-3 w-3" strokeWidth={2.5} />
                              {t("LimitOrderCard:marketFees.label")}
                            </div>
                            <div className="font-mono text-sm tabular-nums text-foreground/85">
                              {marketFees} {assetBData.symbol}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {t("LimitOrderCard:marketFees.description")}
                            </div>
                          </div>
                        )}
                      />
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 block">
                      {t("InstantTrade:instant_trading_method")}
                    </Label>
                    <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1">
                      {[
                        {
                          value: "single",
                          label: t("InstantTrade:single_limit_order"),
                        },
                        {
                          value: "multiple",
                          label: t("InstantTrade:multiple_limit_orders"),
                        },
                      ].map((opt) => {
                        const active = tradeMethod === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTradeMethod(opt.value)}
                            className={cn(
                              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                              active
                                ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] border border-[hsl(var(--accent-1)/0.40)] shadow-[0_0_18px_-8px_hsl(var(--accent-1)/0.6)]"
                                : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <RadioGroup
                      defaultValue="single"
                      value={tradeMethod}
                      onValueChange={setTradeMethod}
                      className="hidden"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="r1" />
                        <Label htmlFor="r1">r1</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="multiple" id="r2" />
                        <Label htmlFor="r2">r2</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {!amountA || !amountB ? (
                    <button
                      type="submit"
                      disabled
                      className="mt-6 w-full h-14 rounded-2xl font-semibold text-muted-foreground bg-card/60 border border-border/40 dark:border-white/5 cursor-not-allowed flex items-center justify-center gap-2 text-base"
                    >
                      <Zap className="h-4 w-4" strokeWidth={2.5} />
                      {t("LimitOrderCard:submit")}
                    </button>
                  ) : (
                    <>
                      {limitOrderFee && (
                        <div className="mt-4 flex items-center justify-between px-1">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t("InstantTrade:networkFee")}
                          </span>
                          <span className="flex items-center gap-1.5 font-mono dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] text-sm">
                            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {limitOrderFee.toFixed(5)} BTS
                          </span>
                        </div>
                      )}
                      <button
                        type="submit"
                        className="mt-6 w-full h-14 rounded-2xl font-semibold text-[hsl(var(--accent-1-gradFg))] bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-3))] to-[hsl(var(--accent-danger))] shadow-[0_8px_32px_-12px_hsl(var(--accent-3)/0.7)] hover:shadow-[0_12px_40px_-12px_hsl(var(--accent-3)/0.9)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-3))] hover:to-[hsl(var(--accent-danger))] transition-all flex items-center justify-center gap-2 text-base group"
                      >
                        <Zap
                          className="h-4 w-4 group-hover:scale-110 transition-transform"
                          strokeWidth={2.5}
                        />
                        {t("LimitOrderCard:submit")}
                      </button>
                    </>
                  )}
                </FieldGroup>
              </form>
            ) : null}
          </div>
        </div>

        <CandleChart
          candles={candles}
          buckets={buckets}
          bucketSec={candleBucketSec}
          onBucketChange={setCandleBucketSec}
          baseSymbol={assetB}
          quoteSymbol={assetA}
          loading={candlesLoading}
          historyAvailable={historyAvailable}
          lastFetchAt={candlesLastFetchAt}
        />

        <DepthChart
          bids={buyOrders}
          asks={liveIT.asks ?? []}
          baseSymbol={assetB}
          quoteSymbol={assetA}
          loading={updatingMarket && !buyOrders}
        />

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.40)] to-transparent"
          />
          <Accordion
            type="single"
            defaultValue="openBuyLimitOrders"
            collapsible
            className="relative"
          >
            <AccordionItem
              key="openBuyLimitOrders"
              value="openBuyLimitOrders"
              className="border-b-0"
            >
              <AccordionTrigger className="px-5 sm:px-6 py-4 hover:no-underline hover:bg-accent/20">
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-foreground">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.30)] bg-[hsl(var(--accent-1)/0.10)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                      <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    {t("MarketOrderCard:openBuyLimitOrdersTitle")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("MarketOrderCard:buyLimitOrdersDescription", {
                      assetA: assetB,
                      assetB: assetA,
                    })}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                    {updatingMarket ? (
                      <Spinner className="size-3" />
                    ) : (
                      <>
                        <RefreshCw className="h-2.5 w-2.5" />
                        {t("InstantTrade:last_updated", {
                          time: marketTimestamp
                            ? marketTimestamp.toLocaleTimeString()
                            : "",
                        })}
                      </>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 sm:px-6 pb-5">
                {buyOrders && buyOrders.length ? (
                  <>
                    <div className="grid grid-cols-3 md:grid-cols-6 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2 mb-1 px-2">
                      <div className="hidden md:block">
                        {t("InstantTrade:id")}
                      </div>
                      <div className="hidden md:block">
                        {t("InstantTrade:seller")}
                      </div>
                      <div className="hidden md:block">
                        {t("InstantTrade:on_repeat")}
                      </div>
                      <div className="col-span-1 text-right">
                        {t("InstantTrade:amount_assetA", { assetA })}
                      </div>
                      <div className="col-span-1 text-right dark:text-[hsl(var(--accent-1-fg)/0.70)] text-[hsl(var(--accent-1-fg)/0.80)]">
                        {t("InstantTrade:price_assetB_assetA", {
                          assetB,
                          assetA,
                        })}
                      </div>
                      <div className="col-span-1 text-right">
                        {t("InstantTrade:total_assetB", { assetB })}
                      </div>
                    </div>
                    <div className="h-[300px] overflow-hidden rounded-lg bg-card/30 border border-border/40">
                      {buyOrders && buyOrderDetails ? (
                        <List
                          height={300}
                          width="100%"
                          rowComponent={MemoInstantTradeRow}
                          rowCount={buyOrders.length}
                          rowHeight={32}
                          rowProps={instantTradeRowProps}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Spinner className="size-6 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground/70 text-center py-8">
                    {t("MarketOrderCard:noOpenOrders")}
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={() => setBuyOrderIterator((n) => n + 1)}
                    variant="outline"
                    size="icon"
                    aria-label="Refresh"
                    className="h-9 w-9 rounded-xl border-border bg-card/60 hover:bg-card/80 hover:border-[hsl(var(--accent-1)/0.40)] text-foreground/70 hover:text-accent-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.40)] to-transparent"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Wallet className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  {t("InstantTrade:market_limit_orders_buying_from")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("InstantTrade:market_limit_orders_desc")}
                </p>
                <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                  {updatingMarket ? (
                    <Spinner className="size-3" />
                  ) : (
                    <>
                      <RefreshCw className="h-2.5 w-2.5" />
                      {t("InstantTrade:last_updated", {
                        time: marketTimestamp
                          ? marketTimestamp.toLocaleTimeString()
                          : "",
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {orderCalc && orderCalc.orders.length ? (
              <>
                <div className="grid grid-cols-3 md:grid-cols-6 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2 mb-1 px-2">
                  <div className="hidden md:block">{t("InstantTrade:id")}</div>
                  <div className="hidden md:block">
                    {t("InstantTrade:seller")}
                  </div>
                  <div className="hidden md:block">
                    {t("InstantTrade:on_repeat")}
                  </div>
                  <div className="col-span-1 text-right">
                    {t("InstantTrade:amount_assetA", { assetA })}
                  </div>
                  <div className="col-span-1 text-right dark:text-[hsl(var(--accent-1-fg)/0.70)] text-[hsl(var(--accent-1-fg)/0.80)]">
                    {t("InstantTrade:price_assetB_assetA", {
                      assetB,
                      assetA,
                    })}
                  </div>
                  <div className="col-span-1 text-right">
                    {t("InstantTrade:total_assetB", { assetB })}
                  </div>
                </div>
                <div className="h-[300px] overflow-hidden rounded-lg bg-card/30 border border-border/40">
                  {orderCalc && orderCalc.orders && buyOrderDetails ? (
                    <List
                      height={300}
                      width="100%"
                      rowComponent={MemoInstantTradeRow}
                      rowCount={orderCalc.orders.length}
                      rowHeight={32}
                      rowProps={orderCalcRowProps}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground/70 text-center py-8">
                {t("InstantTrade:no_orders_to_purchase")}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                onClick={() => setBuyOrderIterator((n) => n + 1)}
                variant="outline"
                size="icon"
                aria-label="Refresh"
                className="h-9 w-9 rounded-xl border-border bg-card/60 hover:bg-card/80 hover:border-[hsl(var(--accent-1)/0.40)] text-foreground/70 hover:text-accent-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

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

        <DexLiveFooterCard
          lastFetchAt={liveIT.lastFetchAt}
          isSubscribed={liveIT.isSubscribed}
          blockNumber={liveIT.blockNumber}
          nodeUrl={
            currentNode && currentNode.chain === (usr ? usr.chain : "")
              ? currentNode.url
              : null
          }
          warningThresholdSec={10}
        
        chain={usr?.chain}/>
      </div>
    </div>
  );
}
