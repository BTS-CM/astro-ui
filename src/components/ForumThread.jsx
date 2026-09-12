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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  ArrowLeft,
  ArrowLeftRight,
  Ban,
  CircleCheck,
  Coins,
  Droplets,
  Eye,
  EyeOff,
  FlaskConical,
  HandCoins,
  Handshake,
  MessageSquare,
  Paperclip,
  Quote,
  RefreshCw,
  Send,
  Trash2,
  TriangleAlert,
  X,
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
  verifyAttachmentOnChain,
} from "@/nanoeffects/Trollbox.ts";
import {
  fetchThreadReplies,
  findForumTopic,
} from "@/nanoeffects/Forum.ts";
import {
  attachmentNoun,
  forumChannelCatalog,
  forumTopicCatalog,
  isThreadKey,
  verifyThreadCatalog,
} from "@/lib/forumPost.js";
import {
  attachKind,
  fullObjectId,
  resolveAttachmentMeta,
  validateAttachmentShape,
} from "@/lib/trollboxAttach.js";
import {
  FORUM_OP_ID,
  buildForumReplyData,
  buildMessageKey,
  maxMessageBytes,
  utf8Length,
} from "@/bts/serializer/customOperations.js";
import { buildRemoveOp } from "@/lib/customRemove.js";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import TrollboxRisks from "@/components/TrollboxRisks.jsx";
import TrollboxAttachDialog from "@/components/TrollboxAttachDialog.jsx";
import {
  $favouriteAssets,
  $favouritePairs,
  addFavouriteAsset,
  addFavouritePair,
  removeFavouriteAsset,
  removeFavouritePair,
} from "@/stores/favourites.ts";
import { getObjects } from "@/nanoeffects/src/common";
import ForumMarkdown from "@/components/ForumMarkdown.jsx";
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
  donorBadgeDialogClassName,
  donorBadgeText,
} from "@/lib/donorBadge.js";
import {
  $watchedForumTopics,
  markForumTopicViewed,
  unwatchForumTopic,
  watchForumTopic,
} from "@/stores/forum.ts";

const POLL_MS = 15000;
const REPLY_PAGE_SIZE = 50;

// Unlike the trollbox, every attachment kind is allowed everywhere.
// One attachment per topic/reply, enforced by the shape.
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
};

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

function ReplyBody({ text, dark }) {
  return (
    <div className="min-w-0">
      <ForumMarkdown text={text} dark={dark} />
    </div>
  );
}

function TipButton({ account, displayAuthor, currentUserId, loggedIn, t }) {
  if (!loggedIn || !account || account === currentUserId) {
    return null;
  }
  return (
    <Button variant="outline" size="sm" asChild className="h-7 shrink-0 text-[11px] hover:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:border-[hsl(var(--accent-1)/0.4)]">
      <a href={`/transfer.html?to=${encodeURIComponent(displayAuthor || account)}`}>
        <HandCoins className="mr-1 h-3 w-3" />
        {t("Trollbox:tipUser", "Tip user")}
      </a>
    </Button>
  );
}

