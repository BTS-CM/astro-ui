import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import {
  Gavel,
  Coins,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { cn } from "@/lib/utils";
import { humanReadableFloat, getFlagBooleans } from "@/lib/common.js";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createSettlementFundsStore } from "@/nanoeffects/SettlementFunds.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList, $userBlockList } from "@/stores/blocklist.ts";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";

function hasSettlementFund(bitasset) {
  if (!bitasset) {
    return false;
  }
  try {
    return parseInt(bitasset.settlement_fund ?? "0", 10) > 0;
  } catch {
    return false;
  }
}

function getFundAmount(bitasset) {
  if (!bitasset) {
    return 0;
  }
  const parsed = parseInt(bitasset.settlement_fund ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getHumanFund(bitasset, collateralPrecision) {
  try {
    return humanReadableFloat(getFundAmount(bitasset), collateralPrecision ?? 0);
  } catch {
    return getFundAmount(bitasset);
  }
}

function extractAssetIdNumber(assetId) {
  const parts = String(assetId ?? "").split(".");
  const maybe = parseInt(parts[2] ?? parts[parts.length - 1], 10);
  return Number.isFinite(maybe) ? maybe : 0;
}

function getBsrmMethod(bitasset) {
  // Black swan response method: 0 global / 1 none / 2 individual-to-fund /
  // 3 individual-to-order. Absent extension predates BSRM, behaves as 0.
  // Derived from the 2.4.x bitasset object itself (no extra fetch needed).
  const raw = bitasset?.options?.extensions?.black_swan_response_method;
  const parsed = typeof raw === "number" ? raw : parseInt(raw ?? "0", 10);
  return [0, 1, 2, 3].includes(parsed) ? parsed : 0;
}

function getSettleFeePercent(bitasset) {
  // Chain stores force_settle_fee_percent as percent * 100.
  const raw = bitasset?.options?.extensions?.force_settle_fee_percent;
  const parsed = typeof raw === "number" ? raw : parseFloat(raw ?? "0");
  return Number.isFinite(parsed) && parsed > 0 ? parsed / 100 : 0;
}

function isCollateralBiddingDisabled(asset) {
  // Same check as the Settlement page: the disable_collateral_bidding
  // flag (0x8000) on the 1.3.x asset means bid_collateral is rejected.
  const flags = Number(asset?.options?.flags);
  if (!Number.isFinite(flags)) {
    return false;
  }
  try {
    return Object.keys(getFlagBooleans(flags)).includes(
      "disable_collateral_bidding"
    );
  } catch {
    return false;
  }
}

function isIssuerBlocked(issuerId, chain, blocklist, chainUserBlockList) {
  if (!issuerId) {
    return false;
  }
  // Committee blocklist (bitshares only): stored as sha256 hex of 1.2.x ids.
  if (
    chain === "bitshares" &&
    blocklist &&
    blocklist.users &&
    blocklist.users.length
  ) {
    try {
      if (blocklist.users.includes(toHex(sha256(utf8ToBytes(issuerId))))) {
        return true;
      }
    } catch {
      // hashing failure must never hide a row; fall through to user list
    }
  }
  // Personal user blocklist: plain {name, id} entries for the active chain.
  if (chainUserBlockList && chainUserBlockList.length) {
    return chainUserBlockList.some((u) => u.id === issuerId);
  }
  return false;
}

function SettlementBidRow({ index, style, rows, t }) {
  const row = rows[index];
  if (!row) {
    return null;
  }

  const { bitasset, asset, collateral, issuer, settleFee, biddingDisabled } =
    row;
  const fund = getHumanFund(bitasset, collateral?.precision);
  const symbol = asset?.symbol ?? bitasset.asset_id;
  const issuerName = issuer?.name && issuer.name !== issuer.id ? issuer.name : null;

  const inner = (
    <div className="p-4">
      <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border flex-shrink-0 border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.12)] to-[hsl(var(--accent-1)/0.04)]">
                <Gavel className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" strokeWidth={2.25} />
              </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {symbol}
            </h3>
            <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
              {bitasset.asset_id}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <Badge
              variant="outline"
              className="border-[hsl(var(--accent-1)/0.15)] bg-[hsl(var(--accent-1)/0.04)] text-xs font-mono tabular-nums"
            >
              {t("SettlementBids:fund")}: {fund} {collateral?.symbol ?? ""}
              {collateral?.id ? ` (${collateral.id})` : ""}
            </Badge>
                  {asset?.issuer ? (
                    <Badge variant="outline" className="text-xs font-mono">
                      {t("SettlementBids:issuer")}:{" "}
                      {issuerName ? `${issuerName} (${asset.issuer})` : asset.issuer}
                    </Badge>
                  ) : null}
                  {settleFee > 0 ? (
                    <Badge variant="outline" className="text-xs font-mono">
                      {t("SettlementBids:fee")}: {settleFee}%
                    </Badge>
                  ) : null}
          </div>
          {biddingDisabled ? (
            <div className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-[hsl(var(--accent-warning-fg))]">
              <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
              <span>{t("Settlement:collateralBiddingDisabled")}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ ...style }} key={`sfund-${bitasset.asset_id}`}>
      <Card className="mx-2 mb-1.5 rounded-xl border border-[hsl(var(--accent-1)/0.12)] bg-gradient-to-r from-[hsl(var(--accent-1)/0.03)] to-transparent hover:border-[hsl(var(--accent-1)/0.25)] hover:bg-[hsl(var(--accent-1)/0.05)] transition-all cursor-pointer">
        <a
          href={`/settlement.html?id=${bitasset.asset_id}`}
          className="block"
          title={t("SettlementBids:bidOnTitle", { symbol })}
          aria-label={t("SettlementBids:bidOnTitle", { symbol })}
        >
          {inner}
        </a>
      </Card>
    </div>
  );
}
const MemoSettlementBidRow = React.memo(SettlementBidRow);

