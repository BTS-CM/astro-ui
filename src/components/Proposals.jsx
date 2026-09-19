import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  memo,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { FileText, ShieldAlert, CheckCircle, XCircle, AlertTriangle, Clock, Gavel } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import { humanReadableFloat } from "@/lib/common";

import { createAccountProposalStore } from "@/nanoeffects/AccountProposedTransactions.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";
import ExternalLink from "./common/ExternalLink.jsx";

const operationStrings = [
  "transfer",
  "limit_order_create",
  "limit_order_cancel",
  "call_order_update",
  "fill_order",
  "account_create",
  "account_update",
  "account_whitelist",
  "account_upgrade",
  "account_transfer",
  "asset_create",
  "asset_update",
  "asset_update_bitasset",
  "asset_update_feed_producers",
  "asset_issue",
  "asset_reserve",
  "asset_fund_fee_pool",
  "asset_settle",
  "asset_global_settle",
  "asset_publish_feed",
  "witness_create",
  "witness_update",
  "proposal_create",
  "proposal_update",
  "proposal_delete",
  "withdraw_permission_create",
  "withdraw_permission_update",
  "withdraw_permission_claim",
  "withdraw_permission_delete",
  "committee_member_create",
  "committee_member_update",
  "committee_member_update_global_parameters",
  "vesting_balance_create",
  "vesting_balance_withdraw",
  "worker_create",
  "custom",
  "assert",
  "balance_claim",
  "override_transfer",
  "transfer_to_blind",
  "blind_transfer",
  "transfer_from_blind",
  "asset_settle_cancel",
  "asset_claim_fees",
  "fba_distribute",
  "bid_collateral",
  "execute_bid",
  "asset_claim_pool",
  "asset_update_issuer",
  "htlc_create",
  "htlc_redeem",
  "htlc_redeemed",
  "htlc_extend",
  "htlc_refund",
  "custom_authority_create",
  "custom_authority_update",
  "custom_authority_delete",
  "ticket_create",
  "ticket_update",
  "liquidity_pool_create",
  "liquidity_pool_delete",
  "liquidity_pool_deposit",
  "liquidity_pool_withdraw",
  "liquidity_pool_exchange",
  "samet_fund_create",
  "samet_fund_delete",
  "samet_fund_update",
  "samet_fund_borrow",
  "samet_fund_repay",
  "credit_offer_create",
  "credit_offer_delete",
  "credit_offer_update",
  "credit_offer_accept",
  "credit_deal_repay",
  "credit_deal_expired",
  "liquidity_pool_update",
  "credit_deal_update",
  "limit_order_update",
];


