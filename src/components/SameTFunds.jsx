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

import {
  Landmark,
  Info,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Wallet,
  Percent,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Empty,
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
import { cn } from "@/lib/utils";

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
  const [loadingFunds, setLoadingFunds] = useState(true);
  useEffect(() => {
    async function fetching() {
      setLoadingFunds(true);
      const sameTFundsStore = createEverySameTFundStore([
        _chain,
        currentNode ? currentNode.url : null,
      ]);

      sameTFundsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          let filteredData = data.filter((x) => x);
          if (_chain === "bitshares") {
            filteredData = filteredData.filter(
              (x) =>
                !blocklist.users.includes(
                  toHex(sha256(utf8ToBytes(x.owner_account)))
                )
            );
          }
          setSameTFunds(filteredData);
          setLoadingFunds(false);
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

  const defaultCoreSymbol = _chain === "bitshares" ? "BTS" : "TEST";

  const [thisInput, setThisInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // ─── Fund Row ───────────────────────────────────────────────────
  const Row = useCallback(({ index, style }) => {
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
    const unpaidAmount = humanReadableFloat(fund.unpaid_amount, asset.precision);
    const lender = lenderAccounts.find((x) => x.id === fund.owner_account);
    const available = balance - unpaidAmount;

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

    const isOwner = usr.id === fund.owner_account;

    const UpdateDialog = (
      <Dialog open={updatePrompt} onOpenChange={setUpdatePrompt}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] hover:shadow-[0_0_16px_-4px_rgba(244,63,94,0.4)] transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            {t("SameTFunds:update")}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px] !bg-card border border-border rounded-2xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent"
          />
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t("SameTFunds:updateDialog.title")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("SameTFunds:updateDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <HoverInfo
                  content={t("SameTFunds:updateDialog.newAmountContent")}
                  header={t("SameTFunds:updateDialog.newAmountHeader")}
                  type="header"
                />
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] hover:bg-[hsl(var(--accent-1)/0.2)] text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                        onClick={() => {
                          setNewAmount(humanReadableAssetBalance ? humanReadableAssetBalance : 0);
                        }}
                      >
                        <Wallet className="h-3 w-3 mr-1" />
                        {t("SameTFunds:updateDialog.balance")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-card border-border text-foreground/85">
                      <p>{t("SameTFunds:updateDialog.newAmountContent")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
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
                  className="!bg-card/40 border-border text-foreground"
                />
                <Badge
                  variant="outline"
                  className="h-9 px-3 font-mono text-xs border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                >
                  {asset ? asset.symbol : "???"}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
              <HoverInfo
                content={t("SameTFunds:updateDialog.newFeeContent")}
                header={t("SameTFunds:updateDialog.newFeeHeader")}
                type="header"
              />
              <div className="flex items-center gap-2">
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
                    debouncedPercent(e.currentTarget.value, setNewFeeRate);
                  }}
                  className="!bg-card/40 border-border text-foreground"
                />
                <span className="text-sm text-muted-foreground font-medium">
                  %
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setUpdateDialog(true)}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-6 rounded-xl text-sm font-medium bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_4px_16px_-4px_rgba(244,63,94,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(244,63,94,0.7)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-1))] transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                {t("SameTFunds:update")}
              </button>
              {newAmount > humanReadableAssetBalance ? (
                <Badge variant="destructive" className="gap-1.5">
                  <ExclamationTriangleIcon />
                  {t("Common:insufficient_funds")}
                </Badge>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );

    const DeleteButton = (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setDeleteDialog(true)}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.1)] dark:text-[hsl(var(--accent-danger-fg))] text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.2)] hover:border-[hsl(var(--accent-danger)/0.5)] hover:shadow-[0_0_16px_-4px_rgba(239,68,68,0.4)] transition-all"
            >
              <Trash2 className="h-3 w-3" />
              {t("CustomPoolOverview:delete")}
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-card border-border text-foreground/85">
            <p>{t("SameTFunds:deleteHeader", { owner_account: usr.id, fund_id: fund.id })}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    return (
      <div style={style} key={`sametfund-${view}-${fund.id}`}>
        <div className="group relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.04)] to-transparent hover:border-[hsl(var(--accent-1)/0.3)] hover:shadow-lg hover:shadow-[color:hsl(var(--accent-1)/0.05)] transition-all mb-3">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.4)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <Landmark className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-foreground">
                    {t("SameTFunds:fund")}{" "}
                    <span className="font-mono hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))] transition-colors">
                      #{fund.id.replace("1.20.", "")}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    {t("CreditBorrow:common.by")}{" "}
                    {lender ? (
                      <span className="font-medium hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))] transition-colors">
                        {lender.name}
                      </span>
                    ) : (
                      "???"
                    )}
                  </span>
                  {lender && lender.id === lender.lifetime_referrer ? (
                    <Badge className="ml-1.5 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] text-[10px] h-4 px-1.5">
                      LTM
                    </Badge>
                  ) : null}
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/50 hidden sm:block shrink-0">
                {fund.owner_account}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <div className="col-span-2 sm:col-span-1">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                  {t("SameTFunds:offering")}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-semibold font-mono tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                    {parseFloat(available).toLocaleString(undefined, {
                      maximumFractionDigits: asset ? asset.precision : 4,
                    })}
                  </span>
                  <span className="text-xs font-medium text-foreground/80">
                    {assetName}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                  {t("SameTFunds:fee")}
                </div>
                <div className="flex items-center gap-1">
                  <Percent className="h-3 w-3 text-[hsl(var(--accent-1-fg)/0.7)]" />
                  <span className="text-sm font-mono tabular-nums text-foreground/85">
                    {feeRate.toFixed(2)}%
                  </span>
                  {feeRate > 20 ? (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--accent-danger)/0.2)] text-[hsl(var(--accent-danger-fg))] text-[9px] cursor-help">
                            !
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-card border-border text-foreground/85">
                          <p>{t("SameTFunds:highFeeWarning", "High fee rate!")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                  {t("SameTFunds:unpaidAmount")}
                </div>
                <div className="text-sm font-mono tabular-nums text-muted-foreground">
                  {parseFloat(unpaidAmount).toLocaleString(undefined, {
                    maximumFractionDigits: asset ? asset.precision : 4,
                  })}{" "}
                  <span className="text-[10px] text-muted-foreground/60">
                    {assetName}
                  </span>
                </div>
              </div>

              {isOwner && (
                <div className="flex items-end justify-end gap-2 col-span-2 sm:col-span-1">
                  {UpdateDialog}
                  {DeleteButton}
                </div>
              )}
            </div>
          </div>
        </div>
        {updateDialog && (
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
                  amount: blockchainFloat(deltaAmount, asset.precision).toFixed(0),
                  asset_id: asset.id,
                },
                new_fee_rate: newFeeRate * 100,
                extensions: {},
              },
            ]}
          />
        )}
        {deleteDialog && (
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
        )}
      </div>
    );
  }, [sameTFunds, myTFunds, searchResults, view, assets, lenderAccounts, usrBalances, t, usr]);

  // ─── Create Fund Dialog ─────────────────────────────────────────
  const [createPrompt, setCreatePrompt] = useState(false);
  const [createAmount, setCreateAmount] = useState(0);
  const [createFeeRate, setCreateFeeRate] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);

  const CreateFundDialog = (
    <Dialog open={createPrompt} onOpenChange={setCreatePrompt}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] hover:shadow-[0_0_16px_-4px_rgba(244,63,94,0.4)] transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("SameTFunds:create")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] !bg-card border border-border rounded-2xl">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent"
        />
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {t("SameTFunds:createDialog.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("SameTFunds:createDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
            <HoverInfo
              content={t("SameTFunds:createDialog.headerContent")}
              header={t("SameTFunds:createDialog.backingAssetHeader")}
              type="header"
            />
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <Input
                disabled
                value={
                  lendingAssetData
                    ? `${lendingAssetData.symbol} (${lendingAssetData.id})`
                    : lendingAsset
                }
                type="text"
                className="!bg-card/40 border-border text-foreground/60"
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
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <HoverInfo
                content={t("SameTFunds:updateDialog.newAmountContent")}
                header={t("SameTFunds:updateDialog.newAmountHeader")}
                type="header"
              />
              <div className="flex items-center gap-1">
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() =>
                      setCreateAmount(
                        lendingAssetBalance ? lendingAssetBalance * pct : 0
                      )
                    }
                    className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.4)] transition-colors"
                  >
                    {Math.round(pct * 100)}%
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
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
                className="!bg-card/40 border-border text-foreground"
              />
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setCreateAmount(lendingAssetBalance ?? 0)}
                      className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-colors"
                    >
                      <Wallet className="h-3 w-3" />
                      {t("SameTFunds:updateDialog.balance")}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-card border-border text-foreground/85">
                    <p>{t("SameTFunds:updateDialog.newAmountContent")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
            <HoverInfo
              content={t("SameTFunds:updateDialog.newFeeContent")}
              header={t("SameTFunds:updateDialog.newFeeHeader")}
              type="header"
            />
            <div className="flex items-center gap-2">
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
                  debouncedPercent(e.currentTarget.value, setCreateFeeRate);
                }}
                className="max-w-[200px] !bg-card/40 border-border text-foreground"
              />
              <span className="text-sm text-muted-foreground font-medium">
                %
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setCreateDialog(true)}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-6 rounded-xl text-sm font-medium bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_4px_16px_-4px_rgba(244,63,94,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(244,63,94,0.7)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-1))] transition-all"
            >
              <Plus className="h-4 w-4" />
              {t("SameTFunds:create")}
            </button>
            {createAmount > lendingAssetBalance ? (
              <Badge variant="destructive" className="gap-1.5">
                <ExclamationTriangleIcon />
                {t("Common:insufficient_funds")}
              </Badge>
            ) : null}
          </div>
        </div>
        {createDialog && (
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
                balance: blockchainFloat(createAmount, lendingAssetData.precision).toFixed(0),
                fee_rate: createFeeRate * 100,
                extensions: {},
              },
            ]}
          />
        )}
      </DialogContent>
    </Dialog>
  );

  // ─── Fund List ──────────────────────────────────────────────────
  const FundList = ({ funds, emptyKey }) => {
    if (!funds || !funds.length) {
      return (
        <Empty className="mt-4 border border-dashed border-[hsl(var(--accent-1)/0.2)] rounded-xl bg-[hsl(var(--accent-1)/0.03)]">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
              <Landmark className="w-6 h-6" />
            </EmptyMedia>
            <EmptyTitle className="text-foreground/80">{t(emptyKey)}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      );
    }

    const MAX_VISIBLE_FUNDS = 7;
    const DESKTOP_ROW_HEIGHT = 112;
    const MOBILE_ROW_HEIGHT = 168;

    return (
      <div className="w-full mt-3">
        <div className="rounded-xl border border-[hsl(var(--accent-1)/0.1)] bg-card/30 overflow-hidden">
          <div className="hidden md:block">
            <List
              rowComponent={Row}
              rowCount={funds.length}
              rowHeight={DESKTOP_ROW_HEIGHT}
              rowProps={{}}
              style={{
                height:
                  Math.min(funds.length, MAX_VISIBLE_FUNDS) *
                  DESKTOP_ROW_HEIGHT,
                width: "100%",
              }}
              key={`list-${view}`}
            />
          </div>
          <div className="block md:hidden">
            <List
              rowComponent={Row}
              rowCount={funds.length}
              rowHeight={MOBILE_ROW_HEIGHT}
              rowProps={{}}
              style={{
                height:
                  Math.min(funds.length, MAX_VISIBLE_FUNDS) *
                  MOBILE_ROW_HEIGHT,
                width: "100%",
              }}
              key={`list-${view}-mobile`}
            />
          </div>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground/60 text-right px-1">
          {funds.length} {funds.length === 1 ? "fund" : "funds"}
        </div>
      </div>
    );
  };

  // ─── Search View ────────────────────────────────────────────────
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
  useEffect(() => {
    if (fundSearch && thisInput) {
      if (!isValid(thisInput)) {
        return;
      }
      const result = fundSearch.search(thisInput);
      setSearchResults(result);
    }
  }, [fundSearch, thisInput]);

  const SearchView = (
    <>
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 mt-3">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/80">
            {t("SameTFunds:searchHeader")}
          </span>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-card border-border text-foreground/85">
                <p className="max-w-xs">{t("SameTFunds:searchDescription")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            type="text"
            placeholder={t("SameTFunds:searchPlaceholder", "Search by asset or owner...")}
            onInput={(e) => setThisInput(e.currentTarget.value)}
            className="pl-9 w-full sm:w-1/2 !bg-card/40 border-border text-foreground"
          />
        </div>
        {thisInput && searchResults && (
          <p className="mt-2 text-[11px] text-muted-foreground/60">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{thisInput}"
          </p>
        )}
      </div>
      <FundList funds={searchResults} emptyKey="SameTFunds:noSearchResults" />
    </>
  );

  // ─── View Selector ──────────────────────────────────────────────
  const ViewSelector = (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1">
        {[
          { value: "all", label: t("SameTFunds:all") },
          { value: "mine", label: t("SameTFunds:mine") },
          { value: "search", label: t("SameTFunds:search") },
        ].map((opt) => {
          const active = view === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setView(opt.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                active
                  ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-8px_rgba(244,63,94,0.6)]"
                  : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {CreateFundDialog}
    </div>
  );

  // ─── Main Render ────────────────────────────────────────────────
  return (
    <>
      <div className="container mx-auto mt-5 mb-5 max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
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
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Landmark className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("SameTFunds:title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("SameTFunds:description")}
                </p>
              </div>
            </div>

            {loadingFunds ? (
              <div className="space-y-3 mt-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/60 bg-card/40 p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Skeleton className="h-7 w-7 rounded-lg" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-16 rounded-lg" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {ViewSelector}

                {view === "all" && (
                  <FundList funds={relevantFunds} emptyKey="SameTFunds:noFunds" />
                )}

                {view === "mine" && (
                  <FundList funds={myTFunds} emptyKey="SameTFunds:noOwnedFunds" />
                )}

                {view === "search" && SearchView}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
