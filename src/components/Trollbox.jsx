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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Handshake,
  MessageSquare,
  Paperclip,
  Radio,
  Send,
  FlaskConical,
  RefreshCw,
  TriangleAlert,
  CircleCheck,
  X,
} from "lucide-react";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $userBlockList, addBlockedUser } from "@/stores/blocklist.ts";
import {
  $favouriteAssets,
  $favouritePairs,
  addFavouriteAsset,
  addFavouritePair,
  removeFavouriteAsset,
  removeFavouritePair,
} from "@/stores/favourites.ts";
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
  TROLLBOX_LANGS,
  NATIVE_LANG_NAMES,
  CHANNEL_ATTACH_TYPES,
  $trollboxLang,
  fetchChannelMessages,
  fetchMaxMessageBytes,
  fetchRoleAccountIds,
  isPluginMissingError,
  isSupportedTrollboxLang,
  channelAllowsAttach,
  probeTrollboxSupport,
  resolveContentLang,
  trollboxCatalog,
  verifyAttachmentOnChain,
} from "@/nanoeffects/Trollbox.ts";
import {
  attachKind,
  fullObjectId,
  resolveAttachmentMeta,
  validateAttachmentShape,
} from "@/lib/trollboxAttach.js";
import { getTopDonators } from "@/nanoeffects/TopDonators.ts";
import {
  DONATIONS_ASSET_ID,
  DONATIONS_LIMIT,
  DONATIONS_LOOKBACK_DAYS,
  DONATIONS_TARGET_ID,
} from "@/config/donations.ts";
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
import TrollboxRisks from "@/components/TrollboxRisks.jsx";
import { Avatar } from "@/components/Avatar.tsx";
import { getObjects } from "@/nanoeffects/src/common";

const POLL_MS = 15000;
const TROLLBOX_ROW_HEIGHT = 96;
const TROLLBOX_MAX_MESSAGES = 100;
const TROLLBOX_CHANNEL_PARAM = "channel";
const TROLLBOX_LANG_PARAM = "lang";

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

function langFromUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get(
      TROLLBOX_LANG_PARAM
    );
    return isSupportedTrollboxLang(v) ? v : null;
  } catch {
    return null;
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
          : type === "barter"
            ? Handshake
            : Coins;
  return <Icon className={className ?? "h-3 w-3"} />;
}

const ATTACH_ACTION_LABELS = {
  trade: "attachActionTrade",
  borrow: "attachActionBorrow",
  lend: "attachActionLend",
  asset: "attachActionAssetPage",
  limit: "attachActionLimit",
  instant: "attachActionInstant",
  swap: "attachActionSwap",
  stake: "attachActionStake",
  view: "attachActionView",
  proceed: "attachActionProceed",
  favourite: null, // labeled inline (toggle state)
};

function attachActionLabel(t, action) {
  if (action.key === "favourite") {
    return action.label;
  }
  const key = ATTACH_ACTION_LABELS[action.key];
  return key ? t(`Trollbox:${key}`, action.key) : action.key;
}

function buildDonorRankMap(donors) {
  const rank = {};
  if (!Array.isArray(donors)) {
    return rank;
  }
  donors.forEach((d, index) => {
    if (d && typeof d.id === "string" && !(d.id in rank)) {
      rank[d.id] = index + 1;
    }
  });
  return rank;
}

function getDonorBadgeInfo(accountId, donorRank) {
  const rank = donorRank ? donorRank[accountId] : undefined;
  if (!rank) {
    return null;
  }
  if (rank >= 1 && rank <= 3) {
    return { kind: "top", rank };
  }
  return { kind: "donor", rank };
}

function donorMedal(rank) {
  if (rank === 1) {
    return "🥇";
  }
  if (rank === 2) {
    return "🥈";
  }
  if (rank === 3) {
    return "🥉";
  }
  return "";
}

function donorBadgeClassName(rank) {
  const base =
    "inline-flex shrink-0 items-center rounded border px-1.5 py-px text-[10px] font-medium";
  if (rank === 1) {
    return `${base} border-yellow-500/60 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300`;
  }
  if (rank === 2) {
    return `${base} border-slate-400/60 bg-slate-400/15 text-slate-600 dark:text-slate-300`;
  }
  if (rank === 3) {
    return `${base} border-amber-700/60 bg-amber-700/15 text-amber-700 dark:text-amber-400`;
  }
  return `${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`;
}

