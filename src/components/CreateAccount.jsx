import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import {
  CopyIcon,
  ReloadIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  QuestionMarkCircledIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { getTopDonators } from "@/nanoeffects/TopDonators.ts";
import { getObjects } from "@/nanoeffects/src/common";

import {
  DONATIONS_TARGET_ID,
  DONATIONS_ASSET_ID,
  DONATIONS_TOP_LIMIT,
  DONATIONS_LOOKBACK_DAYS,
  DONATIONS_DEFAULT_REFERRER_NAME,
  DONATIONS_TESTNET_REFERRER_NAME,
} from "@/config/donations.ts";

import { $currentNode } from "@/stores/node.ts";
import { $currentUser } from "@/stores/users.ts";
import { debounce, copyToClipboard } from "@/lib/common";
import { cn } from "@/lib/utils";

import { UserPlus, CheckCircle2, XCircle } from "lucide-react";

// Validation idiom copied from ChangePassword.jsx (keep in sync): idle →
// neutral, match → success, mismatch → danger. Status icon inside the input.
const validationBorder = (value, expected) => {
  if (!value) return null;
  if (value === expected)
    return "border-[hsl(var(--accent-success)/0.6)] focus-visible:ring-[hsl(var(--accent-success)/0.3)]";
  return "border-[hsl(var(--accent-danger)/0.6)] focus-visible:ring-[hsl(var(--accent-danger)/0.3)]";
};

const MatchIcon = ({ value, expected }) => {
  if (!value) return null;
  if (value === expected)
    return <CheckCircle2 className="h-4 w-4 text-[hsl(var(--accent-success-fg))]" />;
  return <XCircle className="h-4 w-4 text-[hsl(var(--accent-danger-fg))]" />;
};

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

  const [topDonatorID, setTopDonatorID] = useState(null);
  const [topDonatorName, setTopDonatorName] = useState(null);
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
          nodeURL: currentNode ? currentNode.url : null,
          referrerOverride: topDonatorID ?? null,
          chain: usr.chain,
        });
      } catch (error) {
        console.log({ error });
      }

      if (response) {
        setGeneratedAccountData(response);
      }
    }

    if (
      usr &&
      usr.id &&
      username &&
      password &&
      password === generatedPassword
    ) {
      generate();
    }
  }, [usr, username, password, generatedPassword, method, topDonatorID]);

  useEffect(() => {
    let cancelled = false;
    async function fetchTopDonator() {
      if (!usr || !usr.chain || usr.chain !== "bitshares") {
        setTopDonatorID(null);
        setTopDonatorName(null);
        return;
      }
      try {
        const donors = await getTopDonators(
          DONATIONS_TARGET_ID,
          DONATIONS_ASSET_ID,
          DONATIONS_TOP_LIMIT,
          DONATIONS_LOOKBACK_DAYS
        );
        if (cancelled) return;
        const id = donors && donors.length ? donors[0].id : null;
        setTopDonatorID(id);
        if (id) {
          const objs = await getObjects(
            "bitshares",
            [id],
            currentNode ? currentNode.url : null
          );
          if (!cancelled) {
            setTopDonatorName(
              objs && objs.length && objs[0].name ? objs[0].name : id
            );
          }
        } else {
          setTopDonatorName(null);
        }
      } catch (error) {
        console.log({ error });
        if (!cancelled) {
          setTopDonatorID(null);
          setTopDonatorName(null);
        }
      }
    }
    fetchTopDonator();
    return () => {
      cancelled = true;
    };
  }, [usr, currentNode]);

  const [faucetInProgress, setFaucetInProgress] = useState(false);
  //const [accountResponse, setAccountResponse] = useState();
  const faucetConfirm = async () => {
    setFaucetInProgress(true);
    let registeredAccount;
    try {
      registeredAccount = await window.electron.registerFaucetAccount({
        chain: usr.chain,
        bodyParameters: JSON.stringify(generatedAccountData),
      });
    } catch (error) {
      console.log({ error });
      window.electron.notify(t("CreateAccount:faucetError"));
    }
    setFaucetInProgress(false);

    if (registeredAccount) {
      setAccountCreated(true);
      console.log({ registeredAccount });
    }
  };

  const isFormValid =
    username &&
    username.length &&
    username.length < 64 &&
    username.split(".").length <= 2 &&
    !username.includes("--") &&
    !/[^a-zA-Z0-9-.]/.test(username) &&
    (method === "ltm" ||
      (method === "faucet" &&
        !isNaN(username[username.length - 1]) &&
        username[username.length - 1] !== ".")) &&
    password &&
    generatedPassword &&
    password === generatedPassword &&
    generatedAccountData &&
    loseAccessChecked &&
    noRecoveryChecked &&
    writtenDownChecked;

  const usernameInvalid =
    username &&
    username.length &&
    (username.length > 63 ||
      (method === "faucet" && isNaN(username[username.length - 1])) ||
      username[username.length - 1] === "." ||
      username.includes("--") ||
      username.split(".").length > 2 ||
      /[^a-zA-Z0-9-.]/.test(username));

  return (
    <div className="container mx-auto mt-5 mb-5 w-full lg:w-3/4 text-foreground">
      <div className="grid grid-cols-1 gap-3">
        <Card className="overflow-hidden bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm gap-0">
          <div className="border-b border-border p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <UserPlus className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("CreateAccount:createAccount")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("CreateAccount:description")}
                </p>
              </div>
              <span className="ml-auto inline-flex shrink-0 items-center rounded-full border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--accent-2-fg))]">
                {method === "faucet" ? t("CreateAccount:faucetMethod") : t("CreateAccount:ltmMethod")}
              </span>
            </div>
          </div>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  {t("CreateAccount:username")}
                </label>
                <Input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                  }}
                  className={cn(
                    "bg-accent/30 dark:bg-white/[0.05] border-border text-foreground placeholder:text-muted-foreground/60",
                    usernameInvalid
                      ? "border-[hsl(var(--accent-danger)/0.6)] focus-visible:ring-[hsl(var(--accent-danger)/0.3)]"
                      : null
                  )}
                />
                {username &&
                username.length &&
                searched &&
                (usernameAvailable === null || usernameAvailable === false) ? (
                  <p className="mt-2 text-sm text-[hsl(var(--accent-danger-fg))] flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {t("CreateAccount:usernameUnavailable")}
                  </p>
                ) : null}
                {usernameInvalid ? (
                  <p className="mt-2 text-sm text-[hsl(var(--accent-danger-fg))] flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {t("CreateAccount:invalidUsername")}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/70 flex items-center mb-1.5">
                  {t("CreateAccount:generatedPassword")}
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <QuestionMarkCircledIcon className="ml-2 h-4 w-4 text-muted-foreground cursor-help" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 bg-card border-border text-foreground text-sm">
                      <p className="text-foreground/70">{t("CreateAccount:genPassAbout")}</p>
                    </HoverCardContent>
                  </HoverCard>
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-4 md:col-span-3">
                    <Input
                      type={passMode === "hide" ? "password" : "text"}
                      value={generatedPassword}
                      disabled
                      className="bg-accent/30 dark:bg-white/[0.05] border-border text-foreground disabled:opacity-60"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1 flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-border text-muted-foreground hover:bg-accent/60"
                      onClick={() => {
                        setPassMode(passMode === "show" ? "hide" : "show");
                      }}
                    >
                      {passMode === "hide" ? (
                        <EyeClosedIcon className="h-4 w-4" />
                      ) : (
                        <EyeOpenIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-border text-muted-foreground hover:bg-accent/60"
                      onClick={() => {
                        copyToClipboard(generatedPassword);
                      }}
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-border text-muted-foreground hover:bg-accent/60"
                      onClick={() => {
                        setItr(itr + 1);
                      }}
                    >
                      <ReloadIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  {t("CreateAccount:confirmPasswordTitle")}
                </label>
                <div className="relative">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "bg-accent/30 dark:bg-white/[0.05] border-border text-foreground placeholder:text-muted-foreground/60 pr-9",
                      validationBorder(password, generatedPassword)
                    )}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <MatchIcon value={password} expected={generatedPassword} />
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  {t("CreateAccount:method")}
                </label>
                <Select
                  value={method}
                  onValueChange={(value) => setMethod(value)}
                >
                  <SelectTrigger className="bg-accent/30 dark:bg-white/[0.05] border-[hsl(var(--accent-2)/0.35)] text-foreground/70 focus:ring-[hsl(var(--accent-2)/0.3)]">
                    <SelectValue className="text-foreground/70" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border shadow-2xl dark:shadow-black/40 shadow-black/15">
                    <SelectGroup>
                      <SelectItem value="faucet" className="text-foreground/70 focus:bg-accent focus:text-accent-foreground">
                        {t("CreateAccount:faucetMethod")}
                      </SelectItem>
                      <SelectItem value="ltm" className="text-foreground/70 focus:bg-accent focus:text-accent-foreground">
                        {t("CreateAccount:ltmMethod")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {method === "faucet" ? (
                <div className="rounded-xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.08)] to-transparent p-3">
                  <div className={`grid grid-cols-1 ${usr && usr.chain === "bitshares" ? "sm:grid-cols-2" : ""} gap-3 items-center`}>
                    <div>
                      <p className="text-sm text-foreground/80">
                        {t("CreateAccount:referredBy", "Your account will be registered & referred by:")}{" "}
                        <span className="font-medium text-[hsl(var(--accent-1-fg))]">
                          {usr && usr.chain === "bitshares"
                            ? (topDonatorName ?? DONATIONS_DEFAULT_REFERRER_NAME)
                            : DONATIONS_TESTNET_REFERRER_NAME}
                        </span>
                      </p>
                    </div>
                    {usr && usr.chain === "bitshares" ? (
                      <div className="sm:text-right">
                        <Button
                          asChild
                          className="w-full sm:w-auto bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_28px_-12px_hsl(var(--accent-1)/0.7)] hover:shadow-[0_12px_36px_-12px_hsl(var(--accent-1)/0.9)] transition-all"
                        >
                          <a href="/monthly_referrer.html">
                            {t("CreateAccount:becomeReferrer", "Donate to become the referrer of new accounts")}
                          </a>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: "checkbox1", checked: loseAccessChecked, set: setLoseAccessChecked, label: t("CreateAccount:loseAccess") },
                  { id: "checkbox2", checked: noRecoveryChecked, set: setNoRecoveryChecked, label: t("CreateAccount:noRecovery") },
                  { id: "checkbox3", checked: writtenDownChecked, set: setWrittenDownChecked, label: t("CreateAccount:writtenDown") },
                ].map(({ id, checked, set, label }) => (
                  <div key={id} className="flex items-center">
                    <Checkbox
                      id={id}
                      checked={checked}
                      onClick={() => set(!checked)}
                      className="border-foreground/30 data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=checked]:border-[hsl(var(--accent-1))]"
                    />
                    <label htmlFor={id} className="ml-2 mb-0 text-sm text-foreground/70">
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                {isFormValid ? (
                  <>
                    {method === "ltm" && !deeplinkDialog ? (
                      <Button
                        onClick={() => setDeeplinkDialog(true)}
                        className="bg-[hsl(var(--accent-1))] hover:bg-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_28px_-12px_hsl(var(--accent-1)/0.7)]"
                      >
                        {t("CreateAccount:generateDeeplink")}
                      </Button>
                    ) : null}
                    {method === "faucet" ? (
                      <Button onClick={faucetConfirm} className="bg-[hsl(var(--accent-1))] hover:bg-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_28px_-12px_hsl(var(--accent-1)/0.7)]">
                        {t("CreateAccount:submit")}
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button className="bg-accent/40 text-muted-foreground" disabled>
                      {t("CreateAccount:submit")}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {!username || usernameInvalid
                        ? t("CreateAccount:invalidUsername")
                        : !password || password !== generatedPassword
                        ? t("CreateAccount:confirmPasswordTitle")
                        : t("CreateAccount:writtenDown")}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {accountCreated ? (
              <p className="mt-4 text-[hsl(var(--accent-1-fg))] text-sm">{t("CreateAccount:accountCreated")}</p>
            ) : null}
            {faucetInProgress ? (
              <p className="mt-4 text-muted-foreground text-sm">{t("CreateAccount:faucetInProgress")}</p>
            ) : null}
          </CardContent>
        </Card>
        {method === "ltm" && deeplinkDialog && generatedAccountData ? (
          <DeepLinkDialog
            operationNames={["account_create"]}
            username={usr && usr.username ? usr.username : ""}
            usrChain={usr && usr.chain ? usr.chain : "bitshares"}
            userID={usr.id}
            dismissCallback={setDeeplinkDialog}
            key={`creatingAccount${method}${username}`}
            headerText={t("CreateAccount:deeplinkHeaderText")}
            trxJSON={[generatedAccountData]}
          />
        ) : null}
      </div>
    </div>
  );
};

export default CreateAccount;
