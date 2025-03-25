import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { FixedSizeList as List } from "react-window";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { humanReadableFloat, trimPrice, blockchainFloat } from "@/lib/common";
import { cn } from "@/lib/utils";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createWithdrawPermissionsStore } from "@/nanoeffects/WithdrawPermissions.ts";

import { Avatar } from "./Avatar.tsx";
import AccountSearch from "./AccountSearch.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

import AssetDropDown from "./Market/AssetDropDownCard.jsx";

export default function WithdrawPermissions(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNode = useStore($currentNode);

  const [showDialog, setShowDialog] = useState(false);

  const [senderUser, setSenderUser] = useState();
  const [targetUser, setTargetUser] = useState();
  const [selectedAsset, setSelectedAsset] = useState();
  const [transferAmount, setTransferAmount] = useState(0);
  const [reviewPeriodSeconds, setReviewPeriodSeconds] = useState(60000);

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const {
    _marketSearchBTS,
    _marketSearchTEST,
    _assetsBTS,
    _assetsTEST,
    _globalParamsBTS,
    _globalParamsTEST
  } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 0);
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && currentNode && assets && assets.length) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = data.filter((balance) =>
            assets.find((x) => x.id === balance.asset_id)
          );
          console.log({ filteredData })
          setBalances(filteredData);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assets, currentNode, balanceCounter]);

  const [bothUsers, setBothUsers] = useState(false);
  useEffect(() => {
    if (usr && usr.chain && currentNode && targetUser) {
      const userStore = createObjectStore([
        usr.chain,
        JSON.stringify([
          ...new Set([
            usr.id,
            targetUser.id,
          ])
        ]),
        currentNode ? currentNode.url : null,
      ]);
      userStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBothUsers(data);
        }
      });
    }
  }, [usr, currentNode, targetUser]);

  const [payerWithdrawalPermissions, setPayerWithdrawalPermissions] = useState();
  const [receivingWithdrawalPermissions, setReceivingWithdrawalPermissions] = useState();
  useEffect(() => {
    if (usr && usr.chain && currentNode) {
      const withdrawPermissionsStore = createWithdrawPermissionsStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);
      withdrawPermissionsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          console.log({ data });
          if (data.recieving) {
            setReceivingWithdrawalPermissions(data.recieving);
          }
          if (data.paying) {
            setPayerWithdrawalPermissions(data.paying);
          }
        }

        if (error) {
          console.log({error})
        }
      })
    }
  }, [usr, currentNode]);
          
  const [foundAsset, setFoundAsset] = useState();
  const found = useMemo(() => {
    if (selectedAsset) {
      return assets.filter((asset) => asset.symbol === selectedAsset);
    }
    return [];
  }, [selectedAsset, assets]);

  useEffect(() => {
    if (found && found.length) {
      setFoundAsset(found[0]);
    }
  }, [found]);

  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);

  useEffect(() => {
    if (senderUser) {
      // close dialog on sender account selection
      setSenderUser(false);
    }
  }, [senderUser]);

  useEffect(() => {
    if (targetUser) {
      // close dialog on target account selection
      setTargetUserDialogOpen(false);
    }
  }, [targetUser]);
  
  // Proposal dialog state
  const [expiryType, setExpiryType] = useState("1hr");
  const [expiry, setExpiry] = useState(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });

  const [date, setDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Solely for the calendar component to display a date string

  useEffect(() => {
    if (expiryType === "specific" && date) {
      setExpiry(date);
    }
  }, [expiryType, date]);

  const PayingWithdrawPermissionRow = ({ index, style }) => {
    
    return (
      <div>
        withdraw permission
      </div>
    )
  };
  
  const ReceivingWithdrawPermissionRow = ({ index, style }) => {
    
    return (
      <div>
        withdraw permission
      </div>
    )
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("withdraw_permissions:title")}</CardTitle>
              <CardDescription>
                <p>{t("withdraw_permissions:description")}</p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-9">
                  {
                    payerWithdrawalPermissions && payerWithdrawalPermissions.length
                      ? <List
                        itemSize={35}
                        itemCount={payerWithdrawalPermissions ? payerWithdrawalPermissions.length : 0}
                        className="w-full"
                        height={400}
                      >
                        {PayingWithdrawPermissionRow}
                      </List>
                      : <p>{t("withdraw_permissions:not_sending_anything")}</p>
                  }
                </div>
                <div className="col-span-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        className="mr-2 w-full"
                      >
                        {t("withdraw_permissions:create_permission")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[750px] bg-white">
                      <DialogHeader>
                        <DialogTitle>
                          {t("withdraw_permissions:create_permission_title")}
                        </DialogTitle>
                        <DialogDescription>
                          {t("withdraw_permissions:create_permission_description")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-3">
                        <Form {...form}>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              // Handle form submission logic here
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
                                        ? t("Transfer:targetAccountDescription")
                                        : t("Transfer:targetAccountDescriptionWithName", {
                                            name: targetUser.name,
                                          })
                                    }
                                    header={t("withdraw_permissions:targetAccount")}
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
                                        <Dialog
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
                                    content={t("Predictions:sellDialog.assetToTransfer_description")}
                                    header={t("withdraw_permissions:assetToTransfer")}
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

                            {selectedAsset && targetUser ? (
                              <FormField
                                control={form.control}
                                name="transferAmount"
                                render={({ field }) => (
                                  <FormItem className="mb-2">
                                    <HoverInfo
                                      content={t("Transfer:amountAvailableToTransferDescription")}
                                      header={t("Transfer:amountAvailableToTransfer", {
                                        asset: selectedAsset ?? "???",
                                      })}
                                    />
                                    <FormControl>
                                      <Input
                                        disabled
                                        label={t("Transfer:amountAvailableToTransferLabel")}
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
                                name="transferAmount"
                                render={({ field }) => (
                                  <FormItem className="mb-2">
                                    <HoverInfo
                                      content={t("Transfer:amountToTransferDescription")}
                                      header={t("Transfer:amountToTransfer", { asset: selectedAsset ?? "???" })}
                                    />
                                    <FormControl
                                      onChange={(event) => {
                                        const input = event.target.value;
                                        const regex = /^[0-9]*\.?[0-9]*$/;
                                        if (regex.test(input)) {
                                          setTransferAmount(input);
                                        }
                                      }}
                                    >
                                      <Input
                                        label={t("Transfer:amountToTransferLabel")}
                                        value={transferAmount}
                                        placeholder={transferAmount}
                                        className="mb-1"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            ) : null}

                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name="withdrawalPeriodSec"
                                render={({ field }) => (
                                  <FormItem className="mb-2">
                                    <HoverInfo
                                      content={t("Predictions:sellDialog.withdrawal_period_sec_description")}
                                      header={t("withdraw_permissions:withdrawal_period_sec")}
                                    />
                                    <FormControl>
                                      <Input
                                        type="number"
                                        value={field.value}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        placeholder="60000"
                                      />
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
                                      content={t("Predictions:sellDialog.periods_until_expiration_description")}
                                      header={t("withdraw_permissions:periods_until_expiration")}
                                    />
                                    <FormControl>
                                      <Input
                                        type="number"
                                        value={field.value}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        placeholder="60000"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              <HoverInfo
                                content={t("Predictions:sellDialog.period_start_time_description")}
                                header={t("Predictions:sellDialog.period_start_time")}
                              />
                              <Select
                                onValueChange={(selectedExpiry) => {
                                  setExpiryType(selectedExpiry);
                                  const oneHour = 60 * 60 * 1000;
                                  const oneDay = 24 * oneHour;
                                  if (selectedExpiry !== "specific") {
                                    const now = new Date();
                                    let expiryDate;
                                    if (selectedExpiry === "1hr") {
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
                                    setExpiry(selectedExpiry);
                                  } else if (selectedExpiry === "specific") {
                                    // Setting a default date expiry
                                    setExpiry();
                                  }
                                }}
                              >
                                <SelectTrigger className="mb-3 mt-1 w-1/4">
                                  <SelectValue placeholder="1hr" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
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

                            <Button type="submit" variant="outline" className="mt-4">
                              {t("withdraw_permissions:submit")}
                            </Button>
                          </form>
                        </Form>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="col-span-12">
                  {
                    receivingWithdrawalPermissions && receivingWithdrawalPermissions.length
                      ? <List
                        itemSize={35}
                        itemCount={receivingWithdrawalPermissions ? receivingWithdrawalPermissions.length : 0}
                        className="w-full"
                        height={400}
                      >
                        {ReceivingWithdrawPermissionRow}
                      </List>
                      : <p>{t("withdraw_permissions:not_receiving_anything")}</p>
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
