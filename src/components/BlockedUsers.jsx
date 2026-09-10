import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { List } from "react-window";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
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

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";

import { Ban, EyeOff, ShieldOff, Trash2, UserX, Plus } from "lucide-react";

import {
  $blockList,
  $userBlockList,
  addBlockedUser,
  removeBlockedUser,
} from "@/stores/blocklist.ts";

import {
  $hiddenForumTopics,
  unhideAllForumTopics,
  unhideForumTopic,
} from "@/stores/forum.ts";

import { $currentUser } from "@/stores/users.ts";

import AccountSearch from "@/components/AccountSearch.jsx";

function RemoveButton({ onClick, label }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={onClick}
            className="h-8 w-8 rounded-full text-muted-foreground/60 hover:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const BlockedUserRow = React.memo(function BlockedUserRow({
  index,
  style,
  chainUserBlockList,
  _chain,
  t,
}) {
  const item = chainUserBlockList[index];
  if (!item) return null;
  return (
    <div style={{ ...style, paddingRight: "10px" }}>
      <Card className="mb-2 bg-card/60 border-border hover:bg-accent/30 hover:border-border transition-all rounded-xl">
        <CardHeader className="px-4 py-3 flex flex-row items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-sm text-foreground truncate">
              <span className="font-semibold">{item.name}</span>
              <span className="ml-2 text-xs font-mono font-normal text-muted-foreground/60">
                {item.id}
              </span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <RemoveButton
              onClick={() => removeBlockedUser(_chain, item)}
              label={t("Blocklist:remove")}
            />
          </div>
        </CardHeader>
      </Card>
    </div>
  );
});

const HiddenTopicRow = React.memo(function HiddenTopicRow({
  index,
  style,
  chainHiddenTopics,
  _chain,
  t,
}) {
  const item = chainHiddenTopics[index];
  if (!item) return null;
  return (
    <div style={{ ...style, paddingRight: "10px" }}>
      <Card className="mb-2 bg-card/60 border-border hover:bg-accent/30 hover:border-border transition-all rounded-xl">
        <CardHeader className="px-4 py-3 flex flex-row items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-sm text-foreground truncate">
              <span className="font-semibold">{item.title}</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground/60">
                #{item.channel}
              </span>
              <span className="ml-2 text-xs font-mono font-normal text-muted-foreground/60">
                {item.account}
              </span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <RemoveButton
              onClick={() => unhideForumTopic(_chain, item.channel, item.key)}
              label={t("Forum:unhideTopic", "Unhide topic")}
            />
          </div>
        </CardHeader>
      </Card>
    </div>
  );
});

