// src/components/CustomAuthority/AuthorityAuthEditor.jsx
import React, { useState } from 'react';
import { useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import AccountSearch from "../AccountSearch.jsx";
// Removed unused Avatar imports
// import { Avatar } from "@/components/Avatar.tsx";
// import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";

export default function AuthorityAuthEditor({ control, authFieldName, usrChain, t }) {

    const { fields: accountAuthFields, append: appendAccountAuth, remove: removeAccountAuth, update: updateAccountAuth } = useFieldArray({
        control,
        name: `${authFieldName}.account_auths`
    });
    const { fields: keyAuthFields, append: appendKeyAuth, remove: removeKeyAuth } = useFieldArray({
        control,
        name: `${authFieldName}.key_auths`
    });
    const { fields: addressAuthFields, append: appendAddressAuth, remove: removeAddressAuth } = useFieldArray({
        control,
        name: `${authFieldName}.address_auths`
    });

    const [accountSearchOpen, setAccountSearchOpen] = useState(false);
    const [currentAuthIndex, setCurrentAuthIndex] = useState(null);

    return (
        <div className="space-y-4">
            <Label className="text-lg font-semibold">{t('AuthorityAuthEditor:authSectionTitle')}</Label>
             <FormField
                control={control}
                name={`${authFieldName}.weight_threshold`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('AuthorityAuthEditor:weightThresholdLabel')}</FormLabel>
                        <FormControl>
                            <Input
                                type="number"
                                min={1}
                                step={1}
                                {...field}
                                value={field.value ?? 1} // Ensure value is present for controlled input
                                onChange={event => field.onChange(parseInt(event.target.value, 10) || 1)} // Parse as int
                                onBlur={event => { // Ensure value is at least 1 on blur
                                    if (!field.value || field.value < 1) field.onChange(1);
                                }}
                             />
                        </FormControl>
                        <FormDescription>{t('AuthorityAuthEditor:weightThresholdDescription')}</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Account Auths */}
            <div className="space-y-2">
              <Label>{t('AuthorityAuthEditor:accountAuthsLabel')}</Label>
              {accountAuthFields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Input type="hidden" {...control.register(`${authFieldName}.account_auths.${index}.id`)} />
                    <Input
                        type="text"
                        placeholder={t('AuthorityAuthEditor:accountIDPlaceholder')}
                        value={control.getValues(`${authFieldName}.account_auths.${index}.id`) || ''}
                        readOnly
                        disabled
                        className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => { setCurrentAuthIndex(index); setAccountSearchOpen(true); }}>
                        {t("selectAccountButton")}
                    </Button>
                    <Controller
                        control={control}
                        name={`${authFieldName}.account_auths.${index}.weight`}
                        render={({ field: weightField }) => (
                             <Input
                                type="number"
                                min={1}
                                step={1}
                                placeholder={t('AuthorityAuthEditor:weightPlaceholder')}
                                {...weightField}
                                value={weightField.value ?? 1} // Ensure controlled input
                                onChange={event => weightField.onChange(parseInt(event.target.value, 10) || 1)} // Parse as int
                                onBlur={event => { // Ensure value is at least 1 on blur
                                    if (!weightField.value || weightField.value < 1) weightField.onChange(1);
                                }}
                                className="w-20"
                            />
                        )}
                    />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeAccountAuth(index)}>
                        <TrashIcon />
                    </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendAccountAuth({ id: "", weight: 1 })}>
                  <PlusIcon className="mr-2 h-4 w-4"/> {t('AuthorityAuthEditor:addAccountAuth')}
              </Button>
            </div>

            {/* Key Auths */}
            <div className="space-y-2">
              <Label>{t('AuthorityAuthEditor:keyAuthsLabel')}</Label>
              {keyAuthFields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Input type="text" placeholder={t('AuthorityAuthEditor:publicKeyPlaceholder')} {...control.register(`${authFieldName}.key_auths.${index}.key`)} className="flex-1"/>
                    <Controller
                        control={control}
                        name={`${authFieldName}.key_auths.${index}.weight`}
                        render={({ field: weightField }) => (
                            <Input
                                type="number"
                                min={1}
                                step={1}
                                placeholder={t('AuthorityAuthEditor:weightPlaceholder')}
                                {...weightField}
                                value={weightField.value ?? 1} // Ensure controlled input
                                onChange={event => weightField.onChange(parseInt(event.target.value, 10) || 1)} // Parse as int
                                onBlur={event => { // Ensure value is at least 1 on blur
                                    if (!weightField.value || weightField.value < 1) weightField.onChange(1);
                                }}
                                className="w-20"
                            />
                        )}
                    />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeKeyAuth(index)}>
                        <TrashIcon />
                    </Button>
                </div>
              ))}
               <Button type="button" variant="outline" size="sm" onClick={() => appendKeyAuth({ key: "", weight: 1 })}>
                  <PlusIcon className="mr-2 h-4 w-4"/> {t('AuthorityAuthEditor:addKeyAuth')}
              </Button>
            </div>

            {/* Address Auths */}
            <div className="space-y-2">
              <Label>{t('AuthorityAuthEditor:addressAuthsLabel')}</Label>
              {addressAuthFields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Input type="text" placeholder={t('AuthorityAuthEditor:addressPlaceholder')} {...control.register(`${authFieldName}.address_auths.${index}.address`)} className="flex-1"/>
                     <Controller
                        control={control}
                        name={`${authFieldName}.address_auths.${index}.weight`}
                        render={({ field: weightField }) => (
                           <Input
                                type="number"
                                min={1}
                                step={1}
                                placeholder={t('AuthorityAuthEditor:weightPlaceholder')}
                                {...weightField}
                                value={weightField.value ?? 1} // Ensure controlled input
                                onChange={event => weightField.onChange(parseInt(event.target.value, 10) || 1)} // Parse as int
                                onBlur={event => { // Ensure value is at least 1 on blur
                                    if (!weightField.value || weightField.value < 1) weightField.onChange(1);
                                }}
                                className="w-20"
                            />
                        )}
                    />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeAddressAuth(index)}>
                        <TrashIcon />
                    </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendAddressAuth({ address: "", weight: 1 })}>
                  <PlusIcon className="mr-2 h-4 w-4"/> {t('AuthorityAuthEditor:addAddressAuth')}
              </Button>
            </div>

            {/* Account Search Dialog */}
            <Dialog open={accountSearchOpen} onOpenChange={setAccountSearchOpen}>
              <DialogContent className="sm:max-w-[375px] bg-white">
                <DialogHeader>
                  <DialogTitle>{t('AuthorityAuthEditor:accountSearchTitle')}</DialogTitle>
                  <DialogDescription>{t('AuthorityAuthEditor:accountSearchDescription')}</DialogDescription>
                </DialogHeader>
                <AccountSearch
                    chain={usrChain}
                    excludedUsers={accountAuthFields.map(f => f.id).filter(Boolean)} // Exclude accounts already added
                    setChosenAccount={(account) => {
                        if (currentAuthIndex !== null && account) {
                            // Use update method from useFieldArray to set the value
                            updateAccountAuth(currentAuthIndex, { ...accountAuthFields[currentAuthIndex], id: account.id });
                        }
                        setAccountSearchOpen(false);
                        setCurrentAuthIndex(null); // Reset index
                    }}
                />
              </DialogContent>
            </Dialog>
        </div>
    );
}