import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
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
  ItemActions,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Ban,
  MessageSquare,
  Radio,
  Send,
  Server,
  FlaskConical,
  RefreshCw,
  TriangleAlert,
  CircleCheck,
} from "lucide-react";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode, setCurrentNode } from "@/stores/node.ts";
import { $userBlockList, addBlockedUser } from "@/stores/blocklist.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import {
  TROLLBOX_CHANNELS,
  fetchChannelMessages,
  fetchMaxMessageBytes,
  findSupportingNode,
  isPluginMissingError,
  probeTrollboxSupport,
} from "@/nanoeffects/Trollbox.ts";
import {
  TROLLBOX_OP_ID,
  buildMessageKey,
  buildTrollboxData,
  maxMessageBytes,
  utf8Length,
} from "@/bts/serializer/customOperations.js";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import { Avatar } from "@/components/Avatar.tsx";

const POLL_MS = 15000;
const TROLLBOX_ROW_HEIGHT = 76;
const TROLLBOX_MAX_MESSAGES = 100;
const TROLLBOX_MIN_ROWS = 7;
const TROLLBOX_MAX_ROWS = 9;
const TROLLBOX_PREVIEW_CHARS = 140;

function formatTime(ts) {
  if (!ts) {
    return "";
  }
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function truncatePreview(text, max = TROLLBOX_PREVIEW_CHARS) {
  if (!text) {
    return "";
  }
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const TrollboxMessageRow = React.memo(function TrollboxMessageRow({
  index,
  style,
  visibleMessages,
  canBlock,
  currentUserId,
  blockLabel,
  onBlockUser,
  onOpenMessage,
}) {
  const m = visibleMessages[index];
  if (!m) {
    return null;
  }
  return (
    <div style={{ ...style, padding: "0 2px 8px" }}>
      <Item
        variant="outline"
        size="sm"
        className="h-full cursor-pointer overflow-hidden hover:bg-accent/50"
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
          <ItemTitle className="min-w-0">
            <span className="truncate">{m.displayAuthor}</span>
            <span className="text-xs font-normal text-muted-foreground shrink-0">
              {formatTime(m.timestamp)}
            </span>
          </ItemTitle>
          <ItemDescription className="line-clamp-none truncate">
            {truncatePreview(m.text)}
          </ItemDescription>
        </ItemContent>
        {canBlock && m.account !== currentUserId ? (
          <ItemActions>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={blockLabel}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBlockUser(m);
                    }}
                    className="h-6 w-6 shrink-0 rounded-full text-muted-foreground/60 hover:text-destructive"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{blockLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </ItemActions>
        ) : null}
      </Item>
    </div>
  );
});

export default function Trollbox() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentUser = useStore($currentUser);
  const currentNode = useStore($currentNode);

  const chain = (currentUser && currentUser.chain) || "bitshares";
  const nodeUrl = (currentNode && currentNode.url) || "";

  useInitCache(chain, []);

  const [activeChannel, setActiveChannel] = useState("general");
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

  const handleSend = () => {
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
    try {
      const data = buildTrollboxData({
        channel: activeChannel,
        catalog: channelInfo.catalog,
        key: buildMessageKey(),
        username: currentUser.username,
        text,
        timestamp: Date.now(),
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
  const visibleMessages = useMemo(
    () => filteredMessages.slice(-TROLLBOX_MAX_MESSAGES),
    [filteredMessages]
  );
  const hiddenBlockedCount = messages.length - filteredMessages.length;

  const blockLabel = t("Trollbox:blockUser", "Block user");
  const handleOpenMessage = useCallback((m) => {
    setOpenMessage(m);
  }, []);
  const handleBlockUser = useCallback(
    (m) => {
      if (!m || !m.account) {
        return;
      }
      addBlockedUser(chain, { name: m.displayAuthor, id: m.account });
    },
    [chain]
  );
  const messageRowProps = useMemo(
    () => ({
      visibleMessages,
      canBlock: loggedIn,
      currentUserId,
      blockLabel,
      onBlockUser: handleBlockUser,
      onOpenMessage: handleOpenMessage,
    }),
    [
      visibleMessages,
      loggedIn,
      currentUserId,
      blockLabel,
      handleBlockUser,
      handleOpenMessage,
    ]
  );

  return (
    <div className="container mx-auto mt-3 mb-5 px-3 sm:px-4 max-w-5xl">
      <Card className="mb-4 relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xl shadow-black/30">
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
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4" />
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

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("Trollbox:viewingTitle", "Viewing the {{tag}} trollbox", {
              tag: `#${activeChannel}`,
            })}
          </CardTitle>
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
              disabled={!loggedIn || !draft.trim()}
              onClick={handleSend}
              title={t("Trollbox:sendTitle", "Prepare a custom operation for signing in Beet")}
            >
              <Send className="mr-1 h-4 w-4" />
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
        <DialogContent className="sm:max-w-[480px]">
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
                    <DialogDescription>
                      {formatTime(openMessage.timestamp)}
                    </DialogDescription>
                  </div>
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    #{openMessage.channel ?? activeChannel}
                  </Badge>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[50vh] rounded-md border border-border p-3">
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                  {openMessage.text}
                </p>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {openMessage.account}
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
