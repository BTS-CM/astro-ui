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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowLeftRight,
  Ban,
  Coins,
  Droplets,
  HandCoins,
  MessageSquare,
  Paperclip,
  Radio,
  Send,
  Server,
  FlaskConical,
  RefreshCw,
  TriangleAlert,
  CircleCheck,
  X,
} from "lucide-react";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode, setCurrentNode } from "@/stores/node.ts";
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
  TROLLBOX_CHANNELS,
  fetchChannelMessages,
  fetchMaxMessageBytes,
  findSupportingNode,
  isPluginMissingError,
  probeTrollboxSupport,
  verifyAttachmentOnChain,
} from "@/nanoeffects/Trollbox.ts";
import {
  attachKind,
  resolveAttachmentMeta,
  validateAttachmentShape,
} from "@/lib/trollboxAttach.js";
import {
  TROLLBOX_OP_ID,
  buildMessageKey,
  buildTrollboxData,
  maxMessageBytes,
  utf8Length,
} from "@/bts/serializer/customOperations.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import TrollboxAttachDialog from "@/components/TrollboxAttachDialog.jsx";
import { Avatar } from "@/components/Avatar.tsx";

const POLL_MS = 15000;
const TROLLBOX_ROW_HEIGHT = 96;
const TROLLBOX_MAX_MESSAGES = 100;
const TROLLBOX_CHANNEL_PARAM = "channel";

function channelFromUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get(
      TROLLBOX_CHANNEL_PARAM
    );
    return TROLLBOX_CHANNELS.some((c) => c.id === v) ? v : "general";
  } catch {
    return "general";
  }
}
const TROLLBOX_MIN_ROWS = 7;
const TROLLBOX_MAX_ROWS = 9;
const TROLLBOX_PREVIEW_CHARS = 140;

