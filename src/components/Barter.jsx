import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";
import { CrossCircledIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Repeat,
  Handshake,
  Shield,
  Send,
  UserPlus,
  Pencil,
  ArrowLeftRight,
  AlertTriangle,
  PackageOpen,
  Zap,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/asset-form/SectionHeader.jsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { getObjects } from "@/nanoeffects/src/common";
import {
  blockchainFloat,
  humanReadableFloat,
  assetAmountRegex,
} from "@/lib/common";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";
import AccountSearch from "./AccountSearch.jsx";
import BalanceAssetDropDownCard from "./Market/BalanceAssetDropDownCard.jsx";
import { Avatar } from "./Avatar.tsx";
import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";

const operationNumbers = {
  transfer: 0,
  proposal_create: 22,
};

const OFFER_ROW_HEIGHT = 60;
const OFFER_LIST_MAX_HEIGHT = 300;

const getBalance = (balances, assetId, precision) => {
  if (!balances || !assetId) return 0;
  const balanceObj = balances.find((b) => b.asset_id === assetId);
  return balanceObj ? humanReadableFloat(balanceObj.amount, precision) : 0;
};

const getListHeight = (count) => {
  if (!count) return 0;
  return Math.min(count * OFFER_ROW_HEIGHT, OFFER_LIST_MAX_HEIGHT);
};

function OfferRowActions({ symbol, onEdit, onRemove, editLabel, removeLabel }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        onClick={onEdit}
        variant="ghost"
        size="icon"
        aria-label={editLabel || `Edit amount for ${symbol}`}
        title={editLabel || `Edit amount for ${symbol}`}
        className="h-8 w-8 text-muted-foreground/70 hover:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.12)] transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        onClick={onRemove}
        variant="ghost"
        size="icon"
        aria-label={removeLabel || `Remove ${symbol}`}
        title={removeLabel || `Remove ${symbol}`}
        className="h-8 w-8 text-muted-foreground/60 hover:text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)] transition-colors"
      >
        <CrossCircledIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

function BarterFromRow({ index, style, fromAssets, onRemove, onEdit, t }) {
  const item = Object.values(fromAssets)[index];
  if (!item) return null;
  const assetData = item.asset;
  return (
    <div style={{ ...style, paddingBottom: 8 }} key={assetData.id}>
      <div className="h-full rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.04)] hover:bg-[hsl(var(--accent-1)/0.08)] transition-colors px-2 flex items-center">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center w-full">
          <Input
            id={`amount-from-${assetData.id}`}
            type="text"
            inputMode="decimal"
            value={item.amount}
            disabled
            aria-label={`Amount of ${assetData?.symbol || assetData.id}`}
            className="!bg-card/40 border-border text-foreground font-mono tabular-nums h-9"
          />
          <Input
            id={`asset-from-${assetData.id}`}
            type="text"
            value={assetData?.symbol || ""}
            disabled
            aria-label="Asset symbol"
            className="!bg-card/40 border-border text-foreground h-9 truncate"
          />
          <OfferRowActions
            symbol={assetData?.symbol}
            onEdit={() => onEdit(assetData.id, "from")}
            onRemove={() => onRemove(assetData.id, "from")}
            editLabel={t ? t("Barter:editAsset") : undefined}
            removeLabel={t ? t("Barter:removeAsset") : undefined}
          />
        </div>
      </div>
    </div>
  );
}
const MemoBarterFromRow = React.memo(BarterFromRow);

function BarterToRow({ index, style, toAssets, onRemove, onEdit, t }) {
  const item = Object.values(toAssets)[index];
  if (!item) return null;
  const assetData = item.asset;
  return (
    <div style={{ ...style, paddingBottom: 8 }} key={assetData.id}>
      <div className="h-full rounded-xl border border-[hsl(var(--accent-2)/0.25)] bg-[hsl(var(--accent-2)/0.05)] hover:bg-[hsl(var(--accent-2)/0.09)] transition-colors px-2 flex items-center">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center w-full">
          <Input
            id={`amount-to-${assetData.id}`}
            type="text"
            inputMode="decimal"
            value={item.amount}
            disabled
            aria-label={`Amount of ${assetData?.symbol || assetData.id}`}
            className="!bg-card/40 border-border text-foreground font-mono tabular-nums h-9"
          />
          <Input
            id={`asset-to-${assetData.id}`}
            type="text"
            value={assetData?.symbol || ""}
            disabled
            aria-label="Asset symbol"
            className="!bg-card/40 border-border text-foreground h-9 truncate"
          />
          <OfferRowActions
            symbol={assetData?.symbol}
            onEdit={() => onEdit(assetData.id, "to")}
            onRemove={() => onRemove(assetData.id, "to")}
            editLabel={t ? t("Barter:editAsset") : undefined}
            removeLabel={t ? t("Barter:removeAsset") : undefined}
          />
        </div>
      </div>
    </div>
  );
}
const MemoBarterToRow = React.memo(BarterToRow);

function OfferEmptyState({ icon: Icon, title, hint, accent }) {
  const border =
    accent === "2"
      ? "border-[hsl(var(--accent-2)/0.25)]"
      : "border-[hsl(var(--accent-1)/0.25)]";
  const iconBg =
    accent === "2"
      ? "bg-[hsl(var(--accent-2)/0.12)] border-[hsl(var(--accent-2)/0.3)] text-[hsl(var(--accent-2-fg))]"
      : "bg-[hsl(var(--accent-1)/0.12)] border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))]";
  return (
    <div
      className={`rounded-lg border border-dashed ${border} bg-card/20 px-4 py-6 text-center`}
    >
      <span
        className={`mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border ${iconBg}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      {hint ? (
        <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function Barter(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const {
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [toAccount, setToAccount] = useState(null);
  const [fromAssets, setFromAssets] = useState({});
  const [toAssets, setToAssets] = useState({});

  const [showEscrow, setShowEscrow] = useState(false);
  const [escrowAccount, setEscrowAccount] = useState(null);
  const [sendToEscrowFirst, setSendToEscrowFirst] = useState(false);
  const [escrowPayment, setEscrowPayment] = useState(0);

  const [fromBalances, setFromBalances] = useState(null);
  const [toBalances, setToBalances] = useState(null);

  const [showDialog, setShowDialog] = useState(false);
  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);
  const [escrowUserDialogOpen, setEscrowUserDialogOpen] = useState(false);

  // Amount edit dialog: re-launches the amount entry for an added asset.
  const [editingAsset, setEditingAsset] = useState(null); // { party, id, asset }
  const [editAmountInput, setEditAmountInput] = useState("");
  const [editAmountError, setEditAmountError] = useState("");

  const [proposalFee, setProposalFee] = useState(0);
  const [transferFee, setTransferFee] = useState(0);
  const [urlPrefilled, setUrlPrefilled] = useState(false);
  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  useEffect(() => {
    if (globalParams && globalParams.length) {
      const proposalFeeObj = globalParams.find((x) => x.id === 22);
      const transferFeeObj = globalParams.find((x) => x.id === 0);
      setProposalFee(
        proposalFeeObj ? humanReadableFloat(proposalFeeObj.data.fee, 5) : 0
      );
      setTransferFee(
        transferFeeObj ? humanReadableFloat(transferFeeObj.data.fee, 5) : 0
      );
    }
  }, [globalParams]);

  // URL prefill (?from= ?to= ?counterparty= ?escrow= ?escrowFee= ?first=),
  // e.g. from a trollbox barter attachment's "proceed" link. Applies once,
  // only to empty fields, so manual input is never clobbered. Asset legs
  // are "1.3.x:humanAmount" pairs; escrow fee is a BTS human amount.
  useEffect(() => {
    if (urlPrefilled || !assets || !assets.length) {
      return undefined;
    }
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      setUrlPrefilled(true);
      return undefined;
    }
    const fromParam = params.get("from");
    const toParam = params.get("to");
    const counterpartyParam = params.get("counterparty");
    const escrowParam = params.get("escrow");
    if (!fromParam && !toParam && !counterpartyParam && !escrowParam) {
      setUrlPrefilled(true);
      return undefined;
    }

    const parseLeg = (param) => {
      const out = {};
      if (!param) {
        return out;
      }
      for (const part of param.split(",")) {
        const sep = part.lastIndexOf(":");
        if (sep === -1) {
          continue;
        }
        const id = part.slice(0, sep);
        const amount = part.slice(sep + 1);
        if (!/^1\.3\.\d+$/.test(id)) {
          continue;
        }
        const asset = assets.find((a) => a && a.id === id);
        if (!asset) {
          continue;
        }
        if (
          typeof amount !== "string" ||
          !assetAmountRegex({ precision: asset.precision }).test(amount) ||
          !(parseFloat(amount) > 0)
        ) {
          continue;
        }
        out[id] = { amount, asset };
      }
      return out;
    };

    const fromLeg = parseLeg(fromParam);
    const toLeg = parseLeg(toParam);
    if (Object.keys(fromLeg).length) {
      setFromAssets((prev) =>
        Object.keys(prev || {}).length ? prev : fromLeg
      );
    }
    if (Object.keys(toLeg).length) {
      setToAssets((prev) =>
        Object.keys(prev || {}).length ? prev : toLeg
      );
    }

    const escrowValid = /^1\.2\.\d+$/.test(escrowParam || "");
    if (escrowValid) {
      setShowEscrow(true);
      const fee = params.get("escrowFee");
      if (
        typeof fee === "string" &&
        assetAmountRegex({ precision: 5 }).test(fee) &&
        parseFloat(fee) > 0
      ) {
        setEscrowPayment((prev) =>
          prev && parseFloat(prev) > 0 ? prev : fee
        );
      }
      const first = params.get("first");
      if (first === "self" || first === "counterparty") {
        setSendToEscrowFirst(first === "self");
      }
    }

    const counterpartyValid = /^1\.2\.\d+$/.test(counterpartyParam || "");
    if (counterpartyValid) {
      // Fill the counterparty account immediately with the id as a name
      // fallback; the resolver effect below upgrades it to the live name
      // once the user's chain + node are known (they rehydrate after
      // first render on fresh page loads).
      setToAccount((prev) =>
        prev ? prev : { id: counterpartyParam, name: counterpartyParam }
      );
    }
    if (escrowValid) {
      setEscrowAccount((prev) =>
        prev ? prev : { id: escrowParam, name: escrowParam }
      );
    }
    setUrlPrefilled(true);
    return undefined;
  }, [assets, urlPrefilled]);

  // Node URL matching the active chain. $currentNode rehydrates after first
  // render (and may belong to the other chain), so a mismatched URL must
  // never be used for lookups — null falls back to this chain's default.
  const accountNodeUrl =
    currentNode && currentNode.chain === _chain && currentNode.url
      ? currentNode.url
      : null;

  // Resolve display names for prefilled counterparty/escrow accounts.
  // Separate from the one-shot prefill above so it retries as the chain
  // and node become known. Only upgrades id-as-name placeholders, so
  // manually picked accounts are never clobbered.
  const toAccountId = toAccount && toAccount.id;
  const toAccountName = toAccount && toAccount.name;
  const escrowAccountId = escrowAccount && escrowAccount.id;
  const escrowAccountName = escrowAccount && escrowAccount.name;
  useEffect(() => {
    const targets = [];
    if (toAccountId && toAccountName === toAccountId) {
      targets.push({ id: toAccountId, set: setToAccount });
    }
    if (
      showEscrow &&
      escrowAccountId &&
      escrowAccountName === escrowAccountId
    ) {
      targets.push({ id: escrowAccountId, set: setEscrowAccount });
    }
    if (!targets.length) {
      return undefined;
    }
    let cancelled = false;
    getObjects(_chain, [...new Set(targets.map((t) => t.id))], accountNodeUrl)
      .then((accounts) => {
        if (cancelled) {
          return;
        }
        const byId = {};
        for (const a of accounts || []) {
          if (a && a.id && typeof a.name === "string" && a.name) {
            byId[a.id] = a.name;
          }
        }
        for (const t of targets) {
          if (byId[t.id]) {
            t.set((prev) =>
              prev && prev.id === t.id && prev.name !== byId[t.id]
                ? { id: t.id, name: byId[t.id] }
                : prev
            );
          }
        }
      })
      .catch(() => {
        // id fallbacks stay; user can still pick accounts manually
      });
    return () => {
      cancelled = true;
    };
  }, [
    toAccountId,
    toAccountName,
    escrowAccountId,
    escrowAccountName,
    showEscrow,
    _chain,
    accountNodeUrl,
  ]);

  useEffect(() => {
    async function fetchFromBalances() {
      if (usr && usr.id && currentNode && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode.url,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setFromBalances(filteredData);
          } else if (error) {
            console.error("Error fetching current user balances:", error);
          }
        });
      }
    }

    fetchFromBalances();
  }, [usr, assets, currentNode]);

  useEffect(() => {
    async function fetchToBalances() {
      if (toAccount && toAccount.id && currentNode && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          toAccount.id,
          currentNode.url,
        ]);
        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setToBalances(filteredData);
          } else if (error) {
            console.error("Error fetching counterparty balances:", error);
          }
        });
      } else {
        setToBalances(null);
      }
    }

    fetchToBalances();
  }, [toAccount, assets, currentNode]);

  const fromCount = useMemo(
    () => (fromAssets ? Object.keys(fromAssets).length : 0),
    [fromAssets]
  );
  const toCount = useMemo(
    () => (toAssets ? Object.keys(toAssets).length : 0),
    [toAssets]
  );
  const fromListHeight = useMemo(() => getListHeight(fromCount), [fromCount]);
  const toListHeight = useMemo(() => getListHeight(toCount), [toCount]);
  const feeAssetSymbol = _chain === "bitshares" ? "BTS" : "TEST";

  const yourShortfalls = useMemo(() => {
    if (!fromAssets || !fromCount) return [];
    return Object.values(fromAssets)
      .map((item) => {
        const assetData = item && item.asset;
        if (!assetData) return null;
        const balance = getBalance(fromBalances, assetData.id, assetData.precision);
        const wanted = parseFloat(item.amount);
        if (Number.isFinite(wanted) && wanted > balance) {
          return { symbol: assetData.symbol, amount: item.amount, balance };
        }
        return null;
      })
      .filter(Boolean);
  }, [fromAssets, fromCount, fromBalances]);

  const theirShortfalls = useMemo(() => {
    if (!toAssets || !toCount) return [];
    return Object.values(toAssets)
      .map((item) => {
        const assetData = item && item.asset;
        if (!assetData) return null;
        const balance = getBalance(toBalances, assetData.id, assetData.precision);
        const wanted = parseFloat(item.amount);
        if (Number.isFinite(wanted) && wanted > balance) {
          return { symbol: assetData.symbol, amount: item.amount, balance };
        }
        return null;
      })
      .filter(Boolean);
  }, [toAssets, toCount, toBalances]);

  const isEscrowValid = useMemo(() => {
    if (!showEscrow) return true;
    return !!(escrowAccount && escrowAccount.id);
  }, [showEscrow, escrowAccount]);

  const escrowConflictsCounterparty = useMemo(() => {
    if (!showEscrow || !escrowAccount || !toAccount) return false;
    return escrowAccount.id === toAccount.id;
  }, [showEscrow, escrowAccount, toAccount]);

  const canSubmit = useMemo(
    () =>
      usr &&
      toAccount &&
      fromAssets &&
      Object.keys(fromAssets).length &&
      toAssets &&
      Object.keys(toAssets).length &&
      isEscrowValid &&
      !escrowConflictsCounterparty,
    [
      usr,
      toAccount,
      fromAssets,
      toAssets,
      isEscrowValid,
      escrowConflictsCounterparty,
    ]
  );

  const disabledReasons = useMemo(() => {
    const reasons = [];
    if (!usr) reasons.push(t("Barter:errorNoUser"));
    if (!toAccount) reasons.push(t("Barter:errorNoCounterparty"));
    if (!fromCount) reasons.push(t("Barter:errorInvalidYourOffer"));
    if (!toCount) reasons.push(t("Barter:errorInvalidTheirOffer"));
    if (showEscrow && !(escrowAccount && escrowAccount.id)) {
      reasons.push(t("Barter:errorInvalidEscrow"));
    }
    if (escrowConflictsCounterparty) {
      reasons.push(t("Barter:errorEscrowIsCounterparty"));
    }
    if (yourShortfalls.length || theirShortfalls.length) {
      reasons.push(t("Barter:errorInsufficientBalance"));
    }
    return reasons;
  }, [
    usr,
    toAccount,
    fromCount,
    toCount,
    showEscrow,
    escrowAccount,
    escrowConflictsCounterparty,
    yourShortfalls,
    theirShortfalls,
    t,
  ]);

  const proposalOperations = useMemo(() => {
    if (!canSubmit) return null;

    let ops = [];

    if (showEscrow && escrowPayment > 0 && escrowAccount) {
      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: usr.id,
          to: escrowAccount.id,
          amount: {
            amount: Math.floor(blockchainFloat(escrowPayment, 5)),
            asset_id: "1.3.0",
          },
          extensions: {},
        },
      ]);
    }

    Object.values(fromAssets).forEach((item) => {
      const assetData = item.asset;
      if (!assetData) return;

      const to =
        showEscrow && sendToEscrowFirst ? escrowAccount.id : toAccount.id;

      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: usr.id,
          to: to,
          amount: {
            amount: Math.floor(
              blockchainFloat(item.amount, assetData.precision)
            ),
            asset_id: assetData.id,
          },
          extensions: {},
        },
      ]);
    });

    Object.values(toAssets).forEach((item) => {
      const assetData = item.asset;
      if (!assetData) return;

      const from = toAccount.id;
      const receiver =
        showEscrow && !sendToEscrowFirst ? escrowAccount.id : usr.id;

      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: from,
          to: receiver,
          amount: {
            amount: Math.floor(
              blockchainFloat(item.amount, assetData.precision)
            ),
            asset_id: assetData.id,
          },
          extensions: {},
        },
      ]);
    });

    if (showEscrow && !sendToEscrowFirst && escrowAccount) {
      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: escrowAccount.id,
          to: usr.id,
          amount: { amount: 1, asset_id: "1.3.0" },
          extensions: {},
        },
      ]);
    }

    const proposalExpiration = new Date();
    proposalExpiration.setDate(proposalExpiration.getDate() + 7);

    const _finalJSON = [
      {
        fee: { amount: 0, asset_id: "1.3.0" },
        fee_paying_account:
          showEscrow && sendToEscrowFirst ? escrowAccount.id : toAccount.id,
        expiration_time: proposalExpiration.toISOString().slice(0, 19),
        proposed_ops: ops.map((op) => ({ op: op })),
        review_period_seconds: 3600,
        extensions: {},
      },
    ];

    return _finalJSON;
  }, [
    canSubmit,
    usr,
    toAccount,
    fromAssets,
    toAssets,
    showEscrow,
    sendToEscrowFirst,
    escrowAccount,
    escrowPayment,
    assets,
  ]);

  const handleRemoveAsset = useCallback((assetId, party) => {
    if (party === "from") {
      setFromAssets((prev) => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
    } else {
      setToAssets((prev) => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
    }
  }, []);

  const handleClearParty = useCallback((party) => {
    if (party === "from") {
      setFromAssets({});
    } else {
      setToAssets({});
    }
  }, []);

  const handleEditOpen = useCallback(
    (assetId, party) => {
      const source = party === "from" ? fromAssets : toAssets;
      const entry = source ? source[assetId] : null;
      if (!entry || !entry.asset) return;
      setEditingAsset({ party, id: assetId, asset: entry.asset });
      setEditAmountInput(String(entry.amount ?? ""));
      setEditAmountError("");
    },
    [fromAssets, toAssets]
  );

  const editingBalance = useMemo(() => {
    if (!editingAsset) return 0;
    const balances = editingAsset.party === "from" ? fromBalances : toBalances;
    return getBalance(balances, editingAsset.id, editingAsset.asset.precision);
  }, [editingAsset, fromBalances, toBalances]);

  const handleEditSave = useCallback(() => {
    if (!editingAsset) return;
    const precision = editingAsset.asset.precision;
    const regex = assetAmountRegex({ precision });
    if (!regex.test(editAmountInput) || !(parseFloat(editAmountInput) > 0)) {
      setEditAmountError(t("Barter:invalidAmount"));
      return;
    }
    const next = { amount: editAmountInput, asset: editingAsset.asset };
    if (editingAsset.party === "from") {
      setFromAssets((prev) => ({ ...prev, [editingAsset.id]: next }));
    } else {
      setToAssets((prev) => ({ ...prev, [editingAsset.id]: next }));
    }
    setEditingAsset(null);
    setEditAmountInput("");
    setEditAmountError("");
  }, [editingAsset, editAmountInput, t]);

  const fromRowProps = useMemo(
    () => ({ fromAssets, onRemove: handleRemoveAsset, onEdit: handleEditOpen, t }),
    [fromAssets, handleRemoveAsset, handleEditOpen, t]
  );
  const toRowProps = useMemo(
    () => ({ toAssets, onRemove: handleRemoveAsset, onEdit: handleEditOpen, t }),
    [toAssets, handleRemoveAsset, handleEditOpen, t]
  );

  const fromList = useMemo(
    () => (fromAssets ? Object.values(fromAssets) : []),
    [fromAssets]
  );
  const toList = useMemo(
    () => (toAssets ? Object.values(toAssets) : []),
    [toAssets]
  );

  const canAddFrom = !!(fromBalances && fromBalances.length);
  const canAddTo = !!(toAccount && toBalances && toBalances.length);

  const addFromCallback = useCallback((res) => {
    setFromAssets((prev) => ({
      ...prev,
      [res.asset.id]: { amount: res.amount, asset: res.asset },
    }));
  }, []);

  const addToCallback = useCallback((res) => {
    setToAssets((prev) => ({
      ...prev,
      [res.asset.id]: { amount: res.amount, asset: res.asset },
    }));
  }, []);

  // ─── Step 1: Counterparty ─────────────────────────────────────────
  const CounterpartyCard = (
    <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
      <SectionHeader
        icon={UserPlus}
        step={1}
        title={t("Barter:counterparty")}
        description={t("Barter:counterpartyDescription")}
      />
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              {toAccount ? (
                <Avatar
                  size={40}
                  name={toAccount.name}
                  extra="BarterTo"
                  expression={{ eye: "normal", mouth: "open" }}
                  colors={[
                    "#146A7C",
                    "#F0AB3D",
                    "#C271B4",
                    "#C20D90",
                    "#92A1C6",
                  ]}
                />
              ) : (
                <Av className="h-10 w-10">
                  <AvatarFallback>?</AvatarFallback>
                </Av>
              )}
            </div>
            <Input
              disabled
              placeholder={t("Barter:recipientPlaceholder")}
              value={
                toAccount ? `${toAccount.name} (${toAccount.id})` : ""
              }
              aria-label={t("Barter:counterparty")}
              className="flex-1 min-w-0 !bg-card/40 border-border text-foreground"
              readOnly
            />
          </div>
          <Dialog
            open={targetUserDialogOpen}
            onOpenChange={setTargetUserDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="shrink-0 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)]"
              >
                {toAccount
                  ? t("Barter:changeRecipient")
                  : t("Barter:selectRecipient")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[375px] !bg-card border border-border text-foreground/85 rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {t("Transfer:bitsharesAccountSearch")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t("Transfer:searchingForAccount")}
                </DialogDescription>
              </DialogHeader>
              <AccountSearch
                chain={_chain}
                excludedUsers={usr ? [usr] : []}
                setChosenAccount={(acc) => {
                  setToAccount(acc);
                  setTargetUserDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );

  // ─── Step 2 panels ────────────────────────────────────────────────
  const yourOfferAddControl = canAddFrom ? (
    <BalanceAssetDropDownCard
      assetsToHide={fromAssets ? Object.keys(fromAssets) : []}
      storeCallback={addFromCallback}
      assets={assets}
      size="small"
      usrBalances={fromBalances}
    />
  ) : (
    <Button
      variant="outline"
      size="sm"
      disabled
      title={t("Barter:noBalancesHint")}
      className="h-7 opacity-60"
    >
      {t("Barter:addAsset")}
    </Button>
  );

  const theirOfferAddControl = canAddTo ? (
    <BalanceAssetDropDownCard
      assetsToHide={toAssets ? Object.keys(toAssets) : []}
      storeCallback={addToCallback}
      assets={assets}
      size="small"
      usrBalances={toBalances}
    />
  ) : (
    <Button
      variant="outline"
      size="sm"
      disabled
      title={
        !toAccount
          ? t("Barter:selectCounterpartyFirst")
          : t("Barter:noBalancesHint")
      }
      className="h-7 opacity-60"
    >
      {t("Barter:addAsset")}
    </Button>
  );

  const YourOfferPanel = (
    <div className="rounded-xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-transparent p-4 flex flex-col min-h-[220px]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2 min-w-0">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))]">
            <Send className="h-3 w-3" strokeWidth={2.5} />
          </span>
          <span className="truncate">
            {t("Barter:yourOffer")} ({usr?.username || "…"})
          </span>
          {fromCount > 0 ? (
            <Badge
              variant="secondary"
              className="shrink-0 bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))] border-[hsl(var(--accent-1)/0.3)]"
            >
              {fromCount}
            </Badge>
          ) : null}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {fromCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleClearParty("from")}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
            >
              {t("Barter:clearAll")}
            </Button>
          ) : null}
          {yourOfferAddControl}
        </div>
      </div>
      {fromCount > 0 ? (
        <>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-2 py-1.5 bg-[hsl(var(--accent-1)/0.07)] border border-[hsl(var(--accent-1)/0.2)] mb-2 rounded-md text-xs font-semibold uppercase tracking-wider text-foreground/60">
            <div>{t("Barter:amount")}</div>
            <div>{t("Barter:asset")}</div>
            <div className="w-[72px]" />
          </div>
          <div
            className="rounded-lg border border-[hsl(var(--accent-1)/0.12)] bg-card/30 overflow-hidden"
            style={{ height: fromListHeight }}
          >
            <List
              height={fromListHeight}
              rowComponent={MemoBarterFromRow}
              width="100%"
              rowCount={fromCount}
              rowHeight={OFFER_ROW_HEIGHT}
              rowProps={fromRowProps}
            />
          </div>
        </>
      ) : (
        <OfferEmptyState
          icon={PackageOpen}
          accent="1"
          title={t("Barter:noAssetsYet")}
          hint={t("Barter:yourOfferEmptyHint")}
        />
      )}
      {!canAddFrom && !fromCount ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("Barter:noBalancesHint")}
        </p>
      ) : null}
      {yourShortfalls.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.07)] p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--accent-danger-fg))]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("Barter:balanceWarningTitle")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Barter:yourBalanceWarning")}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs font-mono text-foreground/85">
            {yourShortfalls.map((s) => (
              <li key={s.symbol}>
                {s.amount} {s.symbol} ({t("Barter:balance", { balance: s.balance, symbol: s.symbol })})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );

  const TheirOfferPanel = (
    <div className="rounded-xl border border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.07)] to-transparent p-4 flex flex-col min-h-[220px]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2 min-w-0">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-2)/0.15)] border border-[hsl(var(--accent-2)/0.3)] text-[hsl(var(--accent-2-fg))]">
            <Send className="h-3 w-3" strokeWidth={2.5} />
          </span>
          <span className="truncate">
            {t("Barter:theirOffer", { name: toAccount?.name || "…" })}
          </span>
          {toCount > 0 ? (
            <Badge
              variant="secondary"
              className="shrink-0 bg-[hsl(var(--accent-2)/0.15)] text-[hsl(var(--accent-2-fg))] border-[hsl(var(--accent-2)/0.3)]"
            >
              {toCount}
            </Badge>
          ) : null}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {toCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleClearParty("to")}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
            >
              {t("Barter:clearAll")}
            </Button>
          ) : null}
          {theirOfferAddControl}
        </div>
      </div>
      {toCount > 0 ? (
        <>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-2 py-1.5 mb-2 bg-[hsl(var(--accent-2)/0.07)] border border-[hsl(var(--accent-2)/0.2)] rounded-md text-xs font-semibold uppercase tracking-wider text-foreground/60">
            <div>{t("Barter:amount")}</div>
            <div>{t("Barter:asset")}</div>
            <div className="w-[72px]" />
          </div>
          <div
            className="rounded-lg border border-[hsl(var(--accent-2)/0.12)] bg-card/30 overflow-hidden"
            style={{ height: toListHeight }}
          >
            <List
              height={toListHeight}
              rowComponent={MemoBarterToRow}
              width="100%"
              rowCount={toCount}
              rowHeight={OFFER_ROW_HEIGHT}
              rowProps={toRowProps}
            />
          </div>
        </>
      ) : (
        <OfferEmptyState
          icon={PackageOpen}
          accent="2"
          title={t("Barter:noAssetsYet")}
          hint={t("Barter:theirOfferEmptyHint", { name: toAccount?.name || "…" })}
        />
      )}
      {toAccount && !canAddTo && !toCount ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("Barter:noBalancesHint")}
        </p>
      ) : null}
      {theirShortfalls.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.07)] p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--accent-danger-fg))]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("Barter:balanceWarningTitle")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Barter:theirBalanceWarning", { name: toAccount?.name || "…" })}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs font-mono text-foreground/85">
            {theirShortfalls.map((s) => (
              <li key={s.symbol}>
                {s.amount} {s.symbol} ({t("Barter:balance", { balance: s.balance, symbol: s.symbol })})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );

  const OffersCard = (
    <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
      <SectionHeader
        icon={ArrowLeftRight}
        step={2}
        title={t("Barter:offersTitle")}
        description={t("Barter:offersDescription")}
      />
      <CardContent className="p-5 sm:p-6">
        {!toAccount ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 px-4 py-8 text-center">
            <span className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.12)] text-[hsl(var(--accent-1-fg))]">
              <UserPlus className="h-4 w-4" />
            </span>
            <p className="text-sm font-medium text-foreground/85">
              {t("Barter:selectCounterpartyFirst")}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed">
              {t("Barter:counterpartyDescription")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {YourOfferPanel}
            {TheirOfferPanel}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ─── Step 3: Escrow (Optional, Switch pattern like create-asset pages) ──
  const EscrowCard = (
    <Card
      className={
        "overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20 transition-colors " +
        (showEscrow ? "ring-1 ring-[hsl(var(--accent-1)/0.35)]" : "")
      }
    >
      <SectionHeader
        icon={Shield}
        step={3}
        optional
        title={t("Barter:useEscrow")}
        description={t("Barter:escrowDescription")}
        right={
          <div className="flex items-center gap-2">
            {showEscrow ? (
              <Badge className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))] border-[hsl(var(--accent-1)/0.35)] hover:bg-[hsl(var(--accent-1)/0.2)]">
                {t("Barter:on")}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                {t("Barter:off")}
              </Badge>
            )}
            <Switch
              checked={showEscrow}
              onCheckedChange={setShowEscrow}
              aria-label={t("Barter:useEscrow")}
              className="shrink-0 data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-white/[0.12] [&>span]:bg-white"
            />
          </div>
        }
      />
      {showEscrow ? (
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="space-y-2 min-w-0">
              <Label className="text-foreground/80">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--accent-1-fg))]">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))]">
                    <Shield className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  {t("Barter:escrowAgent")}
                </span>
              </Label>
              <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center">
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="flex-shrink-0">
                    {escrowAccount ? (
                      <Avatar
                        size={40}
                        name={escrowAccount.name}
                        extra="Escrow"
                        expression={{ eye: "normal", mouth: "open" }}
                        colors={[
                          "#F0AB3D",
                          "#C271B4",
                          "#C20D90",
                          "#92A1C6",
                          "#146A7C",
                        ]}
                      />
                    ) : (
                      <Av className="h-10 w-10">
                        <AvatarFallback>?</AvatarFallback>
                      </Av>
                    )}
                  </div>
                  <Input
                    disabled
                    placeholder={t("Barter:escrowAgentPlaceholder")}
                    value={
                      escrowAccount
                        ? `${escrowAccount.name} (${escrowAccount.id})`
                        : ""
                    }
                    aria-label={t("Barter:escrowAgent")}
                    className="flex-1 min-w-0 !bg-card/40 border-border text-foreground"
                    readOnly
                  />
                </div>
                <Dialog
                  open={escrowUserDialogOpen}
                  onOpenChange={setEscrowUserDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="shrink-0 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)]"
                    >
                      {escrowAccount
                        ? t("Barter:changeAgent")
                        : t("Barter:selectAgent")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[375px] !bg-card border border-border text-foreground/85 rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {t("Transfer:bitsharesAccountSearch")}
                      </DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        {t("Transfer:searchingForAccount")}
                      </DialogDescription>
                    </DialogHeader>
                    <AccountSearch
                      chain={_chain}
                      excludedUsers={
                        usr && toAccount
                          ? [usr, toAccount]
                          : usr
                          ? [usr]
                          : []
                      }
                      setChosenAccount={(acc) => {
                        setEscrowAccount(acc);
                        setEscrowUserDialogOpen(false);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              {escrowConflictsCounterparty ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--accent-danger-fg))]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("Barter:errorEscrowIsCounterparty")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 min-w-0">
              <HoverInfo
                content={t("Barter:escrowPaymentInfo")}
                header={t("Barter:escrowPayment")}
              />
              <div className="relative">
                <Input
                  id="escrow-payment"
                  type="text"
                  inputMode="decimal"
                  value={escrowPayment}
                  onChange={(e) => {
                    const input = e.target.value;
                    const regex = assetAmountRegex({ precision: 5 });
                    if (regex.test(input)) {
                      setEscrowPayment(input);
                    }
                  }}
                  aria-label={t("Barter:escrowPayment")}
                  className="!bg-card/40 border-border text-foreground font-mono tabular-nums pr-16"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-card/60 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {feeAssetSymbol}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.04)] p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t("Barter:sendToEscrowFirst")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {t("Barter:sendToEscrowFirstInfo")}
              </p>
            </div>
            <Switch
              checked={sendToEscrowFirst}
              onCheckedChange={setSendToEscrowFirst}
              aria-label={t("Barter:sendToEscrowFirst")}
              className="shrink-0 data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-white/[0.12] [&>span]:bg-white"
            />
          </div>
        </CardContent>
      ) : (
        <CardContent className="p-5 sm:p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("Barter:escrowOffHint")}
          </p>
        </CardContent>
      )}
    </Card>
  );

  // ─── Step 4: Review & Propose ───────────────────────────────────────
  const chipList = (items) =>
    items.length ? (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item.asset.id}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card/60 px-2 py-1 font-mono text-xs tabular-nums text-foreground/85"
          >
            {item.amount} {item.asset.symbol}
          </span>
        ))}
      </div>
    ) : (
      <span className="text-xs text-muted-foreground/60">—</span>
    );

  const ReviewCard = (
    <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
      <SectionHeader
        icon={Zap}
        step={4}
        title={t("Barter:reviewTitle")}
        description={t("Barter:reviewDescription")}
      />
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-lg border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.04)] p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5">
              {t("Barter:youGive")}
            </div>
            {chipList(fromList)}
          </div>
          <div className="rounded-lg border border-[hsl(var(--accent-2)/0.2)] bg-[hsl(var(--accent-2)/0.04)] p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5">
              {t("Barter:theyGive", { name: toAccount?.name || "…" })}
            </div>
            {chipList(toList)}
          </div>
          <div className="rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5">
              {t("Barter:escrowSummary")}
            </div>
            <div className="text-sm text-foreground/85">
              {showEscrow && escrowAccount ? (
                <span className="font-mono text-xs">
                  {escrowAccount.name} ({escrowAccount.id})
                  {escrowPayment > 0
                    ? ` · ${escrowPayment} ${feeAssetSymbol}`
                    : ""}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t("Barter:noEscrow")}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5">
              {t("Barter:feeSummary")}
            </div>
            <div className="font-mono text-xs tabular-nums text-foreground/85">
              {proposalFee} / {transferFee} {feeAssetSymbol}
            </div>
          </div>
        </div>

        {!canSubmit && disabledReasons.length > 0 ? (
          <div className="rounded-lg border border-[hsl(var(--accent-warning)/0.3)] bg-[hsl(var(--accent-warning)/0.07)] p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--accent-warning-fg))]">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("Barter:whatIsMissing")}
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground leading-relaxed list-disc list-inside">
              {disabledReasons.map((reason, i) => (
                <li key={`${reason}-${i}`}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-2">
          <button
            onClick={() => setShowDialog(true)}
            disabled={!canSubmit}
            className={`w-full h-14 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 text-base group ${
              canSubmit
                ? "text-[hsl(var(--accent-1-gradFg))] bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-2))] to-[hsl(var(--accent-1))] shadow-[0_8px_32px_-12px_rgba(16,185,129,0.7)] hover:shadow-[0_12px_40px_-12px_rgba(16,185,129,0.9)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-2))] hover:to-[hsl(var(--accent-1))]"
                : "text-muted-foreground bg-card/60 border border-border/40 dark:border-white/5 cursor-not-allowed"
            }`}
          >
            <Repeat
              className="h-4 w-4 group-hover:scale-110 transition-transform"
              strokeWidth={2.5}
            />
            {t("Barter:proposeTrade")}
          </button>
          {!canSubmit ? (
            <p className="text-center text-xs text-muted-foreground">
              {t("Barter:disabledHint")}
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              {t("Barter:finalSummary")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // ─── Main Render ─────────────────────────────────────────────────
  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Handshake className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("Barter:title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("Barter:description")}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {CounterpartyCard}
              {OffersCard}
              {EscrowCard}
              {ReviewCard}
            </div>
          </div>
        </div>
      </div>

      {editingAsset && (
        <Dialog
          open={!!editingAsset}
          onOpenChange={(open) => {
            if (!open) {
              setEditingAsset(null);
              setEditAmountInput("");
              setEditAmountError("");
            }
          }}
        >
          <DialogContent className="sm:max-w-[400px] !bg-card border border-border text-foreground/85 rounded-2xl">
            <DialogHeader>
              <DialogTitle>
                {t("Barter:editAmount", { asset: editingAsset.asset.symbol })}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t("Barter:editAmountDescription", {
                  balance: editingBalance,
                  symbol: editingAsset.asset.symbol,
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="decimal"
                value={editAmountInput}
                onChange={(e) => {
                  const input = e.target.value;
                  if (
                    assetAmountRegex({ precision: editingAsset.asset.precision }).test(
                      input
                    )
                  ) {
                    setEditAmountInput(input);
                    setEditAmountError("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSave();
                }}
                aria-label={t("Barter:amount")}
                autoFocus
                className="!bg-card/40 border-border text-foreground font-mono tabular-nums"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setEditAmountInput(String(editingBalance));
                  setEditAmountError("");
                }}
              >
                {t("Barter:useMax")}
              </Button>
            </div>
            {editAmountError ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--accent-danger-fg))]">
                <AlertTriangle className="h-3.5 w-3.5" />
                {editAmountError}
              </p>
            ) : null}
            {parseFloat(editAmountInput) > editingBalance ? (
              <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--accent-warning-fg))]">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("Barter:insufficientBalance")}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingAsset(null);
                  setEditAmountInput("");
                  setEditAmountError("");
                }}
              >
                {t("Barter:cancel")}
              </Button>
              <Button
                onClick={handleEditSave}
                disabled={
                  !editAmountInput || !(parseFloat(editAmountInput) > 0)
                }
              >
                {t("Barter:save")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showDialog && canSubmit && usr && proposalOperations && (
        <DeepLinkDialog
          operationNames={["proposal_create"]}
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={() => setShowDialog(false)}
          key={`Barter_${usr.id}_${toAccount?.id || ""}`}
          headerText={t("Barter:deeplinkHeader", {
            from: usr.username,
            to: toAccount?.name,
          })}
          trxJSON={proposalOperations}
        />
      )}
    </>
  );
}
