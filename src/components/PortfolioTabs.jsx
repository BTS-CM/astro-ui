import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createAccountHistoryStore } from "@/nanoeffects/AccountHistory.ts";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createAccountLimitOrderStore } from "@/nanoeffects/AccountLimitOrders.ts";

import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

import { humanReadableFloat } from "@/lib/common";
import { opTypes } from "@/lib/opTypes";

function RowHyperlink({
  id,
  share_asset_symbol,
  asset_a_symbol,
  asset_b_symbol,
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
  );
}

export default function PortfolioTabs(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const [sortType, setSortType] = useState("default");

  const { _assetsBTS, _assetsTEST, _poolsBTS, _poolsTEST } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  const assets = useMemo(() => {
    if (!_chain || (!_assetsBTS && !_assetsTEST)) {
      return [];
    }

    if (_chain !== "bitshares") {
      return _assetsTEST;
    }

    const relevantAssets = _assetsBTS.filter((asset) => {
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(asset.issuer)))
      );
    });

    return relevantAssets;
  }, [blocklist, _assetsBTS, _assetsTEST, _chain]);

  const pools = useMemo(() => {
    if (!_chain || (!_poolsBTS && !_poolsTEST)) {
      return [];
    }

    if (_chain !== "bitshares") {
      return _poolsTEST;
    }

    const relevantPools = _poolsBTS.filter((pool) => {
      const poolShareAsset = assets.find(
        (asset) => asset.id === pool.share_asset_id
      );
      if (!poolShareAsset) return false;
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(poolShareAsset.issuer)))
      );
    });

    return relevantPools;
  }, [assets, blocklist, _poolsBTS, _poolsTEST, _chain]);

  useInitCache(_chain ?? "bitshares", []);

  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

  const [activePortfolioTab, setActivePortfolioTab] = useState("balances");

  const [balanceCounter, setBalanceCounter] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalancesStore;
    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      unsubscribeUserBalancesStore = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            const updatedData = data
              .filter((balance) =>
                assets.find((x) => x.id === balance.asset_id)
              )
              .map((balance) => {
                return {
                  ...balance,
                  symbol: assets.find((x) => x.id === balance.asset_id).symbol,
                };
              });
            setBalances(updatedData);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalancesStore) unsubscribeUserBalancesStore();
    };
  }, [usr, balanceCounter, assets]);

  const sortedUserBalances = useMemo(() => {
    if (!balances || !balances.length) {
      return [];
    }

    const balancesCopy = [...balances];

    switch (sortType) {
      case "alphabetical":
        return balancesCopy.sort((a, b) => a.symbol.localeCompare(b.symbol));
      case "amount":
        return balancesCopy.sort(
          (a, b) => parseInt(b.amount) - parseInt(a.amount)
        );
      default:
        return balancesCopy;
    }
  }, [balances, sortType]);

  const [openOrderCounter, setOpenOrderCounter] = useState(0);
  const [openOrders, setOpenOrders] = useState();
  useEffect(() => {
    let unsubscribeLimitOrdersStore;

    if (usr && usr.id) {
      const limitOrdersStore = createAccountLimitOrderStore([
        usr.chain,
        usr.id,
      ]);

      unsubscribeLimitOrdersStore = limitOrdersStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            console.log("Successfully fetched open orders");
            setOpenOrders(data);
          }
        }
      );
    }

    return () => {
      if (unsubscribeLimitOrdersStore) unsubscribeLimitOrdersStore();
    };
  }, [usr, openOrderCounter]);

  const [activityCounter, setActivityCounter] = useState(0);
  const [activity, setActivity] = useState();
  useEffect(() => {
    let unsubscribeUserHistoryStore;

    if (usr && usr.id) {
      const userHistoryStore = createAccountHistoryStore([usr.chain, usr.id]);

      unsubscribeUserHistoryStore = userHistoryStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            console.log("Successfully fetched history");
            setActivity(data);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserHistoryStore) unsubscribeUserHistoryStore();
    };
  }, [usr, activityCounter]);

  const retrievedBalanceAssets = useMemo(() => {
    if (!assets || !balances) {
      return [];
    }
    let assetIDs = [];
    for (let i = 0; i < (openOrders?.length || 0); i++) {
      const baseID = openOrders[i].sell_price.base.asset_id;
      const quoteID = openOrders[i].sell_price.quote.asset_id;
      if (!assetIDs.includes(baseID)) {
        assetIDs.push(baseID);
      }
      if (!assetIDs.includes(quoteID)) {
        assetIDs.push(quoteID);
      }
    }

    for (let i = 0; i < (balances?.length || 0); i++) {
      const assetID = balances[i].asset_id;
      if (!assetIDs.includes(assetID)) {
        assetIDs.push(assetID);
      }
    }

    return assets.filter((asset) => assetIDs.includes(asset.id));
  }, [balances, openOrders, assets]);

  const [orderID, setOrderID] = useState();
  const [showDialog, setShowDialog] = useState(false);

  const BalanceRow = ({ index, style }) => {
    const rowBalance = sortedUserBalances[index];

    const _balanceAsset = retrievedBalanceAssets.find(
      (asset) => asset.id === rowBalance.asset_id
    );
    const _balanceAssetSymbol = _balanceAsset.symbol;

    const currentBalance =
      retrievedBalanceAssets && Array.isArray(retrievedBalanceAssets)
        ? retrievedBalanceAssets.find(
            (asset) => asset.id === rowBalance.asset_id
          )
        : {
            symbol: rowBalance.asset_id,
            precision: 5,
          };

    const readableBalance = humanReadableFloat(
      rowBalance.amount,
      currentBalance.precision
    ).toLocaleString(undefined, {
      minimumFractionDigits: currentBalance.precision,
    });

    const relevantPools = pools.filter(
      (pool) =>
        pool.asset_a_symbol === currentBalance.symbol ||
        pool.asset_b_symbol === currentBalance.symbol
    );

    return (
      <div style={{ ...style, marginBottom: "8px" }}>
        <Card>
          <div className="grid grid-cols-6">
            <div className="col-span-3 text-left">
              <CardHeader className="pt-3 pb-3">
                <CardTitle>
                  {t("PortfolioTabs:assetTitle", {
                    symbol: currentBalance.symbol,
                    assetId: balances[index].asset_id,
                  })}
                </CardTitle>
                <CardDescription>
                  {t("PortfolioTabs:liquidAmount", { amount: readableBalance })}
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-3 pt-2 text-right mr-3">
              <a
                href={`/dex/index.html?market=${currentBalance.symbol}_${
                  currentBalance.symbol === "BTS" ? "USD" : "BTS"
                }`}
              >
                <Button variant="outline" className="mr-2">
                  {t("PortfolioTabs:tradeButton")}
                </Button>
              </a>

              <HoverCard key="hover_a">
                <HoverCardTrigger asChild>
                  <PoolDialog
                    poolArray={relevantPools}
                    dialogTitle={t("PoolDialogs:assetAPoolsDialogTitle", {
                      assetA: currentBalance.symbol,
                    })}
                    dialogDescription={t(
                      "PoolDialogs:assetAPoolsDialogDescription",
                      {
                        assetA: currentBalance.symbol,
                        assetAId: currentBalance.id,
                      }
                    )}
                  />
                </HoverCardTrigger>
                <HoverCardContent className="w-60">
                  {t("PoolDialogs:assetAHoverCardContent", {
                    assetA: currentBalance.symbol,
                  })}
                </HoverCardContent>
              </HoverCard>

              <ExternalLink
                variant="outline"
                classnamecontents="mt-2 ml-2"
                type="button"
                text={t("PortfolioTabs:assetInfoButton")}
                hyperlink={`https://blocksights.info/#/assets/${
                  currentBalance.symbol
                }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
              />
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const OpenOrdersRow = ({ index, style }) => {
    const sellPriceBaseAmount = openOrders[index].sell_price.base.amount;
    const sellPriceBaseAssetId = openOrders[index].sell_price.base.asset_id;
    const sellPriceQuoteAmount = openOrders[index].sell_price.quote.amount;
    const sellPriceQuoteAssetId = openOrders[index].sell_price.quote.asset_id;
    const orderId = openOrders[index].id;
    const expiration = openOrders[index].expiration;

    const sellAsset =
      retrievedBalanceAssets && retrievedBalanceAssets.length
        ? retrievedBalanceAssets.find(
            (asset) => asset.id === sellPriceBaseAssetId
          )
        : null;

    const buyAsset =
      retrievedBalanceAssets && retrievedBalanceAssets.length
        ? retrievedBalanceAssets.find(
            (asset) => asset.id === sellPriceQuoteAssetId
          )
        : null;

    const readableBaseAmount = sellAsset
      ? humanReadableFloat(sellPriceBaseAmount, sellAsset.precision)
      : sellPriceBaseAmount;

    const readableQuoteAmount = buyAsset
      ? humanReadableFloat(sellPriceQuoteAmount, buyAsset.precision)
      : sellPriceQuoteAmount;

    const expirationDate = new Date(expiration);
    const now = new Date();
    const timeDiff = expirationDate - now;
    const minutes = Math.floor((timeDiff / 1000 / 60) % 60);
    const hours = Math.floor((timeDiff / 1000 / 60 / 60) % 24);
    const days = Math.floor(timeDiff / 1000 / 60 / 60 / 24);

    const timeDiffString = `${days}d ${hours}h ${minutes}m`;

    return (
      <div style={{ ...style }}>
        <Card>
          <div className="grid grid-cols-6">
            <div className="col-span-4">
              <CardHeader>
                <CardTitle>
                  {t("PortfolioTabs:sellingFor", {
                    baseAmount: readableBaseAmount,
                    baseSymbol: sellAsset.symbol,
                    quoteAmount: readableQuoteAmount,
                    quoteSymbol: buyAsset.symbol,
                  })}
                </CardTitle>
                <CardDescription>
                  {t("PortfolioTabs:tradingPair", {
                    baseAssetId: sellPriceBaseAssetId,
                    quoteAssetId: sellPriceQuoteAssetId,
                  })}
                  <br />
                  {t("PortfolioTabs:orderId")}
                  <ExternalLink
                    classnamecontents="text-blue-500"
                    type="text"
                    text={` ${orderId}`}
                    hyperlink={`https://blocksights.info/#/objects/${orderId}${
                      usr.chain === "bitshares" ? "" : "?network=testnet"
                    }`}
                  />
                  <br />
                  {t("PortfolioTabs:expires", { timeDiff: timeDiffString })}
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-2 pt-6">
              <a
                href={`/dex/index.html?market=${sellAsset.symbol}_${buyAsset.symbol}`}
              >
                <Button variant="outline">
                  {t("PortfolioTabs:tradeButton")}
                </Button>
              </a>
              <a href={`/order/index.html?id=${orderId}`}>
                <Button variant="outline" className="mb-3 ml-3">
                  {t("PortfolioTabs:updateButton")}
                </Button>
              </a>
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDialog(true);
                    setOrderID(orderId);
                  }}
                >
                  {t("PortfolioTabs:cancelButton")}
                </Button>
                {showDialog && orderId === orderID ? (
                  <DeepLinkDialog
                    operationNames={["limit_order_cancel"]}
                    username={usr.username}
                    usrChain={usr.chain}
                    userID={usr.id}
                    dismissCallback={setShowDialog}
                    key={`Cancelling${readableBaseAmount}${sellAsset.symbol}for${readableQuoteAmount}${buyAsset.symbol}`}
                    headerText={t("PortfolioTabs:cancelOffer", {
                      baseAmount: readableBaseAmount,
                      baseSymbol: sellAsset.symbol,
                      quoteAmount: readableQuoteAmount,
                      quoteSymbol: buyAsset.symbol,
                    })}
                    trxJSON={[
                      {
                        fee_paying_account: usr.id,
                        order: orderID, // order id to change
                        extensions: [],
                      },
                    ]}
                  />
                ) : null}
              </>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const RecentActivityRow = ({ index, style }) => {
    const activityItem = activity[index];

    const expirationDate = new Date(activityItem.block_data.block_time);
    const now = new Date();
    const timeDiff = now - expirationDate;
    const minutes = Math.floor((timeDiff / 1000 / 60) % 60);
    const hours = Math.floor((timeDiff / 1000 / 60 / 60) % 24);
    const days = Math.floor(timeDiff / 1000 / 60 / 60 / 24);

    const timeDiffString = `${days}d ${hours}h ${minutes}m`;

    return (
      <div style={{ ...style }}>
        <Card>
          <div className="grid grid-cols-7">
            <div className="col-span-5">
              <CardHeader>
                <CardTitle>
                  {opTypes[activityItem.operation_type.toString()]}
                </CardTitle>
                <CardDescription>
                  {t("PortfolioTabs:operationId")}
                  <ExternalLink
                    classnamecontents="text-blue-500"
                    type="text"
                    text={` ${activityItem.account_history.operation_id}`}
                    hyperlink={`https://blocksights.info/#/objects/${
                      activityItem.account_history.operation_id
                    }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                  />
                  <br />
                  {t("PortfolioTabs:blockNumber")}
                  <ExternalLink
                    classnamecontents="text-blue-500"
                    type="text"
                    text={` ${activityItem.block_data.block_num}`}
                    hyperlink={`https://blocksights.info/#/blocks/${
                      activityItem.block_data.block_num
                    }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                  />
                  <br />
                  {t("PortfolioTabs:timeSinceBroadcast", {
                    timeDiff: timeDiffString,
                  })}
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-2 mt-7">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    {t("PortfolioTabs:viewOperationButton")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white">
                  <DialogHeader>
                    <DialogTitle>
                      {t("PortfolioTabs:operationJsonTitle")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("PortfolioTabs:operationJsonDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1">
                    <div className="col-span-1">
                      <ScrollArea className="h-72 rounded-md border">
                        <pre>
                          {JSON.stringify(
                            activityItem.operation_history.op_object,
                            null,
                            2
                          )}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mt-2">
                    {t("PortfolioTabs:viewAllButton")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white">
                  <DialogHeader>
                    <DialogTitle>
                      {t("PortfolioTabs:fullOperationContentsTitle")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("PortfolioTabs:fullOperationContentsDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1">
                    <div className="col-span-1">
                      <ScrollArea className="h-72 rounded-md border">
                        <pre>{JSON.stringify(activityItem, null, 2)}</pre>
                      </ScrollArea>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  function PoolDialog({ poolArray, dialogTitle, dialogDescription }) {
    if (!poolArray || !poolArray.length) {
      return null;
    }

    const PoolRow = ({ index, style }) => {
      const pool = poolArray[index];
      return (
        <a
          style={style}
          href={`/swap/index.html?pool=${pool.id}`}
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

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">{t("PortfolioTabs:pools")}</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] bg-white">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1">
            <div className="grid grid-cols-10">
              <div className="col-span-1">{t("PoolDialogs:idColumnTitle")}</div>
              <div className="col-span-3">
                {t("PoolDialogs:shareAssetColumnTitle")}
              </div>
              <div className="col-span-3">
                {t("PoolDialogs:assetAColumnTitle")}
              </div>
              <div className="col-span-3">
                {t("PoolDialogs:assetBColumnTitle")}
              </div>
            </div>
            <List
              height={300}
              rowComponent={PoolRow}
              rowCount={poolArray.length}
              rowHeight={35}
              className="w-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 mt-5">
          <Tabs defaultValue="balances" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {activePortfolioTab === "balances" ? (
                <TabsTrigger value="balances" style={activeTabStyle}>
                  {t("PortfolioTabs:balances")}
                </TabsTrigger>
              ) : (
                <TabsTrigger
                  value="balances"
                  onClick={() => setActivePortfolioTab("balances")}
                >
                  {t("PortfolioTabs:balances")}
                </TabsTrigger>
              )}
              {activePortfolioTab === "openOrders" ? (
                <TabsTrigger value="openOrders" style={activeTabStyle}>
                  {t("PortfolioTabs:openOrders")}
                </TabsTrigger>
              ) : (
                <TabsTrigger
                  value="openOrders"
                  onClick={() => setActivePortfolioTab("openOrders")}
                >
                  {t("PortfolioTabs:openOrders")}
                </TabsTrigger>
              )}
              {activePortfolioTab === "activity" ? (
                <TabsTrigger value="activity" style={activeTabStyle}>
                  {t("PortfolioTabs:activity")}
                </TabsTrigger>
              ) : (
                <TabsTrigger
                  value="activity"
                  onClick={() => setActivePortfolioTab("activity")}
                >
                  {t("PortfolioTabs:activity")}
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="balances">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>
                    {t("PortfolioTabs:accountBalances", {
                      username: usr.username,
                    })}
                  </CardTitle>
                  <CardDescription>
                    {t("PortfolioTabs:accountBalancesDescription")}
                    <br />
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <Button
                        onClick={() => setSortType("default")}
                        variant={sortType === "default" ? "" : "outline"}
                      >
                        {t("PortfolioTabs:default")}
                      </Button>
                      <Button
                        onClick={() => setSortType("alphabetical")}
                        variant={sortType === "alphabetical" ? "" : "outline"}
                      >
                        {t("PortfolioTabs:alphabetical")}
                      </Button>
                      <Button
                        onClick={() => setSortType("amount")}
                        variant={sortType === "amount" ? "" : "outline"}
                      >
                        {t("PortfolioTabs:amount")}
                      </Button>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sortedUserBalances &&
                  sortedUserBalances.length &&
                  retrievedBalanceAssets &&
                  retrievedBalanceAssets.length ? (
                    <List
                      height={500}
                      rowComponent={BalanceRow}
                      rowCount={sortedUserBalances.length}
                      rowHeight={80}
                      className="gaps-2"
                    />
                  ) : (
                    <p>{t("PortfolioTabs:noBalancesFound")}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => {
                      setBalances();
                      setBalanceCounter(balanceCounter + 1);
                    }}
                  >
                    {t("PortfolioTabs:refreshBalancesButton")}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="openOrders">
              <Card>
                <CardHeader>
                  <CardTitle>{t("PortfolioTabs:openOrdersTitle")}</CardTitle>
                  <CardDescription>
                    {t("PortfolioTabs:openOrdersDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {openOrders &&
                  openOrders.length &&
                  retrievedBalanceAssets &&
                  retrievedBalanceAssets.length ? (
                    <List
                      height={500}
                      rowComponent={OpenOrdersRow}
                      rowCount={openOrders.length}
                      rowHeight={145}
                    />
                  ) : (
                    <p>{t("PortfolioTabs:noOpenOrdersFound")}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => {
                      setOpenOrders();
                      setOpenOrderCounter(openOrderCounter + 1);
                    }}
                  >
                    {t("PortfolioTabs:refreshOpenOrdersButton")}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("PortfolioTabs:recentBlockchainActivityTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("PortfolioTabs:recentBlockchainActivityDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activity && activity.length ? (
                    <List
                      height={500}
                      rowComponent={RecentActivityRow}
                      rowCount={activity.length}
                      rowHeight={145}
                    />
                  ) : (
                    <p>{t("PortfolioTabs:noRecentActivityFound")}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => {
                      setActivity();
                      setActivityCounter(activityCounter + 1);
                    }}
                  >
                    {t("PortfolioTabs:refreshRecentActivityButton")}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
