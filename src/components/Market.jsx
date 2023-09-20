import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { $currentUser, eraseCurrentUser } from '../stores/users.ts'
import AccountSelect from './AccountSelect.jsx'

export default function Market(properties) {

  const [usr, setUsr] = useState();
  useEffect(() => {
      const unsubscribe = $currentUser.subscribe((value) => {
      setUsr(value);
      });
      return unsubscribe;
  }, [$currentUser]);

  if (!usr || !usr.id || !usr.id.length) {
      return <AccountSelect />;
  }

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle>Asset to buy</CardTitle>
                <CardDescription>description</CardDescription>
              </CardHeader>
              <CardContent>
                Content
              </CardContent>
              <CardFooter>
                Submit
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Asset to sell</CardTitle>
                <CardDescription>description</CardDescription>
              </CardHeader>
              <CardContent>
                Content
              </CardContent>
              <CardFooter>
                Submit
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Buy orders</CardTitle>
                <CardDescription>Open buy limit orders</CardDescription>
              </CardHeader>
              <CardContent>
                Content
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sell orders</CardTitle>
                <CardDescription>Open sell limit orders</CardDescription>
              </CardHeader>
              <CardContent>
                Content
              </CardContent>
            </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          <Tabs defaultValue="marketTrades" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="marketTrades">Market trades</TabsTrigger>
              <TabsTrigger value="myTrades">My trades</TabsTrigger>
              <TabsTrigger value="myOpenOrders">My open orders</TabsTrigger>
            </TabsList>
            <TabsContent value="marketTrades">
              <Card>
                <CardHeader>
                  <CardTitle>Market trades</CardTitle>
                  <CardDescription>
                    Recent market trades by everyone
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  content
                </CardContent>
                <CardFooter>
                  footer
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="myTrades">
              <Card>
                <CardHeader>
                  <CardTitle>My trades</CardTitle>
                  <CardDescription>
                    Your recent trades in this market
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  content
                </CardContent>
                <CardFooter>
                  footer
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="myOpenOrders">
              <Card>
                <CardHeader>
                  <CardTitle>My open orders</CardTitle>
                  <CardDescription>
                    Your open limit orders for this market
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  content
                </CardContent>
                <CardFooter>
                  footer
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
          }}
        >
          Switch account/chain
        </Button>
      </div>
    </>
  );
}
