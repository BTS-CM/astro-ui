// src/components/CustomAuthority/ArgumentInputs.jsx - Reverted i18n, Using AssetDropDownCard

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js"; // Use standard import
import BigNumber from "bignumber.js";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TrashIcon, PlusIcon } from "@radix-ui/react-icons";
import AccountSearch from "../AccountSearch.jsx";
import AssetDropDownCard from "../Market/AssetDropDownCard.jsx";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

// Helper for BigNumber validation
export const isValidIntegerString = (value) => /^-?\d+$/.test(value);

// --- Basic Inputs ---

export const VoidInput = ({ field }) => {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  return (
    <Input
      disabled
      value={t("CustomAuthority:argumentVoid")}
      className="w-full bg-gray-100 cursor-not-allowed"
    />
  ); // Namespaced key
};

export const BooleanInput = ({ field, restrictionType }) => {
  const isLtm = restrictionType === 9;
  return (
    <Checkbox
      checked={isLtm ? true : !!field.value}
      onCheckedChange={isLtm ? undefined : field.onChange}
      disabled={isLtm}
      id={field.name}
    />
  );
};

export const StringInput = ({ field, placeholder = "Enter text" }) => {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  return (
    <Input
      type="text"
      placeholder={
        placeholder || t("CustomAuthority:argumentPlaceholderString")
      }
      {...field}
    />
  ); // Namespaced key
};

export const IntegerInput = ({ field, placeholder = "Enter number" }) => {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  return (
    <Input
      type="number"
      step="1"
      placeholder={
        placeholder || t("CustomAuthority:argumentPlaceholderInteger")
      } // Namespaced key
      {...field}
      value={field.value ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        field.onChange(val === "" ? "" : parseInt(val, 10) || 0);
      }}
    />
  );
};

// --- Amount Input (share_type) ---
export const AmountInput = ({ field, asset, placeholder = "Enter amount" }) => {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const [displayValue, setDisplayValue] = useState("");
  const [error, setError] = useState("");
  const precision = asset?.precision ?? 0;

  useEffect(() => {
    if (field.value && isValidIntegerString(field.value)) {
      try {
        const bnValue = new BigNumber(field.value);
        const formatted =
          precision > 0
            ? bnValue.shiftedBy(-precision).toFixed(precision)
            : bnValue.toFixed(0);
        setDisplayValue(formatted);
        setError("");
      } catch (e) {
        setError(t("CustomAuthority:errorInvalidAmountFormat")); // Namespaced key
        setDisplayValue("");
      }
    } else if (
      field.value === "0" ||
      field.value === null ||
      field.value === undefined ||
      field.value === ""
    ) {
      setDisplayValue(field.value === "0" ? "0" : "");
      setError("");
    } else {
      setError(t("CustomAuthority:errorInvalidAmountFormat")); // Namespaced key
      setDisplayValue("");
    }
  }, [field.value, precision, t]);

  const handleAmountChange = (event) => {
    const inputStr = event.target.value;
    setDisplayValue(inputStr);

    if (inputStr === "" || inputStr === "-") {
      field.onChange("0");
      setError("");
      return;
    }

    try {
      const bnValue = new BigNumber(inputStr);
      if (bnValue.isNaN()) throw new Error("Invalid number");
      if (bnValue.decimalPlaces() > precision) {
        setError(t("CustomAuthority:errorTooManyDecimals", { precision })); // Namespaced key
        return;
      }

      const integerString = bnValue
        .shiftedBy(precision)
        .integerValue(BigNumber.ROUND_FLOOR)
        .toFixed();
      const minInt64 = new BigNumber("-9223372036854775808");
      const maxInt64 = new BigNumber("9223372036854775807");
      const currentBnInt = new BigNumber(integerString);

      if (
        currentBnInt.isLessThan(minInt64) ||
        currentBnInt.isGreaterThan(maxInt64)
      ) {
        setError(t("CustomAuthority:errorAmountOutOfRange")); // Namespaced key
        return;
      }

      field.onChange(integerString);
      setError("");
    } catch (e) {
      setError(t("CustomAuthority:errorInvalidAmountFormat")); // Namespaced key
    }
  };

  return (
    <div>
      <Input
        type="text"
        inputMode="decimal"
        placeholder={
          placeholder || t("CustomAuthority:argumentPlaceholderAmount")
        } // Namespaced key
        value={displayValue}
        onChange={handleAmountChange}
        className={error ? "border-red-500" : ""}
      />
      {error && (
        <Alert variant="destructive" className="mt-1 p-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      {!error && asset && (
        <p className="text-xs text-muted-foreground mt-1">
          {t("CustomAuthority:amountPrecisionInfo", {
            symbol: asset.symbol,
            precision: precision,
          })}
        </p>
      )}{" "}
      {/* Namespaced key */}
    </div>
  );
};

