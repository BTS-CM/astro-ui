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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  ArrowLeftRight,
  Ban,
  CircleCheck,
  Check,
  Coins,
  Droplets,
  EyeOff,
  FlaskConical,
  HandCoins,
  Handshake,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $userBlockList, addBlockedUser } from "@/stores/blocklist.ts";
import {
  $hiddenForumTopics,
  $viewedForumTopics,
  $watchedForumTopics,
  hideForumTopic,
  pruneHiddenForumTopics,
  pruneViewedForumTopics,
  pruneWatchedForumTopics,
} from "@/stores/forum.ts";
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
  storageIdNum,
  verifyAttachmentOnChain,
} from "@/nanoeffects/Trollbox.ts";
import {
  FORUM_CHANNELS,
  countThreadReplies,
  fetchForumTopics,
  fetchForumTopicsTail,
} from "@/nanoeffects/Forum.ts";
import {
  FORUM_TITLE_MAX,
  attachmentNoun,
  forumChannelCatalog,
} from "@/lib/forumPost.js";
import {
  attachKind,
  resolveAttachmentMeta,
  validateAttachmentShape,
} from "@/lib/trollboxAttach.js";
import {
  FORUM_OP_ID,
  buildForumTopicData,
  buildMessageKey,
  maxMessageBytes,
  utf8Length,
} from "@/bts/serializer/customOperations.js";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import TrollboxRisks from "@/components/TrollboxRisks.jsx";
import TrollboxAttachDialog from "@/components/TrollboxAttachDialog.jsx";
import ForumEditor from "@/components/ForumEditor.jsx";
import { Avatar } from "@/components/Avatar.tsx";
import { getTopDonators } from "@/nanoeffects/TopDonators.ts";
import {
  DONATIONS_ASSET_ID,
  DONATIONS_LIMIT,
  DONATIONS_LOOKBACK_DAYS,
  DONATIONS_TARGET_ID,
} from "@/config/donations.ts";
import {
  buildDonorRankMap,
  donorBadgeClassName,
  donorBadgeText,
} from "@/lib/donorBadge.js";

const POLL_MS = 30000;
const FORUM_ROW_HEIGHT = 96;
const FORUM_MAX_TOPICS = 200;
const FORUM_CHANNEL_PARAM = "channel";

// Unlike the trollbox, every attachment kind is allowed in every forum
// channel. One attachment per topic/reply, enforced by the shape.
const FORUM_ATTACH_TYPES = ["asset", "pair", "pool", "offer", "barter"];

