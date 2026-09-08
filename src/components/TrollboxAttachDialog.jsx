import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Coins,
  Droplets,
  HandCoins,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createCreditOfferStore } from "@/nanoeffects/CreditOffers.ts";
import { getObjects } from "@/nanoeffects/src/common";
import { humanReadableFloat } from "@/lib/common.js";

const ATTACH_TYPES = [
  { id: "asset", icon: Coins },
  { id: "pair", icon: ArrowLeftRight },
  { id: "pool", icon: Droplets },
  { id: "offer", icon: HandCoins },
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
  const [usrBalances, setUsrBalances] = useState();

  useEffect(() => {
    if (!open) {
      setView("types");
      setPicked(null);
      setAssetA(null);
      setAssetB(null);
      setPoolId(null);
    }
  }, [open ]);

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

  // Share-asset issuer names for the displayed pools (the creator is
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
    const entry = { symbol, id: found.id };
    if (slot === "B") {
      setAssetB(entry);
    } else if (slot === "A") {
      setAssetA(entry);
    } else {
      setPicked({ attach: { t: "asset", id: found.id }, label: symbol });
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
        if (a && b) {
          setPicked({
            attach: { t: "pair", a: a.id, b: b.id },
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

  const confirmDisabled = !picked;

  const handlePoolSelect = useCallback((p) => {
    setPoolId(p.id);
    setPicked({
      attach: { t: "pool", id: p.id },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {t("Trollbox:attachTitle", "Attach to message")}
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
            {ATTACH_TYPES.map(({ id, icon: Icon }) => (
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
            {offersLoading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Spinner />
                {t("Trollbox:attachLoadingOffers", "Loading credit offers…")}
              </div>
            ) : offers && offers.length > 0 ? (
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {offers.map((o) => {
                  const asset = (assets || []).find(
                    (a) => a && a.id === o.asset_type
                  );
                  const symbol = asset ? asset.symbol : o.asset_type;
                  const precision = asset ? asset.precision : 5;
                  const isSelected =
                    picked && picked.attach.id === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() =>
                        setPicked({
                          attach: { t: "offer", id: o.id },
                          label: `${symbol} ${t("Trollbox:attachOfferLabel", "offer")}`,
                        })
                      }
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
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("Trollbox:attachBack", "Back")}
            </Button>
            <Button
              disabled={confirmDisabled}
              onClick={handleConfirm}
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
