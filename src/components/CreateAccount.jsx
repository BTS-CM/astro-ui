import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import {
  CopyIcon,
  ReloadIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  QuestionMarkCircledIcon
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { createUserSearchStore } from "@/nanoeffects/UserSearch.ts";

import { $currentNode } from "@/stores/node.ts";
import { $currentUser } from "@/stores/users.ts";
import { debounce, copyToClipboard } from "@/lib/common";

const CreateAccount = () => {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);
  const usr = useStore($currentUser);

  const [method, setMethod] = useState("faucet");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [searched, setSearched] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  const [accountCreated, setAccountCreated] = useState(false);

  const [loseAccessChecked, setLoseAccessChecked] = useState(false);
  const [noRecoveryChecked, setNoRecoveryChecked] = useState(false);
  const [writtenDownChecked, setWrittenDownChecked] = useState(false);

  const [deeplinkDialog, setDeeplinkDialog] = useState(false);
  const [passMode, setPassMode] = useState("show");

  const [itr, setItr] = useState(0);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  useEffect(() => {
    async function fetching() {
      let _key;
      try {
        _key = await window.electron.genKey();
      } catch (error) {
        console.log({ error });
        return;
      }
  
      setGeneratedPassword(("P" + _key).substring(0, 45));
    }

    fetching();
  }, [itr]);

  const checkUsernameAvailability = useCallback(
    debounce(async (username) => {
      if (usr && usr.chain && currentNode && username) {
        const usernameStore = createUserSearchStore([
          usr.chain,
          username,
          currentNode ? currentNode.url : null,
        ]);
        usernameStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setSearched(true);
          } else if (error) {
            console.log({ error });
            setUsernameAvailable();
            setSearched(false);
          }
        });
      }
    }, 1500),
    [usr, currentNode, username]
  );

  useEffect(() => {
    setSearched(false);
    setUsernameAvailable(null);
    setLoseAccessChecked(false);
    setNoRecoveryChecked(false);
    setWrittenDownChecked(false);
    setAccountCreated(false);
    //
    checkUsernameAvailability(username);
  }, [username, checkUsernameAvailability]);

  const [generatedAccountData, setGeneratedAccountData] = useState();
  useEffect(() => {
    async function generate() {
      let response;
      try {
        response = await window.electron.genAccount({
          userID: usr.id,
          username: username,
          password: password,
          method: method,
          nodeURL: currentNode ? currentNode.url : null
        });
      } catch (error) {
        console.log({ error });
      }
      
      if (response) {
        setGeneratedAccountData(response);
      }
    }

    if (
      usr && usr.id && username &&
      password && password === generatedPassword
    ) {
      generate();
    }
  }, [usr, username, password, generatedPassword, method]);

  const [faucetInProgress, setFaucetInProgress] = useState(false);
  //const [accountResponse, setAccountResponse] = useState();
  const faucetConfirm = async () => {
    setFaucetInProgress(true);
    let registeredAccount;
    try {
      registeredAccount = await window.electron.registerFaucetAccount({
        chain: usr.chain,
        bodyParameters: JSON.stringify(generatedAccountData)
      });
    } catch (error) {
      console.log({ error });
      window.electron.notify(t("CreateAccount:faucetError"));
    }
    setFaucetInProgress(false);

    if (registeredAccount) {
      setAccountCreated(true);
      //setAccountResponse(registeredAccount);
      console.log({registeredAccount})
    }
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardHeader className="pb-5">
            <CardTitle>
              🆕 {" "}
              {t("CreateAccount:createAccount")}
            </CardTitle>
            <CardDescription>{t("CreateAccount:description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("CreateAccount:username")}</label>
                <Input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                  }}
                />
                {
                  username &&
                  username.length &&
                  searched &&
                  (usernameAvailable === null || usernameAvailable === false) 
                    ? <p className="mt-2 text-sm text-red-600">{t("CreateAccount:usernameUnavailable")}</p>
                    : null
                }
                {
                  username &&
                  username.length &&
                  (
                    username.length > 63 || // accounts can't be longer than 64 characters
                    (method === "faucet" && isNaN(username[username.length - 1])) || // free accounts must end in a number
                    username[username.length - 1] === "." || // accounts can't end in a period 
                    username.includes("--") || // No 2 dashes in a row
                    (username.split(".").length > 2) || // accounts can't include more than 1 period
                    /[^a-zA-Z0-9-.]/.test(username) // only allow letters, numbers, dashes, and one dot
                  )
                    ? <p className="mt-2 text-sm text-red-600">{t("CreateAccount:invalidUsername")}</p>
                    : null
                }
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  {t("CreateAccount:generatedPassword")}
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <QuestionMarkCircledIcon className="ml-2" />
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <p>{t("CreateAccount:genPassAbout")}</p>
                    </HoverCardContent>
                  </HoverCard>
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-3">
                    <Input
                      type={passMode === "hide" ? "password" : "text"}
                      value={generatedPassword}
                      disabled
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="outline"
                      className="mr-2"
                      onClick={() => {
                        setPassMode(passMode === "show" ? "hide" : "show");
                      }}
                    >
                      {passMode === "hide" ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </Button>
                    <Button
                      variant="outline"
                      className="mr-2"
                      onClick={() => {
                        copyToClipboard(generatedPassword);
                      }}
                    >
                      <CopyIcon />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setItr(itr + 1);
                      }}
                    >
                      <ReloadIcon />
                    </Button>                     
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("CreateAccount:confirmPasswordTitle")}</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("CreateAccount:method")}</label>
                <Select value={method} onValueChange={(value) => setMethod(value)}>
                  <SelectTrigger className="mb-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectGroup>
                      <SelectItem value="faucet">
                        {t("CreateAccount:faucetMethod")}
                      </SelectItem>
                      <SelectItem value="ltm">
                        {t("CreateAccount:ltmMethod")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Checkbox
                    id="checkbox1"
                    checked={loseAccessChecked}
                    onClick={() => {
                      setLoseAccessChecked(!loseAccessChecked);
                    }}
                  />
                  <label
                    htmlFor="checkbox1"
                    className="ml-2 mb-2 text-sm"
                  >
                    {t("CreateAccount:loseAccess")}
                  </label>
                </div>
                <div>
                  <Checkbox
                    id="checkbox2"
                    checked={noRecoveryChecked}
                    onClick={() => {
                      setNoRecoveryChecked(!noRecoveryChecked);
                    }}
                  />
                  <label
                    htmlFor="checkbox2"
                    className="ml-2 mb-2 text-sm"
                  >
                    {t("CreateAccount:noRecovery")}
                  </label>
                </div>
                <div>
                  <Checkbox
                    id="checkbox3"
                    checked={writtenDownChecked}
                    onClick={() => {
                      setWrittenDownChecked(!writtenDownChecked);
                    }}
                  />
                  <label
                    htmlFor="checkbox3"
                    className="ml-2 mb-2 text-sm"
                  >
                    {t("CreateAccount:writtenDown")}
                  </label>
                </div>
              </div>
              {
                username &&
                username.length &&
                username.length < 64 &&
                username.split(".").length <= 2 &&
                !username.includes("--") &&
                !/[^a-zA-Z0-9-.]/.test(username) &&
                (
                  method === "ltm" ||
                  (
                    method === "faucet" &&
                    !isNaN(username[username.length - 1]) &&
                    username[username.length - 1] !== "."
                  )
                ) &&
                password && generatedPassword && password === generatedPassword &&
                generatedAccountData &&
                loseAccessChecked && noRecoveryChecked && writtenDownChecked
                  ? <>
                      {
                        method === "ltm" && !deeplinkDialog
                          ? <Button
                              onClick={() => setDeeplinkDialog(true)}
                              className="w-1/3 text-left"
                            >
                              {t("CreateAccount:generateDeeplink")}
                            </Button>
                          : null
                      }
                      {
                        method === "faucet"
                          ? <Button
                              onClick={faucetConfirm}
                              className="w-1/3 text-left"
                            >
                              {t("CreateAccount:submit")}
                            </Button>
                          : null
                      }
                    </> 
                  : <Button className="w-1/3 text-left" disabled>
                      {t("CreateAccount:submit")}
                    </Button>
              }
            </div>
          {
            accountCreated
              ? <p>{t("CreateAccount:accountCreated")}</p>
              : null
          }
          {
            faucetInProgress
              ? <p>{t("CreateAccount:faucetInProgress")}</p>
              : null
          }
          </CardContent>
        </Card>
        {
          method === "ltm" && deeplinkDialog && generatedAccountData
            ? <DeepLinkDialog
                operationNames={["account_create"]}
                username={usr && usr.username ? usr.username : ""}
                usrChain={usr && usr.chain ? usr.chain : "bitshares"}
                userID={usr.id}
                dismissCallback={setDeeplinkDialog}
                key={`creatingAccount${method}${username}`}
                headerText={t("CreateAccount:deeplinkHeaderText")}
                trxJSON={[generatedAccountData]}
              />
            : null
        }
      </div>
    </div>
  );
};

export default CreateAccount;