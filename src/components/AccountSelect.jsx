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
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import {
  ArrowLeft,
  Search,
  X,
  User,
  Users,
  Globe,
  AlertCircle,
  Inbox,
  ChevronRight,
  Shield,
  Star,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar.tsx";
import { cn } from "@/lib/utils";

import { useInitCache } from "@/nanoeffects/Init.ts";
import {
  $currentUser,
  setCurrentUser,
  $userStorage,
  removeUser,
} from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";
import { $favouriteUsers } from "@/stores/favourites.ts";

import { accountSearch } from "@/nanoeffects/UserSearch.ts";

function StepIndicator({ currentStep, totalSteps, accentColor, step1Label, step2Label, step3Label }) {
  const steps = [
    { key: 1, label: step1Label },
    { key: 2, label: step2Label },
    { key: 3, label: step3Label },
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
                  ? "text-white shadow-lg"
                  : currentStep > step.key
                  ? "text-foreground"
                  : "bg-accent/60 text-muted-foreground border border-border/80"
              )}
              style={
                currentStep === step.key
                  ? {
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                      boxShadow: `0 4px 14px -3px ${accentColor}66`,
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

function AccountCard({ user, onClick, onRemove, accentColor, isCurrentChain, t }) {
  const userAccent = user.accentColor || accentColor;

  const content = (
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
            extra=""
            expression={{ eye: "normal", mouth: "open" }}
            colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-foreground font-medium text-sm truncate"
            style={{
              textShadow: "0 0 20px rgba(0,0,0,0.03)",
            }}
          >
            {user.username}
          </div>
          <div className="text-muted-foreground text-xs font-mono mt-0.5">{user.id}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-foreground/20 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
      </div>
    </Button>
  );

  if (onRemove) {
    return (
      <div className="flex items-stretch gap-2">
        <div className="flex-1">{content}</div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "w-10 h-auto rounded-xl flex-shrink-0",
            "hover:bg-[hsl(var(--accent-1)/0.1)] hover:border-[hsl(var(--accent-1)/0.3)]",
            "transition-all duration-200 group/remove",
            "focus:ring-2 focus:ring-[hsl(var(--accent-1)/0.4)]"
          )}
          title={t("AccountSelect:removeAccount")}
          aria-label={t("AccountSelect:removeAccountLabel", { username: user.username })}
        >
          <X className="w-4 h-4 text-muted-foreground/50 group-hover/remove:text-[hsl(var(--accent-1-fg))] transition-colors" />
        </Button>
      </div>
    );
  }

  return content;
}

export default function AccountSelect(properties) {
  const { accentColor: propsAccentColor } = properties;
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

  const accentColor = propsAccentColor || "#8B5CF6";

  const [chain, setChain] = useState(null);
  const [mode, setMode] = useState(null);
  const [accountInput, setAccountInput] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

  const [users, setUsers] = useState([]);
  useEffect(() => {
    const unsubscribe = $userStorage.subscribe((value) => {
      setUsers(value.users);
    });
    return unsubscribe;
  }, [$userStorage]);

  const favouriteUsersStore = useStore($favouriteUsers);
  const favouriteUsers = useMemo(() => {
    if (!favouriteUsersStore) return [];
    return favouriteUsersStore[chain] ?? [];
  }, [favouriteUsersStore, chain]);

  const [inProgress, setInProgress] = useState(false);
  const [searchResponse, setSearchResponse] = useState(null);

  const currentStep = !chain ? 1 : !mode ? 2 : 3;

  async function lookupAccount() {
    if (!chain) return;

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

  const filteredUsers = useMemo(() => {
    return (users || []).filter((user) => user.chain === chain);
  }, [users, chain]);

  const Row = ({ index, style }) => {
    const user = filteredUsers[index];
    if (!user) return null;
    return (
      <div style={style} className="pr-1">
        {usr && chain !== usr.chain ? (
          <a href={window.location.pathname} className="block">
            <AccountCard
              user={user}
              onClick={() =>
                setCurrentUser(user.username, user.id, user.referrer, user.chain)
              }
              accentColor={accentColor}
              isCurrentChain={usr.chain === user.chain}
              t={t}
            />
          </a>
        ) : (
          <AccountCard
            user={user}
            onClick={() =>
              setCurrentUser(user.username, user.id, user.referrer, user.chain)
            }
            onRemove={() => removeUser(user.id)}
            accentColor={accentColor}
            isCurrentChain={usr.chain === user.chain}
            t={t}
          />
        )}
      </div>
    );
  };

  const FavouriteRow = ({ index, style }) => {
    const favUser = favouriteUsers[index];
    if (!favUser) return null;
    const user = { username: favUser.name, id: favUser.id };
    return (
      <div style={style} className="pr-1">
        {usr && chain !== usr.chain ? (
          <a href={window.location.pathname} className="block">
            <AccountCard
              user={user}
              onClick={() =>
                setCurrentUser(favUser.name, favUser.id, "", chain)
              }
              accentColor={accentColor}
              isCurrentChain={usr.chain === chain}
              t={t}
            />
          </a>
        ) : (
          <AccountCard
            user={user}
            onClick={() =>
              setCurrentUser(favUser.name, favUser.id, "", chain)
            }
            accentColor={accentColor}
            isCurrentChain={usr.chain === chain}
            t={t}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[320px]">
      <StepIndicator
        currentStep={currentStep}
        totalSteps={3}
        accentColor={accentColor}
        step1Label={t("AccountSelect:step1")}
        step2Label={t("AccountSelect:step2")}
        step3Label={t("AccountSelect:step3")}
      />

      {!chain ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-muted-foreground text-sm mb-4">
            {t("AccountSelect:noChain.description")}
          </div>
          <BlockchainButton
            name="Bitshares"
            subtitle={t("AccountSelect:mainnet")}
            icon={<Globe className="w-5 h-5" style={{ color: accentColor }} />}
            onClick={() => setChain("bitshares")}
            accentColor={accentColor}
          />
          <BlockchainButton
            name="Bitshares Testnet"
            subtitle={t("AccountSelect:testnetLabel")}
            icon={<Shield className="w-5 h-5" style={{ color: accentColor }} />}
            onClick={() => setChain("bitshares_testnet")}
            accentColor={accentColor}
          />
        </div>
      ) : null}

      {chain && !mode ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-muted-foreground text-sm mb-4">
            {chain === "bitshares"
              ? t("AccountSelect:noMode.titleBTS")
              : t("AccountSelect:noMode.titleTEST")}
          </div>
          <BlockchainButton
            name={t("AccountSelect:noMode.new")}
            subtitle={t("AccountSelect:newAccountSubtitle")}
            icon={<Search className="w-5 h-5" style={{ color: accentColor }} />}
            onClick={() => setMode("new")}
            accentColor={accentColor}
          />
          <BlockchainButton
            name={t("AccountSelect:noMode.existing")}
            subtitle={t("AccountSelect:existingAccountSubtitle", { count: filteredUsers.length })}
            icon={<Users className="w-5 h-5" style={{ color: accentColor }} />}
            onClick={() => setMode("existing")}
            accentColor={accentColor}
          />
          <BlockchainButton
            name={t("AccountSelect:noMode.favourites")}
            subtitle={t("AccountSelect:favouritesAccountSubtitle", { count: favouriteUsers.length })}
            icon={<Star className="w-5 h-5" style={{ color: accentColor }} />}
            onClick={() => setMode("favourites")}
            accentColor={accentColor}
          />
          <Button
            variant="ghost"
            onClick={() => setChain(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 mt-4 px-2 py-1 h-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("AccountSelect:noMode.back")}
          </Button>
        </div>
      ) : null}

      {chain && mode === "new" && !searchResponse ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-muted-foreground text-sm">
            {t("AccountSelect:new.initDesc")}
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
              style={{
                focusVisibleRingColor: `${accentColor}66`,
              }}
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
              {t("AccountSelect:new.back")}
            </Button>
            <div className="flex-1" />
            {accountInput && !inProgress ? (
              <Button
                onClick={() => lookupAccount()}
                className={cn(
                  "px-6 py-2 text-foreground font-medium",
                  "shadow-lg transition-all duration-200"
                )}
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                  boxShadow: `0 4px 14px -3px ${accentColor}55`,
                }}
              >
                {t("AccountSelect:new.continue")}
              </Button>
            ) : (
              <Button
                disabled
                className="px-6 py-2 bg-accent/50 text-muted-foreground/60 border-border/80"
              >
                {t("AccountSelect:new.continue")}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {searchResponse ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-muted-foreground text-sm">
            {t("AccountSelect:new.description")}
          </div>

          {usr && chain !== usr.chain ? (
            <a href={window.location.pathname} className="block">
              <AccountCard
                user={{ username: searchResponse.name, id: searchResponse.id }}
                onClick={() =>
                  setCurrentUser(
                    searchResponse.name,
                    searchResponse.id,
                    searchResponse.referrer,
                    chain
                  )
                }
                accentColor={accentColor}
                t={t}
              />
            </a>
          ) : (
            <AccountCard
              user={{ username: searchResponse.name, id: searchResponse.id }}
              onClick={() =>
                setCurrentUser(
                  searchResponse.name,
                  searchResponse.id,
                  searchResponse.referrer,
                  chain
                )
              }
              accentColor={accentColor}
              t={t}
            />
          )}

          <Button
            variant="ghost"
            onClick={() => {
              setErrorMessage(null);
              setSearchResponse(null);
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("AccountSelect:new.back")}
          </Button>
        </div>
      ) : null}

      {mode === "existing" ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-muted-foreground text-sm">
            {t("AccountSelect:existing.description")}
          </div>

          <div className="w-full max-h-[340px] overflow-auto rounded-xl">
            {filteredUsers.length > 0 ? (
              <List
                rowComponent={Row}
                rowCount={filteredUsers.length}
                rowHeight={72}
                rowProps={{}}
                key={`list-existing-${chain}`}
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
                  <Inbox className="w-6 h-6 dark:text-muted-foreground/50 text-muted-foreground/70" />
                </div>
                <div className="text-muted-foreground text-sm font-medium mb-1">
                  {t("AccountSelect:existing.none")}
                </div>
                <div className="text-muted-foreground/60 text-xs text-center max-w-[200px] dark:text-muted-foreground/50 text-muted-foreground/70">
                  {t("AccountSelect:existing.noneHint")}
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
            {t("AccountSelect:noMode.back")}
          </Button>
        </div>
      ) : null}

      {mode === "favourites" ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-muted-foreground text-sm">
            {t("AccountSelect:favourites.description")}
          </div>

          <div className="w-full max-h-[340px] overflow-auto rounded-xl">
            {favouriteUsers.length > 0 ? (
              <List
                rowComponent={FavouriteRow}
                rowCount={favouriteUsers.length}
                rowHeight={72}
                rowProps={{}}
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
                  <Inbox className="w-6 h-6 dark:text-muted-foreground/50 text-muted-foreground/70" />
                </div>
                <div className="text-muted-foreground text-sm font-medium mb-1">
                  {t("AccountSelect:favourites.none")}
                </div>
                <div className="text-muted-foreground/60 text-xs text-center max-w-[200px] dark:text-muted-foreground/50 text-muted-foreground/70">
                  {t("AccountSelect:favourites.noneHint")}
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
            {t("AccountSelect:noMode.back")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
