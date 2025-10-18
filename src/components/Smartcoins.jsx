import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { List } from "react-window";
import Fuse from "fuse.js";
import { useStore } from "@nanostores/react";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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

import { debounce } from "@/lib/common.js";
import { getFlagBooleans } from "@/lib/common.js";
import { humanReadableFloat } from "@/lib/common.js";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createSmartcoinsStore } from "@/nanoeffects/Smartcoins.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import ExternalLink from "./common/ExternalLink.jsx";

const activeTabStyle = {
  backgroundColor: "#252526",
  color: "white",
};

export default function Smartcoins(properties) {
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

  const [usrBalances, setUsrBalances] = useState();
  const [newBitassetData, setNewBitassetdata] = useState([]);
  const [baseAssetData, setBaseAssetData] = useState([]);
  const [assetIssuers, setAssetIssuers] = useState([]);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createSmartcoinsStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          if (data._assets) {
            setBaseAssetData(data._assets);
          }
          if (data._issuers) {
            setAssetIssuers(data._issuers);
          }
          if (data._smartcoins) {
            const filteredSmartcoins = data._smartcoins.filter(
              (x) =>
                parseInt(x.current_feed.settlement_price.base.amount) !== 0 &&
                parseInt(x.current_feed.settlement_price.quote.amount) !== 0 &&
                x.feeds.length &&
                (parseInt(x.settlement_price.base.amount) === 0 ||
                  parseInt(x.settlement_price.quote.amount) === 0 ||
                  parseInt(x.settlement_fund) === 0)
            );
            setNewBitassetdata(filteredSmartcoins);
          }
          if (data._balances) {
            setUsrBalances(data._balances);
          }
        }
      });
    }

    if (usr && usr.id && currentNode && currentNode.url) {
      fetching();
    }
  }, [usr, currentNode]);

  const [dynamicData, setDynamicData] = useState([]);
  useEffect(() => {
    async function fetching() {
      const dynamicIDs = newBitassetData
        .map((x) => baseAssetData.find((y) => y.id === x.asset_id))
        .map((a) => a.dynamic_asset_data_id);

      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(dynamicIDs),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const finalDynamicData = data.map((x) => {
            return {
              ...x,
              asset_id: baseAssetData.find(
                (b) => b.dynamic_asset_data_id === x.id
              ).id,
            };
          });
          setDynamicData(finalDynamicData);
        }
      });
    }

    if (newBitassetData) {
      fetching();
    }
  }, [newBitassetData, baseAssetData]);

  const compatibleSmartcoins = useMemo(() => {
    if (usrBalances && newBitassetData) {
      const _smartcoins = newBitassetData.filter((bitasset) => {
        const collateralAssetBalance = usrBalances.find(
          (x) => x.asset_id === bitasset.options.short_backing_asset
        );

        return !collateralAssetBalance ||
          (collateralAssetBalance && !collateralAssetBalance.amount > 0)
          ? false
          : true;
      });

      return _smartcoins;
    }
  }, [usrBalances, newBitassetData]);

  const heldSmartcoins = useMemo(() => {
    if (usrBalances && newBitassetData) {
      const _smartcoins = newBitassetData.filter((bitasset) => {
        const debtAssetBalance = usrBalances.find(
          (x) => x.asset_id === bitasset.asset_id
        );

        return debtAssetBalance ? true : false;
      });

      return _smartcoins;
    }
  }, [usrBalances, newBitassetData]);

  const [activeTab, setActiveTab] = useState("all");
  const [activeSearch, setActiveSearch] = useState("borrow");
  const [mode, setMode] = useState("bitassets");

  const assetSearch = useMemo(() => {
    if (
      !newBitassetData ||
      !newBitassetData.length ||
      !baseAssetData ||
      !assetIssuers
    ) {
      return;
    }

    const updatedBitassetData = newBitassetData.map((bitasset) => {
      const _asset = baseAssetData.find((x) => x.id === bitasset.asset_id);
      const issuerAccount = assetIssuers.find((x) => x.id === _asset.issuer);
      const thisCollateralAssetData = baseAssetData.find(
        (x) => x.id === bitasset.options.short_backing_asset
      );

      return {
        ...bitasset,
        offer_symbol: _asset ? _asset.symbol : "",
        collateral_symbol: thisCollateralAssetData
          ? thisCollateralAssetData.symbol
          : "",
        issuerAccount: issuerAccount ? issuerAccount.name : "",
      };
    });

    let keys;
    if (activeSearch === "borrow") {
      keys = ["offer_symbol", "asset_id"];
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
  }, [newBitassetData, activeSearch]);

  const [thisInput, setThisInput] = useState();
  const [thisSearchInput, setThisSearchInput] = useState();
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

  const relevantBitassetData = useMemo(() => {
    if (
      !baseAssetData ||
      !baseAssetData.length ||
      !assetIssuers ||
      !assetIssuers.length ||
      !newBitassetData ||
      !newBitassetData.length
    ) {
      return [];
    }

    let result = [];
    if (newBitassetData && activeTab === "all") {
      result = newBitassetData.filter((x) => x.feeds?.length > 0);
    } else if (compatibleSmartcoins && activeTab === "compatible") {
      result = compatibleSmartcoins.filter((x) => x.feeds?.length > 0);
    } else if (heldSmartcoins && activeTab === "holdings") {
      result = heldSmartcoins.filter((x) => x.feeds?.length > 0);
    } else {
      result = newBitassetData;
    }

    result = result.sort(
      (a, b) =>
        parseInt(b.asset_id.replace("1.3.", "")) -
        parseInt(a.asset_id.replace("1.3.", ""))
    );
    result = result.filter((x) => !x.is_prediction_market);

    return result.filter((x) => {
      const _assetData = baseAssetData.find((y) => y.id === x.asset_id);
      const _issuerData = _assetData
        ? assetIssuers.find((z) => z.id === _assetData.issuer)
        : null;

      if (mode === "bitassets") {
        return _issuerData.name === "committee-account";
      } else if (mode === "honest") {
        return _issuerData.name === "honest-quorum";
      } else if (mode === "privateSmartcoins") {
        return (
          _issuerData.name !== "committee-account" &&
          _issuerData.name !== "honest-quorum"
        );
      }
    });
  }, [
    newBitassetData,
    baseAssetData,
    assetIssuers,
    compatibleSmartcoins,
    heldSmartcoins,
    activeTab,
    mode,
  ]);

  function CommonRow({ index, style, bitasset }) {
    if (!bitasset || !baseAssetData || !baseAssetData.length) {
      return null;
    }

    const thisBitassetData = baseAssetData.find(
      (x) => x.id === bitasset.asset_id
    );
    const thisCollateralAssetData = baseAssetData.find(
      (x) => x.id === bitasset.options.short_backing_asset
    );
    const issuer = assetIssuers.find((x) => x.id === thisBitassetData.issuer);

    if (!thisBitassetData || !thisCollateralAssetData || !issuer) {
      return null;
    }

    const _flags = getFlagBooleans(thisBitassetData.options.flags);
    const _issuer_permissions = getFlagBooleans(
      thisBitassetData.options.issuer_permissions
    );

    const foundDynamicData = dynamicData.find(
      (x) => x.asset_id === thisBitassetData.id
    );
    let currentSupply = foundDynamicData
      ? humanReadableFloat(
          parseInt(foundDynamicData.current_supply),
          thisBitassetData.precision
        )
      : 0;

    const _price = parseFloat(
      (
        humanReadableFloat(
          parseInt(bitasset.current_feed.settlement_price.quote.amount),
          thisCollateralAssetData.precision
        ) /
        humanReadableFloat(
          parseInt(bitasset.current_feed.settlement_price.base.amount),
          thisBitassetData.precision
        )
      ).toFixed(thisCollateralAssetData.precision)
    );

    return (
      <div style={{ ...style }} key={`acard-${bitasset.asset_id}`}>
        <Card className="ml-2 mr-2">
          <CardHeader className="pb-1">
            <CardTitle>
              {mode === "bitasset" ? "Bitasset" : "Smartcoin"} "
              <ExternalLink
                classnamecontents="hover:text-purple-500"
                type="text"
                text={thisBitassetData.symbol}
                hyperlink={`https://explorer.bitshares.ws/#/assets/${
                  thisBitassetData.symbol
                }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
              />
              " {"("}
              <ExternalLink
                classnamecontents="hover:text-purple-500"
                type="text"
                text={thisBitassetData.id}
                hyperlink={`https://explorer.bitshares.ws/#/assets/${
                  thisBitassetData.id
                }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
              />
              {")"}{" "}
              {issuer ? (
                <>
                  {t("Smartcoins:createdBy")}{" "}
                  <ExternalLink
                    classnamecontents="hover:text-purple-500"
                    type="text"
                    text={issuer.name}
                    hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                      issuer.name
                    }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                  />{" "}
                  {"("}
                  <ExternalLink
                    classnamecontents="hover:text-purple-500"
                    type="text"
                    text={issuer.id}
                    hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                      issuer.id
                    }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                  />
                  {")"}
                </>
              ) : null}
            </CardTitle>
            <CardDescription className="text-md">
              <div className="grid grid-cols-2 gap-1">
                <div>
                  {t("Smartcoins:collateral")}:
                  <b>
                    {" "}
                    <ExternalLink
                      classnamecontents="hover:text-purple-500"
                      type="text"
                      text={thisCollateralAssetData.symbol}
                      hyperlink={`https://explorer.bitshares.ws/#/assets/${
                        thisCollateralAssetData.symbol
                      }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                    />{" "}
                    {"("}
                    <ExternalLink
                      classnamecontents="hover:text-purple-500"
                      type="text"
                      text={thisCollateralAssetData.id}
                      hyperlink={`https://explorer.bitshares.ws/#/assets/${
                        thisCollateralAssetData.id
                      }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                    />
                    {")"}
                  </b>
                </div>
                <div>
                  {t("Smartcoins:currentSupply")}
                  {": "}
                  <b>
                    {currentSupply.toLocaleString()} {thisBitassetData.symbol}
                  </b>
                </div>
                <div>
                  {t("Smartcoins:currentSettlementPrice")}
                  {": "}
                  <b>
                    {_price > 0
                      ? `${_price} ${thisCollateralAssetData.symbol}/${thisBitassetData.symbol}`
                      : "??? ⚠️"}
                  </b>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm pb-3">
            <Badge className="mr-2 mt-2">
              {t("Smartcoins:feedQty", { qty: bitasset.feeds?.length ?? 0 })}
            </Badge>
            <Badge className="mr-2">
              MCR: {bitasset.current_feed.maintenance_collateral_ratio / 10}
            </Badge>
            <Badge className="mr-2">
              MSSR: {bitasset.current_feed.maximum_short_squeeze_ratio / 10}
            </Badge>
            <Badge className="mr-2">
              ICR: {bitasset.current_feed.initial_collateral_ratio / 10}
            </Badge>
            {_issuer_permissions &&
            Object.keys(_issuer_permissions).length > 0 ? (
              <HoverCard>
                <HoverCardTrigger>
                  <Badge className="mr-2">
                    {t("Predictions:permissions")}:{" "}
                    {Object.keys(_issuer_permissions).length}{" "}
                    <QuestionMarkCircledIcon className="ml-1" />
                  </Badge>
                </HoverCardTrigger>
                <HoverCardContent className={"w-80 mt-1"} align="start">
                  {Object.keys(_issuer_permissions).join(", ")}
                </HoverCardContent>
              </HoverCard>
            ) : (
              <Badge className="mr-2">{t("Predictions:permissions")}: 0</Badge>
            )}
            {_flags && Object.keys(_flags).length > 0 ? (
              <HoverCard>
                <HoverCardTrigger>
                  <Badge className="mr-2">
                    {t("Predictions:flags")}: {Object.keys(_flags).length}{" "}
                    <QuestionMarkCircledIcon className="ml-1" />
                  </Badge>
                </HoverCardTrigger>
                <HoverCardContent className={"w-80 mt-1"} align="start">
                  {Object.keys(_flags).join(", ")}
                </HoverCardContent>
              </HoverCard>
            ) : (
              <Badge className="mr-2">{t("Predictions:flags")}: 0</Badge>
            )}
          </CardContent>
          <CardFooter className="pb-5">
            {_price > 0 ? (
              <a href={`/smartcoin/index.html?id=${bitasset.asset_id}`}>
                <Button className="h-8">
                  {t("Smartcoins:proceedToBorrow", {
                    asset: thisBitassetData.s,
                  })}
                </Button>
              </a>
            ) : (
              <Button disabled className="h-8">
                {t("Smartcoins:proceedToBorrow", { asset: thisBitassetData.s })}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  const BitassetRow = ({ index, style }) => {
    return (
      <CommonRow
        index={index}
        style={style}
        bitasset={relevantBitassetData[index]}
      />
    );
  };

  const SearchRow = ({ index, style }) => {
    return (
      <CommonRow
        index={index}
        style={style}
        bitasset={thisResult[index].item}
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
              <CardDescription>
                {t("Smartcoins:smartcoinDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                key={`Tabs_${activeTab ?? ""}${activeSearch ?? ""}`}
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
                        window.history.replaceState(
                          {},
                          "",
                          `?tab=search&searchTab=borrow`
                        );
                      }}
                    >
                      {t("Smartcoins:search")}
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="all">
                  <div className="grid grid-cols-3 gap-5">
                    <Button
                      onClick={() => {
                        setMode("bitassets");
                      }}
                      variant={`${mode === "bitassets" ? "" : "outline"}`}
                      className="h-6 mb-3 ml-2"
                    >
                      {t("Smartcoins:bitassets")}
                    </Button>
                    <Button
                      onClick={() => {
                        setMode("honest");
                      }}
                      variant={`${mode === "honest" ? "" : "outline"}`}
                      className="h-6 mb-3 ml-2"
                    >
                      Honest™️ Smartcoins
                    </Button>
                    <Button
                      onClick={() => {
                        setMode("privateSmartcoins");
                      }}
                      variant={`${
                        mode === "privateSmartcoins" ? "" : "outline"
                      }`}
                      className="h-6 mb-3 mr-2"
                    >
                      {t("Smartcoins:privateSmartcoins")}
                    </Button>
                  </div>
                  <h5 className="mb-2 text-center">
                    {t("Smartcoins:listingAllSmartcoins", {
                      count: relevantBitassetData.length,
                    })}
                  </h5>
                  {!assetIssuers || !assetIssuers.length ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : (
                    <div className="w-full max-h-[600px] overflow-auto">
                      <List
                        rowComponent={BitassetRow}
                        rowCount={relevantBitassetData.length}
                        rowHeight={235}
                        rowProps={{}}
                      />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="compatible">
                  <div className="grid grid-cols-3 gap-5">
                    <Button
                      onClick={() => {
                        setMode("bitassets");
                      }}
                      variant={`${mode === "bitassets" ? "" : "outline"}`}
                      className="h-6 mb-3 ml-2"
                    >
                      {t("Smartcoins:bitassets")}
                    </Button>
                    <Button
                      onClick={() => {
                        setMode("honest");
                      }}
                      variant={`${mode === "honest" ? "" : "outline"}`}
                      className="h-6 mb-3 ml-2"
                    >
                      Honest™️ Smartcoins
                    </Button>
                    <Button
                      onClick={() => {
                        setMode("privateSmartcoins");
                      }}
                      variant={`${
                        mode === "privateSmartcoins" ? "" : "outline"
                      }`}
                      className="h-6 mb-3 mr-2"
                    >
                      {t("Smartcoins:privateSmartcoins")}
                    </Button>
                  </div>
                  <h5 className="mb-2 text-center">
                    {t("Smartcoins:listingCompatibleSmartcoins", {
                      count: relevantBitassetData.length,
                    })}
                  </h5>
                  {!assetIssuers || !assetIssuers.length ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : (
                    <div className="w-full max-h-[600px] overflow-auto">
                      <List
                        rowComponent={BitassetRow}
                        rowCount={relevantBitassetData.length}
                        rowHeight={235}
                        rowProps={{}}
                      />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="holdings">
                  <div className="grid grid-cols-3 gap-5">
                    <Button
                      onClick={() => {
                        setMode("bitassets");
                      }}
                      variant={`${mode === "bitassets" ? "" : "outline"}`}
                      className="h-6 mb-3 ml-2"
                    >
                      {t("Smartcoins:bitassets")}
                    </Button>
                    <Button
                      onClick={() => {
                        setMode("honest");
                      }}
                      variant={`${mode === "honest" ? "" : "outline"}`}
                      className="h-6 mb-3 ml-2"
                    >
                      Honest™️ Smartcoins
                    </Button>
                    <Button
                      onClick={() => {
                        setMode("privateSmartcoins");
                      }}
                      variant={`${
                        mode === "privateSmartcoins" ? "" : "outline"
                      }`}
                      className="h-6 mb-3 mr-2"
                    >
                      {t("Smartcoins:privateSmartcoins")}
                    </Button>
                  </div>
                  <h5 className="mb-2 text-center">
                    {t("Smartcoins:listingHeldSmartcoins", {
                      count: relevantBitassetData
                        ? relevantBitassetData.length
                        : 0,
                    })}
                  </h5>
                  {!assetIssuers || !assetIssuers.length ? (
                    <div className="text-center mt-5">
                      {t("CreditBorrow:common.loading")}
                    </div>
                  ) : (
                    <div className="w-full max-h-[600px] overflow-auto">
                      <List
                        rowComponent={BitassetRow}
                        rowCount={
                          relevantBitassetData ? relevantBitassetData.length : 0
                        }
                        rowHeight={235}
                        rowProps={{}}
                      />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="search">
                  <h5 className="mb-2 text-center">
                    {t("Smartcoins:howToSearch")}
                  </h5>{" "}
                  <Tabs
                    defaultValue={activeSearch ?? "borrow"}
                    className="w-full"
                  >
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
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=search&searchTab=borrow`
                            );
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
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=search&searchTab=issuer`
                            );
                          }}
                        >
                          {t("Smartcoins:searchByIssuer")}
                        </TabsTrigger>
                      )}
                    </TabsList>

                    <Input
                      name="searchInput"
                      placeholder={
                        thisSearchInput ?? t("Smartcoins:enterSearchText")
                      }
                      className="mb-3 mt-3 w-full"
                      value={thisSearchInput || ""}
                      onChange={(event) => {
                        setThisSearchInput(event.target.value);
                        debouncedSetSearchInput(event);
                      }}
                    />

                    <TabsContent value="borrow">
                      {thisResult && thisResult.length ? (
                        <div className="w-full max-h-[600px] overflow-auto">
                          <List
                            rowComponent={SearchRow}
                            rowCount={thisResult.length}
                            rowHeight={235}
                            rowProps={{}}
                          />
                        </div>
                      ) : null}
                      {thisInput && thisResult && !thisResult.length ? (
                        <>{t("Smartcoins:noResultsFound")}</>
                      ) : null}
                    </TabsContent>
                    <TabsContent value="collateral">
                      {thisResult && thisResult.length ? (
                        <div className="w-full max-h-[600px] overflow-auto">
                          <List
                            rowComponent={SearchRow}
                            rowCount={thisResult.length}
                            rowHeight={235}
                            rowProps={{}}
                          />
                        </div>
                      ) : null}
                      {thisInput && thisResult && !thisResult.length ? (
                        <>{t("Smartcoins:noResultsFound")}</>
                      ) : null}
                    </TabsContent>
                    <TabsContent value="issuer">
                      {thisResult && thisResult.length ? (
                        <div className="w-full max-h-[600px] overflow-auto">
                          <List
                            rowComponent={SearchRow}
                            rowCount={thisResult.length}
                            rowHeight={235}
                            rowProps={{}}
                          />
                        </div>
                      ) : null}
                      {thisInput && thisResult && !thisResult.length ? (
                        <>{t("Smartcoins:noResultsFound")}</>
                      ) : null}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
