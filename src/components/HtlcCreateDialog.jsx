import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from "@noble/hashes/ripemd160";
import { bytesToHex as toHex } from '@noble/hashes/utils';
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

import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { $currentNode } from "@/stores/node.ts";
import { humanReadableFloat, blockchainFloat } from "@/lib/common";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { Avatar } from "./Avatar.tsx";
import AccountSearch from "./AccountSearch.jsx";
import AssetDropDownCard from "./Market/AssetDropDownCard.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

// Common claim periods in seconds
const claimPeriods = {
  "1hour": 3600,
  "12hours": 43200,
  "1day": 86400,
  "7days": 604800,
  "30days": 2592000,
};

// Utility function to calculate hash
const calculateHash = (cipher, preimage) => {
  let preimageHash = null;
  switch (cipher) {
    case "sha256":
      preimageHash = toHex(sha256(new TextEncoder().encode(preimage)));
      break;
    case "ripemd160":
      preimageHash = toHex(ripemd160(new TextEncoder().encode(preimage)));
      break;
    default:
      throw new Error("Unsupported cipher. Use 'sha256' or 'ripemd160'.");
  }
  return preimageHash;
};

// Utility function to get cipher integer
const getCipherInt = (cipher) => {
  switch (cipher) {
    case "sha256":
      return 2;
    case "ripemd160":
      return 0;
    default:
      throw new Error("Unsupported cipher. Use 'sha256' or 'ripemd160'.");
  }
};

