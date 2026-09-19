import React, { useState, useEffect, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import { Avatar } from "./Avatar.tsx";

import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import { copyToClipboard } from "@/lib/common";
import { cn } from "@/lib/utils";
import { KeyRound, AlertTriangle, Info, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { getObjects } from "@/nanoeffects/src/common";
import { getFullAccountDetails } from "@/nanoeffects/FullAccountDetails";

// Validation border idiom (shared with CreateAccount): idle → neutral,
// match/valid → success, mismatch/invalid → danger, too-short → warning.
// Status icons render inside the input — no new locale strings needed.
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

const ChangePassword = () => {  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useStore($currentUser);
  const currentNodeUrl = useStore($currentNodeUrl);

  const [passwordMode, setPasswordMode] = useState("generated");

  const [itr, setItr] = useState(0);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [passMode, setPassMode] = useState("show");

  const [confirmGenerated, setConfirmGenerated] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [confirmCustom, setConfirmCustom] = useState("");

  const [cloudChecked, setCloudChecked] = useState(false);
  const [beetChecked, setBeetChecked] = useState(false);
  const [memoChecked, setMemoChecked] = useState(false);
  const [loseAccessChecked, setLoseAccessChecked] = useState(false);
  const [noRecoveryChecked, setNoRecoveryChecked] = useState(false);
  const [writtenDownChecked, setWrittenDownChecked] = useState(false);

  const [derivedKeys, setDerivedKeys] = useState(null);
  const [deeplinkDialog, setDeeplinkDialog] = useState(false);
  const [step, setStep] = useState(1);
  const [currentOptions, setCurrentOptions] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Generate password (reuse logic from CreateAccount.jsx:86-100)
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
      // reset confirmation when regenerating
      setConfirmGenerated("");
    }
    fetching();
  }, [itr]);

  const effectivePassword = useMemo(() => {
    if (passwordMode === "generated") return generatedPassword;
    return customPassword;
  }, [passwordMode, generatedPassword, customPassword]);

  const confirmValue = passwordMode === "generated" ? confirmGenerated : confirmCustom;

  // Derive keys via main process (same seed = accountName+role+password as CreateAccount)
  useEffect(() => {
    async function derive() {
      if (!usr || !usr.username || !effectivePassword) {
        setDerivedKeys(null);
        return;
      }
      // only derive when confirmation matches and not empty
      const confirmationMatches = confirmValue && confirmValue === effectivePassword;
      if (!confirmationMatches) {
        setDerivedKeys(null);
        return;
      }
      if (passwordMode === "custom" && effectivePassword.length < 1) {
        setDerivedKeys(null);
        return;
      }
      try {
        const keys = await window.electron.generatePasswordKeys({
          accountName: usr.username,
          password: effectivePassword,
          chain: usr.chain,
        });
        const expectedPrefix = usr.chain === "bitshares_testnet" ? "TEST" : "BTS";
        if (keys && keys.owner && keys.active && keys.memo && keys.owner.startsWith(expectedPrefix) && keys.active.startsWith(expectedPrefix) && keys.memo.startsWith(expectedPrefix)) {
          setDerivedKeys(keys);
        } else {
          if (keys && keys.owner && !keys.owner.startsWith(expectedPrefix)) {
            console.log(`Key prefix mismatch: expected ${expectedPrefix}, got ${keys.owner.slice(0,4)}`);
          }
          setDerivedKeys(null);
        }
      } catch (e) {
        console.log({ e });
        setDerivedKeys(null);
      }
    }
    derive();
  }, [usr, effectivePassword, confirmValue, passwordMode]);

  // Fetch current account_options for new_options (voting_account, etc.) – required by serializer
  useEffect(() => {
    if (!usr || !usr.id || !usr.chain) {
      setCurrentOptions(null);
      setOptionsLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchOptions() {
      setOptionsLoading(true);
      try {
        // Primary: get_objects 1.2.x → account.options
        const objs = await getObjects(usr.chain, [usr.id], currentNodeUrl || null);
        if (cancelled) return;
        if (objs && objs.length && objs[0] && objs[0].options) {
          setCurrentOptions(objs[0].options);
          return;
        }
        // Fallback: get_full_accounts
        const full = await getFullAccountDetails(usr.chain, usr.id, currentNodeUrl || null);
        if (cancelled) return;
        if (full && full.length && full[0] && full[0][1] && full[0][1].account && full[0][1].account.options) {
          setCurrentOptions(full[0][1].account.options);
          return;
        }
        setCurrentOptions(null);
      } catch (e) {
        console.log({ e, location: "fetch currentOptions" });
        if (!cancelled) setCurrentOptions(null);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    }
    fetchOptions();
    return () => { cancelled = true; };
  }, [usr?.id, usr?.chain, currentNodeUrl]);

  const trxJSON = useMemo(() => {
    if (!usr || !usr.id || !derivedKeys) return null;
    // account_options requires all fields when new_options present (src/bts/serializer/operations.js:757)
    let new_options;
    if (optionsLoading) return null;
    if (currentOptions && currentOptions.voting_account) {
      new_options = {
        memo_key: derivedKeys.memo,
        voting_account: currentOptions.voting_account,
        num_witness: currentOptions.num_witness ?? 0,
        num_committee: currentOptions.num_committee ?? 0,
        votes: currentOptions.votes ?? [],
        extensions: currentOptions.extensions ?? [],
      };
    } else {
      // fallback for cloud accounts if fetch failed / not yet loaded
      new_options = {
        memo_key: derivedKeys.memo,
        voting_account: "1.2.5",
        num_witness: 0,
        num_committee: 0,
        votes: [],
        extensions: [],
      };
    }
    return {
      fee: { amount: 0, asset_id: "1.3.0" },
      account: usr.id,
      owner: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[derivedKeys.owner, 1]],
        address_auths: [],
      },
      active: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[derivedKeys.active, 1]],
        address_auths: [],
      },
      new_options,
      extensions: {},
    };
  }, [usr, derivedKeys, currentOptions, optionsLoading]);

  const hasUser = usr && usr.username && usr.id && usr.chain;

  const passwordsMatch = confirmValue && confirmValue === effectivePassword;
  const customTooShort = passwordMode === "custom" && effectivePassword && effectivePassword.length > 0 && effectivePassword.length < 12;

  const isProceedEnabled = cloudChecked && beetChecked && memoChecked;

  const isFormValid =
    hasUser &&
    cloudChecked &&
    beetChecked &&
    memoChecked &&
    loseAccessChecked &&
    noRecoveryChecked &&
    writtenDownChecked &&
    effectivePassword &&
    passwordsMatch &&
    derivedKeys &&
    trxJSON;

  return (
    <div className="container mx-auto mt-5 mb-5 w-full lg:w-3/4 text-foreground">
      <div className="grid grid-cols-1 gap-3">
        <Card className="relative overflow-hidden bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm gap-0">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[hsl(var(--accent-1)/0.08)] via-[hsl(var(--accent-1)/0.02)] to-transparent"
          />
          <div className="relative border-b border-border p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-3)/0.3)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <KeyRound className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("ChangePassword:title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("ChangePassword:description")}
                </p>
              </div>
              <span className="ml-auto inline-flex shrink-0 items-center rounded-full border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-2 py-0.5 font-mono tabular-nums text-[11px] text-[hsl(var(--accent-1-fg))]">
                {t("ChangePassword:passwordMode")}: {step}/2
              </span>
            </div>
          </div>
          <CardContent className="pt-5">
            {step === 1 ? (
              <div className="grid grid-cols-1 gap-4">
                {/* Warnings / Notices - step 1 only */}
                <Alert className="border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.08)]">
                  <ShieldAlert className="h-4 w-4 text-[hsl(var(--accent-danger-fg))]" />
                  <AlertTitle className="text-[hsl(var(--accent-danger-fg))]">{t("ChangePassword:cloudWalletOnlyTitle")}</AlertTitle>
                  <AlertDescription className="text-foreground/70 text-sm mt-1">
                    {t("ChangePassword:cloudWalletOnlyDesc")}
                  </AlertDescription>
                </Alert>

                <Alert className="border-[hsl(var(--accent-warning)/0.3)] bg-[hsl(var(--accent-warning)/0.1)]">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--accent-warning-fg))]" />
                  <AlertTitle className="text-[hsl(var(--accent-warning-fg))]">{t("ChangePassword:beetWarningTitle")}</AlertTitle>
                  <AlertDescription className="text-foreground/70 text-sm mt-1">
                    {t("ChangePassword:beetWarningDesc")}
                  </AlertDescription>
                </Alert>

                <Alert className="border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.06)]">
                  <Info className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                  <AlertTitle className="text-foreground">{t("ChangePassword:memoWarningTitle")}</AlertTitle>
                  <AlertDescription className="text-foreground/70 text-sm mt-1">
                    {t("ChangePassword:memoWarningDesc")}
                  </AlertDescription>
                </Alert>

                <Alert className="border-border bg-accent/20">
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t("ChangePassword:howItWorks")}</AlertTitle>
                  <AlertDescription className="text-foreground/70 text-sm mt-1">
                    {t("ChangePassword:howItWorksBody")}
                  </AlertDescription>
                </Alert>

                {/* Checkboxes gating - step 1 */}
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card/40 p-3">
                  {[
                    { id: "cloudCheck", checked: cloudChecked, set: setCloudChecked, label: t("ChangePassword:cloudWalletCheckbox") },
                    { id: "beetCheck", checked: beetChecked, set: setBeetChecked, label: t("ChangePassword:beetCheckbox") },
                    { id: "memoCheck", checked: memoChecked, set: setMemoChecked, label: t("ChangePassword:memoCheckbox") },
                  ].map(({ id, checked, set, label }) => (
                    <div key={id} className="flex items-start gap-2">
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(v) => set(Boolean(v))}
                        className="mt-0.5 border-foreground/30 data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=checked]:border-[hsl(var(--accent-1))]"
                      />
                      <label htmlFor={id} className="text-sm text-foreground/80 leading-snug cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>

                {/* Proceed to next step */}
                <div className="flex gap-2">
                  {isProceedEnabled ? (
                    <Button
                      onClick={() => setStep(2)}
                      className="bg-[hsl(var(--accent-1))] hover:bg-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))]"
                    >
                      {t("ChangePassword:proceed", "Proceed to next step")}
                    </Button>
                  ) : (
                    <Button className="bg-accent/40 text-muted-foreground" disabled>
                      {t("ChangePassword:proceed", "Proceed to next step")}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {/* Target account - now in step 2 */}
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                    {t("ChangePassword:targetAccount")}
                  </label>
                  {hasUser ? (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-accent/20 dark:bg-white/[0.04] p-3">
                      <Avatar
                        size={44}
                        name={usr.username}
                        extra="CP"
                        expression={{ eye: "normal", mouth: "open" }}
                        colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground font-medium text-sm truncate">{usr.username}</div>
                        <div className="text-muted-foreground text-xs font-mono truncate">{usr.id} • {usr.chain}</div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))] border border-[hsl(var(--accent-1)/0.25)]">
                        {t("ChangePassword:targetAccountHint")}
                      </span>
                    </div>
                  ) : (
                    <Alert variant="destructive" className="border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.08)]">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{t("ChangePassword:noUser")}</AlertTitle>
                    </Alert>
                  )}
                </div>

                {/* Password mode */}
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                    {t("ChangePassword:passwordMode")}
                  </label>
                  <Tabs value={passwordMode} onValueChange={(v) => setPasswordMode(v)}>
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="generated">{t("ChangePassword:generatedMode")}</TabsTrigger>
                      <TabsTrigger value="custom">{t("ChangePassword:customMode")}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="generated" className="mt-3 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-foreground/70 flex items-center mb-1.5">
                          {t("ChangePassword:generatedPassword")}
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <QuestionMarkCircledIcon className="ml-2 h-4 w-4 text-muted-foreground cursor-help" />
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80 bg-card border-border text-foreground text-sm">
                              <p className="text-foreground/70">{t("ChangePassword:genPassAbout")}</p>
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
                              onClick={() => setPassMode(passMode === "show" ? "hide" : "show")}
                            >
                              {passMode === "hide" ? <EyeClosedIcon className="h-4 w-4" /> : <EyeOpenIcon className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="border-border text-muted-foreground hover:bg-accent/60"
                              onClick={() => copyToClipboard(generatedPassword)}
                            >
                              <CopyIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="border-border text-muted-foreground hover:bg-accent/60"
                              onClick={() => setItr(itr + 1)}
                            >
                              <ReloadIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                          {t("ChangePassword:confirmGeneratedTitle")}
                        </label>
                        <div className="relative">
                          <Input
                            type="password"
                            value={confirmGenerated}
                            onChange={(e) => setConfirmGenerated(e.target.value)}
                            placeholder={t("ChangePassword:confirmGeneratedPlaceholder")}
                            className={cn(
                              "bg-accent/30 dark:bg-white/[0.05] border-border text-foreground placeholder:text-muted-foreground/60 pr-9",
                              validationBorder(confirmGenerated, generatedPassword)
                            )}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <MatchIcon value={confirmGenerated} expected={generatedPassword} />
                          </span>
                        </div>
                        {confirmGenerated && confirmGenerated !== generatedPassword ? (
                          <p className="mt-1 text-sm text-[hsl(var(--accent-danger-fg))] flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            {t("ChangePassword:passwordMismatch")}
                          </p>
                        ) : null}
                      </div>
                    </TabsContent>

                    <TabsContent value="custom" className="mt-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                          {t("ChangePassword:customPassword")}
                        </label>
                        <div className="relative">
                          <Input
                            type="password"
                            value={customPassword}
                            onChange={(e) => setCustomPassword(e.target.value)}
                            placeholder={t("ChangePassword:customPasswordPlaceholder")}
                            className={cn(
                              "bg-accent/30 dark:bg-white/[0.05] border-border text-foreground placeholder:text-muted-foreground/60",
                              customTooShort
                                ? "border-[hsl(var(--accent-warning)/0.6)] focus-visible:ring-[hsl(var(--accent-warning)/0.3)]"
                                : customPassword && customPassword.length >= 12
                                ? "border-[hsl(var(--accent-success)/0.6)] focus-visible:ring-[hsl(var(--accent-success)/0.3)]"
                                : null
                            )}
                          />
                        </div>
                        {customTooShort ? (
                          <p className="mt-1 text-sm text-[hsl(var(--accent-warning-fg))] flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {t("ChangePassword:passwordTooShort")}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                          {t("ChangePassword:confirmCustomPassword")}
                        </label>
                        <div className="relative">
                          <Input
                            type="password"
                            value={confirmCustom}
                            onChange={(e) => setConfirmCustom(e.target.value)}
                            placeholder={t("ChangePassword:confirmCustomPasswordPlaceholder")}
                            className={cn(
                              "bg-accent/30 dark:bg-white/[0.05] border-border text-foreground placeholder:text-muted-foreground/60 pr-9",
                              validationBorder(confirmCustom, customPassword)
                            )}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <MatchIcon value={confirmCustom} expected={customPassword} />
                          </span>
                        </div>
                        {confirmCustom && confirmCustom !== customPassword ? (
                          <p className="mt-1 text-sm text-[hsl(var(--accent-danger-fg))] flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            {t("ChangePassword:passwordMismatch")}
                          </p>
                        ) : null}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Derived keys preview */}
                <div className={cn(
                  "rounded-xl border p-3",
                  derivedKeys
                    ? "border-[hsl(var(--accent-success)/0.35)] bg-[hsl(var(--accent-success)/0.05)]"
                    : "border-border bg-accent/10 dark:bg-white/[0.03]"
                )}>
                  <div className="text-sm font-medium text-foreground/80 mb-1 flex items-center gap-1.5">
                    {derivedKeys ? (
                      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--accent-success-fg))]" />
                    ) : null}
                    {t("ChangePassword:derivedKeysTitle")}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{t("ChangePassword:derivedKeysDesc")}</p>
                  {derivedKeys ? (
                    <div className="grid grid-cols-1 gap-2 text-xs font-mono break-all">
                      <div>
                        <span className="font-sans font-medium text-foreground/70">{t("ChangePassword:ownerKey")}: </span>
                        <span className="text-foreground">{derivedKeys.owner}</span>
                      </div>
                      <div>
                        <span className="font-sans font-medium text-foreground/70">{t("ChangePassword:activeKey")}: </span>
                        <span className="text-foreground">{derivedKeys.active}</span>
                      </div>
                      <div>
                        <span className="font-sans font-medium text-foreground/70">{t("ChangePassword:memoKey")}: </span>
                        <span className="text-foreground">{derivedKeys.memo}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("ChangePassword:noKeys")}</p>
                  )}
                </div>

                {/* Backup confirmations */}
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-[hsl(var(--accent-2)/0.25)] bg-[hsl(var(--accent-2)/0.04)] p-3">
                  <Label className="text-sm font-medium text-[hsl(var(--accent-2-fg))]">{t("ChangePassword:backupCheckTitle")}</Label>
                  {[
                    { id: "loseAccess", checked: loseAccessChecked, set: setLoseAccessChecked, label: t("ChangePassword:loseAccess") },
                    { id: "noRecovery", checked: noRecoveryChecked, set: setNoRecoveryChecked, label: t("ChangePassword:noRecovery") },
                    { id: "writtenDown", checked: writtenDownChecked, set: setWrittenDownChecked, label: t("ChangePassword:writtenDown") },
                  ].map(({ id, checked, set, label }) => (
                    <div key={id} className="flex items-center">
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(v) => set(Boolean(v))}
                        className="border-foreground/30 data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=checked]:border-[hsl(var(--accent-1))]"
                      />
                      <label htmlFor={id} className="ml-2 mb-0 text-sm text-foreground/70 cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>

                {/* Submit via deeplink */}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setStep(1)} className="border-border">
                    {t("ChangePassword:back", "Back")}
                  </Button>
                  {isFormValid && !deeplinkDialog ? (
                    <Button
                      onClick={() => setDeeplinkDialog(true)}
                      className="bg-[hsl(var(--accent-1))] hover:bg-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))]"
                    >
                      {t("ChangePassword:submit")}
                    </Button>
                  ) : (
                    <Button className="bg-accent/40 text-muted-foreground" disabled>
                      {t("ChangePassword:submit")}
                    </Button>
                  )}
                  {!isFormValid ? (
                    <span className="text-xs text-muted-foreground self-center ml-2">{t("ChangePassword:submitDisabled")}</span>
                  ) : null}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {deeplinkDialog && trxJSON ? (
          <DeepLinkDialog
            operationNames={["account_update"]}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setDeeplinkDialog}
            key={`changePassword-${usr.username}-${passwordMode}`}
            headerText={t("ChangePassword:deeplinkHeader")}
            trxJSON={[trxJSON]}
          />
        ) : null}
      </div>
    </div>
  );
};

export default ChangePassword;
