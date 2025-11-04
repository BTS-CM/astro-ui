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

import { Button } from "@/components/ui/button";

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
    // reset selection to avoid re-adding
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

  const Row = ({ index, style }) => {
    const item = chainFavourites[index];

    if (!item) {
      return;
    }

    const assetDetails = fullFavouriteAssetData.find((a) => a.id === item.id);

    const showIssuerActions = !!(
      currentUser?.id &&
      item?.issuer &&
      currentUser.id === item.issuer &&
      (!currentUser.chain || currentUser.chain === _chain)
    );

    const fullAsset = favouriteAssets.find((a) => a.id === item.id);

    const relevantDynamicData = dynamicData.find(
      (data) => data.id === fullAsset.id.replace("1.3.", "2.3.")
    );

    const relevantBitassetData = fullAsset.bitasset_data_id
      ? bitassetData.find((data) => data.id === fullAsset.bitasset_data_id)
      : null;

    return (
      <div style={{ ...style, paddingRight: "10px" }}>
        <Card className="mb-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors rounded-xl block md:hidden">
          <CardHeader className="px-4 py-4">
            <div className="space-y-1">
              <CardTitle className="text-base text-slate-900">{`${item.symbol} (${item.id})`}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("Favourites:issuer", { issuer: item.issuer })}
              </CardDescription>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {t("IssuedAssets:userActions")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <a
                    href={`/dex/index.html?market=${item.symbol}_$${
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
                />
              ) : null}

              <Button
                variant="default"
                size="sm"
                onClick={() => removeFavouriteAsset(_chain, item)}
              >
                ❌
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="mb-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors rounded-xl hidden md:block">
          <CardHeader className="px-4 py-4 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base text-slate-900">{`${item.symbol} (${item.id})`}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("Favourites:issuer", { issuer: item.issuer })}
              </CardDescription>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {t("IssuedAssets:userActions")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <a
                      href={`/dex/index.html?market=${item.symbol}_$${
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
                  />
                ) : null}

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => removeFavouriteAsset(_chain, item)}
                >
                  ❌
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
              chain={_chain}
              balances={null}
              triggerLabel={t("Favourites:addAsset")}
              triggerVariant="outline"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {chainFavourites && chainFavourites.length ? (
            <>
              {loading ? (
                <div className="text-center mt-5">
                  {t("CreditBorrow:common.loading")}
                </div>
              ) : (
                <>
                  <div className="w-full max-h-[420px] overflow-auto block md:hidden">
                    <List
                      rowComponent={Row}
                      rowCount={chainFavourites.length}
                      rowHeight={128}
                      rowProps={{}}
                    />
                  </div>
                  <div className="w-full max-h-[420px] overflow-auto hidden md:block">
                    <List
                      rowComponent={Row}
                      rowCount={chainFavourites.length}
                      rowHeight={96}
                      rowProps={{}}
                    />
                  </div>
                </>
              )}
            </>
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
        <CardContent className="p-4">
          {chainPairs && chainPairs.length ? (
            <>
              <div className="w-full max-h-[420px] overflow-auto block md:hidden">
                <List
                  rowComponent={({ index, style }) => {
                    const pair = chainPairs[index];
                    if (!pair) return null;
                    return (
                      <div style={{ ...style, paddingRight: "10px" }}>
                        <Card className="mb-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors rounded-xl">
                          <CardHeader className="px-4 py-4">
                            <div className="space-y-1">
                              <CardTitle className="text-base text-slate-900">
                                {pair}
                              </CardTitle>
                            </div>
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
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
                                        chain={_chain}
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
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  removeFavouritePair(_chain, pair)
                                }
                              >
                                ❌
                              </Button>
                            </div>
                          </CardHeader>
                        </Card>
                      </div>
                    );
                  }}
                  rowCount={chainPairs.length}
                  rowHeight={120}
                  rowProps={{}}
                />
              </div>

              <div className="w-full max-h-[420px] overflow-auto hidden md:block">
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
                                        chain={_chain}
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
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  removeFavouritePair(_chain, pair)
                                }
                              >
                                ❌
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
            </>
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
                chain={_chain}
                excludedUsers={[]}
                setChosenAccount={setSelectedUser}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-4">
          {favouriteUsers && (favouriteUsers[_chain] ?? []).length ? (
            <>
              <div className="w-full max-h-[420px] overflow-auto block md:hidden">
                <List
                  rowComponent={({ index, style }) => {
                    const user = favouriteUsers[_chain][index];
                    if (!user) return null;
                    return (
                      <div style={{ ...style, paddingRight: "10px" }}>
                        <Card className="mb-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                          <CardHeader className="px-4 py-4">
                            <div className="space-y-1">
                              <CardTitle className="text-base text-slate-900">{`${user.name}`}</CardTitle>
                              <CardDescription className="text-xs text-muted-foreground">
                                {user.id}
                              </CardDescription>
                            </div>
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <a
                                href={`/transfer/index.html?to=${encodeURIComponent(
                                  user.name
                                )}`}
                              >
                                <Button variant="outline" size="sm">
                                  {t("Favourites:transfer")}
                                </Button>
                              </a>
                              <a
                                href={`/timed_transfer/index.html?to=${encodeURIComponent(
                                  user.name
                                )}`}
                              >
                                <Button variant="outline" size="sm">
                                  {t("Favourites:timedTransfer")}
                                </Button>
                              </a>
                              <a
                                href={`/create_vesting/index.html?to=${encodeURIComponent(
                                  user.name
                                )}`}
                              >
                                <Button variant="outline" size="sm">
                                  {t("Favourites:vestAssets")}
                                </Button>
                              </a>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  removeFavouriteUser(_chain, user)
                                }
                              >
                                ❌
                              </Button>
                            </div>
                          </CardHeader>
                        </Card>
                      </div>
                    );
                  }}
                  rowCount={favouriteUsers[_chain].length}
                  rowHeight={120}
                  rowProps={{}}
                />
              </div>

              <div className="w-full max-h-[420px] overflow-auto hidden md:block">
                <List
                  rowComponent={({ index, style }) => {
                    const user = favouriteUsers[_chain][index];
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
                                  href={`/transfer/index.html?to=${encodeURIComponent(
                                    user.name
                                  )}`}
                                >
                                  <Button variant="outline" size="sm">
                                    {t("Favourites:transfer")}
                                  </Button>
                                </a>
                                <a
                                  href={`/timed_transfer/index.html?to=${encodeURIComponent(
                                    user.name
                                  )}`}
                                >
                                  <Button variant="outline" size="sm">
                                    {t("Favourites:timedTransfer")}
                                  </Button>
                                </a>
                                <a
                                  href={`/create_vesting/index.html?to=${encodeURIComponent(
                                    user.name
                                  )}`}
                                >
                                  <Button variant="outline" size="sm">
                                    {t("Favourites:vestAssets")}
                                  </Button>
                                </a>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() =>
                                    removeFavouriteUser(_chain, user)
                                  }
                                >
                                  ❌
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </div>
                    );
                  }}
                  rowCount={favouriteUsers[_chain].length}
                  rowHeight={88}
                  rowProps={{}}
                />
              </div>
            </>
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
