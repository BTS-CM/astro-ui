import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex as toHex } from "@noble/hashes/utils";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { $globalParamsCacheBTS, $globalParamsCacheTEST } from "@/stores/cache.ts";

import { humanReadableFloat } from "@/lib/common";

import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { Avatar } from "./Avatar.tsx";
import AccountSearch from "./AccountSearch.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

export default function AccountLists(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);

  const [showDialog, setShowDialog] = useState(false);

  const [targetUser, setTargetUser] = useState();

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const _globalParamsBTS = useSyncExternalStore(
    $globalParamsCacheBTS.subscribe,
    $globalParamsCacheBTS.get,
    () => true
  );

  const _globalParamsTEST = useSyncExternalStore(
    $globalParamsCacheTEST.subscribe,
    $globalParamsCacheTEST.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", ["globalParams"]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 7); // operation: account_whitelist
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [userDetails, setUserDetails] = useState();
  useEffect(() => {
    if (usr && usr.chain && currentNode) {
      const userStore = createObjectStore([
        usr.chain,
        JSON.stringify([usr.id]),
        currentNode ? currentNode.url : null,
      ]);
      userStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const foundUser = data[0];
          setUserDetails(foundUser);
        }
      });
    }
  }, [usr, currentNode]);

  const whitelistedAccounts = useMemo(() => {
    if (userDetails && userDetails.whitelisted_accounts) {
      return userDetails.whitelisted_accounts;
    } else {
      return [];
    }
  }, [userDetails]);

  const blacklistedAccounts = useMemo(() => {
    if (userDetails && userDetails.blacklisted_accounts) {
      return userDetails.blacklisted_accounts;
    } else {
      return [];
    }
  }, [userDetails]);

  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);

  useEffect(() => {
    if (targetUser) {
      // close dialog on target account selection
      setTargetUserDialogOpen(false);
    }
  }, [targetUser]);

  const [mode, setMode] = useState("whitelist");

  const accountRow = ({ index, style }) => {
    const account = mode === "whitelist" ? whitelistedAccounts[index] : blacklistedAccounts[index];

    const [showRowDialog, setShowRowDialog] = useState(false);

    return (
      <div style={style} className="grid grid-cols-8 items-center">
        <div className="col-span-1 ml-5">
          {account ? (
            <Avatar
              size={40}
              name={toHex(sha256(account))}
              extra=""
              expression={{
                eye: "normal",
                mouth: mode === "whitelist" ? "open" : "unhappy",
              }}
              colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
            />
          ) : (
            <Av>
              <AvatarFallback>?</AvatarFallback>
            </Av>
          )}
        </div>
        <div className="col-span-5">
          #{index + 1} <b>{account}</b>
        </div>
        <div className="col-span-2 text-right mr-5">
          <Button
            onClick={() => {
              setShowRowDialog(true);
            }}
            variant="outline"
          >
            {t("AccountLists:remove")} #{index + 1}
          </Button>
          {showRowDialog ? (
            <DeepLinkDialog
              operationNames={["account_whitelist"]}
              username={usr && usr.username ? usr.username : ""}
              usrChain={usr && usr.chain ? usr.chain : "bitshares"}
              userID={usr.id}
              dismissCallback={setShowRowDialog}
              key={`RemovingAccountFromList${mode}${account}`}
              headerText={t("AccountLists:removeAccountFromList")}
              trxJSON={[
                {
                  authorizing_account: usr.id,
                  account_to_list: account,
                  new_listing: 0,
                  extensions: {},
                },
              ]}
            />
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("AccountLists:cardTitle")}</CardTitle>
              <CardDescription>
                <p>{t("AccountLists:cardDescription")}</p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={mode === "whitelist" ? "" : "outline"}
                    onClick={() => {
                      setMode("whitelist");
                    }}
                  >
                    {t("AccountLists:whitelist")}
                  </Button>
                  <Button
                    variant={mode === "blacklist" ? "" : "outline"}
                    onClick={() => {
                      setMode("blacklist");
                    }}
                  >
                    {t("AccountLists:blacklist")}
                  </Button>
                </div>

                <div className="grid grid-cols-1 mt-4">
                  {mode === "whitelist" && whitelistedAccounts.length ? (
                    <List
                      height={210}
                      itemCount={whitelistedAccounts.length}
                      itemSize={50}
                      className="w-full"
                    >
                      {accountRow}
                    </List>
                  ) : null}
                  {mode === "blacklist" && blacklistedAccounts.length ? (
                    <List
                      height={210}
                      itemCount={blacklistedAccounts.length}
                      itemSize={50}
                      className="w-full border"
                    >
                      {accountRow}
                    </List>
                  ) : null}
                  {mode === "whitelist" && !whitelistedAccounts.length ? (
                    <p className="text-center">{t("AccountLists:noWhitelistedAccounts")}</p>
                  ) : null}
                  {mode === "blacklist" && !blacklistedAccounts.length ? (
                    <p className="text-center">{t("AccountLists:noBlacklistedAccounts")}</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-8 mt-4">
                  <div className="col-span-1 ml-5">
                    {targetUser && targetUser.name ? (
                      <Avatar
                        size={40}
                        name={targetUser.name}
                        extra="Target"
                        expression={{
                          eye: "normal",
                          mouth: "open",
                        }}
                        colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                      />
                    ) : (
                      <Av>
                        <AvatarFallback>?</AvatarFallback>
                      </Av>
                    )}
                  </div>
                  <div className="col-span-5">
                    <Input
                      disabled
                      placeholder={
                        targetUser && targetUser.name
                          ? `${targetUser.name} (${targetUser.id})`
                          : "Bitshares account (1.2.x)"
                      }
                      className="mb-1 mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Dialog
                      open={targetUserDialogOpen}
                      onOpenChange={(open) => {
                        setTargetUserDialogOpen(open);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" className="ml-3 mt-1">
                          {targetUser
                            ? t("AccountLists:changeTarget")
                            : t("AccountLists:provideTarget")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[375px] bg-white">
                        <DialogHeader>
                          <DialogTitle>
                            {!usr || !usr.chain ? t("AccountLists:bitsharesAccountSearch") : null}
                            {usr && usr.chain === "bitshares"
                              ? t("AccountLists:bitsharesAccountSearchBTS")
                              : null}
                            {usr && usr.chain !== "bitshares"
                              ? t("AccountLists:bitsharesAccountSearchTEST")
                              : null}
                          </DialogTitle>
                          <DialogDescription>
                            {t("AccountLists:searchingForAccount")}
                          </DialogDescription>
                        </DialogHeader>
                        <AccountSearch
                          chain={usr && usr.chain ? usr.chain : "bitshares"}
                          excludedUsers={[]}
                          setChosenAccount={setTargetUser}
                          skipCheck={mode === "whitelist" ? false : true}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <Button
                  className="mt-5 mb-3 w-1/2"
                  variant=""
                  type="submit"
                  onClick={() => {
                    setShowDialog(true);
                  }}
                >
                  {mode === "whitelist"
                    ? t("AccountLists:addToWhitelist")
                    : t("AccountLists:addToBlacklist")}
                </Button>
              </div>

              {showDialog && targetUser ? (
                <DeepLinkDialog
                  operationNames={["account_whitelist"]}
                  username={usr.username}
                  usrChain={usr.chain}
                  userID={usr.id}
                  dismissCallback={setShowDialog}
                  key={`AddingAccountToList${mode}${targetUser.id}`}
                  headerText={t("AccountLists:addAccountToList")}
                  trxJSON={[
                    {
                      authorizing_account: usr.id,
                      account_to_list: targetUser.id,
                      new_listing: mode === "whitelist" ? 1 : 2,
                      extensions: {},
                    },
                  ]}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
