import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from "react";
import Fuse from "fuse.js";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { GearIcon } from "@radix-ui/react-icons";
import {
  ArrowLeft,
  Search,
  Wallet,
  Star,
  Clock,
  Trash2,
  Inbox,
  ChevronRight,
  Sparkles,
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
import { cn } from "@/lib/utils";

import { $favouriteAssets } from "@/stores/favourites.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $assetHistory, addAssetHistory, clearAssetHistory } from "@/stores/assetHistory.ts";

function StepIndicator({ currentStep, accentColor, step1Label, step2Label }) {
  const steps = [
    { key: 1, label: step1Label },
    { key: 2, label: step2Label },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                currentStep === step.key
                  ? "text-white shadow-lg"
                  : currentStep > step.key
                  ? "text-foreground"
                  : "bg-accent/60 text-muted-foreground border border-border/80"
              )}
              style={
                currentStep === step.key
                  ? {
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                      boxShadow: `0 4px 14px -3px ${accentColor}66`,
                    }
                  : currentStep > step.key
                  ? { background: `${accentColor}33`, borderColor: `${accentColor}44` }
                  : {}
              }
            >
              {currentStep > step.key ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.key
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium tracking-wide uppercase transition-colors duration-300",
                currentStep === step.key ? "text-foreground/80 font-semibold" : "text-muted-foreground/60"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 h-px mx-1 mb-5">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  currentStep > step.key ? "opacity-100" : "opacity-30"
                )}
                style={{
                  background:
                    currentStep > step.key
                      ? `linear-gradient(90deg, ${accentColor}88, ${accentColor}44)`
                      : "rgba(0,0,0,0.15)",
                }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function BlockchainButton({ name, subtitle, onClick, icon, accentColor }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left px-5 py-4 h-auto rounded-xl",
        "bg-accent/40 dark:bg-white/[0.05] border-border/80",
        "hover:bg-accent/60 hover:border-border",
        "transition-all duration-200 ease-out",
        "focus:ring-2 focus:ring-[hsl(var(--accent-3)/0.4)] focus:ring-offset-0"
      )}
    >
      <div className="flex items-center gap-4 w-full">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`,
            border: `1px solid ${accentColor}33`,
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-foreground font-medium text-sm">{name}</div>
          <div className="text-muted-foreground text-xs mt-0.5">{subtitle}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Button>
  );
}

const AssetRow = React.memo(function AssetRow({
  index,
  style,
  mode,
  thisResult,
  featuredAssets,
  relevantAssets,
  balances,
  marketSearchContents,
  handleSelectAsset,
  t,
}) {
  let res;
  if (mode === "search") {
    res = thisResult[index]?.item;
  } else if (mode === "featured") {
    res = featuredAssets[index];
  } else if (mode === "favourites") {
    res = relevantAssets[index];
  } else if (mode === "balances" && balances && balances.length) {
    const _balance = balances[index];
    res = marketSearchContents.find((asset) => asset.id === _balance.asset_id);
  }

  if (!res) {
    return null;
  }

  const isFavourite = mode === "favourites";
  const symbol = isFavourite ? res.symbol : res.s;
  const id = res.id;
  const issuer = isFavourite ? res.issuer : res.u;

  return (
    <div style={{ ...style, paddingRight: "8px", paddingBottom: "8px" }}>
      <Button
        variant="outline"
        onClick={() => {
          handleSelectAsset(res);
        }}
        className={cn(
          "group relative w-full text-left px-3 py-2.5 h-auto rounded-xl justify-start",
          "bg-accent/40 dark:bg-white/[0.05] border-border/60",
          "hover:bg-accent/60 hover:border-border",
          "transition-all duration-200 ease-out"
        )}
      >
        <div className="flex flex-col items-start w-full min-w-0">
          <div className="text-sm font-semibold text-foreground/90 truncate w-full">
            {symbol} ({id})
          </div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5 truncate w-full">
            {t("AssetDropDownCard:issued", { user: issuer })}
          </div>
        </div>
      </Button>
    </div>
  );
});

const AssetRecentRow = React.memo(function AssetRecentRow({
  index,
  style,
  filteredRecent,
  handleSelectAsset,
  t,
}) {
  const entry = filteredRecent[index];
  if (!entry) return null;
  return (
    <div style={style} className="pr-1 pb-1">
      <Button
        variant="outline"
        onClick={() => {
          // reconstruct minimal asset shape for handleSelectAsset
          handleSelectAsset({ s: entry.symbol, symbol: entry.symbol, id: entry.id, u: entry.issuer, issuer: entry.issuer });
        }}
        className={cn(
          "group relative w-full text-left px-3 py-2.5 h-auto rounded-xl justify-start",
          "bg-accent/40 dark:bg-white/[0.05] border-border/60",
          "hover:bg-accent/60 hover:border-border",
          "transition-all duration-200 ease-out"
        )}
      >
        <div className="flex flex-col items-start w-full min-w-0">
          <div className="text-sm font-semibold text-foreground/90 truncate w-full">
            {entry.symbol} ({entry.id})
          </div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5 truncate w-full">
            {t("AssetDropDownCard:issued", { user: entry.issuer })}
          </div>
        </div>
      </Button>
    </div>
  );
});

/**
 * Creating an asset dropdown component
 * @param {String} assetSymbol current asset symbol
 * @param {Function} storeCallback setState
 * @param {String} otherAsset market pair asset
 * @returns {JSX.Element}
 */
export default function AssetDropDown(properties) {
  const {
    assetSymbol,
    assetData,
    storeCallback,
    otherAsset,
    otherAssets, // Array of other chosen assets to exclude
    allowedIds, // Optional array of asset IDs to restrict selection to (e.g. owned balances). Unset = all.
    marketSearch,
    type,
    size,
    chain,
    balances,
    triggerLabel, // optional custom trigger label
    triggerVariant, // optional custom trigger variant
    triggerClassName, // optional custom trigger class
    autoWidth, // optional: use w-auto instead of w-full for compact header buttons
    initialMode, // optional mode to open on ("search"|"balances"|"featured"|"favourites"|"recent"); unset = mode chooser
    accentColor: propsAccentColor,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const accentColor = propsAccentColor || "#8B5CF6";

  const marketSearchContents = useMemo(() => {
    if (!marketSearch || !marketSearch.length) {
      return [];
    } else {
      let currentContents = otherAsset
        ? marketSearch.filter(
            (asset) => asset.s !== otherAsset && asset.s !== assetSymbol
          )
        : marketSearch.filter((asset) => asset.s !== assetSymbol);

      if (otherAssets && Array.isArray(otherAssets) && otherAssets.length) {
        currentContents = currentContents.filter(
          (asset) => !otherAssets.includes(asset.s)
        );
      }

      if (allowedIds && Array.isArray(allowedIds)) {
        currentContents = currentContents.filter((asset) =>
          allowedIds.includes(asset.id)
        );
      }

      if (chain === "bitshares" && blocklist && blocklist.users) {
        currentContents = currentContents.filter(
          (asset) =>
            !blocklist.users.includes(
              toHex(
                sha256(
                  utf8ToBytes(
                    asset.u.split(" ")[1].replace("(", "").replace(")", "")
                  )
                )
              )
            )
        );
      }

      return currentContents;
    }
  }, [marketSearch, blocklist, chain, assetSymbol, otherAsset, otherAssets, allowedIds]);

  // Balances must be pre-filtered to avoid phantom rows: any balance whose asset is blocked
  // or excluded (via marketSearchContents filtering) would otherwise resolve to null in AssetRow
  // and leave a List gap (rowCount includes it but row renders null).
  const displayBalances = useMemo(() => {
    if (!balances || !balances.length) return [];
    // marketSearchContents already reflects blocklist + otherAsset/otherAssets + assetSymbol exclusion
    // If marketSearch hasn't loaded yet (empty), don't hide all balances — show them until data arrives
    if (!marketSearchContents.length && (!marketSearch || !marketSearch.length)) {
      return balances;
    }
    return balances.filter((bal) => marketSearchContents.some((a) => a.id === bal.asset_id));
  }, [balances, marketSearchContents, marketSearch]);

  const fuse = useMemo(
    () =>
      new Fuse(marketSearchContents, {
        includeScore: true,
        keys: [
          "id",
          "s", // symbol
          "u", // `name (id) (ltm?)`
        ],
      }),
    [marketSearchContents]
  );

  const [thisInput, setThisInput] = useState("");
  const [thisResult, setThisResult] = useState();
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => {
    if (thisInput) {
      const result = fuse.search(thisInput);
      setThisResult(result);
    } else {
      setThisResult(undefined);
    }
  }, [thisInput, fuse]);

  const [mode, setMode] = useState(initialMode ?? null);
  const [featuredCategory, setFeaturedCategory] = useState(null);

  // Per-page list filters — same pattern as global search but local to each pseudo-page
  const [balancesFilter, setBalancesFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");
  const [favouritesFilter, setFavouritesFilter] = useState("");
  const [recentFilter, setRecentFilter] = useState("");

  // Clear per-page filters when navigating between pages or closing dialog
  useEffect(() => {
    setBalancesFilter("");
    setFeaturedFilter("");
    setFavouritesFilter("");
    setRecentFilter("");
  }, [mode, featuredCategory]);
  useEffect(() => {
    if (!dialogOpen) {
      setBalancesFilter("");
      setFeaturedFilter("");
      setFavouritesFilter("");
      setRecentFilter("");
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (mode !== "featured" && featuredCategory) {
      setFeaturedCategory(null);
    }
  }, [mode, featuredCategory]);

  const favouriteAssets = useStore($favouriteAssets);

  // effectiveChain must be declared before any memo that uses it (avoids TDZ)
  const effectiveChain = chain || "bitshares";

  const featuredAssets = useMemo(() => {
    if (!chain || !marketSearchContents) {
      return [];
    }
    const _featuredSymbols = [
      "XBTSX.",
      "xbtsx.",
      "BTWTY.",
      "btwty.",
      "HONEST.",
      "honest.",
      "NFTEA.",
      "nftea.",
    ];
    const _featuredIssuers = [
      "committee-account",
      "honest-quorum",
      "nftprofessional1",
    ];

    let _featuredAssets = marketSearchContents.filter((asset) => {
      if (chain === "bitshares") {
        if (_featuredIssuers.includes(asset.u.split(" ")[0])) {
          return true;
        }
        if (_featuredSymbols.some((str) => asset.s.includes(str))) {
          return true;
        }
      }
      return false;
    });

    return _featuredAssets;
  }, [marketSearchContents, chain]);

  const featuredCategoryConfig = useMemo(() => [
    {
      key: "committee",
      label: t("AssetDropDownCard:featuredCategories.committee"),
      subtitle: t("AssetDropDownCard:featuredCategories.committeeSubtitle"),
      filter: (asset) => asset.u.split(" ")[0] === "committee-account",
      icon: Sparkles,
    },
    {
      key: "xbts",
      label: "XBTS",
      subtitle: t("AssetDropDownCard:featuredCategories.xbtsSubtitle"),
      filter: (asset) => asset.s.toUpperCase().includes("XBTSX."),
      icon: Sparkles,
    },
    {
      key: "btwty",
      label: "BTWTY",
      subtitle: t("AssetDropDownCard:featuredCategories.btwtySubtitle"),
      filter: (asset) => asset.s.toUpperCase().includes("BTWTY."),
      icon: Sparkles,
    },
    {
      key: "honest",
      label: "HONEST",
      subtitle: t("AssetDropDownCard:featuredCategories.honestSubtitle"),
      filter: (asset) => asset.s.toUpperCase().includes("HONEST."),
      icon: Sparkles,
    },
    {
      key: "nftea",
      label: "NFTEA",
      subtitle: t("AssetDropDownCard:featuredCategories.nfteaSubtitle"),
      filter: (asset) => asset.s.toUpperCase().includes("NFTEA."),
      icon: Sparkles,
    },
  ], [t]);

  const featuredCounts = useMemo(() => {
    if (!marketSearchContents || !effectiveChain) return {};
    const counts = {};
    for (const cat of featuredCategoryConfig) {
      counts[cat.key] = marketSearchContents.filter((a) => {
        if (effectiveChain !== "bitshares") return false;
        return cat.filter(a);
      }).length;
    }
    return counts;
  }, [marketSearchContents, effectiveChain, featuredCategoryConfig]);

  const featuredCategoryAssets = useMemo(() => {
    if (!featuredCategory || !marketSearchContents) return [];
    const cfg = featuredCategoryConfig.find((c) => c.key === featuredCategory);
    if (!cfg) return [];
    return marketSearchContents.filter((asset) => {
      if (effectiveChain !== "bitshares") return false;
      return cfg.filter(asset);
    });
  }, [featuredCategory, marketSearchContents, effectiveChain, featuredCategoryConfig]);

  const relevantAssets = useMemo(() => {
    if (!chain || !favouriteAssets) {
      return [];
    }

    const _chainAssets = favouriteAssets[chain] ?? [];

    if (!assetSymbol && !otherAsset) {
      return _chainAssets;
    }

    return _chainAssets.filter((asset) =>
      assetSymbol && otherAsset
        ? asset.symbol !== assetSymbol && asset.symbol !== otherAsset
        : asset.symbol !== assetSymbol
    );
  }, [favouriteAssets, assetSymbol, otherAsset, chain]);

  // --- Derived search data & filtered lists (same Fuse pattern as global search) ---
  // Balances: keep balance-object shape for AssetRow, but search on resolved asset s/id/u
  const balancesSearchData = useMemo(() => {
    if (!displayBalances.length) return [];
    return displayBalances
      .map((bal) => {
        const asset = marketSearchContents.find((a) => a.id === bal.asset_id);
        if (!asset) return null;
        return { balance: bal, asset };
      })
      .filter(Boolean);
  }, [displayBalances, marketSearchContents]);

  const balancesFuse = useMemo(
    () =>
      new Fuse(balancesSearchData, {
        includeScore: true,
        keys: ["asset.s", "asset.id", "asset.u"],
      }),
    [balancesSearchData]
  );

  const filteredBalances = useMemo(() => {
    if (!balancesFilter) return displayBalances;
    const res = balancesFuse.search(balancesFilter);
    return res.map((r) => r.item.balance);
  }, [displayBalances, balancesFilter, balancesFuse]);

  const featuredFuse = useMemo(
    () =>
      new Fuse(featuredCategoryAssets, {
        includeScore: true,
        keys: ["s", "id", "u"],
      }),
    [featuredCategoryAssets]
  );

  const filteredFeaturedCategoryAssets = useMemo(() => {
    if (!featuredFilter) return featuredCategoryAssets;
    return featuredFuse.search(featuredFilter).map((r) => r.item);
  }, [featuredCategoryAssets, featuredFilter, featuredFuse]);

  const favouritesFuse = useMemo(
    () =>
      new Fuse(relevantAssets, {
        includeScore: true,
        keys: ["symbol", "id", "issuer"],
      }),
    [relevantAssets]
  );

  const filteredRelevantAssets = useMemo(() => {
    if (!favouritesFilter) return relevantAssets;
    return favouritesFuse.search(favouritesFilter).map((r) => r.item);
  }, [relevantAssets, favouritesFilter, favouritesFuse]);

  // Recent assets history
  const assetHistoryStore = useStore($assetHistory);
  const assetHistory = useMemo(() => {
    if (!assetHistoryStore) return [];
    const raw = assetHistoryStore[effectiveChain] ?? assetHistoryStore[chain] ?? [];
    // sort desc lastUsed like AccountSearch
    return [...raw].sort((a, b) => b.lastUsed - a.lastUsed);
  }, [assetHistoryStore, chain, effectiveChain]);

  const filteredRecent = useMemo(() => {
    if (!assetHistory || !assetHistory.length) return [];
    let out = assetHistory;
    // exclude other side of market pair to avoid duplicate pick, but keep current assetSymbol visible in history
    // (fixes: selecting from balances then reopening should still show just-selected in recent)
    if (otherAsset || (otherAssets && otherAssets.length)) {
      out = out.filter((e) => {
        if (otherAsset && e.symbol === otherAsset) return false;
        if (otherAssets && Array.isArray(otherAssets) && otherAssets.includes(e.symbol)) return false;
        // filter by id as well for safety
        if (otherAsset && assetData && e.id === assetData?.id && e.symbol === otherAsset) return false;
        return true;
      });
    }
    // blocklist filter if bitshares
    if (effectiveChain === "bitshares" && blocklist && blocklist.users) {
      out = out.filter((e) => {
        try {
          // e.issuer may be "name (id)" style or just name
          const issuerStr = e.issuer || "";
          const match = issuerStr.match(/\(([^)]+)\)/);
          const maybeId = match ? match[1] : null;
          if (!maybeId) return true;
          const hashed = toHex(sha256(utf8ToBytes(maybeId)));
          return !blocklist.users.includes(hashed);
        } catch {
          return true;
        }
      });
    }
    // Optionally only keep entries that still exist in marketSearchContents? keep for now to allow stale but filtered above
    return out;
  }, [assetHistory, assetSymbol, otherAsset, otherAssets, assetData, chain, effectiveChain, blocklist]);

  const recentFuse = useMemo(
    () =>
      new Fuse(filteredRecent, {
        includeScore: true,
        keys: ["symbol", "id", "issuer"],
      }),
    [filteredRecent]
  );

  const filteredRecentSearch = useMemo(() => {
    if (!recentFilter) return filteredRecent;
    return recentFuse.search(recentFilter).map((r) => r.item);
  }, [filteredRecent, recentFilter, recentFuse]);

  const handleSelectAsset = useCallback(
    (asset) => {
      if (!asset) return;
      const symbol = asset.s ?? asset.symbol;
      const id = asset.id ?? asset.asset_id;
      const rawIssuer = asset.u ?? asset.issuer ?? "";
      const targetChain = chain || "bitshares";
      if (symbol && id) {
        try {
          addAssetHistory(targetChain, {
            symbol,
            id,
            issuer: rawIssuer,
            lastUsed: Date.now(),
          });
        } catch (e) {
          console.log(e);
        }
      }
      // delay to allow dialog animation, matching previous setTimeout(0) pattern
      setTimeout(() => {
        if (symbol) storeCallback(symbol);
      }, 0);
      setDialogOpen(false);
      // reset search state after selection
      setThisInput("");
      setThisResult(undefined);
      setMode(null);
      setFeaturedCategory(null);
    },
    [chain, storeCallback]
  );

  const currentStep = !mode ? 1 : 2;

  const rowProps = useMemo(
    () => ({
      mode,
      thisResult,
      featuredAssets,
      relevantAssets,
      balances: filteredBalances,
      marketSearchContents,
      handleSelectAsset,
      t,
    }),
    [mode, thisResult, featuredAssets, relevantAssets, filteredBalances, marketSearchContents, handleSelectAsset, t]
  );

  const recentRowProps = useMemo(
    () => ({ filteredRecent: filteredRecentSearch, handleSelectAsset, t }),
    [filteredRecentSearch, handleSelectAsset, t]
  );

  const favouriteRowProps = useMemo(
    () => ({
      mode: "favourites",
      featuredAssets: [],
      relevantAssets: filteredRelevantAssets,
      balances: [],
      marketSearchContents,
      handleSelectAsset,
      t,
      thisResult: [],
    }),
    [filteredRelevantAssets, marketSearchContents, handleSelectAsset, t]
  );

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          setThisResult(undefined);
          setThisInput("");
          setMode(null);
          setFeaturedCategory(null);
        }
        setDialogOpen(open);
      }}
    >
      <DialogTrigger asChild>
        {size && size === "cog" ? (
          <GearIcon onClick={() => setDialogOpen(true)} />
        ) : (
          <Button
            variant={triggerVariant ? triggerVariant : "ghost"}
            className={`${
              size && size === "small" ? "h-7 text-xs px-2 " : "h-9 px-3 "
            } ${autoWidth ? "w-auto" : "w-full"} justify-between font-semibold ${
              type === "quote"
                ? "bg-accent/50 hover:bg-white/[0.1] text-foreground border border-border"
                : "bg-accent/40 hover:bg-accent/60 text-foreground/85 border border-border"
            } ${triggerClassName ?? ""}`}
            onClick={() => setDialogOpen(true)}
          >
            <span className="truncate">
              {triggerLabel
                ? triggerLabel
                : !assetSymbol
                ? t("AssetDropDownCard:select")
                : !size && assetSymbol
                ? t("AssetDropDownCard:change")
                : size && assetSymbol && assetSymbol.length < 12
                ? assetSymbol
                : size && assetSymbol && assetSymbol.length >= 12
                ? assetData.id
                : null}
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] !bg-card border border-border text-foreground">
        <DialogHeader>
          <DialogTitle>
            <h3 className="text-xl font-bold tracking-tight">
              {assetSymbol
                ? t("AssetDropDownCard:replacing", { assetSymbol: assetSymbol })
                : t("AssetDropDownCard:selecting")}
            </h3>
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-[340px]">
          <StepIndicator
            currentStep={currentStep}
            accentColor={accentColor}
            step1Label={t("AssetDropDownCard:step1")}
            step2Label={t("AssetDropDownCard:step2")}
          />

          {/* MODE SELECTION — pseudo-page landing */}
          {!mode ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-muted-foreground text-sm mb-4">
                {chain === "bitshares"
                  ? t("AssetDropDownCard:mode.titleBTS")
                  : chain === "bitshares_testnet"
                  ? t("AssetDropDownCard:mode.titleTEST")
                  : t("AssetDropDownCard:mode.titleBTS")}
              </div>

              <BlockchainButton
                name={t("AssetDropDownCard:mode.search")}
                subtitle={t("AssetDropDownCard:mode.searchSubtitle")}
                icon={<Search className="w-5 h-5" style={{ color: accentColor }} />}
                onClick={() => setMode("search")}
                accentColor={accentColor}
              />

              {displayBalances && displayBalances.length ? (
                <BlockchainButton
                  name={t("AssetDropDownCard:mode.balances")}
                  subtitle={t("AssetDropDownCard:mode.balancesSubtitle", { count: displayBalances.length })}
                  icon={<Wallet className="w-5 h-5" style={{ color: accentColor }} />}
                  onClick={() => setMode("balances")}
                  accentColor={accentColor}
                />
              ) : null}

              <BlockchainButton
                name={t("AssetDropDownCard:mode.featured")}
                subtitle={t("AssetDropDownCard:mode.featuredSubtitle", { count: featuredAssets.length })}
                icon={<Sparkles className="w-5 h-5" style={{ color: accentColor }} />}
                onClick={() => setMode("featured")}
                accentColor={accentColor}
              />

              <BlockchainButton
                name={t("AssetDropDownCard:mode.favourites")}
                subtitle={t("AssetDropDownCard:mode.favouritesSubtitle", { count: relevantAssets.length })}
                icon={<Star className="w-5 h-5" style={{ color: accentColor }} />}
                onClick={() => setMode("favourites")}
                accentColor={accentColor}
              />

              <BlockchainButton
                name={t("AssetDropDownCard:mode.recent")}
                subtitle={t("AssetDropDownCard:mode.recentSubtitle", { count: filteredRecent.length })}
                icon={<Clock className="w-5 h-5" style={{ color: accentColor }} />}
                onClick={() => setMode("recent")}
                accentColor={accentColor}
              />
            </div>
          ) : null}

          {/* SEARCH PAGE */}
          {mode === "search" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-muted-foreground text-sm">
                {t("AssetDropDownCard:searchPage.initDesc")}
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Search className="w-4 h-4 text-muted-foreground/50" />
                </div>
                <Input
                  name="assetSearch"
                  value={thisInput}
                  placeholder={t("AssetDropDownCard:searchPage.placeholder")}
                  onChange={(event) => {
                    setThisInput(event.target.value);
                  }}
                  autoFocus
                  className={cn(
                    "pl-10 pr-4 py-6 text-foreground placeholder:text-muted-foreground/50",
                    "bg-accent/40 dark:bg-white/[0.05] border-border/80",
                    "focus-visible:ring-2 focus-visible:ring-offset-0",
                    "transition-all duration-200"
                  )}
                />
              </div>

              {thisResult && thisResult.length ? (
                <div className="w-full h-[340px] rounded-xl">
                  <List
                    height={340}
                    width="100%"
                    rowComponent={AssetRow}
                    rowCount={thisResult.length}
                    rowHeight={72}
                    rowProps={rowProps}
                    key={`list-search-${chain}`}
                  />
                </div>
              ) : thisInput ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                      border: `1px solid ${accentColor}20`,
                    }}
                  >
                    <Inbox className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div className="text-muted-foreground text-sm font-medium mb-1">
                    {t("AssetDropDownCard:searchPage.noResults")}
                  </div>
                  <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                    {t("AssetDropDownCard:searchPage.noResultsHint")}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground/60 px-1">
                  {t("AssetDropDownCard:searchPage.description")}
                </div>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  setMode(null);
                  setThisInput("");
                  setThisResult(undefined);
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("AssetDropDownCard:mode.back")}
              </Button>
            </div>
          ) : null}

          {/* BALANCES PAGE */}
          {mode === "balances" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-muted-foreground text-sm">
                {t("AssetDropDownCard:balancesPage.description")}
              </div>

              {displayBalances && displayBalances.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <Input
                    value={balancesFilter}
                    placeholder={t("AssetDropDownCard:searchPage.placeholder")}
                    onChange={(event) => setBalancesFilter(event.target.value)}
                    className={cn(
                      "pl-10 pr-4 py-6 text-foreground placeholder:text-muted-foreground/50",
                      "bg-accent/40 dark:bg-white/[0.05] border-border/80",
                      "focus-visible:ring-2 focus-visible:ring-offset-0",
                      "transition-all duration-200"
                    )}
                  />
                </div>
              ) : null}

              <div className="w-full h-[340px] rounded-xl">
                {filteredBalances && filteredBalances.length ? (
                  <List
                    height={340}
                    width="100%"
                    rowComponent={AssetRow}
                    rowCount={filteredBalances.length}
                    rowHeight={72}
                    rowProps={rowProps}
                    key={`list-balances-${chain}-${balancesFilter}`}
                  />
                ) : displayBalances && displayBalances.length && balancesFilter ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                        border: `1px solid ${accentColor}20`,
                      }}
                    >
                      <Inbox className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div className="text-muted-foreground text-sm font-medium mb-1">
                      {t("AssetDropDownCard:searchPage.noResults")}
                    </div>
                    <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                      {t("AssetDropDownCard:searchPage.noResultsHint")}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                        border: `1px solid ${accentColor}20`,
                      }}
                    >
                      <Inbox className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div className="text-muted-foreground text-sm font-medium mb-1">
                      {t("AssetDropDownCard:balancesPage.none")}
                    </div>
                    <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                      {t("AssetDropDownCard:balancesPage.noneHint")}
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                onClick={() => setMode(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("AssetDropDownCard:mode.back")}
              </Button>
            </div>
          ) : null}

          {/* FEATURED PAGE — two-level: categories then assets */}
          {mode === "featured" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {!featuredCategory ? (
                <>
                  <div className="text-muted-foreground text-sm">
                    {t("AssetDropDownCard:featuredPage.description")}
                  </div>

                  <div className="space-y-3">
                    {featuredCategoryConfig.map((cat) => {
                      const Icon = cat.icon;
                      const count = featuredCounts[cat.key] ?? 0;
                      return (
                        <BlockchainButton
                          key={cat.key}
                          name={cat.label}
                          subtitle={`${count} ${cat.subtitle || t("AssetDropDownCard:featuredPage.assets")}`}
                          icon={<Icon className="w-5 h-5" style={{ color: accentColor }} />}
                          onClick={() => setFeaturedCategory(cat.key)}
                          accentColor={accentColor}
                        />
                      );
                    })}
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMode(null);
                      setFeaturedCategory(null);
                    }}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t("AssetDropDownCard:mode.back")}
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-muted-foreground text-sm">
                    {(() => {
                      const cfg = featuredCategoryConfig.find((c) => c.key === featuredCategory);
                      return cfg ? `${cfg.label} — ${t("AssetDropDownCard:featuredPage.description")}` : t("AssetDropDownCard:featuredPage.description");
                    })()}
                  </div>

                  {featuredCategoryAssets && featuredCategoryAssets.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Search className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                      <Input
                        value={featuredFilter}
                        placeholder={t("AssetDropDownCard:searchPage.placeholder")}
                        onChange={(event) => setFeaturedFilter(event.target.value)}
                        className={cn(
                          "pl-10 pr-4 py-6 text-foreground placeholder:text-muted-foreground/50",
                          "bg-accent/40 dark:bg-white/[0.05] border-border/80",
                          "focus-visible:ring-2 focus-visible:ring-offset-0",
                          "transition-all duration-200"
                        )}
                      />
                    </div>
                  ) : null}

                  <div className="w-full h-[340px] rounded-xl">
                    {filteredFeaturedCategoryAssets && filteredFeaturedCategoryAssets.length ? (
                      <List
                        height={340}
                        width="100%"
                        rowComponent={AssetRow}
                        rowCount={filteredFeaturedCategoryAssets.length}
                        rowHeight={72}
                        rowProps={{
                          mode: "featured",
                          thisResult: [],
                          featuredAssets: filteredFeaturedCategoryAssets,
                          relevantAssets: [],
                          balances: [],
                          marketSearchContents,
                          handleSelectAsset,
                          t,
                        }}
                        key={`list-featured-${featuredCategory}-${chain}-${featuredFilter}`}
                      />
                    ) : featuredCategoryAssets && featuredCategoryAssets.length && featuredFilter ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                          style={{
                            background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                            border: `1px solid ${accentColor}20`,
                          }}
                        >
                          <Inbox className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <div className="text-muted-foreground text-sm font-medium mb-1">
                          {t("AssetDropDownCard:searchPage.noResults")}
                        </div>
                        <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                          {t("AssetDropDownCard:searchPage.noResultsHint")}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                          style={{
                            background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                            border: `1px solid ${accentColor}20`,
                          }}
                        >
                          <Inbox className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <div className="text-muted-foreground text-sm font-medium mb-1">
                          {t("AssetDropDownCard:featuredPage.none")}
                        </div>
                        <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                          {t("AssetDropDownCard:featuredPage.noneHint")}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => setFeaturedCategory(null)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t("AssetDropDownCard:mode.back")}
                  </Button>
                </>
              )}
            </div>
          ) : null}

          {/* FAVOURITES PAGE */}
          {mode === "favourites" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-muted-foreground text-sm">
                {t("AssetDropDownCard:favouritesPage.description")}
              </div>

              {relevantAssets && relevantAssets.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <Input
                    value={favouritesFilter}
                    placeholder={t("AssetDropDownCard:searchPage.placeholder")}
                    onChange={(event) => setFavouritesFilter(event.target.value)}
                    className={cn(
                      "pl-10 pr-4 py-6 text-foreground placeholder:text-muted-foreground/50",
                      "bg-accent/40 dark:bg-white/[0.05] border-border/80",
                      "focus-visible:ring-2 focus-visible:ring-offset-0",
                      "transition-all duration-200"
                    )}
                  />
                </div>
              ) : null}

              <div className="w-full h-[340px] rounded-xl">
                {filteredRelevantAssets && filteredRelevantAssets.length ? (
                  <List
                    height={340}
                    width="100%"
                    rowComponent={AssetRow}
                    rowCount={filteredRelevantAssets.length}
                    rowHeight={72}
                    rowProps={favouriteRowProps}
                    key={`list-favourites-${chain}-${favouritesFilter}`}
                  />
                ) : relevantAssets && relevantAssets.length && favouritesFilter ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                        border: `1px solid ${accentColor}20`,
                      }}
                    >
                      <Inbox className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div className="text-muted-foreground text-sm font-medium mb-1">
                      {t("AssetDropDownCard:searchPage.noResults")}
                    </div>
                    <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                      {t("AssetDropDownCard:searchPage.noResultsHint")}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                        border: `1px solid ${accentColor}20`,
                      }}
                    >
                      <Inbox className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div className="text-muted-foreground text-sm font-medium mb-1">
                      {t("AssetDropDownCard:favouritesPage.none")}
                    </div>
                    <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                      {t("AssetDropDownCard:favouritesPage.noneHint")}
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                onClick={() => setMode(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("AssetDropDownCard:mode.back")}
              </Button>
            </div>
          ) : null}

          {/* RECENT PAGE — mirrors AccountSearch recent */}
          {mode === "recent" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span className="flex-1">{t("AssetDropDownCard:recent.description")}</span>
                {filteredRecent.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => clearAssetHistory(effectiveChain)}
                    className={cn(
                      "h-7 w-7 rounded-lg flex-shrink-0",
                      "hover:bg-[hsl(var(--accent-1)/0.1)] hover:border-[hsl(var(--accent-1)/0.3)]",
                      "transition-all duration-200 group/erase"
                    )}
                    title={t("AssetDropDownCard:recent.eraseHistory")}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground/50 group-hover/erase:text-[hsl(var(--accent-1-fg))] transition-colors" />
                  </Button>
                )}
              </div>

              {filteredRecent && filteredRecent.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <Input
                    value={recentFilter}
                    placeholder={t("AssetDropDownCard:searchPage.placeholder")}
                    onChange={(event) => setRecentFilter(event.target.value)}
                    className={cn(
                      "pl-10 pr-4 py-6 text-foreground placeholder:text-muted-foreground/50",
                      "bg-accent/40 dark:bg-white/[0.05] border-border/80",
                      "focus-visible:ring-2 focus-visible:ring-offset-0",
                      "transition-all duration-200"
                    )}
                  />
                </div>
              ) : null}

              <div className="w-full h-[340px] rounded-xl">
                {filteredRecentSearch && filteredRecentSearch.length > 0 ? (
                  <List
                    rowComponent={AssetRecentRow}
                    rowCount={filteredRecentSearch.length}
                    rowHeight={72}
                    height={340}
                    width="100%"
                    rowProps={recentRowProps}
                    key={`list-recent-${effectiveChain}-${recentFilter}`}
                  />
                ) : filteredRecent && filteredRecent.length && recentFilter ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                        border: `1px solid ${accentColor}20`,
                      }}
                    >
                      <Inbox className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div className="text-muted-foreground text-sm font-medium mb-1">
                      {t("AssetDropDownCard:searchPage.noResults")}
                    </div>
                    <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                      {t("AssetDropDownCard:searchPage.noResultsHint")}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                        border: `1px solid ${accentColor}20`,
                      }}
                    >
                      <Inbox className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div className="text-muted-foreground text-sm font-medium mb-1">
                      {t("AssetDropDownCard:recent.none")}
                    </div>
                    <div className="text-muted-foreground/60 text-xs text-center max-w-[200px]">
                      {t("AssetDropDownCard:recent.noneHint")}
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                onClick={() => setMode(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/70 px-2 py-1 h-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("AssetDropDownCard:mode.back")}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
