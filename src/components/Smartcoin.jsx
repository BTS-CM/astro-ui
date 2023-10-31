import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { FixedSizeList as List } from "react-window";
import { useForm } from "react-hook-form";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";
import {
  $globalParamsCache,
  $bitAssetDataCache,
  $marketSearchCache,
} from "../stores/cache.ts";

import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog";

import { humanReadableFloat } from "../lib/common.js";

export default function Smartcoin(properties) {
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const bitAssetData = useSyncExternalStore(
    $bitAssetDataCache.subscribe,
    $bitAssetDataCache.get,
    () => true
  );

  const marketSearch = useSyncExternalStore(
    $marketSearchCache.subscribe,
    $marketSearchCache.get,
    () => true
  );

  const globalParams = useSyncExternalStore(
    $globalParamsCache.subscribe,
    $globalParamsCache.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", [
    "bitAssetData",
    "globalParams",
    "marketSearch",
  ]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 3);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [showDialog, setShowDialog] = useState(false);

  const [debtAsset, setDebtAsset] = useState("");
  const [debtAmount, setDebtAmount] = useState(0);

  const [collateralAsset, setCollateralAsset] = useState("");
  const [collateralAmount, setCollateralAmount] = useState(0);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>💵 Collateral debt position form</CardTitle>
              <CardDescription>
                You can use this form to borrow this smartcoin into existence,
                given sufficient collateral.
                <br />
                Thoroughly research assets before continuing, know your risk
                exposure and tolerances.
              </CardDescription>
            </CardHeader>
            <CardContent>Form contents</CardContent>
          </Card>
          {showDialog ? (
            <DeepLinkDialog
              operationName="call_order_update"
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setShowDialog}
              key={`HeaderText`}
              headerText={`HeaderText`}
              trxJSON={[
                {
                  funding_account: usr.id,
                  delta_collateral: {
                    amount: 1,
                    asset_id: "1.3.x",
                  },
                  delta_debt: {
                    amount: 1,
                    asset_id: "1.3.x",
                  },
                  extensions: [],
                },
              ]}
            />
          ) : null}
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
