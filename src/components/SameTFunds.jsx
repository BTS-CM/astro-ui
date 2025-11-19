import React, {
  useSyncExternalStore,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import Fuse from "fuse.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createEverySameTFundStore } from "@/nanoeffects/SameTFunds.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";

import {
  debounce,
  humanReadableFloat,
  blockchainFloat,
  assetAmountRegex,
} from "@/lib/common.js";
import { $currentNode } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import ExternalLink from "./common/ExternalLink.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

export default function SameTFunds(properties) {
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

  const { _assetsBTS, _assetsTEST, _marketSearchBTS, _marketSearchTEST } =
    properties;

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

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);

  const [sameTFunds, setSameTFunds] = useState();
  useEffect(() => {
    async function fetching() {
      const sameTFundsStore = createEverySameTFundStore([
        _chain,
        currentNode ? currentNode.url : null,
      ]);

      sameTFundsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          let filteredData = data.filter((x) => x);
          if (_chain === "bitshares") {
            // filter out any tfunds owned by banned users
            filteredData = filteredData.filter(
              (x) =>
                !blocklist.users.includes(
                  toHex(sha256(utf8ToBytes(x.owner_account)))
                )
            );
          }
          setSameTFunds(filteredData);
        }
      });
    }

    if (_chain && currentNode) {
      fetching();
    }
  }, [_chain, currentNode]);

  const [view, setView] = useState("all");

  const relevantFunds = useMemo(() => {
    if (!sameTFunds || !sameTFunds.length) {
      return [];
    }
    if (view === "all" || view === "search" || view === "create") {
      return sameTFunds;
    } else if (view === "mine") {
      return sameTFunds.filter((x) => x.owner_account === usr.id);
    }
  }, [sameTFunds, view, usr]);

  const myTFunds = useMemo(() => {
    if (sameTFunds && sameTFunds.length) {
      return sameTFunds.filter((x) => x.owner_account === usr.id);
    }
    return [];
  }, [sameTFunds, usr]);

  const allUserIDs = useMemo(() => {
    if (sameTFunds && sameTFunds.length) {
      const uniqueIDs = new Set(sameTFunds.map((x) => x.owner_account));
      return Array.from(uniqueIDs);
    }
    return [];
  }, [sameTFunds]);

  const [lenderAccounts, setLenderAccounts] = useState([]);
  useEffect(() => {
    async function fetching() {
      const objectsStore = createObjectStore([
        _chain,
        JSON.stringify(allUserIDs),
        currentNode ? currentNode.url : null,
      ]);

      objectsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setLenderAccounts(data);
        }
      });
    }

    if (allUserIDs.length && _chain && currentNode) {
      fetching();
    }
  }, [allUserIDs, _chain, currentNode]);

  const [usrBalances, setUsrBalances] = useState();
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
            setUsrBalances(filteredData);
          }
        });
      }
    }
    fetchUserBalances();
  }, [usr]);

  const [lendingAsset, setLendingAsset] = useState(
    usr.chain === "bitshares" ? "BTS" : "TEST"
  );

  const lendingAssetData = useMemo(() => {
    // for the asset dropdown
    if (assets && lendingAsset) {
      return assets.find((asset) => asset.symbol === lendingAsset);
    }
    return null;
  }, [assets, lendingAsset]);

  const lendingAssetBalance = useMemo(() => {
    if (!usrBalances || !usrBalances.length || !lendingAssetData) {
      return;
    }

    const found = usrBalances.find((x) => x.asset_id === lendingAssetData.id);
    if (found) {
      return humanReadableFloat(found.amount, lendingAssetData.precision);
    }
  }, [lendingAssetData, usrBalances]);

  const debouncedPercent = useCallback(
    debounce((input, setCommissionFunction) => {
      let parsedInput = parseFloat(input);
      if (isNaN(parsedInput) || parsedInput <= 0) {
        setCommissionFunction(0);
        return;
      }

      const split = parsedInput.toString().split(".");
      if (split.length > 1) {
        const decimals = split[1].length;
        if (decimals > 2) {
          parsedInput = parseFloat(parsedInput.toFixed(2));
        }
      }

      if (parsedInput > 100) {
        setCommissionFunction(100);
      } else if (parsedInput < 0.01) {
        setCommissionFunction(0.01);
      } else {
        setCommissionFunction(parsedInput);
      }
    }, 500),
    []
  );

  const Row = ({ index, style }) => {
    let fund;
    if (view === "all") {
      fund = sameTFunds[index];
    } else if (view === "mine") {
      fund = myTFunds[index];
    } else if (view === "search") {
      fund = searchResults[index] ? searchResults[index].item : null;
    }

    if (!fund || !assets || !assets.length) {
      return null;
    }

    const asset = assets.find((x) => x.id === fund.asset_type);

    const assetName = asset ? asset.symbol : fund.asset_type;
    const balance = humanReadableFloat(fund.balance, asset.precision);
    const feeRate = fund.fee_rate / 10000;
    const unpaidAmount = humanReadableFloat(
      fund.unpaid_amount,
      asset.precision
    );
    const lender = lenderAccounts.find((x) => x.id === fund.owner_account);

    const [updatePrompt, setUpdatePrompt] = useState(false);
    const [newAmount, setNewAmount] = useState(balance);
    const [newFeeRate, setNewFeeRate] = useState(feeRate);
    const [updateDialog, setUpdateDialog] = useState(false);

    const [deleteDialog, setDeleteDialog] = useState(false);

    const foundBalance =
      usrBalances && usrBalances.length
        ? usrBalances.find((x) => x.asset_id === fund.asset_type)
        : null;

    const humanReadableAssetBalance =
      foundBalance && asset
        ? humanReadableFloat(foundBalance.amount, asset.precision)
        : 0;

    const deltaAmount = useMemo(() => {
      const difference = Math.abs(newAmount - balance);
      if (newAmount < balance) {
        return -difference;
      } else {
        return difference;
      }
    }, [newAmount, balance]);

    return (
      <div style={style} key={`sametfund-${view}-${fund.id}`}>
        <Card className="w-full">
          <CardHeader className="pt-4 pb-0">
            <CardTitle>
              {t("SameTFunds:fund")}
              {" #"}
              <ExternalLink
                classnamecontents="hover:text-purple-500"
                type="text"
                text={fund.id.replace("1.20.", "")}
                hyperlink={`https://explorer.bitshares.ws/#/objects/${fund.id}${
                  usr.chain === "bitshares" ? "" : "?network=testnet"
                }`}
              />{" "}
              {t("CreditBorrow:common.by")}{" "}
              {lender ? (
                <ExternalLink
                  classnamecontents="hover:text-purple-500"
                  type="text"
                  text={lender.name}
                  hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                    lender.name
                  }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                />
              ) : (
                "???"
              )}
              {" ("}
              <ExternalLink
                classnamecontents="hover:text-purple-500"
                type="text"
                text={fund.owner_account}
                hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                  fund.owner_account
                }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
              />
              {") "}
              {lender && lender.id === lender.lifetime_referrer ? " - LTM" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 mt-1">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="col-span-2">
                {t("SameTFunds:offering")}:
                <b>{` ${balance - unpaidAmount} `}</b>
                <ExternalLink
                  classnamecontents="hover:text-purple-500 font-bold"
                  type="text"
                  text={assetName}
                  hyperlink={`https://explorer.bitshares.ws/#/assets/${assetName}${
                    usr.chain === "bitshares" ? "" : "?network=testnet"
                  }`}
                />
              </div>
              <div>
                {t("SameTFunds:fee")}:<b>{` ${feeRate} %`}</b>
                {feeRate > 20 ? "⚠️" : null}
              </div>

              {usr.id === fund.owner_account ? (
                <div className="col-span-3 grid grid-cols-2 gap-3">
                  <Dialog
                    open={updatePrompt}
                    onOpenChange={(open) => {
                      setUpdatePrompt(open);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm">{t("SameTFunds:update")}</Button>
                    </DialogTrigger>
                    <DialogContent className="w-full bg-white">
                      <DialogHeader>
                        <DialogTitle>
                          {t("SameTFunds:updateDialog.title")}
                        </DialogTitle>
                        <DialogDescription>
                          {t("SameTFunds:updateDialog.description")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <HoverInfo
                            content={t(
                              "SameTFunds:updateDialog.newAmountContent"
                            )}
                            header={t(
                              "SameTFunds:updateDialog.newAmountHeader"
                            )}
                            type="header"
                          />
                          <Button
                            className="h-6 mt-1 ml-3 hover:shadow-md"
                            onClick={() => {
                              setNewAmount(
                                humanReadableAssetBalance
                                  ? humanReadableAssetBalance
                                  : 0
                              );
                            }}
                            variant="outline"
                          >
                            {t("SameTFunds:updateDialog.balance")}
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            value={newAmount}
                            min={1}
                            step={1}
                            onInput={(e) => {
                              const input = e.currentTarget.value;
                              const regex = assetAmountRegex(asset);
                              if (regex.test(input)) {
                                setNewAmount(e.currentTarget.value);
                              }
                            }}
                          />
                          <Input
                            type="text"
                            value={`${asset ? asset.symbol : "???"} (${
                              asset ? asset.id : "???"
                            })`}
                            disabled
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <HoverInfo
                            content={t("SameTFunds:updateDialog.newFeeContent")}
                            header={t("SameTFunds:updateDialog.newFeeHeader")}
                            type="header"
                          />
                          <Input
                            placeholder={newFeeRate ?? 0}
                            value={newFeeRate ?? 0}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            pattern="^\d*(\.\d{0,2})?$"
                            onInput={(e) => {
                              setNewFeeRate(e.currentTarget.value);
                              debouncedPercent(
                                e.currentTarget.value,
                                setNewFeeRate
                              );
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => {
                              setUpdateDialog(true);
                            }}
                          >
                            {t("SameTFunds:update")}
                          </Button>
                          {newAmount > humanReadableAssetBalance ? (
                            <Badge variant="destructive">
                              <ExclamationTriangleIcon className="mr-2" />{" "}
                              {t("Predictions:insufficient_funds")}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    onClick={() => {
                      setDeleteDialog(true);
                    }}
                  >
                    {t("CustomPoolOverview:delete")}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
          {updateDialog ? (
            <DeepLinkDialog
              operationNames={["samet_fund_update"]}
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setUpdateDialog}
              key={`Updating_${fund.id}`}
              headerText={t("SameTFunds:updateDialog.updateHeader", {
                owner_account: usr.id,
                fund_id: fund.id,
              })}
              trxJSON={[
                {
                  owner_account: usr.id,
                  fund_id: fund.id,
                  delta_amount: {
                    amount: blockchainFloat(
                      deltaAmount,
                      asset.precision
                    ).toFixed(0),
                    asset_id: asset.id,
                  },
                  new_fee_rate: newFeeRate * 100,
                  extensions: {},
                },
              ]}
            />
          ) : null}
          {deleteDialog ? (
            <DeepLinkDialog
              operationNames={["samet_fund_delete"]}
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setDeleteDialog}
              key={`Deleting_${fund.id}`}
              headerText={t("SameTFunds:deleteHeader", {
                owner_account: usr.id,
                fund_id: fund.id,
              })}
              trxJSON={[
                {
                  owner_account: usr.id,
                  fund_id: fund.id,
                  extensions: [],
                },
              ]}
            />
          ) : null}
        </Card>
      </div>
    );
  };

  const [createPrompt, setCreatePrompt] = useState(false);
  const [createAmount, setCreateAmount] = useState(0);
  const [createFeeRate, setCreateFeeRate] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);

  const fundSearch = useMemo(() => {
    if (!sameTFunds || !sameTFunds.length) {
      return;
    }

    const adjustedFunds = sameTFunds.map((fund) => {
      const asset = assets.find((a) => a.id === fund.asset_type);
      const assetSymbol = asset ? asset.symbol : "";
      const owner = lenderAccounts.find((a) => a.id === fund.owner_account);
      const ownerName = owner ? owner.name : "";
      return { ...fund, assetSymbol, ownerName };
    });

    return new Fuse(adjustedFunds, {
      includeScore: true,
      threshold: 0.2,
      keys: ["assetSymbol", "ownerName"],
    });
  }, [sameTFunds, lenderAccounts, assets]);

  const isValid = (str) => /^[a-zA-Z0-9.-]+$/.test(str);
  const [thisInput, setThisInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  useEffect(() => {
    if (fundSearch && thisInput) {
      if (!isValid(thisInput)) {
        return;
      }
      const result = fundSearch.search(thisInput);
      setSearchResults(result);
    }
  }, [fundSearch, thisInput]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:w-1/2">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{t("SameTFunds:title")}</CardTitle>
              <CardDescription>{t("SameTFunds:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <Button
                  onClick={() => {
                    setView("all");
                  }}
                  variant={view === "all" ? "" : "outline"}
                >
                  {t("SameTFunds:all")}
                </Button>
                <Button
                  onClick={() => {
                    setView("mine");
                  }}
                  variant={view === "mine" ? "" : "outline"}
                >
                  {t("SameTFunds:mine")}
                </Button>
                <Button
                  onClick={() => {
                    setView("search");
                  }}
                  variant={view === "search" ? "" : "outline"}
                >
                  {t("SameTFunds:search")}
                </Button>

                <Dialog
                  open={createPrompt}
                  onOpenChange={(open) => {
                    setCreatePrompt(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="hover:shadow-md">
                      {t("SameTFunds:create")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-full bg-white">
                    <DialogHeader>
                      <DialogTitle>
                        {t("SameTFunds:createDialog.title")}
                      </DialogTitle>
                      <DialogDescription>
                        {t("SameTFunds:createDialog.description")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-2">
                      <HoverInfo
                        content={t("SameTFunds:createDialog.headerContent")}
                        header={t("CreatePrediction:pma.backing_asset.header")}
                        type="header"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          disabled
                          value={
                            lendingAssetData
                              ? `${lendingAssetData.symbol} (${lendingAssetData.id})`
                              : lendingAsset
                          }
                          type="text"
                        />
                        <AssetDropDown
                          assetSymbol={lendingAsset ?? ""}
                          assetData={null}
                          storeCallback={setLendingAsset}
                          otherAsset={null}
                          marketSearch={marketSearch}
                          type={"backing"}
                          chain={usr && usr.chain ? usr.chain : "bitshares"}
                          balances={usrBalances}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <HoverInfo
                          content={t(
                            "SameTFunds:updateDialog.newAmountContent"
                          )}
                          header={t("SameTFunds:updateDialog.newAmountHeader")}
                          type="header"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={createAmount}
                          min={1}
                          step={1}
                          onInput={(e) => {
                            const input = e.currentTarget.value;
                            const regex = assetAmountRegex(lendingAssetData);
                            if (regex.test(input)) {
                              setCreateAmount(e.currentTarget.value);
                            }
                          }}
                        />
                        <Button
                          className="hover:shadow-md"
                          onClick={() => {
                            setCreateAmount(lendingAssetBalance ?? 0);
                          }}
                          variant="outline"
                        >
                          {t("SameTFunds:updateDialog.balance")}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <HoverInfo
                          content={t("SameTFunds:updateDialog.newFeeContent")}
                          header={t("SameTFunds:updateDialog.newFeeHeader")}
                          type="header"
                        />
                        <Input
                          placeholder={createFeeRate ?? 0}
                          value={createFeeRate ?? 0}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          pattern="^\d*(\.\d{0,2})?$"
                          onInput={(e) => {
                            setCreateFeeRate(e.currentTarget.value);
                            debouncedPercent(
                              e.currentTarget.value,
                              setCreateFeeRate
                            );
                          }}
                          className="w-1/2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => {
                            setCreateDialog(true);
                          }}
                          className="mt-2"
                        >
                          {t("SameTFunds:create")}
                        </Button>
                        {createAmount > lendingAssetBalance ? (
                          <Badge variant="destructive">
                            <ExclamationTriangleIcon className="mr-2" />{" "}
                            {t("Predictions:insufficient_funds")}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {createDialog ? (
                      <DeepLinkDialog
                        operationNames={["samet_fund_create"]}
                        username={usr.username}
                        usrChain={usr.chain}
                        userID={usr.id}
                        dismissCallback={setCreateDialog}
                        key={`CreatingNewFund_${usr.id}_${lendingAssetData.id}`}
                        headerText={t("SameTFunds:createDialog.title")}
                        trxJSON={[
                          {
                            owner_account: usr.id,
                            asset_type: lendingAssetData.id,
                            balance: blockchainFloat(
                              createAmount,
                              lendingAssetData.precision
                            ).toFixed(0),
                            fee_rate: createFeeRate * 100,
                            extensions: {},
                          },
                        ]}
                      />
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>
              {view === "all" ? (
                relevantFunds && relevantFunds.length > 0 ? (
                  <div className="w-full mt-3 max-h-[500px] overflow-auto">
                    <span className="hidden md:block">
                      <List
                        rowComponent={Row}
                        rowCount={relevantFunds.length}
                        rowHeight={120}
                        rowProps={{}}
                        key={`list-${view}`}
                      />
                    </span>
                    <span className="block md:hidden">
                      <List
                        rowComponent={Row}
                        rowCount={relevantFunds.length}
                        rowHeight={160}
                        rowProps={{}}
                        key={`list-${view}`}
                      />
                    </span>
                  </div>
                ) : (
                  <div className="mt-5">{t("SameTFunds:noFunds")}</div>
                )
              ) : null}
              {view === "mine" ? (
                myTFunds && myTFunds.length > 0 ? (
                  <div className="w-full mt-3 max-h-[500px] overflow-auto">
                    <span className="hidden md:block">
                      <List
                        rowComponent={Row}
                        rowCount={myTFunds.length}
                        rowHeight={120}
                        rowProps={{}}
                        key={`list-${view}`}
                      />
                    </span>
                    <span className="block md:hidden">
                      <List
                        rowComponent={Row}
                        rowCount={myTFunds.length}
                        rowHeight={160}
                        rowProps={{}}
                        key={`list-${view}`}
                      />
                    </span>
                  </div>
                ) : (
                  <Empty className="mt-5">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">❕</EmptyMedia>
                      <EmptyTitle>{t("SameTFunds:noOwnedFunds")}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                )
              ) : null}
              {view === "search" ? (
                <div className="grid grid-cols-1 gap-2">
                  <HoverInfo
                    content={t("SameTFunds:searchDescription")}
                    header={t("SameTFunds:searchHeader")}
                    type="header"
                  />
                  <Input
                    type="text"
                    placeholder="BTS"
                    onInput={(e) => {
                      setThisInput(e.currentTarget.value);
                    }}
                    className="w-1/2"
                  />
                </div>
              ) : null}
              {view === "search" ? (
                searchResults && searchResults.length > 0 ? (
                  <div className="w-full mt-3 max-h-[500px] overflow-auto">
                    <span className="hidden md:block">
                      <List
                        rowComponent={Row}
                        rowCount={searchResults.length}
                        rowHeight={120}
                        rowProps={{}}
                        key={`list-${view}`}
                      />
                    </span>
                    <span className="block md:hidden">
                      <List
                        rowComponent={Row}
                        rowCount={searchResults.length}
                        rowHeight={160}
                        rowProps={{}}
                        key={`list-${view}`}
                      />
                    </span>
                  </div>
                ) : (
                  <div className="mt-5">{t("SameTFunds:noSearchResults")}</div>
                )
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
