import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

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

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createIssuedAssetsStore } from "@/nanoeffects/IssuedAssets.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser, $userStorage } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import ExternalLink from "./common/ExternalLink.jsx";
import AssetIssuerActions from "./AssetIssuerActions.jsx";

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
      case "pools":
        return issuedAssets.filter((asset) => asset.for_liquidity_pool);
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

    const issueThingsRow = (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button className="h-8 hover:shadow-inner" variant="outline">
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

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button className="h-8 hover:shadow-inner" variant="outline">
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

            <a href={`/lend/index.html?asset=${issuedAsset.symbol}`}>
              <DropdownMenuItem>
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
            ((relevantBitassetData.current_feed.settlement_price.base.amount ===
              0 &&
              relevantBitassetData.current_feed.settlement_price.quote
                .amount === 0) ||
              !relevantBitassetData.feeds.length ||
              (parseInt(relevantBitassetData.settlement_price.base.amount) >
                0 &&
                parseInt(relevantBitassetData.settlement_price.quote.amount)) ||
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
              assets={assets}
              chain={_chain}
              currentUser={usr}
              node={currentNode}
              dynamicAssetData={relevantDynamicData}
              bitassetData={relevantBitassetData}
              priceFeederAccounts={priceFeederAccounts}
              buttonVariant="outline"
              buttonSize="sm"
              className="h-8 hover:shadow-inner"
            />
          </span>
        ) : null}

        {viewJSON && json ? (
          <Dialog
            open={viewJSON}
            onOpenChange={(open) => {
              setViewJSON(open);
            }}
          >
            <DialogContent className="sm:max-w-[750px] bg-white">
              <DialogHeader>
                <DialogTitle>{t("LiveBlocks:dialogContent.json")}</DialogTitle>
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
                  navigator.clipboard.writeText(JSON.stringify(json, null, 2));
                }}
              >
                {t("LiveBlocks:dialogContent.copy")}
              </Button>
            </DialogContent>
          </Dialog>
        ) : null}
      </>
    );

    const smartcoinCheck =
      activeTab === "smartcoins" &&
      relevantBitassetData &&
      ((relevantBitassetData.current_feed.settlement_price.base.amount === 0 &&
        relevantBitassetData.current_feed.settlement_price.quote.amount ===
          0) ||
        !relevantBitassetData.feeds.length ||
        (parseInt(relevantBitassetData.settlement_price.base.amount) > 0 &&
          parseInt(relevantBitassetData.settlement_price.quote.amount)) ||
        parseInt(relevantBitassetData.settlement_fund) > 0) ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <ExclamationTriangleIcon className="ml-3 mt-1 w-6 h-6" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("IssuedAssets:inactiveSmartcoin")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null;

    return (
      <div style={{ ...style }} key={`acard-${issuedAsset.id}`}>
        <div className="hidden lg:block">
          <Card className="hidden lg:block ml-2 mr-2 cursor-pointer lg:cursor-default">
            <CardHeader className="pb-1">
              <CardTitle>
                <div className="lg:grid lg:grid-cols-2 lg:gap-5">
                  <div className="hidden lg:block pb-2">
                    {smartcoinCheck}
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
                  <div className="hidden lg:grid lg:grid-cols-3 lg:gap-3 text-right">
                    {issueThingsRow}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        <div className="block lg:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <Card className="lg:hidden ml-2 mr-2 cursor-pointer lg:cursor-default">
                <CardHeader className="pb-1">
                  <CardTitle>
                    <div className="text-sm pb-2">
                      {smartcoinCheck} {issuedAsset.symbol} ({issuedAsset.id})
                    </div>
                  </CardTitle>
                </CardHeader>
              </Card>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[560px] lg:hidden">
              <DialogHeader>
                <DialogTitle>
                  {issuedAsset.symbol} ({issuedAsset.id})
                </DialogTitle>
                <DialogDescription>
                  {t("IssuedAssets:description")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 text-left justify-items-start">
                {issueThingsRow}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-3/4">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("IssuedAssets:title")}</CardTitle>
              <CardDescription>{t("IssuedAssets:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full mb-3">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    style={activeTab === "uia" ? activeTabStyle : {}}
                    onClick={() => {
                      setActiveTab("uia");
                      window.history.replaceState({}, "", `?tab=uia`);
                    }}
                  >
                    {t("IssuedAssets:uiaButton")}
                  </Button>
                  <Button
                    variant="outline"
                    style={activeTab === "pools" ? activeTabStyle : {}}
                    onClick={() => {
                      setActiveTab("pools");
                      window.history.replaceState({}, "", `?tab=pools`);
                    }}
                  >
                    {t("IssuedAssets:poolsButton")}
                  </Button>
                  <Button
                    variant="outline"
                    style={activeTab === "smartcoins" ? activeTabStyle : {}}
                    onClick={() => {
                      setActiveTab("smartcoins");
                      window.history.replaceState({}, "", `?tab=smartcoins`);
                    }}
                  >
                    {t("IssuedAssets:smartcoinsButton")}
                  </Button>
                  <Button
                    variant="outline"
                    style={activeTab === "prediction" ? activeTabStyle : {}}
                    onClick={() => {
                      setActiveTab("prediction");
                      window.history.replaceState({}, "", `?tab=prediction`);
                    }}
                  >
                    {t("IssuedAssets:predictionButton")}
                  </Button>
                  <Button
                    variant="outline"
                    style={activeTab === "nft" ? activeTabStyle : {}}
                    onClick={() => {
                      setActiveTab("nft");
                      window.history.replaceState({}, "", `?tab=nft`);
                    }}
                  >
                    {t("IssuedAssets:nftButton")}
                  </Button>
                </div>
              </div>

              {activeTab === "uia" && (
                <div className="mt-2">
                  {relevantAssets.length > 0 ? (
                    <h5 className="mb-2 text-center">
                      {t("IssuedAssets:listingUIA", {
                        count: relevantAssets.length,
                      })}
                    </h5>
                  ) : null}
                  {loading ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : null}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <Empty className="mt-5">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">❔</EmptyMedia>
                        <EmptyTitle>{t("IssuedAssets:noUIA")}</EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button asChild>
                          <a href="/create_uia/index.html">
                            {t("PageHeader:create_uia")}
                          </a>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <>
                      <div className="w-full max-h-[500px] min-h-[500px] overflow-auto block md:hidden">
                        <List
                          rowComponent={AssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={{}}
                        />
                      </div>
                      <div className="w-full max-h-[500px] min-h-[500px] overflow-auto hidden md:block">
                        <List
                          rowComponent={AssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={{}}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "smartcoins" && (
                <div className="mt-2">
                  {relevantAssets.length > 0 ? (
                    <h5 className="mb-2 text-center">
                      {t("IssuedAssets:listingSmartcoins", {
                        count: relevantAssets.length,
                      })}
                    </h5>
                  ) : null}
                  {loading ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : null}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <Empty className="mt-5">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">❔</EmptyMedia>
                        <EmptyTitle>
                          {t("IssuedAssets:noSmartcoins")}
                        </EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button asChild>
                          <a href="/create_smartcoin/index.html">
                            {t("PageHeader:create_smartcoin")}
                          </a>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <>
                      <div className="w-full max-h-[500px] min-h-[500px] overflow-auto block md:hidden">
                        <List
                          rowComponent={AssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={{}}
                        />
                      </div>
                      <div className="w-full max-h-[500px] min-h-[500px] overflow-auto hidden md:block">
                        <List
                          rowComponent={AssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={{}}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "prediction" && (
                <div className="mt-2">
                  {relevantAssets.length > 0 ? (
                    <h5 className="mb-2 text-center">
                      {t("IssuedAssets:listingPredictionMarkets", {
                        count: relevantAssets.length,
                      })}
                    </h5>
                  ) : null}
                  {loading ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : null}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <Empty className="mt-5">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">❔</EmptyMedia>
                        <EmptyTitle>
                          {t("IssuedAssets:noPredictionMarkets")}
                        </EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button asChild>
                          <a href="/create_prediction/index.html">
                            {t("PageHeader:createPrediction")}
                          </a>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <>
                      <div className="w-full max-h-[500px] min-h-[500px] overflow-auto block md:hidden">
                        <List
                          rowComponent={AssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={{}}
                        />
                      </div>
                      <div className="w-full max-h-[500px] min-h-[500px] overflow-auto hidden md:block">
                        <List
                          rowComponent={AssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={{}}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "nft" && (
                <div className="mt-2">
                  {relevantAssets.length > 0 ? (
                    <h5 className="mb-2 text-center">
                      {t("IssuedAssets:listingNFTs", {
                        count: relevantAssets.length,
                      })}
                    </h5>
                  ) : null}
                  {loading ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : null}
                  {(!loading && !relevantAssets) || !relevantAssets.length ? (
                    <Empty className="mt-5">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">❔</EmptyMedia>
                        <EmptyTitle>{t("IssuedAssets:noNFTs")}</EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <>
                      <div className="w-full max-h-[500px] min-h-[500px] overflow-auto block md:hidden">
                        <List
                          rowComponent={AssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={{}}
                        />
                      </div>
                      <div className="w-full max-h-[500px] min-h-[500px] overflow-auto hidden md:block">
                        <List
                          rowComponent={AssetRow}
                          rowCount={relevantAssets.length}
                          rowHeight={90}
                          rowProps={{}}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
