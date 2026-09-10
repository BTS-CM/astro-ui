import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStore } from "@nanostores/react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Ban,
  CircleCheck,
  FlaskConical,
  MessageSquare,
  MessageSquareText,
  RefreshCw,
  Send,
  TriangleAlert,
} from "lucide-react";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $userBlockList, addBlockedUser } from "@/stores/blocklist.ts";
import { $favouriteUsers } from "@/stores/favourites.ts";
import {
  $customTheme,
  getThemeForPage,
  resolveSectionAccent,
} from "@/stores/customTheme.ts";
import { sectionAccentStyles } from "@/lib/accentStyles.js";
import { useInitCache } from "@/nanoeffects/Init.ts";
import {
  fetchRoleAccountIds,
  fetchMaxMessageBytes,
  isPluginMissingError,
  probeTrollboxSupport,
} from "@/nanoeffects/Trollbox.ts";
import {
  FORUM_CHANNELS,
  fetchForumTopics,
  fetchThreadReplies,
} from "@/nanoeffects/Forum.ts";
import {
  FORUM_TITLE_MAX,
  forumChannelCatalog,
  forumTopicCatalog,
  isThreadKey,
} from "@/lib/forumPost.js";
import {
  FORUM_OP_ID,
  buildForumTopicData,
  buildMessageKey,
  maxMessageBytes,
  utf8Length,
} from "@/bts/serializer/customOperations.js";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import TrollboxRisks from "@/components/TrollboxRisks.jsx";
import { Avatar } from "@/components/Avatar.tsx";

const POLL_MS = 30000;
const FORUM_ROW_HEIGHT = 96;
const FORUM_MAX_TOPICS = 200;
const FORUM_CHANNEL_PARAM = "channel";
const TOPIC_PREVIEW_CHARS = 140;

function channelFromUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get(
      FORUM_CHANNEL_PARAM
    );
    return FORUM_CHANNELS.some((c) => c.id === v) ? v : "general";
  } catch {
    return "general";
  }
}

