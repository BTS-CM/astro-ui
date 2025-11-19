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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  AvatarImage,
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
      <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:1/2">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("Transfer:transferAssets")}</CardTitle>
              <CardDescription>
                <p>{t("Transfer:sendFundsDescription")}</p>
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                        <FieldLabel>{t("Transfer:sendingAccount")}</FieldLabel>
                        <div className="grid grid-cols-8 gap-2">
                          <div className="col-span-1 ml-5">
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
                              className="mb-1 mt-1"
                              value={`${
                                usr && usr.username ? usr.username : "?"
                              } (${usr && usr.id ? usr.id : "?"})`}
                            />
                          </div>
                        </div>
                        <FieldDescription>
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
                        <FieldLabel>{t("Transfer:targetAccount")}</FieldLabel>
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
                              {...field}
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
                        <FieldDescription>
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
                        <FieldLabel>{t("Transfer:assetToTransfer")}</FieldLabel>
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
                                    {foundAsset.bitasset_data_id
                                      ? "MPA"
                                      : "UIA"}
                                  </div>
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
                                className="mb-1 mt-1"
                              />
                            ) : null}
                            {foundAsset ? (
                              <Input
                                {...field}
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
                        <FieldDescription>
                          {t("Transfer:assetToTransferDescription")}
                        </FieldDescription>
                        <FieldError>
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

                  {selectedAsset && targetUser ? (
                    <Controller
                      name="availableAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>
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
                            className="mb-1"
                          />
                          <FieldDescription>
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
                          <FieldLabel>
                            {t("Transfer:amountToTransfer", {
                              asset: selectedAsset ?? "???",
                            })}
                          </FieldLabel>
                          <Input
                            {...field}
                            label={t("Transfer:amountToTransferLabel")}
                            value={transferAmount}
                            placeholder={transferAmount}
                            className="mb-1"
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
                          <FieldDescription>
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
                          <FieldLabel>{t("Transfer:optionalMemo")}</FieldLabel>
                          <Input
                            {...field}
                            label={t("Transfer:memoFieldLabel")}
                            value={memoContents}
                            placeholder={memoContents}
                            className="mb-1"
                            onChange={(event) => {
                              const input = event.target.value;
                              setMemoContents(input);
                              field.onChange(input);
                            }}
                          />
                          <FieldDescription>
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
                          <FieldLabel>{t("Transfer:networkFee")}</FieldLabel>
                          <Input
                            {...field}
                            disabled
                            placeholder={`${t(
                              "Transfer:networkFeePlaceholder",
                              { fee: fee }
                            )}`}
                            className="mb-3 mt-3"
                          />
                          {usr.id === usr.referrer ? (
                            <FieldError>
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

                  {!transferAmount ? (
                    <Button
                      className="mt-5 mb-3"
                      variant="outline"
                      disabled
                      type="submit"
                    >
                      {t("Transfer:submit")}
                    </Button>
                  ) : (
                    <Button
                      className="mt-5 mb-3"
                      variant="outline"
                      type="submit"
                    >
                      {t("Transfer:submit")}
                    </Button>
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
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 mt-5 gap-5">
          {targetUser && targetUser.name ? (
            <div className="col-span-1">
              <Card>
                <CardHeader className="pb-0 mb-0">
                  <CardTitle>{t("Transfer:doubleCheckTitle")}</CardTitle>
                  <CardDescription>
                    {t("Transfer:doubleCheckDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Transfer:doubleCheckFormInputs")}</li>
                    <li>{t("Transfer:validateBeetPrompt")}</li>
                    <li>
                      <ExternalLink
                        type="text"
                        classnamecontents=""
                        hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                          targetUser.name
                        }${
                          usr.chain === "bitshares" ? "" : "?network=testnet"
                        }`}
                        text={t("Transfer:bitsharesLink", {
                          name: targetUser.name,
                        })}
                      />
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : null}
          {targetUser && targetUser.name ? (
            <div className="col-span-1">
              <Card>
                <CardHeader className="pb-0 mb-0">
                  <CardTitle>{t("Transfer:scamAlertTitle")}</CardTitle>
                  <CardDescription>
                    {t("Transfer:scamAlertDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("Transfer:scamAlertPoint1")}</li>
                    <li>{t("Transfer:scamAlertPoint2")}</li>
                    <li>{t("Transfer:scamAlertPoint3")}</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
