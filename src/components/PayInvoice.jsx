import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import {
  FileSearch,
  FileCheck,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  CreditCard,
  ShoppingCart,
} from "lucide-react";

import pkg from "bs58";
const { decode } = pkg;

import HoverInfo from "@/components/common/HoverInfo.tsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  getTimeSince,
  humanReadableFloat,
  blockchainFloat,
} from "@/lib/common";
import {
  $receivedInvoiceStorage,
  hasReceivedInvoice,
  saveReceivedInvoice,
} from "@/stores/invoices";

/**
 * Decompresses the data and decodes it back into the original JSON object.
 */
async function decompressAndGetJson(invoiceData) {
  const compressedBytes = decode(invoiceData);

  const decompressedStream = new Blob([compressedBytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));

  const decompressedText = await new Response(decompressedStream).text();

  let parsedJSON;
  try {
    parsedJSON = JSON.parse(decompressedText);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return;
  }

  return parsedJSON;
}


function PayChosenRow({ index, style, selectedItems, t, itemPaymentMethods, onSelectPayment }) {
    const it = selectedItems[index];
    if (!it) return null;

    let _name = it.name || "";
    if (_name.length > 15) {
      _name = _name.slice(0, 15) + "...";
    }

    let _description = it.description || "";
    if (_description.length > 15) {
      _description = _description.slice(0, 15) + "...";
    }

    const chosenEntry = itemPaymentMethods.find((p) => p.itemId === it.id);
    const chosenValue = chosenEntry
      ? `${chosenEntry.price} ${chosenEntry.asset}`
      : "";

    return (
      <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} className="px-2">
        <Card className="py-0 gap-0 h-full overflow-hidden justify-center">
          <CardContent className="pt-1 pb-1">
            <div className="grid grid-cols-4 items-center gap-2 text-sm">
              <div
                className="text-left mt-1"
                title={t("PayInvoice:invoiceItems.tooltips.quantity", {
                  name: it.name,
                  quantity: it.quantity,
                })}
              >
                <Badge variant="outline">{it.quantity}</Badge> "{_name}"
              </div>
              <div
                className="hidden md:block text-left mt-1"
                title={t("PayInvoice:invoiceItems.tooltips.descriptionOf", {
                  name: it.name,
                })}
              >
                "{_description}"
              </div>
              <div
                className="col-span-3 md:col-span-2 pr-2 mt-1"
                title={t("PayInvoice:invoiceItems.tooltips.selectPayment")}
              >
                <Select
                  onValueChange={(value) => onSelectPayment(value, it)}
                >
                  <SelectTrigger className="w-full focus:ring-[hsl(var(--accent-1)/0.4)] focus:border-[hsl(var(--accent-1)/0.5)]">
                    <SelectValue
                      placeholder={
                        chosenValue ||
                        t(
                          "PayInvoice:invoiceItems.selectPaymentMethodPlaceholder"
                        )
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>
                        {t("PayInvoice:invoiceItems.paymentMethodsLabel")}
                      </SelectLabel>
                      {it.prices.map((p, idx) => {
                        const q = Number(it.quantity) || 1;
                        const total = Number(p.price) * q;
                        const totalStr = Number.isFinite(total)
                          ? total.toString()
                          : "";
                        const val = `${p.asset.replace(".", "_")}_${idx}`;
                        return (
                          <SelectItem
                            className="hover:shadow-inner"
                            value={val}
                            key={val}
                          >
                            {totalStr} {p.asset}
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
}
const MemoPayChosenRow = React.memo(PayChosenRow);

function PayFinalRow({ index, style, totalAssetAmounts, assets, balances, t }) {
    const assetSymbols = Object.keys(totalAssetAmounts);
    const assetSymbol = assetSymbols[index];
    const totalAmount = totalAssetAmounts[assetSymbol];
    const foundAsset = assets.find((a) => a.symbol === assetSymbol);

    const balanceEntry = balances
      ? balances.find((b) => {
          return foundAsset && foundAsset.symbol === assetSymbol;
        })
      : null;

    const balanceAmount = balanceEntry
      ? humanReadableFloat(balanceEntry.amount, foundAsset.precision)
      : 0;

    const sufficientBalance = balanceAmount >= totalAmount;

    const requiredBalance = sufficientBalance ? 0 : totalAmount - balanceAmount;

    return (
      <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} className="px-2">
        <Card className="rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 hover:border-[hsl(var(--accent-1)/0.3)] transition-all py-0 gap-0 h-full overflow-hidden justify-center">
          <CardContent className="pt-1 pb-1">
            <div className="grid grid-cols-3 text-sm items-center">
              <div
                className="font-mono tabular-nums"
                title={t("PayInvoice:totals.tooltips.amountRequested", {
                  asset: assetSymbol,
                })}
              >
                {totalAmount} {assetSymbol}
              </div>
              <div
                className="font-mono tabular-nums text-muted-foreground"
                title={t("PayInvoice:totals.tooltips.currentBalance", {
                  asset: assetSymbol,
                })}
              >
                {balanceAmount} {assetSymbol}
              </div>
              <div
                className="flex items-center gap-1.5"
                title={
                  !sufficientBalance
                    ? t("PayInvoice:totals.tooltips.needMore", {
                        required: requiredBalance,
                        asset: assetSymbol,
                      })
                    : ""
                }
              >
                {sufficientBalance ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[hsl(var(--accent-1))] dark:bg-[hsl(var(--accent-1)/0.2)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--accent-1-gradFg))] dark:text-[hsl(var(--accent-1-gradFg))]">
                    <CheckCircle2 className="h-3 w-3" />
                    OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[hsl(var(--accent-danger))] dark:bg-[hsl(var(--accent-danger)/0.2)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--accent-danger-gradFg))] dark:text-[hsl(var(--accent-danger-gradFg))]">
                    <XCircle className="h-3 w-3" />
                    {requiredBalance.toFixed(2)} short
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
}
const MemoPayFinalRow = React.memo(PayFinalRow);

export default function PayInvoice(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNodeUrl = useStore($currentNodeUrl);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const { _assetsBTS, _assetsTEST } = properties;

  const assets = useMemo(() => {
    if (_chain) {
      return _chain === "bitshares" ? _assetsBTS || [] : _assetsTEST || [];
    }
    return [];
  }, [_chain, _assetsBTS, _assetsTEST]);

  const [balances, setBalances] = useState();
  useEffect(() => {
    async function fetchBalances() {
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

    fetchBalances();
  }, [usr, assets, currentNodeUrl]);

  // subscribe to received invoice store so the save button reflects state
  useStore($receivedInvoiceStorage);

  const [invoiceCode, setInvoiceCode] = useState("");
  const [processedInvoiceCode, setProcessedInvoiceCode] = useState(null);

  const processInvoiceCode = useCallback(async () => {
    let processedCode;

    if (!invoiceCode || invoiceCode.length === 0) {
      setProcessedInvoiceCode(null);
      return;
    }

    try {
      processedCode = await decompressAndGetJson(invoiceCode);
    } catch (error) {
      console.error("Error processing invoice code:", error);
    }

    setProcessedInvoiceCode(processedCode ?? true);
  }, [invoiceCode]);

  // Allow passing encoded invoice via prop `id` or URL query param `?id=...`
  const urlProvidedCode = useMemo(() => {
    try {
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        const q = sp.get("id");
        return q ? String(q) : "";
      }
    } catch (e) {
      if (import.meta.env?.DEV) console.debug("Failed to parse invoice id param", e);
    }
    return "";
  }, []);

  useEffect(() => {
    // If URL or prop provides an encoded invoice, auto-fill and process
    if (urlProvidedCode && urlProvidedCode.length && !invoiceCode) {
      setInvoiceCode(urlProvidedCode);
      (async () => {
        try {
          const processed = await decompressAndGetJson(urlProvidedCode);
          setProcessedInvoiceCode(processed ?? true);
        } catch (e) {
          console.error("Error processing urlProvidedCode:", e);
        }
      })();
    }
  }, [urlProvidedCode, invoiceCode]);

  const [identifier, setIdentifier] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [note, setNote] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (processedInvoiceCode) {
      setRecipientId(
        processedInvoiceCode.recipientId ? processedInvoiceCode.recipientId : ""
      );
      setRecipientName(
        processedInvoiceCode.recipientName
          ? processedInvoiceCode.recipientName
          : ""
      );
      setIdentifier(
        processedInvoiceCode.identifier ? processedInvoiceCode.identifier : ""
      );
      setNote(processedInvoiceCode.note ? processedInvoiceCode.note : "");
      setTimestamp(
        processedInvoiceCode.timestamp ? processedInvoiceCode.timestamp : ""
      );
      setSelectedItems(
        processedInvoiceCode.items ? processedInvoiceCode.items : []
      );
    } else {
      console.log("Resetting invoice details");
      setRecipientId("");
      setRecipientName("");
      setIdentifier("");
      setNote("");
      setTimestamp("");
      setSelectedItems([]);
    }
  }, [processedInvoiceCode]);

  const [bothUsers, setBothUsers] = useState(false); // 0: self, 1: invoice creator
  useEffect(() => {
    if (usr && usr.chain && currentNodeUrl && recipientId) {
      const userStore = createObjectStore([
        usr.chain,
        JSON.stringify([usr.id, recipientId]),
        currentNodeUrl || null,
      ]);
      userStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBothUsers(data);
        }
      });
    }
  }, [usr, currentNodeUrl, recipientId]);

  const isValid = useMemo(() => {
    if (
      processedInvoiceCode &&
      recipientId &&
      recipientName &&
      selectedItems &&
      selectedItems.length
    ) {
      return true;
    }
    return false;
  }, [processedInvoiceCode, recipientId, recipientName, selectedItems]);

  const [itemPaymentMethods, setItemPaymentMethods] = useState([]);

  const [showInvoicePaymentDialog, setShowInvoicePaymentDialog] =
    useState(false);

  const totalAssetAmounts = useMemo(() => {
    const totals = {};
    itemPaymentMethods.forEach((ipm) => {
      if (!totals[ipm.asset]) {
        totals[ipm.asset] = Number(ipm.price);
      } else {
        totals[ipm.asset] += Number(ipm.price);
      }
    });
    return totals;
  }, [itemPaymentMethods]);

  const transactionJSON = useMemo(() => {
    if (!isValid) return [];
    // For each payment method (different asset) we will create a transfer operation.
    // So if there's 4 items being bought, but only 1 asset being used to pay with, we'll do only 1 transfer.
    // But if there's 4 items and 4 different assets, that'll require 4 transfer operations in the operation JSON array.
    return Object.keys(totalAssetAmounts).map((assetSymbol) => {
      const totalAmount = totalAssetAmounts[assetSymbol];
      const foundAsset = assets.find((a) => a.symbol === assetSymbol);
      return {
        fee: {
          amount: 0,
          asset_id: "1.3.0",
        },
        from: usr.id,
        to: recipientId,
        amount: {
          amount: blockchainFloat(totalAmount, foundAsset.precision).toFixed(0),
          asset_id: foundAsset.id,
        },
        memo: {
          // clear-text until processed by beeteos!
          from: bothUsers[0].options.memo_key, // self (invoice payer)
          to: bothUsers[1].options.memo_key, // invoice creator
          nonce: String(Date.now()),
          message: identifier,
        },
        extensions: {},
      };
    });
  }, [
    bothUsers,
    isValid,
    totalAssetAmounts,
    assets,
    usr,
    recipientId,
    identifier,
  ]);

  const handleSelectPayment = useCallback((value, it) => {
    let parts = value.split("_");
    let index = parts.at(-1);
    let chosenPrice = it.prices[Number(index)];

    setItemPaymentMethods((prev) => {
      const idx = prev.findIndex((p) => p.itemId === it.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...chosenPrice, itemId: it.id };
        return updated;
      }
      return [...prev, { ...chosenPrice, itemId: it.id }];
    });
  }, []);
  const chosenRowProps = useMemo(() => ({ selectedItems, t, itemPaymentMethods, onSelectPayment: handleSelectPayment }), [selectedItems, t, itemPaymentMethods, handleSelectPayment]);
  const finalRowProps = useMemo(() => ({ totalAssetAmounts, assets, balances, t }), [totalAssetAmounts, assets, balances, t]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full">
        <div className="grid grid-cols-1 gap-3">
          {processedInvoiceCode ? (
            <>
              {isValid ? (
                <>
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
                      className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
                    />
                    <div className="relative p-5 sm:p-6">
                      <CardHeader className="p-0 mb-5">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] flex-shrink-0 shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                            <CreditCard className="h-4.5 w-4.5" strokeWidth={2.25} />
                          </span>
                          <div>
                            <CardTitle className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                              {t("PayInvoice:title")}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground/70 mt-0.5">
                              {t("PayInvoice:description")}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                      <div className="grid grid-cols-1 gap-2">
                          <div className="grid grid-cols-2 gap-3">
                          <div>
                            <HoverInfo
                              content={t("PayInvoice:recipientAccount.info")}
                              header={t("PayInvoice:recipientAccount.header")}
                              type="header"
                            />
                            <Input
                              value={t("PayInvoice:format.recipientField", {
                                name: bothUsers ? bothUsers[1].name : "",
                                id: recipientId,
                              })}
                              readOnly
                              className="mt-2 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                            />
                          </div>
                          <div>
                            <HoverInfo
                              content={t("PayInvoice:recipientName.info")}
                              header={t("PayInvoice:recipientName.header")}
                              type="header"
                            />
                            <Input
                              value={recipientName}
                              readOnly
                              className="mt-2 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <HoverInfo
                                content={t("PayInvoice:identifier.info")}
                                header={t("PayInvoice:identifier.header")}
                                type="header"
                              />
                              <Input
                                value={identifier}
                                readOnly
                                className="mt-2 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                              />
                            </div>
                            <div>
                              <HoverInfo
                                content={t("PayInvoice:timeSince.info")}
                                header={t("PayInvoice:timeSince.header")}
                                type="header"
                              />
                              <Input
                                value={getTimeSince(timestamp)}
                                readOnly
                                className="mt-2 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                              />
                            </div>
                          </div>
                        </div>
                        <HoverInfo
                          content={t("PayInvoice:note.info")}
                          header={t("PayInvoice:note.header")}
                          type="header"
                        />
                        <Textarea value={note} readOnly className="mt-2 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]" />

                        {selectedItems && selectedItems.length ? (
                          <Card className="mt-5 rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 backdrop-blur-sm">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]" />
                                <span className="text-sm font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                                  {t("PayInvoice:invoiceItems.title")}
                                </span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/40">
                                <div className="grid grid-cols-4 text-sm px-2 py-1.5 border-b border-[hsl(var(--accent-1)/0.15)]">
                                  <div className="text-left ml-5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                                    {t("PayInvoice:invoiceItems.headers.items")}
                                  </div>
                                  <div className="hidden md:block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                                    {t(
                                      "PayInvoice:invoiceItems.headers.description"
                                    )}
                                  </div>
                                  <div className="col-span-3 md:col-span-2 pr-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                                    {t(
                                      "PayInvoice:invoiceItems.headers.paymentMethods"
                                    )}
                                  </div>
                                </div>
                                <div className="w-full h-[300px]">
                                  <List
                                    height={300}
                                    width="100%"
                                    rowComponent={MemoPayChosenRow}
                                    rowCount={selectedItems.length}
                                    rowHeight={64}
                                    rowProps={chosenRowProps}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ) : null}
                      </div>
                    </CardContent>
                    <div className="px-5 pb-5 pt-0">
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => setShowInvoicePaymentDialog(true)}
                          disabled={
                            !isValid ||
                            !transactionJSON ||
                            !transactionJSON.length
                          }
                          className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] transition-all"
                        >
                          <CreditCard className="h-4 w-4 mr-1.5" />
                          {t("PayInvoice:payButton")}
                        </Button>
                        <Button
                          onClick={() => {
                            if (!invoiceCode) return;
                            if (!hasReceivedInvoice(invoiceCode)) {
                              saveReceivedInvoice(invoiceCode);
                            }
                          }}
                          disabled={
                            !invoiceCode || hasReceivedInvoice(invoiceCode)
                          }
                          variant={
                            hasReceivedInvoice(invoiceCode)
                              ? "outline"
                              : "secondary"
                          }
                          className={cn(
                            !hasReceivedInvoice(invoiceCode) && "border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]"
                          )}
                        >
                          <Save className="h-3.5 w-3.5 mr-1.5" />
                          {hasReceivedInvoice(invoiceCode)
                            ? t(
                                "PayInvoice:saveForLater.saved",
                                "Invoice saved"
                              )
                            : t(
                                "PayInvoice:saveForLater.button",
                                "Save invoice for later payment"
                              )}
                        </Button>
                      </div>
                    </div>
                    {showInvoicePaymentDialog ? (
                      <DeepLinkDialog
                        operationNames={transactionJSON.map(() => "transfer")}
                        username={usr && usr.username ? usr.username : ""}
                        usrChain={usr && usr.chain ? usr.chain : "bitshares"}
                        userID={usr.id}
                        dismissCallback={setShowInvoicePaymentDialog}
                        key={`PayingInvoice${usr.id}`}
                        headerText={t("PayInvoice:dialogHeader")}
                        trxJSON={transactionJSON}
                      />
                    ) : null}
                    </div>
                  </Card>
                  {itemPaymentMethods && itemPaymentMethods.length ? (
                    <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
                      />
                      <div className="relative p-5 sm:p-6">
                        <CardHeader className="p-0 mb-5">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] flex-shrink-0 shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                              <Receipt className="h-4.5 w-4.5" strokeWidth={2.25} />
                            </span>
                            <div>
                              <CardTitle className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                                {t("PayInvoice:totals.title")}
                              </CardTitle>
                              <CardDescription className="text-xs text-muted-foreground/70 mt-0.5">
                                {t("PayInvoice:totals.description")}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {/* total asset amount, asset balance amount, sufficient balance checkmark */}
                          <div className="rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/40">
                            <div className="grid grid-cols-3 text-sm px-2 py-1.5 border-b border-[hsl(var(--accent-1)/0.15)]">
                              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{t("PayInvoice:totals.columns.total")}</div>
                              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{t("PayInvoice:totals.columns.balance")}</div>
                              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                                {t("PayInvoice:totals.columns.sufficient")}
                              </div>
                            </div>
                          <div className="w-full h-[300px]">
                            <List
                              height={300}
                              width="100%"
                              rowComponent={MemoPayFinalRow}
                              rowCount={Object.keys(totalAssetAmounts).length}
                              rowHeight={42}
                              rowProps={finalRowProps}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </div>
                    </Card>
                  ) : null}
                </>
              ) : (
                <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-warning)/0.7)] to-transparent"
                  />
                  <div className="relative p-5 sm:p-6">
                    <CardContent className="p-0">
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <span className="text-[hsl(var(--accent-warning-fg))] dark:text-[hsl(var(--accent-warning-fg))]">
                              <AlertTriangle />
                            </span>
                          </EmptyMedia>
                          <EmptyTitle>{t("PayInvoice:invalid.title")}</EmptyTitle>
                          <EmptyDescription>
                            {t("PayInvoice:invalid.description")}
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <Button
                            onClick={() => {
                              setInvoiceCode("");
                              setProcessedInvoiceCode(null);
                            }}
                            variant="outline"
                            className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]"
                          >
                            {t("PayInvoice:invalid.reset")}
                          </Button>
                        </EmptyContent>
                      </Empty>
                    </CardContent>
                  </div>
                </Card>
              )}
            </>
          ) : (
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
                className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
              />
              <div className="relative p-5 sm:p-6">
                <CardHeader className="p-0 mb-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] flex-shrink-0 shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                      <FileSearch className="h-4.5 w-4.5" strokeWidth={2.25} />
                    </span>
                    <div>
                      <CardTitle className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                        {t("PayInvoice:initial.title")}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground/70 mt-0.5">
                        {t("PayInvoice:initial.description")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Textarea
                    placeholder={t("PayInvoice:initial.placeholder")}
                    value={invoiceCode}
                    onInput={(e) => setInvoiceCode(e.currentTarget.value)}
                    className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)] min-h-[120px]"
                  />
                  <Button
                    className="mt-3 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] transition-all"
                    onClick={(e) => processInvoiceCode()}
                  >
                    <FileCheck className="h-4 w-4 mr-1.5" />
                    {t("PayInvoice:initial.process")}
                  </Button>
                </CardContent>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
