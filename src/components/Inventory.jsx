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
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { debounce } from "@/lib/common";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  $inventoryStorage,
  addItem,
  $categoriesStorage,
  addCategory,
  removeCategory,
} from "@/stores/inventory";
import { updateItemById, removeItemById } from "@/stores/inventory";

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
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

export default function LTM(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMilliseconds = now - date;
    const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

    if (diffInDays < 1) {
      return t("Smartcoin:today");
    } else if (diffInDays < 30) {
      return t("Smartcoin:daysAgo", { days: diffInDays });
    } else {
      const diffInMonths = Math.floor(diffInDays / 30);
      return t("Smartcoin:monthsAgo", { months: diffInMonths });
    }
  }

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);
  const currentNode = useStore($currentNode);

  const { _assetsBTS, _assetsTEST, _marketSearchBTS, _marketSearchTEST } =
    properties;

  const assets = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain === "bitshares" ? _assetsBTS || [] : _assetsTEST || [];
    }
    return [];
  }, [usr, _assetsBTS, _assetsTEST]);

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);

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

  const inventory = useStore($inventoryStorage);
  const items = (inventory && inventory.items) || [];

  const categoriesObj = useStore($categoriesStorage);
  const categories = (categoriesObj && categoriesObj.categories) || [];

  // Form state for dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formBarcode, setFormBarcode] = useState("");
  const [formName, setFormName] = useState("");
  const [formItemType, setFormItemType] = useState("General");
  const [formDescription, setFormDescription] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formUnitPrice, setFormUnitPrice] = useState("");
  const [formReorderLevel, setFormReorderLevel] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formPrices, setFormPrices] = useState([]);
  const [placeholderPrices, setPlaceholderPrices] = useState({});
  const [formError, setFormError] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const editingItem = useMemo(() => {
    if (!editingItemId) return null;
    return items.find((it) => it.id === editingItemId) || null;
  }, [items, editingItemId]);

  // New state for price dialog
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editingPriceIndex, setEditingPriceIndex] = useState(null);

  const Row = ({ index, style }) => {
    const it = items[index];
    if (!it) return null;
    const [confirmOpen, setConfirmOpen] = useState(false);

    let _name = it.name ?? "";
    if (_name.length > 15) {
      _name = _name.slice(0, 15) + "...";
    }

    let _description = it.description ?? "";
    if (_description.length > 15) {
      _description = _description.slice(0, 15) + "...";
    }

    let _category = it.category ?? "";
    if (_category.length > 15) {
      _category = _category.slice(0, 15) + "...";
    }

    let _location = it.location ?? "";
    if (_location.length > 15) {
      _location = _location.slice(0, 15) + "...";
    }

    let _supplier = it.supplier ?? "";
    if (_supplier.length > 15) {
      _supplier = _supplier.slice(0, 15) + "...";
    }

    return (
      <div style={style} key={it.id ?? it.barcode} className="px-2">
        <Card variant="outline" className="min-h-[50px]">
          <div className="grid grid-cols-11 text-center text-sm">
            <div className="mt-3" title={it.name}>
              {_name}
            </div>
            <div className="mt-3" title={it.description}>
              {_description}
            </div>
            <div className="mt-3" title={it.category}>
              {_category}
            </div>
            <div className="mt-3" title={it.quantity}>
              {it.quantity ?? 0}
            </div>
            <div className="mt-3" title={it.reorderLevel}>
              {it.reorderLevel ?? 0}
            </div>
            <div className="mt-3" title={it.location}>
              {_location}
            </div>
            <div className="mt-3" title={it.supplier}>
              {_supplier}
            </div>
            <div className="mt-3" title={it.unitPrice}>
              {it.unitPrice ?? ""}
            </div>
            <div className="mt-3" title={it.unit}>
              {it.unit ?? ""}
            </div>
            <div>
              <Dialog>
                <DialogTrigger>
                  <Button variant="outline" className="hover:bg-slate-200 mt-1">
                    {`${it.prices.length} ${t("Inventory:prices")}`}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>
                      {t("Inventory:pricesFor", { name: it.name })}
                    </DialogTitle>
                  </DialogHeader>
                  <div>
                    {it.prices && it.prices.length
                      ? it.prices.map((p, i) => (
                          <Badge className="m-2" key={`price-${i}`}>
                            {`${p.price} ${p.asset}`}
                          </Badge>
                        ))
                      : null}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="mt-1"
                variant="outline"
                size="icon"
                onClick={() => {
                  // open dialog in edit mode
                  setEditingItemId(it.id ?? null);
                  setFormBarcode(it.barcode ?? "");
                  setFormName(it.name ?? "");
                  setFormPrices(it.prices ? [...it.prices] : []);
                  setValue(it.category ?? "");
                  setFormDescription(it.description ?? "");
                  setFormQuantity(
                    it.quantity !== undefined ? String(it.quantity) : ""
                  );
                  setFormLocation(it.location ?? "");
                  setFormUnitPrice(it.unitPrice ?? "");
                  setFormReorderLevel(
                    it.reorderLevel !== undefined ? String(it.reorderLevel) : ""
                  );
                  setFormSupplier(it.supplier ?? "");
                  setFormUnit(it.unit ?? "");
                  setDialogOpen(true);
                }}
              >
                🔧
              </Button>
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    className="mt-1"
                    variant="outline"
                    size="icon"
                    onClick={() => setConfirmOpen(true)}
                  >
                    ❌
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("Inventory:deleteItemTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("Inventory:deleteItemDesc", { name: it.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t("Inventory:cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (it.id) {
                          removeItemById(it.id);
                        }
                        setConfirmOpen(false);
                      }}
                    >
                      {t("Inventory:delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const allPriceRowAssets = useMemo(() => {
    const assetsSet = new Set();
    for (const row of formPrices) {
      if (row.asset) {
        assetsSet.add(row.asset);
      }
    }
    return Array.from(assetsSet);
  }, [formPrices]);

  // Price row component for the form (used with react-window)
  const PriceRow = ({ index, style }) => {
    const row = formPrices[index];
    if (!row) return null;

    return (
      <div style={style} className="px-0">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-5">
            <Input
              placeholder={t("Inventory:placeholderPrice")}
              value={placeholderPrices[index] ?? row.price ?? ""}
              disabled
            />
          </div>
          <div className="col-span-5">
            <Input
              placeholder={t("Inventory:placeholderAsset")}
              value={row && row.asset ? row.asset : ""}
              disabled
            />
          </div>
          <div className="col-span-1 text-center">
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setEditingPriceIndex(index);
                setPriceDialogOpen(true);
              }}
            >
              🔧
            </Button>
          </div>
          <div className="col-span-1 text-center">
            <Button
              size="icon"
              variant="outline"
              onClick={() => removePriceRow(index)}
            >
              ❌
            </Button>
          </div>
        </div>
      </div>
    );
  };

  function resetForm() {
    setFormBarcode("");
    setFormName("");
    setFormPrices([]);
    setPlaceholderPrices({});
    setFormError("");
    setFormDescription("");
    setFormQuantity("");
    setFormLocation("");
    setFormUnitPrice("");
    setFormReorderLevel("");
    setFormSupplier("");
    setFormUnit("");
  }

  function addPriceRow() {
    setEditingPriceIndex(null);
    setPriceDialogOpen(true);
  }

  function removePriceRow(index) {
    setFormPrices((p) => p.filter((_, i) => i !== index));
  }

  function updatePriceRow(index, price, asset) {
    const newPrices = [...formPrices];
    if (index !== null && newPrices[index]) {
      // Editing existing price
      newPrices[index] = { price, asset };
    } else {
      // Adding new price
      newPrices.push({ price, asset });
    }
    setFormPrices(newPrices);
  }

  // Debounced enforcement: trim decimals to precision, clamp to max supply (human units)
  const debouncedPriceRowEnforce = useCallback(
    debounce((rawInput, precision, maxSupply, updateCallback) => {
      let p = precision;
      let ms = maxSupply;

      if (p === undefined || p === null) return; // cannot enforce precision

      let value = String(rawInput ?? "").trim();
      if (!value) return;

      // Trim decimal places (no rounding) according to precision
      if (value.includes(".")) {
        const [whole, frac] = value.split(".");
        const trimmed = (frac || "").slice(0, Number(p) || 0);
        value = (Number(p) || 0) > 0 ? `${whole}.${trimmed}` : whole;
      }

      // Clamp against max supply (convert max_supply from base units to human units)
      let maxHuman;
      if (ms !== undefined && ms !== null) {
        const divisor = Math.pow(10, Number(p) || 0);
        const msNum = typeof ms === "string" ? Number(ms) : ms;
        if (Number.isFinite(msNum)) {
          maxHuman = msNum / divisor;
        }
      }

      const num = Number(value);
      if (!Number.isFinite(num)) return;
      let finalVal = value;
      if (maxHuman !== undefined && num > maxHuman) {
        finalVal =
          (Number(p) || 0) > 0
            ? maxHuman.toFixed(Number(p) || 0)
            : String(Math.floor(maxHuman));
      }

      // Prevent negative values (basic safeguard)
      if (num < 0) {
        finalVal = "0";
      }

      updateCallback(finalVal);
    }, 500),
    []
  );

  function submitForm() {
    setFormError("");
    if (!formName || !formName.trim()) {
      setFormError(t("Inventory:validationNameRequired"));
      return;
    }
    const prices = [];
    for (const row of formPrices) {
      if (!row.asset) continue;
      const parsed = parseFloat(String(row.price));
      if (Number.isNaN(parsed)) {
        setFormError(t("Inventory:validationPricesNumbers"));
        return;
      }
      const symbol = String(row.asset);
      prices.push({ asset: String(symbol).trim(), price: parsed });
    }
    if (!prices.length) {
      setFormError(t("Inventory:validationAtLeastOnePrice"));
      return;
    }

    // Validate new fields
    if (formQuantity) {
      const q = Number(formQuantity);
      if (!Number.isFinite(q) || q <= 0) {
        setFormError(t("Inventory:validationQuantityGreater0"));
        return;
      }
    }
    if (formReorderLevel) {
      const r = Number(formReorderLevel);
      if (!Number.isFinite(r) || r < 0) {
        setFormError(t("Inventory:validationReorderLevel"));
        return;
      }
    }

    const payload = {
      barcode: formBarcode ? String(formBarcode).trim() : undefined,
      name: String(formName).trim(),
      category: value || formItemType || "General",
      description: formDescription ? String(formDescription).trim() : undefined,
      quantity: formQuantity ? Number(formQuantity) : undefined,
      location: formLocation ? String(formLocation).trim() : undefined,
      unitPrice: formUnitPrice ? String(formUnitPrice).trim() : undefined,
      reorderLevel: formReorderLevel ? Number(formReorderLevel) : undefined,
      supplier: formSupplier ? String(formSupplier).trim() : undefined,
      unit: formUnit ? String(formUnit).trim() : undefined,
      prices,
    };

    if (editingItemId) {
      // update existing item
      updateItemById(editingItemId, payload);
    } else {
      addItem(payload);
    }

    // close and reset
    setDialogOpen(false);
    setEditingItemId(null);
    resetForm();
  }

  const NewPriceDialog = ({ open, onOpenChange, editIndex }) => {
    const editingPrice = editIndex !== null ? formPrices[editIndex] : undefined;

    const [selectedAsset, setSelectedAsset] = useState(
      editingPrice?.asset || null
    );
    const [inputPrice, setInputPrice] = useState(editingPrice?.price || "");

    useEffect(() => {
      if (open) {
        const priceToEdit =
          editIndex !== null ? formPrices[editIndex] : undefined;
        setInputPrice(priceToEdit?.price || "");
        setSelectedAsset(priceToEdit?.asset || null);
      }
    }, [open, editIndex]);

    const chosenAssetData = useMemo(() => {
      return selectedAsset && assets
        ? assets.find((a) => a.symbol === selectedAsset)
        : null;
    }, [selectedAsset, assets]);

    const assetPrecision = useMemo(() => {
      if (!chosenAssetData) return;
      return chosenAssetData.precision;
    }, [chosenAssetData]);

    const assetMaxSupply = useMemo(() => {
      if (!chosenAssetData) return;
      return chosenAssetData.max_supply;
    }, [chosenAssetData]);

    const handleSubmit = () => {
      if (selectedAsset && inputPrice) {
        updatePriceRow(editIndex, parseFloat(inputPrice), selectedAsset);
        onOpenChange(false);
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[375px] bg-white">
          <DialogHeader>
            <DialogTitle>
              {editIndex !== null
                ? t("Inventory:editPrice")
                : t("Inventory:addPrice")}
            </DialogTitle>
            <DialogDescription>
              {t("Inventory:priceDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3">
            <div className="col-span-2">
              <Input
                placeholder={t("Inventory:placeholderPrice")}
                value={inputPrice ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setInputPrice(val);
                  debouncedPriceRowEnforce(
                    val,
                    assetPrecision,
                    assetMaxSupply,
                    setInputPrice
                  );
                }}
                disabled={!selectedAsset}
              />
            </div>
            <div className="text-center">
              <AssetDropDown
                assetSymbol={selectedAsset ?? ""}
                assetData={chosenAssetData}
                otherAssets={allPriceRowAssets ?? []}
                storeCallback={(sym) => setSelectedAsset(sym)}
                marketSearch={marketSearch}
                type={"quote"}
                size="small"
                chain={usr && usr.chain ? usr.chain : "bitshares"}
                balances={balances}
              />
            </div>
            <div className="col-span-3 text-left mt-4">
              <Button size="sm" onClick={handleSubmit}>
                {t("Inventory:submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const ScannerDialog = () => {
    // Scanner state
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
          <Button size="sm">{t("Inventory:scanBarcodeTrigger")}</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[640px] bg-white">
          <DialogHeader>
            <DialogTitle>{t("Inventory:scanBarcodeTitle")}</DialogTitle>
            <DialogDescription>
              {t("Inventory:scanBarcodeDesc")}
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
                {facingMode === "environment"
                  ? t("Inventory:rearCamera")
                  : t("Inventory:frontCamera")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setTorchEnabled((v) => !v);
                }}
              >
                {torchEnabled
                  ? t("Inventory:torchOn")
                  : t("Inventory:torchOff")}
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
                {t("Inventory:close")}
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
                    {t("Inventory:cameraError")}{" "}
                    {String(
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
                      {t("Inventory:retry")}
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
                      {t("Inventory:switchCamera")}
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

  const [categoryPopoverOpen, setCategoryPopoverOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  const storedItemCategories = useMemo(() => {
    return categories && categories.length ? categories : ["General"];
  }, [categories]);

  const NewItemTypeDialog = () => {
    const [newItemType, setNewItemType] = useState("");
    const [open, setOpen] = useState(false);

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => setOpen(true)}>
            {t("Inventory:addCategory")}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{t("Inventory:addNewItemType")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={newItemType}
              onChange={(e) => setNewItemType(e.target.value)}
            />
            <Button
              onClick={() => {
                submitNewItemType(newItemType, setOpen);
              }}
            >
              {t("Inventory:submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  function submitNewItemType(name, setOpen) {
    const n = (name || "").trim();
    if (!n) {
      alert(t("Inventory:provideNonEmptyType"));
      return;
    }
    const added = addCategory(n);
    if (!added) {
      alert(t("Inventory:categoryExistsOrInvalid"));
      return;
    }
    // do not automatically select the newly added category; just close dialog
    if (typeof setOpen === "function") setOpen(false);
  }

  const DeleteItemTypeDialog = () => {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState("");
    const [popoverOpenLocal, setPopoverOpenLocal] = useState(false);

    const selectedCount = useMemo(() => {
      if (!selected) return 0;
      return items.filter((it) => it.category === selected).length;
    }, [selected, items]);

    function handleDelete() {
      if (!selected) return;
      if (selectedCount > 0) {
        alert(
          t("Inventory:cannotDeleteCategoryInUse", {
            selected,
            count: selectedCount,
          })
        );
        return;
      }
      const removed = removeCategory(selected);
      if (removed) {
        setSelected("");
        setOpen(false);
      } else {
        alert(t("Inventory:failedToRemoveCategory"));
      }
    }

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            {t("Inventory:deleteType")}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{t("Inventory:deleteItemType")}</DialogTitle>
            <DialogDescription>
              {t("Inventory:deleteItemTypeDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <label className="text-sm">{t("Inventory:itemType")}</label>
              <div>
                <Popover
                  open={popoverOpenLocal}
                  onOpenChange={setPopoverOpenLocal}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={popoverOpenLocal}
                      className="w-[200px] justify-between"
                    >
                      {selected ? selected : t("Inventory:selectCategory")}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput
                        placeholder={t("Inventory:searchCategory")}
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>
                          {t("Inventory:noCategoryFound")}
                        </CommandEmpty>
                        <CommandGroup>
                          {storedItemCategories.map((cat) => (
                            <CommandItem
                              key={cat}
                              value={cat}
                              onSelect={(currentValue) => {
                                setSelected(
                                  currentValue === selected ? "" : currentValue
                                );
                                setPopoverOpenLocal(false);
                              }}
                            >
                              {cat}
                              <Check
                                className={cn(
                                  "ml-auto",
                                  selected === cat ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <div className="text-sm">
                {selected ? (
                  <>
                    {t("Inventory:itemsUsing", {
                      selected,
                      count: selectedCount,
                    })}
                  </>
                ) : (
                  t("Inventory:noTypeSelected")
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("Inventory:cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!selected || selectedCount > 0}
              >
                {t("Inventory:delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("Inventory:title")}</CardTitle>
              <CardDescription>{t("Inventory:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {t("Inventory:noItems")}
                  </div>
                ) : (
                  <div className="border rounded border-gray-300 p-2">
                    <div className="grid grid-cols-11 text-center">
                      <div>{t("Inventory:headerName")}</div>
                      <div>{t("Inventory:headerDescription")}</div>
                      <div>{t("Inventory:headerCategory")}</div>
                      <div>{t("Inventory:headerQuantity")}</div>
                      <div>{t("Inventory:headerReorderAt")}</div>
                      <div>{t("Inventory:headerLocation")}</div>
                      <div>{t("Inventory:headerSupplier")}</div>
                      <div>{t("Inventory:headerUnitPrice")}</div>
                      <div>{t("Inventory:headerUnits")}</div>
                      <div>{t("Inventory:headerPrices")}</div>
                    </div>
                    <div className="w-full max-h-[500px] min-h-[500px] overflow-auto">
                      <List
                        rowComponent={Row}
                        rowCount={items.length}
                        rowHeight={60}
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
                  <Button
                    onClick={() => {
                      // Ensure add-item opens with a fresh form (clear any edit state)
                      resetForm();
                      setEditingItemId(null);
                      setValue("");
                      setCategoryPopoverOpen(false);
                      setDialogOpen(true);
                    }}
                  >
                    {t("Inventory:addItem")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[720px] sm:min-w-[720px] bg-white">
                  <DialogHeader>
                    <DialogTitle>{t("Inventory:addInventoryItem")}</DialogTitle>
                    <DialogDescription>
                      {t("Inventory:addItemDesc")}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-2">
                    <div>
                      <label className="text-sm">
                        {t("Inventory:labelBarcodeOptional")}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={formBarcode}
                          onChange={(e) => setFormBarcode(e.target.value)}
                        />
                        <ScannerDialog />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm">
                        {t("Inventory:labelItemName")}
                      </label>
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm">
                        {t("Inventory:labelDescriptionOptional")}
                      </label>
                      <Input
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder={t("Inventory:placeholderShortDescription")}
                      />
                    </div>

                    <div>
                      <label className="text-sm">
                        {t("Inventory:labelItemType")}
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-2">
                          <Popover
                            open={categoryPopoverOpen}
                            onOpenChange={setCategoryPopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={categoryPopoverOpen}
                                className="w-full justify-between"
                              >
                                {value ? value : t("Inventory:selectCategory")}
                                <ChevronsUpDown className="opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                              <Command>
                                <CommandInput
                                  placeholder={t("Inventory:searchCategory")}
                                  className="h-9"
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {t("Inventory:noCategoryFound")}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {storedItemCategories.map((cat) => (
                                      <CommandItem
                                        key={cat}
                                        value={cat}
                                        onSelect={(currentValue) => {
                                          setValue(
                                            currentValue === value
                                              ? ""
                                              : currentValue
                                          );
                                          setCategoryPopoverOpen(false);
                                        }}
                                      >
                                        {cat}
                                        <Check
                                          className={cn(
                                            "ml-auto",
                                            value === cat
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <NewItemTypeDialog />
                        <DeleteItemTypeDialog />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-sm">
                          {t("Inventory:labelQuantity")}
                        </label>
                        <Input
                          type="number"
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(e.target.value)}
                          placeholder={t("Inventory:placeholderZero")}
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="text-sm">
                          {t("Inventory:labelUnit")}
                        </label>
                        <Input
                          value={formUnit}
                          onChange={(e) => setFormUnit(e.target.value)}
                          placeholder={t("Inventory:placeholderUnitExample")}
                        />
                      </div>
                      <div>
                        <label className="text-sm">
                          {t("Inventory:labelUnitPrice")}
                        </label>
                        <Input
                          value={formUnitPrice}
                          onChange={(e) => setFormUnitPrice(e.target.value)}
                          placeholder={t(
                            "Inventory:placeholderUnitPriceExample"
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-sm">
                          {t("Inventory:labelReorderLevel")}
                        </label>
                        <Input
                          type="number"
                          value={formReorderLevel}
                          onChange={(e) => setFormReorderLevel(e.target.value)}
                          placeholder={t("Inventory:placeholderZero")}
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="text-sm">
                          {t("Inventory:labelSupplier")}
                        </label>
                        <Input
                          value={formSupplier}
                          onChange={(e) => setFormSupplier(e.target.value)}
                          placeholder={t("Inventory:placeholderSupplierName")}
                        />
                      </div>
                      <div>
                        <label className="text-sm">
                          {t("Inventory:labelLocation")}
                        </label>
                        <Input
                          value={formLocation}
                          onChange={(e) => setFormLocation(e.target.value)}
                          placeholder={t("Inventory:placeholderLocation")}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm">
                          {t("Inventory:labelPrices")}
                        </label>
                        <Button
                          variant="outline"
                          className="ml-3 mt-1"
                          onClick={addPriceRow}
                        >
                          {t("Inventory:addPrice")}
                        </Button>
                      </div>
                      <div className="space-y-2 mt-2">
                        <div className="w-full max-h-[300px] min-h-[300px] overflow-auto">
                          <List
                            rowComponent={PriceRow}
                            rowCount={formPrices.length}
                            rowHeight={48}
                            rowProps={{}}
                          />
                        </div>
                      </div>
                    </div>

                    {formError ? (
                      <div className="text-sm text-red-600">{formError}</div>
                    ) : null}

                    <div className="grid grid-cols-2">
                      {editingItem && editingItem.lastModified ? (
                        <div className="text-sm text-muted-foreground text-left mb-2">
                          {t("Inventory:lastModified")}:{" "}
                          {timeAgo(editingItem.lastModified)}
                        </div>
                      ) : (
                        <div></div>
                      )}
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDialogOpen(false);
                            resetForm();
                          }}
                        >
                          {t("Inventory:cancel")}
                        </Button>
                        <Button onClick={submitForm}>
                          {t("Inventory:save")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <NewPriceDialog
                open={priceDialogOpen}
                onOpenChange={setPriceDialogOpen}
                editIndex={editingPriceIndex}
              />
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