const ProposalRow = memo(function ProposalRow({ index, style, filteredProposals, proposerAccounts, setViewJSON, setJSON, setApproveOpen, setRejectOpen, setRejectedProposalID, t }) {
  const proposal = filteredProposals[index];
  const proposer = proposal.proposer;
  const expirationTime = new Date(proposal.expiration_time);
  const reviewPeriodTime = new Date(proposal.review_period_time);

  const proposedTransaction = proposal.proposed_transaction;
  const operations = proposedTransaction.operations;

  const proposerAccount = proposerAccounts.find((x) => x.id === proposer);

  const [approvedCount, setApprovedCount] = useState(0);

  return (
    <div style={{ ...style, paddingBottom: 10, overflow: "hidden" }} key={`card-${proposal.id}`}>
      <div className="ml-3 mr-3 pt-3 relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 backdrop-blur-xl shadow-md shadow-[color:hsl(var(--accent-1)/0.1)] hover:border-[hsl(var(--accent-1)/0.25)] hover:shadow-[color:hsl(var(--accent-1)/0.15)] transition-all duration-300">
        <div className="p-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="col-span-2">
                {t("Proposals:proposalID")}
                {": "}
                <span className="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))] transition-colors">{proposal.id}</span>
                <Badge
                  className="ml-3 border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] cursor-pointer hover:bg-[hsl(var(--accent-1)/0.2)] transition-colors"
                  onClick={() => {
                    setViewJSON(true);
                    setJSON(proposal);
                  }}
                >
                  JSON
                </Badge>
              </div>
              <div className="col-span-2">
                {t("Proposals:proposedBy")}
                {": "}
                <b>
                  {proposerAccount && proposerAccount.name ? (
                    <span className="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))] transition-colors">
                      {proposerAccount.name}
                    </span>
                  ) : (
                    <>???</>
                  )}
                </b>{" "}
                (
                <span className="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))] transition-colors">{proposer}</span>
                )
              </div>
              <div className="col-span-2">
                {t("Proposals:expirationTime")}:{" "}
                <b>{expirationTime.toUTCString()}</b>
              </div>
              {reviewPeriodTime ? (
                <div className="col-span-2">
                  {t("Proposals:reviewPeriodTime")}:{" "}
                  <b>{reviewPeriodTime ? reviewPeriodTime / 1000 : 0}</b>
                </div>
              ) : null}
            </div>
            <div>
              <HoverInfo
                header={t("Proposals:operations")}
                content={t("Proposals:operationsDescription")}
                type="header"
              />
              <div className="border border-[hsl(var(--accent-1)/0.15)] rounded-xl pl-2 pb-2 mt-2 bg-card/60">
                {operations.length && operations.length > 10 ? (
                  <Badge
                    onClick={() => {
                      setViewJSON(true);
                      setJSON({
                        operations,
                      });
                    }}
                    className="border-[hsl(var(--accent-3)/0.2)] bg-[hsl(var(--accent-3)/0.1)] text-[hsl(var(--accent-3-fg))] dark:text-[hsl(var(--accent-3-fg))] cursor-pointer hover:bg-[hsl(var(--accent-3)/0.2)] transition-colors"
                  >
                    ⚠️ {operations.length} operations
                  </Badge>
                ) : (
                  operations.map((x) => (
                    <Badge
                      className="ml-1 border-[hsl(var(--accent-2)/0.2)] bg-[hsl(var(--accent-2)/0.1)] text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] cursor-pointer hover:bg-[hsl(var(--accent-2)/0.2)] transition-colors"
                      onClick={() => {
                        setViewJSON(true);
                        setJSON({
                          operation: x,
                        });
                      }}
                    >
                      {operationStrings[x[0]]} ({x[0]})
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="col-span-2">
              <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.3)] to-transparent my-2" />
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setApproveOpen(true);
                }}
                className="w-1/2 bg-gradient-to-r from-[hsl(var(--accent-success))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-success-gradFg))] shadow-md shadow-[color:hsl(var(--accent-success)/0.2)] hover:from-[hsl(var(--accent-success))] hover:to-[hsl(var(--accent-2))] hover:shadow-[color:hsl(var(--accent-success)/0.4)] active:scale-95 transition-all duration-200 cursor-pointer"
              >
                {t("Proposals:beginApprovalProcess")}
              </Button>
              <Button
                onClick={() => {
                  setRejectOpen(true);
                  setRejectedProposalID(proposal.id);
                }}
                className="w-1/2 bg-gradient-to-r from-[hsl(var(--accent-danger))] to-[hsl(var(--accent-danger))] text-[hsl(var(--accent-danger-gradFg))] shadow-md shadow-[color:hsl(var(--accent-danger)/0.2)] hover:from-[hsl(var(--accent-danger))] hover:to-[hsl(var(--accent-danger))] hover:shadow-[color:hsl(var(--accent-danger)/0.4)] active:scale-95 transition-all duration-200 cursor-pointer"
              >
                {t("Proposals:reject")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function Proposals(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNodeUrl = useStore($currentNodeUrl);
  const [showDialog, setShowDialog] = useState(false);

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const { _globalParamsBTS, _globalParamsTEST } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 7); // operation: account_whitelist
      const finalFee = humanReadableFloat(foundFee?.data?.fee ?? 0, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [proposals, setProposals] = useState();
  useEffect(() => {
    if (usr && usr.chain && currentNodeUrl) {
      const proposalStore = createAccountProposalStore([
        usr.chain,
        usr.id,
        currentNodeUrl || "",
      ]);
      proposalStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setProposals(data);
        }
      });
    }
  }, [usr, currentNodeUrl]);

  const filteredProposals = useMemo(() => {
    if (
      usr &&
      usr.chain === "bitshares" &&
      blocklist &&
      proposals &&
      proposals.length
    ) {
      const filteredProposals = proposals.filter((proposal) => {
        const hashedID = toHex(sha256(utf8ToBytes(proposal.proposer)));
        return !blocklist.users.includes(hashedID);
      });
      return filteredProposals;
    } else {
      return proposals;
    }
  }, [usr, proposals, blocklist]);

  const [proposerAccounts, setProposerAccounts] = useState([]);
  useEffect(() => {
    async function fetching() {
      const proposers = [
        ...new Set(filteredProposals.map((proposal) => proposal.proposer)),
      ];
      const proposerStore = createObjectStore([
        usr.chain,
        JSON.stringify(proposers),
        currentNodeUrl || "",
      ]);
      proposerStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setProposerAccounts(data);
        }
      });
    }

    if (filteredProposals && filteredProposals.length) {
      fetching();
    }
  }, [filteredProposals]);

  const [viewJSON, setViewJSON] = useState(false);
  const [json, setJSON] = useState();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectedProposalID, setRejectedProposalID] = useState();

  const [approveOpen, setApproveOpen] = useState(false);
  const [finalApprovalOpen, setFinalApprovalOpen] = useState(false);
  const [chosenProposal, setChosenProposal] = useState();

  const proposalRowProps = useMemo(() => ({ filteredProposals, proposerAccounts, setViewJSON, setJSON, setApproveOpen, setRejectOpen, setRejectedProposalID, t }), [filteredProposals, proposerAccounts, setViewJSON, setJSON, setApproveOpen, setRejectOpen, setRejectedProposalID, t]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)]">
            <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-1)/0.2)] blur-3xl" />
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(var(--accent-1)/0.7)] via-[hsl(var(--accent-2)/0.7)] to-[hsl(var(--accent-1)/0.7)]" />
            <div className="p-4 pb-0">
              <h2 className="text-lg font-semibold tracking-tight bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                  <Gavel className="h-4.5 w-4.5" />
                </span>
                {t("Proposals:cardTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("Proposals:cardDescription")}
              </p>
            </div>
            <div className="p-4 pt-2">
              <div className="grid grid-cols-1 gap-3">
                {filteredProposals && filteredProposals.length ? (
                  <div className="w-full h-[500px] border-2">
                    <List
                      rowComponent={ProposalRow}
                      rowCount={filteredProposals.length}
                      rowHeight={292}
                      height={500}
                      width="100%"
                      rowProps={proposalRowProps}
                    />
                  </div>
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><FileText className="h-10 w-10 text-[hsl(var(--accent-1-fg))]" /></EmptyMedia>
                      <EmptyTitle>{t("Proposals:noProposals")}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-3)/0.1)]">
            <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-3)/0.2)] to-[hsl(var(--accent-3)/0.2)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-3)/0.2)] to-[hsl(var(--accent-3)/0.2)] blur-3xl" />
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(var(--accent-3)/0.7)] via-[hsl(var(--accent-3)/0.7)] to-[hsl(var(--accent-3)/0.7)]" />
            <div className="p-4 pb-0">
              <h3 className="text-base font-semibold tracking-tight bg-gradient-to-r from-[hsl(var(--accent-3))] to-[hsl(var(--accent-3))] bg-clip-text text-transparent flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[hsl(var(--accent-3-fg))]" />
                {t("Proposals:risksTitle")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("Proposals:risksDescription")}
              </p>
            </div>
            <div className="p-4 pt-2">
              <span className="text-sm">
                <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
                  <li>{t("Proposals:risk1")}</li>
                  <li>{t("Proposals:risk2")}</li>
                </ul>
              </span>
            </div>
          </div>

          {viewJSON && json ? (
            <Dialog
              open={viewJSON}
              onOpenChange={(open) => {
                setViewJSON(open);
              }}
            >
              <DialogContent className="sm:max-w-[750px] bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {t("LiveBlocks:dialogContent.json")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("LiveBlocks:dialogContent.jsonDescription")}
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={JSON.stringify(json, null, 2)}
                  readOnly={true}
                  rows={15}
                />
                <Button
                  className="w-1/4 mt-2 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:shadow-[color:hsl(var(--accent-1)/0.4)] active:scale-95 transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(json, null, 2)
                    );
                  }}
                >
                  {t("LiveBlocks:dialogContent.copy")}
                </Button>
              </DialogContent>
            </Dialog>
          ) : null}

          {rejectOpen && rejectedProposalID ? (
            <DeepLinkDialog
              operationNames={["proposal_delete"]}
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setRejectOpen}
              key={`RejectingProposal${rejectedProposalID}`}
              headerText={t("Proposals:rejectedProposalHeader")}
              trxJSON={[
                {
                  fee_paying_account: usr.id,
                  proposal: rejectedProposalID,
                  using_owner_authority: false,
                  extensions: {},
                },
              ]}
            />
          ) : null}

          {finalApprovalOpen && chosenProposal && (
            <DeepLinkDialog
              operationNames={["proposal_update"]}
              username={usr.username}
              usrChain={usr.chain}
              userID={usr.id}
              dismissCallback={setFinalApprovalOpen}
              key={`ApprovingProposal${chosenProposal.id}`}
              headerText={t("Proposals:approvedProposalHeader")}
              trxJSON={[
                {
                  fee_paying_account: usr.id,
                  proposal: chosenProposal.id,
                  active_approvals_to_add:
                    chosenProposal.required_active_approvals.includes(usr.id)
                      ? [usr.id]
                      : [],
                  owner_approvals_to_add:
                    chosenProposal.required_owner_approvals.includes(usr.id)
                      ? [usr.id]
                      : [],
                  key_approvals_to_add: [],
                  active_approvals_to_remove: [],
                  owner_approvals_to_remove: [],
                  key_approvals_to_remove: [],
                  extensions: {},
                },
              ]}
            />
          )}
        </div>
      </div>
    </>
  );
}
