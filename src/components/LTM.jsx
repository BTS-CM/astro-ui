import React, { useState, useEffect, useSyncExternalStore } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";

import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { Button } from "@/components/ui/button";

export default function LTM(properties) {
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares");
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>💱 LTM membership</CardTitle>
              <CardDescription>Purchase a lifetime membership</CardDescription>
            </CardHeader>
            <CardContent>
              {usr && usr.id === usr.referrer ? (
                <>
                  <h3>
                    This account already has purchased a lifetime membership!
                  </h3>
                  <h4>Your active lifetime membership benefits:</h4>
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>
                      Receive an 80% rebate on all fees into your vesting
                      balance.
                    </li>
                    <li>
                      Passively earn a share of fees spent by your referred
                      users.
                    </li>
                    <li>Now able to generate premium account names.</li>
                  </ul>
                </>
              ) : null}
              {usr && usr.id != usr.referrer ? (
                <>
                  <h3>
                    Want to purchase a lifetime membership for your account?
                  </h3>

                  <h4 className="text-lg">
                    Lifetime members receive the following benefits:
                  </h4>
                  <ul className="ml-2 list-disc [&>li]:mt-2 pl-3 text-sm">
                    <li>
                      They receive an 80% rebate on all spent fees, in a vesting
                      balance form.
                    </li>
                    <li>
                      They unlock the ability to passively earn a share of fees
                      spent by users they refer.
                    </li>
                    <li>
                      The ability to generate premium blockchain account names.
                    </li>
                  </ul>

                  <Button
                    className="mt-3"
                    onClick={() => {
                      setShowDialog(true);
                    }}
                  >
                    Purchase LTM
                  </Button>
                </>
              ) : null}
              {showDialog ? (
                <DeepLinkDialog
                  operationName="account_upgrade"
                  username={usr.username}
                  usrChain={usr.chain}
                  userID={usr.id}
                  dismissCallback={setShowDialog}
                  key={`BuyLTM${usr.id}`}
                  headerText={`Purchasing a lifetime membership for ${usr.username}`}
                  trxJSON={[
                    {
                      account_to_upgrade: usr.id,
                      upgrade_to_lifetime_member: true,
                      extensions: [],
                    },
                  ]}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? (
            <CurrentUser usr={usr} />
          ) : null}
        </div>
      </div>
    </>
  );
}
