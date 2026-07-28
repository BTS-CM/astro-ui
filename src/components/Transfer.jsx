import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
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

import {
  Avatar as Av,
  AvatarFallback,
} from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import {
  humanReadableFloat,
  trimPrice,
  blockchainFloat,
  assetAmountRegex,
} from "@/lib/common";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { accountSearch } from "@/nanoeffects/UserSearch.ts";

import { Avatar } from "./Avatar.tsx";
import AccountSearch from "./AccountSearch.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";

import AssetDropDown from "./Market/AssetDropDownCard.jsx";

import { ArrowRight, Send } from "lucide-react";

import { cn } from "@/lib/utils";

export default function Transfer(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
      targetAccount: "",
      targetAsset: "",
      availableAmount: "",
      transferAmount: 0,
      memoField: "",
      networkFee: "",
    },
  });
  const currentNode = useStore($currentNode);

  const [showDialog, setShowDialog] = useState(false);

  const [senderUser, setSenderUser] = useState();
  const [targetUser, setTargetUser] = useState();
  const [selectedAsset, setSelectedAsset] = useState();
  const [transferAmount, setTransferAmount] = useState(0);
  const [memoContents, setMemoContents] = useState();

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

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  // bothUsers and foundAsset must be declared before the fee effect
  // otherwise they are referenced in the dependency array before initialization
  const [bothUsers, setBothUsers] = useState(false);
  useEffect(() => {
    if (usr && usr.chain && currentNode && targetUser) {
      const userStore = createObjectStore([
        usr.chain,
        JSON.stringify([usr.id, targetUser.id]),
        currentNode ? currentNode.url : null,
      ]);
      userStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBothUsers(data);
        }
      });
    }
  }, [usr, currentNode, targetUser]);

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

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 0);
      if (foundFee && foundFee.data) {
        const baseFeeSat = foundFee.data.fee || 0;
        const pricePerKbyte = foundFee.data.price_per_kbyte || 0;

        let dataStr = JSON.stringify({
          from: usr?.id || "",
          to: targetUser?.id || "",
          amount: transferAmount || 0,
          asset_id: foundAsset?.id || "",
          extensions: {},
        });
        if (memoContents && memoContents.length) {
          dataStr += JSON.stringify({
            from: bothUsers?.[0]?.options?.memo_key || "",
            to: bothUsers?.[1]?.options?.memo_key || "",
            nonce: String(Date.now()),
            message: memoContents,
          });
        }
        const dataSizeKB = new Blob([dataStr]).size / 1024;
        const dataFeeSat = pricePerKbyte > 0 ? Math.ceil(dataSizeKB * pricePerKbyte) : 0;
        const totalFeeSat = baseFeeSat + dataFeeSat;
        setFee(humanReadableFloat(totalFeeSat, 5));
      }
    }
  }, [globalParams, memoContents, targetUser, transferAmount, foundAsset, bothUsers, usr]);

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id && currentNode && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
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
  }, [usr, assets, currentNode, balanceCounter]);
 

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
      accountSearch(usr.chain, toName, currentNode ? currentNode.url : null)
        .then((acct) => {
          if (acct && acct.id && acct.name) {
            setTargetUser({ id: acct.id, name: acct.name });
            form.setValue("targetAccount", acct.name);
          }
        })
        .catch(() => {});
    }
  }, [usr, currentNode]);

  const operationJSON = useMemo(() => {
    if (!usr || !targetUser || !foundAsset) {
      return null;
    }

    let _data = [
      {
        fee: {
          amount: 0,
          asset_id: "1.3.0",
        },
        from: usr.id,
        to: targetUser.id,
        amount: {
          amount: blockchainFloat(transferAmount, foundAsset.precision).toFixed(
            0
          ),
          asset_id: foundAsset.id,
        },
        extensions: {},
      },
    ];

    if (memoContents && memoContents.length) {
      _data["memo"] = {
        // clear-text until processed by beeteos!
        from: bothUsers[0].options.memo_key,
        to: bothUsers[1].options.memo_key,
        nonce: String(Date.now()),
        message: memoContents,
      };
    }

    return _data;
  }, [
    usr,
    targetUser,
    transferAmount,
    foundAsset,
    memoContents,
    bothUsers,
    memoContents,
  ]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:1/2 space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xl shadow-black/30">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.06)] blur-3xl"
          />
          <div className="relative px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                <Send className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                  {t("Transfer:transferAssets")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("Transfer:sendFundsDescription")}
                </p>
              </div>
            </div>
          </div>
          <div className="relative px-5 sm:px-6 pb-6">
            <form
                onSubmit={form.handleSubmit(() => {
                  setShowDialog(true);
                })}
              >
                <FieldGroup>
                  <Controller
                    name="account"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-foreground/70 text-xs uppercase tracking-wider">
                          {t("Transfer:sendingAccount")}
                        </FieldLabel>
                        <div className="grid grid-cols-8 gap-2">
                          <div className="col-span-1 flex items-center justify-center">
                            <Avatar
                              size={40}
                              name={usr && usr.username ? usr.username : "x"}
                              extra="Sender"
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
                          </div>
                          <div className="col-span-7">
                            <Input
                              {...field}
                              disabled
                              className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1 mt-1"
                              value={`${
                                usr && usr.username ? usr.username : "?"
                              } (${usr && usr.id ? usr.id : "?"})`}
                            />
                          </div>
                        </div>
                        <FieldDescription className="text-muted-foreground text-xs">
                          {t("Transfer:sendingAccountDescription")}
                        </FieldDescription>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    name="targetAccount"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-foreground/70 text-xs uppercase tracking-wider">
                          {t("Transfer:targetAccount")}
                        </FieldLabel>
                        <div className="grid grid-cols-8 mt-4">
                          <div className="col-span-1 flex items-center justify-center">
                            {targetUser && targetUser.name ? (
                              <Avatar
                                size={40}
                                name={targetUser.name}
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
                                <AvatarFallback className="bg-card/80 text-muted-foreground text-xs">
                                  ?
                                </AvatarFallback>
                              </Av>
                            )}
                          </div>
                          <div className="col-span-7 md:col-span-5">
                            <Input
                              {...field}
                              disabled
                              placeholder={
                                targetUser && targetUser.name
                                  ? `${targetUser.name} (${targetUser.id})`
                                  : "Bitshares account (1.2.x)"
                              }
                              className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1 mt-1"
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
                                <Button variant="outline" className="ml-3 mt-1 border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]">
                                  {targetUser
                                    ? t("Transfer:changeTarget")
                                    : t("Transfer:provideTarget")}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[375px] border border-border bg-card text-foreground backdrop-blur-2xl shadow-xl shadow-black/50">
                                <DialogHeader>
                                  <DialogTitle className="text-foreground/90 text-sm">
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
                                  <DialogDescription className="text-muted-foreground text-xs">
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
                        <FieldDescription className="text-muted-foreground text-xs">
                          {!targetUser || !targetUser.name
                            ? t("Transfer:targetAccountDescription")
                            : t("Transfer:targetAccountDescriptionWithName", {
                                name: targetUser.name,
                              })}
                        </FieldDescription>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    name="targetAsset"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-foreground/70 text-xs uppercase tracking-wider">
                          {t("Transfer:assetToTransfer")}
                        </FieldLabel>
                        <div className="grid grid-cols-8 mt-4">
                          <div className="col-span-1 flex items-center justify-center">
                            {!selectedAsset || !foundAsset ? (
                              <Av>
                                <AvatarFallback className="bg-card/80 text-muted-foreground text-xs">
                                  ?
                                </AvatarFallback>
                              </Av>
                            ) : null}
                            {foundAsset ? (
                              <Av>
                                <AvatarFallback className="bg-card/80 text-foreground/70 text-xs">
                                  {foundAsset.bitasset_data_id
                                    ? "MPA"
                                    : "UIA"}
                                </AvatarFallback>
                              </Av>
                            ) : null}
                          </div>
                          <div className="col-span-7 md:col-span-5">
                            {!selectedAsset || !foundAsset ? (
                              <Input
                                {...field}
                                disabled
                                placeholder="Bitshares asset (1.3.x)"
                                className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1 mt-1"
                              />
                            ) : null}
                            {foundAsset ? (
                              <Input
                                {...field}
                                disabled
                                placeholder={`${foundAsset.symbol} (${foundAsset.id})`}
                                className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1 mt-1"
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
                              triggerVariant="outline"
                              triggerClassName="w-auto border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.5)]"
                            />
                          </div>
                        </div>
                        <FieldDescription className="text-muted-foreground text-xs">
                          {t("Transfer:assetToTransferDescription")}
                        </FieldDescription>
                        <FieldError className="text-[hsl(var(--accent-danger-fg))] text-xs">
                          {foundAsset &&
                          balances &&
                          !balances
                            .map((x) => x.asset_id)
                            .includes(foundAsset.id)
                            ? t("Transfer:noAssetInAccount", {
                                username: usr.username,
                              })
                            : null}
                        </FieldError>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <div className="border-t border-border/60 -mt-2 mb-2" />

                  {selectedAsset && targetUser ? (
                    <Controller
                      name="availableAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-foreground/70 text-xs uppercase tracking-wider">
                            {t("Transfer:amountAvailableToTransfer", {
                              asset: selectedAsset ?? "???",
                            })}
                          </FieldLabel>
                          <Input
                            {...field}
                            disabled
                            label={t("Transfer:amountAvailableToTransferLabel")}
                            value={
                              foundAsset &&
                              balances &&
                              balances.find((x) => x.asset_id === foundAsset.id)
                                ? `${humanReadableFloat(
                                    balances.find(
                                      (x) => x.asset_id === foundAsset.id
                                    ).amount,
                                    foundAsset.precision
                                  )} ${foundAsset.symbol}`
                                : "0"
                            }
                            className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1"
                          />
                          <FieldDescription className="text-muted-foreground text-xs">
                            {t("Transfer:maximumAmountDescription", {
                              asset: selectedAsset,
                            })}
                          </FieldDescription>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  ) : null}

                  {selectedAsset && targetUser ? (
                    <Controller
                      name="transferAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-foreground/70 text-xs uppercase tracking-wider">
                            {t("Transfer:amountToTransfer", {
                              asset: selectedAsset ?? "???",
                            })}
                          </FieldLabel>
                          <Input
                            {...field}
                            label={t("Transfer:amountToTransferLabel")}
                            value={transferAmount}
                            placeholder={transferAmount}
                            className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1 focus-visible:ring-[hsl(var(--accent-1)/0.5)]"
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = assetAmountRegex(foundAsset);
                              console.log({ foundAsset, regex });
                              if (regex.test(input)) {
                                setTransferAmount(input);
                                field.onChange(input);
                              }
                            }}
                          />
                          <FieldDescription className="text-muted-foreground text-xs">
                            {t("Transfer:amountToTransferDescription")}
                          </FieldDescription>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  ) : null}

                  {selectedAsset && targetUser ? (
                    <Controller
                      name="memoField"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-foreground/70 text-xs uppercase tracking-wider">
                            {t("Transfer:optionalMemo")}
                          </FieldLabel>
                          <Input
                            {...field}
                            label={t("Transfer:memoFieldLabel")}
                            value={memoContents}
                            placeholder={memoContents}
                            className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-1 focus-visible:ring-[hsl(var(--accent-1)/0.5)]"
                            onChange={(event) => {
                              const input = event.target.value;
                              setMemoContents(input);
                              field.onChange(input);
                            }}
                          />
                          <FieldDescription className="text-muted-foreground text-xs">
                            {t("Transfer:memoFieldDescription", {
                              targetUser: targetUser.name,
                            })}
                          </FieldDescription>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  ) : null}

                  {selectedAsset && targetUser ? (
                    <Controller
                      name="networkFee"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-foreground/70 text-xs uppercase tracking-wider">
                            {t("Transfer:networkFee")}
                          </FieldLabel>
                          <Input
                            {...field}
                            disabled
                            placeholder={`${t(
                              "Transfer:networkFeePlaceholder",
                              { fee: fee }
                            )}`}
                            className="bg-card/40 border-border text-foreground placeholder:text-muted-foreground/60 mb-3 mt-3"
                          />
                          {usr.id === usr.referrer ? (
                            <FieldError className="text-[hsl(var(--accent-success-fg))] text-xs">
                              {t("Transfer:rebate", {
                                rebate: trimPrice(fee * 0.8, 5),
                              })}
                            </FieldError>
                          ) : null}
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  ) : null}

                  <div className="border-t border-border/60 -mt-2 mb-2" />

                  {!transferAmount ? (
                    <Button
                      className="mt-5 mb-3 border-[hsl(var(--accent-1)/0.2)] text-[hsl(var(--accent-1-fg)/0.5)] cursor-default w-full sm:w-auto"
                      variant="outline"
                      disabled
                      type="submit"
                    >
                      <ArrowRight className="h-4 w-4 mr-1.5" />
                      {t("Transfer:submit")}
                    </Button>
                  ) : (
                    <>
                      {fee && (
                        <div className="mt-4 flex items-center justify-between px-1">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t("Transfer:networkFee")}
                          </span>
                          <span className="flex items-center gap-1.5 font-mono text-[hsl(var(--accent-1-fg))] text-sm">
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {fee.toFixed(5)} {usr.chain === "bitshares" ? "BTS" : "TEST"}
                          </span>
                        </div>
                      )}
                      <Button
                      className="mt-5 mb-3 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] text-foreground border-0 shadow-lg shadow-[color:hsl(var(--accent-1)/0.3)] hover:shadow-[color:hsl(var(--accent-1)/0.4)] transition-all w-full sm:w-auto"
                      type="submit"
                    >
                      <ArrowRight className="h-4 w-4 mr-1.5" />
                      {t("Transfer:submit")}
                      </Button>
                    </>
                  )}
                </FieldGroup>
              </form>
              {showDialog && bothUsers ? (
                <DeepLinkDialog
                  operationNames={["transfer"]}
                  username={usr.username}
                  usrChain={usr.chain}
                  userID={usr.id}
                  dismissCallback={setShowDialog}
                  key={`Sending${transferAmount}${selectedAsset}to${targetUser.name}from${usr.username}`}
                  headerText={t("Transfer:sendingHeader", {
                    amount: transferAmount,
                    symbol: foundAsset.symbol,
                    id: foundAsset.id,
                    target: targetUser.name,
                    user: usr.username,
                  })}
                  trxJSON={operationJSON}
                />
              ) : null}
            </div>
          </div>

      </div>
    </>
  );
}
