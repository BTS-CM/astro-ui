// src/components/CustomAuthority/ArgumentInputs.jsx - Final Refinement

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Controller } from 'react-hook-form';
import BigNumber from 'bignumber.js'; // Using bignumber.js for safe int64 handling
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/datetime-picker'; // Needed for TimePointSecInput
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Removed unused DialogDescription
import { TrashIcon, PlusIcon } from "@radix-ui/react-icons";
import AccountSearch from '../AccountSearch.jsx';
import AssetSearch from '../AssetSearch.jsx'; // Assuming this exists!
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react'; // For potential errors
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';

// Helper for BigNumber validation
const isValidIntegerString = (value) => /^-?\d+$/.test(value);


// --- Basic Inputs ---

export const VoidInput = ({ field, t }) => <Input disabled value={t('ArgumentInputs:argumentVoid')} className="w-full bg-gray-100 cursor-not-allowed"/>;

export const BooleanInput = ({ field, restrictionType }) => {
    const isLtm = restrictionType === 9; // is_ltm restriction type
    // Per BSIP-40: "The argument is a boolean, which must be true."
    // We enforce true and disable the input for this specific restriction type.
    return <Checkbox checked={isLtm ? true : !!field.value} onCheckedChange={isLtm ? undefined : field.onChange} disabled={isLtm} id={field.name} />;
};

export const StringInput = ({ field, placeholder = "Enter text", t }) => <Input type="text" placeholder={placeholder || t('ArgumentInputs:argumentPlaceholderString')} {...field} />;

export const IntegerInput = ({ field, placeholder = "Enter number", t }) => (
    <Input
        type="number"
        step="1"
        placeholder={placeholder || t('ArgumentInputs:argumentPlaceholderInteger')}
        {...field}
        value={field.value ?? ''} // Handle potential null/undefined from default
        onChange={e => {
            const val = e.target.value;
            // Allow empty input for clearing, otherwise parse as int
            field.onChange(val === '' ? '' : (parseInt(val, 10) || 0));
        }}
    />
);


