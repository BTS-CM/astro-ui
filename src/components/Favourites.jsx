import React, { useMemo, useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";
import { Button } from "@/components/ui/button";

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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import {
  $favouriteAssets,
  addFavouriteAsset,
  removeFavouriteAsset,
} from "@/stores/favourites.ts";
import {
  $favouriteUsers,
  addFavouriteUser,
  removeFavouriteUser,
} from "@/stores/favourites.ts";
import {
  $favouritePairs,
  addFavouritePair,
  removeFavouritePair,
} from "@/stores/favourites.ts";
import { $currentNode } from "@/stores/node.ts";
import { $currentUser } from "@/stores/users.ts";
import AccountSearch from "@/components/AccountSearch.jsx";
import PoolDialogs from "@/components/Market/PoolDialogs.jsx";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import AssetIssuerActions from "@/components/AssetIssuerActions.jsx";

/**
 * Favourites list view
 * Props:
 *  - _assetsBTS: full asset objects (BTS)
 *  - _assetsTEST: full asset objects (TESTNET)
 *  - _marketSearchBTS: market search compressed list (BTS)
 *  - _marketSearchTEST: market search compressed list (TESTNET)
 */
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
  const currentUser = useStore($currentUser);
  const favourites = useStore($favouriteAssets);
  const favouriteUsers = useStore($favouriteUsers);
  const favouritePairs = useStore($favouritePairs);

  const chain = useMemo(() => {
    // Fall back to bitshares if chain not initialised yet
    if (currentNode && currentNode.chain) return currentNode.chain;
    return "bitshares";
  }, [currentNode]);

  const assets = useMemo(() => {
    if (chain === "bitshares") return _assetsBTS ?? [];
    return _assetsTEST ?? [];
  }, [_assetsBTS, _assetsTEST, chain]);

  const assetMap = useMemo(() => {
    if (!assets || !assets.length) return new Map();
    const map = new Map();
    assets.forEach((asset) => {
      if (asset && asset.id) {
        map.set(asset.id, asset);
      }
    });
    return map;
  }, [assets]);

  const marketSearch = useMemo(() => {
    if (chain === "bitshares") return _marketSearchBTS ?? [];
    return _marketSearchTEST ?? [];
  }, [_marketSearchBTS, _marketSearchTEST, chain]);

  const chainFavourites = useMemo(() => {
    if (!favourites) return [];
    return favourites[chain] ?? [];
  }, [favourites, chain]);

  const chainPairs = useMemo(() => {
    if (!favouritePairs) return [];
    return favouritePairs[chain] ?? [];
  }, [favouritePairs, chain]);

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
      addFavouriteAsset(chain, {
        symbol: found.symbol,
        id: found.id,
        issuer: found.issuer,
      });
    }
    // reset selection to avoid re-adding
    setAddSelection(undefined);
  }, [addSelection, assets, chain]);

  // Handle user selection from dialog
  useEffect(() => {
    if (!selectedUser) return;
    addFavouriteUser(chain, { name: selectedUser.name, id: selectedUser.id });
    setSelectedUser(undefined);
    setUserDialogOpen(false);
  }, [selectedUser, chain]);

  // Reset pair selections when closing the dialog
  useEffect(() => {
    if (!pairDialogOpen) {
      setPairBaseSelection(undefined);
      setPairQuoteSelection(undefined);
    }
  }, [pairDialogOpen]);

  const Row = ({ index, style }) => {
    const item = chainFavourites[index];
    if (!item) return null;
    const assetDetails = assetMap.get(item.id);
    const showIssuerActions = !!(
      currentUser?.id &&
      item?.issuer &&
      currentUser.id === item.issuer &&
      (!currentUser.chain || currentUser.chain === chain)
    );
    console.log({ item, assetDetails });
    return (
      <div style={{ ...style, paddingRight: "10px" }}>
        <Card className="mb-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors rounded-xl">
          <CardHeader className="px-4 py-4 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base text-slate-900">{`${item.symbol} (${item.id})`}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("Favourites:issuer", { issuer: item.issuer })}
              </CardDescription>
            </div>
            <div>
              <div className="flex items-center gap-2">
                {/* User actions like IssuedAssets */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {t("IssuedAssets:userActions")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <a
                      href={`/dex/index.html?market=${item.symbol}_${
                        item.symbol === "BTS" ? "CNY" : "BTS"
                      }`}
                    >
                      <DropdownMenuItem>
                        {t("IssuedAssets:proceedToTrade")}
                      </DropdownMenuItem>
                    </a>
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${item.symbol}`}
                    >
                      <DropdownMenuItem>
                        {t("IssuedAssets:creditBorrow")}
                      </DropdownMenuItem>
                    </a>
                    <a href={`/lend/index.html?asset=${item.symbol}`}>
                      <DropdownMenuItem>
                        {t("IssuedAssets:creditLend")}
                      </DropdownMenuItem>
                    </a>
                    {assetDetails.bitasset_data_id ? (
                      <a href={`/smartcoin/index.html?id=${item.id}`}>
                        <DropdownMenuItem>
                          {t("IssuedAssets:proceedToBorrow")}
                        </DropdownMenuItem>
                      </a>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Issuer actions link to create/manage pages */}
                {showIssuerActions && assetDetails ? (
                  <AssetIssuerActions
                    asset={assetDetails}
                    chain={chain}
                    currentUser={currentUser}
                    node={currentNode}
                    buttonVariant="outline"
                    buttonSize="sm"
                  />
                ) : null}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeFavouriteAsset(chain, item)}
                >
                  {t("Favourites:remove")}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-10 max-w-4xl">
      {/* Favourite Assets Card */}
      <Card className="mb-8 rounded-xl overflow-hidden">
        <CardHeader className="px-5 py-4 flex flex-row items-center justify-between bg-slate-50 border-b">
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
            {t("Favourites:assetsHeader")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <AssetDropDown
              assetSymbol={""}
              assetData={null}
              storeCallback={setAddSelection}
              otherAsset={null}
              marketSearch={marketSearch}
              type={null}
              chain={chain}
              balances={null}
              triggerLabel={t("Favourites:addAsset")}
              triggerVariant="outline"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {chainFavourites && chainFavourites.length ? (
            <div className="w-full max-h-[420px] overflow-auto">
              <List
                rowComponent={Row}
                rowCount={chainFavourites.length}
                rowHeight={96}
                rowProps={{}}
              />
            </div>
          ) : (
            <Empty className="mt-2">
              <EmptyHeader>
                <EmptyMedia variant="icon">⭐</EmptyMedia>
                <EmptyTitle>{t("Favourites:assetsEmptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("Favourites:assetsEmptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      {/* Favourite Market Pairs Card */}
      <Card className="mb-8 rounded-xl overflow-hidden">
        <CardHeader className="px-5 py-4 flex flex-row items-center justify-between bg-slate-50 border-b">
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
            {t("Favourites:pairsHeader")}
          </CardTitle>
          <Dialog
            open={pairDialogOpen}
            onOpenChange={(open) => setPairDialogOpen(open)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="hover:shadow-md">
                {t("Favourites:addPair")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] bg-white">
              <DialogHeader>
                <DialogTitle>{t("Favourites:addPairDialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("Favourites:addPairDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3">
                <AssetDropDown
                  assetSymbol={pairBaseSelection}
                  assetData={null}
                  storeCallback={setPairBaseSelection}
                  otherAsset={pairQuoteSelection}
                  marketSearch={marketSearch}
                  type="base"
                  chain={chain}
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
                  chain={chain}
                  balances={null}
                  triggerLabel={
                    pairQuoteSelection
                      ? `${t("Favourites:selectQuote")}: ${pairQuoteSelection}`
                      : t("Favourites:selectQuote")
                  }
                  triggerVariant="outline"
                />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="mr-3">
                    {t("Favourites:selectBase")}:
                    <strong className="ml-1">{pairBaseSelection || "—"}</strong>
                  </span>
                  <span>
                    {t("Favourites:selectQuote")}:
                    <strong className="ml-1">
                      {pairQuoteSelection || "—"}
                    </strong>
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
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
                        addFavouritePair(chain, pair);
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
        <CardContent className="p-4">
          {chainPairs && chainPairs.length ? (
            <div className="w-full max-h-[420px] overflow-auto">
              <List
                rowComponent={({ index, style }) => {
                  const pair = chainPairs[index];
                  if (!pair) return null;
                  return (
                    <div style={{ ...style, paddingRight: "10px" }}>
                      <Card className="mb-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors rounded-xl">
                        <CardHeader className="px-4 py-4 flex flex-row items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base text-slate-900">
                              {pair}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={`/dex/index.html?market=${pair}`}>
                              <Button variant="outline" size="sm">
                                {t("Favourites:trade")}
                              </Button>
                            </a>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  {t("PageHeader:pools")}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[820px] bg-white">
                                {(() => {
                                  const [assetA, assetB] = pair.split("_");
                                  const assetAData = assets.find(
                                    (a) => a.symbol === assetA
                                  ) || {
                                    id: assetA,
                                    symbol: assetA,
                                  };
                                  const assetBData = assets.find(
                                    (a) => a.symbol === assetB
                                  ) || {
                                    id: assetB,
                                    symbol: assetB,
                                  };
                                  return (
                                    <PoolDialogs
                                      assetA={assetA}
                                      assetB={assetB}
                                      assetAData={assetAData}
                                      assetBData={assetBData}
                                      chain={chain}
                                      _assetsBTS={_assetsBTS}
                                      _assetsTEST={_assetsTEST}
                                      _poolsBTS={_poolsBTS}
                                      _poolsTEST={_poolsTEST}
                                    />
                                  );
                                })()}
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeFavouritePair(chain, pair)}
                            >
                              {t("Favourites:remove")}
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    </div>
                  );
                }}
                rowCount={chainPairs.length}
                rowHeight={88}
                rowProps={{}}
              />
            </div>
          ) : (
            <Empty className="mt-2">
              <EmptyHeader>
                <EmptyMedia variant="icon">🔗</EmptyMedia>
                <EmptyTitle>{t("Favourites:pairsEmptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("Favourites:pairsEmptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      {/* Favourite Users Card */}
      <Card className="rounded-xl overflow-hidden">
        <CardHeader className="px-5 py-4 flex flex-row items-center justify-between bg-slate-50 border-b">
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
            {t("Favourites:usersHeader")}
          </CardTitle>
          <Dialog
            open={userDialogOpen}
            onOpenChange={(open) => setUserDialogOpen(open)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="hover:shadow-md">
                {t("Favourites:addUser")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px] bg-white">
              <DialogHeader>
                <DialogTitle>{t("Favourites:addUserDialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("Favourites:addUserDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <AccountSearch
                chain={chain}
                excludedUsers={[]}
                setChosenAccount={setSelectedUser}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-4">
          {favouriteUsers && (favouriteUsers[chain] ?? []).length ? (
            <div className="w-full max-h-[420px] overflow-auto">
              <List
                rowComponent={({ index, style }) => {
                  const user = favouriteUsers[chain][index];
                  if (!user) return null;
                  return (
                    <div style={{ ...style, paddingRight: "10px" }}>
                      <Card className="mb-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                        <CardHeader className="px-4 py-4 flex flex-row items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base text-slate-900">{`${user.name}`}</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                              {user.id}
                            </CardDescription>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <a
                                href={`/transfer/index.html?to=${encodeURIComponent(user.name)}`}
                              >
                                <Button variant="outline" size="sm">
                                  {t("Favourites:transfer")}
                                </Button>
                              </a>
                              <a
                                href={`/timed_transfer/index.html?to=${encodeURIComponent(user.name)}`}
                              >
                                <Button variant="outline" size="sm">
                                  {t("Favourites:timedTransfer")}
                                </Button>
                              </a>
                              <a
                                href={`/create_vesting/index.html?to=${encodeURIComponent(user.name)}`}
                              >
                                <Button variant="outline" size="sm">
                                  {t("Favourites:vestAssets")}
                                </Button>
                              </a>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeFavouriteUser(chain, user)}
                              >
                                {t("Favourites:remove")}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </div>
                  );
                }}
                rowCount={favouriteUsers[chain].length}
                rowHeight={88}
                rowProps={{}}
              />
            </div>
          ) : (
            <Empty className="mt-2">
              <EmptyHeader>
                <EmptyMedia variant="icon">👤</EmptyMedia>
                <EmptyTitle>{t("Favourites:usersEmptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("Favourites:usersEmptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
