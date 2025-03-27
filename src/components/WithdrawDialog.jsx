import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format, set } from "date-fns";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import HoverInfo from "@/components/common/HoverInfo.tsx";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Avatar as Av, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { humanReadableFloat, trimPrice, blockchainFloat } from "@/lib/common";
import { cn } from "@/lib/utils";

import { Avatar } from "./Avatar.tsx";
import AccountSearch from "./AccountSearch.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";

const hoursToSeconds = {
  "1hr": 3600,
  "6hrs": 21600,
  "12hrs": 43200,
  "24hrs": 86400,
  "7d": 604800,
  "14d": 1209600,
  "30d": 2592000,
  "6m": 15552000,
  "12m": 31104000,
};

export default function WithdrawPermissions(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const {
    // creating
    usr,
    assets,
    marketSearch,
    balances,
    showDialog,
    setShowDialog,
    // state
    mode,
    // editing
    _existingWithdrawPermissionID,
    _targetUser,
    _selectedAsset,
    _transferAmount,
    _withdrawalPeriodSec,
    _periodsUntilExpiration,
    _expiration,
  } = properties;

  const [targetUser, setTargetUser] = useState(_targetUser || null);
  const [selectedAsset, setSelectedAsset] = useState(_selectedAsset || null);
  const [transferAmount, setTransferAmount] = useState(_transferAmount || null);
  const [withdrawalPeriodSec, setWithdrawalPeriodSec] = useState(_withdrawalPeriodSec || 1);
  const [periodsUntilExpiration, setPeriodsUntilExpiration] = useState(
    _periodsUntilExpiration ? Math.round(_periodsUntilExpiration) : 1
  );
  
  useEffect(() => {
    if (mode && mode === "edit") {
      setTargetUser(_targetUser);
      setSelectedAsset(_selectedAsset);
      setTransferAmount(_transferAmount);
      setWithdrawalPeriodSec(_withdrawalPeriodSec);
      setPeriodsUntilExpiration(Math.round(_periodsUntilExpiration));
    }
  }, [
    mode,
    _targetUser,
    _selectedAsset,
    _transferAmount,
    _withdrawalPeriodSec,
    _periodsUntilExpiration,
  ]);

  const [openCreateWithdrawPermission, setOpenCreateWithdrawPermission] = useState(false); // deeplinkdialog create permission
  const [openEditWithdrawPermission, setOpenEditWithdrawPermission] = useState(false); // deeplinkdialog edit permission

  const [foundAsset, setFoundAsset] = useState();
  const found = useMemo(() => {
    if (selectedAsset) {
      return assets.filter((asset) => asset.symbol === selectedAsset);
    }
    return [];
  }, [selectedAsset, assets]);

  useEffect(() => {
    if (found && found.length) {
      console.log({foundAsset: found[0]});
      setFoundAsset(found[0]);
    }
  }, [found]);

  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);

  useEffect(() => {
    if (targetUser) {
      // close dialog on target account selection
      setTargetUserDialogOpen(false);
    }
  }, [targetUser]);
  
  // Proposal dialog state
  const [expiryType, setExpiryType] = useState("now");

  const [expiry, setExpiry] = useState(() => {
    if (mode === "edit") {
      return new Date(_expiration);
    }
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });

  const [date, setDate] = useState(
    mode === "edit"
      ? new Date(_expiration)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ); // Solely for the calendar component to display a date string

  useEffect(() => {
    if (expiryType === "specific" && date) {
      setExpiry(date);
    }
  }, [expiryType, date]);

  const periodStartTime = useMemo(() => {
    if (!expiry) {
      return null;
    }

    const secondsSinceEpoch = Math.floor(expiry.getTime() / 1000);
    return secondsSinceEpoch;
  }, [expiry]);

  return (
    <Dialog
      open={showDialog}
      onOpenChange={(open) => {
        setShowDialog(open);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="mr-2 w-full"
        >
          {
            mode === "edit"
              ? t("WithdrawPermissions:edit_permission")
              : t("WithdrawPermissions:create_permission")
          }
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] bg-white">
        <DialogHeader>
          <DialogTitle>
            {
              mode === "edit"
              ? t("WithdrawDialog:editing")
              : t("WithdrawPermissions:create_permission_title")
            }
          </DialogTitle>
          <DialogDescription>
            {
              mode === "edit"
              ? t("WithdrawDialog:editingDescription")
              : t("WithdrawPermissions:create_permission_description")
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3">
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (mode === "edit") {
                  setOpenEditWithdrawPermission(true);
                } else {
                  setOpenCreateWithdrawPermission(true);
                }
              }}
            >
              <FormField
                control={form.control}
                name="targetAccount"
                render={({ field }) => (
                  <FormItem className="mb-2">
                    <HoverInfo
                      content={
                        !targetUser || !targetUser.name
                          ? t("WithdrawPermissions:targetAccountDescription")
                          : t("WithdrawPermissions:targetAccountDescriptionWithName", {
                              name: targetUser.name,
                            })
                      }
                      header={t("WithdrawPermissions:targetAccount")}
                    />
                    <FormControl>
                      <div className="grid grid-cols-8 mt-4">
                        <div className="col-span-1 ml-5">
                          {targetUser && targetUser.name ? (
                            <Avatar
                              size={40}
                              name={targetUser.name}
                              extra="Target"
                              expression={{
                                eye: "normal",
                                mouth: "open",
                              }}
                              colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                            />
                          ) : (
                            <Av>
                              <AvatarFallback>?</AvatarFallback>
                            </Av>
                          )}
                        </div>
                        <div className="col-span-5">
                          <Input
                            disabled
                            placeholder={
                              targetUser && targetUser.name
                                ? `${targetUser.name} (${targetUser.id})`
                                : "Bitshares account (1.2.x)"
                            }
                            className="mb-1 mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          {
                            mode === "create"
                              ? <Dialog
                                  open={targetUserDialogOpen}
                                  onOpenChange={(open) => {
                                    setTargetUserDialogOpen(open);
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button variant="outline" className="ml-3 mt-1">
                                      {targetUser
                                        ? t("Transfer:changeTarget")
                                        : t("Transfer:provideTarget")}
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[375px] bg-white">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {!usr || !usr.chain
                                          ? t("Transfer:bitsharesAccountSearch")
                                          : null}
                                        {usr && usr.chain === "bitshares"
                                          ? t("Transfer:bitsharesAccountSearchBTS")
                                          : null}
                                        {usr && usr.chain !== "bitshares"
                                          ? t("Transfer:bitsharesAccountSearchTEST")
                                          : null}
                                      </DialogTitle>
                                      <DialogDescription>
                                        {t("Transfer:searchingForAccount")}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <AccountSearch
                                      chain={usr && usr.chain ? usr.chain : "bitshares"}
                                      excludedUsers={
                                        usr && usr.username && usr.username.length ? [usr] : []
                                      }
                                      setChosenAccount={setTargetUser}
                                    />
                                  </DialogContent>
                                </Dialog>
                              : <Button disabled variant="outline" className="ml-3 mt-1">
                                  {t("Transfer:changeTarget")}
                                </Button>
                          }
                        </div>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetAsset"
                render={({ field }) => (
                  <FormItem className="mb-2">
                    <HoverInfo
                      content={t("WithdrawPermissions:limitedAssetsToWithdraw_description")}
                      header={t("WithdrawPermissions:limitedAssetsToWithdraw")}
                    />
                    <FormControl>
                      <div className="grid grid-cols-8 mt-4">
                        <div className="col-span-1 ml-5">
                          {!selectedAsset || !foundAsset ? (
                            <Av>
                              <AvatarFallback>?</AvatarFallback>
                            </Av>
                          ) : null}
                          {foundAsset ? (
                            <Av>
                              <AvatarFallback>
                                <div className="text-sm">
                                  {foundAsset.bitasset_data_id ? "MPA" : "UIA"}
                                </div>
                              </AvatarFallback>
                            </Av>
                          ) : null}
                        </div>
                        <div className="col-span-5">
                          {!selectedAsset || !foundAsset ? (
                            <Input
                              disabled
                              placeholder="Bitshares asset (1.3.x)"
                              className="mb-1 mt-1"
                            />
                          ) : null}
                          {foundAsset ? (
                            <Input
                              disabled
                              placeholder={`${foundAsset.symbol} (${foundAsset.id})`}
                              className="mb-1 mt-1"
                            />
                          ) : null}
                        </div>
                        <div className="col-span-2 mt-1 ml-3">
                          <AssetDropDown
                            assetSymbol={selectedAsset ?? ""}
                            assetData={null}
                            storeCallback={setSelectedAsset}
                            otherAsset={null}
                            marketSearch={marketSearch}
                            type={null}
                            chain={usr && usr.chain ? usr.chain : "bitshares"}
                            balances={balances}
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage>
                      {
                        foundAsset &&
                        balances &&
                        !balances.map((x) => x.asset_id).includes(foundAsset.id)
                          ? t("Transfer:noAssetInAccount", { username: usr.username })
                          : null
                      }
                    </FormMessage>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                {selectedAsset && targetUser ? (
                  <FormField
                    control={form.control}
                    name="amountAvailable"
                    render={({ field }) => (
                      <FormItem className="mb-2">
                        <HoverInfo
                          header={t("WithdrawDialog:amountAvailable")}
                          content={t("WithdrawDialog:amountAvailableDescription")}
                        />
                        <FormControl>
                          <Input
                            disabled
                            value={
                              foundAsset &&
                              balances &&
                              balances.find((x) => x.asset_id === foundAsset.id)
                                ? `${humanReadableFloat(
                                    balances.find((x) => x.asset_id === foundAsset.id).amount,
                                    foundAsset.precision
                                  )} ${foundAsset.symbol}`
                                : "0"
                            }
                            className="mb-1"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ) : null}

                {selectedAsset && targetUser ? (
                  <FormField
                    control={form.control}
                    name="withdrawAmount"
                    className="w-1/2"
                    render={({ field }) => (
                      <FormItem className="mb-2">
                        <HoverInfo
                          content={t("WithdrawDialog:withdrawAmountLimitDescription")}
                          header={t("WithdrawDialog:withdrawAmountLimitHeader")}
                        />
                        <FormControl
                          onChange={(event) => {
                            let input = event.target.value;
                            const inputDecimals = !foundAsset ? 2 : foundAsset.precision;
                            //let regex = new RegExp(`^[0-9]*\.?[0-9]{0,${inputDecimals}}$`);
                            let regex = new RegExp(`^[^+-]*[0-9]*\\.?[0-9]{0,${inputDecimals}}$`);
                            if (regex.test(input)) {
                              if (input === "0" || input === "0.") {
                                setTransferAmount(input);
                              } else if (input.startsWith(".")) {
                                let newValue = `0.${input.split(".")[1]}`;
                                console.log({newValue, input})
                                setTransferAmount(newValue);
                              } else if (input.startsWith("0") && !input.startsWith("0.")) {
                                input = input.replace(/^0+/, "");
                                setTransferAmount(input);
                              } else {
                                setTransferAmount(input);
                              }
                            }
                          }}
                        >
                          <Input
                            type="number"
                            value={transferAmount}
                            placeholder={transferAmount}
                            className="mb-1"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="withdrawalPeriodSec"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <HoverInfo
                        content={t("WithdrawPermissions:withdrawal_period_sec_description")}
                        header={t("WithdrawPermissions:withdrawal_period_sec")}
                      />
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            setWithdrawalPeriodSec(hoursToSeconds[value]);
                          }}
                          value={
                            Object.keys(hoursToSeconds).find((key) => hoursToSeconds[key] === withdrawalPeriodSec) ||
                            Object.keys(hoursToSeconds).reduce((prev, curr) => {
                              return Math.abs(hoursToSeconds[curr] - withdrawalPeriodSec) <
                                Math.abs(hoursToSeconds[prev] - withdrawalPeriodSec)
                                ? curr
                                : prev;
                            }, Object.keys(hoursToSeconds)[0])
                          }
                        >
                          <SelectTrigger className="mb-3 mt-1 w-full">
                            <SelectValue placeholder={
                              Object.keys(hoursToSeconds).find(
                                (key) => {
                                  return hoursToSeconds[key] === withdrawalPeriodSec;
                                }
                              ) || "1hr"
                            } />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="1hr">{t("WithdrawDialog:1hr")}</SelectItem>
                            <SelectItem value="6hrs">{t("WithdrawDialog:6hrs")}</SelectItem>
                            <SelectItem value="12hrs">{t("WithdrawDialog:12hrs")}</SelectItem>
                            <SelectItem value="24hrs">{t("WithdrawDialog:24hrs")}</SelectItem>
                            <SelectItem value="7d">{t("WithdrawDialog:7d")}</SelectItem>
                            <SelectItem value="14d">{t("WithdrawDialog:14d")}</SelectItem>
                            <SelectItem value="30d">{t("WithdrawDialog:30d")}</SelectItem>
                            <SelectItem value="6m">{t("WithdrawDialog:6m")}</SelectItem>
                            <SelectItem value="12m">{t("WithdrawDialog:12m")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="periodsUntilExpiration"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <HoverInfo
                        content={t("WithdrawPermissions:periods_until_expiration_description")}
                        header={t("WithdrawPermissions:periods_until_expiration")}
                      />
                      <FormControl>
                        <Input
                          type="number"
                          value={periodsUntilExpiration}
                          onChange={(e) => setPeriodsUntilExpiration(Math.floor(Number(e.target.value)))}
                          placeholder={periodsUntilExpiration}
                          min={1}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <HoverInfo
                  content={t("WithdrawPermissions:period_start_time_description")}
                  header={t("WithdrawPermissions:period_start_time")}
                />
                <Select
                  value={expiryType}
                  onValueChange={(selectedExpiry) => {
                    setExpiryType(selectedExpiry);
                    const oneHour = 60 * 60 * 1000;
                    const oneDay = 24 * oneHour;
                    if (selectedExpiry !== "specific") {
                      const now = new Date();
                      let expiryDate;
                      if (selectedExpiry === "now") {
                        expiryDate = now;
                      } else if (selectedExpiry === "1hr") {
                        expiryDate = new Date(now.getTime() + oneHour);
                      } else if (selectedExpiry === "12hr") {
                        const duration = oneHour * 12;
                        expiryDate = new Date(now.getTime() + duration);
                      } else if (selectedExpiry === "24hr") {
                        const duration = oneDay;
                        expiryDate = new Date(now.getTime() + duration);
                      } else if (selectedExpiry === "7d") {
                        const duration = oneDay * 7;
                        expiryDate = new Date(now.getTime() + duration);
                      } else if (selectedExpiry === "30d") {
                        const duration = oneDay * 30;
                        expiryDate = new Date(now.getTime() + duration);
                      }

                      if (expiryDate) {
                        setDate(expiryDate);
                      }
                    } else if (selectedExpiry === "specific") {
                      // Setting a default date expiry
                      setExpiry();
                    }
                  }}
                >
                  <SelectTrigger className="mb-3 mt-1 w-1/4">
                    <SelectValue placeholder={expiry} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="now">{t("WithdrawPermissions:now")}</SelectItem>
                    <SelectItem value="1hr">{t("LimitOrderCard:expiry.1hr")}</SelectItem>
                    <SelectItem value="12hr">{t("LimitOrderCard:expiry.12hr")}</SelectItem>
                    <SelectItem value="24hr">{t("LimitOrderCard:expiry.24hr")}</SelectItem>
                    <SelectItem value="7d">{t("LimitOrderCard:expiry.7d")}</SelectItem>
                    <SelectItem value="30d">{t("LimitOrderCard:expiry.30d")}</SelectItem>
                    <SelectItem value="specific">
                      {t("LimitOrderCard:expiry.specific")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {expiryType === "specific" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? (
                          format(date, "PPP")
                        ) : (
                          <span>{t("LimitOrderCard:expiry.pickDate")}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(e) => {
                          const parsedDate = new Date(e);
                          const now = new Date();
                          if (parsedDate < now) {
                            //console.log("Not a valid date");
                            setDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000));
                            return;
                          }
                          //console.log("Setting expiry date");
                          setDate(e);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>

              {
                targetUser &&
                transferAmount &&
                foundAsset &&
                withdrawalPeriodSec &&
                periodsUntilExpiration &&
                periodStartTime
                  ? <Button type="submit" variant="outline" className="mt-4">
                      {t("WithdrawPermissions:submit")}
                    </Button>
                  : <Button disabled variant="outline" className="mt-4">
                      {t("WithdrawPermissions:submit")}
                    </Button>
              }

              {
                openCreateWithdrawPermission
                  ? <DeepLinkDialog
                      operationNames={
                        mode === "edit"
                          ? ["withdraw_permission_update"]
                          : ["withdraw_permission_create"]
                      }
                      username={usr && usr.username ? usr.username : ""}
                      usrChain={usr && usr.chain ? usr.chain : "bitshares"}
                      userID={usr.id}
                      dismissCallback={setOpenCreateWithdrawPermission}
                      key={`CreatingWithdrawPermission`}
                      headerText={
                        mode === "edit"
                          ? t("WithdrawPermissions:editWithdrawPermissionHeader")
                          : t("WithdrawPermissions:createWithdrawPermissionHeader")
                      }
                      trxJSON={[
                        {
                          withdraw_from_account: usr.id,
                          authorized_account: targetUser.id,
                          withdrawal_limit: {
                            amount: blockchainFloat(transferAmount, foundAsset.precision),
                            asset_id: foundAsset.id,
                          },
                          withdrawal_period_sec: withdrawalPeriodSec,
                          periods_until_expiration: periodsUntilExpiration,
                          period_start_time: periodStartTime
                        },
                      ]}
                    />
                  : null
              }

              {
                openEditWithdrawPermission
                  ? <DeepLinkDialog
                      operationNames={["withdraw_permission_update"]}
                      username={usr && usr.username ? usr.username : ""}
                      usrChain={usr && usr.chain ? usr.chain : "bitshares"}
                      userID={usr.id}
                      dismissCallback={setOpenEditWithdrawPermission}
                      key={`EditingWithdrawPermission`}
                      headerText={t("WithdrawPermissions:editWithdrawPermissionHeader")}
                      trxJSON={[
                        {
                          withdraw_from_account: usr.id,
                          authorized_account: targetUser.id,
                          withdrawal_limit: {
                            amount: blockchainFloat(transferAmount, foundAsset.precision),
                            asset_id: foundAsset.id,
                          },
                          permission_to_update: _existingWithdrawPermissionID,
                          withdrawal_period_sec: withdrawalPeriodSec,
                          periods_until_expiration: periodsUntilExpiration,
                          period_start_time: periodStartTime
                        },
                      ]}
                    />
                  : null 
              }

            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
