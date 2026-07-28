import { LockOpen2Icon, LockClosedIcon } from "@radix-ui/react-icons";
import { Sparkles, Landmark, ArrowRight, Info, Wallet, Percent } from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { assetAmountRegex } from "@/lib/common.js";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  Avatar as Av,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Avatar } from "@/components/Avatar.tsx";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function CDPForm({
  form,
  usr,
  parsedAsset,
  parsedCollateralAsset,
  parsedBitasset,
  currentFeedSettlementPrice,
  formCallPrice,
  fee,
  debtLock,
  setDebtLock,
  collateralLock,
  setCollateralLock,
  ratioLock,
  setRatioLock,
  debtAmount,
  collateralAmount,
  ratioValue,
  tcrEnabled,
  setTCREnabled,
  tcrValue,
  debtAssetHoldings,
  collateralAssetHoldings,
  debouncedDebtAmount,
  debouncedCollateralAmount,
  debouncedSetRatioValue,
  debouncedSetTCRValue,
  setShowDialog,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <Card className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-1)/0.1)]">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.08)] blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.08)] blur-3xl" />
      <CardContent className="relative p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))] flex-shrink-0">
            <Landmark className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <CardHeader className="p-0">
            <CardTitle className="text-base font-semibold text-foreground tracking-tight">
              {t("Smartcoin:CDPFormTitle")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/70 mt-0.5">
              {t("Smartcoin:CDPFormDescription1")}
            </CardDescription>
          </CardHeader>
        </div>
        <Form {...form}>
          <form
            onSubmit={() => {
              setShowDialog(true);
              event.preventDefault();
            }}
          >
            <FormField
              control={form.control}
              name="account"
              render={() => (
                <FormItem>
                  <FormLabel>{t("Smartcoin:borrowingAccount")}</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-12 mt-4">
                      <div className="hidden md:flex col-span-1 items-center justify-center">
                        {usr && usr.username ? (
                          <Avatar
                            size={40}
                            name={usr.username}
                            extra="Target"
                            expression={{
                              eye: "normal",
                              mouth: "open",
                            }}
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
                      <div className="col-span-12 md:col-span-5">
                        <Input
                          disabled
                          placeholder="Bitshares account (1.2.x)"
                          className="mb-3 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                          value={`${usr.username} (${usr.id})`}
                          readOnly
                        />
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="borrowAsset"
              render={() => (
                <FormItem>
                  <FormLabel>{t("Smartcoin:assetToBorrow")}</FormLabel>
                  <FormControl>
                    <span className="grid grid-cols-8">
                      <span className="col-span-6">
                        <Input
                          disabled
                          placeholder="Bitshares smartcoin (1.3.x)"
                          className="mb-1 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                          value={`${parsedAsset ? parsedAsset.s : ""} (${
                            parsedAsset ? parsedAsset.id : ""
                          })`}
                          readOnly
                        />
                      </span>
                      <span className="col-span-2">
                        <a href="/smartcoins.html">
                          <Button
                            className="ml-3 border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] transition-colors"
                            variant="outline"
                          >
                            {t("Smartcoin:changeAssetButton")}
                          </Button>
                        </a>
                      </span>
                    </span>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.15)] to-[hsl(var(--accent-2)/0.15)] dark:text-[hsl(var(--accent-1-fg)/0.8)] text-[hsl(var(--accent-1-fg)/0.8)]">
                    <Info className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                      {t("Smartcoin:currentFeedPriceTitle")}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60">
                      {t("Smartcoin:currentFeedPriceDescription")}
                    </div>
                  </div>
                </div>
                <span className="grid grid-cols-2">
                  <span className="col-span-1">
                    <HoverCard key="feedPrice1">
                      <HoverCardTrigger asChild>
                        <Input
                          disabled
                          className="mr-1 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                          value={currentFeedSettlementPrice ?? ""}
                          readOnly
                        />
                      </HoverCardTrigger>
                      <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                        {parsedCollateralAsset.s}/{parsedAsset.s}
                      </HoverCardContent>
                    </HoverCard>
                  </span>
                  <span className="col-span-1">
                    <HoverCard key="feedPrice2">
                      <HoverCardTrigger asChild>
                        <Input
                          disabled
                          className="ml-1 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                          value={
                            currentFeedSettlementPrice
                              ? (
                                  1 / currentFeedSettlementPrice
                                ).toFixed(parsedAsset.p)
                              : ""
                          }
                          readOnly
                        />
                      </HoverCardTrigger>
                      <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                        {parsedAsset.s}/{parsedCollateralAsset.s}
                      </HoverCardContent>
                    </HoverCard>
                  </span>
                </span>
              </div>
              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.15)] to-[hsl(var(--accent-2)/0.15)] dark:text-[hsl(var(--accent-1-fg)/0.8)] text-[hsl(var(--accent-1-fg)/0.8)]">
                    <Percent className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-1-fg)/0.7)] text-[hsl(var(--accent-1-fg)/0.8)]">
                      {t("Smartcoin:marginCallPriceTitle")}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60">
                      {t("Smartcoin:marginCallPriceDescription")}
                    </div>
                  </div>
                </div>
                <span className="grid grid-cols-2">
                  <span className="col-span-1">
                    <HoverCard key="feedPrice1">
                      <HoverCardTrigger asChild>
                        <Input
                          disabled
                          className="mr-1 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                          value={
                            formCallPrice && parsedCollateralAsset
                              ? formCallPrice.toFixed(
                                  parsedCollateralAsset.p
                                )
                              : ""
                          }
                          readOnly
                        />
                      </HoverCardTrigger>
                      <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                        {parsedCollateralAsset.s}/{parsedAsset.s}
                      </HoverCardContent>
                    </HoverCard>
                  </span>
                  <span className="col-span-1">
                    <HoverCard key="feedPrice2">
                      <HoverCardTrigger asChild>
                        <Input
                          disabled
                          className="ml-1 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                          value={
                            formCallPrice && parsedAsset
                              ? (1 / formCallPrice).toFixed(
                                  parsedAsset.p
                                  )
                                : ""
                            }
                            readOnly
                          />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                          {parsedAsset.s}/{parsedCollateralAsset.s}
                        </HoverCardContent>
                      </HoverCard>
                    </span>
                  </span>
                </div>
              </div>

            <FormField
              control={form.control}
              name="debtAmount"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormLabel>{t("Smartcoin:debtAmount")}</FormLabel>
                  <FormDescription
                    style={{ marginTop: 0, paddingTop: 0 }}
                  >
                    <span className="grid grid-cols-1 md:grid-cols-3 mt-0 pt-0">
                      <span className="col-span-1 text-left">
                        {t("Smartcoin:debtAmountDescription", {
                          asset: parsedAsset ? parsedAsset.s : "?",
                        })}
                      </span>
                      <span
                        className={`col-span-1 md:text-right ${
                          debtAssetHoldings &&
                          debtAssetHoldings.toString().includes("-")
                            ? "text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))]"
                            : ""
                        }`}
                      >
                        {t("Smartcoin:debtAmountBalance", {
                          balance: debtAssetHoldings ?? "",
                          asset: parsedAsset ? parsedAsset.s : "",
                        })}
                      </span>
                      <span
                        className={`hidden md:block col-span-1`}
                      ></span>
                    </span>
                  </FormDescription>
                  <FormControl>
                    <span className="grid grid-cols-12">
                      <span className="col-span-2 md:col-span-1">
                        <HoverCard key="debtLockCard">
                          <HoverCardTrigger asChild>
                            <Toggle
                              variant="outline"
                              onClick={() => {
                                if (debtLock === "editable") {
                                  setDebtLock("locked");
                                  setRatioLock("editable");
                                  setCollateralLock("editable");
                                }
                              }}
                              className={debtLock === "locked"
                                ? "border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.15)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                                : ""
                              }
                            >
                              {debtLock === "editable" ? (
                                <LockOpen2Icon className="h-4 w-4" />
                              ) : (
                                <LockClosedIcon className="h-4 w-4" />
                              )}
                            </Toggle>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                            {debtLock === "editable"
                              ? t("Smartcoin:lockDebtAmount")
                              : t("Smartcoin:debtAmountLocked")}
                          </HoverCardContent>
                        </HoverCard>
                      </span>
                      <span className="col-span-10 md:col-span-7">
                        <Input
                          label={t("Smartcoin:amountOfDebtToIssue")}
                          value={
                            debtAmount
                              ? `${debtAmount} ${parsedAsset.s}`
                              : `0 ${parsedAsset.s}`
                          }
                          disabled
                          readOnly
                          className="mb-3 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                        />
                      </span>
                      <span className="col-span-12 sm:mt-3 md:mt-0 md:col-span-4 md:ml-3">
                        {debtLock === "editable" ? (
                          <Popover>
                            <PopoverTrigger>
                              <span
                                onClick={() => {
                                  event.preventDefault();
                                }}
                                className="inline-block border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] rounded-lg pl-4 pb-1 pr-4 hover:bg-[hsl(var(--accent-1)/0.2)] transition-colors cursor-pointer"
                              >
                                <Label>
                                  {t("Smartcoin:changeDebtAmount")}
                                </Label>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>
                                {t("Smartcoin:provideNewDebtAmount")}
                              </Label>{" "}
                              <Input
                                placeholder={debtAmount}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = assetAmountRegex({
                                    precision: parsedAsset.p,
                                  });
                                  if (
                                    input &&
                                    input.length &&
                                    regex.test(input)
                                  ) {
                                    debouncedDebtAmount(
                                      input,
                                      currentFeedSettlementPrice,
                                      collateralAmount,
                                      ratioValue,
                                      parsedAsset.p,
                                      parsedCollateralAsset.p,
                                      debtLock,
                                      collateralLock,
                                      ratioLock
                                    );
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : null}
                      </span>
                    </span>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="collateralAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Smartcoin:collateralAmount")}</FormLabel>
                  <FormDescription
                    style={{ marginTop: 0, paddingTop: 0 }}
                  >
                    <span className="grid grid-cols-1 md:grid-cols-3 mt-0 pt-0">
                      <span className="col-span-1 text-left">
                        {t("Smartcoin:collateralAmountDescription", {
                          asset: parsedCollateralAsset
                            ? parsedCollateralAsset.s
                            : "?",
                        })}
                      </span>
                      <span
                        className={`col-span-1 md:text-right ${
                          collateralAssetHoldings &&
                          collateralAssetHoldings.toString().includes("-")
                            ? "text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))]"
                            : ""
                        }`}
                      >
                        {t("Smartcoin:collateralAmountBalance", {
                          balance: collateralAssetHoldings ?? 0,
                          asset: parsedCollateralAsset
                            ? parsedCollateralAsset.s
                            : "",
                        })}
                      </span>
                      <span className="hidden md:block"></span>
                    </span>
                  </FormDescription>
                  <FormControl>
                    <span className="grid grid-cols-12">
                      <span className="col-span-2 md:col-span-1">
                        <HoverCard key="collateralLockCard">
                          <HoverCardTrigger asChild>
                            <Toggle
                              variant="outline"
                              onClick={() => {
                                if (collateralLock === "editable") {
                                  setDebtLock("editable");
                                  setRatioLock("editable");
                                  setCollateralLock("locked");
                                }
                              }}
                              className={collateralLock === "locked"
                                ? "border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.15)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                                : ""
                              }
                            >
                              {collateralLock === "editable" ? (
                                <LockOpen2Icon className="h-4 w-4" />
                              ) : (
                                <LockClosedIcon className="h-4 w-4" />
                              )}
                            </Toggle>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                            {collateralLock === "editable"
                              ? t("Smartcoin:lockCollateralAmount")
                              : t("Smartcoin:collateralAmountLocked")}
                          </HoverCardContent>
                        </HoverCard>
                      </span>
                      <span className="col-span-10 md:col-span-7">
                        <Input
                          label={t(
                            "Smartcoin:amountOfCollateralToCommit"
                          )}
                          placeholder={
                            collateralAmount && collateralAmount > 0
                              ? `${collateralAmount} ${parsedCollateralAsset.s}`
                              : `? ${parsedCollateralAsset.s}`
                          }
                          readOnly
                          disabled
                          className="mb-3 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                        />
                      </span>
                      <span className="col-span-12 sm:mt-3 md:mt-0 md:col-span-4 md:ml-3">
                        {collateralLock === "editable" ? (
                          <Popover>
                            <PopoverTrigger>
                              <span
                                onClick={() => {
                                  event.preventDefault();
                                }}
                                className="inline-block border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] rounded-lg pl-4 pb-1 pr-4 hover:bg-[hsl(var(--accent-1)/0.2)] transition-colors cursor-pointer"
                              >
                                <Label>
                                  {t("Smartcoin:changeCollateralAmount")}
                                </Label>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>
                                {t(
                                  "Smartcoin:provideNewCollateralAmount"
                                )}
                              </Label>{" "}
                              <Input
                                placeholder={collateralAmount}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = assetAmountRegex({
                                    precision: parsedCollateralAsset.p,
                                  });
                                  if (
                                    input &&
                                    input.length &&
                                    regex.test(input)
                                  ) {
                                    debouncedCollateralAmount(
                                      input,
                                      currentFeedSettlementPrice,
                                      debtAmount,
                                      collateralAmount,
                                      parsedAsset.p,
                                      parsedCollateralAsset.p,
                                      ratioValue,
                                      debtLock,
                                      collateralLock,
                                      ratioLock
                                    );
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : null}
                      </span>
                    </span>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ratioValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("Smartcoin:collateralDebtRatio")}
                  </FormLabel>
                  <FormDescription>
                    <span className="grid grid-cols-1 md:grid-cols-3 mt-0 pt-0">
                      <span className="col-span-1 text-left">
                        {t("Smartcoin:collateralDebtRatioDescription")}
                      </span>
                      <span className="col-span-1 md:text-right">
                        {t("Smartcoin:collateralDebtRatioMin", {
                          min: parsedBitasset.mcr / 1000,
                        })}
                      </span>
                      <span className="hidden md:block"></span>
                    </span>
                  </FormDescription>
                  <FormControl>
                    <span className="grid grid-cols-12">
                      <span className="col-span-2 md:col-span-1">
                        <HoverCard key="ratioLockCard">
                          <HoverCardTrigger asChild>
                            <Toggle
                              variant="outline"
                              onClick={() => {
                                if (ratioLock === "editable") {
                                  setDebtLock("editable");
                                  setRatioLock("locked");
                                  setCollateralLock("editable");
                                } else {
                                  setDebtLock("editable");
                                  setRatioLock("editable");
                                  setCollateralLock("locked");
                                }
                              }}
                              className={ratioLock === "locked"
                                ? "border-[hsl(var(--accent-1)/0.4)] bg-[hsl(var(--accent-1)/0.15)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                                : ""
                              }
                            >
                              {ratioLock === "editable" ? (
                                <LockOpen2Icon className="h-4 w-4" />
                              ) : (
                                <LockClosedIcon className="h-4 w-4" />
                              )}
                            </Toggle>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-40 text-sm text-center pt-1 pb-1">
                            {ratioLock === "editable"
                              ? t("Smartcoin:lockRatioValue")
                              : t("Smartcoin:unlockRatioValue")}
                          </HoverCardContent>
                        </HoverCard>
                      </span>
                      <span className="col-span-12 md:col-span-7">
                        {ratioValue ? (
                          <Input
                            label={t("Smartcoin:ratioOfCollateralToDebt")}
                            placeholder={ratioValue}
                            className="mb-3 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                            disabled
                            readOnly
                          />
                        ) : (
                          <Input
                            label={t("Smartcoin:ratioOfCollateralToDebt")}
                            className="mb-3 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                            disabled
                            readOnly
                          />
                        )}
                        {ratioLock === "editable" ? (
                          <Slider
                            defaultValue={[ratioValue]}
                            value={[ratioValue]}
                            max={20}
                            min={parsedBitasset.mcr / 1000}
                            step={0.01}
                            onValueChange={(value) => {
                              debouncedSetRatioValue(
                                value[0],
                                currentFeedSettlementPrice,
                                debtAmount,
                                collateralAmount,
                                parsedBitasset.mcr,
                                parsedAsset.p,
                                parsedCollateralAsset.p,
                                debtLock,
                                collateralLock,
                                ratioLock
                              );
                            }}
                          />
                        ) : null}
                      </span>
                      <span className="col-span-12 sm:mt-3 md:mt-0 md:col-span-4 md:ml-3">
                        {ratioLock === "editable" ? (
                          <Popover>
                            <PopoverTrigger>
                              <span
                                onClick={() => {
                                  event.preventDefault();
                                }}
                                className="inline-block border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] rounded-lg pl-4 pb-1 pr-4 hover:bg-[hsl(var(--accent-1)/0.2)] transition-colors cursor-pointer"
                              >
                                <Label>
                                  {t("Smartcoin:changeRatioValue")}
                                </Label>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>
                                {t("Smartcoin:provideNewRatio")}
                              </Label>{" "}
                              <Input
                                placeholder={ratioValue}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = /^[0-9]*\.?[0-9]*$/;
                                  if (
                                    input &&
                                    input.length &&
                                    regex.test(input)
                                  ) {
                                    debouncedSetRatioValue(
                                      input,
                                      currentFeedSettlementPrice,
                                      debtAmount,
                                      collateralAmount,
                                      parsedBitasset.mcr,
                                      parsedAsset.p,
                                      parsedCollateralAsset.p,
                                      debtLock,
                                      collateralLock,
                                      ratioLock
                                    );
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : null}
                      </span>
                    </span>
                  </FormControl>
                  {ratioValue &&
                  parsedBitasset &&
                  ratioValue < parsedBitasset.mcr / 1000 ? (
                    <FormMessage>
                      {t("Smartcoin:debtCollateralRatioWarning", {
                        min: parsedBitasset.mcr / 1000,
                      })}
                    </FormMessage>
                  ) : null}
                </FormItem>
              )}
            />

            <br />
            <FormField
              control={form.control}
              name="tcrValue"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <span className="inline-flex items-center gap-2">
                      <Checkbox
                        id="terms1"
                        className="mr-2"
                        checked={tcrEnabled}
                        onClick={() => setTCREnabled(!tcrEnabled)}
                      />
                      <span className="text-sm">
                        {t("Smartcoin:enableTargetCollateralRatio")}
                      </span>
                    </span>
                  </FormControl>
                </FormItem>
              )}
            />
            {tcrEnabled ? (
              <FormField
                control={form.control}
                name="tcrValue"
                render={({ field }) => (
                  <FormItem className="mt-0">
                    <FormLabel>
                      {t("Smartcoin:targetCollateralRatioValue")}
                    </FormLabel>
                    <FormDescription>
                      <span className="grid grid-cols-1 md:grid-cols-3 mt-0 pt-0">
                        <span className="col-span-1 text-left">
                          {t(
                            "Smartcoin:targetCollateralRatioDescription"
                          )}
                        </span>
                        <span className="col-span-1 md:text-right">
                          {t("Smartcoin:targetCollateralRatioMin", {
                            min: parsedBitasset.mcr / 1000,
                          })}
                        </span>
                        <span className="hidden md:block"></span>
                      </span>
                    </FormDescription>
                    <FormControl>
                      <span className="grid grid-cols-12">
                        <span className="col-span-8">
                          <Input
                            label={t("Smartcoin:ratioOfCollateralToDebt")}
                            placeholder={tcrValue}
                            disabled
                            readOnly
                          />
                          <Slider
                            className="mt-3"
                            defaultValue={[
                              tcrValue ?? parsedBitasset.mcr / 1000,
                            ]}
                            max={20}
                            min={parsedBitasset.mcr / 1000}
                            step={0.1}
                            onValueChange={(value) => {
                              debouncedSetTCRValue(
                                value[0],
                                parsedBitasset.mcr
                              );
                            }}
                          />
                        </span>

                        <span className="col-span-4 ml-3">
                          <Popover>
                            <PopoverTrigger>
                              <span
                                onClick={() => {
                                  event.preventDefault();
                                }}
                                className="inline-block border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] rounded-lg pl-4 pb-1 pr-4 hover:bg-[hsl(var(--accent-1)/0.2)] transition-colors cursor-pointer"
                              >
                                <Label>
                                  {t("Smartcoin:changeTCRValue")}
                                </Label>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent>
                              <Label>
                                {t("Smartcoin:provideNewTCR")}
                              </Label>
                              <Input
                                placeholder={tcrValue}
                                className="mb-2 mt-1"
                                onChange={(event) => {
                                  const input = event.target.value;
                                  const regex = /^[0-9]*\.?[0-9]*$/;
                                  if (
                                    input &&
                                    input.length &&
                                    regex.test(input)
                                  ) {
                                    debouncedSetTCRValue(
                                      input,
                                      parsedBitasset.mcr
                                    );
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </span>
                      </span>
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="networkFee"
              render={({ field }) => (
                <FormItem className="mb-1 mt-3">
                  <FormLabel>
                    {t("Smartcoin:networkBroadcastFee")}
                  </FormLabel>
                  <FormDescription>
                    {t("Smartcoin:networkBroadcastFeeDescription")}
                  </FormDescription>
                  <FormControl>
                    <Input
                      disabled
                      placeholder={fee ? `${fee} BTS` : ""}
                      className="w-1/6 border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                      readOnly
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {(debtAssetHoldings &&
              debtAssetHoldings.toString().includes("-")) ||
            (collateralAssetHoldings &&
              collateralAssetHoldings.toString().includes("-")) ? (
              <>
                <Button className="mt-5 mb-3 bg-muted text-muted-foreground cursor-not-allowed" disabled>
                  {t("Smartcoin:submit")}
                </Button>
              </>
            ) : (
              <Button
                className="mt-5 mb-3 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_4px_14px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(99,102,241,0.6)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] transition-all"
                type="submit"
              >
                {t("Smartcoin:submit")}
                <span className="ml-2">→</span>
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
