import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import {
  ArrowLeft,
  Search,
  User,
  AlertCircle,
  Inbox,
  ChevronRight,
  Star,
  Clock,
  Trash2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar.tsx";
import { cn } from "@/lib/utils";

import { accountSearch } from "@/nanoeffects/UserSearch.ts";
import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import { $favouriteUsers } from "@/stores/favourites.ts";
import { $searchHistory, addSearchHistory, clearSearchHistory } from "@/stores/searchHistory.ts";
import { readableForeground } from "@/lib/tailwindPalette.js";
import {
  $customTheme,
  $currentPage,
  getThemeForPage,
  resolvePageAccent,
} from "@/stores/customTheme.ts";

function StepIndicator({ currentStep, accentColor, step1Label, step2Label }) {
  const steps = [
    { key: 1, label: step1Label },
    { key: 2, label: step2Label },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                currentStep === step.key
                  ? "shadow-lg"
                  : currentStep > step.key
                  ? "text-foreground"
                  : "bg-accent/60 text-muted-foreground border border-border/80"
              )}
              style={
                currentStep === step.key
                  ? {
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                      boxShadow: `0 4px 14px -3px ${accentColor}66`,
                      // Max-contrast text on the saturated step fill (same
                      // role as -gradFg; computed from the live accent hex).
                      color: readableForeground(accentColor),
                    }
                  : currentStep > step.key
                  ? { background: `${accentColor}33`, borderColor: `${accentColor}44` }
                  : {}
              }
            >
              {currentStep > step.key ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.key
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium tracking-wide uppercase transition-colors duration-300",
                currentStep === step.key ? "text-foreground/80 font-semibold" : "text-muted-foreground/60"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 h-px mx-1 mb-5">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  currentStep > step.key ? "opacity-100" : "opacity-30"
                )}
                style={{
                  background:
                    currentStep > step.key
                      ? `linear-gradient(90deg, ${accentColor}88, ${accentColor}44)`
                      : "rgba(0,0,0,0.15)",
                }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function BlockchainButton({ name, subtitle, onClick, icon, accentColor }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left px-5 py-4 h-auto rounded-xl",
        "bg-accent/40 dark:bg-white/[0.05] border-border/80",
        "hover:bg-accent/60 hover:border-border",
        "transition-all duration-200 ease-out",
        "focus:ring-2 focus:ring-[hsl(var(--accent-3)/0.4)] focus:ring-offset-0"
      )}
    >
      <div className="flex items-center gap-4 w-full">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`,
            border: `1px solid ${accentColor}33`,
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-foreground font-medium text-sm">{name}</div>
          <div className="text-muted-foreground text-xs mt-0.5">{subtitle}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Button>
  );
}

function AccountCard({ user, onClick, accentColor }) {
  const userAccent = user.accentColor || accentColor;

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left px-4 py-3.5 h-auto rounded-xl",
        "bg-accent/40 dark:bg-white/[0.05] border-border/80",
        "hover:bg-accent/60 hover:border-border",
        "transition-all duration-200 ease-out",
        "focus:ring-2 focus:ring-[hsl(var(--accent-3)/0.4)]"
      )}
    >
      <div className="flex items-center gap-3.5 w-full">
        <div className="flex-shrink-0 rounded-full ring-2" style={{ boxShadow: `0 0 12px -2px ${userAccent}40` }}>
          <Avatar
            size={44}
            name={user.username}
            extra="AS"
            expression={{ eye: "normal", mouth: "open" }}
            colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-foreground font-medium text-sm truncate"
            style={{ textShadow: "0 0 20px rgba(0,0,0,0.03)" }}
          >
            {user.username}
          </div>
          <div className="text-muted-foreground text-xs font-mono mt-0.5">{user.id}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-foreground/20 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
      </div>
    </Button>
  );
}

const AccountSearchFavouriteRow = React.memo(function AccountSearchFavouriteRow({
  index,
  style,
  filteredFavourites,
  accentColor,
  setChosenAccount,
}) {
  const favUser = filteredFavourites[index];
  if (!favUser) return null;
  const user = { username: favUser.name, id: favUser.id };
  return (
    <div style={{ ...style, paddingBottom: 6, overflow: "hidden" }} className="pr-1">
      <AccountCard
        user={user}
        onClick={() =>
          setChosenAccount({
            name: favUser.name,
            id: favUser.id,
          })
        }
        accentColor={accentColor}
      />
    </div>
  );
});

const AccountSearchHistoryRow = React.memo(function AccountSearchHistoryRow({
  index,
  style,
  filteredHistory,
  accentColor,
  setChosenAccount,
}) {
  const historyEntry = filteredHistory[index];
  if (!historyEntry) return null;
  const user = { username: historyEntry.name, id: historyEntry.id };
  return (
    <div style={{ ...style, paddingBottom: 6, overflow: "hidden" }} className="pr-1">
      <AccountCard
        user={user}
        onClick={() =>
          setChosenAccount({
            name: historyEntry.name,
            id: historyEntry.id,
          })
        }
        accentColor={accentColor}
      />
    </div>
  );
});

export default function AccountSearch(properties) {
  const { chain, excludedUsers, setChosenAccount, skipCheck, accentColor: propsAccentColor } = properties;
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
  const currentNodeUrl = useStore($currentNodeUrl);

  // Re-render on theme/page switches so the fallback below stays current.
  useStore($customTheme);
  const currentPage = useStore($currentPage);
  // Explicit prop wins; otherwise follow the hosting page's accent triple
  // (theme-aware) instead of a fixed violet.
  const pageTheme = getThemeForPage(currentPage || "index");
  const accentColor =
    propsAccentColor || resolvePageAccent(pageTheme, currentPage || "index").primary;

  const [mode, setMode] = useState(null);
  const [accountInput, setAccountInput] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

  const [inProgress, setInProgress] = useState(false);
  const [searchResponse, setSearchResponse] = useState(null);

  const handleChosenAccount = useCallback(
    (account) => {
      if (account && account.name && account.id) {
        addSearchHistory(chain, {
          name: account.name,
          id: account.id,
          lastUsed: Date.now(),
        });
      }
      setChosenAccount(account);
    },
    [chain, setChosenAccount]
  );

  const favouriteUsersStore = useStore($favouriteUsers);
  const favouriteUsers = useMemo(() => {
    if (!favouriteUsersStore) return [];
    const raw = favouriteUsersStore[chain] ?? [];
    return raw;
  }, [favouriteUsersStore, chain]);

  const searchHistoryStore = useStore($searchHistory);
  const searchHistory = useMemo(() => {
    if (!searchHistoryStore) return [];
    const raw = searchHistoryStore[chain] ?? [];
    return [...raw].sort((a, b) => b.lastUsed - a.lastUsed);
  }, [searchHistoryStore, chain]);

  const filteredFavourites = useMemo(() => {
    if (!favouriteUsers || !favouriteUsers.length) return [];
    if (!excludedUsers || !excludedUsers.length) return favouriteUsers;
    const excludedUsernames = excludedUsers.map((u) => u.username);
    const excludedIds = excludedUsers.map((u) => u.id);
    return favouriteUsers.filter(
      (u) => !excludedUsernames.includes(u.name) && !excludedIds.includes(u.id)
    );
  }, [favouriteUsers, excludedUsers]);

  const filteredHistory = useMemo(() => {
    if (!searchHistory || !searchHistory.length) return [];
    if (!excludedUsers || !excludedUsers.length) return searchHistory;
    const excludedUsernames = excludedUsers.map((u) => u.username);
    const excludedIds = excludedUsers.map((u) => u.id);
    return searchHistory.filter(
      (u) => !excludedUsernames.includes(u.name) && !excludedIds.includes(u.id)
    );
  }, [searchHistory, excludedUsers]);

  // 1 = choose method, 2 = search/favourites (or confirm when result shown)
  const currentStep = searchResponse ? 2 : !mode ? 1 : 2;

  async function lookupAccount() {
    const safeExcluded = excludedUsers || [];
    const excludedUsernames = safeExcluded.map((user) => user.username);
    const excludedIds = safeExcluded.map((user) => user.id);

    if (
      excludedUsernames.includes(accountInput) ||
      excludedIds.includes(accountInput)
    ) {
      setInProgress(false);
      setErrorMessage(t("AccountSearch:noSearch.selfError"));
      return;
    }

    let response;
    try {
      response = await accountSearch(
        chain,
        accountInput,
        currentNodeUrl || null
      );
    } catch (error) {
      console.log({ error, msg: t("AccountSearch:noSearch.error") });
      setErrorMessage(t("AccountSearch:noSearch.error"));
      setInProgress(false);
      return;
    }

    setInProgress(false);

    if (response && response.id) {
      if (usr && usr.chain === "bitshares" && !skipCheck) {
        let hashedID;
        try {
          hashedID = toHex(sha256(utf8ToBytes(response.id)));
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

  const favouriteRowProps = useMemo(
    () => ({ filteredFavourites, accentColor, setChosenAccount: handleChosenAccount }),
    [filteredFavourites, accentColor, handleChosenAccount]
  );

  const historyRowProps = useMemo(
    () => ({ filteredHistory, accentColor, setChosenAccount: handleChosenAccount }),
    [filteredHistory, accentColor, handleChosenAccount]
  );

  return (
    <div className="min-h-[320px]">
      <StepIndicator
        currentStep={currentStep}
        accentColor={accentColor}
        step1Label={t("AccountSearch:step1")}
        step2Label={t("AccountSearch:step2")}
      />

      {/* MODE SELECTION — mirrors AccountSelect step 2 but without chain & existing */}
      {!mode && !searchResponse ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-muted-foreground text-sm mb-4">
            {chain === "bitshares"
              ? t("AccountSearch:mode.titleBTS")
              : chain === "bitshares_testnet"
              ? t("AccountSearch:mode.titleTEST")
              : t("AccountSearch:mode.titleBTS")}
          </div>
          <BlockchainButton
            name={t("AccountSearch:mode.search")}
            subtitle={t("AccountSearch:mode.searchSubtitle")}
            icon={<Search className="w-5 h-5" style={{ color: accentColor }} />}
            onClick={() => setMode("search")}
            accentColor={accentColor}
          />
          <BlockchainButton
            name={t("AccountSearch:mode.favourites")}
            subtitle={t("AccountSearch:mode.favouritesSubtitle", { count: filteredFavourites.length })}
            icon={<Star className="w-5 h-5" style={{ color: accentColor }} />}
            onClick={() => setMode("favourites")}
            accentColor={accentColor}
          />
          <BlockchainButton
            name={t("AccountSearch:mode.recent")}
            subtitle={t("AccountSearch:mode.recentSubtitle", { count: filteredHistory.length })}
            icon={<Clock className="w-5 h-5" style={{ color: accentColor }} />}
            onClick={() => setMode("recent")}
            accentColor={accentColor}
          />
        </div>
      ) : null}

      {/* SEARCH INPUT — mirrors AccountSelect mode=new */}
      {mode === "search" && !searchResponse ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-muted-foreground text-sm">
            {t("AccountSearch:search.initDesc")}
          </div>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <User className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <Input
              value={accountInput}
              placeholder={t("AccountSearch:noSearch.placeholder")}
              className={cn(
                "pl-10 pr-4 py-6 text-foreground placeholder:text-muted-foreground/50",
                "bg-accent/40 dark:bg-white/[0.05] border-border/80",
                "focus-visible:ring-2 focus-visible:ring-offset-0",
                "transition-all duration-200"
              )}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !inProgress && accountInput) {
                  setInProgress(true);
                  lookupAccount();
                }
              }}
              onChange={(event) => {
                const regex = /^[a-zA-Z0-9.-]*$/;
                if (regex.test(event.target.value)) {
                  setAccountInput(event.target.value);
                  setErrorMessage(null);
                  setSearchResponse(null);
                }
              }}
              autoFocus
            />
          </div>

          {errorMessage ? (
            <div className="flex items-center gap-2 text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setMode(null);
                setAccountInput("");
                setErrorMessage(null);
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("AccountSearch:mode.back")}
            </Button>
            <div className="flex-1" />
            {accountInput && !inProgress ? (
              <Button
                onClick={() => {
                  setInProgress(true);
                  lookupAccount();
                }}
                className={cn(
                  "px-6 py-2 font-medium",
                  "shadow-lg transition-all duration-200"
                )}
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                  boxShadow: `0 4px 14px -3px ${accentColor}55`,
                  color: readableForeground(accentColor),
                }}
              >
                {t("AccountSearch:search.continue")}
              </Button>
            ) : (
              <Button
                disabled
                className="px-6 py-2 bg-accent/50 text-muted-foreground/60 border-border/80"
              >
                {t("AccountSearch:search.continue")}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {/* SEARCH RESULT — colourful AccountCard */}
      {searchResponse ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-muted-foreground text-sm">
            {t("AccountSearch:search.description")}
          </div>

          <AccountCard
            user={{ username: searchResponse.name, id: searchResponse.id }}
            onClick={() =>
              handleChosenAccount({
                name: searchResponse.name,
                id: searchResponse.id,
              })
            }
            accentColor={accentColor}
          />

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setErrorMessage(null);
                setSearchResponse(null);
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("AccountSearch:search.back")}
            </Button>
            <div className="flex-1" />
            <Button
              onClick={() =>
                handleChosenAccount({
                  name: searchResponse.name,
                  id: searchResponse.id,
                })
              }
              className={cn(
                "px-6 py-2 font-medium shadow-lg transition-all duration-200"
              )}
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                boxShadow: `0 4px 14px -3px ${accentColor}55`,
                color: readableForeground(accentColor),
              }}
            >
              {t("AccountSearch:searchResponse.proceed")}
            </Button>
          </div>
        </div>
      ) : null}

      {/* FAVOURITES LIST — mirrors AccountSelect favourites */}
      {mode === "favourites" && !searchResponse ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-muted-foreground text-sm">
            {t("AccountSearch:favourites.description")}
          </div>

          <div className="w-full h-[340px] rounded-xl">
            {filteredFavourites.length > 0 ? (
              <List
                rowComponent={AccountSearchFavouriteRow}
                rowCount={filteredFavourites.length}
                rowHeight={80}
                height={340}
                width="100%"
                rowProps={favouriteRowProps}
                key={`list-favourites-${chain}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                    border: `1px solid ${accentColor}20`,
                  }}
                >
                  <Inbox className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div className="text-muted-foreground text-sm font-medium mb-1">
                  {t("AccountSearch:favourites.none")}
                </div>
                <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                  {t("AccountSearch:favourites.noneHint")}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={() => setMode(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("AccountSearch:mode.back")}
          </Button>
        </div>
      ) : null}

      {/* RECENT SEARCHES LIST */}
      {mode === "recent" && !searchResponse ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="flex-1">{t("AccountSearch:recent.description")}</span>
            {filteredHistory.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => clearSearchHistory(chain)}
                className={cn(
                  "h-7 w-7 rounded-lg flex-shrink-0",
                  "hover:bg-[hsl(var(--accent-1)/0.1)] hover:border-[hsl(var(--accent-1)/0.3)]",
                  "transition-all duration-200 group/erase"
                )}
                title={t("AccountSearch:recent.eraseHistory")}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground/50 group-hover/erase:text-[hsl(var(--accent-1-fg))] transition-colors" />
              </Button>
            )}
          </div>

          <div className="w-full h-[340px] rounded-xl">
            {filteredHistory.length > 0 ? (
              <List
                rowComponent={AccountSearchHistoryRow}
                rowCount={filteredHistory.length}
                rowHeight={80}
                height={340}
                width="100%"
                rowProps={historyRowProps}
                key={`list-history-${chain}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                    border: `1px solid ${accentColor}20`,
                  }}
                >
                  <Inbox className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div className="text-muted-foreground text-sm font-medium mb-1">
                  {t("AccountSearch:recent.none")}
                </div>
                <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                  {t("AccountSearch:recent.noneHint")}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={() => setMode(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("AccountSearch:mode.back")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
