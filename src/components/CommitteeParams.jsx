import React, {
  useState,
  useEffect,
  useMemo,
  useSyncExternalStore,
  memo,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, Layers, FileSignature } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import {
  createObjectStore,
  createEveryObjectStore,
} from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { humanReadableFloat } from "@/lib/common.js";
import { opTypes, operationTypes } from "@/lib/opTypes.js";

// Operation ids the chain emits itself (fill_order, balance settlement
// cancels, FBA payouts, bid executions, HTLC redeemed/refund, expired credit
// deals). They carry no settable fee, so their schedule rows are display-only.
const VIRTUAL_OP_IDS = new Set(
  (operationTypes ?? []).filter((o) => o.virtual).map((o) => o.id)
);

const UINT8_MAX = 255;
const UINT16_MAX = 65535;
const UINT32_MAX = 4294967295;
const GRAPHENE_100_PERCENT = 10000;

// type: uint8 | uint16 | uint32 | int64 | bts | percent | bool
// bts: human BTS <-> blockchain int (precision 5)
// percent: human % <-> uint16 (x100)
const SCALAR_FIELDS = [
  { key: "block_interval", section: "timing", type: "uint8", min: 1, max: 30 },
  { key: "maintenance_interval", section: "timing", type: "uint32", min: 1 },
  { key: "maintenance_skip_slots", section: "timing", type: "uint8" },
  {
    // NOTE: no min — the chain sets no lower bound here (testnet runs 0).
    // Only the lifetime-minus-review trio rule applies (see validation).
    key: "committee_proposal_review_period",
    section: "timing",
    type: "uint32",
  },
  {
    key: "maximum_time_until_expiration",
    section: "timing",
    type: "uint32",
    min: 1,
  },
  { key: "maximum_proposal_lifetime", section: "timing", type: "uint32", min: 1 },
  { key: "maximum_transaction_size", section: "sizes", type: "uint32" },
  { key: "maximum_block_size", section: "sizes", type: "uint32" },
  { key: "maximum_witness_count", section: "witness", type: "uint16" },
  { key: "maximum_committee_count", section: "witness", type: "uint16" },
  {
    key: "maximum_asset_whitelist_authorities",
    section: "witness",
    type: "uint8",
  },
  { key: "maximum_asset_feed_publishers", section: "witness", type: "uint8" },
  { key: "reserve_percent_of_fee", section: "feeSplit", type: "percent" },
  { key: "network_percent_of_fee", section: "feeSplit", type: "percent" },
  {
    key: "lifetime_referrer_percent_of_fee",
    section: "feeSplit",
    type: "percent",
  },
  {
    key: "cashback_vesting_period_seconds",
    section: "cashback",
    type: "uint32",
  },
  { key: "cashback_vesting_threshold", section: "cashback", type: "bts" },
  { key: "witness_pay_per_block", section: "pay", type: "bts" },
  { key: "witness_pay_vesting_seconds", section: "pay", type: "uint32" },
  { key: "worker_budget_per_day", section: "pay", type: "bts" },
  { key: "fee_liquidation_threshold", section: "pay", type: "bts" },
  { key: "maximum_authority_membership", section: "authority", type: "uint16" },
  { key: "max_authority_depth", section: "authority", type: "uint8" },
  { key: "max_predicate_opcode", section: "authority", type: "uint16" },
  { key: "accounts_per_fee_scale", section: "authority", type: "uint16" },
  { key: "account_fee_scale_bitshifts", section: "authority", type: "uint8" },
  { key: "count_non_member_votes", section: "voting", type: "bool" },
  { key: "allow_non_member_whitelists", section: "voting", type: "bool" },
];

const SECTIONS = [
  "timing",
  "sizes",
  "witness",
  "feeSplit",
  "cashback",
  "pay",
  "authority",
  "voting",
  "htlc",
  "customAuth",
  "market",
  "fees",
];

const HTLC_FIELDS = [
  { key: "max_timeout_secs", type: "uint32" },
  { key: "max_preimage_size", type: "uint32" },
];

const CUSTOM_AUTH_FIELDS = [
  { key: "max_custom_authority_lifetime_seconds", type: "uint32" },
  { key: "max_custom_authorities_per_account", type: "uint32" },
  { key: "max_custom_authorities_per_account_op", type: "uint32" },
  { key: "max_custom_authority_restrictions", type: "uint32" },
];

// Protocol defaults used to seed the custom-authority form when the group is
// enabled but absent on chain (core struct initializers). HTLC / market /
// maker groups have no core defaults, so those stay empty-and-required.
const CUSTOM_AUTH_DEFAULTS = {
  max_custom_authority_lifetime_seconds: 2592000,
  max_custom_authorities_per_account: 10,
  max_custom_authorities_per_account_op: 10,
  max_custom_authority_restrictions: 10,
};

const INT_RE = /^\d+$/;
const PERCENT_RE = /^\d+(\.\d{1,2})?$/;

// Fee-schedule field kinds, mirroring bitshares-core fee_params_t structs.
// BTS-kind fields hold core-asset amounts (precision 5); INT-kind fields are
// raw uint32s. A schedule row is editable iff it carries at least one known
// key: empty structs ({}, e.g. virtual ops, balance_claim) and unknown future
// shapes stay read-only and pass through untouched.
const BTS_FEE_KEYS = new Set([
  "fee",
  "basic_fee",
  "premium_fee",
  "membership_annual_fee",
  "membership_lifetime_fee",
  "symbol3",
  "symbol4",
  "long_symbol",
]);
const INT_FEE_KEYS = new Set(["price_per_kbyte", "price_per_output"]);
const KNOWN_FEE_KEYS = [...BTS_FEE_KEYS, ...INT_FEE_KEYS];

function editableFeeKeys(params) {
  if (!params) return [];
  return KNOWN_FEE_KEYS.filter((k) => params[k] !== undefined);
}

// Protocol defaults (chain_parameters.hpp) used when the connected chain's
// 2.0.0 object predates a field entirely (e.g. older testnets). The value is
// prefilled so the user never faces an empty "required" field for something
// the chain never had; keeping it counts as an explicit change (shown in the
// diff as "— → default") since submitting would newly set it on chain.
const PROTOCOL_DEFAULTS = {
  block_interval: 5,
  maintenance_interval: 86400,
  maintenance_skip_slots: 3,
  committee_proposal_review_period: 1209600,
  maximum_time_until_expiration: 86400,
  maximum_proposal_lifetime: 2419200,
  maximum_transaction_size: 2048,
  maximum_block_size: 2000000,
  maximum_witness_count: 1001,
  maximum_committee_count: 1001,
  maximum_asset_whitelist_authorities: 10,
  maximum_asset_feed_publishers: 10,
  reserve_percent_of_fee: 2000,
  network_percent_of_fee: 2000,
  lifetime_referrer_percent_of_fee: 3000,
  cashback_vesting_period_seconds: 31536000,
  cashback_vesting_threshold: 10000000,
  count_non_member_votes: true,
  allow_non_member_whitelists: false,
  witness_pay_per_block: 1000000,
  witness_pay_vesting_seconds: 86400,
  worker_budget_per_day: 50000000000,
  max_predicate_opcode: 1,
  fee_liquidation_threshold: 10000000,
  accounts_per_fee_scale: 1000,
  account_fee_scale_bitshifts: 4,
  max_authority_depth: 2,
};

