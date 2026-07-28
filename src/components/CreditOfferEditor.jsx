import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import {
  HandCoins,
  Coins,
  Percent,
  Clock,
  CalendarDays,
  ShieldCheck,
  Users,
  Zap,
  Trash2,
  Settings,
  Info,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import {
  humanReadableFloat,
  blockchainFloat,
  debounce,
  copyToClipboard,
  assetAmountRegex,
} from "@/lib/common.js";
import { evaluateTradingPair } from "@/lib/market.js";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { Card } from "@/components/ui/card";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldContent,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";

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

import { Avatar } from "./Avatar.tsx";
import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import CollateralDropDownCard from "./Market/CollateralDropDownCard.jsx";
import AccountSearch from "./AccountSearch.jsx";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";

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
  const currentNode = useStore($currentNode);

  const [showDialog, setShowDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState();
  const [lendingAmount, setLendingAmount] = useState("");
  const [rate, setRate] = useState(0);
  const [repayPeriod, setRepayPeriod] = useState("1hr");
  const [minimumBorowAmount, setMinimumBorowAmount] = useState("");

  const [prevSelectedAsset, setPrevSelectedAsset] = useState();
  useEffect(() => {
    if (selectedAsset && selectedAsset !== prevSelectedAsset) {
      if (prevSelectedAsset !== undefined) {
        setLendingAmount("");
        setMinimumBorowAmount("");
        form.setValue("lendingAmount", "");
        form.setValue("minimumAmount", "");
      }
      setPrevSelectedAsset(selectedAsset);
    }
  }, [selectedAsset, prevSelectedAsset]);
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
    [],
  );

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true,
  );
  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const {
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;

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
      const foundFee = globalParams.find((x) => x.id === 0);
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
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
              assets.find((x) => x.id === balance.asset_id),
            );
            setBalances(filteredData);
          }
        });
      }
    }

    fetchUserBalances();
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

  const [foundAssetBalance, setFoundAssetBalance] = useState(0);
  useEffect(() => {
    if (foundAsset && foundAsset.id && balances && balances.length) {
      const _balance = balances.find((x) => x.asset_id === foundAsset.id);
      if (!_balance) {
        setFoundAssetBalance(0);
        return;
      }
      const readableBalance = humanReadableFloat(
        _balance.amount,
        foundAsset.precision,
      );
      setFoundAssetBalance(readableBalance);
    } else {
      setFoundAssetBalance(0);
    }
  }, [foundAsset]);

  const [offerID, setOfferID] = useState();
  useEffect(() => {
    async function parseUrlParams() {
      if (window.location.search) {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlSearchParams.entries());
        const _id = params && params.id ? params.id : null;
        const _assetSymbol =
          params && (params.asset || params.symbol)
            ? params.asset || params.symbol
            : null;

        if (_id && _id.length) {
          if (!_id.includes("1.21.")) {
            console.log("Invalid credit offer url parameter 2");
            return;
          }
          setOfferID(_id);
        }

        if (!_id && _assetSymbol && _assetSymbol.length) {
          setSelectedAsset(_assetSymbol.toUpperCase());
        }
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
      const offerDataStore = createObjectStore([
        usr.chain,
        JSON.stringify([offerID]),
        currentNode ? currentNode.url : null,
      ]);
      unsub = offerDataStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const _data = data[0];
          const _lendingAsset = assets.find((x) => x.id === _data.asset_type);

          setOfferJSON(_data);
          setOfferOwner(_data.owner_account);
          setSelectedAsset(_lendingAsset.symbol);
          setLendingAmount(
            humanReadableFloat(_data.total_balance, _lendingAsset.precision),
          );
          setRate(_data.fee_rate ? _data.fee_rate / 10000 : 0);
          setRepayPeriod(
            Object.keys(repaymentPeriods).reduce((a, b) =>
              Math.abs(repaymentPeriods[a] - _data.max_duration_seconds) <
              Math.abs(repaymentPeriods[b] - _data.max_duration_seconds)
                ? a
                : b,
            ),
          );
          setMinimumBorowAmount(
            humanReadableFloat(_data.min_deal_amount, _lendingAsset.precision),
          );
          setExpiration(_data.auto_disable_time);

          setAcceptableCollateral(
            _data.acceptable_collateral.map((x) => {
              const _collateralAsset = assets.find(
                (y) => y.id === x[1].quote.asset_id,
              );
              const _price =
                1 /
                (humanReadableFloat(x[1].base.amount, _lendingAsset.precision) /
                  humanReadableFloat(
                    x[1].quote.amount,
                    _collateralAsset.precision,
                  ));

              const evaluatedTradingPair = evaluateTradingPair(
                1 / _price,
                1,
                _lendingAsset.precision,
                1,
                _collateralAsset.precision,
              );

              return {
                id: x[0],
                symbol: _collateralAsset.symbol,
                price: _price,
                baseAmount: evaluatedTradingPair.base,
                quoteAmount: evaluatedTradingPair.quote,
              };
            }),
          );

          if (_data.acceptable_borrowers) {
            setIdentityChunks(chunkArray(_data.acceptable_borrowers, 100));
          }
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [offerID, usr, assets]);

  const [chunkIndex, setChunkIndex] = useState(0);
  useEffect(() => {
    let unsub;

    if (
      identityChunks &&
      usr &&
      usr.chain &&
      chunkIndex < identityChunks.length
    ) {
      const _identityBatch = identityChunks[chunkIndex];
      const _batchIDs = _identityBatch.flatMap(Object.keys);

      const usernameDataStore = createObjectStore([
        usr.chain,
        JSON.stringify(_batchIDs),
        currentNode ? currentNode.url : null,
      ]);
      unsub = usernameDataStore.subscribe(({ data }) => {
        if (data && !data.error && !data.loading) {
          setAllowedAccounts(
            allowedAccounts.concat(
              data.map((x, i) => {
                return {
                  name: x.name,
                  id: x.id,
                  amount: humanReadableFloat(
                    _identityBatch[i].amount,
                    foundAsset.precision,
                  ),
                };
              }),
            ),
          );
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
      fee_rate: parseInt(rate * 10000),
      max_duration_seconds: repaymentPeriods[repayPeriod],
      min_deal_amount: blockchainFloat(
        minimumBorowAmount,
        foundAsset.precision,
      ),
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
            x.precision,
          );
        }

        return [
          x.id,
          {
            base: {
              asset_id: foundAsset.id,
              amount: evaluatedTradingPair
                ? evaluatedTradingPair.base
                : x.baseAmount,
            },
            quote: {
              asset_id: x.id,
              amount: evaluatedTradingPair
                ? evaluatedTradingPair.quote
                : x.quoteAmount,
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
        <Card className="mx-2 mb-1 rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.03)] transition-all">
          <div className="p-3 flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] flex-shrink-0">
              <Coins className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">
                #{index + 1}: {_targetAsset.symbol}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("CreditOfferEditor:price")} <span className="font-mono dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">{res.price}</span> {_targetAsset.symbol}/{selectedAsset ?? ""}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Edit collateral price" className="h-8 w-8 border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]">
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Label>{t("CreditOfferEditor:editingPrice")}</Label>{" "}
                  <Input
                    name="price"
                    className="mt-4"
                    placeholder={res.price}
                    onKeyPress={(event) => {
                      if (
                        event.key === "." &&
                        event.target.value.includes(".")
                      ) {
                        event.preventDefault();
                      }
                      const regex = assetAmountRegex(_targetAsset);
                      if (!regex.test(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    onChange={(event) => {
                      const regex = assetAmountRegex(_targetAsset);
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
                    className="mt-4 border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]"
                    onClick={() => {
                      if (
                        _updatedCollateral &&
                        _updatedCollateral.price !== res.price
                      ) {
                        setAcceptableCollateral(_updatedCollateral);
                      }
                    }}
                  >
                    {t("CreditOfferEditor:setNewPrice")}
                  </Button>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="icon"
                aria-label="Remove collateral"
                className="h-8 w-8 border-[hsl(var(--accent-danger)/0.3)] text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)]"
                onClick={(e) => {
                  e.preventDefault();
                  const _newCollateral = acceptableCollateral.filter(
                    (x) => x.symbol !== res.symbol,
                  );
                  setAcceptableCollateral(_newCollateral);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
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
        <Card className="mx-2 mb-1 rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.03)] transition-all">
          <div className="p-3 flex items-center gap-3">
            <Avatar
              size={32}
              name={res.name}
              extra="Borrower"
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
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">
                #{index + 1}: {res.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("CreditOfferEditor:borrowLimit")}: <span className="font-mono dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">{res.amount} {foundAsset ? foundAsset.symbol : ""}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Edit borrower limit" className="h-8 w-8 border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]">
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Label>{t("CreditOfferEditor:editingMaxAmount")}</Label>
                  <Input
                    name="price"
                    className="mt-4"
                    placeholder={res.price}
                    onKeyPress={(event) => {
                      if (
                        event.key === "." &&
                        event.target.value.includes(".")
                      ) {
                        event.preventDefault();
                      }
                      const regex = assetAmountRegex(foundAsset);
                      if (!regex.test(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    onChange={(event) => {
                      const regex = assetAmountRegex(foundAsset);
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
                    className="mt-4 border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]"
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
                size="icon"
                aria-label="Remove borrower"
                className="h-8 w-8 border-[hsl(var(--accent-danger)/0.3)] text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)]"
                onClick={(e) => {
                  e.preventDefault();
                  const _update = allowedAccounts.filter(
                    (x) => x.id !== res.id,
                  );
                  setAllowedAccounts(_update);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-4xl">
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
        />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
              <Coins className="h-4.5 w-4.5" strokeWidth={2.25} />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {!offerOwner
                  ? t("CreditOfferEditor:creatingNewOffer")
                  : t("CreditOfferEditor:editingExistingOffer")}
              </h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {!offerOwner
                  ? t("CreditOfferEditor:creatingNewOfferDescription")
                  : t("CreditOfferEditor:editingExistingOfferDescription")}
              </p>
            </div>
          </div>

          <form
            onSubmit={form.handleSubmit(() => {
              setShowDialog(true);
            })}
          >
            <FieldGroup>
              {offerID ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-2">
                      {t("CreditOfferEditor:offerOwner")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`offerOwner-${offerID ?? "new"}`}
                        disabled
                        placeholder={offerOwner ?? "1.2.x"}
                        className="bg-card/60"
                      />
                      <a href={`/account/${offerOwner}`}>
                        <Button variant="outline" size="sm" className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]">
                          {t("CreditOfferEditor:viewAccount")}
                        </Button>
                      </a>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-2">
                      {t("CreditOfferEditor:existingID")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`offerId-${offerID ?? "new"}`}
                        disabled
                        placeholder={offerID}
                        className="bg-card/60"
                      />
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]">
                            JSON
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[550px] !bg-card border border-border">
                          <DialogHeader>
                            <DialogTitle>
                              {t("CreditOfferEditor:existingCreditOfferJSON")}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                              {t("CreditOfferEditor:currentBlockchainData")}
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-72 rounded-md border border-border bg-card/60">
                            <pre className="text-xs text-foreground/80 p-3">
                              {JSON.stringify(offerJSON, null, 2)}
                            </pre>
                          </ScrollArea>
                          <Button
                            variant="outline"
                            className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]"
                            onClick={() => {
                              copyToClipboard(
                                JSON.stringify(offerJSON, null, 4),
                              );
                            }}
                          >
                            {t("DeepLinkDialog:tabsContent.copyOperationJSON")}
                          </Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                    <Coins className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                    {t("CreditOfferEditor:assetToLend")}
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-2">
                  <div className="col-span-1 flex items-center justify-center">
                    {!selectedAsset || !foundAsset ? (
                      <Av>
                        <AvatarFallback className="bg-card/80 text-muted-foreground text-xs">?</AvatarFallback>
                      </Av>
                    ) : null}
                    {foundAsset ? (
                      <Av>
                        <AvatarFallback className="bg-card/80 text-foreground/70 text-xs">
                          {foundAsset.bitasset_data_id ? "MPA" : "UIA"}
                        </AvatarFallback>
                      </Av>
                    ) : null}
                  </div>
                  <div className="col-span-7 md:col-span-5">
                    {!selectedAsset || !foundAsset ? (
                      <Input
                        id={`targetAsset-${offerID ?? "new"}`}
                        disabled
                        placeholder="Bitshares asset (1.3.x)"
                        className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1 mt-1"
                      />
                    ) : (
                      <Input
                        id={`targetAsset-${offerID ?? "new"}`}
                        disabled
                        placeholder={`${foundAsset.symbol} (${foundAsset.id})`}
                        className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1 mt-1"
                      />
                    )}
                  </div>
                  {!offerID ? (
                    <div className="col-span-2 mt-1 ml-3">
                      <AssetDropDown
                        assetSymbol={selectedAsset ?? ""}
                        assetData={null}
                        storeCallback={setSelectedAsset}
                        otherAsset={null}
                        marketSearch={marketSearch}
                        type={null}
                        chain={usr.chain}
                        balances={balances}
                        triggerVariant="outline"
                        triggerClassName="w-auto border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.5)]"
                      />
                    </div>
                  ) : null}
                </div>
                {foundAsset &&
                  balances &&
                  !balances.map((x) => x.asset_id).includes(foundAsset.id) && (
                    <p className="text-xs text-[hsl(var(--accent-danger-fg))] mt-2">
                      {t("Transfer:noAssetInAccount", { username: usr.username })}
                    </p>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                        <HandCoins className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                        {t("CreditOfferEditor:amountToLend")}
                      </span>
                    </div>
                    {foundAsset ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          event.preventDefault();
                          setLendingAmount(foundAssetBalance);
                          form.setValue("lendingAmount", foundAssetBalance);
                        }}
                        className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)]"
                      >
                        {t("LimitOrderCard:useBalance")}
                      </Button>
                    ) : null}
                  </div>
                  <Controller
                    name="lendingAmount"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id={`lendingAmount-${offerID ?? "new"}`}
                        value={lendingAmount || ""}
                        placeholder={!foundAsset ? "0" : String(lendingAmount)}
                        disabled={!foundAsset}
                        className="bg-card/60 text-lg font-semibold"
                        onChange={(event) => {
                          const input = event.target.value;
                          const inputDecimals = !foundAsset
                            ? 2
                            : foundAsset.precision;
                          let regex = new RegExp(
                            `^[0-9]*\\.?[0-9]{0,${inputDecimals}}$`,
                          );
                          if (regex.test(input)) {
                            setLendingAmount(input);
                            field.onChange(input);
                          }
                        }}
                      />
                    )}
                  />
                  {
                    (!foundAssetBalance && lendingAmount > 0) || (foundAssetBalance && foundAssetBalance < lendingAmount)
                      ? <p className="text-xs text-[hsl(var(--accent-danger-fg))] mt-2">
                          {t("Common:insufficient_funds")}
                        </p>
                      : null
                  }
                </div>

                <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                      <Percent className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                      {t("CreditOfferEditor:lendingRate")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <Input
                        value={`${rate} %`}
                        placeholder={`${rate} %`}
                        disabled
                        className="bg-card/60 text-lg font-semibold dark:text-[hsl(var(--accent-1-fg))]"
                      />
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]">
                          {t("CreditOfferEditor:editLendingRate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Label>{t("CreditOfferEditor:newLendingRate")}</Label>{" "}
                        <Input
                          placeholder={String(rate)}
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
                  </div>
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
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                      {t("CreditOfferEditor:repaymentPeriod")}
                    </span>
                  </div>
                  <Select
                    onValueChange={(selection) => {
                      setRepayPeriod(selection);
                    }}
                  >
                    <SelectTrigger className="w-full bg-card/60">
                      <SelectValue
                        placeholder={t("CreditOfferEditor:placeholder1hr")}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="12hr">
                        {t("CreditOfferEditor:12hours")}
                      </SelectItem>
                      <SelectItem value="24hr">
                        {t("CreditOfferEditor:24hours")}
                      </SelectItem>
                      <SelectItem value="3d">
                        {t("CreditOfferEditor:3days")}
                      </SelectItem>
                      <SelectItem value="7d">
                        {t("CreditOfferEditor:7days")}
                      </SelectItem>
                      <SelectItem value="30d">
                        {t("CreditOfferEditor:30days")}
                      </SelectItem>
                      <SelectItem value="90d">
                        {t("CreditOfferEditor:90days")}
                      </SelectItem>
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
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {t("CreditOfferEditor:maximumDuration")}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                      {t("CreditOfferEditor:minimumAmount")}
                    </span>
                  </div>
                  <Input
                    id={`minimumAmount-${offerID ?? "new"}`}
                    value={minimumBorowAmount || ""}
                    placeholder={!foundAsset ? "0" : String(minimumBorowAmount)}
                    disabled={!foundAsset}
                    className="bg-card/60"
                    onKeyPress={(event) => {
                      if (
                        event.key === "." &&
                        event.target.value.includes(".")
                      ) {
                        event.preventDefault();
                      }
                      const regex = assetAmountRegex(foundAsset);
                      if (!regex.test(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    onChange={(event) => {
                      const input = event.target.value;
                      const regex = assetAmountRegex(foundAsset);
                      if (regex.test(input) && input > 0) {
                        setMinimumBorowAmount(input);
                        form.setValue("minimumAmount", input);
                      }
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {t("CreditOfferEditor:minimumBorrowableAmount")}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                      {t("CreditOfferEditor:expirationDate")}
                    </span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-card/60",
                          !expiration && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiration ? (
                          format(expiration, "PPP")
                        ) : (
                          <span>
                            {t("LimitOrderCard:expiry.pickDate")}
                          </span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[350px] bg-card border border-border rounded-2xl p-0">
                      <Calendar
                        mode="single"
                        selected={expiration}
                        onSelect={(e) => {
                          const parsedDate = new Date(e);
                          const now = new Date();
                          if (parsedDate < now) {
                            setExpiration(
                              new Date(
                                Date.now() + 1 * 24 * 60 * 60 * 1000,
                              ),
                            );
                            return;
                          }
                          setExpiration(e);
                        }}
                        initialFocus
                      />
                    </DialogContent>
                  </Dialog>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {t("CreditOfferEditor:creditOfferEnds")}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                    <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                    {t("CreditOfferEditor:acceptedCollateral")}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-9 rounded-lg border border-border/60 bg-card/40">
                    <div className="w-full max-h-[210px] overflow-auto">
                      {acceptableCollateral.length > 0 ? (
                        <List
                          rowComponent={CollateralRow}
                          rowCount={acceptableCollateral.length}
                          rowHeight={60}
                          rowProps={{}}
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t("CreditOfferEditor:noCollateral")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="lg:col-span-3 flex items-center justify-center">
                    <CollateralDropDownCard
                      chosenAssets={acceptableCollateral}
                      lendingAsset={
                        foundAsset && foundAsset.symbol
                          ? foundAsset.symbol
                          : ""
                      }
                      marketSearch={marketSearch}
                      storeCallback={setAcceptableCollateral}
                      chain={usr && usr.chain ? usr.chain : "bitshares"}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {t("CreditOfferEditor:acceptedCollateralDescription")}
                </p>
              </div>

              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                      <Users className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                      {t("CreditOfferEditor:preApprovedUsers")}
                    </span>
                  </div>
                  <Dialog
                    open={targetUserDialogOpen}
                    onOpenChange={(open) => {
                      setTargetUserDialogOpen(open);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]"
                      >
                        + {t("CreditOfferEditor:addUser")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[375px] !bg-card border border-border">
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
                        <DialogDescription className="text-muted-foreground">
                          {t("Transfer:searchingForAccount")}
                        </DialogDescription>
                      </DialogHeader>
                      <AccountSearch
                        chain={usr && usr.chain ? usr.chain : "bitshares"}
                        excludedUsers={
                          usr && usr.username && usr.username.length
                            ? [usr]
                            : []
                        }
                        setChosenAccount={(_account) => {
                          if (
                            _account &&
                            !allowedAccounts.find(
                              (_usr) => _usr.id === _account.id,
                            )
                          ) {
                            _account.amount = minimumBorowAmount ?? 1;
                            setAllowedAccounts(
                              allowedAccounts && allowedAccounts.length
                                ? [...allowedAccounts, _account]
                                : [_account],
                            );
                          }
                          setTargetUserDialogOpen(false);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40">
                  <div className="w-full max-h-[210px] overflow-auto">
                    {allowedAccounts.length > 0 ? (
                      <List
                        rowComponent={ApprovedBorrowerRow}
                        rowCount={allowedAccounts.length}
                        rowHeight={60}
                        rowProps={{}}
                      />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t("CreditOfferEditor:noPreApprovedBorrowers")}
                        </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {t("CreditOfferEditor:limitBorrowers")}
                </p>
              </div>

              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-3.5 w-3.5 dark:text-[hsl(var(--accent-1-fg)/0.8)] text-[hsl(var(--accent-1-fg))]" />
                  <span className="text-[10px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.8)] text-[hsl(var(--accent-1-fg))]">
                    {t("CreditOfferEditor:networkFee")}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {fee ? fee.toFixed(5) : "0.00000"}
                  <span className="text-muted-foreground">BTS</span>
                </div>
                {usr.id === usr.referrer && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t("LimitOrderCard:fee.ltmRebate", { rebate: 0.8 * fee })}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl font-semibold text-[hsl(var(--accent-1-gradFg))] bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] shadow-[0_8px_30px_-4px_rgba(139,92,246,0.6)] hover:shadow-[0_12px_40px_-4px_rgba(139,92,246,0.8)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base"
              >
              <HandCoins className="h-4.5 w-4.5" strokeWidth={2.25} />
                {t("CreditOfferEditor:submit")}
              </Button>
            </FieldGroup>
          </form>
        </div>
      </Card>

      {transactionJSON && showDialog ? (
        <DeepLinkDialog
          trxJSON={transactionJSON ?? []}
          operationNames={[
            !offerID ? "credit_offer_create" : "credit_offer_update",
          ]}
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

      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-danger)/0.1)] mt-5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-danger)/0.4)] to-transparent"
        />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-danger)/0.15)] border border-[hsl(var(--accent-danger)/0.3)] text-[hsl(var(--accent-danger-fg))]">
              <Info className="h-3 w-3" strokeWidth={2.5} />
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              {t("CreditOfferEditor:risksTitle")}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {t("CreditOfferEditor:risksDescription")}
          </p>
          <ul className="space-y-2">
            <li className="text-sm text-muted-foreground">
              {t("CreditOfferEditor:risksPoint1")}
            </li>
            <li className="text-sm text-muted-foreground">
              {t("CreditOfferEditor:risksPoint2")}
            </li>
            <li className="text-sm text-muted-foreground">
              {t("CreditOfferEditor:risksPoint3")}
            </li>
            <li className="text-sm text-muted-foreground">
              {t("CreditOfferEditor:risksPoint4")}
            </li>
            <li className="text-sm text-muted-foreground">
              {t("CreditOfferEditor:risksPoint5")}
            </li>
            <li className="text-sm text-muted-foreground">
              {t("CreditOfferEditor:risksPoint6")}
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
