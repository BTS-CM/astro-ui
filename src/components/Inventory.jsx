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
import {
  Check,
  ChevronsUpDown,
  Package,
  Pencil,
  Trash2,
  Plus,
  ScanBarcode,
} from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { debounce, assetAmountRegex } from "@/lib/common";

import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import BarcodeScanner from "react-qr-barcode-scanner";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

export default function Inventory(properties) {
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
  const currentNodeUrl = useStore($currentNodeUrl);

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
        <Card className="min-h-[50px] rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.03)] hover:shadow-md hover:shadow-[color:hsl(var(--accent-1)/0.05)] transition-all">
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
                  <Button variant="outline" className="hover:bg-accent mt-1">
                    {`${it.prices.length} ${t("Inventory:prices")}`}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card">
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
            <div className="flex items-center gap-1.5">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-8 w-8 rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-all"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
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
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-card border-border text-foreground/85">
                    <p>{t("LimitOrderCard:editLabel")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    className="h-8 w-8 rounded-lg border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] hover:border-[hsl(var(--accent-2)/0.5)] transition-all"
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card">
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
                      className="bg-[hsl(var(--accent-2))] hover:bg-[hsl(var(--accent-2))] text-[hsl(var(--accent-2-gradFg))]"
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

  const SmallRow = ({ index, style }) => {
    const it = items[index];
    if (!it) return null;
    const [confirmOpen, setConfirmOpen] = useState(false);

    let _name = it.name ?? "";
    if (_name.length > 30) {
      _name = _name.slice(0, 30) + "...";
    }

    let _description = it.description ?? "";
    if (_description.length > 30) {
      _description = _description.slice(0, 30) + "...";
    }

    let _category = it.category ?? "";
    if (_category.length > 30) {
      _category = _category.slice(0, 30) + "...";
    }

    let _location = it.location ?? "";
    if (_location.length > 30) {
      _location = _location.slice(0, 30) + "...";
    }

    let _supplier = it.supplier ?? "";
    if (_supplier.length > 30) {
      _supplier = _supplier.slice(0, 30) + "...";
    }

    return (
      <div style={style} key={it.id ?? it.barcode} className="px-2">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="min-h-[50px] rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 hover:border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.03)] hover:shadow-md hover:shadow-[color:hsl(var(--accent-1)/0.05)] transition-all cursor-pointer">
              <div className="grid grid-cols-3 text-center text-sm">
                <div className="mt-3" title={it.name}>
                  {_name}
                </div>
                <div className="mt-3" title={it.description}>
                  {_description}
                </div>
                <div className="mt-3" title={it.quantity}>
                  {it.quantity ?? 0}
                </div>
              </div>
            </Card>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-3)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                  <Package className="h-4 w-4" />
                </span>
                {_name}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="rounded-lg border border-border/60 bg-card/40 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      {t("Inventory:headerDescription")}
                    </div>
                    <div>{_description}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      {t("Inventory:headerCategory")}
                    </div>
                    <div>{_category}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/40 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      {t("Inventory:headerQuantity")}
                    </div>
                    <div className="font-semibold">{it.quantity ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      {t("Inventory:headerReorderAt")}
                    </div>
                    <div>{it.reorderLevel ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      {t("Inventory:headerUnitPrice")}
                    </div>
                    <div>{it.unitPrice ?? ""}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/40 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      {t("Inventory:headerLocation")}
                    </div>
                    <div>{_location}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      {t("Inventory:headerSupplier")}
                    </div>
                    <div>{_supplier}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                  {t("Inventory:headerPrices")}:{" "}
                </div>
                <Dialog>
                  <DialogTrigger>
                    <Button
                      variant="outline"
                      className="hover:bg-accent mt-1"
                    >
                      {`${it.prices.length} ${t("Inventory:prices")}`}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
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
              <div className="flex items-center gap-1.5">
                <Button
                  className="h-8 w-8 rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-all"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
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
                      it.reorderLevel !== undefined
                        ? String(it.reorderLevel)
                        : ""
                    );
                    setFormSupplier(it.supplier ?? "");
                    setFormUnit(it.unit ?? "");
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="h-8 w-8 rounded-lg border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] hover:border-[hsl(var(--accent-2)/0.5)] transition-all"
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card">
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
                        className="bg-[hsl(var(--accent-2))] hover:bg-[hsl(var(--accent-2))] text-[hsl(var(--accent-2-gradFg))]"
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
          </DialogContent>
        </Dialog>
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
              variant="ghost"
              className="h-8 w-8 rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] transition-all"
              onClick={() => {
                setEditingPriceIndex(index);
                setPriceDialogOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="col-span-1 text-center">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:bg-[hsl(var(--accent-2)/0.2)] hover:border-[hsl(var(--accent-2)/0.5)] transition-all"
              onClick={() => removePriceRow(index)}
            >
              <Trash2 className="h-3.5 w-3.5" />
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

  // Debounced enforcement: clamp to max supply (human units)
  const debouncedPriceRowEnforce = useCallback(
    debounce((rawInput, maxSupply, updateCallback) => {
      let ms = maxSupply;

      let value = String(rawInput ?? "").trim();
      if (!value) return;

      // Clamp against max supply (convert max_supply from base units to human units)
      let maxHuman;
      if (ms !== undefined && ms !== null) {
        const p = value.includes(".") ? (value.split(".")[1] || "").length : 0;
        const divisor = Math.pow(10, p);
        const msNum = typeof ms === "string" ? Number(ms) : ms;
        if (Number.isFinite(msNum)) {
          maxHuman = msNum / divisor;
        }
      }

      const num = Number(value);
      if (!Number.isFinite(num)) return;
      let finalVal = value;
      if (maxHuman !== undefined && num > maxHuman) {
        const p = value.includes(".") ? (value.split(".")[1] || "").length : 0;
        finalVal =
          p > 0
            ? maxHuman.toFixed(p)
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
        <DialogContent className="sm:max-w-[375px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-3)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                <Plus className="h-4 w-4" />
              </span>
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
                inputMode="decimal"
                onChange={(e) => {
                  const input = e.target.value;
                  const regex = assetAmountRegex(chosenAssetData);
                  if (regex.test(input)) {
                    setInputPrice(input);
                    debouncedPriceRowEnforce(
                      input,
                      assetMaxSupply,
                      setInputPrice
                    );
                  }
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
              <Button
                size="sm"
                onClick={handleSubmit}
                className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] transition-all"
              >
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
        <DialogContent className="sm:max-w-[640px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-3)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                <ScanBarcode className="h-4 w-4" />
              </span>
              {t("Inventory:scanBarcodeTitle")}
            </DialogTitle>
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

            <div className="w-full h-[420px] bg-background rounded overflow-hidden">
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
                  <p className="text-sm text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))]">
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
          <Button
            onClick={() => setOpen(true)}
            className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]"
            variant="outline"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("Inventory:addCategory")}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-3)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                <Plus className="h-4 w-4" />
              </span>
              {t("Inventory:addNewItemType")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={newItemType}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[^a-zA-Z0-9 _-]/g, "");
                setNewItemType(sanitized);
              }}
              onKeyDown={(e) => {
                const allowed = /[a-zA-Z0-9 _-]/;
                const ctrlKeys = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"];
                if (ctrlKeys.includes(e.key) || (e.ctrlKey || e.metaKey)) return;
                if (!allowed.test(e.key)) e.preventDefault();
              }}
              maxLength={50}
              className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
            />
            <Button
              onClick={() => {
                submitNewItemType(newItemType, setOpen);
              }}
              className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] border-0"
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
        if (selected === value) {
          const remaining = storedItemCategories.filter((c) => c !== selected);
          setValue(remaining.length ? remaining[0] : "");
        }
        setSelected("");
        setOpen(false);
      } else {
        alert(t("Inventory:failedToRemoveCategory"));
      }
    }

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" onClick={() => setOpen(true)} className="shadow-sm">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {t("Inventory:deleteType")}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-2)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-danger)/0.2)] dark:text-[hsl(var(--accent-2-gradFg))] text-[hsl(var(--accent-2-gradFg))]">
                <Trash2 className="h-4 w-4" />
              </span>
              {t("Inventory:deleteItemType")}
            </DialogTitle>
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
              <Button variant="outline" onClick={() => setOpen(false)} className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]">
                {t("Inventory:cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!selected || selectedCount > 0}
                className="shadow-sm"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
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
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.1)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <CardHeader className="p-0 mb-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-3)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] flex-shrink-0 shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                  <Package className="h-4.5 w-4.5" strokeWidth={2.25} />
                </span>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                    {t("Inventory:title")}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/70 mt-0.5">
                    {t("Inventory:description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-3)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                      <Package className="h-6 w-6" strokeWidth={1.75} />
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {t("Inventory:noItems")}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/40 p-3">
                    <div className="grid grid-cols-3 lg:grid-cols-11 text-center">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{t("Inventory:headerName")}</div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{t("Inventory:headerDescription")}</div>
                      <div className="hidden lg:block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        {t("Inventory:headerCategory")}
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{t("Inventory:headerQuantity")}</div>
                      <div className="hidden lg:block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        {t("Inventory:headerReorderAt")}
                      </div>
                      <div className="hidden lg:block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        {t("Inventory:headerLocation")}
                      </div>
                      <div className="hidden lg:block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        {t("Inventory:headerSupplier")}
                      </div>
                      <div className="hidden lg:block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        {t("Inventory:headerUnitPrice")}
                      </div>
                      <div className="hidden lg:block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        {t("Inventory:headerUnits")}
                      </div>
                      <div className="hidden lg:block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        {t("Inventory:headerPrices")}
                      </div>
                    </div>
                    <div className="w-full max-h-[500px] min-h-[500px] overflow-auto">
                      <div className="hidden lg:block">
                        <List
                          rowComponent={Row}
                          rowCount={items.length}
                          rowHeight={60}
                          rowProps={{}}
                        />
                      </div>
                      <div className="block lg:hidden">
                        <List
                          rowComponent={SmallRow}
                          rowCount={items.length}
                          rowHeight={60}
                          rowProps={{}}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <div className="px-0 pb-0 pt-4">
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => setDialogOpen(open)}
              >
                <DialogTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] transition-all"
                    onClick={() => {
                      resetForm();
                      setEditingItemId(null);
                      setValue("");
                      setCategoryPopoverOpen(false);
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t("Inventory:addItem")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[720px] sm:min-w-[720px] bg-card">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-3)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                        <Package className="h-4 w-4" />
                      </span>
                      {t("Inventory:addInventoryItem")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("Inventory:addItemDesc")}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-3">
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5 block">
                        {t("Inventory:labelBarcodeOptional")}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={formBarcode}
                          onChange={(e) => setFormBarcode(e.target.value)}
                          className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                        />
                        <ScannerDialog />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5 block">
                        {t("Inventory:labelItemName")}
                      </label>
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5 block">
                        {t("Inventory:labelDescriptionOptional")}
                      </label>
                      <Input
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder={t("Inventory:placeholderShortDescription")}
                        className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5 block">
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
                                className="w-full justify-between border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.1)]"
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
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5 block">
                          {t("Inventory:labelQuantity")}
                        </label>
                        <Input
                          type="number"
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(e.target.value)}
                          placeholder={t("Inventory:placeholderZero")}
                          min={0}
                          className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5 block">
                          {t("Inventory:labelUnit")}
                        </label>
                        <Input
                          value={formUnit}
                          onChange={(e) => setFormUnit(e.target.value)}
                          placeholder={t("Inventory:placeholderUnitExample")}
                          className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5 block">
                          {t("Inventory:labelUnitPrice")}
                        </label>
                        <Input
                          value={formUnitPrice}
                          onChange={(e) => setFormUnitPrice(e.target.value)}
                          placeholder={t(
                            "Inventory:placeholderUnitPriceExample"
                          )}
                          className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5 block">
                          {t("Inventory:labelReorderLevel")}
                        </label>
                        <Input
                          type="number"
                          value={formReorderLevel}
                          onChange={(e) => setFormReorderLevel(e.target.value)}
                          placeholder={t("Inventory:placeholderZero")}
                          min={0}
                          className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5 block">
                          {t("Inventory:labelSupplier")}
                        </label>
                        <Input
                          value={formSupplier}
                          onChange={(e) => setFormSupplier(e.target.value)}
                          placeholder={t("Inventory:placeholderSupplierName")}
                          className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5 block">
                          {t("Inventory:labelLocation")}
                        </label>
                        <Input
                          value={formLocation}
                          onChange={(e) => setFormLocation(e.target.value)}
                          placeholder={t("Inventory:placeholderLocation")}
                          className="focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 block">
                          {t("Inventory:labelPrices")}
                        </label>
                        <Button
                          variant="outline"
                          className="ml-3 mt-1 border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))]"
                          onClick={addPriceRow}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
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
                      <div className="rounded-lg border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] px-3 py-2 text-sm text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))]">{formError}</div>
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
                          className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)]"
                        >
                          {t("Inventory:cancel")}
                        </Button>
                        <Button
                          onClick={submitForm}
                          className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] transition-all"
                        >
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
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
