import React, {
  useMemo,
  useState,
  useEffect,
  useSyncExternalStore,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  EyeOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  Shuffle,
  Plus,
  Trash2,
  UserPlus,
  X,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  Info,
} from "lucide-react";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNodeUrl } from "@/stores/node.ts";

import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import AccountSearch from "@/components/AccountSearch.jsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import BlindAccounts from "@/components/BlindAccounts.jsx";
import { $blindAccounts } from "@/stores/blindAccounts.ts";
import {
  blockchainFloat,
  humanReadableFloat,
  assetAmountRegex,
  getFlagBooleans,
} from "@/lib/common.js";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

const CARD_SHELL =
  "relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]";
const GRADIENT_HAIRLINE =
  "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-warning)/0.70)] to-transparent";
const ICON_CHIP =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-warning)/0.40)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.30)] to-[hsl(var(--accent-2)/0.30)] dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-warning)/0.4)] flex-shrink-0";
const GRADIENT_BUTTON =
  "gap-2 bg-gradient-to-r from-[hsl(var(--accent-warning))] to-[hsl(var(--accent-2))] text-white dark:text-white shadow-[0_8px_30px_-8px_hsl(var(--accent-warning)/0.6)] hover:shadow-[0_12px_40px_-8px_hsl(var(--accent-warning)/0.9)] active:scale-[0.99] transition-all duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none";
const FIELD_LABEL =
  "text-[10px] uppercase tracking-wider text-muted-foreground/70";
const HEX_MONO = "font-mono text-xs";

// A field label that reveals a descriptive tooltip on hover. Used so that
// unclear cryptographic fields (blinding factor, commitment, range proof)
// carry an inline explanation of what to enter.
function LabelWithInfo({ label, info, className }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 cursor-help ${FIELD_LABEL} ${
              className ?? ""
            }`}
          >
            {label}
            <Info className="h-3 w-3 opacity-60" />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] whitespace-normal text-left leading-relaxed"
        >
          {info}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function newOwner() {
  return {
    weight_threshold: "1",
    account_auths: [],
    key_auths: [],
  };
}

function serializeOwner(owner) {
  return {
    weight_threshold: Number(owner.weight_threshold) || 1,
    account_auths: (owner.account_auths || []).map(([id, w]) => [
      id,
      Number(w) || 1,
    ]),
    key_auths: (owner.key_auths || []).map(([k, w]) => [k, Number(w) || 1]),
    address_auths: [],
  };
}

function newOutput() {
  return {
    commitment: "",
    range_proof: "",
    owner: newOwner(),
  };
}

function serializeOutput(o) {
  return {
    commitment: o.commitment,
    range_proof: o.range_proof,
    owner: serializeOwner(o.owner),
  };
}

function newInput() {
  return { commitment: "", owner: newOwner() };
}

function serializeInput(i) {
  return { commitment: i.commitment, owner: serializeOwner(i.owner) };
}

const TABS = [
  { key: "to_blind", icon: ArrowDownToLine, op: "transfer_to_blind" },
  { key: "blind_transfer", icon: Shuffle, op: "blind_transfer" },
  { key: "from_blind", icon: ArrowUpFromLine, op: "transfer_from_blind" },
];

export default function BlindTransfers({
  _assetsBTS,
  _assetsTEST,
  _marketSearchBTS,
  _marketSearchTEST,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  useStore($blockList);

  const _chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );

  const assets = useMemo(() => {
    if (_chain !== "bitshares") return _assetsTEST || [];
    return _assetsBTS || [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain !== "bitshares") return _marketSearchTEST || [];
    return _marketSearchBTS || [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const [activeTab, setActiveTab] = useState("to_blind");
  const [broadcast, setBroadcast] = useState(null);

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-5xl text-foreground">
      <div className="grid grid-cols-1 gap-4">
        <div className={CARD_SHELL}>
          <span className={GRADIENT_HAIRLINE} />
          <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-warning)/0.15)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-2)/0.10)] blur-3xl" />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 min-w-0">
              <span className={ICON_CHIP}>
                <EyeOff className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                  {t("BlindTransfers:title")}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {t("BlindTransfers:description")}
                </p>
              </div>
            </div>

            {/* Segmented tab toggle */}
            <div className="mt-4 inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 w-full sm:w-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={
                      "flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 " +
                      (active
                        ? "bg-gradient-to-r from-[hsl(var(--accent-warning)/0.20)] to-[hsl(var(--accent-2)/0.20)] text-foreground border border-[hsl(var(--accent-warning)/0.40)] shadow-[0_0_18px_-8px_hsl(var(--accent-1)/0.6)]"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t(`BlindTransfers:tab.${tab.key}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Advanced notice */}
        <div className="rounded-xl border border-[hsl(var(--accent-warning)/0.3)] bg-[hsl(var(--accent-warning)/0.08)] px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--accent-warning-fg))] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[hsl(var(--accent-warning-fg))]">
            {t("BlindTransfers:advancedNotice")}
          </p>
        </div>

        <BlindAccounts chain={_chain} />

        {activeTab === "to_blind" ? (
          <ToBlindForm
            t={t}
            usr={usr}
            chain={_chain}
            assets={assets}
            marketSearch={marketSearch}
            onSubmit={(trx) =>
              setBroadcast({ trx, op: "transfer_to_blind" })
            }
          />
        ) : null}
        {activeTab === "blind_transfer" ? (
          <BlindTransferForm
            t={t}
            usr={usr}
            chain={_chain}
            onSubmit={(trx) => setBroadcast({ trx, op: "blind_transfer" })}
          />
        ) : null}
        {activeTab === "from_blind" ? (
          <FromBlindForm
            t={t}
            usr={usr}
            chain={_chain}
            assets={assets}
            marketSearch={marketSearch}
            onSubmit={(trx) =>
              setBroadcast({ trx, op: "transfer_from_blind" })
            }
          />
        ) : null}
      </div>

      {broadcast ? (
        <DeepLinkDialog
          operationNames={[broadcast.op]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={(open) => {
            if (!open) setBroadcast(null);
          }}
          key={`blind-${broadcast.op}-${usr.id}`}
          headerText={t(`BlindTransfers:${broadcast.op}Header`)}
          trxJSON={[broadcast.trx]}
        />
      ) : null}
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <div className={CARD_SHELL}>
      <span className={GRADIENT_HAIRLINE} />
      <div className="relative p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className={ICON_CHIP}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight">{title}</h3>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function useUserBalances(usr, assets, chain) {
  const currentNodeUrl = useStore($currentNodeUrl);
  const [balances, setBalances] = useState();

  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id && currentNodeUrl && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNodeUrl || "",
        ]);
        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setBalances(filteredData);
          }
        });
      }
    }
    fetchUserBalances();
  }, [usr, assets, currentNodeUrl]);

  return balances;
}