export default function BlockedUsers() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const userBlockList = useSyncExternalStore(
    $userBlockList.subscribe,
    $userBlockList.get,
    () => true
  );

  const currentUser = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (currentUser && currentUser.chain) return currentUser.chain;
    return "bitshares";
  }, [currentUser]);

  const committeeCount = useMemo(() => {
    if (!blocklist || !blocklist.users) return 0;
    return blocklist.users.length;
  }, [blocklist]);

  const chainUserBlockList = useMemo(() => {
    if (!userBlockList) return [];
    return userBlockList[_chain] ?? [];
  }, [userBlockList, _chain]);

  const hiddenForumTopics = useSyncExternalStore(
    $hiddenForumTopics.subscribe,
    $hiddenForumTopics.get,
    () => true
  );

  const chainHiddenTopics = useMemo(() => {
    if (!hiddenForumTopics) return [];
    return hiddenForumTopics[_chain] ?? [];
  }, [hiddenForumTopics, _chain]);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState();

  useEffect(() => {
    if (!selectedUser) return;
    addBlockedUser(_chain, { name: selectedUser.name, id: selectedUser.id });
    setSelectedUser(undefined);
    setAddDialogOpen(false);
  }, [selectedUser, _chain]);

  const blockedRowProps = useMemo(
    () => ({ chainUserBlockList, _chain, t }),
    [chainUserBlockList, _chain, t]
  );

  const hiddenRowProps = useMemo(
    () => ({ chainHiddenTopics, _chain, t }),
    [chainHiddenTopics, _chain, t]
  );

  return (
    <div className="container mx-auto mt-5 mb-10 max-w-4xl text-foreground">
      <div className="grid grid-cols-1 gap-3">
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
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <UserX className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("Blocklist:pageTitle")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("Blocklist:pageDescription")}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-danger))]" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                <ShieldOff className="h-5 w-5 text-[hsl(var(--accent-1-fg))]" />
              </span>
              {t("Blocklist:committeeHeader")}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 ml-11">
              {t("Blocklist:committeeCount", { count: committeeCount })}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("Blocklist:committeeDescription")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-danger))]" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                    <Ban className="h-5 w-5 text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  {t("Blocklist:usersHeader")}
                </CardTitle>
                {chainUserBlockList && chainUserBlockList.length ? (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-11">
                    {chainUserBlockList.length}
                  </p>
                ) : null}
              </div>
              <Dialog
                open={addDialogOpen}
                onOpenChange={(open) => setAddDialogOpen(open)}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    {t("Blocklist:addUser")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.15)]">
                        <UserX className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                      </div>
                      <div>
                        <DialogTitle>{t("Blocklist:addUserDialogTitle")}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          {t("Blocklist:addUserDialogDescription")}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <AccountSearch
                    chain={_chain}
                    excludedUsers={[]}
                    setChosenAccount={setSelectedUser}
                    skipCheck={true}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {chainUserBlockList && chainUserBlockList.length ? (
              <>
                <div className="w-full h-[420px] block md:hidden">
                  <List
                    rowComponent={BlockedUserRow}
                    rowCount={chainUserBlockList.length}
                    rowHeight={88}
                    height={420}
                    width="100%"
                    rowProps={blockedRowProps}
                  />
                </div>
                <div className="w-full h-[420px] hidden md:block">
                  <List
                    rowComponent={BlockedUserRow}
                    rowCount={chainUserBlockList.length}
                    rowHeight={72}
                    height={420}
                    width="100%"
                    rowProps={blockedRowProps}
                  />
                </div>
              </>
            ) : (
              <Empty className="mt-2 border border-border/60 rounded-xl bg-accent/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
                    <Ban className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground/80">{t("Blocklist:usersEmptyTitle")}</EmptyTitle>
                  <EmptyDescription className="text-muted-foreground">
                    {t("Blocklist:usersEmptyDescription")}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-danger))]" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                    <EyeOff className="h-5 w-5 text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  {t("Forum:hiddenTopicsTitle", "Hidden forum topics")}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5 ml-11">
                  {t(
                    "Forum:hiddenTopicsDesc",
                    "Topics you hid in the forum. Hidden entries for topics that disappear from the channel results are cleared automatically."
                  )}
                </p>
              </div>
              {chainHiddenTopics && chainHiddenTopics.length ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unhideAllForumTopics(_chain)}
                >
                  {t("Forum:unhideAll", "Unhide all")}
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {chainHiddenTopics && chainHiddenTopics.length ? (
              <div className="w-full h-[320px]">
                <List
                  rowComponent={HiddenTopicRow}
                  rowCount={chainHiddenTopics.length}
                  rowHeight={72}
                  height={320}
                  width="100%"
                  rowProps={hiddenRowProps}
                />
              </div>
            ) : (
              <Empty className="mt-2 border border-border/60 rounded-xl bg-accent/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
                    <EyeOff className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground/80">{t("Forum:hiddenTopicsEmpty", "No hidden topics")}</EmptyTitle>
                  <EmptyDescription className="text-muted-foreground">
                    {t(
                      "Forum:hiddenTopicsEmptyDesc",
                      "Hide a forum topic to remove it from your topic lists."
                    )}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