function parseUint(str, max) {
  if (typeof str !== "string" || !INT_RE.test(str.trim())) return null;
  const v = Number(str.trim());
  if (!Number.isSafeInteger(v) || v < 0 || v > max) return null;
  return v;
}

function parseBTS(str) {
  // Exact decimal parsing (no float round-trip): "1206523.55825" -> 120652355825.
  // Float math (Number(str) * 100000) can land ±1 unit off for large values,
  // producing phantom diffs with identical display strings.
  if (typeof str !== "string") return null;
  const m = /^(\d+)(?:\.(\d{1,5}))?$/.exec(str.trim());
  if (!m) return null;
  const v = Number(m[1]) * 100000 + Number((m[2] || "").padEnd(5, "0"));
  if (!Number.isSafeInteger(v) || v < 0) return null;
  return v;
}

function parsePercent(str, maxUnits = GRAPHENE_100_PERCENT) {
  if (typeof str !== "string" || !PERCENT_RE.test(str.trim())) return null;
  const v = Math.round(Number(str.trim()) * 100);
  if (!Number.isSafeInteger(v) || v < 0 || v > maxUnits) return null;
  return v;
}

function toDisplay(type, chainValue) {
  if (chainValue === null || chainValue === undefined) return "";
  if (type === "bts") return String(humanReadableFloat(chainValue, 5));
  if (type === "percent") return String(chainValue / 100);
  if (type === "bool") return !!chainValue;
  return String(chainValue);
}

function toChain(type, str) {
  if (type === "uint8") return parseUint(str, UINT8_MAX);
  if (type === "uint16") return parseUint(str, UINT16_MAX);
  if (type === "uint32") return parseUint(str, UINT32_MAX);
  if (type === "int64") {
    if (typeof str !== "string" || !INT_RE.test(str.trim())) return null;
    const v = Number(str.trim());
    if (!Number.isSafeInteger(v) || v < 0) return null;
    return v;
  }
  if (type === "bts") return parseBTS(str);
  if (type === "percent") return parsePercent(str);
  return null;
}

function normalizeChainNumber(v) {
  // get_objects returns >32-bit ints as strings ("120652355825"). Normalize
  // to numbers once at ingest so strict comparisons (dirty checks, diffs)
  // don't flag identical values as changed.
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isSafeInteger(n)) return n;
  }
  return v;
}

function normalizeChainParams(params) {
  const out = { ...params };
  SCALAR_FIELDS.forEach((f) => {
    if (f.type === "bool" || params[f.key] === undefined) return;
    out[f.key] = normalizeChainNumber(params[f.key]);
  });
  const ext = params.extensions;
  if (ext && typeof ext === "object" && !Array.isArray(ext)) {
    const e = { ...ext };
    ["updatable_htlc_options", "custom_authority_options"].forEach((k) => {
      if (e[k] && typeof e[k] === "object") {
        const o = { ...e[k] };
        Object.keys(o).forEach((field) => {
          o[field] = normalizeChainNumber(o[field]);
        });
        e[k] = o;
      }
    });
    ["market_fee_network_percent", "maker_fee_discount_percent"].forEach(
      (k) => {
        if (e[k] !== undefined) e[k] = normalizeChainNumber(e[k]);
      }
    );
    out.extensions = e;
  }
  const cf = params.current_fees;
  if (cf && Array.isArray(cf.parameters)) {
    out.current_fees = {
      ...cf,
      scale: cf.scale !== undefined ? normalizeChainNumber(cf.scale) : cf.scale,
      parameters: cf.parameters.map(([opId, feeParams]) => {
        if (!feeParams || typeof feeParams !== "object")
          return [opId, feeParams];
        const np = { ...feeParams };
        Object.keys(np).forEach((k) => {
          np[k] = normalizeChainNumber(np[k]);
        });
        return [opId, np];
      }),
    };
  }
  return out;
}

function buildInitialState(chainParams) {
  const next = {};
  SCALAR_FIELDS.forEach((f) => {
    const original = chainParams[f.key];
    if (f.type === "bool") {
      next[f.key] =
        original === undefined ? !!PROTOCOL_DEFAULTS[f.key] : !!original;
    } else {
      next[f.key] =
        original === undefined
          ? toDisplay(f.type, PROTOCOL_DEFAULTS[f.key])
          : toDisplay(f.type, original);
    }
  });
  const ext = chainParams.extensions ?? {};
  const htlc = ext.updatable_htlc_options ?? null;
  HTLC_FIELDS.forEach((f) => {
    next[`htlc.${f.key}`] = htlc ? String(htlc[f.key] ?? "") : "";
  });
  const ca = ext.custom_authority_options ?? null;
  CUSTOM_AUTH_FIELDS.forEach((f) => {
    next[`customAuth.${f.key}`] = ca ? String(ca[f.key] ?? "") : "";
  });
  next["market.market_fee_network_percent"] =
    ext.market_fee_network_percent !== undefined &&
    ext.market_fee_network_percent !== null
      ? String(ext.market_fee_network_percent / 100)
      : "";
  next["maker_fee_discount_percent"] =
    ext.maker_fee_discount_percent !== undefined &&
    ext.maker_fee_discount_percent !== null
      ? String(ext.maker_fee_discount_percent / 100)
      : "";

  const fees = {};
  // Only rows carrying known fee keys are editable. Empty structs ({},
  // e.g. virtual ops, balance_claim) and unknown future shapes have nothing
  // settable — inventing keys would corrupt the struct, so those rows stay
  // read-only and pass through untouched.
  (chainParams.current_fees?.parameters ?? []).forEach(([opId, params]) => {
    const row = {};
    editableFeeKeys(params).forEach((k) => {
      row[k] = BTS_FEE_KEYS.has(k)
        ? String(humanReadableFloat(params[k], 5))
        : String(params[k]);
    });
    if (Object.keys(row).length) fees[opId] = row;
  });

  return {
    inputs: next,
    feeInputs: fees,
    extEnabled: {
      htlc: !!htlc,
      customAuth: !!ca,
      marketFee:
        ext.market_fee_network_percent !== undefined &&
        ext.market_fee_network_percent !== null,
      makerDiscount:
        ext.maker_fee_discount_percent !== undefined &&
        ext.maker_fee_discount_percent !== null,
    },
  };
}

function SectionCard({ title, children }) {  return (
    <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 pt-0 flex flex-col gap-4">
        {children}
      </CardContent>
    </Card>
  );
}