export default function HtlcCreateDialog(properties) {
  const {
    usr,
    assets,
    marketSearch,
    globalParams,
    showDialog,
    setShowDialog,
  } = properties;

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm();
  const currentNode = useStore($currentNode);

  const [toAccount, setToAccount] = useState(null);
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState(null);
  const [amount, setAmount] = useState(0);
  const [preimage, setPreimage] = useState("");
  const [claimPeriodSeconds, setClaimPeriodSeconds] = useState(claimPeriods["1day"]);
  const [hashingAlgorithm, setHashingAlgorithm] = useState("sha256"); // Default to sha256

  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);
  const [showDeeplinkDialog, setShowDeeplinkDialog] = useState(false);

  const _chain = usr?.chain ?? "bitshares";

  // Fee calculation
  const fee = useMemo(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 49); // Operation ID for htlc_create
      return foundFee ? humanReadableFloat(foundFee.data.fee, 5) : 0;
    }
    return 0;
  }, [globalParams]);

  // Balances
  const [balances, setBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;
    if (usr && usr.id && currentNode && assets && assets.length) {
      const userBalancesStore = createUserBalancesStore([_chain, usr.id, currentNode.url]);
      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = data.filter((balance) =>
            assets.find((x) => x.id === balance.asset_id)
          );
          setBalances(filteredData);
        }
      });
    }
    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assets, currentNode, _chain]); // Added _chain

  // Asset details
  const foundAsset = useMemo(() => {
    if (selectedAssetSymbol && assets) {
      return assets.find((asset) => asset.symbol === selectedAssetSymbol);
    }
    return null;
  }, [selectedAssetSymbol, assets]);

  // Asset balance
  const foundAssetBalance = useMemo(() => {
    if (foundAsset && balances) {
      const balanceInfo = balances.find((b) => b.asset_id === foundAsset.id);
      return balanceInfo ? humanReadableFloat(balanceInfo.amount, foundAsset.precision) : 0;
    }
    return 0;
  }, [foundAsset, balances]);

  // Preimage hash & size
  const { preimageHash, preimageSize, preimageHashCipher } = useMemo(() => {
    if (!preimage) return { preimageHash: null, preimageSize: 0, preimageHashCipher: null };
    try {
      const _preimage = calculateHash(hashingAlgorithm, preimage);
      const finalHash = calculateHash(hashingAlgorithm, _preimage);
      const cipherInt = getCipherInt(hashingAlgorithm);

      return {
        preimageHash: finalHash,
        preimageSize: _preimage.length,
        preimageHashCipher: cipherInt,
      };
    } catch (error) {
      console.error("Hashing error:", error);
      return { preimageHash: null, preimageSize: 0, preimageHashCipher: null };
    }
  }, [preimage, hashingAlgorithm]);

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      usr?.id &&
      toAccount?.id &&
      foundAsset &&
      amount > 0 &&
      preimage.length > 0 &&
      preimageHash &&
      preimageHash !== "Error hashing" &&
      preimageSize > 0 &&
      claimPeriodSeconds >= 60 &&
      foundAssetBalance >= amount
    );
  }, [
    usr,
    toAccount,
    foundAsset,
    amount,
    preimage,
    preimageHash,
    preimageSize,
    claimPeriodSeconds,
    foundAssetBalance,
  ]);

  // Transaction JSON
  const trxJSON = useMemo(() => {
    if (!isFormValid) return null;

    return [
      {
        from: usr.id,
        to: toAccount.id,
        amount: {
          amount: blockchainFloat(amount, foundAsset.precision),
          asset_id: foundAsset.id,
        },
        preimage_hash: [preimageHashCipher, preimageHash], // Include cipher type
        preimage_size: preimageSize,
        claim_period_seconds: parseInt(claimPeriodSeconds, 10),
        extensions: {},
      },
    ];
  }, [isFormValid, usr, toAccount, amount, foundAsset, preimageHash, preimageHashCipher, preimageSize, claimPeriodSeconds]);


  const onSubmit = () => {
    if (isFormValid) {
      setShowDeeplinkDialog(true);
    } else {
      console.error("Form is invalid.");
    }
  };

  return (
    <>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-[720px] bg-white">
            <DialogHeader>
              <DialogTitle>{t("HTLCCreate:dialogTitle")}</DialogTitle>
              <DialogDescription>{t("HTLCCreate:dialogDesc")}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  onSubmit();
                  e.preventDefault();
                }}
                className="space-y-4"
              >
                  <FormField
                      control={form.control}
                      name="toAccount"
                      render={() => (
                          <FormItem>
                            <FormLabel>{t("HTLCCreate:toAccountLabel")}</FormLabel>
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {toAccount ? (
                                  <Avatar
                                      size={40}
                                      name={toAccount.name}
                                      extra="RecipientCreate"
                                      expression={{ eye: "normal", mouth: "open" }}
                                      colors={["#146A7C", "#F0AB3D", "#C271B4", "#C20D90", "#92A1C6"]}
                                  />
                                ) : (
                                  <Av><AvatarFallback>?</AvatarFallback></Av>
                                )}
                              </div>
                              <Input
                                disabled
                                placeholder={t("HTLCCreate:recipientPlaceholder")}
                                value={toAccount ? `${toAccount.name} (${toAccount.id})` : ""}
                                className="flex-grow"
                                readOnly
                              />
                              <Dialog open={targetUserDialogOpen} onOpenChange={setTargetUserDialogOpen}>
                                  <DialogTrigger asChild>
                                      <Button variant="outline">
                                          {toAccount ? t("HTLCCreate:changeRecipient") : t("HTLCCreate:selectRecipient")}
                                      </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[375px] bg-white">
                                      <DialogHeader>
                                          <DialogTitle>{t("Transfer:bitsharesAccountSearch")}</DialogTitle>
                                          <DialogDescription>{t("Transfer:searchingForAccount")}</DialogDescription>
                                      </DialogHeader>
                                      <AccountSearch
                                          chain={_chain}
                                          excludedUsers={usr ? [usr] : []}
                                          setChosenAccount={(acc) => {
                                              setToAccount(acc);
                                              setTargetUserDialogOpen(false);
                                          }}
                                      />
                                  </DialogContent>
                              </Dialog>
                            </div>
                            <FormDescription>{t("HTLCCreate:toAccountDesc")}</FormDescription>
                          </FormItem>
                      )}
                  />

                  <FormField
                      control={form.control}
                      name="asset"
                      render={() => (
                        <FormItem>
                          <FormLabel>{t("HTLCCreate:assetLabel")}</FormLabel>
                          <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {foundAsset ? (
                                  <Av>
                                      <AvatarFallback>
                                          <div className="text-sm">{foundAsset.bitasset_data_id ? "MPA" : "UIA"}</div>
                                      </AvatarFallback>
                                  </Av>
                                ) : (
                                  <Av><AvatarFallback>?</AvatarFallback></Av>
                                )}
                              </div>
                              <Input
                                  disabled
                                  placeholder={t("HTLCCreate:assetPlaceholder")}
                                  value={foundAsset ? `${foundAsset.symbol} (${foundAsset.id})` : ""}
                                  className="flex-grow"
                                  readOnly
                              />
                              <AssetDropDownCard
                                  assetSymbol={selectedAssetSymbol ?? ""}
                                  assetData={foundAsset}
                                  storeCallback={setSelectedAssetSymbol}
                                  otherAsset={null}
                                  marketSearch={marketSearch}
                                  type={"sell"}
                                  chain={_chain}
                                  balances={balances}
                              />
                          </div>
                          <FormDescription>{t("HTLCCreate:assetDesc")}</FormDescription>
                        </FormItem>
                      )}
                  />

                  {foundAsset ? (
                      <FormField
                          control={form.control}
                          name="amount"
                          render={() => (
                          <FormItem>
                              <FormLabel>{t("HTLCCreate:amountLabel", { symbol: foundAsset.symbol })}</FormLabel>
                              <div className="flex items-center space-x-3">
                                  <Input
                                      type="number"
                                      placeholder="0.0"
                                      value={amount}
                                      min={humanReadableFloat(1, foundAsset.precision)}
                                      step={humanReadableFloat(1, foundAsset.precision)}
                                      onChange={(e) => {
                                          const val = e.target.value;
                                          if (/^\d*\.?\d*$/.test(val)) {
                                              const parts = val.split('.');
                                              if (parts[1] && parts[1].length > foundAsset.precision) {
                                                  setAmount(parseFloat(val).toFixed(foundAsset.precision));
                                              } else {
                                                  setAmount(val);
                                              }
                                          }
                                      }}
                                      className="flex-grow"
                                  />
                                  <Button
                                      variant="outline"
                                      onClick={(e) => {
                                          e.preventDefault();
                                          setAmount(foundAssetBalance);
                                      }}
                                  >
                                      {t("HTLCCreate:useBalance", { balance: foundAssetBalance })}
                                  </Button>
                              </div>
                              {amount > foundAssetBalance ? (
                                  <FormMessage>{t("HTLCCreate:insufficientBalance")}</FormMessage>
                              ) : null}
                              <FormDescription>{t("HTLCCreate:amountDesc")}</FormDescription>
                          </FormItem>
                          )}
                      />
                  ) : null}

                  {/* Preimage Input */}
                  <FormField
                    control={form.control}
                    name="preimage"
                    render={() => (
                      <FormItem>
                        <FormLabel>{t("HTLCCreate:preimageLabel")}</FormLabel>
                        <Textarea
                            placeholder={t("HTLCCreate:preimagePlaceholder")}
                            value={preimage}
                            onChange={(e) => setPreimage(e.target.value)}
                        />
                        <FormDescription>{t("HTLCCreate:preimageDesc")}</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hashingAlgorithm"
                    render={() => (
                      <FormItem>
                        <FormLabel>{t("HTLCCreate:algorithm")}</FormLabel>
                        <select
                          value={hashingAlgorithm}
                          onChange={(e) => setHashingAlgorithm(e.target.value)}
                          className="form-select mt-1 block w-full border border-gray-300 rounded"
                        >
                          <option value="sha256">SHA-256</option>
                          <option value="ripemd160">RIPEMD-160</option>
                        </select>
                        <FormDescription>{t("HTLCCreate:algorithmDesc")}</FormDescription>
                      </FormItem>
                    )}
                  />

                  {/* Display Preimage Hash & Size */}
                  {preimage && (
                    <div className="space-y-2 text-sm p-3 border rounded-md">
                      <div className="flex justify-between items-center">
                          <span className="font-medium">{t("HTLCCreate:preimageHashLabel")}</span>
                          <code className="text-muted-foreground break-all text-xs bg-gray-100 p-1 rounded">{preimageHash || "..."}</code>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="font-medium">{t("HTLCCreate:preimageSizeLabel")}</span>
                          <span className="text-muted-foreground">{preimageSize} bytes</span>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="claimPeriod"
                    render={() => (
                      <FormItem>
                        <FormLabel>{t("HTLCCreate:claimPeriodLabel")}</FormLabel>
                        <Input
                          type="number"
                          placeholder="e.g., 86400 for 1 day"
                          value={claimPeriodSeconds}
                          min="60" // Minimum 1 minute
                          step="1"
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 60) {
                                setClaimPeriodSeconds(val);
                            } else if (!isNaN(val) && val < 60) {
                                setClaimPeriodSeconds(60); // Enforce minimum
                            }
                          }}
                        />
                        <FormDescription>{t("HTLCCreate:claimPeriodDesc")}</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="networkFee"
                    render={() => (
                      <FormItem>
                        <FormLabel>{t("HTLCCreate:feeLabel")}</FormLabel>
                        <Input disabled value={`${fee} ${usr.chain === "bitshares" ? "BTS" : "TEST"}`} readOnly />
                        <FormDescription>{t("HTLCCreate:feeDesc")}</FormDescription>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={!isFormValid || showDeeplinkDialog}>
                    {t("HTLCCreate:submitButton")}
                  </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Deeplink Dialog */}
        {showDeeplinkDialog && trxJSON ? (
            <DeepLinkDialog
                operationNames={["htlc_create"]}
                username={usr.username}
                usrChain={_chain}
                userID={usr.id}
                dismissCallback={setShowDeeplinkDialog}
                headerText={t("HTLCCreate:deeplinkHeader", {
                    amount: amount,
                    symbol: foundAsset?.symbol ?? "?",
                    recipient: toAccount?.name ?? "?"
                })}
                trxJSON={trxJSON}
            />
        ) : null}
    </>
  );
}