import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
  memo,
} from "react";
import { List } from "react-window";

const CreditBorrowCommonRow = memo(function CreditBorrowCommonRow({ style, res, foundAsset, assets, balanceAssetIDs, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen }) {
  return (
    <div style={{ ...style }} key={`acard-${res.id}`}>
      <Card className="mx-2 mb-2 rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.03)] hover:shadow-md hover:shadow-[color:hsl(var(--accent-1)/0.05)] transition-all">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] flex-shrink-0">
                <HandCoins className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {t("CreditBorrow:common.offer")} #{res.id.replace("1.21.", "")}
                </h3>
                <Badge variant="outline" className="gap-1.5 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer">
                        <Avatar size={16} name={res.owner_name} extra="offer-owner" expression={{ eye: "normal", mouth: "smile" }} />
                        <span className="whitespace-nowrap">{res.owner_name}</span>
                        <span className="text-muted-foreground/50 text-[10px] flex-shrink-0">({res.owner_account})</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem
                        onClick={() => {
                          const chain = usr?.chain ?? "bitshares";
                          const isFav = favouriteUsers.some((u) => u.id === res.owner_account);
                          if (isFav) { removeFavouriteUser(chain, { name: res.owner_name, id: res.owner_account }); } else { addFavouriteUser(chain, { name: res.owner_name, id: res.owner_account }); }
                        }}
                      >
                        {favouriteUsers.some((u) => u.id === res.owner_account) ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                        {favouriteUsers.some((u) => u.id === res.owner_account) ? t("Blocklist:unfavouriteAccount") : t("Blocklist:favouriteAccount")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (chainUserBlockList.some((u) => u.id === res.owner_account)) return;
                          setBlockTarget({ name: res.owner_name, id: res.owner_account });
                          setBlockConfirmOpen(true);
                        }}
                        disabled={chainUserBlockList.some((u) => u.id === res.owner_account)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {chainUserBlockList.some((u) => u.id === res.owner_account) ? t("Blocklist:alreadyBlocked") : t("Blocklist:blockAccount")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Badge>
              </div>
            </div>
            <Badge variant="outline" className="gap-1 text-[10px] border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] flex-shrink-0">
              <Clock className="h-3 w-3" />
              {hoursTillExpiration(res.auto_disable_time)}h
            </Badge>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/40 p-3 mb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">{t("CreditBorrow:common.offering")}</div>
                  <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))] font-semibold">{humanReadableFloat(res.current_balance, foundAsset.precision)} {foundAsset.symbol}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">{t("CreditBorrow:common.fee", { fee: "" })}</div>
                  <div className="font-mono text-xs tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">{(res.fee_rate / 10000).toFixed(2)}%</div>
                </div>
              </div>
              <div className="grid grid-cols-1">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">{t("CreditBorrow:common.accepting")}</div>
                <div className="font-mono text-sm tabular-nums text-foreground/85">
                  {assets && assets.length ? res.acceptable_collateral.map((asset) => asset[0]).map((x) => assets.find((y) => y.id === x)?.symbol).filter((x) => x).map((x, idx, arr) => { const a = assets.find((y) => y.symbol === x); const hasBal = a && balanceAssetIDs && balanceAssetIDs.includes(a.id); return (<span key={`${x}-${idx}`} className={cn("inline", hasBal ? "font-semibold text-foreground" : "text-muted-foreground/60")}>{x}{idx < arr.length - 1 ? ", " : ""}</span>); }) : t("CreditBorrow:common.loading")}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5"><div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">{t("CreditBorrow:common.repayPeriod", { repayPeriod: "" })}</div><div className="font-mono text-xs tabular-nums text-foreground/85">{(res.max_duration_seconds / 60 / 60).toFixed(res.max_duration_seconds / 60 / 60 < 1 ? 2 : 0)}h</div></div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5"><div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">{t("CreditBorrow:common.min", { amount: "", asset: "" })}</div><div className="font-mono text-xs tabular-nums text-foreground/85">{humanReadableFloat(res.min_deal_amount, foundAsset.precision)} {foundAsset.symbol}</div></div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5"><div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">{t("CreditBorrow:common.validity", { validity: "" })}</div><div className="font-mono text-xs tabular-nums text-foreground/85">{hoursTillExpiration(res.auto_disable_time)}h</div></div>
          </div>
          <div className="flex items-center gap-2"><a href={`/offer.html?id=${res.id}`} className="flex-1"><Button className="w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] transition-all">{t("CreditBorrow:common.proceed", { offerID: res.id.replace("1.21.", "") })}<ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Button></a><a href={`/lend.html?id=${res.id}`}><Button variant="outline" className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]">{t(`CreditBorrow:common.${usr.id === res.owner_account ? "edit" : "view"}`, { offerID: res.id.replace("1.21.", "") })}</Button></a></div>
        </div>
      </Card>
    </div>
  );
});

