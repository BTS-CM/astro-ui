import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { $currentUser, eraseCurrentUser } from "../stores/users.ts";
import { usrCache } from "../effects/Cache.ts";

import AccountSelect from "./AccountSelect.jsx";
import CurrentUser from "./common/CurrentUser.jsx";

export default function PoolStake(properties) {
  const [usr, setUsr] = useState();
  usrCache(setUsr);

  if (!usr || !usr.id || !usr.id.length) {
    return <AccountSelect />;
  }

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>🫰 Pool stake</CardTitle>
              <CardDescription>
                Stake funds into a liquidity pool to passively earn swap fees.
              </CardDescription>
            </CardHeader>
            <CardContent>create form here</CardContent>
          </Card>
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
