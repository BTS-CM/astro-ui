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
import { $currentNode } from "@/stores/node.ts";
import { $currentUser } from "@/stores/users.ts";
import AccountSearch from "@/components/AccountSearch.jsx";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const { _assetsBTS, _assetsTEST, _marketSearchBTS, _marketSearchTEST } =
    properties;

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);
  const currentUser = useStore($currentUser);
  const favourites = useStore($favouriteAssets);
  const favouriteUsers = useStore($favouriteUsers);

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

  const [addSelection, setAddSelection] = useState();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState();

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
                    <a href={`/dex/index.html?market=${item.symbol}_BTS`}>
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
                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${item.symbol}`}
                    >
                      <DropdownMenuItem>
                        {t("IssuedAssets:creditLend")}
                      </DropdownMenuItem>
                    </a>
                    <a href={`/smartcoin/index.html?id=${item.id}`}>
                      <DropdownMenuItem>
                        {t("IssuedAssets:proceedToBorrow")}
                      </DropdownMenuItem>
                    </a>
                    <a href={`/predictions/index.html?id=${item.id}`}>
                      <DropdownMenuItem>
                        {t("IssuedAssets:pmaBet")}
                      </DropdownMenuItem>
                    </a>
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
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeFavouriteUser(chain, user)}
                            >
                              {t("Favourites:remove")}
                            </Button>
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
