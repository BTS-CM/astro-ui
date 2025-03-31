// src/components/CustomAuthority/AuthorityRestrictionsEditor.jsx - Final Refinement

import React, { useMemo, memo } from 'react';
import { useFieldArray, Controller, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { opTypes, opData, restrictionTypeNames, getArgumentTypeIdentifier } from '@/lib/opTypes'; // Use getArgumentTypeIdentifier
import {
    VoidInput, BooleanInput, StringInput, IntegerInput, AmountInput, TimePointSecInput, // Added TimePointSecInput
    AccountIdInput, AssetIdInput, FlatSetAccountIdInput, FlatSetAssetIdInput
} from './ArgumentInputs.jsx';

// Helper to set default value based on argument type identifier string
const getDefaultValueForType = (argumentTypeIdentifier) => {
    switch (argumentTypeIdentifier) {
        case 'bool_type': return false;
        case 'share_type': return '0'; // Default amount as string '0'
        case 'flat_set_account_id_type': return [];
        case 'flat_set_asset_id_type': return [];
        case 'time_point_sec_type': return new Date(); // Default to now for date/time
        case 'void_t': return null; // Use null for void
        case 'account_id_type':
        case 'asset_id_type':
        case 'string_type':
        default: return ''; // Default for string, id types, etc.
    }
};

// Memoize the Row component to prevent unnecessary re-renders
const RestrictionRow = memo(({ item, index, control, restrictionsFieldName, currentOpData, chain, assets, t, removeRestriction }) => {
    // Watch the restriction_type for *this specific row*
    const restrictionType = useWatch({ control, name: `${restrictionsFieldName}.${index}.restriction_type` });
    // Determine the argument type based on the watched restrictionType
    const argumentTypeIdentifier = useMemo(() => getArgumentTypeIdentifier(restrictionType), [restrictionType]);

    // Function to reset argument when restriction type changes for this row
    const handleRestrictionTypeChange = (value, onChange) => {
        const numericValue = Number(value);
        onChange(numericValue); // Update the restriction type field
        const newArgumentType = getArgumentTypeIdentifier(numericValue);
        // Reset the argument field to its default for the new type
        control.setValue(`${restrictionsFieldName}.${index}.argument`, getDefaultValueForType(newArgumentType), { shouldValidate: true, shouldDirty: true }); // Trigger validation and mark dirty
    };

    const renderArgumentInput = () => {
        const fieldName = `${restrictionsFieldName}.${index}.argument`;

        return (
            <Controller
                control={control}
                name={fieldName}
                // Default value is handled by the reset logic on type change
                render={({ field }) => { // Pass the specific field for this argument
                    switch (argumentTypeIdentifier) {
                        case 'account_id_type':
                            return <AccountIdInput field={field} chain={chain} t={t} />;
                        case 'asset_id_type':
                            return <AssetIdInput field={field} chain={chain} assets={assets} t={t} />;
                        case 'bool_type':
                            return <BooleanInput field={field} restrictionType={restrictionType}/>;
                        case 'string_type':
                            return <StringInput field={field} t={t} />;
                        case 'share_type':
                             // Note: Determining specific asset context remains simplified
                            return <AmountInput field={field} asset={null} t={t} />;
                        case 'flat_set_account_id_type':
                            return <FlatSetAccountIdInput field={field} chain={chain} t={t} />;
                        case 'flat_set_asset_id_type':
                            return <FlatSetAssetIdInput field={field} chain={chain} assets={assets} t={t} />;
                        case 'time_point_sec_type':
                             return <TimePointSecInput field={field} t={t} />;
                        case 'void_t':
                            return <VoidInput field={field} t={t} />;
                        default:
                            console.warn(`Unhandled argument type identifier: ${argumentTypeIdentifier} for restriction type: ${restrictionType}`);
                            return <StringInput field={field} placeholder={t('AuthorityRestrictionsEditor:argumentPlaceholderGeneric')} t={t} />;
                    }
                }}
            />
        );
    };

     return (
         <div key={item.id} className="flex items-start space-x-2 mb-2 border p-3 rounded bg-background shadow-sm">
            <div className="grid grid-cols-1 gap-4 flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Member Index */}
                    <FormField
                        control={control}
                        name={`${restrictionsFieldName}.${index}.member_index`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('AuthorityRestrictionsEditor:memberIndexLabel')}</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number(value))}
                              value={field.value !== undefined ? field.value.toString() : ""} // Handle undefined/null value
                              disabled={!currentOpData}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('AuthorityRestrictionsEditor:memberIndexPlaceholder')} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white max-h-[300px]">
                                    {
                                      currentOpData?.fields ? Object.values(currentOpData.fields).map((fieldDef) => (
                                          <SelectItem key={`${item.id}-member-${fieldDef.index}`} value={fieldDef.index.toString()}>
                                              {`${fieldDef.name} (${fieldDef.index})`}
                                          </SelectItem>
                                      )) : <SelectItem value="-1" disabled>{t('AuthorityRestrictionsEditor:selectOperationFirst')}</SelectItem>
                                    }
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
                            <FormLabel>{t('AuthorityRestrictionsEditor:restrictionTypeLabel')}</FormLabel>
                            <Select
                                onValueChange={(value) => handleRestrictionTypeChange(value, field.onChange)} // Use handler
                                value={field.value !== undefined ? field.value.toString() : ""} // Handle undefined/null value
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('AuthorityRestrictionsEditor:restrictionTypePlaceholder')} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white max-h-[300px]">
                                    {Object.entries(restrictionTypeNames).map(([key, value]) => (
                                        <SelectItem key={`${item.id}-type-${key}`} value={key.toString()}>
                                          {`${value} (${key})`}
                                        </SelectItem>
                                    ))}
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
                    render={() => ( // We use the render prop but call our dynamic renderer
                      <FormItem>
                        <FormLabel>{t('AuthorityRestrictionsEditor:argumentLabel')} <span className="text-muted-foreground text-xs">({argumentTypeIdentifier})</span></FormLabel> {/* Show type */}
                        <FormControl>
                           {renderArgumentInput()}
                        </FormControl>
                        <FormDescription>{t('AuthorityRestrictionsEditor:argumentDescription')}</FormDescription>
                        <FormMessage /> {/* For argument-specific validation errors */}
                      </FormItem>
                    )}
                />
            </div>
            {/* Use flex-shrink-0 to prevent button squishing */}
            <Button type="button" variant="destructive" size="icon" className="flex-shrink-0 mt-9" onClick={() => removeRestriction(index)}>
                <TrashIcon />
            </Button>
        </div>
    );
}); // End of RestrictionRow memo

