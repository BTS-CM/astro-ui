import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Pickaxe, Send } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldError } from "@/components/ui/field";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createAssetFromSymbolStore } from "@/nanoeffects/Assets.ts";
import { blockchainFloat } from "@/lib/common"; // Assuming blockchainFloat is available

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";

import { humanReadableFloat } from "@/lib/common";

// Constants from config.hpp.txt & worker.cpp.txt
const MAX_WORKER_NAME_LENGTH = 63;
const MAX_URL_LENGTH = 127;

// Helper to safely parse number inputs
const safeParseInt = (value, defaultValue = 0) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseFloat = (value, defaultValue = 0.0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * WorkerCreate component enables users to create worker proposals on the Bitshares blockchain.
 */
export default function WorkerCreate(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNodeUrl = useStore($currentNodeUrl);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const form = useForm({
    defaultValues: {
      workerName: "",
      workerUrl: "",
      dailyPay: 0,
      startDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() + 7); // Default start date 1 week from now
        return date;
      })(),
      endDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() + 14); // Default end date 1 week after start
        return date;
      })(),
      workerType: "vesting",
      vestingDays: 7,
    },
  });

  const { watch, control, setValue } = form;
  const workerName = watch("workerName");
  const workerUrl = watch("workerUrl");
  const dailyPay = watch("dailyPay");
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const workerType = watch("workerType");
  const vestingDays = watch("vestingDays");

  const [showDialog, setShowDialog] = useState(false);

  const [coreAsset, setCoreAsset] = useState(null);
  const [coreAssetLoading, setCoreAssetLoading] = useState(true);

  // Fetch core asset details (BTS or TEST)
  useEffect(() => {
    if (usr && usr.chain && currentNodeUrl) {
      setCoreAssetLoading(true);
      const coreAssetSymbol = usr.chain === "bitshares" ? "BTS" : "TEST";

      async function fetchCoreAsset() {
        const assetStore = createAssetFromSymbolStore([
          usr.chain,
          coreAssetSymbol,
          currentNodeUrl,
        ]);

        assetStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setCoreAsset(data.assetData);
            setCoreAssetLoading(false);
          } else if (error) {
            console.error(
              `Error fetching core asset ${coreAssetSymbol}:`,
              error
            );
            setCoreAssetLoading(false);
          }
        });
      }

      fetchCoreAsset();
    }
  }, [usr, currentNodeUrl]);

  const canSubmit = useMemo(() => coreAsset, [coreAsset]);

  // Construct Initializer based on worker type
  const initializer = useMemo(() => {
    switch (workerType) {
      case "vesting":
        return [1, { pay_vesting_period_days: safeParseInt(vestingDays, 0) }];
      case "burn":
        return [2, {}];
      case "refund":
      default:
        return [0, {}];
    }
  }, [workerType, vestingDays]);

  // Construct Transaction JSON
  const trxJSON = useMemo(() => {
    if (!usr || !usr.id || !coreAsset || !canSubmit) return null;

    // Dates need to be in ISO format for bitsharesjs
    const beginDateISO = startDate ? startDate.toISOString().slice(0, 19) : "";
    const endDateISO = endDate ? endDate.toISOString().slice(0, 19) : "";

    return [
      {
        fee: { amount: 0, asset_id: "1.3.0" }, // Fee handled by wallet
        owner: usr.id,
        work_begin_date: beginDateISO,
        work_end_date: endDateISO,
        daily_pay: blockchainFloat(dailyPay, coreAsset.precision),
        name: workerName,
        url: workerUrl,
        initializer: initializer,
        extensions: {},
      },
    ];
  }, [
    usr,
    startDate,
    endDate,
    dailyPay,
    workerName,
    workerUrl,
    initializer,
    coreAsset,
    canSubmit,
  ]);

  if (coreAssetLoading) {
    return (
      <div className="container mx-auto mt-5 mb-5">
        <Card className="relative overflow-hidden border-[hsl(var(--accent-1)/0.15)] bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)]">
          <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-1)/0.2)] blur-3xl" />
          <div className="p-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </div>
          <div className="p-4 pt-0">
            <Skeleton className="h-64 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4">
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)]">
          <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-1)/0.2)] blur-3xl" />
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1)/0.7)] via-[hsl(var(--accent-2)/0.7)] to-[hsl(var(--accent-1)/0.7)]" />
          <CardHeader className="pb-0">
            <CardTitle className="text-lg bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                <Pickaxe className="h-4.5 w-4.5" />
              </span>
              {t("WorkerCreate:title")}
            </CardTitle>
            <CardDescription>{t("WorkerCreate:description")}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <form
              onSubmit={form.handleSubmit(() => setShowDialog(true))}
              className="space-y-4"
            >
              <FieldGroup>
                <Controller
                  name="workerName"
                  control={control}
                  rules={{
                    required: t("WorkerCreate:nameError", {
                      maxLength: MAX_WORKER_NAME_LENGTH,
                    }),
                    maxLength: {
                      value: MAX_WORKER_NAME_LENGTH,
                      message: t("WorkerCreate:nameError", {
                        maxLength: MAX_WORKER_NAME_LENGTH,
                      }),
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <Field invalid={fieldState.invalid}>
                      <HoverInfo
                        content={t("WorkerCreate:nameInfo")}
                        header={t("WorkerCreate:nameInfoHeader")}
                      />
                      <Input
                        {...field}
                        id="workerName"
                        placeholder={t("WorkerCreate:namePlaceholder")}
                        maxLength={MAX_WORKER_NAME_LENGTH}
                        className="border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                      />
                      {fieldState.error && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="workerUrl"
                  control={control}
                  rules={{
                    required: t("WorkerCreate:urlError", {
                      maxLength: MAX_URL_LENGTH,
                    }),
                    maxLength: {
                      value: MAX_URL_LENGTH,
                      message: t("WorkerCreate:urlError", {
                        maxLength: MAX_URL_LENGTH,
                      }),
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <Field invalid={fieldState.invalid}>
                      <HoverInfo
                        content={t("WorkerCreate:urlInfo")}
                        header={t("WorkerCreate:urlInfoHeader")}
                      />
                      <Input
                        {...field}
                        id="workerUrl"
                        placeholder={t("WorkerCreate:urlPlaceholder")}
                        maxLength={MAX_URL_LENGTH}
                        className="border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                      />
                      {fieldState.error && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </Field>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="startDate"
                    control={control}
                    rules={{
                      validate: (value) =>
                        value < new Date() ? t("WorkerCreate:dateError") : true,
                    }}
                    render={({ field, fieldState }) => (
                      <Field invalid={fieldState.invalid}>
                        <HoverInfo
                          content={t("WorkerCreate:startDateInfo")}
                          header={t("WorkerCreate:startDateInfoHeader")}
                        />
                        <DateTimePicker
                          value={field.value}
                          onChange={(newDate) => {
                            const nowPlusGrace = new Date();
                            nowPlusGrace.setSeconds(
                              nowPlusGrace.getSeconds() + 60
                            );
                            if (newDate >= nowPlusGrace) {
                              field.onChange(newDate);
                              if (endDate <= newDate) {
                                const nextDay = new Date(newDate);
                                nextDay.setDate(nextDay.getDate() + 1);
                                setValue("endDate", nextDay);
                              }
                            } else {
                              const defaultStartDate = new Date();
                              defaultStartDate.setDate(
                                defaultStartDate.getDate() + 7
                              );
                              field.onChange(defaultStartDate);
                            }
                          }}
                        />
                        {fieldState.error && (
                          <FieldError>{fieldState.error.message}</FieldError>
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="endDate"
                    control={control}
                    rules={{
                      validate: (value) =>
                        value <= startDate ? t("WorkerCreate:dateError") : true,
                    }}
                    render={({ field, fieldState }) => (
                      <Field invalid={fieldState.invalid}>
                        <HoverInfo
                          content={t("WorkerCreate:endDateInfo")}
                          header={t("WorkerCreate:endDateInfoHeader")}
                        />
                        <DateTimePicker
                          value={field.value}
                          onChange={(newDate) => {
                            if (newDate > startDate) {
                              field.onChange(newDate);
                            } else {
                              const defaultEndDate = new Date(startDate);
                              defaultEndDate.setFullYear(
                                defaultEndDate.getFullYear() + 1
                              );
                              field.onChange(defaultEndDate);
                            }
                          }}
                          disabled={!startDate}
                        />
                        {fieldState.error && (
                          <FieldError>{fieldState.error.message}</FieldError>
                        )}
                      </Field>
                    )}
                  />
                </div>

                <Controller
                  name="dailyPay"
                  control={control}
                  rules={{
                    min: {
                      value: 0.00001,
                      message: t("WorkerCreate:payError"),
                    },
                    max: {
                      value: 500000,
                      message: t("WorkerCreate:payError"),
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <Field invalid={fieldState.invalid}>
                      <HoverInfo
                        content={t("WorkerCreate:dailyPayInfo", {
                          coresymbol: _chain === "bitshares" ? "BTS" : "TEST",
                        })}
                        header={t("WorkerCreate:dailyPayInfoHeader")}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <Input
                            {...field}
                            id="dailyPay"
                            type="number"
                            step={"1"}
                            placeholder={t("WorkerCreate:dailyPayLabel", {
                              coresymbol: _chain === "bitshares" ? "BTS" : "TEST",
                            })}
                            onChange={(e) => {
                              const value = safeParseFloat(e.target.value, 0);
                              field.onChange(value);
                            }}
                            className="border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                            disabled={!coreAsset}
                          />
                        </div>
                        <div>
                          <Input
                            value={`${_chain === "bitshares" ? "BTS" : "TEST"} (1.3.0)`}
                            disabled
                            className="border-[hsl(var(--accent-1)/0.1)] bg-muted/50 text-muted-foreground cursor-not-allowed"
                          />
                        </div>
                      </div>
                      {fieldState.error && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </Field>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="workerType"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <HoverInfo
                          content={t("WorkerCreate:workerTypeInfo")}
                          header={t("WorkerCreate:workerTypeInfoHeader")}
                        />
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="border-[hsl(var(--accent-1)/0.2)] bg-card/60">
                            <SelectValue
                              placeholder={t(
                                "WorkerCreate:workerTypePlaceholder"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="vesting">
                                {t("WorkerCreate:vestingWorker")}
                              </SelectItem>
                              <SelectItem value="refund">
                                {t("WorkerCreate:refundWorker")}
                              </SelectItem>
                              <SelectItem value="burn">
                                {t("WorkerCreate:burnWorker")}
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  {workerType === "vesting" && (
                    <Controller
                      name="vestingDays"
                      control={control}
                      rules={{
                        min: {
                          value: 0,
                          message: t("WorkerCreate:vestingError"),
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                          <HoverInfo
                            content={t("WorkerCreate:vestingDaysInfo")}
                            header={t("WorkerCreate:vestingDaysInfoHeader")}
                          />
                          <Input
                            {...field}
                            id="vestingDays"
                            type="number"
                            min="0"
                            step="1"
                            onChange={(e) =>
                              field.onChange(safeParseInt(e.target.value, 0))
                            }
                            className="border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                          />
                          {fieldState.error && (
                            <FieldError>{fieldState.error.message}</FieldError>
                          )}
                        </Field>
                      )}
                    />
                  )}
                </div>

                <Button
                  type="submit"
                  className="mt-4 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:shadow-[color:hsl(var(--accent-1)/0.4)] active:scale-95 transition-all duration-200 cursor-pointer"
                  disabled={!form.formState.isValid || !canSubmit}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t("WorkerCreate:publishButton")}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>

      {showDialog && usr && trxJSON ? (
        <DeepLinkDialog
          operationNames={["worker_create"]}
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`WorkerCreateSubmit_${usr.id}_${workerName}`}
          headerText={t("WorkerCreate:deeplinkHeader", { name: workerName })}
          trxJSON={trxJSON}
        />
      ) : null}
    </>
  );
}
