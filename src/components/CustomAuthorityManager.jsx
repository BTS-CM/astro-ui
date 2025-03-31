// src/components/CustomAuthorityManager.jsx - Final Refinement

import React, { useState, useEffect, useMemo } from "react"; // Removed useCallback (not used)
import { useSyncExternalStore } from "react";
import { useStore } from "@nanostores/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"; // Using zod for validation schema
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { DateTimePicker } from '@/components/ui/datetime-picker'; // Import DateTimePicker
import { isValidIntegerString } from "./CustomAuthority/ArgumentInputs"; // Import helper if needed elsewhere

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { Input } from "@/components/ui/input"; // Import Input
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { AlertCircle } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"; // Import Form components


import DeepLinkDialog from "../common/DeepLinkDialog.jsx"; // Adjusted path assuming common folder is sibling
import AuthorityAuthEditor from "./CustomAuthority/AuthorityAuthEditor.jsx";
import AuthorityRestrictionsEditor from "./CustomAuthority/AuthorityRestrictionsEditor.jsx";
import ExistingAuthoritiesList from "./CustomAuthority/ExistingAuthoritiesList.jsx";

// Assume opTypes, opData, restrictionTypes, getArgumentTypeIdentifier are correctly defined in opTypes.js
import { opTypes, opData, getArgumentTypeIdentifier } from '@/lib/opTypes';

// --- Zod Schemas ---
// Basic ID format (adjust regex if more specific formats are needed)
const idRegex = /^(0|1|2)\.(\d+)\.(\d+)$/;
const btsAddressRegex = /^BTS[a-zA-Z0-9]{50}$/; // Standard BTS address length
const btsPublicKeyRegex = /^(BTS|TEST)[a-zA-Z0-9]{50}$/; // Standard key length

const accountAuthSchema = z.object({
  id: z.string().regex(idRegex, { message: "Invalid Account ID (e.g., 1.2.x)" }),
  weight: z.number().int().min(1, { message: "Weight must be >= 1" }),
});

const keyAuthSchema = z.object({
  key: z.string().regex(btsPublicKeyRegex, { message: "Invalid Public Key format" }),
  weight: z.number().int().min(1, { message: "Weight must be >= 1" }),
});

const addressAuthSchema = z.object({
  address: z.string().regex(btsAddressRegex, { message: "Invalid Address format" }),
  weight: z.number().int().min(1, { message: "Weight must be >= 1" }),
});

const authSchema = z.object({
  weight_threshold: z.number().int().min(1, { message: "Threshold must be >= 1" }),
  account_auths: z.array(accountAuthSchema).optional(),
  key_auths: z.array(keyAuthSchema).optional(),
  address_auths: z.array(addressAuthSchema).optional(),
}).refine(data => (data.account_auths?.length || 0) + (data.key_auths?.length || 0) + (data.address_auths?.length || 0) > 0, {
  message: "At least one authorization (account, key, or address) is required.",
  path: ["weight_threshold"],
});

const restrictionSchema = z.object({
  member_index: z.number().int().min(0, { message: "Member index >= 0" }),
  restriction_type: z.number().int().min(0, { message: "Restriction type >= 0" }),
  argument: z.any(), // Dynamic validation happens elsewhere or during formatting
});

const createAuthoritySchema = z.object({
  enabled: z.boolean().default(true),
  valid_from: z.date({ required_error: "Valid from date is required." }),
  valid_to: z.date({ required_error: "Valid to date is required." }),
  operation_type: z.number().int().min(0),
  auth: authSchema,
  restrictions: z.array(restrictionSchema).optional(),
}).refine(data => data.valid_to > data.valid_from, {
    message: "Valid To must be after Valid From.",
    path: ["valid_to"],
});

