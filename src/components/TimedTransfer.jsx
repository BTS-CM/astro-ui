import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldContent,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";

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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

import { Timer, Send, ArrowRight, Info } from "lucide-react";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";

import {
  humanReadableFloat,
  trimPrice,
  blockchainFloat,
  assetAmountRegex,
} from "@/lib/common";
import { cn } from "@/lib/utils";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { accountSearch } from "@/nanoeffects/UserSearch.ts";

import { Avatar } from "./Avatar.tsx";
import AccountSearch from "./AccountSearch.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

import AssetDropDown from "./Market/AssetDropDownCard.jsx";

export default function TimedTransfer(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
      transferAmount: "",
    },
  });
  const currentNodeUrl = useStore($currentNodeUrl);

  const [showDialog, setShowDialog] = useState(false);

  const [senderUser, setSenderUser] = useState();
  const [targetUser, setTargetUser] = useState();
  const [selectedAsset, setSelectedAsset] = useState();
  const [transferAmount, setTransferAmount] = useState(0);
  const [reviewPeriodSeconds, setReviewPeriodSeconds] = useState(60000);

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const {
    _marketSearchBTS,
    _marketSearchTEST,
    _assetsBTS,
    _assetsTEST,
    _globalParamsBTS,
    _globalParamsTEST,
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

  useEffect(() => {
    if (!selectedAsset && usr && usr.chain) {
      setSelectedAsset(usr.chain === "bitshares" ? "BTS" : "TEST");
    }
  }, [usr, selectedAsset]);

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
      const finalFee = humanReadableFloat(foundFee?.data?.fee ?? 0, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id && currentNodeUrl && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNodeUrl || "",
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setBalances(filteredData);
          }
        });
      }
    }

    fetchUserBalances();
  }, [usr, assets, currentNodeUrl, balanceCounter]);

  const [bothUsers, setBothUsers] = useState(false);
  useEffect(() => {
    if (usr && usr.chain && currentNodeUrl && targetUser) {
      const userStore = createObjectStore([
        usr.chain,
        JSON.stringify([usr.id, targetUser.id]),
        currentNodeUrl || null,
      ]);
      userStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBothUsers(data);
        }
      });
    }
  }, [usr, currentNodeUrl, targetUser]);

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

  const availableBalance = useMemo(() => {
    if (!foundAsset || !balances) return null;
    const _balance = balances.find((x) => x.asset_id === foundAsset.id);
    return _balance
      ? humanReadableFloat(_balance.amount, foundAsset.precision)
      : "0";
  }, [foundAsset, balances]);

  const setMaxTransferAmount = () => {
    if (availableBalance && parseFloat(availableBalance) > 0 && foundAsset) {
      const formatted = String(parseFloat(availableBalance));
      setTransferAmount(formatted);
      form.setValue("transferAmount", formatted);
    }
  };

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

  // Prefill target account from URL query (?to=<name>)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!usr || !usr.chain) return;
    const params = new URLSearchParams(window.location.search);
    const toName = params.get("to");
    if (toName && /^[a-zA-Z0-9.-]+$/.test(toName)) {
      accountSearch(usr.chain, toName, currentNodeUrl || null)
        .then((acct) => {
          if (acct && acct.id && acct.name) {
            setTargetUser({ id: acct.id, name: acct.name });
            form.setValue("account", acct.name);
          }
        })
        .catch(() => {});
    }
  }, [usr, currentNodeUrl]);

  // Proposal dialog state
  const [expiryType, setExpiryType] = useState("1hr");
  const [expiry, setExpiry] = useState(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });

  const [date, setDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ); // for calendar UI only

  useEffect(() => {
    if (expiryType === "specific" && date) {
      setExpiry(date);
    }
  }, [expiryType, date]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:1/2">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-48 w-48 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Timer className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] text-[10px]"
                  >
                    Proposal
                  </Badge>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                    {t("Transfer:timedTransferAssets")}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {t("Transfer:sendFundsDescription")}
                </p>
              </div>
            </div>
            <form
              onSubmit={(event) => {
                setShowDialog(true);
                event.preventDefault();
              }}
            >
                <FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-3 items-center">
                  <Card className="bg-card/40 border-border backdrop-blur-xl">
                    <CardContent className="p-4">
                  <Field>
                    <FieldLabel>{t("Transfer:sendingAccount")}</FieldLabel>
                    <FieldContent>
                      <div className="grid grid-cols-8 gap-2">
                        <div className="col-span-1 flex items-center justify-center">
                          <Avatar
                            size={40}
                            name={usr && usr.username ? usr.username : "x"}
                            extra="Sender"
                            expression={{ eye: "normal", mouth: "open" }}
                            colors={[
                              "#92A1C6",
                              "#146A7C",
                              "#F0AB3D",
                              "#C271B4",
                              "#C20D90",
                            ]}
                          />
                        </div>
                        <div className="col-span-7">
                          <Input
                            disabled
                            className="mb-1 mt-1"
                            value={`${
                              usr && usr.username ? usr.username : "?"
                            } (${usr && usr.id ? usr.id : "?"})`}
                          />
                        </div>
                      </div>
                    </FieldContent>
                    <FieldDescription>
                      {t("Transfer:sendingAccountDescription")}
                    </FieldDescription>
                  </Field>
                  </CardContent>
                  </Card>

                  <div className="flex items-center justify-center py-1">
                    <ArrowRight
                      className="h-10 w-10 rotate-90 md:rotate-0 text-[hsl(var(--accent-1-fg))]"
                      strokeWidth={2.5}
                    />
                  </div>

                  <Card className="bg-card/40 border-border backdrop-blur-xl">
                    <CardContent className="p-4">
                  <Field>
                    <FieldLabel>{t("Transfer:targetAccount")}</FieldLabel>
                    <FieldContent>
                      <div className="grid grid-cols-8">
                        <div className="col-span-1 flex items-center justify-center">
                          {targetUser && targetUser.name ? (
                            <Avatar
                              size={40}
                              name={targetUser.name}
                              extra="Target"
                              expression={{ eye: "normal", mouth: "open" }}
                              colors={[
                                "#92A1C6",
                                "#146A7C",
                                "#F0AB3D",
                                "#C271B4",
                                "#C20D90",
                              ]}
                            />
                          ) : (
                            <Av>
                              <AvatarFallback>?</AvatarFallback>
                            </Av>
                          )}
                        </div>
                        <div className="col-span-7 md:col-span-5">
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
                            onOpenChange={(open) =>
                              setTargetUserDialogOpen(open)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" className="ml-3 mt-1">
                                {targetUser
                                  ? t("Transfer:changeTarget")
                                  : t("Transfer:provideTarget")}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[375px] bg-card">
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
                                chain={
                                  usr && usr.chain ? usr.chain : "bitshares"
                                }
                                excludedUsers={
                                  usr && usr.username && usr.username.length
                                    ? [usr]
                                    : []
                                }
                                setChosenAccount={setTargetUser}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </FieldContent>
                    <FieldDescription>
                      {!targetUser || !targetUser.name
                        ? t("Transfer:targetAccountDescription")
                        : t("Transfer:targetAccountDescriptionWithName", {
                            name: targetUser.name,
                          })}
                    </FieldDescription>
                  </Field>
                  </CardContent>
                  </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <Card className="bg-card/40 border-border backdrop-blur-xl">
                    <CardContent className="p-4 space-y-4">
                  <Field>
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel>{t("Transfer:assetToTransfer")}</FieldLabel>
                      <div>
                        <AssetDropDown
                          assetSymbol={selectedAsset ?? ""}
                          assetData={null}
                          storeCallback={setSelectedAsset}
                          otherAsset={null}
                          marketSearch={marketSearch}
                          type={null}
                          chain={usr && usr.chain ? usr.chain : "bitshares"}
                          balances={balances}
                          initialMode="balances"
                          balancesOnly
                        />
                      </div>
                    </div>
                    <FieldContent>
                      <div className="grid grid-cols-8">
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
                        <div className="col-span-7">
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
                      </div>
                    </FieldContent>
                    <FieldDescription>
                      {t("Transfer:assetToTransferDescription")}
                    </FieldDescription>
                    <FieldError>
                      {foundAsset &&
                      balances &&
                      !balances.map((x) => x.asset_id).includes(foundAsset.id)
                        ? t("Transfer:noAssetInAccount", {
                            username: usr.username,
                          })
                        : null}
                    </FieldError>
                  </Field>

                  {selectedAsset ? (
                    <Field>
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel>
                          {t("Transfer:amountToTransfer", {
                            asset: selectedAsset ?? "???",
                          })}
                        </FieldLabel>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {t("Transfer:balanceHint", {
                              balance: availableBalance ?? "0",
                              asset: selectedAsset ?? "???",
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={setMaxTransferAmount}
                            className="inline-flex items-center rounded-md border border-[hsl(var(--accent-1)/0.30)] bg-[hsl(var(--accent-1)/0.10)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.20)] hover:border-[hsl(var(--accent-1)/0.50)] transition-colors"
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                      <FieldContent>
                        <Controller
                          name="transferAmount"
                          control={form.control}
                          defaultValue={transferAmount}
                          render={({ field }) => (
                            <Input
                              label={t("Transfer:amountToTransferLabel")}
                              value={transferAmount}
                              onChange={(event) => {
                                const input = event.target.value;
                                const regex = assetAmountRegex(foundAsset);
                                if (regex.test(input)) {
                                  setTransferAmount(input);
                                  field.onChange(input);
                                }
                              }}
                              placeholder={transferAmount}
                              className="mb-1"
                            />
                          )}
                        />
                      </FieldContent>
                      <FieldDescription>
                        {t("Transfer:amountToTransferDescription")}
                      </FieldDescription>
                    </Field>
                  ) : null}
                    </CardContent>
                  </Card>

                  <Card className="bg-card/40 border-border backdrop-blur-xl">
                    <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <HoverInfo
                        content={t("Common:expiryContent")}
                        header={t("Common:expiryHeader")}
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
                        <SelectTrigger className="mb-3 mt-1 w-3/4">
                          <SelectValue placeholder="1hr" />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                          <SelectItem value="1hr">
                            {t("LimitOrderCard:expiry.1hr")}
                          </SelectItem>
                          <SelectItem value="12hr">
                            {t("LimitOrderCard:expiry.12hr")}
                          </SelectItem>
                          <SelectItem value="24hr">
                            {t("LimitOrderCard:expiry.24hr")}
                          </SelectItem>
                          <SelectItem value="7d">
                            {t("LimitOrderCard:expiry.7d")}
                          </SelectItem>
                          <SelectItem value="30d">
                            {t("LimitOrderCard:expiry.30d")}
                          </SelectItem>
                          <SelectItem value="specific">
                            {t("LimitOrderCard:expiry.specific")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {expiryType === "specific" ? (
                        <Dialog>
                          <DialogTrigger asChild>
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
                                <span>
                                  {t("LimitOrderCard:expiry.pickDate")}
                                </span>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[350px] bg-card border border-border rounded-2xl p-0">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={(e) => {
                                const parsedDate = new Date(e);
                                const now = new Date();
                                if (parsedDate < now) {
                                  setDate(
                                    new Date(
                                      Date.now() + 1 * 24 * 60 * 60 * 1000
                                    )
                                  );
                                  return;
                                }
                                setDate(e);
                              }}
                              initialFocus
                            />
                          </DialogContent>
                        </Dialog>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <HoverInfo
                        content={t(
                          "DeepLinkDialog:proposal.revisionPeriodSecondsContent"
                        )}
                        header={t(
                          "DeepLinkDialog:proposal.revisionPeriodSecondsHeader"
                        )}
                      />
                      <Select
                        onValueChange={(selectedReviewPeriod) =>
                          setReviewPeriodSeconds(selectedReviewPeriod)
                        }
                      >
                        <SelectTrigger className="mb-3 mt-1 w-3/4">
                          <SelectValue placeholder="1 mins" />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                          <SelectItem value={"60000"}>1 mins</SelectItem>
                          <SelectItem value={"300000"}>5 mins</SelectItem>
                          <SelectItem value={"600000"}>10 mins</SelectItem>
                          <SelectItem value={"1800000"}>30 mins</SelectItem>
                          <SelectItem value={"3600000"}>1 hour</SelectItem>
                          <SelectItem value={"21600000"}>6 hours</SelectItem>
                          <SelectItem value={"43200000"}>12 hours</SelectItem>
                          <SelectItem value={"86400000"}>24 hours</SelectItem>
                          <SelectItem value={"604800000"}>7 days</SelectItem>
                          <SelectItem value={"2592000000"}>30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    </CardContent>
                  </Card>
                  </div>

                  {selectedAsset && targetUser && fee ? (
                    <div className="flex flex-col gap-1 px-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {t("Transfer:networkFee")}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-[hsl(var(--accent-1-fg))] text-sm">
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                          {fee.toFixed(5)} {usr.chain === "bitshares" ? "BTS" : "TEST"}
                        </span>
                      </div>
                      {usr.id === usr.referrer ? (
                        <span className="text-xs text-[hsl(var(--accent-success-fg))]">
                          {t("Transfer:rebate", {
                            rebate: trimPrice(fee * 0.8, 5),
                          })}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {!transferAmount ? (
                    <Button
                      className="mt-5 mb-3 h-11 rounded-xl font-semibold transition-all border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.6)] hover:shadow-[0_0_24px_-6px_rgba(20,184,166,0.4)]"
                      variant="outline"
                      disabled
                      type="submit"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {t("Transfer:submit")}
                    </Button>
                  ) : (
                    <Button
                      className="mt-5 mb-3 h-11 rounded-xl font-semibold transition-all border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-1)/0.1)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.6)] hover:shadow-[0_0_24px_-6px_rgba(20,184,166,0.4)]"
                      variant="outline"
                      type="submit"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {t("Transfer:submit")}
                    </Button>
                  )}
                </FieldGroup>
              </form>
              {showDialog && bothUsers ? (
                <DeepLinkDialog
                  operationNames={["proposal_create"]}
                  username={usr.username}
                  usrChain={usr.chain}
                  userID={usr.id}
                  dismissCallback={setShowDialog}
                  key={`Sending${transferAmount}${selectedAsset}to${targetUser?.name}from${usr.username}`}
                  headerText={t("Transfer:sendingHeader", {
                    amount: transferAmount,
                    symbol: foundAsset?.symbol,
                    id: foundAsset?.id,
                    target: targetUser?.name,
                    user: usr.username,
                  })}
                  trxJSON={[
                    {
                      fee_paying_account: targetUser?.id,
                      expiration_time: date,
                      proposed_ops: [
                        {
                          op: [
                            0,
                            {
                              fee: { amount: 0, asset_id: "1.3.0" },
                              from: usr.id,
                              to: targetUser?.id,
                              amount: {
                                amount: blockchainFloat(
                                  transferAmount,
                                  foundAsset?.precision
                                ).toFixed(0),
                                asset_id: foundAsset?.id,
                              },
                              extensions: {},
                            },
                          ],
                        },
                       ],
                       review_period_seconds: reviewPeriodSeconds,
                       extensions: {},
                     },
                    ]}
                  />
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center mt-5 gap-5 w-full">
            {targetUser && targetUser.name ? (
            <div className="w-full max-w-3xl">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-success)/0.5)] to-transparent"
                />
                <div className="relative p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">{t("Transfer:doubleCheckTitle")}</h4>
                  <p className="text-xs text-muted-foreground/70 mb-3">{t("Transfer:doubleCheckDescription")}</p>
                  <ul className="ml-2 list-disc [&>li]:mt-2 text-sm text-foreground/80">
                    <li>{t("Transfer:doubleCheckFormInputs")}</li>
                    <li>{t("Transfer:validateBeetPrompt")}</li>
                    <li>
                      <span>
                        {t("Transfer:bitsharesLink", {
                          name: targetUser.name,
                        })}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
          {targetUser && targetUser.name ? (
            <div className="w-full max-w-3xl">
              <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--accent-warning)/0.2)] bg-card/60 backdrop-blur-xl">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-warning)/0.5)] to-transparent"
                />
                <div className="relative p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">{t("Transfer:scamAlertTitle")}</h4>
                  <p className="text-xs text-muted-foreground/70 mb-3">{t("Transfer:scamAlertDescription")}</p>
                  <ul className="ml-2 list-disc [&>li]:mt-2 text-sm text-foreground/80">
                    <li>{t("Transfer:scamAlertPoint1")}</li>
                    <li>{t("Transfer:scamAlertPoint2")}</li>
                    <li>{t("Transfer:scamAlertPoint3")}</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
    </>
  );
}
