import React, { useSyncExternalStore, useMemo, useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from '@nanostores/react';
import { format } from "date-fns";
import DOMPurify from 'dompurify';
import {
  QuestionMarkCircledIcon,
  ExclamationTriangleIcon,
  CalendarIcon
} from "@radix-ui/react-icons";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import AccountSearch from "@/components/AccountSearch.jsx";
import { Avatar } from "./Avatar.tsx";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $assetCacheBTS, $assetCacheTEST } from "@/stores/cache.ts";
import { $marketSearchCacheBTS, $marketSearchCacheTEST } from "@/stores/cache.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createEveryObjectStore, createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createAssetCallOrdersStore } from "@/nanoeffects/AssetCallOrders.ts";

import { humanReadableFloat, getFlagBooleans, blockchainFloat } from "@/lib/common.js";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { set } from "date-fns";

function hoursTillExpiration(expirationTime) {
  var expirationDate = new Date(expirationTime);
  var currentDate = new Date();
  var difference = expirationDate - currentDate;
  var hours = Math.round(difference / 1000 / 60 / 60);
  return hours;
}

function prettifyDate(date) {
  const d = new Date(date);
  const hours = d.getHours() < 10 ? `0${d.getHours()}` : d.getHours();
  const minutes = d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${hours}:${minutes}`;
}

export default function Predictions(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  const currentNode = useStore($currentNode);

  const [view, setView] = useState("active"); // active, expired, mine

  const _assetsBTS = useSyncExternalStore($assetCacheBTS.subscribe, $assetCacheBTS.get, () => true);
  const _assetsTEST = useSyncExternalStore(
    $assetCacheTEST.subscribe,
    $assetCacheTEST.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);
  
  useInitCache(_chain ?? "bitshares", ["assets", "marketSearch"]);

  const _marketSearchBTS = useSyncExternalStore(
    $marketSearchCacheBTS.subscribe,
    $marketSearchCacheBTS.get,
    () => true
  );

  const _marketSearchTEST = useSyncExternalStore(
    $marketSearchCacheTEST.subscribe,
    $marketSearchCacheTEST.get,
    () => true
  );

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
        return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [combinedAssets, setCombinedAssets] = useState([]);
  useEffect(() => {
    async function fetching() {
      const lastAsset = assets.at(-1);
      const requiredStore = createEveryObjectStore([
        _chain,
        parseInt(lastAsset.id.split(".")[0]),
        parseInt(lastAsset.id.split(".")[1]),
        parseInt(lastAsset.id.split(".")[2]),
        currentNode.url
      ]);
  
      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setCombinedAssets(
            !data.length
              ? assets
              : [...assets, ...data]
          );
        }
      });
    }
    
    if (_chain && assets && assets.length && currentNode) {
      fetching();
    }
  }, [_chain, assets, currentNode]);

  const predictionMarketAssets = useMemo(() => {
    return combinedAssets.filter(
      (x) => (x.hasOwnProperty("prediction_market") && x.prediction_market === true) ||
      (!x.hasOwnProperty("prediction_market") && x.bitasset_data_id) // non cached assets minus non-pm smartcoins
    );
  }, [combinedAssets]);

  const [pmaProcessedData, setPmaProcessedData] = useState([]);
  useEffect(() => {
    async function fetching() {
      const _store = createObjectStore([_chain, JSON.stringify(predictionMarketAssets.map(x => x.id)), currentNode.url]);
    
      _store.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const now = new Date();
          const processedData = data.map((x) => {
            const plainDescription = x.options.description;
            if (
              !plainDescription
              || !plainDescription.length
              || !plainDescription.includes("market")
              || !plainDescription.includes("expiry")
              || !plainDescription.includes("condition")
            ) {
              return;
            }

            const description = JSON.parse(x.options.description);
            if (!description || !description.market || !description.expiry || !description.condition) {
              return;
            }
            
            const market = description.market;
            const expiration = new Date(description.expiry);
      
            const backingAsset = assets.find((x) => x.symbol === market);
            return {...x, backingAsset, expired: now > expiration };
          }).filter(x => x).sort((a, b) => new Date(b.creation_time) - new Date(a.creation_time));
          setPmaProcessedData(processedData);
        }
      });
    }

    if (predictionMarketAssets && predictionMarketAssets.length) {
      fetching();
    }
  }, [predictionMarketAssets]);

  const [usrBalances, setUsrBalances] = useState();
  const [balanceAssetIDs, setBalanceAssetIDs] = useState([]);
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id, currentNode ? currentNode.url : null]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBalanceAssetIDs(data.map((x) => x.asset_id));
          setUsrBalances(data);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr]);

  const activePMAs = useMemo(() => {
    return pmaProcessedData.filter((x) => !x.expired);
  }, [pmaProcessedData]);

  const expiredPMAs = useMemo(() => {
    return pmaProcessedData.filter((x) => x.expired);
  }, [pmaProcessedData]);

  const myPMAs = useMemo(() => {
    return pmaProcessedData.filter((x) => x.issuer === usr.id);
  }, [pmaProcessedData]);

  const balancePMAs = useMemo(() => {
    return pmaProcessedData.filter((x) => balanceAssetIDs.includes(x.id));
  }, [pmaProcessedData, balanceAssetIDs]);

  const [completedPMAs, setCompletedPMAs] = useState([]);
  useEffect(() => {
    async function fetching() {
      const _store = createObjectStore([_chain, JSON.stringify(pmaProcessedData.map(x => x.bitasset_data_id)), currentNode.url]);
    
      _store.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const outcomes = data.map((x) => {
            if (!x.settlement_price) {
              return;
            }

            const baseAmount = parseInt(x.settlement_price.base.amount);
            if (baseAmount === 0) {
              return { ...x, outcome: -1 }
            }

            const quoteAsset = assets.find((y) => x.options.short_backing_asset === y.id);
            const baseAsset = assets.find((y) => x.asset_id === y.id);

            const _outcome = parseFloat((
              humanReadableFloat(
                parseInt(x.settlement_price.quote.amount),
                quoteAsset.precision
              ) /
              humanReadableFloat(baseAmount, baseAsset.precision)
            ).toFixed(quoteAsset.precision));

            return { ...x, outcome: _outcome > 0 ? 1 : 0 };
          }).filter(x => x);
          setCompletedPMAs(outcomes);
        }
      });
    }

    if (pmaProcessedData && pmaProcessedData.length) {
      fetching();
    }
  }, [pmaProcessedData]);

  const [callOrders, setCallOrders] = useState([]);
  useEffect(() => {
    async function fetching() {
      const _assetStore = createAssetCallOrdersStore([
        _chain,
        JSON.stringify(completedPMAs.map((x) => x.asset_id)),
        currentNode.url
      ]);

      _assetStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setCallOrders(data);
        }
      }); 
    }
    
    if (completedPMAs && completedPMAs.length) {
      fetching();
    }
  }, [completedPMAs]);

  const marginPMAs = useMemo(() => {
    return pmaProcessedData.filter(pma => {
        return callOrders.some(order => {
            const orderEntries = Object.values(order);
            return orderEntries.some(entries => {
                return entries.some(entry => entry.borrower === usr.id);
            });
        });
    });
  }, [pmaProcessedData, callOrders, usr.id]);

  const chosenPMAs = useMemo(() => {
    if (view === "active") {
      return activePMAs;
    } else if (view === "expired") {
      return expiredPMAs;
    } else if (view === "mine") {
      return myPMAs;
    } else if (view === "portfolio") {
      return balancePMAs;
    } else if (view === "margin") {
      return marginPMAs;
    }
  }, [view, activePMAs, expiredPMAs, myPMAs]);

  const PredictionRow = ({ index, style }) => {
    let res;
    if (view === "active") {
      res = activePMAs[index];
    } else if (view === "expired") {
      res = expiredPMAs[index];
    } else if (view === "mine") {
      res = myPMAs[index];
    }

    const relevantBitassetData = completedPMAs.find((x) => x.id === res.bitasset_data_id);

    if (!res || !relevantBitassetData) {
      return null;
    }

    const [rowView, setRowView] = useState("about"); 

    const symbol = res.symbol;
    const house = res.issuer;

    let foundAsset = marketSearch && marketSearch.length && symbol
      ? marketSearch.find((x) => x.s === symbol)
      : null;
    let username = foundAsset ? foundAsset.u : null;
    if (!username) {
      username = marketSearch && marketSearch.length && house
        ? marketSearch.find((x) => x.u.includes(`(${house})`)).u
        : null;
    }

    const _desc = JSON.parse(res.options.description);

    const prediction_conditions = _desc.condition;
    const main_description = _desc.main;
    const expiration = _desc.expiry;

    const expirationHours = hoursTillExpiration(expiration);

    const market = _desc.market;

    const cleanedPrediction = DOMPurify.sanitize(prediction_conditions ?? ""); // sanitize to avoid xss
    const cleanedDescription = DOMPurify.sanitize(main_description ?? ""); // sanitize to avoid xss

    let relevantCallOrders = callOrders.hasOwnProperty(res.id) ? callOrders[res.id] : null;
    const totalBets = relevantCallOrders && relevantCallOrders.length
      ? relevantCallOrders.reduce((acc, val) => acc + val.collateral, 0)
      : 0;

    const usrCallOrder = relevantCallOrders && relevantCallOrders.length
      ? relevantCallOrders.filter((x) => x.borrower === usr.id)
      : null;
    const existingCollateral = usrCallOrder ? usrCallOrder.collateral : 0;

    const _backingAssetID = res.backingAsset.id;
    const _backingPrecision = res.backingAsset.precision;
    const backingAssetBalance = usrBalances.find((x) => x.asset_id === _backingAssetID);
    const humanReadableBackingAssetBalance = backingAssetBalance ? humanReadableFloat(backingAssetBalance.amount, _backingPrecision) : 0;

    const predictionMarketAssetBalance = usrBalances.find((x) => x.asset_id === res.id);
    const humanReadablePredictionMarketAssetBalance = predictionMarketAssetBalance ? humanReadableFloat(predictionMarketAssetBalance.amount, res.precision) : 0;

    const _flags = getFlagBooleans(res.options.flags);
    const _issuer_permissions = getFlagBooleans(res.options.issuer_permissions);

    // sellers (false betters)
    const [issuePrompt, setIssuePrompt] = useState(false); // prompting user with issue ux
    const [issueAmount, setIssueAmount] = useState(0); // amount of prediction market assets to issue
    const [issueDialog, setIssueDialog] = useState(false);

    const [sellPrompt, setSellPrompt] = useState(false); // prompting user with sell ux 
    const [sellAmount, setSellAmount] = useState(0); // amount of prediction market assets to sell
    const [sellDialog, setSellDialog] = useState(false);

    const [expiryType, setExpiryType] = useState("1hr");
    const [expiry, setExpiry] = useState(() => {
      const now = new Date();
      const oneHour = 60 * 60 * 1000;
      return new Date(now.getTime() + oneHour);
    });
  
    const [date, setDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Solely for the calendar component to display a date string

    useEffect(() => {
      if (expiryType === "specific" && date) {
        setExpiry(date);
      }
    }, [expiryType, date]);

    // buyer (true betters)
    const [buyPrompt, setBuyPrompt] = useState(false); // prompting user with buy ux
    const [buyAmount, setBuyAmount] = useState(0); // amount of prediction market assets to buy
    const [buyDialog, setBuyDialog] = useState(false);
        
    const [claimPrompt, setClaimPrompt] = useState(false); // winning buyer prize claim dialog
    const [claimAmount, setClaimAmount] = useState(0); // amount of prediction market assets to claim
    const [claimDialog, setClaimDialog] = useState(false);
  
    // owner (issuer) - admin
    const [resolvePrompt, setResolvePrompt] = useState(false); // prompting user with resolve ux
    const [chosenOutcome, setChosenOutcome] = useState(); // chosen outcome of prediction market
    const [resolveDialog, setResolveDialog] = useState(false);

    const [pricefeederPrompt, setPricefeederPrompt] = useState(false); // prompting user with pricefeeder ux
    const [priceFeeders, setPriceFeeders] = useState([]); // list of price feeders for prediction market
    const [priceSearchDialog, setPriceSearchDialog] = useState(false);
    const [pricefeederDialog, setPricefeederDialog] = useState(false);

    // witness || committee || pricefeeder - admin
    const [priceFeedPrompt, setPriceFeedPrompt] = useState(false); // prompting user with price feed ux
    const [priceFeedOutcome, setPriceFeedOutcome] = useState(); // chosen outcome of prediction market
    const [priceFeedDialog, setPriceFeedDialog] = useState(false);

    const pricefeederRow = ({ index, style }) => {
      let res = priceFeeders[index];
      if (!res) {
        return null;
      }
      
      return (
        <div style={{ ...style }} key={`acard-${res.id}`}>
          <Card className="ml-2 mr-2 mt-1">
            <CardHeader className="pb-3 pt-3">
              <span className="grid grid-cols-12">
                <span className="col-span-1">
                  <Avatar
                    size={40} name={res.name} extra="Borrower"
                    expression={{ eye: "normal", mouth: "open" }}
                    colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                  />
                </span>
                <span className="col-span-10 ml-3">
                    #{index + 1}: {res.name} ({res.id})
                </span>
                <span className="col-span-1">
                  <Button
                      variant="outline"
                      className="mr-2"
                      onClick={(e) => {
                          e.preventDefault();
                          const _update = priceFeeders.filter((x) => x.id !== res.id);
                          setPriceFeeders(_update);
                      }}
                  >
                      ❌
                  </Button>
                </span>
              </span>
            </CardHeader>
          </Card>
        </div>
      );
    };

    return <div style={{ ...style }} key={`acard-${res.id}`}>
            <Card className={`ml-2 mr-2 h-[260px]`}>
              <CardHeader className="pb-0 pt-3">
                <CardTitle>
                  <div className="grid grid-cols-2">
                    <div>
                      <ExternalLink
                        classnamecontents={"text-xl text-semibold hover:text-purple-600"}
                        type="text"
                        text={`${symbol}`}
                        hyperlink={`https://blocksights.info/#/assets/${symbol}${_chain !== "bitshares" ? "?network=testnet" : ""}`}
                      />
                      {" "}
                      (
                      <ExternalLink
                        classnamecontents={"text-xl text-semibold hover:text-purple-600"}
                        type="text"
                        text={`${res.id}`}
                        hyperlink={`https://blocksights.info/#/assets/${res.id}${_chain !== "bitshares" ? "?network=testnet" : ""}`}
                      />
                      )
                    </div>
                    <div className="text-right">
                      <ExternalLink
                        classnamecontents={"text-xl text-semibold hover:text-purple-600"}
                        type="text"
                        text={username ?? house}
                        hyperlink={`https://blocksights.info/#/accounts/${house}${_chain !== "bitshares" ? "?network=testnet" : ""}`}
                      />
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm pb-3 mt-1">
                <div className="grid grid-cols-1 gap-2">
                  <div className={`grid grid-cols-${usr.id === house ? 5 : 4} gap-2 mt-2`}>
                    <Button
                      onClick={() => setRowView("about")}
                      variant={rowView === "about" ? "" : "outline"}
                      size="md"
                    >
                      {t("Predictions:about")}
                    </Button>
                    <Button
                      onClick={() => setRowView("description")}
                      variant={rowView === "description" ? "" : "outline"}
                      size="md"
                    >
                      {t("Predictions:description")}
                    </Button>
                    <Button
                      onClick={() => setRowView("actions")}
                      variant={rowView === "actions" ? "" : "outline"}
                      size="md"
                    >
                      {t("Predictions:actions")}
                    </Button>
                    {
                      usr.id === house
                        ? <Button
                            onClick={() => setRowView("admin")}
                            variant={rowView === "admin" ? "" : "outline"}
                            size="md"
                          >
                            {t("Predictions:admin")}
                          </Button>
                        : null
                    }
                  </div>
                  {
                    rowView === "about"
                      ? <div className="grid grid-cols-1">
                          <b>{t("Predictions:prediction")}</b>
                          <Textarea
                              placeholder={cleanedPrediction}
                              value={cleanedPrediction}
                              disabled={true}
                              className="max-h-[80px] mt-1"
                          />
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <b>{
                                t(`Predictions:${expirationHours >= 0 ? "expiration" : "expired_at"}`)
                              }</b>: {prettifyDate(expiration)}<br/>
                              {
                                expirationHours >= 0
                                  ? <>{t("Predictions:time_till_expiration", {hours: expirationHours})}<br/></>
                                  : null
                              }
                              {
                                view === "expired" || view === "mine"
                                ? <>
                                    <b>{t("Predictions:outcome")}</b>:{" "}
                                    {
                                      relevantBitassetData
                                      && relevantBitassetData.hasOwnProperty("outcome")
                                      && relevantBitassetData.outcome === 1
                                        ? t("Predictions:outcome_true")
                                        : null
                                    }
                                    {
                                      relevantBitassetData
                                      && relevantBitassetData.hasOwnProperty("outcome")
                                      && relevantBitassetData.outcome === 0
                                        ? t("Predictions:outcome_false")
                                        : null
                                    }
                                    {
                                      relevantBitassetData
                                      && relevantBitassetData.hasOwnProperty("outcome")
                                      && relevantBitassetData.outcome === -1
                                        ? t("Predictions:outcome_tba")
                                        : null
                                    }
                                    <br/>
                                    <b>{t("Predictions:prize_pool")}</b>:{" "}
                                    {
                                      relevantBitassetData
                                        ? humanReadableFloat(relevantBitassetData.settlement_fund, res.precision)
                                        : 0
                                    }
                                    {` ${market}`}
                                  </>
                                : null
                              }
                            </div>
                            <div>
                              <b>{t("Predictions:bettingAsset")}</b>: {market} ({res.backingAsset.id})<br/>
                              {
                                view !== "expired" || 
                                relevantBitassetData
                                && relevantBitassetData.hasOwnProperty("outcome")
                                && relevantBitassetData.outcome === -1
                                  ? <>
                                    <b>{t("Predictions:total_bets")}</b>:{" "} {humanReadableFloat(totalBets, res.precision)} {market}<br/>
                                    <b>{t("Predictions:unique_sellers")}</b>:{" "} {relevantCallOrders ? relevantCallOrders.length : 0}
                                  </>
                                  : null
                              }
                            </div>
                          </div>
                        </div>
                      : null
                  }
                  {
                    rowView === "description"
                      ? <div>
                          <b>{t("Predictions:description")}</b>
                          <Textarea
                              placeholder={cleanedDescription}
                              value={cleanedDescription}
                              disabled={true}
                              className="max-h-[95px] mt-1"
                          />
                          <div className="grid grid-cols-1 gap-1 mt-2">
                            <div>
                              {
                                Object.keys(_issuer_permissions).length > 0
                                ? <HoverCard>
                                    <HoverCardTrigger>
                                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                        <b>{t("Predictions:permissions")}</b>: {Object.keys(_issuer_permissions).length} <QuestionMarkCircledIcon className="ml-1" />
                                      </span>
                                    </HoverCardTrigger>
                                    <HoverCardContent className={"w-80 mt-1"} align="start">
                                      {Object.keys(_issuer_permissions).join(", ")}
                                    </HoverCardContent>
                                  </HoverCard>
                                : null
                              }
                            </div>
                            <div>
                                {
                                  Object.keys(_flags).length > 0
                                  ? <HoverCard>
                                      <HoverCardTrigger>
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                          <b>{t("Predictions:flags")}</b>: {Object.keys(_flags).length} <QuestionMarkCircledIcon className="ml-1" />
                                        </span>
                                      </HoverCardTrigger>
                                      <HoverCardContent className={"w-80 mt-1"} align="start">
                                        {Object.keys(_flags).join(", ")}
                                      </HoverCardContent>
                                    </HoverCard>
                                  : <><b>{t("Predictions:flags")}</b>: 0</>
                                }
                            </div>
                          </div>
                        </div>
                      : null
                  }
                  {
                    rowView === "actions" && view !== "expired"
                     ? 
                      <div className="grid grid-cols-1 gap-2">
                        <HoverInfo
                            content={t("Predictions:seller_content")}
                            header={t("Predictions:seller")}
                            type="header"
                        />
                        <div className="grid grid-cols-3 gap-3"> 
                          <Dialog
                              open={issuePrompt}
                              onOpenChange={(open) => {
                                setIssuePrompt(open);
                              }}
                          >
                              <DialogTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={(event) => {
                                    setIssuePrompt(true);
                                  }}
                                >
                                  {t(`Predictions:issue`)}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px] bg-white">
                                  <DialogHeader>
                                      <DialogTitle>
                                        {t(`Predictions:issueDialog.title`)}
                                      </DialogTitle>
                                      <DialogDescription>
                                        {t(`Predictions:issueDialog.description`)}
                                      </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1 gap-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <HoverInfo
                                          content={t("Predictions:issueDialog.qtyContent")}
                                          header={t("Predictions:issueDialog.qtyHeader")}
                                          type="header"
                                      />
                                      <Button
                                        className="h-6 mt-1 ml-3 hover:shadow-md"
                                        onClick={() => {
                                          setIssueAmount(
                                            backingAssetBalance
                                              ? humanReadableFloat(backingAssetBalance.amount, _backingPrecision)
                                              : 0
                                          );
                                        }}
                                        variant="outline"
                                      >
                                        {t("Predictions:issueDialog.balance")}
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        type="number"
                                        value={issueAmount}
                                        min={1}
                                        step={1}
                                        onInput={(e) => {
                                          const input = parseInt(e.currentTarget.value);
                                          if (input >= 0) {
                                            setIssueAmount(parseInt(e.currentTarget.value))
                                          } else {
                                            setIssueAmount(0);
                                          }
                                        }}
                                      />
                                      <Input
                                        type="text"
                                        value={`${res.backingAsset.symbol} (${res.backingAsset.id})`}
                                        disabled
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <HoverInfo
                                            content={t("Predictions:issueDialog.existingContent")}
                                            header={t("Predictions:issueDialog.existingHeader")}
                                            type="header"
                                        />
                                        <Input
                                          type="text"
                                          value={`${existingCollateral} ${res.backingAsset.symbol} (${res.backingAsset.id})`}
                                          className="mt-1"
                                          disabled
                                        />
                                      </div>
                                      <div>
                                        <HoverInfo
                                            content={t("Predictions:issueDialog.totalContent")}
                                            header={t("Predictions:issueDialog.totalHeader")}
                                            type="header"
                                        />
                                        <Input
                                          type="text"
                                          value={`${existingCollateral + issueAmount} ${res.backingAsset.symbol} (${res.backingAsset.id})`}
                                          className="mt-1"
                                          disabled
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Button
                                        className="h-6 mt-1 w-1/2"
                                        onClick={() => {
                                          setIssueDialog(true);
                                        }}
                                      >
                                        {t("Predictions:submit")}
                                      </Button>
                                      {
                                        issueAmount > humanReadableBackingAssetBalance
                                        ? <Badge variant="destructive">
                                            <ExclamationTriangleIcon className="mr-2"/> {t("Predictions:insufficient_funds")}
                                        </Badge>
                                        : null
                                      }
                                    </div>
                                  </div>
                                  {
                                    issueDialog
                                    ? <DeepLinkDialog
                                        operationName="call_order_update"
                                        username={usr.username}
                                        usrChain={usr.chain}
                                        userID={usr.id}
                                        dismissCallback={setIssueDialog}
                                        key={`deeplink-dialog-${res.id}`}
                                        headerText={t(`Predictions:dialogContent.header_issue`)}
                                        trxJSON={[{
                                          funding_account: usr.id,
                                          delta_collateral: {
                                            amount: blockchainFloat(existingCollateral + issueAmount, res.precision),
                                            asset_id: res.id
                                          },
                                          delta_debt: {
                                            amount: blockchainFloat(existingCollateral + issueAmount, _backingPrecision),
                                            asset_id: _backingAssetID
                                          },
                                          extensions: {}
                                        }]}
                                      />
                                    : null
                                  }
                              </DialogContent>
                          </Dialog>
                          <Dialog
                            open={sellPrompt}
                            onOpenChange={(open) => {
                              setSellPrompt(open);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                onClick={() => {
                                  setSellPrompt(true);
                                }}
                              >
                                {t(`Predictions:sell`)}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] bg-white">
                              <DialogHeader>
                                  <DialogTitle>
                                    {t(`Predictions:sellDialog.title`)}
                                  </DialogTitle>
                                  <DialogDescription>
                                    {t(`Predictions:sellDialog.description`)}
                                  </DialogDescription>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-1">
                                <HoverInfo
                                    content={t("Predictions:sellDialog.qtyContent")}
                                    header={t("Predictions:sellDialog.qtyHeader")}
                                    type="header"
                                />
                                <Button
                                  className="h-6 mt-1 ml-3 hover:shadow-md"
                                  onClick={() => {
                                    setSellAmount(
                                      humanReadablePredictionMarketAssetBalance
                                        ? humanReadablePredictionMarketAssetBalance
                                        : 0
                                    );
                                  }}
                                  variant="outline"
                                >
                                  {t("Predictions:issueDialog.balance")}
                                </Button>
                                <Input
                                  type="number"
                                  value={sellAmount}
                                  min={1}
                                  step={1}
                                  onInput={(e) => {
                                    const input = parseInt(e.currentTarget.value);
                                    if (input >= 0) {
                                      setSellAmount(parseInt(e.currentTarget.value))
                                    } else {
                                      setSellAmount(0);
                                    }
                                  }}
                                  className="mt-1"
                                />
                                <Input
                                  type="text"
                                  value={`${res.symbol} (${res.id})`}
                                  disabled
                                  className="mt-1"
                                />
                                <div className="col-span-2">
                                  <HoverInfo
                                    content={t("Predictions:sellDialog.receivingContent")}
                                    header={t("Predictions:sellDialog.receivingHeader")}
                                    type="header"
                                  />
                                  <Input
                                    type="number"
                                    placeholder={`${sellAmount ?? 0} ${res.backingAsset.symbol} (${res.backingAsset.id})`}
                                    disabled
                                    className="mt-1 w-1/2"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <HoverInfo
                                      content={t("Predictions:sellDialog.expiryContent")}
                                      header={t("Predictions:sellDialog.expiryHeader")}
                                      type="header"
                                  />                               
                                  <Select
                                    onValueChange={(selectedExpiry) => {
                                      setExpiryType(selectedExpiry);
                                      const oneHour = 60 * 60 * 1000;
                                      const oneDay = 24 * oneHour;
                                      if (selectedExpiry !== "specific" && selectedExpiry !== "fkill") {
                                        const now = new Date();
                                        let expiryDate;
                                        if (selectedExpiry === "1hr") {
                                          expiryDate = new Date(now.getTime() + oneHour);
                                        } else if (selectedExpiry === "12hr") {
                                          const duration = oneHour * 12;
                                          expiryDate = new Date(now.getTime() + duration);
                                        } else if (selectedExpiry === "24hr") {
                                          const duration = oneDay;
                                          expiryDate = new Date(now.getTime() + duration);
                                        } else if (selectedExpiry === "7d") {
                                          const duration = oneDay * 7;
                                          expiryDate = new Date(now.getTime() + duration);
                                        } else if (selectedExpiry === "30d") {
                                          const duration = oneDay * 30;
                                          expiryDate = new Date(now.getTime() + duration);
                                        }

                                        if (expiryDate) {
                                          setDate(expiryDate);
                                        }
                                        setExpiry(selectedExpiry);
                                      } else if (selectedExpiry === "fkill") {
                                        const now = new Date();
                                        setExpiry(new Date(now.getTime() + oneDay));
                                      } else if (selectedExpiry === "specific") {
                                        // Setting a default date expiry
                                        setExpiry();
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="mb-3 mt-1 w-1/2">
                                      <SelectValue placeholder="1hr" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                      <SelectItem value="1hr">{t("LimitOrderCard:expiry.1hr")}</SelectItem>
                                      <SelectItem value="12hr">{t("LimitOrderCard:expiry.12hr")}</SelectItem>
                                      <SelectItem value="24hr">{t("LimitOrderCard:expiry.24hr")}</SelectItem>
                                      <SelectItem value="7d">{t("LimitOrderCard:expiry.7d")}</SelectItem>
                                      <SelectItem value="30d">{t("LimitOrderCard:expiry.30d")}</SelectItem>
                                      <SelectItem value="specific">
                                        {t("LimitOrderCard:expiry.specific")}
                                      </SelectItem>
                                      <SelectItem value="fkill">{t("LimitOrderCard:expiry.fkill")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {expiryType === "specific" ? (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant={"outline"}
                                          className={cn(
                                            "w-[240px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                          )}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {date ? (
                                            format(date, "PPP")
                                          ) : (
                                            <span>{t("LimitOrderCard:expiry.pickDate")}</span>
                                          )}
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
                                              //console.log("Not a valid date");
                                              setDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000));
                                              return;
                                            }
                                            //console.log("Setting expiry date");
                                            setDate(e);
                                          }}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  ) : null}
                                  {expiryType === "fkill" ? t("LimitOrderCard:expiry.fkillDescription") : null}
                                  {expiryType !== "specific" && expiryType !== "fkill"
                                    ? t("LimitOrderCard:expiry.generalDescription", { expiryType })
                                    : null}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  className="h-6 mt-1 w-1/2"
                                  onClick={() => {
                                    setSellDialog(true);
                                  }}
                                >
                                  {t("Predictions:submit")}
                                </Button>
                                {
                                  sellAmount > humanReadablePredictionMarketAssetBalance
                                  ? <Badge variant="destructive">
                                      <ExclamationTriangleIcon className="mr-2"/> {t("Predictions:insufficient_funds")}
                                  </Badge>
                                  : null
                                }
                              </div>
                              {
                                sellDialog // selling the PMA token in return for backing asset tokens
                                  ? <DeepLinkDialog
                                      operationName="limit_order_create"
                                      username={usr.username}
                                      usrChain={usr.chain}
                                      userID={usr.id}
                                      dismissCallback={setSellDialog}
                                      key={`deeplink-selldialog-${res.id}`}
                                      headerText={t(`Predictions:dialogContent.header_sell`)}
                                      trxJSON={[{
                                        seller: usr.id,
                                        amount_to_sell: {
                                          amount: blockchainFloat(sellAmount, res.precision).toFixed(0),
                                          asset_id: res.id
                                        },
                                        min_to_receive: {
                                          amount: blockchainFloat(sellAmount, _backingPrecision).toFixed(0),
                                          asset_id: _backingAssetID
                                        },
                                        expiration: expiry,
                                        fill_or_kill: expiryType === "fkill" ? true : false,
                                        extensions: {}
                                      }]}
                                    />
                                  : null
                              }
                            </DialogContent>
                          </Dialog>
                        </div>
                        <HoverInfo
                            content={t("Predictions:buyer_content")}
                            header={t("Predictions:buyer")}
                            type="header"
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <Dialog
                            open={buyPrompt}
                            onOpenChange={(open) => {
                              setBuyPrompt(open);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                  onClick={() => {
                                    setBuyPrompt(true);
                                  }}
                                >
                                {t(`Predictions:buy`)}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] bg-white">
                                <DialogHeader>
                                  <DialogTitle>
                                    {t(`Predictions:buyDialog.title`)}
                                  </DialogTitle>
                                  <DialogDescription>
                                    {t(`Predictions:buyDialog.description`)}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <HoverInfo
                                        content={t("Predictions:issueDialog.qtyContent")}
                                        header={t("Predictions:issueDialog.qtyHeader")}
                                        type="header"
                                    />
                                    <Button
                                      className="h-6 mt-1 ml-3 hover:shadow-md"
                                      onClick={() => {
                                        setBuyAmount(
                                          humanReadableBackingAssetBalance
                                            ? humanReadableBackingAssetBalance
                                            : 0
                                        );
                                      }}
                                      variant="outline"
                                    >
                                      {t("Predictions:issueDialog.balance")}
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      type="number"
                                      value={buyAmount}
                                      min={1}
                                      step={1}
                                      onInput={(e) => {
                                        const input = parseInt(e.currentTarget.value);
                                        if (input >= 0) {
                                          setBuyAmount(parseInt(e.currentTarget.value))
                                        } else {
                                          setBuyAmount(0);
                                        }
                                      }}
                                    />
                                    <Input
                                      type="text"
                                      value={`${res.backingAsset.symbol} (${res.backingAsset.id})`}
                                      disabled
                                    />
                                  </div>
                                  <div>
                                    <HoverInfo
                                        content={t("Predictions:issueDialog.receivingContent")}
                                        header={t("Predictions:issueDialog.receivingHeader")}
                                        type="header"
                                    />
                                    <div className="grid grid-cols-1 gap-2">
                                      <Input
                                        type="text"
                                        value={`${buyAmount} ${res.symbol} (${res.id})`}
                                        disabled
                                        className="w-1/2"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <HoverInfo
                                        content={t("Predictions:sellDialog.expiryContent")}
                                        header={t("Predictions:sellDialog.expiryHeader")}
                                        type="header"
                                    />                               
                                    <Select
                                      onValueChange={(selectedExpiry) => {
                                        setExpiryType(selectedExpiry);
                                        const oneHour = 60 * 60 * 1000;
                                        const oneDay = 24 * oneHour;
                                        if (selectedExpiry !== "specific" && selectedExpiry !== "fkill") {
                                          const now = new Date();
                                          let expiryDate;
                                          if (selectedExpiry === "1hr") {
                                            expiryDate = new Date(now.getTime() + oneHour);
                                          } else if (selectedExpiry === "12hr") {
                                            const duration = oneHour * 12;
                                            expiryDate = new Date(now.getTime() + duration);
                                          } else if (selectedExpiry === "24hr") {
                                            const duration = oneDay;
                                            expiryDate = new Date(now.getTime() + duration);
                                          } else if (selectedExpiry === "7d") {
                                            const duration = oneDay * 7;
                                            expiryDate = new Date(now.getTime() + duration);
                                          } else if (selectedExpiry === "30d") {
                                            const duration = oneDay * 30;
                                            expiryDate = new Date(now.getTime() + duration);
                                          }

                                          if (expiryDate) {
                                            setDate(expiryDate);
                                          }
                                          setExpiry(selectedExpiry);
                                        } else if (selectedExpiry === "fkill") {
                                          const now = new Date();
                                          setExpiry(new Date(now.getTime() + oneDay));
                                        } else if (selectedExpiry === "specific") {
                                          // Setting a default date expiry
                                          setExpiry();
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="mb-3 mt-1 w-1/2">
                                        <SelectValue placeholder="1hr" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white">
                                        <SelectItem value="1hr">{t("LimitOrderCard:expiry.1hr")}</SelectItem>
                                        <SelectItem value="12hr">{t("LimitOrderCard:expiry.12hr")}</SelectItem>
                                        <SelectItem value="24hr">{t("LimitOrderCard:expiry.24hr")}</SelectItem>
                                        <SelectItem value="7d">{t("LimitOrderCard:expiry.7d")}</SelectItem>
                                        <SelectItem value="30d">{t("LimitOrderCard:expiry.30d")}</SelectItem>
                                        <SelectItem value="specific">
                                          {t("LimitOrderCard:expiry.specific")}
                                        </SelectItem>
                                        <SelectItem value="fkill">{t("LimitOrderCard:expiry.fkill")}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {expiryType === "specific" ? (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant={"outline"}
                                            className={cn(
                                              "w-[240px] justify-start text-left font-normal",
                                              !date && "text-muted-foreground"
                                            )}
                                          >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? (
                                              format(date, "PPP")
                                            ) : (
                                              <span>{t("LimitOrderCard:expiry.pickDate")}</span>
                                            )}
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
                                                //console.log("Not a valid date");
                                                setDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000));
                                                return;
                                              }
                                              //console.log("Setting expiry date");
                                              setDate(e);
                                            }}
                                            initialFocus
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    ) : null}
                                    {expiryType === "fkill" ? t("LimitOrderCard:expiry.fkillDescription") : null}
                                    {expiryType !== "specific" && expiryType !== "fkill"
                                      ? t("LimitOrderCard:expiry.generalDescription", { expiryType })
                                      : null}
                                  </div>
                                </div>

                                <div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      className="h-6 mt-1 w-1/2"
                                      onClick={() => {
                                        setBuyDialog(true);
                                      }}
                                    >
                                      {t("Predictions:submit")}
                                    </Button>
                                    {
                                      buyAmount > humanReadableBackingAssetBalance
                                      ? <Badge variant="destructive">
                                          <ExclamationTriangleIcon className="mr-2"/> {t("Predictions:insufficient_funds")}
                                      </Badge>
                                      : null
                                    }
                                  </div>
                                </div>
                                {
                                  buyDialog // buying the PMA token in return for backing asset tokens
                                    ? <DeepLinkDialog
                                        operationName="limit_order_create"
                                        username={usr.username}
                                        usrChain={usr.chain}
                                        userID={usr.id}
                                        dismissCallback={setBuyDialog}
                                        key={`deeplink-buydialog-${res.id}`}
                                        headerText={t(`Predictions:dialogContent.header_buy`)}
                                        trxJSON={[{
                                          seller: usr.id,
                                          amount_to_sell: {
                                            amount: blockchainFloat(buyAmount, _backingPrecision).toFixed(0),
                                            asset_id: _backingAssetID
                                          },
                                          min_to_receive: {
                                            amount: blockchainFloat(buyAmount, res.precision).toFixed(0),
                                            asset_id: res.id
                                          },
                                          expiration: expiry,
                                          fill_or_kill: expiryType === "fkill" ? true : false,
                                          extensions: {}
                                        }]}
                                      />
                                    : null
                                }
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                     : null
                  }
                  {
                    rowView === "actions" && view === "expired"
                     ? 
                      <div className="grid grid-cols-1 gap-2">
                        <HoverInfo
                            content={t("Predictions:winner_content")}
                            header={t("Predictions:winner_header")}
                            type="header"
                        />
                        <div className="grid grid-cols-3 gap-3 mt-1">
                          <Dialog
                            open={claimPrompt}
                            onOpenChange={(open) => {
                              setClaimPrompt(open);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                onClick={() => {
                                  setClaimPrompt(true);
                                }}
                              >
                                {t(`Predictions:winner_claim`)}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] bg-white">
                                <DialogHeader>
                                    <DialogTitle>
                                      {t(`Predictions:winner_claim`)}
                                    </DialogTitle>
                                    <DialogDescription>
                                      {t(`Predictions:winner_content`)}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <HoverInfo
                                      content={t("Predictions:claimDialog.qtyContent")}
                                      header={t("Predictions:claimDialog.qtyHeader")}
                                      type="header"
                                    />
                                    <Button
                                      className="h-6 mt-1 ml-3 hover:shadow-md"
                                      onClick={() => {
                                        setClaimAmount(
                                          humanReadableFloat(relevantBitassetData.settlement_fund, res.precision)
                                        );
                                      }}
                                      variant="outline"
                                    >
                                      {t("Predictions:issueDialog.balance")}
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      type="number"
                                      value={claimAmount}
                                      min={1}
                                      step={1}
                                      onInput={(e) => {
                                        const input = parseInt(e.currentTarget.value);
                                        if (input >= 0) {
                                          setClaimAmount(parseInt(e.currentTarget.value))
                                        } else {
                                          setClaimAmount(0);
                                        }
                                      }}
                                    />
                                    <Input
                                      type="text"
                                      value={`${res.symbol} (${res.id})`}
                                      disabled
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      className="h-6 mt-1 w-1/2"
                                      onClick={() => {
                                        setClaimDialog(true);
                                      }}
                                    >
                                      {t("Predictions:submit")}
                                    </Button>
                                    {
                                      claimAmount > humanReadablePredictionMarketAssetBalance
                                        ? <Badge variant="destructive">
                                            <ExclamationTriangleIcon className="mr-2"/> {t("Predictions:insufficient_funds")}
                                          </Badge>
                                        : null
                                    }
                                  </div>
                                </div>
                                {
                                  claimDialog
                                    ? <DeepLinkDialog
                                        operationName="asset_settle"
                                        username={usr.username}
                                        usrChain={usr.chain}
                                        userID={usr.id}
                                        dismissCallback={setClaimDialog}
                                        key={`deeplink-claimdialog-${res.id}`}
                                        headerText={t(`Predictions:dialogContent.header_claim`)}
                                        trxJSON={[{
                                          account: usr.id,
                                          amount: {
                                            amount: blockchainFloat(claimAmount, res.precision).toFixed(0),
                                            asset_id: res.id
                                          },
                                          extensions: {}
                                        }]}
                                      />
                                    : null
                                }
                            </DialogContent>
                          </Dialog>

                        </div>
                      </div>
                     : null
                  }
                  {
                    rowView === "admin"
                      ? <div className="grid grid-cols-1 gap-2">
                          <HoverInfo
                              content={t("Predictions:admin_content")}
                              header={t("Predictions:admin")}
                              type="header"
                          />
                          <div className="grid grid-cols-3 gap-3 mt-1">
                            {
                              !expiredPMAs.find((x) => x.id === res.id)
                              ? <HoverCard>
                                  <HoverCardTrigger>
                                    <Button disabled>
                                      {t(`Predictions:resolve`)}
                                    </Button>
                                  </HoverCardTrigger>
                                  <HoverCardContent className={"w-80 mt-1"} align="start">
                                    <p className="leading-6 text-sm [&:not(:first-child)]:mt-1">
                                      {t("Predictions:not_expired")}<br/>
                                      {t("Predictions:time_till_expiration", {hours: expirationHours})}
                                    </p>
                                  </HoverCardContent>
                                </HoverCard>
                              : <Dialog
                                  open={resolvePrompt}
                                  onOpenChange={(open) => {
                                    setResolvePrompt(open);
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      onClick={() => {
                                        setResolvePrompt(true);
                                      }}
                                    >
                                      {t(`Predictions:resolve`)}
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[600px] bg-white">
                                    <DialogHeader>
                                        <DialogTitle>
                                          {t(`Predictions:resolveDialog.title`)}
                                        </DialogTitle>
                                        <DialogDescription>
                                          {t(`Predictions:resolveDialog.description`)}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid grid-cols-1 gap-2">
                                      <b>{t("Predictions:prediction")}</b>
                                      <Textarea
                                          placeholder={cleanedPrediction}
                                          value={cleanedPrediction}
                                          disabled={true}
                                          className="max-h-[80px] mt-1"
                                      />
                                      <div>
                                        <b>{
                                          t(`Predictions:${expirationHours >= 0 ? "expiration" : "expired_at"}`)
                                        }</b>: {prettifyDate(expiration)}
                                      </div>
                                      {
                                        expirationHours >= 0
                                          ? <>{t("Predictions:time_till_expiration", {hours: expirationHours})}<br/></>
                                          : null
                                      }
                                      <HoverInfo
                                        content={t("Predictions:resolveDialog.outcomeContent")}
                                        header={t("Predictions:resolveDialog.outcomeHeader")}
                                        type="header"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <RadioGroup defaultValue={chosenOutcome ?? ""} onClick={(e) => {
                                          const value = e.target.value;
                                          if (value) {
                                            setChosenOutcome(value);
                                          }
                                        }}>
                                          <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="1" id="1" />
                                            <Label htmlFor="1">{t("Predictions:resolveDialog.true")}</Label>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="2" id="2" />
                                            <Label htmlFor="2">{t("Predictions:resolveDialog.false")}</Label>
                                          </div>
                                        </RadioGroup>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Button
                                          className="h-6 mt-1 w-1/2"
                                          onClick={() => {
                                            setResolveDialog(true);
                                          }}
                                        >
                                          {t("Predictions:submit")}
                                        </Button>
                                      </div>
                                    </div>
                                    {
                                      resolveDialog && chosenOutcome
                                        ? <DeepLinkDialog
                                            operationName="asset_global_settle"
                                            username={usr.username}
                                            usrChain={usr.chain}
                                            userID={usr.id}
                                            dismissCallback={setResolveDialog}
                                            key={`deeplink-resolvedialog-${res.id}`}
                                            headerText={t(`Predictions:dialogContent.header_resolve`)}
                                            trxJSON={[{
                                              issuer: usr.id,
                                              asset_to_settle: res.id,
                                              settle_price: {
                                                base: {
                                                  amount: 1, // 1 indicates prediction has been resolved
                                                  asset_id: res.id
                                                },
                                                quote: {
                                                  amount: chosenOutcome === "1"
                                                            ? 1  // true
                                                            : 0, // false
                                                  asset_id: _backingAssetID
                                                }
                                              },
                                              extensions: {}
                                            }]}
                                          />
                                        : null
                                    }
                                  </DialogContent>
                                </Dialog>
                            }
                            <Dialog
                              open={pricefeederPrompt}
                              onOpenChange={(open) => {
                                setPricefeederPrompt(open);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  onClick={() => {
                                    setPricefeederPrompt(true);
                                  }}
                                >
                                  {t(`Predictions:pricefeeder`)}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px] bg-white">
                                <DialogHeader>
                                      <DialogTitle>
                                        {t(`Predictions:priceFeederDialog.title`)}
                                      </DialogTitle>
                                      <DialogDescription>
                                        {t(`Predictions:priceFeederDialog.description`)}
                                      </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1 gap-2">
                                    <HoverInfo
                                        content={t("Predictions:priceFeederDialog.priceFeedersContent")}
                                        header={t("Predictions:priceFeederDialog.priceFeedersHeader")}
                                        type="header"
                                    />
                                    <div className="grid grid-cols-12 mt-1">
                                      <span className="col-span-9 border border-grey rounded">
                                          <List
                                              height={210}
                                              itemCount={priceFeeders.length}
                                              itemSize={100}
                                              className="w-full"
                                          >
                                              {pricefeederRow}
                                          </List>
                                      </span>
                                      <span className="col-span-3 ml-3 text-center">
                                          <Dialog
                                              open={priceSearchDialog}
                                              onOpenChange={(open) => {
                                                  setPriceSearchDialog(open);
                                              }}
                                          >
                                              <DialogTrigger asChild>
                                                  <Button variant="outline" className="ml-3 mt-1">
                                                  ➕ {t("CreditOfferEditor:addUser")}
                                                  </Button>
                                              </DialogTrigger>
                                              <DialogContent className="sm:max-w-[375px] bg-white">
                                                <DialogHeader>
                                                  <DialogTitle>
                                                      {!usr || !usr.chain
                                                      ? t("Transfer:bitsharesAccountSearch")
                                                      : null}
                                                      {usr && usr.chain === "bitshares"
                                                      ? t("Transfer:bitsharesAccountSearchBTS")
                                                      : null}
                                                      {usr && usr.chain !== "bitshares"
                                                      ? t("Transfer:bitsharesAccountSearchTEST")
                                                      : null}
                                                  </DialogTitle>
                                                </DialogHeader>
                                                <AccountSearch
                                                    chain={usr && usr.chain ? usr.chain : "bitshares"}
                                                    excludedUsers={
                                                        usr && usr.username && usr.username.length ? [usr] : []
                                                    }
                                                    setChosenAccount={(_account) => {
                                                        if (
                                                            _account &&
                                                            !priceFeeders.find((_usr) => _usr.id === _account.id)
                                                        ) {
                                                            setPriceFeeders(
                                                              priceFeeders && priceFeeders.length
                                                                ? [priceFeeders].concat([_account])
                                                                : [_account]
                                                            );
                                                        }
                                                        setPriceSearchDialog(false);
                                                    }}
                                                />
                                              </DialogContent>
                                          </Dialog>
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Button
                                        className="h-6 mt-1 w-1/2"
                                        onClick={() => {
                                          setPricefeederDialog(true);
                                        }}
                                      >
                                        {t("Predictions:submit")}
                                      </Button>
                                    </div>
                                  </div>
                                  {
                                    pricefeederDialog
                                      ? <DeepLinkDialog
                                          operationName="asset_update_feed_producers"
                                          username={usr.username}
                                          usrChain={usr.chain}
                                          userID={usr.id}
                                          dismissCallback={setPricefeederDialog}
                                          key={`deeplink-pricefeeddialog-${res.id}`}
                                          headerText={t(`Predictions:dialogContent.header_pricefeeder`)}
                                          trxJSON={[{
                                            issuer: usr.id,
                                            asset_to_settle: res.id,
                                            settle_price: {
                                              issuer: usr.id,
                                              asset_to_update: res.id,
                                              new_feed_producers: priceFeeders.map((_usr) => _usr.id),
                                            },
                                            extensions: {}
                                          }]}
                                        />
                                      : null
                                  }
                              </DialogContent>
                            </Dialog>
                          </div>
                          <HoverInfo
                              content={t("Predictions:feeder_content")}
                              header={t("Predictions:price_feeders")}
                              type="header"
                          />
                          <div className="grid grid-cols-3 gap-3 mt-1">
                            <Dialog
                              open={priceFeedPrompt}
                              onOpenChange={(open) => {
                                setPriceFeedPrompt(open);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  onClick={() => {
                                    setPriceFeedPrompt(true);
                                  }}
                                >
                                  {t(`Predictions:feed`)}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px] bg-white">
                                <DialogHeader>
                                    <DialogTitle>
                                      {t(`Predictions:feederDialog.title`)}
                                    </DialogTitle>
                                    <DialogDescription>
                                      {t(`Predictions:feederDialog.description`)}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-1 gap-2">
                                
                                  <HoverInfo
                                    content={t("Predictions:resolveDialog.outcomeContent")}
                                    header={t("Predictions:resolveDialog.outcomeHeader")}
                                    type="header"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <RadioGroup defaultValue={priceFeedOutcome ?? ""} onClick={(e) => {
                                      const value = e.target.value;
                                      if (value) {
                                        setPriceFeedOutcome(value);
                                      }
                                    }}>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="1" id="1" />
                                        <Label htmlFor="1">{t("Predictions:resolveDialog.true")}</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="2" id="2" />
                                        <Label htmlFor="2">{t("Predictions:resolveDialog.false")}</Label>
                                      </div>
                                    </RadioGroup>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      className="h-6 mt-1 w-1/2"
                                      onClick={() => {
                                        setPriceFeedDialog(true);
                                      }}
                                    >
                                      {t("Predictions:submit")}
                                    </Button>
                                  </div>
                                  {
                                    priceFeedDialog && priceFeedOutcome
                                      ? <DeepLinkDialog // feeding the price of the prediction market asset (witness || committee || private price feeder)
                                          operationName="asset_publish_feed"
                                          username={usr.username}
                                          usrChain={usr.chain}
                                          userID={usr.id}
                                          dismissCallback={setPriceFeedDialog}
                                          key={`deeplink-feedpricedialog-${res.id}`}
                                          headerText={t(`Predictions:dialogContent.header_feedprice`)}
                                          trxJSON={[{
                                            publisher: usr.id,
                                            asset_id: res.id,
                                            feed: {
                                              settlement_price: {
                                                base: {
                                                  amount: 1, // 1 indicates prediction has been resolved
                                                  asset_id: res.id
                                                },
                                                quote: {
                                                  amount: priceFeedOutcome === "1"
                                                            ? 1  // true
                                                            : 0, // false
                                                  asset_id: _backingAssetID
                                                }
                                              },
                                              maintenance_collateral_ratio: 100,
                                              maximum_short_squeeze_ratio: 100,
                                              core_exchange_rate: {
                                                base: {
                                                  amount: 1, // 1 indicates prediction has been resolved
                                                  asset_id: res.id
                                                },
                                                quote: {
                                                  amount: priceFeedOutcome === "1"
                                                            ? 1  // true
                                                            : 0, // false
                                                  asset_id: _backingAssetID
                                                }
                                              }
                                          },
                                            extensions: {}
                                          }]}
                                        />
                                      : null
                                  }
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      : null
                  }
                </div>
              </CardContent>
            </Card>
          </div>;
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{t("Predictions:card.title")}</CardTitle>
            <CardDescription>{t("Predictions:card.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            
            <div className="grid grid-cols-5 gap-2 mt-2 mb-2">
              <Button
                onClick={() => setView("active")}
                variant={view === "active" ? "" : "outline"}
                size="md"
              >
                {t("Predictions:active")}
              </Button>
              <Button
                onClick={() => setView("expired")}
                variant={view === "expired" ? "" : "outline"}
                size="md"
              >
                {t("Predictions:expired")}
              </Button>
              <Button
                onClick={() => setView("mine")}
                variant={view === "mine" ? "" : "outline"}
                size="md"
              >
                {t("Predictions:mine")}
              </Button>
              <Button
                onClick={() => setView("portfolio")}
                variant={view === "portfolio" ? "" : "outline"}
                size="md"
              >
                {t("Predictions:portfolio")}
              </Button>
              <Button
                onClick={() => setView("margin")}
                variant={view === "margin" ? "" : "outline"}
                size="md"
              >
                {t("Predictions:margin")}
              </Button>
            </div>

            <>
              {
                chosenPMAs && chosenPMAs.length
                ? (
                  <List
                    height={500}
                    itemCount={chosenPMAs.length}
                    itemSize={275}
                    key={`list-${view}`}
                    className={`w-full mt-3`}
                  >
                    {PredictionRow}
                  </List>
                )
                : null
              }
              {
                chosenPMAs && !chosenPMAs.length && view === "active"
                  ? <div className="text-center mt-5">{t("Predictions:card.emptyActive")}</div>
                  : null
              }
              {
                chosenPMAs && !chosenPMAs.length && view === "mine"
                  ? <div className="text-center mt-5">{t("Predictions:card.emptyMine")}</div>
                  : null
              }
              {
                chosenPMAs && !chosenPMAs.length && view === "portfolio"
                  ? <div className="text-center mt-5">{t("Predictions:card.emptyPortfolio")}</div>
                  : null
              }
              {
                chosenPMAs && !chosenPMAs.length && view === "margin"
                  ? <div className="text-center mt-5">{t("Predictions:card.emptyMargin")}</div>
                  : null
              }
            </>
          </CardContent>
        </Card>
        {
          /*
          buyDialog || sellDialog
            ? <DeepLinkDialog
                operationName="limit_order_create"
                username={usr.username}
                usrChain={usr.chain}
                userID={usr.id}
                dismissCallback={buyDialog ? setBuyDialog : setSellDialog}
                key={`deeplink-dialog-${chosenPMA.id}`}
                headerText={t(`Predictions:dialogContent.header_${buyDialog ? "buy" : "sell"}`)}
                trxJSON={[{
                  seller: usr.id,
                  amount_to_sell: {
                    amount: 1,
                    asset_id: sellDialog ? chosenPMA.id : chosenPMA.id // JSON.parse(chosenPMA.options.description).market
                  },
                  min_to_receive: {
                    amount: 1,
                    asset_id: "1.3.1756"
                  },
                  expiration: expiry,
                  fill_or_kill: false,
                  extensions: {}
                }]}
              />
            : null
            */
        }
      </div>
    </div>
  );
}
