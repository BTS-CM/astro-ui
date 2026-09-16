import React, { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Avatar as Av,
  AvatarFallback,
} from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

import { $currentNodeUrl } from "@/stores/node.ts";

import {
  humanReadableFloat,
  trimPrice,
  blockchainFloat,
  assetAmountRegex,
} from "@/lib/common";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { accountSearch } from "@/nanoeffects/UserSearch.ts";
import { getObjects } from "@/nanoeffects/src/common";

import { Avatar } from "../Avatar.tsx";
import AssetDropDown from "../Market/AssetDropDownCard.jsx";
import DeepLinkDialog from "./DeepLinkDialog.jsx";

import { ArrowRight, HandCoins } from "lucide-react";

/**
 * Shared tip dialog: transfer page contents minus the memo.
 * Recipient is locked (passed in via props for verification).
 *
 * Props:
 * - open, onOpenChange
 * - recipient: { account: "1.2.x", name/displayAuthor: string }
 * - usr: current user { id, username, chain, referrer }
 * - assets, marketSearch: chain-filtered lists
 * - feeSchedule: chain fee schedule ([{ id, data: { fee, price_per_kbyte } }])
 */
export default function TipDialog(properties) {
  const {
    open,
    onOpenChange,
    recipient,
    usr,
    assets = [],
    marketSearch = [],
    feeSchedule = [],
    globalParams,
  } = properties;

  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      targetAsset: "",
      transferAmount: "",
    },
  });
  const currentNodeUrl = useStore($currentNodeUrl);

  const [selectedAsset, setSelectedAsset] = useState();
  const [transferAmount, setTransferAmount] = useState("");
  const [targetUser, setTargetUser] = useState(null);
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetError, setTargetError] = useState(null);
  const [showDeeplink, setShowDeeplink] = useState(false);

  const _chain = usr && usr.chain ? usr.chain : "bitshares";
  const nodeUrl = currentNodeUrl || null;
  // Trollbox/forum pages name this prop _feeSchedule*, transfer page names
  // it _globalParams* — accept either.
  const feeList = feeSchedule && feeSchedule.length ? feeSchedule : globalParams || [];

  // Default asset per chain
  useEffect(() => {
    if (!selectedAsset && usr && usr.chain) {
      setSelectedAsset(usr.chain === "bitshares" ? "BTS" : "TEST");
    }
  }, [usr, selectedAsset]);

  // Reset per-tip state when dialog closes / recipient changes
  useEffect(() => {
    if (!open) {
      setTransferAmount("");
      form.setValue("transferAmount", "");
      setTargetUser(null);
      setTargetError(null);
      setTargetLoading(false);
      setShowDeeplink(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Resolve + verify the locked recipient (id -> canonical name, or name -> id)
  useEffect(() => {
    if (!open || !recipient) {
      return undefined;
    }
    let cancelled = false;
    const accountId = recipient.account;
    const name = recipient.name || recipient.displayAuthor;

    setTargetUser(null);
    setTargetError(null);

    // Prefer the 1.2.x id when given: fetch canonical name for verification.
    if (accountId && /^1\.2\.\d+$/.test(accountId)) {
      setTargetLoading(true);
      getObjects(_chain, [accountId], nodeUrl)
        .then((objects) => {
          if (cancelled) {
            return;
          }
          const acct = objects && objects[0];
          if (acct && acct.id && acct.name) {
            setTargetUser({ id: acct.id, name: acct.name });
          } else if (name) {
            // Fallback: resolve by name if object lookup came back empty
            return accountSearch(_chain, name, nodeUrl).then(
              (found) => {
                if (!cancelled && found && found.id && found.name) {
                  setTargetUser({ id: found.id, name: found.name });
                }
              },
              () => {
                if (!cancelled) {
                  setTargetError(true);
                }
              }
            );
          } else {
            setTargetError(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTargetError(true);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setTargetLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }

    if (name && /^[a-zA-Z0-9.-]+$/.test(name)) {
      setTargetLoading(true);
      accountSearch(_chain, name, nodeUrl)
        .then((acct) => {
          if (cancelled) {
            return;
          }
          if (acct && acct.id && acct.name) {
            setTargetUser({ id: acct.id, name: acct.name });
          } else {
            setTargetError(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTargetError(true);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setTargetLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }

    setTargetError(true);
    return undefined;
  }, [open, recipient, _chain, nodeUrl]);

  const foundAsset = useMemo(() => {
    if (selectedAsset && assets && assets.length) {
      return assets.find((asset) => asset.symbol === selectedAsset);
    }
    return null;
  }, [selectedAsset, assets]);

  // Sender balances (same source as Transfer.jsx)
  const [balances, setBalances] = useState();
  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id && currentNodeUrl && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          _chain,
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
  }, [usr, assets, currentNodeUrl, _chain]);

  const availableBalance = useMemo(() => {
    if (!foundAsset || !balances) {
      return null;
    }
    const _balance = balances.find((x) => x.asset_id === foundAsset.id);
    return _balance
      ? humanReadableFloat(_balance.amount, foundAsset.precision)
      : "0";
  }, [foundAsset, balances]);

  const setMaxTransferAmount = () => {
    if (availableBalance && parseFloat(availableBalance) > 0 && foundAsset) {
      const formatted = String(parseFloat(availableBalance));
      setTransferAmount(formatted);
      form.setValue("transferAmount", formatted);
    }
  };

  // Fee preview (transfer op id 0, no memo) — mirrors Transfer.jsx
  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (feeList && feeList.length) {
      const foundFee = feeList.find((x) => x.id === 0);
      if (foundFee && foundFee.data) {
        const baseFeeSat = foundFee.data.fee || 0;
        const pricePerKbyte = foundFee.data.price_per_kbyte || 0;
        const dataStr = JSON.stringify({
          from: usr?.id || "",
          to: targetUser?.id || "",
          amount: transferAmount || 0,
          asset_id: foundAsset?.id || "",
          extensions: {},
        });
        const dataSizeKB = new Blob([dataStr]).size / 1024;
        const dataFeeSat =
          pricePerKbyte > 0 ? Math.ceil(dataSizeKB * pricePerKbyte) : 0;
        setFee(humanReadableFloat(baseFeeSat + dataFeeSat, 5));
      }
    }
  }, [feeList, targetUser, transferAmount, foundAsset, usr]);

  const amountNum = parseFloat(transferAmount);
  const hasBalanceRecord =
    foundAsset &&
    balances &&
    balances.map((x) => x.asset_id).includes(foundAsset.id);
  const insufficientFunds =
    foundAsset &&
    availableBalance != null &&
    amountNum > 0 &&
    parseFloat(availableBalance) < amountNum;

  const isFormValid =
    usr &&
    usr.id &&
    targetUser &&
    targetUser.id &&
    foundAsset &&
    amountNum > 0 &&
    !insufficientFunds &&
    hasBalanceRecord &&
    !showDeeplink;

  const operationJSON = useMemo(() => {
    if (!usr || !targetUser || !foundAsset || !(parseFloat(transferAmount) > 0)) {
      return null;
    }
    return [
      {
        fee: {
          amount: 0,
          asset_id: "1.3.0",
        },
        from: usr.id,
        to: targetUser.id,
        amount: {
          amount: blockchainFloat(
            transferAmount,
            foundAsset.precision
          ).toFixed(0),
          asset_id: foundAsset.id,
        },
        extensions: {},
      },
    ];
  }, [usr, targetUser, transferAmount, foundAsset]);

  const feeAssetSymbol = _chain === "bitshares" ? "BTS" : "TEST";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto border border-border bg-card text-foreground backdrop-blur-2xl shadow-xl shadow-black/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)]">
                <HandCoins className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
              </span>
              {t("Trollbox:tipUser", "Tip user")}
            </DialogTitle>
            <DialogDescription>
              {targetUser
                ? t(
                    "Transfer:targetAccountDescriptionWithName",
                    "The user {{name}} will receive your transfer.",
                    { name: targetUser.name }
                  )
                : t(
                    "Transfer:targetAccountDescription",
                    "This is the account which will receive your transfer."
                  )}
            </DialogDescription>
          </DialogHeader>

          {!usr || !usr.id ? (
            <p className="text-sm text-muted-foreground">
              {t("Forum:composerLogin", "Log in to post on-chain replies.")}
            </p>
          ) : (
            <form
              onSubmit={form.handleSubmit(() => {
                if (isFormValid) {
                  setShowDeeplink(true);
                }
              })}
            >
              <FieldGroup>
                {/* From -> To verification row (locked recipient) */}
                <div className="grid grid-cols-1 gap-3">
                  <Card className="bg-card/40 border-border backdrop-blur-xl">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          size={32}
                          name={usr.username || "x"}
                          extra="TipSender"
                          expression={{ eye: "normal", mouth: "open" }}
                          colors={[
                            "#92A1C6",
                            "#146A7C",
                            "#F0AB3D",
                            "#C271B4",
                            "#C20D90",
                          ]}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {t("Transfer:sendingAccount", "Sending account")}
                          </p>
                          <p className="truncate font-mono text-sm">
                            {usr.username} ({usr.id})
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <ArrowRight
                          className="h-5 w-5 rotate-90 text-[hsl(var(--accent-1-fg))]"
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {targetUser ? (
                          <Avatar
                            size={32}
                            name={targetUser.name}
                            extra="TipTarget"
                            expression={{ eye: "normal", mouth: "open" }}
                            colors={[
                              "#92A1C6",
                              "#146A7C",
                              "#F0AB3D",
                              "#C271B4",
                              "#C20D90",
                            ]}
                          />
                        ) : (
                          <Av>
                            <AvatarFallback className="bg-card/80 text-muted-foreground text-xs">
                              ?
                            </AvatarFallback>
                          </Av>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {t("Transfer:targetAccount", "Target account")}
                          </p>
                          {targetLoading ? (
                            <p className="text-sm text-muted-foreground">
                              {t(
                                "Transfer:searchingForAccount",
                                "Searching for an account to transfer assets to."
                              )}
                            </p>
                          ) : targetUser ? (
                            <p className="truncate font-mono text-sm">
                              {targetUser.name} ({targetUser.id})
                            </p>
                          ) : (
                            <p className="text-sm text-destructive">
                              {t(
                                "Transfer:targetAccountDescription",
                                "This is the account which will receive your transfer."
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      {targetError ? (
                        <p className="text-xs text-destructive">
                          {t(
                            "Forum:topicsError",
                            "Couldn't load topics."
                          )}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>

                  {/* Asset picker */}
                  <Controller
                    name="targetAsset"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <div className="flex items-center justify-between gap-2">
                          <FieldLabel className="text-foreground/70 text-xs uppercase tracking-wider">
                            {t(
                              "Transfer:assetToTransfer",
                              "Asset to transfer"
                            )}
                          </FieldLabel>
                          <AssetDropDown
                            assetSymbol={selectedAsset ?? ""}
                            assetData={null}
                            storeCallback={setSelectedAsset}
                            otherAsset={null}
                            marketSearch={marketSearch}
                            type={null}
                            chain={_chain}
                            balances={balances}
                            initialMode="balances"
                            balancesOnly
                            triggerVariant="outline"
                            triggerClassName="w-auto border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.5)]"
                          />
                        </div>
                        <Input
                          {...field}
                          disabled
                          placeholder={
                            foundAsset
                              ? `${foundAsset.symbol} (${foundAsset.id})`
                              : "Bitshares asset (1.3.x)"
                          }
                          className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1 mt-1"
                        />
                        <FieldDescription className="text-muted-foreground text-xs">
                          {t(
                            "Transfer:assetToTransferDescription",
                            "This is the asset which will be transferred to the target account."
                          )}
                        </FieldDescription>
                        <FieldError className="text-[hsl(var(--accent-danger-fg))] text-xs">
                          {foundAsset &&
                          balances &&
                          !balances
                            .map((x) => x.asset_id)
                            .includes(foundAsset.id)
                            ? t("Transfer:noAssetInAccount", {
                                username: usr.username,
                              })
                            : null}
                        </FieldError>
                      </Field>
                    )}
                  />

                  {/* Amount */}
                  {selectedAsset ? (
                    <Controller
                      name="transferAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <div className="flex items-center justify-between gap-2">
                            <FieldLabel className="text-foreground/70 text-xs uppercase tracking-wider">
                              {t("Transfer:amountToTransfer", {
                                asset: selectedAsset ?? "???",
                              })}
                            </FieldLabel>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground">
                                {t("Transfer:balanceHint", {
                                  balance: availableBalance ?? "0",
                                  asset: selectedAsset ?? "???",
                                })}
                              </span>
                              <button
                                type="button"
                                onClick={setMaxTransferAmount}
                                className="inline-flex items-center rounded-md border border-[hsl(var(--accent-1)/0.30)] bg-[hsl(var(--accent-1)/0.10)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.20)] hover:border-[hsl(var(--accent-1)/0.50)] transition-colors"
                              >
                                MAX
                              </button>
                            </div>
                          </div>
                          <Input
                            {...field}
                            value={transferAmount}
                            placeholder={transferAmount}
                            className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1 focus-visible:ring-[hsl(var(--accent-1)/0.5)]"
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = assetAmountRegex(foundAsset);
                              if (regex.test(input)) {
                                setTransferAmount(input);
                                field.onChange(input);
                              }
                            }}
                          />
                          <FieldDescription className="text-muted-foreground text-xs">
                            {t(
                              "Transfer:amountToTransferDescription",
                              "How much you're going to send to the target account."
                            )}
                          </FieldDescription>
                          {insufficientFunds ? (
                            <FieldError className="text-[hsl(var(--accent-danger-fg))] text-xs">
                              {t("Transfer:noAssetInAccount", {
                                username: usr.username,
                              })}
                            </FieldError>
                          ) : null}
                        </Field>
                      )}
                    />
                  ) : null}
                </div>

                <div className="border-t border-border/60 -mt-2 mb-2" />

                {fee ? (
                  <div className="mt-2 flex flex-col gap-1 px-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t("Transfer:networkFee", "Network fee")}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-[hsl(var(--accent-1-fg))] text-sm">
                        <ArrowRight
                          className="h-3.5 w-3.5"
                          strokeWidth={2.5}
                        />
                        {fee.toFixed(5)} {feeAssetSymbol}
                      </span>
                    </div>
                    {usr.id === usr.referrer ? (
                      <span className="text-xs text-[hsl(var(--accent-success-fg))]">
                        {t("Transfer:rebate", {
                          rebate: trimPrice(fee * 0.8, 5),
                        })}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    {t("Trollbox:blockCancel", "Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isFormValid}
                    className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] text-foreground border-0 shadow-lg shadow-[color:hsl(var(--accent-1)/0.3)] disabled:opacity-50"
                  >
                    <HandCoins className="h-4 w-4 mr-1.5" />
                    {t("Trollbox:tipUser", "Tip user")}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {showDeeplink && operationJSON && targetUser && foundAsset ? (
        <DeepLinkDialog
          operationNames={["transfer"]}
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={setShowDeeplink}
          key={`Tipping${transferAmount}${selectedAsset}to${targetUser.name}from${usr.username}`}
          headerText={t("Transfer:sendingHeader", {
            amount: transferAmount,
            symbol: foundAsset.symbol,
            id: foundAsset.id,
            target: targetUser.name,
            user: usr.username,
          })}
          trxJSON={operationJSON}
        />
      ) : null}
    </>
  );
}
