import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { List } from "react-window";
import Fuse from "fuse.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";

import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";

import { humanReadableFloat, debounce } from "@/lib/common.js";
import ExternalLink from "./common/ExternalLink.jsx";

function hoursTillExpiration(expirationTime) {
  var expirationDate = new Date(expirationTime);
  var currentDate = new Date();
  var difference = expirationDate - currentDate;
  var hours = Math.round(difference / 1000 / 60 / 60);
  return hours;
}

const activeTabStyle = {
  backgroundColor: "#252526",
  color: "white",
};

const isValid = (str) => /^[a-zA-Z0-9.-]+$/.test(str);

export default function CreditBorrow(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
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

  const { _assetsBTS, _assetsTEST, _offersBTS, _offersTEST } = properties;

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

  const offers = useMemo(() => {
    if (_chain && (_offersBTS || _offersTEST)) {
      let currentOffers =
        _chain === "bitshares"
          ? _offersBTS.filter(
              (x) => hoursTillExpiration(x.auto_disable_time) >= 0
            )
          : _offersTEST.filter(
              (x) => hoursTillExpiration(x.auto_disable_time) >= 0
            );

      if (_chain === "bitshares" && blocklist && blocklist.users) {
        // Discard offers from banned users
        currentOffers = currentOffers.filter(
          (offer) =>
            !blocklist.users.includes(
              toHex(sha256(utf8ToBytes(offer.owner_account)))
            )
        );
      }

      return currentOffers;
    }
    return [];
  }, [_offersBTS, _offersTEST, _chain]);

  const [activeTab, setActiveTab] = useState("allOffers");
  const [activeSearch, setActiveSearch] = useState("borrow"); // borrow, collateral, owner_name
  const [thisInput, setThisInput] = useState();
  const [thisResult, setThisResult] = useState();

  const [usrBalances, setUsrBalances] = useState();
  const [balanceAssetIDs, setBalanceAssetIDs] = useState([]);
  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );

            setBalanceAssetIDs(filteredData.map((x) => x.asset_id));
            setUsrBalances(filteredData);
          }
        });
      }
    }

    fetchUserBalances();
  }, [usr]);

  const compatibleOffers = useMemo(() => {
    if (!offers || !balanceAssetIDs) return [];

    return offers.filter((offer) => {
      return offer.acceptable_collateral.some((x) => {
        return balanceAssetIDs.includes(x[0]);
      });
    });
  }, [offers, balanceAssetIDs]);

  const offerSearch = useMemo(() => {
    if (!offers || !offers.length || !assets || !assets.length) {
      return;
    }

    let adjustedOffers = [];
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      if (!offer) {
        continue;
      }
      if (offer.acceptable_collateral) {
        offer["collateral_symbols"] = offer.acceptable_collateral
          .map((asset) => {
            const searched = assets.find((x) => x.id === asset[0]);
            return searched?.symbol;
          })
          .filter((x) => x);
      }
      offer["offer_symbols"] = [
        assets.find((x) => x.id === offer.asset_type).symbol,
      ];
      adjustedOffers.push(offer);
    }

    let keys = []; // Initialize keys as an empty array
    if (activeSearch === "borrow") {
      keys = ["offer_symbols"];
    } else if (activeSearch === "collateral") {
      keys = ["collateral_symbols"];
    } else if (activeSearch === "owner_name") {
      keys = ["owner_name"];
    }
    return new Fuse(offers, {
      includeScore: true,
      threshold: 0.2,
      keys: keys,
    });
  }, [offers, assets, activeSearch]);

  useEffect(() => {
    //console.log("Parsing url params");
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());

    let finalTab = "";
    let finalSearchTab = "";
    let searchInput = "";
    let finalURL = "?";
    if (
      params &&
      params.tab &&
      ["allOffers", "availableOffers", "searchOffers"].includes(params.tab)
    ) {
      finalTab = params.tab;
      finalURL += `tab=${params.tab}`;
    } else {
      finalTab = "allOffers";
      finalURL += "tab=allOffers";
    }

    if (
      params &&
      params.tab &&
      params.tab === "searchOffers" &&
      params.searchTab
    ) {
      if (["borrow", "collateral", "owner_name"].includes(params.searchTab)) {
        finalSearchTab = params.searchTab;
        finalURL += `&searchTab=${params.searchTab}`;
      } else {
        finalSearchTab = "borrow";
        finalURL += "&searchTab=borrow";
      }
    }

    if (
      params &&
      params.tab &&
      params.searchTab &&
      params.tab === "searchOffers" &&
      params.searchText &&
      params.searchText.length
    ) {
      if (isValid(params.searchText)) {
        searchInput = params.searchText;
        finalURL += `&searchText=${params.searchText}`;
      } else {
        searchInput = "";
        finalURL += "&searchText=bts";
      }
    }

    setActiveTab(finalTab);
    setActiveSearch(finalSearchTab);
    setThisInput(searchInput);
    window.history.replaceState({}, "", finalURL);
  }, []);

  useEffect(() => {
    if (offerSearch && thisInput) {
      if (!isValid(thisInput)) {
        return;
      }
      window.history.replaceState(
        {},
        "",
        `?tab=searchOffers&searchTab=${activeSearch ?? "borrow"}${
          thisInput ? `&searchText=${thisInput}` : ""
        }`
      );
      const result = offerSearch.search(thisInput);
      setThisResult(result);
    }
  }, [offerSearch, thisInput]);

  function CommonRow({ index, style, res, foundAsset }) {
    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2">
          <CardHeader className="pb-1">
            <CardTitle>
              {t("CreditBorrow:common.offer")}
              {" #"}
              <ExternalLink
                classnamecontents="hover:text-purple-500"
                type="text"
                text={res.id.replace("1.21.", "")}
                hyperlink={`https://explorer.bitshares.ws/#/credit-offers/${res.id.replace(
                  "1.21.",
                  ""
                )}${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
              />{" "}
              {t("CreditBorrow:common.by")}{" "}
              <ExternalLink
                classnamecontents="hover:text-purple-500"
                type="text"
                text={res.owner_name}
                hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                  res.owner_name
                }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
              />{" "}
              (
              <ExternalLink
                classnamecontents="hover:text-purple-500"
                type="text"
                text={res.owner_account}
                hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                  res.owner_account
                }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
              />
              )
            </CardTitle>
            <CardDescription>
              {t("CreditBorrow:common.offering")}
              <b>
                {` ${humanReadableFloat(
                  res.current_balance,
                  foundAsset.precision
                )} `}
                <ExternalLink
                  classnamecontents="hover:text-purple-500"
                  type="text"
                  text={foundAsset.symbol}
                  hyperlink={`https://explorer.bitshares.ws/#/asset/${
                    foundAsset.symbol
                  }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                />
                (
                <ExternalLink
                  classnamecontents="hover:text-purple-500"
                  type="text"
                  text={res.asset_type}
                  hyperlink={`https://explorer.bitshares.ws/#/asset/${
                    res.asset_type
                  }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                />
                )
              </b>
              <br />
              {t("CreditBorrow:common.accepting")}
              <b className="ml-1">
                {assets && assets.length
                  ? res.acceptable_collateral
                      .map((asset) => asset[0])
                      .map((x) => {
                        return assets.find((y) => y.id === x)?.symbol;
                      })
                      .map((x, index, array) => (
                        <>
                          <ExternalLink
                            classnamecontents="hover:text-purple-500"
                            type="text"
                            text={x}
                            hyperlink={`https://explorer.bitshares.ws/#/asset/${x}${
                              usr.chain === "bitshares"
                                ? ""
                                : "?network=testnet"
                            }`}
                          />
                          {index < array.length - 1 && ", "}
                        </>
                      ))
                  : t("CreditBorrow:common.loading")}
              </b>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm pb-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-1">
                {t("CreditBorrow:common.fee", { fee: res.fee_rate / 10000 })}
                <br />
                {t("CreditBorrow:common.repayPeriod", {
                  repayPeriod: (res.max_duration_seconds / 60 / 60).toFixed(
                    res.max_duration_seconds / 60 / 60 < 1 ? 2 : 0
                  ),
                })}
              </div>
              <div className="col-span-1">
                {t("CreditBorrow:common.validity", {
                  validity: hoursTillExpiration(res.auto_disable_time),
                })}
                <br />
                {t("CreditBorrow:common.min", {
                  amount: humanReadableFloat(
                    res.min_deal_amount,
                    foundAsset.precision
                  ),
                  asset: foundAsset.symbol,
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="pb-5">
            <a href={`/offer/index.html?id=${res.id}`}>
              <Button>
                {t("CreditBorrow:common.proceed", {
                  offerID: res.id.replace("1.21.", ""),
                })}
              </Button>
            </a>
            <a href={`/lend/index.html?id=${res.id}`}>
              <Button className="ml-2">
                {t(
                  `CreditBorrow:common.${
                    usr.id === res.owner_account ? "edit" : "view"
                  }`,
                  {
                    offerID: res.id.replace("1.21.", ""),
                  }
                )}
              </Button>
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const BalanceRow = ({ index, style }) => {
    let res = compatibleOffers[index];

    const foundAsset = assets.find((x) => x.id === res.asset_type);

    if (!res || !foundAsset) {
      return null;
    }

    return (
      <CommonRow
        index={index}
        style={style}
        res={res}
        foundAsset={foundAsset}
      />
    );
  };

  const OfferRow = ({ index, style }) => {
    let res = offers[index];

    const foundAsset = assets.find((x) => x.id === res.asset_type);

    if (!res || !foundAsset) {
      return null;
    }

    return (
      <CommonRow
        index={index}
        style={style}
        res={res}
        foundAsset={foundAsset}
      />
    );
  };

  const SearchRow = ({ index, style }) => {
    let res = thisResult[index].item;
    const foundAsset = assets.find((x) => x.id === res.asset_type);

    if (!res || !foundAsset) {
      return null;
    }

    return (
      <CommonRow
        index={index}
        style={style}
        res={res}
        foundAsset={foundAsset}
      />
    );
  };

  const [thisSearchInput, setThisSearchInput] = useState();

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

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-1/2">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{t("CreditBorrow:card.title")}</CardTitle>
              <CardDescription>
                {t("CreditBorrow:card.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {offers && offers.length && activeTab ? (
                <>
                  <Tabs
                    key={`top_tab_${activeTab}`}
                    defaultValue={activeTab}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 gap-2">
                      {activeTab === "allOffers" ? (
                        <TabsTrigger value="allOffers" style={activeTabStyle}>
                          {t("CreditBorrow:card.viewingAll")}
                        </TabsTrigger>
                      ) : (
                        <TabsTrigger
                          value="allOffers"
                          onClick={(event) => {
                            setActiveTab("allOffers");
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=allOffers`
                            );
                          }}
                        >
                          {t("CreditBorrow:card.viewAll")}
                        </TabsTrigger>
                      )}
                      {activeTab === "availableOffers" ? (
                        <TabsTrigger
                          value="availableOffers"
                          style={activeTabStyle}
                        >
                          {t("CreditBorrow:card.viewingAvailable")}
                        </TabsTrigger>
                      ) : (
                        <TabsTrigger
                          value="availableOffers"
                          onClick={(event) => {
                            setActiveTab("availableOffers");
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=availableOffers`
                            );
                          }}
                        >
                          {t("CreditBorrow:card.viewAvailable")}
                        </TabsTrigger>
                      )}
                      {activeTab === "searchOffers" ? (
                        <TabsTrigger
                          value="searchOffers"
                          style={activeTabStyle}
                        >
                          {t("CreditBorrow:card.viewingSearch")}
                        </TabsTrigger>
                      ) : (
                        <TabsTrigger
                          value="searchOffers"
                          onClick={(event) => {
                            setActiveTab("searchOffers");
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=searchOffers&searchTab=${activeSearch}&searchText=${
                                thisInput ?? ""
                              }`
                            );
                          }}
                        >
                          {t("CreditBorrow:card.viewSearch")}
                        </TabsTrigger>
                      )}
                    </TabsList>
                    <TabsContent value="allOffers">
                      <h5 className="mb-2 text-center">
                        {t("CreditBorrow:card.allOffers")}
                      </h5>
                      {assets && offers && offers.length ? (
                        <div className="w-full max-h-[500px] overflow-auto">
                          <List
                            rowComponent={OfferRow}
                            rowCount={offers.length}
                            rowHeight={225}
                            rowProps={{}}
                          />
                        </div>
                      ) : null}
                    </TabsContent>
                    <TabsContent value="availableOffers">
                      <h5 className="mb-2 text-center">
                        {t("CreditBorrow:card.availableOffers")}
                      </h5>
                      {assets && compatibleOffers && compatibleOffers.length ? (
                        <div className="w-full max-h-[500px] overflow-auto">
                          <List
                            rowComponent={BalanceRow}
                            rowCount={compatibleOffers.length}
                            rowHeight={225}
                            rowProps={{}}
                          />
                        </div>
                      ) : null}
                    </TabsContent>
                    <TabsContent value="searchOffers">
                      <h5 className="mb-2 text-center">
                        {t("CreditBorrow:card.searchPrompt")}
                      </h5>
                      <Tabs
                        defaultValue={activeSearch ?? "borrow"}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-3 gap-2">
                          {activeSearch === "borrow" ? (
                            <TabsTrigger value="borrow" style={activeTabStyle}>
                              {t("CreditBorrow:card.borrowSearching")}
                            </TabsTrigger>
                          ) : (
                            <TabsTrigger
                              value="borrow"
                              onClick={() => {
                                setActiveSearch("borrow");
                                window.history.replaceState(
                                  {},
                                  "",
                                  `?tab=searchOffers&searchTab=borrow${
                                    thisInput ? `&searchText=${thisInput}` : ""
                                  }`
                                );
                              }}
                            >
                              {t("CreditBorrow:card.borrowSearch")}
                            </TabsTrigger>
                          )}
                          {activeSearch === "collateral" ? (
                            <TabsTrigger
                              value="collateral"
                              style={activeTabStyle}
                            >
                              {t("CreditBorrow:card.collateralSearching")}
                            </TabsTrigger>
                          ) : (
                            <TabsTrigger
                              value="collateral"
                              onClick={() => {
                                setActiveSearch("collateral");
                                window.history.replaceState(
                                  {},
                                  "",
                                  `?tab=searchOffers&searchTab=collateral${
                                    thisInput ? `&searchText=${thisInput}` : ""
                                  }`
                                );
                              }}
                            >
                              {t("CreditBorrow:card.collateralSearch")}
                            </TabsTrigger>
                          )}
                          {activeSearch === "owner_name" ? (
                            <TabsTrigger
                              value="owner_name"
                              style={activeTabStyle}
                            >
                              {t("CreditBorrow:card.ownerSearching")}
                            </TabsTrigger>
                          ) : (
                            <TabsTrigger
                              value="owner_name"
                              onClick={() => {
                                setActiveSearch("owner_name");
                                window.history.replaceState(
                                  {},
                                  "",
                                  `?tab=searchOffers&searchTab=owner_name${
                                    thisInput ? `&searchText=${thisInput}` : ""
                                  }`
                                );
                              }}
                            >
                              {t("CreditBorrow:card.ownerSearch")}
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
                            <div className="w-full max-h-[210px] overflow-auto">
                              <List
                                rowComponent={SearchRow}
                                rowCount={thisResult.length}
                                rowHeight={225}
                                rowProps={{}}
                              />
                            </div>
                          ) : null}
                          {thisInput && thisResult && !thisResult.length
                            ? t("CreditBorrow:card.noResults")
                            : null}
                        </TabsContent>
                        <TabsContent value="collateral">
                          {thisResult && thisResult.length ? (
                            <div className="w-full max-h-[500px] overflow-auto">
                              <List
                                rowComponent={SearchRow}
                                rowCount={thisResult.length}
                                rowHeight={225}
                                rowProps={{}}
                              />
                            </div>
                          ) : null}
                          {thisInput && thisResult && !thisResult.length
                            ? t("CreditBorrow:card.noResults")
                            : null}
                        </TabsContent>
                        <TabsContent value="owner_name">
                          {thisResult && thisResult.length ? (
                            <div className="w-full max-h-[500px] overflow-auto">
                              <List
                                rowComponent={SearchRow}
                                rowCount={thisResult.length}
                                rowHeight={225}
                                rowProps={{}}
                              />
                            </div>
                          ) : null}
                          {thisInput && thisResult && !thisResult.length
                            ? t("CreditBorrow:card.noResults")
                            : null}
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                t("CreditBorrow:card.loading")
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
