import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { FixedSizeList as List } from "react-window";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useInitCache } from "../effects/Init.ts";
import {
  createUserPortfolioStore,
  createUserHistoryStore,
} from "../effects/User.ts";

import { $currentUser } from "../stores/users.ts";
import { $globalParamsCache, $assetCache } from "../stores/cache.ts";

import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

import { humanReadableFloat } from "../lib/common";
import { opTypes } from "../lib/opTypes";

export default function PortfolioTabs(properties) {
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const assets = useSyncExternalStore(
    $assetCache.subscribe,
    $assetCache.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares");

  /*
  const globalParams = useSyncExternalStore(
    $globalParamsCache.subscribe,
    $globalParamsCache.get,
    () => true
  );

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 2);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);
  */

  const activeTabStyle = {
    backgroundColor: "#252526",
    color: "white",
  };

  const [activePortfolioTab, setActivePortfolioTab] = useState("balances");

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  const [openOrders, setOpenOrders] = useState();
  useEffect(() => {
    let unsubscribeUserPortfolioStore;

    if (usr && usr.id) {
      const userPortfolioStore = createUserPortfolioStore([usr.chain, usr.id]);

      unsubscribeUserPortfolioStore = userPortfolioStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            console.log("Successfully fetched user portfolio");
            setBalances(data.balances);
            setOpenOrders(data.limitOrders);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserPortfolioStore) unsubscribeUserPortfolioStore();
    };
  }, [usr, balanceCounter]);

  const [activityCounter, setActivityCounter] = useState(0);
  const [activity, setActivity] = useState();
  useEffect(() => {
    let unsubscribeUserHistoryStore;

    if (usr && usr.id) {
      const userHistoryStore = createUserHistoryStore([usr.chain, usr.id]);

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
    const rowBalance = balances[index];

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

    return (
      <div style={{ ...style, marginBottom: "8px" }}>
        <Card>
          <div className="grid grid-cols-6">
            <div className="col-span-4">
              <CardHeader>
                <CardTitle>
                  {currentBalance.symbol} ({balances[index].asset_id})
                </CardTitle>
                <CardDescription>
                  Liquid amount: {readableBalance}
                  <br />
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-2 pt-5">
              <a
                href={`/dex/index.html?market=${currentBalance.symbol}_${
                  currentBalance.symbol === "BTS" ? "USD" : "BTS"
                }`}
              >
                <Button variant="outline" className="mr-2">
                  Trade
                </Button>
              </a>

              <ExternalLink
                variant="outline"
                classNameContents="mt-2"
                type="button"
                text={`Asset info`}
                hyperlink={`https://blocksights.info/#/assets/${currentBalance.symbol}`}
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
            <div className="col-span-5">
              <CardHeader>
                <CardTitle>
                  Selling {readableBaseAmount} {sellAsset.symbol} for{" "}
                  {readableQuoteAmount} {buyAsset.symbol}
                </CardTitle>
                <CardDescription>
                  Trading pair: {sellPriceBaseAssetId} for{" "}
                  {sellPriceQuoteAssetId}
                  <br />
                  Order ID:
                  <ExternalLink
                    classNameContents="text-blue-500"
                    type="text"
                    text={` ${orderId}`}
                    hyperlink={`https://blocksights.info/#/objects/${orderId}`}
                  />
                  <br />
                  Expires: {timeDiffString}
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-1 pt-7">
              <a
                href={`/dex/index.html?market=${sellAsset.symbol}_${buyAsset.symbol}`}
              >
                <Button variant="outline" className="mb-2">
                  Trade
                </Button>
              </a>
              <>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setShowDialog(true);
                    setOrderID(orderId);
                  }}
                >
                  Cancel
                </Button>
                {showDialog && orderId === orderID ? (
                  <DeepLinkDialog
                    operationName="limit_order_cancel"
                    username={usr.username}
                    usrChain={usr.chain}
                    userID={usr.id}
                    dismissCallback={setShowDialog}
                    key={`Cancelling${readableBaseAmount}${sellAsset.symbol}for${readableQuoteAmount}${buyAsset.symbol}`}
                    headerText={`Cancelling offer of ${readableBaseAmount} ${sellAsset.symbol} for ${readableQuoteAmount} ${buyAsset.symbol}`}
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
                  Operation ID:
                  <ExternalLink
                    classNameContents="text-blue-500"
                    type="text"
                    text={` ${activityItem.account_history.operation_id}`}
                    hyperlink={`https://blocksights.info/#/objects/${activityItem.account_history.operation_id}`}
                  />
                  <br />
                  Block number:
                  <ExternalLink
                    classNameContents="text-blue-500"
                    type="text"
                    text={` ${activityItem.block_data.block_num}`}
                    hyperlink={`https://blocksights.info/#/blocks/${activityItem.block_data.block_num}`}
                  />
                  <br />
                  Time since broadcast: {timeDiffString}
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-2 mt-7">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">View Operation</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white">
                  <DialogHeader>
                    <DialogTitle>Operation JSON</DialogTitle>
                    <DialogDescription>
                      Check out the contents of this operation
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
                    View all
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white">
                  <DialogHeader>
                    <DialogTitle>Full operation contents</DialogTitle>
                    <DialogDescription>
                      Exhaustive info regarding this operation
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

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 mt-5">
          <Tabs defaultValue="balances" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {activePortfolioTab === "balances" ? (
                <TabsTrigger value="balances" style={activeTabStyle}>
                  Balances
                </TabsTrigger>
              ) : (
                <TabsTrigger
                  value="balances"
                  onClick={() => setActivePortfolioTab("balances")}
                >
                  Balances
                </TabsTrigger>
              )}
              {activePortfolioTab === "openOrders" ? (
                <TabsTrigger value="openOrders" style={activeTabStyle}>
                  Open orders
                </TabsTrigger>
              ) : (
                <TabsTrigger
                  value="openOrders"
                  onClick={() => setActivePortfolioTab("openOrders")}
                >
                  Open orders
                </TabsTrigger>
              )}
              {activePortfolioTab === "activity" ? (
                <TabsTrigger value="activity" style={activeTabStyle}>
                  Activity
                </TabsTrigger>
              ) : (
                <TabsTrigger
                  value="activity"
                  onClick={() => setActivePortfolioTab("activity")}
                >
                  Activity
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="balances">
              <Card>
                <CardHeader>
                  <CardTitle>{usr.username}'s account balances</CardTitle>
                  <CardDescription>
                    The assets held within your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {balances &&
                  balances.length &&
                  retrievedBalanceAssets &&
                  retrievedBalanceAssets.length ? (
                    <List
                      height={500}
                      itemCount={balances.length}
                      itemSize={100}
                      className="gaps-2"
                    >
                      {BalanceRow}
                    </List>
                  ) : (
                    <p>No balances found</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => {
                      setBalances();
                      setBalanceCoutner(balanceCounter + 1);
                    }}
                  >
                    Refresh balances
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="openOrders">
              <Card>
                <CardHeader>
                  <CardTitle>Open orders</CardTitle>
                  <CardDescription>
                    Your currently open limit orders on the DEX
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {openOrders &&
                  openOrders.length &&
                  retrievedBalanceAssets &&
                  retrievedBalanceAssets.length ? (
                    <List
                      height={500}
                      itemCount={openOrders.length}
                      itemSize={145}
                    >
                      {OpenOrdersRow}
                    </List>
                  ) : (
                    <p>No open orders found</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => {
                      setOpenOrders();
                      setBalanceCoutner(balanceCounter + 1);
                    }}
                  >
                    Refresh open orders
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent blockchain activity</CardTitle>
                  <CardDescription>
                    Your recent blockchain activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activity && activity.length ? (
                    <List
                      height={500}
                      itemCount={activity.length}
                      itemSize={145}
                    >
                      {RecentActivityRow}
                    </List>
                  ) : (
                    <p>No recent activity found</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => {
                      setActivity();
                      setActivityCounter(activityCounter + 1);
                    }}
                  >
                    Refresh recent activity
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <div className="grid grid-cols-1 mt-5">
        {usr && usr.username && usr.username.length ? (
          <CurrentUser usr={usr} />
        ) : null}
      </div>
    </>
  );
}
