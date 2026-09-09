import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";
import { MinusCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Repeat,
  Handshake,
  Shield,
  Send,
  Zap,
  UserPlus,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { getObjects } from "@/nanoeffects/src/common";
import {
  blockchainFloat,
  humanReadableFloat,
  assetAmountRegex,
} from "@/lib/common";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";
import AccountSearch from "./AccountSearch.jsx";
import BalanceAssetDropDownCard from "./Market/BalanceAssetDropDownCard.jsx";
import { Avatar } from "./Avatar.tsx";
import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";

const operationNumbers = {
  transfer: 0,
  proposal_create: 22,
};

const getBalance = (balances, assetId, precision) => {
  if (!balances || !assetId) return 0;
  const balanceObj = balances.find((b) => b.asset_id === assetId);
  return balanceObj ? humanReadableFloat(balanceObj.amount, precision) : 0;
};


function BarterFromRow({ index, style, fromAssets, onRemove }) {
    const item = Object.values(fromAssets)[index];
    if (!item) return null;
    const assetData = item.asset;
    return (
      <div
        key={assetData.id}
        className={`rounded-xl border border-emerald-400/15 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] transition-colors relative p-2`}
        style={style}
      >
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2">
            <Input
              id={`amount-from-${assetData.id}`}
              type="number"
              value={item.amount}
              disabled
              className="!bg-card/40 border-border text-foreground font-mono"
            />
          </div>
          <div className="col-span-2">
            <Input
              id={`asset-from-${assetData.id}`}
              type="text"
              value={assetData?.symbol || ""}
              disabled
              className="!bg-card/40 border-border text-foreground"
            />
          </div>
          <div className="text-center">
            <Button
              onClick={() => onRemove(assetData.id, "from")}
              variant="ghost"
              size="icon"
              className="text-muted-foreground/60 hover:text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)] transition-colors"
            >
              <CrossCircledIcon />
            </Button>
          </div>
        </div>
      </div>
    );
}
const MemoBarterFromRow = React.memo(BarterFromRow);

function BarterToRow({ index, style, toAssets, onRemove }) {
    const item = Object.values(toAssets)[index];
    if (!item) return null;
    const assetData = item.asset;
    return (
      <div
        key={assetData.id}
        className={`rounded-xl border border-teal-400/15 bg-teal-500/[0.03] hover:bg-teal-500/[0.06] transition-colors relative p-2`}
        style={style}
      >
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2">
            <Input
              id={`amount-to-${assetData.id}`}
              type="number"
              value={item.amount}
              disabled
              className="!bg-card/40 border-border text-foreground font-mono"
            />
          </div>
          <div className="col-span-2">
            <Input
              id={`asset-to-${assetData.id}`}
              type="text"
              value={assetData?.symbol || ""}
              disabled
              className="!bg-card/40 border-border text-foreground"
            />
          </div>
          <div className="text-center">
            <Button
              onClick={() => onRemove(assetData.id, "to")}
              variant="ghost"
              size="icon"
              className="text-muted-foreground/60 hover:text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)] transition-colors"
            >
              <CrossCircledIcon />
            </Button>
          </div>
        </div>
      </div>
    );
}
const MemoBarterToRow = React.memo(BarterToRow);

export default function Barter(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

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

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [toAccount, setToAccount] = useState(null);
  const [fromAssets, setFromAssets] = useState({});
  const [toAssets, setToAssets] = useState({});

  const [showEscrow, setShowEscrow] = useState(false);
  const [escrowAccount, setEscrowAccount] = useState(null);
  const [sendToEscrowFirst, setSendToEscrowFirst] = useState(false);
  const [escrowPayment, setEscrowPayment] = useState(0);

  const [fromBalances, setFromBalances] = useState(null);
  const [toBalances, setToBalances] = useState(null);

  const [fromAccountData, setFromAccountData] = useState(null);
  const [toAccountData, setToAccountData] = useState(null);

  const [showDialog, setShowDialog] = useState(false);
  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);
  const [escrowUserDialogOpen, setEscrowUserDialogOpen] = useState(false);

  const [proposalFee, setProposalFee] = useState(0);
  const [transferFee, setTransferFee] = useState(0);
  const [urlPrefilled, setUrlPrefilled] = useState(false);
  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  useEffect(() => {
    if (globalParams && globalParams.length) {
      const proposalFeeObj = globalParams.find((x) => x.id === 22);
      const transferFeeObj = globalParams.find((x) => x.id === 0);
      setProposalFee(
        proposalFeeObj ? humanReadableFloat(proposalFeeObj.data.fee, 5) : 0
      );
      setTransferFee(
        transferFeeObj ? humanReadableFloat(transferFeeObj.data.fee, 5) : 0
      );
    }
  }, [globalParams]);

  // URL prefill (?from= ?to= ?counterparty= ?escrow= ?escrowFee= ?first=),
  // e.g. from a trollbox barter attachment's "proceed" link. Applies once,
  // only to empty fields, so manual input is never clobbered. Asset legs
  // are "1.3.x:humanAmount" pairs; escrow fee is a BTS human amount.
  useEffect(() => {
    if (urlPrefilled || !assets || !assets.length) {
      return undefined;
    }
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      setUrlPrefilled(true);
      return undefined;
    }
    const fromParam = params.get("from");
    const toParam = params.get("to");
    const counterpartyParam = params.get("counterparty");
    const escrowParam = params.get("escrow");
    if (!fromParam && !toParam && !counterpartyParam && !escrowParam) {
      setUrlPrefilled(true);
      return undefined;
    }

    const parseLeg = (param) => {
      const out = {};
      if (!param) {
        return out;
      }
      for (const part of param.split(",")) {
        const sep = part.lastIndexOf(":");
        if (sep === -1) {
          continue;
        }
        const id = part.slice(0, sep);
        const amount = part.slice(sep + 1);
        if (!/^1\.3\.\d+$/.test(id)) {
          continue;
        }
        const asset = assets.find((a) => a && a.id === id);
        if (!asset) {
          continue;
        }
        if (
          typeof amount !== "string" ||
          !assetAmountRegex({ precision: asset.precision }).test(amount) ||
          !(parseFloat(amount) > 0)
        ) {
          continue;
        }
        out[id] = { amount, asset };
      }
      return out;
    };

    const fromLeg = parseLeg(fromParam);
    const toLeg = parseLeg(toParam);
    if (Object.keys(fromLeg).length) {
      setFromAssets((prev) =>
        Object.keys(prev || {}).length ? prev : fromLeg
      );
    }
    if (Object.keys(toLeg).length) {
      setToAssets((prev) =>
        Object.keys(prev || {}).length ? prev : toLeg
      );
    }

    const escrowValid = /^1\.2\.\d+$/.test(escrowParam || "");
    if (escrowValid) {
      setShowEscrow(true);
      const fee = params.get("escrowFee");
      if (
        typeof fee === "string" &&
        assetAmountRegex({ precision: 5 }).test(fee) &&
        parseFloat(fee) > 0
      ) {
        setEscrowPayment((prev) =>
          prev && parseFloat(prev) > 0 ? prev : fee
        );
      }
      const first = params.get("first");
      if (first === "self" || first === "counterparty") {
        setSendToEscrowFirst(first === "self");
      }
    }

    const needIds = [];
    if (/^1\.2\.\d+$/.test(counterpartyParam || "")) {
      needIds.push(counterpartyParam);
    }
    if (escrowValid) {
      needIds.push(escrowParam);
    }
    let cancelled = false;
    if (needIds.length) {
      getObjects(_chain, [...new Set(needIds)], currentNode?.url || null)
        .then((accounts) => {
          if (cancelled) {
            return;
          }
          const byId = {};
          for (const a of accounts || []) {
            if (a && a.id) {
              byId[a.id] = a.name ?? a.id;
            }
          }
          if (counterpartyParam && byId[counterpartyParam]) {
            setToAccount((prev) =>
              prev
                ? prev
                : { id: counterpartyParam, name: byId[counterpartyParam] }
            );
          }
          if (escrowValid && byId[escrowParam]) {
            setEscrowAccount((prev) =>
              prev ? prev : { id: escrowParam, name: byId[escrowParam] }
            );
          }
        })
        .catch(() => {
          // names stay unresolved; user can pick accounts manually
        });
    }
    setUrlPrefilled(true);
    return () => {
      cancelled = true;
    };
  }, [assets, _chain, currentNode, urlPrefilled]);

  useEffect(() => {
    async function fetchFromBalances() {
      if (usr && usr.id && currentNode && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode.url,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setFromBalances(filteredData);
          } else if (error) {
            console.error("Error fetching current user balances:", error);
          }
        });
      }
    }

    fetchFromBalances();
  }, [usr, assets, currentNode]);

  useEffect(() => {
    async function fetchToBalances() {
      if (toAccount && toAccount.id && currentNode && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          toAccount.id,
          currentNode.url,
        ]);
        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setToBalances(filteredData);
          } else if (error) {
            console.error("Error fetching counterparty balances:", error);
          }
        });
      } else {
        setToBalances(null);
      }
    }

    fetchToBalances();
  }, [toAccount, assets, currentNode]);

  const isEscrowValid = useMemo(() => {
    if (!showEscrow) return true;
    return !showEscrow || (escrowAccount && escrowAccount.id);
  }, [showEscrow, escrowAccount]);

  const canSubmit = useMemo(
    () =>
      usr &&
      toAccount &&
      fromAssets &&
      Object.keys(fromAssets).length &&
      toAssets &&
      Object.keys(toAssets).length &&
      isEscrowValid &&
      (!showEscrow || escrowAccount.id !== toAccount.id),
    [
      usr,
      toAccount,
      fromAssets,
      toAssets,
      isEscrowValid,
      showEscrow,
      escrowAccount,
    ]
  );

  const proposalOperations = useMemo(() => {
    if (!canSubmit) return null;

    let ops = [];

    if (showEscrow && escrowPayment > 0 && escrowAccount) {
      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: usr.id,
          to: escrowAccount.id,
          amount: {
            amount: Math.floor(blockchainFloat(escrowPayment, 5)),
            asset_id: "1.3.0",
          },
          extensions: {},
        },
      ]);
    }

    Object.values(fromAssets).forEach((item) => {
      const assetData = item.asset;
      if (!assetData) return;

      const to =
        showEscrow && sendToEscrowFirst ? escrowAccount.id : toAccount.id;

      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: usr.id,
          to: to,
          amount: {
            amount: Math.floor(
              blockchainFloat(item.amount, assetData.precision)
            ),
            asset_id: assetData.id,
          },
          extensions: {},
        },
      ]);
    });

    Object.values(toAssets).forEach((item) => {
      const assetData = item.asset;
      if (!assetData) return;

      const from = toAccount.id;
      const receiver =
        showEscrow && !sendToEscrowFirst ? escrowAccount.id : usr.id;

      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: from,
          to: receiver,
          amount: {
            amount: Math.floor(
              blockchainFloat(item.amount, assetData.precision)
            ),
            asset_id: assetData.id,
          },
          extensions: {},
        },
      ]);
    });

    if (showEscrow && !sendToEscrowFirst && escrowAccount) {
      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: escrowAccount.id,
          to: usr.id,
          amount: { amount: 1, asset_id: "1.3.0" },
          extensions: {},
        },
      ]);
    }

    const proposalExpiration = new Date();
    proposalExpiration.setDate(proposalExpiration.getDate() + 7);

    const _finalJSON = [
      {
        fee: { amount: 0, asset_id: "1.3.0" },
        fee_paying_account:
          showEscrow && sendToEscrowFirst ? escrowAccount.id : toAccount.id,
        expiration_time: proposalExpiration.toISOString().slice(0, 19),
        proposed_ops: ops.map((op) => ({ op: op })),
        review_period_seconds: 3600,
        extensions: {},
      },
    ];

    return _finalJSON;
  }, [
    canSubmit,
    usr,
    toAccount,
    fromAssets,
    toAssets,
    showEscrow,
    sendToEscrowFirst,
    escrowAccount,
    escrowPayment,
    assets,
  ]);

  const handleRemoveAsset = useCallback((assetId, party) => {
    if (party === "from") {
      setFromAssets((prev) => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
    } else {
      setToAssets((prev) => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
    }
  }, []);
  const fromRowProps = useMemo(() => ({ fromAssets, onRemove: handleRemoveAsset }), [fromAssets, handleRemoveAsset]);
  const toRowProps = useMemo(() => ({ toAssets, onRemove: handleRemoveAsset }), [toAssets, handleRemoveAsset]);

  // ─── Counterparty Section ─────────────────────────────────────────
  const CounterpartySection = (
    <div className="space-y-2">
      <Label className="text-foreground/80">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
            <UserPlus className="h-3 w-3" strokeWidth={2.5} />
          </span>
          {t("Barter:counterparty")}
        </span>
      </Label>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="w-full flex items-center space-x-3">
          <div className="flex-shrink-0">
            {toAccount ? (
              <Avatar
                size={40}
                name={toAccount.name}
                extra="BarterTo"
                expression={{ eye: "normal", mouth: "open" }}
                colors={[
                  "#146A7C",
                  "#F0AB3D",
                  "#C271B4",
                  "#C20D90",
                  "#92A1C6",
                ]}
              />
            ) : (
              <Av>
                <AvatarFallback>?</AvatarFallback>
              </Av>
            )}
          </div>
          <Input
            disabled
            placeholder={t("Barter:recipientPlaceholder")}
            value={
              toAccount ? `${toAccount.name} (${toAccount.id})` : ""
            }
            className="flex-1 min-w-0 !bg-card/40 border-border text-foreground"
            readOnly
          />
          <Dialog
            open={targetUserDialogOpen}
            onOpenChange={setTargetUserDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)]"
              >
                {toAccount
                  ? t("Barter:changeRecipient")
                  : t("Barter:selectRecipient")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[375px] !bg-card border border-border text-foreground/85 rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {t("Transfer:bitsharesAccountSearch")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t("Transfer:searchingForAccount")}
                </DialogDescription>
              </DialogHeader>
              <AccountSearch
                chain={_chain}
                excludedUsers={usr ? [usr] : []}
                setChosenAccount={(acc) => {
                  setToAccount(acc);
                  setTargetUserDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );

  // ─── Your Offer Section ──────────────────────────────────────────
  const YourOfferSection = (
    <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-4">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
            <Send className="h-3 w-3" strokeWidth={2.5} />
          </span>
          {t("Barter:yourOffer")} ({usr?.username})
        </h3>
        <span className="text-right">
          {fromBalances && fromBalances.length ? (
            <BalanceAssetDropDownCard
              assetsToHide={
                fromAssets ? Object.keys(fromAssets) : []
              }
              storeCallback={(res) => {
                setFromAssets((prev) => ({
                  ...prev,
                  [res.asset.id]: {
                    amount: res.amount,
                    asset: res.asset,
                  },
                }));
              }}
              assets={assets}
              size="small"
              usrBalances={fromBalances}
            />
          ) : null}
        </span>
      </div>
      {fromAssets && Object.keys(fromAssets).length ? (
        <>
          <div className="grid grid-cols-5 gap-2 p-2 bg-[hsl(var(--accent-1)/0.06)] border border-[hsl(var(--accent-1)/0.2)] mb-1 rounded-t-md font-semibold text-sm text-foreground/80 sticky top-0 z-10">
            <div className="col-span-2">{t("Barter:amount")}</div>
            <div className="col-span-2">{t("Barter:asset")}</div>
          </div>
          <div className="w-full h-[500px] rounded-lg border border-[hsl(var(--accent-1)/0.1)] bg-card/30">
            <List
              height={500}
              rowComponent={MemoBarterFromRow}
              width="100%"
              rowCount={Object.keys(fromAssets).length}
              rowHeight={45}
              rowProps={fromRowProps}
            />
          </div>
        </>
      ) : null}
    </div>
  );

  // ─── Their Offer Section ─────────────────────────────────────────
  const TheirOfferSection = (
    <div className="rounded-xl border border-[hsl(var(--accent-2)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.06)] to-transparent p-4">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent-2)/0.15)] border border-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]">
            <Send className="h-3 w-3" strokeWidth={2.5} />
          </span>
          {t("Barter:theirOffer", {
            name: toAccount?.name || "...",
          })}
        </h3>
        <span className="text-right">
          {toBalances && toBalances.length ? (
            <BalanceAssetDropDownCard
              assetsToHide={
                toAssets ? Object.keys(toAssets) : []
              }
              storeCallback={(res) => {
                setToAssets((prev) => ({
                  ...prev,
                  [res.asset.id]: {
                    amount: res.amount,
                    asset: res.asset,
                  },
                }));
              }}
              assets={assets}
              size="small"
              usrBalances={toBalances}
            />
          ) : null}
        </span>
      </div>
      {toAssets && Object.keys(toAssets).length ? (
        <>
          <div className="grid grid-cols-5 gap-2 p-2 mb-1 bg-[hsl(var(--accent-2)/0.06)] border border-[hsl(var(--accent-2)/0.2)] rounded-t-md font-semibold text-sm text-foreground/80 sticky top-0 z-10">
            <div className="col-span-2">{t("Barter:amount")}</div>
            <div className="col-span-2">{t("Barter:asset")}</div>
          </div>
          <div className="w-full h-[500px] rounded-lg border border-[hsl(var(--accent-2)/0.1)] bg-card/30">
            <List
              height={500}
              rowComponent={MemoBarterToRow}
              width="100%"
              rowCount={Object.keys(toAssets).length}
              rowHeight={45}
              rowProps={toRowProps}
            />
          </div>
        </>
      ) : null}
    </div>
  );

  // ─── Escrow Section ──────────────────────────────────────────────
  const EscrowSection = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="escrow-checkbox"
            checked={showEscrow}
            onCheckedChange={setShowEscrow}
            className="border-[hsl(var(--accent-1)/0.5)] data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=checked]:border-[hsl(var(--accent-1))]"
          />
          <HoverInfo
            content={t("Barter:escrowInfo")}
            header={t("Barter:useEscrow")}
            onClick={() => setShowEscrow(!showEscrow)}
          />
        </div>
      </div>

      {showEscrow && (
        <div className="rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.04)] to-transparent p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground/80">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))]">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <Shield className="h-3 w-3" strokeWidth={2.5} />
                </span>
                {t("Barter:escrowAgent")}
              </span>
            </Label>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {escrowAccount ? (
                  <Avatar
                    size={40}
                    name={escrowAccount.name}
                    extra="Escrow"
                    expression={{ eye: "normal", mouth: "open" }}
                    colors={[
                      "#F0AB3D",
                      "#C271B4",
                      "#C20D90",
                      "#92A1C6",
                      "#146A7C",
                    ]}
                  />
                ) : (
                  <Av>
                    <AvatarFallback>?</AvatarFallback>
                  </Av>
                )}
              </div>
              <Input
                disabled
                placeholder={t("Barter:escrowAgentPlaceholder")}
                value={
                  escrowAccount
                    ? `${escrowAccount.name} (${escrowAccount.id})`
                    : ""
                }
                className="flex-grow !bg-card/40 border-border text-foreground"
                readOnly
              />
              <Dialog
                open={escrowUserDialogOpen}
                onOpenChange={setEscrowUserDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)]"
                  >
                    {escrowAccount
                      ? t("Barter:changeAgent")
                      : t("Barter:selectAgent")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[375px] !bg-card border border-border text-foreground/85 rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {t("Transfer:bitsharesAccountSearch")}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {t("Transfer:searchingForAccount")}
                    </DialogDescription>
                  </DialogHeader>
                  <AccountSearch
                    chain={_chain}
                    excludedUsers={
                      usr && toAccount
                        ? [usr, toAccount]
                        : usr
                        ? [usr]
                        : []
                    }
                    setChosenAccount={(acc) => {
                      setEscrowAccount(acc);
                      setEscrowUserDialogOpen(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-to-escrow-first"
                checked={sendToEscrowFirst}
                onCheckedChange={setSendToEscrowFirst}
                className="border-[hsl(var(--accent-1)/0.5)] data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=checked]:border-[hsl(var(--accent-1))]"
              />
              <HoverInfo
                content={t("Barter:sendToEscrowFirstInfo")}
                header={t("Barter:sendToEscrowFirst")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <HoverInfo
              content={t("Barter:escrowPaymentInfo")}
              header={t("Barter:escrowPayment")}
            />
            <Input
              id="escrow-payment"
              type="number"
              value={escrowPayment}
              onChange={(e) => {
                const input = e.target.value;
                const regex = assetAmountRegex({ precision: 5 });
                if (regex.test(input)) {
                  setEscrowPayment(input);
                }
              }}
              className="!bg-card/40 border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              ({_chain === "bitshares" ? "BTS" : "TEST"})
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Submit Button ───────────────────────────────────────────────
  const SubmitButton = (
    <div className="space-y-3">
      <button
        onClick={() => setShowDialog(true)}
        disabled={!canSubmit}
        className={`w-full h-14 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 text-base group ${
          canSubmit
            ? "text-[hsl(var(--accent-1-gradFg))] bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-2))] to-[hsl(var(--accent-1))] shadow-[0_8px_32px_-12px_rgba(16,185,129,0.7)] hover:shadow-[0_12px_40px_-12px_rgba(16,185,129,0.9)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-2))] hover:to-[hsl(var(--accent-1))]"
            : "text-muted-foreground bg-card/60 border border-border/40 dark:border-white/5 cursor-not-allowed"
        }`}
      >
        <Repeat
          className="h-4 w-4 group-hover:scale-110 transition-transform"
          strokeWidth={2.5}
        />
        {t("Barter:proposeTrade")}
      </button>
    </div>
  );

  // ─── Gradient Separator ──────────────────────────────────────────
  const GradientSeparator = (
    <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.4)] to-transparent" />
  );

  // ─── Main Render ─────────────────────────────────────────────────
  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
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
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Handshake className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("Barter:title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("Barter:description")}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {CounterpartySection}

              {toAccount && (
                <>
                  {GradientSeparator}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="space-y-3">
                      {YourOfferSection}
                    </div>

                    <div className="space-y-3">
                      {TheirOfferSection}
                    </div>
                  </div>

                  {GradientSeparator}

                  {EscrowSection}
                </>
              )}

              {GradientSeparator}

              {SubmitButton}
            </div>
          </div>
        </div>
      </div>

      {showDialog && canSubmit && usr && proposalOperations && (
        <DeepLinkDialog
          operationNames={["proposal_create"]}
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={() => setShowDialog(false)}
          key={`Barter_${usr.id}_${toAccount?.id || ""}`}
          headerText={t("Barter:deeplinkHeader", {
            from: usr.username,
            to: toAccount?.name,
          })}
          trxJSON={proposalOperations}
        />
      )}
    </>
  );
}
