import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Coins,
  Droplets,
  HandCoins,
  Handshake,
  Inbox,
  Send,
  Shield,
  X,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import AccountSearch from "@/components/AccountSearch.jsx";
import { Checkbox } from "@/components/ui/checkbox";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createCreditOfferStore } from "@/nanoeffects/CreditOffers.ts";
import { getObjects } from "@/nanoeffects/src/common";
import { humanReadableFloat, assetAmountRegex } from "@/lib/common.js";
import { attachKind, fullObjectId, isAmountWithinAsset } from "@/lib/trollboxAttach.js";

const ATTACH_TYPES = [
  { id: "asset", icon: Coins },
  { id: "pair", icon: ArrowLeftRight },
  { id: "pool", icon: Droplets },
  { id: "offer", icon: HandCoins },
  { id: "barter", icon: Handshake },
];

function formatDuration(totalSeconds) {
  const s = Number(totalSeconds);
  if (!Number.isFinite(s) || s <= 0) {
    return "—";
  }
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  if (d > 0) {
    return `${d}d ${h}h`;
  }
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function offerAssetSymbol(o, assets) {
  return (
    (assets || []).find((a) => a && a.id === o.asset_type)?.symbol ??
    o.asset_type
  );
}

function offerOwner(o) {
  return o.owner_name ?? o.owner_account;
}

// Instance number of a "1.space.x" object ID for on-chain storage.
// Attachments store bare integers; the space prefix is re-attached on read.
function toInstance(objectId) {
  const n = parseInt(String(objectId).split(".").pop(), 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

const POOL_ROW_HEIGHT = 96;
const POOL_MAX_VISIBLE_ROWS = 3;
const TrollboxPoolRow = React.memo(function TrollboxPoolRow({
  index,
  style,
  pools,
  poolId,
  assets,
  issuerNames,
  issuerLabel,
  onSelect,
}) {
  const p = pools[index];
  if (!p) {
    return null;
  }
  const isSelected = poolId === p.id;
  const legA = (assets || []).find((a) => a && a.id === p.asset_a_id);
  const legB = (assets || []).find((a) => a && a.id === p.asset_b_id);
  const issuerId = (assets || []).find(
    (a) => a && a.id === p.share_asset_id
  )?.issuer;
  return (
    <div style={{ ...style, paddingBottom: "8px", paddingRight: "4px" }}>
      <button
        type="button"
        onClick={() => onSelect(p)}
        className={
          isSelected
            ? "h-full w-full relative overflow-hidden text-left rounded-xl border border-[hsl(var(--accent-1)/0.6)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.15)] to-[hsl(var(--accent-2)/0.1)] px-4 py-3 transition-all"
            : "h-full w-full relative overflow-hidden text-left rounded-xl border border-border bg-card/40 px-4 py-3 transition-all hover:border-accent/60 hover:bg-card/60"
        }
      >
        <div className="flex items-center gap-2">
          {isSelected ? (
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent-1)/0.3)] border border-[hsl(var(--accent-1)/0.6)]">
              <Check className="h-2.5 w-2.5" />
            </span>
          ) : (
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border" />
          )}
          <span className="text-xs font-mono font-semibold tracking-wider shrink-0">
            #{p.id.split(".")[2]}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border bg-accent/40 font-semibold text-muted-foreground shrink-0">
            {(Number(p.taker_fee_percent ?? 0) / 100).toFixed(2)}%
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground truncate">
            {issuerLabel}: {issuerId ? (issuerNames[issuerId] ?? issuerId) : "—"}
          </span>
        </div>
        <div className="mt-2 space-y-1 text-[11px] font-mono tabular-nums text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-sans font-medium truncate">
              {p.asset_a_symbol}
            </span>
            <span className="text-right truncate">
              {humanReadableFloat(p.balance_a, legA ? legA.precision : 4)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-sans font-medium truncate">
              {p.asset_b_symbol}
            </span>
            <span className="text-right truncate">
              {humanReadableFloat(p.balance_b, legB ? legB.precision : 4)}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
});

const BARTER_LEG_LIMIT = 5;
const BARTER_LEG_ROW_HEIGHT = 52;
const BARTER_LEG_MAX_ROWS = 3;

const BarterLegRow = React.memo(function BarterLegRow({
  index,
  style,
  entries,
  onRemove,
  removeLabel,
}) {
  const e = entries[index];
  if (!e) {
    return null;
  }
  return (
    <div style={{ ...style, paddingBottom: "6px", paddingRight: "2px" }}>
      <div className="flex h-full items-center gap-2 rounded-lg border border-border bg-accent/20 px-2.5 text-sm overflow-hidden">
        <span className="font-mono truncate">{e.amount}</span>
        <span className="font-semibold truncate">{e.symbol}</span>
        <button
          type="button"
          aria-label={removeLabel}
          onClick={() => onRemove(e.id)}
          className="ml-auto shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

function BarterLegEditor(properties) {
  const {
    title,
    tone,
    entries,
    marketSearch,
    chain,
    balances,
    assets,
    excludeIds,
    capToBalance,
    showBalance,
    balanceLabel,
    addAssetLabel,
    maxAssetsLabel,
    amountPlaceholder,
    addLabel,
    cancelLabel,
    emptyLabel,
    removeLabel,
    onAdd,
    onRemove,
  } = properties;
  const [staged, setStaged] = useState(null); // {symbol, id} picked, awaiting amount
  const [amount, setAmount] = useState("");

  const stagedAsset = (assets || []).find(
    (a) => a && staged && a.id === staged.id
  );
  // Offer side: only assets actually held (balance > 0) are pickable, so
  // an offered asset can never exceed an empty balance. While balances
  // are still loading the restriction stays off (no false-empty picker).
  const ownedIds = useMemo(() => {
    if (!capToBalance || balances === undefined) {
      return null;
    }
    return new Set(
      (balances || [])
        .filter((b) => b && Number(b.amount) > 0)
        .map((b) => b.asset_id)
    );
  }, [capToBalance, balances]);
  // Gate keystrokes by the asset's precision (mirrors the barter page's
  // escrow fee field): invalid intermediate input never enters state, so
  // downstream validation and display always see well-formed amounts.
  const handleAmountChange = useCallback(
    (value) => {
      if (
        !stagedAsset ||
        assetAmountRegex({ precision: stagedAsset.precision }).test(value)
      ) {
        setAmount(value);
      }
    },
    [stagedAsset]
  );
  const handleStoreStaged = useCallback(
    (s) => {
      const found = (marketSearch || []).find((m) => m && m.s === s);
      if (!found) {
        return;
      }
      setStaged((prev) =>
        prev && prev.symbol === s ? prev : { symbol: s, id: found.id }
      );
    },
    [marketSearch]
  );
  const stagedBalanceEntry =
    showBalance && stagedAsset
      ? (balances || []).find((b) => b.asset_id === stagedAsset.id)
      : null;
  const stagedBalanceHuman =
    stagedBalanceEntry && stagedAsset
      ? humanReadableFloat(stagedBalanceEntry.amount, stagedAsset.precision)
      : 0;
  const amountValid =
    stagedAsset &&
    typeof amount === "string" &&
    assetAmountRegex({ precision: stagedAsset.precision }).test(amount) &&
    parseFloat(amount) > 0 &&
    (!capToBalance || parseFloat(amount) <= stagedBalanceHuman);

  const isOffer = tone === "offer";
  const TitleIcon = isOffer ? Send : Inbox;
  const atMax = entries.length >= BARTER_LEG_LIMIT;

  return (
    <div
      className={
        isOffer
          ? "space-y-2 rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-4"
          : "space-y-2 rounded-xl border border-[hsl(var(--accent-2)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.06)] to-transparent p-4"
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            isOffer
              ? "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
              : "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-2)/0.15)] border border-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]"
          }
        >
          <TitleIcon className="h-3 w-3" strokeWidth={2.5} />
        </span>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="ml-auto shrink-0">
          {atMax ? (
            <Button size="sm" disabled>
              {maxAssetsLabel}
            </Button>
          ) : (
            <AssetDropDown
              assetSymbol=""
              assetData={null}
              storeCallback={handleStoreStaged}
              otherAssets={excludeIds}
              allowedIds={ownedIds ? [...ownedIds] : undefined}
              initialMode={capToBalance ? "balances" : undefined}
              marketSearch={marketSearch}
              chain={chain}
              balances={balances}
              triggerLabel={addAssetLabel}
              triggerVariant="outline"
            />
          )}
        </div>
      </div>
      {staged ? (
        <div className="rounded-lg border border-border bg-accent/20 p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">
              {staged.symbol}
            </span>
            <button
              type="button"
              aria-label={cancelLabel}
              onClick={() => {
                setStaged(null);
                setAmount("");
              }}
              className="ml-auto shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2 items-start">
            <div className="min-w-0 flex-1">
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder={amountPlaceholder}
                className="font-mono"
                autoFocus
              />
              {showBalance && stagedAsset ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {balanceLabel}:{" "}
                  {stagedBalanceEntry
                    ? humanReadableFloat(
                        stagedBalanceEntry.amount,
                        stagedAsset.precision
                      )
                    : 0}{" "}
                  {stagedAsset.symbol}
                </p>
              ) : null}
            </div>
            <Button
              size="sm"
              className="mt-0.5 shrink-0"
              disabled={!amountValid}
              onClick={() => {
                onAdd(staged.id, staged.symbol, amount);
                setStaged(null);
                setAmount("");
              }}
            >
              {addLabel}
            </Button>
          </div>
        </div>
      ) : null}
      {entries.length > 0 ? (
        <List
          rowComponent={BarterLegRow}
          rowCount={entries.length}
          rowHeight={BARTER_LEG_ROW_HEIGHT}
          height={
            Math.min(entries.length, BARTER_LEG_MAX_ROWS) *
            BARTER_LEG_ROW_HEIGHT
          }
          width="100%"
          rowProps={{ entries, onRemove, removeLabel }}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

export default function TrollboxAttachDialog(properties) {
  const {
    open,
    onOpenChange,
    chain,
    nodeUrl,
    usr,
    assets,
    marketSearch,
    pools,
    allowedTypes,
    initialValue,
    onAttach,
  } = properties;
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const [view, setView] = useState("types");
  const [picked, setPicked] = useState(null); // {attach, label}
  const [assetA, setAssetA] = useState(null); // {symbol, id}
  const [assetB, setAssetB] = useState(null);
  const [poolId, setPoolId] = useState(null);
  const [offers, setOffers] = useState(null);
  const [offersLoading, setOffersLoading] = useState(false);
  const [filterOfferAsset, setFilterOfferAsset] = useState(null);
  const [filterOfferLender, setFilterOfferLender] = useState(null);
  const [barterOffer, setBarterOffer] = useState([]);
  const [barterWant, setBarterWant] = useState([]);
  const [barterEscrow, setBarterEscrow] = useState(false);
  const [barterAgent, setBarterAgent] = useState(null);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [barterFee, setBarterFee] = useState("");
  const [barterFirst, setBarterFirst] = useState("me");
  const [usrBalances, setUsrBalances] = useState();

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Freshly opened: restore a pending barter attachment for editing,
      // otherwise start clean. Symbols + agent name are re-resolved from
      // the stored ids (labels are never trusted for identity).
      const initAttach = initialValue && initialValue.attach;
      if (initAttach && attachKind(initAttach) === "barter") {
        const toEntry = (e) => {
          const fullId = fullObjectId(3, e.a);
          const asset = (assets || []).find((a) => a && a.id === fullId);
          return {
            id: fullId,
            symbol: asset ? asset.symbol : `#${e.a}`,
            amount: e.n,
          };
        };
        setView("barter");
        setBarterOffer((initAttach.offer || []).map(toEntry));
        setBarterWant((initAttach.want || []).map(toEntry));
        if (initAttach.escrow) {
          const agentInst = initAttach.escrow.a;
          const agentId =
            Number.isInteger(agentInst) && agentInst >= 0
              ? `1.2.${agentInst}`
              : null;
          if (agentId) {
            setBarterEscrow(true);
            setBarterAgent({
              id: agentId,
              name: initialValue.agentName || agentId,
            });
            setBarterFee(initAttach.escrow.f);
            setBarterFirst(
              initAttach.escrow.first === "them" ? "them" : "me"
            );
          } else {
            setBarterEscrow(false);
            setBarterAgent(null);
            setBarterFee("");
            setBarterFirst("me");
          }
        } else {
          setBarterEscrow(false);
          setBarterAgent(null);
          setBarterFee("");
          setBarterFirst("me");
        }
      } else {
        setView("types");
        setPicked(null);
        setAssetA(null);
        setAssetB(null);
        setPoolId(null);
        setFilterOfferAsset(null);
        setFilterOfferLender(null);
        setBarterOffer([]);
        setBarterWant([]);
        setBarterEscrow(false);
        setBarterAgent(null);
        setBarterFee("");
        setBarterFirst("me");
      }
    }
    if (!open) {
      setView("types");
      setPicked(null);
      setAssetA(null);
      setAssetB(null);
      setPoolId(null);
      setFilterOfferAsset(null);
      setFilterOfferLender(null);
      setBarterOffer([]);
      setBarterWant([]);
      setBarterEscrow(false);
      setBarterAgent(null);
      setBarterFee("");
      setBarterFirst("me");
    }
    prevOpenRef.current = open;
  }, [open, initialValue, assets]);

  useEffect(() => {
    if (!open || !usr || !usr.id) {
      setUsrBalances(undefined);
      return undefined;
    }
    const store = createUserBalancesStore([chain, usr.id, nodeUrl]);
    const unsub = store.subscribe(({ data, error, loading }) => {
      if (data && !error && !loading) {
        setUsrBalances(
          data.filter((balance) =>
            (assets || []).find((x) => x.id === balance.asset_id)
          )
        );
      }
    });
    return () => unsub();
  }, [open, chain, usr, nodeUrl, assets]);

  useEffect(() => {
    if (!open || view !== "offer") {
      return undefined;
    }
    setOffersLoading(true);
    const store = createCreditOfferStore([chain, nodeUrl]);
    const unsub = store.subscribe(({ data, error, loading }) => {
      if (!loading) {
        setOffersLoading(false);
        if (data && !error) {
          const now = Date.now();
          setOffers(
            data.filter(
              (o) =>
                o &&
                o.enabled &&
                Number(o.current_balance) > 0 &&
                (!o.auto_disable_time ||
                  new Date(`${o.auto_disable_time}Z`).getTime() > now)
            )
          );
        }
      }
    });
    return () => unsub();
  }, [open, view, chain, nodeUrl]);

  const assetBySymbol = useMemo(() => {
    const map = {};
    for (const a of assets || []) {
      if (a && a.symbol) {
        map[a.symbol] = a;
      }
    }
    return map;
  }, [assets]);

  // Pool-scoped asset symbols, SimpleSwap-style: A lists every asset that
  // appears in a pool, B lists only assets sharing a pool with A. Assets
  // without pools can never be picked here. Declared before the effects
  // below: their dep arrays read these on every render, so they must be
  // initialized first (TDZ otherwise).
  const poolAssets = useMemo(() => {
    const all = (pools || []).flatMap((p) =>
      p ? [p.asset_a_symbol, p.asset_b_symbol] : []
    );
    return [...new Set(all.filter(Boolean))].sort();
  }, [pools]);

  const possiblePoolAssets = useMemo(() => {
    if (!assetA || !pools || !pools.length) {
      return [];
    }
    const legs = pools.flatMap((p) => {
      if (!p) {
        return [];
      }
      if (p.asset_a_symbol === assetA.symbol) {
        return [p.asset_b_symbol];
      }
      if (p.asset_b_symbol === assetA.symbol) {
        return [p.asset_a_symbol];
      }
      return [];
    });
    return [...new Set(legs.filter(Boolean))].sort();
  }, [pools, assetA]);

  const finalPools = useMemo(() => {
    if (!assetA || !assetB) {
      return [];
    }
    return (pools || []).filter(
      (p) =>
        p &&
        ((p.asset_a_symbol === assetA.symbol &&
          p.asset_b_symbol === assetB.symbol) ||
          (p.asset_a_symbol === assetB.symbol &&
            p.asset_b_symbol === assetA.symbol))
    );
  }, [pools, assetA, assetB]);

  // Barter attachments are exclusive to channels that allow them.
  // Defaults to everything except barter (safe: barter is opt-in per
  // channel, and the composer never opens the dialog where disallowed).
  const allowed = allowedTypes ?? ["asset", "pair", "pool", "offer"];
  const visibleTypes = ATTACH_TYPES.filter((t) => allowed.includes(t.id));

  // Bounce out of a disallowed view if the channel changed underneath.
  useEffect(() => {
    if (!allowed.includes(view) && view !== "types") {
      setView("types");
      setPicked(null);
    }
  }, [allowed, view]);
  // likely the one sharing, so readers see who stands behind a pool).
  const [issuerNames, setIssuerNames] = useState({});
  useEffect(() => {
    if (view !== "pool" || finalPools.length === 0) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const issuerIds = [
          ...new Set(
            finalPools
              .map(
                (p) =>
                  (assets || []).find((a) => a && a.id === p.share_asset_id)
                    ?.issuer
              )
              .filter(Boolean)
          ),
        ];
        if (issuerIds.length === 0) {
          return;
        }
        const accounts = await getObjects(chain, issuerIds, nodeUrl || null);
        if (cancelled) {
          return;
        }
        const map = {};
        for (const a of accounts || []) {
          if (a && a.id) {
            map[a.id] = a.name ?? a.id;
          }
        }
        setIssuerNames((prev) => ({ ...prev, ...map }));
      } catch {
        // keep raw issuer ids as fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, finalPools, assets, chain, nodeUrl]);

  // Keep pool selection valid as A/B change (SimpleSwap-style stickiness).
  useEffect(() => {
    if (view !== "pool") {
      return;
    }
    if (assetB && !possiblePoolAssets.includes(assetB.symbol)) {
      setAssetB(null);
    }
  }, [view, assetA, assetB, possiblePoolAssets]);
  useEffect(() => {
    if (view !== "pool") {
      return;
    }
    if (poolId && !finalPools.some((p) => p.id === poolId)) {
      setPoolId(null);
      setPicked(null);
    }
  }, [view, poolId, finalPools]);

  const pickAsset = (symbol, slot) => {
    const found =
      (marketSearch || []).find((m) => m && m.s === symbol) || null;
    if (!found) {
      return;
    }
    const id = toInstance(found.id);
    if (id === null) {
      return;
    }
    const entry = { symbol, id };
    if (slot === "B") {
      setAssetB(entry);
    } else if (slot === "A") {
      setAssetA(entry);
    } else {
      setPicked({ attach: { t: 3, id }, label: symbol });
    }
  };

  useEffect(() => {
    if (view !== "pair" && view !== "pool") {
      return;
    }
    if (assetA && assetB && assetA.symbol !== assetB.symbol) {
      if (view === "pair") {
        const a = assetBySymbol[assetA.symbol];
        const b = assetBySymbol[assetB.symbol];
        const aId = a ? toInstance(a.id) : null;
        const bId = b ? toInstance(b.id) : null;
        if (aId !== null && bId !== null) {
          setPicked({
            attach: { t: 3, a: aId, b: bId },
            label: `${assetA.symbol}/${assetB.symbol}`,
          });
          return;
        }
      }
    }
    if (view === "pair") {
      setPicked(null);
    }
  }, [view, assetA, assetB, assetBySymbol]);

  const offerAssetOptions = useMemo(() => {
    const set = new Set();
    for (const o of offers || []) {
      if (o) {
        set.add(offerAssetSymbol(o, assets));
      }
    }
    return [...set].sort();
  }, [offers, assets]);

  const offerLenderOptions = useMemo(() => {
    const set = new Set();
    for (const o of offers || []) {
      if (o) {
        set.add(offerOwner(o));
      }
    }
    return [...set].sort();
  }, [offers]);

  const filteredOffers = useMemo(() => {
    if (!offers) {
      return null;
    }
    return offers.filter(
      (o) =>
        o &&
        (!filterOfferAsset || offerAssetSymbol(o, assets) === filterOfferAsset) &&
        (!filterOfferLender || offerOwner(o) === filterOfferLender)
    );
  }, [offers, filterOfferAsset, filterOfferLender, assets]);

  // Stable identities for the leg editors: fresh arrays/callbacks every
  // render would bust AssetDropDown's memos (full-market Fuse rebuilds)
  // and freeze typing anywhere in this dialog.
  const barterExcludeIds = useMemo(
    () => [
      ...barterOffer.map((e) => e.symbol),
      ...barterWant.map((e) => e.symbol),
    ],
    [barterOffer, barterWant]
  );
  const handleBarterOfferAdd = useCallback((id, symbol, amount) => {
    setBarterOffer((prev) => {
      if (prev.some((e) => e.id === id) || prev.length >= BARTER_LEG_LIMIT) {
        return prev;
      }
      return [...prev, { id, symbol, amount }];
    });
  }, []);
  const handleBarterOfferRemove = useCallback((id) => {
    setBarterOffer((prev) => prev.filter((e) => e.id !== id));
  }, []);
  const handleBarterWantAdd = useCallback((id, symbol, amount) => {
    setBarterWant((prev) => {
      if (prev.some((e) => e.id === id) || prev.length >= BARTER_LEG_LIMIT) {
        return prev;
      }
      return [...prev, { id, symbol, amount }];
    });
  }, []);
  const handleBarterWantRemove = useCallback((id) => {
    setBarterWant((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const confirmDisabled = !picked;

  // Keep the footer Attach button in sync with the barter form. Pure
  // derivation (no setState-in-effect): the footer confirms explicitly.
  const toInstance = (id) => {
    const n = parseInt(String(id).split(".").pop(), 10);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };
  const validBarterLeg = (leg) => {
    if (!Array.isArray(leg) || leg.length === 0 || leg.length > 5) {
      return null;
    }
    const out = [];
    const seen = new Set();
    for (const e of leg) {
      const inst = toInstance(e && e.id);
      const asset = (assets || []).find((a) => a && a.id === e?.id);
      if (
        inst === null ||
        seen.has(inst) ||
        !asset ||
        typeof e.amount !== "string" ||
        !assetAmountRegex({ precision: asset.precision }).test(e.amount) ||
        !(parseFloat(e.amount) > 0) ||
        // Cached-data cap: amount must fit precision and max_supply.
        !isAmountWithinAsset(e.amount, asset)
      ) {
        return null;
      }
      seen.add(inst);
      out.push({ a: inst, n: e.amount });
    }
    return out;
  };
  const barterStaged = useMemo(() => {
    if (view !== "barter") {
      return null;
    }
    const offer = validBarterLeg(barterOffer);
    const want = validBarterLeg(barterWant);
    if (!offer || !want) {
      return null;
    }
    const attach = { t: 99, offer, want };
    if (barterEscrow) {
      const agentId = barterAgent ? toInstance(barterAgent.id) : null;
      const feeOk =
        typeof barterFee === "string" &&
        assetAmountRegex({ precision: 5 }).test(barterFee) &&
        parseFloat(barterFee) > 0;
      if (
        agentId === null ||
        !feeOk ||
        (barterFirst !== "me" && barterFirst !== "them")
      ) {
        return null;
      }
      attach.escrow = { a: agentId, f: barterFee, first: barterFirst };
    }
    const oSyms = barterOffer.map((e) => e.symbol).join("+");
    const wSyms = barterWant.map((e) => e.symbol).join("+");
    return { attach, label: `${oSyms} ⇄ ${wSyms}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    view,
    barterOffer,
    barterWant,
    barterEscrow,
    barterAgent,
    barterFee,
    barterFirst,
    assets,
  ]);

  const handlePoolSelect = useCallback((p) => {
    const id = toInstance(p.id);
    if (id === null) {
      return;
    }
    setPoolId(p.id);
    setPicked({
      attach: { t: 19, id },
      label: `${p.asset_a_symbol}/${p.asset_b_symbol}`,
    });
  }, []);

  const issuerLabel = t("Trollbox:poolIssuer", "Issuer");
  const poolRowProps = useMemo(
    () => ({
      pools: finalPools,
      poolId,
      assets,
      issuerNames,
      issuerLabel,
      onSelect: handlePoolSelect,
    }),
    [finalPools, poolId, assets, issuerNames, issuerLabel, handlePoolSelect]
  );

  const handleConfirm = () => {
    if (!picked) {
      return;
    }
    onAttach(picked);
    onOpenChange(false);
  };

  // Barter bypasses `picked` (staged derivation above feeds the footer
  // directly, so no setState-in-effect loop is possible). Agent display
  // name rides along (display-only; identity is always the stored id).
  const handleFooterConfirm = () => {
    if (view === "barter") {
      if (!barterStaged) {
        return;
      }
      onAttach({
        ...barterStaged,
        agentName: barterAgent && barterEscrow ? barterAgent.name : null,
      });
      onOpenChange(false);
      return;
    }
    handleConfirm();
  };
  const footerDisabled = view === "barter" ? !barterStaged : confirmDisabled;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>
            {view === "types"
              ? t("Trollbox:attachTitle", "Attach to message")
              : `${t("Trollbox:attachTitle", "Attach to message")} - ${t(
                  `Trollbox:attachType${view[0].toUpperCase()}${view.slice(1)}`,
                  view
                )}`}
          </DialogTitle>
          {view === "types" ? (
            <DialogDescription>
              {t(
                "Trollbox:attachTypeDesc",
                "Pick what to attach — only one item per message."
              )}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {view === "types" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleTypes.map(({ id, icon: Icon }) => (
              <Button
                key={id}
                variant="outline"
                className="h-auto justify-start p-3"
                onClick={() => {
                  setPicked(null);
                  setAssetA(null);
                  setAssetB(null);
                  setPoolId(null);
                  setView(id);
                }}
              >
                <Icon className="mr-2 h-5 w-5 shrink-0" />
                <span className="text-left">
                  <span className="block text-sm font-semibold">
                    {t(`Trollbox:attachType${id[0].toUpperCase()}${id.slice(1)}`, id)}
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {t(
                      `Trollbox:attachType${id[0].toUpperCase()}${id.slice(1)}Hint`,
                      ""
                    )}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        ) : null}

        {view === "asset" ? (
          <div className="space-y-2">
            <AssetDropDown
              assetSymbol=""
              assetData={null}
              storeCallback={(symbol) => pickAsset(symbol, null)}
              marketSearch={marketSearch}
              chain={chain}
              balances={usrBalances}
              triggerLabel={t("Trollbox:attachSelectAsset", "Select asset…")}
              triggerVariant="outline"
              triggerClassName="w-full"
            />
            {picked ? (
              <Badge variant="secondary">{picked.label}</Badge>
            ) : null}
          </div>
        ) : null}

        {view === "pair" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <AssetDropDown
                assetSymbol={assetA ? assetA.symbol : ""}
                assetData={null}
                storeCallback={(symbol) => pickAsset(symbol, "A")}
                otherAsset={assetB ? assetB.symbol : undefined}
                marketSearch={marketSearch}
                chain={chain}
                balances={usrBalances}
                triggerLabel={t("Trollbox:attachSelectA", "First asset…")}
                triggerVariant="outline"
                triggerClassName="w-full"
              />
              <AssetDropDown
                assetSymbol={assetB ? assetB.symbol : ""}
                assetData={null}
                storeCallback={(symbol) => pickAsset(symbol, "B")}
                otherAsset={assetA ? assetA.symbol : undefined}
                marketSearch={marketSearch}
                chain={chain}
                balances={usrBalances}
                triggerLabel={t("Trollbox:attachSelectB", "Second asset…")}
                triggerVariant="outline"
                triggerClassName="w-full"
              />
            </div>
            {picked ? (
              <Badge variant="secondary">{picked.label}</Badge>
            ) : null}
          </div>
        ) : null}

        {view === "pool" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="trollbox-pool-a">
                  {t("Trollbox:poolAssetA", "Asset A")}
                </Label>
                <Select
                  value={assetA ? assetA.symbol : ""}
                  onValueChange={(symbol) => {
                    setAssetA({ symbol });
                    setPoolId(null);
                    setPicked(null);
                  }}
                >
                  <SelectTrigger id="trollbox-pool-a" className="w-full">
                    <SelectValue
                      placeholder={t("Trollbox:attachSelectA", "First asset…")}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {poolAssets.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="trollbox-pool-b">
                  {t("Trollbox:poolAssetB", "Asset B")}
                </Label>
                <Select
                  value={assetB ? assetB.symbol : ""}
                  onValueChange={(symbol) => {
                    setAssetB({ symbol });
                    setPoolId(null);
                    setPicked(null);
                  }}
                  disabled={!assetA}
                >
                  <SelectTrigger id="trollbox-pool-b" className="w-full">
                    <SelectValue
                      placeholder={t("Trollbox:attachSelectB", "Second asset…")}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {possiblePoolAssets.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {assetA && assetB ? (
              finalPools.length > 0 ? (
                <List
                  rowComponent={TrollboxPoolRow}
                  rowCount={finalPools.length}
                  rowHeight={POOL_ROW_HEIGHT}
                  height={
                    Math.min(finalPools.length, POOL_MAX_VISIBLE_ROWS) *
                    POOL_ROW_HEIGHT
                  }
                  width="100%"
                  rowProps={poolRowProps}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Trollbox:attachNoPools",
                    "No pools exist for this asset pair."
                  )}
                </p>
              )
            ) : null}
          </div>
        ) : null}

        {view === "offer" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="trollbox-offer-asset">
                  {t("Trollbox:filterBorrowAsset", "Borrowable asset")}
                </Label>
                <Select
                  value={filterOfferAsset ?? "__all"}
                  onValueChange={(v) =>
                    setFilterOfferAsset(v === "__all" ? null : v)
                  }
                >
                  <SelectTrigger id="trollbox-offer-asset" className="w-full">
                    <SelectValue
                      placeholder={t("Trollbox:filterAllOption", "All")}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    <SelectItem value="__all">
                      {t("Trollbox:filterAllOption", "All")}
                    </SelectItem>
                    {offerAssetOptions.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="trollbox-offer-lender">
                  {t("Trollbox:filterLender", "Lender")}
                </Label>
                <Select
                  value={filterOfferLender ?? "__all"}
                  onValueChange={(v) =>
                    setFilterOfferLender(v === "__all" ? null : v)
                  }
                >
                  <SelectTrigger id="trollbox-offer-lender" className="w-full">
                    <SelectValue
                      placeholder={t("Trollbox:filterAllOption", "All")}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    <SelectItem value="__all">
                      {t("Trollbox:filterAllOption", "All")}
                    </SelectItem>
                    {offerLenderOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {offersLoading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Spinner />
                {t("Trollbox:attachLoadingOffers", "Loading credit offers…")}
              </div>
            ) : filteredOffers && filteredOffers.length > 0 ? (
              <div>
                <p className="px-1 pb-1 text-xs text-muted-foreground">
                  {t("Trollbox:offersResultCount", "{{count}} found", {
                    count: filteredOffers.length,
                  })}
                </p>
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                  {filteredOffers.map((o) => {
                  const asset = (assets || []).find(
                    (a) => a && a.id === o.asset_type
                  );
                  const symbol = asset ? asset.symbol : o.asset_type;
                  const precision = asset ? asset.precision : 5;
                  const isSelected =
                    picked && picked.attach.t === 21 && picked.attach.id === toInstance(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        const id = toInstance(o.id);
                        if (id === null) {
                          return;
                        }
                        setPicked({
                          attach: { t: 21, id },
                          label: `${symbol} ${t("Trollbox:attachOfferLabel", "offer")}`,
                        });
                      }}
                      className={
                        isSelected
                          ? "relative overflow-hidden w-full text-left rounded-xl border border-[hsl(var(--accent-1)/0.6)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.15)] to-[hsl(var(--accent-2)/0.1)] px-4 py-3 transition-all"
                          : "relative overflow-hidden w-full text-left rounded-xl border border-border bg-card/40 px-4 py-3 transition-all hover:border-accent/60 hover:bg-card/60"
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.8)] to-transparent"
                        style={{ opacity: isSelected ? 1 : 0 }}
                      />
                      <span className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent-1)/0.3)] border border-[hsl(var(--accent-1)/0.6)]">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        ) : (
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border" />
                        )}
                        <span className="text-xs font-mono font-semibold tracking-wider shrink-0">
                          #{o.id.replace("1.21.", "")}
                        </span>
                        <span className="text-sm font-semibold truncate">
                          {symbol} ·{" "}
                          {(Number(o.fee_rate) / 10000).toFixed(2)}%
                        </span>
                      </span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {t("Trollbox:attachOfferMin", "Min")}:{" "}
                        {humanReadableFloat(
                          o.min_deal_amount,
                          precision
                        )}{" "}
                        · {formatDuration(o.max_duration_seconds)} ·{" "}
                        {o.owner_name ?? o.owner_account}
                      </span>
                    </button>
                  );
                })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(
                  "Trollbox:attachNoOffers",
                  "No credit offers available right now."
                )}
              </p>
            )}
          </div>
        ) : null}

        {view === "barter" ? (
          <div className="space-y-3">
            <BarterLegEditor
              title={t("Trollbox:barterOfferTitle", "Your offer")}
              tone="offer"
              entries={barterOffer}
              marketSearch={marketSearch}
              chain={chain}
              balances={usrBalances}
              assets={assets}
              excludeIds={barterExcludeIds}
              capToBalance
              showBalance
              balanceLabel={t("Trollbox:barterBalance", "Balance")}
              addAssetLabel={t("Trollbox:barterAddAsset", "Add asset")}
              maxAssetsLabel={t("Trollbox:barterMaxAssets", "Max assets")}
              cancelLabel={t("Trollbox:barterCancel", "Cancel")}
              emptyLabel={t("Trollbox:barterEmptyLeg", "No assets added yet.")}
              amountPlaceholder={t("Trollbox:barterAmount", "Amount")}
              addLabel={t("Trollbox:barterAdd", "Add")}
              removeLabel={t("Trollbox:barterRemoveAsset", "Remove asset")}
              onAdd={handleBarterOfferAdd}
              onRemove={handleBarterOfferRemove}
            />
            <BarterLegEditor
              title={t("Trollbox:barterWantTitle", "Your want")}
              tone="want"
              entries={barterWant}
              marketSearch={marketSearch}
              chain={chain}
              balances={usrBalances}
              assets={assets}
              excludeIds={barterExcludeIds}
              addAssetLabel={t("Trollbox:barterAddAsset", "Add asset")}
              maxAssetsLabel={t("Trollbox:barterMaxAssets", "Max assets")}
              cancelLabel={t("Trollbox:barterCancel", "Cancel")}
              emptyLabel={t("Trollbox:barterEmptyLeg", "No assets added yet.")}
              amountPlaceholder={t("Trollbox:barterAmount", "Amount")}
              addLabel={t("Trollbox:barterAdd", "Add")}
              removeLabel={t("Trollbox:barterRemoveAsset", "Remove asset")}
              onAdd={handleBarterWantAdd}
              onRemove={handleBarterWantRemove}
            />
            <div className="rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.04)] to-transparent p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="barter-use-escrow"
                  checked={barterEscrow}
                  onCheckedChange={(v) => setBarterEscrow(!!v)}
                />
                <Label
                  htmlFor="barter-use-escrow"
                  className="text-sm font-semibold text-foreground inline-flex items-center gap-2"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                    <Shield className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  {t("Trollbox:barterEscrow", "Use escrow agent")}
                </Label>
              </div>
              {barterEscrow ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      disabled
                      readOnly
                      value={
                        barterAgent
                          ? `${barterAgent.name} (${barterAgent.id})`
                          : ""
                      }
                      placeholder={t(
                        "Trollbox:barterSelectAgent",
                        "Select escrow agent…"
                      )}
                      className="flex-1"
                    />
                    <Dialog
                      open={agentDialogOpen}
                      onOpenChange={setAgentDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          {t("Trollbox:barterSelectAgent", "Select escrow agent…")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[375px]">
                        <DialogHeader>
                          <DialogTitle>
                            {t(
                              "Trollbox:barterSelectAgentTitle",
                              "Choose escrow agent"
                            )}
                          </DialogTitle>
                        </DialogHeader>
                        <AccountSearch
                          chain={chain}
                          excludedUsers={usr ? [usr] : []}
                          setChosenAccount={(acc) => {
                            setBarterAgent({ id: acc.id, name: acc.name });
                            setAgentDialogOpen(false);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="barter-escrow-fee">
                        {t("Trollbox:barterEscrowFee", "Escrow fee (BTS)")}
                      </Label>
                      <Input
                        id="barter-escrow-fee"
                        type="text"
                        inputMode="decimal"
                        value={barterFee}
                        onChange={(e) => {
                          // BTS precision is 5: reject keystrokes beyond it
                          // (same gate as the barter page) so the field can
                          // never hold an unserializable value.
                          const v = e.target.value;
                          if (
                            assetAmountRegex({ precision: 5 }).test(v)
                          ) {
                            setBarterFee(v);
                          }
                        }}
                        placeholder="0.0"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="barter-first">
                        {t("Trollbox:barterFirst", "Who sends first")}
                      </Label>
                      <Select
                        value={barterFirst}
                        onValueChange={(v) => {
                          if (v === "me" || v === "them") {
                            setBarterFirst(v);
                          }
                        }}
                      >
                        <SelectTrigger id="barter-first" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="me">
                            {t("Trollbox:barterFirstMe", "I send first")}
                          </SelectItem>
                          <SelectItem value="them">
                            {t(
                              "Trollbox:barterFirstThem",
                              "Counterparty sends first"
                            )}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {view !== "types" ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => {
                setView("types");
                setPicked(null);
                setAssetA(null);
                setAssetB(null);
                setPoolId(null);
                setFilterOfferAsset(null);
                setFilterOfferLender(null);
                setBarterOffer([]);
                setBarterWant([]);
                setBarterEscrow(false);
                setBarterAgent(null);
                setBarterFee("");
                setBarterFirst("me");
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("Trollbox:attachBack", "Back")}
            </Button>
            <Button
              disabled={footerDisabled}
              onClick={handleFooterConfirm}
            >
              <Check className="mr-1 h-4 w-4" />
              {t("Trollbox:attachConfirm", "Attach")}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
