import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useStore } from "@nanostores/react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  ArrowLeft,
  Ban,
  CircleCheck,
  FlaskConical,
  MessageSquare,
  Quote,
  RefreshCw,
  Send,
  TriangleAlert,
} from "lucide-react";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $userBlockList, addBlockedUser } from "@/stores/blocklist.ts";
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
  fetchThreadReplies,
  findForumTopic,
} from "@/nanoeffects/Forum.ts";
import {
  forumChannelCatalog,
  forumTopicCatalog,
  isThreadKey,
  splitQuote,
  verifyThreadCatalog,
} from "@/lib/forumPost.js";
import {
  FORUM_OP_ID,
  buildForumReplyData,
  buildMessageKey,
  maxMessageBytes,
  utf8Length,
} from "@/bts/serializer/customOperations.js";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import TrollboxRisks from "@/components/TrollboxRisks.jsx";
import { Avatar } from "@/components/Avatar.tsx";

const POLL_MS = 15000;
const REPLY_PAGE_SIZE = 50;

function paramsFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    return {
      channel: q.get("channel"),
      thread: q.get("thread"),
      cc: q.get("cc"),
    };
  } catch {
    return { channel: null, thread: null, cc: null };
  }
}

function quoteBlock(text, maxChars = 400) {
  const clipped =
    text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
  return clipped
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function ReplyBody({ text, showMoreLabel, showLessLabel }) {
  const [expanded, setExpanded] = useState(false);
  const { quotes, quoteOverflow, body } = useMemo(
    () => splitQuote(text),
    [text]
  );
  return (
    <div className="min-w-0">
      {quotes.length > 0 ? (
        <div>
          <blockquote className="mb-2 rounded-md border-l-2 border-[hsl(var(--accent-1)/0.6)] bg-accent/30 px-2.5 py-1.5 text-[13px] italic text-muted-foreground whitespace-pre-wrap break-words">
            {(expanded ? [...quotes, ...(quoteOverflow > 0 ? [`…`] : [])] : quotes).join("\n")}
          </blockquote>
          {quoteOverflow > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="mb-1 h-6 px-1.5 text-[11px]"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? showLessLabel
                : showMoreLabel.replace("{{count}}", String(quoteOverflow))}
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
        {body || text}
      </p>
    </div>
  );
}

export default function ForumThread() {
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

  const [urlParams] = useState(() => paramsFromUrl());
  const { channel, thread: threadKey, cc: ccParam } = urlParams;
  const catalog = channel ? forumChannelCatalog(channel) : null;

  const [probe, setProbe] = useState({ state: "probing", node: nodeUrl });
  const [topic, setTopic] = useState(null);
  const [topicMissing, setTopicMissing] = useState(false);
  const [hashMismatch, setHashMismatch] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [visibleCount, setVisibleCount] = useState(REPLY_PAGE_SIZE);
  const [draft, setDraft] = useState("");
  const [composeError, setComposeError] = useState(null);
  const [pendingOp, setPendingOp] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);
  const [maxBytes, setMaxBytes] = useState(() => maxMessageBytes());
  const [roleIds, setRoleIds] = useState({ witnesses: [], committee: [] });

  const paramsValid =
    !!catalog && !!channel && !!threadKey && isThreadKey(threadKey);

  // Probe.
  useEffect(() => {
    let cancelled = false;
    setProbe({ state: "probing", node: nodeUrl });
    setLoadError(null);
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

  // Load topic + replies.
  useEffect(() => {
    if (probe.state !== "live" || !paramsValid) {
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setTopicMissing(false);
    setHashMismatch(false);
    (async () => {
      try {
        const found = await findForumTopic(
          probe.node,
          catalog,
          channel,
          threadKey
        );
        if (cancelled) {
          return;
        }
        if (!found) {
          setTopic(null);
          setReplies([]);
          setTopicMissing(true);
          setLoading(false);
          return;
        }
        const derivedCc = forumTopicCatalog(found.account, found.key);
        if (!derivedCc) {
          setTopic(null);
          setHashMismatch(true);
          setLoading(false);
          return;
        }
        if (ccParam && ccParam !== derivedCc) {
          // URL asked for a different thread catalog than the topic's
          // (account, key) reproduces — hide rather than cross-wire.
          if (!verifyThreadCatalog(found.account, found.key, ccParam)) {
            setTopic(null);
            setHashMismatch(true);
            setLoading(false);
            return;
          }
        }
        setTopic(found);
        const list = await fetchThreadReplies(chain, probe.node, derivedCc);
        if (!cancelled) {
          setReplies(list);
          setLoading(false);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLoading(false);
        if (isPluginMissingError(error)) {
          setProbe({ state: "unsupported", node: probe.node });
        } else {
          setLoadError(error);
        }
      }
    })();
    const timer = setInterval(() => {
      setRefreshNonce((n) => n + 1);
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, probe.state, probe.node, catalog, channel, threadKey, ccParam, refreshNonce, paramsValid]);

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
  const isBlocked = useCallback(
    (account, name) =>
      blockedIds.has(account) ||
      blockedNames.has((name || "").toLowerCase()),
    [blockedIds, blockedNames]
  );
  const visibleReplies = useMemo(
    () =>
      replies.filter(
        (r) => !isBlocked(r.account, r.displayAuthor)
      ),
    [replies, isBlocked]
  );
  const hiddenBlockedCount = replies.length - visibleReplies.length;
  const shownReplies = useMemo(
    () => visibleReplies.slice(0, visibleCount),
    [visibleReplies, visibleCount]
  );

  const threadCatalog = useMemo(
    () =>
      topic ? forumTopicCatalog(topic.account, topic.key) : null,
    [topic]
  );

  const handleReply = async () => {
    setComposeError(null);
    const text = draft.trim();
    if (!loggedIn || !currentUser.id) {
      setComposeError(t("Forum:composerLogin", "Log in to post on-chain replies."));
      return;
    }
    if (!text) {
      setComposeError(t("Forum:errorEmpty", "Reply text is empty."));
      return;
    }
    if (!threadCatalog) {
      return;
    }
    try {
      const data = buildForumReplyData({
        catalog: threadCatalog,
        key: buildMessageKey(),
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

  const handleQuote = useCallback((text) => {
    setDraft((prev) => {
      const q = quoteBlock(text);
      return prev && prev.trim() ? `${q}\n\n${prev}` : `${q}\n\n`;
    });
    setComposeError(null);
  }, []);

  const handleBlockUser = useCallback((account, name) => {
    if (!account) {
      return;
    }
    setBlockTarget({ account, displayAuthor: name });
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

  const blockLabel = t("Forum:blockUser", "Block user");
  const blockSelfLabel = t("Forum:blockSelf", "You can't block yourself");
  const roleWitnessLabel = t("Forum:roleWitnessBadge", "witness");
  const roleCommitteeLabel = t("Forum:roleCommitteeBadge", "committee member");

  const roleBadge = (account) => {
    const label = [
      roleIds.witnesses.includes(account) ? roleWitnessLabel : null,
      roleIds.committee.includes(account) ? roleCommitteeLabel : null,
    ]
      .filter(Boolean)
      .join(" · ");
    if (!label) {
      return null;
    }
    return (
      <span className="inline-flex shrink-0 items-center rounded border border-border bg-accent/30 px-1.5 py-px text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
    );
  };

  const replyCard = (reply) => {
    const own = reply.account === currentUserId;
    return (
      <div
        key={reply.id}
        className="rounded-xl border border-border bg-card/40 p-3"
      >
        <div className="mb-1.5 flex min-w-0 items-center gap-2">
          <Avatar
            size={28}
            name={reply.displayAuthor}
            extra={`forum-reply-${reply.id}`}
            expression={{ eye: "normal", mouth: "open" }}
          />
          <span className="truncate text-sm font-medium">{reply.displayAuthor}</span>
          <span className="text-xs font-normal text-muted-foreground shrink-0">
            {reply.account}
          </span>
          {roleBadge(reply.account)}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 text-[11px]"
                    disabled={!loggedIn}
                    onClick={() => handleQuote(reply.text)}
                    title={t("Forum:quote", "Quote")}
                  >
                    <Quote className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t("Forum:quote", "Quote")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {own ? null : (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
                      disabled={!loggedIn || own}
                      onClick={() => handleBlockUser(reply.account, reply.displayAuthor)}
                    >
                      <Ban className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{own ? blockSelfLabel : blockLabel}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
        </div>
        <ReplyBody
          text={reply.text}
          showMoreLabel={t("Forum:showMoreQuotes", "+{{count}} more quoted lines")}
          showLessLabel={t("Forum:showLessQuotes", "Show less")}
        />
      </div>
    );
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

  const textBytes = utf8Length(draft);

  return (
    <div className="container mx-auto mt-3 mb-5 px-3 sm:px-4 max-w-5xl">
      <div className="mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            window.location.assign(
              `/forum.html?channel=${encodeURIComponent(channel || "general")}`
            )
          }
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          {t("Forum:backToList", "Back to topics")}
        </Button>
      </div>

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
              <CardTitle className="text-lg sm:text-xl tracking-tight truncate">
                {topic ? topic.title : t("Forum:threadTitle", "Thread")}
              </CardTitle>
              <CardDescription>
                {t("Forum:threadSubtitle", "On-chain thread on the BitShares blockchain.")}
              </CardDescription>
            </div>
            {probeBadge}
          </div>
        </CardHeader>
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
              {t(
                "Forum:probeUnsupportedThread",
                "This node does not run the custom_operations plugin, so this thread cannot be read here. Broadcasting still works from any node; choose a node with the plugin enabled in node settings to read it."
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

      {!paramsValid ? (
        <Alert variant="destructive" className="mb-4">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t("Forum:badLinkTitle", "Bad thread link")}</AlertTitle>
          <AlertDescription>
            {t(
              "Forum:badLinkDesc",
              "This link is missing a valid channel or thread id."
            )}
          </AlertDescription>
        </Alert>
      ) : hashMismatch ? (
        <Alert variant="destructive" className="mb-4">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t("Forum:mismatchTitle", "Thread failed verification")}</AlertTitle>
          <AlertDescription>
            {t(
              "Forum:mismatchDesc",
              "The thread pointer does not match its author's identity hash, so it is hidden instead of rendered."
            )}
          </AlertDescription>
        </Alert>
      ) : topicMissing && !loading ? (
        <Alert className="mb-4">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t("Forum:missingTitle", "Topic not found")}</AlertTitle>
          <AlertDescription>
            {t(
              "Forum:missingDesc",
              "No topic with this id exists in this channel (it may have been deleted by its author)."
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {probe.state === "live" && paramsValid && !hashMismatch ? (
        <div className="space-y-3">
          {loading && !topic ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border p-6 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              {t("Forum:loadingThread", "Loading thread…")}
            </div>
          ) : null}
          {loadError ? (
            <div className="rounded-xl border border-border p-4 text-sm">
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
          ) : null}
          {topic ? (
            <div className="rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-card/60 p-4">
              <div className="mb-2 flex min-w-0 items-center gap-2">
                <Avatar
                  size={32}
                  name={topic.displayAuthor}
                  extra={`forum-op-${topic.id}`}
                  expression={{ eye: "normal", mouth: "open" }}
                />
                <span className="truncate text-sm font-medium">
                  {topic.displayAuthor}
                </span>
                <span className="text-xs font-normal text-muted-foreground shrink-0">
                  {topic.account}
                </span>
                {roleBadge(topic.account)}
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  {topic.account === currentUserId ? null : (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
                            disabled={!loggedIn}
                            onClick={() =>
                              handleBlockUser(topic.account, topic.displayAuthor)
                            }
                          >
                            <Ban className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{blockLabel}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </span>
              </div>
              <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
                {topic.text}
              </p>
            </div>
          ) : null}

          {hiddenBlockedCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t(
                "Forum:hiddenBlocked",
                "{{count}} hidden from blocked users.",
                { count: hiddenBlockedCount }
              )}
            </p>
          ) : null}

          {shownReplies.map(replyCard)}

          {visibleReplies.length > shownReplies.length ? (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setVisibleCount((c) => c + REPLY_PAGE_SIZE)
                }
              >
                {t(
                  "Forum:loadMore",
                  "Show more replies ({{shown}} of {{total}})",
                  {
                    shown: shownReplies.length,
                    total: visibleReplies.length,
                  }
                )}
              </Button>
            </div>
          ) : null}

          <Card className="relative overflow-hidden">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.5)] to-transparent"
            />
            <CardHeader className="pb-2">
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
                <CardTitle className="text-base">
                  {t("Forum:replyTitle", "Post a reply")}
                </CardTitle>
              </div>
              <CardDescription>
                {t(
                  "Forum:quoteHint",
                  "Quote with lines starting in “> ” — quotes are convention only and can be forged, authorship is always your account."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="forum-reply" className="sr-only">
                {t("Forum:replyTitle", "Post a reply")}
              </Label>
              <Textarea
                id="forum-reply"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder={
                  loggedIn
                    ? t("Forum:replyPlaceholder", "Write your reply… (optional “> quoted” lines on top)")
                    : t("Forum:composerLogin", "Log in to post on-chain replies.")
                }
                disabled={!loggedIn}
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  onClick={handleReply}
                  disabled={!loggedIn || !draft.trim()}
                  size="sm"
                >
                  <Send className="mr-1 h-3.5 w-3.5" />
                  {t("Forum:postReply", "Post reply")}
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  {t("Forum:byteCount", "{{bytes}} / {{max}} bytes", {
                    bytes: textBytes,
                    max: maxBytes,
                  })}
                </span>
              </div>
              {textBytes > maxBytes ? (
                <p className="mt-1 text-xs text-destructive">
                  {t(
                    "Forum:errorTooLong",
                    "Reply is {{over}} bytes over the size limit ({{max}} bytes).",
                    { over: textBytes - maxBytes, max: maxBytes }
                  )}
                </p>
              ) : null}
              {composeError ? (
                <p className="mt-1 text-xs text-destructive">{composeError}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : probe.state !== "live" ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
          {t("Forum:waitingForNode", "Thread appears once a supported node is selected.")}
        </div>
      ) : null}

      {showDialog && pendingOp && loggedIn ? (
        <DeepLinkDialog
          operationNames={["custom"]}
          username={currentUser.username}
          usrChain={chain}
          userID={currentUser.id}
          dismissCallback={() => {
            setShowDialog(false);
            setDraft("");
            setRefreshNonce((n) => n + 1);
          }}
          key={`forum-thread-${pendingOp[0].data.slice(0, 32)}`}
          headerText={t(
            "Forum:replyHeader",
            "Posting a reply as {{user}}",
            { user: currentUser.username }
          )}
          trxJSON={pendingOp}
        />
      ) : null}

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
                "Are you sure you want to block this account? You won't see their posts anymore."
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