function truncatePreview(text, max = TROLLBOX_PREVIEW_CHARS) {
  if (!text) {
    return "";
  }
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function AttachTypeIcon({ type, className }) {
  const Icon =
    type === "pair"
      ? ArrowLeftRight
      : type === "pool"
        ? Droplets
        : type === "offer"
          ? HandCoins
          : Coins;
  return <Icon className={className ?? "h-3 w-3"} />;
}

const TrollboxMessageRow = React.memo(function TrollboxMessageRow({
  index,
  style,
  visibleMessages,
  canBlock,
  currentUserId,
  blockLabel,
  blockSelfLabel,
  ltmLabel,
  attachMetas,
  onBlockUser,
  onOpenMessage,
}) {
  const m = visibleMessages[index];
  if (!m) {
    return null;
  }
  const isOwn = m.account === currentUserId;
  const attachMeta = attachMetas[m.id] || null;
  return (
    <div style={{ ...style, paddingBottom: "8px" }}>
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-11 min-w-0">
          <Item
            variant="outline"
            size="sm"
            className="h-full cursor-pointer overflow-hidden hover:bg-accent/50 hover:border-[hsl(var(--accent-1)/0.4)]"
            onClick={() => onOpenMessage(m)}
          >
            <ItemMedia>
              <Avatar
                size={36}
                name={m.displayAuthor}
                extra="trollbox"
                expression={{ eye: "normal", mouth: "open" }}
              />
            </ItemMedia>
            <ItemContent className="min-w-0">
            <ItemTitle className="min-w-0 w-full">
              {m.isLtm ? (
                <span
                  role="img"
                  aria-label={ltmLabel}
                  title={ltmLabel}
                  className="shrink-0 text-xs leading-none"
                >
                  💎
                </span>
              ) : null}
              <span className="truncate">{m.displayAuthor}</span>
              <span className="text-xs font-normal text-muted-foreground shrink-0">
                {m.id}
              </span>
              {attachMeta ? (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-accent/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                  <AttachTypeIcon type={attachMeta.type} />
                  <span className="max-w-[140px] truncate">{attachMeta.label}</span>
                </span>
              ) : null}
            </ItemTitle>
          <ItemDescription>
            {truncatePreview(m.text)}
          </ItemDescription>
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
                    aria-label={isOwn ? blockSelfLabel : blockLabel}
                    disabled={isOwn}
                    onClick={() => onBlockUser(m)}
                    className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive disabled:opacity-40"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{isOwn ? blockSelfLabel : blockLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default function Trollbox(properties) {
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
  const pair = resolveSectionAccent(getThemeForPage("trollbox"), "blockchain");
  const accent = sectionAccentStyles(pair.primary, pair.secondary, isDark);

  const chain = (currentUser && currentUser.chain) || "bitshares";
  const nodeUrl = (currentNode && currentNode.url) || "";

  const chainAssets = chain === "bitshares" ? _assetsBTS : _assetsTEST;
  const chainMarketSearch =
    chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
  const chainPools = chain === "bitshares" ? _poolsBTS : _poolsTEST;

  useInitCache(chain, []);

  const [activeChannel, setActiveChannel] = useState(() =>
    channelFromUrl()
  );
  const activeChannelRef = useRef(activeChannel);
  activeChannelRef.current = activeChannel;
  const [draft, setDraft] = useState("");
  const [probe, setProbe] = useState({ state: "probing", node: nodeUrl });
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [finding, setFinding] = useState(false);
  const [switchNotice, setSwitchNotice] = useState(null);
  const [composeError, setComposeError] = useState(null);
  const [pendingOp, setPendingOp] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [openMessage, setOpenMessage] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingAttach, setPendingAttach] = useState(null); // {attach, label}
  const [verifyingAttach, setVerifyingAttach] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [maxBytes, setMaxBytes] = useState(() => maxMessageBytes());

  const channelInfo = useMemo(
    () => TROLLBOX_CHANNELS.find((c) => c.id === activeChannel),
    [activeChannel]
  );

  // 1b. Live message budget from the chain's maximum transaction size.
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

  // Keep the selected channel in the URL so back/forward navigation
  // (and returning to the page) restores it. replaceState avoids
  // spamming history on every tab switch. CRITICAL: preserve the entry's
  // existing history.state object — ClientRouter stores {index, ...} there
  // and ignores popstate events whose state is null, so replaceState(null)
  // would strand the page content on Back navigation.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get(TROLLBOX_CHANNEL_PARAM) === activeChannel) {
        return;
      }
      url.searchParams.set(TROLLBOX_CHANNEL_PARAM, activeChannel);
      window.history.replaceState(
        { ...(window.history.state ?? {}), trollboxChannel: activeChannel },
        "",
        url
      );
    } catch {
      // non-browser or restricted context: channel simply isn't shared
    }
  }, [activeChannel]);

  useEffect(() => {
    const onPopState = () => {
      const v = channelFromUrl();
      if (activeChannelRef.current !== v) {
        setMessages([]);
        setMessagesError(null);
        setActiveChannel(v);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // 1. Probe the connected node for the custom_operations plugin.
  useEffect(() => {
    let cancelled = false;
    setProbe({ state: "probing", node: nodeUrl });
    setMessagesError(null);
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

  // 2. Load + poll the active channel catalog while the node supports reads.
  useEffect(() => {
    if (probe.state !== "live" || !channelInfo) {
      return undefined;
    }
    let cancelled = false;
    setLoadingMessages(true);
    setMessagesError(null);
    fetchChannelMessages(chain, probe.node, channelInfo.catalog)
      .then((msgs) => {
        if (!cancelled) {
          setMessages(msgs);
          setLoadingMessages(false);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setLoadingMessages(false);
        if (isPluginMissingError(error)) {
          console.warn(
            `Trollbox: chat history unavailable on ${probe.node}:`,
            error
          );
          setProbe({ state: "unsupported", node: probe.node });
        } else {
          console.warn(
            `Trollbox: failed to load messages from ${probe.node}:`,
            error
          );
          setMessagesError(error);
        }
      });
    const timer = setInterval(() => {
      setRefreshNonce((n) => n + 1);
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [chain, probe.state, probe.node, channelInfo, refreshNonce]);

  const handleFindNode = async () => {
    setFinding(true);
    setSwitchNotice(null);
    try {
      const url = await findSupportingNode(chain);
      if (url) {
        setCurrentNode(chain, url);
        setSwitchNotice({ kind: "found", url });
      } else {
        setProbe({ state: "none", node: nodeUrl });
      }
    } finally {
      setFinding(false);
    }
  };

  const handleSend = async () => {
    setComposeError(null);
    const text = draft.trim();
    if (!currentUser || !currentUser.id) {
      setComposeError(t("Trollbox:composerLogin", "Log in to post on-chain messages."));
      return;
    }
    if (!text) {
      setComposeError(t("Trollbox:errorEmpty", "Message text is empty."));
      return;
    }
    const textBytes = utf8Length(text);
    if (textBytes > maxBytes) {
      setComposeError(
        t(
          "Trollbox:errorTooLong",
          "Message is {{over}} bytes over the size limit ({{max}} bytes).",
          { over: textBytes - maxBytes, max: maxBytes }
        )
      );
      return;
    }
    if (!channelInfo) {
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
      const data = buildTrollboxData({
        channel: activeChannel,
        catalog: channelInfo.catalog,
        key: buildMessageKey(),
        username: currentUser.username,
        text,
        attach,
        maxBytes,
      });
      setPendingOp([
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          payer: currentUser.id,
          required_auths: [currentUser.id],
          id: TROLLBOX_OP_ID,
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
        {t("Trollbox:statusLive", "Live")}
      </Badge>
    ) : probe.state === "unsupported" || probe.state === "none" ? (
      <Badge variant="destructive" className="ml-auto shrink-0">
        <TriangleAlert className="mr-1 h-3 w-3" />
        {t("Trollbox:statusUnsupported", "Plugin unavailable")}
      </Badge>
    ) : probe.state === "error" ? (
      <Badge variant="destructive" className="ml-auto shrink-0">
        <TriangleAlert className="mr-1 h-3 w-3" />
        {t("Trollbox:statusError", "Node unreachable")}
      </Badge>
    ) : (
      <Badge variant="secondary" className="ml-auto shrink-0">
        <FlaskConical className="mr-1 h-3 w-3" />
        {t("Trollbox:statusChecking", "Checking node…")}
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
  const filteredMessages = useMemo(
    () =>
      messages.filter(
        (m) =>
          !blockedIds.has(m.account) &&
          !blockedNames.has((m.displayAuthor || "").toLowerCase())
      ),
    [messages, blockedIds, blockedNames]
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
  // Friends view narrows the (already block-filtered) list to favourited
  // accounts; blocked users stay hidden in both modes.
  const friendMessages = useMemo(
    () =>
      showFriends
        ? filteredMessages.filter(
            (m) =>
              favouriteIds.has(m.account) ||
              favouriteNames.has((m.displayAuthor || "").toLowerCase())
          )
        : filteredMessages,
    [filteredMessages, showFriends, favouriteIds, favouriteNames]
  );
  // Newest first (fetch returns storage-ID-descending); keep the head.
  const visibleMessages = useMemo(
    () => friendMessages.slice(0, TROLLBOX_MAX_MESSAGES),
    [friendMessages]
  );
  const hiddenBlockedCount = messages.length - filteredMessages.length;

  // Resolve attachments to display metadata using trusted lists only.
  // Unresolvable attachments yield no badge (never render raw payload).
  const attachMetas = useMemo(() => {
    const map = {};
    for (const m of visibleMessages) {
      if (m.attach) {
        const meta = resolveAttachmentMeta(m.attach, {
          assets: chainAssets,
          pools: chainPools,
        });
        if (meta) {
          map[m.id] = meta;
        }
      }
    }
    return map;
  }, [visibleMessages, chainAssets, chainPools]);

  const blockLabel = t("Trollbox:blockUser", "Block user");
  const blockSelfLabel = t("Trollbox:blockSelf", "You can't block yourself");
  const ltmLabel = t("Trollbox:ltmMember", "Lifetime member");
  const handleOpenMessage = useCallback((m) => {
    setOpenMessage(m);
  }, []);
  const handleBlockUser = useCallback((m) => {
    if (!m || !m.account) {
      return;
    }
    setBlockTarget(m);
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
  const messageRowProps = useMemo(
    () => ({
      visibleMessages,
      canBlock: loggedIn,
      currentUserId,
      blockLabel,
      blockSelfLabel,
      ltmLabel,
      attachMetas,
      onBlockUser: handleBlockUser,
      onOpenMessage: handleOpenMessage,
    }),
    [
      visibleMessages,
      loggedIn,
      currentUserId,
      blockLabel,
      blockSelfLabel,
      ltmLabel,
      attachMetas,
      handleBlockUser,
      handleOpenMessage,
    ]
  );

  const openAttachMeta = useMemo(() => {
    if (!openMessage || !openMessage.attach) {
      return null;
    }
    return resolveAttachmentMeta(openMessage.attach, {
      assets: chainAssets,
      pools: chainPools,
    });
  }, [openMessage, chainAssets, chainPools]);

  const [offerVerified, setOfferVerified] = useState(null);
  useEffect(() => {
    setOfferVerified(null);
    if (
      !openMessage ||
      attachKind(openMessage.attach) !== "offer" ||
      !openAttachMeta
    ) {
      return undefined;
    }
    let cancelled = false;
    const offerId = openMessage.attach.id;
    verifyAttachmentOnChain(
      chain,
      probe.state === "live" ? probe.node : nodeUrl,
      openMessage.attach
    ).then((ok) => {
      if (!cancelled) {
        setOfferVerified(ok ? offerId : false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [openMessage, openAttachMeta, chain, probe.state, probe.node, nodeUrl]);

  const openAttachActions =
    !openAttachMeta ||
    (openAttachMeta.type === "offer" &&
      offerVerified !== (openMessage && openMessage.attach.id))
      ? []
      : openAttachMeta.actions;

  return (
    <div className="container mx-auto mt-3 mb-5 px-3 sm:px-4 max-w-5xl">
      <Card className="mb-4 relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
        />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <MessageSquare className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl tracking-tight">
                {t("Trollbox:title", "Trollbox (concept)")}
              </CardTitle>
              <CardDescription>
                {t(
                  "Trollbox:subtitle",
                  "On-chain chat on the BitShares blockchain."
                )}
              </CardDescription>
            </div>
            {probeBadge}
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            {t(
              "Trollbox:intro",
              "Messages are posted on-chain from your account and visible to everyone. The sender pays a small network fee per message, which keeps spam out."
            )}
          </p>
        </CardContent>
      </Card>

      {probe.state === "unsupported" || probe.state === "none" || probe.state === "error" ? (
        <Alert variant="destructive" className="mb-4">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>
            {probe.state === "error"
              ? t("Trollbox:statusError", "Node unreachable")
              : t("Trollbox:statusUnsupported", "Plugin unavailable")}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              {probe.state === "error"
                ? t(
                    "Trollbox:probeError",
                    "The connected node did not answer the plugin probe. Check your connection and retry."
                  )
                : probe.state === "none"
                  ? t(
                      "Trollbox:noSupportedNode",
                      "None of the known nodes run the custom_operations plugin. Try again later, or run your own API node with custom_operations enabled."
                    )
                  : t(
                      "Trollbox:probeUnsupported",
                      "This node does not run the custom_operations plugin, so chat history cannot be read here. Broadcasting still works from any node; switching to a plugin node makes history visible."
                    )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFindNode}
                disabled={finding}
              >
                {finding ? (
                  <Spinner className="mr-1 h-3 w-3" />
                ) : (
                  <Server className="mr-1 h-3 w-3" />
                )}
                {finding
                  ? t("Trollbox:findingNode", "Scanning nodes…")
                  : t("Trollbox:findNode", "Find a supported node")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRefreshNonce((n) => n + 1)}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                {t("Trollbox:retry", "Retry")}
              </Button>
            </div>
            {switchNotice?.kind === "found" ? (
              <p>
                {t("Trollbox:switchedNode", "Switched to {{node}}.", {
                  node: switchNotice.url,
                })}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        value={activeChannel}
        onValueChange={(v) => {
          setActiveChannel(v);
          setMessages([]);
          setMessagesError(null);
        }}
      >
      <Card className="mb-4 relative overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.5)] to-transparent"
        />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
              style={{ ...accent.iconBg, ...accent.iconBorder }}
            >
              <Radio
                className="h-3.5 w-3.5"
                style={isDark ? undefined : accent.iconText}
              />
            </span>
            {t("Trollbox:channelsTitle", "Channels")}
          </CardTitle>
          <CardDescription>
            {t(
              "Trollbox:channelsSubtitle",
              "Pick a channel below. Each channel is its own conversation."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
            <TabsList className="mb-1 flex-wrap h-auto">
              {TROLLBOX_CHANNELS.map((c) => (
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
              {t("Trollbox:viewingTitle", "Viewing the {{tag}} trollbox", {
                tag: `#${activeChannel}`,
              })}
            </CardTitle>
            <div
              className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-border p-0.5"
              role="tablist"
              aria-label={t("Trollbox:filterLabel", "Message filter")}
            >
              <Button
                variant={!showFriends ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setShowFriends(false)}
              >
                {t("Trollbox:filterAll", "All")}
              </Button>
              <Button
                variant={showFriends ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setShowFriends(true)}
              >
                {t("Trollbox:filterFriends", "Friends")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
                {probe.state === "live" ? (
                  <div
                    className="rounded-xl border border-border p-2"
                    style={{ minHeight: TROLLBOX_MIN_ROWS * TROLLBOX_ROW_HEIGHT }}
                  >
                    {loadingMessages && messages.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                        <Spinner className="h-4 w-4" />
                        {t("Trollbox:loading", "Loading messages…")}
                      </div>
                    ) : messagesError ? (
                      <div className="p-4 text-sm">
                        <p className="text-destructive">
                          {t("Trollbox:messagesError", "Couldn't load messages.")}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setRefreshNonce((n) => n + 1)}
                        >
                          {t("Trollbox:retry", "Retry")}
                        </Button>
                      </div>
                    ) : visibleMessages.length === 0 ? (
                      <div className="p-6 text-sm text-muted-foreground text-center">
                        {t(
                          "Trollbox:messagesEmpty",
                          "No messages in {{channel}} yet — be the first.",
                          { channel: activeChannel }
                        )}
                        {hiddenBlockedCount > 0 ? (
                          <span className="mt-1 block text-xs">
                            {t(
                              "Trollbox:hiddenBlocked",
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
                              "Trollbox:hiddenBlocked",
                              "{{count}} hidden from blocked users.",
                              { count: hiddenBlockedCount }
                            )}
                          </p>
                        ) : null}
                        <List
                          rowComponent={TrollboxMessageRow}
                          rowCount={visibleMessages.length}
                          rowHeight={TROLLBOX_ROW_HEIGHT}
                          height={Math.min(
                            Math.max(
                              visibleMessages.length,
                              TROLLBOX_MIN_ROWS
                            ) * TROLLBOX_ROW_HEIGHT,
                            TROLLBOX_MAX_ROWS * TROLLBOX_ROW_HEIGHT
                          )}
                          width="100%"
                          rowProps={messageRowProps}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                    {probe.state === "probing"
                      ? t("Trollbox:statusChecking", "Checking node…")
                      : t(
                          "Trollbox:waitingForNode",
                          "Message history appears once a supported node is selected."
                        )}
                  </div>
                )}
          <div className="mt-3 flex gap-2">
            {pendingAttach ? (
              <Badge
                variant="secondary"
                className="shrink-0 max-w-[220px] h-10 gap-1.5 px-2.5"
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
                  onClick={() => setPendingAttach(null)}
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
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={maxBytes}
              placeholder={
                loggedIn
                  ? t("Trollbox:composerPlaceholder", "Message {{channel}}…", {
                      channel: activeChannel,
                    })
                  : t("Trollbox:composerLogin", "Log in to post on-chain messages.")
              }
              disabled={!loggedIn}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              disabled={!loggedIn || !draft.trim() || verifyingAttach}
              onClick={handleSend}
              title={t("Trollbox:sendTitle", "Prepare a custom operation for signing in Beet")}
            >
              {verifyingAttach ? (
                <Spinner className="mr-1 h-4 w-4" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              {t("Trollbox:send", "Send")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={probe.state !== "live" || loadingMessages}
              onClick={() => setRefreshNonce((n) => n + 1)}
              title={t("Trollbox:refresh", "Refresh")}
              aria-label={t("Trollbox:refresh", "Refresh")}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {composeError ? (
            <p className="mt-2 text-xs text-destructive">{composeError}</p>
          ) : null}
          {channelInfo ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t(
                loggedIn ? "Trollbox:composerHint" : "Trollbox:composerHintLoggedOut",
                loggedIn
                  ? "Posting as {{user}} to {{catalog}}."
                  : "Posting as {{user}} to {{catalog}} would cost a small network fee.",
                {
                  user: (currentUser && currentUser.username) || "not-logged-in",
                  catalog: channelInfo.catalog,
                }
              )}
            </p>
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
                setPendingAttach(null);
                setRefreshNonce((n) => n + 1);
              }}
              key={`trollbox-${activeChannel}-${pendingOp[0].data.slice(0, 32)}`}
              headerText={t("Trollbox:dialogHeader", "Posting to {{channel}} as {{user}}", {
                channel: activeChannel,
                user: currentUser.username,
              })}
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
            onAttach={(picked) => setPendingAttach(picked)}
          />
        </CardContent>
      </Card>
      </Tabs>

      <Dialog
        open={!!openMessage}
        onOpenChange={(open) => {
          if (!open) {
            setOpenMessage(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[50%]">
          {openMessage ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar
                    size={44}
                    name={openMessage.displayAuthor}
                    extra="trollbox-dialog"
                    expression={{ eye: "normal", mouth: "open" }}
                  />
                  <div className="min-w-0">
                    <DialogTitle className="truncate">
                      {openMessage.displayAuthor}
                    </DialogTitle>
                    <DialogDescription className="font-mono">
                      {openMessage.id}
                    </DialogDescription>
                  </div>
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    #{openMessage.channel ?? activeChannel}
                  </Badge>
                </div>
              </DialogHeader>
              <Textarea
                disabled
                readOnly
                value={openMessage.text}
                className="min-h-[120px]"
              />
              {openAttachMeta ? (
                <div className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <AttachTypeIcon
                      type={openAttachMeta.type}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="text-sm font-semibold truncate">
                      {openAttachMeta.label}
                    </span>
                    {openAttachActions.length > 0 ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto h-7 shrink-0"
                          >
                            {t("Trollbox:attachActions", "Actions")}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {openAttachActions.map((a) => (
                            <DropdownMenuItem key={a.key} asChild>
                              <a href={a.href}>{a.label}</a>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {openMessage.account}
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!blockTarget}
        onOpenChange={(open) => {
          if (!open) {
            setBlockTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          {blockTarget ? (
            <>
              <AlertDialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar
                    size={44}
                    name={blockTarget.displayAuthor}
                    extra="trollbox-block"
                    expression={{ eye: "normal", mouth: "open" }}
                  />
                  <div className="min-w-0">
                    <AlertDialogTitle>
                      {t("Trollbox:blockConfirmTitle", "Block this account?")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "Trollbox:blockConfirmDesc",
                        "Are you sure you want to block this account? You won't see their messages anymore."
                      )}
                    </AlertDialogDescription>
                  </div>
                </div>
              </AlertDialogHeader>
              <div className="rounded-md border border-border p-3 text-sm space-y-1">
                <p className="text-foreground">
                  <span className="text-muted-foreground">
                    {t("Trollbox:blockAccountLabel", "Account")}:{" "}
                  </span>
                  <span className="font-semibold">
                    {blockTarget.displayAuthor}
                  </span>
                </p>
                <p className="text-foreground font-mono text-xs">
                  <span className="text-muted-foreground font-sans text-sm">
                    {t("Trollbox:blockIdLabel", "Account ID")}:{" "}
                  </span>
                  {blockTarget.account}
                </p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("Trollbox:blockCancel", "Cancel")}
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmBlock}>
                  {t("Trollbox:blockConfirm", "Block")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
