import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/Avatar.tsx";
import { Radio } from "lucide-react";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { assetAmountRegex, blockchainFloat, humanReadableFloat } from "@/lib/common.js";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HoverInfo from "./common/HoverInfo.tsx";

function parseDescription(description) {
  if (!description || typeof description !== "string") return "";
  return description;
}

export default function PublishFeed(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  const currentNode = useStore($currentNode);

  const {
    _assetsBTS,
    _assetsTEST,
    _bitAssetDataBTS,
    _bitAssetDataTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;

  const _chain = useMemo(() => (usr && usr.chain ? usr.chain : "bitshares"), [usr]);
  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const minBitassets = useMemo(() => {
    if (_chain && (_bitAssetDataBTS || _bitAssetDataTEST)) {
      return _chain === "bitshares" ? _bitAssetDataBTS : _bitAssetDataTEST;
    }
    return [];
  }, [_bitAssetDataBTS, _bitAssetDataTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const fee = useMemo(() => {
    if (globalParams && globalParams.length) {
      const found = globalParams.find((x) => x.id === 19 || x.id === "19");
      if (found && found.data && typeof found.data.fee !== "undefined") {
        return humanReadableFloat(found.data.fee, 5);
      }
    }
    return null;
  }, [globalParams]);

  const assetIdParam = useMemo(() => {
    if (typeof window === "undefined" || !window.location.search) return null;
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    const id = params && params.id ? params.id : null;
    if (!id || !id.includes("1.3.")) return null;
    return id;
  }, []);

  const minAsset = useMemo(() => {
    if (!assetIdParam || !marketSearch) return null;
    return marketSearch.find((x) => x.id === assetIdParam) ?? null;
  }, [assetIdParam, marketSearch]);

  const minBitasset = useMemo(() => {
    if (!assetIdParam || !minBitassets) return null;
    return minBitassets.find((x) => x.assetID === assetIdParam) ?? null;
  }, [assetIdParam, minBitassets]);

  const [fullAsset, setFullAsset] = useState(null);
  const [fullBitasset, setFullBitasset] = useState(null);

  useEffect(() => {
    if (!assetIdParam || !currentNode?.url) return;
    let cancelled = false;
    const store = createObjectStore([_chain, JSON.stringify([assetIdParam]), currentNode.url]);
    const unsub = store.subscribe(({ data, error, loading }) => {
      if (cancelled || loading || error || !data?.length) return;
      setFullAsset(data[0]);
    });
    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [assetIdParam, _chain, currentNode?.url]);

  const bitassetId = useMemo(() => {
    if (fullAsset?.bitasset_data_id) return fullAsset.bitasset_data_id;
    return null;
  }, [fullAsset]);

  useEffect(() => {
    if (!bitassetId || !currentNode?.url) return;
    let cancelled = false;
    const store = createObjectStore([_chain, JSON.stringify([bitassetId]), currentNode.url]);
    const unsub = store.subscribe(({ data, error, loading }) => {
      if (cancelled || loading || error || !data?.length) return;
      setFullBitasset(data[0]);
    });
    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [bitassetId, _chain, currentNode?.url]);

  const assetSymbol = fullAsset?.symbol ?? minAsset?.s ?? "";
  const assetPrecision = useMemo(() => {
    if (typeof fullAsset?.precision === "number") return fullAsset.precision;
    if (typeof minAsset?.p === "number") return minAsset.p;
    const found = assets?.find((x) => x.id === assetIdParam);
    return found?.precision ?? 5;
  }, [fullAsset, minAsset, assets, assetIdParam]);

  const collateralId = fullBitasset?.options?.short_backing_asset ?? minBitasset?.collateral ?? "1.3.0";
  const collateralMeta = useMemo(() => {
    if (!marketSearch) return null;
    return marketSearch.find((x) => x.id === collateralId) ?? null;
  }, [marketSearch, collateralId]);
  const collateralSymbol = collateralMeta?.s ?? (collateralId === "1.3.0" ? "BTS" : collateralId);
  const collateralPrecision = typeof collateralMeta?.p === "number" ? collateralMeta.p : 5;

  const isPrediction = useMemo(() => {
    const desc = parseDescription(fullAsset?.options?.description);
    return desc.includes("condition") && desc.includes("expiry");
  }, [fullAsset]);

  const isSmartcoin = useMemo(() => {
    if (fullAsset) return !!fullAsset.bitasset_data_id && !isPrediction;
    return !!minBitasset && !!minAsset;
  }, [fullAsset, minBitasset, minAsset, isPrediction]);

  const referenceFeed = useMemo(() => {
    if (!fullBitasset?.current_feed) return null;
    const cur = fullBitasset.current_feed;
    const baseAmt = parseInt(cur.settlement_price?.base?.amount ?? "0", 10);
    const quoteAmt = parseInt(cur.settlement_price?.quote?.amount ?? "0", 10);
    if (baseAmt > 0 && quoteAmt > 0) return cur;
    return fullBitasset.median_feed ?? cur;
  }, [fullBitasset]);

  const referencePrice = useMemo(() => {
    if (!referenceFeed) return 0;
    const base = humanReadableFloat(parseInt(referenceFeed.settlement_price.base.amount, 10), assetPrecision);
    const quote = humanReadableFloat(parseInt(referenceFeed.settlement_price.quote.amount, 10), collateralPrecision);
    if (!base || !quote) return 0;
    return quote / base;
  }, [referenceFeed, assetPrecision, collateralPrecision]);

  const medianPrice = useMemo(() => {
    const median = fullBitasset?.median_feed?.settlement_price;
    if (!median) return 0;
    const base = humanReadableFloat(parseInt(median.base.amount, 10), assetPrecision);
    const quote = humanReadableFloat(parseInt(median.quote.amount, 10), collateralPrecision);
    if (!base || !quote) return 0;
    return quote / base;
  }, [fullBitasset, assetPrecision, collateralPrecision]);

  // Form state: base = smartcoin leg, quote = collateral leg (matches chain price orientation)
  const [settleBase, setSettleBase] = useState("");
  const [settleQuote, setSettleQuote] = useState("");
  const [cerBase, setCerBase] = useState("");
  const [cerQuote, setCerQuote] = useState("");
  const [sameCER, setSameCER] = useState(true);
  const [mcr, setMcr] = useState("");
  const [mssr, setMssr] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (prefilled || !referenceFeed) return;
    const sb = String(humanReadableFloat(parseInt(referenceFeed.settlement_price.base.amount, 10), assetPrecision));
    const sq = String(humanReadableFloat(parseInt(referenceFeed.settlement_price.quote.amount, 10), collateralPrecision));
    setSettleBase(sb);
    setSettleQuote(sq);
    setCerBase(sb);
    setCerQuote(sq);
    if (referenceFeed.maintenance_collateral_ratio) {
      setMcr(String(referenceFeed.maintenance_collateral_ratio / 10));
    } else if (minBitasset?.mcr) {
      setMcr(String(minBitasset.mcr / 10));
    }
    if (referenceFeed.maximum_short_squeeze_ratio) {
      setMssr(String(referenceFeed.maximum_short_squeeze_ratio / 10));
    } else if (minBitasset?.mssr) {
      setMssr(String(minBitasset.mssr / 10));
    }
    setPrefilled(true);
  }, [referenceFeed, prefilled, assetPrecision, collateralPrecision, minBitasset]);

  useEffect(() => {
    if (sameCER) {
      setCerBase(settleBase);
      setCerQuote(settleQuote);
    }
  }, [sameCER, settleBase, settleQuote]);

  const myLastFeed = useMemo(() => {
    if (!fullBitasset?.feeds || !usr?.id) return null;
    const found = fullBitasset.feeds.find((f) => f[0] === usr.id);
    return found ?? null;
  }, [fullBitasset, usr]);

  const authorized = useMemo(() => {
    if (!usr?.id || !fullBitasset) return false;
    if (fullAsset?.issuer === usr.id) return true;
    if (fullBitasset.feeds?.some((f) => f[0] === usr.id)) return true;
    return false;
  }, [usr, fullBitasset, fullAsset]);

  // Settlement state detection (mirrors Smartcoin.jsx / Settlement.jsx gates)
  const globalSettlementFund = useMemo(() => {
    if (!fullBitasset?.settlement_fund) return 0;
    return humanReadableFloat(parseInt(fullBitasset.settlement_fund, 10), collateralPrecision);
  }, [fullBitasset, collateralPrecision]);

  const hasGlobalSettlementPrice = useMemo(() => {
    const sp = fullBitasset?.settlement_price;
    if (!sp) return false;
    return parseInt(sp.base?.amount ?? "0", 10) > 0 && parseInt(sp.quote?.amount ?? "0", 10) > 0;
  }, [fullBitasset]);

  const isGloballySettled = globalSettlementFund > 0 || hasGlobalSettlementPrice;

  const globalSettledPrice = useMemo(() => {
    const sp = fullBitasset?.settlement_price;
    if (!sp) return 0;
    const base = humanReadableFloat(parseInt(sp.base.amount, 10), assetPrecision);
    const quote = humanReadableFloat(parseInt(sp.quote.amount, 10), collateralPrecision);
    if (!base || !quote) return 0;
    return quote / base;
  }, [fullBitasset, assetPrecision, collateralPrecision]);

  const individualDebt = useMemo(() => {
    if (!fullBitasset?.individual_settlement_debt) return 0;
    return humanReadableFloat(parseInt(fullBitasset.individual_settlement_debt, 10), assetPrecision);
  }, [fullBitasset, assetPrecision]);

  const individualFund = useMemo(() => {
    if (!fullBitasset?.individual_settlement_fund) return 0;
    return humanReadableFloat(parseInt(fullBitasset.individual_settlement_fund, 10), collateralPrecision);
  }, [fullBitasset, collateralPrecision]);

  const hasIndividualSettlement = !isGloballySettled && individualDebt > 0;

  // Black swan response method: 0 global / 1 none / 2 individual-to-fund / 3 individual-to-order
  // (absent extension predates BSRM and behaves as 0). Method alone never blocks;
  // only an actually-triggered global settlement does.
  const bsrmMethod = useMemo(() => {
    const raw = fullBitasset?.options?.extensions?.black_swan_response_method;
    const parsed = typeof raw === "number" ? raw : parseInt(raw ?? "0", 10);
    return [0, 1, 2, 3].includes(parsed) ? parsed : 0;
  }, [fullBitasset]);

  // Precision-capped amount regexes (same gating pattern as Transfer/Settlement)
  const baseRegex = useMemo(() => assetAmountRegex({ precision: assetPrecision }), [assetPrecision]);
  const quoteRegex = useMemo(() => assetAmountRegex({ precision: collateralPrecision }), [collateralPrecision]);

  const handleSettleBase = (value) => { if (baseRegex.test(value)) setSettleBase(value); };
  const handleSettleQuote = (value) => { if (quoteRegex.test(value)) setSettleQuote(value); };
  const handleCerBase = (value) => { if (baseRegex.test(value)) setCerBase(value); };
  const handleCerQuote = (value) => { if (quoteRegex.test(value)) setCerQuote(value); };

  const parsed = useMemo(() => {
    const sb = parseFloat(settleBase);
    const sq = parseFloat(settleQuote);
    const cb = parseFloat(cerBase);
    const cq = parseFloat(cerQuote);
    const mcrNum = parseFloat(mcr);
    const mssrNum = parseFloat(mssr);
    return { sb, sq, cb, cq, mcrNum, mssrNum };
  }, [settleBase, settleQuote, cerBase, cerQuote, mcr, mssr]);

  const valid = useMemo(() => {
    const { sb, sq, cb, cq, mcrNum, mssrNum } = parsed;
    if (![sb, sq, cb, cq, mcrNum, mssrNum].every((n) => Number.isFinite(n) && n > 0)) return false;
    if (mcrNum < 100 || mcrNum > 5000 || mssrNum < 100 || mssrNum > 5000) return false;
    // chain stores uint16 percent*10; must be integer after scaling
    if (!Number.isInteger(Math.round(mcrNum * 10)) || !Number.isInteger(Math.round(mssrNum * 10))) return false;
    try {
      if (blockchainFloat(sb, assetPrecision) <= 0 || blockchainFloat(sq, collateralPrecision) <= 0) return false;
      if (blockchainFloat(cb, assetPrecision) <= 0 || blockchainFloat(cq, collateralPrecision) <= 0) return false;
    } catch {
      return false;
    }
    return true;
  }, [parsed, assetPrecision, collateralPrecision]);

  const myPrice = useMemo(() => {
    const { sb, sq } = parsed;
    if (!sb || !sq || sb <= 0) return 0;
    return sq / sb;
  }, [parsed]);

  const deviationPct = useMemo(() => {
    if (!referencePrice || !myPrice) return 0;
    return ((myPrice - referencePrice) / referencePrice) * 100;
  }, [referencePrice, myPrice]);

  const trxJSON = useMemo(() => {
    if (!valid || !usr?.id || !assetIdParam) return null;
    const { sb, sq, cb, cq, mcrNum, mssrNum } = parsed;
    return [
      {
        publisher: usr.id,
        asset_id: assetIdParam,
        feed: {
          settlement_price: {
            base: { amount: blockchainFloat(sb, assetPrecision), asset_id: assetIdParam },
            quote: { amount: blockchainFloat(sq, collateralPrecision), asset_id: collateralId },
          },
          maintenance_collateral_ratio: Math.round(mcrNum * 10),
          maximum_short_squeeze_ratio: Math.round(mssrNum * 10),
          core_exchange_rate: {
            base: { amount: blockchainFloat(cb, assetPrecision), asset_id: assetIdParam },
            quote: { amount: blockchainFloat(cq, collateralPrecision), asset_id: collateralId },
          },
        },
        extensions: {},
      },
    ];
  }, [valid, usr, assetIdParam, parsed, assetPrecision, collateralPrecision, collateralId]);

  if (!assetIdParam) {
    return (
      <div className="container mx-auto mt-5 mb-5 max-w-4xl">
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
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
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Radio className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("PublishFeed:title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("PublishFeed:invalidAsset")}
                </p>
              </div>
            </div>
            <Button asChild>
              <a href="/issued_assets.html?tab=smartcoins">{t("PublishFeed:backToIssued")}</a>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-4xl">
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
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
          className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
        />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <Radio className="h-4.5 w-4.5" strokeWidth={2.25} />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {t("PublishFeed:title")}: {assetSymbol} ({assetIdParam})
              </h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {t("PublishFeed:description")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
          {!isSmartcoin && fullAsset ? (
            <p className="text-sm text-red-500">{t("PublishFeed:notSmartcoin")}</p>
          ) : null}

          {fullBitasset ? (
            <div className="text-xs text-muted-foreground">
              {t("PublishFeed:bsrmMethod")}: {t(`PublishFeed:bsrm_${bsrmMethod}`)}
            </div>
          ) : null}

          {isGloballySettled ? (
            <Card className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-danger)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-danger)/0.1)]">
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-danger)/0.6)] to-transparent" />
              <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-danger)/0.08)] blur-3xl" />
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
              <CardContent className="relative p-5">
                <p className="text-sm font-semibold dark:text-[hsl(var(--accent-danger-fg)/0.9)] text-[hsl(var(--accent-danger-fg))]">
                  {t("PublishFeed:settlementBlocked")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("PublishFeed:settlementBlockedInfo")}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      {t("PublishFeed:globalSettlementFund")}
                    </div>
                    <div className="font-mono text-sm tabular-nums font-semibold">
                      {globalSettlementFund} {collateralSymbol}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      {t("PublishFeed:settledPrice")}
                    </div>
                    <div className="font-mono text-sm tabular-nums font-semibold">
                      {globalSettledPrice ? `${globalSettledPrice} ${collateralSymbol}/${assetSymbol}` : "—"}
                    </div>
                  </div>
                </div>
                <Button asChild className="mt-3">
                  <a href={`/settlement.html?id=${assetIdParam}`}>{t("PublishFeed:viewSettlement")}</a>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {hasIndividualSettlement ? (
            <Card className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)]">
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent" />
              <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
              <CardContent className="relative p-5">
                <p className="text-sm font-semibold text-foreground">
                  {t("PublishFeed:individualSettlementActive")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("PublishFeed:individualSettlementActiveInfo", { debt: individualDebt, asset: assetSymbol, fund: individualFund, collateral: collateralSymbol })}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <HoverInfo content={t("PublishFeed:currentFeedInfo")} header={t("PublishFeed:currentFeed")} type="header" />
              <Input value={referencePrice ? `${referencePrice} ${collateralSymbol}/${assetSymbol}` : "..."} readOnly className="mt-1" />
            </div>
            <div>
              <HoverInfo content={t("PublishFeed:currentFeedInfo")} header={t("PublishFeed:medianFeed")} type="header" />
              <Input value={medianPrice ? `${medianPrice} ${collateralSymbol}/${assetSymbol}` : "..."} readOnly className="mt-1" />
            </div>
          </div>

          {usr?.id ? (
            <p className={`text-sm ${authorized ? "text-green-600" : "text-amber-600"}`}>
              {authorized ? t("PublishFeed:isAuthorized") : t("PublishFeed:notAuthorized")}
            </p>
          ) : null}

          {myLastFeed ? (
            <div className="text-xs text-muted-foreground">
              {t("PublishFeed:myLastFeed")}: {new Date(myLastFeed[1][0]).toLocaleString()}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">{t("PublishFeed:noPriorFeed")}</div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <HoverInfo content={t("PublishFeed:settlementBaseInfo")} header={`${t("PublishFeed:settlementBase")} (${assetSymbol})`} type="header" />
              <Input inputMode="decimal" placeholder={t("PublishFeed:precisionHint", { count: assetPrecision })} value={settleBase} onChange={(e) => handleSettleBase(e.target.value)} className="mt-1" />
            </div>
            <div>
              <HoverInfo content={t("PublishFeed:settlementQuoteInfo")} header={`${t("PublishFeed:settlementQuote")} (${collateralSymbol})`} type="header" />
              <Input inputMode="decimal" placeholder={t("PublishFeed:precisionHint", { count: collateralPrecision })} value={settleQuote} onChange={(e) => handleSettleQuote(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={sameCER} onCheckedChange={(v) => setSameCER(v === true)} id="sameCER" />
            <Label htmlFor="sameCER" className="text-sm">{t("PublishFeed:sameAsSettlement")}</Label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <HoverInfo content={t("PublishFeed:cerBaseInfo")} header={`${t("PublishFeed:cerBase")} (${assetSymbol})`} type="header" />
              <Input inputMode="decimal" placeholder={t("PublishFeed:precisionHint", { count: assetPrecision })} value={cerBase} onChange={(e) => handleCerBase(e.target.value)} disabled={sameCER} className="mt-1" />
            </div>
            <div>
              <HoverInfo content={t("PublishFeed:cerQuoteInfo")} header={`${t("PublishFeed:cerQuote")} (${collateralSymbol})`} type="header" />
              <Input inputMode="decimal" placeholder={t("PublishFeed:precisionHint", { count: collateralPrecision })} value={cerQuote} onChange={(e) => handleCerQuote(e.target.value)} disabled={sameCER} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <HoverInfo content={t("PublishFeed:mcrInfo")} header={t("PublishFeed:mcr")} type="header" />
              <Input type="number" min="100" step="any" value={mcr} onChange={(e) => setMcr(e.target.value)} className="mt-1" />
            </div>
            <div>
              <HoverInfo content={t("PublishFeed:mssrInfo")} header={t("PublishFeed:mssr")} type="header" />
              <Input type="number" min="100" step="any" value={mssr} onChange={(e) => setMssr(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <HoverInfo content={t("PublishFeed:publisherInfo")} header={t("PublishFeed:publisher")} type="header" />
            <div className="grid grid-cols-8 gap-2">
              <div className="col-span-1 flex items-center justify-center">
                {usr?.username ? (
                  <Avatar
                    size={40}
                    name={usr.username}
                    extra="Publisher"
                    expression={{ eye: "normal", mouth: "open" }}
                    colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                  />
                ) : (
                  <Av>
                    <AvatarFallback>?</AvatarFallback>
                  </Av>
                )}
              </div>
              <div className="col-span-7">
                <Input value={usr ? `${usr.username} (${usr.id})` : ""} disabled readOnly className="mb-1 mt-1" />
              </div>
            </div>
          </div>

          {fee !== null ? (
            <div className="text-xs text-muted-foreground">
              {t("PublishFeed:fee")}: {fee} BTS
            </div>
          ) : null}

          {!valid ? <p className="text-sm text-muted-foreground">{t("PublishFeed:missingAmounts")}</p> : null}
          {valid && Math.abs(deviationPct) > 5 ? (
            <p className="text-sm text-amber-600">
              {t("PublishFeed:priceDeviation", { pct: deviationPct.toFixed(2) })}
            </p>
          ) : null}

          <Button disabled={!valid || !isSmartcoin || !usr?.id || isGloballySettled} onClick={() => setShowDialog(true)}>
            {t("PublishFeed:publishFeed")}
          </Button>

          {showDialog && trxJSON && !isGloballySettled ? (
            <DeepLinkDialog
              operationNames={["asset_publish_feed"]}
              username={usr.username}
              usrChain={_chain}
              userID={usr.id}
              dismissCallback={setShowDialog}
              key={`publishFeed-${assetIdParam}`}
              headerText={t("PublishFeed:publishHeader", { asset: assetSymbol, publisher: usr.username })}
              trxJSON={trxJSON}
            />
          ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