function useBlindAccounts(chain) {
  const stored = useStore($blindAccounts);
  return useMemo(() => (stored && stored[chain]) || [], [stored, chain]);
}

function AmountAssetField({
  t,
  amount,
  setAmount,
  selectedSymbol,
  setSelectedSymbol,
  assets,
  marketSearch,
  balances,
  chain,
  confidentialOnly = false,
}) {
  // For confidential operations the chain only permits assets that have not
  // disabled confidential use, are not transfer-restricted and are not
  // white-listed (see transfer_to_blind_evaluator::do_evaluate).
  const eligibleAssets = useMemo(() => {
    if (!confidentialOnly || !assets) return assets || [];
    return (assets || []).filter((a) => {
      const flags = getFlagBooleans(a?.options?.flags ?? 0);
      return !flags.disable_confidential && !flags.transfer_restricted && !flags.white_list;
    });
  }, [assets, confidentialOnly]);

  const asset = useMemo(
    () => (eligibleAssets || []).find((a) => a.symbol === selectedSymbol),
    [eligibleAssets, selectedSymbol]
  );

  // Only surface the dropdown assets that are eligible; fall back to the
  // full market search when flag data is unavailable.
  const eligibleMarketSearch = useMemo(() => {
    if (!confidentialOnly || !marketSearch || !marketSearch.length) {
      return marketSearch || [];
    }
    const eligibleIds = new Set(eligibleAssets.map((a) => a.id));
    return marketSearch.filter((m) => eligibleIds.has(m.id));
  }, [confidentialOnly, marketSearch, eligibleAssets]);

  const balance = useMemo(() => {
    if (!asset || !balances) return null;
    const b = balances.find((x) => x.asset_id === asset.id);
    return b ? humanReadableFloat(b.amount, asset.precision) : null;
  }, [asset, balances]);

  const regex = useMemo(() => assetAmountRegex(asset), [asset]);

  const handleAmountChange = (e) => {
    const input = e.target.value;
    if (regex.test(input)) {
      if (balance != null && Number(input) > Number(balance)) {
        setAmount(balance);
      } else {
        setAmount(input);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <LabelWithInfo
          label={t("BlindTransfers:assetLabel")}
          info={t("BlindTransfers:assetInfo")}
        />
        <AssetDropDown
          assetSymbol={selectedSymbol ?? ""}
          assetData={asset ? { id: asset.id } : null}
          storeCallback={setSelectedSymbol}
          marketSearch={eligibleMarketSearch}
          type={null}
          chain={chain}
          balances={balances}
          initialMode="balances"
          balancesOnly
          triggerVariant="outline"
          triggerLabel={selectedSymbol ? selectedSymbol : undefined}
          triggerClassName="w-full border-[hsl(var(--accent-warning)/0.3)] text-[hsl(var(--accent-warning-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.5)]"
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <LabelWithInfo
            label={t("BlindTransfers:amountLabel")}
            info={t("BlindTransfers:amountInfo")}
          />
          {asset && balance != null ? (
            <button
              type="button"
              onClick={() => setAmount(balance)}
              className="text-[10px] uppercase tracking-wider text-[hsl(var(--accent-1-fg))] hover:underline"
            >
              {t("BlindTransfers:max")} {balance} {asset?.symbol}
            </button>
          ) : null}
        </div>
        <Input
          type="number"
          min="0"
          step={
            asset && asset.precision
              ? `0.${"0".repeat(asset.precision - 1)}1`
              : "any"
          }
          value={amount}
          onChange={handleAmountChange}
          placeholder={asset ? "0.0" : t("BlindTransfers:selectAssetFirst")}
          disabled={!asset}
        />
        {asset && balance != null ? (
          <p className="text-[11px] text-muted-foreground">
            {t("BlindTransfers:balanceAvailable", {
              amount: balance,
              symbol: asset?.symbol,
            })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function OwnerBuilder({ t, chain, owner, setOwner, blindAccounts }) {
  const [showSearch, setShowSearch] = useState(false);
  const [showBlindPicker, setShowBlindPicker] = useState(false);

  const update = (patch) => setOwner({ ...owner, ...patch });

  const useBlindAccount = (publicKey) => {
    // A blind recipient is a single-key authority, matching the core
    // `authority(1, public_key_type(pub), 1)` used for blind_output.owner.
    update({
      weight_threshold: "1",
      account_auths: [],
      key_auths: [[publicKey, 1]],
    });
    setShowBlindPicker(false);
  };

  return (
    <div className="rounded-xl border border-border bg-accent/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[hsl(var(--accent-warning-fg))]" />
          <Label className="text-sm font-semibold">
            {t("BlindTransfers:ownerLabel")}
          </Label>
        </div>
        {blindAccounts && blindAccounts.length ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowBlindPicker(true)}
            className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {t("BlindAccounts:useAsRecipient")}
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        <LabelWithInfo
          label={t("BlindTransfers:weightThresholdLabel")}
          info={t("BlindTransfers:weightThresholdInfo")}
        />
        <Input
          type="number"
          min="1"
          value={owner.weight_threshold}
          onChange={(e) => update({ weight_threshold: e.target.value })}
          className="max-w-[140px]"
        />
      </div>

      {/* account_auths */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <LabelWithInfo
            label={t("BlindTransfers:accountAuthsLabel")}
            info={t("BlindTransfers:accountAuthsInfo")}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowSearch(true)}
            className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addAccount")}
          </Button>
        </div>
        {owner.account_auths.length ? (
          <div className="space-y-1.5">
            {owner.account_auths.map(([id, weight], idx) => (
              <div
                key={`${id}-${idx}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2 py-1.5"
              >
                <span className="font-mono text-xs text-foreground flex-1 truncate">
                  {id}
                </span>
                <Input
                  type="number"
                  min="1"
                  value={weight}
                  onChange={(e) => {
                    const next = [...owner.account_auths];
                    next[idx] = [id, e.target.value];
                    update({ account_auths: next });
                  }}
                  className="h-7 w-16 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
                  onClick={() =>
                    update({
                      account_auths: owner.account_auths.filter(
                        (_, i) => i !== idx
                      ),
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground italic">
            {t("BlindTransfers:noAccountAuths")}
          </div>
        )}
      </div>

      {/* key_auths */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <LabelWithInfo
            label={t("BlindTransfers:keyAuthsLabel")}
            info={t("BlindTransfers:keyAuthsInfo")}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              update({ key_auths: [...owner.key_auths, ["", 1]] })
            }
            className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addKey")}
          </Button>
        </div>
        {owner.key_auths.map(([k, weight], idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2 py-1.5"
          >
            <Input
              value={k}
              placeholder={t("BlindTransfers:publicKeyPlaceholder")}
              onChange={(e) => {
                const next = [...owner.key_auths];
                next[idx] = [e.target.value, weight];
                update({ key_auths: next });
              }}
              className="h-7 text-xs font-mono flex-1"
            />
            <Input
              type="number"
              min="1"
              value={weight}
              onChange={(e) => {
                const next = [...owner.key_auths];
                next[idx] = [k, e.target.value];
                update({ key_auths: next });
              }}
              className="h-7 w-16 text-xs"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
              onClick={() =>
                update({
                  key_auths: owner.key_auths.filter((_, i) => i !== idx),
                })
              }
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {showSearch ? (
        <Dialog open onOpenChange={(open) => !open && setShowSearch(false)}>
          <DialogContent className="sm:max-w-[420px] bg-card">
            <DialogHeader>
              <DialogTitle>{t("BlindTransfers:searchAccountTitle")}</DialogTitle>
              <DialogDescription>
                {t("BlindTransfers:searchAccountDescription")}
              </DialogDescription>
            </DialogHeader>
            <AccountSearch
              chain={chain}
              excludedUsers={[]}
              setChosenAccount={(acct) => {
                if (acct && acct.id) {
                  if (!owner.account_auths.some(([id]) => id === acct.id)) {
                    update({
                      account_auths: [...owner.account_auths, [acct.id, 1]],
                    });
                  }
                }
                setShowSearch(false);
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      {showBlindPicker ? (
        <Dialog open onOpenChange={(open) => !open && setShowBlindPicker(false)}>
          <DialogContent className="sm:max-w-[420px] bg-card">
            <DialogHeader>
              <DialogTitle>{t("BlindAccounts:title")}</DialogTitle>
              <DialogDescription>
                {t("BlindAccounts:useAsRecipient")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {blindAccounts.map((acc) => (
                <button
                  key={acc.publicKey}
                  type="button"
                  onClick={() => useBlindAccount(acc.publicKey)}
                  className="w-full text-left rounded-lg border border-border bg-card/60 hover:bg-[hsl(var(--accent-1)/0.08)] hover:border-[hsl(var(--accent-1)/0.3)] transition-colors px-3 py-2.5"
                >
                  <div className="text-sm font-semibold text-foreground/90">
                    {acc.label}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground/70 truncate">
                    {acc.publicKey}
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function OutputEditor({ t, chain, output, setOutput, onRemove, index, removable }) {
  const update = (patch) => setOutput({ ...output, ...patch });

  const blindAccounts = useBlindAccounts(chain);

  return (
    <div className="rounded-xl border border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.06)] to-transparent p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--accent-2-fg))]">
          {t("BlindTransfers:output")} #{index + 1}
        </span>
        {removable ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        <LabelWithInfo
          label={t("BlindTransfers:commitmentLabel")}
          info={t("BlindTransfers:commitmentInfo")}
        />
        <Input
          className={HEX_MONO}
          value={output.commitment}
          onChange={(e) => update({ commitment: e.target.value })}
          placeholder={t("BlindTransfers:commitmentPlaceholder")}
        />
      </div>

      <div className="space-y-1">
        <LabelWithInfo
          label={t("BlindTransfers:rangeProofLabel")}
          info={t("BlindTransfers:rangeProofInfo")}
        />
        <Textarea
          className={`${HEX_MONO} min-h-[70px]`}
          value={output.range_proof}
          onChange={(e) => update({ range_proof: e.target.value })}
          placeholder={t("BlindTransfers:rangeProofPlaceholder")}
        />
      </div>

      <OwnerBuilder
        t={t}
        chain={chain}
        owner={output.owner}
        setOwner={(owner) => update({ owner })}
        blindAccounts={blindAccounts}
      />
    </div>
  );
}

function InputEditor({ t, chain, input, setInput, onRemove, index, removable }) {
  const update = (patch) => setInput({ ...input, ...patch });
  const blindAccounts = useBlindAccounts(chain);
  return (
    <div className="rounded-xl border border-[hsl(var(--accent-warning)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.06)] to-transparent p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--accent-warning-fg))]">
          {t("BlindTransfers:input")} #{index + 1}
        </span>
        {removable ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
      <div className="space-y-1">
        <LabelWithInfo
          label={t("BlindTransfers:commitmentLabel")}
          info={t("BlindTransfers:commitmentInfo")}
        />
        <Input
          className={HEX_MONO}
          value={input.commitment}
          onChange={(e) => update({ commitment: e.target.value })}
          placeholder={t("BlindTransfers:commitmentPlaceholder")}
        />
      </div>
      <OwnerBuilder
        t={t}
        chain={chain}
        owner={input.owner}
        setOwner={(owner) => update({ owner })}
        blindAccounts={blindAccounts}
      />
    </div>
  );
}

function ToBlindForm({ t, usr, chain, assets, marketSearch, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [blindingFactor, setBlindingFactor] = useState("");
  const [outputs, setOutputs] = useState([newOutput()]);

  const balances = useUserBalances(usr, assets, chain);

  const asset = useMemo(
    () => (assets || []).find((a) => a.symbol === selectedSymbol),
    [assets, selectedSymbol]
  );

  const canSubmit =
    usr?.id && asset && amount && Number(amount) > 0 && outputs.length > 0;

  const submit = () => {
    const trx = {
      fee: { amount: 0, asset_id: asset.id },
      amount: {
        amount: blockchainFloat(Number(amount), asset.precision).toFixed(0),
        asset_id: asset.id,
      },
      from: usr.id,
      blinding_factor: blindingFactor,
      outputs: outputs.map(serializeOutput),
    };
    onSubmit(trx);
  };

  return (
    <SectionCard
      icon={ArrowDownToLine}
      title={t("BlindTransfers:tab.to_blind")}
      description={t("BlindTransfers:toBlindDescription")}
    >
      <AmountAssetField
        t={t}
        amount={amount}
        setAmount={setAmount}
        selectedSymbol={selectedSymbol}
        setSelectedSymbol={setSelectedSymbol}
        assets={assets}
        marketSearch={marketSearch}
        balances={balances}
        chain={chain}
        confidentialOnly
      />

      <div className="space-y-1">
        <LabelWithInfo
          label={t("BlindTransfers:blindingFactorLabel")}
          info={t("BlindTransfers:blindingFactorInfo")}
        />
        <Input
          className={HEX_MONO}
          value={blindingFactor}
          onChange={(e) => setBlindingFactor(e.target.value)}
          placeholder={t("BlindTransfers:blindingFactorPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t("BlindTransfers:outputs")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOutputs([...outputs, newOutput()])}
            className="gap-1 h-7 border-[hsl(var(--accent-2)/0.3)] hover:bg-[hsl(var(--accent-2)/0.06)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addOutput")}
          </Button>
        </div>
        {outputs.map((o, idx) => (
          <OutputEditor
            key={idx}
            index={idx}
            t={t}
            chain={chain}
            output={o}
            removable={outputs.length > 1}
            setOutput={(next) =>
              setOutputs(outputs.map((x, i) => (i === idx ? next : x)))
            }
            onRemove={() => setOutputs(outputs.filter((_, i) => i !== idx))}
          />
        ))}
      </div>

      <Button
        onClick={submit}
        disabled={!canSubmit}
        className={`${GRADIENT_BUTTON} w-full`}
      >
        {t("BlindTransfers:reviewBroadcast")}
      </Button>
    </SectionCard>
  );
}

function BlindTransferForm({ t, chain, onSubmit }) {
  const [inputs, setInputs] = useState([newInput()]);
  const [outputs, setOutputs] = useState([newOutput()]);

  const submit = () => {
    const trx = {
      fee: { amount: 0, asset_id: "1.3.0" },
      inputs: inputs.map(serializeInput),
      outputs: outputs.map(serializeOutput),
    };
    onSubmit(trx);
  };

  return (
    <SectionCard
      icon={Shuffle}
      title={t("BlindTransfers:tab.blind_transfer")}
      description={t("BlindTransfers:blindTransferDescription")}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t("BlindTransfers:inputs")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setInputs([...inputs, newInput()])}
            className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addInput")}
          </Button>
        </div>
        {inputs.map((inp, idx) => (
          <InputEditor
            key={idx}
            index={idx}
            t={t}
            chain={chain}
            input={inp}
            removable={inputs.length > 1}
            setInput={(next) =>
              setInputs(inputs.map((x, i) => (i === idx ? next : x)))
            }
            onRemove={() => setInputs(inputs.filter((_, i) => i !== idx))}
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t("BlindTransfers:outputs")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOutputs([...outputs, newOutput()])}
            className="gap-1 h-7 border-[hsl(var(--accent-2)/0.3)] hover:bg-[hsl(var(--accent-2)/0.06)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addOutput")}
          </Button>
        </div>
        {outputs.map((o, idx) => (
          <OutputEditor
            key={idx}
            index={idx}
            t={t}
            chain={chain}
            output={o}
            removable={outputs.length > 1}
            setOutput={(next) =>
              setOutputs(outputs.map((x, i) => (i === idx ? next : x)))
            }
            onRemove={() => setOutputs(outputs.filter((_, i) => i !== idx))}
          />
        ))}
      </div>

      <Button
        onClick={submit}
        disabled={!inputs.length || !outputs.length}
        className={`${GRADIENT_BUTTON} w-full`}
      >
        {t("BlindTransfers:reviewBroadcast")}
      </Button>
    </SectionCard>
  );
}

function FromBlindForm({ t, usr, chain, assets, marketSearch, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [toAccount, setToAccount] = useState(null);
  const [blindingFactor, setBlindingFactor] = useState("");
  const [inputs, setInputs] = useState([newInput()]);
  const [showSearch, setShowSearch] = useState(false);

  const balances = useUserBalances(usr, assets, chain);

  const asset = useMemo(
    () => (assets || []).find((a) => a.symbol === selectedSymbol),
    [assets, selectedSymbol]
  );

  const canSubmit =
    asset && amount && Number(amount) > 0 && toAccount?.id && inputs.length > 0;

  const submit = () => {
    const trx = {
      fee: { amount: 0, asset_id: asset.id },
      amount: {
        amount: blockchainFloat(Number(amount), asset.precision).toFixed(0),
        asset_id: asset.id,
      },
      to: toAccount.id,
      blinding_factor: blindingFactor,
      inputs: inputs.map(serializeInput),
    };
    onSubmit(trx);
  };

  return (
    <SectionCard
      icon={ArrowUpFromLine}
      title={t("BlindTransfers:tab.from_blind")}
      description={t("BlindTransfers:fromBlindDescription")}
    >
      <AmountAssetField
        t={t}
        amount={amount}
        setAmount={setAmount}
        confidentialOnly
        selectedSymbol={selectedSymbol}
        setSelectedSymbol={setSelectedSymbol}
        assets={assets}
        marketSearch={marketSearch}
        balances={balances}
        chain={chain}
      />

      <div className="space-y-1">
        <LabelWithInfo
          label={t("BlindTransfers:toLabel")}
          info={t("BlindTransfers:toInfo")}
        />
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={
              toAccount ? `${toAccount.name} (${toAccount.id})` : ""
            }
            placeholder={t("BlindTransfers:toPlaceholder")}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSearch(true)}
            className="gap-1 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <UserPlus className="h-4 w-4" />
            {t("BlindTransfers:selectAccount")}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <LabelWithInfo
          label={t("BlindTransfers:blindingFactorLabel")}
          info={t("BlindTransfers:blindingFactorInfo")}
        />
        <Input
          className={HEX_MONO}
          value={blindingFactor}
          onChange={(e) => setBlindingFactor(e.target.value)}
          placeholder={t("BlindTransfers:blindingFactorPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t("BlindTransfers:inputs")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setInputs([...inputs, newInput()])}
            className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addInput")}
          </Button>
        </div>
        {inputs.map((inp, idx) => (
          <InputEditor
            key={idx}
            index={idx}
            t={t}
            chain={chain}
            input={inp}
            removable={inputs.length > 1}
            setInput={(next) =>
              setInputs(inputs.map((x, i) => (i === idx ? next : x)))
            }
            onRemove={() => setInputs(inputs.filter((_, i) => i !== idx))}
          />
        ))}
      </div>

      <Button
        onClick={submit}
        disabled={!canSubmit}
        className={`${GRADIENT_BUTTON} w-full`}
      >
        {t("BlindTransfers:reviewBroadcast")}
      </Button>

      {showSearch ? (
        <Dialog open onOpenChange={(open) => !open && setShowSearch(false)}>
          <DialogContent className="sm:max-w-[420px] bg-card">
            <DialogHeader>
              <DialogTitle>{t("BlindTransfers:searchAccountTitle")}</DialogTitle>
              <DialogDescription>
                {t("BlindTransfers:searchAccountDescription")}
              </DialogDescription>
            </DialogHeader>
            <AccountSearch
              chain={chain}
              excludedUsers={[]}
              setChosenAccount={(acct) => {
                if (acct && acct.id) setToAccount(acct);
                setShowSearch(false);
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </SectionCard>
  );
}
