import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useStore } from "@nanostores/react";
import { format } from "date-fns";
import Apis from "../../bts/ws/ApiInstances";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { CalendarIcon } from "@radix-ui/react-icons";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import { Avatar } from "../Avatar.tsx";
import AccountSearch from "../AccountSearch.jsx";
import { QRCode } from "react-qrcode-logo";

const REVIEW_PERIOD_LABELS = {
  60000: "60s",
  300000: "300s",
  600000: "600s",
  900000: "900s",
  1200000: "1200s",
  604800: "1w",
  1209600: "2w",
  2419200: "4w",
};

const REVIEW_PERIOD_OPTIONS = [
  60000, 300000, 600000, 900000, 1200000, 604800, 1209600, 2419200,
];

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
 * Buttons link to the Beet/BeetVault multiwallets
 */
export default function DeepLinkDialog(properties) {
  const {
    trxJSON,
    operationNames,
    username,
    usrChain,
    userID,
    dismissCallback,
    headerText,
    //
    proposal = false,
    // When true, hides/disables the ability to create a proposal from this dialog
    disablePropose = false,
    // When true, hides the QR code tab (useful for large transactions that exceed QR capacity)
    disableQR = false,
    // When true, hides the deeplink tab (useful when the deeplink URL exceeds the webview's character limit)
    disableDeeplink = false,
    // When true, hides the TOTP tab (encrypted deeplink alternative, also
    // unsuitable for very large transactions)
    disableTotp = false,
    // When true, only the transaction object view and proposal tabs are shown,
    // forcing the operation through a committee proposal (required for
    // operations like committee_member_update_global_parameters).
    forcePropose = false,
    // Initial review period (in seconds) preselected in the proposal tab.
    // Defaults to 60000 to preserve existing behaviour.
    initialReviewPeriodSeconds = null,
    // Hide review period options below this value (in seconds). Useful when
    // the chain requires a minimum review period, e.g. committee proposals.
    minReviewPeriodSeconds = null,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const currentNode = useStore($currentNode);

  const [activeTab, setActiveTab] = useState(
    forcePropose ? "propose" : "object"
  );
  const [deeplink, setDeeplink] = useState();
  useEffect(() => {
    async function fetchDeeplink() {
      if (!window || !window.electron) {
        console.log("No electron window found, cannot fetch deeplink");
        return;
      }

      let response = await window.electron.generateDeepLink({
        usrChain,
        currentNode: currentNode ? currentNode.url : "",
        operationNames,
        trxJSON,
      });

      if (!response) {
        console.log("Failed to fetch deeplink");
        return;
      }

      setDeeplink(response);
    }

    if (usrChain && operationNames && trxJSON) {
      fetchDeeplink();
    }
  }, [usrChain, operationNames, trxJSON]);

  const [downloadClicked, setDownloadClicked] = useState(false);
  const handleDownloadClick = () => {
    if (!downloadClicked) {
      setDownloadClicked(true);
      setTimeout(() => {
        setDownloadClicked(false);
      }, 10000);
    }
  };

  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);
  const [targetUser, setTargetUser] = useState();
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);

  useEffect(() => {
    if (targetUser) {
      // close dialog on target account selection
      setTargetUserDialogOpen(false);
    }
  }, [targetUser]);

  // Proposal dialog state
  const [expiryType, setExpiryType] = useState("1hr");
  const [expiry, setExpiry] = useState(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });

  const [date, setDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ); // Solely for the calendar component to display a date string

  useEffect(() => {
    if (expiryType === "specific" && date) {
      setExpiry(date);
    }
  }, [expiryType, date]);

  const [reviewPeriodSeconds, setReviewPeriodSeconds] = useState(() => {
    // Clamp the initial value to a selectable option: a raw chain value
    // (e.g. review period 0) may match no item, which renders a blank field.
    const min = Number(minReviewPeriodSeconds);
    const floor = Number.isFinite(min) ? min : -Infinity;
    const init = Number(initialReviewPeriodSeconds ?? 60000);
    const candidate = REVIEW_PERIOD_OPTIONS.find(
      (o) => o >= Math.max(Number.isFinite(init) ? init : 60000, floor)
    );
    return String(
      candidate ?? REVIEW_PERIOD_OPTIONS[REVIEW_PERIOD_OPTIONS.length - 1]
    );
  });

  const [deeplinkJSON, setDeeplinkJSON] = useState(null);

  // QR code customization state
  const [qrECL, setQRECL] = useState("M");
  const [qrSize, setQRSize] = useState("250");
  const [qrQZ, setQRQZ] = useState("25");
  const [qrStyle, setQRStyle] = useState("squares");
  const [qrBGC, setQRBGC] = useState("#ffffff");
  const [qrFGC, setQRFGC] = useState("#000000");
  const [qrContents, setQRContents] = useState(null);

  // TOTP deeplink state
  const [totpCode, setTotpCode] = useState("");
  const [totpDeeplink, setTotpDeeplink] = useState(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState(null);

  const handleTotpSubmit = async () => {
    const trimmed = (totpCode || "").trim();
    if (!trimmed) {
      setTotpError(t("DeepLinkDialog:totp.passcodeRequired"));
      return;
    }
    if (!window || !window.electron || !window.electron.generateTotpDeepLink) {
      setTotpError(t("DeepLinkDialog:totp.unavailable"));
      return;
    }
    setTotpLoading(true);
    setTotpError(null);
    setTotpDeeplink(null);
    try {
      const res = await window.electron.generateTotpDeepLink({
        usrChain,
        currentNode: currentNode ? currentNode.url : "",
        operationNames,
        trxJSON,
        totpCode: trimmed,
      });
      if (!res) {
        setTotpError(t("DeepLinkDialog:totp.failed"));
      } else {
        setTotpDeeplink(res);
      }
    } catch (e) {
      console.error("generateTotpDeepLink failed", e);
      setTotpError(e?.message || t("DeepLinkDialog:totp.failed"));
    } finally {
      setTotpLoading(false);
    }
  };

  // Build transaction object in main process for QR encoding
  useEffect(() => {
    async function fetchQRContents() {
      if (!window || !window.electron) return;
      if (!usrChain || !operationNames || !trxJSON) return;

      try {
        const response = await window.electron.generateQRContents({
          usrChain,
          currentNode: currentNode ? currentNode.url : "",
          operationNames,
          trxJSON,
        });
        setQRContents(response || null);
      } catch (e) {
        console.error("Failed generating QR contents", e);
        setQRContents(null);
      }
    }
    fetchQRContents();
  }, [usrChain, currentNode, operationNames, trxJSON]);

  useEffect(() => {
    async function calculateDeeplinkJSON() {
      if (!targetUser || !date || !trxJSON) {
        setDeeplinkJSON(null);
        return;
      }

      let feeProcessedOperations = [...trxJSON];

      // All transfer ops share the same base fee, so fetch it ONCE and reuse
      // it for every operation. Looping over each op previously opened a fresh
      // websocket connection per operation (N+1 RPCs), which stormed the node
      // and failed with "websocket state error:0" for large batches.
      if (window.electron && trxJSON.length) {
        let singleFee = null;
        try {
          singleFee = await window.electron.calculateOperationFees({
            nodeURL: currentNode,
            trxJSON: trxJSON[0],
          });
        } catch (error) {
          console.error("Error calculating fee:", error);
        }
        if (singleFee != null) {
          const feeObj = { amount: parseInt(singleFee), asset_id: "1.3.0" };
          feeProcessedOperations = feeProcessedOperations.map((op) => ({
            ...op,
            fee: feeObj,
          }));
        }
      }

      let _adjusted_proposed_ops = feeProcessedOperations.map(
        (operation, index) => ({
          op: [operationNumbers[operationNames[index]], operation],
        })
      );

      let _trx = [
        {
          fee_paying_account: targetUser.id,
          expiration_time: date,
          proposed_ops: _adjusted_proposed_ops,
          review_period_seconds: Number(reviewPeriodSeconds),
          extensions: {},
        },
      ];

      let finalFee;
      try {
        finalFee = await window.electron.calculateOperationFees({
          nodeURL: currentNode,
          trxJSON: _trx,
        });
      } catch (error) {
        console.log({ error });
      }

      _trx[0].fee = {
        amount: finalFee ?? 0,
        asset_id: "1.3.0",
      };

      setDeeplinkJSON(_trx);
    }

    calculateDeeplinkJSON();
  }, [
    targetUser,
    date,
    trxJSON,
    operationNumbers,
    operationNames,
    reviewPeriodSeconds,
    currentNode,
  ]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        dismissCallback(open);
      }}
    >
      <DialogContent className="sm:max-w-[800px] bg-card">
        <DialogHeader>
          <DialogTitle>
            {!deeplink ? (
              t("DeepLinkDialog:dialogContent.generatingDeeplink")
            ) : (
              <>{headerText}</>
            )}
          </DialogTitle>
          <DialogDescription>
            {t("DeepLinkDialog:dialogContent.withAccount", {
              username: username,
              userID: userID,
            })}
            {deeplink ? (
              <>
                <br />
                {t("DeepLinkDialog:dialogContent.readyToBroadcast")}
                <br />
                {t("DeepLinkDialog:dialogContent.chooseMethod")}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        {activeTab ? (
          <>
            <hr className="mt-3" />
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-4 gap-2">
                {!forcePropose ? (
                <Button
                  className="col-span-1"
                  onClick={() => setActiveTab("object")}
                  variant={activeTab === "object" ? "" : "outline"}
                >
                  {t("DeepLinkDialog:tabs.viewTRXObject")}
                </Button>
                ) : null}
                {!disableDeeplink && !forcePropose ? (
                <Button
                  className="col-span-1"
                  onClick={() => setActiveTab("deeplink")}
                  variant={activeTab === "deeplink" ? "" : "outline"}
                >
                  {t("DeepLinkDialog:tabs.rawDeeplink")}
                </Button>
                ) : null}
                {!forcePropose ? (
                <Button
                  className="col-span-1"
                  onClick={() => setActiveTab("localJSON")}
                  variant={activeTab === "localJSON" ? "" : "outline"}
                >
                  {t("DeepLinkDialog:tabs.localJSONFile")}
                </Button>
                ) : null}
                {!disableQR && !forcePropose ? (
                <Button
                  className="col-span-1"
                  onClick={() => setActiveTab("qr")}
                  variant={activeTab === "qr" ? "" : "outline"}
                >
                  {t("DeepLinkDialog:tabs.qrCode")}
                </Button>
                ) : null}
                {!proposal && !disablePropose ? (
                  <Button
                    className="col-span-1"
                    onClick={() => setActiveTab("propose")}
                    variant={activeTab === "propose" ? "" : "outline"}
                  >
                    {t("DeepLinkDialog:tabs.propose")}
                  </Button>
                ) : null}
                {!forcePropose && !disableTotp ? (
                <Button
                  className="col-span-1"
                  onClick={() => setActiveTab("totp")}
                  variant={activeTab === "totp" ? "" : "outline"}
                >
                  {t("DeepLinkDialog:tabs.totp")}
                </Button>
                ) : null}
              </div>
              {activeTab === "object" ? (
                <>
                  <div className="grid w-full gap-1.5 mb-3">
                    <Label className="text-left text-md font-bold">
                      {t("DeepLinkDialog:tabsContent.transactionObjectJSON")}
                    </Label>
                    <span className="text-left text-sm">
                      {t("DeepLinkDialog:tabsContent.operationType")}
                    </span>
                    <Textarea
                      value={JSON.stringify(operationNames, null, 4)}
                      className="min-h-[125px]"
                      id="trxJSON"
                      readOnly
                    />
                    <Textarea
                      value={JSON.stringify(trxJSON, null, 4)}
                      className="min-h-[250px]"
                      id="trxJSON"
                      readOnly
                    />
                  </div>
                  <Button
                    onClick={() => {
                      copyToClipboard(JSON.stringify(trxJSON, null, 4));
                    }}
                  >
                    {t("DeepLinkDialog:tabsContent.copyOperationJSON")}
                  </Button>
                </>
              ) : null}
              {activeTab === "deeplink" && !disableDeeplink && !forcePropose ? (
                <>
                  <Label className="text-left text-md font-bold">
                    {t("DeepLinkDialog:tabsContent.usingDeeplink")}
                  </Label>
                  <ol className="ml-4">
                    <li type="1">{t("DeepLinkDialog:tabsContent.step1")}</li>
                    <li type="1">
                      {t("DeepLinkDialog:tabsContent.step2", {
                        operationName: [...new Set(operationNames)].join(", "),
                      })}
                    </li>
                    <li type="1">{t("DeepLinkDialog:tabsContent.step3")}</li>
                    <li type="1">{t("DeepLinkDialog:tabsContent.step4")}</li>
                    <li type="1">{t("DeepLinkDialog:tabsContent.step5")}</li>
                  </ol>
                  {deeplink ? (
                    <div className="flex space-x-3">
                      <a
                        href={`rawbeet://api?chain=${
                          usrChain === "bitshares" ? "BTS" : "BTS_TEST"
                        }&request=${deeplink}`}
                      >
                        <Button className="mt-4">BEET</Button>
                      </a>
                      <a
                        href={`rawbeetvault://api?chain=${
                          usrChain === "bitshares" ? "BTS" : "BTS_TEST"
                        }&request=${deeplink}`}
                      >
                        <Button className="mt-4 ml-3">BeetVault</Button>
                      </a>
                    </div>
                  ) : null}
                </>
              ) : null}
              {activeTab === "localJSON" && !forcePropose ? (
                <>
                  <Label className="text-left text-md font-bold">
                    {t("DeepLinkDialog:tabsContent.viaLocalFile")}
                  </Label>
                  <ol className="ml-4">
                    <li type="1">
                      {t("DeepLinkDialog:tabsContent.step1Local")}
                    </li>
                    <li type="1">
                      {t("DeepLinkDialog:tabsContent.step2Local", {
                        operationName: [...new Set(operationNames)].join(", "),
                      })}
                    </li>
                    <li type="1">
                      {t("DeepLinkDialog:tabsContent.step3Local")}
                    </li>
                    <li type="1">
                      {t("DeepLinkDialog:tabsContent.step4Local")}
                    </li>
                    <li type="1">
                      {t("DeepLinkDialog:tabsContent.step5Local")}
                    </li>
                  </ol>
                  {deeplink && downloadClicked ? (
                    <Button className="mt-4" variant="outline" disabled>
                      {t("DeepLinkDialog:tabsContent.downloading")}
                    </Button>
                  ) : null}
                  {deeplink && !downloadClicked ? (
                    <a
                      href={`data:text/json;charset=utf-8,${deeplink}`}
                      download={"transaction.json"}
                      target="_blank"
                      rel="noreferrer"
                      onClick={handleDownloadClick}
                    >
                      <Button className="mt-4">
                        {t(
                          "DeepLinkDialog:tabsContent.downloadBeetOperationJSON"
                        )}
                      </Button>
                    </a>
                  ) : null}
                </>
              ) : null}
              {activeTab === "qr" && !disableQR && !forcePropose ? (
                <>
                  <Label className="text-left text-md font-bold">
                    {t("DeepLinkDialog:tabs.qrCode")}
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="flex items-center justify-center p-2 border rounded-md">
                      {qrContents ? (
                        <QRCode
                          value={JSON.stringify(qrContents)}
                          ecLevel={qrECL}
                          size={parseInt(qrSize, 10)}
                          quietZone={parseInt(qrQZ, 10)}
                          qrStyle={qrStyle}
                          bgColor={qrBGC}
                          fgColor={qrFGC}
                        />
                      ) : (
                        <span className="text-sm opacity-70">
                          {t("DeepLinkDialog:qr.generating")}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      <div>
                        <Label className="mb-1 block">
                          {t("DeepLinkDialog:qr.ecl")}
                        </Label>
                        <Select onValueChange={(v) => setQRECL(v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={qrECL} />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            {["L", "M", "Q", "H"].map((lvl) => (
                              <SelectItem key={lvl} value={lvl}>
                                {lvl}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1 block">
                          {t("DeepLinkDialog:qr.size")}
                        </Label>
                        <Select onValueChange={(v) => setQRSize(v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={qrSize} />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            {["150", "250", "300", "350", "385"].map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1 block">
                          {t("DeepLinkDialog:qr.padding")}
                        </Label>
                        <Select onValueChange={(v) => setQRQZ(v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={qrQZ} />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            {["5", "10", "25", "50"].map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1 block">
                          {t("DeepLinkDialog:qr.style")}
                        </Label>
                        <Select onValueChange={(v) => setQRStyle(v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={qrStyle} />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            {["dots", "squares"].map((st) => (
                              <SelectItem key={st} value={st}>
                                {st}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1 block">
                          {t("DeepLinkDialog:qr.bgc")}
                        </Label>
                        <Input
                          type="color"
                          value={qrBGC}
                          onChange={(e) => setQRBGC(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block">
                          {t("DeepLinkDialog:qr.fgc")}
                        </Label>
                        <Input
                          type="color"
                          value={qrFGC}
                          onChange={(e) => setQRFGC(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
              {activeTab === "propose" && !proposal && !disablePropose ? (
                <>
                  <Label className="text-left text-md font-bold">
                    {t("DeepLinkDialog:tabsContent.propose")}
                  </Label>
                  <p>{t("DeepLinkDialog:tabsContent.proposeDescription")}</p>
                  <div className="grid grid-cols-8 mt-4">
                    <div className="col-span-8 mb-3">
                      <HoverInfo
                        content={t("DeepLinkDialog:proposal.targetContent")}
                        header={t("DeepLinkDialog:proposal.targetHeader")}
                        type="header"
                      />
                    </div>
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
                          <AvatarFallback>?</AvatarFallback>
                        </Av>
                      )}
                    </div>
                    <div className="col-span-5">
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
                        onOpenChange={(open) => {
                          setTargetUserDialogOpen(open);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" className="ml-3 mt-1">
                            {targetUser
                              ? t("AccountLists:changeTarget")
                              : t("AccountLists:provideTarget")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[375px] bg-card">
                          <DialogHeader>
                            <DialogTitle>
                              {!usr || !usr.chain
                                ? t("AccountLists:bitsharesAccountSearch")
                                : null}
                              {usr && usr.chain === "bitshares"
                                ? t("AccountLists:bitsharesAccountSearchBTS")
                                : null}
                              {usr && usr.chain !== "bitshares"
                                ? t("AccountLists:bitsharesAccountSearchTEST")
                                : null}
                            </DialogTitle>
                            <DialogDescription>
                              {t("AccountLists:searchingForAccount")}
                            </DialogDescription>
                          </DialogHeader>
                          <AccountSearch
                            chain={usr && usr.chain ? usr.chain : "bitshares"}
                            excludedUsers={[]}
                            setChosenAccount={setTargetUser}
                            skipCheck={false}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid grid-cols-1 gap-3">
                      <HoverInfo
                        content={t("Common:expiryContent")}
                        header={t("Common:expiryHeader")}
                        type="header"
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
                        type="header"
                      />
                      <Select
                        value={String(reviewPeriodSeconds)}
                        onValueChange={(selectedReviewPeriod) => {
                          setReviewPeriodSeconds(selectedReviewPeriod);
                        }}
                      >
                        <SelectTrigger className="mb-3 mt-1 w-3/4">
                          <SelectValue
                            placeholder={
                              REVIEW_PERIOD_LABELS[reviewPeriodSeconds] ??
                              `${reviewPeriodSeconds}s`
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                          {(() => {
                            const min = Number(minReviewPeriodSeconds);
                            const visible = Number.isFinite(min)
                              ? REVIEW_PERIOD_OPTIONS.filter((o) => o >= min)
                              : REVIEW_PERIOD_OPTIONS;
                            return (visible.length
                              ? visible
                              : REVIEW_PERIOD_OPTIONS
                            ).map((o) => (
                              <SelectItem key={o} value={String(o)}>
                                {REVIEW_PERIOD_LABELS[o] ?? `${o}s`}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <Button
                      onClick={() => {
                        setProposalDialogOpen(true);
                      }}
                      variant=""
                    >
                      Submit
                    </Button>
                  </div>
                  {proposalDialogOpen &&
                    !proposal &&
                    targetUser &&
                    targetUser.id &&
                    deeplinkJSON && (
                      <DeepLinkDialog
                        trxJSON={deeplinkJSON}
                        operationNames={["proposal_create"]}
                        username={username}
                        usrChain={usrChain}
                        userID={userID}
                        dismissCallback={dismissCallback}
                        headerText={headerText}
                        proposal={true}
                        disableQR={disableQR}
                        disableDeeplink={disableDeeplink}
                        disableTotp={disableTotp}
                      />
                    )}
                </>
              ) : null}
              {activeTab === "totp" && !forcePropose && !disableTotp ? (
                <>
                  <Label className="text-left text-md font-bold">
                    {t("DeepLinkDialog:totp.title")}
                  </Label>
                  <p className="text-sm opacity-80">
                    {t("DeepLinkDialog:totp.description")}
                  </p>
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor="totpCode">
                      {t("DeepLinkDialog:totp.passcodeLabel")}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="totpCode"
                        placeholder={t("DeepLinkDialog:totp.placeholder")}
                        value={totpCode}
                        onChange={(e) => {
                          setTotpCode(e.target.value);
                          if (totpDeeplink) setTotpDeeplink(null);
                          if (totpError) setTotpError(null);
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            totpCode.trim() &&
                            !totpLoading
                          ) {
                            handleTotpSubmit();
                          }
                        }}
                      />
                      <Button
                        onClick={handleTotpSubmit}
                        disabled={!totpCode.trim() || totpLoading}
                      >
                        {totpLoading
                          ? t("DeepLinkDialog:totp.generating")
                          : t("DeepLinkDialog:totp.submit")}
                      </Button>
                    </div>
                    {totpError ? (
                      <p className="text-sm text-red-500">{totpError}</p>
                    ) : null}
                    {totpDeeplink ? (
                      <>
                        <p className="text-sm mt-2">
                          {t("DeepLinkDialog:totp.ready")}
                        </p>
                        <div className="flex gap-3 items-center flex-wrap">
                          <a href={totpDeeplink}>
                            <Button className="mt-2">BeetVault</Button>
                          </a>
                          <Button
                            variant="outline"
                            className="mt-2"
                            onClick={() => copyToClipboard(totpDeeplink)}
                          >
                            {t("DeepLinkDialog:totp.copyLink")}
                          </Button>
                        </div>
                        <p className="text-xs opacity-60 break-all mt-2">
                          {totpDeeplink.length > 120
                            ? `${totpDeeplink.slice(0, 120)}...`
                            : totpDeeplink}
                        </p>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