export default function SettlementBids() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );
  const userBlockList = useSyncExternalStore(
    $userBlockList.subscribe,
    $userBlockList.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  const chainUserBlockList = useMemo(() => {
    if (!userBlockList) {
      return [];
    }
    return userBlockList[_chain ?? "bitshares"] ?? [];
  }, [userBlockList, _chain]);

  useInitCache(_chain ?? "bitshares", []);

  const [smartcoins, setSmartcoins] = useState([]);
  const [assets, setAssets] = useState([]);
  const [issuers, setIssuers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetching() {
      // Filter-first store: fetches all 2.4.x bitassets live, keeps only
      // settlement_fund > 0, then resolves 1.3.x assets solely for that
      // subset (via injected cache when provided, live-fetching misses).
      // No account balances or issuers: this view doesn't use them.
      const requiredStore = createSettlementFundsStore([
        _chain ?? usr.chain ?? "bitshares",
        "[]",
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (cancelled) {
          return;
        }
        if (data && !error && !loading) {
          setLoading(false);
          setSmartcoins(
            (data._smartcoins ?? []).filter(
              (x) => x && x.asset_id && hasSettlementFund(x)
            )
          );
          setAssets(data._assets ?? []);
          setIssuers(data._issuers ?? []);
        }
      });
    }

    if (usr && usr.chain && currentNode && currentNode.url) {
      setLoading(true);
      setSmartcoins([]);
      setAssets([]);
      setIssuers([]);
      fetching();
    } else {
      setSmartcoins([]);
      setAssets([]);
      setIssuers([]);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [usr, currentNode, _chain]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIssuer, setSelectedIssuer] = useState("all");
  const [selectedBsrm, setSelectedBsrm] = useState("all");
  const [selectedBidding, setSelectedBidding] = useState("enabled");
  const [sortType, setSortType] = useState("fund"); // "default" | "alphabetical" | "fund"
  const [sortDirection, setSortDirection] = useState("desc");

  const handleSortClick = (type) => {
    if (type === sortType) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortType(type);
      // Sensible defaults per sort: ID asc, alphabetical asc, fund desc
      setSortDirection(type === "fund" ? "desc" : "asc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedIssuer("all");
    setSelectedBsrm("all");
    setSelectedBidding("enabled");
  };

  const hasActiveFilters =
    (searchQuery && searchQuery.trim().length > 0) ||
    selectedIssuer !== "all" ||
    selectedBsrm !== "all" ||
    selectedBidding !== "enabled";

  const assetById = useMemo(() => {
    const map = new Map();
    if (assets && assets.length) {
      for (const entry of assets) {
        if (entry && entry.id) {
          map.set(entry.id, entry);
        }
      }
    }
    return map;
  }, [assets]);

  const issuerById = useMemo(() => {
    const map = new Map();
    if (issuers && issuers.length) {
      for (const entry of issuers) {
        if (entry && entry.id) {
          map.set(entry.id, entry);
        }
      }
    }
    return map;
  }, [issuers]);

  // Base list: funded bitassets minus prediction markets minus
  // blocklisted issuers (committee blocklist + personal user blocklist).
  // Everything downstream (issuer dropdown, filters, counts) builds on this.
  const visibleSmartcoins = useMemo(() => {
    return (smartcoins ?? []).filter((bitasset) => {
      if (!bitasset) {
        return false;
      }
      // Exclude prediction markets, like the smartcoins overview does.
      const desc = bitasset.options?.description || "";
      if (desc.includes("condition") && desc.includes("expiry")) {
        return false;
      }
      // Hide assets whose issuer is blocked; silently, like CreditBorrow.
      const issuerId = assetById.get(bitasset.asset_id)?.issuer;
      return !isIssuerBlocked(issuerId, _chain, blocklist, chainUserBlockList);
    });
  }, [smartcoins, assetById, _chain, blocklist, chainUserBlockList]);

  const issuerOptions = useMemo(() => {
    const seen = new Map();
    for (const bitasset of visibleSmartcoins) {
      const asset = assetById.get(bitasset?.asset_id);
      const issuerId = asset?.issuer;
      if (issuerId && !seen.has(issuerId)) {
        const issuer = issuerById.get(issuerId);
        seen.set(issuerId, issuer?.name ?? issuerId);
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [visibleSmartcoins, assetById, issuerById]);

  const rows = useMemo(() => {
    let result = visibleSmartcoins.map((bitasset) => {
      const asset = assetById.get(bitasset.asset_id);
      const collateral = bitasset.options?.short_backing_asset
        ? assetById.get(bitasset.options.short_backing_asset)
        : null;
      const issuer = asset?.issuer ? issuerById.get(asset.issuer) ?? null : null;
      return {
        bitasset,
        asset,
        collateral,
        issuer,
        bsrm: getBsrmMethod(bitasset),
        settleFee: getSettleFeePercent(bitasset),
        biddingDisabled: isCollateralBiddingDisabled(asset),
      };
    });

    const q = (searchQuery ?? "").trim().toLowerCase();
    if (q) {
      result = result.filter((row) =>
        (row.asset?.symbol ?? row.bitasset.asset_id ?? "")
          .toLowerCase()
          .includes(q)
      );
    }

    if (selectedIssuer !== "all") {
      result = result.filter((row) => row.asset?.issuer === selectedIssuer);
    }

    if (selectedBsrm !== "all") {
      const method = parseInt(selectedBsrm, 10);
      result = result.filter((row) => row.bsrm === method);
    }

    if (selectedBidding === "disabled") {
      result = result.filter((row) => row.biddingDisabled);
    } else if (selectedBidding === "enabled") {
      result = result.filter((row) => !row.biddingDisabled);
    }

    const dir = sortDirection === "asc" ? 1 : -1;
    result.sort((a, b) => {
      let cmp = 0;
      if (sortType === "alphabetical") {
        cmp = (a.asset?.symbol ?? a.bitasset.asset_id ?? "").localeCompare(
          b.asset?.symbol ?? b.bitasset.asset_id ?? ""
        );
      } else if (sortType === "fund") {
        cmp =
          getHumanFund(a.bitasset, a.collateral?.precision) -
          getHumanFund(b.bitasset, b.collateral?.precision);
      } else {
        cmp =
          extractAssetIdNumber(a.bitasset.asset_id) -
          extractAssetIdNumber(b.bitasset.asset_id);
      }
      return cmp * dir;
    });

    return result;
  }, [visibleSmartcoins, assetById, issuerById, searchQuery, selectedIssuer, selectedBsrm, selectedBidding, sortType, sortDirection]);

  const rowProps = useMemo(() => ({ rows, t }), [rows, t]);

  // Disabled rows carry an extra warning line — size them taller while
  // keeping standard rows tight.
  const getMobileRowHeight = useCallback(
    (index, props) => (props.rows[index]?.biddingDisabled ? 188 : 152),
    []
  );
  const getDesktopRowHeight = useCallback(
    (index, props) => (props.rows[index]?.biddingDisabled ? 124 : 92),
    []
  );

  const listKey = useMemo(() => {
    return `settlement-bids-${_chain}-${usr && usr.id ? usr.id : "nouser"}`;
  }, [_chain, usr]);

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-4xl">
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl"
        />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1)/0.25)] to-[hsl(var(--accent-3)/0.25)] border border-[hsl(var(--accent-1)/0.25)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.15)]">
              <Gavel className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                {t("SettlementBids:title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("SettlementBids:description")}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--accent-1)/0.12)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.04)] to-[hsl(var(--accent-1)/0.01)] p-4 mb-5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative w-full sm:w-1/2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("SettlementBids:searchPlaceholder")}
                  aria-label={t("SettlementBids:searchLabel")}
                  className="pl-8 pr-8 h-9 text-sm"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={t("SettlementBids:clearSearch")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2 w-full sm:w-1/2">
                {[
                  { type: "default", label: t("SettlementBids:sortDefault") },
                  {
                    type: "alphabetical",
                    label: t("SettlementBids:sortAlphabetical"),
                  },
                  { type: "fund", label: t("SettlementBids:sortFund") },
                ].map((opt) => {
                  const isActive = sortType === opt.type;
                  return (
                    <Button
                      key={opt.type}
                      type="button"
                      onClick={() => handleSortClick(opt.type)}
                      variant={isActive ? "" : "outline"}
                      size="sm"
                      className={cn(
                        "h-9 text-xs",
                        isActive
                          ? "border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.08)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.12)]"
                          : "border-border text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isActive ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="ml-1 h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0" />
                        )
                      ) : null}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Select value={selectedIssuer} onValueChange={setSelectedIssuer}>
                <SelectTrigger
                  className="h-9 text-sm"
                  aria-label={t("SettlementBids:issuerFilter")}
                >
                  <SelectValue placeholder={t("SettlementBids:issuerFilter")} />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  <SelectGroup>
                    <SelectItem value="all">
                      {t("SettlementBids:allIssuers")}
                    </SelectItem>
                    {issuerOptions.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name !== id ? `${name} (${id})` : id}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={selectedBsrm} onValueChange={setSelectedBsrm}>
                <SelectTrigger
                  className="h-9 text-sm"
                  aria-label={t("SettlementBids:bsrmFilter")}
                >
                  <SelectValue placeholder={t("SettlementBids:bsrmFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">
                      {t("SettlementBids:bsrmAll")}
                    </SelectItem>
                    {[0, 1, 2, 3].map((method) => (
                      <SelectItem key={method} value={String(method)}>
                        {t(`SettlementBids:bsrm_${method}`)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={selectedBidding} onValueChange={setSelectedBidding}>
                <SelectTrigger
                  className="h-9 text-sm"
                  aria-label={t("SettlementBids:biddingFilter")}
                >
                  <SelectValue placeholder={t("SettlementBids:biddingFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">
                      {t("SettlementBids:biddingAll")}
                    </SelectItem>
                    <SelectItem value="disabled">
                      {t("SettlementBids:biddingDisabled")}
                    </SelectItem>
                    <SelectItem value="enabled">
                      {t("SettlementBids:biddingEnabled")}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {smartcoins.length !== rows.length ? (
              <div className="flex items-center">
                <span className="ml-auto text-[11px] text-muted-foreground font-mono tabular-nums">
                  {t("SettlementBids:showingOf", {
                    filtered: rows.length,
                    total: smartcoins.length,
                  })}
                </span>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Spinner className="size-6 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
              <p className="text-foreground/70 text-sm">
                {t("CreditBorrow:common.loading")}
              </p>
            </div>
          ) : (
            <>
              {rows.length > 0 && (
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Coins className="h-3.5 w-3.5 text-[hsl(var(--accent-1-fg))]" />
                  <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--accent-1-fg))]">
                    {t("SettlementBids:listingFunds", { count: rows.length })}
                  </span>
                </div>
              )}
              {!rows.length ? (
                hasActiveFilters && smartcoins.length > 0 ? (
                  <Empty className="mt-2 border border-[hsl(var(--accent-1)/0.12)] rounded-2xl bg-[hsl(var(--accent-1)/0.03)]">
                    <EmptyHeader>
                      <EmptyMedia
                        variant="icon"
                        className="bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))]"
                      >
                        <Gavel className="w-6 h-6" />
                      </EmptyMedia>
                      <EmptyTitle className="text-foreground/80">
                        {t("SettlementBids:noFilterResults")}
                      </EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        {t("SettlementBids:clearFilters")}
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <Empty className="mt-2 border border-[hsl(var(--accent-1)/0.12)] rounded-2xl bg-[hsl(var(--accent-1)/0.03)]">
                    <EmptyHeader>
                      <EmptyMedia
                        variant="icon"
                        className="bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))]"
                      >
                        <Gavel className="w-6 h-6" />
                      </EmptyMedia>
                      <EmptyTitle className="text-foreground/80">
                        {t("SettlementBids:noFunds")}
                      </EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                      <p className="text-xs text-muted-foreground">
                        {t("SettlementBids:noFundsDescription")}
                      </p>
                    </EmptyContent>
                  </Empty>
                )
              ) : (
                <>
                  <div className="w-full h-[500px] block md:hidden">
                    <List
                      key={listKey}
                      height={500}
                      width="100%"
                      rowComponent={MemoSettlementBidRow}
                      rowCount={rows.length}
                      rowHeight={getMobileRowHeight}
                      rowProps={rowProps}
                    />
                  </div>
                  <div className="w-full h-[500px] hidden md:block">
                    <List
                      key={listKey}
                      height={500}
                      width="100%"
                      rowComponent={MemoSettlementBidRow}
                      rowCount={rows.length}
                      rowHeight={getDesktopRowHeight}
                      rowProps={rowProps}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
