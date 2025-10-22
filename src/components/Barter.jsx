import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";
import { MinusCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox"; // Using Checkbox instead of Switch for consistency

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { blockchainFloat, humanReadableFloat } from "@/lib/common"; // Assuming blockchainFloat is available

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";
import AccountSearch from "./AccountSearch.jsx";
import BalanceAssetDropDownCard from "./Market/BalanceAssetDropDownCard.jsx"; // Re-using existing component
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

  /*
  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);
  */
  // --- State ---
  const [toAccount, setToAccount] = useState(null); // Counterparty {id, name}
  const [fromAssets, setFromAssets] = useState({}); // Current user's offer [{id, amount, asset, memo}]
  const [toAssets, setToAssets] = useState({}); // Counterparty's offer [{id, amount, asset, memo}]

  const [showEscrow, setShowEscrow] = useState(false);
  const [escrowAccount, setEscrowAccount] = useState(null); // Escrow agent {id, name}
  const [sendToEscrowFirst, setSendToEscrowFirst] = useState(false); // Send own assets to escrow first?
  const [escrowPayment, setEscrowPayment] = useState(0);

  const [fromBalances, setFromBalances] = useState(null);
  const [toBalances, setToBalances] = useState(null);

  const [fromAccountData, setFromAccountData] = useState(null);
  const [toAccountData, setToAccountData] = useState(null); // Needed for memo key

  const [showDialog, setShowDialog] = useState(false); // Deeplink dialog state
  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);
  const [escrowUserDialogOpen, setEscrowUserDialogOpen] = useState(false);

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
  // Fetch current user's balances
  useEffect(() => {
    async function fetchFromBalances() {
      if (usr && usr.id && currentNode && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode.url,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setFromBalances(filteredData);
          } else if (error) {
            console.error("Error fetching current user balances:", error);
          }
        });
      }
    }

    fetchFromBalances();
  }, [usr, assets, currentNode]);

  // Fetch counterparty's balances and account data
  useEffect(() => {
    async function fetchToBalances() {
      if (toAccount && toAccount.id && currentNode && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          toAccount.id,
          currentNode.url,
        ]);
        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setToBalances(filteredData);
          } else if (error) {
            console.error("Error fetching counterparty balances:", error);
          }
        });
      } else {
        setToBalances(null);
      }
    }

    fetchToBalances();
  }, [toAccount, assets, currentNode]);

  // --- Validation ---
  const isEscrowValid = useMemo(() => {
    if (!showEscrow) return true; // Escrow not used, valid by default
    return !showEscrow || (escrowAccount && escrowAccount.id);
  }, [showEscrow, escrowAccount]);

  const canSubmit = useMemo(
    () =>
      usr &&
      toAccount &&
      fromAssets &&
      Object.keys(fromAssets).length &&
      toAssets &&
      Object.keys(toAssets).length &&
      isEscrowValid &&
      (!showEscrow || escrowAccount.id !== toAccount.id),
    [
      usr,
      toAccount,
      fromAssets,
      toAssets,
      isEscrowValid,
      showEscrow,
      escrowAccount,
    ]
  );

  // --- Transaction Construction ---
  const proposalOperations = useMemo(() => {
    if (!canSubmit) return null;

    let ops = [];

    // 1. Handle Escrow Payment (if applicable)
    if (showEscrow && escrowPayment > 0 && escrowAccount) {
      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: usr.id,
          to: escrowAccount.id,
          amount: {
            amount: Math.floor(blockchainFloat(escrowPayment, 5)), // Ensure integer
            asset_id: "1.3.0",
          },
          extensions: {},
        },
      ]);
    }

    console.log({
      from: {
        fromAssets,
        keys: Object.keys(fromAssets),
      },
      to: {
        toAssets,
        keys: Object.keys(toAssets),
      },
    });

    // 2. Handle "From" user's asset transfers
    Object.values(fromAssets).forEach((item) => {
      const assetData = item.asset;
      if (!assetData) return;

      const to =
        showEscrow && sendToEscrowFirst ? escrowAccount.id : toAccount.id;

      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: usr.id,
          to: to,
          amount: {
            amount: Math.floor(
              blockchainFloat(item.amount, assetData.precision)
            ), // Ensure integer
            asset_id: assetData.id,
          },
          extensions: {},
        },
      ]);
    });

    // 3. Handle "To" user's asset transfers
    Object.values(toAssets).forEach((item) => {
      const assetData = item.asset;
      if (!assetData) return;

      const from = toAccount.id;
      const receiver =
        showEscrow && !sendToEscrowFirst ? escrowAccount.id : usr.id;

      ops.push([
        operationNumbers.transfer,
        {
          fee: { amount: 0, asset_id: "1.3.0" },
          from: from,
          to: receiver,
          amount: {
            amount: Math.floor(
              blockchainFloat(item.amount, assetData.precision)
            ), // Ensure integer
            asset_id: assetData.id,
          },
          extensions: {},
        },
      ]);
    });

    // 4. Handle escrow release (if escrow used and assets sent directly to other party)
    if (showEscrow && !sendToEscrowFirst && escrowAccount) {
      // This part might need refinement. The original code has a 1 satoshi transfer.
      // A proposal requires operations. Maybe this is intended to be signed by escrow later?
      // For now, let's create a placeholder transfer or a comment indicating escrow needs separate action.
      // Creating a proposal that needs escrow signature later:
      ops.push([
        operationNumbers.transfer,
        {
          // Placeholder/Indicator: Escrow needs to release their hold later
          fee: { amount: 0, asset_id: "1.3.0" },
          from: escrowAccount.id,
          to: usr.id, // Or the appropriate final recipient based on the full logic
          amount: { amount: 1, asset_id: "1.3.0" }, // Minimal transfer as indicator?
          extensions: {},
        },
      ]);
    }

    // Wrap in proposal_create
    const proposalExpiration = new Date();
    proposalExpiration.setDate(proposalExpiration.getDate() + 7); // Default 7 day expiry for proposal

    const _finalJSON = [
      {
        fee: { amount: 0, asset_id: "1.3.0" },
        fee_paying_account:
          showEscrow && sendToEscrowFirst ? escrowAccount.id : toAccount.id, // Current user pays proposal fee
        expiration_time: proposalExpiration.toISOString().slice(0, 19),
        proposed_ops: ops.map((op) => ({ op: op })),
        review_period_seconds: 3600, // Optional: 1 hour review period
        extensions: {},
      },
    ];

    console.log({ _finalJSON });

    return _finalJSON;
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
    assets,
  ]);

  // Refactored function to render asset items
  const renderAssetRow = ({ index, style, party, assetList }) => {
    const item = Object.values(assetList)[index];
    if (!item) return null; // Handle empty state

    const assetData = item.asset;

    return (
      <div
        key={assetData.id}
        className="space-y-2 border rounded-md relative p-1"
        style={style}
      >
        <div className="grid grid-cols-5 gap-3">
          {/* Amount Input */}
          <div className="space-y-1 col-span-2">
            <Input
              id={`amount-${party}-${assetData.id}`}
              type="number"
              value={item.amount}
              disabled
            />
          </div>
          {/* Display chosen asset */}
          <div className="space-y-1 col-span-2">
            <Input
              id={`asset-${party}-${assetData.id}`}
              type="text"
              value={assetData?.symbol || ""}
              disabled
            />
          </div>
          <div className="text-center">
            <Button
              onClick={() => {
                if (party === "from") {
                  setFromAssets((prevAssets) => {
                    const updatedAssets = { ...prevAssets }; // Create a shallow copy
                    delete updatedAssets[assetData.id]; // Remove the field
                    return updatedAssets; // Return the updated object
                  });
                } else {
                  setToAssets((prevAssets) => {
                    const updatedAssets = { ...prevAssets }; // Create a shallow copy
                    delete updatedAssets[assetData.id]; // Remove the field
                    return updatedAssets; // Return the updated object
                  });
                }
              }}
              variant="ghost"
              size="icon"
            >
              <CrossCircledIcon />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Updated ToRow and FromRow to use the refactored function
  const ToRow = ({ index, style }) => {
    return renderAssetRow({
      index,
      style,
      party: "to",
      assetList: toAssets,
    });
  };

  const FromRow = ({ index, style }) => {
    return renderAssetRow({
      index,
      style,
      party: "from",
      assetList: fromAssets,
    });
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
              <div className="grid grid-cols-2">
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
                    value={
                      toAccount ? `${toAccount.name} (${toAccount.id})` : ""
                    }
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
            </div>

            {toAccount ? (
              <>
                <Separator />
                {/* Barter Grid */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-start">
                  {/* User A Offer */}
                  <div className="md:col-span-5 space-y-3">
                    <Card>
                      <CardHeader>
                        <div className="grid grid-cols-2 gap-2">
                          <CardTitle className="text-md">
                            {t("Barter:yourOffer")} ({usr?.username})
                          </CardTitle>
                          <span className="text-right">
                            {fromBalances && fromBalances.length ? (
                              <BalanceAssetDropDownCard
                                assetsToHide={
                                  fromAssets ? Object.keys(fromAssets) : []
                                }
                                storeCallback={(res) => {
                                  const updatedFromAssets = {
                                    ...fromAssets,
                                    [res.asset.id]: {
                                      amount: res.amount,
                                      asset: res.asset,
                                    },
                                  };

                                  setFromAssets(updatedFromAssets);
                                }}
                                assets={assets}
                                size="small"
                                usrBalances={fromBalances}
                              />
                            ) : null}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {fromAssets && Object.keys(fromAssets).length ? (
                          <>
                            <div className="grid grid-cols-5 gap-2 p-2 bg-gray-100 mb-1 rounded-t-md font-semibold text-sm sticky top-0 z-10">
                              <div className="col-span-2">
                                {t("Barter:amount")}
                              </div>
                              <div className="col-span-2">
                                {t("Barter:asset")}
                              </div>
                            </div>
                            <div className="w-full max-h-[500px] overflow-auto">
                              <List
                                height={500}
                                rowComponent={FromRow}
                                rowCount={Object.keys(fromAssets).length}
                                rowHeight={45} // Adjust as needed
                                rowProps={{}}
                              />
                            </div>
                          </>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>

                  {/* User B Offer */}
                  <div className="md:col-span-5 space-y-3">
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          <div className="grid grid-cols-2 gap-2">
                            <span>
                              {t("Barter:theirOffer", {
                                name: toAccount?.name || "...",
                              })}
                            </span>
                            <span className="text-right">
                              {toBalances && toBalances.length ? (
                                <BalanceAssetDropDownCard
                                  assetsToHide={
                                    toAssets ? Object.keys(toAssets) : []
                                  }
                                  storeCallback={(res) => {
                                    const updatedToAssets = {
                                      ...toAssets,
                                      [res.asset.id]: {
                                        amount: res.amount,
                                        asset: res.asset,
                                      },
                                    };

                                    setToAssets(updatedToAssets);
                                  }}
                                  assets={assets}
                                  size="small"
                                  usrBalances={toBalances}
                                />
                              ) : null}
                            </span>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {toAssets && Object.keys(toAssets).length ? (
                          <>
                            <div className="grid grid-cols-5 gap-2 p-2 mb-1 bg-gray-100 rounded-t-md font-semibold text-sm sticky top-0 z-10">
                              <div className="col-span-2">
                                {t("Barter:amount")}
                              </div>
                              <div className="col-span-2">
                                {t("Barter:asset")}
                              </div>
                            </div>
                            <List
                              height={500}
                              rowComponent={ToRow}
                              rowCount={Object.keys(toAssets).length}
                              rowHeight={45} // Adjust as needed
                              rowProps={{}}
                              width="100%"
                            />
                          </>
                        ) : null}
                      </CardContent>
                    </Card>
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
                      <HoverInfo
                        content={t("Barter:escrowInfo")}
                        header={t("Barter:useEscrow")}
                        onClick={() => setShowEscrow(!showEscrow)}
                      />
                    </div>
                  </div>

                  {showEscrow && (
                    <Card className="p-4 space-y-4">
                      {/* Escrow Agent Selection */}
                      <div className="space-y-2">
                        <Label>{t("Barter:escrowAgent")}</Label>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {console.log({ escrowAccount })}
                            {escrowAccount ? (
                              <Avatar
                                size={40}
                                name={escrowAccount.name}
                                extra="Escrow"
                                expression={{ eye: "normal", mouth: "open" }}
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
                          <HoverInfo
                            content={t("Barter:sendToEscrowFirstInfo")}
                            header={t("Barter:sendToEscrowFirst")}
                          />
                        </div>
                      </div>

                      {/* Escrow Payment */}
                      <div className="space-y-2">
                        <HoverInfo
                          content={t("Barter:escrowPaymentInfo")}
                          header={t("Barter:escrowPayment")}
                        />
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
                    </Card>
                  )}
                </div>
              </>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col items-start space-y-3">
            <Separator />
            <Button
              onClick={() => {
                setShowDialog(true);
              }}
              disabled={!canSubmit}
            >
              {t("Barter:proposeTrade")}
            </Button>
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