export default function AuthorityRestrictionsEditor({ control, restrictionsFieldName, operationTypeValue, assets, t, chain }) {
    const { fields: restrictionFields, append: appendRestriction, remove: removeRestriction } = useFieldArray({
        control,
        name: restrictionsFieldName
    });

    // Get the relevant operation data based on the selected operation_type from the parent form
    const currentOpData = useMemo(() => {
        // Ensure operationTypeValue is treated as a number for lookup
        const opTypeNum = Number(operationTypeValue);
        const opName = opTypes[opTypeNum];
        return opName ? opData[opName] : null;
    }, [operationTypeValue]);


    const handleAddRestriction = () => {
         const defaultRestType = 0; // Default to 'only_by_witness' -> 'void_t'
         const defaultArgType = getArgumentTypeIdentifier(defaultRestType);
         appendRestriction({
            member_index: 0, // Default member index
            restriction_type: defaultRestType,
            argument: getDefaultValueForType(defaultArgType) // Set default argument based on default type
         });
    }

    return (
        <div className="space-y-4">
            <Label className="text-lg font-semibold">{t('AuthorityRestrictionsEditor:restrictionsSectionTitle')}</Label>
            {restrictionFields.map((item, index) => (
                <RestrictionRow
                    key={item.id} // Use item.id provided by useFieldArray
                    item={item}
                    index={index}
                    control={control}
                    restrictionsFieldName={restrictionsFieldName}
                    currentOpData={currentOpData}
                    chain={chain}
                    assets={assets}
                    t={t}
                    removeRestriction={removeRestriction}
                 />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddRestriction}>
                <PlusIcon className="mr-2 h-4 w-4"/> {t('AuthorityRestrictionsEditor:addRestriction')}
            </Button>
        </div>
    );
}