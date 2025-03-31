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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Re-using for Name for potentially longer descriptions
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

// Constants from config.hpp.txt & worker.cpp.txt
const MAX_WORKER_NAME_LENGTH = 63; // [cite: 87, 110]
const MAX_URL_LENGTH = 127; // [cite: 87, 110]

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
    date.setDate(date.getDate() + 7); // Default start date 1 week from now [cite: 159]
    return date;
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date(startDate);
    date.setFullYear(date.getFullYear() + 1); // Default end date 1 year after start
    return date;
  });
  const [workerType, setWorkerType] = useState("vesting"); // Default to vesting [cite: 128, 163]
  const [vestingDays, setVestingDays] = useState(7); // Default vesting period [cite: 163]

  const [isLifetimeMember, setIsLifetimeMember] = useState(false);
  const [loadingLtm, setLoadingLtm] = useState(true);
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

  // Fetch user account details to check LTM status [cite: 144, 156]
  useEffect(() => {
    let unsubscribe;
    if (usr && usr.chain && usr.id && currentNode) {
      setLoadingLtm(true);
      const userStore = createObjectStore([
        usr.chain,
        JSON.stringify([usr.id]),
        currentNode.url,
      ]);
      unsubscribe = userStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading && data[0]) {
          setIsLifetimeMember(data[0].lifetime_referrer === data[0].id);
          setLoadingLtm(false);
        } else if (error) {
          console.error("Error fetching user account:", error);
          setIsLifetimeMember(false);
          setLoadingLtm(false);
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
      isLifetimeMember &&
      isNameValid &&
      isUrlValid &&
      isPayValid &&
      areDatesValid &&
      isVestingValid &&
      coreAsset,
    [
      isLifetimeMember,
      isNameValid,
      isUrlValid,
      isPayValid,
      areDatesValid,
      isVestingValid,
      coreAsset,
    ]
  );

  // Construct Initializer based on worker type [cite: 128, 136]
  const initializer = useMemo(() => {
    switch (workerType) {
      case "vesting":
        return [1, { pay_vesting_period_days: safeParseInt(vestingDays, 0) }]; // [cite: 127]
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
        owner: usr.id, // [cite: 131]
        work_begin_date: beginDateISO, // [cite: 131]
        work_end_date: endDateISO, // [cite: 132]
        daily_pay: blockchainFloat(dailyPay, coreAsset.precision), // Use blockchainFloat [cite: 132]
        name: workerName, // [cite: 133]
        url: workerUrl, // [cite: 134]
        initializer: initializer, // [cite: 135]
        extensions: [],
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

  if (loadingLtm || coreAssetLoading) {
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
            {!isLifetimeMember && !loadingLtm ? (
              <Alert variant="destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>{t("WorkerCreate:ltmRequiredTitle")}</AlertTitle>
                <AlertDescription>
                  {t("WorkerCreate:ltmRequiredDescription")} {/* [cite: 156] */}
                  <a href="/ltm/index.html">
                    {" "}
                    <Button variant="link" className="p-0 h-4">
                      {t("WorkerCreate:ltmLinkText")}
                    </Button>
                  </a>
                  .
                </AlertDescription>
              </Alert>
            ) : null}
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
                <Label htmlFor="workerName">
                  {t("WorkerCreate:nameLabel")}
                </Label>
                <HoverInfo
                  content={t("WorkerCreate:nameInfo")}
                  header={t("WorkerCreate:nameInfoHeader")}
                />{" "}
                {/* [cite: 158] */}
                <Input
                  id="workerName"
                  placeholder={t("WorkerCreate:namePlaceholder")}
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  maxLength={MAX_WORKER_NAME_LENGTH}
                  disabled={!isLifetimeMember}
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
                <Label htmlFor="workerUrl">{t("WorkerCreate:urlLabel")}</Label>
                <HoverInfo
                  content={t("WorkerCreate:urlInfo")}
                  header={t("WorkerCreate:urlInfoHeader")}
                />{" "}
                {/* [cite: 162] */}
                <Input
                  id="workerUrl"
                  placeholder={t("WorkerCreate:urlPlaceholder")}
                  value={workerUrl}
                  onChange={(e) => setWorkerUrl(e.target.value)}
                  maxLength={MAX_URL_LENGTH}
                  disabled={!isLifetimeMember}
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
                  <Label>{t("WorkerCreate:startDateLabel")}</Label>
                  <HoverInfo
                    content={t("WorkerCreate:startDateInfo")}
                    header={t("WorkerCreate:startDateInfoHeader")}
                  />{" "}
                  {/* [cite: 159] */}
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
                    disabled={!isLifetimeMember}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("WorkerCreate:endDateLabel")}</Label>
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
                    disabled={!isLifetimeMember || !startDate}
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
                <Label htmlFor="dailyPay">
                  {t("WorkerCreate:dailyPayLabel", {
                    coreSymbol: coreAsset?.symbol || "BTS",
                  })}
                </Label>
                <HoverInfo
                  content={t("WorkerCreate:dailyPayInfo")}
                  header={t("WorkerCreate:dailyPayInfoHeader")}
                />{" "}
                {/* [cite: 159, 160, 161] */}
                <Input
                  id="dailyPay"
                  type="number"
                  min="0.00001" // Min depends on core asset precision
                  step={
                    coreAsset
                      ? humanReadableFloat(1, coreAsset.precision)
                      : "0.00001"
                  }
                  value={dailyPay}
                  onChange={(e) => {
                    const value = safeParseFloat(e.target.value, 0);
                    const minVal = coreAsset
                      ? humanReadableFloat(1, coreAsset.precision)
                      : 0.00001;
                    if (value >= minVal) {
                      setDailyPay(value);
                    } else {
                      setDailyPay(minVal);
                    }
                  }}
                  disabled={!isLifetimeMember || !coreAsset}
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
                  <Label htmlFor="workerType">
                    {t("WorkerCreate:workerTypeLabel")}
                  </Label>
                  <HoverInfo
                    content={t("WorkerCreate:workerTypeInfo")}
                    header={t("WorkerCreate:workerTypeInfoHeader")}
                  />
                  <Select
                    value={workerType}
                    onValueChange={setWorkerType}
                    disabled={!isLifetimeMember}
                  >
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
                        {/* [cite: 128, 146] */}
                        <SelectItem value="refund">
                          {t("WorkerCreate:refundWorker")}
                        </SelectItem>{" "}
                        {/* [cite: 128] */}
                        <SelectItem value="burn">
                          {t("WorkerCreate:burnWorker")}
                        </SelectItem>{" "}
                        {/* [cite: 128] */}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                {workerType === "vesting" && (
                  <div className="space-y-2">
                    <Label htmlFor="vestingDays">
                      {t("WorkerCreate:vestingDaysLabel")}
                    </Label>
                    <HoverInfo
                      content={t("WorkerCreate:vestingDaysInfo")}
                      header={t("WorkerCreate:vestingDaysInfoHeader")}
                    />{" "}
                    {/* [cite: 163] */}
                    <Input
                      id="vestingDays"
                      type="number"
                      min="0"
                      step="1"
                      value={vestingDays}
                      onChange={(e) =>
                        setVestingDays(safeParseInt(e.target.value, 0))
                      }
                      disabled={!isLifetimeMember}
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