function AttachTypeIcon({ type, className }) {
  const Icon =
    type === "pair"
      ? ArrowLeftRight
      : type === "pool"
        ? Droplets
        : type === "offer"
          ? HandCoins
          : type === "barter"
            ? Handshake
            : Coins;
  return <Icon className={className ?? "h-3 w-3"} />;
}

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
  donorRank,
  donorLabel,
  topDonorLabel,
  donorTitle,
  topDonorTitle,
  hideLabel,
  viewedKeys,
  viewedLabel,
  unreadCounts,
  unreadLabel,
  attachMetas,
  attachBadgeLabel,
  attachTitleFor,
  onOpenTopic,
  onBlockUser,
  onHideTopic,
}) {
  const topic = visibleTopics[index];
  if (!topic) {
    return null;
  }
  const own = topic.account === currentUserId;
  const unreadCount = unreadCounts[topic.key];
  const attachMeta = attachMetas[topic.key] || null;
  const roleLabel = [
    roleWitnessIds.includes(topic.account) ? roleWitnessLabel : null,
    roleCommitteeIds.includes(topic.account) ? roleCommitteeLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const donor = donorBadgeText(topic.account, donorRank, {
    donorLabel,
    topDonorLabel,
    donorTitle,
    topDonorTitle,
  });
  return (
    <div style={{ ...style, paddingBottom: "8px" }}>
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-11 min-w-0">
          <Item
            variant="outline"
            size="sm"
            className={`h-full cursor-pointer overflow-hidden hover:bg-accent/50 hover:border-[hsl(var(--accent-1)/0.4)]${
              own
                ? " border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.07)]"
                : ""
            }`}
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
                {typeof unreadCount === "number" && unreadCount > 0 ? (
                  <span
                    title={(unreadLabel || "").replace("{{count}}", String(unreadCount))}
                    className="inline-flex shrink-0 items-center rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                  >
                    {unreadCount}
                  </span>
                ) : null}
                {viewedKeys.has(topic.key) ? (
                  <span
                    title={viewedLabel}
                    className="shrink-0 text-muted-foreground/60"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : null}
                {roleLabel || donor ? (
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                    {roleLabel ? (
                      <span className="inline-flex shrink-0 items-center rounded border border-border bg-accent/30 px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                        {roleLabel}
                      </span>
                    ) : null}
                    {donor ? (
                      <span
                        title={donor.title}
                        className={donorBadgeClassName(donor.badge.rank)}
                      >
                        {donor.label}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </ItemTitle>
              <div className="flex w-full min-w-0 items-center gap-2 pr-2">
                <p className="min-w-0 flex-1 truncate text-xs font-normal leading-normal text-muted-foreground">
                  {topic.displayAuthor}
                  <span className="ml-1.5 font-mono opacity-70">{topic.account}</span>
                </p>
                {attachMeta ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-accent/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                    title={attachTitleFor(topic)}
                  >
                    <AttachTypeIcon type={attachMeta.type} />
                    <span className="max-w-[140px] truncate">{attachBadgeLabel(attachMeta)}</span>
                  </span>
                ) : null}
              </div>
            </ItemContent>
          </Item>
        </div>
        <div className="col-span-1 flex flex-col items-center justify-center gap-1">
          {canBlock ? (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={hideLabel}
                    disabled={own}
                    onClick={() => onHideTopic(topic)}
                    className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{hideLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
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

export default function Forum(properties) {
  const {
    _assetsBTS = [],
    _assetsTEST = [],
    _marketSearchBTS = [],
    _marketSearchTEST = [],
    _poolsBTS = [],
    _poolsTEST = [],
  } = properties || {};
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
  const pair = resolveSectionAccent(getThemeForPage("forum"), "community");
  const accent = sectionAccentStyles(pair.primary, pair.secondary, isDark);

  const chain = (currentUser && currentUser.chain) || "bitshares";
  const nodeUrl = (currentNode && currentNode.url) || "";

  const chainAssets = chain === "bitshares" ? _assetsBTS : _assetsTEST;
  const chainMarketSearch =
    chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
  const chainPools = chain === "bitshares" ? _poolsBTS : _poolsTEST;

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
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingAttach, setPendingAttach] = useState(null); // {attach, label}
  const [verifyingAttach, setVerifyingAttach] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);
  const [showFriends, setShowFriends] = useState(false);
  const [showWatching, setShowWatching] = useState(false);
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [checkingUnread, setCheckingUnread] = useState(false);
  const [checkNonce, setCheckNonce] = useState(0);
  const [maxBytes, setMaxBytes] = useState(() => maxMessageBytes());
  const [roleIds, setRoleIds] = useState({ witnesses: [], committee: [] });
  const [donorRank, setDonorRank] = useState({});

  // Monthly Referrer donor ranks (decorative only; mainnet only; failures
  // silently yield no badges). Same source as /monthly_referrer.html.
  useEffect(() => {
    if (chain !== "bitshares") {
      setDonorRank({});
      return undefined;
    }
    let cancelled = false;
    getTopDonators(
      DONATIONS_TARGET_ID,
      DONATIONS_ASSET_ID,
      DONATIONS_LIMIT,
      DONATIONS_LOOKBACK_DAYS
    )
      .then((donors) => {
        if (!cancelled) {
          setDonorRank(buildDonorRankMap(donors));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDonorRank({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chain]);

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
        setQuery("");
        setSortDir("desc");
        setPendingAttach(null);
        maxIdRef.current = null;
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

  // Max seen storage ID for the active channel. The first load scans
  // the full catalog; later polls fetch only the tail (IDs >= max) and
  // merge it below. Short pages already terminate scans, so empty pages
  // are never fetched. Newest-first order is preserved because the tail
  // holds every object newer than the cache.
  const maxIdRef = useRef(null);

  // Load the active channel catalog while reads are supported.
  useEffect(() => {
    if (probe.state !== "live" || !channelInfo || !catalog) {
      return undefined;
    }
    let cancelled = false;
    const since = maxIdRef.current;
    if (!since) {
      setLoadingTopics(true);
    }
    setTopicsError(null);
    const loader = since
      ? fetchForumTopicsTail(chain, probe.node, catalog, activeChannel, since)
      : fetchForumTopics(chain, probe.node, catalog, activeChannel);
    loader
      .then((list) => {
        if (cancelled) {
          return;
        }
        if (since) {
          setTopics((prev) => {
            const ids = new Set(prev.map((topic) => topic.id));
            const merged = prev.concat(
              list.filter((topic) => !ids.has(topic.id))
            );
            merged.sort((a, b) => storageIdNum(b.id) - storageIdNum(a.id));
            const capped = merged.slice(0, 2000);
            maxIdRef.current = capped.length ? capped[0].id : since;
            return capped;
          });
        } else {
          maxIdRef.current = list.length ? list[0].id : null;
          setTopics(list);
        }
        setLoadingTopics(false);
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

  // Auto-clean hidden/viewed/watched entries whose topic no longer appears
  // in the channel results. Only runs after a successful, non-empty load —
  // never on error or empty results — so node-view skew can't wipe state
  // while a fetch is failing. Skipped when the local cache hits its cap
  // (ancient topics may be truncated from view, not gone on-chain).
  useEffect(() => {
    if (topicsError || topics.length === 0 || topics.length >= 2000) {
      return;
    }
    const fetchedKeys = new Set(topics.map((topic) => topic.key));
    pruneHiddenForumTopics(chain, activeChannel, fetchedKeys);
    pruneViewedForumTopics(chain, activeChannel, fetchedKeys);
    pruneWatchedForumTopics(chain, activeChannel, fetchedKeys);
  }, [topics, topicsError, activeChannel, chain]);

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
    let attach = null;
    if (pendingAttach) {
      const shape = validateAttachmentShape(pendingAttach.attach);
      if (!shape) {
        setComposeError(
          t("Trollbox:attachInvalid", "Attachment is invalid — pick again.")
        );
        return;
      }
      setVerifyingAttach(true);
      try {
        const ok = await verifyAttachmentOnChain(
          chain,
          probe.state === "live" ? probe.node : nodeUrl,
          shape
        );
        if (!ok) {
          setComposeError(
            t(
              "Trollbox:attachGone",
              "Attachment no longer exists on-chain — pick again."
            )
          );
          return;
        }
      } finally {
        setVerifyingAttach(false);
      }
      attach = shape;
    }
    try {
      const data = buildForumTopicData({
        catalog,
        key: buildMessageKey(),
        title: trimmedTitle,
        text,
        attach,
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
  const hiddenForumTopics = useStore($hiddenForumTopics);
  const viewedForumTopics = useStore($viewedForumTopics);
  const viewedKeys = useMemo(() => {
    const list = (viewedForumTopics && viewedForumTopics[chain]) || [];
    return new Set(
      list.filter((v) => v.channel === activeChannel).map((v) => v.key)
    );
  }, [viewedForumTopics, chain, activeChannel]);
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
  const filteredTopics = useMemo(() => {
    const hidden = ((hiddenForumTopics && hiddenForumTopics[chain]) || []).filter(
      (h) => h.channel === activeChannel
    );
    const hiddenKeys = new Set(
      hidden.map((h) => `${h.key} ${h.account}`)
    );
    return topics.filter(
      (topic) =>
        !blockedIds.has(topic.account) &&
        !blockedNames.has((topic.displayAuthor || "").toLowerCase()) &&
        !hiddenKeys.has(`${topic.key} ${topic.account}`)
    );
  }, [topics, blockedIds, blockedNames, hiddenForumTopics, activeChannel, chain]);
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
  const watchedForumTopics = useStore($watchedForumTopics);
  const watchingTopics = useMemo(() => {
    const watched = new Set(
      ((watchedForumTopics && watchedForumTopics[chain]) || []).map(
        (w) => `${w.channel} ${w.key}`
      )
    );
    return filteredTopics.filter(
      (topic) =>
        topic.account === currentUserId ||
        watched.has(`${activeChannel} ${topic.key}`)
    );
  }, [filteredTopics, watchedForumTopics, chain, currentUserId, activeChannel]);
  const visibleTopics = useMemo(() => {
    const base = showWatching ? watchingTopics : friendTopics;
    const q = query.trim().toLowerCase();
    const searched = q
      ? base.filter(
          (topic) =>
            topic.title.toLowerCase().includes(q) ||
            topic.text.toLowerCase().includes(q) ||
            topic.displayAuthor.toLowerCase().includes(q) ||
            topic.account.toLowerCase().includes(q)
        )
      : base;
    const sorted = [...searched].sort((a, b) =>
      sortDir === "desc"
        ? storageIdNum(b.id) - storageIdNum(a.id)
        : storageIdNum(a.id) - storageIdNum(b.id)
    );
    return sorted.slice(0, FORUM_MAX_TOPICS);
  }, [friendTopics, watchingTopics, showWatching, query, sortDir]);
  const hiddenBlockedCount = topics.length - filteredTopics.length;

  // Unread-reply checks for the Watching tab: sequential, capped, only
  // while the tab is open (plus manual refresh). Each check is a tail
  // scan from the last-seen reply cursor — usually one short page.
  const watchingKeys = useMemo(
    () => watchingTopics.map((topic) => topic.key).join(","),
    [watchingTopics]
  );
  useEffect(() => {
    if (!showWatching || probe.state !== "live") {
      return undefined;
    }
    let cancelled = false;
    setCheckingUnread(true);
    (async () => {
      const viewed = (viewedForumTopics && viewedForumTopics[chain]) || [];
      const cursors = {};
      for (const v of viewed) {
        if (v.channel === activeChannel) {
          cursors[v.key] = v.lastReplyId ?? null;
        }
      }
      const slice = watchingTopics.slice(0, 20);
      const counts = {};
      for (const topic of slice) {
        if (cancelled) {
          return;
        }
        const cc = forumTopicCatalog(topic.account, topic.key);
        if (!cc) {
          continue;
        }
        try {
          counts[topic.key] = await countThreadReplies(
            probe.node,
            cc,
            cursors[topic.key] ?? null
          );
        } catch {
          // keep previous count (or none) on failure
        }
      }
      if (!cancelled) {
        setUnreadCounts(counts);
        setCheckingUnread(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // watchingKeys: refire when the watched set itself changes, not on
    // every poll merge (new array identities).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWatching, probe.state, probe.node, chain, activeChannel, checkNonce, watchingKeys]);

  // Resolve attachments to display metadata using trusted lists only.
  // Unresolvable attachments yield no badge (never render raw payload).
  const attachMetas = useMemo(() => {
    const map = {};
    for (const topic of visibleTopics) {
      if (topic.attach) {
        const meta = resolveAttachmentMeta(topic.attach, {
          assets: chainAssets,
          pools: chainPools,
        });
        if (meta) {
          map[topic.key] = meta;
        }
      }
    }
    return map;
  }, [visibleTopics, chainAssets, chainPools]);

  const attachBadgeLabel = useCallback(
    (meta) =>
      meta.type === "barter"
        ? t("Trollbox:attachTypeBarter", "Barter")
        : meta.label,
    [t]
  );

  const attachTitleFor = useCallback(
    (topic) => {
      const meta = attachMetas[topic.key];
      if (!meta) {
        return undefined;
      }
      return t(
        "Forum:attachHoverTitle",
        "{{user}} has attached this {{item}} to their post.",
        {
          user: topic.displayAuthor,
          item: t(
            `Forum:attachNoun${meta.type[0].toUpperCase()}${meta.type.slice(1)}`,
            attachmentNoun(meta.type)
          ),
        }
      );
    },
    [t, attachMetas]
  );

  const blockLabel = t("Forum:blockUser", "Block user");
  const hideLabel = t("Forum:hideTopic", "Hide topic");
  const viewedLabel = t("Forum:viewedTopic", "Viewed");
  const unreadLabel = t("Forum:unreadReplies", "{{count}} new replies");
  const blockSelfLabel = t("Forum:blockSelf", "You can't block yourself");
  const ltmLabel = t("Forum:ltmMember", "Lifetime member");
  const roleWitnessLabel = t("Forum:roleWitnessBadge", "witness");
  const roleCommitteeLabel = t("Forum:roleCommitteeBadge", "committee member");
  const donorLabel = t("Forum:donorBadge", "donor");
  const topDonorLabel = t("Forum:topDonorBadge", "top donor");
  const donorTitle = t("Forum:donorBadgeTitle", "Monthly donor");
  const topDonorTitle = t("Forum:topDonorBadgeTitle", "Top donor #{{rank}}");

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
  const handleHideTopic = useCallback(
    (topic) => {
      if (!topic || !topic.key || topic.account === currentUserId) {
        return;
      }
      hideForumTopic(chain, {
        channel: activeChannel,
        key: topic.key,
        account: topic.account,
        title: topic.title,
        at: Date.now(),
      });
    },
    [chain, activeChannel, currentUserId]
  );
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
      donorRank,
      donorLabel,
      topDonorLabel,
      donorTitle,
      topDonorTitle,
      hideLabel,
      viewedKeys,
      viewedLabel,
      unreadCounts,
      unreadLabel,
      attachMetas,
      attachBadgeLabel,
      attachTitleFor,
      onOpenTopic: handleOpenTopic,
      onBlockUser: handleBlockUser,
      onHideTopic: handleHideTopic,
    }),
    [
      visibleTopics,
      loggedIn,
      currentUserId,
      blockLabel,
      blockSelfLabel,
      hideLabel,
      viewedKeys,
      viewedLabel,
      unreadCounts,
      unreadLabel,
      attachMetas,
      attachBadgeLabel,
      attachTitleFor,
      ltmLabel,
      roleIds,
      roleWitnessLabel,
      roleCommitteeLabel,
      donorRank,
      donorLabel,
      topDonorLabel,
      donorTitle,
      topDonorTitle,
      t,
      handleOpenTopic,
      handleBlockUser,
      handleHideTopic,
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
                onClick={() => {
                  // Force a full rescan (not just the tail): clears the
                  // high-water mark so edits to older topics reappear too.
                  setTopics([]);
                  setTopicsError(null);
                  maxIdRef.current = null;
                  setRefreshNonce((n) => n + 1);
                }}
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
          setQuery("");
          setSortDir("desc");
          setPendingAttach(null);
          maxIdRef.current = null;
        }}
      >
        <Card className="mb-4 relative overflow-hidden">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.5)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl"
          />
          <CardHeader className="pb-2 relative">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)]">
                <MessageSquare className="h-3.5 w-3.5" />
              </span>
              <CardTitle className="text-base">
                {t("Forum:channelsTitle", "Channels")}
              </CardTitle>
            </div>
            <CardDescription>
              {t(
                "Forum:channelsSubtitle",
                "Each channel advertises its own topics. Open one to read and reply."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <TabsList className="mb-1 flex-wrap h-auto bg-[hsl(var(--accent-1)/0.08)] border border-[hsl(var(--accent-1)/0.2)]">
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
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl"
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
                className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.05)] p-0.5"
                role="tablist"
                aria-label={t("Forum:filterLabel", "Topic filter")}
              >
                <Button
                  variant={!showFriends && !showWatching ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => {
                    setShowFriends(false);
                    setShowWatching(false);
                  }}
                >
                  {t("Forum:filterAll", "All")}
                </Button>
                <Button
                  variant={showFriends ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => {
                    setShowFriends(true);
                    setShowWatching(false);
                  }}
                >
                  {t("Forum:filterFriends", "Friends")}
                </Button>
                <Button
                  variant={showWatching ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => {
                    setShowFriends(false);
                    setShowWatching(true);
                  }}
                >
                  {t("Forum:filterWatching", "Watching")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("Forum:searchPlaceholder", "Search loaded topics…")}
                  aria-label={t("Forum:searchLabel", "Search topics")}
                  className="h-8 pr-8 text-xs focus-visible:border-[hsl(var(--accent-1)/0.5)] focus-visible:ring-[hsl(var(--accent-1)/0.3)]"
                />
                {query ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground"
                    aria-label={t("Forum:clearSearch", "Clear search")}
                    onClick={() => setQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              <div
                className="flex shrink-0 items-center gap-1 rounded-lg border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.05)] p-0.5"
                role="tablist"
                aria-label={t("Forum:sortLabel", "Topic order")}
              >
                <Button
                  variant={sortDir === "desc" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setSortDir("desc")}
                >
                  {t("Forum:sortNewest", "Newest")}
                </Button>
                <Button
                  variant={sortDir === "asc" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setSortDir("asc")}
                >
                  {t("Forum:sortOldest", "Oldest")}
                </Button>
                {showWatching ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    disabled={checkingUnread}
                    onClick={() => setCheckNonce((n) => n + 1)}
                    title={t("Forum:checkReplies", "Check for new replies")}
                  >
                    {checkingUnread ? (
                      <Spinner className="mr-1 h-3 w-3" />
                    ) : (
                      <RefreshCw className="mr-1 h-3 w-3" />
                    )}
                    {t("Forum:checkReplies", "Check for new replies")}
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {t("Forum:searchHint", "Search covers loaded topics only.")}
            </p>
            {probe.state === "live" ? (
              <div
                className="rounded-xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-b from-[hsl(var(--accent-1)/0.06)] to-transparent p-2"
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
                      onClick={() => {
                        setTopics([]);
                        setTopicsError(null);
                        maxIdRef.current = null;
                        setRefreshNonce((n) => n + 1);
                      }}
                    >
                      {t("Forum:retry", "Retry")}
                    </Button>
                  </div>
                ) : visibleTopics.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    {query.trim()
                      ? t(
                          "Forum:searchEmpty",
                          "No loaded topics match “{{query}}”.",
                          { query: query.trim() }
                        )
                      : showWatching
                        ? t(
                            "Forum:watchingEmpty",
                            "Nothing watched yet — open a thread and use Watch to follow its replies. Topics you start are watched automatically."
                          )
                        : t(
                            "Forum:topicsEmpty",
                            "No topics in {{channel}} yet — start the first one below.",
                            { channel: activeChannel }
                          )}
                    {hiddenBlockedCount > 0 ? (
                      <span className="mt-1 block text-xs">
                        {t(
                          "Forum:hiddenBlocked",
                          "{{count}} hidden from your view.",
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
                          "{{count}} hidden from your view.",
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

            <div className="mt-4 space-y-2 rounded-xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-b from-[hsl(var(--accent-1)/0.06)] to-transparent p-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)]">
                  <Send className="h-3 w-3" />
                </span>
                {t("Forum:newTopicTitle", "Start a new topic")}
              </CardTitle>
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Label htmlFor="forum-title" className="text-xs">
                    {t("Forum:titleLabel", "Title (3–120 characters)")}
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {t("Forum:titleCount", "{{count}} / {{max}}", {
                      count: title.trim().length,
                      max: FORUM_TITLE_MAX,
                    })}
                  </span>
                </div>
                <Input
                  id="forum-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={FORUM_TITLE_MAX}
                  className="focus-visible:border-[hsl(var(--accent-1)/0.5)] focus-visible:ring-[hsl(var(--accent-1)/0.3)]"
                  placeholder={
                    loggedIn
                      ? t("Forum:titlePlaceholder", "What is this topic about?")
                      : t("Forum:composerLogin", "Log in to post on-chain topics.")
                  }
                  disabled={!loggedIn}
                />
              </div>
              <div>
                <div className="mb-1 text-xs font-medium">
                  {t("Forum:bodyLabel", "Body — the language you write in sets the topic language (max ~1500 characters)")}
                </div>
                <ForumEditor
                  value={draft}
                  onChange={setDraft}
                  dark={isDark}
                  disabled={!loggedIn}
                  minHeight={240}
                  placeholder={
                    loggedIn
                      ? t("Forum:bodyPlaceholder", "Write the opening post…")
                      : t("Forum:composerLogin", "Log in to post on-chain topics.")
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                {pendingAttach ? (
                  <Badge
                    variant="secondary"
                    className="shrink-0 max-w-[320px] h-10 gap-1.5 px-2.5"
                    title={t(
                      "Trollbox:attachAttachedTitle",
                      "Attached {{type}}: {{label}}",
                      {
                        type: attachKind(pendingAttach.attach) ?? "item",
                        label: pendingAttach.label,
                      }
                    )}
                  >
                    <AttachTypeIcon
                      type={attachKind(pendingAttach.attach) ?? "asset"}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="truncate text-xs">{pendingAttach.label}</span>
                    <button
                      type="button"
                      aria-label={t("Trollbox:attachRemove", "Remove attachment")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingAttach(null);
                      }}
                      className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={!loggedIn}
                    onClick={() => setAttachOpen(true)}
                    title={t("Trollbox:attachButton", "Attach asset, pair, pool or offer")}
                    aria-label={t("Trollbox:attachButton", "Attach asset, pair, pool or offer")}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  onClick={handlePost}
                  disabled={!loggedIn || !title.trim() || !draft.trim() || verifyingAttach}
                  size="sm"
                  className="shadow-[0_0_14px_-4px_hsl(var(--accent-1)/0.6)]"
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
                  setPendingAttach(null);
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
            <TrollboxAttachDialog
              open={attachOpen}
              onOpenChange={setAttachOpen}
              chain={chain}
              nodeUrl={probe.state === "live" ? probe.node : nodeUrl}
              usr={currentUser}
              assets={chainAssets}
              marketSearch={chainMarketSearch}
              pools={chainPools}
              allowedTypes={FORUM_ATTACH_TYPES}
              initialValue={pendingAttach}
              onAttach={(picked) => setPendingAttach(picked)}
            />
          </CardContent>
        </Card>
      </Tabs>

      <TrollboxRisks page="forum" />

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
