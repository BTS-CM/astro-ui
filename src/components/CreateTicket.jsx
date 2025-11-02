import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { humanReadableFloat, blockchainFloat } from "@/lib/common.js";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import ChainTypes from "@/bts/chain/ChainTypes.js";
import { createUserTicketsStore } from "@/nanoeffects/UserTickets.ts";

export default function CreateTicket() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );

  // UI state
  const [lockType, setLockType] = useState("lock_180_days");
  const [amount, setAmount] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newType, setNewType] = useState("lock_180_days");
  const [updateAmount, setUpdateAmount] = useState(""); // optional amount_for_new_target
  const [showUpdateDeepLink, setShowUpdateDeepLink] = useState(false);
  const [pendingUpdateOp, setPendingUpdateOp] = useState(null);

  // Derived boost factor based on lock type
  const boostFactor = useMemo(() => {
    switch (lockType) {
      case "lock_180_days":
        return 2;
      case "lock_360_days":
        return 4;
      case "lock_720_days":
        return 8;
      case "lock_forever":
        return 8; // same as 720d according to reference snippet
      default:
        return 1;
    }
  }, [lockType]);

  // Equivalent voting power displayed to user
  const equivalent = useMemo(() => {
    const n = parseFloat(amount || 0);
    if (Number.isNaN(n)) return 0;
    return n * boostFactor;
  }, [amount, boostFactor]);

  // Map to ticket_type enum value
  const targetType = useMemo(() => {
    switch (lockType) {
      case "lock_180_days":
        return ChainTypes.ticket_type.lock_180_days;
      case "lock_360_days":
        return ChainTypes.ticket_type.lock_360_days;
      case "lock_720_days":
        return ChainTypes.ticket_type.lock_720_days;
      default:
        return ChainTypes.ticket_type.liquid;
    }
  }, [lockType]);

  // Note: We intentionally omit the general tickets listing here.
  // This component focuses on the current user's tickets only.

  // User-specific tickets and tallies
  const [userTickets, setUserTickets] = useState([]);
  useEffect(() => {
    async function fetchUserTickets() {
      if (
        usr &&
        usr.id &&
        (chain === "bitshares" || chain === "bitshares_testnet")
      ) {
        const store = createUserTicketsStore([
          chain,
          usr.id,
          currentNode ? currentNode.url : null,
          0,
          8, // pages to fetch for better coverage
        ]);
        store.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setUserTickets(data);
          }
        });
      }
    }

    fetchUserTickets();
  }, [usr, chain, currentNode]);

  const userTotals = useMemo(() => {
    // Sum amounts by ticket target_type and compute effective voting power
    let rawSum = 0;
    let effectiveSum = 0;
    let byType = {
      liquid: 0,
      lock_180_days: 0,
      lock_360_days: 0,
      lock_720_days: 0,
      lock_forever: 0,
    };
    for (const tkt of userTickets || []) {
      const amt =
        tkt && tkt.amount && tkt.amount.amount ? Number(tkt.amount.amount) : 0;
      // Assuming core precision 5, same as used in create op; safe for BTS/TEST
      const hr = amt / 10 ** 5;
      rawSum += hr;
      const typeStr = normalizeTypeToString(
        tkt.current_type ?? tkt.target_type
      );
      const boost = boostForTypeString(typeStr);
      if (typeStr === "lock_180_days") byType.lock_180_days += hr;
      else if (typeStr === "lock_360_days") byType.lock_360_days += hr;
      else if (typeStr === "lock_720_days") byType.lock_720_days += hr;
      else if (typeStr === "lock_forever") byType.lock_forever += hr;
      else byType.liquid += hr;
      effectiveSum += hr * boost;
    }
    return { rawSum, effectiveSum, byType };
  }, [userTickets]);

  const assetSymbol = useMemo(
    () =>
      chain === "bitshares"
        ? "BTS"
        : chain === "bitshares_testnet"
        ? "TEST"
        : "BTS",
    [chain]
  );

  // Normalize a ticket type which may be a string (e.g. "lock_720_days") or enum value
  function normalizeTypeToString(input) {
    if (typeof input === "string") return input;
    switch (input) {
      case ChainTypes.ticket_type?.lock_180_days:
        return "lock_180_days";
      case ChainTypes.ticket_type?.lock_360_days:
        return "lock_360_days";
      case ChainTypes.ticket_type?.lock_720_days:
        return "lock_720_days";
      case ChainTypes.ticket_type?.lock_forever:
        return "lock_forever";
      default:
        return "liquid";
    }
  }

  function boostForTypeString(typeStr) {
    switch (typeStr) {
      case "lock_180_days":
        return 2;
      case "lock_360_days":
        return 4;
      case "lock_720_days":
      case "lock_forever":
        return 8;
      default:
        return 1;
    }
  }

  const typeLabel = (tt) => {
    const s = normalizeTypeToString(tt);
    if (s === "lock_180_days") return t("CreateTicket:radioB.sm");
    if (s === "lock_360_days") return t("CreateTicket:radioB.md");
    if (s === "lock_720_days") return t("CreateTicket:radioB.lg");
    if (s === "lock_forever") return t("CreateTicket:radioB.xl");
    return t("CreateTicket:lockTypeLiquid", "Liquid");
  };

  const mapStringToTargetType = (s) => {
    switch (s) {
      case "lock_180_days":
        return ChainTypes.ticket_type.lock_180_days;
      case "lock_360_days":
        return ChainTypes.ticket_type.lock_360_days;
      case "lock_720_days":
        return ChainTypes.ticket_type.lock_720_days;
      case "lock_forever":
        return ChainTypes.ticket_type.lock_forever;
      default:
        return ChainTypes.ticket_type.liquid;
    }
  };

  const mapTargetTypeToString = (tt) => {
    switch (tt) {
      case ChainTypes.ticket_type.lock_180_days:
        return "lock_180_days";
      case ChainTypes.ticket_type.lock_360_days:
        return "lock_360_days";
      case ChainTypes.ticket_type.lock_720_days:
        return "lock_720_days";
      case ChainTypes.ticket_type.lock_forever:
        return "lock_forever";
      default:
        return "liquid";
    }
  };

  const openUpdateDialog = (ticket) => {
    setSelectedTicket(ticket);
    setNewType(
      normalizeTypeToString(ticket.current_type ?? ticket.target_type)
    );
    setUpdateAmount("");
    setUpdateDialogOpen(true);
  };

  // If user selects liquid as new target type, hide/clear additional amount field
  useEffect(() => {
    if (newType === "liquid" && updateAmount) {
      setUpdateAmount("");
    }
  }, [newType]);

  return (
    <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:w-1/2">
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{t("CreateTicket:title")}</CardTitle>
            <CardDescription>{t("CreateTicket:description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-2 mt-1 mb-2">
                <span className="col-span-2">
                  <HoverInfo
                    header={t("CreateTicket:lockType")}
                    content={t("CreateTicket:lockTypeDescription")}
                    type="header"
                  />
                </span>
                <Button
                  onClick={() => setLockType("lock_180_days")}
                  variant={lockType === "lock_180_days" ? "" : "outline"}
                  size="md"
                >
                  {t("CreateTicket:radioB.sm")}
                </Button>
                <Button
                  onClick={() => setLockType("lock_360_days")}
                  variant={lockType === "lock_360_days" ? "" : "outline"}
                  size="md"
                >
                  {t("CreateTicket:radioB.md")}
                </Button>
                <Button
                  onClick={() => setLockType("lock_720_days")}
                  variant={lockType === "lock_720_days" ? "" : "outline"}
                  size="md"
                >
                  {t("CreateTicket:radioB.lg")}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <span className="col-span-1">
                  <HoverInfo
                    header={t("CreateTicket:amountHeader")}
                    content={t("CreateTicket:amountDescription")}
                    type="header"
                  />
                </span>
                <span className="col-span-1" />
                <span className="col-span-2">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-2"
                  />
                </span>
              </div>

              <div className="grid grid-cols-1">
                <span className="text-sm">
                  {t("CreateTicket:summary", {
                    amount: amount || 0,
                    asset: assetSymbol,
                    eq: equivalent,
                  })}
                </span>
              </div>

              <Alert className="mt-3">
                <AlertTitle>
                  {t(
                    "CreateTicket:thumbsupNotice.title",
                    "Whitelist requirement"
                  )}
                </AlertTitle>
                <AlertDescription>
                  {t(
                    "CreateTicket:thumbsupNotice.body",
                    "To create tickets, you must hold an equivalent amount of THUMBSUP.1 tokens on the BitShares blockchain. These can be acquired from the user 'abit'. They are required to whitelist voters on-chain."
                  )}
                </AlertDescription>
              </Alert>

              <Button className="h-8 mt-4" onClick={() => setShowDialog(true)}>
                {t("CreatePrediction:buttons.submit")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Removed global tickets snapshot; only user tickets are shown below. */}

        {usr && userTickets ? (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{t("CreateTicket:myTickets.title")}</CardTitle>
              <CardDescription>
                {t("CreateTicket:myTickets.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  {t("CreateTicket:myTickets.totalLocked", {
                    amount: userTotals.rawSum.toFixed(5),
                    asset: assetSymbol,
                  })}
                </div>
                <div className="text-right">
                  {t("CreateTicket:myTickets.totalEffective", {
                    amount: userTotals.effectiveSum.toFixed(5),
                    asset: assetSymbol,
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 mt-3 text-sm">
                <div>
                  {t("CreateTicket:myTickets.breakdown.lock180", {
                    amount: userTotals.byType.lock_180_days.toFixed(5),
                    asset: assetSymbol,
                  })}
                </div>
                <div>
                  {t("CreateTicket:myTickets.breakdown.lock360", {
                    amount: userTotals.byType.lock_360_days.toFixed(5),
                    asset: assetSymbol,
                  })}
                </div>
                <div>
                  {t("CreateTicket:myTickets.breakdown.lock720", {
                    amount: userTotals.byType.lock_720_days.toFixed(5),
                    asset: assetSymbol,
                  })}
                </div>
                <div>
                  {t("CreateTicket:myTickets.breakdown.forever", {
                    amount: userTotals.byType.lock_forever.toFixed(5),
                    asset: assetSymbol,
                  })}
                </div>
                {userTotals.byType.liquid > 0 ? (
                  <div>
                    {t("CreateTicket:myTickets.breakdown.liquid", {
                      amount: userTotals.byType.liquid.toFixed(5),
                      asset: assetSymbol,
                    })}
                  </div>
                ) : null}
              </div>

              {userTickets && userTickets.length ? (
                <div className="mt-5">
                  <Label className="text-left text-md font-bold mb-2 block">
                    {t("CreateTicket:myTickets.table.title", "Your tickets")}
                  </Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">
                          {t("CreateTicket:myTickets.table.id", "ID")}
                        </TableHead>
                        <TableHead>
                          {t("CreateTicket:myTickets.table.amount", "Amount")}
                        </TableHead>
                        <TableHead>
                          {t("CreateTicket:myTickets.table.type", "Type")}
                        </TableHead>
                        <TableHead>
                          {t(
                            "CreateTicket:myTickets.table.effective",
                            "Effective"
                          )}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("CreateTicket:myTickets.table.actions", "Actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...userTickets]
                        .sort((a, b) => {
                          // Sort by numeric id descendant (1.18.x)
                          const na = parseInt((a.id || "").split(".").pop());
                          const nb = parseInt((b.id || "").split(".").pop());
                          return (isNaN(nb) ? 0 : nb) - (isNaN(na) ? 0 : na);
                        })
                        .map((tk) => {
                          const amt =
                            tk && tk.amount && tk.amount.amount
                              ? Number(tk.amount.amount)
                              : 0;
                          const hr = amt / 10 ** 5;
                          const typeStr = normalizeTypeToString(
                            tk.current_type ?? tk.target_type
                          );
                          const boost = boostForTypeString(typeStr);
                          return (
                            <TableRow key={tk.id}>
                              <TableCell className="font-mono text-xs">
                                {tk.id}
                              </TableCell>
                              <TableCell>
                                {hr.toFixed(5)} {assetSymbol}
                              </TableCell>
                              <TableCell>
                                {typeLabel(tk.current_type ?? tk.target_type)}
                              </TableCell>
                              <TableCell>
                                {(hr * boost).toFixed(5)} {assetSymbol}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openUpdateDialog(tk)}
                                >
                                  {t("CreateTicket:buttons.update", "Update")}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {showDialog ? (
          <DeepLinkDialog
            operationNames={["ticket_create"]}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowDialog}
            key={`deeplink-dialog`}
            headerText={t("CreateTicket:dialogHeader")}
            trxJSON={[
              {
                account: usr.id,
                target_type: targetType,
                amount: {
                  amount: blockchainFloat(parseFloat(amount || 0), 5),
                  asset_id: "1.3.0",
                },
                extensions: [],
              },
            ]}
            disablePropose={true}
          />
        ) : null}

        {updateDialogOpen && selectedTicket ? (
          <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
            <DialogContent className="sm:max-w-[520px] bg-white">
              <DialogHeader>
                <DialogTitle>
                  {t("CreateTicket:updateDialog.title", "Update ticket")}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    "CreateTicket:updateDialog.description",
                    "Change the ticket lock type. Optionally, provide additional amount to retarget."
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3">
                <div className="text-sm">
                  <b>{t("CreateTicket:myTickets.table.id", "ID")}:</b>{" "}
                  {selectedTicket.id}
                </div>
                <div className="text-sm">
                  <b>
                    {t("CreateTicket:updateDialog.currentType", "Current type")}
                    :
                  </b>{" "}
                  {typeLabel(
                    selectedTicket.current_type ?? selectedTicket.target_type
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>
                    {t("CreateTicket:updateDialog.newType", "New type")}
                  </Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          "CreateTicket:updateDialog.newType",
                          "New type"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="lock_180_days">
                        {t("CreateTicket:radioB.sm")}
                      </SelectItem>
                      <SelectItem value="lock_360_days">
                        {t("CreateTicket:radioB.md")}
                      </SelectItem>
                      <SelectItem value="lock_720_days">
                        {t("CreateTicket:radioB.lg")}
                      </SelectItem>
                      <SelectItem value="liquid">
                        {t("CreateTicket:lockTypeLiquid", "Liquid")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newType !== "liquid" ? (
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label>
                      {t(
                        "CreateTicket:updateDialog.amountNewTarget",
                        "Additional amount (optional)"
                      )}
                    </Label>
                    <Input
                      type="number"
                      placeholder={"0.00000"}
                      value={updateAmount}
                      onChange={(e) => setUpdateAmount(e.target.value)}
                    />
                  </div>
                ) : null}
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => setUpdateDialogOpen(false)}
                  >
                    {t("CreateTicket:updateDialog.cancel", "Cancel")}
                  </Button>
                  <Button
                    onClick={() => {
                      // Build ticket_update op
                      const op = {
                        ticket: selectedTicket.id,
                        account: usr.id,
                        target_type: mapStringToTargetType(newType),
                        extensions: [],
                      };
                      const n = parseFloat(updateAmount);
                      if (newType !== "liquid" && !Number.isNaN(n) && n > 0) {
                        op.amount_for_new_target = {
                          amount: blockchainFloat(n, 5),
                          asset_id: "1.3.0",
                        };
                      }
                      // Close dialog and then show deeplink with prepared op
                      setPendingUpdateOp(op);
                      setUpdateDialogOpen(false);
                      setShowUpdateDeepLink(true);
                    }}
                  >
                    {t("CreateTicket:updateDialog.continue", "Continue")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}

        {showUpdateDeepLink && selectedTicket ? (
          <DeepLinkTicketUpdate
            usr={usr}
            operation={pendingUpdateOp}
            onDismiss={() => {
              setShowUpdateDeepLink(false);
              setSelectedTicket(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

// Small wrapper to render DeepLinkDialog for ticket_update using current user
function DeepLinkTicketUpdate({ usr, operation, onDismiss }) {
  if (!operation) return null;
  return (
    <DeepLinkDialog
      operationNames={["ticket_update"]}
      username={usr.username}
      usrChain={usr.chain}
      userID={usr.id}
      dismissCallback={onDismiss}
      key={`deeplink-dialog-update`}
      headerText={"ticket_update"}
      trxJSON={[operation]}
      disablePropose={true}
    />
  );
}