const CreditBorrowBalanceRow = memo(function CreditBorrowBalanceRow({ index, style, compatibleOffers, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs }) {
  const res = compatibleOffers[index];
  if (!res) return null;
  const foundAsset = assets.find((x) => x.id === res.asset_type);
  if (!foundAsset) return null;
  return <CreditBorrowCommonRow style={style} res={res} foundAsset={foundAsset} assets={assets} balanceAssetIDs={balanceAssetIDs} t={t} usr={usr} favouriteUsers={favouriteUsers} chainUserBlockList={chainUserBlockList} setBlockTarget={setBlockTarget} setBlockConfirmOpen={setBlockConfirmOpen} />;
});
const CreditBorrowOfferRow = memo(function CreditBorrowOfferRow({ index, style, offers, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs }) {
  const res = offers[index];
  if (!res) return null;
  const foundAsset = assets.find((x) => x.id === res.asset_type);
  if (!foundAsset) return null;
  return <CreditBorrowCommonRow style={style} res={res} foundAsset={foundAsset} assets={assets} balanceAssetIDs={balanceAssetIDs} t={t} usr={usr} favouriteUsers={favouriteUsers} chainUserBlockList={chainUserBlockList} setBlockTarget={setBlockTarget} setBlockConfirmOpen={setBlockConfirmOpen} />;
});
const CreditBorrowSearchRow = memo(function CreditBorrowSearchRow({ index, style, thisResult, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs }) {
  const res = thisResult[index]?.item;
  if (!res) return null;
  const foundAsset = assets.find((x) => x.id === res.asset_type);
  if (!foundAsset) return null;
  return <CreditBorrowCommonRow style={style} res={res} foundAsset={foundAsset} assets={assets} balanceAssetIDs={balanceAssetIDs} t={t} usr={usr} favouriteUsers={favouriteUsers} chainUserBlockList={chainUserBlockList} setBlockTarget={setBlockTarget} setBlockConfirmOpen={setBlockConfirmOpen} />;
});
import Fuse from "fuse.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import {
  HandCoins,
  Search,
  Clock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Star,
  StarOff,
  Ban,
} from "lucide-react";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import { Avatar } from "./Avatar.tsx";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createCreditOfferStore } from "@/nanoeffects/CreditOffers.ts";
import {
  useChainObjectsLive,
  useAccountBalancesLive,
} from "@/hooks/useChainObjectsLive";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";
import { useInitCache } from "@/nanoeffects/Init.ts";

import { $currentUser } from "@/stores/users.ts";
import {
  $blockList,
  $userBlockList,
  addBlockedUser,
} from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  $favouriteUsers,
  addFavouriteUser,
  removeFavouriteUser,
} from "@/stores/favourites.ts";

import { humanReadableFloat, debounce } from "@/lib/common.js";

function hoursTillExpiration(expirationTime) {
  var expirationDate = new Date(expirationTime);
  var currentDate = new Date();
  var difference = expirationDate - currentDate;
  var hours = Math.round(difference / 1000 / 60 / 60);
  return hours;
}

const isValid = (str) => /^[a-zA-Z0-9.-]+$/.test(str);

