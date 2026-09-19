import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import { createHTLCStore } from "@/nanoeffects/HTLC.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { humanReadableFloat, blockchainFloat } from "@/lib/common";
import { accountSearch } from "@/nanoeffects/UserSearch.ts";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HtlcCreateDialog from "./HtlcCreateDialog.jsx";

import { Lock, Unlock, Key, Shield, Clock, Hash, Send, CheckCircle2, XCircle, LockKeyhole } from "lucide-react";

const claimPeriods = {
  "1hour": 3600,
  "12hours": 43200,
  "1day": 86400,
  "7days": 604800,
  "30days": 2592000,
};

// Helper function to get the hash algorithm name
const getHashAlgorithmName = (hashType) => {
  switch (hashType) {
    case 2:
      return "sha256";
    case 0:
      return "ripemd160";
    default:
      return null;
  }
};

function calculateHash(algorithm, preimage) {
  try {
    if (algorithm === "sha256") {
      return toHex(sha256(new TextEncoder().encode(preimage)));
    } else if (algorithm === "ripemd160") {
      return toHex(ripemd160(new TextEncoder().encode(preimage)));
    }
    return null;
  } catch (error) {
    console.error("Error calculating hash:", error);
    return null;
  }
}

// Helper function to format expiration date
const formatExpiration = (expiration) => {
  try {
    return new Date(expiration).toLocaleString();
  } catch {
    return "Invalid date";
  }
};


