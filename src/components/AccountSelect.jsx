import React, { useState, useEffect, useSyncExternalStore } from "react";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar.tsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import {
  $currentUser,
  setCurrentUser,
  $userStorage,
  removeUser,
} from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";

import { accountSearch } from "@/nanoeffects/UserSearch.ts";

export default function AccountSelect(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const [chain, setChain] = useState();
  const [mode, setMode] = useState();
  const [accountInput, setAccountInput] = useState();
  const [errorMessage, setErrorMessage] = useState();

  const [users, setUsers] = useState();
  useEffect(() => {
    const unsubscribe = $userStorage.subscribe((value) => {
      setUsers(value.users);
    });
    return unsubscribe;
  }, [$userStorage]);

  const [inProgress, setInProgress] = useState(false);
  const [searchResponse, setSearchResponse] = useState();
  async function lookupAccount() {
    if (!chain) {
      return;
    }

    let response;
    try {
      response = await accountSearch(chain, accountInput);
    } catch (error) {
      console.log({ error, msg: t("AccountSelect:noAccount") });
      setErrorMessage(t("AccountSelect:noAccount"));
      setInProgress(false);
      return;
    }

    setInProgress(false);
    if (response && response.id) {
      if (usr.chain === "bitshares") {
        let hashedID;
        try {
          hashedID = toHex(sha256(response.id));
        } catch (error) {
          console.log({ error });
        }
        if (hashedID && blocklist.users.includes(hashedID)) {
          setErrorMessage(t("AccountSelect:noAccount"));
          return;
        }
      }
    } else {
      setErrorMessage(t("AccountSelect:noAccount"));
    }
    setSearchResponse(response);
  }

  const firstResponse = searchResponse ? (
    <Card
      className="w-1/2"
      key={searchResponse.id}
      onClick={() => {
        setCurrentUser(
          searchResponse.name,
          searchResponse.id,
          searchResponse.referrer,
          chain
        );
      }}
    >
      <div className="grid grid-cols-4">
        <div className="col-span-1 pt-6 pl-4">
          <Avatar
            size={40}
            name={searchResponse.name}
            extra=""
            expression={{
              eye: "normal",
              mouth: "open",
            }}
            colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
          />
        </div>
        <div className="col-span-3">
          <CardHeader>
            <CardTitle
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {searchResponse.name}
            </CardTitle>
            <CardDescription>{searchResponse.id}</CardDescription>
          </CardHeader>
        </div>
      </div>
    </Card>
  ) : null;

  const SecondResponse = ({ user }) => {
    return (
      <HoverCard key={user.id}>
        <HoverCardTrigger asChild>
          <Card
            onClick={() => {
              setCurrentUser(user.username, user.id, user.referrer, user.chain);
            }}
          >
            <div className="grid grid-cols-4">
              <div className="col-span-1 pt-6 pl-2">
                <Avatar
                  size={40}
                  name={user.username}
                  extra=""
                  expression={{
                    eye: "normal",
                    mouth: "open",
                  }}
                  colors={[
                    "#92A1C6",
                    "#146A7C",
                    "#F0AB3D",
                    "#C271B4",
                    "#C20D90",
                  ]}
                />
              </div>
              <div className="col-span-3">
                <CardHeader>
                  <CardTitle
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.username}
                  </CardTitle>
                  <CardDescription>{user.id}</CardDescription>
                </CardHeader>
              </div>
            </div>
          </Card>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          {t("AccountSelect:forgetPrompt", { user: user.username })}
          <br />
          <Button
            className="w-full mt-2 text-bold text-white"
            variant="destructive"
            onClick={() => {
              removeUser(user.id);
            }}
          >
            {t("AccountSelect:forgetButton")}
          </Button>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <div className="grid grid-cols-1">
      {!chain ? (
        <>
          {t("AccountSelect:noChain.description")}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <Button className="mr-2" onClick={() => setChain("bitshares")}>
              Bitshares (BTS)
            </Button>
            <Button onClick={() => setChain("bitshares_testnet")}>
              Bitshares {t("AccountSelect:noChain.testnet")} (TEST)
            </Button>
          </div>
        </>
      ) : null}
      {chain && !mode ? (
        <>
          {chain === "bitshares"
            ? t("AccountSelect:noMode.titleBTS")
            : t("AccountSelect:noMode.titleTEST")}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <Button className="mr-2" onClick={() => setMode("new")}>
              {t("AccountSelect:noMode.new")}
            </Button>
            <Button onClick={() => setMode("existing")}>
              {t("AccountSelect:noMode.existing")}
            </Button>
            <Button
              variant="outline"
              className="mt-2 mr-2"
              onClick={() => setChain(null)}
            >
              {t("AccountSelect:noMode.back")}
            </Button>
          </div>
        </>
      ) : null}
      {chain && mode && mode === "new" && !searchResponse ? (
        <>
          {chain === "bitshares"
            ? "🔐 Bitshares (BTS)"
            : "🔐 Bitshares testnet (TEST)"}
          <br />
          <Input
            value={accountInput || ""}
            placeholder="Account name or ID"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !inProgress) {
                setInProgress(true);
                lookupAccount();
              }
            }}
            onChange={(event) => {
              const regex = /^[a-zA-Z0-9.-]*$/;
              if (regex.test(event.target.value)) {
                setAccountInput(event.target.value);
                setErrorMessage();
                setSearchResponse();
              }
            }}
            className="mt-4"
          />
          {errorMessage ? (
            <p className="text-red-500 text-xs italic">
              {errorMessage || "ERROR"}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <Button
              className="mr-2"
              variant="outline"
              onClick={() => setMode(null)}
            >
              {t("AccountSelect:new.back")}
            </Button>
            {accountInput && !inProgress ? (
              <Button onClick={() => lookupAccount()}>
                {t("AccountSelect:new.continue")}
              </Button>
            ) : (
              <Button disabled>{t("AccountSelect:new.continue")}</Button>
            )}
          </div>
        </>
      ) : null}
      {searchResponse ? (
        <>
          {t("AccountSelect:new.description")}
          <div className="grid grid-cols-1 mt-3">
            {usr && chain !== usr.chain ? (
              <a href={window.location.pathname}>{firstResponse}</a>
            ) : (
              firstResponse
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-5">
            <Button
              variant="outline"
              onClick={() => {
                setErrorMessage();
                setSearchResponse();
              }}
            >
              {t("AccountSelect:new.back")}
            </Button>
          </div>
        </>
      ) : null}
      {mode && mode === "existing" ? (
        <>
          {chain === "bitshares"
            ? "Bitshares (BTS)"
            : "Bitshares testnet (TEST)"}
          <br />
          {t("AccountSelect:existing.description")}
          <div className="grid grid-cols-2 gap-3 mb-5 mt-5">
            {users.filter((user) => user.chain === chain).length ? (
              users
                .filter((user) => user.chain === chain)
                .map((user) => {
                  return usr && chain !== usr.chain ? (
                    <a href={window.location.pathname}>
                      <SecondResponse user={user} />
                    </a>
                  ) : (
                    <SecondResponse user={user} />
                  );
                })
            ) : (
              <p className="text-red-500 text-xs italic">
                {t("AccountSelect:existing.none")}
              </p>
            )}
          </div>
          <Button
            className="mr-2"
            variant="outline"
            onClick={() => setMode(null)}
          >
            {t("AccountSelect:noMode.back")}
          </Button>
        </>
      ) : null}
    </div>
  );
}
