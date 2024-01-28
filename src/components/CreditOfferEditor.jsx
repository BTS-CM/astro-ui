import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { FixedSizeList as List } from "react-window";

import { cn } from "@/lib/utils";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { humanReadableFloat, blockchainFloat, debounce, copyToClipboard } from "@/lib/common.js";
import { evaluateTradingPair } from "@/lib/market.js";

import { createUserBalancesStore, createUsernameStore } from "../effects/User.ts";
import { createOfferStore } from "../effects/Offers.ts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";

import { Avatar } from "./Avatar.tsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import CollateralDropDownCard from "./Market/CollateralDropDownCard.jsx";
import AccountSearch from "./AccountSearch.jsx";

import {
  $assetCacheBTS,
  $assetCacheTEST,
  $marketSearchCacheBTS,
  $marketSearchCacheTEST,
  $globalParamsCacheBTS,
  $globalParamsCacheTEST,
} from "../stores/cache.ts";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar as Av, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

const repaymentPeriods = {
  "1hr": 60 * 60,
  "12hr": 12 * 60 * 60,
  "24hr": 24 * 60 * 60,
  "3d": 3 * 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
  "30d": 30 * 24 * 60 * 60,
  "90d": 90 * 24 * 60 * 60,
  "365d": 365 * 24 * 60 * 60,
  "730d": 730 * 24 * 60 * 60,
  "1825d": 1825 * 24 * 60 * 60,
};

