// src/components/CustomAuthorityManager.jsx - Reverted i18n

import React, { useState, useEffect, useMemo } from "react";
import { useSyncExternalStore } from "react";
import { useStore } from "@nanostores/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
// Use standard import
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { DateTimePicker } from "@/components/ui/datetime-picker";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import AuthorityAuthEditor from "./CustomAuthority/AuthorityAuthEditor.jsx";
import AuthorityRestrictionsEditor from "./CustomAuthority/AuthorityRestrictionsEditor.jsx";
import ExistingAuthoritiesList from "./CustomAuthority/ExistingAuthoritiesList.jsx";

// Import helpers from ArgumentInputs for validation/formatting if needed at this level

import { opTypes } from "@/lib/opTypes";

// --- Zod Schemas --- (Remain the same as previous step)
/* ... Zod Schemas ... */
const idRegex = /^(0|1|2)\.(\d+)\.(\d+)$/;
const btsAddressRegex = /^BTS[a-zA-Z0-9]{50}$/;
const btsPublicKeyRegex = /^(BTS|TEST)[a-zA-Z0-9]{50}$/;
const accountAuthSchema = z.object({
  id: z
    .string()
    .regex(idRegex, { message: "Invalid Account ID (e.g., 1.2.x)" }),
  weight: z.number().int().min(1, { message: "Weight must be >= 1" }),
});
const keyAuthSchema = z.object({
  key: z
    .string()
    .regex(btsPublicKeyRegex, { message: "Invalid Public Key format" }),
  weight: z.number().int().min(1, { message: "Weight must be >= 1" }),
});
const addressAuthSchema = z.object({
  address: z
    .string()
    .regex(btsAddressRegex, { message: "Invalid Address format" }),
  weight: z.number().int().min(1, { message: "Weight must be >= 1" }),
});
const authSchema = z
  .object({
    weight_threshold: z
      .number()
      .int()
      .min(1, { message: "Threshold must be >= 1" }),
    account_auths: z.array(accountAuthSchema).optional(),
    key_auths: z.array(keyAuthSchema).optional(),
    address_auths: z.array(addressAuthSchema).optional(),
  })
  .refine(
    (data) =>
      (data.account_auths?.length || 0) +
        (data.key_auths?.length || 0) +
        (data.address_auths?.length || 0) >
      0,
    {
      message:
        "At least one authorization (account, key, or address) is required.",
      path: ["weight_threshold"],
    }
  );
const restrictionSchema = z.object({
  member_index: z.number().int().min(0, { message: "Member index >= 0" }),
  restriction_type: z
    .number()
    .int()
    .min(0, { message: "Restriction type >= 0" }),
  argument: z.any(),
});
const createAuthoritySchema = z
  .object({
    enabled: z.boolean().default(true),
    valid_from: z.date({ required_error: "Valid from date is required." }),
    valid_to: z.date({ required_error: "Valid to date is required." }),
    operation_type: z.number().int().min(0),
    auth: authSchema,
    restrictions: z.array(restrictionSchema).optional(),
  })
  .refine((data) => data.valid_to > data.valid_from, {
    message: "Valid To must be after Valid From.",
    path: ["valid_to"],
  });
const updateAuthoritySchema = z
  .object({
    authority_to_update: z.string().regex(/^2\.14\.\d+$/, {
      message: "Invalid Authority ID (e.g., 2.14.x)",
    }),
    new_enabled: z.boolean().optional(),
    new_valid_from: z.date().optional(),
    new_valid_to: z.date().optional(),
    new_auth: authSchema.optional(),
    restrictions_to_remove: z.string().optional(),
    restrictions_to_add: z.array(restrictionSchema).optional(),
  })
  .refine(
    (data) =>
      !data.new_valid_from ||
      !data.new_valid_to ||
      data.new_valid_to > data.new_valid_from,
    {
      message: "New Valid To must be after New Valid From.",
      path: ["new_valid_to"],
    }
  )
  .refine(
    (data) =>
      data.new_enabled !== undefined ||
      data.new_valid_from !== undefined ||
      data.new_valid_to !== undefined ||
      data.new_auth !== undefined ||
      (data.restrictions_to_remove &&
        data.restrictions_to_remove.trim().length > 0) ||
      (data.restrictions_to_add && data.restrictions_to_add.length > 0),
    {
      message: "At least one field must be changed to update.",
      path: ["authority_to_update"],
    }
  );
