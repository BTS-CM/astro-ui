import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { List } from "react-window";

import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { $poolTrackers, updateTrackers } from "@/stores/poolTracker";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentUser } from "@/stores/users";
import { $currentNode } from "@/stores/node.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import BasicAssetDropDownCard from "@/components/Market/BasicAssetDropDownCard.jsx";

export default function CustomPoolOverview(properties) {
  const {
    _assetsBTS,
    _assetsTEST,
    _poolsBTS,
    _poolsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
  } = properties;

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);
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

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && assets && assets.length) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setUsrBalances(filteredData);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assets]);

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);

  const pools = useMemo(() => {
    if (!_chain || !blocklist || (!_poolsBTS && !_poolsTEST)) {
      return [];
    }

    if (_chain !== "bitshares") {
      return _poolsTEST;
    }

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

  const trackers = useStore($poolTrackers);
  const [modalOpen, setModalOpen] = useState(false);

  const [newTrackerTitle, setNewTrackerTitle] = useState("");
  const [selectedPools, setSelectedPools] = useState([]);

  const chosenPools = useMemo(() => {
    if (!pools || !selectedPools || !selectedPools.length) {
      return null;
    }
    return pools.filter((pool) => selectedPools.includes(pool.id));
  }, [pools, selectedPools]);

  const chosenPoolSwappableAssets = useMemo(() => {
    if (!assets || !chosenPools || !chosenPools.length) {
      return null;
    }
    const _assets = [];
    chosenPools.forEach((pool) => {
      const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
      const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
      if (assetA && !_assets.includes(assetA.symbol)) {
        _assets.push(assetA.symbol);
      }
      if (assetB && !_assets.includes(assetB.symbol)) {
        _assets.push(assetB.symbol);
      }
    });
    return _assets;
  }, [assets, chosenPools]);

  const [sellingAsset, setSellingAsset] = useState(null);
  const [buyingAsset, setBuyingAsset] = useState(null);

  const buyingAssetData = useMemo(() => {
    if (!assets || !buyingAsset) {
      return null;
    }
    return assets.find((asset) => asset.symbol === buyingAsset);
  }, [assets, buyingAsset]);

  const sellingAssetData = useMemo(() => {
    if (!assets || !sellingAsset) {
      return null;
    }
    return assets.find((asset) => asset.symbol === sellingAsset);
  }, [assets, sellingAsset]);

  const remainingPools = useMemo(() => {
    if (!pools || !assets) {
      return null;
    }

    let _remainingPools = pools;

    if (buyingAssetData || sellingAssetData) {
      _remainingPools = pools.filter((pool) => {
        const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
        const assetB = assets.find((asset) => asset.id === pool.asset_b_id);

        if (!assetA || !assetB) {
          return false;
        }

        const matchesBuyingAsset = buyingAssetData
          ? assetA.symbol === buyingAssetData.symbol ||
            assetB.symbol === buyingAssetData.symbol
          : true;

        const matchesSellingAsset = sellingAssetData
          ? assetA.symbol === sellingAssetData.symbol ||
            assetB.symbol === sellingAssetData.symbol
          : true;

        if (buyingAssetData && !sellingAssetData) {
          return !selectedPools.includes(pool.id) && matchesBuyingAsset;
        }

        if (!buyingAssetData && sellingAssetData) {
          return !selectedPools.includes(pool.id) && matchesSellingAsset;
        }

        return (
          !selectedPools.includes(pool.id) &&
          matchesBuyingAsset &&
          matchesSellingAsset
        );
      });
    }

    if (chosenPoolSwappableAssets && chosenPoolSwappableAssets.length >= 4) {
      // only show pools which swap the max 5 trackable assets
      _remainingPools = _remainingPools.filter((pool) => {
        const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
        const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
        if (!assetA || !assetB) {
          return false;
        }
        return chosenPoolSwappableAssets.length >= 5
          ? chosenPoolSwappableAssets.includes(assetA.symbol) &&
              chosenPoolSwappableAssets.includes(assetB.symbol)
          : chosenPoolSwappableAssets.includes(assetA.symbol) ||
              chosenPoolSwappableAssets.includes(assetB.symbol);
      });
    }

    if (selectedPools && selectedPools.length) {
      _remainingPools = _remainingPools.filter(
        (pool) => !selectedPools.includes(pool.id)
      );
    }

    return _remainingPools;
  }, [
    pools,
    assets,
    selectedPools,
    buyingAssetData,
    sellingAssetData,
    chosenPoolSwappableAssets,
  ]);

  const PoolRow = ({ index, style }) => {
    const pool = remainingPools[index];
    const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
    const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
    const shareAsset = assets.find((asset) => asset.id === pool.share_asset_id);

    if (!assetA || !assetB || !shareAsset) {
      return null;
    }

    return (
      <div style={style} key={`poolNo${index}`}>
        <Card
          onClick={() => {
            if (!selectedPools.includes(pool.id)) {
              const newAssets = [assetA.symbol, assetB.symbol].filter(
                (symbol) =>
                  !chosenPoolSwappableAssets ||
                  !chosenPoolSwappableAssets.includes(symbol)
              );

              if (
                chosenPoolSwappableAssets &&
                chosenPoolSwappableAssets.length + newAssets.length > 5
              ) {
                console.log("Unable to track more than 5 swappable assets.");
                return; // can't have more than 5!
              }

              setSelectedPools([...selectedPools, pool.id]);
            }
          }}
        >
          <CardHeader className="p-0">
            <CardDescription>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex items-center justify-center">
                  {pool.id}
                </div>
                <div className="flex items-center justify-center">
                  {shareAsset.symbol}
                </div>
                <div className="flex items-center justify-center">
                  {assetA.symbol}
                </div>
                <div className="flex items-center justify-center">
                  {assetB.symbol}
                </div>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  };

  const ChosenPoolRow = ({ index, style }) => {
    const pool = chosenPools[index];
    const assetA = assets.find((asset) => asset.id === pool.asset_a_id);
    const assetB = assets.find((asset) => asset.id === pool.asset_b_id);
    const shareAsset = assets.find((asset) => asset.id === pool.share_asset_id);

    if (!assetA || !assetB || !shareAsset) {
      return null;
    }

    return (
      <div style={style} key={`poolNo${index}`}>
        <Card
          onClick={() => {
            setSelectedPools(
              selectedPools.filter((poolId) => poolId !== pool.id)
            );
          }}
        >
          <CardHeader className="p-0">
            <CardDescription>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex items-center justify-center">
                  {pool.id}
                </div>
                <div className="flex items-center justify-center">
                  {shareAsset.symbol}
                </div>
                <div className="flex items-center justify-center">
                  {assetA.symbol}
                </div>
                <div className="flex items-center justify-center">
                  {assetB.symbol}
                </div>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  };

  const TrackerRow = ({ index, style }) => {
    const _tracker = trackers[_chain][index];

    const _pools = _tracker.pools.map((poolId) =>
      pools.find((pool) => pool.id === poolId)
    );
    const _uniqueAssets = [];

    _pools.forEach((_pool) => {
      const _assetA = assets.find((asset) => asset.id === _pool.asset_a_id);
      const _assetB = assets.find((asset) => asset.id === _pool.asset_b_id);
      if (_assetA && !_uniqueAssets.includes(_assetA.symbol)) {
        _uniqueAssets.push(_assetA.symbol);
      }
      if (_assetB && !_uniqueAssets.includes(_assetB.symbol)) {
        _uniqueAssets.push(_assetB.symbol);
      }
    });

    const [deletePrompt, setDeletePrompt] = useState(false);

    return (
      <div
        style={style}
        key={`poolTrackerNo${index}`}
        className="grid grid-cols-6 gap-2"
      >
        <div className="col-span-5">
          <a href={`/custom_pool_tracker/index.html?id=${_tracker.id}`}>
            <Card>
              <CardHeader className="pt-2 pb-2">
                <CardDescription>
                  <b>{_tracker.name}</b>
                  <br />
                  <div className="grid grid-cols-1 gap-1">
                    <p>
                      {t("CustomPoolOverview:swappableAssets")}:{" "}
                      {_uniqueAssets.join(", ")}
                    </p>
                    <p>
                      {t("CustomPoolOverview:poolShareAssets")}:{" "}
                      {_pools
                        .map((x) =>
                          _pools.length > 4
                            ? x.id
                            : `${x.share_asset_symbol} (${x.id})`
                        )
                        .join(", ")}
                    </p>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          </a>
        </div>
        <div className="flex items-center justify-center">
          <Dialog open={deletePrompt} onOpenChange={setDeletePrompt}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-3/4">
                {t("CustomPoolOverview:delete")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[375px] bg-white">
              <DialogHeader>
                <DialogTitle>{t("CustomPoolOverview:areYouSure")}</DialogTitle>
              </DialogHeader>
              <p>{t("CustomPoolOverview:deleteTracker")}</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    const updatedTrackers = trackers[_chain].filter(
                      (thisTracker) => thisTracker.name !== _tracker.name
                    );
                    updateTrackers(_chain, updatedTrackers);
                    setDeletePrompt(false);
                  }}
                >
                  {t("CustomPoolOverview:yes")}
                </Button>
                <Button
                  onClick={() => {
                    setDeletePrompt(false);
                  }}
                  variant="outline"
                >
                  {t("CustomPoolOverview:no")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <Card className="p-2">
        <CardHeader>
          <CardTitle>{t("CustomPoolOverview:title")}</CardTitle>
          <CardDescription>
            {t("CustomPoolOverview:description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-5 border rounded border-gray-300 p-3">
              <div className="w-full max-h-[200px] overflow-auto">
                <List
                  rowComponent={TrackerRow}
                  rowCount={
                    trackers && trackers[_chain] ? trackers[_chain].length : 0
                  }
                  rowHeight={100}
                  rowProps={{}}
                />
              </div>
            </div>
            <Button onClick={() => setModalOpen(true)}>
              {t("CustomPoolOverview:createTracker")}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[720px] bg-white">
          <DialogHeader>
            <DialogTitle>{t("CustomPoolOverview:creatingTracker")}</DialogTitle>
            <DialogDescription>
              {t("CustomPoolOverview:selectAssets")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <HoverInfo
              content={t("CustomPoolOverview:hoverCreatingContent")}
              header={t("CustomPoolOverview:hoverCreatingHeader")}
            />
            <Input
              type="text"
              placeholder={t("CustomPoolOverview:trackerName")}
              onChange={(e) => {
                const sanitizedValue = e.target.value.replace(
                  /[^a-zA-Z0-9 .,!?-]/g,
                  ""
                );
                setNewTrackerTitle(sanitizedValue);
              }}
              onKeyUp={(e) => {
                const sanitizedValue = e.target.value.replace(
                  /[^a-zA-Z0-9 .,!?-]/g,
                  ""
                );
                if (sanitizedValue !== e.target.value) {
                  e.target.value = sanitizedValue;
                }
              }}
              className="w-full"
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <HoverInfo
                  content={t("CustomPoolOverview:hoverBuyingContent")}
                  header={t("CustomPoolOverview:hoverBuyingHeader")}
                />
                <BasicAssetDropDownCard
                  assetSymbol={buyingAsset ?? ""}
                  assetData={buyingAssetData}
                  storeCallback={setBuyingAsset}
                  otherAsset={sellingAsset}
                  marketSearch={marketSearch}
                  type={"base"}
                  size="small"
                  chain={_chain}
                  borrowPositions={[]}
                  usrBalances={usrBalances}
                />
              </div>
              <div>
                <HoverInfo
                  content={t("CustomPoolOverview:hoverSellingContent")}
                  header={t("CustomPoolOverview:hoverSellingHeader")}
                />
                <BasicAssetDropDownCard
                  assetSymbol={sellingAsset ?? ""}
                  assetData={sellingAssetData}
                  storeCallback={setSellingAsset}
                  otherAsset={buyingAsset}
                  marketSearch={marketSearch}
                  type={"base"}
                  size="small"
                  chain={_chain}
                  borrowPositions={[]}
                  usrBalances={usrBalances}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="w-1/2 mt-5"
                  onClick={() => {
                    setBuyingAsset(null);
                    setSellingAsset(null);
                  }}
                >
                  {t("CustomPoolOverview:reset")}
                </Button>
              </div>
            </div>
            <HoverInfo
              content={t("CustomPoolOverview:hoverPoolDetailsContent")}
              header={t("CustomPoolOverview:hoverPoolDetailsHeader")}
            />
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>{t("CustomPoolOverview:poolId")}</div>
              <div>{t("CustomPoolOverview:shareAsset")}</div>
              <div>{t("CustomPoolOverview:assetA")}</div>
              <div>{t("CustomPoolOverview:assetB")}</div>
            </div>
            <div className="border rounded border-gray-300 p-2">
              <div className="w-full max-h-[200px] overflow-auto">
                <List
                  rowComponent={PoolRow}
                  rowCount={remainingPools.length}
                  rowHeight={30}
                  rowProps={{}}
                />
              </div>
            </div>
            <HoverInfo
              content={t("CustomPoolOverview:hoverSelectedPoolDetailsContent")}
              header={t("CustomPoolOverview:hoverSelectedPoolDetailsHeader")}
            />
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>{t("CustomPoolOverview:poolId")}</div>
              <div>{t("CustomPoolOverview:shareAsset")}</div>
              <div>{t("CustomPoolOverview:assetA")}</div>
              <div>{t("CustomPoolOverview:assetB")}</div>
            </div>
            <div className="border rounded border-gray-300 p-2">
              <List
                height={200}
                rowComponent={ChosenPoolRow}
                rowCount={selectedPools.length}
                rowHeight={30}
                rowProps={{}}
                className="w-full"
              />
            </div>
            {trackers && newTrackerTitle && selectedPools.length ? (
              <Button
                onClick={() => {
                  const existingTracker = trackers[_chain].find(
                    (tracker) => tracker.name === newTrackerTitle
                  );
                  if (existingTracker) {
                    console.log(t("CustomPoolOverview:trackerExists"));
                    return;
                  }

                  const newTracker = {
                    name: newTrackerTitle,
                    pools: selectedPools,
                    chain: _chain,
                    id: toHex(sha256(utf8ToBytes(newTrackerTitle))),
                  };

                  const updatedTrackers = [...trackers[_chain], newTracker];
                  updateTrackers(_chain, updatedTrackers);

                  setModalOpen(false);
                }}
                variant="outline"
              >
                {t("CustomPoolOverview:create")}
              </Button>
            ) : (
              <Button disabled variant="outline">
                {t("CustomPoolOverview:create")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
