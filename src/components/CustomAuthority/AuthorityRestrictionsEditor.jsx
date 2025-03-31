// src/components/CustomAuthority/AuthorityRestrictionsEditor.jsx - Reverted i18n

import React, { useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js"; // Use standard import
import { useFieldArray, Controller, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import {
  opTypes,
  opData,
  restrictionTypeNames,
  getArgumentTypeIdentifier,
} from "@/lib/opTypes";
import {
  VoidInput,
  BooleanInput,
  StringInput,
  IntegerInput,
  AmountInput,
  TimePointSecInput,
  AccountIdInput,
  AssetIdInput,
  FlatSetAccountIdInput,
  FlatSetAssetIdInput,
} from "./ArgumentInputs.jsx";

// Helper to set default value based on argument type identifier string
const getDefaultValueForType = (argumentTypeIdentifier) => {
  /* ... implementation from previous step ... */
};

// Memoize the Row component
const RestrictionRow = memo(
  ({
    item,
    index,
    control,
    restrictionsFieldName,
    currentOpData,
    chain,
    assets,
    removeRestriction,
  }) => {
    // Use standard hook instance inside component
    const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

    const restrictionType = useWatch({
      control,
      name: `${restrictionsFieldName}.${index}.restriction_type`,
    });
    const argumentTypeIdentifier = useMemo(
      () => getArgumentTypeIdentifier(restrictionType),
      [restrictionType]
    );

    const handleRestrictionTypeChange = (value, onChange) => {
      /* ... implementation from previous step ... */
    };

    const renderArgumentInput = () => {
      const fieldName = `${restrictionsFieldName}.${index}.argument`;
      return (
        <Controller
          control={control}
          name={fieldName}
          render={({ field }) => {
            switch (argumentTypeIdentifier) {
              // Pass chain/assets/t ONLY if the specific input component needs it
              case "account_id_type":
                return <AccountIdInput field={field} chain={chain} />;
              case "asset_id_type":
                return (
                  <AssetIdInput field={field} chain={chain} assets={assets} />
                );
              case "bool_type":
                return (
                  <BooleanInput
                    field={field}
                    restrictionType={restrictionType}
                  />
                );
              case "string_type":
                return <StringInput field={field} />;
              case "share_type":
                return <AmountInput field={field} asset={null} />; // Still simplified asset context
              case "flat_set_account_id_type":
                return <FlatSetAccountIdInput field={field} chain={chain} />;
              case "flat_set_asset_id_type":
                return (
                  <FlatSetAssetIdInput
                    field={field}
                    chain={chain}
                    assets={assets}
                  />
                );
              case "time_point_sec_type":
                return <TimePointSecInput field={field} />;
              case "void_t":
                return <VoidInput field={field} />;
              default:
                console.warn(`Unhandled arg type: ${argumentTypeIdentifier}`);
                return (
                  <StringInput
                    field={field}
                    placeholder={t(
                      "CustomAuthority:argumentPlaceholderGeneric"
                    )}
                  />
                );
            }
          }}
        />
      );
    };

    return (
      <div
        key={item.id}
        className="flex items-start space-x-2 mb-2 border p-3 rounded bg-background shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Member Index */}
            <FormField
              control={control}
              name={`${restrictionsFieldName}.${index}.member_index`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CustomAuthority:memberIndexLabel")}</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={
                      field.value !== undefined ? field.value.toString() : ""
                    }
                    disabled={!currentOpData}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "CustomAuthority:memberIndexPlaceholder"
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white max-h-[300px]">
                      {currentOpData?.fields ? (
                        Object.values(currentOpData.fields).map((fieldDef) => (
                          <SelectItem
                            key={`${item.id}-member-${fieldDef.index}`}
                            value={fieldDef.index.toString()}
                          >{`${fieldDef.name} (${fieldDef.index})`}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="-1" disabled>
                          {t("CustomAuthority:selectOperationFirst")}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Restriction Type */}
            <FormField
              control={control}
              name={`${restrictionsFieldName}.${index}.restriction_type`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("CustomAuthority:restrictionTypeLabel")}
                  </FormLabel>
                  <Select
                    onValueChange={(value) =>
                      handleRestrictionTypeChange(value, field.onChange)
                    }
                    value={
                      field.value !== undefined ? field.value.toString() : ""
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "CustomAuthority:restrictionTypePlaceholder"
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white max-h-[300px]">
                      {Object.entries(restrictionTypeNames).map(
                        ([key, value]) => (
                          <SelectItem
                            key={`${item.id}-type-${key}`}
                            value={key.toString()}
                          >{`${value} (${key})`}</SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Argument (Dynamic) */}
          <FormField
            control={control}
            name={`${restrictionsFieldName}.${index}.argument`}
            render={() => (
              <FormItem>
                <FormLabel>
                  {t("CustomAuthority:argumentLabel")}{" "}
                  <span className="text-muted-foreground text-xs">
                    ({argumentTypeIdentifier})
                  </span>
                </FormLabel>
                <FormControl>{renderArgumentInput()}</FormControl>
                <FormDescription>
                  {t("CustomAuthority:argumentDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="flex-shrink-0 mt-9"
          onClick={() => removeRestriction(index)}
        >
          <TrashIcon />
        </Button>
      </div>
    );
  }
); // End of RestrictionRow memo

export default function AuthorityRestrictionsEditor({
  control,
  restrictionsFieldName,
  operationTypeValue,
  assets,
  chain,
}) {
  // Removed t prop
  // Use standard hook instance
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const {
    fields: restrictionFields,
    append: appendRestriction,
    remove: removeRestriction,
  } = useFieldArray({ control, name: restrictionsFieldName });

  const currentOpData = useMemo(() => {
    /* ... implementation from previous step ... */
  }, [operationTypeValue]);

  const handleAddRestriction = () => {
    /* ... implementation from previous step ... */
  };

  return (
    <div className="space-y-4">
      {/* Use namespaced keys */}
      <Label className="text-lg font-semibold">
        {t("CustomAuthority:restrictionsSectionTitle")}
      </Label>
      {restrictionFields.map((item, index) => (
        <RestrictionRow
          key={item.id}
          item={item}
          index={index}
          control={control}
          restrictionsFieldName={restrictionsFieldName}
          currentOpData={currentOpData}
          chain={chain}
          assets={assets}
          removeRestriction={removeRestriction}
          // Pass standard t instance if needed by sub-rows (though it uses its own now)
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddRestriction}
      >
        <PlusIcon className="mr-2 h-4 w-4" />{" "}
        {t("CustomAuthority:addRestriction")}
      </Button>
    </div>
  );
}