export default function ForumThread(properties) {
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
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removePendingOp, setRemovePendingOp] = useState(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingAttach, setPendingAttach] = useState(null); // {attach, label}
  const [verifyingAttach, setVerifyingAttach] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);
  const [offerVerifiedIds, setOfferVerifiedIds] = useState([]);
  const [escrowNames, setEscrowNames] = useState({});
  const [maxBytes, setMaxBytes] = useState(() => maxMessageBytes());
  const [roleIds, setRoleIds] = useState({ witnesses: [], committee: [] });
  const [donorRank, setDonorRank] = useState({});

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
          threadKey,
          undefined,
          ccParam
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
        if (ccParam && !verifyThreadCatalog(found.account, found.key, ccParam)) {
          // URL asked for a different thread catalog than the topic's
          // (account, key) reproduces — hide rather than cross-wire.
          setTopic(null);
          setHashMismatch(true);
          setLoading(false);
          return;
        }
        setTopic(found);
        const list = await fetchThreadReplies(chain, probe.node, derivedCc);
        if (!cancelled) {
          setReplies(list);
          setLoading(false);
          // Viewed = actually opened the thread (never the list). The
          // last-reply cursor doubles as C2's unread baseline.
          markForumTopicViewed(chain, {
            channel,
            key: found.key,
            topicId: found.id,
            lastReplyId: list.length ? list[list.length - 1].id : null,
            at: Date.now(),
          });
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

  const watchedForumTopics = useStore($watchedForumTopics);
  const isWatched =
    !!topic &&
    ((watchedForumTopics && watchedForumTopics[chain]) || []).some(
      (w) => w.channel === channel && w.key === topic.key
    );
  const handleToggleWatch = useCallback(() => {
    if (!topic || !loggedIn) {
      return;
    }
    if (isWatched) {
      unwatchForumTopic(chain, channel, topic.key);
    } else {
      watchForumTopic(chain, {
        channel,
        key: topic.key,
        account: topic.account,
        title: topic.title,
        at: Date.now(),
      });
    }
  }, [topic, loggedIn, isWatched, chain, channel]);

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

  // Resolve attachments to display metadata using trusted lists only.
  // Unresolvable attachments render no block (never raw payload).
  const attachMetas = useMemo(() => {
    const map = {};
    const posts = [...(topic ? [topic] : []), ...replies];
    for (const post of posts) {
      if (post.attach) {
        const meta = resolveAttachmentMeta(
          post.attach,
          { assets: chainAssets, pools: chainPools },
          { counterparty: post.account }
        );
        if (meta) {
          map[post.id] = meta;
        }
      }
    }
    return map;
  }, [topic, replies, chainAssets, chainPools]);

  const attachBadgeLabel = useCallback(
    (meta) =>
      meta.type === "barter"
        ? t("Trollbox:attachTypeBarter", "Barter")
        : meta.label,
    [t]
  );

  // Live-verify offer attachments (they expire); verified ids gate the
  // action links so dead offers never render clickable.
  useEffect(() => {
    let cancelled = false;
    const offers = [];
    const posts = [...(topic ? [topic] : []), ...replies];
    for (const post of posts) {
      if (post.attach && attachKind(post.attach) === "offer") {
        offers.push(post.attach.id);
      }
    }
    const unique = [...new Set(offers)];
    if (unique.length === 0 || probe.state !== "live") {
      return undefined;
    }
    (async () => {
      const okIds = [];
      for (const id of unique) {
        try {
          const ok = await verifyAttachmentOnChain(chain, probe.node, {
            t: 21,
            id,
          });
          if (ok) {
            okIds.push(id);
          }
        } catch {
          // verification failure hides the actions ( fail closed )
        }
        if (cancelled) {
          return;
        }
      }
      if (!cancelled) {
        setOfferVerifiedIds(okIds);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topic, replies, chain, probe.state, probe.node]);

  // Escrow agent display names for barter attachments (display only).
  const escrowNodeUrl =
    currentNode && currentNode.chain === chain && currentNode.url
      ? currentNode.url
      : null;
  useEffect(() => {
    let cancelled = false;
    const ids = new Set();
    for (const key of Object.keys(attachMetas)) {
      const meta = attachMetas[key];
      const account = meta?.details?.escrow?.account;
      if (meta?.type === "barter" && typeof account === "string") {
        ids.add(account);
      }
    }
    if (ids.size === 0) {
      return undefined;
    }
    getObjects(chain, [...ids], escrowNodeUrl)
      .then((accounts) => {
        if (cancelled) {
          return;
        }
        const names = {};
        for (const a of accounts || []) {
          if (a?.id && typeof a?.name === "string" && a.name) {
            names[a.id] = a.name;
          }
        }
        setEscrowNames(names);
      })
      .catch(() => {
        // keep raw id fallback
      });
    return () => {
      cancelled = true;
    };
  }, [attachMetas, chain, escrowNodeUrl]);

  const favouriteAssets = useStore($favouriteAssets);
  const favouritePairs = useStore($favouritePairs);

  /**
   * Action links for a resolved attachment (trade/borrow/lend/swap/stake/
   * view/proceed), plus favourite toggles for asset/pair kinds. Offer
   * actions render only after live verification (caller gates).
   */
  const attachActionsFor = useCallback(
    (post, meta) => {
      const actions = [...meta.actions];
      const attach = post.attach;
      if (meta.type === "asset") {
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
      if (meta.type === "pair") {
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
    },
    [chainAssets, favouriteAssets, favouritePairs, chain, t]
  );

  const attachActionLabel = useCallback(
    (action) => {
      if (action.key === "favourite") {
        return action.label;
      }
      const key = ATTACH_ACTION_LABELS[action.key];
      return key ? t(`Trollbox:${key}`, action.key) : action.key;
    },
    [t]
  );

  /**
   * Attachment details for the card footer: resolved label plus barter
   * legs. Sized to its content (never full width) and truncating — the
   * footer caps it so actions always stay visible. Renders nothing when
   * the attachment fails to resolve (never raw payload).
   */
  const renderAttachDetails = (post) => {
    if (!post || !post.attach) {
      return null;
    }
    const meta = attachMetas[post.id];
    if (!meta) {
      return null;
    }
    if (meta.type === "offer" && !offerVerifiedIds.includes(post.attach.id)) {
      return (
        <span className="inline-flex min-w-0 max-w-[60%] shrink items-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.08)] px-2.5 py-1.5 text-xs text-muted-foreground truncate">
          {t(
            "Forum:attachOfferStale",
            "Attached offer {{label}} is no longer available on-chain.",
            { label: meta.label }
          )}
        </span>
      );
    }
    return (
      <span
        className="inline-flex min-w-0 max-w-[60%] shrink flex-col justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.08)] px-2.5 py-1.5"
        title={t("Forum:attachHoverTitle", "{{user}} has attached this {{item}} to their post.", {
          user: post.displayAuthor || post.account,
          item: t(
            `Forum:attachNoun${meta.type[0].toUpperCase()}${meta.type.slice(1)}`,
            attachmentNoun(meta.type)
          ),
        })}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <AttachTypeIcon type={meta.type} className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs font-semibold">
            {meta.type === "barter" ? t("Trollbox:attachTypeBarter", "Barter") : meta.label}
          </span>
        </span>
        {meta.type === "barter" && meta.details ? (
          <span className="mt-1 block min-w-0 text-[11px] leading-snug">
            <span className="block truncate font-semibold text-foreground/80">
              {t("Trollbox:barterTheirOffer", "They offer")}:{" "}
              <span className="font-mono font-normal text-muted-foreground">
                {meta.details.offer.map((l) => `${l.amount} ${l.symbol}`).join(" · ")}
              </span>
            </span>
            <span className="block truncate font-semibold text-foreground/80">
              {t("Trollbox:barterTheirWant", "They want")}:{" "}
              <span className="font-mono font-normal text-muted-foreground">
                {meta.details.want.map((l) => `${l.amount} ${l.symbol}`).join(" · ")}
              </span>
            </span>
            {meta.details.escrow ? (
              <span className="block truncate text-muted-foreground">
                {t("Trollbox:barterEscrowLine", "Escrow {{account}} · fee {{fee}} BTS · {{first}} sends first", {
                  account: escrowNames[meta.details.escrow.account]
                    ? `${escrowNames[meta.details.escrow.account]} (${meta.details.escrow.account})`
                    : meta.details.escrow.account,
                  fee: meta.details.escrow.fee,
                  first:
                    meta.details.escrow.first === "me"
                      ? t("Trollbox:barterCreatorFirst", "Poster")
                      : t("Trollbox:barterCounterpartyFirst", "Counterparty"),
                })}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    );
  };

  /**
   * Trollbox-style attachment actions dropdown for the card footer:
   * outline "Actions" trigger, links vs callbacks per action. Offer
   * actions render only after live verification.
   */
  const renderAttachDropdown = (post) => {
    if (!post || !post.attach) {
      return null;
    }
    const meta = attachMetas[post.id];
    if (!meta) {
      return null;
    }
    if (meta.type === "offer" && !offerVerifiedIds.includes(post.attach.id)) {
      return null;
    }
    const actions = attachActionsFor(post, meta);
    if (actions.length === 0) {
      return null;
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.4)] text-[11px]"
            title={t("Forum:attachActionsTitle", "Attached {{item}} actions", {
              item: t(
                `Forum:attachNoun${meta.type[0].toUpperCase()}${meta.type.slice(1)}`,
                attachmentNoun(meta.type)
              ),
            })}
          >
            <AttachTypeIcon type={meta.type} className="mr-1 h-3 w-3" />
            {t("Trollbox:attachActions", "Actions")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {actions.map((action) =>
            action.href ? (
              <DropdownMenuItem key={action.key} asChild>
                <a href={action.href}>{attachActionLabel(action)}</a>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={action.key}
                onSelect={() => action.onSelect && action.onSelect()}
              >
                {attachActionLabel(action)}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

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
      const data = buildForumReplyData({
        catalog: threadCatalog,
        key: buildMessageKey(),
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
  const handleConfirmRemove = useCallback(() => {
    if (!removeTarget || !currentUser || !currentUser.id) {
      return;
    }
    if (removeTarget.account && removeTarget.account !== currentUser.id) {
      return;
    }
    try {
      const op = buildRemoveOp({
        payer: currentUser.id,
        catalog: removeTarget.catalog,
        key: removeTarget.key,
        opId: FORUM_OP_ID,
      });
      setRemovePendingOp(op);
      setShowRemoveDialog(true);
      setRemoveTarget(null);
    } catch (error) {
      setComposeError(error?.message ?? String(error));
      setRemoveTarget(null);
    }
  }, [removeTarget, currentUser]);

  const blockLabel = t("Forum:blockUser", "Block user");
  const blockSelfLabel = t("Forum:blockSelf", "You can't block yourself");
  const roleWitnessLabel = t("Forum:roleWitnessBadge", "witness");
  const roleCommitteeLabel = t("Forum:roleCommitteeBadge", "committee member");
  const donorLabel = t("Forum:donorBadge", "donor");
  const topDonorLabel = t("Forum:topDonorBadge", "top donor");
  const donorTitle = t("Forum:donorBadgeTitle", "Monthly donor");
  const topDonorTitle = t("Forum:topDonorBadgeTitle", "Top donor #{{rank}}");

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

  const donorBadge = (account, dialog) => {
    const info = donorBadgeText(account, donorRank, {
      donorLabel,
      topDonorLabel,
      donorTitle,
      topDonorTitle,
    });
    if (!info) {
      return null;
    }
    return (
      <span
        title={info.title}
        className={
          dialog
            ? donorBadgeDialogClassName(info.badge.rank)
            : donorBadgeClassName(info.badge.rank)
        }
      >
        {info.label}
      </span>
    );
  };

  const replyCard = (reply) => {
    const own = reply.account === currentUserId;
    return (
      <Card
        key={reply.id}
        className={`overflow-hidden bg-card${
          own
            ? " border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-b from-[hsl(var(--accent-1)/0.1)] to-transparent"
            : " border-[hsl(var(--accent-1)/0.15)]"
        }`}
      >
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-r from-[hsl(var(--accent-1)/0.08)] to-transparent p-3">
          <span className="shrink-0 rounded-full ring-2 ring-[hsl(var(--accent-1)/0.4)] ring-offset-2 ring-offset-background">
            <Avatar
              size={28}
              name={reply.displayAuthor}
              extra={`forum-reply-${reply.id}`}
              expression={{ eye: "normal", mouth: "open" }}
            />
          </span>
          <span className="truncate text-sm font-medium">{reply.displayAuthor}</span>
          <span className="text-xs font-normal text-muted-foreground shrink-0">
            {reply.account}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {roleBadge(reply.account)}
            {donorBadge(reply.account, true)}
          </span>
        </CardHeader>
        <CardContent className="p-3">
          <ReplyBody text={reply.text} dark={isDark} />
        </CardContent>
        <CardFooter className="flex items-center gap-1.5 border-t border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.06)] p-2.5">
          {renderAttachDetails(reply)}
          {renderAttachDropdown(reply)}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 text-[11px] hover:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]"
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
              <TipButton
                account={reply.account}
                displayAuthor={reply.displayAuthor}
                currentUserId={currentUserId}
                loggedIn={loggedIn}
                t={t}
              />
            )}
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
            {own && threadCatalog ? (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
                      disabled={!loggedIn}
                      onClick={() =>
                        setRemoveTarget({
                          catalog: threadCatalog,
                          key: reply.key,
                          label: reply.text?.slice(0, 80) ?? reply.key,
                          account: reply.account,
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{t("Forum:removeReply", "Remove")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </span>
        </CardFooter>
      </Card>
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
              "No topic with this id was found in this channel — check the link, or try a node with the plugin enabled."
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
            <Card className="relative overflow-hidden border-[hsl(var(--accent-1)/0.4)] bg-card bg-gradient-to-b from-[hsl(var(--accent-1)/0.07)] to-transparent">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
              />
              <CardHeader className="relative flex flex-row items-center gap-2 space-y-0 border-b border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-r from-[hsl(var(--accent-1)/0.1)] to-transparent p-4">
                <span className="shrink-0 rounded-full ring-2 ring-[hsl(var(--accent-1)/0.45)] ring-offset-2 ring-offset-background">
                  <Avatar
                    size={32}
                    name={topic.displayAuthor}
                    extra={`forum-op-${topic.id}`}
                    expression={{ eye: "normal", mouth: "open" }}
                  />
                </span>
                <span className="truncate text-sm font-medium">
                  {topic.displayAuthor}
                </span>
                <span className="text-xs font-normal text-muted-foreground shrink-0">
                  {topic.account}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  {roleBadge(topic.account)}
                  {donorBadge(topic.account, true)}
                </span>
              </CardHeader>
              <CardContent className="relative p-4">
                <ForumMarkdown text={topic.text} dark={isDark} />
              </CardContent>
              <CardFooter className="relative flex items-center gap-1.5 border-t border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.06)] p-2.5">
                {renderAttachDetails(topic)}
                {renderAttachDropdown(topic)}
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  <TipButton
                    account={topic.account}
                    displayAuthor={topic.displayAuthor}
                    currentUserId={currentUserId}
                    loggedIn={loggedIn}
                    t={t}
                  />
                  {topic.account === currentUserId ? null : (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                            disabled={!loggedIn}
                            onClick={handleToggleWatch}
                            title={
                              isWatched
                                ? t("Forum:unwatch", "Unwatch")
                                : t("Forum:watch", "Watch")
                            }
                          >
                            {isWatched ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>
                            {isWatched
                              ? t("Forum:unwatch", "Unwatch")
                              : t("Forum:watch", "Watch")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
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
                  {loggedIn && topic.account === currentUserId ? (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setRemoveTarget({
                                catalog: topic.catalog,
                                key: topic.key,
                                label: topic.title,
                                account: topic.account,
                              })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{t("Forum:removeTopic", "Remove")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </span>
              </CardFooter>
            </Card>
          ) : null}

          {hiddenBlockedCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t(
                "Forum:hiddenBlocked",
                "{{count}} hidden from your view.",
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
                className="hover:border-[hsl(var(--accent-1)/0.4)] hover:bg-[hsl(var(--accent-1)/0.08)]"
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
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl"
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
              <ForumEditor
                value={draft}
                onChange={setDraft}
                dark={isDark}
                disabled={!loggedIn}
                placeholder={
                  loggedIn
                    ? t("Forum:replyPlaceholder", "Write your reply… (optional “> quoted” lines on top)")
                    : t("Forum:composerLogin", "Log in to post on-chain replies.")
                }
              />
              <div className="mt-2 flex items-center gap-2">
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
                  onClick={handleReply}
                  disabled={!loggedIn || !draft.trim() || verifyingAttach}
                  size="sm"
                  className="shadow-[0_0_14px_-4px_hsl(var(--accent-1)/0.6)]"
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
            setPendingAttach(null);
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

      <TrollboxRisks page="forum" />

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

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Forum:removeConfirmTitle", "Remove this post?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Forum:removeConfirmDesc",
                "This removes the post from the custom_operations plugin catalogue so apps stop listing it. It does NOT remove the data from the blockchain — block history still contains it."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removeTarget ? (
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <p className="text-foreground font-mono text-xs">
                {removeTarget.catalog} / {removeTarget.key}
              </p>
              {removeTarget.label ? (
                <p className="text-muted-foreground truncate">{removeTarget.label}</p>
              ) : null}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Forum:removeCancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>
              {t("Forum:removeContinue", "Continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showRemoveDialog && removePendingOp && loggedIn ? (
        <DeepLinkDialog
          operationNames={["custom"]}
          username={currentUser.username}
          usrChain={chain}
          userID={currentUser.id}
          dismissCallback={() => {
            setShowRemoveDialog(false);
            setRemovePendingOp(null);
            setRefreshNonce((n) => n + 1);
          }}
          key={`forum-remove-${removePendingOp[0].data.slice(0, 32)}`}
          headerText={t("Forum:removeDialogHeader", "Removing post as {{user}}", {
            user: currentUser.username,
          })}
          trxJSON={removePendingOp}
        />
      ) : null}
    </div>
  );
}
