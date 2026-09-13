import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSyncExternalStore } from "react";
import { useForm, Controller } from "react-hook-form";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/Avatar.tsx";

import {
  humanReadableFloat,
  getFlagBooleans,
  blockchainFloat,
  assetAmountRegex,
} from "@/lib/common.js";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createCollateralBidStore } from "@/nanoeffects/CollateralBids.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { getAccountBalances } from "@/nanoeffects/UserBalances.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import {
  Coins,
  Wallet,
  Gavel,
  Info,
  HandCoins,
  ClipboardList,
  Zap,
  FileJson,
  Trash2,
  ArrowLeftRight,
  ArrowUpRight,
} from "lucide-react";


function SettlementBidRow({ index, style, collateralBids, parsedCollateralAsset, parsedAsset, currentFeedSettlementPrice, t, userId, onViewBid, onRemoveBid }) {
    const _bid = collateralBids[index];
    // Bids/feeds can arrive in unexpected shapes (empty feeds, missing legs);
    // never throw inside a virtualized row — render a dash row instead.
    // Price legs come in two shapes depending on the object type: global
    // settlement bids carry `bid`, individual settlement objects carry
    // `inv_swan_price`. Prefer matching legs by asset id, fall back to the
    // positional convention (base = collateral, quote = debt).
    const _priceObj = _bid?.inv_swan_price ?? _bid?.bid ?? null;
    const _baseLeg = _priceObj?.base ?? null;
    const _quoteLeg = _priceObj?.quote ?? null;
    const _colId = parsedCollateralAsset?.id;
    const _debtId = parsedAsset?.id;
    let _colLeg = null;
    let _debtLeg = null;
    if (_baseLeg && _quoteLeg && _colId && _debtId) {
      const _legs = [_baseLeg, _quoteLeg];
      _colLeg = _legs.find((l) => l.asset_id === _colId) ?? _baseLeg;
      _debtLeg = _legs.find((l) => l.asset_id === _debtId) ?? _quoteLeg;
      if (_debtLeg === _colLeg) {
        // Degenerate match — fall back to positional convention.
        _colLeg = _baseLeg;
        _debtLeg = _quoteLeg;
      }
    }
    const _precOf = (leg, fallback) => {
      if (!leg) return fallback ?? 5;
      if (_colId && leg.asset_id === _colId) return parsedCollateralAsset.p;
      if (_debtId && leg.asset_id === _debtId) return parsedAsset.p;
      return fallback ?? 5;
    };
    if (
      !_colLeg ||
      !_debtLeg ||
      _colLeg.amount === undefined ||
      _debtLeg.amount === undefined ||
      !parsedCollateralAsset ||
      !parsedAsset
    ) {
      return (
        <div style={{ ...style, paddingRight: "10px", paddingBottom: "4px" }}>
          <div className="h-full flex items-center gap-2 px-3 rounded-xl border border-transparent text-sm text-muted-foreground">
            {onViewBid && _bid ? (
              <button
                type="button"
                onClick={() => onViewBid(_bid)}
                title={t("LiveBlocks:dialogContent.json")}
                className="flex-1 truncate text-left hover:text-[hsl(var(--accent-1-fg))] hover:underline transition-colors"
              >
                {_bid?.bidder ?? "—"}
              </button>
            ) : (
              <div className="flex-1 truncate">{_bid?.bidder ?? "—"}</div>
            )}
            <div className="flex-1 text-right">—</div>
            <div className="flex-1 text-right">—</div>
            <div className="flex-1 text-right">—</div>
            <div className="flex-1 text-right">—</div>
          </div>
        </div>
      );
    }
    const _collateral = humanReadableFloat(
      _colLeg.amount,
      _precOf(_colLeg, parsedCollateralAsset.p)
    );
    const _debt = humanReadableFloat(
      _debtLeg.amount,
      _precOf(_debtLeg, parsedAsset.p)
    );
    const _price = _debt > 0
      ? parseFloat((_collateral / _debt).toFixed(parsedCollateralAsset.p))
      : 0;
    const _ratio = _price > 0 && currentFeedSettlementPrice > 0
      ? parseFloat(
          ((1 / currentFeedSettlementPrice / _price) * 100).toFixed(2)
        )
      : 0;
    return (
        <div style={{ ...style, paddingRight: "10px", paddingBottom: "4px" }}>
        <div className="h-full flex items-center gap-2 px-3 rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-gradient-to-r from-[hsl(var(--accent-1)/0.04)] to-transparent hover:border-[hsl(var(--accent-1)/0.35)] hover:bg-[hsl(var(--accent-1)/0.06)] transition-all text-sm">
          <div className="flex-1 truncate flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => onViewBid && onViewBid(_bid)}
              title={t ? t("LiveBlocks:dialogContent.json") : "JSON"}
              className="truncate text-left font-mono text-xs text-muted-foreground hover:text-[hsl(var(--accent-1-fg))] hover:underline transition-colors"
            >
              {_bid.bidder}
            </button>
            {userId && _bid.bidder === userId ? (
              <Badge
                variant="outline"
                className="shrink-0 border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))] text-[10px] px-1.5 py-0"
              >
                {t ? t("Settlement:yourBid", { defaultValue: "Your bid" }) : "Your bid"}
              </Badge>
            ) : null}
            {userId && _bid.bidder === userId && onRemoveBid ? (
              <button
                type="button"
                onClick={() => onRemoveBid(_bid)}
                title={t ? t("Settlement:removeBid", { defaultValue: "Remove bid" }) : "Remove bid"}
                aria-label={t ? t("Settlement:removeBid", { defaultValue: "Remove bid" }) : "Remove bid"}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="flex-1 text-right font-mono tabular-nums text-foreground/90">{_collateral}</div>
          <div className="flex-1 text-right font-mono tabular-nums text-foreground/90">{_debt}</div>
          <div className="flex-1 text-right font-semibold tabular-nums text-[hsl(var(--accent-1-fg))]">{_price > 0 ? _price : "—"}</div>
          <div className="flex-1 text-right tabular-nums text-foreground/70">{_ratio > 0 ? _ratio : "—"}</div>
        </div>
      </div>
    );
}
const MemoSettlementBidRow = React.memo(SettlementBidRow);

// Raw (satoshi) collateral/debt legs of a collateral_bid object. Legs are
// matched by asset id with the chain positional fallback (base =
// collateral, quote = debt); null when a leg is missing or malformed.
function getBidRawAmounts(bid, collateralId, debtId) {
  const priceObj = bid?.inv_swan_price ?? bid?.bid ?? null;
  const baseLeg = priceObj?.base ?? null;
  const quoteLeg = priceObj?.quote ?? null;
  if (
    !baseLeg ||
    !quoteLeg ||
    baseLeg.amount === undefined ||
    quoteLeg.amount === undefined
  ) {
    return null;
  }
  const legs = [baseLeg, quoteLeg];
  let colLeg = legs.find((l) => l.asset_id === collateralId) ?? baseLeg;
  let debtLeg = legs.find((l) => l.asset_id === debtId) ?? quoteLeg;
  if (debtLeg === colLeg) {
    colLeg = baseLeg;
    debtLeg = quoteLeg;
  }
  const collateral = Number(colLeg.amount);
  const debt = Number(debtLeg.amount);
  if (
    !Number.isFinite(collateral) ||
    !Number.isFinite(debt) ||
    collateral < 0 ||
    debt < 0
  ) {
    return null;
  }
  return { collateral, debt };
}

// Reference-wallet _analyzeBids: best-priced bids first, accumulate debt
// until the outstanding supply is covered, pro-rating the marginal bid's
// collateral. Returns raw totals { collateral, debt }.
function analyzeBidsForRevive(pricedBids, supplyRaw) {
  let accCollateral = 0;
  let accDebt = 0;
  const sorted = [...pricedBids].sort((a, b) => b.price - a.price);
  for (const bid of sorted) {
    if (!(accDebt < supplyRaw)) {
      break;
    }
    if (accDebt + bid.debt >= supplyRaw) {
      const debt = supplyRaw - accDebt;
      accCollateral += (debt / bid.debt) * bid.collateral;
      accDebt += debt;
    } else {
      accCollateral += bid.collateral;
      accDebt += bid.debt;
    }
  }
  return { collateral: accCollateral, debt: accDebt };
}

export default function Settlement(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNode = useStore($currentNode);

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const {
    _marketSearchBTS,
    _marketSearchTEST,
    _bitAssetDataBTS,
    _bitAssetDataTEST,
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

  const bitAssetData = useMemo(() => {
    if (_chain && (_bitAssetDataBTS || _bitAssetDataTEST)) {
      return _chain === "bitshares" ? _bitAssetDataBTS : _bitAssetDataTEST;
    }
    return [];
  }, [_bitAssetDataBTS, _bitAssetDataTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const [finalAsset, setFinalAsset] = useState();
  const [finalBitasset, setFinalBitasset] = useState();
  const [finalCollateralAsset, setFinalCollateralAsset] = useState();

  const [bidFee, setBidFee] = useState(0);
  const [settleFee, setSettleFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee1 = globalParams.find((x) => x.id === 45);
      const foundFee2 = globalParams.find((x) => x.id === 17);
      if (foundFee1?.data?.fee !== undefined) {
        setBidFee(humanReadableFloat(foundFee1.data.fee, 5));
      }
      if (foundFee2?.data?.fee !== undefined) {
        setSettleFee(humanReadableFloat(foundFee2.data.fee, 5));
      }
    }
  }, [globalParams]);

  const parsedUrlParams = useMemo(() => {
    if (marketSearch && marketSearch.length && window.location.search) {
      //console.log("Parsing url params");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const foundParamter = params && params.id ? params.id : null;

      if (
        !foundParamter ||
        !foundParamter.length ||
        (foundParamter && !foundParamter.includes("1.3."))
      ) {
        console.log("Invalid parameter");
        return;
      }

      const assetIDs =
        marketSearch && marketSearch.length
          ? marketSearch.map((x) => x.id)
          : [];
      if (!assetIDs.includes(foundParamter)) {
        console.log("Invalid parameter");
        return;
      }

      return foundParamter;
    }
  }, [marketSearch]);

  const parsedAsset = useMemo(() => {
    if (parsedUrlParams && parsedUrlParams.length && marketSearch) {
      const foundAsset = marketSearch.find((x) => x.id === parsedUrlParams);
      return foundAsset;
    }
    return null;
  }, [parsedUrlParams, marketSearch]);

  const parsedBitasset = useMemo(() => {
    if (parsedAsset && bitAssetData) {
      const foundBitasset = bitAssetData.find(
        (x) => x.assetID === parsedAsset.id
      );
      return foundBitasset;
    }
    return null;
  }, [parsedAsset, bitAssetData]);

  const parsedCollateralAsset = useMemo(() => {
    if (parsedBitasset && bitAssetData) {
      const foundAsset = marketSearch.find(
        (x) => x.id === parsedBitasset.collateral
      );
      return foundAsset;
    }
  }, [parsedBitasset, bitAssetData]);

  const currentFeedSettlementPrice = useMemo(() => {
    // Feeds can be empty (no publishers yet) or miss a leg — optional-chain
    // every hop so a feed-less asset shows 0 instead of throwing on `.base`.
    const _quote =
      finalBitasset?.current_feed?.settlement_price?.quote?.amount;
    const _base =
      finalBitasset?.current_feed?.settlement_price?.base?.amount;
    if (
      finalBitasset &&
      _quote !== undefined &&
      _base !== undefined &&
      parsedCollateralAsset &&
      parsedAsset
    ) {
      const _q = humanReadableFloat(
        parseInt(_quote),
        parsedCollateralAsset.p
      );
      const _b = humanReadableFloat(parseInt(_base), parsedAsset.p);
      if (!_b) return 0;
      return parseFloat((_q / _b).toFixed(parsedCollateralAsset.p));
    }
    return 0;
  }, [finalBitasset, parsedAsset, parsedCollateralAsset]);

  // Global-settlement state (core `is_globally_settled()` ⟺ settlement_price
  // is non-null). Orientation follows the feed convention on this page:
  // quote leg = collateral asset, base leg = debt asset.
  // - finalSettlementFund: collateral units available for bidding.
  // - finalSettlementPrice: debt units per 1 collateral (full precision —
  //   never pre-rounded, tiny prices like 2.9e-5 would crush to 0).
  const settlementFund = useMemo(() => {
    const _fund = finalBitasset?.settlement_fund;
    const _sq = finalBitasset?.settlement_price?.quote?.amount;
    const _sb = finalBitasset?.settlement_price?.base?.amount;
    if (
      finalBitasset &&
      _fund !== undefined &&
      _sq !== undefined &&
      _sb !== undefined &&
      parsedAsset &&
      parsedCollateralAsset
    ) {
      const finalSettlementFund = humanReadableFloat(
        parseInt(_fund),
        parsedCollateralAsset.p
      );

      const _q = humanReadableFloat(parseInt(_sq), parsedCollateralAsset.p);
      const _b = humanReadableFloat(parseInt(_sb), parsedAsset.p);
      if (!(_q > 0) || !(_b > 0)) return null;

      const finalSettlementPrice = _b / _q;
      // settlementRate: collateral units per 1 debt (quote/base) — the
      // fixed rate force settlements execute at during global settlement.
      const settlementRate = _q / _b;

      return { finalSettlementFund, finalSettlementPrice, settlementRate };
    }
    return null;
  }, [finalBitasset, parsedAsset, parsedCollateralAsset]);

  // Adaptive price formatter: fixed asset precision crushes small but real
  // prices (e.g. 0.0000288 → "0.0000"). Up to 8 decimals, trailing zeros cut.
  const fmtSettlementPrice = (v) => {
    if (!Number.isFinite(v) || v <= 0) return "—";
    return String(parseFloat(v.toFixed(8)));
  };

  const individualSettlementFund = useMemo(() => {
    const _d = finalBitasset?.individual_settlement_debt;
    const _f = finalBitasset?.individual_settlement_fund;
    if (
      finalBitasset &&
      _d !== undefined &&
      _f !== undefined &&
      parsedAsset &&
      parsedCollateralAsset
    ) {
      const _debt = humanReadableFloat(
        parseInt(finalBitasset.individual_settlement_debt),
        parsedAsset.p
      );
      const _fund = humanReadableFloat(
        parseInt(finalBitasset.individual_settlement_fund),
        parsedCollateralAsset.p
      );
      return {
        _debt,
        _fund,
      };
    }
  }, [finalBitasset, parsedAsset, parsedCollateralAsset]);

  // Outstanding debt supply (asset_dynamic_data_object 2.3.x) — covers the
  // with-bids leg of the auto revive price.
  // (confidential_supply is intentionally excluded: hidden amounts can't be
  // covered by visible fund accounting.)
  // NOTE: declared before autoRevivePrice below — memos execute in order
  // during render, so consumers must never sit above their inputs (TDZ).
  const [finalDynamicData, setFinalDynamicData] = useState(null);
  useEffect(() => {
    const dynId = finalAsset?.dynamic_asset_data_id;
    if (!usr?.chain || !dynId) return;
    let cancelled = false;
    const dynStore = createObjectStore([
      usr.chain,
      JSON.stringify([dynId]),
      currentNode ? currentNode.url : null,
    ]);
    const unsub = dynStore.subscribe(({ data, error, loading }) => {
      if (cancelled || loading || error) return;
      if (data && data[0]) setFinalDynamicData(data[0]);
    });
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [finalAsset, usr, currentNode]);

  const debtSupply = useMemo(() => {
    const raw = finalDynamicData?.current_supply;
    if (raw === undefined || !parsedAsset) return null;
    return humanReadableFloat(parseInt(raw), parsedAsset.p);
  }, [finalDynamicData, parsedAsset]);

  const [collateralBids, setCollateralBids] = useState();

  // Auto revive price (bitshares-ui reference wallet definition, shown in
  // this page's debt-per-collateral orientation, e.g. USD/BTS):
  // - without bids: frozen settlement rate scaled by MCR
  //   (MCR / R, with R = settlement collateral per debt).
  // - with bids: live collateral bids sorted best-first and filled until the
  //   outstanding supply is covered (marginal bid pro-rated), then
  //   MCR * coveredDebt / (settlementFund + bidCollateral).
  // Null (rendered as "—") whenever an input is missing; withBids is null
  // when no bid debt exists, mirroring the reference "--" display.
  const autoRevivePrice = useMemo(() => {
    if (!finalBitasset || !parsedAsset || !parsedCollateralAsset) {
      return null;
    }
    const mcr = Number(finalBitasset.current_feed?.maintenance_collateral_ratio) / 1000;
    if (!Number.isFinite(mcr) || mcr <= 0) {
      return null;
    }
    const sq = Number(finalBitasset.settlement_price?.quote?.amount);
    const sb = Number(finalBitasset.settlement_price?.base?.amount);
    if (!(sq > 0) || !(sb > 0)) {
      return null;
    }
    const q = humanReadableFloat(parseInt(sq, 10), parsedCollateralAsset.p);
    const b = humanReadableFloat(parseInt(sb, 10), parsedAsset.p);
    if (!(q > 0) || !(b > 0)) {
      return null;
    }
    const without = mcr / (q / b);

    let withBids = null;
    const supplyRaw = Number(finalDynamicData?.current_supply);
    if (Number.isFinite(supplyRaw) && supplyRaw > 0 && collateralBids?.length) {
      const priced = [];
      for (const bid of collateralBids) {
        const legs = getBidRawAmounts(
          bid,
          parsedCollateralAsset.id,
          parsedAsset.id
        );
        if (!legs || legs.debt <= 0) {
          continue;
        }
        priced.push({ ...legs, price: legs.collateral / legs.debt });
      }
      if (priced.length) {
        const covered = analyzeBidsForRevive(priced, supplyRaw);
        const fundRaw = Number(finalBitasset.settlement_fund);
        if (covered.debt > 0 && Number.isFinite(fundRaw) && fundRaw >= 0) {
          const totalCol =
            (fundRaw + covered.collateral) / 10 ** parsedCollateralAsset.p;
          const debtReal = covered.debt / 10 ** parsedAsset.p;
          if (totalCol > 0 && debtReal > 0) {
            withBids = (mcr * debtReal) / totalCol;
          }
        }
      }
    }
    return { without, withBids };
  }, [
    finalBitasset,
    parsedAsset,
    parsedCollateralAsset,
    finalDynamicData,
    collateralBids,
  ]);

  const individualFundingRatio = useMemo(() => {
    if (
      individualSettlementFund &&
      individualSettlementFund._fund > 0 &&
      currentFeedSettlementPrice > 0
    ) {
      return (
        ((individualSettlementFund._debt * currentFeedSettlementPrice) /
          individualSettlementFund._fund) *
        100
      );
    }
    return null;
  }, [individualSettlementFund, currentFeedSettlementPrice]);

  // Settlement-state badges, derived from chain fields (core semantics):
  // globally settled ⟺ settlement_price is non-null (either leg zero counts
  // as null); individual pool active ⟺ individual_settlement_debt != 0.
  // Independent of feed presence and BSRM wording, so all configs classify.
  const gsActive = useMemo(() => {
    const _b = finalBitasset?.settlement_price?.base?.amount;
    const _q = finalBitasset?.settlement_price?.quote?.amount;
    return Number(_b) > 0 && Number(_q) > 0;
  }, [finalBitasset]);
  const indivPoolActive = useMemo(() => {
    return Number(finalBitasset?.individual_settlement_debt) > 0;
  }, [finalBitasset]);

  useEffect(() => {
    if (parsedBitasset && parsedBitasset && usr && usr.chain) {
      const smartcoinDataStore = createObjectStore([
        usr.chain,
        JSON.stringify([
          parsedAsset.id,
          parsedBitasset.collateral,
          parsedBitasset.id,
        ]),
        currentNode ? currentNode.url : null,
      ]);
      smartcoinDataStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setFinalAsset(data[0]);
          setFinalCollateralAsset(data[1]);
          setFinalBitasset(data[2]);
        }
      });
    }
  }, [parsedAsset, parsedBitasset, usr]);

  useEffect(() => {
    let unsub;

    if (parsedAsset && usr && usr.chain) {
      const collateralBidsStore = createCollateralBidStore([
        usr.chain,
        parsedAsset.id,
        currentNode ? currentNode.url : null,
      ]);

      unsub = collateralBidsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setCollateralBids(data);
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [parsedAsset, usr]);

  // Prefill the bid form with our own existing collateral bid (one bid per
  // account per asset on-chain): runs whenever the bid list loads, so
  // returning to the page restores our position instead of blank fields.
  // Both the display states and the react-hook-form controllers are set —
  // the dialog payload reads the states, the popovers read the form.
  useEffect(() => {
    if (
      !collateralBids?.length ||
      !usr?.id ||
      !parsedAsset ||
      !parsedCollateralAsset
    ) {
      return;
    }
    const own = collateralBids.find((b) => b?.bidder === usr.id);
    if (!own) {
      return;
    }
    const legs = getBidRawAmounts(
      own,
      parsedCollateralAsset.id,
      parsedAsset.id
    );
    if (!legs) {
      return;
    }
    const colHuman = humanReadableFloat(legs.collateral, parsedCollateralAsset.p);
    const debtHuman = humanReadableFloat(legs.debt, parsedAsset.p);
    setAdditionalCollateral(colHuman);
    setDebtCovered(debtHuman);
    try {
      form.setValue("additionalCollateral", String(colHuman));
      form.setValue("debtCovered", String(debtHuman));
    } catch {
      // form not ready; state setters above still drive the dialog payload
    }
  }, [collateralBids, usr, parsedAsset, parsedCollateralAsset, form]);

  const collateralBiddingDisabled = useMemo(() => {
    if (finalAsset) {
      const obj = getFlagBooleans(finalAsset.options.flags);
      return Object.keys(obj).includes("disable_collateral_bidding");
    }
  }, [finalAsset]);

  // Force settling is available unless the issuer set disable_force_settle.
  const forceSettleAllowed = useMemo(() => {
    if (!finalAsset) {
      return false;
    }
    try {
      return !Object.keys(getFlagBooleans(finalAsset.options.flags)).includes(
        "disable_force_settle"
      );
    } catch {
      return false;
    }
  }, [finalAsset]);

  // Our spendable balance of the smartcoin itself (human units). Drives the
  // holder force-settle card below the bidding form.
  const [holderBalance, setHolderBalance] = useState(null);
  useEffect(() => {
    if (!parsedAsset?.id || !usr?.chain || !usr?.id) {
      setHolderBalance(null);
      return;
    }
    let cancelled = false;
    getAccountBalances(usr.chain, usr.id, currentNode?.url ?? null, null, [
      parsedAsset.id,
    ])
      .then((balances) => {
        if (cancelled) {
          return;
        }
        const found = (balances || []).find(
          (b) => b.asset_id === parsedAsset.id
        );
        setHolderBalance(
          found
            ? humanReadableFloat(parseInt(found.amount, 10), parsedAsset.p)
            : 0
        );
      })
      .catch(() => {
        if (!cancelled) {
          setHolderBalance(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [parsedAsset, usr, currentNode]);

  // Holder force-settle form state (separate from the individual-pool
  // force-settle fields above): settling here executes at the fixed
  // global settlement rate against the settlement fund.
  const [holderSettleAmount, setHolderSettleAmount] = useState(0);
  const [holderReceiving, setHolderReceiving] = useState(0);
  const [showForceSettleDialog, setShowForceSettleDialog] = useState(false);

  // Force settlement
  const [forceSettleAmount, setForceSettleAmount] = useState(0);
  const [totalReceiving, setTotalReceiving] = useState(0);

  // Global settlement
  const [additionalCollateral, setAdditionalCollateral] = useState(0);
  const [debtCovered, setDebtCovered] = useState(0);

  const [showDialog, setShowDialog] = useState(false);

  // The submit covers two operations: bid_collateral on the global fund
  // (needs both bid fields positive) or asset_settle force-settlement
  // (needs a positive amount). Empty/zero fields keep it disabled.
  const isBidPath = !!(
    settlementFund && settlementFund.finalSettlementFund
  );
  const canSubmit = isBidPath
    ? Number(additionalCollateral) > 0 && Number(debtCovered) > 0
    : Number(forceSettleAmount) > 0;

  // Raw chain-object JSON viewer (same pattern as IssuedAssets): the card
  // button shows the bitasset data object, bidder cells show that bid object.
  const [viewJSON, setViewJSON] = useState(false);
  const [jsonData, setJsonData] = useState(null);

  // True while the dialog was opened to remove (zero) our own bid, so the
  // header reflects removal instead of bidding. Reset on dialog close.
  const [isRemovingBid, setIsRemovingBid] = useState(false);

  // Zero both bid fields and open the signing dialog: a zero-collateral
  // bid_collateral removes our existing bid on-chain.
  const handleRemoveBid = useCallback(() => {
    setAdditionalCollateral(0);
    setDebtCovered(0);
    try {
      form.setValue("additionalCollateral", "0");
      form.setValue("debtCovered", "0");
    } catch {
      // form not ready; state setters above still drive the dialog payload
    }
    setIsRemovingBid(true);
    setShowDialog(true);
  }, [form]);

  const bidRowProps = useMemo(() => ({ collateralBids, parsedCollateralAsset, parsedAsset, currentFeedSettlementPrice, t, userId: usr?.id, onViewBid: (bid) => { setJsonData(bid); setViewJSON(true); }, onRemoveBid: (bid) => { handleRemoveBid(bid); } }), [collateralBids, parsedCollateralAsset, parsedAsset, currentFeedSettlementPrice, t, usr, handleRemoveBid]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-1/2">
        <div className="grid grid-cols-1 gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.2)] blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-2)/0.2)] blur-3xl"
            />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                  <Gavel className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                    {t("Settlement:pageTitle", { defaultValue: "Bid on settlement funds" })}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Settlement:bidOnGlobalSettlementFundsDescription")}
                  </p>
                  {gsActive || indivPoolActive ? (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {gsActive ? (
                        <Badge
                          variant="outline"
                          className="border-[hsl(var(--accent-danger)/0.35)] bg-[hsl(var(--accent-danger)/0.1)] text-[hsl(var(--accent-danger-fg))] text-[10px]"
                        >
                          {t("Settlement:globallySettled", { defaultValue: "Globally settled" })}
                        </Badge>
                      ) : null}
                      {indivPoolActive ? (
                        <Badge
                          variant="outline"
                          className="border-[hsl(var(--accent-warning)/0.35)] bg-[hsl(var(--accent-warning)/0.1)] text-[hsl(var(--accent-warning-fg))] text-[10px]"
                        >
                          {t("Settlement:individualPool", { defaultValue: "Individual settlement pool" })}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              {settlementFund && settlementFund.finalSettlementFund ? (
                <div className="relative mb-5 flex items-start gap-2 rounded-2xl border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.05)] p-3">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--accent-1-fg))]" />
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {t("Settlement:globalSettlementBiddingInfo", {
                      defaultValue:
                        "Unfortunately, {{symbol}} is in Global Settlement. During this time it is possible to bid on the collateral in the Settlement Fund and the debt it covers. When the total outstanding debt is covered by bids, and the additional collateral of each bid plus its share from the settlement fund is greater than the MCR, the asset is automatically revived and a margin position is created for each bid.\n\nBids will be included on revival sorted by their bid price until the whole debt is covered (last bid might be covered partially). Included bids will be converted into margin positions and receive the residual collateral such that the position reaches MCR from the settlement fund. Not included bids will be reimbursed.\n\nA bid can be removed by placing a zero collateral bid.",
                      symbol: parsedAsset.s,
                    })}
                  </p>
                </div>
              ) : null}
              {settlementFund && settlementFund.finalSettlementFund ? (
                <div className="relative mb-5 flex items-start gap-2 rounded-2xl border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.05)] p-3">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--accent-1-fg))]" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("Settlement:globalSettlementReviveInfo", {
                        defaultValue:
                          "Asset will be revived automatically if feed price is greater than auto revive price (bids included) or all debt is force settled.",
                      })}
                    </p>
                  </div>
                </div>
              ) : null}
              <form onSubmit={form.handleSubmit(() => setShowDialog(true))}>
                <FieldGroup className="space-y-3">
                  <Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-[hsl(var(--accent-1)/0.02)] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.15)] shrink-0">
                            <Wallet className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                          </span>
                          <span className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
                            {t("Settlement:biddingAccount")}
                          </span>
                        </div>
                        <FieldContent>
                          <div className="flex items-center gap-2">
                            <div className="shrink-0">
                              {usr && usr.username ? (
                                <Avatar
                                  size={40}
                                  name={usr.username}
                                  extra="Target"
                                  expression={{
                                    eye: "normal",
                                    mouth: "open",
                                  }}
                                  colors={[
                                    "#92A1C6",
                                    "#146A7C",
                                    "#F0AB3D",
                                    "#C271B4",
                                    "#C20D90",
                                  ]}
                                />
                              ) : (
                                <Av>
                                  <AvatarFallback>?</AvatarFallback>
                                </Av>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Input
                                disabled
                                placeholder="Bitshares account (1.2.x)"
                                value={usr && usr.username ? `${usr.username} (${usr.id})` : ""}
                                readOnly
                              />
                            </div>
                          </div>
                        </FieldContent>
                      </div>
                      <div className="rounded-2xl border border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.07)] to-[hsl(var(--accent-2)/0.02)] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-2)/0.15)] shrink-0">
                            <Coins className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
                          </span>
                          <span className="text-sm font-semibold text-[hsl(var(--accent-2-fg))]">
                            {t("Settlement:selectedAsset")}
                          </span>
                        </div>
                        <FieldContent>
                          <Input
                            disabled
                            placeholder="Bitshares smartcoin (1.3.x)"
                            value={`${parsedAsset ? parsedAsset.s : ""} (${
                              parsedAsset ? parsedAsset.id : ""
                            })`}
                            readOnly
                          />
                        </FieldContent>
                      </div>
                    </div>
                  </Field>
                  {currentFeedSettlementPrice > 0 ? (
                  <div className="rounded-2xl border border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.07)] to-[hsl(var(--accent-2)/0.02)] p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-2)/0.15)] shrink-0">
                        <Coins className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
                      </span>
                      <span className="text-sm font-semibold text-[hsl(var(--accent-2-fg))]">
                        {t("Settlement:currentFeedPrice")}
                      </span>
                    </div>
                  <Field>
                    <FieldLabel>{t("Settlement:currentFeedPrice")}</FieldLabel>
                    <FieldContent>
                      <span className="grid grid-cols-8">
                        <span className="col-span-6">
                          {parsedAsset && parsedCollateralAsset ? (
                            <Input
                              disabled
                              className="mb-1"
                              value={`${
                                currentFeedSettlementPrice
                                  ? (1 / currentFeedSettlementPrice).toFixed(
                                      parsedAsset.p
                                    )
                                  : 0
                              } ${parsedAsset ? parsedAsset.s : ""}/${
                                parsedCollateralAsset
                                  ? parsedCollateralAsset.s
                                  : ""
                              }`}
                              readOnly
                            />
                          ) : (
                            <Input
                              disabled
                              className="mb-1"
                              value=""
                              readOnly
                            />
                          )}
                        </span>
                      </span>
                    </FieldContent>
                  </Field>
                  </div>
                  ) : null}

                  {settlementFund && settlementFund.finalSettlementFund ? (
                    <>
                    <div className="rounded-2xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-[hsl(var(--accent-1)/0.02)] p-4 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.15)] shrink-0">
                            <HandCoins className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                          </span>
                          <span className="text-sm font-semibold text-[hsl(var(--accent-1-fg))] truncate">
                            {t("Settlement:totalDebtCoveredByBid")}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!finalBitasset}
                          onClick={() => {
                            setJsonData(finalBitasset);
                            setViewJSON(true);
                          }}
                          className="shrink-0 border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] gap-1.5"
                        >
                          <FileJson className="h-3.5 w-3.5" />
                          JSON
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-card/40 p-2.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {t("Settlement:finalSettlementPrice")}
                          </div>
                          <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                            {fmtSettlementPrice(settlementFund.finalSettlementPrice)}{" "}
                            <span className="text-[11px] font-normal text-muted-foreground">
                              {parsedAsset.s}/{parsedCollateralAsset.s}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-card/40 p-2.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {t("Settlement:settlementFundsAvailable")}
                          </div>
                          <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                            {settlementFund.finalSettlementFund}{" "}
                            <span className="text-[11px] font-normal text-muted-foreground">
                              {parsedCollateralAsset.s}
                            </span>
                          </div>
                          {debtSupply !== null ? (
                            <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                              {t("Settlement:supplyLabel", { defaultValue: "Supply" })}:{" "}
                              {debtSupply.toLocaleString(undefined, {
                                maximumFractionDigits: parsedAsset.p,
                              })}{" "}
                              {parsedAsset.s}
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-card/40 p-2.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {t("Settlement:autoRevivePrice", {
                              defaultValue:
                                "Auto Revive Price (without/with bids)",
                            })}
                          </div>
                          <div className="mt-1 text-sm font-semibold tabular-nums text-[hsl(var(--accent-1-fg))]">
                            {autoRevivePrice !== null ? (
                              <>
                                {fmtSettlementPrice(autoRevivePrice.without)} /{" "}
                                {autoRevivePrice.withBids !== null
                                  ? fmtSettlementPrice(autoRevivePrice.withBids)
                                  : "—"}
                              </>
                            ) : (
                              "—"
                            )}{" "}
                            <span className="text-[11px] font-normal text-muted-foreground">
                              {parsedAsset.s}/{parsedCollateralAsset.s}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Field>
                        <FieldLabel>
                          {t("Settlement:additionalCollateral")}
                        </FieldLabel>
                        <FieldDescription>
                          {t("Settlement:additionalCollateralDescription", {
                            asset: parsedAsset.s,
                          })}
                        </FieldDescription>
                        <FieldContent>
                          <span className="grid grid-cols-12">
                            <span className="col-span-8">
                              <Input
                                placeholder={
                                  additionalCollateral
                                    ? `${additionalCollateral} ${parsedCollateralAsset.s}`
                                    : `0 ${parsedCollateralAsset.s}`
                                }
                                readOnly
                                disabled
                                className="mb-3"
                              />
                            </span>
                            <span className="col-span-4 ml-3">
                              <Popover>
                                <PopoverTrigger>
                                  <span className="inline-block border border-border rounded pl-4 pb-1 pr-4">
                                    <Label>
                                      {t("Settlement:changeAmount")}
                                    </Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>
                                    {t("Settlement:provideNewAmount")}
                                  </Label>
                                  <Controller
                                    control={form.control}
                                    name="additionalCollateral"
                                    render={({ field }) => (
                                      <Input
                                        placeholder={additionalCollateral}
                                        className="mb-2 mt-1"
                                        value={field.value ?? ""}
                                        onChange={(event) => {
                                          const input = event.target.value;
                                          const regex = assetAmountRegex({
                                            precision: parsedCollateralAsset.p,
                                          });
                                          if (
                                            input &&
                                            input.length &&
                                            regex.test(input)
                                          ) {
                                            field.onChange(input);
                                            setAdditionalCollateral(
                                              parseFloat(input)
                                            );
                                          }
                                        }}
                                      />
                                    )}
                                  />
                                </PopoverContent>
                              </Popover>
                            </span>
                          </span>
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldLabel>
                          {t("Settlement:totalDebtCoveredByBid")}
                        </FieldLabel>
                        <FieldDescription>
                          {t("Settlement:totalDebtCoveredByBidDescription")}
                        </FieldDescription>
                        <FieldContent>
                          <span className="grid grid-cols-12">
                            <span className="col-span-8">
                              <Input
                                placeholder={
                                  debtCovered
                                    ? `${debtCovered} ${parsedAsset.s}`
                                    : `0 ${parsedAsset.s}`
                                }
                                readOnly
                                disabled
                                className="mb-3"
                              />
                            </span>
                            <span className="col-span-4 ml-3">
                              <Popover>
                                <PopoverTrigger>
                                  <span className="inline-block border border-border rounded pl-4 pb-1 pr-4">
                                    <Label>{t("Settlement:changeTotal")}</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>
                                    {t("Settlement:provideNewTotal")}
                                  </Label>
                                  <Controller
                                    control={form.control}
                                    name="debtCovered"
                                    render={({ field }) => (
                                      <Input
                                        placeholder={debtCovered}
                                        className="mb-2 mt-1"
                                        value={field.value ?? ""}
                                        onChange={(event) => {
                                          const input = event.target.value;
                                          const regex = assetAmountRegex({
                                            precision: parsedAsset.p,
                                          });
                                          if (
                                            input &&
                                            input.length &&
                                            regex.test(input)
                                          ) {
                                            field.onChange(input);
                                            setDebtCovered(parseFloat(input));
                                          }
                                        }}
                                      />
                                    )}
                                  />
                                </PopoverContent>
                              </Popover>
                            </span>
                          </span>
                        </FieldContent>
                      </Field>
                    </div>
                    </>
                  ) : null}

                  {individualSettlementFund &&
                  (individualSettlementFund._debt ||
                    individualSettlementFund._fund) ? (
                    <>
                    <div className="rounded-2xl border border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.07)] to-[hsl(var(--accent-2)/0.02)] p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-2)/0.15)] shrink-0">
                          <Coins className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
                        </span>
                        <span className="text-sm font-semibold text-[hsl(var(--accent-2-fg))]">
                          {t("Settlement:forceSettleAssetsDescription")}
                        </span>
                      </div>                      <Field>
                        <FieldLabel>
                          {t("Settlement:individualSettlementDebt")}
                        </FieldLabel>
                        <FieldContent>
                          <span className="grid grid-cols-8">
                            <span className="col-span-6">
                              <Input
                                disabled
                                className="mb-1"
                                value={`${individualSettlementFund._debt} ${parsedAsset.s}`}
                                readOnly
                              />
                            </span>
                          </span>
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldLabel>
                          {t("Settlement:individualSettlementFund")}
                        </FieldLabel>
                        <FieldContent>
                          <span className="grid grid-cols-8">
                            <span className="col-span-6">
                              <Input
                                disabled
                                className="mb-1"
                                value={`${individualSettlementFund._fund} ${parsedCollateralAsset.s}`}
                                readOnly
                              />
                            </span>
                          </span>
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldLabel>{t("Settlement:fundingRatio")}</FieldLabel>
                        {individualFundingRatio !== null ? (
                        <FieldContent>
                          <span className="grid grid-cols-8">
                            <span className="col-span-2 mb-1">
                              <Input
                                disabled
                                value={`${individualFundingRatio.toFixed(2)} %`}
                                readOnly
                              />
                            </span>
                            <span className="col-span-2 text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))]">
                              <Input
                                disabled
                                value={`-${(100 - individualFundingRatio).toFixed(2)}%`}
                                readOnly
                              />
                            </span>
                          </span>
                        </FieldContent>
                        ) : (
                        <FieldContent>
                          <span className="grid grid-cols-8">
                            <span className="col-span-2 mb-1">
                              <Input disabled value="—" readOnly />
                            </span>
                          </span>
                        </FieldContent>
                        )}
                      </Field>
                      <Field>
                        <FieldLabel>
                          {t("Settlement:forceSettleAmount")}
                        </FieldLabel>
                        <FieldDescription>
                          {t("Settlement:forceSettleAmountDescription")}
                        </FieldDescription>
                        <FieldContent>
                          <span className="grid grid-cols-12">
                            <span className="col-span-8">
                              <Input
                                placeholder={
                                  forceSettleAmount
                                    ? `${forceSettleAmount} ${parsedAsset.s}`
                                    : `0 ${parsedAsset.s}`
                                }
                                readOnly
                                disabled
                                className="mb-3"
                              />
                            </span>
                            <span className="col-span-4 ml-3">
                              <Popover>
                                <PopoverTrigger>
                                  <span className="inline-block border border-border rounded pl-4 pb-1 pr-4">
                                    <Label>
                                      {t("Settlement:changeAmount")}
                                    </Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>
                                    {t(
                                      "Settlement:provideNewForceSettleAmount"
                                    )}
                                  </Label>
                                  <Controller
                                    control={form.control}
                                    name="ForceSettleAmount"
                                    render={({ field }) => (
                                      <Input
                                        placeholder={forceSettleAmount}
                                        className="mb-2 mt-1"
                                        value={field.value ?? ""}
                                        onChange={(event) => {
                                          const input = event.target.value;
                                          const regex = assetAmountRegex({
                                            precision: parsedAsset.p,
                                          });
                                          if (
                                            input &&
                                            input.length &&
                                            regex.test(input)
                                          ) {
                                            field.onChange(input);
                                            setForceSettleAmount(
                                              parseFloat(input)
                                            );
                                            const _total = individualSettlementFund._fund > 0
                                              ? parseFloat(
                                                  (
                                                    (individualSettlementFund._debt /
                                                      individualSettlementFund._fund) *
                                                    input
                                                  ).toFixed(parsedCollateralAsset.p)
                                                )
                                              : 0;
                                            setTotalReceiving(_total);
                                            form.setValue(
                                              "totalReceiving",
                                              _total
                                            );
                                          }
                                        }}
                                      />
                                    )}
                                  />
                                </PopoverContent>
                              </Popover>
                            </span>
                          </span>
                        </FieldContent>
                        {forceSettleAmount &&
                        individualSettlementFund._debt &&
                        forceSettleAmount > individualSettlementFund._debt ? (
                          <FieldError
                            errors={[
                              {
                                message: t(
                                  "Settlement:forceSettleAmountExceedsDebt"
                                ),
                              },
                            ]}
                          />
                        ) : null}
                      </Field>
                      <Field>
                        <FieldLabel>
                          {t("Settlement:totalAmountReceive")}
                        </FieldLabel>
                        <FieldDescription>
                          {t("Settlement:totalAmountReceiveDescription", {
                            asset: parsedAsset.s,
                          })}
                        </FieldDescription>
                        <FieldContent>
                          <span className="grid grid-cols-12">
                            <span className="col-span-8">
                              <Input
                                placeholder={
                                  totalReceiving
                                    ? `${totalReceiving} ${parsedCollateralAsset.s}`
                                    : `0 ${parsedCollateralAsset.s}`
                                }
                                readOnly
                                disabled
                                className="mb-1"
                              />
                            </span>
                            <span className="col-span-4 ml-3">
                              <Popover>
                                <PopoverTrigger>
                                  <span className="inline-block border border-border rounded pl-4 pb-1 pr-4">
                                    <Label>{t("Settlement:changeTotal")}</Label>
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Label>
                                    {t("Settlement:provideNewTotalAmount")}
                                  </Label>
                                  <Controller
                                    control={form.control}
                                    name="totalReceiving"
                                    render={({ field }) => (
                                      <Input
                                        placeholder={totalReceiving}
                                        className="mb-2 mt-1"
                                        value={field.value ?? ""}
                                        onChange={(event) => {
                                          const input = event.target.value;
                                          const regex = assetAmountRegex({
                                            precision: parsedCollateralAsset.p,
                                          });
                                          if (
                                            input &&
                                            input.length &&
                                            regex.test(input)
                                          ) {
                                            field.onChange(input);
                                            setTotalReceiving(
                                              parseFloat(input).toFixed(
                                                parsedCollateralAsset.p
                                              )
                                            );

                                            const _fsAmont = (
                                              input / currentFeedSettlementPrice
                                            ).toFixed(parsedAsset.p);

                                            setForceSettleAmount(_fsAmont);
                                            form.setValue(
                                              "ForceSettleAmount",
                                              _fsAmont
                                            );
                                          }
                                        }}
                                      />
                                    )}
                                  />
                                </PopoverContent>
                              </Popover>
                            </span>
                          </span>
                        </FieldContent>

                        <FieldDescription>
                          {t("Settlement:payingPremium", {
                            premium:
                              individualFundingRatio !== null
                                ? (100 - individualFundingRatio).toFixed(2)
                                : "—",
                          })}
                        </FieldDescription>
                      </Field>
                    </div>
                    </>
                  ) : null}

                  <div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {t("Settlement:networkFee")}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-sm text-[hsl(var(--accent-1-fg))]">
                        {(() => {
                          const _fee =
                            settlementFund && settlementFund.finalSettlementFund
                              ? bidFee
                              : settleFee;
                          return typeof _fee === "number" ? _fee.toFixed(5) : "0.00000";
                        })()}
                        <span className="text-muted-foreground">
                          {usr && usr.chain === "bitshares" ? "BTS" : "TEST"}
                        </span>
                      </span>
                    </div>
                    {finalBitasset?.options?.extensions?.force_settle_fee_percent ? (
                      <div className="text-[10px] text-muted-foreground mt-0.5 text-right">
                        {t("Settlement:additionalForceSettlementFee", {
                          fee:
                            finalBitasset.options.extensions
                              .force_settle_fee_percent / 100,
                        })}
                      </div>
                    ) : null}
                  </div>

                  <Button
                    className="group w-full h-14 text-base font-semibold rounded-2xl bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-3))] to-[hsl(var(--accent-3))] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-3))] hover:to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_32px_-12px_hsl(var(--accent-3)/0.7)] hover:shadow-[0_12px_40px_-12px_hsl(var(--accent-3)/0.9)] transition-all"
                    type="submit"
                    disabled={!canSubmit}
                  >
                    {t("Settlement:submit")}
                  </Button>

                  {collateralBiddingDisabled ? (
                    <div className="rounded-2xl border border-[hsl(var(--accent-warning)/0.3)] bg-[hsl(var(--accent-warning)/0.08)] p-3 text-xs text-muted-foreground leading-relaxed">
                      {t("Settlement:collateralBiddingDisabled")}
                    </div>
                  ) : null}
                </FieldGroup>
              </form>

              {(!settlementFund ||
                (settlementFund && !settlementFund.finalSettlementFund)) &&
              (!individualSettlementFund ||
                (individualSettlementFund &&
                  (!individualSettlementFund._debt ||
                    !individualSettlementFund._fund)))
                ? (
                  <div className="flex items-start gap-2 rounded-2xl border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.05)] p-3">
                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--accent-1-fg))]" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("Settlement:noSettlementFunds", { defaultValue: "No settlement funds available" })}
                    </p>
                  </div>
                )
                : null}
            </div>
          </div>

          {settlementFund &&
          settlementFund.finalSettlementFund &&
          forceSettleAllowed &&
          (holderBalance ?? 0) > 0 &&
          parsedAsset &&
          parsedCollateralAsset ? (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-2)/0.7)] to-transparent"
              />
              <div className="relative p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-2)/0.15)] shrink-0">
                    <Coins className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold tracking-tight text-foreground">
                      {t("Settlement:holderForceSettleTitle", {
                        defaultValue: "Force settle {{asset}}",
                        asset: parsedAsset.s,
                      })}
                    </h3>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {t("Settlement:holderForceSettleDescription", {
                        defaultValue:
                          "During Global Settlement there is no delay in asset force settlements, which will be covered by the settlement funds at the fixed settlement price.",
                      })}
                    </p>
                  </div>
                </div>
                <FieldGroup className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field>
                      <FieldLabel>
                        <span className="flex items-center justify-between gap-2 w-full">
                          <span className="truncate">
                            {t("Settlement:holderSettleAmount", {
                              defaultValue: "Settlement amount",
                            })}
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0 font-normal">
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {holderBalance.toLocaleString(undefined, {
                                maximumFractionDigits: parsedAsset.p,
                              })}{" "}
                              {parsedAsset.s}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setHolderSettleAmount(holderBalance);
                                const rate = settlementFund.settlementRate;
                                setHolderReceiving(
                                  Number.isFinite(rate) && rate > 0
                                    ? parseFloat(
                                        (holderBalance * rate).toFixed(
                                          parsedCollateralAsset.p
                                        )
                                      )
                                    : 0
                                );
                              }}
                              className="rounded-md border border-[hsl(var(--accent-2)/0.4)] bg-[hsl(var(--accent-2)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] transition-colors"
                            >
                              {t("Settlement:maxButton", {
                                defaultValue: "Max",
                              })}
                            </button>
                          </span>
                        </span>
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          value={holderSettleAmount || ""}
                          placeholder={`0 ${parsedAsset.s}`}
                          className="mb-1"
                          onChange={(event) => {
                            const input = event.target.value;
                            if (!input) {
                              setHolderSettleAmount(0);
                              setHolderReceiving(0);
                              return;
                            }
                            const regex = assetAmountRegex({
                              precision: parsedAsset.p,
                            });
                            if (regex.test(input)) {
                              const amt = parseFloat(input);
                              setHolderSettleAmount(amt);
                              const rate = settlementFund.settlementRate;
                              setHolderReceiving(
                                Number.isFinite(rate) && rate > 0
                                  ? parseFloat(
                                      (amt * rate).toFixed(
                                        parsedCollateralAsset.p
                                      )
                                    )
                                  : 0
                              );
                            }
                          }}
                        />
                      </FieldContent>
                      {holderSettleAmount > holderBalance ? (
                        <FieldError
                          errors={[
                            {
                              message: t(
                                "Settlement:holderAmountExceedsBalance",
                                {
                                  defaultValue:
                                    "Amount exceeds your available balance",
                                }
                              ),
                            },
                          ]}
                        />
                      ) : null}
                    </Field>
                    <Field>
                      <FieldLabel>
                        {t("Settlement:holderReceiving", {
                          defaultValue: "Estimated collateral received",
                        })}
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          disabled
                          className="mb-1"
                          value={`${holderReceiving} ${parsedCollateralAsset.s}`}
                          readOnly
                        />
                      </FieldContent>
                    </Field>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowForceSettleDialog(true)}
                    disabled={
                      !(holderSettleAmount > 0 && holderSettleAmount <= holderBalance)
                    }
                    className="w-full h-11 text-sm font-semibold rounded-2xl bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_32px_-12px_hsl(var(--accent-2)/0.7)] transition-all"
                  >
                    {t("Settlement:submit")}
                  </Button>
                </FieldGroup>
              </div>
            </div>
          ) : null}

          {settlementFund &&
          settlementFund.finalSettlementFund &&
          parsedAsset &&
          parsedCollateralAsset ? (
            <a
              href={`/instant_trade.html?market=${parsedCollateralAsset.s}_${parsedAsset.s}`}
              className="block relative overflow-hidden rounded-2xl border border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-r from-[hsl(var(--accent-2)/0.08)] to-transparent hover:border-[hsl(var(--accent-2)/0.45)] hover:bg-[hsl(var(--accent-2)/0.12)] transition-all"
            >
              <div className="relative p-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl border border-[hsl(var(--accent-2)/0.35)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.25)] to-[hsl(var(--accent-2)/0.08)] shrink-0">
                  <ArrowLeftRight className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">
                    {t("Settlement:marketBuyTitle", {
                      defaultValue: "Buy {{asset}} with {{collateral}}",
                      asset: parsedAsset.s,
                      collateral: parsedCollateralAsset.s,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    {t("Settlement:marketBuyDescription", {
                      defaultValue:
                        "Short on {{asset}}? Buy it on the open market and force settle it — every settled debt brings the asset closer to automatic revival.",
                      asset: parsedAsset.s,
                    })}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[hsl(var(--accent-2-fg))]" />
              </div>
            </a>
          ) : null}

          {collateralBids && collateralBids.length ? (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.10)]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-2)/0.6)] to-transparent"
              />
              <div className="relative p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent-2)/0.3)] to-[hsl(var(--accent-1)/0.3)] border border-[hsl(var(--accent-2)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-2)/0.4)]">
                    <ClipboardList className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold tracking-tight text-foreground">
                      {t("Settlement:existingCollateralBids")}
                    </h3>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {t("Settlement:existingCollateralBidsDescription")}
                    </p>
                  </div>
                  <span className="ml-auto inline-flex items-center rounded-full border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] px-2 py-0.5 font-mono tabular-nums text-[11px] text-[hsl(var(--accent-2-fg))]">
                    {collateralBids.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 pb-2 mb-1 border-b border-border/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <div className="flex-1 truncate">{t("Settlement:bidder")}</div>
                  <div className="flex-1 text-right">{t("Settlement:collateral")}</div>
                  <div className="flex-1 text-right">{t("Settlement:debt")}</div>
                  <div className="flex-1 text-right">{t("Settlement:bidPrice")}</div>
                  <div className="flex-1 text-right">{t("Settlement:ratio")}</div>
                </div>
                <div className="w-full h-[400px] -mx-2 pt-2">
                  <List
                    height={400}
                    width="100%"
                    rowComponent={MemoSettlementBidRow}
                    rowCount={collateralBids.length}
                    rowHeight={48}
                    rowProps={bidRowProps}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {showDialog ? (
            <DeepLinkDialog
              operationNames={[
                settlementFund && settlementFund.finalSettlementFund
                  ? "bid_collateral" // op: 45
                  : "asset_settle", // op: 17
              ]}
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={(open) => {
                setShowDialog(open);
                if (!open) {
                  setIsRemovingBid(false);
                }
              }}
              key={
                settlementFund && settlementFund.finalSettlementFund
                  ? `bidCollateral${parsedCollateralAsset.s}Debt${parsedAsset.s}`
                  : `Settling${forceSettleAmount}${parsedAsset.s}for${totalReceiving}${parsedCollateralAsset.s}`
              }
              headerText={
                isRemovingBid
                  ? t("Settlement:removingCollateralBid", {
                      defaultValue: "Removing collateral bid on {{asset}}",
                      asset: parsedAsset.s,
                    })
                  : settlementFund && settlementFund.finalSettlementFund
                  ? t("Settlement:biddingOnDebt", {
                      asset: parsedAsset.s,
                      collateral: parsedCollateralAsset.s,
                    })
                  : t("Settlement:settlingFor", {
                      forceSettleAmount: forceSettleAmount,
                      asset: parsedAsset.s,
                      totalReceiving: totalReceiving,
                      collateral: parsedCollateralAsset.s,
                    })
              }
              trxJSON={[
                settlementFund && settlementFund.finalSettlementFund
                  ? {
                      bidder: usr.id,
                      additional_collateral: {
                        amount: blockchainFloat(
                          additionalCollateral,
                          parsedCollateralAsset.p
                        ),
                        asset_id: parsedCollateralAsset.id,
                      },
                      debt_covered: {
                        amount: blockchainFloat(debtCovered, parsedAsset.p),
                        asset_id: parsedAsset.id,
                      },
                      extensions: [],
                    }
                  : {
                      account: usr.id,
                      amount: {
                        amount: blockchainFloat(
                          forceSettleAmount,
                          parsedAsset.p
                        ),
                        asset_id: parsedAsset.id,
                      },
                      extensions: [],
                    },
              ]}
            />
          ) : null}

          {showForceSettleDialog ? (
            <DeepLinkDialog
              operationNames={["asset_settle"]}
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setShowForceSettleDialog}
              key={`ForceSettling${holderSettleAmount}${parsedAsset.s}for${holderReceiving}${parsedCollateralAsset.s}`}
              headerText={t("Settlement:settlingFor", {
                forceSettleAmount: holderSettleAmount,
                asset: parsedAsset.s,
                totalReceiving: holderReceiving,
                collateral: parsedCollateralAsset.s,
              })}
              trxJSON={[
                {
                  account: usr.id,
                  amount: {
                    amount: blockchainFloat(
                      holderSettleAmount,
                      parsedAsset.p
                    ),
                    asset_id: parsedAsset.id,
                  },
                  extensions: [],
                },
              ]}
            />
          ) : null}

          {viewJSON && jsonData ? (
            <Dialog
              open={viewJSON}
              onOpenChange={(open) => {
                setViewJSON(open);
              }}
            >
              <DialogContent className="sm:max-w-[750px] !bg-card border border-border">
                <DialogHeader>
                  <DialogTitle>{t("LiveBlocks:dialogContent.json")}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {t("LiveBlocks:dialogContent.jsonDescription")}
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={JSON.stringify(jsonData, null, 2)}
                  readOnly={true}
                  rows={15}
                  className="bg-card/60"
                />
                <Button
                  className="w-1/4 mt-2 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] border-0"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
                  }}
                >
                  {t("LiveBlocks:dialogContent.copy")}
                </Button>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>
    </>
  );
}
