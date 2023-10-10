import React, { useState, useEffect } from "react";
import * as fflate from "fflate";

import {
  $globalParamsCache,
  setGlobalParams,
  $marketSearchCache,
  addMarketSearchesToCache,
  addPoolsToCache,
  addAssetsToCache,
} from "../stores/cache.ts";

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

import { setCurrentUser, $userStorage, removeUser } from "../stores/users.ts";

export default function AccountSelect(properties) {
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
        msg: "Couldn't find account.",
      });
      setInProgress(false);
      return;
    }

    const responseContents = await response.json();

    if (responseContents && responseContents.result) {
      const finalResult = responseContents.result;
      setInProgress(false);
      setSearchResponse(finalResult);
      return;
    }

    setInProgress(false);
    setErrorMessage("Couldn't find account.");
  }

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1">
          {!chain ? (
            <Card>
              <CardHeader>
                <CardTitle>⚙️ Select a blockchain to continue</CardTitle>
                <CardDescription>
                  Which blockchain do you want to use?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mr-2" onClick={() => setChain("bitshares")}>
                  Bitshares (BTS)
                </Button>
                <Button onClick={() => setChain("bitshares_testnet")}>
                  Bitshares testnet (TEST)
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {chain && !mode ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Use a new or existing{" "}
                  {chain === "bitshares" ? "Bitshares" : "Bitshares testnet"}{" "}
                  account?
                </CardTitle>
                <CardDescription>How do you want to proceed?</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mr-2" onClick={() => setMode("new")}>
                  New account
                </Button>
                <Button onClick={() => setMode("existing")}>
                  Existing account
                </Button>
                <br />
                <Button className="mt-2" onClick={() => setChain(null)}>
                  Back
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {chain && mode && mode === "new" && !searchResponse ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {chain === "bitshares"
                    ? "🔐 Bitshares (BTS)"
                    : "🔐 Bitshares testnet (TEST)"}
                </CardTitle>
                <CardDescription>
                  Enter your Bitshares account name
                </CardDescription>
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
                  <p className="text-red-500 text-xs italic">
                    {errorMessage || "ERROR"}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter>
                <Button className="mr-2" onClick={() => setMode(null)}>
                  Back
                </Button>
                {accountInput && !inProgress ? (
                  <Button onClick={() => lookupAccount()}>Continue</Button>
                ) : (
                  <Button disabled>Continue</Button>
                )}
              </CardFooter>
            </Card>
          ) : null}
          {searchResponse ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {chain === "bitshares"
                    ? "🔐 Bitshares (BTS) account selection"
                    : "🔐 Bitshares testnet (TEST) account selection"}
                </CardTitle>
                <CardDescription>
                  Proceed with the following account?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Card
                  key={searchResponse.id}
                  className="w-1/3"
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
                          {searchResponse.name}
                        </CardTitle>
                        <CardDescription>{searchResponse.id}</CardDescription>
                      </CardHeader>
                    </div>
                  </div>
                </Card>
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
                  Go back
                </Button>
              </CardFooter>
            </Card>
          ) : null}
          {mode && mode === "existing" ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {chain === "bitshares"
                    ? "Bitshares (BTS)"
                    : "Bitshares testnet (TEST)"}
                </CardTitle>
                <CardDescription>
                  Select one of your previously used accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-5">
                  {users.filter((user) => user.chain === chain).length ? (
                    users
                      .filter((user) => user.chain === chain)
                      .map((user) => {
                        return (
                          <HoverCard key={user.id}>
                            <HoverCardTrigger asChild>
                              <Card
                                onClick={() => {
                                  setCurrentUser(
                                    user.username,
                                    user.id,
                                    user.referrer,
                                    user.chain
                                  );
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
                                      <CardDescription>
                                        {user.id}
                                      </CardDescription>
                                    </CardHeader>
                                  </div>
                                </div>
                              </Card>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              Account: {user.username}
                              <br />
                              <Button
                                className="w-full mt-2 text-bold text-white"
                                variant="destructive"
                                onClick={() => {
                                  removeUser(user.id);
                                }}
                              >
                                Forget this account
                              </Button>
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })
                  ) : (
                    <p className="text-red-500 text-xs italic">
                      No accounts found.
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="mr-2" onClick={() => setMode(null)}>
                  Back
                </Button>
              </CardFooter>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
