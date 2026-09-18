import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  KeyRound,
  Loader2Icon,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { createUserCustomAuthoritiesStore } from "@/nanoeffects/UserCustomAuthorities.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import AccountSearch from "@/components/AccountSearch.jsx";
import { opTypes } from "@/lib/opTypes.js";
import {
  RestrictionBuilder,
  normalizeRestrictions,
} from "@/components/CustomAuthorityRestrictions.jsx";

// Virtual operations (flagged `// Virtual` in beautify.js) are produced by the
// chain itself and can never be signed/authorized, so a custom authority cannot
// target them. Exclude them from the operation type dropdown.
const VIRTUAL_OP_TYPES = new Set([4, 42, 44, 46, 51, 53, 74]);

const DEFAULT_AUTH = {
  weight_threshold: 1,
  account_auths: [],
  key_auths: [],
  address_auths: [],
};

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function unixToInput(unix) {
  if (!unix && unix !== 0) return "";
  const n = typeof unix === "string" ? Date.parse(unix) / 1000 : Number(unix);
  if (!Number.isFinite(n)) return "";
  const d = new Date(n * 1000);
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function inputToUnix(value) {
  if (!value) return 0;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return 0;
  return Math.floor(ms / 1000);
}

// Chain restrictions already carry { member_index, restriction_type, argument }.
// The builder rows use the same shape for flat comparisons, so we can seed
// directly; nested arguments simply remain visible via the Advanced JSON view.
function normalizeToRows(restrictions) {
  if (!Array.isArray(restrictions)) return [];
  return restrictions.map((r) => ({
    member_index: Number(r.member_index) || 0,
    restriction_type: Number(r.restriction_type) || 0,
    argument: Array.isArray(r.argument) ? r.argument : [7, ""],
    extensions: [],
  }));
}

// account_auths / key_auths on-chain are arrays of [id, weight] tuples.
function toAuthPairs(entries) {
  return (entries || []).map((e) => {
    if (Array.isArray(e)) return e;
    // { "1.2.x": 1 } style
    const [k, v] = Object.entries(e)[0] || ["", 1];
    return [k, Number(v) || 1];
  });
}

const CARD_SHELL =
  "relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]";
const GRADIENT_HAIRLINE =
  "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-2)/0.70)] to-transparent";
const ICON_CHIP =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-2)/0.40)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.30)] to-[hsl(var(--accent-success)/0.30)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-2)/0.4)] flex-shrink-0";
const GRADIENT_BUTTON =
  "gap-2 bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-success))] text-white dark:text-white shadow-[0_8px_30px_-8px_hsl(var(--accent-2)/0.6)] hover:shadow-[0_12px_40px_-8px_hsl(var(--accent-2)/0.9)] active:scale-[0.99] transition-all duration-200 ease-out";