const updateAuthoritySchema = z.object({
  authority_to_update: z.string().regex(/^2\.14\.\d+$/, { message: "Invalid Authority ID (e.g., 2.14.x)" }),
  new_enabled: z.boolean().optional(),
  new_valid_from: z.date().optional(),
  new_valid_to: z.date().optional(),
  new_auth: authSchema.optional(),
  restrictions_to_remove: z.string().optional(), // Store as string, parse later
  restrictions_to_add: z.array(restrictionSchema).optional(),
}).refine(data => !data.new_valid_from || !data.new_valid_to || data.new_valid_to > data.new_valid_from, {
    message: "New Valid To must be after New Valid From.",
    path: ["new_valid_to"],
}).refine(data =>
    data.new_enabled !== undefined ||
    data.new_valid_from !== undefined ||
    data.new_valid_to !== undefined ||
    data.new_auth !== undefined ||
    (data.restrictions_to_remove && data.restrictions_to_remove.trim().length > 0) ||
    (data.restrictions_to_add && data.restrictions_to_add.length > 0), {
    message: "At least one field must be changed to update.",
    path: ["authority_to_update"],
});

const deleteAuthoritySchema = z.object({
  authority_to_delete: z.string().regex(/^2\.14\.\d+$/, { message: "Invalid Authority ID (e.g., 2.14.x)" }),
});
// --- End Zod Schemas ---

