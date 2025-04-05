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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { $currentNode } from "@/stores/node.ts";
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
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const [workerName, setWorkerName] = useState("");
  const [workerUrl, setWorkerUrl] = useState("");
  const [dailyPay, setDailyPay] = useState(0);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Default start date 1 week from now
    return date;
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date(startDate);
    date.setFullYear(date.getFullYear() + 1); // Default end date 1 year after start
    return date;
  });
  const [workerType, setWorkerType] = useState("vesting"); // Default to vesting
  const [vestingDays, setVestingDays] = useState(7); // Default vesting period

  const [showDialog, setShowDialog] = useState(false);

  const [coreAsset, setCoreAsset] = useState(null);
  const [coreAssetLoading, setCoreAssetLoading] = useState(true);

  // Fetch core asset details (BTS or TEST)
  useEffect(() => {
    let unsubscribe;
    if (usr && usr.chain && currentNode) {
      setCoreAssetLoading(true);
      const coreAssetSymbol = usr.chain === "bitshares" ? "BTS" : "TEST";
      const assetStore = createAssetFromSymbolStore([
        usr.chain,
        coreAssetSymbol,
        currentNode.url,
      ]);
      unsubscribe = assetStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setCoreAsset(data.assetData);
          setCoreAssetLoading(false);
        } else if (error) {
          console.error(`Error fetching core asset ${coreAssetSymbol}:`, error);
          setCoreAssetLoading(false);
        }
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [usr, currentNode]);

  // Form Validation Checks
  const isNameValid = useMemo(
    () => workerName.length > 0 && workerName.length <= MAX_WORKER_NAME_LENGTH,
    [workerName]
  );
  const isUrlValid = useMemo(
    () => workerUrl.length > 0 && workerUrl.length <= MAX_URL_LENGTH,
    [workerUrl]
  );
  const isPayValid = useMemo(() => dailyPay > 0, [dailyPay]);
  const areDatesValid = useMemo(
    () => startDate && endDate && endDate > startDate,
    [startDate, endDate]
  );
  const isVestingValid = useMemo(
    () =>
      workerType !== "vesting" ||
      (workerType === "vesting" && vestingDays >= 0),
    [workerType, vestingDays]
  );

  const canSubmit = useMemo(
    () =>
      isNameValid &&
      isUrlValid &&
      isPayValid &&
      areDatesValid &&
      isVestingValid &&
      coreAsset,
    [
      isNameValid,
      isUrlValid,
      isPayValid,
      areDatesValid,
      isVestingValid,
      coreAsset,
    ]
  );

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

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("WorkerCreate:title")}</CardTitle>
            <CardDescription>{t("WorkerCreate:description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowDialog(true);
              }}
              className="space-y-4"
            >
              {/* Worker Name */}
              <div className="space-y-2">
                <HoverInfo
                  content={t("WorkerCreate:nameInfo")}
                  header={t("WorkerCreate:nameInfoHeader")}
                />{" "}
                <Input
                  id="workerName"
                  placeholder={t("WorkerCreate:namePlaceholder")}
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  maxLength={MAX_WORKER_NAME_LENGTH}
                />
                {!isNameValid && workerName.length > 0 ? (
                  <p className="text-sm text-red-500">
                    {t("WorkerCreate:nameError", {
                      maxLength: MAX_WORKER_NAME_LENGTH,
                    })}
                  </p>
                ) : null}
              </div>

              {/* URL */}
              <div className="space-y-2">
                <HoverInfo
                  content={t("WorkerCreate:urlInfo")}
                  header={t("WorkerCreate:urlInfoHeader")}
                />{" "}
                <Input
                  id="workerUrl"
                  placeholder={t("WorkerCreate:urlPlaceholder")}
                  value={workerUrl}
                  onChange={(e) => setWorkerUrl(e.target.value)}
                  maxLength={MAX_URL_LENGTH}
                />
                {!isUrlValid && workerUrl.length > 0 ? (
                  <p className="text-sm text-red-500">
                    {t("WorkerCreate:urlError", { maxLength: MAX_URL_LENGTH })}
                  </p>
                ) : null}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <HoverInfo
                    content={t("WorkerCreate:startDateInfo")}
                    header={t("WorkerCreate:startDateInfoHeader")}
                  />{" "}
                  <DateTimePicker
                    value={startDate}
                    onChange={(newDate) => {
                      const nowPlusGrace = new Date();
                      nowPlusGrace.setSeconds(nowPlusGrace.getSeconds() + 60); // Add 1 minute grace period
                      if (newDate >= nowPlusGrace) {
                        setStartDate(newDate);
                        // Ensure end date is always after start date
                        if (endDate <= newDate) {
                          const nextDay = new Date(newDate);
                          nextDay.setDate(nextDay.getDate() + 1);
                          setEndDate(nextDay);
                        }
                      } else {
                        // Optionally provide feedback or reset to default
                        const defaultStartDate = new Date();
                        defaultStartDate.setDate(
                          defaultStartDate.getDate() + 7
                        );
                        setStartDate(defaultStartDate);
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <HoverInfo
                    content={t("WorkerCreate:endDateInfo")}
                    header={t("WorkerCreate:endDateInfoHeader")}
                  />
                  <DateTimePicker
                    value={endDate}
                    onChange={(newDate) => {
                      if (newDate > startDate) {
                        setEndDate(newDate);
                      } else {
                        // Optionally provide feedback or reset to default
                        const defaultEndDate = new Date(startDate);
                        defaultEndDate.setFullYear(
                          defaultEndDate.getFullYear() + 1
                        );
                        setEndDate(defaultEndDate);
                      }
                    }}
                    disabled={!startDate}
                  />
                  {!areDatesValid && startDate && endDate ? (
                    <p className="text-sm text-red-500">
                      {t("WorkerCreate:dateError")}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Daily Pay */}
              <div className="space-y-2">
                <HoverInfo
                  content={t("WorkerCreate:dailyPayInfo")}
                  header={t("WorkerCreate:dailyPayInfoHeader")}
                />{" "}
                <Input
                  id="dailyPay"
                  type="number"
                  step={"1"}
                  onChange={(e) => {
                    const value = safeParseFloat(e.target.value, 0);
                    const minVal = 0.00001;
                    const maxVal = 500000;
                    if (value >= minVal && value <= maxVal) {
                      setDailyPay(value);
                    } else if (value < minVal) {
                      setDailyPay(minVal);
                    } else if (value > maxVal) {
                      setDailyPay(maxVal);
                    }
                  }}
                  className="w-1/4"
                  value={dailyPay}
                  disabled={!coreAsset}
                />
                {!isPayValid && dailyPay !== 0 ? (
                  <p className="text-sm text-red-500">
                    {t("WorkerCreate:payError")}
                  </p>
                ) : null}
              </div>

              {/* Worker Type & Vesting Period */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <HoverInfo
                    content={t("WorkerCreate:workerTypeInfo")}
                    header={t("WorkerCreate:workerTypeInfoHeader")}
                  />
                  <Select value={workerType} onValueChange={setWorkerType}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("WorkerCreate:workerTypePlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="vesting">
                          {t("WorkerCreate:vestingWorker")}
                        </SelectItem>{" "}
                        <SelectItem value="refund">
                          {t("WorkerCreate:refundWorker")}
                        </SelectItem>{" "}
                        <SelectItem value="burn">
                          {t("WorkerCreate:burnWorker")}
                        </SelectItem>{" "}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                {workerType === "vesting" && (
                  <div className="space-y-2">
                    <HoverInfo
                      content={t("WorkerCreate:vestingDaysInfo")}
                      header={t("WorkerCreate:vestingDaysInfoHeader")}
                    />{" "}
                    <Input
                      id="vestingDays"
                      type="number"
                      min="0"
                      step="1"
                      value={vestingDays}
                      onChange={(e) =>
                        setVestingDays(safeParseInt(e.target.value, 0))
                      }
                    />
                    {!isVestingValid ? (
                      <p className="text-sm text-red-500">
                        {t("WorkerCreate:vestingError")}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <Button type="submit" className="mt-4" disabled={!canSubmit}>
                {t("WorkerCreate:publishButton")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Deeplink Dialog */}
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