function SenderHtlcRow({ index, style, senderHtlcs, htlcAccounts, assets, t, usr, chain }) {
    const htlc = senderHtlcs[index];
    const {
      id,
      transfer: { to, amount, asset_id },
      conditions: {
        hash_lock: { preimage_hash, preimage_size },
        time_lock: { expiration },
      },
    } = htlc;

    const toAccountName = htlcAccounts[to] || to;
    const asset = assets.find((a) => a.id === asset_id);
    const formattedAmount = asset
      ? humanReadableFloat(amount, asset.precision)
      : amount;
    const hashAlgorithm = getHashAlgorithmName(preimage_hash[0]);
    const hashValue = preimage_hash[1];
    const formattedExpiration = formatExpiration(expiration);

    const [extendDialogOpen, setExtendDialogOpen] = useState(false);
    const [secondsToAdd, setSecondsToAdd] = useState(claimPeriods["1day"]);
    const [showExtendDeeplink, setShowExtendDeeplink] = useState(false);

    return (
      <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }}>
        <div className="mx-2 h-full rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-r from-[hsl(var(--accent-1)/0.04)] to-transparent hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)] transition-all px-4 py-3">
          <div className="grid grid-cols-6 gap-2 items-center text-sm">
            <div className="col-span-1 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-1)/0.15)] border border-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                <Send className="h-2.5 w-2.5" />
              </span>
              <span className="font-mono text-xs font-semibold text-foreground">{id}</span>
            </div>
            <div className="col-span-1">
              <span className="font-mono text-xs text-foreground/85">{toAccountName}</span>
            </div>
            <div className="col-span-1">
              <span className="font-mono text-xs font-semibold text-[hsl(var(--accent-1-fg))]">
                {formattedAmount} {asset?.symbol ?? asset_id}
              </span>
            </div>
            <div className="col-span-1 break-all">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger>
                    <HoverInfo
                      content={hashValue}
                      header={`${hashAlgorithm} - Size: ${preimage_size}`}
                      type={null}
                    />
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="col-span-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground/50" />
              <span className="font-mono text-xs text-foreground/70">{formattedExpiration}</span>
            </div>
            <div className="col-span-1 text-right">
              <Dialog
                open={extendDialogOpen}
                onOpenChange={setExtendDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-all">
                    <Clock className="h-3 w-3 mr-1" />
                    {t("HTLC:extendButton")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] !bg-card border border-border rounded-2xl">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent"
                  />
                  <DialogHeader>
                    <DialogTitle className="text-foreground">
                      {t("HTLC:extendDialogTitle", { id })}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {t("HTLC:extendDialogDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Label htmlFor="secondsToAdd" className="text-foreground">
                      {t("HTLC:secondsToAddLabel")}
                    </Label>
                    <Input
                      id="secondsToAdd"
                      type="number"
                      value={secondsToAdd}
                      min="60"
                      onChange={(e) =>
                        setSecondsToAdd(parseInt(e.target.value, 10))
                      }
                      className="!bg-card/40 border-border text-foreground"
                    />
                  </div>
                  <Button
                    onClick={() => setShowExtendDeeplink(true)}
                    disabled={!secondsToAdd || secondsToAdd < 60}
                    className="w-full h-11 rounded-xl font-semibold transition-all border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.6)] hover:shadow-[0_0_24px_-6px_rgba(244,63,94,0.4)]"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {t("HTLC:extendButton")}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        {showExtendDeeplink && (
          <DeepLinkDialog
            operationNames={["htlc_extend"]}
            username={usr.username}
            usrChain={chain}
            userID={usr.id}
            dismissCallback={() => {
              setShowExtendDeeplink(false);
              setExtendDialogOpen(false);
            }}
            headerText={t("HTLC:extendDeeplinkHeader", {
              id,
              seconds: secondsToAdd,
            })}
            trxJSON={[
              {
                htlc_id: id,
                update_issuer: usr.id,
                seconds_to_add: secondsToAdd,
                extensions: {},
              },
            ]}
          />
        )}
      </div>
    );
}
const MemoSenderHtlcRow = React.memo(SenderHtlcRow);

function ReceiverHtlcRow({ index, style, receiverHtlcs, htlcAccounts, assets, t, usr, chain }) {
    const htlc = receiverHtlcs[index];
    const {
      id,
      transfer: { from, amount, asset_id },
      conditions: {
        hash_lock: { preimage_hash, preimage_size },
        time_lock: { expiration },
      },
    } = htlc;

    const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
    const [preimageInput, setPreimageInput] = useState("");
    const [showRedeemDeeplink, setShowRedeemDeeplink] = useState(false);

    const fromAccountName = htlcAccounts[from] || from;
    const asset = assets.find((a) => a.id === asset_id);
    const formattedAmount = asset
      ? humanReadableFloat(amount, asset.precision)
      : amount;
    const hashAlgorithm = getHashAlgorithmName(preimage_hash[0]);
    const hashValue = preimage_hash[1];
    const formattedExpiration = formatExpiration(expiration);

    const _preimageInput = useMemo(() => {
      if (!preimageInput || !hashAlgorithm) {
        return null;
      }

      let _initialHash;
      try {
        _initialHash = calculateHash(hashAlgorithm, preimageInput);
      } catch (error) {
        console.log({ error });
      }

      let _hexifiedHash;
      try {
        _hexifiedHash = toHex(utf8ToBytes(_initialHash));
      } catch (error) {
        console.log({ error });
      }

      return _hexifiedHash;
    }, [preimageInput, hashAlgorithm]);

    const _calculatedHash = useMemo(() => {
      if (!preimageInput || !hashAlgorithm) {
        return null;
      }

      let _initialHash;
      try {
        _initialHash = calculateHash(hashAlgorithm, preimageInput);
      } catch (error) {
        console.log({ error });
      }

      let _hash;
      try {
        _hash = calculateHash(hashAlgorithm, _initialHash);
      } catch (error) {
        console.log({ error });
      }

      return _hash;
    }, [preimageInput, hashAlgorithm]);

    return (
      <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }}>
        <div className="mx-2 h-full rounded-xl border border-[hsl(var(--accent-2)/0.2)] bg-gradient-to-r from-[hsl(var(--accent-2)/0.04)] to-transparent hover:border-[hsl(var(--accent-2)/0.3)] hover:bg-[hsl(var(--accent-2)/0.06)] transition-all px-4 py-3">
          <div className="grid grid-cols-6 gap-2 items-center text-sm">
            <div className="col-span-1 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-2)/0.15)] border border-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))]">
                <Unlock className="h-2.5 w-2.5" />
              </span>
              <span className="font-mono text-xs font-semibold text-foreground">{id}</span>
            </div>
            <div className="col-span-1">
              <span className="font-mono text-xs text-foreground/85">{fromAccountName}</span>
            </div>
            <div className="col-span-1">
              <span className="font-mono text-xs font-semibold text-[hsl(var(--accent-2-fg))]">
                {formattedAmount} {asset?.symbol ?? asset_id}
              </span>
            </div>
            <div className="col-span-1 break-all">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger>
                    <HoverInfo
                      content={hashValue}
                      header={`${hashAlgorithm} - Size: ${preimage_size}`}
                      type={null}
                    />
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="col-span-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground/50" />
              <span className="font-mono text-xs text-foreground/70">{formattedExpiration}</span>
            </div>
            <div className="col-span-1 text-right">
              <Dialog
                open={redeemDialogOpen}
                onOpenChange={setRedeemDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] hover:border-[hsl(var(--accent-2)/0.5)] transition-all">
                    <Key className="h-3 w-3 mr-1" />
                    {t("HTLC:redeemButton")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] !bg-card border border-border rounded-2xl">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-2)/0.6)] to-transparent"
                  />
                  <DialogHeader>
                    <DialogTitle className="text-foreground">
                      {t("HTLC:redeemDialogTitle", { id })}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {t("HTLC:redeemDialogDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Label htmlFor="preimage" className="text-foreground">
                      {t("HTLC:preimageLabel")}
                    </Label>
                    <Input
                      id="preimage"
                      type="text"
                      placeholder={t("HTLC:preimagePlaceholder")}
                      value={preimageInput}
                      onChange={(e) => setPreimageInput(e.target.value)}
                      className="!bg-card/40 border-border text-foreground"
                    />
                    {preimageInput && preimageInput.length && (
                      <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{t("HTLC:calculatedHash")}</span>
                          <code className="break-all font-mono text-xs text-[hsl(var(--accent-2-fg))]">
                            {_calculatedHash ?? "Calculating..."}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{t("HTLC:referenceHash")}</span>
                          <code className="break-all font-mono text-xs text-foreground/85">{hashValue}</code>
                        </div>
                        <div className="border-t border-border/40 pt-2 flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{t("HTLC:hashMatch")}</span>
                          {_calculatedHash === hashValue ? (
                            <Badge variant="outline" className="border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] dark:text-[hsl(var(--accent-2-fg))] text-[hsl(var(--accent-2-fg))] text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Match
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.1)] dark:text-[hsl(var(--accent-danger-fg))] text-[hsl(var(--accent-danger-fg))] text-[10px]">
                              <XCircle className="h-3 w-3 mr-1" />
                              No Match
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {preimageInput &&
                  preimageInput.length &&
                  _calculatedHash === hashValue ? (
                    <Button
                      onClick={() => setShowRedeemDeeplink(true)}
                      className="w-full h-11 rounded-xl font-semibold transition-all border-[hsl(var(--accent-2)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.1)] to-[hsl(var(--accent-2)/0.1)] dark:text-[hsl(var(--accent-2-gradFg))] text-[hsl(var(--accent-2-gradFg))] hover:bg-[hsl(var(--accent-2)/0.2)] hover:border-[hsl(var(--accent-2)/0.6)] hover:shadow-[0_0_24px_-6px_rgba(16,185,129,0.4)]"
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      {t("HTLC:redeemButton")}
                    </Button>
                  ) : (
                    <Button disabled className="w-full h-11 rounded-xl font-semibold">
                      {t("HTLC:redeemButton")}
                    </Button>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        {showRedeemDeeplink && (
          <DeepLinkDialog
            operationNames={["htlc_redeem"]}
            username={usr.username}
            usrChain={chain}
            userID={usr.id}
            dismissCallback={() => {
              setShowRedeemDeeplink(false);
              setRedeemDialogOpen(false);
            }}
            headerText={t("HTLC:redeemDeeplinkHeader", { id })}
            trxJSON={[
              {
                htlc_id: id,
                redeemer: usr.id,
                preimage: _preimageInput,
                extensions: {},
              },
            ]}
          />
        )}
      </div>
    );
}
const MemoReceiverHtlcRow = React.memo(ReceiverHtlcRow);

export default function Htlc(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNodeUrl = useStore($currentNodeUrl);
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true,
  );

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [prefillTarget, setPrefillTarget] = useState(null);

  // Prefill HTLC recipient from URL query (?to=<name>) and open the create dialog
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!usr || !usr.chain) return;
    const params = new URLSearchParams(window.location.search);
    const toName = params.get("to");
    if (toName && /^[a-zA-Z0-9.-]+$/.test(toName)) {
      accountSearch(usr.chain, toName, currentNodeUrl || null)
        .then((acct) => {
          if (acct && acct.id && acct.name) {
            setPrefillTarget({ id: acct.id, name: acct.name });
            setShowCreateDialog(true);
          }
        })
        .catch(() => {});
    }
  }, [usr, currentNodeUrl]);

  const {
    _marketSearchBTS,
    _marketSearchTEST,
    _assetsBTS,
    _assetsTEST,
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

  // Fetching HTLC data
  const [senderHtlcs, setSenderHtlcs] = useState([]);
  const [receiverHtlcs, setReceiverHtlcs] = useState([]);
  useEffect(() => {
    async function fetchHtlcs() {
      if (!(usr && usr.chain && usr.id && currentNodeUrl)) {
        setSenderHtlcs([]);
        setReceiverHtlcs([]);
        return;
      }

      const htlcStore = createHTLCStore([usr.chain, usr.id, currentNodeUrl]);
      htlcStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setSenderHtlcs(data.sender || []);
          setReceiverHtlcs(data.receiver || []);
        } else if (error) {
          console.error("Error fetching HTLCs:", error);
          setSenderHtlcs([]);
          setReceiverHtlcs([]);
        }
      });
    }

    fetchHtlcs();
  }, [usr, currentNodeUrl]);

  // Fetching account names for HTLC participants
  const [htlcAccounts, setHtlcAccounts] = useState({});
  useEffect(() => {
    async function fetchHtlcAccounts() {
      const allAccountIds = new Set([
        ...senderHtlcs.map((h) => h.transfer.to),
        ...receiverHtlcs.map((h) => h.transfer.from),
      ]);

      const uniqueAccountIds = Array.from(allAccountIds);

      if (
        !(
          usr &&
          usr.chain &&
          uniqueAccountIds.length > 0 &&
          currentNodeUrl &&
          currentNodeUrl
        )
      ) {
        return;
      }

      const neededIds = uniqueAccountIds.filter((id) => !htlcAccounts[id]);
      if (neededIds.length === 0) return;

      const objectStore = createObjectStore([
        usr.chain,
        JSON.stringify(neededIds),
        currentNodeUrl,
      ]);

      objectStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const newAccounts = {};
          data.forEach((acc) => {
            if (acc) {
              newAccounts[acc.id] = acc.name;
            }
          });
          setHtlcAccounts((prev) => ({ ...prev, ...newAccounts }));
        } else if (error) {
          console.error("Error fetching HTLC account names:", error);
        }
      });
    }

    fetchHtlcAccounts();
  }, [usr, senderHtlcs, receiverHtlcs, currentNodeUrl, htlcAccounts]); // Added htlcAccounts dependency

  const senderHtlcRowProps = useMemo(() => ({ senderHtlcs, htlcAccounts, assets, t, usr, chain: _chain }), [senderHtlcs, htlcAccounts, assets, t, usr, _chain]);
  const receiverHtlcRowProps = useMemo(() => ({ receiverHtlcs, htlcAccounts, assets, t, usr, chain: _chain }), [receiverHtlcs, htlcAccounts, assets, t, usr, _chain]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-48 w-48 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-[hsl(var(--accent-danger)/0.1)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <LockKeyhole className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] text-[10px]"
                  >
                    HTLC
                  </Badge>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                    {t("HTLC:title")}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {t("HTLC:description")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <HoverInfo
                  content={t("HTLC:senderDesc")}
                  header={t("HTLC:senderHeader")}
                  type="header"
                />
                <div className="text-right">
                  <Button
                    className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-all"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {t("HTLC:createButton")}
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/30">
                {senderHtlcs && senderHtlcs.length > 0 ? (
                  <>
                    <div className="grid grid-cols-6 gap-1 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border/40">
                      <div>{t("HTLC:idColumn")}</div>
                      <div>{t("HTLC:toColumn")}</div>
                      <div>{t("HTLC:amountColumn")}</div>
                      <div>{t("HTLC:hashColumn")}</div>
                      <div>{t("HTLC:expiresColumn")}</div>
                      <div className="text-right">
                        {t("HTLC:actionsColumn")}
                      </div>
                    </div>
                    <div className="w-full h-[300px]">
                      <List
                        height={300}
                        width="100%"
                        rowHeight={75}
                        rowComponent={MemoSenderHtlcRow}
                        rowCount={senderHtlcs.length}
                        rowProps={senderHtlcRowProps}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground/60">
                    <Lock className="h-4 w-4 mr-2" />
                    {t("HTLC:noSenderHtlc")}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <HoverInfo
                content={t("HTLC:receiverDesc")}
                header={t("HTLC:receiverHeader")}
                type="header"
              />
              <div className="rounded-xl border border-border/40 bg-card/30">
                {receiverHtlcs && receiverHtlcs.length > 0 ? (
                  <>
                    <div className="grid grid-cols-6 gap-1 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border/40">
                      <div>{t("HTLC:idColumn")}</div>
                      <div>{t("HTLC:fromColumn")}</div>
                      <div>{t("HTLC:amountColumn")}</div>
                      <div>{t("HTLC:hashColumn")}</div>
                      <div>{t("HTLC:expiresColumn")}</div>
                      <div className="text-right">
                        {t("HTLC:actionsColumn")}
                      </div>
                    </div>
                    <div className="w-full h-[300px]">
                      <List
                        height={300}
                        width="100%"
                        rowHeight={75}
                        rowComponent={MemoReceiverHtlcRow}
                        rowCount={receiverHtlcs.length}
                        rowProps={receiverHtlcRowProps}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground/60">
                    <Unlock className="h-4 w-4 mr-2" />
                    {t("HTLC:noReceiverHtlc")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showCreateDialog ? (
          <HtlcCreateDialog
            usr={usr}
            assets={assets}
            marketSearch={marketSearch}
            globalParams={globalParams}
            showDialog={showCreateDialog}
            setShowDialog={setShowCreateDialog}
            _targetUser={prefillTarget}
          />
        ) : null}
      </div>
    </>
  );
}
