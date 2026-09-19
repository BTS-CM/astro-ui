import { LockOpen2Icon, LockClosedIcon } from "@radix-ui/react-icons";
import { Sparkles, Landmark, ArrowRight, Info, Wallet, Percent, Coins, Target, Zap } from "lucide-react";
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
  FormField,
  FormItem,
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

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

// Explanatory text lives behind an info icon instead of crowding the form.
function InfoTip({ content }) {
  if (!content) return null;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0 cursor-help">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px]">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

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
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] flex-shrink-0">
            <Landmark className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              {t("Smartcoin:CDPFormTitle")}
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {t("Smartcoin:CDPFormDescription1")}
            </p>
          </div>
        </div>
        <Form {...form}>
          <form
            className="space-y-5"
            onSubmit={() => {
              setShowDialog(true);
              event.preventDefault();
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[hsl(var(--accent-1)/0.12)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.04)] to-[hsl(var(--accent-1)/0.01)] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.1)] shrink-0">
                    <Wallet className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  <span className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
                    {t("Smartcoin:borrowingAccount")}
                  </span>
                </div>
                <FormField
                  control={form.control}
                  name="account"
                  render={() => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          {usr && usr.username ? (
                            <span className="shrink-0">
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
                            </span>
                          ) : (
                            <Av>
                              <AvatarFallback>?</AvatarFallback>
                            </Av>
                          )}
                          <div className="flex-1 min-w-0">
                            <Input
                              disabled
                              placeholder="Bitshares account (1.2.x)"
                              value={`${usr.username} (${usr.id})`}
                              readOnly
                            />
                          </div>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-2xl border border-border bg-gradient-to-br from-[hsl(var(--accent-1)/0.03)] to-transparent p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.1)] shrink-0">
                      <Coins className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                    </span>
                    <span className="text-sm font-semibold text-[hsl(var(--accent-1-fg))] truncate">
                      {t("Smartcoin:assetToBorrow")}
                    </span>
                  </div>
                  <a href="/smartcoins.html" className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] gap-1.5"
                    >
                      {t("Smartcoin:changeAssetButton")}
                    </Button>
                  </a>
                </div>
                <FormField
                  control={form.control}
                  name="borrowAsset"
                  render={() => (
                    <FormItem>
                      <FormControl>
                        <Input
                          disabled
                          placeholder="Bitshares smartcoin (1.3.x)"
                          value={`${parsedAsset ? parsedAsset.s : ""} (${
                            parsedAsset ? parsedAsset.id : ""
                          })`}
                          readOnly
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[hsl(var(--accent-1)/0.12)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.04)] to-[hsl(var(--accent-1)/0.01)] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.1)] shrink-0">
                    <Info className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  <span className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
                    {t("Smartcoin:currentFeedPriceTitle")}
                  </span>
                  <InfoTip content={t("Smartcoin:currentFeedPriceDescription")} />
                </div>
                <div className="text-sm font-semibold tabular-nums text-foreground">
                  {currentFeedSettlementPrice ?? ""}{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {parsedCollateralAsset.s}/{parsedAsset.s}
                  </span>
                </div>
                <div className="text-[11px] tabular-nums text-muted-foreground">
                  {currentFeedSettlementPrice
                    ? (1 / currentFeedSettlementPrice).toFixed(parsedAsset.p)
                    : ""}{" "}
                  {parsedAsset.s}/{parsedCollateralAsset.s}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-gradient-to-br from-[hsl(var(--accent-1)/0.03)] to-transparent p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.1)] shrink-0">
                    <Percent className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  <span className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
                    {t("Smartcoin:marginCallPriceTitle")}
                  </span>
                  <InfoTip content={t("Smartcoin:marginCallPriceDescription")} />
                </div>
                <div className="text-sm font-semibold tabular-nums text-foreground">
                  {formCallPrice && parsedCollateralAsset
                    ? formCallPrice.toFixed(parsedCollateralAsset.p)
                    : ""}{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {parsedCollateralAsset.s}/{parsedAsset.s}
                  </span>
                </div>
                <div className="text-[11px] tabular-nums text-muted-foreground">
                  {formCallPrice && parsedAsset
                    ? (1 / formCallPrice).toFixed(parsedAsset.p)
                    : ""}{" "}
                  {parsedAsset.s}/{parsedCollateralAsset.s}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="debtAmount"
              render={({ field }) => (
                <FormItem>
                  <div className="rounded-2xl border border-[hsl(var(--accent-1)/0.12)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.04)] to-[hsl(var(--accent-1)/0.01)] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.1)] shrink-0">
                        <Coins className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                      </span>
                      <span className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
                        {t("Smartcoin:debtAmount")}
                      </span>
                      <InfoTip
                        content={t("Smartcoin:debtAmountDescription", {
                          asset: parsedAsset ? parsedAsset.s : "?",
                        })}
                      />
                      <span
                        className={`ml-auto text-xs tabular-nums ${
                          debtAssetHoldings &&
                          debtAssetHoldings.toString().includes("-")
                            ? "text-[hsl(var(--accent-danger-fg))]"
                            : "text-muted-foreground"
                        }`}
                      >
                        {t("Smartcoin:debtAmountBalance", {
                          balance: debtAssetHoldings ?? "",
                          asset: parsedAsset ? parsedAsset.s : "",
                        })}
                      </span>
                    </div>
                    <FormControl>
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <span className="shrink-0">
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
                        <div className="flex-1 min-w-0">
                          <Input
                            label={t("Smartcoin:amountOfDebtToIssue")}
                            value={
                              debtAmount
                                ? `${debtAmount} ${parsedAsset.s}`
                                : `0 ${parsedAsset.s}`
                            }
                            disabled
                            readOnly
                          />
                        </div>
                        <span className="shrink-0">
                          {debtLock === "editable" ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] gap-1.5"
                                  onClick={(event) => {
                                    event.preventDefault();
                                  }}
                                >
                                  {t("Smartcoin:changeDebtAmount")}
                                </Button>
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
                      </div>
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="collateralAmount"
              render={({ field }) => (
                <FormItem>
                  <div className="rounded-2xl border border-border bg-gradient-to-br from-[hsl(var(--accent-1)/0.03)] to-transparent p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.1)] shrink-0">
                        <Landmark className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                      </span>
                      <span className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
                        {t("Smartcoin:collateralAmount")}
                      </span>
                      <InfoTip
                        content={t("Smartcoin:collateralAmountDescription", {
                          asset: parsedCollateralAsset
                            ? parsedCollateralAsset.s
                            : "?",
                        })}
                      />
                      <span
                        className={`ml-auto text-xs tabular-nums ${
                          collateralAssetHoldings &&
                          collateralAssetHoldings.toString().includes("-")
                            ? "text-[hsl(var(--accent-danger-fg))]"
                            : "text-muted-foreground"
                        }`}
                      >
                        {t("Smartcoin:collateralAmountBalance", {
                          balance: collateralAssetHoldings ?? 0,
                          asset: parsedCollateralAsset
                            ? parsedCollateralAsset.s
                            : "",
                        })}
                      </span>
                    </div>
                    <FormControl>
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <span className="shrink-0">
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
                        <div className="flex-1 min-w-0">
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
                          />
                        </div>
                        <span className="shrink-0">
                          {collateralLock === "editable" ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] gap-1.5"
                                  onClick={(event) => {
                                    event.preventDefault();
                                  }}
                                >
                                  {t("Smartcoin:changeCollateralAmount")}
                                </Button>
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
                      </div>
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ratioValue"
              render={({ field }) => (
                <FormItem>
                  <div className="rounded-2xl border border-[hsl(var(--accent-1)/0.12)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.04)] to-[hsl(var(--accent-1)/0.01)] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.1)] shrink-0">
                        <Percent className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                      </span>
                      <span className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
                        {t("Smartcoin:collateralDebtRatio")}
                      </span>
                      <InfoTip
                        content={t("Smartcoin:collateralDebtRatioDescription")}
                      />
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {t("Smartcoin:collateralDebtRatioMin", {
                          min: parsedBitasset.mcr / 1000,
                        })}
                      </span>
                    </div>
                    <FormControl>
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <span className="shrink-0">
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
                        <div className="flex-1 min-w-0 space-y-3">
                          {ratioValue ? (
                            <Input
                              label={t("Smartcoin:ratioOfCollateralToDebt")}
                              placeholder={ratioValue}
                              disabled
                              readOnly
                            />
                          ) : (
                            <Input
                              label={t("Smartcoin:ratioOfCollateralToDebt")}
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
                        </div>
                        <span className="shrink-0">
                          {ratioLock === "editable" ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] gap-1.5"
                                  onClick={(event) => {
                                    event.preventDefault();
                                  }}
                                >
                                  {t("Smartcoin:changeRatioValue")}
                                </Button>
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
                      </div>
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
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tcrValue"
                render={({ field }) => (
                  <FormItem>
                    <div
                      className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                        tcrEnabled
                          ? "border-border bg-gradient-to-br from-[hsl(var(--accent-1)/0.03)] to-transparent"
                          : "border-dashed border-border/60 bg-card/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-1)/0.1)] shrink-0">
                          <Target className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                        </span>
                        <span className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">
                          {t("Smartcoin:targetCollateralRatioValue")}
                        </span>
                        <InfoTip
                          content={t(
                            "Smartcoin:targetCollateralRatioDescription"
                          )}
                        />
                        <span
                          className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            tcrEnabled
                              ? "border-[hsl(var(--accent-success)/0.4)] bg-[hsl(var(--accent-success)/0.12)] text-[hsl(var(--accent-success-fg))]"
                              : "border-border/60 bg-card/40 text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              tcrEnabled
                                ? "bg-[hsl(var(--accent-success))]"
                                : "bg-muted-foreground/50"
                            }`}
                          />
                          {tcrEnabled
                            ? t("Smartcoin:tcrStatusEnabled", "Enabled")
                            : t("Smartcoin:tcrStatusDisabled", "Disabled")}
                        </span>
                        <Switch
                          checked={tcrEnabled}
                          onCheckedChange={setTCREnabled}
                          aria-label={t("Smartcoin:enableTargetCollateralRatio")}
                          className="shrink-0 data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-white/[0.12] [&>span]:bg-white"
                        />
                      </div>
                      {tcrEnabled ? (
                        <>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {t("Smartcoin:targetCollateralRatioMin", {
                              min: parsedBitasset.mcr / 1000,
                            })}
                          </p>
                          <FormControl>
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                          <div className="flex-1 min-w-0 space-y-3">
                            <Input
                              label={t("Smartcoin:ratioOfCollateralToDebt")}
                              placeholder={tcrValue}
                              disabled
                              readOnly
                            />
                            <Slider
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
                          </div>
                          <span className="shrink-0">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] gap-1.5"
                                  onClick={(event) => {
                                    event.preventDefault();
                                  }}
                                >
                                  {t("Smartcoin:changeTCRValue")}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent>
                                <Label>
                                  {t("Smartcoin:provideNewTCR")}
                                </Label>{" "}
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
                        </div>
                        </FormControl>
                        </>
                      ) : null}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-xs rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--accent-1-fg))]">
                    <Zap className="h-3 w-3" strokeWidth={2.5} />
                    {t("Smartcoin:networkBroadcastFee")}
                  </span>
                  {usr && usr.id === usr.referrer && fee !== undefined ? (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-mono text-sm tabular-nums text-[hsl(var(--accent-1-fg))] cursor-help">
                            {fee ?? "?"} BTS
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-card border-border text-foreground text-xs">
                          {t("Smartcoin:feeRebate", {
                            rebate: (fee * 0.8).toFixed(5),
                          })}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="font-mono text-sm tabular-nums text-[hsl(var(--accent-1-fg))]">
                      {fee ?? "?"} BTS
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                {(debtAssetHoldings &&
                  debtAssetHoldings.toString().includes("-")) ||
                (collateralAssetHoldings &&
                  collateralAssetHoldings.toString().includes("-")) ? (
                  <>
                    <Button className="bg-muted text-muted-foreground cursor-not-allowed" disabled>
                      {t("Smartcoin:submit")}
                    </Button>
                  </>
                ) : (
                  <Button
                    className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_4px_14px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(99,102,241,0.6)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] transition-all"
                    type="submit"
                  >
                    {t("Smartcoin:submit")}
                    <span className="ml-2">→</span>
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
