import React, {
  useState,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { cn } from "@/lib/utils";
import { Repeat, Layers } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { humanReadableFloat } from "@/lib/common.js";

const AUTO_REPAY_OPTIONS = [0, 1, 2];

function autoRepayLabel(t, value) {
  if (value === 0) return t("CreditOffer:cardContent.noAutoRepayment");
  if (value === 1) return t("CreditOffer:cardContent.onlyFullRepayment");
  if (value === 2) return t("CreditOffer:cardContent.allowPartialRepayment");
  return `#${value}`;
}

function autoRepayMessage(t, value) {
  if (value === 0)
    return t("CreditOffer:cardContent.noAutoRepaymentMessage");
  if (value === 1)
    return t("CreditOffer:cardContent.onlyFullRepaymentMessage");
  if (value === 2)
    return t("CreditOffer:cardContent.allowPartialRepaymentMessage");
  return "";
}

export default function EditCreditDeal(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const {
    _assetsBTS,
    _assetsTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const updateFee = useMemo(() => {
    if (globalParams && globalParams.length) {
      const found = globalParams.find((x) => x.id === 76);
      if (found && found.data) {
        return humanReadableFloat(found.data.fee, 5);
      }
    }
    return null;
  }, [globalParams]);

  const [dealId, setDealId] = useState(null);
  const [deal, setDeal] = useState(null);
  const [dealLoading, setDealLoading] = useState(false);
  const [dealError, setDealError] = useState(null);

  const [selectedRepay, setSelectedRepay] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const dealParam = (params.get("deal") || "").trim();
      if (/^1\.22\.\d+$/.test(dealParam)) {
        setDealId(dealParam);
      } else if (params.get("deal")) {
        setDealError("invalid");
      }
    } catch (e) {
      console.log(e);
    }
  }, []);

  useEffect(() => {
    if (!dealId) {
      return;
    }
    if (!currentNode || !currentNode.url) {
      return;
    }
    let cancelled = false;
    async function fetching() {
      setDealLoading(true);
      setDealError(null);
      try {
        const store = createObjectStore([
          _chain ?? "bitshares",
          JSON.stringify([dealId]),
          currentNode.url,
        ]);
        store.subscribe(({ data, error, loading }) => {
          if (cancelled || loading) {
            return;
          }
          setDealLoading(false);
          if (error || !data || !data[0] || data[0].id !== dealId) {
            setDealError("not_found");
            return;
          }
          const fetchedDeal = data[0];
          setDeal(fetchedDeal);
          if (
            fetchedDeal.auto_repay === 0 ||
            fetchedDeal.auto_repay === 1 ||
            fetchedDeal.auto_repay === 2
          ) {
            setSelectedRepay(fetchedDeal.auto_repay);
          }
        });
      } catch (e) {
        console.log(e);
        if (!cancelled) {
          setDealLoading(false);
          setDealError("not_found");
        }
      }
    }
    fetching();
    return () => {
      cancelled = true;
    };
  }, [dealId, _chain, currentNode]);

  const debtAsset = useMemo(() => {
    if (!deal || !assets || !assets.length) return null;
    return assets.find((a) => a.id === deal.debt_asset) ?? null;
  }, [deal, assets]);

  const collateralAsset = useMemo(() => {
    if (!deal || !assets || !assets.length) return null;
    return assets.find((a) => a.id === deal.collateral_asset) ?? null;
  }, [deal, assets]);

  const debtAmount = useMemo(() => {
    if (!deal || !debtAsset) return null;
    return humanReadableFloat(deal.debt_amount, debtAsset.precision);
  }, [deal, debtAsset]);

  const collateralAmount = useMemo(() => {
    if (!deal || !collateralAsset) return null;
    return humanReadableFloat(deal.collateral_amount, collateralAsset.precision);
  }, [deal, collateralAsset]);

  const feeRatePercent = useMemo(() => {
    if (!deal) return null;
    return deal.fee_rate / 10000;
  }, [deal]);

  const isBorrower = useMemo(() => {
    if (!usr || !usr.id || !deal) return false;
    return usr.id === deal.borrower;
  }, [usr, deal]);

  const hasChanges = useMemo(() => {
    if (!deal || selectedRepay === null || selectedRepay === undefined)
      return false;
    return selectedRepay !== deal.auto_repay;
  }, [deal, selectedRepay]);

  const formValid = useMemo(() => {
    return (
      !!deal &&
      isBorrower &&
      hasChanges &&
      AUTO_REPAY_OPTIONS.includes(selectedRepay)
    );
  }, [deal, isBorrower, hasChanges, selectedRepay]);

  const selectTriggerCls =
    "border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus:ring-[hsl(var(--accent-1)/0.4)] focus:border-[hsl(var(--accent-1)/0.5)]";

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
              <Repeat className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t("CreditDealUpdate:title", {
                  defaultValue: "Edit credit deal",
                })}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("CreditDealUpdate:description", {
                  defaultValue:
                    "Update the automatic repayment setting of your credit deal. The borrowed amount, collateral, fee rate and deadline cannot be changed.",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("CreditDealUpdate:dealId", {
                  defaultValue: "Credit deal",
                })}
                : {dealId ?? "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0">
              {dealLoading ? (
                <div className="text-center mt-2">
                  {t("CreditDealUpdate:loadingDeal", {
                    defaultValue: "Loading credit deal...",
                  })}
                </div>
              ) : dealError || !deal ? (
                <p className="text-sm text-muted-foreground">
                  {t("CreditDealUpdate:dealNotFound", {
                    defaultValue:
                      "Credit deal not found. Check the deal ID in the URL.",
                  })}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                        {t("CreditDealUpdate:borrower", {
                          defaultValue: "Borrower",
                        })}
                      </div>
                      <div className="font-mono text-sm tabular-nums text-foreground/85 truncate">
                        {deal.borrower}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                        {t("CreditDealUpdate:lender", {
                          defaultValue: "Lender",
                        })}
                      </div>
                      <div className="font-mono text-sm tabular-nums text-foreground/85 truncate">
                        {deal.offer_owner} ({deal.offer_id})
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                        {t("CreditDealUpdate:debt", {
                          defaultValue: "Debt",
                        })}
                      </div>
                      <div className="font-mono text-sm tabular-nums text-foreground/85">
                        {debtAmount !== null && debtAsset
                          ? `${debtAmount} ${debtAsset.symbol} (${deal.debt_asset})`
                          : `${deal.debt_amount} (${deal.debt_asset})`}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                        {t("CreditDealUpdate:collateral", {
                          defaultValue: "Collateral",
                        })}
                      </div>
                      <div className="font-mono text-sm tabular-nums text-foreground/85">
                        {collateralAmount !== null && collateralAsset
                          ? `${collateralAmount} ${collateralAsset.symbol} (${deal.collateral_asset})`
                          : `${deal.collateral_amount} (${deal.collateral_asset})`}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                        {t("CreditDealUpdate:feeRate", {
                          defaultValue: "Fee rate",
                        })}
                      </div>
                      <div className="font-mono text-sm tabular-nums text-foreground/85">
                        {feeRatePercent}% ({deal.fee_rate})
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                        {t("CreditDealUpdate:deadline", {
                          defaultValue: "Repayment deadline",
                        })}
                      </div>
                      <div className="font-mono text-sm tabular-nums text-foreground/85">
                        {deal.latest_repay_time}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5 sm:col-span-2">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                        {t("CreditDealUpdate:currentAutoRepay", {
                          defaultValue: "Current auto repay setting",
                        })}
                      </div>
                      <div className="font-mono text-sm tabular-nums text-foreground/85">
                        {autoRepayLabel(t, deal.auto_repay)} ({deal.auto_repay})
                      </div>
                    </div>
                  </div>
                  {!isBorrower ? (
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      {t("CreditDealUpdate:mustBeBorrower", {
                        defaultValue: `Only the borrower (${deal.borrower}) can update this credit deal.`,
                        borrower: deal.borrower,
                      })}
                    </p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          {deal && !dealLoading && !dealError && isBorrower ? (
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t("CreditDealUpdate:repayMethod", {
                    defaultValue: "Auto repay setting",
                  })}
                </CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("CreditDealUpdate:repayMethodDesc", {
                    defaultValue:
                      "Choose how this credit deal should be repaid automatically.",
                  })}
                </p>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-2">
                <Select
                  value={
                    selectedRepay === null || selectedRepay === undefined
                      ? undefined
                      : String(selectedRepay)
                  }
                  onValueChange={(value) => setSelectedRepay(parseInt(value, 10))}
                >
                  <SelectTrigger className={cn("mb-1", selectTriggerCls)}>
                    <SelectValue
                      placeholder={t("CreditDealUpdate:selectRepayMethod", {
                        defaultValue: "Select auto repay setting..",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-card/80 backdrop-blur-xl border border-[hsl(var(--accent-1)/0.2)]">
                    <SelectItem value={"0"}>
                      {t("CreditOffer:cardContent.noAutoRepayment")}
                    </SelectItem>
                    <SelectItem value={"1"}>
                      {t("CreditOffer:cardContent.onlyFullRepayment")}
                    </SelectItem>
                    <SelectItem value={"2"}>
                      {t("CreditOffer:cardContent.allowPartialRepayment")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {selectedRepay !== null && selectedRepay !== undefined ? (
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {autoRepayMessage(t, selectedRepay)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {deal && !dealLoading && !dealError && isBorrower ? (
            <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-[hsl(var(--accent-1)/0.04)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.15)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <Layers className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                <h3 className="text-sm font-semibold text-foreground">
                  {t("CreditDealUpdate:summaryTitle", {
                    defaultValue: "Deal update summary",
                  })}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {t("CreditDealUpdate:summaryReady", {
                  defaultValue:
                    "Review the new auto repay setting below before submitting.",
                })}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                    {t("CreditDealUpdate:currentAutoRepay", {
                      defaultValue: "Current auto repay setting",
                    })}
                  </div>
                  <div className="font-mono text-sm tabular-nums text-foreground/85">
                    {autoRepayLabel(t, deal.auto_repay)}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                    {t("CreditDealUpdate:newAutoRepay", {
                      defaultValue: "New auto repay setting",
                    })}
                  </div>
                  <div className="font-mono text-sm tabular-nums text-foreground/85">
                    {selectedRepay !== null && selectedRepay !== undefined
                      ? autoRepayLabel(t, selectedRepay)
                      : "—"}
                  </div>
                </div>
              </div>
              {updateFee !== null ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("CreditDealUpdate:networkFee", {
                    defaultValue: "Network fee",
                  })}
                  : {updateFee}{" "}
                  {_chain === "bitshares" ? "BTS" : "TEST"}
                </p>
              ) : null}
              {!hasChanges ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("CreditDealUpdate:noChanges", {
                    defaultValue: "No changes to submit yet.",
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {deal && !dealLoading && !dealError && isBorrower ? (
            <div>
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
                <Repeat
                  className="h-4 w-4 group-hover:scale-110 transition-transform"
                  strokeWidth={2.5}
                />
                {t("CreditDealUpdate:submit", {
                  defaultValue: "Submit",
                })}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {showDialog && formValid ? (
        <DeepLinkDialog
          operationNames={["credit_deal_update"]}
          username={usr && usr.username ? usr.username : ""}
          usrChain={usr && usr.chain ? usr.chain : "bitshares"}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`UpdatingDeal-${dealId}`}
          headerText={`${t("CreditDealUpdate:deeplinkDialogTitle", {
            defaultValue: "Updating credit deal",
          })}: ${dealId}`}
          trxJSON={[
            {
              account: usr.id,
              deal_id: deal.id,
              auto_repay: selectedRepay,
              extensions: {},
            },
          ]}
        />
      ) : null}
    </>
  );
}
