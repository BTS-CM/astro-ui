import React, {
  useMemo,
  useState,
  useEffect,
  useSyncExternalStore,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ArrowLeftRight,
  Coins,
  Send,
  Trash2,
  Star,
  ShieldCheck,
  Droplets,
} from "lucide-react";

import {
  $favouriteAssets,
  addFavouriteAsset,
  removeFavouriteAsset,
  $favouriteUsers,
  addFavouriteUser,
  removeFavouriteUser,
  $favouritePairs,
  addFavouritePair,
  removeFavouritePair,
} from "@/stores/favourites.ts";

import { $currentNode } from "@/stores/node.ts";
import { $currentUser } from "@/stores/users.ts";

import AccountSearch from "@/components/AccountSearch.jsx";
import PoolDialogs from "@/components/Market/PoolDialogs.jsx";
import AssetIssuerActions from "@/components/AssetIssuerActions.jsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { cn } from "@/lib/utils";

function RemoveButton({ onClick, label }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={onClick}
            className="h-8 w-8 rounded-full text-muted-foreground/60 hover:text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function UserActionsSelect({ userName, t }) {
  const encodedName = encodeURIComponent(userName);
  // Radix drives mouse hover via data-highlighted (the base SelectItem only
  // styles focus:), so style it explicitly for hover/keyboard highlight.
  const userActionItemCls =
    "cursor-pointer transition-colors data-[highlighted]:bg-[hsl(var(--accent-success)/0.12)] data-[highlighted]:text-[hsl(var(--accent-success-fg))]";
  return (
    <Select
      onValueChange={(href) => {
        if (href) {
          window.location.href = href;
        }
      }}
    >
      <SelectTrigger
        size="sm"
        className="rounded-full border-[hsl(var(--accent-success)/0.3)] text-[hsl(var(--accent-success-fg))] hover:bg-[hsl(var(--accent-success)/0.1)]"
      >
        <SelectValue placeholder={t("Favourites:actions")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          value={`/transfer.html?to=${encodedName}`}
          className={userActionItemCls}
        >
          {t("Favourites:transfer")}
        </SelectItem>
        <SelectItem
          value={`/timed_transfer.html?to=${encodedName}`}
          className={userActionItemCls}
        >
          {t("Favourites:timedTransfer")}
        </SelectItem>
        <SelectItem
          value={`/withdraw_permissions.html?to=${encodedName}`}
          className={userActionItemCls}
        >
          {t("Favourites:withdrawPermission")}
        </SelectItem>
        <SelectItem
          value={`/htlc.html?to=${encodedName}`}
          className={userActionItemCls}
        >
          {t("Favourites:htlcTransfer")}
        </SelectItem>
        <SelectItem
          value={`/create_vesting.html?to=${encodedName}`}
          className={userActionItemCls}
        >
          {t("Favourites:vestAssets")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function AssetActionsSelect({ item, isSmartCoin, t }) {
  const encodedSymbol = encodeURIComponent(item.symbol);
  const tradeHref = `/dex.html?market=${item.symbol}_${item.symbol === "BTS" ? "HONEST.USD" : "BTS"}`;
  const assetActionItemCls =
    "cursor-pointer transition-colors data-[highlighted]:bg-[hsl(var(--accent-success)/0.12)] data-[highlighted]:text-[hsl(var(--accent-success-fg))]";
  return (
    <Select
      onValueChange={(href) => {
        if (href) {
          window.location.href = href;
        }
      }}
    >
      <SelectTrigger
        size="sm"
        className="rounded-full border-[hsl(var(--accent-success)/0.3)] text-[hsl(var(--accent-success-fg))] hover:bg-[hsl(var(--accent-success)/0.1)]"
      >
        <SelectValue placeholder={t("Favourites:assetActions")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={tradeHref} className={assetActionItemCls}>
          {t("IssuedAssets:proceedToTrade")}
        </SelectItem>
        <SelectItem
          value={`/borrow.html?tab=searchOffers&searchTab=borrow&searchText=${encodedSymbol}`}
          className={assetActionItemCls}
        >
          {t("IssuedAssets:creditBorrow")}
        </SelectItem>
        <SelectItem
          value={`/lend.html?asset=${encodedSymbol}`}
          className={assetActionItemCls}
        >
          {t("IssuedAssets:creditLend")}
        </SelectItem>
        {isSmartCoin ? (
          <SelectItem
            value={`/smartcoin.html?id=${item.id}`}
            className={assetActionItemCls}
          >
            {t("IssuedAssets:proceedToBorrow")}
          </SelectItem>
        ) : null}
        {isSmartCoin ? (
          <SelectItem
            value={`/publish_feed.html?id=${item.id}`}
            className={assetActionItemCls}
          >
            {t("IssuedAssets:publishFeed")}
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
}

function PairActionsSelect({ pair, poolId, t }) {
  const pairActionItemCls =
    "cursor-pointer transition-colors data-[highlighted]:bg-[hsl(var(--accent-success)/0.12)] data-[highlighted]:text-[hsl(var(--accent-success-fg))]";
  return (
    <Select
      onValueChange={(href) => {
        if (href) {
          window.location.href = href;
        }
      }}
    >
      <SelectTrigger
        size="sm"
        className="rounded-full border-[hsl(var(--accent-success)/0.3)] text-[hsl(var(--accent-success-fg))] hover:bg-[hsl(var(--accent-success)/0.1)]"
      >
        <SelectValue placeholder={t("Favourites:marketActions")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          value={`/dex.html?market=${pair}`}
          className={pairActionItemCls}
        >
          {t("Favourites:dexLimitOrders")}
        </SelectItem>
        <SelectItem
          value={`/instant_trade.html?market=${pair}`}
          className={pairActionItemCls}
        >
          {t("Favourites:instantTrading")}
        </SelectItem>
        {poolId ? (
          <SelectItem
            value={`/swap.html?pool=${poolId}`}
            className={pairActionItemCls}
          >
            {t("Favourites:simpleSwap")}
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
}

const FavouriteAssetRow = React.memo(function FavouriteAssetRow({
  index,
  style,
  chainFavourites,
  fullFavouriteAssetData,
  marketSearch,
  favouriteAssets,
  dynamicData,
  bitassetData,
  priceFeederAccounts,
  poolSymbols,
  currentUser,
  _chain,
  currentNode,
  assets,
  t,
}) {
  const item = chainFavourites[index];

  if (!item) {
    return null;
  }

  const assetDetails = fullFavouriteAssetData.find((a) => a.id === item.id);

  const issuerLookup = marketSearch.find((x) => x.u && x.u.includes(`(${item.issuer})`));
  const issuerName = issuerLookup ? issuerLookup.u.split(" (")[0] : null;

  const showIssuerActions = !!(
    currentUser?.id &&
    item?.issuer &&
    currentUser.id === item.issuer &&
    (!currentUser.chain || currentUser.chain === _chain)
  );

  const fullAsset = favouriteAssets.find((a) => a.id === item.id) ?? null;

  const relevantDynamicData = fullAsset
    ? dynamicData.find((data) => data.id === fullAsset.id.replace("1.3.", "2.3."))
    : null;

  const relevantBitassetData =
    fullAsset && fullAsset.bitasset_data_id
      ? bitassetData.find((data) => data.id === fullAsset.bitasset_data_id)
      : null;

  const isPredictionMarket = !!relevantBitassetData?.is_prediction_market;
  const isSmartCoin = !!relevantBitassetData || !!fullAsset?.bitasset_data_id;
  const inPool = poolSymbols?.has(item.symbol) ?? false;

  const renderCard = (layout) => {
    const isStacked = layout === "stacked";
    const cardCls = isStacked
      ? "mb-0 h-full overflow-hidden group justify-center bg-card/60 border border-[hsl(var(--accent-1)/0.15)] border-l-2 border-l-transparent hover:border-[hsl(var(--accent-1)/0.3)] hover:border-l-[hsl(var(--accent-1)/0.6)] hover:bg-[hsl(var(--accent-1)/0.03)] hover:shadow-md hover:shadow-[color:hsl(var(--accent-1)/0.05)] transition-all rounded-xl flex md:hidden py-0 gap-0"
      : "mb-0 h-full overflow-hidden group justify-center bg-card/60 border border-[hsl(var(--accent-1)/0.15)] border-l-2 border-l-transparent hover:border-[hsl(var(--accent-1)/0.3)] hover:border-l-[hsl(var(--accent-1)/0.6)] hover:bg-[hsl(var(--accent-1)/0.03)] hover:shadow-md hover:shadow-[color:hsl(var(--accent-1)/0.05)] transition-all rounded-xl hidden md:flex py-0 gap-0";
    const headerCls = isStacked
      ? "px-4 py-2"
      : "px-4 py-2 flex flex-row items-center justify-between gap-3";

    return (
      <Card className={cardCls}>
        <CardHeader className={headerCls}>
          <div className="space-y-0.5 min-w-0">
            <CardTitle className="text-base text-foreground truncate flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 shrink-0 fill-[hsl(var(--accent-warning))] text-[hsl(var(--accent-warning-fg))]" />
              <span className="font-semibold">{item.symbol}</span>
              <span className="ml-0.5 text-xs font-mono font-normal text-muted-foreground/60">
                {item.id}
              </span>
              {isPredictionMarket ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-[hsl(var(--accent-warning)/0.35)] bg-[hsl(var(--accent-warning)/0.1)] text-[hsl(var(--accent-warning-fg))] text-[10px] px-1.5 py-0 font-mono"
                >
                  PRED
                </Badge>
              ) : isSmartCoin ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-[hsl(var(--accent-2)/0.35)] bg-[hsl(var(--accent-2)/0.1)] text-[hsl(var(--accent-2-fg))] text-[10px] px-1.5 py-0 font-mono"
                >
                  MPA
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="shrink-0 border-border text-muted-foreground text-[10px] px-1.5 py-0 font-mono"
                >
                  UIA
                </Badge>
              )}
              {inPool ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-[hsl(var(--accent-3)/0.35)] bg-[hsl(var(--accent-3)/0.1)] text-[hsl(var(--accent-3-fg))] text-[10px] px-1.5 py-0 font-mono"
                >
                  <Droplets className="h-3 w-3 mr-0.5" />
                  LP
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground truncate">
              {issuerName || item.issuer}
            </CardDescription>
          </div>
          <div
            className={
              isStacked
                ? "mt-2 flex items-center gap-2 flex-wrap"
                : "flex items-center gap-2 flex-shrink-0"
            }
          >
            <AssetActionsSelect item={item} isSmartCoin={isSmartCoin} t={t} />

            {showIssuerActions && assetDetails ? (
              <AssetIssuerActions
                asset={assetDetails}
                assets={assets}
                chain={_chain}
                currentUser={currentUser}
                node={currentNode}
                dynamicAssetData={relevantDynamicData}
                bitassetData={relevantBitassetData}
                priceFeederAccounts={priceFeederAccounts}
                buttonVariant="outline"
                buttonSize="sm"
                className="border-border text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
              />
            ) : null}

            <div className={isStacked ? "ml-auto" : "ml-1"}>
              <RemoveButton
                onClick={() => removeFavouriteAsset(_chain, item)}
                label={t("Favourites:remove")}
              />
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  return (
    <div style={{ ...style, padding: "0 10px 10px 0", overflow: "hidden" }}>
      {renderCard("stacked")}
      {renderCard("row")}
    </div>
  );
});

const FavouritePairRowMobile = React.memo(function FavouritePairRowMobile({
  index,
  style,
  chainPairs,
  _chain,
  t,
  poolByPair,
}) {
  const pair = chainPairs[index];
  if (!pair) return null;
  const poolId = poolByPair?.get(pair) ?? null;
  return (
    <div style={{ ...style, padding: "0 10px 10px 0", overflow: "hidden" }}>
      <Card className="mb-0 h-full overflow-hidden group justify-center bg-card/60 border border-[hsl(var(--accent-2)/0.15)] border-l-2 border-l-transparent hover:border-[hsl(var(--accent-2)/0.3)] hover:border-l-[hsl(var(--accent-2)/0.6)] hover:bg-[hsl(var(--accent-2)/0.03)] hover:shadow-md transition-all rounded-xl py-0 gap-0">
        <CardHeader className="px-4 py-2">
          <div className="space-y-0.5">
            <CardTitle className="text-base text-foreground font-semibold flex items-center gap-1.5 min-w-0">
              <Star className="h-3.5 w-3.5 shrink-0 fill-[hsl(var(--accent-warning))] text-[hsl(var(--accent-warning-fg))]" />
              <span className="truncate">{pair}</span>
            </CardTitle>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <PairActionsSelect pair={pair} poolId={poolId} t={t} />
            <div className="ml-auto">
              <RemoveButton
                onClick={() => removeFavouritePair(_chain, pair)}
                label={t("Favourites:remove")}
              />
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
});

const FavouritePairRowDesktop = React.memo(function FavouritePairRowDesktop({
  index,
  style,
  chainPairs,
  _chain,
  t,
  poolByPair,
}) {
  const pair = chainPairs[index];
  if (!pair) return null;
  const poolId = poolByPair?.get(pair) ?? null;
  return (
    <div style={{ ...style, padding: "0 10px 10px 0", overflow: "hidden" }}>
      <Card className="mb-0 h-full overflow-hidden group justify-center bg-card/60 border border-[hsl(var(--accent-2)/0.15)] border-l-2 border-l-transparent hover:border-[hsl(var(--accent-2)/0.3)] hover:border-l-[hsl(var(--accent-2)/0.6)] hover:bg-[hsl(var(--accent-2)/0.03)] hover:shadow-md transition-all rounded-xl py-0 gap-0">
        <CardHeader className="px-4 py-2 flex flex-row items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base text-foreground font-semibold flex items-center gap-1.5 min-w-0">
              <Star className="h-3.5 w-3.5 shrink-0 fill-[hsl(var(--accent-warning))] text-[hsl(var(--accent-warning-fg))]" />
              <span className="truncate">{pair}</span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <PairActionsSelect pair={pair} poolId={poolId} t={t} />
            <div className="ml-1">
              <RemoveButton
                onClick={() => removeFavouritePair(_chain, pair)}
                label={t("Favourites:remove")}
              />
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
});

const FavouriteUserRowMobile = React.memo(function FavouriteUserRowMobile({
  index,
  style,
  favouriteUsers,
  _chain,
  t,
  currentUser,
}) {
  const user = favouriteUsers[_chain][index];
  if (!user) return null;
  return (
    <div style={{ ...style, padding: "0 10px 10px 0", overflow: "hidden" }}>
      <Card className="mb-0 h-full overflow-hidden group justify-center bg-card/60 border border-[hsl(var(--accent-2)/0.15)] border-l-2 border-l-transparent hover:border-[hsl(var(--accent-2)/0.3)] hover:border-l-[hsl(var(--accent-2)/0.6)] hover:bg-[hsl(var(--accent-2)/0.03)] hover:shadow-md transition-all rounded-xl py-0 gap-0">
        <CardHeader className="px-4 py-2">
          <div className="space-y-0.5 min-w-0">
              <CardTitle className="text-base text-foreground truncate flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 shrink-0 fill-[hsl(var(--accent-warning))] text-[hsl(var(--accent-warning-fg))]" />
                <span className="font-semibold">{user.name}</span>
              <span className="ml-2 text-xs font-mono font-normal text-muted-foreground/60">
                {user.id}
              </span>
            </CardTitle>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {currentUser?.id !== user.id ? (
              <UserActionsSelect userName={user.name} t={t} />
            ) : null}
            <div className="ml-auto">
              <RemoveButton
                onClick={() => removeFavouriteUser(_chain, user)}
                label={t("Favourites:remove")}
              />
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
});

const FavouriteUserRowDesktop = React.memo(function FavouriteUserRowDesktop({
  index,
  style,
  favouriteUsers,
  _chain,
  t,
  currentUser,
}) {
  const user = favouriteUsers[_chain][index];
  if (!user) return null;
  return (
    <div style={{ ...style, padding: "0 10px 10px 0", overflow: "hidden" }}>
      <Card className="mb-0 h-full overflow-hidden group justify-center bg-card/60 border border-[hsl(var(--accent-2)/0.15)] border-l-2 border-l-transparent hover:border-[hsl(var(--accent-2)/0.3)] hover:border-l-[hsl(var(--accent-2)/0.6)] hover:bg-[hsl(var(--accent-2)/0.03)] hover:shadow-md transition-all rounded-xl py-0 gap-0">
        <CardHeader className="px-4 py-2 flex flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
              <CardTitle className="text-base text-foreground truncate flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 shrink-0 fill-[hsl(var(--accent-warning))] text-[hsl(var(--accent-warning-fg))]" />
                <span className="font-semibold">{user.name}</span>
              <span className="ml-2 text-xs font-mono font-normal text-muted-foreground/60">
                {user.id}
              </span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentUser?.id !== user.id ? (
              <UserActionsSelect userName={user.name} t={t} />
            ) : null}
            <div className="ml-1">
              <RemoveButton
                onClick={() => removeFavouriteUser(_chain, user)}
                label={t("Favourites:remove")}
              />
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
});

export default function Favourites(properties) {
  const {
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _poolsBTS,
    _poolsTEST,
  } = properties;

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);

  const favourites = useStore($favouriteAssets);
  const favouriteUsers = useStore($favouriteUsers);
  const favouritePairs = useStore($favouritePairs);

  const currentUser = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const _chain = useMemo(() => {
    // Fall back to bitshares if chain not initialised yet
    if (currentUser && currentUser.chain) return currentUser.chain;
    return "bitshares";
  }, [currentUser]);

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain === "bitshares") return _marketSearchBTS ?? [];
    return _marketSearchTEST ?? [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const chainFavourites = useMemo(() => {
    // favourite assets
    if (!favourites) return [];
    return favourites[_chain] ?? [];
  }, [favourites, _chain]);

  const favouriteAssets = useMemo(() => {
    if (!chainFavourites) return [];
    return assets.filter((asset) =>
      chainFavourites.some((fav) => fav.id === asset.id)
    );
  }, [chainFavourites, assets]);

  const [fullFavouriteAssetData, setFullFavouriteAssetData] = useState([]);
  const [fullFavouriteLoading, setFullFavouriteLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        _chain,
        JSON.stringify(favouriteAssets.map((asset) => asset.id)),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setFullFavouriteAssetData(data);
          setFullFavouriteLoading(false);
        }
      });
    }

    if (_chain && favouriteAssets && favouriteAssets.length) {
      setFullFavouriteLoading(true);
      fetching();
    } else {
      setFullFavouriteLoading(false);
    }
  }, [favouriteAssets]);

  const [dynamicData, setDynamicData] = useState([]);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        _chain,
        JSON.stringify(
          favouriteAssets.map((asset) => asset.id.replace("1.3.", "2.3."))
        ),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setDynamicData(data);
          setDynamicLoading(false);
        }
      });
    }

    if (_chain && favouriteAssets && favouriteAssets.length) {
      setDynamicLoading(true);
      fetching();
    } else {
      setDynamicLoading(false);
    }
  }, [favouriteAssets]);

  const [bitassetData, setBitassetData] = useState([]);
  const [bitassetLoading, setBitassetLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        _chain,
        JSON.stringify(
          favouriteAssets
            .filter((asset) => asset.bitasset_data_id)
            .map((asset) => asset.bitasset_data_id)
        ),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBitassetData(data);
          setBitassetLoading(false);
        }
      });
    }

    if (_chain && favouriteAssets && favouriteAssets.length) {
      const ids = favouriteAssets
        .filter((asset) => asset.bitasset_data_id)
        .map((asset) => asset.bitasset_data_id);
      if (ids && ids.length) {
        setBitassetLoading(true);
        fetching();
      } else {
        setBitassetLoading(false);
      }
    }
  }, [favouriteAssets]);

  const priceFeederAccountIDs = useMemo(() => {
    if (!bitassetData) {
      return [];
    }

    const priceFeeders = Array.from(
      new Set(bitassetData.flatMap((data) => data.feeds.map((feed) => feed[0])))
    );

    return priceFeeders;
  }, [bitassetData]);

  const [priceFeederAccounts, setPriceFeederAccounts] = useState([]);
  const [feederLoading, setFeederLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        _chain,
        JSON.stringify(priceFeederAccountIDs),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setPriceFeederAccounts(data);
          setFeederLoading(false);
        }
      });
    }

    if (_chain && priceFeederAccountIDs && priceFeederAccountIDs.length) {
      setFeederLoading(true);
      fetching();
    } else {
      setFeederLoading(false);
    }
  }, [priceFeederAccountIDs]);

  const loading =
    dynamicLoading || bitassetLoading || feederLoading || fullFavouriteLoading;

  const chainPairs = useMemo(() => {
    if (!favouritePairs) return [];
    return favouritePairs[_chain] ?? [];
  }, [favouritePairs, _chain]);

  const [addSelection, setAddSelection] = useState();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState();
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [pairBaseSelection, setPairBaseSelection] = useState();
  const [pairQuoteSelection, setPairQuoteSelection] = useState();

  // When a new symbol is chosen from the AssetDropDown, look up its details and add to favourites
  useEffect(() => {
    if (!addSelection) return;

    const found = assets.find((a) => a.symbol === addSelection);
    if (found) {
      addFavouriteAsset(_chain, {
        symbol: found.symbol,
        id: found.id,
        issuer: found.issuer,
      });
    }
    setAddSelection(undefined);
  }, [addSelection, assets, _chain]);

  // Handle user selection from dialog
  useEffect(() => {
    if (!selectedUser) return;
    addFavouriteUser(_chain, { name: selectedUser.name, id: selectedUser.id });
    setSelectedUser(undefined);
    setUserDialogOpen(false);
  }, [selectedUser, _chain]);

  // Reset pair selections when closing the dialog
  useEffect(() => {
    if (!pairDialogOpen) {
      setPairBaseSelection(undefined);
      setPairQuoteSelection(undefined);
    }
  }, [pairDialogOpen]);

  // Symbols present in any liquidity pool on the current chain (for the LP badge).
  const poolSymbols = useMemo(() => {
    const pools = _chain !== "bitshares" ? _poolsTEST : _poolsBTS;
    const set = new Set();
    if (Array.isArray(pools)) {
      for (const pool of pools) {
        if (pool?.asset_a_symbol) set.add(pool.asset_a_symbol);
        if (pool?.asset_b_symbol) set.add(pool.asset_b_symbol);
      }
    }
    return set;
  }, [_chain, _poolsBTS, _poolsTEST]);

  // Map "BASE_QUOTE" (either direction) to the liquidity pool id, if any.
  const poolByPair = useMemo(() => {
    const pools = _chain !== "bitshares" ? _poolsTEST : _poolsBTS;
    const map = new Map();
    if (Array.isArray(pools)) {
      for (const pool of pools) {
        if (!pool?.id || !pool?.asset_a_symbol || !pool?.asset_b_symbol) {
          continue;
        }
        const a = pool.asset_a_symbol;
        const b = pool.asset_b_symbol;
        if (!map.has(`${a}_${b}`)) map.set(`${a}_${b}`, pool.id);
        if (!map.has(`${b}_${a}`)) map.set(`${b}_${a}`, pool.id);
      }
    }
    return map;
  }, [_chain, _poolsBTS, _poolsTEST]);

  const assetRowProps = useMemo(
    () => ({
      chainFavourites,
      fullFavouriteAssetData,
      marketSearch,
      favouriteAssets,
      dynamicData,
      bitassetData,
      priceFeederAccounts,
      poolSymbols,
      currentUser,
      _chain,
      currentNode,
      assets,
      t,
    }),
    [
      chainFavourites,
      fullFavouriteAssetData,
      marketSearch,
      favouriteAssets,
      dynamicData,
      bitassetData,
      priceFeederAccounts,
      poolSymbols,
      currentUser,
      _chain,
      currentNode,
      assets,
      t,
    ]
  );
  const pairRowProps = useMemo(
    () => ({ chainPairs, _chain, t, poolByPair }),
    [chainPairs, _chain, t, poolByPair]
  );
  const userRowProps = useMemo(
    () => ({ favouriteUsers, _chain, t, currentUser }),
    [favouriteUsers, _chain, t, currentUser]
  );

  return (
    <div className="container mx-auto mt-5 mb-10 max-w-4xl text-foreground">
      <div className="grid grid-cols-1 gap-3 mb-8">
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
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <Star className="h-4.5 w-4.5" strokeWidth={2.25} />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {t("Favourites:pageTitle")}
              </h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {t("Favourites:pageDescription")}
              </p>
            </div>
          </div>
        </div>
      </Card>
      <Card className="rounded-xl overflow-hidden bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
        <CardHeader className="px-4 py-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.25)] flex items-center justify-center">
              <Star className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                {t("Favourites:assetsHeader")}
              </CardTitle>
              {chainFavourites && chainFavourites.length ? (
                <span className="inline-flex items-center rounded-full border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-2 py-0.5 font-mono tabular-nums text-[11px] text-[hsl(var(--accent-1-fg))]">
                  {chainFavourites.length}
                </span>
              ) : null}

            </div>
          </div>
          <div className="flex items-center gap-2">
            <AssetDropDown
              assetSymbol={""}
              assetData={null}
              storeCallback={setAddSelection}
              otherAsset={null}
              marketSearch={marketSearch}
              type={null}
              chain={_chain}
              balances={null}
              triggerLabel={t("Favourites:addAsset")}
              triggerVariant="outline"
              triggerClassName="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]"
            />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2">
          {chainFavourites && chainFavourites.length ? (
            <div className="mt-1 rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.04)] px-3 pt-3">
              {loading ? (
                <div className="space-y-2 mt-1" aria-busy="true" aria-live="polite">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-4 rounded-xl border border-border bg-accent/30 dark:bg-white/[0.05]"
                    >
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-3 w-40 flex-1" />
                      <Skeleton className="h-8 w-20 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="w-full h-[420px] block md:hidden">
                    <List
                      rowComponent={FavouriteAssetRow}
                      rowCount={chainFavourites.length}
                      rowHeight={120}
                      height={420}
                      width="100%"
                      rowProps={assetRowProps}
                    />
                  </div>
                  <div className="w-full h-[420px] hidden md:block">
                    <List
                      rowComponent={FavouriteAssetRow}
                      rowCount={chainFavourites.length}
                      rowHeight={84}
                      height={420}
                      width="100%"
                      rowProps={assetRowProps}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <Empty className="mt-1 border border-[hsl(var(--accent-1)/0.2)] rounded-xl bg-[hsl(var(--accent-1)/0.04)]">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]"><Star className="w-6 h-6" /></EmptyMedia>
                <EmptyTitle className="text-foreground/80">{t("Favourites:assetsEmptyTitle")}</EmptyTitle>
                <EmptyDescription className="text-muted-foreground">
                  {t("Favourites:assetsEmptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl overflow-hidden bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
        <CardHeader className="px-4 py-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[hsl(var(--accent-2)/0.15)] border border-[hsl(var(--accent-2)/0.25)] flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                {t("Favourites:pairsHeader")}
              </CardTitle>
              {chainPairs && chainPairs.length ? (
                <span className="inline-flex items-center rounded-full border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] px-2 py-0.5 font-mono tabular-nums text-[11px] text-[hsl(var(--accent-2-fg))]">
                  {chainPairs.length}
                </span>
              ) : null}

            </div>
          </div>
          <Dialog
            open={pairDialogOpen}
            onOpenChange={(open) => setPairDialogOpen(open)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[hsl(var(--accent-2)/0.3)] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.1)] hover:text-[hsl(var(--accent-2-fg))]">
                {t("Favourites:addPair")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>{t("Favourites:addPairDialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("Favourites:addPairDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <AssetDropDown
                  assetSymbol={pairBaseSelection}
                  assetData={null}
                  storeCallback={setPairBaseSelection}
                  otherAsset={pairQuoteSelection}
                  marketSearch={marketSearch}
                  type="base"
                  chain={_chain}
                  balances={null}
                  triggerLabel={
                    pairBaseSelection
                      ? `${t("Favourites:selectBase")}: ${pairBaseSelection}`
                      : t("Favourites:selectBase")
                  }
                  triggerVariant="outline"
                />
                <AssetDropDown
                  assetSymbol={pairQuoteSelection}
                  assetData={null}
                  storeCallback={setPairQuoteSelection}
                  otherAsset={pairBaseSelection}
                  marketSearch={marketSearch}
                  type="quote"
                  chain={_chain}
                  balances={null}
                  triggerLabel={
                    pairQuoteSelection
                      ? `${t("Favourites:selectQuote")}: ${pairQuoteSelection}`
                      : t("Favourites:selectQuote")
                  }
                  triggerVariant="outline"
                />
              </div>
              <div className="mt-4 flex items-center justify-end">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-accent/60"
                    onClick={() => {
                      setPairBaseSelection(undefined);
                      setPairQuoteSelection(undefined);
                    }}
                  >
                    {t("Favourites:clear")}
                  </Button>
                  <Button
                    disabled={
                      !pairBaseSelection ||
                      !pairQuoteSelection ||
                      pairBaseSelection === pairQuoteSelection
                    }
                    onClick={() => {
                      if (
                        pairBaseSelection &&
                        pairQuoteSelection &&
                        pairBaseSelection !== pairQuoteSelection
                      ) {
                        const pair = `${pairBaseSelection}_${pairQuoteSelection}`;
                        addFavouritePair(_chain, pair);
                        setPairDialogOpen(false);
                      }
                    }}
                  >
                    {t("Favourites:savePair")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2">
          {chainPairs && chainPairs.length ? (
            <div className="mt-1 rounded-xl border border-[hsl(var(--accent-2)/0.2)] bg-[hsl(var(--accent-2)/0.04)] px-3 pt-3">
              <div className="w-full h-[420px] block md:hidden">
                <List
                  rowComponent={FavouritePairRowMobile}
                  rowCount={chainPairs.length}
                  rowHeight={100}
                  height={420}
                  width="100%"
                  rowProps={pairRowProps}
                />
              </div>

              <div className="w-full h-[420px] hidden md:block">
                <List
                  rowComponent={FavouritePairRowDesktop}
                  rowCount={chainPairs.length}
                  rowHeight={68}
                  height={420}
                  width="100%"
                      rowProps={pairRowProps}
                    />
                  </div>
                </div>
              ) : (
            <Empty className="mt-1 border border-[hsl(var(--accent-2)/0.2)] rounded-xl bg-[hsl(var(--accent-2)/0.04)]">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-2)/0.15)] text-[hsl(var(--accent-2-fg))]"><ArrowLeftRight className="w-6 h-6" /></EmptyMedia>
                <EmptyTitle className="text-foreground/80">{t("Favourites:pairsEmptyTitle")}</EmptyTitle>
                <EmptyDescription className="text-muted-foreground">
                  {t("Favourites:pairsEmptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl overflow-hidden bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
        <CardHeader className="px-4 py-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[hsl(var(--accent-2)/0.15)] border border-[hsl(var(--accent-2)/0.25)] flex items-center justify-center">
              <Send className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                {t("Favourites:usersHeader")}
              </CardTitle>
              {favouriteUsers && (favouriteUsers[_chain] ?? []).length ? (
                <span className="inline-flex items-center rounded-full border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] px-2 py-0.5 font-mono tabular-nums text-[11px] text-[hsl(var(--accent-2-fg))]">
                  {(favouriteUsers[_chain] ?? []).length}
                </span>
              ) : null}

            </div>
          </div>
          <Dialog
            open={userDialogOpen}
            onOpenChange={(open) => setUserDialogOpen(open)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[hsl(var(--accent-2)/0.3)] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.1)] hover:text-[hsl(var(--accent-2-fg))]">
                {t("Favourites:addUser")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>{t("Favourites:addUserDialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("Favourites:addUserDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <AccountSearch
                chain={_chain}
                excludedUsers={[]}
                setChosenAccount={setSelectedUser}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2">
          {favouriteUsers && (favouriteUsers[_chain] ?? []).length ? (
            <div className="mt-1 rounded-xl border border-[hsl(var(--accent-2)/0.2)] bg-[hsl(var(--accent-2)/0.04)] px-3 pt-3">
              <div className="w-full h-[420px] block md:hidden">
                <List
                  rowComponent={FavouriteUserRowMobile}
                  rowCount={favouriteUsers[_chain].length}
                  rowHeight={100}
                  height={420}
                  width="100%"
                  rowProps={userRowProps}
                />
              </div>

              <div className="w-full h-[420px] hidden md:block">
                <List
                  rowComponent={FavouriteUserRowDesktop}
                  rowCount={favouriteUsers[_chain].length}
                  rowHeight={68}
                  height={420}
                  width="100%"
                      rowProps={userRowProps}
                    />
                  </div>
                </div>
              ) : (
            <Empty className="mt-1 border border-[hsl(var(--accent-2)/0.2)] rounded-xl bg-[hsl(var(--accent-2)/0.04)]">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-2)/0.15)] text-[hsl(var(--accent-2-fg))]"><Send className="w-6 h-6" /></EmptyMedia>
                <EmptyTitle className="text-foreground/80">{t("Favourites:usersEmptyTitle")}</EmptyTitle>
                <EmptyDescription className="text-muted-foreground">
                  {t("Favourites:usersEmptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
      </div>

    </div>
  );
}
