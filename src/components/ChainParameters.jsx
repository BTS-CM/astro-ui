import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { opTypes } from "@/lib/opTypes"; // Assuming opTypes is imported correctly

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { blockchainFloat } from "@/lib/common"; // Assuming blockchainFloat is available

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";

// Helper to safely parse number inputs
const safeParseInt = (value, defaultValue = 0) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseFloat = (value, defaultValue = 0.0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Helper to convert readable percentage to blockchain format (e.g., 20 -> 2000)
const percentToBlockchain = (value) => {
  const parsed = safeParseFloat(value, 0);
  return Math.round(parsed * 100);
};

// Helper to convert blockchain percentage to readable format (e.g., 2000 -> 20)
const blockchainToPercent = (value) => {
  const parsed = safeParseInt(value, 0);
  return parsed / 100;
};

/**
 * ChainParameters component allows committee members to update global blockchain parameters.
 */
export default function ChainParameters(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const [currentParams, setCurrentParams] = useState(null);
  const [newParams, setNewParams] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [feeParams, setFeeParams] = useState([]);

  // Fetch current global parameters (2.0.0)
  useEffect(() => {
    let unsubscribe;
    if (usr && usr.chain && currentNode) {
      setLoading(true);
      const globalParamsStore = createObjectStore([
        usr.chain,
        JSON.stringify(["2.0.0"]),
        currentNode.url,
      ]);

      unsubscribe = globalParamsStore.subscribe(
        ({ data, error, loading: dataLoading }) => {
          if (data && !error && !dataLoading && data[0]) {
            const fetchedParams = data[0].parameters;
            // Deep copy to prevent accidental mutation of the original store data
            const paramsCopy = JSON.parse(JSON.stringify(fetchedParams));
            setCurrentParams(paramsCopy);
            setNewParams(paramsCopy); // Initialize newParams with current values
            setFeeParams(paramsCopy.current_fees.parameters); // Initialize fee state
            setLoading(false);
          } else if (error) {
            console.error("Error fetching global parameters:", error);
            setLoading(false);
          }
        }
      );
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [usr, currentNode]);

  // Handler for general parameter changes
  const handleParamChange = (key, value, type = "number") => {
    setNewParams((prevParams) => {
      let processedValue = value;
      if (type === "number") {
        processedValue = safeParseInt(value);
      } else if (type === "boolean") {
        processedValue = value; // Checkbox value is already boolean
      } else if (type === "blockchainFloat") {
        processedValue = blockchainFloat(safeParseFloat(value), 5); // Assuming precision 5 for large numbers like budget/pay
      } else if (type === "percentage") {
        processedValue = percentToBlockchain(value);
      }
      return {
        ...prevParams,
        [key]: processedValue,
      };
    });
  };

  // Handler for fee parameter changes
  const handleFeeChange = (opIndex, feeKey, value) => {
    setFeeParams((prevFees) =>
      prevFees.map((feeEntry) => {
        if (feeEntry[0] === opIndex) {
          const updatedOpFees = { ...feeEntry[1] };
          const parsedValue = safeParseInt(value); // Fees are integers
          // Handle nested fee structures like account_create
          if (feeKey.includes(".")) {
            const keys = feeKey.split(".");
            let currentLevel = updatedOpFees;
            for (let i = 0; i < keys.length - 1; i++) {
              if (!currentLevel[keys[i]]) {
                currentLevel[keys[i]] = {}; // Create nested object if it doesn't exist
              }
              currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = parsedValue;
          } else {
            updatedOpFees[feeKey] = parsedValue;
          }
          return [opIndex, updatedOpFees];
        }
        return feeEntry;
      })
    );
  };

  // Update newParams when feeParams change
  useEffect(() => {
    if (newParams) {
      // Create a deep copy to avoid direct state mutation
      const updatedParams = JSON.parse(JSON.stringify(newParams));
      updatedParams.current_fees.parameters = feeParams;
      setNewParams(updatedParams);
    }
  }, [feeParams]);

  // Construct the final transaction JSON
  const finalTrxJSON = useMemo(() => {
    if (!newParams) return null;
    // Ensure all numeric fields are numbers, not strings
    const processedParams = { ...newParams };
    for (const key in processedParams) {
      if (
        typeof currentParams[key] === "number" &&
        typeof processedParams[key] === "string"
      ) {
        if (
          [
            "cashback_vesting_threshold",
            "witness_pay_per_block",
            "worker_budget_per_day",
            "fee_liquidation_threshold",
          ].includes(key)
        ) {
          processedParams[key] = blockchainFloat(
            safeParseFloat(processedParams[key]),
            5
          );
        } else {
          processedParams[key] = safeParseInt(processedParams[key]);
        }
      } else if (
        [
          "reserve_percent_of_fee",
          "network_percent_of_fee",
          "lifetime_referrer_percent_of_fee",
        ].includes(key) &&
        typeof processedParams[key] === "string"
      ) {
        processedParams[key] = percentToBlockchain(processedParams[key]);
      }
    }

    // Ensure fees are integers
    processedParams.current_fees.parameters =
      processedParams.current_fees.parameters.map((entry) => {
        const opIndex = entry[0];
        const fees = { ...entry[1] }; // Copy fee object
        for (const feeKey in fees) {
          if (typeof fees[feeKey] === "string") {
            fees[feeKey] = safeParseInt(fees[feeKey]);
          }
        }
        return [opIndex, fees];
      });

    return {
      fee: { amount: 0, asset_id: "1.3.0" }, // Fee is paid by the proposer, set by wallet
      new_parameters: processedParams,
      extensions: [],
    };
  }, [newParams, currentParams]); // Added currentParams dependency

  if (loading) {
    return (
      <div className="container mx-auto mt-5 mb-5">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentParams || !newParams) {
    return (
      <div className="container mx-auto mt-5 mb-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("ChainParameters:errorTitle")}</CardTitle>
            <CardDescription>
              {t("ChainParameters:errorDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Function to render fee inputs based on fee object structure
  const renderFeeInputs = (opIndex, feeObj) => {
    return Object.keys(feeObj).map((feeKey) => (
      <div key={`${opIndex}-${feeKey}`} className="mb-2">
        <Label htmlFor={`${opIndex}-${feeKey}`}>{feeKey}</Label>
        <HoverInfo
          content={t(`ChainParameters:Fees:${feeKey}_content`)}
          header={t(`ChainParameters:Fees:${feeKey}_header`)}
        />
        <Input
          id={`${opIndex}-${feeKey}`}
          type="number"
          min="0"
          value={feeObj[feeKey] || 0}
          onChange={(e) => handleFeeChange(opIndex, feeKey, e.target.value)}
          className="mt-1"
        />
      </div>
    ));
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("ChainParameters:title")}</CardTitle>
            <CardDescription>
              {t("ChainParameters:description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowDialog(true);
              }}
            >
              <Accordion type="single" collapsible className="w-full">
                {/* General Parameters */}
                <AccordionItem value="general">
                  <AccordionTrigger>
                    {t("ChainParameters:generalParameters")}
                  </AccordionTrigger>
                  <AccordionContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {Object.keys(newParams)
                      .filter(
                        (key) => key !== "current_fees" && key !== "extensions"
                      )
                      .map((key) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key}>{key.replace(/_/g, " ")}</Label>
                          <HoverInfo
                            content={t(`ChainParameters:${key}_content`)}
                            header={t(`ChainParameters:${key}_header`)}
                          />
                          {typeof currentParams[key] === "boolean" ? (
                            <Checkbox
                              id={key}
                              checked={newParams[key]}
                              onCheckedChange={(checked) =>
                                handleParamChange(key, checked, "boolean")
                              }
                            />
                          ) : (
                            <Input
                              id={key}
                              type="number"
                              value={
                                [
                                  "reserve_percent_of_fee",
                                  "network_percent_of_fee",
                                  "lifetime_referrer_percent_of_fee",
                                ].includes(key)
                                  ? blockchainToPercent(newParams[key])
                                  : [
                                      "cashback_vesting_threshold",
                                      "witness_pay_per_block",
                                      "worker_budget_per_day",
                                      "fee_liquidation_threshold",
                                    ].includes(key)
                                  ? humanReadableFloat(newParams[key], 5) // Use human readable for large numbers
                                  : newParams[key] ?? 0
                              }
                              onChange={(e) =>
                                handleParamChange(
                                  key,
                                  e.target.value,
                                  [
                                    "cashback_vesting_threshold",
                                    "witness_pay_per_block",
                                    "worker_budget_per_day",
                                    "fee_liquidation_threshold",
                                  ].includes(key)
                                    ? "blockchainFloat"
                                    : [
                                        "reserve_percent_of_fee",
                                        "network_percent_of_fee",
                                        "lifetime_referrer_percent_of_fee",
                                      ].includes(key)
                                    ? "percentage"
                                    : "number"
                                )
                              }
                              min="0"
                              step={
                                [
                                  "reserve_percent_of_fee",
                                  "network_percent_of_fee",
                                  "lifetime_referrer_percent_of_fee",
                                ].includes(key)
                                  ? "0.01"
                                  : "1"
                              }
                            />
                          )}
                        </div>
                      ))}
                  </AccordionContent>
                </AccordionItem>

                {/* Fee Parameters */}
                <AccordionItem value="fees">
                  <AccordionTrigger>
                    {t("ChainParameters:feeParameters")}
                  </AccordionTrigger>
                  <AccordionContent className="p-4">
                    <div className="mb-4 space-y-2">
                      <Label htmlFor="fee_scale">
                        {t("ChainParameters:feeScale")}
                      </Label>
                      <HoverInfo
                        content={t("ChainParameters:feeScale_content")}
                        header={t("ChainParameters:feeScale_header")}
                      />
                      <Input
                        id="fee_scale"
                        type="number"
                        min="0"
                        value={newParams.current_fees.scale}
                        onChange={(e) =>
                          setNewParams((prev) => ({
                            ...prev,
                            current_fees: {
                              ...prev.current_fees,
                              scale: safeParseInt(e.target.value),
                            },
                          }))
                        }
                        className="w-1/3"
                      />
                    </div>
                    <Accordion type="multiple" className="w-full">
                      {feeParams.map((feeEntry) => {
                        const opIndex = feeEntry[0];
                        const feeObj = feeEntry[1];
                        const opName =
                          opTypes[opIndex] || `Unknown Operation ${opIndex}`;
                        return (
                          <AccordionItem
                            value={`op-${opIndex}`}
                            key={`op-${opIndex}`}
                          >
                            <AccordionTrigger>
                              {opName} ({opIndex})
                            </AccordionTrigger>
                            <AccordionContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                              {Object.keys(feeObj).length > 0 ? (
                                renderFeeInputs(opIndex, feeObj)
                              ) : (
                                <p>{t("ChainParameters:noFees")}</p>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Button type="submit" className="mt-4">
                {t("ChainParameters:proposeChanges")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {showDialog && usr && finalTrxJSON ? (
        <DeepLinkDialog
          operationNames={["committee_member_update_global_parameters"]}
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`UpdateGlobalParams_${usr.id}`}
          headerText={t("ChainParameters:deeplinkHeader")}
          trxJSON={[finalTrxJSON]}
        />
      ) : null}
    </>
  );
}