function donorBadgeDialogClassName(rank) {
  if (rank === 1) {
    return "shrink-0 border-yellow-500/60 bg-yellow-500/15 text-[11px] text-yellow-700 dark:text-yellow-300";
  }
  if (rank === 2) {
    return "shrink-0 border-slate-400/60 bg-slate-400/15 text-[11px] text-slate-600 dark:text-slate-300";
  }
  if (rank === 3) {
    return "shrink-0 border-amber-700/60 bg-amber-700/15 text-[11px] text-amber-700 dark:text-amber-400";
  }
  return "shrink-0 border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400";
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
  roleWitnessIds,
  roleCommitteeIds,
  roleWitnessLabel,
  roleCommitteeLabel,
  donorRank,
  donorLabel,
  topDonorLabel,
  donorTitle,
  topDonorTitle,
  attachMetas,
  attachBadgeLabel,
  onBlockUser,
  onOpenMessage,
}) {
  const m = visibleMessages[index];
  if (!m) {
    return null;
  }
  const isOwn = m.account === currentUserId;
  const attachMeta = attachMetas[m.id] || null;
  const roleLabel = [
    roleWitnessIds.includes(m.account) ? roleWitnessLabel : null,
    roleCommitteeIds.includes(m.account) ? roleCommitteeLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const donorBadge = getDonorBadgeInfo(m.account, donorRank);
  const donorBadgeLabel = donorBadge
    ? donorBadge.kind === "top"
      ? `${donorMedal(donorBadge.rank)} ${
          topDonorTitle
            ? topDonorTitle.replace("{{rank}}", String(donorBadge.rank))
            : `${topDonorLabel} #${donorBadge.rank}`
        }`
      : donorLabel
    : null;
  const donorBadgeTitle = donorBadge
    ? donorBadge.kind === "top"
      ? topDonorTitle
        ? topDonorTitle.replace("{{rank}}", String(donorBadge.rank))
        : `${topDonorLabel} #${donorBadge.rank}`
      : donorTitle || donorLabel
    : null;
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
                {m.account}
              </span>
              <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                {roleLabel ? (
                  <span className="inline-flex shrink-0 items-center rounded border border-border bg-accent/30 px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                    {roleLabel}
                  </span>
                ) : null}
                {donorBadge ? (
                  <span
                    title={donorBadgeTitle}
                    className={donorBadgeClassName(donorBadge.rank)}
                  >
                    {donorBadgeLabel}
                  </span>
                ) : null}
                {attachMeta ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-accent/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                    <AttachTypeIcon type={attachMeta.type} />
                    <span className="max-w-[140px] truncate">{attachBadgeLabel(attachMeta)}</span>
                  </span>
                ) : null}
              </span>
            </ItemTitle>
          <p className="w-full pr-2 text-sm font-normal leading-normal text-muted-foreground line-clamp-2">
            {truncatePreview(m.text)}
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
  const [activeLang, setActiveLang] = useState(() =>
    resolveContentLang(langFromUrl(), locale.get())
  );
  const activeLangRef = useRef(activeLang);
  activeLangRef.current = activeLang;

  // Persist the pick so returning via a bare /trollbox.html link (sidebar)
  // keeps the last language instead of falling back to the app locale.
  // The ?lang= URL param still takes precedence on load (see initializer).
  useEffect(() => {
    try {
      $trollboxLang.set(activeLang);
    } catch {
      // storage unavailable: selection simply won't persist
    }
  }, [activeLang]);
  const activeCatalog = useMemo(
    () => trollboxCatalog(activeChannel, activeLang),
    [activeChannel, activeLang]
  );
  const allowedAttachTypes = CHANNEL_ATTACH_TYPES[activeChannel] ?? [];
  const [draft, setDraft] = useState("");
  const [probe, setProbe] = useState({ state: "probing", node: nodeUrl });
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
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
  const [roleIds, setRoleIds] = useState({ witnesses: [], committee: [] });
  const [donorRank, setDonorRank] = useState({});

  // Active witness / committee account IDs (decorative only; failures
  // silently yield no badges).
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
    () => TROLLBOX_CHANNELS.find((c) => c.id === activeChannel),
    [activeChannel]
  );

  // Drop a staged attachment its channel no longer allows (e.g.
  // leaving #barter) so it can never be posted elsewhere.
  useEffect(() => {
    if (!pendingAttach) {
      return;
    }
    if (!channelAllowsAttach(activeChannel, attachKind(pendingAttach.attach))) {
      setPendingAttach(null);
    }
  }, [activeChannel, pendingAttach]);
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

  // Keep the selected channel + language in the URL so back/forward
  // navigation (and returning to the page) restores them. replaceState
  // avoids spamming history on every switch. CRITICAL: preserve the
  // entry's existing history.state object — ClientRouter stores
  // {index, ...} there and ignores popstate events whose state is null,
  // so replaceState(null) would strand the page content on Back
  // navigation. English omits the lang param (canonical legacy URLs).
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const wantLang = activeLang === "en" ? null : activeLang;
      if (
        url.searchParams.get(TROLLBOX_CHANNEL_PARAM) === activeChannel &&
        url.searchParams.get(TROLLBOX_LANG_PARAM) === wantLang
      ) {
        return;
      }
      url.searchParams.set(TROLLBOX_CHANNEL_PARAM, activeChannel);
      if (wantLang === null) {
        url.searchParams.delete(TROLLBOX_LANG_PARAM);
      } else {
        url.searchParams.set(TROLLBOX_LANG_PARAM, wantLang);
      }
      window.history.replaceState(
        { ...(window.history.state ?? {}), trollboxChannel: activeChannel },
        "",
        url
      );
    } catch {
      // non-browser or restricted context: channel simply isn't shared
    }
  }, [activeChannel, activeLang]);

  useEffect(() => {
    const onPopState = () => {
      const v = channelFromUrl();
      const l = resolveContentLang(langFromUrl(), locale.get());
      if (activeChannelRef.current !== v || activeLangRef.current !== l) {
        setMessages([]);
        setMessagesError(null);
        setActiveChannel(v);
        setActiveLang(l);
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
    fetchChannelMessages(chain, probe.node, activeCatalog)
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
  }, [chain, probe.state, probe.node, channelInfo, activeCatalog, refreshNonce]);

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
      if (!channelAllowsAttach(activeChannel, attachKind(shape))) {
        setComposeError(
          t(
            "Trollbox:attachNotAllowedChannel",
            "This attachment can't be posted in this channel."
          )
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
        catalog: activeCatalog,
        key: buildMessageKey(),
        username: currentUser.username,
        text,
        lang: activeLang,
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
  // Counterparty (message author) is passed so barter actions can link
  // to a prefilled trade with them.
  const attachMetas = useMemo(() => {
    const map = {};
    for (const m of visibleMessages) {
      if (m.attach) {
        const meta = resolveAttachmentMeta(
          m.attach,
          {
            assets: chainAssets,
            pools: chainPools,
          },
          { counterparty: m.account }
        );
        if (meta) {
          map[m.id] = meta;
        }
      }
    }
    return map;
  }, [visibleMessages, chainAssets, chainPools]);

  const attachBadgeLabel = useCallback(
    (meta) =>
      meta.type === "barter"
        ? t("Trollbox:attachTypeBarter", "Barter")
        : meta.label,
    [t]
  );

  const blockLabel = t("Trollbox:blockUser", "Block user");
  const blockSelfLabel = t("Trollbox:blockSelf", "You can't block yourself");
  const ltmLabel = t("Trollbox:ltmMember", "Lifetime member");
  const roleWitnessLabel = t("Trollbox:roleWitnessBadge", "witness");
  const roleCommitteeLabel = t("Trollbox:roleCommitteeBadge", "committee member");
  const donorLabel = t("Trollbox:donorBadge", "donor");
  const topDonorLabel = t("Trollbox:topDonorBadge", "top donor");
  const donorTitle = t("Trollbox:donorBadgeTitle", "Monthly donor");
  const topDonorTitle = t("Trollbox:topDonorBadgeTitle", "Top donor #{{rank}}");
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
      roleWitnessIds: roleIds.witnesses,
      roleCommitteeIds: roleIds.committee,
      roleWitnessLabel,
      roleCommitteeLabel,
      donorRank,
      donorLabel,
      topDonorLabel,
      donorTitle,
      topDonorTitle,
      attachMetas,
      attachBadgeLabel,
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
      roleIds,
      roleWitnessLabel,
      roleCommitteeLabel,
      donorRank,
      donorLabel,
      topDonorLabel,
      donorTitle,
      topDonorTitle,
      attachMetas,
      attachBadgeLabel,
      handleBlockUser,
      handleOpenMessage,
    ]
  );

  const openRoleLabel = useMemo(() => {
    if (!openMessage) {
      return null;
    }
    return [
      roleIds.witnesses.includes(openMessage.account) ? roleWitnessLabel : null,
      roleIds.committee.includes(openMessage.account)
        ? roleCommitteeLabel
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [openMessage, roleIds, roleWitnessLabel, roleCommitteeLabel]);

  const openDonorBadge = useMemo(() => {
    if (!openMessage) {
      return null;
    }
    return getDonorBadgeInfo(openMessage.account, donorRank);
  }, [openMessage, donorRank]);

  const openDonorLabel = useMemo(() => {
    if (!openDonorBadge) {
      return null;
    }
    if (openDonorBadge.kind === "top") {
      return `${donorMedal(openDonorBadge.rank)} ${topDonorTitle.replace(
        "{{rank}}",
        String(openDonorBadge.rank)
      )}`;
    }
    return donorLabel;
  }, [openDonorBadge, donorLabel, topDonorTitle]);

  const openDonorTitle = useMemo(() => {
    if (!openDonorBadge) {
      return null;
    }
    if (openDonorBadge.kind === "top") {
      return topDonorTitle.replace("{{rank}}", String(openDonorBadge.rank));
    }
    return donorTitle;
  }, [openDonorBadge, donorTitle, topDonorTitle]);

  const openAttachMeta = useMemo(() => {
    if (!openMessage || !openMessage.attach) {
      return null;
    }
    return resolveAttachmentMeta(
      openMessage.attach,
      {
        assets: chainAssets,
        pools: chainPools,
      },
      { counterparty: openMessage.account }
    );
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

  // Escrow agent display name for an opened barter attachment (display
  // only; identity is always the stored 1.2.x id). Resolved live; falls
  // back to the raw id while loading or when the lookup fails.
  const [escrowAgentName, setEscrowAgentName] = useState(null);
  // $currentNode rehydrates after first render and may belong to the other
  // chain — never look an account up on a mismatched node (null falls back
  // to this chain's default node inside getObjects).
  const escrowNodeUrl =
    currentNode && currentNode.chain === chain && currentNode.url
      ? currentNode.url
      : null;
  useEffect(() => {
    setEscrowAgentName(null);
    const escrowId = openAttachMeta?.details?.escrow?.account;
    if (!openMessage || openAttachMeta?.type !== "barter" || !escrowId) {
      return undefined;
    }
    let cancelled = false;
    getObjects(chain, [escrowId], escrowNodeUrl)
      .then((accounts) => {
        if (cancelled) {
          return;
        }
        const found = (accounts || []).find((a) => a && a.id === escrowId);
        if (found && typeof found.name === "string" && found.name) {
          setEscrowAgentName(found.name);
        }
      })
      .catch(() => {
        // keep raw id fallback
      });
    return () => {
      cancelled = true;
    };
  }, [openMessage, openAttachMeta, chain, escrowNodeUrl]);

  const favouriteAssets = useStore($favouriteAssets);
  const favouritePairs = useStore($favouritePairs);

  const openAttachActions = (() => {
    if (
      !openAttachMeta ||
      !openMessage ||
      !openMessage.attach ||
      (openAttachMeta.type === "offer" &&
        offerVerified !== openMessage.attach.id)
    ) {
      return [];
    }
    const actions = [...openAttachMeta.actions];
    const attach = openMessage.attach;
    if (openAttachMeta.type === "asset") {
      const fullId = fullObjectId(3, attach.id);
      const asset = chainAssets.find((a) => a && a.id === fullId);
      const isFav = ((favouriteAssets && favouriteAssets[chain]) || []).some(
        (a) => a.id === fullId
      );
      actions.push({
        key: "favourite",
        label: isFav
          ? t("Trollbox:unfavourite", "Unfavourite")
          : t("Trollbox:favourite", "Favourite"),
        onSelect: () => {
          const entry = {
            symbol: asset ? asset.symbol : fullId,
            id: fullId,
            issuer: (asset && asset.issuer) || "",
          };
          if (isFav) {
            removeFavouriteAsset(chain, entry);
          } else {
            addFavouriteAsset(chain, entry);
          }
        },
      });
    }
    if (openAttachMeta.type === "pair") {
      const aSym = chainAssets.find(
        (a) => a && a.id === fullObjectId(3, attach.a)
      )?.symbol;
      const bSym = chainAssets.find(
        (a) => a && a.id === fullObjectId(3, attach.b)
      )?.symbol;
      if (aSym && bSym) {
        const pairKey = `${aSym}_${bSym}`.toUpperCase();
        const isFav = ((favouritePairs && favouritePairs[chain]) || []).includes(
          pairKey
        );
        actions.push({
          key: "favourite",
          label: isFav
            ? t("Trollbox:unfavourite", "Unfavourite")
            : t("Trollbox:favourite", "Favourite"),
          onSelect: () => {
            if (isFav) {
              removeFavouritePair(chain, pairKey);
            } else {
              addFavouritePair(chain, pairKey);
            }
          },
        });
      }
    }
    return actions;
  })();

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
                      "This node does not run the custom_operations plugin, so chat history cannot be read here. Broadcasting still works from any node; choose a node with the plugin enabled in node settings to read history."
                    )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.assign("/nodes.html")}
              >
                {t("Trollbox:changeNode", "Go to node settings")}
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
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base flex-1 min-w-0">
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
                style={{ ...accent.iconBg, ...accent.iconBorder }}
              >
                <Radio
                  className="h-3.5 w-3.5"
                  style={isDark ? undefined : accent.iconText}
                />
              </span>
              <span className="truncate">
                {t("Trollbox:channelsTitle", "Channels")}
              </span>
            </CardTitle>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Label
                htmlFor="trollbox-language"
                className="text-xs text-muted-foreground"
              >
                {t("Trollbox:languageLabel", "Language")}
              </Label>
              <Select
                value={activeLang}
                onValueChange={(v) => {
                  if (!isSupportedTrollboxLang(v) || v === activeLang) {
                    return;
                  }
                  setMessages([]);
                  setMessagesError(null);
                  setActiveLang(v);
                }}
              >
                <SelectTrigger id="trollbox-language" className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  {TROLLBOX_LANGS.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {NATIVE_LANG_NAMES[lang] ?? lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
                className="shrink-0 max-w-[320px] h-10 gap-1.5 px-2.5 cursor-pointer hover:bg-accent/60"
                role="button"
                tabIndex={0}
                title={t(
                  "Trollbox:attachAttachedTitle",
                  "Attached {{type}}: {{label}}",
                  {
                    type: attachKind(pendingAttach.attach) ?? "item",
                    label: pendingAttach.label,
                  }
                )}
                onClick={() => {
                  if (
                    attachKind(pendingAttach.attach) === "barter" &&
                    activeChannel === "barter"
                  ) {
                    setAttachOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    (e.key === "Enter" || e.key === " ") &&
                    attachKind(pendingAttach.attach) === "barter" &&
                    activeChannel === "barter"
                  ) {
                    e.preventDefault();
                    setAttachOpen(true);
                  }
                }}
              >
                {attachKind(pendingAttach.attach) === "barter" ? (
                  <>
                    <Handshake className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs font-semibold">
                      {t("Trollbox:attachChipOffer", "Have")}:{" "}
                      {(pendingAttach.attach.offer || []).length}
                    </span>
                    <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs font-semibold">
                      {t("Trollbox:attachChipWant", "Want")}:{" "}
                      {(pendingAttach.attach.want || []).length}
                    </span>
                  </>
                ) : (
                  <>
                    <AttachTypeIcon
                      type={attachKind(pendingAttach.attach) ?? "asset"}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="truncate text-xs">{pendingAttach.label}</span>
                  </>
                )}
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
            ) : allowedAttachTypes.length > 0 ? (
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
            ) : null}
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
                  catalog: activeCatalog,
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
              key={`trollbox-${activeChannel}-${activeLang}-${pendingOp[0].data.slice(0, 32)}`}
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
            allowedTypes={allowedAttachTypes}
            initialValue={pendingAttach}
            onAttach={(picked) => setPendingAttach(picked)}
          />
        </CardContent>
      </Card>
      </Tabs>

      <TrollboxRisks />

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
                      {openMessage.account}
                    </DialogDescription>
                  </div>
                  <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {openRoleLabel ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[11px]"
                      >
                        {openRoleLabel}
                      </Badge>
                    ) : null}
                    {openDonorBadge ? (
                      <Badge
                        variant="outline"
                        title={openDonorTitle}
                        className={donorBadgeDialogClassName(openDonorBadge.rank)}
                      >
                        {openDonorLabel}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="shrink-0">
                      #{openMessage.channel ?? activeChannel}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>
              <Textarea
                disabled
                readOnly
                value={openMessage.text}
                className="min-h-[120px]"
              />
              {openAttachMeta ? (
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AttachTypeIcon
                      type={openAttachMeta.type}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="text-sm font-semibold truncate">
                      {attachBadgeLabel(openAttachMeta)}
                    </span>
                    {openAttachActions.length > 0 ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto h-7 shrink-0 hover:bg-accent/60"
                          >
                            {t("Trollbox:attachActions", "Actions")}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {openAttachActions.map((a) =>
                            a.href ? (
                              <DropdownMenuItem key={a.key} asChild>
                                <a href={a.href}>
                                  {attachActionLabel(t, a)}
                                </a>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                key={a.key}
                                onSelect={() => a.onSelect && a.onSelect()}
                              >
                                {attachActionLabel(t, a)}
                              </DropdownMenuItem>
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                  {openAttachMeta.type === "barter" &&
                  openAttachMeta.details ? (
                    <div className="text-xs space-y-1.5">
                      <div>
                        <p className="font-semibold text-foreground/80">
                          {t("Trollbox:barterTheirOffer", "They offer")}
                        </p>
                        {openAttachMeta.details.offer.map((l, i) => (
                          <p key={i} className="font-mono text-muted-foreground">
                            {l.amount} {l.symbol} ({l.id ?? `1.3.${l.instance}`})
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground/80">
                          {t("Trollbox:barterTheirWant", "They want")}
                        </p>
                        {openAttachMeta.details.want.map((l, i) => (
                          <p key={i} className="font-mono text-muted-foreground">
                            {l.amount} {l.symbol} ({l.id ?? `1.3.${l.instance}`})
                          </p>
                        ))}
                      </div>
                      {openAttachMeta.details.escrow ? (
                        <p className="text-muted-foreground">
                          {t("Trollbox:barterEscrowLine", "Escrow {{account}} · fee {{fee}} BTS · {{first}} sends first", {
                            account: escrowAgentName
                              ? `${escrowAgentName} (${openAttachMeta.details.escrow.account})`
                              : openAttachMeta.details.escrow.account,
                            fee: openAttachMeta.details.escrow.fee,
                            first:
                              openAttachMeta.details.escrow.first === "me"
                                ? t("Trollbox:barterCreatorFirst", "Poster")
                                : t("Trollbox:barterCounterpartyFirst", "Counterparty"),
                          })}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                  {openMessage.id}
                </p>
                {loggedIn && openMessage.account !== currentUserId ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="ml-auto shrink-0"
                    >
                      <a
                        href={`/transfer.html?to=${encodeURIComponent(
                          openMessage.displayAuthor
                        )}`}
                      >
                        <HandCoins className="mr-1 h-3.5 w-3.5" />
                        {t("Trollbox:tipUser", "Tip user")}
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setBlockTarget({
                          account: openMessage.account,
                          displayAuthor: openMessage.displayAuthor,
                        });
                        setOpenMessage(null);
                      }}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" />
                      {t("Trollbox:blockUser", "Block user")}
                    </Button>
                  </>
                ) : null}
              </div>
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
