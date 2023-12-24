import React, { useState, useEffect, useSyncExternalStore } from "react";
import * as fflate from "fflate";
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

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar.tsx";

import { $currentUser, setCurrentUser, $userStorage, removeUser } from "../stores/users.ts";

export default function AccountSelect(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

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
    const response = await fetch(
      `http://localhost:8080/api/accountLookup/${chain}/${accountInput}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.log({
        error: new Error(`${response.status} ${response.statusText}`),
        msg: t("AccountSelect:noAccount"),
      });
      setInProgress(false);
      return;
    }

    const responseContents = await response.json();

    if (responseContents && responseContents.result) {
      const decompressed = fflate.decompressSync(fflate.strToU8(responseContents.result, true));
      const finalResult = JSON.parse(fflate.strFromU8(decompressed));
      setInProgress(false);
      setSearchResponse(finalResult);
      return;
    }

    setInProgress(false);
    setErrorMessage(t("AccountSelect:noAccount"));
  }

  const firstResponse = searchResponse ? (
    <Card
      className="w-1/2"
      key={searchResponse.id}
      onClick={() => {
        setCurrentUser(searchResponse.name, searchResponse.id, searchResponse.referrer, chain);
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
        <Card>
          <CardHeader>
            <CardTitle>{t("AccountSelect:noChain.title")}</CardTitle>
            <CardDescription>{t("AccountSelect:noChain.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="mr-2" onClick={() => setChain("bitshares")}>
              Bitshares (BTS)
            </Button>
            <Button onClick={() => setChain("bitshares_testnet")}>
              Bitshares {t("AccountSelect:noChain.testnet")} (TEST)
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {chain && !mode ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {chain === "bitshares"
                ? t("AccountSelect:noMode.titleBTS")
                : t("AccountSelect:noMode.titleTEST")}
            </CardTitle>
            <CardDescription>{t("AccountSelect:noMode.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="mr-2" onClick={() => setMode("new")}>
              {t("AccountSelect:noMode.new")}
            </Button>
            <Button onClick={() => setMode("existing")}>
              {t("AccountSelect:noMode.existing")}
            </Button>
            <br />
            <Button className="mt-2" onClick={() => setChain(null)}>
              {t("AccountSelect:noMode.back")}
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {chain && mode && mode === "new" && !searchResponse ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {chain === "bitshares" ? "🔐 Bitshares (BTS)" : "🔐 Bitshares testnet (TEST)"}
            </CardTitle>
            <CardDescription>{t("AccountSelect:new.initDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
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
            />
            {errorMessage ? (
              <p className="text-red-500 text-xs italic">{errorMessage || "ERROR"}</p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button className="mr-2" onClick={() => setMode(null)}>
              {t("AccountSelect:new.back")}
            </Button>
            {accountInput && !inProgress ? (
              <Button onClick={() => lookupAccount()}>{t("AccountSelect:new.continue")}</Button>
            ) : (
              <Button disabled>{t("AccountSelect:new.continue")}</Button>
            )}
          </CardFooter>
        </Card>
      ) : null}
      {searchResponse ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {chain === "bitshares" ? "🔐 Bitshares (BTS) " : "🔐 Bitshares testnet (TEST) "}
              {t("AccountSelect:new.title")}
            </CardTitle>
            <CardDescription>{t("AccountSelect:new.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {usr && chain !== usr.chain ? (
              <a href={window.location.pathname}>{firstResponse}</a>
            ) : (
              firstResponse
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="mr-2"
              onClick={() => {
                setErrorMessage();
                setSearchResponse();
              }}
            >
              {t("AccountSelect:new.back")}
            </Button>
          </CardFooter>
        </Card>
      ) : null}
      {mode && mode === "existing" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {chain === "bitshares" ? "Bitshares (BTS)" : "Bitshares testnet (TEST)"}
            </CardTitle>
            <CardDescription>{t("AccountSelect:existing.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
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
                <p className="text-red-500 text-xs italic">{t("AccountSelect:existing.none")}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="mr-2" onClick={() => setMode(null)}>
              {t("AccountSelect:noMode.back")}
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}
