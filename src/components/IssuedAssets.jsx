import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from '@nanostores/react';

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createIssuedAssetsStore } from "@/nanoeffects/IssuedAssets.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import ExternalLink from "./common/ExternalLink.jsx";

const activeTabStyle = { backgroundColor: "#252526", color: "white" };

export default function IssuedAssets(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const [issuedAssets, setIssuedAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createIssuedAssetsStore([
        usr.chain, usr.id, currentNode ? currentNode.url : null
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          /*
            {
              "id": "1.3.6021",
              "symbol": "NFTEA",
              "precision": 0,
              "issuer": "1.2.1803677",
              "options": {
                "max_supply": 1,
                "market_fee_percent": 0,
                "max_market_fee": 0,
                "issuer_permissions": 79,
                "flags": 0,
                "core_exchange_rate": {
                  "base": {
                    "amount": 100000,
                    "asset_id": "1.3.0"
                  },
                  "quote": {
                    "amount": 1,
                    "asset_id": "1.3.6021"
                  }
                },
                "whitelist_authorities": [],
                "blacklist_authorities": [],
                "whitelist_markets": [],
                "blacklist_markets": [],
                "description": "{\"main\":\"NFTEA.gallery\\n\\nNFT gallery powered by the Bitshares blockchain!\",\"short_name\":\"NFTEA\",\"market\":\"BTS\"}",
                "extensions": {
                  "reward_percent": 0,
                  "whitelist_market_fee_sharing": []
                }
              },
              "dynamic_asset_data_id": "2.3.6021",
              "creation_block_num": 58742662,
              "creation_time": "2021-05-26T16:02:15",
              "total_in_collateral": 0
            }
          */
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

  const [activeTab, setActiveTab] = useState("uia");
  
  const relevantAssets = useMemo(() => {
    if (!issuedAssets || !issuedAssets.length) {
      return [];
    }

    switch (activeTab) {
      case "uia":
        return issuedAssets.filter((asset) =>
          !asset.bitasset_data_id &&
          !asset.options.description.includes("nft_object")
      );
      case "smartcoins":
        return issuedAssets.filter((asset) => 
          asset.bitasset_data_id &&
          !asset.options.description.includes("condition") &&
          !asset.options.description.includes("expiry")
        );
      case "prediction":
        return issuedAssets.filter((asset) => 
          asset.bitasset_data_id &&
          asset.options.description.includes("condition") &&
          asset.options.description.includes("expiry")
        );
      case "nft":
        return issuedAssets.filter((asset) => !asset.bitasset_data_id && asset.options.description.includes("nft_object"));
      default:
        return [];
    }
  }, [issuedAssets, activeTab]);

  const AssetRow = ({ index, style }) => {
    const issuedAsset = relevantAssets[index];
    if (!issuedAsset) {
      return null;
    }

    const description = issuedAsset.options.description;
    const parsedDescription = description.length && description.includes("main")
      ? JSON.parse(description)
      : null

    return (
      <div style={{ ...style }} key={`acard-${issuedAsset.id}`}>
        <Card className="ml-2 mr-2">
          <CardHeader className="pb-1">
            <CardTitle className="grid grid-cols-2 gap-5">
              <span className="pb-5">
                <ExternalLink
                  classnamecontents="hover:text-purple-500"
                  type="text"
                  text={issuedAsset.symbol}
                  hyperlink={`https://blocksights.info/#/assets/${issuedAsset.symbol}`}
                />
                {" "}
                {"("}
                <ExternalLink
                  classnamecontents="hover:text-purple-500"
                  type="text"
                  text={issuedAsset.id}
                  hyperlink={`https://blocksights.info/#/assets/${issuedAsset.id}`}
                />
                {")"}
              </span>
              <span className="mb-3 text-right grid grid-cols-4 gap-2">
                <a href={`/dex/index.html?market=${issuedAsset.symbol}_${parsedDescription && parsedDescription.market ? parsedDescription.market : "BTS"}`}>
                  <Button className="h-8 hover:shadow-inner" variant="outline">
                    {t("IssuedAssets:proceedToTrade")}
                  </Button>
                </a>
                <a href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${issuedAsset.symbol}`}>
                  <Button className="h-8 hover:shadow-inner" variant="outline">
                    {t("IssuedAssets:creditBorrow")}
                  </Button>
                </a>
                <a href={`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${issuedAsset.symbol}`}>
                  <Button className="h-8 hover:shadow-inner" variant="outline">
                    {t("IssuedAssets:creditLend")}
                  </Button>
                </a>
                {
                  activeTab === "smartcoins"
                    ? <a href={`/smartcoin/index.html?id=${issuedAsset.id}`}>
                        <Button className="h-8 hover:shadow-inner" variant="outline">
                          {t("IssuedAssets:proceedToBorrow")}
                        </Button>
                      </a>
                    : null
                }
                {
                  activeTab === "smartcoins"
                    ? null // TODO: Support editing smartcoins
                    : null
                }
                {
                  activeTab === "prediction"
                    ? null // TODO: Support hyperlinking directly to a PMA to bet on...
                    : null
                }
                {
                  activeTab === "uia"
                    ? <a href={`/create_uia/index.html?id=${issuedAsset.id}`}>
                        <Button className="h-8 hover:shadow-inner" variant="outline">
                          {t("IssuedAssets:manageUIA")}
                        </Button>
                      </a> 
                    : null
                }
                {
                  activeTab === "prediction"
                    ? <a href={`/predictions/index.html?id=${issuedAsset.id}`}>
                        <Button className="h-8 hover:shadow-inner" variant="outline">
                          {t("IssuedAssets:pmaBet")}
                        </Button>
                      </a> // TODO: Support hyperlinking directly to a PMA to bet on...
                    : null
                }
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
                    {t("IssuedAssets:listingUIA", { count: relevantAssets.length })}
                  </h5>
                  {
                    loading
                      ? <div className="text-center mt-5">{t("CreditBorrow:common.loading")}</div>
                      : null  
                  }
                  { 
                    !loading && !relevantAssets || !relevantAssets.length
                      ? <div className="text-center mt-5">{t("IssuedAssets:noUIA")}</div>
                      : <List
                          height={500}
                          itemCount={relevantAssets.length}
                          itemSize={90}
                          className="w-full"
                        >
                          {AssetRow}
                        </List>
                  }
                </TabsContent>
                <TabsContent value="smartcoins">
                  <h5 className="mb-2 text-center">
                    {t("IssuedAssets:listingSmartcoins", { count: relevantAssets.length })}
                  </h5>
                  {
                    loading
                      ? <div className="text-center mt-5">{t("CreditBorrow:common.loading")}</div>
                      : null  
                  }
                  { 
                    !loading && !relevantAssets || !relevantAssets.length
                      ? <div className="text-center mt-5">{t("IssuedAssets:noSmartcoins")}</div>
                      : <List
                          height={500}
                          itemCount={relevantAssets.length}
                          itemSize={90}
                          className="w-full"
                        >
                          {AssetRow}
                        </List>
                  }
                </TabsContent>
                <TabsContent value="prediction">
                  <h5 className="mb-2 text-center">
                    {t("IssuedAssets:listingPredictionMarkets", { count: relevantAssets.length })}
                  </h5>
                  {
                    loading
                      ? <div className="text-center mt-5">{t("CreditBorrow:common.loading")}</div>
                      : null  
                  }
                  { 
                    !loading && !relevantAssets || !relevantAssets.length
                      ? <div className="text-center mt-5">{t("IssuedAssets:noPredictionMarkets")}</div>
                      : <List
                          height={500}
                          itemCount={relevantAssets.length}
                          itemSize={90}
                          className="w-full"
                        >
                          {AssetRow}
                        </List>
                  }
                </TabsContent>
                <TabsContent value="nft">
                  <h5 className="mb-2 text-center">
                    {t("IssuedAssets:listingNFTs", { count: relevantAssets.length })}
                  </h5>
                  {
                    loading
                      ? <div className="text-center mt-5">{t("CreditBorrow:common.loading")}</div>
                      : null  
                  }
                  { 
                    !loading && !relevantAssets || !relevantAssets.length
                      ? <div className="text-center mt-5">{t("IssuedAssets:noNFTs")}</div>
                      : <List
                          height={500}
                          itemCount={relevantAssets.length}
                          itemSize={90}
                          className="w-full"
                        >
                          {AssetRow}
                        </List>
                  }
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