function truncatePreview(text, max = TOPIC_PREVIEW_CHARS) {
  if (!text) {
    return "";
  }
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function threadUrl(channel, threadKey) {
  return `/forum_thread.html?channel=${encodeURIComponent(channel)}&thread=${encodeURIComponent(threadKey)}`;
}

const ForumTopicRow = React.memo(function ForumTopicRow({
  index,
  style,
  visibleTopics,
  canBlock,
  currentUserId,
  blockLabel,
  blockSelfLabel,
  ltmLabel,
  roleWitnessIds,
  roleCommitteeIds,
  roleWitnessLabel,
  roleCommitteeLabel,
  replyCounts,
  repliesLabel,
  onOpenTopic,
  onBlockUser,
}) {
  const topic = visibleTopics[index];
  if (!topic) {
    return null;
  }
  const own = topic.account === currentUserId;
  const count = replyCounts[topic.key];
  const roleLabel = [
    roleWitnessIds.includes(topic.account) ? roleWitnessLabel : null,
    roleCommitteeIds.includes(topic.account) ? roleCommitteeLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div style={{ ...style, paddingBottom: "8px" }}>
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-11 min-w-0">
          <Item
            variant="outline"
            size="sm"
            className="h-full cursor-pointer overflow-hidden hover:bg-accent/50 hover:border-[hsl(var(--accent-1)/0.4)]"
            onClick={() => onOpenTopic(topic)}
          >
            <ItemMedia>
              <Avatar
                size={36}
                name={topic.displayAuthor}
                extra="forum"
                expression={{ eye: "normal", mouth: "open" }}
              />
            </ItemMedia>
            <ItemContent className="min-w-0">
              <ItemTitle className="min-w-0 w-full">
                {topic.isLtm ? (
                  <span
                    role="img"
                    aria-label={ltmLabel}
                    title={ltmLabel}
                    className="shrink-0 text-xs leading-none"
                  >
                    💎
                  </span>
                ) : null}
                <span className="truncate font-semibold">{topic.title}</span>
                <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                  {roleLabel ? (
                    <span className="inline-flex shrink-0 items-center rounded border border-border bg-accent/30 px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                      {roleLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-accent/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground" title={repliesLabel}>
                    <MessageSquareText className="h-3 w-3" />
                    {typeof count === "number" ? count : "…"}
                  </span>
                </span>
              </ItemTitle>
              <p className="w-full pr-2 text-sm font-normal leading-normal text-muted-foreground line-clamp-2">
                <span className="mr-1.5 text-xs">{topic.displayAuthor}</span>
                {truncatePreview(topic.text)}
              </p>
            </ItemContent>
          </Item>
        </div>
        <div className="col-span-1 flex items-center justify-center">
          {canBlock ? (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={own ? blockSelfLabel : blockLabel}
                    disabled={own}
                    onClick={() => onBlockUser(topic)}
                    className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive disabled:opacity-40"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{own ? blockSelfLabel : blockLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default function Forum() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  useStore($customTheme);
  const currentUser = useStore($currentUser);
  const currentNode = useStore($currentNode);

  const { resolvedTheme } = useTheme();
  const [domIsDark, setDomIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const check = () => setDomIsDark(el.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const isDark = resolvedTheme ? resolvedTheme === "dark" : domIsDark;
  const pair = resolveSectionAccent(getThemeForPage("forum"), "blockchain");
  const accent = sectionAccentStyles(pair.primary, pair.secondary, isDark);

  const chain = (currentUser && currentUser.chain) || "bitshares";
  const nodeUrl = (currentNode && currentNode.url) || "";

  useInitCache(chain, []);

  const [activeChannel, setActiveChannel] = useState(() => channelFromUrl());
  const activeChannelRef = useRef(activeChannel);
  activeChannelRef.current = activeChannel;
  const catalog = forumChannelCatalog(activeChannel);

  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [probe, setProbe] = useState({ state: "probing", node: nodeUrl });
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [composeError, setComposeError] = useState(null);
  const [pendingOp, setPendingOp] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);
  const [showFriends, setShowFriends] = useState(false);
  const [maxBytes, setMaxBytes] = useState(() => maxMessageBytes());
  const [roleIds, setRoleIds] = useState({ witnesses: [], committee: [] });
  const [replyCounts, setReplyCounts] = useState({});

  const channelInfo = useMemo(
    () => FORUM_CHANNELS.find((c) => c.id === activeChannel),
    [activeChannel]
  );

  // Keep channel in URL (replaceState, preserving ClientRouter state).
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get(FORUM_CHANNEL_PARAM) === activeChannel) {
        return;
      }
      url.searchParams.set(FORUM_CHANNEL_PARAM, activeChannel);
      window.history.replaceState(
        { ...(window.history.state ?? {}), forumChannel: activeChannel },
        "",
        url
      );
    } catch {
      // non-browser context: channel simply isn't shared
    }
  }, [activeChannel]);

  useEffect(() => {
    const onPopState = () => {
      const v = channelFromUrl();
      if (activeChannelRef.current !== v) {
        setTopics([]);
        setTopicsError(null);
        setActiveChannel(v);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Probe the connected node for the custom_operations plugin.
  useEffect(() => {
    let cancelled = false;
    setProbe({ state: "probing", node: nodeUrl });
    setTopicsError(null);
    if (!nodeUrl) {
      setProbe({ state: "error", node: nodeUrl });
      return undefined;
    }
    probeTrollboxSupport(chain, nodeUrl).then((result) => {
      if (cancelled) {
        return;
      }
      if (result.supported) {
        setProbe({ state: "live", node: nodeUrl });
      } else if (result.reason === "missing") {
        setProbe({ state: "unsupported", node: nodeUrl });
      } else {
        setProbe({ state: "error", node: nodeUrl });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chain, nodeUrl]);

  // Active witness / committee ids (decorative badges only).
  useEffect(() => {
    if (!nodeUrl) {
      return undefined;
    }
    let cancelled = false;
    fetchRoleAccountIds(chain, nodeUrl).then((roles) => {
      if (!cancelled) {
        setRoleIds(roles);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chain, nodeUrl]);

  // Live message budget from the chain's maximum transaction size.
  useEffect(() => {
    let cancelled = false;
    if (!nodeUrl) {
      return undefined;
    }
    fetchMaxMessageBytes(chain, nodeUrl).then((bytes) => {
      if (!cancelled) {
        setMaxBytes(bytes);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chain, nodeUrl]);

  // Load + poll the active channel catalog while reads are supported.
  useEffect(() => {
    if (probe.state !== "live" || !channelInfo || !catalog) {
      return undefined;
    }
    let cancelled = false;
    setLoadingTopics(true);
    setTopicsError(null);
    fetchForumTopics(chain, probe.node, catalog, activeChannel)
      .then((list) => {
        if (!cancelled) {
          setTopics(list);
          setLoadingTopics(false);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setLoadingTopics(false);
        if (isPluginMissingError(error)) {
          setProbe({ state: "unsupported", node: probe.node });
        } else {
          setTopicsError(error);
        }
      });
    const timer = setInterval(() => {
      setRefreshNonce((n) => n + 1);
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [chain, probe.state, probe.node, channelInfo, catalog, activeChannel, refreshNonce]);

  // Lazy reply counts for the newest topics (best-effort, cached).
  useEffect(() => {
    if (probe.state !== "live" || topics.length === 0) {
      return undefined;
    }
    let cancelled = false;
    const slice = topics.slice(0, 25).filter((topic) => !(topic.key in replyCounts));
    if (slice.length === 0) {
      return undefined;
    }
    (async () => {
      const entries = await Promise.all(
        slice.map(async (topic) => {
          const cc = forumTopicCatalog(topic.account, topic.key);
          if (!cc || !isThreadKey(topic.key)) {
            return [topic.key, 0];
          }
          try {
            const replies = await fetchThreadReplies(chain, probe.node, cc);
            return [topic.key, replies.length];
          } catch {
            return [topic.key, null];
          }
        })
      );
      if (!cancelled) {
        setReplyCounts((prev) => {
          const next = { ...prev };
          for (const [key, count] of entries) {
            if (count !== null) {
              next[key] = count;
            }
          }
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topics, probe.state, probe.node, chain]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePost = async () => {
    setComposeError(null);
    const trimmedTitle = title.trim();
    const text = draft.trim();
    if (!currentUser || !currentUser.id) {
      setComposeError(t("Forum:composerLogin", "Log in to post on-chain topics."));
      return;
    }
    if (!trimmedTitle || !text) {
      setComposeError(t("Forum:errorEmpty", "Title and body are both required."));
      return;
    }
    if (!catalog) {
      return;
    }
    try {
      const data = buildForumTopicData({
        catalog,
        key: buildMessageKey(),
        title: trimmedTitle,
        text,
        maxBytes,
      });
      setPendingOp([
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          payer: currentUser.id,
          required_auths: [currentUser.id],
          id: FORUM_OP_ID,
          data,
        },
      ]);
      setShowDialog(true);
    } catch (error) {
      setComposeError(error?.message ?? String(error));
    }
  };

  const probeBadge =
    probe.state === "live" ? (
      <Badge variant="secondary" className="ml-auto shrink-0">
        <CircleCheck className="mr-1 h-3 w-3" />
        {t("Forum:statusLive", "Live")}
      </Badge>
    ) : probe.state === "unsupported" || probe.state === "none" ? (
      <Badge variant="destructive" className="ml-auto shrink-0">
        <TriangleAlert className="mr-1 h-3 w-3" />
        {t("Forum:statusUnsupported", "Plugin unavailable")}
      </Badge>
    ) : probe.state === "error" ? (
      <Badge variant="destructive" className="ml-auto shrink-0">
        <TriangleAlert className="mr-1 h-3 w-3" />
        {t("Forum:statusError", "Node unreachable")}
      </Badge>
    ) : (
      <Badge variant="secondary" className="ml-auto shrink-0">
        <FlaskConical className="mr-1 h-3 w-3" />
        {t("Forum:statusChecking", "Checking node…")}
      </Badge>
    );

  const loggedIn = !!(currentUser && currentUser.id);
  const currentUserId = (currentUser && currentUser.id) || null;

  const userBlockList = useStore($userBlockList);
  const blockedIds = useMemo(
    () =>
      new Set(
        ((userBlockList && userBlockList[chain]) || []).map((u) => u.id)
      ),
    [userBlockList, chain]
  );
  const blockedNames = useMemo(
    () =>
      new Set(
        ((userBlockList && userBlockList[chain]) || []).map((u) =>
          (u.name || "").toLowerCase()
        )
      ),
    [userBlockList, chain]
  );
  const filteredTopics = useMemo(
    () =>
      topics.filter(
        (topic) =>
          !blockedIds.has(topic.account) &&
          !blockedNames.has((topic.displayAuthor || "").toLowerCase())
      ),
    [topics, blockedIds, blockedNames]
  );
  const favouriteUsers = useStore($favouriteUsers);
  const favouriteIds = useMemo(
    () =>
      new Set(
        ((favouriteUsers && favouriteUsers[chain]) || []).map((u) => u.id)
      ),
    [favouriteUsers, chain]
  );
  const favouriteNames = useMemo(
    () =>
      new Set(
        ((favouriteUsers && favouriteUsers[chain]) || []).map((u) =>
          (u.name || "").toLowerCase()
        )
      ),
    [favouriteUsers, chain]
  );
  const friendTopics = useMemo(
    () =>
      showFriends
        ? filteredTopics.filter(
            (m) =>
              favouriteIds.has(m.account) ||
              favouriteNames.has((m.displayAuthor || "").toLowerCase())
          )
        : filteredTopics,
    [filteredTopics, showFriends, favouriteIds, favouriteNames]
  );
  const visibleTopics = useMemo(
    () => friendTopics.slice(0, FORUM_MAX_TOPICS),
    [friendTopics]
  );
  const hiddenBlockedCount = topics.length - filteredTopics.length;

  const blockLabel = t("Forum:blockUser", "Block user");
  const blockSelfLabel = t("Forum:blockSelf", "You can't block yourself");
  const ltmLabel = t("Forum:ltmMember", "Lifetime member");
  const roleWitnessLabel = t("Forum:roleWitnessBadge", "witness");
  const roleCommitteeLabel = t("Forum:roleCommitteeBadge", "committee member");

  const handleOpenTopic = useCallback(
    (topic) => {
      window.location.assign(threadUrl(activeChannel, topic.key));
    },
    [activeChannel]
  );
  const handleBlockUser = useCallback((topic) => {
    if (!topic || !topic.account) {
      return;
    }
    setBlockTarget(topic);
  }, []);
  const handleConfirmBlock = useCallback(() => {
    setBlockTarget((target) => {
      if (target && target.account) {
        addBlockedUser(chain, {
          name: target.displayAuthor,
          id: target.account,
        });
      }
      return null;
    });
  }, [chain]);
  const rowProps = useMemo(
    () => ({
      visibleTopics,
      canBlock: loggedIn,
      currentUserId,
      blockLabel,
      blockSelfLabel,
      ltmLabel,
      roleWitnessIds: roleIds.witnesses,
      roleCommitteeIds: roleIds.committee,
      roleWitnessLabel,
      roleCommitteeLabel,
      replyCounts,
      repliesLabel: t("Forum:replies", "replies"),
      onOpenTopic: handleOpenTopic,
      onBlockUser: handleBlockUser,
    }),
    [
      visibleTopics,
      loggedIn,
      currentUserId,
      blockLabel,
      blockSelfLabel,
      ltmLabel,
      roleIds,
      roleWitnessLabel,
      roleCommitteeLabel,
      replyCounts,
      t,
      handleOpenTopic,
      handleBlockUser,
    ]
  );

  const titleBytes = utf8Length(title);
  const textBytes = utf8Length(draft);

  return (
    <div className="container mx-auto mt-3 mb-5 px-3 sm:px-4 max-w-5xl">
      <Card className="mb-4 relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
        />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <MessageSquare className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl tracking-tight">
                {t("Forum:title", "Forum")}
              </CardTitle>
              <CardDescription>
                {t(
                  "Forum:subtitle",
                  "On-chain discussion on the BitShares blockchain."
                )}
              </CardDescription>
            </div>
            {probeBadge}
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            {t(
              "Forum:intro",
              "Topics are posted on-chain from your account and visible to everyone. The sender pays a small network fee per post, which keeps spam out. Open a topic to read its replies."
            )}
          </p>
        </CardContent>
      </Card>

      {probe.state === "unsupported" || probe.state === "none" || probe.state === "error" ? (
        <Alert variant="destructive" className="mb-4">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>
            {probe.state === "error"
              ? t("Forum:statusError", "Node unreachable")
              : t("Forum:statusUnsupported", "Plugin unavailable")}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              {probe.state === "error"
                ? t(
                    "Forum:probeError",
                    "The connected node did not answer the plugin probe. Check your connection and retry."
                  )
                : probe.state === "none"
                  ? t(
                      "Forum:noSupportedNode",
                      "None of the known nodes run the custom_operations plugin. Try again later, or run your own API node with custom_operations enabled."
                    )
                  : t(
                      "Forum:probeUnsupported",
                      "This node does not run the custom_operations plugin, so forum history cannot be read here. Broadcasting still works from any node; choose a node with the plugin enabled in node settings to read history."
                    )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.assign("/nodes.html")}
              >
                {t("Forum:changeNode", "Go to node settings")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRefreshNonce((n) => n + 1)}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                {t("Forum:retry", "Retry")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        value={activeChannel}
        onValueChange={(v) => {
          setActiveChannel(v);
          setTopics([]);
          setTopicsError(null);
          setReplyCounts({});
        }}
      >
        <Card className="mb-4 relative overflow-hidden">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.5)] to-transparent"
          />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-base">
              {t("Forum:channelsTitle", "Channels")}
            </CardTitle>
            <CardDescription>
              {t(
                "Forum:channelsSubtitle",
                "Each channel advertises its own topics. Open one to read and reply."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <TabsList className="mb-1 flex-wrap h-auto">
              {FORUM_CHANNELS.map((c) => (
                <TabsTrigger key={c.id} value={c.id}>
                  #{c.id}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardContent>
        </Card>

        <Card className="mb-4 relative overflow-hidden">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.5)] to-transparent"
          />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
                style={{ ...accent.iconBg, ...accent.iconBorder }}
              >
                <MessageSquare
                  className="h-3.5 w-3.5"
                  style={isDark ? undefined : accent.iconText}
                />
              </span>
              <CardTitle className="text-base truncate flex-1 min-w-0">
                {t("Forum:viewingTitle", "Topics in {{tag}}", {
                  tag: `#${activeChannel}`,
                })}
              </CardTitle>
              <div
                className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-border p-0.5"
                role="tablist"
                aria-label={t("Forum:filterLabel", "Topic filter")}
              >
                <Button
                  variant={!showFriends ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setShowFriends(false)}
                >
                  {t("Forum:filterAll", "All")}
                </Button>
                <Button
                  variant={showFriends ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setShowFriends(true)}
                >
                  {t("Forum:filterFriends", "Friends")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {probe.state === "live" ? (
              <div
                className="rounded-xl border border-border p-2"
                style={{ minHeight: 7 * FORUM_ROW_HEIGHT }}
              >
                {loadingTopics && topics.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <Spinner className="h-4 w-4" />
                    {t("Forum:loading", "Loading topics…")}
                  </div>
                ) : topicsError ? (
                  <div className="p-4 text-sm">
                    <p className="text-destructive">
                      {t("Forum:topicsError", "Couldn't load topics.")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setRefreshNonce((n) => n + 1)}
                    >
                      {t("Forum:retry", "Retry")}
                    </Button>
                  </div>
                ) : visibleTopics.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    {t(
                      "Forum:topicsEmpty",
                      "No topics in {{channel}} yet — start the first one below.",
                      { channel: activeChannel }
                    )}
                    {hiddenBlockedCount > 0 ? (
                      <span className="mt-1 block text-xs">
                        {t(
                          "Forum:hiddenBlocked",
                          "{{count}} hidden from blocked users.",
                          { count: hiddenBlockedCount }
                        )}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div>
                    {hiddenBlockedCount > 0 ? (
                      <p className="px-3 pt-2 text-xs text-muted-foreground">
                        {t(
                          "Forum:hiddenBlocked",
                          "{{count}} hidden from blocked users.",
                          { count: hiddenBlockedCount }
                        )}
                      </p>
                    ) : null}
                    <List
                      rowComponent={ForumTopicRow}
                      rowCount={visibleTopics.length}
                      rowHeight={FORUM_ROW_HEIGHT}
                      height={Math.min(
                        Math.max(visibleTopics.length, 7) * FORUM_ROW_HEIGHT,
                        9 * FORUM_ROW_HEIGHT
                      )}
                      width="100%"
                      rowProps={rowProps}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                {probe.state === "probing"
                  ? t("Forum:statusChecking", "Checking node…")
                  : t(
                      "Forum:waitingForNode",
                      "Topics appear once a supported node is selected."
                    )}
              </div>
            )}

            <div className="mt-4 space-y-2 rounded-xl border border-border p-3">
              <CardTitle className="text-sm">
                {t("Forum:newTopicTitle", "Start a new topic")}
              </CardTitle>
              <div>
                <Label htmlFor="forum-title" className="text-xs">
                  {t("Forum:titleLabel", "Title (3–120 characters)")}
                </Label>
                <Input
                  id="forum-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={FORUM_TITLE_MAX + 20}
                  placeholder={
                    loggedIn
                      ? t("Forum:titlePlaceholder", "What is this topic about?")
                      : t("Forum:composerLogin", "Log in to post on-chain topics.")
                  }
                  disabled={!loggedIn}
                />
              </div>
              <div>
                <Label htmlFor="forum-body" className="text-xs">
                  {t("Forum:bodyLabel", "Body — the language you write in sets the topic language (max ~1500 characters)")}
                </Label>
                <Textarea
                  id="forum-body"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  placeholder={
                    loggedIn
                      ? t("Forum:bodyPlaceholder", "Write the opening post…")
                      : t("Forum:composerLogin", "Log in to post on-chain topics.")
                  }
                  disabled={!loggedIn}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePost}
                  disabled={!loggedIn || !title.trim() || !draft.trim()}
                  size="sm"
                >
                  <Send className="mr-1 h-3.5 w-3.5" />
                  {t("Forum:postTopic", "Post topic")}
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  {t("Forum:byteCount", "{{bytes}} / {{max}} bytes", {
                    bytes: textBytes + titleBytes,
                    max: maxBytes,
                  })}
                </span>
              </div>
              {textBytes + titleBytes > maxBytes ? (
                <p className="text-xs text-destructive">
                  {t(
                    "Forum:errorTooLong",
                    "Topic is {{over}} bytes over the size limit ({{max}} bytes).",
                    {
                      over: textBytes + titleBytes - maxBytes,
                      max: maxBytes,
                    }
                  )}
                </p>
              ) : null}
              {composeError ? (
                <p className="mt-1 text-xs text-destructive">{composeError}</p>
              ) : null}
              {catalog ? (
                <p className="text-xs text-muted-foreground">
                  {t(
                    loggedIn ? "Forum:composerHint" : "Forum:composerHintLoggedOut",
                    loggedIn
                      ? "Posting as {{user}} to {{catalog}}."
                      : "Posting as {{user}} to {{catalog}} would cost a small network fee.",
                    {
                      user: (currentUser && currentUser.username) || "not-logged-in",
                      catalog,
                    }
                  )}
                </p>
              ) : null}
            </div>

            {showDialog && pendingOp && loggedIn ? (
              <DeepLinkDialog
                operationNames={["custom"]}
                username={currentUser.username}
                usrChain={chain}
                userID={currentUser.id}
                dismissCallback={() => {
                  setShowDialog(false);
                  setTitle("");
                  setDraft("");
                  setRefreshNonce((n) => n + 1);
                }}
                key={`forum-${activeChannel}-${pendingOp[0].data.slice(0, 32)}`}
                headerText={t(
                  "Forum:dialogHeader",
                  "Posting to {{channel}} as {{user}}",
                  {
                    channel: activeChannel,
                    user: currentUser.username,
                  }
                )}
                trxJSON={pendingOp}
              />
            ) : null}
          </CardContent>
        </Card>
      </Tabs>

      <TrollboxRisks />

      <AlertDialog
        open={!!blockTarget}
        onOpenChange={(open) => {
          if (!open) {
            setBlockTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Forum:blockConfirmTitle", "Block this account?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Forum:blockConfirmDesc",
                "Are you sure you want to block this account? You won't see their topics anymore."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Forum:blockCancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBlock}>
              {t("Forum:blockConfirm", "Block")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
