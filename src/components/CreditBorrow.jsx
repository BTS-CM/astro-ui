import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { FixedSizeList as List } from "react-window";
import Fuse from "fuse.js";

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

import { createUserBalancesStore } from "../effects/User.ts";
import { useInitCache } from "../effects/Init.ts";

import { $currentUser } from "../stores/users.ts";
import { $offersCache, $assetCache } from "../stores/cache.ts";

import { humanReadableFloat } from "@/lib/common.js";

import CurrentUser from "./common/CurrentUser.jsx";

function hoursTillExpiration(expirationTime) {
  // Parse the expiration time
  var expirationDate = new Date(expirationTime);

  // Get the current date and time
  var currentDate = new Date();

  // Calculate the difference in milliseconds
  var difference = expirationDate - currentDate;

  // Convert the difference to hours and round it to the nearest integer
  var hours = Math.round(difference / 1000 / 60 / 60);

  return hours;
}

const activeTabStyle = {
  backgroundColor: "#252526",
  color: "white",
};

export default function CreditBorrow(properties) {
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const assets = useSyncExternalStore(
    $assetCache.subscribe,
    $assetCache.get,
    () => true
  );

  const offers = useSyncExternalStore(
    $offersCache.subscribe,
    $offersCache.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", [
    "assets",
    "offers",
  ]);

  const [activeTab, setActiveTab] = useState("allOffers");
  const [activeSearch, setActiveSearch] = useState("borrow"); // borrow, collateral, owner_name
  const [thisInput, setThisInput] = useState();
  const [thisResult, setThisResult] = useState();

  const [usrBalances, setUsrBalances] = useState();
  const [balanceAssetIDs, setBalanceAssetIDs] = useState([]);
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            setBalanceAssetIDs(data.map((x) => x.asset_id));
            setUsrBalances(data);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr]);

  const compatibleOffers = useMemo(() => {
    if (!offers || !usrBalances) return [];

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
      offer["collateral_symbols"] = offer.acceptable_collateral.map((asset) => {
        return assets.find((x) => x.id === asset[0]).symbol;
      });
      offer["offer_symbols"] = [
        assets.find((x) => x.id === offer.asset_type).symbol,
      ];
      adjustedOffers.push(offer);
    }

    let keys;
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
    if (offerSearch) {
      console.log("Parsing url params");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());

      if (params && params.tab) {
        if (
          !["allOffers", "availableOffers", "searchOffers"].includes(params.tab)
        ) {
          return;
        }
        setActiveTab(params.tab);
        console.log("Setting active tab", params.tab);
      } else {
        window.history.replaceState({}, "", `?tab=allOffers`);
      }

      if (params && params.searchTab) {
        if (
          !["borrow", "collateral", "owner_name"].includes(params.searchTab)
        ) {
          return;
        }
        setActiveSearch(params.searchTab);
        console.log("Setting active search tab", params.searchTab);
      } else {
        window.history.replaceState(
          {},
          "",
          `?tab=searchOffers&searchTab=borrow`
        );
      }

      if (params && params.searchText) {
        const isValid = (str) => /^[a-zA-Z0-9.-]+$/.test(str);
        if (!isValid(params.searchText)) {
          return;
        }
        setThisInput(params.searchText);
        console.log("Setting search text", params.searchText);
      }
    }
  }, [offerSearch]);

  useEffect(() => {
    if (offerSearch && thisInput) {
      const isValid = (str) => /^[a-zA-Z0-9.-]+$/.test(str);
      if (!isValid(thisInput)) {
        return;
      }
      window.history.replaceState(
        {},
        "",
        `?tab=searchOffers&searchTab=${activeSearch}${
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
        <Card className="ml-2 mr-2" onClick={() => {}}>
          <CardHeader className="pb-1">
            <CardTitle>
              Offer #{res.id.replace("1.21.", "")} by {res.owner_name ?? "?"} (
              {res.owner_account})
            </CardTitle>
            <CardDescription>
              Offering
              <b>
                {` ${humanReadableFloat(
                  res.current_balance,
                  foundAsset.precision
                )} ${foundAsset.symbol} (${res.asset_type})`}
              </b>
              <br />
              Accepting
              <b>
                {` ${res.acceptable_collateral
                  .map((asset) => asset[0])
                  .map((x) => {
                    return assets.find((y) => y.id === x).symbol;
                  })
                  .join(", ")}`}
              </b>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm pb-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-1">
                Fee: {res.fee_rate / 10000}%<br />
                {`Repay period: ${(res.max_duration_seconds / 60 / 60).toFixed(
                  res.max_duration_seconds / 60 / 60 < 1 ? 2 : 0
                )} hours`}
              </div>
              <div className="col-span-1">
                {`Offer valid for: ${hoursTillExpiration(
                  res.auto_disable_time
                )} hours`}
                <br />
                {`Min amount: ${humanReadableFloat(
                  res.min_deal_amount,
                  foundAsset.precision
                )} ${foundAsset.symbol}`}
              </div>
            </div>
          </CardContent>
          <CardFooter className="pb-5">
            <a href={`/offer/index.html?id=${res.id}`}>
              <Button>
                Proceed with credit offer #{res.id.replace("1.21.", "")}
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

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>🏦 Viewing available credit offers</CardTitle>
              <CardDescription>
                Credit offers are user generated, they offer different rates,
                assets and durations; evaluate terms prior to creating deals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {offers && offers.length ? (
                <>
                  <Tabs
                    key={`top_tab_${activeTab}`}
                    defaultValue={activeTab}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 gap-2">
                      {activeTab === "allOffers" ? (
                        <TabsTrigger value="allOffers" style={activeTabStyle}>
                          Viewing all offers
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
                          View all offers
                        </TabsTrigger>
                      )}
                      {activeTab === "availableOffers" ? (
                        <TabsTrigger
                          value="availableOffers"
                          style={activeTabStyle}
                        >
                          Viewing compatible orders
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
                          View compatible orders
                        </TabsTrigger>
                      )}
                      {activeTab === "searchOffers" ? (
                        <TabsTrigger
                          value="searchOffers"
                          style={activeTabStyle}
                        >
                          Searching
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
                          Search
                        </TabsTrigger>
                      )}
                    </TabsList>
                    <TabsContent value="allOffers">
                      <h5 className="mb-2 text-center">
                        These credit offers are offering a variety of borrowable
                        assets at competing rates.
                      </h5>
                      {assets && offers && offers.length ? (
                        <List
                          height={500}
                          itemCount={offers.length}
                          itemSize={225}
                          className="w-full"
                        >
                          {OfferRow}
                        </List>
                      ) : null}
                    </TabsContent>
                    <TabsContent value="availableOffers">
                      <h5 className="mb-2 text-center">
                        These credit offers are accepting assets you own as loan
                        backing collateral.
                      </h5>
                      {assets && compatibleOffers && compatibleOffers.length ? (
                        <List
                          height={500}
                          itemCount={compatibleOffers.length}
                          itemSize={225}
                          className="w-full"
                        >
                          {BalanceRow}
                        </List>
                      ) : null}
                    </TabsContent>
                    <TabsContent value="searchOffers">
                      <h5 className="mb-2 text-center">
                        How do you want to search?
                      </h5>
                      <Tabs
                        defaultValue={activeSearch ?? "borrow"}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-3 gap-2">
                          {activeSearch === "borrow" ? (
                            <TabsTrigger value="borrow" style={activeTabStyle}>
                              Searching by borrowable asset
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
                              Search by borrowable asset
                            </TabsTrigger>
                          )}
                          {activeSearch === "collateral" ? (
                            <TabsTrigger
                              value="collateral"
                              style={activeTabStyle}
                            >
                              Searching by collateral assets
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
                              Search by collateral assets
                            </TabsTrigger>
                          )}
                          {activeSearch === "owner_name" ? (
                            <TabsTrigger
                              value="owner_name"
                              style={activeTabStyle}
                            >
                              Searching by owner name
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
                              Search by owner name
                            </TabsTrigger>
                          )}
                        </TabsList>
                        <Input
                          name="searchInput"
                          placeholder={thisInput ?? "Enter search text"}
                          className="mb-3 mt-3 w-full"
                          onChange={(event) => {
                            setThisInput(event.target.value);
                          }}
                        />
                        <TabsContent value="borrow">
                          {thisResult && thisResult.length ? (
                            <List
                              height={500}
                              itemCount={thisResult.length}
                              itemSize={225}
                              className="w-full"
                            >
                              {SearchRow}
                            </List>
                          ) : null}
                          {thisInput && thisResult && !thisResult.length ? (
                            <>No results found</>
                          ) : null}
                        </TabsContent>
                        <TabsContent value="collateral">
                          {thisResult && thisResult.length ? (
                            <List
                              height={500}
                              itemCount={thisResult.length}
                              itemSize={225}
                              className="w-full"
                            >
                              {SearchRow}
                            </List>
                          ) : null}
                          {thisInput && thisResult && !thisResult.length ? (
                            <>No results found</>
                          ) : null}
                        </TabsContent>
                        <TabsContent value="owner_name">
                          {thisResult && thisResult.length ? (
                            <List
                              height={500}
                              itemCount={thisResult.length}
                              itemSize={225}
                              className="w-full"
                            >
                              {SearchRow}
                            </List>
                          ) : null}
                          {thisInput && thisResult && !thisResult.length ? (
                            <>No results found</>
                          ) : null}
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <>Loading offers...</>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? (
            <CurrentUser usr={usr} />
          ) : null}
        </div>
      </div>
    </>
  );
}
