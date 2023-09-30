import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { $currentUser, eraseCurrentUser } from "../stores/users.ts";
import AccountSelect from "./AccountSelect.jsx";
import CurrentUser from "./common/CurrentUser.jsx";

export default function Home(properties) {
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
        <div className="grid grid-cols-3 gap-3">
          <a href="/pool/index.html" style={{ textDecoration: "none" }}>
            <Card>
              <CardHeader>
                <CardTitle>💱 Pool exchange</CardTitle>
                <CardDescription>Trade with a liquidity pool</CardDescription>
              </CardHeader>
            </Card>
          </a>

          <a href="/dex/index.html" style={{ textDecoration: "none" }}>
            <Card>
              <CardHeader>
                <CardTitle>📈 DEX limit orders</CardTitle>
                <CardDescription>Trade on the Bitshares DEX</CardDescription>
              </CardHeader>
            </Card>
          </a>

          <a href="/portfolio/index.html" style={{ textDecoration: "none" }}>
            <Card>
              <CardHeader>
                <CardTitle>💰 Portfolio</CardTitle>
                <CardDescription>View your portfolio</CardDescription>
              </CardHeader>
            </Card>
          </a>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr ? (
            <CurrentUser usr={usr} resetCallback={eraseCurrentUser} />
          ) : null}
        </div>
      </div>
    </>
  );
}
