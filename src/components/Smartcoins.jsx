import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import { List } from "react-window";
import Fuse from "fuse.js";
import { useStore } from "@nanostores/react";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { User, Coins, Tag, Activity, CircleDollarSign, Gavel } from "lucide-react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

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

import { debounce } from "@/lib/common.js";
import { getFlagBooleans } from "@/lib/common.js";
import { humanReadableFloat } from "@/lib/common.js";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { getObjects } from "@/nanoeffects/src/common";
import { getMaxObjectIDs } from "@/nanoeffects/MaxObjectID.ts";
import { chains } from "@/config/chains";
import { useChainObjectsLive } from "@/hooks/useChainObjectsLive";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";

import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";

// Hoisted memo row: stable identity across parent renders so react-window
// rows don't remount on every keystroke or background live update.
// `row` is a pre-enriched view model (all lookups done once in a memo).
const SmartcoinCard = memo(function SmartcoinCard({ style, row, t }) {
  if (!row) {
    return null;
  }

  return (
    <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} key={`acard-${row.asset_id}`}>
      <div className="ml-2 mr-2 overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-[0_0_20px_-5px] shadow-[color:hsl(var(--accent-1)/0.1)] hover:border-[hsl(var(--accent-1)/0.25)] hover:shadow-[0_0_25px_-5px] shadow-[color:hsl(var(--accent-1)/0.15)] transition-all duration-300">
        <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.4)] to-transparent" />
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight">
              <span className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent">
                {row.offer_symbol}
              </span>
              <span className="ml-2 text-xs font-normal text-muted-foreground/60">
                ({row.asset_id})
              </span>
            </h3>
            {row.price > 0 ? (
              <a href={`/smartcoin.html?id=${row.asset_id}`} className="shrink-0">
                <Button className="h-7 px-3 text-xs bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_10px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0 font-semibold hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:shadow-[0_0_18px_-3px] hover:shadow-[color:hsl(var(--accent-1)/0.6)] active:scale-95 transition-all duration-200 cursor-pointer">
                  {t("Smartcoins:proceedToBorrow", { asset: row.s })}
                </Button>
              </a>
            ) : (
              <Button disabled className="h-7 px-3 text-xs shrink-0">
                {t("Smartcoins:proceedToBorrow", { asset: row.s })}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
            {row.issuerAccount ? (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[hsl(var(--accent-1-fg)/0.7)]" />
                <span>{t("Smartcoins:createdBy")}</span>
                <span className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent font-semibold">{row.issuerAccount}</span>
                <span className="text-xs text-muted-foreground/40">({row.issuerId})</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-[hsl(var(--accent-2-fg)/0.7)]" />
              <span>{t("Smartcoins:collateral")}:</span>
              <span className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent font-semibold">{row.collateral_symbol}</span>
              <span className="text-xs text-muted-foreground/40">({row.collateralId})</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant="outline" className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] text-xs">
              <Tag className="h-3 w-3 mr-1 text-[hsl(var(--accent-1-fg)/0.7)]" />
              MCR {row.mcr}
            </Badge>
            <Badge variant="outline" className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] text-xs">
              <Tag className="h-3 w-3 mr-1 text-[hsl(var(--accent-1-fg)/0.7)]" />
              MSSR {row.mssr}
            </Badge>
            <Badge variant="outline" className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] text-xs">
              <Tag className="h-3 w-3 mr-1 text-[hsl(var(--accent-1-fg)/0.7)]" />
              ICR {row.icr}
            </Badge>
            <Badge variant="outline" className="border-[hsl(var(--accent-2)/0.2)] bg-[hsl(var(--accent-2)/0.05)] text-xs">
              <Activity className="h-3 w-3 mr-1 text-[hsl(var(--accent-2-fg)/0.7)]" />
              {t("Smartcoins:feedQty", { qty: row.feedQty ?? 0 })}
            </Badge>
            {row.permissions && Object.keys(row.permissions).length > 0 ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Badge variant="outline" className="border-[hsl(var(--accent-3)/0.2)] bg-[hsl(var(--accent-3)/0.05)] text-xs cursor-pointer hover:bg-[hsl(var(--accent-3)/0.1)] transition-colors">
                    {t("Common:permissions")}: {Object.keys(row.permissions).length}
                    <QuestionMarkCircledIcon className="ml-1 h-3 w-3" />
                  </Badge>
                </DialogTrigger>
                <DialogContent className="bg-card">
                  <DialogHeader>
                    <DialogTitle>{t("Common:permissions")}</DialogTitle>
                    <DialogDescription className="text-foreground">
                      {Object.keys(row.permissions).join(", ")}
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            ) : (
              <Badge variant="outline" className="border-[hsl(var(--accent-3)/0.2)] bg-[hsl(var(--accent-3)/0.05)] text-xs">
                {t("Common:permissions")}: 0
              </Badge>
            )}
            {row.flags && Object.keys(row.flags).length > 0 ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Badge variant="outline" className="border-[hsl(var(--accent-warning)/0.2)] bg-[hsl(var(--accent-warning)/0.05)] text-xs cursor-pointer hover:bg-[hsl(var(--accent-warning)/0.1)] transition-colors">
                    {t("Common:flags")}: {Object.keys(row.flags).length}
                    <QuestionMarkCircledIcon className="ml-1 h-3 w-3" />
                  </Badge>
                </DialogTrigger>
                <DialogContent className="bg-card">
                  <DialogHeader>
                    <DialogTitle>{t("Common:flags")}</DialogTitle>
                    <DialogDescription className="text-foreground">
                      {Object.keys(row.flags).join(", ")}
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            ) : (
              <Badge variant="outline" className="border-[hsl(var(--accent-warning)/0.2)] bg-[hsl(var(--accent-warning)/0.05)] text-xs">
                {t("Common:flags")}: 0
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const BitassetRow = memo(function BitassetRow({ index, style, rows, t }) {
  return <SmartcoinCard index={index} style={style} row={rows[index]} t={t} />;
});

export default function Smartcoins(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNodeUrl = useStore($currentNodeUrl);

  const {
    _bitassetsBTS,
    _bitassetsTEST,
    _assetsBTS,
    _assetsTEST,
    _issuersBTS,
    _issuersTEST,
  } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  // Build-time snapshot seed: renders instantly, no chain round trips.
  const snapshotBitassets = useMemo(() => {
    if (_chain && (_bitassetsBTS || _bitassetsTEST)) {
      return _chain === "bitshares" ? (_bitassetsBTS ?? []) : (_bitassetsTEST ?? []);
    }
    return [];
  }, [_bitassetsBTS, _bitassetsTEST, _chain]);

  const baseAssetData = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? (_assetsBTS ?? []) : (_assetsTEST ?? []);
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const assetIssuers = useMemo(() => {
    if (_chain && (_issuersBTS || _issuersTEST)) {
      return _chain === "bitshares" ? (_issuersBTS ?? []) : (_issuersTEST ?? []);
    }
    return [];
  }, [_issuersBTS, _issuersTEST, _chain]);

  // Records fetched live in the background (newcomer bitassets past the
  // snapshot max, plus their asset/issuer records and display refreshes).
  // Keyed by object id; snapshot is the base, these win on merge.
  const [extraBitassets, setExtraBitassets] = useState([]);
  const [liveAssets, setLiveAssets] = useState({});
  const [liveIssuers, setLiveIssuers] = useState({});
  const [discoveryDone, setDiscoveryDone] = useState(false);
  // Ids already fetched live (reset per chain) so background refetches
  // never repeat work when the active set shifts.
  const fetchedAssetRef = useRef(new Set());
  const fetchedIssuerRef = useRef(new Set());

  const normalizeLiveAsset = (o) => ({
    id: o.id,
    symbol: o.symbol,
    precision: o.precision,
    issuer: o.issuer,
    options: {
      flags: o.options.flags,
      issuer_permissions: o.options.issuer_permissions,
    },
  });

  // Newcomer discovery: bitassets created after the snapshot build are
  // invisible to both the snapshot and the id-based live overlay, so check
  // the chain max id once per mount and backfill the missing range plus any
  // asset/issuer records the trimmed snapshot doesn't carry.
  useEffect(() => {
    setExtraBitassets([]);
    setLiveAssets({});
    setLiveIssuers({});
    setDiscoveryDone(false);
    fetchedAssetRef.current = new Set();
    fetchedIssuerRef.current = new Set();
    if (!_chain || !snapshotBitassets.length) {
      setDiscoveryDone(true);
      return;
    }
    let cancelled = false;
    const nodeUrl = currentNodeUrl || null;
    async function discovering() {
      try {
        const snapMax = snapshotBitassets.reduce(
          (m, x) => Math.max(m, parseInt(x.id.split(".")[2])),
          -1
        );
        const maxId = await getMaxObjectIDs(_chain, 2, 4, nodeUrl);
        if (cancelled) {
          return;
        }
        if (!maxId || maxId <= snapMax) {
          return;
        }
        const missingIds = [];
        for (let i = snapMax + 1; i <= maxId; i++) {
          missingIds.push(`2.4.${i}`);
        }
        const objs = await getObjects(_chain, missingIds, nodeUrl);
        if (cancelled || !Array.isArray(objs)) {
          return;
        }
        const newcomers = objs.filter((o) => o && o.id);
        if (newcomers.length) {
          setExtraBitassets(newcomers);
        }
        const knownAssets = new Set(baseAssetData.map((a) => a.id));
        const unknownAssetIds = [
          ...new Set(
            newcomers
              .flatMap((x) => [x.asset_id, x.options?.short_backing_asset])
              .filter((id) => id && !knownAssets.has(id))
          ),
        ];
        if (unknownAssetIds.length) {
          const assetObjs = await getObjects(_chain, unknownAssetIds, nodeUrl);
          if (cancelled || !Array.isArray(assetObjs)) {
            return;
          }
          const aMap = {};
          const issuerIds = new Set();
          for (const o of assetObjs) {
            if (o && o.id && o.options) {
              aMap[o.id] = normalizeLiveAsset(o);
              fetchedAssetRef.current.add(o.id);
              if (o.issuer) {
                issuerIds.add(o.issuer);
              }
            }
          }
          if (Object.keys(aMap).length) {
            setLiveAssets((prev) => ({ ...prev, ...aMap }));
          }
          const knownIssuers = new Set(assetIssuers.map((x) => x.id));
          const unknownIssuerIds = [...issuerIds].filter(
            (id) => !knownIssuers.has(id)
          );
          if (unknownIssuerIds.length) {
            const issuerObjs = await getObjects(
              _chain,
              unknownIssuerIds,
              nodeUrl
            );
            if (cancelled || !Array.isArray(issuerObjs)) {
              return;
            }
            const iMap = {};
            for (const o of issuerObjs) {
              if (o && o.id) {
                iMap[o.id] = { id: o.id, name: o.name };
                fetchedIssuerRef.current.add(o.id);
              }
            }
            if (Object.keys(iMap).length) {
              setLiveIssuers((prev) => ({ ...prev, ...iMap }));
            }
          }
        }
      } catch (e) {
        console.log("Smartcoins newcomer discovery error", e);
      } finally {
        if (!cancelled) {
          setDiscoveryDone(true);
        }
      }
    }
    discovering();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_chain, currentNodeUrl, snapshotBitassets]);

  // Live bitasset overlay: global-settlement filtering must run on live data,
  // so live objects win over the snapshot once they arrive. Before that the
  // snapshot renders as-is (instant first paint).
  // Mainnet uses the shared ChainStore subscription; testnet (where node
  // subscriptions are disallowed) does a single background refresh instead
  // of polling, so list traffic stays one-shot on both chains.
  const isTestnet = Boolean(chains[_chain]?.testnet);
  // Snapshot ids plus any discovered newcomers (deduped); the live overlay
  // tracks this full set so filtering stays correct for new bitassets too.
  const bitassetIds = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const x of snapshotBitassets) {
      if (!seen.has(x.id)) {
        seen.add(x.id);
        out.push(x.id);
      }
    }
    for (const x of extraBitassets) {
      if (x && x.id && !seen.has(x.id)) {
        seen.add(x.id);
        out.push(x.id);
      }
    }
    return out;
  }, [snapshotBitassets, extraBitassets]);
  const liveMainnetBitassets = useChainObjectsLive({
    chain: _chain,
    ids: bitassetIds,
    enabled: Boolean(!isTestnet && _chain && bitassetIds.length > 0),
    specificNode: currentNodeUrl || null,
  });

  const [testnetBitassets, setTestnetBitassets] = useState(null);
  useEffect(() => {
    if (!discoveryDone) {
      setTestnetBitassets(null);
      return;
    }
    if (!isTestnet || !_chain || !bitassetIds.length) {
      setTestnetBitassets(null);
      return;
    }
    let cancelled = false;
    async function fetching() {
      try {
        const objs = await getObjects(
          _chain,
          bitassetIds,
          currentNodeUrl || null
        );
        if (cancelled || !Array.isArray(objs)) {
          return;
        }
        const map = {};
        for (const o of objs) {
          if (o && o.id) {
            map[o.id] = o;
          }
        }
        setTestnetBitassets(map);
      } catch (e) {
        console.log("Smartcoins testnet bitasset refresh error", e);
      }
    }
    fetching();
    return () => {
      cancelled = true;
    };
  }, [discoveryDone, isTestnet, _chain, bitassetIds, currentNodeUrl]);

  const liveBitassetMap = isTestnet
    ? testnetBitassets
    : liveMainnetBitassets.objects;

  // Snapshot plus discovered newcomers (deduped by id); live objects
  // overlay on top of this combined base in the merge below.
  const allBitassets = useMemo(() => {
    if (!extraBitassets.length) {
      return snapshotBitassets;
    }
    const seen = new Set(snapshotBitassets.map((x) => x.id));
    const out = [...snapshotBitassets];
    for (const x of extraBitassets) {
      if (x && x.id && !seen.has(x.id)) {
        seen.add(x.id);
        out.push(x);
      }
    }
    return out;
  }, [snapshotBitassets, extraBitassets]);

  // Merge live over snapshot. Identity-stable: returns the previous array
  // unless an entry actually changed, so per-block ChainStore notifies that
  // don't touch our objects don't cascade into re-renders.
  const prevMergedRef = useRef([]);
  const mergedBitassets = useMemo(() => {
    const prev = prevMergedRef.current;
    const prevById = new Map();
    for (const e of prev) {
      prevById.set(e.id, e);
    }
    let changed = prev.length !== allBitassets.length;
    const next = new Array(allBitassets.length);
    for (let i = 0; i < allBitassets.length; i++) {
      const s = allBitassets[i];
      const entry = (liveBitassetMap && liveBitassetMap[s.id]) || s;
      if (!changed && prevById.get(s.id) !== entry) {
        changed = true;
      }
      next[i] = entry;
    }
    if (!changed) {
      return prev;
    }
    prevMergedRef.current = next;
    return next;
  }, [allBitassets, liveBitassetMap]);

  // Valid-feed + not-globally-settled filter, on merged (live-preferred) data.
  // Handles both the trimmed snapshot shape (feedsCount) and full live objects.
  const activeBitassets = useMemo(() => {
    if (!mergedBitassets) {
      return [];
    }
    return mergedBitassets.filter((x) => {
      const feedCount = x.feeds ? x.feeds.length : (x.feedsCount ?? 0);
      return (
        parseInt(x.current_feed.settlement_price.base.amount) !== 0 &&
        parseInt(x.current_feed.settlement_price.quote.amount) !== 0 &&
        feedCount &&
        (parseInt(x.settlement_price.base.amount) === 0 ||
          parseInt(x.settlement_price.quote.amount) === 0 ||
          parseInt(x.settlement_fund) === 0)
      );
    });
  }, [mergedBitassets]);

  // Display-asset config refresh: one background pass over the active set's
  // debt + collateral records so flag/permission/symbol changes since the
  // snapshot build are picked up (the ~60 displayed cards are mount-fresh,
  // not solely cached). Deltas only: fetchedAssetRef/fetchedIssuerRef (reset
  // per chain) guarantee each id is fetched at most once per mount, so live
  // settlement shifts that reshape the active set never refetch.
  const activeAssetSig = useMemo(() => {
    const s = new Set();
    if (activeBitassets) {
      for (const b of activeBitassets) {
        if (b.asset_id) {
          s.add(b.asset_id);
        }
        if (b.options && b.options.short_backing_asset) {
          s.add(b.options.short_backing_asset);
        }
      }
    }
    return [...s].sort().join(",");
  }, [activeBitassets]);

  useEffect(() => {
    if (!discoveryDone || !_chain || !activeAssetSig) {
      return;
    }
    const ids = activeAssetSig.split(",");
    const missingAssets = ids.filter((id) => !fetchedAssetRef.current.has(id));
    if (!missingAssets.length) {
      return;
    }
    missingAssets.forEach((id) => fetchedAssetRef.current.add(id));
    let cancelled = false;
    const nodeUrl = currentNodeUrl || null;
    const snapIssuerIds = new Set(assetIssuers.map((x) => x.id));
    (async () => {
      try {
        const objs = await getObjects(_chain, missingAssets, nodeUrl);
        if (cancelled || !Array.isArray(objs)) {
          return;
        }
        const aMap = {};
        const issuerIds = [];
        for (const o of objs) {
          if (o && o.id && o.options) {
            aMap[o.id] = normalizeLiveAsset(o);
            if (
              o.issuer &&
              !snapIssuerIds.has(o.issuer) &&
              !fetchedIssuerRef.current.has(o.issuer)
            ) {
              fetchedIssuerRef.current.add(o.issuer);
              issuerIds.push(o.issuer);
            }
          }
        }
        if (Object.keys(aMap).length) {
          setLiveAssets((prev) => ({ ...prev, ...aMap }));
        }
        if (issuerIds.length) {
          const issuerObjs = await getObjects(_chain, issuerIds, nodeUrl);
          if (cancelled || !Array.isArray(issuerObjs)) {
            return;
          }
          const iMap = {};
          for (const o of issuerObjs) {
            if (o && o.id) {
              iMap[o.id] = { id: o.id, name: o.name };
            }
          }
          if (Object.keys(iMap).length) {
            setLiveIssuers((prev) => ({ ...prev, ...iMap }));
          }
        }
      } catch (e) {
        console.log("Smartcoins display refresh error", e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoveryDone, activeAssetSig, _chain, currentNodeUrl]);

  // O(1) lookups shared by enrichment + compatibility checks.
  // Live records (discovery extras, display refreshes) win over the snapshot.
  const assetById = useMemo(() => {
    const m = new Map();
    if (baseAssetData) {
      for (const a of baseAssetData) {
        m.set(a.id, a);
      }
    }
    for (const id of Object.keys(liveAssets)) {
      m.set(id, liveAssets[id]);
    }
    return m;
  }, [baseAssetData, liveAssets]);

  const issuerById = useMemo(() => {
    const m = new Map();
    if (assetIssuers) {
      for (const issuer of assetIssuers) {
        m.set(issuer.id, issuer);
      }
    }
    for (const id of Object.keys(liveIssuers)) {
      m.set(id, liveIssuers[id]);
    }
    return m;
  }, [assetIssuers, liveIssuers]);

  // Single enrichment pass: every per-row lookup + derived value computed once.
  const enrichedAll = useMemo(() => {
    if (!activeBitassets) {
      return [];
    }
    const out = [];
    for (const bitasset of activeBitassets) {
      const thisBitassetData = assetById.get(bitasset.asset_id);
      const thisCollateralAssetData = assetById.get(
        bitasset.options.short_backing_asset
      );
      const issuer = thisBitassetData
        ? issuerById.get(thisBitassetData.issuer)
        : undefined;

      if (!thisBitassetData || !thisCollateralAssetData || !issuer) {
        continue;
      }

      const feedQty = bitasset.feeds
        ? bitasset.feeds.length
        : (bitasset.feedsCount ?? 0);

      const _price = parseFloat(
        (
          humanReadableFloat(
            parseInt(bitasset.current_feed.settlement_price.quote.amount),
            thisCollateralAssetData.precision
          ) /
          humanReadableFloat(
            parseInt(bitasset.current_feed.settlement_price.base.amount),
            thisBitassetData.precision
          )
        ).toFixed(thisCollateralAssetData.precision)
      );

      // Unborrowable rows never reach the list: a zero price means the feed
      // ratio underflowed display precision (or is NaN), and the borrow math
      // downstream cannot work with it. Live-backed, so rows reappear if a
      // feed recovers.
      if (!(_price > 0)) {
        continue;
      }

      out.push({
        key: bitasset.id,
        asset_id: bitasset.asset_id,
        assetNum: parseInt(bitasset.asset_id.replace("1.3.", "")),
        offer_symbol: thisBitassetData.symbol,
        collateral_symbol: thisCollateralAssetData.symbol,
        collateralId: thisCollateralAssetData.id,
        issuerAccount: issuer.name,
        issuerId: issuer.id,
        price: _price,
        mcr: bitasset.current_feed.maintenance_collateral_ratio / 10,
        mssr: bitasset.current_feed.maximum_short_squeeze_ratio / 10,
        icr: bitasset.current_feed.initial_collateral_ratio / 10,
        feedQty,
        permissions: getFlagBooleans(
          thisBitassetData.options.issuer_permissions
        ),
        flags: getFlagBooleans(thisBitassetData.options.flags),
        bitasset_data_id: bitasset.bitasset_data_id,
      });
    }
    return out;
  }, [activeBitassets, assetById, issuerById]);

  // Live user balances (user-specific, can't be snapshotted).
  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    if (!(usr && usr.id)) {
      setUsrBalances(undefined);
      return;
    }
    let cancelled = false;
    let unsubscribe;
    async function fetching() {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNodeUrl || "",
      ]);
      unsubscribe = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (cancelled) {
          return;
        }
        if (data && !error && !loading) {
          setUsrBalances(data);
        }
      });
    }
    fetching();
    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch {}
      }
    };
  }, [usr, currentNodeUrl]);

  const balanceByAssetId = useMemo(() => {
    const m = new Map();
    if (usrBalances) {
      for (const b of usrBalances) {
        m.set(b.asset_id, b);
      }
    }
    return m;
  }, [usrBalances]);

  const compatibleSmartcoins = useMemo(() => {
    if (usrBalances && enrichedAll) {
      const _smartcoins = enrichedAll.filter((row) => {
        const collateralAssetBalance = balanceByAssetId.get(row.collateralId);

        return !collateralAssetBalance ||
          (collateralAssetBalance && !collateralAssetBalance.amount > 0)
          ? false
          : true;
      });

      return _smartcoins;
    }
  }, [usrBalances, enrichedAll, balanceByAssetId]);

  const heldSmartcoins = useMemo(() => {
    if (usrBalances && enrichedAll) {
      const _smartcoins = enrichedAll.filter((row) => {
        const debtAssetBalance = balanceByAssetId.get(row.asset_id);

        return debtAssetBalance ? true : false;
      });

      return _smartcoins;
    }
  }, [usrBalances, enrichedAll, balanceByAssetId]);

  const [activeTab, setActiveTab] = useState("all");
  const [activeSearch, setActiveSearch] = useState("borrow");
  const [mode, setMode] = useState("bitassets");

  const assetSearch = useMemo(() => {
    if (!enrichedAll || !enrichedAll.length) {
      return;
    }

    let keys;
    if (activeSearch === "borrow") {
      keys = ["offer_symbol", "asset_id"];
    } else if (activeSearch === "collateral") {
      keys = ["collateral_symbol", "collateral"];
    } else if (activeSearch === "issuer") {
      keys = ["issuerAccount"];
    }

    return new Fuse(enrichedAll, {
      includeScore: true,
      threshold: 0.2,
      keys: keys,
    });
  }, [enrichedAll, activeSearch]);

  const [thisInput, setThisInput] = useState();
  const [thisSearchInput, setThisSearchInput] = useState();
  const [thisResult, setThisResult] = useState();

  useEffect(() => {
    if (assetSearch && thisInput) {
      const result = assetSearch.search(thisInput);
      setThisResult(result);
    }
  }, [assetSearch, thisInput]);

  const debouncedSetSearchInput = useCallback(
    // Throttle slider
    debounce((event) => {
      setThisInput(event.target.value);
      window.history.replaceState(
        {},
        "",
        `?tab=search&searchTab=${activeSearch}&searchText=${event.target.value}`
      );
    }, 500),
    [activeSearch]
  );

  const relevantBitassetData = useMemo(() => {
    if (!enrichedAll || !enrichedAll.length) {
      return [];
    }

    let result = [];
    if (enrichedAll && activeTab === "all") {
      result = enrichedAll.filter((x) => x.feedQty > 0);
    } else if (compatibleSmartcoins && activeTab === "compatible") {
      result = compatibleSmartcoins.filter((x) => x.feedQty > 0);
    } else if (heldSmartcoins && activeTab === "holdings") {
      result = heldSmartcoins.filter((x) => x.feedQty > 0);
    } else {
      result = enrichedAll;
    }

    result = [...result].sort((a, b) => b.assetNum - a.assetNum);
    result = result.filter((x) => {
      if (x.bitasset_data_id) {
        const desc = "";
        if (desc.includes("condition") && desc.includes("expiry")) {
          return false;
        }
      }
      return true;
    });

    return result;
  }, [
    enrichedAll,
    compatibleSmartcoins,
    heldSmartcoins,
    activeTab,
  ]);

  // Mode filter needs the issuer name per row; view models carry it, so this
  // stays a cheap pass with identical semantics (committee / honest / private).
  const modeFilteredBitassetData = useMemo(() => {
    if (!relevantBitassetData) {
      return [];
    }
    return relevantBitassetData.filter((x) => {
      if (mode === "bitassets") {
        return x.issuerAccount === "committee-account";
      } else if (mode === "honest") {
        return x.issuerAccount === "honest-quorum";
      } else if (mode === "privateSmartcoins") {
        return (
          x.issuerAccount !== "committee-account" &&
          x.issuerAccount !== "honest-quorum"
        );
      }
      return true;
    });
  }, [relevantBitassetData, mode]);

  const searchRows = useMemo(() => {
    if (!thisResult) {
      return [];
    }
    return thisResult.map((r) => r.item);
  }, [thisResult]);

  const bitassetRowProps = useMemo(
    () => ({ rows: modeFilteredBitassetData, t }),
    [modeFilteredBitassetData, t]
  );

  const searchRowProps = useMemo(
    () => ({ rows: searchRows, t }),
    [searchRows, t]
  );

  useEffect(() => {
    if (assetSearch) {
      //console.log("Parsing url params");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());

      if (params && params.tab) {
        if (!["all", "compatible", "holdings", "search"].includes(params.tab)) {
          return;
        }
        setActiveTab(params.tab);
      } else {
        window.history.replaceState({}, "", `?tab=all`);
      }
      if (params && params.searchTab) {
        if (!["borrow", "collateral", "issuer"].includes(params.searchTab)) {
          return;
        }
        setActiveSearch(params.searchTab);
      }
      if (params && params.searchText) {
        const isValid = (str) => /^[a-zA-Z0-9.-]+$/.test(str);
        if (!isValid(params.searchText)) {
          return;
        }
        setThisInput(params.searchText);
      }
    }
  }, [assetSearch]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4">
        <div className="grid grid-cols-1 gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_0_40px_-8px] shadow-[color:hsl(var(--accent-1)/0.2)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
            <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
            <div className="pointer-events-none absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-gradFg))] dark:text-[hsl(var(--accent-1-gradFg))]">
                  <CircleDollarSign className="h-4.5 w-4.5" strokeWidth={2.25} />
                </span>
                <div>
                  <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent">
                    {t("Smartcoins:selectBorrowableAsset")}
                  </h2>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {t("Smartcoins:smartcoinDescription")}
                  </p>
                </div>
              </div>
              <div className="w-full">
                <div className="grid w-full grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                  <Button
                    className={activeTab === "all" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}
                    variant={activeTab === "all" ? undefined : "outline"}
                    onClick={() => {
                      if (activeTab !== "all") {
                        setActiveTab("all");
                        window.history.replaceState({}, "", `?tab=all`);
                      }
                    }}
                  >
                    {activeTab === "all"
                      ? t("Smartcoins:viewingAllAssets")
                      : t("Smartcoins:viewAllAssets")}
                  </Button>
                  <Button
                    className={activeTab === "compatible" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}
                    variant={activeTab === "compatible" ? undefined : "outline"}
                    onClick={() => {
                      if (activeTab !== "compatible") {
                        setActiveTab("compatible");
                        window.history.replaceState({}, "", `?tab=compatible`);
                      }
                    }}
                  >
                    {activeTab === "compatible"
                      ? t("Smartcoins:viewingCompatible")
                      : t("Smartcoins:viewCompatible")}
                  </Button>
                  <Button
                    className={activeTab === "holdings" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}
                    variant={activeTab === "holdings" ? undefined : "outline"}
                    onClick={() => {
                      if (activeTab !== "holdings") {
                        setActiveTab("holdings");
                        window.history.replaceState({}, "", `?tab=holdings`);
                      }
                    }}
                  >
                    {activeTab === "holdings"
                      ? t("Smartcoins:viewingHoldings")
                      : t("Smartcoins:viewHoldings")}
                  </Button>
                  <Button
                    className={activeTab === "search" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}
                    variant={activeTab === "search" ? undefined : "outline"}
                    onClick={() => {
                      if (activeTab !== "search") {
                        setActiveTab("search");
                        window.history.replaceState(
                          {},
                          "",
                          `?tab=search&searchTab=borrow`
                        );
                      }
                    }}
                  >
                    {activeTab === "search"
                      ? t("Smartcoins:searching")
                      : t("Smartcoins:search")}
                  </Button>
                </div>

                <div className="my-4 mb-3 mt-1 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.5)] to-transparent" />

                {activeTab === "all" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-5">
                      <Button
                        onClick={() => {
                          setMode("bitassets");
                        }}
                        variant={`${mode === "bitassets" ? "" : "outline"}`}
                        className={`h-6 md:mb-3 md:ml-2 ${mode === "bitassets" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:bitassets")}
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("honest");
                        }}
                        variant={`${mode === "honest" ? "" : "outline"}`}
                        className={`h-6 md:mb-3 md:ml-2 ${mode === "honest" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        Honest™️ Smartcoins
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("privateSmartcoins");
                        }}
                        variant={`${
                          mode === "privateSmartcoins" ? "" : "outline"
                        }`}
                        className={`h-6 md:mb-3 md:mr-2 ${mode === "privateSmartcoins" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:privateSmartcoins")}
                      </Button>
                    </div>
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:listingAllSmartcoins", {
                        count: modeFilteredBitassetData.length,
                      })}
                    </h5>
                    {!assetIssuers || !assetIssuers.length ? (
                      <div className="text-center mt-5">
                        {t("CreditBorrow:common.loading")}
                      </div>
                    ) : (
                      <div className="w-full max-h-[600px] overflow-auto">
                        <div className="hidden md:block">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={modeFilteredBitassetData.length}
                            rowHeight={152}
                            rowProps={bitassetRowProps} height={600} width="100%" />
                        </div>
                        <div className="block md:hidden">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={modeFilteredBitassetData.length}
                            rowHeight={165}
                            rowProps={bitassetRowProps} height={600} width="100%" />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeTab === "compatible" && (
                  <>
                    <div className="grid grid-cols-3 gap-5">
                      <Button
                        onClick={() => {
                          setMode("bitassets");
                        }}
                        variant={`${mode === "bitassets" ? "" : "outline"}`}
                        className={`h-6 mb-3 ml-2 ${mode === "bitassets" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:bitassets")}
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("honest");
                        }}
                        variant={`${mode === "honest" ? "" : "outline"}`}
                        className={`h-6 mb-3 ml-2 ${mode === "honest" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        Honest™️ Smartcoins
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("privateSmartcoins");
                        }}
                        variant={`${
                          mode === "privateSmartcoins" ? "" : "outline"
                        }`}
                        className={`h-6 mb-3 mr-2 ${mode === "privateSmartcoins" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:privateSmartcoins")}
                      </Button>
                    </div>
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:listingCompatibleSmartcoins", {
                        count: modeFilteredBitassetData.length,
                      })}
                    </h5>
                    {!assetIssuers || !assetIssuers.length ? (
                      <div className="text-center mt-5">
                        {t("CreditBorrow:common.loading")}
                      </div>
                    ) : (
                      <div className="w-full max-h-[600px] overflow-auto">
                        <div className="hidden md:block">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={modeFilteredBitassetData.length}
                            rowHeight={152}
                            rowProps={bitassetRowProps} height={600} width="100%" />
                        </div>
                        <div className="block md:hidden">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={modeFilteredBitassetData.length}
                            rowHeight={165}
                            rowProps={bitassetRowProps} height={600} width="100%" />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeTab === "holdings" && (
                  <>
                    <div className="grid grid-cols-3 gap-5">
                      <Button
                        onClick={() => {
                          setMode("bitassets");
                        }}
                        variant={`${mode === "bitassets" ? "" : "outline"}`}
                        className={`h-6 mb-3 ml-2 ${mode === "bitassets" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:bitassets")}
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("honest");
                        }}
                        variant={`${mode === "honest" ? "" : "outline"}`}
                        className={`h-6 mb-3 ml-2 ${mode === "honest" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        Honest™️ Smartcoins
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("privateSmartcoins");
                        }}
                        variant={`${
                          mode === "privateSmartcoins" ? "" : "outline"
                        }`}
                        className={`h-6 mb-3 mr-2 ${mode === "privateSmartcoins" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:privateSmartcoins")}
                      </Button>
                    </div>
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:listingHeldSmartcoins", {
                        count: modeFilteredBitassetData
                          ? modeFilteredBitassetData.length
                          : 0,
                      })}
                    </h5>
                    {!assetIssuers || !assetIssuers.length ? (
                      <div className="text-center mt-5">
                        {t("CreditBorrow:common.loading")}
                      </div>
                    ) : (
                      <div className="w-full max-h-[600px] overflow-auto">
                        <div className="hidden md:block">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={
                              modeFilteredBitassetData
                                ? modeFilteredBitassetData.length
                                : 0
                            }
                            rowHeight={152}
                            rowProps={bitassetRowProps} height={600} width="100%" />
                        </div>
                        <div className="block md:hidden">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={
                              modeFilteredBitassetData
                                ? modeFilteredBitassetData.length
                                : 0
                            }
                            rowHeight={165}
                            rowProps={bitassetRowProps} height={600} width="100%" />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeTab === "search" && (
                  <>
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:howToSearch")}
                    </h5>{" "}
                    <div className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        className={activeSearch === "borrow" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0 h-6" : "h-6"}
                        variant={
                          activeSearch === "borrow" ? undefined : "outline"
                        }
                        onClick={() => {
                          if (activeSearch !== "borrow") {
                            setActiveSearch("borrow");
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=search&searchTab=borrow`
                            );
                          }
                        }}
                      >
                        {activeSearch === "borrow"
                          ? t("Smartcoins:searchingByBorrowable")
                          : t("Smartcoins:searchByBorrowable")}
                      </Button>
                      <Button
                        className={activeSearch === "collateral" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0 h-6" : "h-6"}
                        variant={
                          activeSearch === "collateral" ? undefined : "outline"
                        }
                        onClick={() => {
                          if (activeSearch !== "collateral") {
                            setActiveSearch("collateral");
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=search&searchTab=collateral`
                            );
                          }
                        }}
                      >
                        {activeSearch === "collateral"
                          ? t("Smartcoins:searchingByCollateral")
                          : t("Smartcoins:searchByCollateral")}
                      </Button>
                      <Button
                        className={activeSearch === "issuer" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0 h-6" : "h-6"}
                        variant={
                          activeSearch === "issuer" ? undefined : "outline"
                        }
                        onClick={() => {
                          if (activeSearch !== "issuer") {
                            setActiveSearch("issuer");
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=search&searchTab=issuer`
                            );
                          }
                        }}
                      >
                        {activeSearch === "issuer"
                          ? t("Smartcoins:searchingByIssuer")
                          : t("Smartcoins:searchByIssuer")}
                      </Button>
                    </div>
                    <Input
                      name="searchInput"
                      placeholder={
                        thisSearchInput ?? t("Smartcoins:enterSearchText")
                      }
                      className="mb-3 mt-3 w-full border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                      value={thisSearchInput || ""}
                      onChange={(event) => {
                        setThisSearchInput(event.target.value);
                        debouncedSetSearchInput(event);
                      }}
                    />
                    {["borrow", "collateral", "issuer"].includes(
                      activeSearch
                    ) && (
                      <>
                        {thisResult && thisResult.length ? (
                          <div className="w-full max-h-[600px] overflow-auto">
                            <div className="hidden md:block">
                              <List
                                rowComponent={BitassetRow}
                                rowCount={searchRows.length}
                                rowHeight={152}
                                rowProps={searchRowProps} height={600} width="100%" />
                            </div>
                            <div className="block md:hidden">
                              <List
                                rowComponent={BitassetRow}
                                rowCount={searchRows.length}
                                rowHeight={165}
                                rowProps={searchRowProps} height={600} width="100%" />
                            </div>
                          </div>
                        ) : null}
                        {thisInput && thisResult && !thisResult.length ? (
                          <>{t("Smartcoins:noResultsFound")}</>
                        ) : null}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 mt-5">
        <div className="mx-auto w-full max-w-2xl">
          <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.5)] to-transparent" />
            <div className="relative p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-gradFg))] dark:text-[hsl(var(--accent-1-gradFg))]">
                  <Gavel className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    {t("Smartcoins:settlementPointerTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {t("Smartcoins:settlementPointerBody")}
                  </p>
                </div>
                <a href="/settlement_bids.html" className="shrink-0">
                  <Button variant="outline" className="h-8 px-3 text-xs border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] transition-colors">
                    {t("Smartcoins:settlementPointerCTA")}
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DexLiveFooterCard
        lastFetchAt={liveMainnetBitassets.lastFetchAt}
        isSubscribed={liveMainnetBitassets.isSubscribed}
        blockNumber={liveMainnetBitassets.blockNumber}
        nodeUrl={currentNodeUrl || null}
        warningThresholdSec={10}
        chain={_chain} />
    </>
  );
}