const deleteAuthoritySchema = z.object({
  authority_to_delete: z
    .string()
    .regex(/^2\.14\.\d+$/, { message: "Invalid Authority ID (e.g., 2.14.x)" }),
});

export default function CustomAuthorityManager(properties) {
  // Use standard hook instance
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const { _assetsBTS, _assetsTEST } = properties;
  const _chain = useMemo(() => usr?.chain || "bitshares", [usr]);
  useInitCache(_chain, []);
  const assets = useMemo(
    () => (_chain === "bitshares" ? _assetsBTS : _assetsTEST || []),
    [_assetsBTS, _assetsTEST, _chain]
  );

  const [mode, setMode] = useState("create");
  const [existingAuthorityDetails, setExistingAuthorityDetails] = useState([]);
  const [accountData, setAccountData] = useState(null);
  const [loadingAuthorities, setLoadingAuthorities] = useState(false);
  const [errorAuthorities, setErrorAuthorities] = useState(null);
  const [selectedAuthorityId, setSelectedAuthorityId] = useState(null);
  const [showDeeplink, setShowDeeplink] = useState(false);
  const [deeplinkData, setDeeplinkData] = useState(null);
  const [submissionError, setSubmissionError] = useState("");

  // --- Fetching Logic --- (Remains the same)
  /* ... Fetching useEffect ... */
  useEffect(() => {
    let unsubAccount;
    let unsubAuthorities;
    if (usr?.id && currentNode?.url) {
      setLoadingAuthorities(true);
      setErrorAuthorities(null);
      setExistingAuthorityDetails([]);
      setAccountData(null);
      setSelectedAuthorityId(null);
      const accountStore = createObjectStore([
        _chain,
        JSON.stringify([usr.id]),
        currentNode.url,
      ]);
      unsubAccount = accountStore.subscribe(({ data, error, loading }) => {
        if (error && !loading) {
          console.error("Acc fetch error:", error);
          setErrorAuthorities(t("CustomAuthority:errorFetchAccount"));
          setLoadingAuthorities(false);
          return;
        }
        if (data?.[0] && !loading) {
          const accData = data[0];
          setAccountData(accData);
          const ownerAuthIds =
            accData.owner_special_authority
              ?.filter((auth) => auth[0] === 1)
              .map((auth) => auth[1]) || [];
          const activeAuthIds =
            accData.active_special_authority
              ?.filter((auth) => auth[0] === 1)
              .map((auth) => auth[1]) || [];
          const allAuthIds = [...new Set([...ownerAuthIds, ...activeAuthIds])];
          if (allAuthIds.length === 0) {
            setExistingAuthorityDetails([]);
            setLoadingAuthorities(false);
            return;
          }
          const authoritiesStore = createObjectStore([
            _chain,
            JSON.stringify(allAuthIds),
            currentNode.url,
          ]);
          unsubAuthorities = authoritiesStore.subscribe(
            ({ data: authData, error: authError, loading: authLoading }) => {
              if (authError && !authLoading) {
                console.error("Auth fetch error:", authError);
                setErrorAuthorities(t("CustomAuthority:errorFetchAuthorities"));
                setLoadingAuthorities(false);
              } else if (authData && !authLoading) {
                setExistingAuthorityDetails(authData.filter(Boolean) || []);
                setLoadingAuthorities(false);
              }
            }
          );
        } else if (!loading) {
          setErrorAuthorities(t("CustomAuthority:errorFetchAccount"));
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

  // --- Form Setup --- (Remains the same)
  /* ... Form setup useForm, useEffect ... */
  const currentSchema =
    mode === "create"
      ? createAuthoritySchema
      : mode === "update"
      ? updateAuthoritySchema
      : deleteAuthoritySchema;

  // Recalculate default values when mode or selection changes
  const defaultValues = useMemo(() => {
    console.log(
      `Recalculating defaults for mode: ${mode}, selectedId: ${selectedAuthorityId}`
    ); // Debug log
    if (mode === "update") {
      const selectedAuth = existingAuthorityDetails.find(
        (auth) => auth?.id === selectedAuthorityId
      );
      if (selectedAuth) {
        console.log("Found selected auth for update:", selectedAuth);
        // Return the specific defaults object for update mode when an authority is selected
        return {
          authority_to_update: selectedAuth.id,
          new_enabled: selectedAuth.enabled,
          new_valid_from: new Date(selectedAuth.valid_from + "Z"), // Use ISO string with Z for UTC
          new_valid_to: new Date(selectedAuth.valid_to + "Z"),
          // Resetting these on selection change is intended by previous logic
          new_auth: undefined,
          restrictions_to_remove: "",
          restrictions_to_add: [],
        };
      } else {
        console.log("Update mode, but no authority selected or found yet.");
        // Return minimal object if in update mode but no selection yet
        // Or just the ID if it's available, matching the Zod schema requirement
        return { authority_to_update: selectedAuthorityId || "" };
      }
    } else if (mode === "delete") {
      console.log("Delete mode defaults.");
      // Return the specific defaults object for delete mode
      return { authority_to_delete: selectedAuthorityId || "" };
    } else {
      // Default to 'create' mode
      console.log("Create mode defaults.");
      // Return the specific defaults object for create mode
      return {
        enabled: true,
        valid_from: new Date(),
        valid_to: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1)
        ),
        operation_type: 0,
        auth: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [],
          address_auths: [],
        },
        restrictions: [],
      };
    }
  }, [mode, selectedAuthorityId, existingAuthorityDetails]); // Dependencies remain the same

  const form = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: defaultValues, // Use the calculated defaultValues
  });

  // Reset form when mode or selected authority changes, using the same logic
  useEffect(() => {
    console.log(
      `Resetting form for mode: ${mode}, selectedId: ${selectedAuthorityId}`
    );
    let newDefaults;
    if (mode === "update") {
      const selectedAuth = existingAuthorityDetails.find(
        (auth) => auth?.id === selectedAuthorityId
      );
      newDefaults = selectedAuth
        ? {
            authority_to_update: selectedAuth.id,
            new_enabled: selectedAuth.enabled,
            new_valid_from: new Date(selectedAuth.valid_from + "Z"),
            new_valid_to: new Date(selectedAuth.valid_to + "Z"),
            new_auth: undefined, // Intentionally reset these on re-selection/mode change
            restrictions_to_remove: "",
            restrictions_to_add: [],
          }
        : { authority_to_update: selectedAuthorityId || "" };
    } else if (mode === "delete") {
      newDefaults = { authority_to_delete: selectedAuthorityId || "" };
    } else {
      // create mode
      newDefaults = {
        enabled: true,
        valid_from: new Date(),
        valid_to: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1)
        ),
        operation_type: 0,
        auth: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [],
          address_auths: [],
        },
        restrictions: [],
      };
    }
    form.reset(newDefaults);
    setSubmissionError("");
  }, [mode, selectedAuthorityId, existingAuthorityDetails, form.reset]); // form.reset added as dependency
  // --- End Form Setup ---

  const onSubmit = (data) => {
    let operationName = "";
    let finalTrxJSON = {};
    setSubmissionError(""); // Clear previous errors

    // Helper to format auth arrays back to blockchain structure
    const formatAuth = (authData) => {
      if (!authData) return undefined;
      // Filter out entries with missing ID/key/address or invalid weight before mapping
      const account_auths =
        authData.account_auths
          ?.filter((a) => a.id && typeof a.weight === "number" && a.weight >= 1)
          .map((a) => ({ [a.id]: a.weight })) || [];
      const key_auths =
        authData.key_auths
          ?.filter(
            (k) => k.key && typeof k.weight === "number" && k.weight >= 1
          )
          .map((k) => ({ [k.key]: k.weight })) || [];
      const address_auths =
        authData.address_auths
          ?.filter(
            (addr) =>
              addr.address &&
              typeof addr.weight === "number" &&
              addr.weight >= 1
          )
          .map((addr) => ({ [addr.address]: addr.weight })) || [];

      // Only return the auth object if it contains a valid threshold and at least one auth type
      if (
        account_auths.length + key_auths.length + address_auths.length > 0 &&
        authData.weight_threshold >= 1
      ) {
        const formatted = { weight_threshold: authData.weight_threshold };
        if (account_auths.length > 0) formatted.account_auths = account_auths;
        if (key_auths.length > 0) formatted.key_auths = key_auths;
        if (address_auths.length > 0) formatted.address_auths = address_auths;
        return formatted;
      }
      return undefined; // Return undefined if auth is invalid/empty
    };

    // Helper to format restrictions (ensure argument types are correct for serialization)
    const formatRestrictions = (restrictionsData) => {
      if (!restrictionsData) return [];
      console.log("Formatting restrictions:", restrictionsData);
      return restrictionsData.map((r, index) => {
        // Validate basic structure
        if (
          r.member_index === undefined ||
          r.member_index < 0 ||
          r.restriction_type === undefined ||
          r.restriction_type < 0
        ) {
          throw new Error(
            `Invalid member_index or restriction_type at restriction index ${index}.`
          );
        }

        const restrictionType = r.restriction_type; // Use the numeric type code
        const argumentTypeIdentifier =
          getArgumentTypeIdentifier(restrictionType);
        let formattedArgument = r.argument; // Start with the raw form value

        console.log(
          `Row ${index}: TypeCode=${restrictionType}, TypeID='${argumentTypeIdentifier}', RawArg=`,
          formattedArgument
        );

        // --- Argument Type Formatting for Blockchain ---
        // Perform type validation and conversion based on expected type
        switch (argumentTypeIdentifier) {
          case "account_id_type":
          case "asset_id_type":
            // TODO: Add stricter ID validation regex if needed
            if (
              typeof formattedArgument !== "string" ||
              !idRegex.test(formattedArgument)
            ) {
              // Use idRegex from Zod section
              throw new Error(
                `Invalid ID format for restriction at index ${index}. Expected format like '1.X.Y'.`
              );
            }
            // Already a string, no conversion needed if format is okay
            break;
          case "string_type":
            if (typeof formattedArgument !== "string") {
              console.warn(
                `Formatting: Expected string for ${argumentTypeIdentifier}, got ${typeof formattedArgument}. Converting.`
              );
              formattedArgument = String(formattedArgument ?? ""); // Ensure string
            }
            break;
          case "bool_type":
            formattedArgument =
              restrictionType === 9 ? true : Boolean(formattedArgument); // Enforce true for LTM, ensure boolean otherwise
            break;
          case "share_type": // Expects string 'int64'
            if (
              typeof formattedArgument !== "string" ||
              !isValidIntegerString(formattedArgument)
            ) {
              throw new Error(
                `Invalid amount format for restriction at index ${index}. Expected integer string, got: '${formattedArgument}'`
              );
            }
            // Validate range (approximate check, BigNumber handled input)
            const bnValue = new BigNumber(formattedArgument);
            const minInt64 = new BigNumber("-9223372036854775808");
            const maxInt64 = new BigNumber("9223372036854775807");
            if (
              bnValue.isLessThan(minInt64) ||
              bnValue.isGreaterThan(maxInt64)
            ) {
              throw new Error(
                `Amount out of int64 range for restriction at index ${index}.`
              );
            }
            // Argument is already the correct integer string
            break;
          case "flat_set_account_id_type":
          case "flat_set_asset_id_type":
            if (!Array.isArray(formattedArgument)) {
              throw new Error(
                `Invalid list format for restriction at index ${index}. Expected an array.`
              );
            }
            // Filter invalid IDs and ensure sorted string array
            formattedArgument = formattedArgument
              .filter((id) => typeof id === "string" && idRegex.test(id)) // Use idRegex for validation
              .sort();
            // Optional: Check for duplicates? Core likely handles it.
            break;
          case "time_point_sec_type":
            if (
              formattedArgument instanceof Date &&
              !isNaN(formattedArgument)
            ) {
              formattedArgument = Math.floor(
                formattedArgument.getTime() / 1000
              ); // Convert valid Date to epoch seconds
              if (formattedArgument < 0) {
                // Sanity check epoch
                throw new Error(
                  `Invalid date (resulted in negative epoch) for restriction at index ${index}.`
                );
              }
            } else {
              throw new Error(
                `Invalid date type/value for restriction at index ${index}. Expected Date object.`
              );
            }
            break;
          case "void_t":
            formattedArgument = null; // Use null for void_t serialization
            break;
          default: // 'unknown' or any unhandled types
            console.error(
              `Formatting Error: Unhandled argument type identifier: '${argumentTypeIdentifier}' for restriction type ${restrictionType} at index ${index}.`
            );
            throw new Error(
              `Unsupported restriction argument type at index ${index}.`
            );
        }
        // --- End Argument Formatting ---

        const finalRestriction = {
          member_index: r.member_index,
          restriction_type: restrictionType,
          argument: formattedArgument,
        };
        console.log(`Row ${index}: Formatted=`, finalRestriction);
        return finalRestriction;
      });
    }; // End formatRestrictions

    // Helper to parse comma-separated indices string to array of numbers
    const parseIndicesString = (indicesString) => {
      if (!indicesString || typeof indicesString !== "string") return [];
      return indicesString
        .split(",") // Split by comma
        .map((index) => index.trim()) // Trim whitespace
        .filter((indexStr) => indexStr.length > 0) // Remove empty strings from double commas etc.
        .map((indexStr) => parseInt(indexStr, 10)) // Parse as integer
        .filter((num) => !isNaN(num) && num >= 0); // Ensure valid non-negative integers
    };

    try {
      // Wrap main submission logic in try/catch to catch formatting errors
      if (mode === "create") {
        operationName = "custom_authority_create";
        const formattedAuth = formatAuth(data.auth);
        // Ensure auth is valid before proceeding
        if (!formattedAuth) {
          throw new Error(t("CustomAuthority:errorAuthMissing"));
        }
        finalTrxJSON = {
          fee: { amount: 0, asset_id: "1.3.0" },
          account: usr.id,
          enabled: data.enabled,
          valid_from: Math.floor(data.valid_from.getTime() / 1000),
          valid_to: Math.floor(data.valid_to.getTime() / 1000),
          operation_type: data.operation_type,
          auth: formattedAuth, // Use validated and formatted auth
          restrictions: formatRestrictions(data.restrictions || []), // Format restrictions
          extensions: {},
        };
      } else if (mode === "update") {
        operationName = "custom_authority_update";
        const updateData = {
          fee: { amount: 0, asset_id: "1.3.0" },
          account: usr.id,
          authority_to_update: data.authority_to_update,
          extensions: {},
        };
        const originalAuth = existingAuthorityDetails.find(
          (a) => a?.id === data.authority_to_update
        );
        if (!originalAuth) {
          throw new Error(t("CustomAuthority:errorOriginalAuthMissing"));
        }

        // Only include fields if they have changed
        if (
          data.new_enabled !== undefined &&
          data.new_enabled !== originalAuth.enabled
        ) {
          updateData.new_enabled = data.new_enabled;
        }
        if (
          data.new_valid_from instanceof Date &&
          !isNaN(data.new_valid_from) &&
          Math.floor(data.new_valid_from.getTime() / 1000) !==
            originalAuth.valid_from
        ) {
          updateData.new_valid_from = Math.floor(
            data.new_valid_from.getTime() / 1000
          );
        }
        if (
          data.new_valid_to instanceof Date &&
          !isNaN(data.new_valid_to) &&
          Math.floor(data.new_valid_to.getTime() / 1000) !==
            originalAuth.valid_to
        ) {
          updateData.new_valid_to = Math.floor(
            data.new_valid_to.getTime() / 1000
          );
        }
        // Format new_auth only if it was provided in the form data
        if (data.new_auth) {
          const formattedNewAuth = formatAuth(data.new_auth);
          // Include only if validly formatted (formatAuth returns undefined otherwise)
          if (formattedNewAuth) {
            // TODO: Optionally compare formattedNewAuth with originalAuth.auth (requires mapping original too)
            // For simplicity, include if validly formatted and *provided* by user input
            updateData.new_auth = formattedNewAuth;
          } else {
            // Throw error if user provided auth data but it was invalid after formatting
            throw new Error(t("CustomAuthority:errorAuthMissing")); // Re-use error message
          }
        }

        const restrictionsToRemove = parseIndicesString(
          data.restrictions_to_remove
        );
        if (restrictionsToRemove.length > 0) {
          updateData.restrictions_to_remove = restrictionsToRemove;
        }
        // Format restrictions_to_add only if it exists and has items
        if (data.restrictions_to_add && data.restrictions_to_add.length > 0) {
          updateData.restrictions_to_add = formatRestrictions(
            data.restrictions_to_add
          );
        }

        // Check if anything was actually added to updateData
        const updateKeys = Object.keys(updateData).filter(
          (k) =>
            !["fee", "account", "authority_to_update", "extensions"].includes(k)
        );
        if (updateKeys.length === 0) {
          throw new Error(t("CustomAuthority:errorNothingToUpdate"));
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

      // If formatting/validation passed, proceed to show deeplink
      console.log("Prepared Deeplink Data:", { operationName, finalTrxJSON });
      setDeeplinkData({
        operationNames: [operationName],
        trxJSON: [finalTrxJSON],
        headerText: t(`CustomAuthority:deeplinkHeader_${mode}`),
        username: usr.username,
        usrChain: usr.chain,
        userID: usr.id,
      });
      setShowDeeplink(true);
    } catch (error) {
      // Catch errors from formatting helpers or logic above
      console.error("Error preparing transaction:", error);
      setSubmissionError(error.message || t("CustomAuthority:errorFormatting"));
    }
  }; // End onSubmit wrapper
  // --- End Submission Logic ---

  return (
    <div className="container mx-auto mt-5 mb-5">
      <Card>
        {/* Use namespaced keys */}
        <CardHeader>
          <CardTitle>{t("CustomAuthority:title")}</CardTitle>
          <CardDescription>{t("CustomAuthority:description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={mode}
            onValueChange={(newMode) => {
              setSelectedAuthorityId(null);
              setMode(newMode);
            }}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="create">
                {t("CustomAuthority:createTab")}
              </TabsTrigger>
              <TabsTrigger
                value="update"
                disabled={
                  !existingAuthorityDetails.length && !loadingAuthorities
                }
              >
                {t("CustomAuthority:updateTab")}
              </TabsTrigger>
              <TabsTrigger
                value="delete"
                disabled={
                  !existingAuthorityDetails.length && !loadingAuthorities
                }
              >
                {t("CustomAuthority:deleteTab")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {errorAuthorities && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("CustomAuthority:errorTitle")}</AlertTitle>
              <AlertDescription>{errorAuthorities}</AlertDescription>
            </Alert>
          )}
          {loadingAuthorities && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          )}

          {!loadingAuthorities && (mode === "update" || mode === "delete") && (
            <ExistingAuthoritiesList
              authorities={existingAuthorityDetails}
              selectedAuthorityId={selectedAuthorityId}
              setSelectedAuthorityId={setSelectedAuthorityId}
              opTypes={opTypes}
              // t prop removed
            />
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={`space-y-6 ${loadingAuthorities ? "mt-4" : ""}`}
            >
              {/* Delete Mode */}
              {mode === "delete" && selectedAuthorityId && (
                <div className="border p-4 rounded bg-destructive/10">
                  <p className="mb-4">
                    {t("CustomAuthority:deleteConfirmation", {
                      id: selectedAuthorityId,
                    })}
                  </p>
                  <Button type="submit" variant="destructive">
                    {t("CustomAuthority:deleteButton")}
                  </Button>
                </div>
              )}

              {/* Create/Update Mode */}
              {(mode === "create" ||
                (mode === "update" && selectedAuthorityId)) && (
                <>
                  <Card className="p-4 space-y-4">
                    <FormField
                      control={form.control}
                      name={mode === "update" ? "new_enabled" : "enabled"}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              id="authEnabledCheckbox"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel htmlFor="authEnabledCheckbox">
                              {t("CustomAuthority:enabledLabel")}
                            </FormLabel>
                            <FormDescription>
                              {t("CustomAuthority:enabledDescription")}
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={
                          mode === "update" ? "new_valid_from" : "valid_from"
                        }
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("CustomAuthority:validFromLabel")}
                            </FormLabel>
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
                        name={mode === "update" ? "new_valid_to" : "valid_to"}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("CustomAuthority:validToLabel")}
                            </FormLabel>
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
                    </div>
                    {mode === "create" && (
                      <FormField
                        control={form.control}
                        name="operation_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("CustomAuthority:operationTypeLabel")}
                            </FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(Number(value))
                              }
                              value={
                                field.value !== undefined
                                  ? field.value.toString()
                                  : ""
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t(
                                      "CustomAuthority:operationTypePlaceholder"
                                    )}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white max-h-[300px]">
                                {Object.entries(opTypes).map(([key, value]) => (
                                  <SelectItem
                                    key={key}
                                    value={key}
                                  >{`${value} (${key})`}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t("CustomAuthority:operationTypeDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </Card>

                  <Card className="p-4">
                    <AuthorityAuthEditor
                      control={form.control}
                      authFieldName={mode === "update" ? "new_auth" : "auth"}
                      usrChain={usr.chain} /* t prop removed */
                    />
                  </Card>

                  <Card className="p-4">
                    <AuthorityRestrictionsEditor
                      control={form.control}
                      restrictionsFieldName={
                        mode === "update"
                          ? "restrictions_to_add"
                          : "restrictions"
                      }
                      operationTypeValue={
                        mode === "create"
                          ? form.watch("operation_type")
                          : existingAuthorityDetails.find(
                              (auth) => auth?.id === selectedAuthorityId
                            )?.operation_type
                      }
                      assets={assets}
                      chain={_chain} /* t prop removed */
                    />
                    {mode === "update" && (
                      <div className="pt-4">
                        <FormField
                          control={form.control}
                          name="restrictions_to_remove"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("CustomAuthority:restrictionsToRemoveLabel")}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder={t(
                                    "CustomAuthority:restrictionIndicesPlaceholder"
                                  )}
                                  {...field}
                                  onChange={(e) => {
                                    const s = e.target.value.replace(
                                      /[^0-9,\s]/g,
                                      ""
                                    );
                                    field.onChange(s);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                {t(
                                  "CustomAuthority:restrictionsToRemoveDescription"
                                )}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </Card>

                  {submissionError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t("CustomAuthority:errorTitle")}</AlertTitle>
                      <AlertDescription>{submissionError}</AlertDescription>
                    </Alert>
                  )}
                  <Separator className="mt-6 mb-4" />
                  <Button
                    type="submit"
                    disabled={
                      loadingAuthorities ||
                      (mode !== "create" && !selectedAuthorityId)
                    }
                  >
                    {mode === "create"
                      ? t("CustomAuthority:createButton")
                      : t("CustomAuthority:updateButton")}
                  </Button>
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {showDeeplink && deeplinkData && (
        <DeepLinkDialog
          operationNames={deeplinkData.operationNames}
          username={deeplinkData.username}
          usrChain={deeplinkData.usrChain}
          userID={deeplinkData.userID}
          dismissCallback={() => setShowDeeplink(false)}
          key={`CustomAuthorityDL_${mode}${selectedAuthorityId || ""}`}
          headerText={deeplinkData.headerText}
          trxJSON={deeplinkData.trxJSON}
        />
      )}
    </div>
  );
}
