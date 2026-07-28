import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import {
  ShieldCheck,
  ShieldOff,
  UserPlus,
  UserMinus,
  Search,
  ClipboardList,
  Users,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { cn } from "@/lib/utils";

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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { humanReadableFloat } from "@/lib/common";

import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { Avatar } from "./Avatar.tsx";
import AccountSearch from "./AccountSearch.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

export default function AccountLists(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);

  const { _globalParamsBTS, _globalParamsTEST } = properties;

  const [showDialog, setShowDialog] = useState(false);
  const [targetUser, setTargetUser] = useState();

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 7); // operation: account_whitelist
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
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
      setTargetUserDialogOpen(false);
    }
  }, [targetUser]);

  const [mode, setMode] = useState("whitelist");

  const accountRow = ({ index, style }) => {
    const account =
      mode === "whitelist"
        ? whitelistedAccounts[index]
        : blacklistedAccounts[index];

    const [showRowDialog, setShowRowDialog] = useState(false);

    return (
      <div style={style} className="px-2 py-1">
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2.5 hover:border-[hsl(var(--accent-1)/0.2)] hover:bg-[hsl(var(--accent-1)/0.03)] transition-all group">
          <div className="flex-shrink-0">
            {account ? (
              <div className="relative">
                <Avatar
                  size={36}
                  name={toHex(sha256(utf8ToBytes(account)))}
                  extra=""
                  expression={{
                    eye: "normal",
                    mouth: mode === "whitelist" ? "open" : "unhappy",
                  }}
                  colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                />
                <span
                  className={cn(
                    "absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-[1.5px] border-card flex-shrink-0",
                    mode === "whitelist"
                      ? "bg-[hsl(var(--accent-1))]"
                      : "bg-[hsl(var(--accent-danger))]"
                  )}
                />
              </div>
            ) : (
              <Av>
                <AvatarFallback>?</AvatarFallback>
              </Av>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {account}
            </div>
            <div className="text-[10px] text-muted-foreground/60">
              #{index + 1}
            </div>
          </div>

          <div className="flex-shrink-0">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowRowDialog(true)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg border border-border/60 text-muted-foreground hover:border-[hsl(var(--accent-danger)/0.4)] hover:bg-[hsl(var(--accent-danger)/0.1)] hover:text-[hsl(var(--accent-danger-fg))] opacity-60 group-hover:opacity-100 transition-all"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-card border-border text-foreground/85">
                  <p>{t("AccountLists:remove")} #{index + 1}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
      </div>
    );
  };

  const tabs = [
    {
      id: "whitelist",
      label: t("AccountLists:whitelist"),
      activeLabel: t("AccountLists:viewingWhitelist"),
      icon: ShieldCheck,
      count: whitelistedAccounts.length,
      countLabel: t("AccountLists:whitelistedCount", { count: whitelistedAccounts.length }),
    },
    {
      id: "blacklist",
      label: t("AccountLists:blacklist"),
      activeLabel: t("AccountLists:viewingBlacklist"),
      icon: ShieldOff,
      count: blacklistedAccounts.length,
      countLabel: t("AccountLists:blacklistedCount", { count: blacklistedAccounts.length }),
    },
  ];

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:w-1/2">
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
          />

          <div className="relative p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                <ClipboardList className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("AccountLists:cardTitle")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("AccountLists:cardDescription")}
                </p>
              </div>
            </div>

            {/* Segmented Tab Bar */}
            <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 mb-5">
              {tabs.map((tab) => {
                const active = mode === tab.id;
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode(tab.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center gap-1.5",
                      active
                        ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(16,185,129,0.6)]"
                        : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {active ? tab.activeLabel : tab.label}
                    {tab.count > 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-1 h-5 min-w-5 px-1 text-[10px] font-mono rounded-md border-0",
                          active
                            ? "bg-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {tab.count}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Account List */}
            <div className="mb-5">
              {mode === "whitelist" && whitelistedAccounts.length ? (
                <div className="w-full border border-border/60 rounded-xl overflow-hidden bg-card/30">
                  <List
                    rowComponent={accountRow}
                    rowCount={whitelistedAccounts.length}
                    rowHeight={56}
                    rowProps={{}}
                  />
                </div>
              ) : null}
              {mode === "blacklist" && blacklistedAccounts.length ? (
                <div className="w-full border border-border/60 rounded-xl overflow-hidden bg-card/30">
                  <List
                    rowComponent={accountRow}
                    rowCount={blacklistedAccounts.length}
                    rowHeight={56}
                    rowProps={{}}
                  />
                </div>
              ) : null}
              {mode === "whitelist" && !whitelistedAccounts.length ? (
                <div className="flex flex-col items-center gap-3 py-10 border border-border/60 rounded-xl bg-card/30">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {t("AccountLists:noWhitelistedAccounts")}
                  </p>
                </div>
              ) : null}
              {mode === "blacklist" && !blacklistedAccounts.length ? (
                <div className="flex flex-col items-center gap-3 py-10 border border-border/60 rounded-xl bg-card/30">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--accent-danger)/0.2)] bg-[hsl(var(--accent-danger)/0.1)] dark:text-[hsl(var(--accent-danger-fg))] text-[hsl(var(--accent-danger-fg))]">
                    <ShieldOff className="h-5 w-5" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {t("AccountLists:noBlacklistedAccounts")}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Target Account Section */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                  <UserPlus className="h-3 w-3" strokeWidth={2.25} />
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  {t("AccountLists:selectTargetHint")}
                </span>
              </div>

              <div className="grid grid-cols-8 items-center gap-3">
                <div className="hidden md:flex col-span-1 items-center justify-center">
                  {targetUser && targetUser.name ? (
                    <Avatar
                      size={36}
                      name={targetUser.name}
                      extra="Target"
                      expression={{ eye: "normal", mouth: "open" }}
                      colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                    />
                  ) : (
                    <Av>
                      <AvatarFallback className="border border-border/60 bg-card/60">?</AvatarFallback>
                    </Av>
                  )}
                </div>
                <div className="col-span-5">
                  <Input
                    disabled
                    placeholder={
                      targetUser && targetUser.name
                        ? `${targetUser.name} (${targetUser.id})`
                        : t("AccountLists:accountName")
                    }
                    className="bg-card/40 border-border/60 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)] font-mono text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Dialog
                    open={targetUserDialogOpen}
                    onOpenChange={(open) => setTargetUserDialogOpen(open)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.5)] transition-all"
                      >
                        <Search className="h-3.5 w-3.5 mr-1.5" />
                        {targetUser
                          ? t("AccountLists:changeTarget")
                          : t("AccountLists:provideTarget")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[375px] bg-card">
                      <DialogHeader>
                        <DialogTitle>
                          {!usr || !usr.chain
                            ? t("AccountLists:bitsharesAccountSearch")
                            : null}
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
            </div>

            {/* Add Button */}
            <div className="mt-5">
              <Button
                className="w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] transition-all"
                type="button"
                onClick={() => setShowDialog(true)}
              >
                {mode === "whitelist" ? (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                    {t("AccountLists:addToWhitelist")}
                  </>
                ) : (
                  <>
                    <ShieldOff className="h-4 w-4 mr-1.5" />
                    {t("AccountLists:addToBlacklist")}
                  </>
                )}
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
          </div>
        </Card>
      </div>
    </>
  );
}
