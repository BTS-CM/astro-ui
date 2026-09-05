import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import {
  Boxes,
  Coins,
  Layers,
  Droplets,
  Image,
  ArrowRight,
  Settings,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { cn } from "@/lib/utils";

import { Card } from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createIssuedAssetsStore } from "@/nanoeffects/IssuedAssets.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser, $userStorage } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import AssetIssuerActions from "./AssetIssuerActions.jsx";


function IssuedAssetRow({ index, style, relevantAssets, dynamicData, bitassetData, priceFeederAccounts, t, activeTab, assets, chain, currentUser, currentNode }) {
    const [viewJSON, setViewJSON] = useState(false);
    const [json, setJSON] = useState();

    const issuedAsset = relevantAssets[index];
    if (!issuedAsset) {
      return null;
    }

    const relevantDynamicData = dynamicData.find(
      (data) => data.id === issuedAsset.dynamic_asset_data_id
    );

    const relevantBitassetData = issuedAsset.bitasset_data_id
      ? bitassetData.find((data) => data.id === issuedAsset.bitasset_data_id)
      : null;

    const description = issuedAsset.options.description;
    let parsedDescription;
    if (description && description.length) {
      let _desc;
      try {
        _desc = JSON.parse(description);
      } catch (e) {
        console.log({ e, id: issuedAsset.id, description });
      }
      if (_desc && _desc.hasOwnProperty("main")) {
        parsedDescription = _desc;
      }
    }

    const smartcoinCheck =
      activeTab === "smartcoins" &&
      relevantBitassetData &&
      ((relevantBitassetData.current_feed.settlement_price.base.amount === 0 &&
        relevantBitassetData.current_feed.settlement_price.quote.amount ===
          0) ||
        !relevantBitassetData.feeds.length ||
        (parseInt(relevantBitassetData.settlement_price.base.amount) > 0 &&
          parseInt(relevantBitassetData.settlement_price.quote.amount)) ||
        parseInt(relevantBitassetData.settlement_fund) > 0);

    const getAccentColor = () => {
      switch (activeTab) {
        case "smartcoins":
          return "rose";
        case "pools":
          return "sky";
        case "nft":
          return "amber";
        default:
          return "rose";
      }
    };

    const accent = getAccentColor();

    const issueThingsRow = (
      <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={cn(
              "border-border hover:bg-accent/60"
            )}>
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              JSON
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                setJSON(issuedAsset);
                setViewJSON(true);
              }}
            >
              {t("IssuedAssets:issuedAssetData")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setJSON(relevantDynamicData);
                setViewJSON(true);
              }}
            >
              {t("IssuedAssets:issuedDynamicData")}
            </DropdownMenuItem>
            {parsedDescription &&
            parsedDescription.hasOwnProperty("nft_object") ? (
              <DropdownMenuItem
                onClick={() => {
                  setJSON(parsedDescription.nft_object);
                  setViewJSON(true);
                }}
              >
                {t("IssuedAssets:issuedNFTObject")}
              </DropdownMenuItem>
            ) : null}
            {relevantBitassetData ? (
              <DropdownMenuItem
                onClick={() => {
                  setJSON(relevantBitassetData);
                  setViewJSON(true);
                }}
              >
                {t("IssuedAssets:issuedSmartcoinData")}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={cn(
              "border-border hover:bg-accent/60"
            )}>
              {t("IssuedAssets:userActions")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <a
              href={`/dex.html?market=${issuedAsset.symbol}_${
                parsedDescription && parsedDescription.market
                  ? parsedDescription.market
                  : "BTS"
              }`}
            >
              <DropdownMenuItem>
                <ArrowRight className="h-3.5 w-3.5 mr-2" />
                {t("IssuedAssets:proceedToTrade")}
              </DropdownMenuItem>
            </a>
            <a
              href={`/borrow.html?tab=searchOffers&searchTab=borrow&searchText=${issuedAsset.symbol}`}
            >
              <DropdownMenuItem>
                <ArrowRight className="h-3.5 w-3.5 mr-2" />
                {t("IssuedAssets:creditBorrow")}
              </DropdownMenuItem>
            </a>
            <a href={`/lend.html?asset=${issuedAsset.symbol}`}>
              <DropdownMenuItem>
                <ArrowRight className="h-3.5 w-3.5 mr-2" />
                {t("IssuedAssets:creditLend")}
              </DropdownMenuItem>
            </a>
            {activeTab === "smartcoins" ? (
              <a href={`/smartcoin.html?id=${issuedAsset.id}`}>
                <DropdownMenuItem>
                  <ArrowRight className="h-3.5 w-3.5 mr-2" />
                  {t("IssuedAssets:proceedToBorrow")}
                </DropdownMenuItem>
              </a>
            ) : null}
            {activeTab === "smartcoins" && smartcoinCheck ? (
              <a href={`/settlement.html?id=${issuedAsset.id}`}>
                <DropdownMenuItem>
                  <ArrowRight className="h-3.5 w-3.5 mr-2" />
                  {t("IssuedAssets:collateralBid")}
                </DropdownMenuItem>
              </a>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <AssetIssuerActions
          asset={issuedAsset}
          assets={assets}
          chain={chain}
          currentUser={currentUser}
          node={currentNode}
          dynamicAssetData={relevantDynamicData}
          bitassetData={relevantBitassetData}
          priceFeederAccounts={priceFeederAccounts}
          buttonVariant="outline"
          buttonSize="sm"
          className="border-border hover:bg-accent/60"
        />

        {viewJSON && json ? (
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
                value={JSON.stringify(json, null, 2)}
                readOnly={true}
                rows={15}
                className="bg-card/60"
              />
              <Button
                className="w-1/4 mt-2 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] border-0"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(json, null, 2));
                }}
              >
                {t("LiveBlocks:dialogContent.copy")}
              </Button>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    );

    return (
      <div style={{ ...style }} key={`acard-${issuedAsset.id}`}>
        <Card className="mx-2 mb-2 rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.03)] hover:shadow-md hover:shadow-[color:hsl(var(--accent-1)/0.05)] transition-all">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border flex-shrink-0",
                  activeTab === "smartcoins"
                    ? "border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]"
                    : activeTab === "pools"
                    ? "border-[hsl(var(--accent-2)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-2-gradFg))] text-[hsl(var(--accent-2-gradFg))]"
                    : activeTab === "nft"
                    ? "border-[hsl(var(--accent-3)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-3)/0.2)] to-[hsl(var(--accent-3)/0.2)] dark:text-[hsl(var(--accent-3-gradFg))] text-[hsl(var(--accent-3-gradFg))]"
                    : "border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]"
                )}>
                  {activeTab === "smartcoins" ? (
                    <Droplets className="h-4 w-4" strokeWidth={2.25} />
                  ) : activeTab === "pools" ? (
                    <Layers className="h-4 w-4" strokeWidth={2.25} />
                  ) : activeTab === "nft" ? (
                    <Image className="h-4 w-4" strokeWidth={2.25} />
                  ) : (
                    <Coins className="h-4 w-4" strokeWidth={2.25} />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {issuedAsset.symbol}
                    </h3>
                    {smartcoinCheck && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="h-4 w-4 text-[hsl(var(--accent-3-fg))]" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("IssuedAssets:inactiveSmartcoin")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {issuedAsset.id}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {issueThingsRow}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
}
const MemoIssuedAssetRow = React.memo(IssuedAssetRow);


export default function IssuedAssets(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const { _assetsBTS, _assetsTEST } = properties;

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [issuedAssets, setIssuedAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe;

    async function fetching() {
      const requiredStore = createIssuedAssetsStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      unsubscribe = requiredStore.subscribe(({ data, error, loading }) => {
        if (cancelled) {
          return;
        }
        if (data && !error && !loading) {
          setLoading(false);
          setIssuedAssets(data);
        }
      });
    }

    if (usr && usr.id && currentNode && currentNode.url) {
      setLoading(true);
      // Clear the previous account's data immediately so rows never render
      // stale assets under the new account while the fetch is in flight.
      setIssuedAssets([]);
      setDynamicData([]);
      setBitassetData([]);
      setPriceFeederAccounts([]);
      fetching();
    } else {
      setIssuedAssets([]);
      setLoading(false);
    }

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [usr, currentNode]);

  const [activeTab, setActiveTab] = useState("uia");

  const relevantAssets = useMemo(() => {
    if (!issuedAssets || !issuedAssets.length) {
      return [];
    }

    switch (activeTab) {
      case "uia":
        return issuedAssets.filter(
          (asset) =>
            !asset.bitasset_data_id &&
            !asset.options.description.includes("nft_object") &&
            !asset.for_liquidity_pool
        );
      case "pools":
        const foundPools = issuedAssets.filter(
          (asset) => asset.for_liquidity_pool
        );
        return foundPools;
      case "smartcoins":
        return issuedAssets.filter(
          (asset) =>
            asset.bitasset_data_id &&
            !asset.options.description.includes("condition") &&
            !asset.options.description.includes("expiry")
        );
      case "nft":
        return issuedAssets.filter(
          (asset) =>
            !asset.bitasset_data_id &&
            asset.options.description.includes("nft_object")
        );
      default:
        return [];
    }
  }, [issuedAssets, activeTab]);

  const dynamicDataIDs = useMemo(() => {
    if (!issuedAssets) {
      return [];
    }

    return issuedAssets.map((asset) => asset.dynamic_asset_data_id);
  }, [issuedAssets]);

  const [dynamicData, setDynamicData] = useState([]);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe;

    async function fetching() {
      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(dynamicDataIDs),
        currentNode ? currentNode.url : null,
      ]);

      unsubscribe = requiredStore.subscribe(({ data, error, loading }) => {
        if (cancelled) {
          return;
        }
        if (data && !error && !loading) {
          setDynamicData(data);
        }
      });
    }

    if (dynamicDataIDs && dynamicDataIDs.length) {
      fetching();
    } else {
      setDynamicData([]);
    }

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [dynamicDataIDs]);

  const bitassetDataIDs = useMemo(() => {
    if (!issuedAssets) {
      return [];
    }

    const bitassetIDs = issuedAssets
      .filter((asset) => asset.bitasset_data_id)
      .map((asset) => asset.bitasset_data_id);

    return bitassetIDs;
  }, [issuedAssets]);

  const [bitassetData, setBitassetData] = useState([]);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe;

    async function fetching() {
      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(bitassetDataIDs),
        currentNode ? currentNode.url : null,
      ]);

      unsubscribe = requiredStore.subscribe(({ data, error, loading }) => {
        if (cancelled) {
          return;
        }
        if (data && !error && !loading) {
          setBitassetData(data);
        }
      });
    }

    if (bitassetDataIDs && bitassetDataIDs.length) {
      fetching();
    } else {
      setBitassetData([]);
    }

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [bitassetDataIDs]);

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
  useEffect(() => {
    let cancelled = false;
    let unsubscribe;

    async function fetching() {
      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(priceFeederAccountIDs),
        currentNode ? currentNode.url : null,
      ]);

      unsubscribe = requiredStore.subscribe(({ data, error, loading }) => {
        if (cancelled) {
          return;
        }
        if (data && !error && !loading) {
          setPriceFeederAccounts(data);
        }
      });
    }

    if (priceFeederAccountIDs && priceFeederAccountIDs.length) {
      fetching();
    } else {
      setPriceFeederAccounts([]);
    }

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [priceFeederAccountIDs]);

  const assetRowProps = useMemo(() => ({ relevantAssets, dynamicData, bitassetData, priceFeederAccounts, t, activeTab, assets, chain: _chain, currentUser: usr, currentNode }), [relevantAssets, dynamicData, bitassetData, priceFeederAccounts, t, activeTab, assets, _chain, usr, currentNode]);

  // Force react-window rows to remount on account/chain switch so reused row
  // instances never carry the previous account's state or asset shape.
  const listKey = useMemo(() => {
    return `issued-${_chain}-${usr && usr.id ? usr.id : "nouser"}`;
  }, [_chain, usr]);

  const tabs = [
    { id: "uia", label: t("IssuedAssets:uiaButton"), icon: Coins },
    { id: "pools", label: t("IssuedAssets:poolsButton"), icon: Layers },
    { id: "smartcoins", label: t("IssuedAssets:smartcoinsButton"), icon: Droplets },
    { id: "nft", label: t("IssuedAssets:nftButton"), icon: Image },
  ];

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
              <Boxes className="h-4.5 w-4.5" strokeWidth={2.25} />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {t("IssuedAssets:title")}
              </h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {t("IssuedAssets:description")}
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 mb-5">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    window.history.replaceState({}, "", `?tab=${tab.id}`);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center gap-1.5",
                    active
                      ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(244,63,94,0.6)]"
                      : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
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
              {activeTab === "uia" && (
                <div>
                  {relevantAssets.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Coins className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                      <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                        {t("IssuedAssets:listingUIA", { count: relevantAssets.length })}
                      </span>
                    </div>
                  )}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <Empty className="mt-2 border border-dashed border-[hsl(var(--accent-1)/0.2)] rounded-xl bg-[hsl(var(--accent-1)/0.03)]">
                      <EmptyHeader>
                        <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
                          <Coins className="w-6 h-6" />
                        </EmptyMedia>
                        <EmptyTitle className="text-foreground/80">{t("IssuedAssets:noUIA")}</EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button asChild className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] border-0">
                          <a href="/create_uia.html">
                            {t("PageHeader:create_uia")}
                          </a>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <>
                      {dynamicData && dynamicData.length ? (
                        <>
                          <div className="w-full h-[500px] block md:hidden">
                            <List
                              key={listKey}
                              height={500}
                              width="100%"
                              rowComponent={MemoIssuedAssetRow}
                              rowCount={relevantAssets.length}
                              rowHeight={90}
                              rowProps={assetRowProps}
                            />
                          </div>
                          <div className="w-full h-[500px] hidden md:block">
                            <List
                              key={listKey}
                              height={500}
                              width="100%"
                              rowComponent={MemoIssuedAssetRow}
                              rowCount={relevantAssets.length}
                              rowHeight={90}
                              rowProps={assetRowProps}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-12">
                          <Spinner className="size-6 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
                          <p className="text-foreground/70 text-sm">
                            {t("CreditBorrow:common.loading")}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "pools" && (
                <div>
                  {relevantAssets.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Layers className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-2-fg)/0.7)] text-[hsl(var(--accent-2-fg)/0.8)]" />
                      <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-2-fg)/0.7)] text-[hsl(var(--accent-2-fg)/0.8)]">
                        {t("IssuedAssets:listingPools", { count: relevantAssets.length })}
                      </span>
                    </div>
                  )}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <Empty className="mt-2 border border-dashed border-[hsl(var(--accent-2)/0.2)] rounded-xl bg-[hsl(var(--accent-2)/0.03)]">
                      <EmptyHeader>
                        <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-2)/0.15)] text-[hsl(var(--accent-2-fg))]">
                          <Layers className="w-6 h-6" />
                        </EmptyMedia>
                        <EmptyTitle className="text-foreground/80">{t("IssuedAssets:noPools")}</EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button asChild className="bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-2))] hover:to-[hsl(var(--accent-2))] text-[hsl(var(--accent-2-gradFg))] border-0">
                          <a href="/create_pool.html">
                            {t("PageHeader:create_pool")}
                          </a>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <>
                      {dynamicData && dynamicData.length ? (
                        <>
                          <div className="w-full h-[500px] block md:hidden">
                            <List
                              key={listKey}
                              height={500}
                              width="100%"
                              rowComponent={MemoIssuedAssetRow}
                              rowCount={relevantAssets.length}
                              rowHeight={90}
                              rowProps={assetRowProps}
                            />
                          </div>
                          <div className="w-full h-[500px] hidden md:block">
                            <List
                              key={listKey}
                              height={500}
                              width="100%"
                              rowComponent={MemoIssuedAssetRow}
                              rowCount={relevantAssets.length}
                              rowHeight={90}
                              rowProps={assetRowProps}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-12">
                          <Spinner className="size-6 dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]" />
                          <p className="text-foreground/70 text-sm">
                            {t("CreditBorrow:common.loading")}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "smartcoins" && (
                <div>
                  {relevantAssets.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Droplets className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                      <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                        {t("IssuedAssets:listingSmartcoins", { count: relevantAssets.length })}
                      </span>
                    </div>
                  )}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <Empty className="mt-2 border border-dashed border-[hsl(var(--accent-1)/0.2)] rounded-xl bg-[hsl(var(--accent-1)/0.03)]">
                      <EmptyHeader>
                        <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
                          <Droplets className="w-6 h-6" />
                        </EmptyMedia>
                        <EmptyTitle className="text-foreground/80">
                          {t("IssuedAssets:noSmartcoins")}
                        </EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button asChild className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] border-0">
                          <a href="/create_smartcoin.html">
                            {t("PageHeader:create_smartcoin")}
                          </a>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <>
                      <div className="w-full h-[500px] block md:hidden">
                        <List
                              key={listKey}
                              height={500}
                              width="100%"
                              rowComponent={MemoIssuedAssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={assetRowProps}
                        />
                      </div>
                      <div className="w-full h-[500px] hidden md:block">
                        <List
                              key={listKey}
                              height={500}
                              width="100%"
                              rowComponent={MemoIssuedAssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={assetRowProps}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "nft" && (
                <div>
                  {relevantAssets.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Image className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-3-fg)/0.7)] text-[hsl(var(--accent-3-fg)/0.8)]" />
                      <span className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-3-fg)/0.7)] text-[hsl(var(--accent-3-fg)/0.8)]">
                        {t("IssuedAssets:listingNFTs", { count: relevantAssets.length })}
                      </span>
                    </div>
                  )}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <Empty className="mt-2 border border-dashed border-[hsl(var(--accent-3)/0.2)] rounded-xl bg-[hsl(var(--accent-3)/0.03)]">
                      <EmptyHeader>
                        <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-3)/0.15)] text-[hsl(var(--accent-3-fg))]">
                          <Image className="w-6 h-6" />
                        </EmptyMedia>
                        <EmptyTitle className="text-foreground/80">{t("IssuedAssets:noNFTs")}</EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <>
                      <div className="w-full h-[500px] block md:hidden">
                        <List
                              key={listKey}
                              height={500}
                              width="100%"
                              rowComponent={MemoIssuedAssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={assetRowProps}
                        />
                      </div>
                      <div className="w-full h-[500px] hidden md:block">
                        <List
                              key={listKey}
                              height={500}
                              width="100%"
                              rowComponent={MemoIssuedAssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={assetRowProps}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