// --- Time Point Sec Input ---
export const TimePointSecInput = ({ field }) => (
  <DateTimePicker
    granularity="second"
    value={field.value instanceof Date ? field.value : null}
    onChange={field.onChange}
  />
);

// --- ID Inputs (Account/Asset) ---
export const AccountIdInput = ({ field, chain }) => {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const [isOpen, setIsOpen] = useState(false);
  const currentId = field.value || "";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder={t("CustomAuthority:argumentPlaceholderAccountID")} // Namespaced key
          value={currentId}
          readOnly
          className={`flex-1 ${
            currentId ? "" : "italic text-muted-foreground"
          } cursor-pointer`}
          onClick={() => setIsOpen(true)}
        />
        {/* Keep trigger separate for clarity */}
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            {t("CustomAuthority:selectAccountButton")}
          </Button>{" "}
          {/* Namespaced key */}
        </DialogTrigger>
      </div>
      <DialogContent className="sm:max-w-[375px] bg-white">
        <DialogHeader>
          <DialogTitle>{t("CustomAuthority:accountSearchTitle")}</DialogTitle>{" "}
          {/* Namespaced key */}
        </DialogHeader>
        <AccountSearch
          chain={chain}
          excludedUsers={[]}
          setChosenAccount={(account) => {
            if (account) field.onChange(account.id);
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

// --- AssetIdInput using AssetDropDownCard ---
export const AssetIdInput = ({ field, chain, assets }) => {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentId = field.value || "";
  const currentAsset = useMemo(
    () => assets?.find((a) => a.id === currentId),
    [assets, currentId]
  );
  const displayValue = currentAsset
    ? `${currentAsset.symbol} (${currentId})`
    : t("CustomAuthority:argumentPlaceholderAssetID"); // Namespaced key

  return (
    <div className="flex items-center space-x-2">
      <Input
        type="text"
        value={currentId ? `${currentAsset?.symbol ?? "?"} (${currentId})` : ""}
        placeholder={t("CustomAuthority:argumentPlaceholderAssetID")} // Namespaced key
        readOnly
        disabled
        className="flex-1"
      />
      <AssetDropDownCard
        asset={currentId}
        assets={assets}
        chain={chain}
        type={"input"}
        className="flex-shrink-0"
        includeBTS={true}
        includeBitAssets={true}
        includePredictionMarkets={false}
        selectCallback={(selectedAsset) => {
          if (selectedAsset?.id) field.onChange(selectedAsset.id);
        }}
      />
    </div>
  );
};

// --- Flat Set Inputs ---
export const FlatSetAccountIdInput = ({ field, chain }) => {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const [items, setItems] = useState(() =>
    Array.isArray(field.value) ? field.value : []
  );
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (
      Array.isArray(field.value) &&
      JSON.stringify(field.value) !== JSON.stringify(items)
    )
      setItems(field.value);
    else if (!Array.isArray(field.value) && items.length > 0) setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.value]);

  const handleAdd = (account) => {
    if (account && !items.includes(account.id)) {
      const newItems = [...items, account.id].sort();
      setItems(newItems);
      field.onChange(newItems);
    }
    setSearchOpen(false);
  };
  const handleRemove = (idToRemove) => {
    const newItems = items.filter((id) => id !== idToRemove);
    setItems(newItems);
    field.onChange(newItems);
  };

  return (
    <div className="space-y-2 p-2 border rounded bg-slate-50">
      <Label className="text-sm font-medium">
        {t("CustomAuthority:accountAllowBlockList")}
      </Label>{" "}
      {/* Namespaced key */}
      <div className="max-h-32 overflow-y-auto space-y-1 pr-1 bg-white border rounded p-1 min-h-[3rem]">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground p-1">
            {t("CustomAuthority:listEmpty")}
          </p>
        )}{" "}
        {/* Namespaced key */}
        {items.map((id) => (
          <div
            key={id}
            className="flex items-center justify-between bg-gray-100 p-1 rounded text-xs"
          >
            <span className="truncate" title={id}>
              {id}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="p-0 h-4 w-4 flex-shrink-0"
              onClick={() => handleRemove(id)}
            >
              <TrashIcon className="h-3 w-3 text-red-500 hover:text-red-700" />
            </Button>
          </div>
        ))}
      </div>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />{" "}
            {t("CustomAuthority:addAccountToList")}
          </Button>
        </DialogTrigger>{" "}
        {/* Namespaced key */}
        <DialogContent className="sm:max-w-[375px] bg-white">
          <DialogHeader>
            <DialogTitle>{t("CustomAuthority:accountSearchTitle")}</DialogTitle>
          </DialogHeader>
          <AccountSearch
            chain={chain}
            excludedUsers={items}
            setChosenAccount={handleAdd}
          />
        </DialogContent>{" "}
        {/* Namespaced key */}
      </Dialog>
    </div>
  );
};