// --- Amount Input (share_type - using bignumber.js) ---
// Note: Determining the specific asset context for precision based on member_index
// within the operation structure remains complex and is simplified here.
// Validation uses the provided asset prop if available, otherwise assumes precision 0.
export const AmountInput = ({ field, asset, placeholder = "Enter amount", t }) => {
    const [displayValue, setDisplayValue] = useState('');
    const [error, setError] = useState('');
    const precision = asset?.precision ?? 0;

    // Effect to initialize display value from form state (string representation of int64)
    useEffect(() => {
        if (field.value && isValidIntegerString(field.value)) {
            try {
                const bnValue = new BigNumber(field.value);
                // Avoid displaying '.0' for precision 0 assets if value is integer
                const formatted = precision > 0 ? bnValue.shiftedBy(-precision).toFixed(precision) : bnValue.toFixed(0);
                setDisplayValue(formatted);
                setError('');
            } catch (e) {
                 setError(t('ArgumentInputs:errorInvalidAmountFormat'));
                 setDisplayValue('');
            }
        } else if (field.value === '0' || field.value === null || field.value === undefined || field.value === '') {
             // Allow clearing the field or having explicit 0
             setDisplayValue(field.value === '0' ? '0' : '');
             setError('');
        } else {
            // Handle cases where form state might somehow be invalid non-integer string
             setError(t('ArgumentInputs:errorInvalidAmountFormat'));
             setDisplayValue('');
        }
    }, [field.value, precision, t]);

    const handleAmountChange = (event) => {
        const inputStr = event.target.value;
        setDisplayValue(inputStr); // Update display immediately

        if (inputStr === '' || inputStr === '-') {
            field.onChange('0'); // Represent empty/negative sign as 0 internally
            setError('');
            return;
        }

        try {
            // Allow decimal point during typing, but validate final conversion
            const bnValue = new BigNumber(inputStr);
            if (bnValue.isNaN()) {
                 throw new Error("Invalid number");
            }
            if (bnValue.decimalPlaces() > precision) {
                 setError(t('ArgumentInputs:errorTooManyDecimals', { precision }));
                 return; // Don't update form value yet
            }

            const integerString = bnValue.shiftedBy(precision).integerValue(BigNumber.ROUND_FLOOR).toFixed();

            // Int64 limits check (using BigNumber comparison)
            const minInt64 = new BigNumber('-9223372036854775808');
            const maxInt64 = new BigNumber('9223372036854775807');
            const currentBnInt = new BigNumber(integerString);

            if (currentBnInt.isLessThan(minInt64) || currentBnInt.isGreaterThan(maxInt64)) {
                setError(t('ArgumentInputs:errorAmountOutOfRange'));
                return; // Don't update form value
            }

            field.onChange(integerString); // Update form state with the valid int64 string
            setError('');

        } catch (e) {
            setError(t('ArgumentInputs:errorInvalidAmountFormat'));
            // Don't update form value on error
        }
    };

    return (
        <div>
            <Input
                type="text" // Use text for flexible input and BigNumber handling
                inputMode="decimal"
                placeholder={placeholder || t('ArgumentInputs:argumentPlaceholderAmount')}
                value={displayValue}
                onChange={handleAmountChange}
                className={error ? 'border-red-500' : ''}
            />
            {error && <Alert variant="destructive" className="mt-1 p-2"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
            {!error && asset && <p className="text-xs text-muted-foreground mt-1">{t('ArgumentInputs:amountPrecisionInfo', { symbol: asset.symbol, precision: precision })}</p>}
        </div>
    );
};

// --- Time Point Sec Input ---
export const TimePointSecInput = ({ field, t }) => (
    // Assumes field.value will be a JS Date object when controlled by react-hook-form
    // The DateTimePicker component handles the conversion.
    // The formatRestrictions function will convert the Date object to epoch seconds.
     <DateTimePicker
        granularity="second"
        value={field.value instanceof Date ? field.value : null} // Ensure it's a Date object or null
        onChange={field.onChange} // RHF Controller passes the Date object
    />
);


// --- ID Inputs (Account/Asset) ---
export const AccountIdInput = ({ field, chain, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentId = field.value || "";

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <div className="flex items-center space-x-2">
                <Input
                    type="text"
                    placeholder={t('ArgumentInputs:argumentPlaceholderAccountID')}
                    value={currentId}
                    readOnly
                    className={`flex-1 ${currentId ? '' : 'italic text-muted-foreground'} cursor-pointer`}
                    onClick={() => setIsOpen(true)} // Allow clicking input to open dialog
                />
                <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">{t('ArgumentInputs:selectAccountButton')}</Button>
                </DialogTrigger>
            </div>
            <DialogContent className="sm:max-w-[375px] bg-white">
                <DialogHeader>
                    <DialogTitle>{t('ArgumentInputs:accountSearchTitle')}</DialogTitle>
                </DialogHeader>
                <AccountSearch
                    chain={chain}
                    excludedUsers={[]}
                    setChosenAccount={(account) => {
                        if (account) {
                            field.onChange(account.id);
                        }
                        setIsOpen(false);
                    }}
                />
            </DialogContent>
        </Dialog>
    );
};

export const AssetIdInput = ({ field, chain, assets, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentId = field.value || "";
    const currentAsset = useMemo(() => assets?.find(a => a.id === currentId), [assets, currentId]);
    const displayValue = currentAsset ? `${currentAsset.symbol} (${currentId})` : currentId;

    // Dependency Check: AssetSearch must be implemented and available.
    if (typeof AssetSearch === 'undefined') {
        return <Input type="text" placeholder={t('ArgumentInputs:argumentPlaceholderAssetID')} {...field} title="Error: AssetSearch component not found" className="border-red-500"/>
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
             <div className="flex items-center space-x-2">
                 <Input
                    type="text"
                    placeholder={t('ArgumentInputs:argumentPlaceholderAssetID')}
                    value={displayValue}
                    readOnly
                    className={`flex-1 ${currentId ? '' : 'italic text-muted-foreground'} cursor-pointer`}
                    onClick={() => setIsOpen(true)}
                />
                <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">{t('ArgumentInputs:selectAssetButton')}</Button>
                </DialogTrigger>
            </div>
            <DialogContent className="sm:max-w-[450px] bg-white">
                <DialogHeader>
                    <DialogTitle>{t('ArgumentInputs:assetSearchTitle')}</DialogTitle>
                </DialogHeader>
                <AssetSearch
                    chain={chain}
                    assets={assets}
                    setChosenAsset={(asset) => {
                        if (asset) {
                            field.onChange(asset.id);
                        }
                        setIsOpen(false);
                    }}
                />
            </DialogContent>
        </Dialog>
    );
};


// --- Flat Set Inputs ---
export const FlatSetAccountIdInput = ({ field, chain, t }) => {
    // Ensure internal state initializes correctly from field.value (which should be an array)
    const [items, setItems] = useState(() => Array.isArray(field.value) ? field.value : []);
    const [searchOpen, setSearchOpen] = useState(false);

    // Sync internal state if external form value changes
    useEffect(() => {
        if (Array.isArray(field.value) && JSON.stringify(field.value) !== JSON.stringify(items)) {
            setItems(field.value);
        } else if (!Array.isArray(field.value) && items.length > 0) {
             setItems([]); // Reset if form value becomes non-array
        }
        // Intentionally limiting dependencies to field.value to avoid loops with setItems
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
        const newItems = items.filter(id => id !== idToRemove);
        setItems(newItems);
        field.onChange(newItems);
    };

    return (
        <div className="space-y-2 p-2 border rounded bg-slate-50">
             <Label className="text-sm font-medium">{t('ArgumentInputs:accountAllowBlockList')}</Label>
             <div className="max-h-32 overflow-y-auto space-y-1 pr-1 bg-white border rounded p-1 min-h-[3rem]"> {/* Added min-height */}
                {items.length === 0 && <p className="text-xs text-muted-foreground p-1">{t('ArgumentInputs:listEmpty')}</p>}
                {items.map((id) => (
                    <div key={id} className="flex items-center justify-between bg-gray-100 p-1 rounded text-xs">
                        <span className="truncate" title={id}>{id}</span>
                        <Button type="button" variant="ghost" size="xs" className="p-0 h-4 w-4 flex-shrink-0" onClick={() => handleRemove(id)}>
                            <TrashIcon className="h-3 w-3 text-red-500 hover:text-red-700" />
                        </Button>
                    </div>
                ))}
            </div>
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                       <PlusIcon className="mr-2 h-4 w-4"/> {t('ArgumentInputs:addAccountToList')}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[375px] bg-white">
                    <DialogHeader>
                        <DialogTitle>{t('ArgumentInputs:accountSearchTitle')}</DialogTitle>
                    </DialogHeader>
                    <AccountSearch
                        chain={chain}
                        excludedUsers={items}
                        setChosenAccount={handleAdd}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export const FlatSetAssetIdInput = ({ field, chain, assets, t }) => {
     const [items, setItems] = useState(() => Array.isArray(field.value) ? field.value : []);
    const [searchOpen, setSearchOpen] = useState(false);

     // Sync internal state if external form value changes
    useEffect(() => {
         if (Array.isArray(field.value) && JSON.stringify(field.value) !== JSON.stringify(items)) {
            setItems(field.value);
        } else if (!Array.isArray(field.value) && items.length > 0) {
             setItems([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [field.value]);

    const handleAdd = (asset) => {
        if (asset && !items.includes(asset.id)) {
             const newItems = [...items, asset.id].sort();
            setItems(newItems);
            field.onChange(newItems);
        }
        setSearchOpen(false);
    };

    const handleRemove = (idToRemove) => {
        const newItems = items.filter(id => id !== idToRemove);
        setItems(newItems);
        field.onChange(newItems);
    };

    const getSymbol = useCallback((id) => assets?.find(a => a.id === id)?.symbol || id, [assets]);

     // Dependency Check: AssetSearch must be implemented and available.
    if (typeof AssetSearch === 'undefined') {
         return <Input type="text" disabled value="Error: AssetSearch component not found" className="border-red-500"/>
    }

    return (
         <div className="space-y-2 p-2 border rounded bg-slate-50">
            <Label className="text-sm font-medium">{t('ArgumentInputs:assetAllowBlockList')}</Label>
             <div className="max-h-32 overflow-y-auto space-y-1 pr-1 bg-white border rounded p-1 min-h-[3rem]">
                 {items.length === 0 && <p className="text-xs text-muted-foreground p-1">{t('ArgumentInputs:listEmpty')}</p>}
                {items.map((id) => (
                    <div key={id} className="flex items-center justify-between bg-gray-100 p-1 rounded text-xs">
                        <span className="truncate" title={id}>{getSymbol(id)} ({id})</span>
                        <Button type="button" variant="ghost" size="xs" className="p-0 h-4 w-4 flex-shrink-0" onClick={() => handleRemove(id)}>
                             <TrashIcon className="h-3 w-3 text-red-500 hover:text-red-700" />
                        </Button>
                    </div>
                ))}
            </div>
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                        <PlusIcon className="mr-2 h-4 w-4"/> {t('ArgumentInputs:addAssetToList')}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px] bg-white">
                    <DialogHeader>
                        <DialogTitle>{t('ArgumentInputs:assetSearchTitle')}</DialogTitle>
                    </DialogHeader>
                    <AssetSearch
                        chain={chain}
                        assets={assets}
                        excludedAssets={items}
                        setChosenAsset={handleAdd}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};