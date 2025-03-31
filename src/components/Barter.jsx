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
  PlusCircledIcon,
  MinusCircledIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from "@radix-ui/react-icons";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox"; // Using Checkbox instead of Switch for consistency
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createAssetFromSymbolStore } from "@/nanoeffects/Assets.ts";
import { blockchainFloat, humanReadableFloat } from "@/lib/common"; // Assuming blockchainFloat is available

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";
import AccountSearch from "./AccountSearch.jsx";
import AssetDropDownCard from "./Market/AssetDropDownCard.jsx"; // Re-using existing component
import { Avatar } from "./Avatar.tsx"; // Re-using existing component
import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar"; // Shadcn Avatar

const operationNumbers = {
  transfer: 0,
  proposal_create: 22,
};

// Helper to get balance for a specific asset
const getBalance = (balances, assetId, precision) => {
  if (!balances || !assetId) return 0;
  const balanceObj = balances.find((b) => b.asset_id === assetId);
  return balanceObj ? humanReadableFloat(balanceObj.amount, precision) : 0;
};

/**
 * Barter component for facilitating multi-asset trades between two users.
 */
export default function Barter(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const {
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
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

  // --- State ---
  const [toAccount, setToAccount] = useState(null); // Counterparty {id, name}
  const [fromAssets, setFromAssets] = useState([
    { id: 0, amount: 0, asset: null, memo: "" },
  ]); // Current user's offer [{id, amount, asset, memo}]
  const [toAssets, setToAssets] = useState([
    { id: 0, amount: 0, asset: null, memo: "" },
  ]); // Counterparty's offer [{id, amount, asset, memo}]

  const [showEscrow, setShowEscrow] = useState(false);
  const [escrowAccount, setEscrowAccount] = useState(null); // Escrow agent {id, name}
  const [sendToEscrowFirst, setSendToEscrowFirst] = useState(false); // Send own assets to escrow first?
  const [escrowPayment, setEscrowPayment] = useState(0);
  const [escrowMemo, setEscrowMemo] = useState("");

  const [fromBalances, setFromBalances] = useState(null);
  const [toBalances, setToBalances] = useState(null);

  const [fromAccountData, setFromAccountData] = useState(null);
  const [toAccountData, setToAccountData] = useState(null); // Needed for memo key

  const [showDialog, setShowDialog] = useState(false); // Deeplink dialog state
  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);
  const [escrowUserDialogOpen, setEscrowUserDialogOpen] = useState(false);

  const [feeAsset, setFeeAsset] = useState("1.3.0"); // Assuming one fee asset for simplicity initially

  // --- Fee Fetching ---
  const [proposalFee, setProposalFee] = useState(0);
  const [transferFee, setTransferFee] = useState(0);
  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  useEffect(() => {
    if (globalParams && globalParams.length) {
      const proposalFeeObj = globalParams.find((x) => x.id === 22); // proposal_create
      const transferFeeObj = globalParams.find((x) => x.id === 0); // transfer
      setProposalFee(
        proposalFeeObj ? humanReadableFloat(proposalFeeObj.data.fee, 5) : 0
      );
      setTransferFee(
        transferFeeObj ? humanReadableFloat(transferFeeObj.data.fee, 5) : 0
      );
    }
  }, [globalParams]);

  // --- Data Fetching ---
  // Fetch current user's balances and account data
  useEffect(() => {
    let balancesUnsubscribe;
    let accountUnsubscribe;
    if (usr && usr.id && currentNode && assets && assets.length) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode.url,
      ]);
      balancesUnsubscribe = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setFromBalances(filteredData);
          } else if (error) {
            console.error("Error fetching current user balances:", error);
          }
        }
      );

      const userAccountStore = createObjectStore([
        usr.chain,
        JSON.stringify([usr.id]),
        currentNode.url,
      ]);
      accountUnsubscribe = userAccountStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading && data[0]) {
            setFromAccountData(data[0]);
          } else if (error) {
            console.error("Error fetching current user account data:", error);
          }
        }
      );
    }
    return () => {
      if (balancesUnsubscribe) balancesUnsubscribe();
      if (accountUnsubscribe) accountUnsubscribe();
    };
  }, [usr, assets, currentNode]);

  // Fetch counterparty's balances and account data
  useEffect(() => {
    let balancesUnsubscribe;
    let accountUnsubscribe;
    if (toAccount && toAccount.id && currentNode && assets && assets.length) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        toAccount.id,
        currentNode.url,
      ]);
      balancesUnsubscribe = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setToBalances(filteredData);
          } else if (error) {
            console.error("Error fetching counterparty balances:", error);
          }
        }
      );

      const userAccountStore = createObjectStore([
        usr.chain,
        JSON.stringify([toAccount.id]),
        currentNode.url,
      ]);
      accountUnsubscribe = userAccountStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading && data[0]) {
            setToAccountData(data[0]);
          } else if (error) {
            console.error("Error fetching counterparty account data:", error);
          }
        }
      );
    } else {
      // Reset if toAccount changes or is removed
      setToBalances(null);
      setToAccountData(null);
    }
    return () => {
      if (balancesUnsubscribe) balancesUnsubscribe();
      if (accountUnsubscribe) accountUnsubscribe();
    };
  }, [toAccount, assets, currentNode]);

  // --- Asset Management ---
  const addAsset = (party) => {
    const newId = Date.now(); // Simple unique ID for list key
    const newItem = { id: newId, amount: 0, asset: null, memo: "" };
    if (party === "from") {
      setFromAssets([...fromAssets, newItem]);
    } else {
      setToAssets([...toAssets, newItem]);
    }
  };

  const removeAsset = (party, id) => {
    if (party === "from") {
      if (fromAssets.length > 1)
        setFromAssets(fromAssets.filter((item) => item.id !== id));
    } else {
      if (toAssets.length > 1)
        setToAssets(toAssets.filter((item) => item.id !== id));
    }
  };

  const updateAsset = (party, id, field, value) => {
    const setter = party === "from" ? setFromAssets : setToAssets;
    setter((prevAssets) =>
      prevAssets.map((item) => {
        if (item.id === id) {
          if (field === "amount") {
            const assetData = item.asset
              ? assets.find((a) => a.symbol === item.asset)
              : null;
            const precision = assetData ? assetData.precision : 8; // Default precision
            const regex = new RegExp(`^[0-9]*\\.?[0-9]{0,${precision}}$`);
            if (regex.test(value)) {
              let numericValue = parseFloat(value);
              if (isNaN(numericValue)) numericValue = 0;
              // Optional: Check against balance if needed here or later
              return { ...item, [field]: numericValue };
            }
            return item; // Invalid input, don't update
          } else if (field === "asset") {
            const selectedAssetData = assets.find((a) => a.symbol === value);
            return { ...item, [field]: value, amount: 0 }; // Reset amount when asset changes
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // --- Balance Checks ---
  const fromBalanceWarnings = useMemo(() => {
    if (!fromAssets || !fromBalances) return [];
    return fromAssets.filter((item) => {
      const assetData = assets.find((a) => a.symbol === item.asset);
      if (!assetData) return false;
      const balance = getBalance(
        fromBalances,
        assetData.id,
        assetData.precision
      );
      return item.amount > balance;
    });
  }, [fromAssets, fromBalances, assets]);

  const toBalanceWarnings = useMemo(() => {
    if (!toAssets || !toBalances) return [];
    return toAssets.filter((item) => {
      const assetData = assets.find((a) => a.symbol === item.asset);
      if (!assetData) return false;
      const balance = getBalance(toBalances, assetData.id, assetData.precision);
      return item.amount > balance;
    });
  }, [toAssets, toBalances, assets]);

  // --- Validation ---
  const isFromOfferValid = useMemo(
    () => fromAssets.every((item) => item.amount > 0 && item.asset),
    [fromAssets]
  );
  const isToOfferValid = useMemo(
    () => toAssets.every((item) => item.amount > 0 && item.asset),
    [toAssets]
  );
  const isEscrowValid = useMemo(
    () => !showEscrow || (escrowAccount && escrowAccount.id),
    [showEscrow, escrowAccount]
  );
  const areBalancesSufficient = useMemo(
    () => fromBalanceWarnings.length === 0 && toBalanceWarnings.length === 0,
    [fromBalanceWarnings, toBalanceWarnings]
  );

  const canSubmit = useMemo(
    () =>
      usr &&
      usr.id &&
      toAccount &&
      toAccount.id &&
      usr.id !== toAccount.id &&
      isFromOfferValid &&
      isToOfferValid &&
      isEscrowValid &&
      (!showEscrow || escrowAccount.id !== usr.id) && // Escrow can't be sender
      (!showEscrow || escrowAccount.id !== toAccount.id) && // Escrow can't be receiver
      areBalancesSufficient, // Ensure balances are sufficient
    [
      usr,
      toAccount,
      isFromOfferValid,
      isToOfferValid,
      isEscrowValid,
      escrowAccount,
      areBalancesSufficient,
    ]
  );

  // --- Transaction Construction ---
  const proposalOperations = useMemo(() => {
    if (!canSubmit || !fromAccountData || !toAccountData) return [];

    let ops = [];
    const fromMemoKey = fromAccountData.options?.memo_key;
    const toMemoKey = toAccountData.options?.memo_key;
    const escrowMemoKey = escrowAccount
      ? escrowAccount.options?.memo_key
      : null;

    // Helper to create memo object
    const createMemo = (senderKey, receiverKey, message) => {
      if (!message || !senderKey || !receiverKey) return null;
      try {
        return {
          from: senderKey,
          to: receiverKey,
          nonce: String(Date.now() + Math.floor(Math.random() * 1000)), // More unique nonce
          message: message, // Wallet should handle encryption
        };
      } catch (e) {
        console.error("Memo creation error:", e);
        return null;
      }
    };

    // 1. Handle Escrow Payment (if applicable)
    if (
      showEscrow &&
      escrowPayment > 0 &&
      escrowAccount &&
      fromMemoKey &&
      escrowMemoKey
    ) {
      const coreAsset = assets.find((a) => a.id === "1.3.0"); // Assuming core asset for escrow fee
      if (coreAsset) {
        ops.push([
          operationNumbers.transfer,
          {
            fee: { amount: 0, asset_id: feeAsset },
            from: usr.id,
            to: escrowAccount.id,
            amount: {
              amount: blockchainFloat(escrowPayment, coreAsset.precision),
              asset_id: "1.3.0",
            },
            memo: createMemo(fromMemoKey, escrowMemoKey, escrowMemo),
            extensions: [],
          },
        ]);
      }
    }

    // 2. Handle "From" user's asset transfers
    fromAssets.forEach((item) => {
      const assetData = assets.find((a) => a.symbol === item.asset);
      if (!assetData) return;

      const to =
        showEscrow && sendToEscrowFirst ? escrowAccount.id : toAccount.id;
      const receiverMemoKey =
        showEscrow && sendToEscrowFirst ? escrowMemoKey : toMemoKey;

      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: feeAsset },
          from: usr.id,
          to: to,
          amount: {
            amount: blockchainFloat(item.amount, assetData.precision),
            asset_id: assetData.id,
          },
          memo: createMemo(fromMemoKey, receiverMemoKey, item.memo),
          extensions: [],
        },
      ]);
    });

    // 3. Handle "To" user's asset transfers
    toAssets.forEach((item) => {
      const assetData = assets.find((a) => a.symbol === item.asset);
      if (!assetData) return;

      const from = toAccount.id;
      const receiver =
        showEscrow && !sendToEscrowFirst ? escrowAccount.id : usr.id;
      const receiverMemoKey =
        showEscrow && !sendToEscrowFirst ? escrowMemoKey : fromMemoKey;

      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: feeAsset },
          from: from,
          to: receiver,
          amount: {
            amount: blockchainFloat(item.amount, assetData.precision),
            asset_id: assetData.id,
          },
          memo: createMemo(toMemoKey, receiverMemoKey, item.memo),
          extensions: [],
        },
      ]);
    });

    // 4. Handle escrow release (if escrow used and assets sent directly to other party)
    if (showEscrow && !sendToEscrowFirst && escrowAccount && fromMemoKey) {
      // This part might need refinement. The original code has a 1 satoshi transfer.
      // A proposal requires operations. Maybe this is intended to be signed by escrow later?
      // For now, let's create a placeholder transfer or a comment indicating escrow needs separate action.
      // Creating a proposal that needs escrow signature later:
      ops.push([
        operationNumbers.transfer,
        {
          // Placeholder/Indicator: Escrow needs to release their hold later
          fee: { amount: 0, asset_id: feeAsset },
          from: escrowAccount.id,
          to: usr.id, // Or the appropriate final recipient based on the full logic
          amount: { amount: 1, asset_id: "1.3.0" }, // Minimal transfer as indicator?
          memo: createMemo(
            escrowMemoKey,
            fromMemoKey,
            "Escrow release placeholder"
          ),
          extensions: [],
        },
      ]);
    }

    // Wrap in proposal_create
    const proposalExpiration = new Date();
    proposalExpiration.setDate(proposalExpiration.getDate() + 7); // Default 7 day expiry for proposal

    return [
      {
        fee: { amount: 0, asset_id: "1.3.0" },
        fee_paying_account: usr.id, // Current user pays proposal fee
        expiration_time: proposalExpiration.toISOString().slice(0, 19),
        proposed_ops: ops.map((op) => ({ op: op })),
        review_period_seconds: 3600, // Optional: 1 hour review period
        extensions: [],
      },
    ];
  }, [
    canSubmit,
    usr,
    toAccount,
    fromAssets,
    toAssets,
    showEscrow,
    sendToEscrowFirst,
    escrowAccount,
    escrowPayment,
    escrowMemo,
    assets,
    feeAsset,
    fromAccountData,
    toAccountData,
  ]);

  // --- Render ---
  const renderAssetItem = (party, item) => {
    const assetData = assets.find((a) => a.symbol === item.asset);
    const balances = party === "from" ? fromBalances : toBalances;
    const balance = assetData
      ? getBalance(balances, assetData.id, assetData.precision)
      : 0;
    const balanceWarning = assetData && item.amount > balance;

    return (
      <div
        key={item.id}
        className="space-y-2 border p-3 rounded-md mb-3 relative"
      >
        {(party === "from" && fromAssets.length > 1) ||
        (party === "to" && toAssets.length > 1) ? (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={() => removeAsset(party, item.id)}
          >
            <MinusCircledIcon className="h-4 w-4" />
          </Button>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Asset Selection */}
          <div className="space-y-1">
            <Label>{t("Barter:asset")}</Label>
            <AssetDropDownCard
              assetSymbol={item.asset ?? ""}
              assetData={assetData}
              storeCallback={(symbol) =>
                updateAsset(party, item.id, "asset", symbol)
              }
              otherAsset={null} // No restrictions based on other side in simple barter
              marketSearch={marketSearch}
              type={null}
              chain={_chain}
              balances={balances}
            />
            {assetData ? (
              <p className="text-xs text-muted-foreground">
                {t("Barter:balance", { balance: balance, symbol: item.asset })}
              </p>
            ) : null}
          </div>
          {/* Amount Input */}
          <div className="space-y-1">
            <Label htmlFor={`amount-${party}-${item.id}`}>
              {t("Barter:amount")}
            </Label>
            <Input
              id={`amount-${party}-${item.id}`}
              type="number"
              value={item.amount}
              min="0"
              step={
                assetData
                  ? humanReadableFloat(1, assetData.precision)
                  : "0.00001"
              }
              onChange={(e) =>
                updateAsset(party, item.id, "amount", e.target.value)
              }
              disabled={!item.asset}
              className={balanceWarning ? "border-red-500" : ""}
            />
            {balanceWarning ? (
              <p className="text-xs text-red-500">
                {t("Barter:insufficientBalance")}
              </p>
            ) : null}
          </div>
        </div>
        {/* Memo Input */}
        <div className="space-y-1">
          <Label htmlFor={`memo-${party}-${item.id}`}>
            {t("Barter:memoOptional")}
          </Label>
          <Input
            id={`memo-${party}-${item.id}`}
            type="text"
            placeholder={t("Barter:memoPlaceholder")}
            value={item.memo}
            onChange={(e) =>
              updateAsset(party, item.id, "memo", e.target.value)
            }
            maxLength={64} // Example limit
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("Barter:title")}</CardTitle>
            <CardDescription>{t("Barter:description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Counterparty Selection */}
            <div className="space-y-2">
              <Label>{t("Barter:counterparty")}</Label>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {toAccount ? (
                    <Avatar
                      size={40}
                      name={toAccount.name}
                      extra="BarterTo"
                      expression={{ eye: "normal", mouth: "open" }}
                      colors={[
                        "#146A7C",
                        "#F0AB3D",
                        "#C271B4",
                        "#C20D90",
                        "#92A1C6",
                      ]}
                    />
                  ) : (
                    <Av>
                      <AvatarFallback>?</AvatarFallback>
                    </Av>
                  )}
                </div>
                <Input
                  disabled
                  placeholder={t("Barter:recipientPlaceholder")}
                  value={toAccount ? `${toAccount.name} (${toAccount.id})` : ""}
                  className="flex-grow"
                  readOnly
                />
                <Dialog
                  open={targetUserDialogOpen}
                  onOpenChange={setTargetUserDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      {toAccount
                        ? t("Barter:changeRecipient")
                        : t("Barter:selectRecipient")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[375px] bg-white">
                    <DialogHeader>
                      <DialogTitle>
                        {t("Transfer:bitsharesAccountSearch")}
                      </DialogTitle>
                      <DialogDescription>
                        {t("Transfer:searchingForAccount")}
                      </DialogDescription>
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
            </div>

            <Separator />

            {/* Barter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-start">
              {/* User A Offer */}
              <div className="md:col-span-5 space-y-3">
                <h3 className="text-lg font-semibold">
                  {t("Barter:yourOffer")} ({usr?.username})
                </h3>
                <ScrollArea className="h-[300px] pr-3">
                  {fromAssets.map((item) => renderAssetItem("from", item))}
                </ScrollArea>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addAsset("from")}
                >
                  <PlusCircledIcon className="mr-2 h-4 w-4" />{" "}
                  {t("Barter:addAsset")}
                </Button>
                {fromBalanceWarnings.length > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertTitle>{t("Barter:balanceWarningTitle")}</AlertTitle>
                    <AlertDescription>
                      {t("Barter:yourBalanceWarning")}
                      <ul>
                        {fromBalanceWarnings.map((w) => (
                          <li key={w.asset}>
                            - {w.amount} {w.asset}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Swap Icon */}
              <div className="flex items-center justify-center md:col-span-1 md:mt-16">
                <ArrowRightIcon className="h-6 w-6 text-muted-foreground hidden md:block" />
                <ArrowLeftIcon className="h-6 w-6 text-muted-foreground hidden md:block" />
                {/* Add arrows for mobile view if needed */}
              </div>

              {/* User B Offer */}
              <div className="md:col-span-5 space-y-3">
                <h3 className="text-lg font-semibold">
                  {t("Barter:theirOffer")} ({toAccount?.name || "..."})
                </h3>
                <ScrollArea className="h-[300px] pr-3">
                  {toAssets.map((item) => renderAssetItem("to", item))}
                </ScrollArea>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addAsset("to")}
                >
                  <PlusCircledIcon className="mr-2 h-4 w-4" />{" "}
                  {t("Barter:addAsset")}
                </Button>
                {toBalanceWarnings.length > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertTitle>{t("Barter:balanceWarningTitle")}</AlertTitle>
                    <AlertDescription>
                      {t("Barter:theirBalanceWarning", {
                        name: toAccount?.name || "Counterparty",
                      })}
                      <ul>
                        {toBalanceWarnings.map((w) => (
                          <li key={w.asset}>
                            - {w.amount} {w.asset}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <Separator />

            {/* Escrow Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="escrow-checkbox"
                    checked={showEscrow}
                    onCheckedChange={setShowEscrow}
                  />
                  <Label htmlFor="escrow-checkbox" className="text-base">
                    {t("Barter:useEscrow")}
                  </Label>
                  <HoverInfo content={t("Barter:escrowInfo")} />
                </div>
              </div>

              {showEscrow && (
                <Card className="p-4 space-y-4">
                  {/* Escrow Agent Selection */}
                  <div className="space-y-2">
                    <Label>{t("Barter:escrowAgent")}</Label>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {escrowAccount ? (
                          <Avatar
                            size={40}
                            name={escrowAccount.name}
                            extra="Escrow"
                            expression={{
                              eye: "suspicious",
                              mouth: "concerned",
                            }}
                            colors={[
                              "#F0AB3D",
                              "#C271B4",
                              "#C20D90",
                              "#92A1C6",
                              "#146A7C",
                            ]}
                          />
                        ) : (
                          <Av>
                            <AvatarFallback>?</AvatarFallback>
                          </Av>
                        )}
                      </div>
                      <Input
                        disabled
                        placeholder={t("Barter:escrowAgentPlaceholder")}
                        value={
                          escrowAccount
                            ? `${escrowAccount.name} (${escrowAccount.id})`
                            : ""
                        }
                        className="flex-grow"
                        readOnly
                      />
                      <Dialog
                        open={escrowUserDialogOpen}
                        onOpenChange={setEscrowUserDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            {escrowAccount
                              ? t("Barter:changeAgent")
                              : t("Barter:selectAgent")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[375px] bg-white">
                          <DialogHeader>
                            <DialogTitle>
                              {t("Transfer:bitsharesAccountSearch")}
                            </DialogTitle>
                            <DialogDescription>
                              {t("Transfer:searchingForAccount")}
                            </DialogDescription>
                          </DialogHeader>
                          <AccountSearch
                            chain={_chain}
                            excludedUsers={
                              usr && toAccount
                                ? [usr, toAccount]
                                : usr
                                ? [usr]
                                : []
                            }
                            setChosenAccount={(acc) => {
                              setEscrowAccount(acc);
                              setEscrowUserDialogOpen(false);
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Escrow Options */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="send-to-escrow-first"
                        checked={sendToEscrowFirst}
                        onCheckedChange={setSendToEscrowFirst}
                      />
                      <Label htmlFor="send-to-escrow-first">
                        {t("Barter:sendToEscrowFirst")}
                      </Label>
                      <HoverInfo content={t("Barter:sendToEscrowFirstInfo")} />
                    </div>
                  </div>

                  {/* Escrow Payment */}
                  <div className="space-y-2">
                    <Label htmlFor="escrow-payment">
                      {t("Barter:escrowPayment")}
                    </Label>
                    <HoverInfo content={t("Barter:escrowPaymentInfo")} />
                    <Input
                      id="escrow-payment"
                      type="number"
                      value={escrowPayment}
                      min="0"
                      step="0.00001" // Assuming core asset precision
                      onChange={(e) =>
                        setEscrowPayment(parseFloat(e.target.value) || 0)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      ({_chain === "bitshares" ? "BTS" : "TEST"})
                    </p>
                  </div>

                  {/* Escrow Memo */}
                  <div className="space-y-1">
                    <Label htmlFor={`memo-escrow`}>
                      {t("Barter:escrowMemoOptional")}
                    </Label>
                    <Input
                      id={`memo-escrow`}
                      type="text"
                      placeholder={t("Barter:escrowMemoPlaceholder")}
                      value={escrowMemo}
                      onChange={(e) => setEscrowMemo(e.target.value)}
                      maxLength={64}
                    />
                  </div>
                </Card>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start space-y-3">
            <Separator />
            <p className="text-sm text-muted-foreground">
              {t("Barter:finalSummary")}
            </p>
            <Button type="submit" disabled={!canSubmit}>
              {t("Barter:proposeTrade")}
            </Button>
            {!canSubmit && (
              <Alert variant="destructive" className="mt-2 w-full">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>{t("Barter:cannotProposeTitle")}</AlertTitle>
                <AlertDescription>
                  {!usr || !usr.id ? t("Barter:errorNoUser") : null}
                  {usr && usr.id && (!toAccount || !toAccount.id)
                    ? t("Barter:errorNoCounterparty")
                    : null}
                  {usr && usr.id && toAccount && usr.id === toAccount.id
                    ? t("Barter:errorSameAccount")
                    : null}
                  {!isFromOfferValid ? t("Barter:errorInvalidYourOffer") : null}
                  {!isToOfferValid ? t("Barter:errorInvalidTheirOffer") : null}
                  {!isEscrowValid ? t("Barter:errorInvalidEscrow") : null}
                  {showEscrow && escrowAccount && escrowAccount.id === usr.id
                    ? t("Barter:errorEscrowIsYou")
                    : null}
                  {showEscrow &&
                  escrowAccount &&
                  toAccount &&
                  escrowAccount.id === toAccount.id
                    ? t("Barter:errorEscrowIsCounterparty")
                    : null}
                  {!areBalancesSufficient && isFromOfferValid && isToOfferValid
                    ? t("Barter:errorInsufficientBalance")
                    : null}
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Deeplink Dialog */}
      {showDialog && canSubmit && usr && proposalOperations ? (
        <DeepLinkDialog
          operationNames={["proposal_create"]} // Wrap transfers in a proposal
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={() => {
            setShowDialog(false);
            // Optionally reset form state here
          }}
          key={`Barter_${usr.id}_${toAccount?.id || ""}`}
          headerText={t("Barter:deeplinkHeader", {
            from: usr.username,
            to: toAccount?.name,
          })}
          trxJSON={proposalOperations}
        />
      ) : null}
    </>
  );
}
