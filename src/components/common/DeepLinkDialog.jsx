import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useStore } from "@nanostores/react";
import { format } from "date-fns";
import { Apis } from "bitsharesjs-ws";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { CalendarIcon } from "@radix-ui/react-icons";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import {
  Avatar as Av,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import HoverInfo from "@/components/common/HoverInfo.tsx";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/common.js";
import { $currentNode } from "@/stores/node.ts";
import { $currentUser } from "@/stores/users.ts";
import { addToBasket, getBasketItems } from "@/stores/basketStore.js"; // Added getBasketItems if needed for other logic, or remove if not

import { Avatar } from "../Avatar.tsx";
import AccountSearch from "../AccountSearch.jsx";

const operationNumbers = {
  transfer: 0,
  limit_order_create: 1,
  limit_order_cancel: 2,
  call_order_update: 3,
  fill_order: 4,
  account_create: 5,
  account_update: 6,
  account_whitelist: 7,
  account_upgrade: 8,
  account_transfer: 9,
  asset_create: 10,
  asset_update: 11,
  asset_update_bitasset: 12,
  asset_update_feed_producers: 13,
  asset_issue: 14,
  asset_reserve: 15,
  asset_fund_fee_pool: 16,
  asset_settle: 17,
  asset_global_settle: 18,
  asset_publish_feed: 19,
  witness_create: 20,
  witness_update: 21,
  proposal_create: 22,
  proposal_update: 23,
  proposal_delete: 24,
  withdraw_permission_create: 25,
  withdraw_permission_update: 26,
  withdraw_permission_claim: 27,
  withdraw_permission_delete: 28,
  committee_member_create: 29,
  committee_member_update: 30,
  committee_member_update_global_parameters: 31,
  vesting_balance_create: 32,
  vesting_balance_withdraw: 33,
  worker_create: 34,
  custom: 35,
  assert: 36,
  balance_claim: 37,
  override_transfer: 38,
  transfer_to_blind: 39,
  blind_transfer: 40,
  transfer_from_blind: 41,
  asset_settle_cancel: 42,
  asset_claim_fees: 43,
  fba_distribute: 44,
  bid_collateral: 45,
  execute_bid: 46,
  asset_claim_pool: 47,
  asset_update_issuer: 48,
  htlc_create: 49,
  htlc_redeem: 50,
  htlc_redeemed: 51,
  htlc_extend: 52,
  htlc_refund: 53,
  custom_authority_create: 54,
  custom_authority_update: 55,
  custom_authority_delete: 56,
  ticket_create: 57,
  ticket_update: 58,
  liquidity_pool_create: 59,
  liquidity_pool_delete: 60,
  liquidity_pool_deposit: 61,
  liquidity_pool_withdraw: 62,
  liquidity_pool_exchange: 63,
  samet_fund_create: 64,
  samet_fund_delete: 65,
  samet_fund_update: 66,
  samet_fund_borrow: 67,
  samet_fund_repay: 68,
  credit_offer_create: 69,
  credit_offer_delete: 70,
  credit_offer_update: 71,
  credit_offer_accept: 72,
  credit_deal_repay: 73,
  credit_deal_expired: 74,
  liquidity_pool_update: 75,
  credit_deal_update: 76,
  limit_order_update: 77,
};

/**
 * Launches a dialog prompt, generating a deep link for the given operation.
 * Buttons link to the Beet/BeetEOS multiwallets
 */
export default function DeepLinkDialog(properties) {
  const {
    trxJSON: initialTrxJSON,
    operationNames: initialOperationNames,
    username: initialUsername,
    usrChain,
    userID,
    dismissCallback, // Prop for parent to know dialog is dismissed
    beetCallback,
    title,
    allowInput,
    open, // New prop to control visibility externally
    onOpenChange, // New prop to inform parent of visibility change requests
    sourceInfo, // New prop to pass source information (e.g., fromBasket)
  } = properties;

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  // Internal state for managing operations, potentially initialized or updated by props/sourceInfo
  const [trxJSON, setTrxJSON] = useState([]);
  const [operationNames, setOperationNames] = useState([]);
  const [currentUsername, setCurrentUsername] = useState("");

  const [beetOperations, setBeetOperations] = useState(null);
  const [env, setEnv] = useState(null);
  const [beetChain, setBeetChain] = useState(null);
  const [beetConnection, setBeetConnection] = useState(null);
  const [beetLink, setBeetLink] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [expiryDate, setExpiryDate] = React.useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [deeplink, setDeeplink] = useState(null);
  const [targetUser, setTargetUser] = useState();
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [deeplinkJSON, setDeeplinkJSON] = useState(null);

  const currentNode = useStore($currentNode);
  const currentUser = useStore($currentUser);

  useEffect(() => {
    if (open) {
      // Prioritize operations from sourceInfo if provided (e.g., from basket checkout)
      const opsToUse = sourceInfo?.operations && sourceInfo.operations.length > 0 
                       ? sourceInfo.operations 
                       : initialTrxJSON;
      setTrxJSON(opsToUse || []);
      setOperationNames(initialOperationNames || []); // Assuming these still primarily come from direct props
      
      let uName = initialUsername || (currentUser ? currentUser.username : "");
      if (sourceInfo && sourceInfo.username) { 
        uName = sourceInfo.username;
      }
      setCurrentUsername(uName);

      // Reset other local state when dialog opens or its core data changes
      setBeetOperations(null);
      setEnv(null);
      setBeetChain(null);
      setBeetConnection(null);
      setBeetLink(null);
      setQrData(null);
      setCopied(false);
      setError(null);
      setExpiryDate(null);
      setSelectedAccount(null);
      setDeeplink(null);
      setTargetUser(undefined);
      setProposalDialogOpen(false);
      setDeeplinkJSON(null);
    }
  }, [open, initialTrxJSON, initialOperationNames, initialUsername, currentUser, sourceInfo]);

  const relevantChain = useMemo(() => {
    if (!currentNode || !currentNode.chain_id) {
      console.warn("Current node or chain_id is undefined.");
      return null;
    }
    // Ensure Apis.instance() is available and chain_id exists
    try {
        return Apis.instance().chain_id === currentNode.chain_id
            ? currentNode.chain_id
            : null;
    } catch (e) {
        console.warn("Apis instance not available or error accessing chain_id", e);
        return null;
    }
  }, [currentNode]);

  useEffect(() => {
    async function fetchDeeplink() {
      if (!window || !window.electron || !usrChain || !operationNames || !trxJSON) {
        // console.log("Pre-requisites for fetching deeplink not met.");
        return;
      }

      // Ensure operationNames and trxJSON are not empty and have content
      if (operationNames.length === 0 && trxJSON.length === 0) {
        // console.log("No operations to generate deeplink for.");
        return;
      }

      try {
        let response = await window.electron.generateDeepLink({
          usrChain,
          currentNode: currentNode ? currentNode.url : "",
          operationNames,
          trxJSON,
        });

        if (!response) {
          console.log("Failed to fetch deeplink: No response from electron method");
          return;
        }
        setDeeplink(response);
      } catch (e) {
        console.error("Error fetching deeplink:", e);
      }
    }

    if (open) { // Only attempt to fetch if the dialog is open
        fetchDeeplink();
    }
  }, [open, usrChain, operationNames, trxJSON, currentNode]);
  
  const internalHandleClose = () => {
    if (onOpenChange) {
      onOpenChange(false); // Inform parent about the change
    }
    if (dismissCallback) {
      dismissCallback(false); // Call original dismiss callback if provided
    }
  };

  const handleAddToBasket = () => {
    const opsToBasket = trxJSON && trxJSON.length > 0 ? trxJSON : initialTrxJSON;
    if (opsToBasket && opsToBasket.length > 0) {
      const pageUrl = sourceInfo?.pageUrl || window.location.pathname;
      const pageTitle = sourceInfo?.pageTitle || document.title;
      addToBasket(opsToBasket, pageUrl, pageTitle);
      console.log("Added to basket, closing dialog");
      internalHandleClose();
    } else {
      console.error("No operations to add to basket");
    }
  };
  
  const generateOperation = () => { console.log("generateOperation called"); };
  const copyLink = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (!open) {
    return null;
  }

  return (
    <Dialog
      open={open} // Controlled by the new `open` prop
      onOpenChange={(openValue) => {
        // If ShadCN Dialog wants to close, call internalHandleClose
        // which will then call onOpenChange(false) passed by parent
        if (!openValue) {
          internalHandleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[800px] bg-white">
        <DialogHeader>
          <DialogTitle>{title || t("deepLinkDialog:title")}</DialogTitle>
          {operationNames && operationNames.length > 0 ? (
            <DialogDescription>
              {t("deepLinkDialog:description")}
              <b>{operationNames.join(", ")}</b>
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {/* Conditional rendering for Add to Basket Button */}
        {!(sourceInfo && sourceInfo.fromBasket) && (!beetLink && !error) && (
          <Button className="mt-3 w-full" variant="secondary" onClick={handleAddToBasket}>
            {t("deepLinkDialog:addToBasket") ?? "Add to Basket"}
          </Button>
        )}
        {error ? <p style={{ color: "red" }}>Error: {error}</p> : null}
        {allowInput && relevantChain ? (
          <AccountSearch
            relevantChain={relevantChain}
            excludedUsers={[]}
            callback={(account) => {
              console.log({ account });
              setSelectedAccount(account);
            }}
          />
        ) : null}
        {allowInput ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !expiryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiryDate ? (
                  format(expiryDate, "PPP")
                ) : (
                  <span>{t("LimitOrderCard:expiry.pickDate")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={expiryDate}
                onSelect={(e) => {
                  const parsedDate = new Date(e);
                  const now = new Date();
                  if (parsedDate < now) {
                    //console.log("Not a valid date");
                    setDate(
                      new Date(
                        Date.now() + 1 * 24 * 60 * 60 * 1000
                      )
                    );
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
        {beetLink && beetConnection ? (
          <div className="mt-5 grid grid-cols-1 gap-3 text-center">
            <a href={beetLink} target="_blank" rel="noreferrer">
              <Button className="w-full">
                {t("deepLinkDialog:cta", { appName: beetConnection.appName })}
              </Button>
            </a>
            {qrData ? (
              <div className="p-2 inline-block">
                {/* Assuming QRCode is imported, e.g., import QRCode from 'qrcode.react'; */}
                {/* <QRCode value={qrData} size={128} /> */}
                <p>[QR Code Placeholder]</p> { /* Replace with actual QRCode component */}
              </div>
            ) : null}
            <Button variant="outline" onClick={copyLink}>
              {copied
                ? t("deepLinkDialog:copied")
                : t("deepLinkDialog:copyLink")}
            </Button>
          </div>
        ) : (
          !error && (
            <Button className="mt-5 w-full" onClick={generateOperation}>
                {t("deepLinkDialog:generateLink")}
            </Button>
          )
        )}

      </DialogContent>
    </Dialog>
  );
}
