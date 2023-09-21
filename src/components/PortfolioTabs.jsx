import React, { useState, useEffect } from "react";
import { FixedSizeList as List } from 'react-window';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area"

import { $currentUser, eraseCurrentUser } from '../stores/users.ts';
import AccountSelect from './AccountSelect.jsx';

import { humanReadableFloat } from '../lib/common';
import { opTypes } from '../lib/opTypes';

export default function PortfolioTabs(properties) {
  const [usr, setUsr] = useState();
  useEffect(() => {
      const unsubscribe = $currentUser.subscribe((value) => {
      setUsr(value);
      });
      return unsubscribe;
  }, [$currentUser]);

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  const [openOrders, setOpenOrders] = useState();
  useEffect(() => {
    async function fetchPortfolio() {
      const fetchedProfile = await fetch(`http://localhost:8080/api/getPortfolio/${usr.chain}/${usr.id}`, { method: "GET" });

      if (!fetchedProfile.ok) {
        console.log("Issues whilst fetching");
        return;
      }

      const profileContents = await fetchedProfile.json();

      if (profileContents && profileContents.result) {
        const finalResult = profileContents.result;
        console.log("Successfully fetched profile");
        setBalances(finalResult.balances);
        setOpenOrders(finalResult.limitOrders);
      }
    }

    if (usr && usr.id && usr.id.length) {
      fetchPortfolio();
    }
  }, [usr, balanceCounter]);

  const [activityCounter, setActivityCounter] = useState(0);
  const [activity, setActivity] = useState();
  useEffect(() => {
    async function fetchActivity() {
      const historyData = await fetch(
        `http://localhost:8080/api/getAccountHistory/${usr.chain}/${usr.id}`,
        {
          method: "GET"
        }
      );

      if (!historyData.ok) {
        console.log("Issues whilst fetching");
        return;
      }

      const historyContents = await historyData.json();
      if (historyContents && historyContents.result) {
        console.log("Successfully fetched history");
        setActivity(historyContents.result);
      }
    }

    if (usr && usr.id && usr.id.length) {
      fetchActivity();
    }
  }, [usr, activityCounter]);

  const [retrievedBalanceAssets, setRetrievedBalanceAssets] = useState();
  useEffect(() => {
    async function retrieveHeldAssets() {

      let assetIDs = [];
      for (let i = 0; i < openOrders.length; i++) {
        const baseID = openOrders[i].sell_price.base.asset_id;
        const quoteID = openOrders[i].sell_price.quote.asset_id;
        if (!assetIDs.includes(baseID)) {
          assetIDs.push(baseID)
        }
        if (!assetIDs.includes(quoteID)) {
          assetIDs.push(quoteID)
        }
      }

      for (let i = 0; i < balances.length; i++) {
        const assetID = balances[i].asset_id;
        if (!assetIDs.includes(assetID)) {
          assetIDs.push(assetID)
        }
      }

      const response = await fetch(
        `http://localhost:8080/cache/assets/${usr.chain}`, 
        {
            method: "POST",
            body: JSON.stringify(assetIDs),
        }
      );

      if (!response.ok) {
          console.log({
              error: new Error(`${response.status} ${response.statusText}`),
              msg: "Couldn't generate deeplink."
          });
          return;
      }

      const filteredBalances = await response.json();

      if (filteredBalances && filteredBalances.result) {
        setRetrievedBalanceAssets(filteredBalances.result);
      }
    }
    
    if ((balances && balances.length) && (openOrders && openOrders.length)) {
      retrieveHeldAssets();
    }
  }, [balances, openOrders]);

  const [downloadClicked, setDownloadClicked] = useState(false);

  const handleDownloadClick = () => {
      if (!downloadClicked) {
          setDownloadClicked(true);
          setTimeout(() => {
              setDownloadClicked(false);
          }, 10000);
      }
  };

  const [orderID, setOrderID] = useState();
  const [deeplink, setDeeplink] = useState("");
  const [trxJSON, setTRXJSON] = useState();
  const [deepLinkTrigger, setDeepLinkTrigger] = useState(0);

  useEffect(() => {
    async function generate() {
      const opJSON = [
        {
          fee_paying_account: usr.id,
          order: orderID, // order id to change
          extensions: []
        }
      ];
      setTRXJSON(opJSON);

      const response = await fetch(
          `http://localhost:8080/api/deeplink/${usr.chain}/limit_order_cancel`, 
          {
              method: "POST",
              body: JSON.stringify(opJSON),
          }
      );

      if (!response.ok) {
          console.log({
              error: new Error(`${response.status} ${response.statusText}`),
              msg: "Couldn't generate deeplink."
          });
          return;
      }

      const deeplinkValue = await response.json();

      if (deeplinkValue && deeplinkValue.result && deeplinkValue.result.generatedDeepLink) {
          setDeeplink(deeplinkValue.result.generatedDeepLink);
      }
    }

    if (deepLinkTrigger > 0 && orderID) {
      generate();
    }
  }, [deepLinkTrigger, orderID]);

  const [showDialog, setShowDialog] = useState(false);

  if (!usr || !usr.id || !usr.id.length) {
      return <AccountSelect />;
  }

  const BalanceRow = ({ index, style }) => {
    const currentBalance = retrievedBalanceAssets && Array.isArray(retrievedBalanceAssets)
      ? retrievedBalanceAssets.find((asset) => asset.id === balances[index].asset_id)
      : {
          symbol: balances[index].asset_id,
          precision: 5,
      }

    const readableBalance = humanReadableFloat(
      balances[index].amount,
      currentBalance.precision
    ).toLocaleString(undefined, {minimumFractionDigits: currentBalance.precision});

    return <div style={{ ...style, marginBottom: "8px" }}>
      <Card>
        <div className="grid grid-cols-6">
          <div className="col-span-4">
            <CardHeader>
              <CardTitle>{currentBalance.symbol} ({balances[index].asset_id})</CardTitle>
              <CardDescription>
                Liquid amount: {readableBalance}<br/>
              </CardDescription>
            </CardHeader>
          </div>
          <div className="col-span-2 pt-5">
            <a href={`/dex/index.html?market=${currentBalance.symbol}_${currentBalance.symbol === "BTS" ? "USD" : "BTS"}`}>
              <Button variant="outline" className="mr-2">Trade</Button>
            </a>
            <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mt-2">Asset info</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white">
                  <DialogHeader>
                    <DialogTitle>
                      Additional information on {currentBalance.symbol}
                    </DialogTitle>
                    <DialogDescription>
                      JSON properties
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1">
                    <div className="col-span-1">
                      <ScrollArea className="h-72 rounded-md border">
                        <pre>
                          {JSON.stringify(currentBalance, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
          </div>
        </div>
      </Card>
    </div>
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Text copied to clipboard');
      })
      .catch((err) => {
        console.error('Error copying text: ', err);
      });
  };

  const OpenOrdersRow = ({ index, style }) => {
    const sellPriceBaseAmount = openOrders[index].sell_price.base.amount;
    const sellPriceBaseAssetId = openOrders[index].sell_price.base.asset_id;
    const sellPriceQuoteAmount = openOrders[index].sell_price.quote.amount;
    const sellPriceQuoteAssetId = openOrders[index].sell_price.quote.asset_id;
    const orderId = openOrders[index].id;
    const expiration = openOrders[index].expiration;

    const sellAsset = retrievedBalanceAssets && retrievedBalanceAssets.length
      ? retrievedBalanceAssets.find((asset) => asset.id === sellPriceBaseAssetId)
      : null;

    const buyAsset = retrievedBalanceAssets && retrievedBalanceAssets.length
      ? retrievedBalanceAssets.find((asset) => asset.id === sellPriceQuoteAssetId)
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
                  Selling {readableBaseAmount} {sellAsset.symbol} for {readableQuoteAmount} {buyAsset.symbol}
                </CardTitle>
                <CardDescription>
                  Trading pair: {sellPriceBaseAssetId} for {sellPriceQuoteAssetId}<br/>
                  Order ID: {orderId}<br/>
                  Expires: {timeDiffString}
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-1 pt-7">
              <a href={`/dex/index.html?market=${sellAsset.symbol}_${buyAsset.symbol}`}>
                <Button variant="outline" className="mb-2">Trade</Button>
              </a>
              <>
                <Button variant="outline" className="mt-2" onClick={() => {
                  setShowDialog(true);
                  setOrderID(orderId);
                  setDeepLinkTrigger(deepLinkTrigger + 1);
                }}>
                  Cancel
                </Button>
                {showDialog && orderId === orderID && deeplink && (
                  <Dialog
                    open={showDialog}
                    onOpenChange={(open) => {
                      if (!open) {
                        setDeeplink();
                        setTRXJSON();
                      }
                      setShowDialog(open)
                    }}
                  >
                    <DialogContent className="sm:max-w-[425px] bg-white">
                      <>
                        <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mt-1">
                            Your requested limit order cancellation is ready!
                        </h3>
                        Cancelling offer of {readableBaseAmount} {sellAsset.symbol} for {readableQuoteAmount} {buyAsset.symbol}<br/>
                        Order ID: {orderId}<br/>
                        Account: {usr.id}
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
                          
                          {
                            downloadClicked
                              ? (
                                  <Button variant="outline" disabled>
                                      Downloading...
                                  </Button>
                              )
                              : (
                              <a
                                  href={`data:text/json;charset=utf-8,${deeplink}`}
                                  download={`limit_order_cancel.json`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={handleDownloadClick}
                              >
                                  <Button variant="outline" className="w-full">
                                      Download Beet operation JSON
                                  </Button>
                              </a>
                              )
                          }

                          <a href={`rawbeet://api?chain=BTS&request=${deeplink}`}>
                            <Button variant="outline" className="w-full">
                                Trigger raw Beet deeplink
                            </Button>
                          </a>
                        </div>
                      </>
                    </DialogContent>
                  </Dialog>
                )}
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
                <CardTitle>{opTypes[activityItem.operation_type.toString()]}</CardTitle>
                <CardDescription>
                  Operation ID: {activityItem.account_history.operation_id}<br/>
                  Block number: {activityItem.block_data.block_num}<br/>
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
                          {JSON.stringify(activityItem.operation_history.op_object, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mt-2">View all</Button>
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
                        <pre>
                          {JSON.stringify(activityItem, null, 2)}
                        </pre>
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
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="openOrders">Open orders</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
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
                  {
                    balances && balances.length && retrievedBalanceAssets && retrievedBalanceAssets.length
                      ? <List
                          height={300}
                          itemCount={balances.length}
                          itemSize={100}
                          className="gaps-2"
                        >
                            {BalanceRow}
                        </List>
                      : <p>No balances found</p>
                  }
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
                  { 
                    openOrders && openOrders.length && retrievedBalanceAssets && retrievedBalanceAssets.length
                      ? <List
                          height={300}
                          itemCount={openOrders.length}
                          itemSize={145}
                        >
                            {OpenOrdersRow}
                        </List>
                      : <p>No open orders found</p>
                  }
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
                  {
                    activity && activity.length
                      ? <List
                          height={300}
                          itemCount={activity.length}
                          itemSize={145}
                        >
                          {RecentActivityRow}
                        </List>
                      : <p>No recent activity found</p>
                  }
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
      <div className="flex justify-center">
        <Button
          className="mt-5"
          onClick={() => {
            eraseCurrentUser();
            setBalances();
            setOpenOrders();
            setActivity();
            setRetrievedBalanceAssets();
          }}
        >
          Switch account/chain
        </Button>
      </div>
    </>
  );
}
