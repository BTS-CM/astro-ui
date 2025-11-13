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
  DialogFooter,
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
  $generatedInvoiceMetaStorage,
  updateGeneratedInvoiceMeta,
} from "@/stores/invoices";
import { $inventoryStorage } from "@/stores/inventory";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import ExternalLink from "./common/ExternalLink.jsx";
import { DialogTrigger } from "@radix-ui/react-dialog";

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
  const generatedMetaStore = useStore($generatedInvoiceMetaStorage);
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
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [itemDetails, setItemDetails] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePendingCode, setDeletePendingCode] = useState(null);
  // Metadata editing states
  const [metaEditingCode, setMetaEditingCode] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("waiting_payment");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("sent");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [overallStatus, setOverallStatus] = useState("waiting");

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

  const statusLabelMap = {
    waiting: t("InvoiceStorage:status.waiting"),
    in_progress: t("InvoiceStorage:status.in_progress"),
    issue_detected: t("InvoiceStorage:status.issue_detected"),
    cancelled: t("InvoiceStorage:status.cancelled"),
    completed: t("InvoiceStorage:status.completed"),
  };

  const statusColorClasses = {
    waiting: "bg-slate-200 text-slate-700",
    in_progress: "bg-blue-200 text-blue-700",
    issue_detected: "bg-orange-200 text-orange-700",
    cancelled: "bg-gray-300 text-gray-700 line-through",
    completed: "bg-green-200 text-green-700",
  };

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
            <div className="grid grid-cols-4 lg:grid-cols-12 gap-2 text-sm">
              <div
                className="col-span-1 lg:col-span-2 truncate mt-1"
                title={inv.recipientId || ""}
              >
                <ExternalLink
                  classnamecontents="hover:text-blue-500"
                  type="text"
                  text={inv.recipientId}
                  hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                    inv.recipientId
                  }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                />
              </div>
              <div
                className="hidden lg:block col-span-1 truncate mt-1"
                title={inv.recipientName || ""}
              >
                {inv.recipientName || ""}
              </div>
              <div
                className="col-span-1 truncate mt-1"
                title={inv.identifier || ""}
              >
                {inv.identifier || ""}
              </div>
              <div
                className="hidden lg:block col-span-2 truncate mt-1"
                title={inv.note || ""}
              >
                {notePreview}
              </div>
              <div
                className="hidden lg:block col-span-1 pr-1 mt-1 text-slate-600"
                title={
                  inv.timestamp ? new Date(inv.timestamp).toLocaleString() : ""
                }
              >
                {ts}
              </div>
              <div
                className="hidden lg:block col-span-1 mt-1"
                title={t("InvoiceStorage:headers.itemQty")}
              >
                {itemCount}
              </div>
              <div
                className="col-span-1 mt-1"
                title={
                  viewMode === "generated"
                    ? t("InvoiceStorage:headers.status")
                    : ""
                }
              >
                {viewMode === "generated"
                  ? (() => {
                      const meta = generatedMetaStore?.meta?.[entry.code];
                      const overall = meta?.overallStatus || "waiting";
                      const label = statusLabelMap[overall] || overall;
                      const cls = statusColorClasses[overall] || "bg-slate-200";
                      return (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium inline-block ${cls}`}
                        >
                          {label}
                        </span>
                      );
                    })()
                  : null}
              </div>
              <div className="flex lg:hidden">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      {t("InvoiceStorage:headers.actions")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[720px] sm:min-w-[720px] bg-white">
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsInvoice(inv);
                          setDetailsOpen(true);
                        }}
                      >
                        {t("InvoiceStorage:actions.view")}
                      </Button>
                      {canPay ? (
                        <a
                          href={`/pay_invoice/index.html?id=${encodeURIComponent(
                            entry.code
                          )}`}
                          title={t("InvoiceStorage:actions.payTitle")}
                        >
                          <Button size="sm">
                            {t("InvoiceStorage:actions.pay")}
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
                          if (copyTimer.current)
                            clearTimeout(copyTimer.current);
                          copyTimer.current = setTimeout(
                            () => setCopied(false),
                            2000
                          );
                        }}
                        disabled={copied}
                      >
                        {copied
                          ? t("InvoiceStorage:actions.copied")
                          : t("InvoiceStorage:actions.copy")}
                      </Button>
                      {viewMode === "generated" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMetaEditingCode(entry.code);
                            const existing =
                              generatedMetaStore?.meta?.[entry.code];
                            setPaymentStatus(
                              existing?.paymentStatus || "waiting_payment"
                            );
                            setPaymentNotes(existing?.paymentNotes || "");
                            setDeliveryStatus(
                              existing?.deliveryStatus || "sent"
                            );
                            setDeliveryNotes(existing?.deliveryNotes || "");
                            setOverallStatus(
                              existing?.overallStatus || "waiting"
                            );
                            setMetaDialogOpen(true);
                          }}
                        >
                          {t("InvoiceStorage:actions.update")}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletePendingCode(entry.code);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        {t("InvoiceStorage:actions.delete")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="hidden lg:flex col-span-3 gap-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailsInvoice(inv);
                    setDetailsOpen(true);
                  }}
                >
                  {t("InvoiceStorage:actions.view")}
                </Button>
                {canPay ? (
                  <a
                    href={`/pay_invoice/index.html?id=${encodeURIComponent(
                      entry.code
                    )}`}
                    title={t("InvoiceStorage:actions.payTitle")}
                  >
                    <Button size="sm">{t("InvoiceStorage:actions.pay")}</Button>
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
                    ? t("InvoiceStorage:actions.copied")
                    : t("InvoiceStorage:actions.copy")}
                </Button>
                {viewMode === "generated" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMetaEditingCode(entry.code);
                      const existing = generatedMetaStore?.meta?.[entry.code];
                      setPaymentStatus(
                        existing?.paymentStatus || "waiting_payment"
                      );
                      setPaymentNotes(existing?.paymentNotes || "");
                      setDeliveryStatus(existing?.deliveryStatus || "sent");
                      setDeliveryNotes(existing?.deliveryNotes || "");
                      setOverallStatus(existing?.overallStatus || "waiting");
                      setMetaDialogOpen(true);
                    }}
                  >
                    {t("InvoiceStorage:actions.update")}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletePendingCode(entry.code);
                    setDeleteDialogOpen(true);
                  }}
                >
                  {t("InvoiceStorage:actions.delete")}
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
          <div className="mb-3 grid grid-cols-2 md:w-1/2 mx-auto text-center gap-2">
            <Button
              variant={viewMode === "generated" ? "secondary" : "default"}
              size="sm"
              onClick={() => setViewMode("generated")}
            >
              {t("InvoiceStorage:toggle.generated")}
            </Button>
            <Button
              variant={viewMode === "received" ? "secondary" : "default"}
              size="sm"
              onClick={() => setViewMode("received")}
            >
              {t("InvoiceStorage:toggle.received")}
            </Button>
          </div>
          {decodedInvoices.length ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewMode === "generated"
                    ? t("InvoiceStorage:title.generated")
                    : t("InvoiceStorage:title.received")}
                </CardTitle>
                <CardDescription>
                  {viewMode === "generated"
                    ? t("InvoiceStorage:description.generated")
                    : t("InvoiceStorage:description.received")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border">
                  <div className="grid grid-cols-4 lg:grid-cols-12 text-sm px-2 py-1">
                    <div className="col-span-1 lg:col-span-2">
                      {t("InvoiceStorage:headers.recipientId")}
                    </div>
                    <div className="hidden lg:block col-span-1">
                      {t("InvoiceStorage:headers.recipientName")}
                    </div>
                    <div className="col-span-1">
                      {t("InvoiceStorage:headers.identifier")}
                    </div>
                    <div className="hidden lg:block col-span-2">
                      {t("InvoiceStorage:headers.note")}
                    </div>
                    <div className="hidden lg:block col-span-1">
                      {t("InvoiceStorage:headers.when")}
                    </div>
                    <div className="hidden lg:block col-span-1">
                      {t("InvoiceStorage:headers.itemQty")}
                    </div>
                    <div className="col-span-1">
                      {viewMode === "generated"
                        ? t("InvoiceStorage:headers.status")
                        : ""}
                    </div>
                    <div className="col-span-1 lg:col-span-3">
                      {t("InvoiceStorage:headers.actions")}
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
                    <EmptyTitle>{t("InvoiceStorage:empty.title")}</EmptyTitle>
                    <EmptyDescription>
                      {t("InvoiceStorage:empty.description")}
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
            <DialogTitle>{t("InvoiceStorage:details.title")}</DialogTitle>
            <DialogDescription>
              {t("InvoiceStorage:details.description")}
            </DialogDescription>
          </DialogHeader>

          {detailsInvoice ? (
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <HoverInfo
                    content={t("InvoiceStorage:recipientAccount.info")}
                    header={t("InvoiceStorage:recipientAccount.header")}
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
                    content={t("InvoiceStorage:recipientName.info")}
                    header={t("InvoiceStorage:recipientName.header")}
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
                    content={t("InvoiceStorage:identifier.info")}
                    header={t("InvoiceStorage:identifier.header")}
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
                    content={t("InvoiceStorage:timeSince.info")}
                    header={t("InvoiceStorage:timeSince.header")}
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
                content={t("InvoiceStorage:note.info")}
                header={t("InvoiceStorage:note.header")}
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
                    <CardTitle>{t("InvoiceStorage:items.title")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border">
                      <div className="grid grid-cols-12 text-center text-sm px-2 py-1">
                        <div className="col-span-8 text-left">
                          {t("InvoiceStorage:items.headers.name")}
                        </div>
                        <div className="col-span-4">
                          {t("InvoiceStorage:items.headers.quantity")}
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
              {t("InvoiceStorage:deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("InvoiceStorage:deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>
              {t("InvoiceStorage:deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t("InvoiceStorage:deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={itemDetailsOpen} onOpenChange={setItemDetailsOpen}>
        <DialogContent className="sm:max-w-[640px] bg-white">
          <DialogHeader>
            <DialogTitle>{t("InvoiceStorage:itemDetails.title")}</DialogTitle>
            <DialogDescription>
              {t("InvoiceStorage:itemDetails.description")}
            </DialogDescription>
          </DialogHeader>
          {itemDetails ? (
            <div className="text-sm max-h-[420px] overflow-auto">
              <div className="grid grid-cols-3 gap-2">
                <div className="font-medium">
                  {t("InvoiceStorage:itemDetails.fields.name")}
                </div>
                <div className="col-span-2 break-words">{itemDetails.name}</div>

                {itemDetails.barcode ? (
                  <>
                    <div className="font-medium">
                      {t("InvoiceStorage:itemDetails.fields.barcode")}
                    </div>
                    <div className="col-span-2 break-words">
                      {itemDetails.barcode}
                    </div>
                  </>
                ) : null}

                {itemDetails.category ? (
                  <>
                    <div className="font-medium">
                      {t("InvoiceStorage:itemDetails.fields.category")}
                    </div>
                    <div className="col-span-2 break-words">
                      {itemDetails.category}
                    </div>
                  </>
                ) : null}

                <div className="font-medium">
                  {t("InvoiceStorage:itemDetails.fields.quantity")}
                </div>
                <div className="col-span-2 break-words">
                  {itemDetails.quantity}
                </div>

                {itemDetails.location ? (
                  <>
                    <div className="font-medium">
                      {t("InvoiceStorage:itemDetails.fields.location")}
                    </div>
                    <div className="col-span-2 break-words">
                      {itemDetails.location}
                    </div>
                  </>
                ) : null}

                {itemDetails.unitPrice ? (
                  <>
                    <div className="font-medium">
                      {t("InvoiceStorage:itemDetails.fields.unitPrice")}
                    </div>
                    <div className="col-span-2 break-words">
                      {itemDetails.unitPrice}
                    </div>
                  </>
                ) : null}

                {typeof itemDetails.reorderLevel !== "undefined" ? (
                  <>
                    <div className="font-medium">
                      {t("InvoiceStorage:itemDetails.fields.reorderLevel")}
                    </div>
                    <div className="col-span-2 break-words">
                      {String(itemDetails.reorderLevel)}
                    </div>
                  </>
                ) : null}

                {itemDetails.supplier ? (
                  <>
                    <div className="font-medium">
                      {t("InvoiceStorage:itemDetails.fields.supplier")}
                    </div>
                    <div className="col-span-2 break-words">
                      {itemDetails.supplier}
                    </div>
                  </>
                ) : null}

                {itemDetails.unit ? (
                  <>
                    <div className="font-medium">
                      {t("InvoiceStorage:itemDetails.fields.unit")}
                    </div>
                    <div className="col-span-2 break-words">
                      {itemDetails.unit}
                    </div>
                  </>
                ) : null}

                <div className="font-medium">
                  {t("InvoiceStorage:itemDetails.fields.description")}
                </div>
                <div className="col-span-2 break-words">
                  {itemDetails.description || ""}
                </div>

                <div className="font-medium">
                  {t("InvoiceStorage:itemDetails.fields.prices")}
                </div>
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
      {/* Metadata Update Dialog */}
      <Dialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen}>
        <DialogContent className="sm:max-w-[720px] bg-white">
          <DialogHeader>
            <DialogTitle>{t("InvoiceStorage:meta.title")}</DialogTitle>
            <DialogDescription>
              {t("InvoiceStorage:meta.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 text-sm max-h-[480px] overflow-auto">
            <div className="space-y-2">
              <div className="font-medium">
                {t("InvoiceStorage:meta.paymentStatus")}
              </div>
              <RadioGroup
                value={paymentStatus}
                onValueChange={setPaymentStatus}
                className="flex flex-col gap-2"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="waiting_payment" />
                  <span>{t("InvoiceStorage:meta.payment.waiting")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="payment_issue" />
                  <span>{t("InvoiceStorage:meta.payment.issue")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="payment_received" />
                  <span>{t("InvoiceStorage:meta.payment.received")}</span>
                </label>
              </RadioGroup>
              <Textarea
                placeholder={t("InvoiceStorage:meta.paymentNotes.ph")}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="font-medium">
                {t("InvoiceStorage:meta.deliveryStatus")}
              </div>
              <RadioGroup
                value={deliveryStatus}
                onValueChange={setDeliveryStatus}
                className="flex flex-col gap-2"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="sent" />
                  <span>{t("InvoiceStorage:meta.delivery.sent")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="delivery_issue" />
                  <span>{t("InvoiceStorage:meta.delivery.issue")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="received_item" />
                  <span>{t("InvoiceStorage:meta.delivery.received")}</span>
                </label>
              </RadioGroup>
              <Textarea
                placeholder={t("InvoiceStorage:meta.deliveryNotes.ph")}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="font-medium">
                {t("InvoiceStorage:meta.overallStatus")}
              </div>
              <RadioGroup
                value={overallStatus}
                onValueChange={setOverallStatus}
                className="flex flex-col gap-2"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="waiting" />
                  <span>{t("InvoiceStorage:status.waiting")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="in_progress" />
                  <span>{t("InvoiceStorage:status.in_progress")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="issue_detected" />
                  <span>{t("InvoiceStorage:status.issue_detected")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="cancelled" />
                  <span>{t("InvoiceStorage:status.cancelled")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="completed" />
                  <span>{t("InvoiceStorage:status.completed")}</span>
                </label>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setMetaDialogOpen(false)}
              >
                {t("InvoiceStorage:meta.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (metaEditingCode) {
                    updateGeneratedInvoiceMeta(metaEditingCode, {
                      paymentStatus,
                      paymentNotes,
                      deliveryStatus,
                      deliveryNotes,
                      overallStatus,
                    });
                  }
                  setMetaDialogOpen(false);
                }}
              >
                {t("InvoiceStorage:meta.save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
