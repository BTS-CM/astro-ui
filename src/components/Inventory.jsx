import React, { useState, useEffect, useSyncExternalStore } from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $inventoryStorage, addItem } from "@/stores/inventory";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import BarcodeScanner from "react-qr-barcode-scanner";

export default function LTM(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const { _assetsBTS, _assetsTEST, marketSearchBTS, marketSearchTEST } =
    properties;

  const [showDialog, setShowDialog] = useState(false);
  const inventory = useStore($inventoryStorage);
  const items = (inventory && inventory.items) || [];

  const Row = ({ index, style }) => {
    const it = items[index];
    if (!it) return null;
    return (
      <div style={style} key={it.id ?? it.barcode} className="px-2">
        <div className="p-2 border rounded">
          <div className="font-medium">{it.name}</div>
          {it.barcode ? (
            <div className="text-xs">Barcode: {it.barcode}</div>
          ) : null}
          <div className="text-sm mt-1">
            Prices: {it.prices.map((p) => `${p.price} ${p.asset}`).join(" • ")}
          </div>
        </div>
      </div>
    );
  };
  };

  // Form state for dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formBarcode, setFormBarcode] = useState("");
  const [formName, setFormName] = useState("");
  const [formPrices, setFormPrices] = useState([{ asset: "", price: "" }]);
  const [formError, setFormError] = useState("");
  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [stopStream, setStopStream] = useState(false);

  function resetForm() {
    setFormBarcode("");
    setFormName("");
    setFormPrices([{ asset: "", price: "" }]);
    setFormError("");
  }

  function addPriceRow() {
    setFormPrices((p) => [...p, { asset: "", price: "" }]);
  }

  function removePriceRow(index) {
    setFormPrices((p) => p.filter((_, i) => i !== index));
  }

  function updatePriceRow(index, field, value) {
    setFormPrices((p) =>
      p.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function submitForm() {
    setFormError("");
    if (!formName || !formName.trim()) {
      setFormError("Name is required");
      return;
    }
    const prices = [];
    for (const row of formPrices) {
      if (!row.asset || !String(row.asset).trim()) continue;
      const parsed = parseFloat(String(row.price));
      if (Number.isNaN(parsed)) {
        setFormError("All prices must be valid numbers");
        return;
      }
      prices.push({ asset: String(row.asset).trim(), price: parsed });
    }
    if (!prices.length) {
      setFormError("At least one valid price is required");
      return;
    }

    addItem({
      barcode: formBarcode ? String(formBarcode).trim() : undefined,
      name: String(formName).trim(),
      prices,
    });

    // close and reset
    setDialogOpen(false);
    resetForm();
  }

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:w-1/2">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Inventory system</CardTitle>
              <CardDescription>
                Manage your inventory for invoicing users on the blockchain!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No items in inventory.
                  </div>
                ) : (
                  <div className="border rounded border-gray-300 p-2">
                    <div className="w-full max-h-[300px]">
                      <List
                        rowComponent={Row}
                        rowCount={items.length}
                        rowHeight={72}
                        rowProps={{}}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => setDialogOpen(open)}
              >
                <DialogTrigger asChild>
                  <Button>Add item</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[560px] bg-white">
                  <DialogHeader>
                    <DialogTitle>Add inventory item</DialogTitle>
                    <DialogDescription>
                      Provide a barcode (optional), name, and one or more
                      prices.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-2">
                    <div>
                      <label className="text-sm">Barcode (optional)</label>
                      <div className="flex gap-2">
                        <Input
                          value={formBarcode}
                          onChange={(e) => setFormBarcode(e.target.value)}
                        />
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
                            <Button size="sm">Scan barcode</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[640px] bg-white">
                            <DialogHeader>
                              <DialogTitle>Scan barcode</DialogTitle>
                              <DialogDescription>
                                Use your device camera to scan a barcode. Switch camera or toggle torch if available.
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
                                  {facingMode === "environment" ? "Rear camera" : "Front camera"}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setTorchEnabled((v) => !v);
                                  }}
                                >
                                  {torchEnabled ? "Torch on" : "Torch off"}
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
                                        setFormBarcode(text);
                                        setScannerOpen(false);
                                        setStopStream(true);
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
                                      Camera error: {String(
                                        scannerError && scannerError.message
                                          ? scannerError.message
                                          : scannerError
                                      )}
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
                                        Switch camera
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm">Name</label>
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Prices</label>
                        <Button size="sm" onClick={addPriceRow}>
                          Add price
                        </Button>
                      </div>
                      <div className="space-y-2 mt-2">
                        {formPrices.map((row, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-3 gap-2 items-center"
                          >
                            <Input
                              placeholder="Asset (e.g. BTS)"
                              value={row.asset}
                              onChange={(e) =>
                                updatePriceRow(i, "asset", e.target.value)
                              }
                            />
                            <Input
                              placeholder="Price"
                              value={row.price}
                              onChange={(e) =>
                                updatePriceRow(i, "price", e.target.value)
                              }
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removePriceRow(i)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {formError ? (
                      <div className="text-sm text-red-600">{formError}</div>
                    ) : null}

                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={submitForm}>Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
