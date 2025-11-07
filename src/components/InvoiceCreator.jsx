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
import { Check, ChevronsUpDown, Folder } from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import Fuse from "fuse.js";

import pkg from "bs58";
const { encode } = pkg;

import HoverInfo from "@/components/common/HoverInfo.tsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $inventoryStorage } from "@/stores/inventory";

import { copyToClipboard } from "@/lib/common";
import BarcodeScanner from "react-qr-barcode-scanner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

/**
 * 1. Stringify the object.
 * 2. Compress the string using 'gzip' (native browser API).
 * 3. Return the compressed data as a Uint8Array.
 */
async function compressAndGetUint8Array(data) {
  const text = JSON.stringify(data);
  const encoder = new TextEncoder();
  const stream = new Blob([encoder.encode(text)]).stream();

  const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));

  const compressedArrayBuffer = await new Response(
    compressedStream
  ).arrayBuffer();

  return new Uint8Array(compressedArrayBuffer);
}

async function compress(invoice) {
  try {
    const compressedUint8Array = await compressAndGetUint8Array(invoice);

    const invoiceData = encode(compressedUint8Array);

    console.log("Invoice data", invoice, invoiceData);
    return invoiceData;
  } catch (error) {
    console.error("Compression/Encoding error:", error);
    return;
  }
}

