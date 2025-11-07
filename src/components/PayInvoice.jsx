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

import pkg from "bs58";
const { decode } = pkg;

import HoverInfo from "@/components/common/HoverInfo.tsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

export default function PayInvoice(properties) {
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
      if (usr && usr.id && currentNode && assets && assets.length) {
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
            setBalances(filteredData);
          }
        });
      }
    }

    fetchBalances();
  }, [usr, assets, currentNode]);

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
    if (usr && usr.chain && currentNode && recipientId) {
      const userStore = createObjectStore([
        usr.chain,
        JSON.stringify([usr.id, recipientId]),
        currentNode ? currentNode.url : null,
      ]);
      userStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBothUsers(data);
        }
      });
    }
  }, [usr, currentNode, recipientId]);

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

  const ChosenRow = ({ index, style }) => {
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
      <div style={style} className="px-2">
        <Card>
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
                  onValueChange={(value) => {
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
                  }}
                >
                  <SelectTrigger className="w-full">
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
  };

  const FinalRows = ({ index, style }) => {
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

    const sufficientBalance = balanceAmount >= totalAmount ? "✅" : "❌";

    const requiredBalance =
      sufficientBalance === "✅" ? 0 : totalAmount - balanceAmount;

    return (
      <div style={style} className="px-2">
        <Card>
          <CardContent className="pt-1 pb-1">
            <div className="grid grid-cols-3 text-sm">
              <div
                title={t("PayInvoice:totals.tooltips.amountRequested", {
                  asset: assetSymbol,
                })}
              >
                {totalAmount} {assetSymbol}
              </div>
              <div
                title={t("PayInvoice:totals.tooltips.currentBalance", {
                  asset: assetSymbol,
                })}
              >
                {balanceAmount} {assetSymbol}
              </div>
              <div
                className="ml-3"
                title={
                  requiredBalance > 0
                    ? t("PayInvoice:totals.tooltips.needMore", {
                        required: requiredBalance,
                        asset: assetSymbol,
                      })
                    : ""
                }
              >
                {sufficientBalance}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full">
        <div className="grid grid-cols-1 gap-3">
          {processedInvoiceCode ? (
            <>
              {isValid ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("PayInvoice:title")}</CardTitle>
                      <CardDescription>
                        {t("PayInvoice:description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                              className="mt-2"
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
                              className="mt-2"
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
                                className="mt-2"
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
                                className="mt-2"
                              />
                            </div>
                          </div>
                        </div>
                        <HoverInfo
                          content={t("PayInvoice:note.info")}
                          header={t("PayInvoice:note.header")}
                          type="header"
                        />
                        <Textarea value={note} readOnly className="mt-2" />

                        {selectedItems && selectedItems.length ? (
                          <Card className="mt-5">
                            <CardHeader>
                              <CardTitle>
                                {t("PayInvoice:invoiceItems.title")}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="border">
                                <div className="grid grid-cols-4 text-sm px-2 py-1">
                                  <div className="text-left ml-5">
                                    {t("PayInvoice:invoiceItems.headers.items")}
                                  </div>
                                  <div className="hidden md:block">
                                    {t(
                                      "PayInvoice:invoiceItems.headers.description"
                                    )}
                                  </div>
                                  <div className="col-span-3 md:col-span-2 pr-2">
                                    {t(
                                      "PayInvoice:invoiceItems.headers.paymentMethods"
                                    )}
                                  </div>
                                </div>
                                <div className="w-full max-h-[300px] min-h-[300px] overflow-auto border mt-1">
                                  <List
                                    rowComponent={ChosenRow}
                                    rowCount={selectedItems.length}
                                    rowHeight={55}
                                    rowProps={{}}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ) : null}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => setShowInvoicePaymentDialog(true)}
                        disabled={
                          !isValid ||
                          !transactionJSON ||
                          !transactionJSON.length
                        }
                      >
                        {t("PayInvoice:payButton")}
                      </Button>
                    </CardFooter>
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
                  </Card>
                  {itemPaymentMethods && itemPaymentMethods.length ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("PayInvoice:totals.title")}</CardTitle>
                        <CardDescription>
                          {t("PayInvoice:totals.description")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* total asset amount, asset balance amount, sufficient balance checkmark */}
                        <div className="border">
                          <div className="grid grid-cols-3 text-sm px-2 py-1">
                            <div>{t("PayInvoice:totals.columns.total")}</div>
                            <div>{t("PayInvoice:totals.columns.balance")}</div>
                            <div>
                              {t("PayInvoice:totals.columns.sufficient")}
                            </div>
                          </div>
                          <div className="w-full max-h-[300px] min-h-[300px] overflow-auto border mt-1">
                            <List
                              rowComponent={FinalRows}
                              rowCount={Object.keys(totalAssetAmounts).length}
                              rowHeight={42}
                              rowProps={{}}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </>
              ) : (
                <Card>
                  <CardContent>
                    <Empty>
                      <EmptyHeader>
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
                        >
                          {t("PayInvoice:invalid.reset")}
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t("PayInvoice:initial.title")}</CardTitle>
                <CardDescription>
                  {t("PayInvoice:initial.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={t("PayInvoice:initial.placeholder")}
                  value={invoiceCode}
                  onInput={(e) => setInvoiceCode(e.currentTarget.value)}
                />
                <Button className="mt-3" onClick={(e) => processInvoiceCode()}>
                  {t("PayInvoice:initial.process")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
