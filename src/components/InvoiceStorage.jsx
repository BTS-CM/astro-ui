import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import pkg from "bs58";
const { decode } = pkg;

import HoverInfo from "@/components/common/HoverInfo.tsx";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getTimeSince, copyToClipboard } from "@/lib/common";
import {
  $generatedInvoiceStorage,
  $receivedInvoiceStorage,
  removeGeneratedInvoice,
  removeReceivedInvoice,
} from "@/stores/invoices";
import { $inventoryStorage } from "@/stores/inventory";
import { $currentUser } from "@/stores/users.ts";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

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

export default function InvoiceStorage() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const generatedStore = useStore($generatedInvoiceStorage);
  const receivedStore = useStore($receivedInvoiceStorage);
  const inventoryStore = useStore($inventoryStorage);
  const inventoryItems = (inventoryStore && inventoryStore.items) || [];

  const [viewMode, setViewMode] = useState("generated"); // 'generated' | 'received'
  const savedCodes =
    viewMode === "generated"
      ? generatedStore?.invoices || []
      : receivedStore?.invoices || [];

  const [decodedInvoices, setDecodedInvoices] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState(null);
  const [itemDetailsOpen, setItemDetailsOpen] = useState(false);
  const [itemDetails, setItemDetails] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePendingCode, setDeletePendingCode] = useState(null);

  const decodeAll = useCallback(async () => {
    const results = await Promise.all(
      (savedCodes || []).map(async (code) => {
        try {
          const data = await decompressAndGetJson(code);
          if (data) {
            if (viewMode === "generated" && Array.isArray(data.items)) {
              // Enrich items with full inventory details if present
              const enriched = data.items.map((it) => {
                const match = inventoryItems.find((invIt) => {
                  const invId = invIt.id ?? invIt.barcode ?? invIt.name;
                  const itemId = it.id ?? it.barcode ?? it.name;
                  return String(invId) === String(itemId);
                });
                if (match) {
                  return { ...match, quantity: it.quantity };
                }
                return it;
              });
              return {
                code,
                data: { ...data, itemsEnriched: enriched },
                error: null,
              };
            }
            return { code, data, error: null };
          }
          return { code, data: null, error: "No data" };
        } catch (e) {
          console.error("Failed to decode invoice", e);
          return { code, data: null, error: String(e) };
        }
      })
    );
    setDecodedInvoices(results.filter((r) => r && r.data));
  }, [savedCodes, viewMode, inventoryItems]);

  useEffect(() => {
    decodeAll();
  }, [decodeAll]);

  const InvoiceRow = ({ index, style }) => {
    const entry = decodedInvoices[index];
    if (!entry || !entry.data) return null;
    const inv = entry.data;
    const itemsForCount =
      viewMode === "generated" && inv.itemsEnriched
        ? inv.itemsEnriched
        : inv.items;
    const itemCount = Array.isArray(itemsForCount) ? itemsForCount.length : 0;
    const ts = inv.timestamp ? getTimeSince(inv.timestamp) : "";
    const notePreview =
      (inv.note || "").length > 24
        ? (inv.note || "").slice(0, 24) + "…"
        : inv.note || "";

    const canPay =
      usr &&
      usr.id &&
      inv &&
      inv.recipientId &&
      String(inv.recipientId) !== String(usr.id);

    const [copied, setCopied] = useState(false);
    const copyTimer = useRef(null);
    useEffect(() => {
      return () => {
        if (copyTimer.current) clearTimeout(copyTimer.current);
      };
    }, []);

    return (
      <div style={style} className="px-2">
        <Card className="hover:bg-slate-50">
          <CardContent className="pt-2 pb-2">
            <div className="grid grid-cols-12 items-center gap-2 text-sm">
              <div
                className="col-span-2 truncate mt-1"
                title={inv.recipientId || ""}
              >
                {inv.recipientId || ""}
              </div>
              <div
                className="col-span-2 truncate mt-1"
                title={inv.recipientName || ""}
              >
                {inv.recipientName || ""}
              </div>
              <div
                className="col-span-2 truncate mt-1"
                title={inv.identifier || ""}
              >
                {inv.identifier || ""}
              </div>
              <div className="col-span-2 truncate mt-1" title={inv.note || ""}>
                {notePreview}
              </div>
              <div
                className="col-span-1 text-right pr-1 mt-1 text-slate-600"
                title={
                  inv.timestamp ? new Date(inv.timestamp).toLocaleString() : ""
                }
              >
                {ts}
              </div>
              <div
                className="col-span-1 text-center mt-1"
                title={t("InvoiceStorage:headers.itemQty", "Item qty")}
              >
                {itemCount}
              </div>
              <div className="col-span-2 flex justify-end gap-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailsInvoice(inv);
                    setDetailsOpen(true);
                  }}
                >
                  {t("InvoiceStorage:actions.view", "View")}
                </Button>
                {canPay ? (
                  <a
                    href={`/pay_invoice/index.html?id=${encodeURIComponent(
                      entry.code
                    )}`}
                    title={t(
                      "InvoiceStorage:actions.payTitle",
                      "Pay this invoice"
                    )}
                  >
                    <Button size="sm">
                      {t("InvoiceStorage:actions.pay", "Pay")}
                    </Button>
                  </a>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!entry || !entry.code) return;
                    copyToClipboard(entry.code);
                    setCopied(true);
                    if (copyTimer.current) clearTimeout(copyTimer.current);
                    copyTimer.current = setTimeout(
                      () => setCopied(false),
                      2000
                    );
                  }}
                  disabled={copied}
                >
                  {copied
                    ? t("InvoiceStorage:actions.copied", "Copied")
                    : t("InvoiceStorage:actions.copy", "Copy")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletePendingCode(entry.code);
                    setDeleteDialogOpen(true);
                  }}
                >
                  {t("InvoiceStorage:actions.delete", "Delete")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Confirm delete dialog handlers
  const confirmDelete = () => {
    if (deletePendingCode) {
      if (viewMode === "generated") {
        removeGeneratedInvoice(deletePendingCode);
      } else {
        removeReceivedInvoice(deletePendingCode);
      }
    }
    setDeletePendingCode(null);
    setDeleteDialogOpen(false);
  };

  const cancelDelete = () => {
    setDeletePendingCode(null);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full">
        <div className="grid grid-cols-1 gap-3">
          <div className="mb-3 flex gap-2">
            <Button
              variant={viewMode === "generated" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("generated")}
            >
              {t("InvoiceStorage:toggle.generated", "Generated Invoices")}
            </Button>
            <Button
              variant={viewMode === "received" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("received")}
            >
              {t("InvoiceStorage:toggle.received", "Invoices To Pay")}
            </Button>
          </div>
          {decodedInvoices.length ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewMode === "generated"
                    ? t(
                        "InvoiceStorage:title.generated",
                        "Your Generated Invoices"
                      )
                    : t(
                        "InvoiceStorage:title.received",
                        "Invoices Saved To Pay"
                      )}
                </CardTitle>
                <CardDescription>
                  {viewMode === "generated"
                    ? t(
                        "InvoiceStorage:description.generated",
                        "Invoices you created and saved; items enriched from inventory when possible"
                      )
                    : t(
                        "InvoiceStorage:description.received",
                        "Invoices you've saved while preparing to pay them"
                      )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border">
                  <div className="grid grid-cols-12 text-center text-sm px-2 py-1">
                    <div className="col-span-2 text-left">
                      {t("InvoiceStorage:headers.recipientId", "Recipient ID")}
                    </div>
                    <div className="col-span-2 text-left">
                      {t(
                        "InvoiceStorage:headers.recipientName",
                        "Recipient Name"
                      )}
                    </div>
                    <div className="col-span-2 text-left">
                      {t("InvoiceStorage:headers.identifier", "Identifier")}
                    </div>
                    <div className="col-span-2 text-left">
                      {t("InvoiceStorage:headers.note", "Note")}
                    </div>
                    <div className="col-span-1 text-right pr-1">
                      {t("InvoiceStorage:headers.when", "When")}
                    </div>
                    <div className="col-span-1 text-center">
                      {t("InvoiceStorage:headers.itemQty", "Item qty")}
                    </div>
                    <div className="col-span-2 text-right pr-2">
                      {t("InvoiceStorage:headers.actions", "Actions")}
                    </div>
                  </div>
                  <div className="w-full max-h-[420px] min-h-[360px] overflow-auto border mt-1">
                    <List
                      rowComponent={InvoiceRow}
                      rowCount={decodedInvoices.length}
                      rowHeight={55}
                      rowProps={{}}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">📄</EmptyMedia>
                    <EmptyTitle>
                      {t("InvoiceStorage:empty.title", "No saved invoices")}
                    </EmptyTitle>
                    <EmptyDescription>
                      {t(
                        "InvoiceStorage:empty.description",
                        "Generate and save invoices to see them here"
                      )}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[720px] sm:min-w-[720px] bg-white">
          <DialogHeader>
            <DialogTitle>
              {t("InvoiceStorage:details.title", "Invoice Details")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "InvoiceStorage:details.description",
                "Review the invoice you selected"
              )}
            </DialogDescription>
          </DialogHeader>

          {detailsInvoice ? (
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <HoverInfo
                    content={t(
                      "InvoiceStorage:recipientAccount.info",
                      "Recipient account ID"
                    )}
                    header={t(
                      "InvoiceStorage:recipientAccount.header",
                      "Recipient account"
                    )}
                    type="header"
                  />
                  <Input
                    value={detailsInvoice.recipientId || ""}
                    readOnly
                    className="mt-2"
                  />
                </div>
                <div>
                  <HoverInfo
                    content={t(
                      "InvoiceStorage:recipientName.info",
                      "Name of the recipient"
                    )}
                    header={t(
                      "InvoiceStorage:recipientName.header",
                      "Recipient name"
                    )}
                    type="header"
                  />
                  <Input
                    value={detailsInvoice.recipientName || ""}
                    readOnly
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <HoverInfo
                    content={t(
                      "InvoiceStorage:identifier.info",
                      "Invoice identifier"
                    )}
                    header={t("InvoiceStorage:identifier.header", "Identifier")}
                    type="header"
                  />
                  <Input
                    value={detailsInvoice.identifier || ""}
                    readOnly
                    className="mt-2"
                  />
                </div>
                <div>
                  <HoverInfo
                    content={t(
                      "InvoiceStorage:timeSince.info",
                      "Time since invoice was created"
                    )}
                    header={t("InvoiceStorage:timeSince.header", "When")}
                    type="header"
                  />
                  <Input
                    value={
                      detailsInvoice.timestamp
                        ? getTimeSince(detailsInvoice.timestamp)
                        : ""
                    }
                    readOnly
                    className="mt-2"
                  />
                </div>
              </div>

              <HoverInfo
                content={t(
                  "InvoiceStorage:note.info",
                  "Note provided by the creator"
                )}
                header={t("InvoiceStorage:note.header", "Note")}
                type="header"
              />
              <Textarea
                value={detailsInvoice.note || ""}
                readOnly
                className="mt-2"
              />

              {(
                viewMode === "generated"
                  ? Array.isArray(detailsInvoice.itemsEnriched) &&
                    detailsInvoice.itemsEnriched.length
                  : Array.isArray(detailsInvoice.items) &&
                    detailsInvoice.items.length
              ) ? (
                <Card className="mt-5">
                  <CardHeader>
                    <CardTitle>
                      {t("InvoiceStorage:items.title", "Invoice items")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border">
                      <div className="grid grid-cols-12 text-center text-sm px-2 py-1">
                        <div className="col-span-8 text-left">
                          {t("InvoiceStorage:items.headers.name", "Item")}
                        </div>
                        <div className="col-span-4">
                          {t("InvoiceStorage:items.headers.quantity", "Qty")}
                        </div>
                      </div>
                      <div className="w-full max-h-[300px] min-h-[300px] overflow-auto border mt-1">
                        <List
                          rowComponent={({ index, style }) => {
                            const sourceItems =
                              viewMode === "generated" &&
                              detailsInvoice.itemsEnriched
                                ? detailsInvoice.itemsEnriched
                                : detailsInvoice.items;
                            const it = sourceItems[index];
                            if (!it) return null;
                            return (
                              <div style={style} className="px-2">
                                <Card
                                  className="cursor-pointer hover:bg-slate-50"
                                  onClick={() => {
                                    setItemDetails(it);
                                    setItemDetailsOpen(true);
                                  }}
                                >
                                  <CardContent className="pt-1 pb-1">
                                    <div className="grid grid-cols-12 items-center gap-2 text-sm">
                                      <div className="col-span-8 truncate mt-1">
                                        {it.name}
                                      </div>
                                      <div className="col-span-4 text-center mt-1">
                                        <Badge variant="outline">
                                          {it.quantity}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          }}
                          rowCount={
                            viewMode === "generated" &&
                            detailsInvoice.itemsEnriched
                              ? detailsInvoice.itemsEnriched.length
                              : detailsInvoice.items.length
                          }
                          rowHeight={55}
                          rowProps={{}}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("InvoiceStorage:deleteDialog.title", "Delete invoice")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "InvoiceStorage:deleteDialog.description",
                "Are you sure you want to permanently remove this saved invoice?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>
              {t("InvoiceStorage:deleteDialog.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t("InvoiceStorage:deleteDialog.confirm", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={itemDetailsOpen} onOpenChange={setItemDetailsOpen}>
        <DialogContent className="sm:max-w-[640px] bg-white">
          <DialogHeader>
            <DialogTitle>
              {t("InvoiceStorage:itemDetails.title", "Item Details")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "InvoiceStorage:itemDetails.description",
                "Detailed information about this invoice item"
              )}
            </DialogDescription>
          </DialogHeader>
          {itemDetails ? (
            <div className="text-sm max-h-[420px] overflow-auto">
              <div className="grid grid-cols-3 gap-2">
                <div className="font-medium">Name</div>
                <div className="col-span-2 break-words">{itemDetails.name}</div>

                {itemDetails.barcode ? (
                  <>
                    <div className="font-medium">Barcode</div>
                    <div className="col-span-2 break-words">
                      {itemDetails.barcode}
                    </div>
                  </>
                ) : null}

                {itemDetails.category ? (
                  <>
                    <div className="font-medium">Category</div>
                    <div className="col-span-2 break-words">
                      {itemDetails.category}
                    </div>
                  </>
                ) : null}

                <div className="font-medium">Quantity</div>
                <div className="col-span-2 break-words">
                  {itemDetails.quantity}
                </div>

                {itemDetails.location ? (
                  <>
                    <div className="font-medium">Location</div>
                    <div className="col-span-2 break-words">
                      {itemDetails.location}
                    </div>
                  </>
                ) : null}

                {itemDetails.unitPrice ? (
                  <>
                    <div className="font-medium">Unit Price</div>
                    <div className="col-span-2 break-words">
                      {itemDetails.unitPrice}
                    </div>
                  </>
                ) : null}

                {typeof itemDetails.reorderLevel !== "undefined" ? (
                  <>
                    <div className="font-medium">Reorder Level</div>
                    <div className="col-span-2 break-words">
                      {String(itemDetails.reorderLevel)}
                    </div>
                  </>
                ) : null}

                {itemDetails.supplier ? (
                  <>
                    <div className="font-medium">Supplier</div>
                    <div className="col-span-2 break-words">
                      {itemDetails.supplier}
                    </div>
                  </>
                ) : null}

                {itemDetails.unit ? (
                  <>
                    <div className="font-medium">Unit</div>
                    <div className="col-span-2 break-words">
                      {itemDetails.unit}
                    </div>
                  </>
                ) : null}

                <div className="font-medium">Description</div>
                <div className="col-span-2 break-words">
                  {itemDetails.description || ""}
                </div>

                <div className="font-medium">Prices</div>
                <div className="col-span-2 break-words">
                  {(itemDetails.prices || []).map((p, idx) => (
                    <Badge key={`price-${idx}`} className="mr-1 mt-1">
                      {p.price} {p.asset}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