export default function CustomAuthorities() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const _chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );

  useInitCache(_chain ?? "bitshares", []);

  const [authorities, setAuthorities] = useState();
  const [loading, setLoading] = useState(false);
  const [counter, setCounter] = useState(0);

  const [action, setAction] = useState(null);
  const [selected, setSelected] = useState(null);
  const [broadcast, setBroadcast] = useState(null);

  useEffect(() => {
    if (usr && usr.id) {
      const store = createUserCustomAuthoritiesStore([_chain, usr.id]);
      const unsub = store.subscribe(({ data, error, loading: l }) => {
        setLoading(Boolean(l));
        if (data && !error && !l) {
          setAuthorities(data);
        }
        if (!data && !l && error) {
          setAuthorities([]);
        }
      });
      return unsub;
    }
  }, [usr, _chain, counter]);

  const sorted = useMemo(() => {
    if (!authorities || !authorities.length) return authorities;
    return [...authorities].sort((a, b) => {
      const an = Number(String(a.id).split(".")[2] ?? 0);
      const bn = Number(String(b.id).split(".")[2] ?? 0);
      return an - bn;
    });
  }, [authorities]);

  const hasAuthorities = sorted && sorted.length > 0;

  const refresh = () => {
    setAuthorities(undefined);
    setLoading(true);
    if (usr && usr.id) {
      const store = createUserCustomAuthoritiesStore([_chain, usr.id]);
      store.invalidate();
    }
    setCounter((c) => c + 1);
  };

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-5xl text-foreground">
      <div className="grid grid-cols-1 gap-4">
        <div className={CARD_SHELL}>
          <span className={GRADIENT_HAIRLINE} />
          <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-2)/0.15)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-success)/0.10)] blur-3xl" />
          <div className="relative flex items-center justify-between gap-3 p-5 sm:p-6">
            <div className="flex items-center gap-3 min-w-0">
              <span className={ICON_CHIP}>
                <KeyRound className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                  {t("CustomAuthorities:title")}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {t("CustomAuthorities:description")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  setSelected(null);
                  setAction("create");
                }}
                className={GRADIENT_BUTTON}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t("CustomAuthorities:createButton")}
                </span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={refresh}
                disabled={loading}
                aria-busy={loading}
                className="gap-2 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
              >
                {loading ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {t("CustomAuthorities:refreshButton")}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {hasAuthorities ? (
          <div className="grid grid-cols-1 gap-3">
            {sorted.map((authority) => (
              <AuthorityRow
                key={authority.id}
                authority={authority}
                t={t}
                onUpdate={() => {
                  setSelected(authority);
                  setAction("update");
                }}
                onDelete={() => {
                  setSelected(authority);
                  setAction("delete");
                }}
              />
            ))}
          </div>
        ) : loading ? (
          <div className={CARD_SHELL}>
            <span className={GRADIENT_HAIRLINE} />
            <div className="relative p-5 sm:p-6">
              <div className="space-y-2" aria-busy="true" aria-live="polite">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-accent/20"
                  >
                    <Skeleton className="h-9 w-9 rounded-xl bg-accent/50" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40 bg-accent/50" />
                      <Skeleton className="h-3 w-24 bg-accent/50" />
                    </div>
                    <Skeleton className="h-8 w-20 bg-accent/50" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={CARD_SHELL}>
            <span className={GRADIENT_HAIRLINE} />
            <div className="relative p-5 sm:p-6">
              <Empty className="mt-2 border border-border/60 rounded-xl bg-accent/20">
                <EmptyHeader>
                  <EmptyMedia
                    variant="icon"
                    className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]"
                  >
                    <KeyRound className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground/80">
                    {t("CustomAuthorities:noneTitle")}
                  </EmptyTitle>
                  <EmptyDescription className="text-muted-foreground">
                    {t("CustomAuthorities:noneDescription")}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    onClick={() => {
                      setSelected(null);
                      setAction("create");
                    }}
                    className={GRADIENT_BUTTON}
                  >
                    <Plus className="h-4 w-4" />
                    {t("CustomAuthorities:createButton")}
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          </div>
        )}
      </div>

      {action === "create" || action === "update" ? (
        <AuthorityForm
          mode={action}
          authority={selected}
          account={usr?.id}
          chain={_chain}
          usr={usr}
          t={t}
          onClose={() => setAction(null)}
          onSubmit={(trx, opName) => {
            setAction(null);
            setBroadcast({ trx, opName });
          }}
        />
      ) : null}

      {action === "delete" && selected ? (
        <DeleteDialog
          authority={selected}
          account={usr?.id}
          t={t}
          onClose={() => setAction(null)}
          onConfirm={(trx) => {
            setAction(null);
            setBroadcast({ trx, opName: "custom_authority_delete" });
          }}
        />
      ) : null}

      {broadcast ? (
        <DeepLinkDialog
          operationNames={[broadcast.opName]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={(open) => {
            if (!open) {
              setBroadcast(null);
              refresh();
            }
          }}
          key={`ca-${broadcast.opName}-${usr.id}`}
          headerText={t(`CustomAuthorities:${broadcast.opName}Header`)}
          trxJSON={[broadcast.trx]}
        />
      ) : null}
    </div>
  );
}