export const FlatSetAssetIdInput = ({ field, chain, assets }) => {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const [items, setItems] = useState(() =>
    Array.isArray(field.value) ? field.value : []
  );

  useEffect(() => {
    if (
      Array.isArray(field.value) &&
      JSON.stringify(field.value) !== JSON.stringify(items)
    )
      setItems(field.value);
    else if (!Array.isArray(field.value) && items.length > 0) setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.value]);

  const handleAdd = (asset) => {
    if (asset && asset.id && !items.includes(asset.id)) {
      const newItems = [...items, asset.id].sort();
      setItems(newItems);
      field.onChange(newItems);
    }
  };
  const handleRemove = (idToRemove) => {
    const newItems = items.filter((id) => id !== idToRemove);
    setItems(newItems);
    field.onChange(newItems);
  };
  const getSymbol = useCallback(
    (id) => assets?.find((a) => a.id === id)?.symbol || id,
    [assets]
  );

  return (
    <div className="space-y-2 p-2 border rounded bg-slate-50">
      <Label className="text-sm font-medium">
        {t("CustomAuthority:assetAllowBlockList")}
      </Label>{" "}
      {/* Namespaced key */}
      <div className="max-h-32 overflow-y-auto space-y-1 pr-1 bg-white border rounded p-1 min-h-[3rem]">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground p-1">
            {t("CustomAuthority:listEmpty")}
          </p>
        )}{" "}
        {/* Namespaced key */}
        {items.map((id) => (
          <div
            key={id}
            className="flex items-center justify-between bg-gray-100 p-1 rounded text-xs"
          >
            <span className="truncate" title={id}>
              {getSymbol(id)} ({id})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="p-0 h-4 w-4 flex-shrink-0"
              onClick={() => handleRemove(id)}
            >
              <TrashIcon className="h-3 w-3 text-red-500 hover:text-red-700" />
            </Button>
          </div>
        ))}
      </div>
      <AssetDropDownCard
        title={t("CustomAuthority:addAssetToList")} // Namespaced key
        assets={assets}
        chain={chain}
        type={"input"}
        exclude={items}
        includeBTS={true}
        includeBitAssets={true}
        includePredictionMarkets={false}
        selectCallback={handleAdd}
        // Assuming AssetDropDownCard uses 'title' prop for button text or renders a default button
      />
    </div>
  );
};