const ParamField = memo(function ParamField({
  fieldKey,
  label,
  hint,
  value,
  error,
  disabled,
  readOnlyCurrent,
  onChange,
  t,
}) {
  return (
    <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-3 sm:p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {readOnlyCurrent !== null && readOnlyCurrent !== undefined ? (
          <span className="font-mono text-xs tabular-nums text-muted-foreground truncate">
            {t("CommitteeParams:currentValue", {
              defaultValue: "Current",
            })}
            : {readOnlyCurrent}
          </span>
        ) : null}
      </div>
      <Input
        value={value}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="mt-1 !bg-card/40 border-border focus-visible:!ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
      />
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {hint}
        </p>
      ) : null}
      {error && (!Array.isArray(error) || error.length) ? (
        <div className="mt-1 flex flex-col gap-0.5">
          {(Array.isArray(error) ? error : [error]).map((msg, idx) => (
            <p
              key={idx}
              className="text-xs font-medium text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))]"
            >
              ⚠ {msg}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
});

export default function CommitteeParams() {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) return usr.chain;
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const [globalProps, setGlobalProps] = useState(null);
  const [committeeList, setCommitteeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [inputs, setInputs] = useState({});
  const [feeInputs, setFeeInputs] = useState({});
  const [extEnabled, setExtEnabled] = useState({
    htlc: false,
    customAuth: false,
    marketFee: false,
    makerDiscount: false,
  });
  const [initKey, setInitKey] = useState(null);
  const [committeeLoading, setCommitteeLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  // ---- load 2.0.0 (parameters + active committee) ----
  useEffect(() => {
    if (!currentNode || !currentNode.url) return;
    let cancelled = false;
    async function fetching() {
      setLoading(true);
      setLoadError(null);
      try {
        const store = createObjectStore([
          _chain ?? "bitshares",
          JSON.stringify(["2.0.0"]),
          currentNode.url,
        ]);
        store.subscribe(({ data, error, loading: l }) => {
          if (cancelled || l) return;
          setLoading(false);
          if (error || !data || !data[0] || !data[0].parameters) {
            setLoadError("failed");
            return;
          }
          setGlobalProps({
            ...data[0],
            parameters: normalizeChainParams(data[0].parameters),
          });
        });
      } catch (e) {
        console.log(e);
        if (!cancelled) {
          setLoading(false);
          setLoadError("failed");
        }
      }
    }
    fetching();
    return () => {
      cancelled = true;
    };
  }, [_chain, currentNode]);

  // ---- load all committee members 1.5.x ----
  useEffect(() => {
    if (!currentNode || !currentNode.url) {
      setCommitteeLoading(false);
      return;
    }
    let cancelled = false;
    async function fetching() {
      try {
        const store = createEveryObjectStore([
          _chain ?? "bitshares",
          1,
          5,
          0,
          currentNode.url,
        ]);
        store.subscribe(({ data, error, loading: l }) => {
          if (cancelled || l) return;
          if (!error && data) {
            setCommitteeList(data.filter((x) => x && x.id));
          }
          setCommitteeLoading(false);
        });
      } catch (e) {
        console.log(e);
        if (!cancelled) setCommitteeLoading(false);
      }
    }
    fetching();
    return () => {
      cancelled = true;
    };
  }, [_chain, currentNode]);

  const originalParams = useMemo(() => {
    // Prefer an already-staged parameter set: a new proposal built on stale
    // current values would silently clobber pending changes at maintenance.
    if (!globalProps) return null;
    return globalProps.pending_parameters ?? globalProps.parameters ?? null;
  }, [globalProps]);

  const hasPendingParams = useMemo(() => {
    return !!(
      globalProps &&
      globalProps.pending_parameters &&
      globalProps.parameters
    );
  }, [globalProps]);

  const myCommitteeObject = useMemo(() => {
    if (!usr || !usr.id || !committeeList.length) return null;
    return (
      committeeList.find((cm) => cm.committee_member_account === usr.id) ??
      null
    );
  }, [usr, committeeList]);

  const isActiveMember = useMemo(() => {
    if (!myCommitteeObject || !globalProps) return false;
    const active = globalProps.active_committee_members ?? [];
    return active.includes(myCommitteeObject.id);
  }, [myCommitteeObject, globalProps]);

  // ---- initialize working inputs from chain values ----
  // Re-runs whenever fresh parameters arrive, so switching chains or nodes
  // never leaves stale values in the form.
  useEffect(() => {
    if (!originalParams || initKey === originalParams) return;
    const built = buildInitialState(originalParams);
    setInputs(built.inputs);
    setFeeInputs(built.feeInputs);
    setExtEnabled(built.extEnabled);
    setInitKey(originalParams);
  }, [originalParams, initKey, _chain]);

  const resetForm = () => {
    if (!originalParams) return;
    const built = buildInitialState(originalParams);
    setInputs(built.inputs);
    setFeeInputs(built.feeInputs);
    setExtEnabled(built.extEnabled);
  };

  const enableCustomAuth = (v) => {
    setExtEnabled((p) => ({ ...p, customAuth: v }));
    if (v && !(originalParams?.extensions?.custom_authority_options)) {
      setInputs((prev) => {
        const next = { ...prev };
        CUSTOM_AUTH_FIELDS.forEach((f) => {
          if (!next[`customAuth.${f.key}`]) {
            next[`customAuth.${f.key}`] = String(
              CUSTOM_AUTH_DEFAULTS[f.key]
            );
          }
        });
        return next;
      });
    }
  };

  const setInput = (key, value) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const setFeeInput = (opId, field, value) =>
    setFeeInputs((prev) => ({
      ...prev,
      [opId]: { ...prev[opId], [field]: value },
    }));

  // ---- parse + validate ----
  const validation = useMemo(() => {
    if (!originalParams) {
      return {
        parsed: {},
        errors: {},
        feeParsed: {},
        feeErrors: {},
        valid: false,
      };
    }
    const parsed = {};
    const errors = {};
    const err = (key, code, params) => {
      const msg = t(`CommitteeParams:err_${code}`, {
        defaultValue: EN_ERRORS[code],
        ...params,
      });
      if (errors[key]) {
        errors[key].push(msg);
      } else {
        errors[key] = [msg];
      }
    };

    const checkUint = (key, raw, max) => {
      if (typeof raw !== "string" || !INT_RE.test(raw.trim())) {
        err(key, "badInt");
        return undefined;
      }
      const v = Number(raw.trim());
      if (!Number.isSafeInteger(v) || v < 0 || v > max) {
        err(key, "badRange", { max });
        return undefined;
      }
      return v;
    };

    SCALAR_FIELDS.forEach((f) => {
      if (f.type === "bool") {
        parsed[f.key] = !!inputs[f.key];
        return;
      }
      const raw = inputs[f.key] ?? "";
      if (typeof raw !== "string" || !raw.trim().length) {
        err(f.key, "required");
        return;
      }
      let v = null;
      if (f.type === "uint8") v = checkUint(f.key, raw, UINT8_MAX);
      else if (f.type === "uint16") v = checkUint(f.key, raw, UINT16_MAX);
      else if (f.type === "uint32") v = checkUint(f.key, raw, UINT32_MAX);
      else v = toChain(f.type, raw);
      if (v === null || v === undefined) {
        if (f.type === "bts") err(f.key, "badBts");
        else if (f.type === "percent") err(f.key, "badPct");
        else if (f.type !== "uint8" && f.type !== "uint16" && f.type !== "uint32")
          err(f.key, "badInt");
        return;
      }
      if (f.min !== undefined && v < f.min) {
        err(f.key, "badMin", { min: f.min });
        return;
      }
      parsed[f.key] = v;
    });

    // chain rule: percents <= 100%
    ["reserve_percent_of_fee", "network_percent_of_fee", "lifetime_referrer_percent_of_fee"].forEach(
      (k) => {
        if (parsed[k] !== undefined && parsed[k] > GRAPHENE_100_PERCENT) {
          err(k, "badPctMax");
        }
      }
    );

    const block = parsed.block_interval;
    if (
      block !== undefined &&
      (block < 1 || block > 30)
    ) {
      err("block_interval", "badBlockInterval");
    }
    if (parsed.maintenance_interval !== undefined && block !== undefined) {
      if (
        parsed.maintenance_interval <= block ||
        parsed.maintenance_interval % block !== 0
      ) {
        err("maintenance_interval", "crossMaintenance");
        err("block_interval", "crossMaintenance");
      }
    }
    if (
      parsed.maximum_time_until_expiration !== undefined &&
      block !== undefined &&
      parsed.maximum_time_until_expiration <= block
    ) {
      err("maximum_time_until_expiration", "crossExpiration");
      err("block_interval", "crossExpiration");
    }
    if (
      parsed.maximum_proposal_lifetime !== undefined &&
      parsed.committee_proposal_review_period !== undefined &&
      block !== undefined &&
      parsed.maximum_proposal_lifetime -
        parsed.committee_proposal_review_period <=
        block
    ) {
      err("maximum_proposal_lifetime", "crossLifetime");
      err("committee_proposal_review_period", "crossLifetime");
      err("block_interval", "crossLifetime");
    }
    if (
      parsed.maximum_transaction_size !== undefined &&
      parsed.maximum_transaction_size < 1024
    ) {
      err("maximum_transaction_size", "badMin", { min: 1024 });
    }
    if (
      parsed.maximum_block_size !== undefined &&
      parsed.maximum_block_size < 5120
    ) {
      err("maximum_block_size", "badMin", { min: 5120 });
    }
    if (
      parsed.network_percent_of_fee !== undefined &&
      parsed.lifetime_referrer_percent_of_fee !== undefined &&
      parsed.network_percent_of_fee + parsed.lifetime_referrer_percent_of_fee >
        GRAPHENE_100_PERCENT
    ) {
      err("network_percent_of_fee", "crossFeeSplit");
      err("lifetime_referrer_percent_of_fee", "crossFeeSplit");
    }

    // extensions
    const extParsed = {};
    if (extEnabled.htlc) {
      HTLC_FIELDS.forEach((f) => {
        const raw = inputs[`htlc.${f.key}`] ?? "";
        if (typeof raw !== "string" || !raw.trim().length) {
          err(`htlc.${f.key}`, "required");
          return;
        }
        const v = checkUint(`htlc.${f.key}`, raw, UINT32_MAX);
        if (v !== undefined) extParsed[f.key] = v;
      });
    }
    if (extEnabled.customAuth) {
      CUSTOM_AUTH_FIELDS.forEach((f) => {
        const raw = inputs[`customAuth.${f.key}`] ?? "";
        if (typeof raw !== "string" || !raw.trim().length) {
          err(`customAuth.${f.key}`, "required");
          return;
        }
        const v = checkUint(`customAuth.${f.key}`, raw, UINT32_MAX);
        if (v !== undefined) extParsed[f.key] = v;
      });
    }
    if (extEnabled.marketFee) {
      const raw = inputs["market.market_fee_network_percent"] ?? "";
      if (typeof raw !== "string" || !raw.trim().length) {
        err("market.market_fee_network_percent", "required");
      } else if (!PERCENT_RE.test(raw.trim())) {
        err("market.market_fee_network_percent", "badPct");
      } else {
        const v = parsePercent(raw, 3000);
        if (v === null) {
          err("market.market_fee_network_percent", "badMarketMax");
        } else {
          extParsed.market_fee_network_percent = v;
        }
      }
    }
    if (extEnabled.makerDiscount) {
      const raw = inputs["maker_fee_discount_percent"] ?? "";
      if (typeof raw !== "string" || !raw.trim().length) {
        err("maker_fee_discount_percent", "required");
      } else {
        const v = parsePercent(raw);
        if (v === null) {
          err("maker_fee_discount_percent", "badPct");
        } else {
          extParsed.maker_fee_discount_percent = v;
        }
      }
    }

    // fees
    const feeParsed = {};
    const feeErrors = {};
    const feeErr = (opId, field, code, params) => {
      feeErrors[`${opId}:${field}`] = t(`CommitteeParams:err_${code}`, {
        defaultValue: EN_ERRORS[code],
        ...params,
      });
    };
    Object.entries(feeInputs).forEach(([opId, row]) => {
      const parsedRow = {};
      let rowOk = true;
      Object.entries(row).forEach(([field, str]) => {
        const raw = str ?? "";
        if (typeof raw !== "string" || !raw.trim().length) {
          feeErr(opId, field, "required");
          rowOk = false;
          return;
        }
        if (BTS_FEE_KEYS.has(field)) {
          const v = parseBTS(raw);
          if (v === null) {
            feeErr(opId, field, "badBts");
            rowOk = false;
          } else {
            parsedRow[field] = v;
          }
          return;
        }
        if (!INT_RE.test(raw.trim())) {
          feeErr(opId, field, "badInt");
          rowOk = false;
          return;
        }
        const v = Number(raw.trim());
        if (!Number.isSafeInteger(v) || v < 0 || v > UINT32_MAX) {
          feeErr(opId, field, "badRange", { max: UINT32_MAX });
          rowOk = false;
          return;
        }
        parsedRow[field] = v;
      });
      if (rowOk) feeParsed[opId] = parsedRow;
    });

    return {
      parsed,
      errors,
      extParsed,
      feeParsed,
      feeErrors,
      valid:
        Object.keys(errors).length === 0 &&
        Object.keys(feeErrors).length === 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, feeInputs, extEnabled, originalParams, t]);

  // ---- dirty check + diff ----
  const { dirty, diffRows } = useMemo(() => {
    if (!originalParams) return { dirty: false, diffRows: [] };
    const rows = [];
    const push = (label, oldV, newV) => {
      if (oldV !== newV) rows.push({ label, oldV, newV });
    };
    // Baseline for change detection: the chain value when present.
    // Fields absent from the chain object are locked to the protocol default
    // (see renderScalar): they can never be user changes, so they stay out of
    // the diff entirely. The payload still carries the default, since the
    // operation requires a complete struct.
    SCALAR_FIELDS.forEach((f) => {
      if (originalParams[f.key] === undefined) return;
      if (f.type === "bool") {
        const ov = !!originalParams[f.key];
        const nv = !!inputs[f.key];
        if (ov !== nv) {
          rows.push({
            label: t(`CommitteeParams:f_${f.key}`, {
              defaultValue: f.key,
            }),
            oldV: ov
              ? t("CommitteeParams:commonYes", { defaultValue: "Yes" })
              : t("CommitteeParams:commonNo", { defaultValue: "No" }),
            newV: nv
              ? t("CommitteeParams:commonYes", { defaultValue: "Yes" })
              : t("CommitteeParams:commonNo", { defaultValue: "No" }),
          });
        }
        return;
      }
      const nv = validation.parsed[f.key];
      const ov = originalParams[f.key];
      if (nv !== undefined && nv !== ov) {
        push(
          t(`CommitteeParams:f_${f.key}`, { defaultValue: f.key }),
          fmtHuman(f.type, ov),
          fmtHuman(f.type, nv)
        );
      }
    });

    const origExt = originalParams.extensions ?? {};
    const checkExt = (enabled, defLabel, oldObj, newObj, fmt) => {
      const had = !!oldObj;
      if (enabled && !had) {
        rows.push({ label: defLabel, oldV: "—", newV: fmt(newObj) });
      } else if (!enabled && had) {
        rows.push({ label: defLabel, oldV: fmt(oldObj), newV: "—" });
      } else if (enabled && had) {
        const o = JSON.stringify(oldObj);
        const n = JSON.stringify(newObj);
        if (o !== n) rows.push({ label: defLabel, oldV: fmt(oldObj), newV: fmt(newObj) });
      }
    };
    if (extEnabled.htlc || origExt.updatable_htlc_options) {
      const newObj = extEnabled.htlc
        ? {
            max_timeout_secs: validation.extParsed?.max_timeout_secs,
            max_preimage_size: validation.extParsed?.max_preimage_size,
          }
        : null;
      if (
        newObj &&
        (newObj.max_timeout_secs === undefined ||
          newObj.max_preimage_size === undefined)
      ) {
        // invalid, skip diff row (errors block submit anyway)
      } else {
        checkExt(
          extEnabled.htlc,
          t("CommitteeParams:sec_htlc", { defaultValue: "HTLC options" }),
          origExt.updatable_htlc_options ?? null,
          newObj,
          (o) => JSON.stringify(o)
        );
      }
    }
    if (extEnabled.customAuth || origExt.custom_authority_options) {
      const keys = CUSTOM_AUTH_FIELDS.map((f) => f.key);
      const complete = keys.every(
        (k) => validation.extParsed?.[k] !== undefined
      );
      const newObj = extEnabled.customAuth
        ? Object.fromEntries(keys.map((k) => [k, validation.extParsed[k]]))
        : null;
      if (complete || !extEnabled.customAuth) {
        checkExt(
          extEnabled.customAuth,
          t("CommitteeParams:sec_customAuth", {
            defaultValue: "Custom authority options",
          }),
          origExt.custom_authority_options ?? null,
          newObj,
          (o) => JSON.stringify(o)
        );
      }
    }
    ["market_fee_network_percent", "maker_fee_discount_percent"].forEach(
      (k) => {
        const enKey = k === "market_fee_network_percent" ? "marketFee" : "makerDiscount";
        const had = origExt[k] !== undefined && origExt[k] !== null;
        const on = extEnabled[enKey];
        const nv = validation.extParsed?.[k];
        if (on && !had && nv !== undefined) {
          rows.push({
            label: t(`CommitteeParams:f_${k}`, { defaultValue: k }),
            oldV: "—",
            newV: `${nv / 100}%`,
          });
        } else if (!on && had) {
          rows.push({
            label: t(`CommitteeParams:f_${k}`, { defaultValue: k }),
            oldV: `${origExt[k] / 100}%`,
            newV: "—",
          });
        } else if (on && had && nv !== undefined && nv !== origExt[k]) {
          rows.push({
            label: t(`CommitteeParams:f_${k}`, { defaultValue: k }),
            oldV: `${origExt[k] / 100}%`,
            newV: `${nv / 100}%`,
          });
        }
      }
    );

    (originalParams.current_fees?.parameters ?? []).forEach(([opId, p]) => {
      const fp = validation.feeParsed[opId];
      if (!fp || !p) return;
      const name = opTypes[opId] ?? `op ${opId}`;
      Object.entries(fp).forEach(([field, v]) => {
        if (p[field] === undefined || v === p[field]) return;
        const isBts = BTS_FEE_KEYS.has(field);
        rows.push({
          label: `${name} — ${t(`CommitteeParams:ff_${field}`, {
            defaultValue: field,
          })}`,
          oldV: isBts ? `${humanReadableFloat(p[field], 5)} BTS` : `${p[field]}`,
          newV: isBts ? `${humanReadableFloat(v, 5)} BTS` : `${v}`,
        });
      });
    });

    return { dirty: rows.length > 0, diffRows: rows };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation, inputs, extEnabled, originalParams, t]);

  const formValid = validation.valid && dirty && isActiveMember;

  // ---- build new_parameters ----
  const newParameters = useMemo(() => {
    if (!originalParams || !validation.valid) return null;
    const out = {};
    SCALAR_FIELDS.forEach((f) => {
      out[f.key] =
        f.type === "bool" ? !!inputs[f.key] : validation.parsed[f.key];
    });
    const origExt =
      originalParams.extensions &&
      typeof originalParams.extensions === "object" &&
      !Array.isArray(originalParams.extensions)
        ? { ...originalParams.extensions }
        : {};
    const extensions = { ...origExt };
    if (extEnabled.htlc) {
      extensions.updatable_htlc_options = {
        max_timeout_secs: validation.extParsed.max_timeout_secs,
        max_preimage_size: validation.extParsed.max_preimage_size,
      };
    } else {
      delete extensions.updatable_htlc_options;
    }
    if (extEnabled.customAuth) {
      extensions.custom_authority_options = Object.fromEntries(
        CUSTOM_AUTH_FIELDS.map((f) => [f.key, validation.extParsed[f.key]])
      );
    } else {
      delete extensions.custom_authority_options;
    }
    if (extEnabled.marketFee) {
      extensions.market_fee_network_percent =
        validation.extParsed.market_fee_network_percent;
    } else {
      delete extensions.market_fee_network_percent;
    }
    if (extEnabled.makerDiscount) {
      extensions.maker_fee_discount_percent =
        validation.extParsed.maker_fee_discount_percent;
    } else {
      delete extensions.maker_fee_discount_percent;
    }
    out.extensions = extensions;
    out.current_fees = {
      parameters: (originalParams.current_fees?.parameters ?? []).map(
        ([opId, p]) => {
          const fp = validation.feeParsed[opId];
          if (!fp) return [opId, p];
          return [opId, { ...p, ...fp }];
        }
      ),
      scale: originalParams.current_fees?.scale ?? 10000,
    };
    return out;
  }, [originalParams, validation, extEnabled, inputs]);

  const feeEntries = useMemo(() => {
    if (!originalParams) return [];
    return originalParams.current_fees?.parameters ?? [];
  }, [originalParams]);

  const errMsg = (key) => validation.errors[key] ?? null;
  const readOnly = !isActiveMember;
  // Initialized once per fetched parameters object: switching chains, nodes,
  // or receiving refreshed parameters always rebuilds the form, so stale
  // values from another chain can never linger in the inputs.
  // NOTE: must stay below the originalParams declaration (TDZ).
  const initialized = !!originalParams && initKey === originalParams;

  const renderScalar = (f) => {
    const label = t(`CommitteeParams:f_${f.key}`, { defaultValue: f.key });
    const hint = t(`CommitteeParams:h_${f.key}`, {
      defaultValue: "",
    });
    // Fields absent from the chain object are locked to the protocol default:
    // title only (no current-value caption), not editable, never counted as
    // a change. The default still travels in the payload, since the operation
    // requires a complete struct.
    const locked =
      !originalParams || originalParams[f.key] === undefined;
    const currentCaption =
      locked || originalParams[f.key] === undefined
        ? null
        : fmtHuman(f.type, originalParams[f.key]);
    if (f.type === "bool") {
      return (
        <div
          key={f.key}
          className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-3 sm:p-4 flex items-center justify-between gap-3"
        >
          <div>
            <div className="text-sm font-medium">{label}</div>
            {hint ? (
              <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
            ) : null}
          </div>
          <Switch
            checked={!!inputs[f.key]}
            disabled={readOnly || !initialized || locked}
            onCheckedChange={(v) => setInput(f.key, v)}
          />
        </div>
      );
    }
    return (
      <ParamField
        key={f.key}
        fieldKey={f.key}
        label={label}
        hint={hint || undefined}
        value={inputs[f.key] ?? ""}
        error={errMsg(f.key)}
        disabled={readOnly || !initialized || locked}
        readOnlyCurrent={currentCaption}
        onChange={setInput}
        t={t}
      />
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl px-6 py-5 shadow-lg shadow-black/20 ring-1 dark:ring-white/[0.06] ring-border">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <div className="relative flex items-center gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <SlidersHorizontal className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t("CommitteeParams:title", {
                  defaultValue: "Edit global blockchain parameters",
                })}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("CommitteeParams:description", {
                  defaultValue:
                    "Propose new global parameters for the BitShares blockchain. Changes apply at maintenance after committee approval.",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {loading ? (
            <Card className="border-border bg-card/60">
              <CardContent className="p-6 text-center">
                {t("CommitteeParams:loadingParams", {
                  defaultValue: "Loading current parameters...",
                })}
              </CardContent>
            </Card>
          ) : null}

          {loadError || (!loading && !originalParams) ? (
            <Card className="border-border bg-card/60">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {t("CommitteeParams:loadFailed", {
                  defaultValue:
                    "Failed to load current parameters. Check your node connection and retry.",
                })}
              </CardContent>
            </Card>
          ) : null}

          {originalParams && !usr ? (
            <Card className="border-[hsl(var(--accent-warning)/0.4)] bg-card/60">
              <CardContent className="p-4 text-sm">
                {t("CommitteeParams:gateNotLoggedIn", {
                  defaultValue:
                    "You are not logged in, so you are unable to affect these changes. Select an account to continue.",
                })}
              </CardContent>
            </Card>
          ) : null}

          {originalParams && usr && committeeLoading ? (
            <Card className="border-border bg-card/60">
              <CardContent className="p-4 text-sm text-muted-foreground">
                {t("CommitteeParams:gateChecking", {
                  defaultValue:
                    "Checking committee membership...",
                })}
              </CardContent>
            </Card>
          ) : null}

          {originalParams && usr && !committeeLoading && !myCommitteeObject ? (
            <Card className="border-[hsl(var(--accent-warning)/0.4)] bg-card/60">
              <CardContent className="p-4 text-sm">
                {t("CommitteeParams:gateNotMember", {
                  defaultValue:
                    "Your account is not a committee member, so you are unable to affect these changes.",
                })}
              </CardContent>
            </Card>
          ) : null}

          {originalParams && usr && myCommitteeObject && !isActiveMember ? (
            <Card className="border-[hsl(var(--accent-warning)/0.4)] bg-card/60">
              <CardContent className="p-4 text-sm">
                {t("CommitteeParams:gateInactive", {
                  defaultValue:
                    "Your account is not an active committee member, so you are unable to affect these changes.",
                })}
              </CardContent>
            </Card>
          ) : null}

          {originalParams ? (
            <Card className="border-border bg-card/60">
              <CardContent className="p-4 text-sm text-muted-foreground">
                {t("CommitteeParams:pendingNote", {
                  defaultValue:
                    "This operation must travel inside a committee proposal with a sufficient review period, and takes effect at chain maintenance once approved — never immediately.",
                })}
              </CardContent>
            </Card>
          ) : null}

          {originalParams && hasPendingParams ? (
            <Card className="border-[hsl(var(--accent-1)/0.4)] bg-card/60">
              <CardContent className="p-4 text-sm">
                {t("CommitteeParams:pendingExistsNote", {
                  defaultValue:
                    "A staged parameter set from an earlier proposal exists — editing starts from those values so they are not overwritten.",
                })}
              </CardContent>
            </Card>
          ) : null}

          {originalParams
            ? SECTIONS.filter((s) =>
                [
                  "timing",
                  "sizes",
                  "witness",
                  "feeSplit",
                  "cashback",
                  "pay",
                  "authority",
                  "voting",
                ].includes(s)
              ).map((section) => (
                <SectionCard
                  key={section}
                  title={t(`CommitteeParams:sec_${section}`, {
                    defaultValue: section,
                  })}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {SCALAR_FIELDS.filter((f) => f.section === section).map(
                      renderScalar
                    )}
                  </div>
                </SectionCard>
              ))
            : null}

          {originalParams ? (
            <SectionCard
              title={t("CommitteeParams:sec_htlc", {
                defaultValue: "HTLC options",
              })}
            >
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={extEnabled.htlc}
                  disabled={readOnly || !initialized}
                  onCheckedChange={(v) =>
                    setExtEnabled((p) => ({ ...p, htlc: v }))
                  }
                />
                {t("CommitteeParams:enableHtlc", {
                  defaultValue: "Set HTLC options",
                })}
              </label>
              {originalParams?.extensions?.updatable_htlc_options &&
              !extEnabled.htlc ? (
                <p className="text-xs font-medium text-[hsl(var(--accent-warning-fg))]">
                  ⚠{" "}
                  {t("CommitteeParams:extRemoveWarn", {
                    defaultValue:
                      "Disabling removes these options from the chain parameters.",
                  })}
                </p>
              ) : null}
              {extEnabled.htlc ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {HTLC_FIELDS.map((f) => (
                    <ParamField
                      key={`htlc.${f.key}`}
                      fieldKey={`htlc.${f.key}`}
                      label={t(`CommitteeParams:f_htlc_${f.key}`, {
                        defaultValue: f.key,
                      })}
                      hint={t(`CommitteeParams:h_htlc_${f.key}`, {
                        defaultValue: "",
                      })}
                      value={inputs[`htlc.${f.key}`] ?? ""}
                      error={errMsg(`htlc.${f.key}`)}
                      disabled={readOnly || !initialized}
                      readOnlyCurrent={(() => {
                        const o =
                          originalParams.extensions?.updatable_htlc_options;
                        return o ? String(o[f.key] ?? "—") : "—";
                      })()}
                      onChange={setInput}
                      t={t}
                    />
                  ))}
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {originalParams ? (
            <SectionCard
              title={t("CommitteeParams:sec_customAuth", {
                defaultValue: "Custom authority options",
              })}
            >
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={extEnabled.customAuth}
                  disabled={readOnly || !initialized}
                  onCheckedChange={enableCustomAuth}
                />
                {t("CommitteeParams:enableCustomAuth", {
                  defaultValue: "Set custom authority options",
                })}
              </label>
              {originalParams?.extensions?.custom_authority_options &&
              !extEnabled.customAuth ? (
                <p className="text-xs font-medium text-[hsl(var(--accent-warning-fg))]">
                  ⚠{" "}
                  {t("CommitteeParams:extRemoveWarn", {
                    defaultValue:
                      "Disabling removes these options from the chain parameters.",
                  })}
                </p>
              ) : null}
              {extEnabled.customAuth ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CUSTOM_AUTH_FIELDS.map((f) => (
                    <ParamField
                      key={`customAuth.${f.key}`}
                      fieldKey={`customAuth.${f.key}`}
                      label={t(`CommitteeParams:f_cauth_${f.key}`, {
                        defaultValue: f.key,
                      })}
                      hint={t(`CommitteeParams:h_cauth_${f.key}`, {
                        defaultValue: "",
                      })}
                      value={inputs[`customAuth.${f.key}`] ?? ""}
                      error={errMsg(`customAuth.${f.key}`)}
                      disabled={readOnly || !initialized}
                      readOnlyCurrent={(() => {
                        const o =
                          originalParams.extensions?.custom_authority_options;
                        return o ? String(o[f.key] ?? "—") : "—";
                      })()}
                      onChange={setInput}
                      t={t}
                    />
                  ))}
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {originalParams ? (
            <SectionCard
              title={t("CommitteeParams:sec_market", {
                defaultValue: "Market extensions",
              })}
            >
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={extEnabled.marketFee}
                  disabled={readOnly || !initialized}
                  onCheckedChange={(v) =>
                    setExtEnabled((p) => ({ ...p, marketFee: v }))
                  }
                />
                {t("CommitteeParams:enableMarketFee", {
                  defaultValue: "Set market fee network percent (max 30%)",
                })}
              </label>
              {originalParams?.extensions?.market_fee_network_percent !==
                undefined &&
              originalParams?.extensions?.market_fee_network_percent !==
                null &&
              !extEnabled.marketFee ? (
                <p className="text-xs font-medium text-[hsl(var(--accent-warning-fg))]">
                  ⚠{" "}
                  {t("CommitteeParams:extRemoveWarn", {
                    defaultValue:
                      "Disabling removes these options from the chain parameters.",
                  })}
                </p>
              ) : null}
              {extEnabled.marketFee ? (
                <ParamField
                  fieldKey="market.market_fee_network_percent"
                  label={t("CommitteeParams:f_market_fee_network_percent", {
                    defaultValue: "Market fee network percent",
                  })}
                  hint={t("CommitteeParams:h_market_fee_network_percent", {
                    defaultValue: "",
                  })}
                  value={inputs["market.market_fee_network_percent"] ?? ""}
                  error={errMsg("market.market_fee_network_percent")}
                  disabled={readOnly || !initialized}
                  readOnlyCurrent={(() => {
                    const o =
                      originalParams.extensions?.market_fee_network_percent;
                    return o !== undefined && o !== null
                      ? `${o / 100}%`
                      : "—";
                  })()}
                  onChange={setInput}
                  t={t}
                />
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={extEnabled.makerDiscount}
                  disabled={readOnly || !initialized}
                  onCheckedChange={(v) =>
                    setExtEnabled((p) => ({ ...p, makerDiscount: v }))
                  }
                />
                {t("CommitteeParams:enableMakerDiscount", {
                  defaultValue: "Set maker fee discount percent (max 100%)",
                })}
              </label>
              {originalParams?.extensions?.maker_fee_discount_percent !==
                undefined &&
              originalParams?.extensions?.maker_fee_discount_percent !==
                null &&
              !extEnabled.makerDiscount ? (
                <p className="text-xs font-medium text-[hsl(var(--accent-warning-fg))]">
                  ⚠{" "}
                  {t("CommitteeParams:extRemoveWarn", {
                    defaultValue:
                      "Disabling removes these options from the chain parameters.",
                  })}
                </p>
              ) : null}
              {extEnabled.makerDiscount ? (
                <ParamField
                  fieldKey="maker_fee_discount_percent"
                  label={t("CommitteeParams:f_maker_fee_discount_percent", {
                    defaultValue: "Maker fee discount percent",
                  })}
                  hint={t("CommitteeParams:h_maker_fee_discount_percent", {
                    defaultValue: "",
                  })}
                  value={inputs["maker_fee_discount_percent"] ?? ""}
                  error={errMsg("maker_fee_discount_percent")}
                  disabled={readOnly || !initialized}
                  readOnlyCurrent={(() => {
                    const o =
                      originalParams.extensions?.maker_fee_discount_percent;
                    return o !== undefined && o !== null
                      ? `${o / 100}%`
                      : "—";
                  })()}
                  onChange={setInput}
                  t={t}
                />
              ) : null}
            </SectionCard>
          ) : null}

          {originalParams ? (
            <SectionCard
              title={t("CommitteeParams:sec_fees", {
                defaultValue: "Fee schedule",
              })}
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("CommitteeParams:feesDesc", {
                  defaultValue:
                    "Network fee per operation in BTS, plus per-kilobyte surcharge where shown.",
                })}
              </p>
              <div className="max-h-[540px] overflow-auto rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="p-2">
                        {t("CommitteeParams:feeOp", {
                          defaultValue: "Operation",
                        })}
                      </th>
                      <th className="p-2">
                        {t("CommitteeParams:feeFields", {
                          defaultValue: "Fee fields",
                        })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeEntries.map(([opId, params]) => {
                      const fields = editableFeeKeys(params);
                      if (!fields.length) {
                        const isVirtual = VIRTUAL_OP_IDS.has(Number(opId));
                        return (
                          <tr
                            key={opId}
                            className="border-t border-border/40"
                          >
                            <td className="p-2 font-mono text-xs align-top">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{opTypes[opId] ?? `op ${opId}`}</span>
                                {isVirtual ? (
                                  <Badge
                                    variant="secondary"
                                    className="shrink-0"
                                  >
                                    {t("CommitteeParams:feeVirtualBadge", {
                                      defaultValue: "Virtual",
                                    })}
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-2">
                              <span className="font-mono text-[11px] text-muted-foreground break-all">
                                {JSON.stringify(params ?? {})}
                              </span>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {isVirtual
                                  ? t("CommitteeParams:feeVirtualNote", {
                                      defaultValue:
                                        "Virtual operation, emitted by the blockchain itself — there is no fee to set.",
                                    })
                                  : t("CommitteeParams:feeFixed", {
                                      defaultValue:
                                        "Fixed by the protocol — not editable.",
                                    })}
                              </p>
                            </td>
                          </tr>
                        );
                      }
                      return (
                      <tr key={opId} className="border-t border-border/40">
                        <td className="p-2 font-mono text-xs align-top">
                          {opTypes[opId] ?? `op ${opId}`}
                        </td>
                        <td className="p-2">
                          <div className="flex flex-col gap-2">
                            {fields.map((field) => {
                              const errKey = `${opId}:${field}`;
                              const orig = params ? params[field] : undefined;
                              return (
                                <div key={field}>
                                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                                    {t(`CommitteeParams:ff_${field}`, {
                                      defaultValue: field,
                                    })}
                                  </div>
                                  <Input
                                    value={feeInputs[opId]?.[field] ?? ""}
                                    type="text"
                                    inputMode="decimal"
                                    disabled={readOnly || !initialized}
                                    onChange={(e) =>
                                      setFeeInput(opId, field, e.target.value)
                                    }
                                    className={`!bg-card/40 border-border max-w-[140px] ${
                                      validation.feeErrors[errKey]
                                        ? "!border-[hsl(var(--accent-danger)/0.6)]"
                                        : ""
                                    }`}
                                  />
                                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                                    {t("CommitteeParams:currentValue", {
                                      defaultValue: "Current",
                                    })}
                                    :{" "}
                                    {orig !== undefined
                                      ? BTS_FEE_KEYS.has(field)
                                        ? `${humanReadableFloat(orig, 5)} BTS`
                                        : `${orig}`
                                      : "—"}
                                  </p>
                                  {validation.feeErrors[errKey] ? (
                                    <p className="mt-1 text-xs font-medium text-[hsl(var(--accent-danger-fg))]">
                                      ⚠ {validation.feeErrors[errKey]}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : null}

          {originalParams && diffRows.length ? (
            <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-[hsl(var(--accent-1)/0.04)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.15)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <Layers className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                <h3 className="text-sm font-semibold text-foreground">
                  {t("CommitteeParams:diffTitle", {
                    defaultValue: "Proposed changes",
                  })}
                </h3>
              </div>
              <div className="flex flex-col gap-1.5">
                {diffRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border/60 bg-card/40 p-2.5 text-sm"
                  >
                    <div className="font-medium">{row.label}</div>
                    <div className="font-mono text-xs tabular-nums text-muted-foreground">
                      {row.oldV} → {row.newV}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {originalParams && initialized && !dirty ? (
            <p className="text-xs text-muted-foreground">
              {t("CommitteeParams:noChanges", {
                defaultValue: "No changes to propose yet.",
              })}
            </p>
          ) : null}

          {originalParams ? (
            <div>
              {dirty ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="mb-3 w-full"
                >
                  {t("CommitteeParams:resetForm", {
                    defaultValue: "Reset to chain values",
                  })}
                </Button>
              ) : null}
              <button
                type="button"
                disabled={!formValid}
                onClick={() => {
                  setShowDialog(true);
                }}
                className={cn(
                  "w-full h-14 rounded-2xl font-semibold text-[hsl(var(--accent-1-gradFg))] flex items-center justify-center gap-2 text-base transition-all group",
                  formValid
                    ? "bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] shadow-[0_8px_32px_-12px_rgba(6,182,212,0.7)] hover:shadow-[0_12px_40px_-12px_rgba(20,184,166,0.9)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))]"
                    : "bg-card/60 border border-border/40 dark:border-white/5 text-muted-foreground cursor-not-allowed"
                )}
              >
                <FileSignature
                  className="h-4 w-4 group-hover:scale-110 transition-transform"
                  strokeWidth={2.5}
                />
                {t("CommitteeParams:submit", {
                  defaultValue: "Propose parameter changes",
                })}
              </button>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {t("CommitteeParams:proposeInfo", {
                  defaultValue:
                    "This operation can only travel inside a committee proposal. The review period must be at least the current committee review period.",
                })}
              </p>
            </div>
          ) : null}
        </div>
      </div>
      {showDialog && formValid && newParameters ? (
        <DeepLinkDialog
          operationNames={["committee_member_update_global_parameters"]}
          username={usr && usr.username ? usr.username : ""}
          usrChain={usr && usr.chain ? usr.chain : "bitshares"}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key="ProposingGlobalParams"
          headerText={t("CommitteeParams:deeplinkTitle", {
            defaultValue: "Proposing global parameter changes",
          })}
          trxJSON={[{ new_parameters: newParameters }]}
          forcePropose={true}
          initialReviewPeriodSeconds={
            originalParams.committee_proposal_review_period
          }
          minReviewPeriodSeconds={
            originalParams.committee_proposal_review_period
          }
          disableQR={true}
          disableDeeplink={true}
          disableTotp={true}
        />
      ) : null}
    </>
  );
}

function fmtHuman(type, v) {
  if (v === null || v === undefined) return "—";
  if (type === "bts") return `${humanReadableFloat(v, 5)} BTS`;
  if (type === "percent") return `${v / 100}%`;
  if (type === "bool") return v ? "Yes" : "No";
  return String(v);
}

const EN_ERRORS = {
  required: "This field is required.",
  badInt: "Enter a whole non-negative number.",
  badBts: "Enter a BTS amount (up to 5 decimals).",
  badPct: "Enter a percentage between 0 and 100.",
  badPctMax: "Percentage must not exceed 100%.",
  badRange: "Value out of range.",
  badMin: "Value is too small.",
  badBlockInterval: "Block interval must be between 1 and 30 seconds.",
  crossMaintenance:
    "Maintenance interval must exceed the block interval and be a multiple of it.",
  crossExpiration: "Must be greater than the block interval.",
  crossLifetime:
    "Proposal lifetime minus review period must exceed the block interval.",
  crossFeeSplit:
    "Network and referrer shares together must not exceed 100%.",
  badMarketMax: "Must not exceed 30%.",
};