function AuthorityRow({ authority, t, onUpdate, onDelete }) {
  const restrictionCount = Array.isArray(authority.restrictions)
    ? authority.restrictions.length
    : 0;
  const opLabel =
    opTypes[authority.operation_type] ?? `#${authority.operation_type}`;

  return (
    <div className={`${CARD_SHELL} group transition-all duration-200 ease-out hover:border-[hsl(var(--accent-1)/0.35)]`}>
      <span className={GRADIENT_HAIRLINE} />
      <div className="relative p-4">
        <div className="flex items-center gap-3">
          <span className={ICON_CHIP}>
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground font-mono truncate">
                {authority.id}
              </span>
              <span
                className={
                  authority.enabled
                    ? "inline-flex items-center rounded-md border border-[hsl(var(--accent-success)/0.40)] bg-[hsl(var(--accent-success)/0.15)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--accent-success-fg))]"
                    : "inline-flex items-center rounded-md border border-border bg-accent/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                }
              >
                {authority.enabled
                  ? t("CustomAuthorities:enabled")
                  : t("CustomAuthorities:disabled")}
              </span>
              <span className="inline-flex items-center rounded-md border border-[hsl(var(--accent-1)/0.30)] bg-[hsl(var(--accent-1)/0.12)] px-1.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--accent-1-fg))]">
                {opLabel}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
              {t("CustomAuthorities:restrictionsCount", {
                count: restrictionCount,
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={onUpdate}
              className="gap-1 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {t("CustomAuthorities:updateButton")}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="gap-1 text-[hsl(var(--accent-danger-fg))] border-[hsl(var(--accent-danger)/0.4)] hover:bg-[hsl(var(--accent-danger)/0.1)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {t("CustomAuthorities:deleteButton")}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthorityForm({ mode, authority, account, chain, usr, t, onClose, onSubmit }) {
  const isUpdate = mode === "update";

  const [enabled, setEnabled] = useState(
    isUpdate ? Boolean(authority?.enabled) : false
  );
  const [validFrom, setValidFrom] = useState(
    unixToInput(authority?.valid_from ?? nowUnix())
  );
  const [validTo, setValidTo] = useState(
    unixToInput(authority?.valid_to ?? nowUnix() + 31536000)
  );
  const [operationType, setOperationType] = useState(
    String(authority?.operation_type ?? 0)
  );

  // Structured authority builder
  const initialAuth = authority?.auth ?? DEFAULT_AUTH;
  const [weightThreshold, setWeightThreshold] = useState(
    String(initialAuth.weight_threshold ?? 1)
  );
  const [accountAuths, setAccountAuths] = useState(() =>
    toAuthPairs(initialAuth.account_auths)
  );
  const [keyAuths, setKeyAuths] = useState(() =>
    toAuthPairs(initialAuth.key_auths)
  );

  // Structured restriction rows (see CustomAuthorityRestrictions.jsx).
  // On create, seed from the target authority's restrictions (usually none);
  // on update, restrictions_to_add starts empty.
  const [restrictions, setRestrictions] = useState(() =>
    isUpdate ? [] : normalizeToRows(authority?.restrictions)
  );
  const [restrictionsRemove, setRestrictionsRemove] = useState([]);

  const [showAccountSearch, setShowAccountSearch] = useState(false);
  const [error, setError] = useState("");

  const opTypeEntries = useMemo(
    () =>
      Object.entries(opTypes)
        .filter(([value]) => !VIRTUAL_OP_TYPES.has(Number(value)))
        .map(([value, label]) => ({
          value: String(value),
          label,
        })),
    []
  );

  const buildAuth = () => ({
    weight_threshold: Number(weightThreshold) || 1,
    account_auths: accountAuths.map(([id, w]) => [id, Number(w) || 1]),
    key_auths: keyAuths.map(([k, w]) => [k, Number(w) || 1]),
    address_auths: [],
  });

  const handleSubmit = () => {
    setError("");

    const normalizedRestrictions = normalizeRestrictions(restrictions);
    const auth = buildAuth();

    if (!isUpdate) {
      const trx = {
        account,
        enabled,
        valid_from: inputToUnix(validFrom),
        valid_to: inputToUnix(validTo),
        operation_type: Number(operationType) || 0,
        auth,
        restrictions: normalizedRestrictions,
        extensions: [],
      };
      onSubmit(trx, "custom_authority_create");
      return;
    }

    const trx = {
      account,
      authority_to_update: authority.id,
      new_enabled: enabled,
      new_valid_from: inputToUnix(validFrom),
      new_valid_to: inputToUnix(validTo),
      new_auth: auth,
      restrictions_to_remove: restrictionsRemove
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0),
      restrictions_to_add: normalizedRestrictions,
      extensions: [],
    };
    onSubmit(trx, "custom_authority_update");
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[600px] bg-card max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpdate ? (
              <Pencil className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
            ) : (
              <Plus className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
            )}
            {isUpdate
              ? t("CustomAuthorities:updateTitle")
              : t("CustomAuthorities:createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? t("CustomAuthorities:updateDialogDescription", {
                  id: authority?.id,
                })
              : t("CustomAuthorities:createDialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center justify-between rounded-xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.07)] to-[hsl(var(--accent-1)/0.02)] p-3">
            <div className="min-w-0">
              <Label className="text-sm font-semibold">
                {isUpdate
                  ? t("CustomAuthorities:newEnabledLabel")
                  : t("CustomAuthorities:enabledLabel")}
              </Label>
              <div className="text-[11px] text-muted-foreground">
                {t("CustomAuthorities:enabledHint")}
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {isUpdate
                  ? t("CustomAuthorities:newValidFromLabel")
                  : t("CustomAuthorities:validFromLabel")}
              </Label>
              <Input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {isUpdate
                  ? t("CustomAuthorities:newValidToLabel")
                  : t("CustomAuthorities:validToLabel")}
              </Label>
              <Input
                type="datetime-local"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {t("CustomAuthorities:operationTypeLabel")}
            </Label>
            <Select
              value={operationType}
              onValueChange={setOperationType}
              disabled={isUpdate}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("CustomAuthorities:operationTypePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {opTypeEntries.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    <span className="font-mono text-xs text-muted-foreground mr-2">
                      {op.value}
                    </span>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-muted-foreground">
              {isUpdate
                ? t("CustomAuthorities:operationTypeLockedHint")
                : t("CustomAuthorities:operationTypeHint")}
            </div>
          </div>

          {/* Authority builder */}
          <div className="rounded-xl border border-border bg-accent/20 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
              <Label className="text-sm font-semibold">
                {isUpdate
                  ? t("CustomAuthorities:newAuthLabel")
                  : t("CustomAuthorities:authLabel")}
              </Label>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {t("CustomAuthorities:weightThresholdLabel")}
              </Label>
              <Input
                type="number"
                min="1"
                value={weightThreshold}
                onChange={(e) => setWeightThreshold(e.target.value)}
                className="max-w-[140px]"
              />
            </div>

            {/* account_auths */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {t("CustomAuthorities:accountAuthsLabel")}
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAccountSearch(true)}
                  className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {t("CustomAuthorities:addAccount")}
                </Button>
              </div>
              {accountAuths.length ? (
                <div className="space-y-1.5">
                  {accountAuths.map(([id, weight], idx) => (
                    <div
                      key={`${id}-${idx}`}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2 py-1.5"
                    >
                      <span className="font-mono text-xs text-foreground flex-1 truncate">
                        {id}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {t("CustomAuthorities:weight")}
                        </span>
                        <Input
                          type="number"
                          min="1"
                          value={weight}
                          onChange={(e) => {
                            const next = [...accountAuths];
                            next[idx] = [id, e.target.value];
                            setAccountAuths(next);
                          }}
                          className="h-7 w-16 text-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
                        onClick={() =>
                          setAccountAuths(
                            accountAuths.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground italic">
                  {t("CustomAuthorities:noAccountAuths")}
                </div>
              )}
            </div>

            {/* key_auths */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {t("CustomAuthorities:keyAuthsLabel")}
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setKeyAuths([...keyAuths, ["", 1]])}
                  className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("CustomAuthorities:addKey")}
                </Button>
              </div>
              {keyAuths.length ? (
                <div className="space-y-1.5">
                  {keyAuths.map(([k, weight], idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2 py-1.5"
                    >
                      <Input
                        value={k}
                        placeholder={t("CustomAuthorities:publicKeyPlaceholder")}
                        onChange={(e) => {
                          const next = [...keyAuths];
                          next[idx] = [e.target.value, weight];
                          setKeyAuths(next);
                        }}
                        className="h-7 text-xs font-mono flex-1"
                      />
                      <Input
                        type="number"
                        min="1"
                        value={weight}
                        onChange={(e) => {
                          const next = [...keyAuths];
                          next[idx] = [k, e.target.value];
                          setKeyAuths(next);
                        }}
                        className="h-7 w-16 text-xs"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
                        onClick={() =>
                          setKeyAuths(keyAuths.filter((_, i) => i !== idx))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <RestrictionBuilder
            restrictions={restrictions}
            opType={operationType}
            t={t}
            onChange={setRestrictions}
            label={
              isUpdate
                ? t("CustomAuthorities:restrictionsToAddLabel")
                : t("CustomAuthorities:restrictionsLabel")
            }
            hint={t("CustomAuthorities:restrictionsHint")}
          />

          {isUpdate ? (
            <RemoveRestrictions
              authority={authority}
              selected={restrictionsRemove}
              onChange={setRestrictionsRemove}
              t={t}
            />
          ) : null}

          {error ? (
            <div className="rounded-lg border border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.1)] px-3 py-2 text-xs text-[hsl(var(--accent-danger-fg))]">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("CustomAuthorities:cancel")}
          </Button>
          <Button onClick={handleSubmit} className={GRADIENT_BUTTON}>
            {isUpdate
              ? t("CustomAuthorities:submitUpdate")
              : t("CustomAuthorities:submitCreate")}
          </Button>
        </DialogFooter>
      </DialogContent>

      {showAccountSearch ? (
        <Dialog open onOpenChange={(open) => !open && setShowAccountSearch(false)}>
          <DialogContent className="sm:max-w-[420px] bg-card">
            <DialogHeader>
              <DialogTitle>{t("CustomAuthorities:searchAccountTitle")}</DialogTitle>
              <DialogDescription>
                {t("CustomAuthorities:searchAccountDescription")}
              </DialogDescription>
            </DialogHeader>
            <AccountSearch
              chain={chain}
              excludedUsers={[]}
              setChosenAccount={(acct) => {
                if (acct && acct.id) {
                  setAccountAuths((prev) =>
                    prev.some(([id]) => id === acct.id)
                      ? prev
                      : [...prev, [acct.id, 1]]
                  );
                }
                setShowAccountSearch(false);
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </Dialog>
  );
}

function RemoveRestrictions({ authority, selected, onChange, t }) {
  const existing = Array.isArray(authority?.restrictions)
    ? authority.restrictions
    : [];

  const toggle = (idx) => {
    if (selected.includes(idx)) {
      onChange(selected.filter((i) => i !== idx));
    } else {
      onChange([...selected, idx]);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-accent/20 p-3 space-y-2">
      <Label className="text-sm font-semibold">
        {t("CustomAuthorities:restrictionsToRemoveLabel")}
      </Label>
      <div className="text-[11px] text-muted-foreground">
        {t("CustomAuthorities:restrictionsToRemoveHint")}
      </div>
      {existing.length ? (
        <div className="space-y-1.5">
          {existing.map((r, idx) => {
            const isSel = selected.includes(idx);
            return (
              <button
                type="button"
                key={idx}
                onClick={() => toggle(idx)}
                className={
                  isSel
                    ? "flex w-full items-center gap-2 rounded-lg border border-[hsl(var(--accent-danger)/0.5)] bg-[hsl(var(--accent-danger)/0.1)] px-2.5 py-1.5 text-left"
                    : "flex w-full items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-left hover:border-[hsl(var(--accent-1)/0.35)]"
                }
              >
                <span className="font-mono text-[10px] text-muted-foreground w-6">
                  #{idx}
                </span>
                <span className="font-mono text-[11px] text-foreground/80 flex-1 truncate">
                  {t("CustomAuthorities:func." +
                    (RESTRICTION_FUNC_KEYS[Number(r.restriction_type)] ??
                      r.restriction_type))}
                  {" · "}
                  {t("CustomAuthorities:memberIndexShort", {
                    index: r.member_index,
                  })}
                </span>
                {isSel ? (
                  <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--accent-danger-fg))]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground italic">
          {t("CustomAuthorities:noExistingRestrictions")}
        </div>
      )}
    </div>
  );
}

const RESTRICTION_FUNC_KEYS = {
  0: "eq",
  1: "ne",
  2: "lt",
  3: "le",
  4: "gt",
  5: "ge",
  6: "in",
  7: "not_in",
  8: "has_all",
  9: "has_none",
  10: "attr",
  11: "logical_or",
  12: "variant_assert",
};

function DeleteDialog({ authority, account, t, onClose, onConfirm }) {
  const opLabel =
    opTypes[authority.operation_type] ?? `#${authority.operation_type}`;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[440px] bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-[hsl(var(--accent-danger-fg))]" />
            {t("CustomAuthorities:deleteTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("CustomAuthorities:deleteDialogDescription", {
              id: authority.id,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.08)] p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {t("CustomAuthorities:authorityId")}
            </span>
            <span className="font-mono">{authority.id}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {t("CustomAuthorities:opTypeLabel")}
            </span>
            <span>{opLabel}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("CustomAuthorities:cancel")}
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                account,
                authority_to_delete: authority.id,
                extensions: [],
              })
            }
            className="bg-[hsl(var(--accent-danger))] hover:bg-[hsl(var(--accent-danger))] text-[hsl(var(--accent-danger-fg))]"
          >
            {t("CustomAuthorities:submitDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