export default function InvoiceCreator(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const { _assetsBTS, _assetsTEST } = properties;

  const assets = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain === "bitshares" ? _assetsBTS || [] : _assetsTEST || [];
    }
    return [];
  }, [usr, _assetsBTS, _assetsTEST]);

  const inventory = useStore($inventoryStorage);
  const items = (inventory && inventory.items) || [];

  const [identifier, setIdentifier] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [note, setNote] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [generatedCode, setGeneratedCode] = useState("");

  // Add-item dialog state and helpers
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [qtyDialogOpen, setQtyDialogOpen] = useState(false);
  const [qtyValue, setQtyValue] = useState("1");
  const [candidateItem, setCandidateItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);

  const fuse = useMemo(() => {
    const options = {
      includeScore: false,
      threshold: 0.35,
      keys: [
        { name: "name", weight: 0.5 },
        { name: "description", weight: 0.2 },
        { name: "category", weight: 0.2 },
        { name: "supplier", weight: 0.1 },
        { name: "location", weight: 0.1 },
      ],
    };
    return new Fuse(items || [], options);
  }, [items]);

  const selectableItems = useMemo(() => {
    const q = (searchQuery || "").trim();
    if (!q) return items || [];
    try {
      return fuse.search(q).map((r) => r.item);
    } catch (e) {
      return items || [];
    }
  }, [items, fuse, searchQuery]);

  const addSelectedItem = useCallback(
    (it, qty) => {
      if (!it) return;
      const quantity = Math.max(1, Number(qty) || 1);

      setSelectedItems((prev) => {
        const srcId = it.id ?? it.barcode ?? it.name;

        const existingIndex = prev.findIndex((si) => {
          const existing = si.item || {};
          const existingId = existing.id ?? existing.barcode ?? existing.name;
          return existingId === srcId;
        });

        if (existingIndex !== -1) {
          const updated = [...prev];
          const currentQty = Number(updated[existingIndex].quantity) || 0;
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: currentQty + quantity,
          };
          return updated;
        }

        return [
          ...prev,
          {
            id: it.id ?? it.barcode ?? `${it.name}-${Date.now()}`,
            name: it.name ?? "",
            quantity,
            item: it,
          },
        ];
      });
    },
    [setSelectedItems]
  );

  const handleGenerateInvoice = useCallback(async () => {
    // Build a sanitized invoice payload excluding private seller-only fields.
    const payload = {
      recipientId: usr?.id || null,
      recipientName: recipientName || "",
      identifier: identifier || "",
      note: note || "",
      timestamp: Date.now(),
      items: (selectedItems || []).map((si) => {
        const src = si.item || {};
        return {
          id: si.id,
          name: si.name || src.name || "",
          description: src.description || src.desc || "",
          quantity: Number(si.quantity) || 1,
          prices: (src.prices || []).map((p) => ({
            asset: p.asset,
            price: p.price,
          })),
        };
      }),
    };

    try {
      const bs58 = await compress(payload);
      if (bs58) {
        setGeneratedCode(bs58);
      } else {
        setGeneratedCode("Error: failed to produce invoice code");
      }
    } catch (err) {
      console.error("Invoice generation error", err);
      setGeneratedCode("Error generating invoice");
    }
  }, [selectedItems, recipientName, identifier, note, usr]);

  const canSubmit = useMemo(() => {
    const hasRecipientName = (recipientName || "").trim().length > 0;
    const hasIdentifier = (identifier || "").trim().length > 0;
    const hasItems = Array.isArray(selectedItems) && selectedItems.length > 0;
    return hasRecipientName && hasIdentifier && hasItems;
  }, [recipientName, identifier, selectedItems]);

  const ScannerDialog = () => {
    const [scannerOpen, setScannerOpen] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [scannerError, setScannerError] = useState(null);
    const [stopStream, setStopStream] = useState(false);

    return (
      <Dialog
        open={scannerOpen}
        onOpenChange={(open) => {
          setScannerOpen(open);
          if (open) {
            setStopStream(false);
            setScannerError(null);
          } else {
            setStopStream(true);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScannerOpen(true)}
          >
            Scan
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[640px] bg-white">
          <DialogHeader>
            <DialogTitle>Scan barcode</DialogTitle>
            <DialogDescription>
              Point your camera at a barcode to add the corresponding item.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setFacingMode((f) => {
                    const next = f === "environment" ? "user" : "environment";
                    setScannerError(null);
                    if (next !== "environment") setTorchEnabled(false);
                    return next;
                  });
                }}
              >
                {facingMode === "environment" ? "Rear" : "Front"}
              </Button>
              <Button size="sm" onClick={() => setTorchEnabled((v) => !v)}>
                {torchEnabled ? "Torch On" : "Torch Off"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setScannerOpen(false);
                  setStopStream(true);
                  setScannerError(null);
                }}
              >
                Close
              </Button>
            </div>

            <div className="w-full h-[420px] bg-black rounded overflow-hidden">
              {!scannerError ? (
                <BarcodeScanner
                  width={640}
                  height={420}
                  facingMode={facingMode}
                  torch={torchEnabled}
                  stopStream={stopStream}
                  onUpdate={(err, result) => {
                    if (err) {
                      return;
                    }
                    const text =
                      result?.text ??
                      (result && typeof result.getText === "function"
                        ? result.getText()
                        : null);
                    if (text) {
                      // Find matching item by barcode or id
                      const found = items.find((it) => {
                        const bc = it.barcode ?? it.id ?? "";
                        return String(bc) === String(text);
                      });
                      if (found) {
                        setCandidateItem(found);
                        setQtyValue("1");
                        setScannerOpen(false);
                        setStopStream(true);
                        setQtyDialogOpen(true);
                      } else {
                        setScannerError(new Error("Item not found"));
                        setStopStream(true);
                      }
                    }
                  }}
                  onError={(error) => {
                    setScannerError(error);
                    setStopStream(true);
                  }}
                />
              ) : (
                <div className="p-4">
                  <p className="text-sm text-red-600">
                    {String(scannerError?.message || scannerError)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setScannerError(null);
                        setStopStream(false);
                      }}
                    >
                      Retry
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setFacingMode((f) =>
                          f === "environment" ? "user" : "environment"
                        );
                        setScannerError(null);
                        setStopStream(false);
                      }}
                    >
                      Switch
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Row for chosen/selected items
  const ChosenRow = ({ index, style }) => {
    const it = selectedItems[index];
    if (!it) return null;

    return (
      <div style={style} className="px-2">
        <Card>
          <CardContent className="pt-1 pb-1">
            <div className="grid grid-cols-12 items-center gap-2 text-sm">
              <div
                className="col-span-5 truncate mt-1"
                title={`${it.name} full details`}
              >
                <Button
                  variant="outline"
                  onClick={(e) => {
                    // Avoid row click when pressing the remove button
                    setDetailsItem(it.item || it);
                    setDetailsDialogOpen(true);
                  }}
                >
                  {it.name}
                </Button>
              </div>
              <div
                className="col-span-2 text-center mt-1"
                title={`Quantity being purchased: ${it.quantity}`}
              >
                {it.quantity}
              </div>
              <div className="col-span-4 text-center pr-2 mt-1" title="Totals">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      {it.item.prices.length} prices
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[420px] bg-white">
                    <DialogHeader>
                      <DialogTitle>Possible Totals</DialogTitle>
                      <DialogDescription>
                        By paying one of the following asset amounts the invoice
                        payer will have paid the invoice in full for this
                        quantity of this item.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-wrap justify-start gap-1">
                      {it.item.prices.map((p, idx) => {
                        const q = Number(it.quantity) || 1;
                        const total = Number(p.price) * q;
                        const totalStr = Number.isFinite(total)
                          ? total.toString()
                          : "";
                        return (
                          <Badge className="m-2" key={`price-${idx}`}>
                            {totalStr} {p.asset}
                          </Badge>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="col-span-1 text-right mt-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setSelectedItems((prev) =>
                      prev.filter((_, i) => i !== index)
                    );
                  }}
                >
                  ❌
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Row for selectable items in the add dialog
  const SelectableRow = ({ index, style }) => {
    const it = selectableItems[index];
    if (!it) return null;

    const priceLabel = it.unitPrice
      ? String(it.unitPrice)
      : it.prices && it.prices.length
      ? `${it.prices[0].price} ${it.prices[0].asset}`
      : "";

    return (
      <div style={style} className="px-2 cursor-pointer hover:bg-slate-50">
        <Card
          onClick={() => {
            setCandidateItem(it);
            setQtyValue("1");
            setQtyDialogOpen(true);
          }}
        >
          <CardContent className="pt-0 pb-0">
            <div className="grid grid-cols-12 items-center gap-2 py-2 text-sm">
              <div className="col-span-6 truncate mt-1" title={it.name}>
                {it.name}
              </div>
              <div className="col-span-3 text-center mt-1" title="In stock">
                {it.quantity ?? 0}
              </div>
              <div className="col-span-3 text-right pr-2 mt-1" title="Price">
                {priceLabel}
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
          <Card>
            <CardHeader>
              <CardTitle>Invoice generator</CardTitle>
              <CardDescription>
                Select items, provide details then generate an invoice code for
                payers to use.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <HoverInfo
                      content={
                        "This is the account which will receieve funds from the invoice paying user."
                      }
                      header={"Recipient Account"}
                      type="header"
                    />
                    <Input
                      value={`${usr ? `${usr.username} (${usr.id})` : ""}`}
                      readOnly
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <HoverInfo
                      content={
                        "You can define an arbitrary plaintext name for yourself to indicate who is being paid. Must not be a BitShares account name."
                      }
                      header={"Recipient Name"}
                      type="header"
                    />
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <HoverInfo
                  content={
                    "The identifier needs to be used as the memo/message when the request is paid."
                  }
                  header={"Identifier"}
                  type="header"
                />
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="mt-2"
                />
                <HoverInfo
                  content={
                    "You can attach a note to this payment request, this can be any additional information."
                  }
                  header={"Note"}
                  type="header"
                />
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-2"
                />

                {items && items.length ? (
                  <>
                    <Card className="mt-5">
                      <CardHeader>
                        <CardTitle>
                          <div className="grid grid-cols-2">
                            <div>Inventory items</div>
                            <div className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <ScannerDialog />
                                <Dialog
                                  open={addDialogOpen}
                                  onOpenChange={setAddDialogOpen}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      onClick={() => setAddDialogOpen(true)}
                                    >
                                      Add item
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[720px] sm:min-w-[720px] bg-white">
                                    <DialogHeader>
                                      <DialogTitle>Select Item</DialogTitle>
                                      <DialogDescription>
                                        Choose an item to add to this invoice.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid grid-cols-1 gap-3">
                                      <div>
                                        <Input
                                          placeholder="Search inventory..."
                                          value={searchQuery}
                                          onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                          }
                                        />
                                      </div>
                                      <div className="border rounded">
                                        <div className="grid grid-cols-12 text-center text-sm px-2 py-1">
                                          <div className="col-span-6 text-left">
                                            Name
                                          </div>
                                          <div className="col-span-3">
                                            In Stock
                                          </div>
                                          <div className="col-span-3 text-right pr-2">
                                            Price
                                          </div>
                                        </div>
                                        <div className="w-full max-h-[360px] min-h-[360px] overflow-auto">
                                          <List
                                            rowComponent={SelectableRow}
                                            rowCount={selectableItems.length}
                                            rowHeight={55}
                                            rowProps={{}}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="border">
                          <div className="grid grid-cols-12 text-center text-sm px-2 py-1 border-b-2">
                            <div
                              className="col-span-5 text-left"
                              title="The name of the item being bought."
                            >
                              Name
                            </div>
                            <div
                              className="col-span-2"
                              title="Number of units of the item being bought by the invoice payee."
                            >
                              Quantity being bought
                            </div>
                            <div
                              className="col-span-4 text-center pr-2"
                              title="The invoice payee will only pay one of these asset types per item purchased."
                            >
                              Total possible prices
                            </div>
                            <div className="col-span-1"></div>
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
                    <Dialog
                      open={qtyDialogOpen}
                      onOpenChange={setQtyDialogOpen}
                    >
                      <DialogContent className="sm:max-w-[420px] bg-white">
                        <DialogHeader>
                          <DialogTitle>Quantity</DialogTitle>
                          <DialogDescription>
                            How many "{candidateItem?.name}" to add?
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min={1}
                              value={qtyValue}
                              onChange={(e) => setQtyValue(e.target.value)}
                            />
                          </div>
                          <div className="text-right">
                            <Button
                              onClick={() => {
                                const q = Math.max(1, Number(qtyValue) || 1);
                                addSelectedItem(candidateItem, q);
                                setQtyDialogOpen(false);
                                setAddDialogOpen(false);
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog
                      open={detailsDialogOpen}
                      onOpenChange={setDetailsDialogOpen}
                    >
                      <DialogContent className="sm:max-w-[640px] bg-white">
                        <DialogHeader>
                          <DialogTitle>Item Details</DialogTitle>
                          <DialogDescription>
                            Full properties for the selected item.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[420px] overflow-auto text-sm">
                          {detailsItem ? (
                            <div className="grid grid-cols-3 gap-2">
                              {Object.entries(detailsItem).map(([k, v]) => (
                                <React.Fragment key={k}>
                                  <div className="font-medium break-words">
                                    {k}
                                  </div>
                                  <div className="col-span-2 break-words">
                                    {typeof v === "object" ? (
                                      <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(v, null, 2)}
                                      </pre>
                                    ) : (
                                      String(v)
                                    )}
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Folder />
                      </EmptyMedia>
                      <EmptyTitle>No items in inventory yet!</EmptyTitle>
                      <EmptyDescription>
                        You need to create inventory items before an invoice can
                        be generated!
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <div className="text-center">
                        <a href="/invoice_inventory/index.html">
                          <Button>Item Inventory</Button>
                        </a>
                      </div>
                    </EmptyContent>
                  </Empty>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {canSubmit ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={handleGenerateInvoice}>
                      generate invoice
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[720px] sm:min-w-[720px] bg-white">
                    <DialogHeader>
                      <DialogTitle>Generated Invoice</DialogTitle>
                      <DialogDescription>
                        Provide the customer the following invoice code to pay
                        the invoice.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={generatedCode}
                      readOnly
                      className="w-full h-48"
                    />
                    <Button
                      onClick={() => {
                        copyToClipboard(generatedCode);
                      }}
                      className="mt-2"
                    >
                      Copy invoice code to clipboard
                    </Button>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button disabled>Generate invoice</Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