export default function CreditBorrow(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const currentNode = useStore($currentNode);
  const favouriteUsers = useStore($favouriteUsers)[usr?.chain ?? "bitshares"] ?? [];
  const userBlockList = useSyncExternalStore(
    $userBlockList.subscribe,
    $userBlockList.get,
    () => true
  );
  const chainUserBlockList = useMemo(() => {
    if (!userBlockList) return [];
    return userBlockList[usr?.chain ?? "bitshares"] ?? [];
  }, [userBlockList, usr]);

  const { _assetsBTS, _assetsTEST } = properties;

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

  const [allOffers, setAllOffers] = useState([]);
  const [showExpired, setShowExpired] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function fetchCreditOffers() {
      const creditOfferStore = createCreditOfferStore([
        _chain,
        currentNode ? currentNode.url : null,
      ]);

      creditOfferStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setAllOffers(data);
        }
      });
    }

    fetchCreditOffers();
  }, [_chain, currentNode]);

  const offers = useMemo(() => {
    if (_chain && allOffers && allOffers.length) {
      let currentOffers = allOffers;

      if (!showExpired) {
        currentOffers = currentOffers.filter(
          (x) => hoursTillExpiration(x.auto_disable_time) >= 0
        );
      }

      if (_chain === "bitshares" && blocklist && blocklist.users) {
        currentOffers = currentOffers.filter(
          (offer) =>
            !blocklist.users.includes(
              toHex(sha256(utf8ToBytes(offer.owner_account)))
            )
        );
      }

      if (chainUserBlockList && chainUserBlockList.length) {
        currentOffers = currentOffers.filter(
          (offer) =>
            !chainUserBlockList.some((u) => u.id === offer.owner_account)
        );
      }

      return currentOffers;
    }
    return [];
  }, [allOffers, _chain, blocklist, chainUserBlockList, showExpired]);

  const [activeTab, setActiveTab] = useState("allOffers");
  const [activeSearch, setActiveSearch] = useState("borrow");
  const [thisInput, setThisInput] = useState();
  const [thisResult, setThisResult] = useState();

  const [usrBalances, setUsrBalances] = useState();
  const [balanceAssetIDs, setBalanceAssetIDs] = useState([]);
  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );

            setBalanceAssetIDs(filteredData.map((x) => x.asset_id));
            setUsrBalances(filteredData);
          }
        });
      }
    }

    fetchUserBalances();
  }, [usr]);

  // Live balances (push per block when user state changes)
  const liveBorrowBalances = useAccountBalancesLive({
    chain: usr ? usr.chain : _chain,
    accountId: usr ? usr.id : null,
    enabled: Boolean(usr && usr.id),
    specificNode: currentNode ? currentNode.url : null,
  });
  useEffect(() => {
    if (liveBorrowBalances.balances && assets && assets.length) {
      const filteredData = liveBorrowBalances.balances.filter((balance) =>
        assets.find((x) => x.id === balance.asset_id)
      );
      if (filteredData.length) {
        setBalanceAssetIDs(filteredData.map((x) => x.asset_id));
        setUsrBalances(filteredData);
      }
    }
  }, [liveBorrowBalances.balances, assets]);

  // Live subscription for *visible* offers so new/updated offers appear
  // without a page refresh. The heavy full scan stays one-shot.
  const visibleOfferIds = useMemo(() => offers.map((x) => x.id), [offers]);
  const liveOffers = useChainObjectsLive({
    chain: _chain,
    ids: visibleOfferIds,
    enabled: Boolean(_chain && visibleOfferIds.length > 0),
    specificNode: currentNode ? currentNode.url : null,
  });
  useEffect(() => {
    if (!liveOffers.objects || !allOffers || !allOffers.length) return;
    let changed = false;
    const merged = allOffers.map((offer) => {
      const live = liveOffers.objects[offer.id];
      if (live) {
        changed = true;
        return { ...offer, ...live };
      }
      return offer;
    });
    if (changed) setAllOffers(merged);
  }, [liveOffers.objects]);

  const compatibleOffers = useMemo(() => {
    if (!offers || !balanceAssetIDs) return [];

    return offers.filter((offer) => {
      return offer.acceptable_collateral.some((x) => {
        return balanceAssetIDs.includes(x[0]);
      });
    });
  }, [offers, balanceAssetIDs]);

  const offerSearch = useMemo(() => {
    if (!offers || !offers.length || !assets || !assets.length) {
      return;
    }

    let adjustedOffers = [];
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      if (!offer) {
        continue;
      }
      if (offer.acceptable_collateral) {
        offer["collateral_symbols"] = offer.acceptable_collateral
          .map((asset) => {
            const searched = assets.find((x) => x.id === asset[0]);
            return searched?.symbol;
          })
          .filter((x) => x);
      }
      offer["offer_symbols"] = [
        assets.find((x) => x.id === offer.asset_type).symbol,
      ];
      adjustedOffers.push(offer);
    }

    let keys = [];
    if (activeSearch === "borrow") {
      keys = ["offer_symbols"];
    } else if (activeSearch === "collateral") {
      keys = ["collateral_symbols"];
    } else if (activeSearch === "owner_name") {
      keys = ["owner_name"];
    }
    return new Fuse(offers, {
      includeScore: true,
      threshold: 0.2,
      keys: keys,
    });
  }, [offers, assets, activeSearch]);

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());

    let finalTab = "";
    let finalSearchTab = "";
    let searchInput = "";
    let finalURL = "?";
    if (
      params &&
      params.tab &&
      ["allOffers", "availableOffers", "searchOffers"].includes(params.tab)
    ) {
      finalTab = params.tab;
      finalURL += `tab=${params.tab}`;
    } else {
      finalTab = "allOffers";
      finalURL += "tab=allOffers";
    }

    if (
      params &&
      params.tab &&
      params.tab === "searchOffers" &&
      params.searchTab
    ) {
      if (["borrow", "collateral", "owner_name"].includes(params.searchTab)) {
        finalSearchTab = params.searchTab;
        finalURL += `&searchTab=${params.searchTab}`;
      } else {
        finalSearchTab = "borrow";
        finalURL += "&searchTab=borrow";
      }
    }

    if (
      params &&
      params.tab &&
      params.searchTab &&
      params.tab === "searchOffers" &&
      params.searchText &&
      params.searchText.length
    ) {
      if (isValid(params.searchText)) {
        searchInput = params.searchText;
        finalURL += `&searchText=${params.searchText}`;
      } else {
        searchInput = "";
        finalURL += "&searchText=bts";
      }
    }

    setActiveTab(finalTab);
    setActiveSearch(finalSearchTab);
    setThisInput(searchInput);
    window.history.replaceState({}, "", finalURL);
  }, []);

  useEffect(() => {
    if (offerSearch && thisInput) {
      if (!isValid(thisInput)) {
        return;
      }
      window.history.replaceState(
        {},
        "",
        `?tab=searchOffers&searchTab=${activeSearch ?? "borrow"}${
          thisInput ? `&searchText=${thisInput}` : ""
        }`
      );
      const result = offerSearch.search(thisInput);
      setThisResult(result);
    }
  }, [offerSearch, thisInput]);

  const creditBorrowCommonProps = useMemo(() => ({ assets, t, usr, favouriteUsers, chainUserBlockList, balanceAssetIDs }), [assets, t, usr, favouriteUsers, chainUserBlockList, balanceAssetIDs]);
  const offerRowProps = useMemo(() => ({ offers, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs }), [offers, assets, t, usr, favouriteUsers, chainUserBlockList, balanceAssetIDs]);
  const balanceRowProps = useMemo(() => ({ compatibleOffers, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs }), [compatibleOffers, assets, t, usr, favouriteUsers, chainUserBlockList, balanceAssetIDs]);
  const searchRowProps = useMemo(() => ({ thisResult, assets, t, usr, favouriteUsers, chainUserBlockList, setBlockTarget, setBlockConfirmOpen, balanceAssetIDs }), [thisResult, assets, t, usr, favouriteUsers, chainUserBlockList, balanceAssetIDs]);

  const [thisSearchInput, setThisSearchInput] = useState();

  const debouncedSetSearchInput = useCallback(
    debounce((event) => {
      setThisInput(event.target.value);
      window.history.replaceState(
        {},
        "",
        `?tab=searchOffers&searchTab=${activeSearch}&searchText=${event.target.value}`
      );
    }, 500),
    []
  );

  const tabs = [
    { id: "allOffers", label: t("CreditBorrow:card.viewAll"), activeLabel: t("CreditBorrow:card.viewingAll"), icon: Sparkles },
    { id: "availableOffers", label: t("CreditBorrow:card.viewAvailable"), activeLabel: t("CreditBorrow:card.viewingAvailable"), icon: ShieldCheck },
    { id: "searchOffers", label: t("CreditBorrow:card.viewSearch"), activeLabel: t("CreditBorrow:card.viewingSearch"), icon: Search },
  ];

  const searchTabs = [
    { id: "borrow", label: t("CreditBorrow:card.borrowSearch"), activeLabel: t("CreditBorrow:card.borrowSearching") },
    { id: "collateral", label: t("CreditBorrow:card.collateralSearch"), activeLabel: t("CreditBorrow:card.collateralSearching") },
    { id: "owner_name", label: t("CreditBorrow:card.ownerSearch"), activeLabel: t("CreditBorrow:card.ownerSearching") },
  ];

  return (
    <div className="container mx-auto mt-5 mb-5 w-full lg:w-3/4">
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
          className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
        />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <HandCoins className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("CreditBorrow:card.title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("CreditBorrow:card.description")}
                </p>
              </div>
            </div>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={showExpired ? t("CreditBorrow:card.hideExpired") : t("CreditBorrow:card.showExpired")}
                    onClick={() => setShowExpired(!showExpired)}
                    className={cn(
                      "h-9 w-9 rounded-xl border transition-all",
                      showExpired
                        ? "border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.15)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                        : "border-border bg-card/60 text-muted-foreground hover:border-[hsl(var(--accent-1)/0.4)] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]"
                    )}
                  >
                    {showExpired ? <EyeOpenIcon className="h-4 w-4" /> : <EyeClosedIcon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-card border-border text-foreground/85">
                  <p>{showExpired ? t("CreditBorrow:card.hideExpired") : t("CreditBorrow:card.showExpired")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {allOffers && allOffers.length ? (
            <>
              <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 mb-5">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <Button
                      key={tab.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (activeTab !== tab.id) {
                          setActiveTab(tab.id);
                          window.history.replaceState(
                            {},
                            "",
                            `?tab=${tab.id}`
                          );
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center gap-1.5",
                        active
                          ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] dark:text-white border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(16,185,129,0.6)]"
                          : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {active ? tab.activeLabel : tab.label}
                    </Button>
                  );
                })}
              </div>

              {activeTab === "allOffers" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Sparkles className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                    <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                      {t("CreditBorrow:card.allOffers")}
                    </span>
                    <span className="text-xs text-muted-foreground/60">·</span>
                    <span className="text-xs text-muted-foreground">
                      {offers.length} {offers.length === 1 ? "offer" : "offers"}
                    </span>
                  </div>
                  {assets && offers && offers.length ? (
                    <div className="w-full h-[600px]">
                      <List
                        rowComponent={CreditBorrowOfferRow}
                        rowCount={offers.length}
                        rowHeight={isDesktop ? 330 : 380}
                        rowProps={offerRowProps}
                        height={600}
                        width="100%"
                      />
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === "availableOffers" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <ShieldCheck className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                    <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                      {t("CreditBorrow:card.availableOffers")}
                    </span>
                    <span className="text-xs text-muted-foreground/60">·</span>
                    <span className="text-xs text-muted-foreground">
                      {compatibleOffers.length} compatible
                    </span>
                  </div>
                  {assets && compatibleOffers && compatibleOffers.length ? (
                    <div className="w-full h-[600px]">
                      <List
                        rowComponent={CreditBorrowBalanceRow}
                        rowCount={compatibleOffers.length}
                        rowHeight={isDesktop ? 330 : 380}
                        rowProps={balanceRowProps}
                        height={600}
                        width="100%"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {t("CreditBorrow:card.noCompatibleOffers")}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "searchOffers" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Search className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                    <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                      {t("CreditBorrow:card.searchPrompt")}
                    </span>
                  </div>

                  <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 mb-3">
                    {searchTabs.map((tab) => {
                      const active = activeSearch === tab.id;
                      return (
                        <Button
                          key={tab.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (activeSearch !== tab.id) {
                              setActiveSearch(tab.id);
                              window.history.replaceState(
                                {},
                                "",
                                `?tab=searchOffers&searchTab=${tab.id}${
                                  thisInput ? `&searchText=${thisInput}` : ""
                                }`
                              );
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                            active
                              ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] dark:text-white border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(16,185,129,0.6)]"
                              : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                          )}
                        >
                          {active ? tab.activeLabel : tab.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      name="searchInput"
                      placeholder={thisSearchInput ?? t("Smartcoins:enterSearchText")}
                      className="pl-9 bg-card/40 border-border focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                      value={thisSearchInput || ""}
                      onChange={(event) => {
                        setThisSearchInput(event.target.value);
                        debouncedSetSearchInput(event);
                      }}
                    />
                  </div>

                  {["borrow", "collateral", "owner_name"].includes(activeSearch) && (
                    <>
                      {thisResult && thisResult.length ? (
                        <div className="w-full h-[600px]">
                          <List
                            rowComponent={CreditBorrowSearchRow}
                            rowCount={thisResult.length}
                            rowHeight={isDesktop ? 330 : 380}
                            rowProps={searchRowProps}
                            height={600}
                            width="100%"
                          />
                        </div>
                      ) : null}
                      {thisInput && thisResult && !thisResult.length ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t("CreditBorrow:card.noResults")}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12">
              <Spinner className="size-6 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
              <p className="text-foreground/70 text-sm">
                {t("CreditBorrow:card.loading")}
              </p>
            </div>
          )}
        </div>
      </Card>

      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Blocklist:blockConfirmTitle", { name: blockTarget?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("Blocklist:blockConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Blocklist:blockConfirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(var(--accent-danger))] hover:bg-[hsl(var(--accent-danger))] text-[hsl(var(--accent-danger-gradFg))]"
              onClick={() => {
                if (blockTarget) {
                  const chain = usr?.chain ?? "bitshares";
                  addBlockedUser(chain, blockTarget);
                }
                setBlockTarget(null);
                setBlockConfirmOpen(false);
              }}
            >
              {t("Blocklist:blockConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DexLiveFooterCard
        lastFetchAt={liveOffers.lastFetchAt}
        isSubscribed={liveOffers.isSubscribed}
        blockNumber={liveOffers.blockNumber}
        nodeUrl={currentNode ? currentNode.url : null}
        warningThresholdSec={10}
      
        chain={_chain}/>
    </div>
  );
}
