import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  StarIcon,
  StarFilledIcon,
} from "@radix-ui/react-icons";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  $favouriteAssets,
  addFavouriteAsset,
  removeFavouriteAsset,
} from "@/stores/favourites.ts";

import ExternalLink from "./common/ExternalLink.jsx";
import { humanReadableFloat } from "@/lib/common";

function RowHyperlink({
  id,
  share_asset_symbol,
  asset_a_symbol,
  asset_b_symbol,
}) {
  return (
    <div className="grid grid-cols-10">
      <div className="col-span-1">
        <p>{id}</p>
      </div>
      <div className="col-span-3">
        <p>{share_asset_symbol}</p>
      </div>
      <div className="col-span-3">
        <p>{asset_a_symbol}</p>
      </div>
      <div className="col-span-3">
        <p>{asset_b_symbol}</p>
      </div>
    </div>
  );
}

function PoolDialog({ poolArray, dialogTitle, dialogDescription, t }) {
  if (!poolArray || !poolArray.length) return null;

  const PoolRow = ({ index, style }) => {
    const pool = poolArray[index];
    return (
      <a
        style={style}
        href={`/swap/index.html?pool=${pool.id}`}
        key={`a_${pool.id}`}
      >
        <RowHyperlink
          id={pool.id}
          share_asset_symbol={pool.share_asset_symbol}
          asset_a_symbol={pool.asset_a_symbol}
          asset_b_symbol={pool.asset_b_symbol}
        />
      </a>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white hover:shadow-lg">
          {t("PortfolioTabs:pools")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] bg-white">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1">
          <div className="grid grid-cols-10">
            <div className="col-span-1">{t("PoolDialogs:idColumnTitle")}</div>
            <div className="col-span-3">
              {t("PoolDialogs:shareAssetColumnTitle")}
            </div>
            <div className="col-span-3">
              {t("PoolDialogs:assetAColumnTitle")}
            </div>
            <div className="col-span-3">
              {t("PoolDialogs:assetBColumnTitle")}
            </div>
          </div>
          <div className="w-full max-h-[300px] overflow-auto">
            <List
              rowComponent={PoolRow}
              rowCount={poolArray.length}
              rowHeight={35}
              rowProps={{}}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PortfolioBalances({
  _assetsBTS,
  _assetsTEST,
  _poolsBTS,
  _poolsTEST,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
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
  const favouriteAssets = useStore($favouriteAssets);

  const [sortType, setSortType] = useState("default");
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSortClick = (type) => {
    if (type === sortType) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortType(type);
      // Sensible defaults per sort: alphabetical asc, amount desc, default asc
      setSortDirection(type === "amount" ? "desc" : "asc");
    }
  };

  const _chain = useMemo(() => {
    if (usr && usr.chain) return usr.chain;
    return "bitshares";
  }, [usr]);

  const assets = useMemo(() => {
    if (!_chain || (!_assetsBTS && !_assetsTEST)) return [];
    if (_chain !== "bitshares") return _assetsTEST;
    const relevantAssets = _assetsBTS.filter((asset) => {
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(asset.issuer)))
      );
    });
    return relevantAssets;
  }, [blocklist, _assetsBTS, _assetsTEST, _chain]);

  const pools = useMemo(() => {
    if (!_chain || (!_poolsBTS && !_poolsTEST)) return [];
    if (_chain !== "bitshares") return _poolsTEST;
    const relevantPools = _poolsBTS.filter((pool) => {
      const poolShareAsset = assets.find(
        (asset) => asset.id === pool.share_asset_id
      );
      if (!poolShareAsset) return false;
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(poolShareAsset.issuer)))
      );
    });
    return relevantPools;
  }, [assets, blocklist, _poolsBTS, _poolsTEST, _chain]);

  const chainFavourites = useMemo(() => {
    if (!favouriteAssets) return [];
    return favouriteAssets[_chain] ?? [];
  }, [favouriteAssets, _chain]);

  useInitCache(_chain ?? "bitshares", []);

  const [balanceCounter, setBalanceCounter] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalancesStore;
    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);
      unsubscribeUserBalancesStore = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            const updatedData = data
              .filter((balance) =>
                assets.find((x) => x.id === balance.asset_id)
              )
              .map((balance) => ({
                ...balance,
                symbol: assets.find((x) => x.id === balance.asset_id).symbol,
              }));
            setBalances(updatedData);
          }
        }
      );
    }
    return () => {
      if (unsubscribeUserBalancesStore) unsubscribeUserBalancesStore();
    };
  }, [usr, balanceCounter, assets, currentNode]);

  const sortedUserBalances = useMemo(() => {
    if (!balances || !balances.length) return [];
    const balancesCopy = [...balances];

    const extractIdNumber = (assetId) => {
      // Expect formats like "1.3.0"; fall back gracefully
      const parts = String(assetId).split(".");
      const maybe = parseInt(parts[2] ?? parts[parts.length - 1], 10);
      return Number.isFinite(maybe) ? maybe : 0;
    };

    const cmp = (a, b) => {
      let r = 0;
      if (sortType === "alphabetical") {
        r = a.symbol.localeCompare(b.symbol);
      } else if (sortType === "amount") {
        r = parseInt(a.amount, 10) - parseInt(b.amount, 10);
      } else {
        r = extractIdNumber(a.asset_id) - extractIdNumber(b.asset_id);
      }
      return sortDirection === "asc" ? r : -r;
    };

    return balancesCopy.sort(cmp);
  }, [balances, sortType, sortDirection]);

  const BalanceRow = ({ index, style }) => {
    const rowBalance = sortedUserBalances[index];
    const currentAsset = assets.find(
      (asset) => asset.id === rowBalance.asset_id
    ) || {
      symbol: rowBalance.asset_id,
      precision: 5,
    };

    const isFavourited = useMemo(() => {
      if (!currentAsset || !currentAsset.id) return false;
      return chainFavourites.some((a) => a.id === currentAsset.id);
    }, [chainFavourites, currentAsset]);

    const onToggleFavourite = () => {
      if (!currentAsset || !currentAsset.id) return;
      const assetObj = {
        symbol: currentAsset.symbol,
        id: currentAsset.id,
        issuer: currentAsset.issuer ?? "",
      };
      if (isFavourited) {
        removeFavouriteAsset(_chain, assetObj);
      } else {
        addFavouriteAsset(_chain, assetObj);
      }
    };

    const readableBalance = humanReadableFloat(
      rowBalance.amount,
      currentAsset.precision
    ).toLocaleString(undefined, {
      minimumFractionDigits: currentAsset.precision,
    });

    const relevantPools = pools.filter(
      (pool) =>
        pool.asset_a_symbol === currentAsset.symbol ||
        pool.asset_b_symbol === currentAsset.symbol
    );

    return (
      <div style={{ ...style, marginBottom: "8px" }}>
        <Card className="hover:bg-gray-50">
          <div className="grid grid-cols-6">
            <div className="col-span-3 text-left">
              <CardHeader className="pt-3 pb-3">
                <CardTitle>
                  <ExternalLink
                    variant="outline"
                    classnamecontents="mt-2 hover:text-blue-500"
                    type="text"
                    text={t("PortfolioTabs:assetTitle", {
                      symbol: currentAsset.symbol,
                      assetId: rowBalance.asset_id,
                    })}
                    hyperlink={`https://explorer.bitshares.ws/#/assets/${
                      currentAsset.symbol
                    }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                  />
                </CardTitle>
                <CardDescription>
                  {t("PortfolioTabs:liquidAmount", { amount: readableBalance })}
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-3 text-right mr-3 mt-4">
              <a
                href={`/dex/index.html?market=${currentAsset.symbol}_${
                  currentAsset.symbol === "BTS" ? "CNY" : "BTS"
                }`}
              >
                <Button
                  variant="outline"
                  className="mr-2 hover:shadow-lg bg-white"
                >
                  {t("PortfolioTabs:tradeButton")}
                </Button>
              </a>

              <a
                href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${currentAsset.symbol}`}
              >
                <Button
                  variant="outline"
                  className="mr-2 hover:shadow-lg bg-white"
                >
                  {t("IssuedAssets:creditBorrow")}
                </Button>
              </a>

              <a href={`/lend/index.html?asset=${currentAsset.symbol}`}>
                <Button
                  variant="outline"
                  className="mr-2 hover:shadow-lg bg-white"
                >
                  {t("IssuedAssets:creditLend")}
                </Button>
              </a>

              {currentAsset.bitasset_data_id ? (
                <a href={`/smartcoin/index.html?id=${currentAsset.id}`}>
                  <Button
                    variant="outline"
                    className="mr-2 hover:shadow-lg bg-white"
                  >
                    {t("IssuedAssets:proceedToBorrow")}
                  </Button>
                </a>
              ) : null}

              <HoverCard>
                <HoverCardTrigger asChild>
                  <PoolDialog
                    poolArray={relevantPools}
                    t={t}
                    dialogTitle={t("PoolDialogs:assetAPoolsDialogTitle", {
                      assetA: currentAsset.symbol,
                    })}
                    dialogDescription={t(
                      "PoolDialogs:assetAPoolsDialogDescription",
                      {
                        assetA: currentAsset.symbol,
                        assetAId: currentAsset.id,
                      }
                    )}
                  />
                </HoverCardTrigger>
                <HoverCardContent className="w-60 bg-white">
                  {t("PoolDialogs:assetAHoverCardContent", {
                    assetA: currentAsset.symbol,
                  })}
                </HoverCardContent>
              </HoverCard>

              <Button
                variant="outline"
                className="ml-2 bg-white hover:shadow-lg"
                onClick={onToggleFavourite}
                aria-label={isFavourited ? "Unfavourite" : "Favourite"}
                title={isFavourited ? "Unfavourite" : "Favourite"}
              >
                {isFavourited ? (
                  <StarFilledIcon className="h-4 w-4 text-yellow-500" />
                ) : (
                  <StarIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 mt-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              {t("PortfolioTabs:accountBalances", { username: usr?.username })}
            </CardTitle>
            <CardDescription>
              {t("PortfolioTabs:accountBalancesDescription")}
              <br />
              <div className="grid grid-cols-3 gap-3 mt-2">
                <Button
                  onClick={() => handleSortClick("default")}
                  variant={sortType === "default" ? "" : "outline"}
                >
                  {t("PortfolioTabs:default")}
                  {" (ID) "}
                  {sortType === "default" ? (
                    sortDirection === "asc" ? (
                      <ChevronUpIcon className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    )
                  ) : null}
                </Button>
                <Button
                  onClick={() => handleSortClick("alphabetical")}
                  variant={sortType === "alphabetical" ? "" : "outline"}
                >
                  {t("PortfolioTabs:alphabetical")}
                  {sortType === "alphabetical" ? (
                    sortDirection === "asc" ? (
                      <ChevronUpIcon className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    )
                  ) : null}
                </Button>
                <Button
                  onClick={() => handleSortClick("amount")}
                  variant={sortType === "amount" ? "" : "outline"}
                >
                  {t("PortfolioTabs:amount")}
                  {sortType === "amount" ? (
                    sortDirection === "asc" ? (
                      <ChevronUpIcon className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    )
                  ) : null}
                </Button>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedUserBalances && sortedUserBalances.length ? (
              <div className="gaps-2 max-h-[500px] overflow-auto">
                <List
                  rowComponent={BalanceRow}
                  rowCount={sortedUserBalances.length}
                  rowHeight={80}
                  rowProps={{}}
                />
              </div>
            ) : (
              <p>{t("PortfolioTabs:noBalancesFound")}</p>
            )}
          </CardContent>
          <div className="px-6 pb-6">
            <Button
              onClick={() => {
                setBalances();
                setBalanceCounter(balanceCounter + 1);
              }}
            >
              {t("PortfolioTabs:refreshBalancesButton")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
