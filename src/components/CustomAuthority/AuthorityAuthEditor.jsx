// src/components/CustomAuthority/AuthorityAuthEditor.jsx - Refactored without useFieldArray, Reverted i18n

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Controller, useWatch } from "react-hook-form"; // Keep Controller/useWatch
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import AccountSearch from "../AccountSearch.jsx"; // Adjusted path

export default function AuthorityAuthEditor({
  control,
  authFieldName,
  usrChain,
  setValue, // Pass react-hook-form's setValue function
  getValues, // Pass react-hook-form's getValues function
}) {
  // Use standard hook instance
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  // Watch the entire auth object from the main form state
  const parentAuthObject = useWatch({ control, name: authFieldName });

  // Local state for managing the arrays, initialized from parent form state
  const [accountAuths, setAccountAuths] = useState([]);
  const [keyAuths, setKeyAuths] = useState([]);
  const [addressAuths, setAddressAuths] = useState([]);

  // Effect to synchronize local state when parent form state changes
  useEffect(() => {
    // Prevent unnecessary updates if data hasn't actually changed
    if (
      JSON.stringify(parentAuthObject?.account_auths || []) !==
      JSON.stringify(accountAuths)
    ) {
      setAccountAuths(parentAuthObject?.account_auths || []);
    }
    if (
      JSON.stringify(parentAuthObject?.key_auths || []) !==
      JSON.stringify(keyAuths)
    ) {
      setKeyAuths(parentAuthObject?.key_auths || []);
    }
    if (
      JSON.stringify(parentAuthObject?.address_auths || []) !==
      JSON.stringify(addressAuths)
    ) {
      setAddressAuths(parentAuthObject?.address_auths || []);
    }
    // Only depend on the parent object to avoid loops with local state setters
  }, [parentAuthObject]);

  // Helper function to update parent form state
  const updateParentFormState = (
    newAccountAuths,
    newKeyAuths,
    newAddressAuths
  ) => {
    const currentThreshold = getValues(`${authFieldName}.weight_threshold`); // Get current threshold
    // Construct the new auth object structure for the parent form
    const newAuthObject = {
      weight_threshold: currentThreshold ?? 1,
      account_auths: newAccountAuths,
      key_auths: newKeyAuths,
      address_auths: newAddressAuths,
    };
    console.log("Updating parent form state:", authFieldName, newAuthObject);
    setValue(authFieldName, newAuthObject, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // --- Account Auth Handlers ---
  const addAccountAuth = () => {
    const newAuths = [...accountAuths, { id: "", weight: 1 }];
    setAccountAuths(newAuths);
    updateParentFormState(newAuths, keyAuths, addressAuths);
  };
  const removeAccountAuth = (index) => {
    const newAuths = accountAuths.filter((_, i) => i !== index);
    setAccountAuths(newAuths);
    updateParentFormState(newAuths, keyAuths, addressAuths);
  };
  const updateAccountAuthField = (index, field, value) => {
    const newAuths = accountAuths.map((auth, i) =>
      i === index ? { ...auth, [field]: value } : auth
    );
    setAccountAuths(newAuths);
    updateParentFormState(newAuths, keyAuths, addressAuths);
  };

  // --- Key Auth Handlers ---
  const addKeyAuth = () => {
    const newAuths = [...keyAuths, { key: "", weight: 1 }];
    setKeyAuths(newAuths);
    updateParentFormState(accountAuths, newAuths, addressAuths);
  };
  const removeKeyAuth = (index) => {
    const newAuths = keyAuths.filter((_, i) => i !== index);
    setKeyAuths(newAuths);
    updateParentFormState(accountAuths, newAuths, addressAuths);
  };
  const updateKeyAuthField = (index, field, value) => {
    const newAuths = keyAuths.map((auth, i) =>
      i === index ? { ...auth, [field]: value } : auth
    );
    setKeyAuths(newAuths);
    updateParentFormState(accountAuths, newAuths, addressAuths);
  };

  // --- Address Auth Handlers ---
  const addAddressAuth = () => {
    const newAuths = [...addressAuths, { address: "", weight: 1 }];
    setAddressAuths(newAuths);
    updateParentFormState(accountAuths, keyAuths, newAuths);
  };
  const removeAddressAuth = (index) => {
    const newAuths = addressAuths.filter((_, i) => i !== index);
    setAddressAuths(newAuths);
    updateParentFormState(accountAuths, keyAuths, newAuths);
  };
  const updateAddressAuthField = (index, field, value) => {
    const newAuths = addressAuths.map((auth, i) =>
      i === index ? { ...auth, [field]: value } : auth
    );
    setAddressAuths(newAuths);
    updateParentFormState(accountAuths, keyAuths, newAuths);
  };

  // --- Account Search Dialog State ---
  const [accountSearchOpen, setAccountSearchOpen] = useState(false);
  const [currentAuthIndex, setCurrentAuthIndex] = useState(null);
  const handleAccountSelect = (account) => {
    if (currentAuthIndex !== null && account)
      updateAccountAuthField(currentAuthIndex, "id", account.id);
    setAccountSearchOpen(false);
    setCurrentAuthIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Use namespaced keys */}
      <Label className="text-lg font-semibold">
        {t("CustomAuthority:authSectionTitle")}
      </Label>
      <FormField
        control={control}
        name={`${authFieldName}.weight_threshold`}
        defaultValue={1}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("CustomAuthority:weightThresholdLabel")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                step={1}
                {...field}
                value={field.value ?? 1}
                onChange={(event) =>
                  field.onChange(parseInt(event.target.value, 10) || 1)
                }
                onBlur={(event) => {
                  if (!field.value || field.value < 1) field.onChange(1);
                }}
              />
            </FormControl>
            <FormDescription>
              {t("CustomAuthority:weightThresholdDescription")}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Account Auths */}
      <div className="space-y-2">
        <Label>{t("CustomAuthority:accountAuthsLabel")}</Label>
        {accountAuths.map((auth, index) => (
          <div
            key={`acc-auth-${index}`}
            className="flex items-center space-x-2 p-2 border rounded"
          >
            <Input
              type="text"
              placeholder={t("CustomAuthority:accountIDPlaceholder")}
              value={auth.id || ""}
              readOnly
              disabled
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentAuthIndex(index);
                setAccountSearchOpen(true);
              }}
            >
              {t("CustomAuthority:selectAccountButton")}
            </Button>
            <Input
              type="number"
              min={1}
              step={1}
              placeholder={t("CustomAuthority:weightPlaceholder")}
              value={auth.weight ?? 1}
              onChange={(event) =>
                updateAccountAuthField(
                  index,
                  "weight",
                  parseInt(event.target.value, 10) || 1
                )
              }
              onBlur={(event) => {
                if (!auth.weight || auth.weight < 1)
                  updateAccountAuthField(index, "weight", 1);
              }}
              className="w-20"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => removeAccountAuth(index)}
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAccountAuth}
        >
          <PlusIcon className="mr-2 h-4 w-4" />{" "}
          {t("CustomAuthority:addAccountAuth")}
        </Button>
      </div>

      {/* Key Auths */}
      <div className="space-y-2">
        <Label>{t("CustomAuthority:keyAuthsLabel")}</Label>
        {keyAuths.map((auth, index) => (
          <div
            key={`key-auth-${index}`}
            className="flex items-center space-x-2 p-2 border rounded"
          >
            <Input
              type="text"
              placeholder={t("CustomAuthority:publicKeyPlaceholder")}
              value={auth.key || ""}
              onChange={(event) =>
                updateKeyAuthField(index, "key", event.target.value)
              }
              className="flex-1"
            />
            <Input
              type="number"
              min={1}
              step={1}
              placeholder={t("CustomAuthority:weightPlaceholder")}
              value={auth.weight ?? 1}
              onChange={(event) =>
                updateKeyAuthField(
                  index,
                  "weight",
                  parseInt(event.target.value, 10) || 1
                )
              }
              onBlur={(event) => {
                if (!auth.weight || auth.weight < 1)
                  updateKeyAuthField(index, "weight", 1);
              }}
              className="w-20"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => removeKeyAuth(index)}
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addKeyAuth}>
          <PlusIcon className="mr-2 h-4 w-4" />{" "}
          {t("CustomAuthority:addKeyAuth")}
        </Button>
      </div>

      {/* Address Auths */}
      <div className="space-y-2">
        <Label>{t("CustomAuthority:addressAuthsLabel")}</Label>
        {addressAuths.map((auth, index) => (
          <div
            key={`addr-auth-${index}`}
            className="flex items-center space-x-2 p-2 border rounded"
          >
            <Input
              type="text"
              placeholder={t("CustomAuthority:addressPlaceholder")}
              value={auth.address || ""}
              onChange={(event) =>
                updateAddressAuthField(index, "address", event.target.value)
              }
              className="flex-1"
            />
            <Input
              type="number"
              min={1}
              step={1}
              placeholder={t("CustomAuthority:weightPlaceholder")}
              value={auth.weight ?? 1}
              onChange={(event) =>
                updateAddressAuthField(
                  index,
                  "weight",
                  parseInt(event.target.value, 10) || 1
                )
              }
              onBlur={(event) => {
                if (!auth.weight || auth.weight < 1)
                  updateAddressAuthField(index, "weight", 1);
              }}
              className="w-20"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => removeAddressAuth(index)}
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAddressAuth}
        >
          <PlusIcon className="mr-2 h-4 w-4" />{" "}
          {t("CustomAuthority:addAddressAuth")}
        </Button>
      </div>

      {/* Account Search Dialog */}
      <Dialog open={accountSearchOpen} onOpenChange={setAccountSearchOpen}>
        <DialogContent className="sm:max-w-[375px] bg-white">
          <DialogHeader>
            <DialogTitle>{t("CustomAuthority:accountSearchTitle")}</DialogTitle>
            <DialogDescription>
              {t("CustomAuthority:accountSearchDescription")}
            </DialogDescription>
          </DialogHeader>
          <AccountSearch
            chain={usrChain}
            excludedUsers={accountAuths.map((a) => a.id).filter(Boolean)}
            setChosenAccount={handleAccountSelect}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