function chunkArray(array, chunkSize) {
  let chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export default function CreditOfferEditor(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const [showDialog, setShowDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState();
  const [lendingAmount, setLendingAmount] = useState(0);
  const [rate, setRate] = useState(0);
  const [repayPeriod, setRepayPeriod] = useState("1hr");
  const [minimumBorowAmount, setMinimumBorowAmount] = useState(0);
  const [expiration, setExpiration] = useState();
  const [allowedAccounts, setAllowedAccounts] = useState([]);
  const [acceptableCollateral, setAcceptableCollateral] = useState([]);

  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);

  const debouncedSetRate = useCallback(
    debounce((input, mcr) => {
      const regex = /^[0-9]*\.?[0-9]*$/;
      if (regex.test(input)) {
        if (input >= 0 && input <= 100) {
          setRate(input);
        }
      }
    }, 25),
    []
  );

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  useInitCache(usr && usr.chain ? usr.chain : "bitshares", [
    "assets",
    "offers",
    "marketSearch",
    "globalParams",
  ]);

  const _assetsBTS = useSyncExternalStore($assetCacheBTS.subscribe, $assetCacheBTS.get, () => true);
  const _assetsTEST = useSyncExternalStore(
    $assetCacheTEST.subscribe,
    $assetCacheTEST.get,
    () => true
  );

  const _globalParamsBTS = useSyncExternalStore(
    $globalParamsCacheBTS.subscribe,
    $globalParamsCacheBTS.get,
    () => true
  );
  const _globalParamsTEST = useSyncExternalStore(
    $globalParamsCacheTEST.subscribe,
    $globalParamsCacheTEST.get,
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

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x[0] === 0);
      const finalFee = humanReadableFloat(foundFee[1].fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBalances(data);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, balanceCounter]);

  const [foundAsset, setFoundAsset] = useState();
  const found = useMemo(() => {
    if (selectedAsset) {
      return assets.filter((asset) => asset.symbol === selectedAsset);
    }
    return [];
  }, [selectedAsset, assets]);

  useEffect(() => {
    if (found && found.length) {
      setFoundAsset(found[0]);
    }
  }, [found]);

  const [offerID, setOfferID] = useState();
  useEffect(() => {
    async function parseUrlParams() {
      if (window.location.search) {
        //console.log("Parsing url params");
        const urlSearchParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlSearchParams.entries());
        const _id = params && params.id ? params.id : null;

        if (!_id || !_id.length) {
          console.log("Invalid credit offer url parameter 1");
          return;
        }

        if (_id && _id.length && !_id.includes("1.21.")) {
          console.log("Invalid credit offer url parameter 2");
          return;
        }

        setOfferID(_id);
      }
    }

    parseUrlParams();
  }, []);

  const [offerOwner, setOfferOwner] = useState();
  const [identityChunks, setIdentityChunks] = useState([]);
  const [offerJSON, setOfferJSON] = useState();
  useEffect(() => {
    let unsub;

    if (offerID && usr && usr.chain) {
      const offerDataStore = createOfferStore([usr.chain, offerID]);
      unsub = offerDataStore.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          const _lendingAsset = assets.find((x) => x.id === data.asset_type);

          setOfferJSON(data);
          setOfferOwner(data.owner_account);
          setSelectedAsset(_lendingAsset.symbol);
          setLendingAmount(humanReadableFloat(data.total_balance, _lendingAsset.precision));
          setRate(data.fee_rate ? data.fee_rate / 10000 : 0);
          setRepayPeriod(
            Object.keys(repaymentPeriods).reduce((a, b) =>
              Math.abs(repaymentPeriods[a] - data.max_duration_seconds) <
              Math.abs(repaymentPeriods[b] - data.max_duration_seconds)
                ? a
                : b
            )
          );
          setMinimumBorowAmount(humanReadableFloat(data.min_deal_amount, _lendingAsset.precision));
          setExpiration(data.auto_disable_time);

          setAcceptableCollateral(
            data.acceptable_collateral.map((x) => {
              const _collateralAsset = assets.find((y) => y.id === x[1].quote.asset_id);
              const _price =
                1 /
                (humanReadableFloat(x[1].base.amount, _lendingAsset.precision) /
                  humanReadableFloat(x[1].quote.amount, _collateralAsset.precision));

              const evaluatedTradingPair = evaluateTradingPair(
                1 / _price,
                1,
                _lendingAsset.precision,
                1,
                _collateralAsset.precision
              );

              return {
                id: x[0],
                symbol: _collateralAsset.symbol,
                price: _price,
                baseAmount: evaluatedTradingPair.base,
                quoteAmount: evaluatedTradingPair.quote,
              };
            })
          );

          if (data.acceptable_borrowers) {
            setIdentityChunks(chunkArray(data.acceptable_borrowers, 100));
          }
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [offerID, usr, assets]);

  // Inside your component
  const [chunkIndex, setChunkIndex] = useState(0);
  useEffect(() => {
    let unsub;

    if (identityChunks && usr && usr.chain && chunkIndex < identityChunks.length) {
      const _identityBatch = identityChunks[chunkIndex];
      //_identityBatch looks like: [{"1.2.x": 1}]
      const _batchIDs = _identityBatch.flatMap(Object.keys);
      console.log({ _batchIDs });

      const usernameDataStore = createUsernameStore([usr.chain, _batchIDs]);
      unsub = usernameDataStore.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          /*
            {
              "name": "tusc.trader1",
              "id": "1.2.1811495",
              "amount": 1
            }
          */
          console.log({ usernames: data, index: chunkIndex });
          setAllowedAccounts(
            allowedAccounts.concat(
              data.map((x, i) => {
                return {
                  name: x.name,
                  id: x.id,
                  amount: humanReadableFloat(_identityBatch[i].amount, foundAsset.precision),
                };
              })
            )
          );
          // Move to the next chunk
          setChunkIndex((prevIndex) => prevIndex + 1);
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [identityChunks, chunkIndex]);

  const [transactionJSON, setTransactionJSON] = useState();
  useEffect(() => {
    if (!foundAsset || !usr || !usr.id) {
      return;
    }
    const _operation = {
      owner_account: usr.id,
      fee_rate: parseInt(rate * 100),
      max_duration_seconds: repaymentPeriods[repayPeriod],
      min_deal_amount: blockchainFloat(minimumBorowAmount, foundAsset.precision),
      enabled: true,
      auto_disable_time: expiration,
      acceptable_collateral: acceptableCollateral.map((x) => {
        let evaluatedTradingPair;
        if (x && (!x.baseAmount || !x.quoteAmount)) {
          evaluatedTradingPair = evaluateTradingPair(
            1 / x.price,
            1,
            foundAsset.precision,
            1,
            x.precision
          );
        }

        return [
          x.id,
          {
            base: {
              asset_id: foundAsset.id,
              amount: evaluatedTradingPair ? evaluatedTradingPair.base : x.baseAmount,
            },
            quote: {
              asset_id: x.id,
              amount: evaluatedTradingPair ? evaluatedTradingPair.quote : x.quoteAmount,
            },
          },
        ];
      }),
      acceptable_borrowers: allowedAccounts.map((x) => {
        return [x.id, blockchainFloat(x.amount, foundAsset.precision)];
      }),
      extensions: [],
    };

    const _lendingAmount = blockchainFloat(lendingAmount, foundAsset.precision);

    if (!offerID) {
      _operation["asset_type"] = foundAsset.id;
      _operation["balance"] = _lendingAmount;
      setTransactionJSON([_operation]);
      return;
    }

    _operation["offer_id"] = offerID;
    if (_lendingAmount !== offerJSON.total_balance) {
      const absDiff = Math.abs(_lendingAmount - offerJSON.total_balance);
      _operation["delta_amount"] = {
        amount: _lendingAmount > offerJSON.total_balance ? absDiff : -absDiff,
        asset_id: foundAsset.id,
      };
    }

    setTransactionJSON([_operation]);
  }, [
    usr,
    rate,
    repayPeriod,
    minimumBorowAmount,
    foundAsset,
    expiration,
    acceptableCollateral,
    allowedAccounts,
    lendingAmount,
    offerID,
    offerJSON,
  ]);

  const CollateralRow = ({ index, style }) => {
    let res = acceptableCollateral[index];

    if (!res) {
      return null;
    }

    const _targetAsset = assets.find((x) => x.id === res.id);

    if (!_targetAsset) {
      return null;
    }

    let _updatedCollateral;
    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2 mt-1">
          <CardHeader className="pb-3 pt-3">
            <span className="grid grid-cols-12">
              <span className="col-span-9">
                <CardTitle>
                  #{index + 1}: {_targetAsset.symbol} ({_targetAsset.id})
                </CardTitle>
                <CardDescription>
                  {t("CreditOfferEditor:price")} {res.price} {_targetAsset.symbol}/
                  {selectedAsset ?? ""}
                </CardDescription>
              </span>
              <span className="col-span-3 text-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">⚙️</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Label>{t("CreditOfferEditor:editingPrice")}</Label>{" "}
                    <Input
                      name="price"
                      className="mt-4"
                      placeholder={res.price}
                      onChange={(event) => {
                        const regex = /^[a-zA-Z0-9.-]*$/;
                        if (regex.test(event.target.value)) {
                          _updatedCollateral = acceptableCollateral.map((x) => {
                            if (x.symbol === res.symbol) {
                              x.price = parseFloat(event.target.value);
                            }
                            return x;
                          });
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        if (_updatedCollateral && _updatedCollateral.price !== res.price) {
                          setAcceptableCollateral(_updatedCollateral);
                        } else {
                          console.log("No change in price");
                        }
                      }}
                    >
                      {t("CreditOfferEditor:setNewPrice")}
                    </Button>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  className="ml-2"
                  onClick={(e) => {
                    e.preventDefault();
                    const _newCollateral = acceptableCollateral.filter(
                      (x) => x.symbol !== res.symbol
                    );
                    setAcceptableCollateral(_newCollateral);
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

  const ApprovedBorrowerRow = ({ index, style }) => {
    let res = allowedAccounts[index];
    if (!res) {
      return null;
    }

    let _updatedAllowedAccounts;

    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2 mt-1">
          <CardHeader className="pb-3 pt-3">
            <span className="grid grid-cols-12">
              <span className="col-span-1">
                <Avatar
                  size={40}
                  name={res.name}
                  extra="Borrower"
                  expression={{
                    eye: "normal",
                    mouth: "open",
                  }}
                  colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                />
              </span>
              <span className="col-span-8 ml-3">
                <CardTitle>
                  #{index + 1}: {res.name} ({res.id})
                </CardTitle>
                <CardDescription>
                  {t("CreditOfferEditor:borrowLimit")}: {res.amount}{" "}
                  {foundAsset ? foundAsset.symbol : ""}
                </CardDescription>
              </span>
              <span className="col-span-3 text-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">⚙️</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Label>{t("CreditOfferEditor:editingMaxAmount")}</Label>
                    <Input
                      name="price"
                      className="mt-4"
                      placeholder={res.price}
                      onChange={(event) => {
                        const regex = /^[a-zA-Z0-9.-]*$/;
                        if (regex.test(event.target.value)) {
                          _updatedAllowedAccounts = allowedAccounts.map((x) => {
                            if (x.id === res.id) {
                              x.amount = event.target.value;
                            }
                            return x;
                          });
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        if (_updatedAllowedAccounts) {
                          setAllowedAccounts(_updatedAllowedAccounts);
                        }
                      }}
                    >
                      {t("CreditOfferEditor:setNewMaximum")}
                    </Button>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  className="ml-2"
                  onClick={(e) => {
                    e.preventDefault();
                    const _update = allowedAccounts.filter((x) => x.id !== res.id);
                    setAllowedAccounts(_update);
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
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>
              {!offerOwner
                ? t("CreditOfferEditor:creatingNewOffer")
                : t("CreditOfferEditor:editingExistingOffer")}
            </CardTitle>
            <CardDescription>
              {!offerOwner
                ? t("CreditOfferEditor:creatingNewOfferDescription")
                : t("CreditOfferEditor:editingExistingOfferDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={() => {
                  setShowDialog(true);
                  event.preventDefault();
                }}
              >
                {offerID ? (
                  <span className="grid grid-cols-12">
                    <span className="col-span-6">
                      <FormField
                        control={form.control}
                        name="offerOwner"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("CreditOfferEditor:offerOwner")}</FormLabel>
                            <FormControl>
                              <div className="grid grid-cols-12 mt-4 mr-2">
                                <div className="col-span-8 mr-2 mb-1 mt-1">
                                  <Input disabled placeholder={offerOwner ?? "1.2.x"} />
                                </div>
                                <div className="col-span-4 mt-1 text-center">
                                  <ExternalLink
                                    variant="outline"
                                    classnamecontents=""
                                    type="button"
                                    text={t("CreditOfferEditor:viewAccount")}
                                    hyperlink={
                                      usr.chain === "bitshares"
                                        ? `https://blocksights.info/#/accounts/${offerOwner ?? ""}`
                                        : `https://blocksights.info/#/accounts/${
                                            offerOwner ?? ""
                                          }?network=testnet`
                                    }
                                  />
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              {t("CreditOfferEditor:offerOwnerDescription")}
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </span>
                    <span className="col-span-6">
                      <FormField
                        control={form.control}
                        name="offerID"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Existing Offer ID</FormLabel>
                            <FormControl>
                              <div className="grid grid-cols-12 mt-4">
                                <div className="col-span-10">
                                  <Input disabled placeholder={offerID} className="mb-1 mt-1" />
                                </div>
                                <div className="col-span-2 mt-1 text-center">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button className="ml-2" variant="outline">
                                        JSON
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[550px] bg-white">
                                      <DialogHeader>
                                        <DialogTitle>
                                          {t("CreditOfferEditor:existingCreditOfferJSON")}
                                        </DialogTitle>
                                        <DialogDescription>
                                          {t("CreditOfferEditor:currentBlockchainData")}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="grid grid-cols-1">
                                        <div className="col-span-1">
                                          <ScrollArea className="h-72 rounded-md border">
                                            <pre>{JSON.stringify(offerJSON, null, 2)}</pre>
                                          </ScrollArea>
                                        </div>
                                        <div className="col-span-1 mt-3">
                                          <Button
                                            variant="outline"
                                            onClick={() => {
                                              copyToClipboard(JSON.stringify(offerJSON, null, 4));
                                            }}
                                          >
                                            {t("DeepLinkDialog:tabsContent.copyOperationJSON")}
                                          </Button>
                                          <ExternalLink
                                            variant="outline"
                                            classnamecontents="ml-3"
                                            type="button"
                                            text={t("CreditOfferEditor:viewOnBlockSights")}
                                            hyperlink={
                                              usr.chain === "bitshares"
                                                ? `https://blocksights.info/#/objects/${offerID}`
                                                : `https://blocksights.info/#/objects/${offerID}?network=testnet`
                                            }
                                          />
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              {t("CreditOfferEditor:viewingExistingOffer")}
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </span>
                  </span>
                ) : null}
                <FormField
                  control={form.control}
                  name="targetAsset"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("CreditOfferEditor:assetToLend")}</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-8 mt-4">
                          <div className="col-span-1 ml-5">
                            {!selectedAsset || !foundAsset ? (
                              <Av>
                                <AvatarFallback>?</AvatarFallback>
                              </Av>
                            ) : null}
                            {foundAsset ? (
                              <Av>
                                <AvatarFallback>
                                  <div className="text-sm">
                                    {foundAsset.bitasset_data_id ? "MPA" : "UIA"}
                                  </div>
                                </AvatarFallback>
                              </Av>
                            ) : null}
                          </div>
                          <div className="col-span-5">
                            {!selectedAsset || !foundAsset ? (
                              <Input
                                disabled
                                placeholder="Bitshares asset (1.3.x)"
                                className="mb-1 mt-1"
                              />
                            ) : null}
                            {foundAsset ? (
                              <Input
                                disabled
                                placeholder={`${foundAsset.symbol} (${foundAsset.id})`}
                                className="mb-1 mt-1"
                              />
                            ) : null}
                          </div>
                          <div className="col-span-2 mt-1 ml-3 text-center">
                            {!offerID ? (
                              <AssetDropDown
                                assetSymbol={selectedAsset ?? ""}
                                assetData={null}
                                storeCallback={setSelectedAsset}
                                otherAsset={null}
                                marketSearch={marketSearch}
                                type={null}
                              />
                            ) : null}
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t("CreditOfferEditor:lendingAssetDescription")}
                      </FormDescription>
                      <FormMessage>
                        {foundAsset &&
                        balances &&
                        !balances.map((x) => x.asset_id).includes(foundAsset.id)
                          ? t("Transfer:noAssetInAccount", { username: usr.username })
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lendingAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("CreditOfferEditor:amountToLend")}</FormLabel>{" "}
                      <FormControl
                        onChange={(event) => {
                          const input = event.target.value;
                          const inputDecimals = !foundAsset ? 2 : foundAsset.precision;
                          let regex = new RegExp(`^[0-9]*\\.?[0-9]{0,${inputDecimals}}$`);
                          if (regex.test(input)) {
                            setLendingAmount(input);
                          }
                        }}
                      >
                        <Input
                          value={lendingAmount}
                          placeholder={lendingAmount}
                          className="mb-1 w-3/4"
                        />
                      </FormControl>
                      <FormDescription>
                        {t("CreditOfferEditor:lendingAmountDescription")}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("CreditOfferEditor:lendingRate")}</FormLabel>
                      <FormControl>
                        <span className="grid grid-cols-12">
                          <span className="col-span-9">
                            <Input
                              value={`${rate} %`}
                              placeholder={`${rate} %`}
                              disabled
                              className="mb-1"
                            />
                            <Slider
                              className="mt-3"
                              key={`Slider${rate}`}
                              defaultValue={[rate]}
                              max={100}
                              min={1}
                              step={0.01}
                              onValueChange={(value) => {
                                debouncedSetRate(value[0]);
                              }}
                            />
                          </span>

                          <span className="col-span-3 ml-3 text-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <span
                                  onClick={() => {
                                    event.preventDefault();
                                  }}
                                  className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg"
                                >
                                  <Label>{t("CreditOfferEditor:editLendingRate")}</Label>{" "}
                                </span>
                              </PopoverTrigger>
                              <PopoverContent>
                                <Label>{t("CreditOfferEditor:newLendingRate")}</Label>{" "}
                                <Input
                                  placeholder={rate}
                                  className="mb-2 mt-1"
                                  onChange={(event) => {
                                    const input = event.target.value;
                                    const regex = /^[0-9]*\.?[0-9]{0,2}$/;
                                    if (input && input.length && regex.test(input)) {
                                      if (input >= 0.01 && input <= 100) {
                                        setRate(input);
                                      } else if (input > 100) {
                                        setRate(100);
                                      } else if (input < 0.01) {
                                        setRate(0.01);
                                      }
                                    }
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          </span>
                        </span>
                      </FormControl>
                      <FormDescription>
                        {t("CreditOfferEditor:lendingRateDescription")}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <span className="grid grid-cols-12 mt-3 mb-3">
                  <span className="col-span-4">
                    <FormField
                      control={form.control}
                      name="repaymentPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("CreditOfferEditor:repaymentPeriod")}</FormLabel>
                          <FormControl
                            onValueChange={(selection) => {
                              setRepayPeriod(selection);
                            }}
                          >
                            <Select>
                              <SelectTrigger className="mb-3 w-3/4">
                                <SelectValue placeholder={t("CreditOfferEditor:placeholder1hr")} />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="12hr">
                                  {t("CreditOfferEditor:12hours")}
                                </SelectItem>
                                <SelectItem value="24hr">
                                  {t("CreditOfferEditor:24hours")}
                                </SelectItem>
                                <SelectItem value="3d">{t("CreditOfferEditor:3days")}</SelectItem>
                                <SelectItem value="7d">{t("CreditOfferEditor:7days")}</SelectItem>
                                <SelectItem value="30d">{t("CreditOfferEditor:30days")}</SelectItem>
                                <SelectItem value="90d">{t("CreditOfferEditor:90days")}</SelectItem>
                                <SelectItem value="365d">
                                  {t("CreditOfferEditor:365days")}
                                </SelectItem>
                                <SelectItem value="730d">
                                  {t("CreditOfferEditor:730days")}
                                </SelectItem>
                                <SelectItem value="1825d">
                                  {t("CreditOfferEditor:1825days")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            {t("CreditOfferEditor:maximumDuration")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </span>
                  <span className="col-span-4">
                    <FormField
                      control={form.control}
                      name="minimumAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("CreditOfferEditor:minimumAmount")}</FormLabel>
                          <FormControl
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = /^[0-9]*\.?[0-9]*$/;
                              if (regex.test(input) && input > 0) {
                                setMinimumBorowAmount(input);
                              }
                            }}
                          >
                            <Input
                              value={minimumBorowAmount}
                              placeholder={minimumBorowAmount}
                              className="mb-1 w-3/4"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("CreditOfferEditor:minimumBorrowableAmount")}
                          </FormDescription>{" "}
                        </FormItem>
                      )}
                    />
                  </span>
                  <span className="col-span-4">
                    <FormField
                      control={form.control}
                      name="minimumAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("CreditOfferEditor:expirationDate")}</FormLabel>
                          <FormControl>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !expiration && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {expiration ? (
                                    format(expiration, "PPP")
                                  ) : (
                                    <span>{t("LimitOrderCard:expiry.pickDate")}</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={expiration}
                                  onSelect={(e) => {
                                    const parsedDate = new Date(e);
                                    const now = new Date();
                                    if (parsedDate < now) {
                                      //console.log("Not a valid date");
                                      setExpiration(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000));
                                      return;
                                    }
                                    //console.log("Setting expiry date");
                                    setExpiration(e);
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                          <FormDescription>
                            {t("CreditOfferEditor:creditOfferEnds")}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </span>
                </span>

                <FormField
                  control={form.control}
                  name="acceptedCollateral"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("CreditOfferEditor:acceptedCollateral")}</FormLabel>
                      <FormControl>
                        <span className="grid grid-cols-12">
                          <span className="col-span-9 border border-grey rounded">
                            <List
                              height={210}
                              itemCount={acceptableCollateral.length}
                              itemSize={80}
                              className="w-full"
                            >
                              {CollateralRow}
                            </List>
                          </span>
                          <span className="col-span-3 ml-3 text-center">
                            <CollateralDropDownCard
                              chosenAssets={acceptableCollateral}
                              lendingAsset={
                                foundAsset && foundAsset.symbol ? foundAsset.symbol : ""
                              }
                              marketSearch={marketSearch}
                              storeCallback={setAcceptableCollateral}
                            />
                          </span>
                        </span>
                      </FormControl>
                      <FormDescription>
                        {t("CreditOfferEditor:acceptedCollateralDescription")}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acceptedCollateral"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("CreditOfferEditor:preApprovedUsers")}</FormLabel>
                      <FormControl>
                        <span className="grid grid-cols-12">
                          <span className="col-span-9 border border-grey rounded">
                            <List
                              height={210}
                              itemCount={allowedAccounts.length}
                              itemSize={100}
                              className="w-full"
                            >
                              {ApprovedBorrowerRow}
                            </List>
                          </span>
                          <span className="col-span-3 ml-3 text-center">
                            <Dialog
                              open={targetUserDialogOpen}
                              onOpenChange={(open) => {
                                setTargetUserDialogOpen(open);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" className="ml-3 mt-1">
                                  ➕ {t("CreditOfferEditor:addUser")}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[375px] bg-white">
                                <DialogHeader>
                                  <DialogTitle>
                                    {!usr || !usr.chain
                                      ? t("Transfer:bitsharesAccountSearch")
                                      : null}
                                    {usr && usr.chain === "bitshares"
                                      ? t("Transfer:bitsharesAccountSearchBTS")
                                      : null}
                                    {usr && usr.chain !== "bitshares"
                                      ? t("Transfer:bitsharesAccountSearchTEST")
                                      : null}
                                  </DialogTitle>
                                  <DialogDescription>
                                    {t("Transfer:searchingForAccount")}
                                  </DialogDescription>
                                </DialogHeader>
                                <AccountSearch
                                  chain={usr && usr.chain ? usr.chain : "bitshares"}
                                  excludedUsers={
                                    usr && usr.username && usr.username.length ? [usr] : []
                                  }
                                  setChosenAccount={(_account) => {
                                    if (
                                      _account &&
                                      !allowedAccounts.find((_usr) => _usr.id === _account.id)
                                    ) {
                                      _account.amount = minimumBorowAmount ?? 1;
                                      setAllowedAccounts(
                                        allowedAccounts && allowedAccounts.length
                                          ? [allowedAccounts].concat([_account])
                                          : [_account]
                                      );
                                    }
                                    setTargetUserDialogOpen(false);
                                  }}
                                />
                              </DialogContent>
                            </Dialog>
                          </span>
                        </span>
                      </FormControl>
                      <FormDescription>{t("CreditOfferEditor:limitBorrowers")}</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  disabled
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("CreditOfferEditor:networkFee")}</FormLabel>
                      <FormDescription>{t("CreditOfferEditor:broadcastCost")}</FormDescription>
                      <FormControl>
                        <Input className="w-3/4" disabled value={`${fee} BTS`} placeholder={1} />
                      </FormControl>
                      {usr.id === usr.referrer ? (
                        <FormMessage>
                          {t("LimitOrderCard:fee.ltmRebate", { rebate: 0.8 * fee })}
                        </FormMessage>
                      ) : null}
                    </FormItem>
                  )}
                />

                <Button className="mt-7 mb-1" variant="outline" type="submit">
                  {t("CreditOfferEditor:submit")}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        {transactionJSON && showDialog ? (
          <DeepLinkDialog
            trxJSON={transactionJSON ?? []}
            operationName={!offerID ? "credit_offer_create" : "credit_offer_update"}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            headerText={
              !offerID
                ? t("CreditOfferEditor:creatingCreditOffer", {
                    lendingAmount,
                    symbol: foundAsset.symbol,
                  })
                : t("CreditOfferEditor:updatingCreditOffer", { offerID })
            }
          />
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 mt-5">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>{t("CreditOfferEditor:risksTitle")}</CardTitle>
            <CardDescription>{t("CreditOfferEditor:risksDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <ul className="ml-2 list-disc [&>li]:mt-2 pl-2">
              <li>{t("CreditOfferEditor:risksPoint1")}</li>
              <li>{t("CreditOfferEditor:risksPoint2")}</li>
              <li>{t("CreditOfferEditor:risksPoint3")}</li>
              <li>{t("CreditOfferEditor:risksPoint4")}</li>
              <li>{t("CreditOfferEditor:risksPoint5")}</li>
              <li>{t("CreditOfferEditor:risksPoint6")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
