import React, { useState, useEffect } from "react";
import { useStore } from '@nanostores/react';
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

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar.tsx";

import { accountSearch } from "@/nanoeffects/UserSearch.ts";
import { $currentNode } from "@/stores/node.ts";

export default function AccountSearch(properties) {
  const { chain, excludedUsers, setChosenAccount } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);

  const [accountInput, setAccountInput] = useState();
  const [errorMessage, setErrorMessage] = useState();

  const [inProgress, setInProgress] = useState(false);
  const [searchResponse, setSearchResponse] = useState();

  async function lookupAccount() {
    const excludedUsernames = excludedUsers.map((user) => user.username);
    const excludedIds = excludedUsers.map((user) => user.id);

    if (excludedUsernames.includes(accountInput) || excludedIds.includes(accountInput)) {
      setInProgress(false);
      setErrorMessage(t("AccountSearch:noSearch.selfError"));
      return;
    }

    let response;
    try {
      response = await accountSearch(chain, accountInput, currentNode ? currentNode.url : null);
    } catch (error) {
      console.log({ error, msg: t("AccountSearch:noSearch.error") });
      setErrorMessage(t("AccountSearch:noSearch.error"));
      setInProgress(false);
      return;
    }

    setInProgress(false);
    setSearchResponse(response);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3">
        {!searchResponse ? (
          <>
            <div className="col-span-1">{t("AccountSearch:noSearch.prompt")}</div>
            <div className="col-span-1">
              <Input
                value={accountInput || ""}
                placeholder={t("AccountSearch:noSearch.placeholder")}
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
            </div>
            <div className="col-span-1">
              {accountInput ? (
                <Button onClick={() => lookupAccount()}>
                  {t("AccountSearch:noSearch.continue")}
                </Button>
              ) : (
                <Button disabled>{t("AccountSearch:noSearch.continue")}</Button>
              )}
            </div>
          </>
        ) : null}
        {searchResponse ? (
          <>
            <div className="col-span-1">
              {chain === "bitshares"
                ? t("AccountSearch:searchResponse.promptBTS")
                : t("AccountSearch:searchResponse.promptTEST")}
            </div>
            <div className="col-span-1">
              <Card
                key={searchResponse.id}
                className="mb-2 mt-1 text-center"
                onClick={() => {
                  setChosenAccount({
                    name: searchResponse.name,
                    id: searchResponse.id,
                  });
                }}
              >
                <div className="grid grid-cols-4">
                  <div className="col-span-1 pt-6 pl-7">
                    <Avatar
                      size={40}
                      name={searchResponse.name}
                      extra="AS"
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
            </div>
            <div className="col-span-1">
              <div className="grid grid-cols-2">
                <div>
                  <Button
                    variant="outline"
                    className="mr-2"
                    onClick={() => {
                      setErrorMessage();
                      setSearchResponse();
                    }}
                  >
                    {t("AccountSearch:searchResponse.back")}
                  </Button>
                </div>
                <div className="text-right">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setChosenAccount({
                        name: searchResponse.name,
                        id: searchResponse.id,
                      });
                    }}
                  >
                    {t("AccountSearch:searchResponse.proceed")}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
