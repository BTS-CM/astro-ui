import React, { useState, useEffect, useSyncExternalStore } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { $currentUser } from "../stores/users.ts";

import { eraseCurrentUser } from "../stores/users.ts";
import { useInitCache } from "../effects/Init.ts";

import CurrentUser from "./common/CurrentUser.jsx";

export default function PoolStake(properties) {
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  //useInitCache(usr && usr.chain ? usr.chain : "bitshares");

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
          {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}
        </div>
      </div>
    </>
  );
}
