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

export default function PortfolioTabs(properties) {
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
                  <CardTitle>Account balances</CardTitle>
                  <CardDescription>
                    The assets held within your account
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
            <TabsContent value="openOrders">
              <Card>
                <CardHeader>
                  <CardTitle>Open orders</CardTitle>
                  <CardDescription>
                    Your currently open limit orders on the DEX
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
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity</CardTitle>
                  <CardDescription>
                    Your recent blockchain activity
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
    </>
  );
}
