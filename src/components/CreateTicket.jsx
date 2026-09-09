import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Ticket, Lock, Send, Zap, ThumbsUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { humanReadableFloat, blockchainFloat } from "@/lib/common.js";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import ChainTypes from "@/bts/chain/ChainTypes.js";
import { createUserTicketsStore } from "@/nanoeffects/UserTickets.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createAssetFromSymbolStore } from "@/nanoeffects/Assets.ts";
import { accountSearch } from "@/nanoeffects/UserSearch.ts";

const THUMBSUP_FALLBACK = { id: "1.3.6623", precision: 5, symbol: "THUMBSUP.1" };
const THUMBSUP_ISSUER_NAME = "abit";

export default function CreateTicket() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );

  // UI state
  const [lockType, setLockType] = useState("lock_180_days");
  const [amount, setAmount] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newType, setNewType] = useState("lock_180_days");
  const [updateAmount, setUpdateAmount] = useState(""); // optional amount_for_new_target
  const [showUpdateDeepLink, setShowUpdateDeepLink] = useState(false);
  const [pendingUpdateOp, setPendingUpdateOp] = useState(null);

  // Request THUMBSUP.1 state (bitshares mainnet only, sender is `abit`)
  const isMainnet = chain === "bitshares";
  const [userBalances, setUserBalances] = useState([]);
  const [thumbsupAsset, setThumbsupAsset] = useState(null);
  const [abitAccount, setAbitAccount] = useState(null);
  const [requestAmount, setRequestAmount] = useState("");
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  // Derived boost factor based on lock type
  const boostFactor = useMemo(() => {
    switch (lockType) {
      case "lock_180_days":
        return 2;
      case "lock_360_days":
        return 4;
      case "lock_720_days":
        return 8;
      case "lock_forever":
        return 8; // same as 720d according to reference snippet
      default:
        return 1;
    }
  }, [lockType]);

  // Equivalent voting power displayed to user
  const equivalent = useMemo(() => {
    const n = parseFloat(amount || 0);
    if (Number.isNaN(n)) return 0;
    return n * boostFactor;
  }, [amount, boostFactor]);

  // Map to ticket_type enum value
  const targetType = useMemo(() => {
    switch (lockType) {
      case "lock_180_days":
        return ChainTypes.ticket_type.lock_180_days;
      case "lock_360_days":
        return ChainTypes.ticket_type.lock_360_days;
      case "lock_720_days":
        return ChainTypes.ticket_type.lock_720_days;
      default:
        return ChainTypes.ticket_type.liquid;
    }
  }, [lockType]);

  // Note: We intentionally omit the general tickets listing here.
  // This component focuses on the current user's tickets only.

  // User-specific tickets and tallies
  const [userTickets, setUserTickets] = useState([]);
  useEffect(() => {
    async function fetchUserTickets() {
      if (
        usr &&
        usr.id &&
        (chain === "bitshares" || chain === "bitshares_testnet")
      ) {
        const store = createUserTicketsStore([
          chain,
          usr.id,
          currentNode ? currentNode.url : null,
          0,
          8, // pages to fetch for better coverage
        ]);
        store.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setUserTickets(data);
          }
        });
      }
    }

    fetchUserTickets();
  }, [usr, chain, currentNode]);

  // Track user's BTS + THUMBSUP.1 balances (used to cap the request amount)
  useEffect(() => {
    if (!usr || !usr.id) {
      setUserBalances([]);
      return;
    }
    const store = createUserBalancesStore([
      chain,
      usr.id,
      currentNode ? currentNode.url : null,
    ]);
    const unsub = store.subscribe(({ data, error, loading }) => {
      if (data && !error && !loading) {
        setUserBalances(data);
      }
    });
    return unsub;
  }, [usr, chain, currentNode]);

  // Resolve THUMBSUP.1 asset details (live precision/id, fallback to known values)
  useEffect(() => {
    if (!isMainnet) {
      setThumbsupAsset(null);
      return;
    }
    let cancelled = false;
    async function fetchThumbsupAsset() {
      try {
        const store = createAssetFromSymbolStore([
          "bitshares",
          "THUMBSUP.1",
          currentNode ? currentNode.url : null,
        ]);
        store.subscribe(({ data, error, loading }) => {
          if (cancelled) return;
          if (data && !error && !loading && data.assetData) {
            setThumbsupAsset({
              id: data.assetData.id || data.assetID || THUMBSUP_FALLBACK.id,
              precision:
                typeof data.assetData.precision === "number"
                  ? data.assetData.precision
                  : THUMBSUP_FALLBACK.precision,
              symbol: data.assetData.symbol || THUMBSUP_FALLBACK.symbol,
            });
          }
        });
      } catch (e) {
        console.error("Failed fetching THUMBSUP.1 asset", e);
        if (!cancelled) setThumbsupAsset({ ...THUMBSUP_FALLBACK });
      }
    }
    // Default to fallback immediately so UI/balances work even if lookup is slow
    setThumbsupAsset({ ...THUMBSUP_FALLBACK });
    fetchThumbsupAsset();
    return () => {
      cancelled = true;
    };
  }, [isMainnet, currentNode]);

  // Resolve `abit` distributor account (proposal sender + fee payer)
  useEffect(() => {
    if (!isMainnet) {
      setAbitAccount(null);
      return;
    }
    let cancelled = false;
    accountSearch(
      "bitshares",
      THUMBSUP_ISSUER_NAME,
      currentNode ? currentNode.url : null
    )
      .then((acct) => {
        if (!cancelled && acct && acct.id) {
          setAbitAccount({ id: acct.id, name: acct.name });
        }
      })
      .catch((e) => console.error("Failed resolving abit account", e));
    return () => {
      cancelled = true;
    };
  }, [isMainnet, currentNode]);

  const btsBalance = useMemo(() => {
    const entry = (userBalances || []).find((b) => b.asset_id === "1.3.0");
    if (!entry) return 0;
    return humanReadableFloat(Number(entry.amount), 5);
  }, [userBalances]);

  const thumbsupBalance = useMemo(() => {
    if (!thumbsupAsset) return 0;
    const entry = (userBalances || []).find(
      (b) => b.asset_id === thumbsupAsset.id
    );
    if (!entry) return 0;
    return humanReadableFloat(Number(entry.amount), thumbsupAsset.precision);
  }, [userBalances, thumbsupAsset]);

  const requestAmountNum = useMemo(() => {
    const n = parseFloat(requestAmount || 0);
    return Number.isNaN(n) ? 0 : n;
  }, [requestAmount]);

  const requestExceedsBalance = useMemo(
    () => requestAmountNum > btsBalance,
    [requestAmountNum, btsBalance]
  );

  const requestValid = useMemo(
    () =>
      Boolean(
        usr &&
          usr.id &&
          isMainnet &&
          abitAccount &&
          abitAccount.id &&
          thumbsupAsset &&
          thumbsupAsset.id &&
          requestAmountNum > 0 &&
          !requestExceedsBalance
      ),
    [usr, isMainnet, abitAccount, thumbsupAsset, requestAmountNum, requestExceedsBalance]
  );

  const requestProposalOps = useMemo(() => {
    if (!requestValid) return null;
    const transferOp = {
      fee: { amount: 0, asset_id: "1.3.0" },
      from: abitAccount.id,
      to: usr.id,
      amount: {
        amount: String(
          blockchainFloat(requestAmountNum, thumbsupAsset.precision)
        ),
        asset_id: thumbsupAsset.id,
      },
      extensions: {},
    };
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    return [
      {
        fee: { amount: 0, asset_id: "1.3.0" },
        fee_paying_account: abitAccount.id,
        expiration_time: expiry.toISOString().slice(0, 19),
        proposed_ops: [{ op: [0, transferOp] }],
        review_period_seconds: 3600,
        extensions: {},
      },
    ];
  }, [requestValid, abitAccount, usr, requestAmountNum, thumbsupAsset]);

  const ticketAmountNum = useMemo(() => {
    const n = parseFloat(amount || 0);
    return Number.isNaN(n) ? 0 : n;
  }, [amount]);

  const userTotals = useMemo(() => {
    // Sum amounts by ticket target_type and compute effective voting power
    let rawSum = 0;
    let effectiveSum = 0;
    let byType = {
      liquid: 0,
      lock_180_days: 0,
      lock_360_days: 0,
      lock_720_days: 0,
      lock_forever: 0,
    };
    for (const tkt of userTickets || []) {
      const amt =
        tkt && tkt.amount && tkt.amount.amount ? Number(tkt.amount.amount) : 0;
      // Assuming core precision 5, same as used in create op; safe for BTS/TEST
      const hr = amt / 10 ** 5;
      rawSum += hr;
      const typeStr = normalizeTypeToString(
        tkt.current_type ?? tkt.target_type
      );
      const boost = boostForTypeString(typeStr);
      if (typeStr === "lock_180_days") byType.lock_180_days += hr;
      else if (typeStr === "lock_360_days") byType.lock_360_days += hr;
      else if (typeStr === "lock_720_days") byType.lock_720_days += hr;
      else if (typeStr === "lock_forever") byType.lock_forever += hr;
      else byType.liquid += hr;
      effectiveSum += hr * boost;
    }
    return { rawSum, effectiveSum, byType };
  }, [userTickets]);

  // THUMBSUP.1 coverage: already-locked BTS is already spoken for, so any new
  // ticket adds to the total coverage requirement.
  const lockedBTS = useMemo(
    () => Math.round(userTotals.rawSum * 100000) / 100000,
    [userTotals]
  );

  const totalThumbsupRequired = useMemo(
    () => Math.round((lockedBTS + ticketAmountNum) * 100000) / 100000,
    [lockedBTS, ticketAmountNum]
  );

  const thumbsupDeficit = useMemo(
    () =>
      Math.max(
        0,
        Math.round((totalThumbsupRequired - thumbsupBalance) * 100000) / 100000
      ),
    [totalThumbsupRequired, thumbsupBalance]
  );

  const assetSymbol = useMemo(
    () =>
      chain === "bitshares"
        ? "BTS"
        : chain === "bitshares_testnet"
        ? "TEST"
        : "BTS",
    [chain]
  );

  // Normalize a ticket type which may be a string (e.g. "lock_720_days") or enum value
  function normalizeTypeToString(input) {
    if (typeof input === "string") return input;
    switch (input) {
      case ChainTypes.ticket_type?.lock_180_days:
        return "lock_180_days";
      case ChainTypes.ticket_type?.lock_360_days:
        return "lock_360_days";
      case ChainTypes.ticket_type?.lock_720_days:
        return "lock_720_days";
      case ChainTypes.ticket_type?.lock_forever:
        return "lock_forever";
      default:
        return "liquid";
    }
  }

  function boostForTypeString(typeStr) {
    switch (typeStr) {
      case "lock_180_days":
        return 2;
      case "lock_360_days":
        return 4;
      case "lock_720_days":
      case "lock_forever":
        return 8;
      default:
        return 1;
    }
  }

  const typeLabel = (tt) => {
    const s = normalizeTypeToString(tt);
    if (s === "lock_180_days") return t("CreateTicket:radioB.sm");
    if (s === "lock_360_days") return t("CreateTicket:radioB.md");
    if (s === "lock_720_days") return t("CreateTicket:radioB.lg");
    if (s === "lock_forever") return t("CreateTicket:radioB.xl");
    return t("CreateTicket:lockTypeLiquid", "Liquid");
  };

  const mapStringToTargetType = (s) => {
    switch (s) {
      case "lock_180_days":
        return ChainTypes.ticket_type.lock_180_days;
      case "lock_360_days":
        return ChainTypes.ticket_type.lock_360_days;
      case "lock_720_days":
        return ChainTypes.ticket_type.lock_720_days;
      case "lock_forever":
        return ChainTypes.ticket_type.lock_forever;
      default:
        return ChainTypes.ticket_type.liquid;
    }
  };

  const mapTargetTypeToString = (tt) => {
    switch (tt) {
      case ChainTypes.ticket_type.lock_180_days:
        return "lock_180_days";
      case ChainTypes.ticket_type.lock_360_days:
        return "lock_360_days";
      case ChainTypes.ticket_type.lock_720_days:
        return "lock_720_days";
      case ChainTypes.ticket_type.lock_forever:
        return "lock_forever";
      default:
        return "liquid";
    }
  };

  const openUpdateDialog = (ticket) => {
    setSelectedTicket(ticket);
    setNewType(
      normalizeTypeToString(ticket.current_type ?? ticket.target_type)
    );
    setUpdateAmount("");
    setUpdateDialogOpen(true);
  };

  // Summary of the ticket being edited: locked BTS + current voting power
  const selectedTicketInfo = useMemo(() => {
    if (!selectedTicket) return null;
    const raw =
      selectedTicket && selectedTicket.amount && selectedTicket.amount.amount
        ? Number(selectedTicket.amount.amount)
        : 0;
    const hr = raw / 10 ** 5;
    const typeStr = normalizeTypeToString(
      selectedTicket.current_type ?? selectedTicket.target_type
    );
    const boost = boostForTypeString(typeStr);
    return { hr, boost, effective: hr * boost, typeStr };
  }, [selectedTicket]);

  const isSelectedFrozen = selectedTicketInfo?.typeStr === "lock_forever";
  const isSameTarget =
    !!selectedTicketInfo && newType === selectedTicketInfo.typeStr;

  // If user selects liquid as new target type, hide/clear additional amount field
  useEffect(() => {
    if (newType === "liquid" && updateAmount) {
      setUpdateAmount("");
    }
  }, [newType]);

  return (
    <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:w-1/2">
      <div className="grid grid-cols-1 gap-3">
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-2)/0.2)]">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.15)] blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-3)/0.15)] blur-3xl" />
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-2)/0.7)] via-[hsl(var(--accent-3)/0.7)] to-[hsl(var(--accent-2)/0.7)]" />
          <CardHeader className="pb-1">
            <CardTitle className="text-lg bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] bg-clip-text text-transparent flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-2)/0.3)] to-[hsl(var(--accent-3)/0.3)] border border-[hsl(var(--accent-2)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-2)/0.4)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]">
                <Ticket className="h-4.5 w-4.5" />
              </span>
              {t("CreateTicket:title")}
            </CardTitle>
            <CardDescription>{t("CreateTicket:description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-2 mt-1 mb-2">
                <span className="col-span-2">
                  <HoverInfo
                    header={t("CreateTicket:lockType")}
                    content={t("CreateTicket:lockTypeDescription")}
                    type="header"
                  />
                </span>
                <Button
                  onClick={() => setLockType("lock_180_days")}
                  variant={lockType === "lock_180_days" ? "" : "outline"}
                  size="md"
                  className={
                    lockType === "lock_180_days"
                      ? "bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-2-gradFg))] shadow-md shadow-[color:hsl(var(--accent-2)/0.3)]"
                      : "text-muted-foreground border-border hover:bg-accent/50"
                  }
                >
                  {t("CreateTicket:radioB.sm")}
                </Button>
                <Button
                  onClick={() => setLockType("lock_360_days")}
                  variant={lockType === "lock_360_days" ? "" : "outline"}
                  size="md"
                  className={
                    lockType === "lock_360_days"
                      ? "bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-2-gradFg))] shadow-md shadow-[color:hsl(var(--accent-2)/0.3)]"
                      : "text-muted-foreground border-border hover:bg-accent/50"
                  }
                >
                  {t("CreateTicket:radioB.md")}
                </Button>
                <Button
                  onClick={() => setLockType("lock_720_days")}
                  variant={lockType === "lock_720_days" ? "" : "outline"}
                  size="md"
                  className={
                    lockType === "lock_720_days"
                      ? "bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-2-gradFg))] shadow-md shadow-[color:hsl(var(--accent-2)/0.3)]"
                      : "text-muted-foreground border-border hover:bg-accent/50"
                  }
                >
                  {t("CreateTicket:radioB.lg")}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <span className="col-span-1">
                  <HoverInfo
                    header={t("CreateTicket:amountHeader")}
                    content={t("CreateTicket:amountDescription")}
                    type="header"
                  />
                </span>
                <span className="col-span-1" />
                <span className="col-span-2">
                  <Input
                    type="number"
                    value={amount}
                    min="0"
                    step="0.00001"
                    placeholder="0.00000"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || val === "-") {
                        setAmount(val === "-" ? "" : "");
                        return;
                      }
                      const n = parseFloat(val);
                      if (isNaN(n)) {
                        setAmount("");
                        return;
                      }
                      if (n < 0) return;
                      const clamped = Math.round(n * 100000) / 100000;
                      setAmount(clamped.toString());
                    }}
                    className="mt-2 border-[hsl(var(--accent-2)/0.2)] bg-card/60"
                  />
                </span>
              </div>

              <div className="grid grid-cols-1">
                <span className="text-sm">
                  {t("CreateTicket:summary", {
                    amount: amount || 0,
                    asset: assetSymbol,
                    eq: equivalent,
                  })}
                </span>
              </div>

              <Button
                className="h-8 mt-4 bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-2-gradFg))] shadow-md shadow-[color:hsl(var(--accent-2)/0.3)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!amount || parseFloat(amount) <= 0}
                onClick={() => setShowDialog(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                {t("CreateUIA:buttons.submit")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isMainnet ? (
          <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-3)/0.2)]">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-3)/0.15)] blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.15)] blur-3xl" />
            <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-3)/0.7)] via-[hsl(var(--accent-2)/0.7)] to-[hsl(var(--accent-3)/0.7)]" />
            <CardHeader className="pb-1">
              <CardTitle className="text-lg bg-gradient-to-r from-[hsl(var(--accent-3))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-3)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-3)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-3)/0.4)] dark:text-[hsl(var(--accent-3-fg))] text-[hsl(var(--accent-3-fg))]">
                  <ThumbsUp className="h-4.5 w-4.5" />
                </span>
                {t("CreateTicket:requestCard.title", "Request THUMBSUP.1")}
              </CardTitle>
              <CardDescription>
                {t(
                  "CreateTicket:requestCard.description",
                  "Tickets require an equivalent THUMBSUP.1 balance."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("CreateTicket:requestCard.btsBalance", "Your BTS")}
                    </div>
                    <div className="font-mono text-sm tabular-nums">
                      {btsBalance.toFixed(5)} BTS
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("CreateTicket:requestCard.thumbsupBalance", "Your THUMBSUP.1")}
                    </div>
                    <div className="font-mono text-sm tabular-nums">
                      {thumbsupBalance.toFixed(5)} THUMBSUP.1
                    </div>
                  </div>
                </div>

                {ticketAmountNum > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {t("CreateTicket:requestCard.deficit", {
                      defaultValue:
                        "Total {{need}} THUMBSUP.1 required ({{locked}} already locked + {{new}} new); your deficit is {{deficit}}.",
                      need: totalThumbsupRequired.toFixed(5),
                      locked: lockedBTS.toFixed(5),
                      new: ticketAmountNum,
                      deficit: thumbsupDeficit.toFixed(5),
                    })}
                    {thumbsupDeficit > 0 && thumbsupDeficit <= btsBalance ? (
                      <Button
                        variant="link"
                        className="h-auto p-0 ml-1 text-sm"
                        onClick={() => setRequestAmount(String(thumbsupDeficit))}
                      >
                        {t("CreateTicket:requestCard.useDeficit", "Use deficit")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-2">
                  <span>
                    <HoverInfo
                      header={t("CreateTicket:requestCard.amountHeader", "Amount to request")}
                      content={t(
                        "CreateTicket:requestCard.amountDescription",
                        "Cannot exceed your BTS balance. 'abit' will send this many THUMBSUP.1 to you if they approve the proposal."
                      )}
                      type="header"
                    />
                  </span>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={requestAmount}
                      min="0"
                      step="0.00001"
                      placeholder="0.00000"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || val === "-") {
                          setRequestAmount("");
                          return;
                        }
                        const n = parseFloat(val);
                        if (isNaN(n)) {
                          setRequestAmount("");
                          return;
                        }
                        if (n < 0) return;
                        const clamped = Math.round(n * 100000) / 100000;
                        setRequestAmount(clamped.toString());
                      }}
                      className="border-[hsl(var(--accent-3)/0.2)] bg-card/60"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setRequestAmount(String(btsBalance))}
                      disabled={!btsBalance || btsBalance <= 0}
                    >
                      {t("CreateTicket:requestCard.max", "Max")}
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("CreateTicket:requestCard.maxHint", {
                      defaultValue: "Max requestable: {{max}} THUMBSUP.1 (your BTS balance).",
                      max: btsBalance.toFixed(5),
                    })}
                  </span>
                  {requestExceedsBalance && requestAmount ? (
                    <span className="text-xs text-red-500">
                      {t(
                        "CreateTicket:requestCard.exceedsBalance",
                        "Requested amount cannot exceed your BTS balance."
                      )}
                    </span>
                  ) : null}
                  {!usr || !usr.id ? (
                    <span className="text-xs text-muted-foreground">
                      {t(
                        "CreateTicket:requestCard.loginRequired",
                        "Log in to request THUMBSUP.1."
                      )}
                    </span>
                  ) : null}
                  {!abitAccount ? (
                    <span className="text-xs text-muted-foreground">
                      {t(
                        "CreateTicket:requestCard.resolvingAbit",
                        "Resolving 'abit' account…"
                      )}
                    </span>
                  ) : null}
                </div>

                <span className="text-xs text-muted-foreground">
                  {t(
                    "CreateTicket:requestCard.proposalNote",
                    "This creates a proposal (7 day expiry, 1h review) where 'abit' is the fee payer. They must approve it before you receive the tokens."
                  )}
                </span>

                <Button
                  className="h-8 mt-1 bg-gradient-to-r from-[hsl(var(--accent-3))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-2-gradFg))] shadow-md shadow-[color:hsl(var(--accent-3)/0.3)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!requestValid}
                  onClick={() => setShowRequestDialog(true)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t("CreateTicket:requestCard.submit", "Request THUMBSUP.1")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {usr && userTickets ? (
          <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)]">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.15)] blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.15)] blur-3xl" />
            <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1)/0.7)] via-[hsl(var(--accent-2)/0.7)] to-[hsl(var(--accent-1)/0.7)]" />
            <CardHeader className="pb-1">
              <CardTitle className="text-lg bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                {t("CreateTicket:myTickets.title")}
              </CardTitle>
              <CardDescription>{t("CreateTicket:myTickets.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.05)] to-transparent p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)]">
                      <Lock className="h-3.5 w-3.5 text-[hsl(var(--accent-1-fg))]" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Total locked
                    </span>
                  </div>
                  <div className="font-mono text-xl font-bold text-foreground tabular-nums">
                    {userTotals.rawSum.toFixed(5)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{assetSymbol}</div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-2)/0.15)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.05)] to-transparent p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)]">
                      <Zap className="h-3.5 w-3.5 text-[hsl(var(--accent-2-fg))]" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Effective power
                    </span>
                  </div>
                  <div className="font-mono text-xl font-bold text-foreground tabular-nums">
                    {userTotals.effectiveSum.toFixed(5)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{assetSymbol}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-1.5">
                {[
                  { key: "lock_180_days", label: t("CreateTicket:radioB.sm"), value: userTotals.byType.lock_180_days, boost: 2, dotClass: "bg-[hsl(var(--accent-success))]", badgeClass: "border-[hsl(var(--accent-success)/0.2)] bg-[hsl(var(--accent-success)/0.1)] text-[hsl(var(--accent-success-fg))] dark:text-[hsl(var(--accent-success-fg))]" },
                  { key: "lock_360_days", label: t("CreateTicket:radioB.md"), value: userTotals.byType.lock_360_days, boost: 4, dotClass: "bg-[hsl(var(--accent-2))]", badgeClass: "border-[hsl(var(--accent-2)/0.2)] bg-[hsl(var(--accent-2)/0.1)] text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))]" },
                  { key: "lock_720_days", label: t("CreateTicket:radioB.lg"), value: userTotals.byType.lock_720_days, boost: 8, dotClass: "bg-[hsl(var(--accent-2))]", badgeClass: "border-[hsl(var(--accent-2)/0.2)] bg-[hsl(var(--accent-2)/0.1)] text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))]" },
                  { key: "lock_forever", label: t("CreateTicket:radioB.xl"), value: userTotals.byType.lock_forever, boost: 8, dotClass: "bg-[hsl(var(--accent-warning))]", badgeClass: "border-[hsl(var(--accent-warning)/0.2)] bg-[hsl(var(--accent-warning)/0.1)] text-[hsl(var(--accent-warning-fg))] dark:text-[hsl(var(--accent-warning-fg))]" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${item.dotClass}`} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs tabular-nums">{item.value.toFixed(5)} {assetSymbol}</span>
                      {item.value > 0 && (
                        <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${item.badgeClass}`}>
                          {item.boost}x
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {userTotals.byType.liquid > 0 && (
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span className="text-muted-foreground">{t("CreateTicket:lockTypeLiquid", "Liquid")}</span>
                    </div>
                    <span className="font-mono text-xs tabular-nums">{userTotals.byType.liquid.toFixed(5)} {assetSymbol}</span>
                  </div>
                )}
              </div>

              {userTickets && userTickets.length ? (
                <div className="mt-5">
                  <Label className="text-left text-md font-bold mb-2 block">
                    {t("CreateTicket:myTickets.table.title", "Your tickets")}
                  </Label>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-2)/0.1)]">
                        <TableHead className="w-[120px]">
                          {t("CreateTicket:myTickets.table.id", "ID")}
                        </TableHead>
                        <TableHead>
                          {t("CreateTicket:myTickets.table.amount", "Amount")}
                        </TableHead>
                        <TableHead>
                          {t("CreateTicket:myTickets.table.type", "Type")}
                        </TableHead>
                        <TableHead>
                          {t(
                            "CreateTicket:myTickets.table.effective",
                            "Effective"
                          )}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("CreateTicket:myTickets.table.actions", "Actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...userTickets]
                        .sort((a, b) => {
                          const na = parseInt((a.id || "").split(".").pop());
                          const nb = parseInt((b.id || "").split(".").pop());
                          return (isNaN(nb) ? 0 : nb) - (isNaN(na) ? 0 : na);
                        })
                        .map((tk) => {
                          const amt =
                            tk && tk.amount && tk.amount.amount
                              ? Number(tk.amount.amount)
                              : 0;
                          const hr = amt / 10 ** 5;
                          const typeStr = normalizeTypeToString(
                            tk.current_type ?? tk.target_type
                          );
                          const boost = boostForTypeString(typeStr);
                          return (
                            <TableRow key={tk.id}>
                              <TableCell className="font-mono text-xs">
                                {tk.id}
                              </TableCell>
                              <TableCell>
                                {hr.toFixed(5)} {assetSymbol}
                              </TableCell>
                              <TableCell>
                                {typeLabel(tk.current_type ?? tk.target_type)}
                              </TableCell>
                              <TableCell>
                                {(hr * boost).toFixed(5)} {assetSymbol}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]"
                                  onClick={() => openUpdateDialog(tk)}
                                >
                                  {t("CreateTicket:buttons.update", "Update")}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {showDialog ? (
          <DeepLinkDialog
            operationNames={["ticket_create"]}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            key={`deeplink-dialog`}
            headerText={t("CreateTicket:dialogHeader")}
            trxJSON={[
              {
                account: usr.id,
                target_type: targetType,
                amount: {
                  amount: blockchainFloat(parseFloat(amount || 0), 5),
                  asset_id: "1.3.0",
                },
                extensions: [],
              },
            ]}
            disablePropose={true}
          />
        ) : null}

        {showRequestDialog && requestProposalOps ? (
          <DeepLinkDialog
            operationNames={["proposal_create"]}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowRequestDialog}
            key={`deeplink-dialog-thumbsup-request`}
            headerText={t(
              "CreateTicket:requestCard.dialogHeader",
              "Request THUMBSUP.1 from abit"
            )}
            trxJSON={requestProposalOps}
          />
        ) : null}

        {updateDialogOpen && selectedTicket && selectedTicketInfo ? (
          <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
            <DialogContent className="sm:max-w-[520px] rounded-2xl border border-border bg-card p-6 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-lg bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] bg-clip-text text-transparent flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-2)/0.3)] to-[hsl(var(--accent-3)/0.3)] border border-[hsl(var(--accent-2)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-2)/0.4)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]">
                    <Ticket className="h-4.5 w-4.5" />
                  </span>
                  {t("CreateTicket:updateDialog.title", "Update ticket")}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    "CreateTicket:updateDialog.description",
                    "Change the ticket lock type. Optionally, provide additional amount to retarget."
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 mt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("CreateTicket:updateDialog.lockedAmount", "Locked amount")}
                    </div>
                    <div className="font-mono text-sm tabular-nums">
                      {selectedTicketInfo.hr.toFixed(5)} {assetSymbol}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedTicket.id}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("CreateTicket:updateDialog.votingPower", "Current voting power")}
                    </div>
                    <div className="font-mono text-sm tabular-nums">
                      {selectedTicketInfo.effective.toFixed(5)} {assetSymbol}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {typeLabel(
                        selectedTicket.current_type ?? selectedTicket.target_type
                      )}
                    </div>
                  </div>
                </div>
                {isSelectedFrozen ? (
                  <span className="text-xs text-amber-500">
                    {t(
                      "CreateTicket:updateDialog.frozenWarning",
                      "This ticket is locked forever and cannot be updated or withdrawn on-chain."
                    )}
                  </span>
                ) : null}
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>
                    {t("CreateTicket:updateDialog.newType", "New type")}
                  </Label>
                  <Select value={newType} onValueChange={setNewType} disabled={isSelectedFrozen}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          "CreateTicket:updateDialog.newType",
                          "New type"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border">
                      <SelectItem value="lock_180_days">
                        {t("CreateTicket:radioB.sm")}
                      </SelectItem>
                      <SelectItem value="lock_360_days">
                        {t("CreateTicket:radioB.md")}
                      </SelectItem>
                      <SelectItem value="lock_720_days">
                        {t("CreateTicket:radioB.lg")}
                      </SelectItem>
                      <SelectItem value="liquid">
                        {t("CreateTicket:lockTypeLiquid", "Liquid")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isSelectedFrozen && isSameTarget ? (
                  <span className="text-xs text-muted-foreground">
                    {t(
                      "CreateTicket:updateDialog.sameTargetHint",
                      "New type matches the ticket's current target — pick a different type to continue."
                    )}
                  </span>
                ) : null}
                {newType !== "liquid" ? (
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label>
                      {t(
                        "CreateTicket:updateDialog.amountNewTarget",
                        "Additional amount (optional)"
                      )}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.00001"
                      placeholder={"0.00000"}
                      value={updateAmount}
                      disabled={isSelectedFrozen}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || val === "-") {
                          setUpdateAmount(val === "-" ? "" : "");
                          return;
                        }
                        const n = parseFloat(val);
                        if (isNaN(n)) {
                          setUpdateAmount("");
                          return;
                        }
                        if (n < 0) return;
                        const clamped = Math.round(n * 100000) / 100000;
                        setUpdateAmount(clamped.toString());
                      }}
                      className="border-[hsl(var(--accent-2)/0.2)] bg-card/60"
                    />
                  </div>
                ) : null}
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => setUpdateDialogOpen(false)}
                  >
                    {t("CreateTicket:updateDialog.cancel", "Cancel")}
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-2-gradFg))] shadow-md shadow-[color:hsl(var(--accent-2)/0.3)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSelectedFrozen || isSameTarget}
                    onClick={() => {
                      // Build ticket_update op
                      const op = {
                        ticket: selectedTicket.id,
                        account: usr.id,
                        target_type: mapStringToTargetType(newType),
                        extensions: [],
                      };
                      const n = parseFloat(updateAmount);
                      if (newType !== "liquid" && !Number.isNaN(n) && n > 0) {
                        op.amount_for_new_target = {
                          amount: blockchainFloat(n, 5),
                          asset_id: "1.3.0",
                        };
                      }
                      // Close dialog and then show deeplink with prepared op
                      setPendingUpdateOp(op);
                      setUpdateDialogOpen(false);
                      setShowUpdateDeepLink(true);
                    }}
                  >
                    {t("CreateTicket:updateDialog.continue", "Continue")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}

        {showUpdateDeepLink && selectedTicket ? (
          <DeepLinkTicketUpdate
            usr={usr}
            operation={pendingUpdateOp}
            onDismiss={() => {
              setShowUpdateDeepLink(false);
              setSelectedTicket(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

// Small wrapper to render DeepLinkDialog for ticket_update using current user
function DeepLinkTicketUpdate({ usr, operation, onDismiss }) {
  if (!operation) return null;
  return (
    <DeepLinkDialog
      operationNames={["ticket_update"]}
      username={usr.username}
      usrChain={usr.chain}
      userID={usr.id}
      dismissCallback={onDismiss}
      key={`deeplink-dialog-update`}
      headerText={"ticket_update"}
      trxJSON={[operation]}
      disablePropose={true}
    />
  );
}
