import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

import { createObjectStore } from "@/nanoeffects/Objects.ts";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";

import {
  blockchainFloat,
  humanReadableFloat,
  getFlagBooleans,
  assetAmountRegex,
} from "@/lib/common.js";

function formatDelay(seconds) {
  const s = Number(seconds) || 0;
  if (s <= 0) return "0m";
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 172800) return `${Math.round((s / 3600) * 10) / 10}h`;
  return `${Math.round((s / 86400) * 10) / 10}d`;
}

/**
 * Collateral units per 1 debt unit from a feed settlement_price.
 * Feed convention is base = debt leg, quote = collateral leg, but orient
 * by asset id so inverted feeds still produce the right rate.
 */
function feedRateCollateralPerDebt(feedPrice, debtId, collateralId, debtPrec, collPrec) {
  if (!feedPrice || !feedPrice.base || !feedPrice.quote) return 0;
  const { base, quote } = feedPrice;
  const baseAmt = Number(base.amount);
  const quoteAmt = Number(quote.amount);
  if (!baseAmt || !quoteAmt) return 0;
  const baseHuman = humanReadableFloat(
    baseAmt,
    base.asset_id === debtId ? debtPrec : collPrec
  );
  const quoteHuman = humanReadableFloat(
    quoteAmt,
    quote.asset_id === collateralId ? collPrec : debtPrec
  );
  if (!baseHuman || !quoteHuman) return 0;
  if (base.asset_id === debtId && quote.asset_id === collateralId) {
    return quoteHuman / baseHuman;
  }
  if (base.asset_id === collateralId && quote.asset_id === debtId) {
    return baseHuman / quoteHuman;
  }
  return quoteHuman / baseHuman;
}

