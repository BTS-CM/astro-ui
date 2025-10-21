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

import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  MagnifyingGlassIcon,
  AvatarIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";

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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createIssuedAssetsStore } from "@/nanoeffects/IssuedAssets.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser, $userStorage } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "./Avatar.tsx";
import ExternalLink from "./common/ExternalLink.jsx";
import AccountSearch from "./AccountSearch.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import AssetIssuerActions from "./AssetIssuerActions.jsx";
import {
  blockchainFloat,
  humanReadableFloat,
  getFlagBooleans,
} from "@/lib/common.js";

const activeTabStyle = { backgroundColor: "#252526", color: "white" };

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
    async function fetching() {
      const requiredStore = createIssuedAssetsStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setLoading(false);
          setIssuedAssets(data);
        }
      });
    }

    if (usr && usr.id && currentNode && currentNode.url) {
      setLoading(true);
      fetching();
    }
  }, [usr, currentNode]);

  const [users, setUsers] = useState();
  useEffect(() => {
    if (!usr) {
      return;
    }
    const unsubscribe = $userStorage.subscribe((value) => {
      const chainUsers = value.users.filter((user) => user.chain === usr.chain);
      setUsers(chainUsers);
    });
    return unsubscribe;
  }, [$userStorage, usr]);

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
            !asset.options.description.includes("nft_object")
        );
      case "smartcoins":
        return issuedAssets.filter(
          (asset) =>
            asset.bitasset_data_id &&
            !asset.options.description.includes("condition") &&
            !asset.options.description.includes("expiry")
        );
      case "prediction":
        return issuedAssets.filter(
          (asset) =>
            asset.bitasset_data_id &&
            asset.options.description.includes("condition") &&
            asset.options.description.includes("expiry")
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

  // issuedAssets -> dynamic data (all)
  const [dynamicData, setDynamicData] = useState([]);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(
          issuedAssets.map((asset) => asset.dynamic_asset_data_id)
        ),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setDynamicData(data);
        }
      });
    }

    if (issuedAssets && issuedAssets.length) {
      fetching();
    }
  }, [issuedAssets]);

  const [bitassetData, setBitassetData] = useState([]);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(
          issuedAssets
            .filter((asset) => asset.bitasset_data_id)
            .map((asset) => asset.bitasset_data_id)
        ),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBitassetData(data);
        }
      });
    }

    if (issuedAssets && issuedAssets.length) {
      fetching();
    }
  }, [issuedAssets]);
  // issuedAssets -> bitasset data (some)

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
    async function fetching() {
      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(priceFeederAccountIDs),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setPriceFeederAccounts(data);
        }
      });
    }

    if (priceFeederAccountIDs && priceFeederAccountIDs.length) {
      fetching();
    }
  }, [priceFeederAccountIDs]);

  const AssetRow = ({ index, style }) => {
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

    const [viewJSON, setViewJSON] = useState(false);
    const [json, setJSON] = useState();

    const [globalSettleOpen, setGlobalSettleOpen] = useState(false);
    const [globalSettleDeeplinkDialog, setGlobalSettleDeeplinkDialog] =
      useState(false);

    const [priceFeederIndex, setPriceFeederIndex] = useState(0);
    const [globalSettlementMode, setGlobalSettlementMode] = useState("median");

    const globalSettleObject = useMemo(() => {
      if (!relevantBitassetData) {
        return null;
      }

      switch (globalSettlementMode) {
        case "median":
          return relevantBitassetData.median_feed.settlement_price;
        case "current":
          return relevantBitassetData.current_feed.settlement_price;
        case "price_feed":
          return relevantBitassetData.feeds[priceFeederIndex][1][1]
            .settlement_price;
      }
    }, [globalSettlementMode, relevantBitassetData, priceFeederIndex]);

    const _flags = getFlagBooleans(issuedAsset.options.flags);
    const _issuer_permissions = getFlagBooleans(
      issuedAsset.options.issuer_permissions
    );

    const collateralAsset = useMemo(() => {
      if (relevantBitassetData) {
        return assets.find(
          (x) => x.id === relevantBitassetData.options.short_backing_asset
        );
      }
    }, [relevantBitassetData]);

    const currentFeedSettlementPrice = useMemo(() => {
      if (!globalSettleObject || !collateralAsset || !issuedAsset) {
        return 0;
      }

      if (globalSettleObject) {
        return parseFloat(
          (
            humanReadableFloat(
              parseInt(globalSettleObject.quote.amount),
              collateralAsset.precision
            ) /
            humanReadableFloat(
              parseInt(globalSettleObject.base.amount),
              issuedAsset.precision
            )
          ).toFixed(collateralAsset.precision)
        );
      }
    }, [collateralAsset, issuedAsset, globalSettleObject]);

    const UserRow = ({ index: x, style: rowStyle }) => {
      const user = users[x];
      if (!user) {
        return null;
      }

      return (
        <div
          style={{ ...rowStyle }}
          key={`acard-${user.id}`}
          onClick={() => {
            setTargetUser({
              name: user.username,
              id: user.id,
              chain: user.chain,
            });
            setSelectUserDialogOpen(false);
            setNewIssuerUserOpen(false);
          }}
        >
          <Card className="ml-2 mr-2">
            <CardHeader className="pb-5">
              <CardTitle>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Avatar
                    size={40}
                    name={user.username}
                    extra="Target"
                    expression={{
                      eye: "normal",
                      mouth: "open",
                    }}
                    colors={[
                      "#92A1C6",
                      "#146A7C",
                      "#F0AB3D",
                      "#C271B4",
                      "#C20D90",
                    ]}
                  />
                  <span style={{ marginLeft: "10px" }}>
                    {user.username} ({user.id})
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      );
    };

    const PriceFeedRow = ({ index: x, style: rowStyle }) => {
      const priceFeed = relevantBitassetData.feeds[x];
      if (
        !priceFeed ||
        !priceFeed[1] ||
        !priceFeed[1][1] ||
        !priceFeed[1][1].settlement_price
      ) {
        console.error("Error: Invalid priceFeed structure", { priceFeed, x });
        return null;
      }

      const hexID = toHex(sha256(utf8ToBytes(priceFeed[0])));
      const settlementPrice = parseFloat(
        (
          humanReadableFloat(
            parseInt(priceFeed[1][1].settlement_price.quote.amount),
            collateralAsset.precision
          ) /
          humanReadableFloat(
            parseInt(priceFeed[1][1].settlement_price.base.amount),
            issuedAsset.precision
          )
        ).toFixed(collateralAsset.precision)
      );

      const feedPublishTime = new Date(priceFeed[1][0]);
      const hoursSincePublished = Math.floor(
        (new Date().getTime() - feedPublishTime.getTime()) / (1000 * 60 * 60)
      );

      const foundFeeder = priceFeederAccounts.find(
        (account) => account.id === priceFeed[0]
      );

      return (
        <div
          style={{ ...rowStyle }}
          key={`priceFeedRow-${hexID}`}
          onClick={() => {
            setPriceFeederIndex(x);
          }}
        >
          <Card className="ml-2 mr-2">
            <div className="flex items-center">
              {x === priceFeederIndex ? (
                <div className="ml-5">
                  <CheckIcon />
                </div>
              ) : null}
              <CardHeader className="pb-1 pt-1">
                <CardTitle>
                  <div className="flex items-center">
                    {foundFeeder ? foundFeeder.name : null} ({priceFeed[0]})
                    {" - "}
                    {settlementPrice} {collateralAsset.symbol}/
                    {issuedAsset.symbol}
                  </div>
                </CardTitle>
                <CardDescription>
                  {t("IssuedAssets:publishTime", {
                    hours: hoursSincePublished,
                  })}
                </CardDescription>
              </CardHeader>
            </div>
          </Card>
        </div>
      );
    };

    const pricefeederRow = ({ index, style }) => {
      let res = priceFeedPublishers[index];
      if (!res) {
        return null;
      }

      return (
        <div style={{ ...style }} key={`acard-${res.id}`}>
          <Card className="ml-2 mr-2 mt-1">
            <CardHeader className="pb-3 pt-3">
              <span className="flex items-center w-full">
                <span className="flex-shrink-0">
                  <Avatar
                    size={40}
                    name={res.name}
                    extra="Borrower"
                    expression={{ eye: "normal", mouth: "open" }}
                    colors={[
                      "#92A1C6",
                      "#146A7C",
                      "#F0AB3D",
                      "#C271B4",
                      "#C20D90",
                    ]}
                  />
                </span>
                <span className="flex-grow ml-3">
                  #{index + 1}: {res.name} ({res.id})
                </span>
                <span className="flex-shrink-0">
                  <Button
                    variant="outline"
                    className="mr-2"
                    onClick={(e) => {
                      e.preventDefault();
                      const _update = priceFeedPublishers.filter(
                        (x) => x.id !== res.id
                      );
                      setPriceFeedPublishers(_update);
                    }}
                  >
                    ❌
                  </Button>
                </span>
              </span>
            </CardHeader>
          </Card>
        </div>
      );
    };

    return (
      <div style={{ ...style }} key={`acard-${issuedAsset.id}`}>
        <Card className="ml-2 mr-2">
          <CardHeader className="pb-1">
            <CardTitle className="grid grid-cols-2 gap-5">
              <span className="pb-5 grid grid-cols-2">
                {activeTab === "smartcoins" &&
                relevantBitassetData &&
                ((relevantBitassetData.current_feed.settlement_price.base
                  .amount === 0 &&
                  relevantBitassetData.current_feed.settlement_price.quote
                    .amount === 0) ||
                  !relevantBitassetData.feeds.length ||
                  (parseInt(relevantBitassetData.settlement_price.base.amount) >
                    0 &&
                    parseInt(
                      relevantBitassetData.settlement_price.quote.amount
                    )) ||
                  parseInt(relevantBitassetData.settlement_fund) > 0) ? (
                  <HoverInfo
                    content={t("IssuedAssets:inactiveSmartcoin")}
                    header={
                      <ExclamationTriangleIcon className="ml-3 mt-1 w-6 h-6" />
                    }
                    type="header"
                  />
                ) : null}
                <div>
                  <ExternalLink
                    classnamecontents="hover:text-purple-500"
                    type="text"
                    text={issuedAsset.symbol}
                    hyperlink={`https://explorer.bitshares.ws/#/assets/${
                      issuedAsset.symbol
                    }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                  />
                  <br />
                  {" ("}
                  <ExternalLink
                    classnamecontents="hover:text-purple-500"
                    type="text"
                    text={issuedAsset.id}
                    hyperlink={`https://explorer.bitshares.ws/#/assets/${
                      issuedAsset.id
                    }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                  />
                  {")"}
                </div>
              </span>
              <span className="mb-3 text-right grid grid-cols-3 gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      className="h-8 hover:shadow-inner"
                      variant="outline"
                    >
                      JSON
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      className="hover:shadow-inner"
                      onClick={() => {
                        setJSON(issuedAsset);
                        setViewJSON(true);
                      }}
                    >
                      {t("IssuedAssets:issuedAssetData")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="hover:shadow-inner"
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
                        className="hover:shadow-inner"
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
                        className="hover:shadow-inner"
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

                {viewJSON && json ? (
                  <Dialog
                    open={viewJSON}
                    onOpenChange={(open) => {
                      setViewJSON(open);
                    }}
                  >
                    <DialogContent className="sm:max-w-[750px] bg-white">
                      <DialogHeader>
                        <DialogTitle>
                          {t("LiveBlocks:dialogContent.json")}
                        </DialogTitle>
                        <DialogDescription>
                          {t("LiveBlocks:dialogContent.jsonDescription")}
                        </DialogDescription>
                      </DialogHeader>
                      <Textarea
                        value={JSON.stringify(json, null, 2)}
                        readOnly={true}
                        rows={15}
                      />
                      <Button
                        className="w-1/4 mt-2"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            json.stringify(json, null, 2)
                          );
                        }}
                      >
                        {t("LiveBlocks:dialogContent.copy")}
                      </Button>
                    </DialogContent>
                  </Dialog>
                ) : null}

                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      className="h-8 hover:shadow-inner"
                      variant="outline"
                    >
                      {t("IssuedAssets:userActions")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <a
                      href={`/dex/index.html?market=${issuedAsset.symbol}_${
                        parsedDescription && parsedDescription.market
                          ? parsedDescription.market
                          : "BTS"
                      }`}
                    >
                      <DropdownMenuItem className="hover:shadow-inner">
                        {t("IssuedAssets:proceedToTrade")}
                      </DropdownMenuItem>
                    </a>

                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${issuedAsset.symbol}`}
                    >
                      <DropdownMenuItem className="hover:shadow-inner">
                        {t("IssuedAssets:creditBorrow")}
                      </DropdownMenuItem>
                    </a>

                    <a
                      href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${issuedAsset.symbol}`}
                    >
                      <DropdownMenuItem className="hover:shadow-inner">
                        {t("IssuedAssets:creditLend")}
                      </DropdownMenuItem>
                    </a>

                    {activeTab === "smartcoins" ? (
                      <a href={`/smartcoin/index.html?id=${issuedAsset.id}`}>
                        <DropdownMenuItem className="hover:shadow-inner">
                          {t("IssuedAssets:proceedToBorrow")}
                        </DropdownMenuItem>
                      </a>
                    ) : null}

                    {activeTab === "smartcoins" &&
                    relevantBitassetData &&
                    ((relevantBitassetData.current_feed.settlement_price.base
                      .amount === 0 &&
                      relevantBitassetData.current_feed.settlement_price.quote
                        .amount === 0) ||
                      !relevantBitassetData.feeds.length ||
                      (parseInt(
                        relevantBitassetData.settlement_price.base.amount
                      ) > 0 &&
                        parseInt(
                          relevantBitassetData.settlement_price.quote.amount
                        )) ||
                      parseInt(relevantBitassetData.settlement_fund) > 0) ? (
                      <a href={`/settlement/index.html?id=${issuedAsset.id}`}>
                        <DropdownMenuItem className="hover:shadow-inner">
                          {t("IssuedAssets:collateralBid")}
                        </DropdownMenuItem>
                      </a>
                    ) : null}

                    {activeTab === "prediction" ? (
                      <a href={`/predictions/index.html?id=${issuedAsset.id}`}>
                        <DropdownMenuItem className="hover:shadow-inner">
                          {t("IssuedAssets:pmaBet")}
                        </DropdownMenuItem>
                      </a>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>

                {!["prediction"].includes(activeTab) ? (
                  <span className="mt-2">
                    <AssetIssuerActions
                      asset={issuedAsset}
                      chain={_chain}
                      currentUser={usr}
                      node={currentNode}
                      dynamicAssetData={relevantDynamicData}
                      bitassetData={relevantBitassetData}
                      buttonVariant="outline"
                      buttonSize="sm"
                      className="h-8 hover:shadow-inner"
                    />
                  </span>
                ) : null}

                {globalSettleOpen ? (
                  <Dialog
                    open={globalSettleOpen}
                    onOpenChange={(open) => {
                      setGlobalSettleOpen(open);
                    }}
                  >
                    <DialogContent className="sm:max-w-[550px] bg-white">
                      <DialogHeader>
                        <DialogTitle>
                          {t("IssuedAssets:updateIssuer")}: {issuedAsset.symbol}{" "}
                          ({issuedAsset.id})
                        </DialogTitle>
                        <DialogDescription>
                          {t("IssuedAssets:updateIssuerInfo")}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={() => {
                              setGlobalSettlementMode("median");
                            }}
                            variant={
                              globalSettlementMode === "median" ? "" : "outline"
                            }
                          >
                            {t("IssuedAssets:medianFeedPrice")}
                          </Button>
                          <Button
                            onClick={() => {
                              setGlobalSettlementMode("current");
                            }}
                            variant={
                              globalSettlementMode === "current"
                                ? ""
                                : "outline"
                            }
                          >
                            {t("IssuedAssets:currentFeedPrice")}
                          </Button>
                          {relevantBitassetData &&
                          relevantBitassetData.feeds &&
                          relevantBitassetData.feeds.length ? (
                            <Button
                              onClick={() => {
                                setGlobalSettlementMode("price_feed");
                              }}
                              variant={
                                globalSettlementMode === "price_feed"
                                  ? ""
                                  : "outline"
                              }
                            >
                              {t("IssuedAssets:specificPriceFeed")}
                            </Button>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {relevantBitassetData &&
                          relevantBitassetData.feeds &&
                          relevantBitassetData.feeds.length &&
                          globalSettlementMode === "price_feed" ? (
                            <>
                              <HoverInfo
                                content={t(
                                  "IssuedAssets:chooseSpecificFeedInfo"
                                )}
                                header={t("IssuedAssets:chooseSpecificFeed")}
                                type="header"
                              />
                              <div className="w-full rounded border border-black pt-1 max-h-[150px] overflow-auto">
                                <List
                                  rowComponent={PriceFeedRow}
                                  rowCount={relevantBitassetData.feeds.length}
                                  rowHeight={60}
                                  rowProps={{}}
                                />
                              </div>
                            </>
                          ) : null}
                          <div>
                            <HoverInfo
                              content={t(
                                "IssuedAssets:currentSettlementPriceInfo"
                              )}
                              header={t("IssuedAssets:currentSettlementPrice")}
                              type="header"
                            />
                            <Input
                              value={`${
                                parseFloat(currentFeedSettlementPrice) > 0
                                  ? currentFeedSettlementPrice
                                  : "??? ⚠️"
                              } ${collateralAsset.symbol}/${
                                issuedAsset.symbol
                              }`}
                              readOnly={true}
                              className="mt-2"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <HoverInfo
                                content={t("IssuedAssets:quoteInfo")}
                                header={t("IssuedAssets:quote")}
                                type="header"
                              />
                              <Input
                                value={`${humanReadableFloat(
                                  parseInt(globalSettleObject.quote.amount),
                                  collateralAsset.precision
                                )} ${collateralAsset.symbol} (${
                                  collateralAsset.id
                                })`}
                                readOnly={true}
                                className="mt-2"
                              />
                            </div>
                            <div>
                              <HoverInfo
                                content={t("IssuedAssets:baseInfo")}
                                header={t("IssuedAssets:base")}
                                type="header"
                              />
                              <Input
                                value={`${humanReadableFloat(
                                  parseInt(
                                    parseInt(globalSettleObject.base.amount)
                                  ),
                                  issuedAsset.precision
                                )} ${issuedAsset.symbol} (${issuedAsset.id})`}
                                readOnly={true}
                                className="mt-2"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        className="w-1/2 mt-2"
                        onClick={() => {
                          setGlobalSettleDeeplinkDialog(true);
                        }}
                      >
                        {t("IssuedAssets:globallySettle")}
                      </Button>
                      {globalSettleDeeplinkDialog ? (
                        <DeepLinkDialog
                          operationNames={["asset_global_settle"]}
                          username={usr.username}
                          usrChain={usr.chain}
                          userID={usr.id}
                          dismissCallback={setGlobalSettleDeeplinkDialog}
                          key={`globallySettlingAsset_${issuedAsset.id}`}
                          headerText={t("IssuedAssets:globalSettlementHeader", {
                            asset: issuedAsset.symbol,
                            mode: globalSettlementMode,
                          })}
                          trxJSON={[
                            {
                              issuer: usr.id,
                              asset_to_settle: issuedAsset.id,
                              settle_price: globalSettleObject,
                              extensions: {},
                            },
                          ]}
                        />
                      ) : null}
                    </DialogContent>
                  </Dialog>
                ) : null}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("IssuedAssets:title")}</CardTitle>
              <CardDescription>{t("IssuedAssets:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                key={`Tabs_${activeTab ?? ""}`}
                defaultValue={activeTab ?? "uia"}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4 gap-2">
                  {activeTab === "uia" ? (
                    <TabsTrigger value="uia" style={activeTabStyle}>
                      {t("IssuedAssets:uiaButton")}
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger
                      value="uia"
                      onClick={() => {
                        setActiveTab("uia");
                        window.history.replaceState({}, "", `?tab=uia`);
                      }}
                    >
                      {t("IssuedAssets:uiaButton")}
                    </TabsTrigger>
                  )}
                  {activeTab === "smartcoins" ? (
                    <TabsTrigger value="smartcoins" style={activeTabStyle}>
                      {t("IssuedAssets:smartcoinsButton")}
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger
                      value="smartcoins"
                      onClick={() => {
                        setActiveTab("smartcoins");
                        window.history.replaceState({}, "", `?tab=smartcoins`);
                      }}
                    >
                      {t("IssuedAssets:smartcoinsButton")}
                    </TabsTrigger>
                  )}
                  {activeTab === "prediction" ? (
                    <TabsTrigger value="prediction" style={activeTabStyle}>
                      {t("IssuedAssets:predictionButton")}
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger
                      value="prediction"
                      onClick={() => {
                        setActiveTab("prediction");
                        window.history.replaceState({}, "", `?tab=prediction`);
                      }}
                    >
                      {t("IssuedAssets:predictionButton")}
                    </TabsTrigger>
                  )}
                  {activeTab === "nft" ? (
                    <TabsTrigger value="nft" style={activeTabStyle}>
                      {t("IssuedAssets:nftButton")}
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger
                      value="nft"
                      onClick={() => {
                        setActiveTab("nft");
                        window.history.replaceState({}, "", `?tab=nft`);
                      }}
                    >
                      {t("IssuedAssets:nftButton")}
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="uia">
                  <h5 className="mb-2 text-center">
                    {t("IssuedAssets:listingUIA", {
                      count: relevantAssets.length,
                    })}
                  </h5>
                  {loading ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : null}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <div className="text-center mt-5">
                      {t("IssuedAssets:noUIA")}
                    </div>
                  ) : (
                    <div className="w-full max-h-[500px] overflow-auto">
                      <List
                        rowComponent={AssetRow}
                        rowCount={relevantAssets.length}
                        rowHeight={90}
                        rowProps={{}}
                      />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="smartcoins">
                  <h5 className="mb-2 text-center">
                    {t("IssuedAssets:listingSmartcoins", {
                      count: relevantAssets.length,
                    })}
                  </h5>
                  {loading ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : null}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <div className="text-center mt-5">
                      {t("IssuedAssets:noSmartcoins")}
                    </div>
                  ) : (
                    <div className="w-full max-h-[500px] overflow-auto">
                      <List
                        rowComponent={AssetRow}
                        rowCount={relevantAssets.length}
                        rowHeight={90}
                        rowProps={{}}
                      />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="prediction">
                  <h5 className="mb-2 text-center">
                    {t("IssuedAssets:listingPredictionMarkets", {
                      count: relevantAssets.length,
                    })}
                  </h5>
                  {loading ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : null}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <div className="text-center mt-5">
                      {t("IssuedAssets:noPredictionMarkets")}
                    </div>
                  ) : (
                    <div className="w-full max-h-[500px] overflow-auto">
                      <List
                        rowComponent={AssetRow}
                        rowCount={relevantAssets.length}
                        rowHeight={90}
                        rowProps={{}}
                      />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="nft">
                  <h5 className="mb-2 text-center">
                    {t("IssuedAssets:listingNFTs", {
                      count: relevantAssets.length,
                    })}
                  </h5>
                  {loading ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : null}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <div className="text-center mt-5">
                      {t("IssuedAssets:noNFTs")}
                    </div>
                  ) : (
                    <div className="w-full max-h-[500px] overflow-auto">
                      <List
                        rowComponent={AssetRow}
                        rowCount={relevantAssets.length}
                        rowHeight={90}
                        rowProps={{}}
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
