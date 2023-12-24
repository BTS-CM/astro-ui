import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance } from "@/lib/i18n.js";

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
  const { t, i18n } = useTranslation("en", { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("LTM:cardTitle")}</CardTitle>
              <CardDescription>{t("LTM:cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {usr && usr.id === usr.referrer ? (
                <>
                  <h3>{t("LTM:alreadyMember")}</h3>
                  <h4>{t("LTM:benefitsTitle")}</h4>
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("LTM:benefit1")}</li>
                    <li>{t("LTM:benefit2")}</li>
                    <li>{t("LTM:benefit3")}</li>
                  </ul>
                </>
              ) : null}
              {usr && usr.id != usr.referrer ? (
                <>
                  <h3>{t("LTM:wantToPurchase")}</h3>
                  <h4 className="text-lg">{t("LTM:benefitsTitle")}</h4>
                  <ul className="ml-2 list-disc [&>li]:mt-2 pl-3 text-sm">
                    <li>{t("LTM:benefit1")}</li>
                    <li>{t("LTM:benefit2")}</li>
                    <li>{t("LTM:benefit3")}</li>
                  </ul>
                  <Button
                    className="mt-3"
                    onClick={() => {
                      setShowDialog(true);
                    }}
                  >
                    {t("LTM:purchaseButton")}
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
                  headerText={t("LTM:headerText", { username: usr.username })}
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
          {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}
        </div>
      </div>
    </>
  );
}