export default function ForceSettleDialog({
  open,
  onClose,
  assetId,
  symbol,
  precision,
  humanBalance,
  chain,
  accountId,
  username,
  assets,
  nodeUrl,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const [fullAsset, setFullAsset] = useState(null);
  const [bitasset, setBitasset] = useState(null);
  const [collateralAsset, setCollateralAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setShowBroadcast(false);
    setFullAsset(null);
    setBitasset(null);
    setCollateralAsset(null);
  }, [open, assetId]);

  useEffect(() => {
    if (!open || !assetId) return;
    let cancelled = false;
    setLoading(true);

    const fetchOnce = (store) =>
      new Promise((resolve) => {
        let unsub;
        unsub = store.subscribe(({ data, error, loading: l }) => {
          if (l) return;
          try {
            if (typeof unsub === "function") unsub();
          } catch {}
          resolve(!error ? data : null);
        });
      });

    async function fetchData() {
      try {
        const assetStore = createObjectStore([
          chain,
          JSON.stringify([assetId]),
          nodeUrl || null,
        ]);
        const assetData = await fetchOnce(assetStore);
        if (cancelled) return;
        const fetchedAsset = (assetData || []).find((a) => a && a.id === assetId) || null;
        setFullAsset(fetchedAsset);

        const bitassetId = fetchedAsset?.bitasset_data_id;
        if (!bitassetId) {
          return;
        }
        const bitStore = createObjectStore([
          chain,
          JSON.stringify([bitassetId]),
          nodeUrl || null,
        ]);
        const bitData = await fetchOnce(bitStore);
        if (cancelled) return;
        const fetchedBitasset = (bitData || []).find((b) => b && b.id === bitassetId) || null;
        setBitasset(fetchedBitasset);

        const collateralId = fetchedBitasset?.options?.short_backing_asset;
        if (collateralId && !(assets || []).some((a) => a && a.id === collateralId)) {
          const colStore = createObjectStore([
            chain,
            JSON.stringify([collateralId]),
            nodeUrl || null,
          ]);
          const colData = await fetchOnce(colStore);
          if (cancelled) return;
          const fetchedCollateral =
            (colData || []).find((a) => a && a.id === collateralId) || null;
          setCollateralAsset(fetchedCollateral);
        }
      } catch {
        // leave partial state; the dialog renders what it has
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [open, assetId, chain, nodeUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const debtPrec = fullAsset?.precision ?? precision ?? 5;
  const collateralId = bitasset?.options?.short_backing_asset;
  const resolvedCollateral =
    collateralAsset ||
    (assets || []).find((a) => a && a.id === collateralId) ||
    null;
  const collPrec = resolvedCollateral?.precision ?? 5;
  const collSymbol = resolvedCollateral?.symbol || collateralId || "?";

  const flags = useMemo(() => {
    return getFlagBooleans(fullAsset?.options?.flags ?? 0);
  }, [fullAsset]);

  const forceDisabled = Boolean(flags && flags.disable_force_settle);

  const feePercent = useMemo(() => {
    const raw = bitasset?.options?.extensions?.force_settle_fee_percent;
    const parsed = typeof raw === "number" ? raw : parseFloat(raw ?? "0");
    return Number.isFinite(parsed) && parsed > 0 ? parsed / 100 : 0;
  }, [bitasset]);

  const delaySec = bitasset?.options?.force_settlement_delay_sec ?? 0;

  const rate = useMemo(() => {
    const feedPrice = bitasset?.current_feed?.settlement_price;
    if (!feedPrice || !collateralId) return 0;
    return feedRateCollateralPerDebt(
      feedPrice,
      assetId,
      collateralId,
      debtPrec,
      collPrec
    );
  }, [bitasset, collateralId, assetId, debtPrec, collPrec]);

  const parsedAmount = parseFloat(amount);
  const validAmount =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= (Number(humanBalance) || 0);

  const receiving =
    validAmount && rate > 0
      ? parseFloat((parsedAmount * rate).toFixed(collPrec))
      : 0;

  const close = () => {
    setShowBroadcast(false);
    if (onClose) onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) close(); }}>
        <DialogContent className="sm:max-w-[480px] !bg-card border border-border text-foreground">
          <DialogHeader>
            <DialogTitle>
              {t("Settlement:holderForceSettleTitle", {
                defaultValue: "Force settle {{asset}}",
                asset: symbol,
              })}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("Settlement:forceSettleDialogDescription", {
                defaultValue:
                  "Convert {{asset}} into its backing collateral {{collateral}} at the feed price. The chain executes the settlement after a delay of {{delay}}.",
                asset: symbol,
                collateral: collSymbol,
                delay: formatDelay(delaySec),
              })}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center gap-3 py-6 text-muted-foreground">
              <Spinner />
              <p className="text-sm">{t("Market:loading")}</p>
            </div>
          ) : forceDisabled ? (
            <p className="text-sm text-[hsl(var(--accent-danger-fg))] py-4">
              {t("Settlement:forceSettleDisabled", {
                defaultValue:
                  "Force settlement is disabled for this asset by its issuer.",
              })}
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label>
                    {t("Settlement:holderSettleAmount", {
                      defaultValue: "Settlement amount",
                    })}
                  </Label>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {(Number(humanBalance) || 0).toLocaleString(undefined, {
                        maximumFractionDigits: debtPrec,
                      })}{" "}
                      {symbol}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmount(String(Number(humanBalance) || 0))}
                      className="rounded-md border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.08)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.12)] transition-colors"
                    >
                      {t("Settlement:maxButton", { defaultValue: "Max" })}
                    </button>
                  </span>
                </div>
                <Input
                  value={amount}
                  placeholder={`0 ${symbol}`}
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => {
                    const input = event.target.value;
                    if (!input) {
                      setAmount("");
                      return;
                    }
                    const regex = assetAmountRegex({ precision: debtPrec });
                    if (regex.test(input)) setAmount(input);
                  }}
                />
                {amount && !validAmount ? (
                  <p className="text-xs text-[hsl(var(--accent-danger-fg))] mt-1">
                    {t("Settlement:holderAmountExceedsBalance", {
                      defaultValue: "Amount exceeds your available balance",
                    })}
                  </p>
                ) : null}
              </div>

              <div>
                <Label>
                  {t("Settlement:holderReceiving", {
                    defaultValue: "Estimated collateral received",
                  })}
                </Label>
                <Input
                  disabled
                  readOnly
                  className="mt-1"
                  value={
                    rate > 0
                      ? `${receiving} ${collSymbol}`
                      : t("Settlement:noFeedEstimate", {
                        defaultValue:
                          "No price feed — estimate unavailable, settlement executes at a future feed price after the delay.",
                      })
                  }
                />
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>
                    {t("Settlement:settlementDelayNote", {
                      defaultValue: "Settlement delay",
                    })}
                  </span>
                  <span className="font-mono">{formatDelay(delaySec)}</span>
                </div>
                {feePercent > 0 ? (
                  <div className="text-right">
                    {t("Settlement:additionalForceSettlementFee", {
                      fee: feePercent,
                    })}
                  </div>
                ) : null}
              </div>

              <Button
                type="button"
                onClick={() => setShowBroadcast(true)}
                disabled={!validAmount}
                className="w-full h-11 text-sm font-semibold rounded-2xl bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))]"
              >
                {t("Settlement:submit")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showBroadcast && validAmount ? (
        <DeepLinkDialog
          operationNames={["asset_settle"]}
          username={username}
          usrChain={chain}
          userID={accountId}
          dismissCallback={setShowBroadcast}
          key={`ForceSettling${amount}${symbol}for${receiving}${collSymbol}`}
          headerText={t("Settlement:settlingFor", {
            forceSettleAmount: amount,
            asset: symbol,
            totalReceiving: receiving,
            collateral: collSymbol,
          })}
          trxJSON={[
            {
              account: accountId,
              amount: {
                amount: blockchainFloat(parsedAmount, debtPrec),
                asset_id: assetId,
              },
              extensions: [],
            },
          ]}
        />
      ) : null}
    </>
  );
}