export default function CustomAuthorityManager(properties) {
  const { t } = useTranslation('component_CustomAuthorityManager'); // Using component-specific namespace
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  const currentNode = useStore($currentNode);

  // Use component-specific translation hook for sub-components if needed
  const { t: t_auth } = useTranslation('component_AuthorityAuthEditor');
  const { t: t_restrictions } = useTranslation('component_AuthorityRestrictionsEditor');
  const { t: t_existing } = useTranslation('component_ExistingAuthoritiesList');
  const { t: t_args } = useTranslation('component_ArgumentInputs');


  const { _assetsBTS, _assetsTEST } = properties;

  const _chain = useMemo(() => usr?.chain || "bitshares", [usr]);

  useInitCache(_chain, []);

  const assets = useMemo(() => _chain === "bitshares" ? _assetsBTS : _assetsTEST || [], [_assetsBTS, _assetsTEST, _chain]);

  const [mode, setMode] = useState("create");
  const [existingAuthorityDetails, setExistingAuthorityDetails] = useState([]);
  const [accountData, setAccountData] = useState(null);
  const [loadingAuthorities, setLoadingAuthorities] = useState(false);
  const [errorAuthorities, setErrorAuthorities] = useState(null);
  const [selectedAuthorityId, setSelectedAuthorityId] = useState(null);

  const [showDeeplink, setShowDeeplink] = useState(false);
  const [deeplinkData, setDeeplinkData] = useState(null);
  const [submissionError, setSubmissionError] = useState(''); // For displaying formatting/submission errors

  // --- Fetching Logic ---
  useEffect(() => {
    let unsubAccount;
    let unsubAuthorities;

    if (usr?.id && currentNode?.url) {
      setLoadingAuthorities(true);
      setErrorAuthorities(null);
      setExistingAuthorityDetails([]);
      setAccountData(null);
      setSelectedAuthorityId(null); // Reset selection on user/node change

      const accountStore = createObjectStore([_chain, JSON.stringify([usr.id]), currentNode.url]);
      unsubAccount = accountStore.subscribe(({ data, error, loading }) => {
        if (error && !loading) {
          console.error("Failed to fetch account details:", error);
          setErrorAuthorities(t('CustomAuthorityManager:errorFetchAccount'));
          setLoadingAuthorities(false);
          return;
        }

        if (data && data[0] && !loading) {
          const accData = data[0];
          setAccountData(accData);

          const ownerAuthIds = accData.owner_special_authority?.filter(auth => auth[0] === 1).map(auth => auth[1]) || [];
          const activeAuthIds = accData.active_special_authority?.filter(auth => auth[0] === 1).map(auth => auth[1]) || [];
          const allAuthIds = [...new Set([...ownerAuthIds, ...activeAuthIds])];

          if (allAuthIds.length === 0) {
            setExistingAuthorityDetails([]);
            setLoadingAuthorities(false);
            return;
          }

          const authoritiesStore = createObjectStore([_chain, JSON.stringify(allAuthIds), currentNode.url]);
          unsubAuthorities = authoritiesStore.subscribe(({ data: authData, error: authError, loading: authLoading }) => {
            if (authError && !authLoading) {
              console.error("Failed to fetch custom authority details:", authError);
              setErrorAuthorities(t('CustomAuthorityManager:errorFetchAuthorities'));
              setLoadingAuthorities(false);
            } else if (authData && !authLoading) {
              setExistingAuthorityDetails(authData.filter(Boolean) || []); // Filter out potential nulls if API returns them
              setLoadingAuthorities(false);
            }
          });
        } else if (!loading) {
            // Handle case where account data might be unexpectedly null/empty
            setErrorAuthorities(t('CustomAuthorityManager:errorFetchAccount'));
            setLoadingAuthorities(false);
        }
      });
    } else {
      setExistingAuthorityDetails([]);
      setAccountData(null);
    }

    return () => {
      if (unsubAccount) unsubAccount();
      if (unsubAuthorities) unsubAuthorities();
    };
  }, [usr, currentNode, _chain, t]);
  // --- End Fetching Logic ---

  // Helper to map fetched auth data to form structure
  const mapAuthToForm = (auth) => ({
    weight_threshold: auth?.weight_threshold ?? 1,
    account_auths: auth?.account_auths?.map(a => ({ id: Object.keys(a)[0], weight: Object.values(a)[0] })) || [],
    key_auths: auth?.key_auths?.map(k => ({ key: Object.keys(k)[0], weight: Object.values(k)[0] })) || [],
    address_auths: auth?.address_auths?.map(addr => ({ address: Object.keys(addr)[0], weight: Object.values(addr)[0] })) || [],
  });

  // Helper to map fetched restrictions to form structure (handles argument types)
  const mapRestrictionsToForm = (restrictions) => {
      if (!restrictions) return [];
      return restrictions.map(r => {
          const argumentTypeIdentifier = getArgumentTypeIdentifier(r.restriction_type);
          let formArgument = r.argument;
          // Convert specific types back for form display/editing if needed
          if (argumentTypeIdentifier === 'time_point_sec_type' && typeof r.argument === 'number') {
              formArgument = new Date(r.argument * 1000); // Convert epoch seconds back to Date object
          }
          // Note: share_type (string int64) and flat_set (array) should already be in correct format
          return {
              member_index: r.member_index,
              restriction_type: r.restriction_type,
              argument: formArgument,
          };
      });
  };

  // --- Form Setup ---
  const currentSchema = mode === "create" ? createAuthoritySchema
                     : mode === "update" ? updateAuthoritySchema
                     : deleteAuthoritySchema;

  const form = useForm({
    resolver: zodResolver(currentSchema),
    // Default values are recalculated when the dependencies change
    defaultValues: useMemo(() => {
        const defaults = {
            create: {
                enabled: true,
                valid_from: new Date(),
                valid_to: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                operation_type: 0,
                auth: { weight_threshold: 1, account_auths: [], key_auths: [], address_auths: [] },
                restrictions: [],
            },
            update: (authId) => {
                const selectedAuth = existingAuthorityDetails.find(auth => auth?.id === authId);
                return selectedAuth ? {
                    authority_to_update: selectedAuth.id,
                    // Provide current values as defaults for optional update fields
                    new_enabled: selectedAuth.enabled,
                    new_valid_from: new Date(selectedAuth.valid_from + "Z"),
                    new_valid_to: new Date(selectedAuth.valid_to + "Z"),
                    // Do NOT prefill new_auth, restrictions_to_add, restrictions_to_remove
                    // User must explicitly define these changes.
                    // Optionally, could show current auth/restrictions for reference outside the form.
                    new_auth: undefined, // Or mapAuthToForm(selectedAuth.auth) if you want to prefill for editing
                    restrictions_to_remove: '', // Start empty
                    restrictions_to_add: [], // Start empty
                } : {};
            },
            delete: (authId) => ({ authority_to_delete: authId || "" }),
        };

        return defaults[mode] ? defaults[mode](selectedAuthorityId) : defaults.create;

    }, [mode, selectedAuthorityId, existingAuthorityDetails])
  });

  // Reset form when mode or selected authority changes
  useEffect(() => {
      const defaults = {
            create: {
                enabled: true,
                valid_from: new Date(),
                valid_to: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                operation_type: 0,
                auth: { weight_threshold: 1, account_auths: [], key_auths: [], address_auths: [] },
                restrictions: [],
            },
            update: (authId) => {
                const selectedAuth = existingAuthorityDetails.find(auth => auth?.id === authId);
                return selectedAuth ? {
                    authority_to_update: selectedAuth.id,
                    new_enabled: selectedAuth.enabled,
                    new_valid_from: new Date(selectedAuth.valid_from + "Z"),
                    new_valid_to: new Date(selectedAuth.valid_to + "Z"),
                    new_auth: undefined, // Reset changes on selection change
                    restrictions_to_remove: '',
                    restrictions_to_add: [],
                } : { authority_to_update: authId || "" }; // Keep ID if auth details not found yet
            },
            delete: (authId) => ({ authority_to_delete: authId || "" }),
      };
      form.reset(defaults[mode] ? defaults[mode](selectedAuthorityId) : defaults.create);
      setSubmissionError(''); // Clear previous errors on mode/selection change
  }, [mode, selectedAuthorityId, existingAuthorityDetails, form.reset]);


  // --- Submission Logic ---
  // Helper to format auth arrays back to blockchain structure
  const formatAuth = (authData) => {
    if (!authData) return undefined;
    const account_auths = authData.account_auths?.filter(a => a.id && a.weight).map(a => ({ [a.id]: a.weight })) || [];
    const key_auths = authData.key_auths?.filter(k => k.key && k.weight).map(k => ({ [k.key]: k.weight })) || [];
    const address_auths = authData.address_auths?.filter(addr => addr.address && addr.weight).map(addr => ({ [addr.address]: addr.weight })) || [];

    // Only include arrays if they have content
    const formatted = { weight_threshold: authData.weight_threshold };
    if (account_auths.length > 0) formatted.account_auths = account_auths;
    if (key_auths.length > 0) formatted.key_auths = key_auths;
    if (address_auths.length > 0) formatted.address_auths = address_auths;
    return formatted;
  };

  // Helper to format restrictions (ensure argument types are correct for serialization)
  const formatRestrictions = (restrictionsData) => {
    if (!restrictionsData) return [];
    console.log("Formatting restrictions:", restrictionsData);
    return restrictionsData.map((r, index) => {
        const restrictionType = r.restriction_type;
        const argumentTypeIdentifier = getArgumentTypeIdentifier(restrictionType);
        let formattedArgument = r.argument; // Start with the raw form value

        console.log(`Row ${index}: TypeCode=${restrictionType}, TypeID='${argumentTypeIdentifier}', RawArg=`, formattedArgument);

        switch (argumentTypeIdentifier) {
            case 'account_id_type':
            case 'asset_id_type':
            case 'string_type':
                if (typeof formattedArgument !== 'string') { formattedArgument = String(formattedArgument ?? ''); }
                break;
            case 'bool_type':
                formattedArgument = restrictionType === 9 ? true : Boolean(formattedArgument); // Enforce true for LTM
                break;
            case 'share_type': // Expects string 'int64'
                if (typeof formattedArgument !== 'string' || !isValidIntegerString(formattedArgument)) {
                    throw new Error(`Invalid amount format for restriction at index ${index}. Expected integer string.`);
                }
                // No conversion needed, already string
                break;
            case 'flat_set_account_id_type':
            case 'flat_set_asset_id_type':
                if (!Array.isArray(formattedArgument)) { formattedArgument = []; }
                else { formattedArgument = formattedArgument.filter(id => typeof id === 'string' && id.length > 0).sort(); } // Ensure sorted array of strings
                break;
            case 'time_point_sec_type':
                if (formattedArgument instanceof Date && !isNaN(formattedArgument)) {
                    formattedArgument = Math.floor(formattedArgument.getTime() / 1000);
                } else {
                    throw new Error(`Invalid date type for restriction at index ${index}.`);
                }
                break;
            case 'void_t':
                formattedArgument = null; // Use null for void_t serialization
                break;
            default:
                console.warn(`Passing through unhandled argument type: '${argumentTypeIdentifier}'`);
                break;
        }

        const finalRestriction = {
            member_index: r.member_index,
            restriction_type: restrictionType,
            argument: formattedArgument
        };
        console.log(`Row ${index}: Formatted=`, finalRestriction);
        return finalRestriction;
    });
  };

   // Helper to parse comma-separated indices string to array of numbers
    const parseIndicesString = (indicesString) => {
        if (!indicesString || typeof indicesString !== 'string') return [];
        return indicesString
            .split('CustomAuthorityManager:,')
            .map(index => parseInt(index.trim(), 10))
            .filter(num => !isNaN(num) && num >= 0); // Ensure valid non-negative integers
    };


  const onSubmit = (data) => {
    let operationName = "";
    let finalTrxJSON = {};
    setSubmissionError(''); // Clear previous errors

    try { // Wrap formatting in try/catch
        if (mode === "create") {
          operationName = "custom_authority_create";
          // Ensure auth and restrictions exist even if empty for the operation structure
          const formattedAuth = formatAuth(data.auth);
          if (!formattedAuth) throw new Error("Authorization configuration is invalid or missing.");
          finalTrxJSON = {
            fee: { amount: 0, asset_id: "1.3.0" },
            account: usr.id,
            enabled: data.enabled,
            valid_from: Math.floor(data.valid_from.getTime() / 1000),
            valid_to: Math.floor(data.valid_to.getTime() / 1000),
            operation_type: data.operation_type,
            auth: formattedAuth,
            restrictions: formatRestrictions(data.restrictions || []), // Format even if empty array
            extensions: {},
          };
        } else if (mode === "update") {
          operationName = "custom_authority_update";
          const updateData = {
            fee: { amount: 0, asset_id: "1.3.0" },
            account: usr.id,
            authority_to_update: data.authority_to_update,
            extensions: {}, // Always include extensions
          };

          const originalAuth = existingAuthorityDetails.find(a => a?.id === data.authority_to_update);
          if (!originalAuth) throw new Error("Cannot find original authority to compare for update.");

          // Only include fields if they have changed from the original or default
          if (data.new_enabled !== undefined && data.new_enabled !== originalAuth.enabled) updateData.new_enabled = data.new_enabled;
          if (data.new_valid_from && Math.floor(data.new_valid_from.getTime() / 1000) !== originalAuth.valid_from) updateData.new_valid_from = Math.floor(data.new_valid_from.getTime() / 1000);
          if (data.new_valid_to && Math.floor(data.new_valid_to.getTime() / 1000) !== originalAuth.valid_to) updateData.new_valid_to = Math.floor(data.new_valid_to.getTime() / 1000);
          if (data.new_auth) { // If user provided new auth config
             const formattedNewAuth = formatAuth(data.new_auth);
             // TODO: Deep compare formattedNewAuth with originalAuth.auth? For now, include if provided.
             if (formattedNewAuth) updateData.new_auth = formattedNewAuth;
          }

          const restrictionsToRemove = parseIndicesString(data.restrictions_to_remove);
          if (restrictionsToRemove.length > 0) {
            updateData.restrictions_to_remove = restrictionsToRemove;
          }
          const restrictionsToAdd = formatRestrictions(data.restrictions_to_add || []);
          if (restrictionsToAdd.length > 0) {
            updateData.restrictions_to_add = restrictionsToAdd;
          }

           // Check if anything was actually added to updateData besides fee, account, id, extensions
           const updateKeys = Object.keys(updateData).filter(k => !['fee', 'account', 'authority_to_update', 'extensions'].includes(k));
           if (updateKeys.length === 0) {
               throw new Error(t('CustomAuthorityManager:errorNothingToUpdate'));
           }


          finalTrxJSON = updateData;

        } else if (mode === "delete") {
          operationName = "custom_authority_delete";
          finalTrxJSON = {
            fee: { amount: 0, asset_id: "1.3.0" },
            account: usr.id,
            authority_to_delete: data.authority_to_delete,
            extensions: {},
          };
        } else {
            throw new Error("Invalid mode selected.");
        }

        console.log("Prepared Deeplink Data:", { operationName, finalTrxJSON });

        setDeeplinkData({
          operationNames: [operationName],
          trxJSON: [finalTrxJSON],
          headerText: t(`deeplinkHeader_${mode}`),
          username: usr.username,
          usrChain: usr.chain,
          userID: usr.id,
        });
        setShowDeeplink(true);

    } catch (error) {
        console.error("Error preparing transaction:", error);
        setSubmissionError(error.message || t('CustomAuthorityManager:errorFormatting'));
    }
  };

  // --- Render Logic ---
  return (
    <div className="container mx-auto mt-5 mb-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(newMode) => {setSelectedAuthorityId(null); setMode(newMode);}} className="mb-4">
            <TabsList>
              <TabsTrigger value="create">{t("createTab")}</TabsTrigger>
              <TabsTrigger value="update" disabled={!existingAuthorityDetails.length && !loadingAuthorities}>
                {t("updateTab")}
              </TabsTrigger>
              <TabsTrigger value="delete" disabled={!existingAuthorityDetails.length && !loadingAuthorities}>
                {t("deleteTab")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {errorAuthorities ? (
             <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4"/>
                <AlertTitle>{t('CustomAuthorityManager:errorTitle')}</AlertTitle>
                <AlertDescription>{errorAuthorities}</AlertDescription>
            </Alert>
          ): null}

          {loadingAuthorities ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          ) : ( (mode === 'update' || mode === 'delete') && (
              <ExistingAuthoritiesList
                authorities={existingAuthorityDetails}
                selectedAuthorityId={selectedAuthorityId}
                setSelectedAuthorityId={setSelectedAuthorityId}
                opTypes={opTypes} // Pass opTypes for display
                t={t_existing} // Pass specific translator
              />
            )
          )}

          <Form {...form}>
            {/* Pass the actual onSubmit handler to handleSubmit */}
            <form onSubmit={form.handleSubmit(onSubmit)} className={`space-y-6 ${loadingAuthorities ? 'mt-4' : ''}`}> {/* Increased spacing */}

                {/* Delete Mode */}
                {mode === 'delete' && selectedAuthorityId && (
                    <div className="border p-4 rounded bg-destructive/10">
                         <p className="mb-4">{t('CustomAuthorityManager:deleteConfirmation', { id: selectedAuthorityId })}</p>
                        <Button type="submit" variant="destructive">{t("deleteButton")}</Button>
                    </div>
                )}

                {/* Create/Update Mode */}
                {(mode === 'create' || (mode === 'update' && selectedAuthorityId)) && (
                    <>
                        {/* Shared Fields: Enabled, Valid From/To */}
                        <Card className="p-4">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                <FormField
                                  control={form.control}
                                  name={mode === 'update' ? "new_enabled" : "enabled"}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm h-full col-span-1 md:col-span-3">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                id="authEnabledCheckbox"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel htmlFor="authEnabledCheckbox">{t('CustomAuthorityManager:enabledLabel')}</FormLabel>
                                            <FormDescription>{t('CustomAuthorityManager:enabledDescription')}</FormDescription>
                                        </div>
                                         <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={mode === 'update' ? "new_valid_from" : "valid_from"}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t('CustomAuthorityManager:validFromLabel')}</FormLabel>
                                      <FormControl>
                                        <DateTimePicker
                                          granularity="second"
                                          value={field.value}
                                          onChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={mode === 'update' ? "new_valid_to" : "valid_to"}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t('CustomAuthorityManager:validToLabel')}</FormLabel>
                                      <FormControl>
                                        <DateTimePicker
                                          granularity="second"
                                          value={field.value}
                                          onChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {mode === 'create' && (
                                    <FormField
                                      control={form.control}
                                      name="operation_type"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t('CustomAuthorityManager:operationTypeLabel')}</FormLabel>
                                          <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value !== undefined ? field.value.toString() : ""}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder={t('CustomAuthorityManager:operationTypePlaceholder')} />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-white max-h-[300px]">
                                              {Object.entries(opTypes).map(([key, value]) => (
                                                <SelectItem key={key} value={key}>
                                                  {`${value} (${key})`}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormDescription>{t('CustomAuthorityManager:operationTypeDescription')}</FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                )}
                            </div>
                        </Card>


                        <Card className="p-4">
                            {/* Auth Editor */}
                            <AuthorityAuthEditor
                                control={form.control}
                                authFieldName={mode === 'update' ? "new_auth" : "auth"}
                                usrChain={usr.chain}
                                t={t_auth} // Pass specific translator
                            />
                        </Card>

                        <Card className="p-4">
                             {/* Restrictions Editor */}
                            <AuthorityRestrictionsEditor
                                control={form.control}
                                restrictionsFieldName={mode === 'update' ? "restrictions_to_add" : "restrictions"}
                                // Pass the watched value for operation_type ONLY in create mode
                                operationTypeValue={mode === 'create' ? form.watch("operation_type") : existingAuthorityDetails.find(auth => auth?.id === selectedAuthorityId)?.operation_type}
                                assets={assets}
                                t={t_restrictions} // Pass specific translator
                                chain={_chain} // Pass chain down
                            />

                            {/* Restrictions to Remove (Update only) */}
                            {mode === 'update' && (
                                <div className="pt-4">
                                     <FormField
                                      control={form.control}
                                      name="restrictions_to_remove"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t('CustomAuthorityManager:restrictionsToRemoveLabel')}</FormLabel>
                                          <FormControl>
                                            <Input
                                                type="text"
                                                placeholder={t('CustomAuthorityManager:restrictionIndicesPlaceholder')}
                                                {...field}
                                                // Keep the sanitizer, it prevents non-numeric/comma/space input
                                                onChange={(e) => {
                                                    const sanitizedValue = e.target.value.replace(/[^0-9,\s]/g, '');
                                                    field.onChange(sanitizedValue);
                                                }}
                                             />
                                          </FormControl>
                                          <FormDescription>{t('CustomAuthorityManager:restrictionsToRemoveDescription')}</FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                </div>
                            )}
                        </Card>

                        {/* Submission Error Display */}
                        {submissionError && (
                             <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4"/>
                                <AlertTitle>{t('CustomAuthorityManager:errorTitle')}</AlertTitle>
                                <AlertDescription>{submissionError}</AlertDescription>
                             </Alert>
                         )}

                        <Separator className="mt-6 mb-4"/>

                        <Button type="submit" disabled={loadingAuthorities || (mode !== 'create' && !selectedAuthorityId)}>
                            {mode === 'create' ? t('CustomAuthorityManager:createButton') : t('CustomAuthorityManager:updateButton')}
                        </Button>
                    </>
                )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Deeplink Dialog */}
      {showDeeplink && deeplinkData ? (
        <DeepLinkDialog
          operationNames={deeplinkData.operationNames}
          username={deeplinkData.username}
          usrChain={deeplinkData.usrChain}
          userID={deeplinkData.userID}
          dismissCallback={() => setShowDeeplink(false)}
          key={`CustomAuthorityDL_${mode}${selectedAuthorityId || ''}`} // Unique key
          headerText={deeplinkData.headerText}
          trxJSON={deeplinkData.trxJSON}
        />
      ) : null}

    </div>
  );
}