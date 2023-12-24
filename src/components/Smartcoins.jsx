import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import Fuse from "fuse.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance } from "@/lib/i18n.js";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

import { debounce } from "../lib/common.js";

import { useInitCache } from "../effects/Init.ts";
import { createUserBalancesStore } from "../effects/User.ts";

import { $currentUser } from "../stores/users.ts";
import {
  $marketSearchCacheBTS,
  $marketSearchCacheTEST,
  $bitAssetDataCacheBTS,
  $bitAssetDataCacheTEST,
} from "../stores/cache.ts";

import CurrentUser from "./common/CurrentUser.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

const activeTabStyle = {
  backgroundColor: "#252526",
  color: "white",
};

export default function Smartcoins(properties) {
  const { t, i18n } = useTranslation("en", { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const bitAssetDataBTS = useSyncExternalStore(
    $bitAssetDataCacheBTS.subscribe,
    $bitAssetDataCacheBTS.get,
    () => true
  );

  const bitAssetDataTEST = useSyncExternalStore(
    $bitAssetDataCacheTEST.subscribe,
    $bitAssetDataCacheTEST.get,
    () => true
  );

  const _marketSearchBTS = useSyncExternalStore(
    $marketSearchCacheBTS.subscribe,
    $marketSearchCacheBTS.get,
    () => true
  );

  const _marketSearchTEST = useSyncExternalStore(
    $marketSearchCacheTEST.subscribe,
    $marketSearchCacheTEST.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", ["bitAssetData", "marketSearch"]);

  const bitAssetData = useMemo(() => {
    if (_chain && (bitAssetDataBTS || bitAssetDataTEST)) {
      return _chain === "bitshares" ? bitAssetDataBTS : bitAssetDataTEST;
    }
    return [];
  }, [bitAssetDataBTS, bitAssetDataTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const [usrBalances, setUsrBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setUsrBalances(data);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr]);

  const compatibleSmartcoins = useMemo(() => {
    if (usrBalances && bitAssetData && marketSearch) {
      const _smartcoins = bitAssetData.filter((bitasset) => {
        const collateralAssetBalance = usrBalances.find((x) => x.asset_id === bitasset.collateral);

        return !collateralAssetBalance ||
          (collateralAssetBalance && !collateralAssetBalance.amount > 0)
          ? false
          : true;
      });

      return _smartcoins;
    }
  }, [usrBalances, bitAssetData, marketSearch]);

  const heldSmartcoins = useMemo(() => {
    if (usrBalances && bitAssetData && marketSearch) {
      const _smartcoins = bitAssetData.filter((bitasset) => {
        const debtAssetBalance = usrBalances.find((x) => x.asset_id === bitasset.assetID);

        return debtAssetBalance ? true : false;
      });

      return _smartcoins;
    }
  }, [usrBalances, bitAssetData, marketSearch]);

  const [activeTab, setActiveTab] = useState("all");
  const [activeSearch, setActiveSearch] = useState("borrow");

  const assetSearch = useMemo(() => {
    if (!bitAssetData || !bitAssetData.length || !marketSearch || !marketSearch.length) {
      return;
    }

    const updatedBitassetData = bitAssetData.map((bitasset) => {
      const thisBitassetData = marketSearch.find((x) => x.id === bitasset.assetID);

      const thisCollateralAssetData = marketSearch.find((x) => x.id === bitasset.collateral);

      return {
        ...bitasset,
        offer_symbol: thisBitassetData.s,
        collateral_symbol: thisCollateralAssetData.s,
        issuerAccount: thisBitassetData.u,
      };
    });

    let keys;
    if (activeSearch === "borrow") {
      keys = ["offer_symbol", "assetID"];
    } else if (activeSearch === "collateral") {
      keys = ["collateral_symbol", "collateral"];
    } else if (activeSearch === "issuer") {
      keys = ["issuerAccount"];
    }
    return new Fuse(updatedBitassetData, {
      includeScore: true,
      threshold: 0.2,
      keys: keys,
    });
  }, [bitAssetData, marketSearch, activeSearch]);

  const [thisInput, setThisInput] = useState();
  const [thisResult, setThisResult] = useState();

  useEffect(() => {
    if (assetSearch && thisInput) {
      const result = assetSearch.search(thisInput);
      setThisResult(result);
    }
  }, [assetSearch, thisInput]);

  const debouncedSetSearchInput = useCallback(
    // Throttle slider
    debounce((event) => {
      setThisInput(event.target.value);
      window.history.replaceState(
        {},
        "",
        `?tab=search&searchTab=${activeSearch}&searchText=${event.target.value}`
      );
    }, 500),
    []
  );

  function CommonRow({ index, style, bitasset, thisBitassetData, thisCollateralAssetData }) {
    return (
      <div style={{ ...style }} key={`acard-${bitasset.assetID}`}>
        <Card className="ml-2 mr-2" onClick={() => {}}>
          <CardHeader className="pb-1">
            <CardTitle>
              {bitasset.issuer.id === "1.2.0" ? "Bitasset" : "Smartcoin"} "{thisBitassetData.s}"{" "}
              {"("}
              <ExternalLink
                classnamecontents="text-blue-500"
                type="text"
                text={thisBitassetData.id}
                hyperlink={`https://blocksights.info/#/assets/${thisBitassetData.id}`}
              />
              {")"} {t("Smartcoins:createdBy")} {bitasset.issuer.name} {"("}
              <ExternalLink
                classnamecontents="text-blue-500"
                type="text"
                text={bitasset.issuer.id}
                hyperlink={`https://blocksights.info/#/accounts/${bitasset.issuer.id}`}
              />
              {")"}
            </CardTitle>
            <CardDescription>
              {t("Smartcoins:backingCollateral")}:
              <b>
                {` ${thisCollateralAssetData.s} `}
                {"("}
                <ExternalLink
                  classnamecontents="text-blue-500"
                  type="text"
                  text={thisCollateralAssetData.id}
                  hyperlink={`https://blocksights.info/#/assets/${thisCollateralAssetData.id}`}
                />
                {")"}
              </b>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm pb-3">
            <Badge className="mr-2 mt-2">
              {t("Smartcoins:feedQty", { qty: bitasset.feeds?.length ?? 0 })}
            </Badge>
            <Badge className="mr-2">{t("Smartcoins:mcr", { mcr: bitasset.mcr / 10 })}</Badge>
            <Badge className="mr-2">{t("Smartcoins:mssr", { mssr: bitasset.mssr / 10 })}</Badge>
            <Badge className="mr-2">{t("Smartcoins:icr", { icr: bitasset.icr / 10 })}</Badge>
          </CardContent>
          <CardFooter className="pb-5">
            <a href={`/smartcoin/index.html?id=${bitasset.assetID}`}>
              <Button className="h-8">
                {t("Smartcoins:proceedToBorrow", { asset: thisBitassetData.s })}
              </Button>
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const PlaceholderRow = ({ index, style }) => {
    return (
      <div style={{ ...style }} key={`acard-${index}`}>
        <Card className="ml-2 mr-2">
          <CardHeader className="pb-1">
            <CardTitle>{t("Smartcoins:placeholderSmartcoinCreated")}</CardTitle>
            <CardDescription>
              {t("Smartcoins:placeholderBackingCollateral")}
              <b>{` ... (1.3.x)`}</b>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm pb-3">
            <Badge className="mr-2 mt-2">{t("Smartcoins:placeholderFeedQty")}</Badge>
            <Badge className="mr-2">{t("Smartcoins:placeholderMCR")}</Badge>
            <Badge className="mr-2">{t("Smartcoins:placeholderMSSR")}</Badge>
            <Badge className="mr-2">{t("Smartcoins:placeholderICR")}</Badge>
          </CardContent>
          <CardFooter className="pb-5">
            <Button className="h-8">{t("Smartcoins:placeholderProceedToBorrow")}</Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  const BitassetRow = ({ index, style }) => {
    let bitasset;
    if (activeTab === "all") {
      bitasset = bitAssetData[index];
    } else if (activeTab === "compatible") {
      bitasset = compatibleSmartcoins[index];
    } else if (activeTab === "holdings") {
      bitasset = heldSmartcoins[index];
    }

    const thisBitassetData =
      bitasset && marketSearch ? marketSearch.find((x) => x.id === bitasset.assetID) : null;

    const thisCollateralAssetData =
      bitasset && marketSearch ? marketSearch.find((x) => x.id === bitasset.collateral) : null;

    if (!bitasset || !thisBitassetData || !thisCollateralAssetData) {
      return null;
    }

    return (
      <CommonRow
        index={index}
        style={style}
        bitasset={bitasset}
        thisBitassetData={thisBitassetData}
        thisCollateralAssetData={thisCollateralAssetData}
      />
    );
  };

  const SearchRow = ({ index, style }) => {
    let bitasset = thisResult[index].item;

    const thisBitassetData = marketSearch.find((x) => x.id === bitasset.assetID);

    const thisCollateralAssetData = marketSearch.find((x) => x.id === bitasset.collateral);

    return (
      <CommonRow
        index={index}
        style={style}
        bitasset={bitasset}
        thisBitassetData={thisBitassetData}
        thisCollateralAssetData={thisCollateralAssetData}
      />
    );
  };

  useEffect(() => {
    if (assetSearch) {
      //console.log("Parsing url params");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());

      if (params && params.tab) {
        if (!["all", "compatible", "holdings", "search"].includes(params.tab)) {
          return;
        }
        setActiveTab(params.tab);
      } else {
        window.history.replaceState({}, "", `?tab=all`);
      }
      if (params && params.searchTab) {
        if (!["borrow", "collateral", "issuer"].includes(params.searchTab)) {
          return;
        }
        setActiveSearch(params.searchTab);
      }
      if (params && params.searchText) {
        const isValid = (str) => /^[a-zA-Z0-9.-]+$/.test(str);
        if (!isValid(params.searchText)) {
          return;
        }
        setThisInput(params.searchText);
      }
    }
  }, [assetSearch]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("Smartcoins:selectBorrowableAsset")}</CardTitle>
              <CardDescription>{t("Smartcoins:smartcoinDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {bitAssetData && bitAssetData.length && usrBalances ? (
                <Tabs
                  key={`Tabs_${activeTab ?? ""}${activeSearch ?? ""}${thisInput ?? ""}`}
                  defaultValue={activeTab ?? "all"}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-4 gap-2">
                    {activeTab === "all" ? (
                      <TabsTrigger value="all" style={activeTabStyle}>
                        {t("Smartcoins:viewingAllAssets")}
                      </TabsTrigger>
                    ) : (
                      <TabsTrigger
                        value="all"
                        onClick={() => {
                          setActiveTab("all");
                          window.history.replaceState({}, "", `?tab=all`);
                        }}
                      >
                        {t("Smartcoins:viewAllAssets")}
                      </TabsTrigger>
                    )}
                    {activeTab === "compatible" ? (
                      <TabsTrigger value="compatible" style={activeTabStyle}>
                        {t("Smartcoins:viewingCompatible")}
                      </TabsTrigger>
                    ) : (
                      <TabsTrigger
                        value="compatible"
                        onClick={() => {
                          setActiveTab("compatible");
                          window.history.replaceState({}, "", `?tab=compatible`);
                        }}
                      >
                        {t("Smartcoins:viewCompatible")}
                      </TabsTrigger>
                    )}
                    {activeTab === "holdings" ? (
                      <TabsTrigger value="holdings" style={activeTabStyle}>
                        {t("Smartcoins:viewingHoldings")}
                      </TabsTrigger>
                    ) : (
                      <TabsTrigger
                        value="holdings"
                        onClick={() => {
                          setActiveTab("holdings");
                          window.history.replaceState({}, "", `?tab=holdings`);
                        }}
                      >
                        {t("Smartcoins:viewHoldings")}
                      </TabsTrigger>
                    )}
                    {activeTab === "search" ? (
                      <TabsTrigger value="search" style={activeTabStyle}>
                        {t("Smartcoins:searching")}
                      </TabsTrigger>
                    ) : (
                      <TabsTrigger
                        value="search"
                        onClick={() => {
                          setActiveTab("search");
                          window.history.replaceState({}, "", `?tab=search&searchTab=borrow`);
                        }}
                      >
                        {t("Smartcoins:search")}
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="all">
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:listingAllSmartcoins", { count: bitAssetData.length })}
                    </h5>
                    <List
                      height={500}
                      itemCount={bitAssetData.length}
                      itemSize={200}
                      className="w-full"
                    >
                      {BitassetRow}
                    </List>
                  </TabsContent>
                  <TabsContent value="compatible">
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:listingCompatibleSmartcoins", {
                        count: compatibleSmartcoins.length,
                      })}
                    </h5>
                    <List
                      height={500}
                      itemCount={compatibleSmartcoins.length}
                      itemSize={200}
                      className="w-full"
                    >
                      {BitassetRow}
                    </List>
                  </TabsContent>
                  <TabsContent value="holdings">
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:listingHeldSmartcoins", {
                        count: heldSmartcoins ? heldSmartcoins.length : 0,
                      })}
                    </h5>
                    <List
                      height={500}
                      itemCount={heldSmartcoins ? heldSmartcoins.length : 0}
                      itemSize={200}
                      className="w-full"
                    >
                      {BitassetRow}
                    </List>
                  </TabsContent>
                  <TabsContent value="search">
                    <h5 className="mb-2 text-center">{t("Smartcoins:howToSearch")}</h5>{" "}
                    <Tabs defaultValue={activeSearch ?? "borrow"} className="w-full">
                      <TabsList className="grid w-full grid-cols-3 gap-2">
                        {activeSearch === "borrow" ? (
                          <TabsTrigger value="borrow" style={activeTabStyle}>
                            {t("Smartcoins:searchingByBorrowable")}
                          </TabsTrigger>
                        ) : (
                          <TabsTrigger
                            value="borrow"
                            onClick={() => {
                              setActiveSearch("borrow");
                              window.history.replaceState({}, "", `?tab=search&searchTab=borrow`);
                            }}
                          >
                            {t("Smartcoins:searchByBorrowable")}
                          </TabsTrigger>
                        )}
                        {activeSearch === "collateral" ? (
                          <TabsTrigger value="collateral" style={activeTabStyle}>
                            {t("Smartcoins:searchingByCollateral")}
                          </TabsTrigger>
                        ) : (
                          <TabsTrigger
                            value="collateral"
                            onClick={() => {
                              setActiveSearch("collateral");
                              window.history.replaceState(
                                {},
                                "",
                                `?tab=search&searchTab=collateral`
                              );
                            }}
                          >
                            {t("Smartcoins:searchByCollateral")}
                          </TabsTrigger>
                        )}
                        {activeSearch === "issuer" ? (
                          <TabsTrigger value="issuer" style={activeTabStyle}>
                            {t("Smartcoins:searchingByIssuer")}
                          </TabsTrigger>
                        ) : (
                          <TabsTrigger
                            value="issuer"
                            onClick={() => {
                              setActiveSearch("issuer");
                              window.history.replaceState({}, "", `?tab=search&searchTab=issuer`);
                            }}
                          >
                            {t("Smartcoins:searchByIssuer")}
                          </TabsTrigger>
                        )}
                      </TabsList>

                      <Input
                        name="searchInput"
                        placeholder={thisInput ?? t("Smartcoins:enterSearchText")}
                        className="mb-3 mt-3 w-full"
                        onChange={(event) => debouncedSetSearchInput(event)}
                      />

                      <TabsContent value="borrow">
                        {thisResult && thisResult.length ? (
                          <List
                            height={500}
                            itemCount={thisResult.length}
                            itemSize={200}
                            className="w-full"
                          >
                            {SearchRow}
                          </List>
                        ) : null}
                        {thisInput && thisResult && !thisResult.length ? (
                          <>{t("Smartcoins:noResultsFound")}</>
                        ) : null}
                      </TabsContent>
                      <TabsContent value="collateral">
                        {thisResult && thisResult.length ? (
                          <List
                            height={500}
                            itemCount={thisResult.length}
                            itemSize={200}
                            className="w-full"
                          >
                            {SearchRow}
                          </List>
                        ) : null}
                        {thisInput && thisResult && !thisResult.length ? (
                          <>{t("Smartcoins:noResultsFound")}</>
                        ) : null}
                      </TabsContent>
                      <TabsContent value="issuer">
                        {thisResult && thisResult.length ? (
                          <List
                            height={500}
                            itemCount={thisResult.length}
                            itemSize={200}
                            className="w-full"
                          >
                            {SearchRow}
                          </List>
                        ) : null}
                        {thisInput && thisResult && !thisResult.length ? (
                          <>{t("Smartcoins:noResultsFound")}</>
                        ) : null}
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                </Tabs>
              ) : (
                <Tabs defaultValue={"all"} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 gap-2">
                    <TabsTrigger value="all" style={activeTabStyle}>
                      {t("Smartcoins:viewingAllAssets")}
                    </TabsTrigger>
                    <TabsTrigger value="all">{t("Smartcoins:viewCompatible")}</TabsTrigger>
                    <TabsTrigger value="all">{t("Smartcoins:viewHoldings")}</TabsTrigger>
                    <TabsTrigger value="all">{t("Smartcoins:search")}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all">
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:listingAllSmartcoins", { count: "..." })}
                    </h5>
                    <List height={500} itemCount={3} itemSize={200} className="w-full">
                      {PlaceholderRow}
                    </List>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}
        </div>
      </div>
    </>
  );
}
